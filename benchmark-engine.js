// benchmark-engine.js
// Benchmark Suite: CDI, IBOV, IFIX, SMLL, IDIV, IMAB, SMAL, BTC, DOL, USDBRL
// Busca dados reais via brapi.dev + awesomeapi + local fallback

/**
 * BenchmarkEngine - Suite completa de benchmarks brasileiros
 * 
 * Benchmarks incluídos:
 * - CDI: Taxa DI diária (via brapi.dev ou BCB SGS)
 * - IBOV: Índice Bovespa
 * - IFIX: Índice de Fundos Imobiliários
 * - SMLL: Small Caps
 * - IDIV: Dividend Yield
 * - IMAB: IMA-B (títulos públicos IPCA)
 * - IMAB5: IMA-B 5 anos
 * - BTC: Bitcoin em BRL
 * - DOL: Dólar Futuro
 * - USDBRL: Dólar Comercial
 * - CDI_ACUMULADO: CDI acumulado no ano
 */

class BenchmarkEngine {
  constructor(options = {}) {
    this.options = {
      brapiToken: options.brapiToken || null,
      cacheTTL: options.cacheTTL || 3600000, // 1 hora
      ...options
    };
    
    this.cache = new Map();
    this.benchmarks = {
      'CDI': { name: 'CDI', type: 'rate', source: 'brapi', ticker: 'CDI' },
      'IBOV': { name: 'IBOVESPA', type: 'index', source: 'brapi', ticker: '^BVSP' },
      'IFIX': { name: 'IFIX', type: 'index', source: 'brapi', ticker: 'IFIX' },
      'SMLL': { name: 'SMLL', type: 'index', source: 'brapi', ticker: 'SMLL' },
      'IDIV': { name: 'IDIV', type: 'index', source: 'brapi', ticker: 'IDIV' },
      'IMAB': { name: 'IMA-B', type: 'index', source: 'brapi', ticker: 'IMAB' },
      'IMAB5': { name: 'IMA-B 5', type: 'index', source: 'brapi', ticker: 'IMAB5' },
      'BTC': { name: 'Bitcoin', type: 'crypto', source: 'brapi', ticker: 'BTC' },
      'DOL': { name: 'Dólar Futuro', type: 'currency', source: 'brapi', ticker: 'DOL' },
      'USDBRL': { name: 'USD/BRL', type: 'currency', source: 'awesomeapi', ticker: 'USD-BRL' }
    };
    
    this.data = {};
  }
  
  /**
   * Busca dados de um benchmark
   */
  async fetchBenchmark(key, days = 252) {
    const cacheKey = `${key}_${days}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.options.cacheTTL) {
      return cached.data;
    }
    
    const benchmark = this.benchmarks[key];
    if (!benchmark) throw new Error(`Benchmark ${key} não encontrado`);
    
    let data;
    try {
      if (benchmark.source === 'brapi') {
        data = await this._fetchBrapi(benchmark.ticker, days);
      } else if (benchmark.source === 'awesomeapi') {
        data = await this._fetchAwesomeAPI(benchmark.ticker, days);
      }
      
      if (data) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        this.data[key] = data;
        return data;
      }
    } catch (err) {
      console.warn(`[BenchmarkEngine] Erro ao buscar ${key}:`, err.message);
      // Fallback para dados mockados se disponível
      return this._getMockData(key, days);
    }
    
    return this._getMockData(key, days);
  }
  
  /**
   * Busca via brapi.dev
   */
  async _fetchBrapi(ticker, days) {
    const url = `https://brapi.dev/api/quote/${ticker}?range=1y&interval=1d`;
    const headers = this.options.brapiToken ? { 'Authorization': `Bearer ${this.options.brapiToken}` } : {};
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`brapi.dev: ${response.status}`);
    
    const json = await response.json();
    const results = json.results || json;
    
    if (!results || !results.length) throw new Error('Sem dados');
    
    const item = results[0];
    if (!item.historicalDataPrice || !item.historicalDataPrice.length) {
      throw new Error('Sem histórico');
    }
    
    // Processa dados históricos
    const prices = item.historicalDataPrice
      .slice(-days)
      .map(d => ({
        date: new Date(d.date * 1000).toISOString().split('T')[0],
        close: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume
      }))
      .filter(d => d.close != null);
    
