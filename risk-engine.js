// risk-engine.js
// Motor de risco: VaR, Sharpe, Sortino, Max Drawdown, Beta, Correlation Matrix, Benchmark Suite
// Pure JS, no external dependencies

/**
 * RiskEngine - Análise quantitativa de risco e performance
 * 
 * Métricas implementadas:
 * - VaR (Value at Risk) histórico e paramétrico (95%, 99%)
 * - CVaR / Expected Shortfall
 * - Sharpe Ratio (vs CDI, vs IBOV)
 * - Sortino Ratio (downside deviation)
 * - Calmar Ratio
 * - Maximum Drawdown (com período de recuperação)
 * - Beta vs benchmarks (CDI, IBOV, IFIX, SMLL, IDIV, IMAB)
 * - Alpha (Jensen's Alpha)
 * - Information Ratio
 * - Tracking Error
 * - Correlation Matrix (heatmap ready)
 * - Rolling metrics (janela móvel)
 */

class RiskEngine {
  constructor(options = {}) {
    this.options = {
      riskFreeRate: options.riskFreeRate || 0.1075, // CDI ~10.75% a.a.
      confidenceLevels: options.confidenceLevels || [0.95, 0.99],
      windowSizes: options.windowSizes || [21, 63, 126, 252], // 1m, 3m, 6m, 12m
      tradingDaysPerYear: options.tradingDaysPerYear || 252,
      ...options
    };
    
    this.portfolioReturns = [];
    this.benchmarkReturns = {};
    this.assetReturns = {};
    this.dates = [];
  }
  
  /**
   * Configura série histórica de retornos do portfólio
   * @param {Array} returns - Array de retornos diários (decimais, ex: 0.01 = 1%)
   * @param {Array} dates - Datas correspondentes (ISO string ou Date)
   */
  setPortfolioReturns(returns, dates) {
    this.portfolioReturns = returns.map(r => Number(r));
    this.dates = dates.map(d => new Date(d));
    return this;
  }
  
  /**
   * Adiciona série de benchmark
   * @param {string} name - Nome do benchmark (CDI, IBOV, IFIX, etc.)
   * @param {Array} returns - Retornos diários
   * @param {Array} dates - Datas
   */
  addBenchmark(name, returns, dates) {
    this.benchmarkReturns[name] = {
      returns: returns.map(r => Number(r)),
      dates: dates.map(d => new Date(d))
    };
    return this;
  }
  
  /**
   * Adiciona retornos por ativo (para correlation matrix)
   * @param {Object} assets - { ticker: { returns: [], dates: [] } }
   */
  addAssetReturns(assets) {
    Object.entries(assets).forEach(([ticker, data]) => {
      this.assetReturns[ticker] = {
        returns: data.returns.map(r => Number(r)),
        dates: data.dates.map(d => new Date(d))
      };
    });
    return this;
  }
  
  /**
   * Alinha séries por data (inner join)
   */
  _alignSeries(seriesA, datesA, seriesB, datesB) {
    const mapA = new Map(datesA.map((d, i) => [d.toISOString().split('T')[0], seriesA[i]]));
    const mapB = new Map(datesB.map((d, i) => [d.toISOString().split('T')[0], seriesB[i]]));
    
    const commonDates = [...mapA.keys()].filter(d => mapB.has(d)).sort();
    
    return {
      a: commonDates.map(d => mapA.get(d)),
      b: commonDates.map(d => mapB.get(d)),
      dates: commonDates.map(d => new Date(d))
    };
  }
  
  // ========================================
  // ESTATÍSTICAS BÁSICAS
  // ========================================
  
  _mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  _std(arr, sample = true) {
    const mean = this._mean(arr);
    const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (arr.length - (sample ? 1 : 0));
    return Math.sqrt(variance);
  }
  
  _percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
  
  // ========================================
  // VaR & CVaR
  // ========================================
  