    // Calcula retornos diários
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].close - prices[i-1].close) / prices[i-1].close;
      returns.push(ret);
    }
    
    return {
      key: key,
      name: this.benchmarks[key]?.name || key,
      ticker: ticker,
      prices: prices,
      returns: returns,
      currentPrice: prices[prices.length - 1]?.close,
      change1d: prices.length > 1 ? ((prices[prices.length-1].close - prices[prices.length-2].close) / prices[prices.length-2].close) : 0,
      changeYTD: this._calculateYTD(prices),
      volatility: this._calculateVolatility(returns),
      sharpe: this._calculateSharpe(returns),
      maxDrawdown: this._calculateMaxDD(prices.map(p => p.close))
    };
  }
  
  /**
   * Busca via AwesomeAPI (câmbio)
   */
  async _fetchAwesomeAPI(pair, days) {
    // AwesomeAPI não tem histórico longo gratuito, usa mock
    return this._getMockData(pair.replace('-', ''), days);
  }
  
  /**
   * Busca múltiplos benchmarks em paralelo
   */
  async fetchAll(keys = null, days = 252) {
    const targets = keys || Object.keys(this.benchmarks);
    const promises = targets.map(key => 
      this.fetchBenchmark(key, days).catch(err => {
        console.warn(`[BenchmarkEngine] Falha ao buscar ${key}:`, err.message);
        return this._getMockData(key, days);
      })
    );
    
    const results = await Promise.allSettled(promises);
    const data = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        data[targets[i]] = r.value;
      }
    });
    
    return data;
  }
  
  /**
   * Calcula retorno YTD
   */
  _calculateYTD(prices) {
    if (!prices.length) return 0;
    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0,0,0,0);
    
    const yearStartPrice = prices.find(p => new Date(p.date) >= yearStart);
    if (!yearStartPrice) return 0;
    
    const currentPrice = prices[prices.length - 1].close;
    return (currentPrice - yearStartPrice.close) / yearStartPrice.close;
  }
  
  /**
   * Calcula volatilidade anualizada
   */
  _calculateVolatility(returns) {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252);
  }
  
  /**
   * Calcula Sharpe vs CDI
   */
  _calculateSharpe(returns) {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1));
    const rfDaily = 0.1075 / 252; // CDI ~10.75% a.a.
    return std > 0 ? ((mean - rfDaily) / std) * Math.sqrt(252) : 0;
  }
  
  /**
   * Calcula Max Drawdown
   */
  _calculateMaxDD(prices) {
    let peak = prices[0];
    let maxDD = 0;
    prices.forEach(p => {
      peak = Math.max(peak, p);
      const dd = (peak - p) / peak;
      maxDD = Math.max(maxDD, dd);
    });
    return maxDD;
  }
  
  /**
   * Dados mockados para fallback/offline
   */
  _getMockData(key, days) {
    const mockBase = {
      'CDI': { name: 'CDI', annualRate: 0.1075, dailyRate: 0.1075/252 },
      'IBOV': { name: 'IBOVESPA', annualReturn: 0.15, volatility: 0.25 },
      'IFIX': { name: 'IFIX', annualReturn: 0.12, volatility: 0.18 },
      'SMLL': { name: 'SMLL', annualReturn: 0.18, volatility: 0.30 },
      'IDIV': { name: 'IDIV', annualReturn: 0.14, volatility: 0.20 },
      'IMAB': { name: 'IMA-B', annualReturn: 0.08, volatility: 0.10 },
      'IMAB5': { name: 'IMA-B 5', annualReturn: 0.09, volatility: 0.12 },
      'BTC': { name: 'Bitcoin', annualReturn: 0.50, volatility: 0.70 },
      'DOL': { name: 'Dólar Futuro', annualReturn: 0.05, volatility: 0.15 },
      'USDBRL': { name: 'USD/BRL', annualReturn: 0.03, volatility: 0.12 }
    };
    
    const config = mockBase[key] || { name: key, annualReturn: 0.10, volatility: 0.20 };
    const dailyReturn = config.annualReturn / 252;
    const dailyVol = config.volatility / Math.sqrt(252);
    
    // Gera série sintética
    const prices = [];
    let price = 100000;
    const returns = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const ret = dailyReturn + (Math.random() - 0.5) * dailyVol * 2;
      price *= (1 + ret);
      prices.push({
        date: date.toISOString().split('T')[0],
        close: price,
        open: price * (1 + (Math.random() - 0.5) * 0.01),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        volume: Math.floor(Math.random() * 1e9)
      });
      returns.push(ret);
    }
    
    return {
      key: key,
      name: config.name,
      ticker: this.benchmarks[key]?.ticker || key,
      prices: prices,
      returns: returns,
      currentPrice: price,
      change1d: returns[returns.length - 1] || 0,
      changeYTD: this._calculateYTD(prices),
      volatility: this._calculateVolatility(returns),
      sharpe: this._calculateSharpe(returns),
      maxDrawdown: this._calculateMaxDD(prices.map(p => p.close)),
      isMock: true
    };
  }
  
  /**
   * Gera série de retornos para uso no RiskEngine
   */
  getReturnsSeries(key) {
    const data = this.data[key];
    if (!data) return { returns: [], dates: [] };
    return {
      returns: data.returns,
      dates: data.prices.map(p => p.date)
    };
  }
  
  /**
   * Compara performance do portfólio vs benchmarks
   */
  comparePortfolio(portfolioReturns, portfolioDates) {
    const results = {};
    
    Object.entries(this.data).forEach(([key, bench]) => {
      if (!bench.returns.length) return;
      
      // Alinha séries
      const aligned = this._alignSeries(
        portfolioReturns, portfolioDates,
        bench.returns, bench.prices.map(p => p.date)
      );
      
      if (aligned.a.length < 20) return;
      
      const portMean = aligned.a.reduce((a,b) => a+b, 0) / aligned.a.length;
      const benchMean = aligned.b.reduce((a,b) => a+b, 0) / aligned.b.length;
      const portStd = Math.sqrt(aligned.a.reduce((sum, r) => sum + Math.pow(r - portMean, 2), 0) / (aligned.a.length - 1));
      const benchStd = Math.sqrt(aligned.b.reduce((sum, r) => sum + Math.pow(r - benchMean, 2), 0) / (aligned.b.length - 1));
      
      // Beta
      let cov = 0;
      for (let i = 0; i < aligned.a.length; i++) {
        cov += (aligned.a[i] - portMean) * (aligned.b[i] - benchMean);
      }
      cov /= (aligned.a.length - 1);
      const beta = benchStd > 0 ? cov / (benchStd * benchStd) : 0;
      
      // Alpha
      const portAnnual = (1 + portMean) ** 252 - 1;
      const benchAnnual = (1 + benchMean) ** 252 - 1;
      const rf = 0.1075;
      const alpha = portAnnual - (rf + beta * (benchAnnual - rf));
      
      // Tracking Error
      const activeReturns = aligned.a.map((r, i) => r - aligned.b[i]);
      const te = Math.sqrt(activeReturns.reduce((sum, r) => sum + Math.pow(r - activeReturns.reduce((a,b)=>a+b,0)/activeReturns.length, 2), 0) / (activeReturns.length - 1)) * Math.sqrt(252);
      
      // Information Ratio
      const ir = te > 0 ? (activeReturns.reduce((a,b)=>a+b,0) / activeReturns.length) * 252 / te : 0;
      
      results[key] = {
        benchmark: bench.name,
        beta: beta.toFixed(3),
        alpha: (alpha * 100).toFixed(2) + '%',
        trackingError: (te * 100).toFixed(2) + '%',
        informationRatio: ir.toFixed(3),
        correlation: (cov / (portStd * benchStd)).toFixed(3),
        excessReturn: ((portAnnual - benchAnnual) * 100).toFixed(2) + '%'
      };
    });
    
    return results;
  }
  
  _alignSeries(returnsA, datesA, returnsB, datesB) {
    const mapA = new Map(datesA.map((d, i) => [d, returnsA[i]]));
    const mapB = new Map(datesB.map((d, i) => [d, returnsB[i]]));
    const commonDates = [...mapA.keys()].filter(d => mapB.has(d)).sort();
    return {
      a: commonDates.map(d => mapA.get(d)),
      b: commonDates.map(d => mapB.get(d)),
      dates: commonDates
    };
  }
  
  /**
   * Limpa cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Backtest: compara carteira vs benchmark usando retornos diários simulados
   * Gaps de alocação, drawdown máximo, e recomendações de rebalanceamento
   */
  backtest(portfolioReturns, benchmarkReturns, portfolioMeta, benchmarkMeta) {
    const aligned = this._alignSeries(portfolioReturns.a || portfolioReturns, [], benchmarkReturns.b || benchmarkReturns, []);
    const a = aligned.a, b = aligned.b;
    const n = a.length;

    const portCum = [1]; const benchCum = [1];
    for (let i = 0; i < n; i++) { portCum.push(portCum[i] * (1 + a[i])); benchCum.push(benchCum[i] * (1 + b[i])); }

    let maxDD = 0, peak = 1;
    for (const v of portCum) { if (v > peak) peak = v; const dd = (peak - v) / peak; if (dd > maxDD) maxDD = dd; }

    const portTotal = (portCum[portCum.length - 1] - 1) * 100;
    const benchTotal = (benchCum[benchCum.length - 1] - 1) * 100;
    const excess = portTotal - benchTotal;

    const recs = [];
    if (portfolioMeta && benchmarkMeta) {
      const allocGap = Math.abs(portfolioMeta.currentPct - portfolioMeta.targetPct);
      if (allocGap > 5) recs.push(`Gap de alocação: ${allocGap.toFixed(1)}pp — rebalancear ${portfolioMeta.ticker}`);
    }
    if (maxDD > 0.15) recs.push(`Drawdown máximo ${(maxDD * 100).toFixed(1)}% — revisar risco`);
    if (excess < -5) recs.push(`Underperformance ${(excess).toFixed(1)}pp — avaliar estratégia`);

    return { portTotal: portTotal.toFixed(2) + '%', benchTotal: benchTotal.toFixed(2) + '%', excess: excess.toFixed(2) + '%', maxDD: (maxDD * 100).toFixed(2) + '%', recommendations: recs };
  }
}

window.BenchmarkEngine = BenchmarkEngine;

// Uso:
// const bench = new BenchmarkEngine({ brapiToken: 'SEU_TOKEN' });
// await bench.fetchAll(['CDI', 'IBOV', 'IFIX', 'SMLL']);
// console.log(bench.data);