  calculateVaR(confidence = 0.95, method = 'historical') {
    const returns = this.portfolioReturns;
    if (!returns.length) return null;
    
    if (method === 'historical') {
      // VaR Histórico
      const varValue = -this._percentile(returns, 1 - confidence);
      
      // CVaR (Expected Shortfall) - média dos retornos piores que VaR
      const tailReturns = returns.filter(r => r <= -varValue);
      const cvar = tailReturns.length ? -this._mean(tailReturns) : varValue;
      
      return {
        method: 'historical',
        confidence,
        var: varValue,
        cvar: cvar,
        varPct: (varValue * 100).toFixed(2) + '%',
        cvarPct: (cvar * 100).toFixed(2) + '%'
      };
    } else if (method === 'parametric') {
      // VaR Paramétrico (assume distribuição normal)
      const mean = this._mean(returns);
      const std = this._std(returns);
      const zScore = this._getZScore(confidence);
      const varValue = -(mean - zScore * std);
      
      // CVaR para normal: mean - std * phi(z) / (1-confidence)
      const phi = this._normalPDF(zScore);
      const cvar = -(mean - std * phi / (1 - confidence));
      
      return {
        method: 'parametric',
        confidence,
        var: varValue,
        cvar: cvar,
        varPct: (varValue * 100).toFixed(2) + '%',
        cvarPct: (cvar * 100).toFixed(2) + '%'
      };
    }
  }
  
  _getZScore(confidence) {
    // Aproximação z-score para confiança comum
    const zScores = { 0.90: 1.282, 0.95: 1.645, 0.975: 1.96, 0.99: 2.326, 0.995: 2.576 };
    return zScores[confidence] || 1.645;
  }
  
  _normalPDF(z) {
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }
  
  // ========================================
  // MAXIMUM DRAWDOWN
  // ========================================
  
  calculateMaxDrawdown() {
    const returns = this.portfolioReturns;
    if (!returns.length) return null;
    
    // Constrói curva de equity (começando em 1)
    let equity = 1;
    const equityCurve = [1];
    let peak = 1;
    let maxDD = 0;
    let maxDDStart = 0;
    let maxDDEnd = 0;
    let currentDDStart = 0;
    
    returns.forEach((r, i) => {
      equity *= (1 + r);
      equityCurve.push(equity);
      
      if (equity > peak) {
        peak = equity;
        currentDDStart = i + 1;
      }
      
      const dd = (peak - equity) / peak;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDStart = currentDDStart;
        maxDDEnd = i + 1;
      }
    });
    
    // Período de recuperação (tempo para voltar ao pico)
    let recoveryDays = null;
    if (maxDDEnd < equityCurve.length - 1) {
      const peakValue = equityCurve[maxDDStart];
      for (let i = maxDDEnd + 1; i < equityCurve.length; i++) {
        if (equityCurve[i] >= peakValue) {
          recoveryDays = i - maxDDEnd;
          break;
        }
      }
    }
    
    return {
      maxDrawdown: maxDD,
      maxDrawdownPct: (maxDD * 100).toFixed(2) + '%',
      startDate: this.dates[maxDDStart]?.toISOString().split('T')[0],
      endDate: this.dates[maxDDEnd]?.toISOString().split('T')[0],
      recoveryDays: recoveryDays,
      recoveryDate: recoveryDays ? this.dates[maxDDEnd + recoveryDays]?.toISOString().split('T')[0] : null,
      equityCurve: equityCurve // para gráficos
    };
  }
  
  // ========================================
  // RATIOS DE PERFORMANCE
  // ========================================
  
  calculateSharpeRatio(benchmarkName = null) {
    const returns = this.portfolioReturns;
    if (!returns.length) return null;
    
    const meanReturn = this._mean(returns);
    const stdReturn = this._std(returns);
    const rfDaily = this.options.riskFreeRate / this.options.tradingDaysPerYear;
    
    let excessReturn = meanReturn - rfDaily;
    let benchmarkInfo = null;
    
    if (benchmarkName && this.benchmarkReturns[benchmarkName]) {
      const aligned = this._alignSeries(
        returns, this.dates,
        this.benchmarkReturns[benchmarkName].returns,
        this.benchmarkReturns[benchmarkName].dates
      );
      if (aligned.a.length > 10) {
        const benchMean = this._mean(aligned.b);
        excessReturn = meanReturn - benchMean;
        benchmarkInfo = { name: benchmarkName, meanReturn: benchMean };
      }
    }
    
    const sharpe = stdReturn > 0 ? (excessReturn / stdReturn) * Math.sqrt(this.options.tradingDaysPerYear) : 0;
    
    return {
      sharpeRatio: sharpe.toFixed(3),
      annualizedReturn: ((1 + meanReturn) ** this.options.tradingDaysPerYear - 1).toFixed(4),
      annualizedVolatility: (stdReturn * Math.sqrt(this.options.tradingDaysPerYear) * 100).toFixed(2) + '%',
      excessReturnAnnualized: (excessReturn * this.options.tradingDaysPerYear * 100).toFixed(2) + '%',
      benchmark: benchmarkInfo
    };
  }
  
  calculateSortinoRatio() {
    const returns = this.portfolioReturns;
    if (!returns.length) return null;
    
    const meanReturn = this._mean(returns);
    const rfDaily = this.options.riskFreeRate / this.options.tradingDaysPerYear;
    const excessReturn = meanReturn - rfDaily;
    
    // Downside deviation (apenas retornos negativos vs risk-free)
    const downsideReturns = returns.filter(r => r < rfDaily);
    const downsideDeviation = downsideReturns.length > 1 
      ? this._std(downsideReturns.map(r => r - rfDaily))
      : 0;
    
    const sortino = downsideDeviation > 0 
      ? (excessReturn / downsideDeviation) * Math.sqrt(this.options.tradingDaysPerYear) 
      : 0;
    
    return {
      sortinoRatio: sortino.toFixed(3),
      downsideDeviation: (downsideDeviation * Math.sqrt(this.options.tradingDaysPerYear) * 100).toFixed(2) + '%',
      downsideFrequency: ((downsideReturns.length / returns.length) * 100).toFixed(1) + '%'
    };
  }
  
  calculateCalmarRatio() {
    const mdd = this.calculateMaxDrawdown();
    const returns = this.portfolioReturns;
    if (!returns.length || !mdd || mdd.maxDrawdown === 0) return null;
    
    const meanReturn = this._mean(returns);
    const annualReturn = (1 + meanReturn) ** this.options.tradingDaysPerYear - 1;
    const calmar = annualReturn / mdd.maxDrawdown;
    
    return {
      calmarRatio: calmar.toFixed(3),
      annualReturn: (annualReturn * 100).toFixed(2) + '%',
      maxDrawdown: mdd.maxDrawdownPct
    };
  }
  
  // ========================================
  // BETA, ALPHA, TRACKING ERROR vs BENCHMARK
  // ========================================
  
  calculateBetaAlpha(benchmarkName) {
    if (!this.benchmarkReturns[benchmarkName]) return null;
    
    const aligned = this._alignSeries(
      this.portfolioReturns, this.dates,
      this.benchmarkReturns[benchmarkName].returns,
      this.benchmarkReturns[benchmarkName].dates
    );
    
    if (aligned.a.length < 20) return null;
    
    const portReturns = aligned.a;
    const benchReturns = aligned.b;
    const n = portReturns.length;
    
    const portMean = this._mean(portReturns);
    const benchMean = this._mean(benchReturns);
    
    // Covariância e variância
    let covariance = 0;
    let benchVariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (portReturns[i] - portMean) * (benchReturns[i] - benchMean);
      benchVariance += Math.pow(benchReturns[i] - benchMean, 2);
    }
    covariance /= (n - 1);
    benchVariance /= (n - 1);
    
    const beta = benchVariance > 0 ? covariance / benchVariance : 0;
    
    // Alpha de Jensen (anualizado)
    const rfAnnual = this.options.riskFreeRate;
    const benchAnnual = (1 + benchMean) ** this.options.tradingDaysPerYear - 1;
    const portAnnual = (1 + portMean) ** this.options.tradingDaysPerYear - 1;
    const alpha = portAnnual - (rfAnnual + beta * (benchAnnual - rfAnnual));
    
    // Tracking Error
    const activeReturns = portReturns.map((r, i) => r - benchReturns[i]);
    const trackingError = this._std(activeReturns) * Math.sqrt(this.options.tradingDaysPerYear);
    
    // Information Ratio
    const infoRatio = trackingError > 0 ? (this._mean(activeReturns) * this.options.tradingDaysPerYear) / trackingError : 0;
    
    // R-squared
    const portVariance = this._std(portReturns) ** 2;
    const rSquared = portVariance > 0 ? Math.pow(covariance, 2) / (portVariance * benchVariance) : 0;
    
    return {
      benchmark: benchmarkName,
      beta: beta.toFixed(3),
      alpha: (alpha * 100).toFixed(2) + '%',
      alphaAnnual: (alpha * 100).toFixed(2) + '%',
      trackingError: (trackingError * 100).toFixed(2) + '%',
      informationRatio: infoRatio.toFixed(3),
      rSquared: (rSquared * 100).toFixed(1) + '%',
      correlation: (covariance / (Math.sqrt(portVariance) * Math.sqrt(benchVariance))).toFixed(3),
      observations: n
    };
  }
  
  // ========================================
  // CORRELATION MATRIX
  // ========================================
  
  calculateCorrelationMatrix() {
    const tickers = Object.keys(this.assetReturns);
    if (tickers.length < 2) return null;
    
    // Alinha todos os ativos na mesma base de datas
    const allDates = new Set();
    tickers.forEach(t => {
      this.assetReturns[t].dates.forEach(d => allDates.add(d.toISOString().split('T')[0]));
    });
    const commonDates = [...allDates].sort();
    
    // Filtra ativos com dados suficientes
    const validTickers = tickers.filter(t => {
      const data = this.assetReturns[t];
      const aligned = commonDates.map(d => {
        const idx = data.dates.findIndex(dd => dd.toISOString().split('T')[0] === d);
        return idx >= 0 ? data.returns[idx] : null;
      }).filter(v => v !== null);
      return aligned.length >= 30; // mínimo 30 observações
    });
    
    if (validTickers.length < 2) return null;
    
    // Matriz de correlação
    const matrix = {};
    validTickers.forEach(t1 => {
      matrix[t1] = {};
      const returns1 = commonDates.map(d => {
        const idx = this.assetReturns[t1].dates.findIndex(dd => dd.toISOString().split('T')[0] === d);
        return idx >= 0 ? this.assetReturns[t1].returns[idx] : null;
      }).filter(v => v !== null);
      
      validTickers.forEach(t2 => {
        const returns2 = commonDates.map(d => {
          const idx = this.assetReturns[t2].dates.findIndex(dd => dd.toISOString().split('T')[0] === d);
          return idx >= 0 ? this.assetReturns[t2].returns[idx] : null;
        }).filter(v => v !== null);
        
        // Alinha pelo índice
        const minLen = Math.min(returns1.length, returns2.length);
        const a = returns1.slice(-minLen);
        const b = returns2.slice(-minLen);
        
        if (a.length < 10) {
          matrix[t1][t2] = null;
          return;
        }
        
        const meanA = this._mean(a);
        const meanB = this._mean(b);
        let cov = 0, varA = 0, varB = 0;
        for (let i = 0; i < minLen; i++) {
          cov += (a[i] - meanA) * (b[i] - meanB);
          varA += Math.pow(a[i] - meanA, 2);
          varB += Math.pow(b[i] - meanB, 2);
        }
        cov /= (minLen - 1);
        varA /= (minLen - 1);
        varB /= (minLen - 1);
        
        const corr = (varA > 0 && varB > 0) ? cov / Math.sqrt(varA * varB) : 0;
        matrix[t1][t2] = Number(corr.toFixed(3));
      });
    });
    
    return {
      tickers: validTickers,
      matrix: matrix,
      observations: commonDates.length,
      dateRange: {
        start: commonDates[0],
        end: commonDates[commonDates.length - 1]
      }
    };
  }
  
  // ========================================
  // ROLLING METRICS
  // ========================================
  
  calculateRollingMetrics(window = 63) {
    const returns = this.portfolioReturns;
    if (returns.length < window) return null;
    
    const rolling = {
      sharpe: [],
      sortino: [],
      volatility: [],
      maxDrawdown: [],
      beta: {},
      dates: []
    };
    
    Object.keys(this.benchmarkReturns).forEach(b => rolling.beta[b] = []);
    
    for (let i = window; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window, i);
      const windowDates = this.dates.slice(i - window, i);
      
      const mean = this._mean(windowReturns);
      const std = this._std(windowReturns);
      const rfDaily = this.options.riskFreeRate / this.options.tradingDaysPerYear;
      
      rolling.dates.push(this.dates[i].toISOString().split('T')[0]);
      rolling.sharpe.push(((mean - rfDaily) / std) * Math.sqrt(this.options.tradingDaysPerYear) || 0);
      rolling.volatility.push((std * Math.sqrt(this.options.tradingDaysPerYear) * 100).toFixed(2));
      
      // Rolling Max DD
      let eq = 1, peak = 1, maxDD = 0;
      windowReturns.forEach(r => {
        eq *= (1 + r);
        peak = Math.max(peak, eq);
        maxDD = Math.max(maxDD, (peak - eq) / peak);
      });
      rolling.maxDrawdown.push((maxDD * 100).toFixed(2));
      
      // Rolling Beta vs cada benchmark
      Object.entries(this.benchmarkReturns).forEach(([name, bench]) => {
        const aligned = this._alignSeries(windowReturns, windowDates, bench.returns, bench.dates);
        if (aligned.a.length >= 20) {
          const cov = this._covariance(aligned.a, aligned.b);
          const varB = this._variance(aligned.b);
          rolling.beta[name].push(varB > 0 ? cov / varB : 0);
        } else {
          rolling.beta[name].push(null);
        }
      });
    }
    
    return rolling;
  }
  
  _covariance(a, b) {
    const meanA = this._mean(a);
    const meanB = this._mean(b);
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - meanA) * (b[i] - meanB);
    return sum / (a.length - 1);
  }
  
  _variance(a) {
    const mean = this._mean(a);
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.pow(a[i] - mean, 2);
    return sum / (a.length - 1);
  }
  
  // ========================================
  // RELATÓRIO COMPLETO
  // ========================================
  
  generateFullReport() {
    const report = {
      timestamp: new Date().toISOString(),
      portfolio: {
        observations: this.portfolioReturns.length,
        dateRange: this.dates.length ? {
          start: this.dates[0].toISOString().split('T')[0],
          end: this.dates[this.dates.length - 1].toISOString().split('T')[0]
        } : null
      },
      var: {},
      maxDrawdown: this.calculateMaxDrawdown(),
      sharpe: this.calculateSharpeRatio(),
      sortino: this.calculateSortinoRatio(),
      calmar: this.calculateCalmarRatio(),
      benchmarks: {},
      correlationMatrix: this.calculateCorrelationMatrix(),
      rolling: this.calculateRollingMetrics(63)
    };
    
    // VaR em múltiplos níveis
    this.options.confidenceLevels.forEach(cl => {
      report.var[`VaR_${(cl*100).toFixed(0)}`] = this.calculateVaR(cl, 'historical');
      report.var[`VaR_${(cl*100).toFixed(0)}_param`] = this.calculateVaR(cl, 'parametric');
    });
    
    // Métricas vs cada benchmark
    Object.keys(this.benchmarkReturns).forEach(name => {
      report.benchmarks[name] = this.calculateBetaAlpha(name);
    });
    
    return report;
  }
  
  // Export para uso no console
  // const engine = new RiskEngine({ riskFreeRate: 0.1075 });
  // engine.setPortfolioReturns(portfolioReturns, dates);
  // engine.addBenchmark('CDI', cdiReturns, dates);
  // engine.addBenchmark('IBOV', ibovReturns, dates);
  // console.log(engine.generateFullReport());
}

window.RiskEngine = RiskEngine;