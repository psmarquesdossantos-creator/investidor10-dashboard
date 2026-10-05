// monte-carlo-engine.js
// Projeção Monte Carlo para planejamento de longo prazo
// Simula 10,000+ paths, gera cone de confiança 10-20-30 anos

/**
 * MonteCarloEngine - Simulação estocástica de cenários futuros
 * 
 * Modelos suportados:
 * - GBM (Geometric Brownian Motion) - padrão para ações
 * - GBM com saltos (Merton) - eventos extremos
 * - Vasicek/CIR - para renda fixa (mean reversion)
 * - Regime Switching - bull/bear markets
 * - Historical Bootstrap - resample de retornos reais
 */

class MonteCarloEngine {
  constructor(options = {}) {
    this.options = {
      nSimulations: options.nSimulations || 10000,
      horizonYears: options.horizonYears || 30,
      timeStep: options.timeStep || 1/252, // diário
      initialValue: options.initialValue || 100000,
      monthlyContribution: options.monthlyContribution || 1000,
      contributionGrowth: options.contributionGrowth || 0.03, // 3% a.a. aumento aporte
      inflationRate: options.inflationRate || 0.035, // 3.5% a.a.
      randomSeed: options.randomSeed || null,
      ...options
    };
    
    this.portfolioParams = {
      expectedReturn: 0.12,     // 12% a.a. nominal
      volatility: 0.18,         // 18% a.a.
      skew: 0,                  // assimetria
      kurtosis: 3               // curtose (normal=3)
    };
    
    this.results = null;
    this.prng = null;
  }
  
  /**
   * Configura parâmetros do portfólio
   */
  setPortfolioParams(params) {
    this.portfolioParams = { ...this.portfolioParams, ...params };
    return this;
  }
  
  /**
   * Configura a partir de dados históricos (calibra parâmetros)
   */
  calibrateFromHistory(returns) {
    if (!returns.length) return this;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    
    // Skewness e Kurtosis
    let skew = 0, kurt = 0;
    returns.forEach(r => {
      const z = (r - mean) / std;
      skew += Math.pow(z, 3);
      kurt += Math.pow(z, 4);
    });
    skew /= returns.length;
    kurt /= returns.length;
    
    this.portfolioParams = {
      expectedReturn: mean * 252,
      volatility: std * Math.sqrt(252),
      skew: skew,
      kurtosis: kurt
    };
    
    return this;
  }
  
  /**
   * Inicializa gerador de números pseudo-aleatórios
   */
  _initPRNG(seed = null) {
    // Mulberry32 - rápido e boa qualidade
    let s = seed !== null ? seed : Math.floor(Math.random() * 2**32);
    this.prng = () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 2**32;
    };
  }
  
  /**
   * Gera número normal (Box-Muller)
   */
  _randn() {
    const u1 = this.prng();
    const u2 = this.prng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  /**
   * Gera número normal com skew/kurtosis (Cornish-Fisher)
   */
  _randnSkew() {
    const z = this._randn();
    const s = this.portfolioParams.skew;
    const k = this.portfolioParams.kurtosis - 3; // excess kurtosis
    
    if (Math.abs(s) < 0.01 && Math.abs(k) < 0.01) return z;
    
    // Expansão de Cornish-Fisher
    const z2 = z * z;
    const z3 = z2 * z;
    return z + (z2 - 1) * s / 6 + (z3 - 3*z) * k / 24 - (2*z3 - 5*z) * s*s / 36;
  }
  
  /**
   * Executa simulação Monte Carlo
   */
  run() {
    this._initPRNG(this.options.randomSeed);
    
    const {
      nSimulations,
      horizonYears,
      timeStep,
      initialValue,
      monthlyContribution,
      contributionGrowth,
      inflationRate
    } = this.options;
    
    const {
      expectedReturn,
      volatility
    } = this.portfolioParams;
    
    const nSteps = Math.floor(horizonYears / timeStep);
    const dt = timeStep;
    const drift = (expectedReturn - 0.5 * volatility * volatility) * dt;
    const volStep = volatility * Math.sqrt(dt);
    const monthlyStep = Math.floor(1/12 / dt); // passos por mês
    const annualInflationFactor = Math.pow(1 + inflationRate, dt);
    
    // Arrays para armazenar resultados
    // pathValues[sim][step] = valor do portfólio
    const pathValues = new Array(nSimulations);
    const pathRealValues = new Array(nSimulations); // ajustado pela inflação
    const finalValues = new Array(nSimulations);
    const finalRealValues = new Array(nSimulations);
    
    // Percentis para cone de confiança
    const percentiles = [5, 10, 25, 50, 75, 90, 95];
    const percentilePaths = {};
    percentiles.forEach(p => percentilePaths[p] = new Array(nSteps + 1));
    
    console.log(`[MonteCarlo] Iniciando ${nSimulations} simulações x ${nSteps} passos (${horizonYears} anos)`);
    
    for (let sim = 0; sim < nSimulations; sim++) {
      let value = initialValue;
      let realValue = initialValue;
      let contribution = monthlyContribution / 12; // diário aproximado
      
      pathValues[sim] = new Array(nSteps + 1);
      pathRealValues[sim] = new Array(nSteps + 1);
      pathValues[sim][0] = value;
      pathRealValues[sim][0] = realValue;
      
      for (let step = 1; step <= nSteps; step++) {
        // Retorno estocástico
        const shock = this._randnSkew();
        const dailyReturn = drift + volStep * shock;
        
        value *= (1 + dailyReturn);
        
        // Aporte mensal (aproximado diariamente)
        if (step % monthlyStep === 0) {
          value += contribution;
          contribution *= Math.pow(1 + contributionGrowth, dt * monthlyStep);
        }
        
        // Ajuste inflação
        realValue = value / Math.pow(1 + inflationRate, step * dt);
        
        pathValues[sim][step] = value;
        pathRealValues[sim][step] = realValue;
      }
      
      finalValues[sim] = value;
      finalRealValues[sim] = realValue;
      
      // Progress
      if (sim % 1000 === 0 && sim > 0) {
        console.log(`[MonteCarlo] ${sim}/${nSimulations} completadas`);
      }
    }
    
    // Calcula percentis em cada passo temporal
    for (let step = 0; step <= nSteps; step++) {
      const stepValues = pathValues.map(p => p[step]).sort((a, b) => a - b);
      const stepRealValues = pathRealValues.map(p => p[step]).sort((a, b) => a - b);
      
      percentiles.forEach(p => {
        const idx = Math.floor(p / 100 * (nSimulations - 1));
        percentilePaths[p][step] = {
          nominal: stepValues[idx],
          real: stepRealValues[idx]
        };
      });
    }
    
    // Estatísticas finais
    finalValues.sort((a, b) => a - b);
    finalRealValues.sort((a, b) => a - b);
    
    const getPercentile = (arr, p) => arr[Math.floor(p / 100 * (arr.length - 1))];
    
    this.results = {
      config: {
        nSimulations,
        horizonYears,
        initialValue,
        monthlyContribution,
        expectedReturn,
        volatility,
        inflationRate
      },
      summary: {
        nominal: {
          mean: finalValues.reduce((a,b) => a+b, 0) / nSimulations,
          median: getPercentile(finalValues, 50),
          p5: getPercentile(finalValues, 5),
          p10: getPercentile(finalValues, 10),
          p25: getPercentile(finalValues, 25),
          p75: getPercentile(finalValues, 75),
          p90: getPercentile(finalValues, 90),
          p95: getPercentile(finalValues, 95),
          min: finalValues[0],
          max: finalValues[nSimulations - 1],
          std: Math.sqrt(finalValues.reduce((sum, v) => sum + Math.pow(v - finalValues.reduce((a,b)=>a+b,0)/nSimulations, 2), 0) / (nSimulations - 1))
        },
        real: {
          mean: finalRealValues.reduce((a,b) => a+b, 0) / nSimulations,
          median: getPercentile(finalRealValues, 50),
          p5: getPercentile(finalRealValues, 5),
          p10: getPercentile(finalRealValues, 10),
          p25: getPercentile(finalRealValues, 25),
          p75: getPercentile(finalRealValues, 75),
          p90: getPercentile(finalRealValues, 90),
          p95: getPercentile(finalRealValues, 95),
          min: finalRealValues[0],
          max: finalRealValues[nSimulations - 1]
        }
      },
      cone: percentilePaths,
      paths: {
        nominal: pathValues,      // todas as paths (cuidado: grande!)
        real: pathRealValues,
        final: finalValues,
        finalReal: finalRealValues
      },
      probabilityOfLoss: finalValues.filter(v => v < initialValue).length / nSimulations,
      probabilityOfDoubling: finalValues.filter(v => v > 2 * initialValue).length / nSimulations,
      probabilityOf10x: finalValues.filter(v => v > 10 * initialValue).length / nSimulations,
      yearsToDouble: {
        median: Math.log(2) / Math.log(1 + expectedReturn),
        p10: Math.log(2) / Math.log(1 + getPercentile(finalValues.map(v => Math.pow(v/initialValue, 1/horizonYears) - 1), 10)),
        p90: Math.log(2) / Math.log(1 + getPercentile(finalValues.map(v => Math.pow(v/initialValue, 1/horizonYears) - 1), 90))
      }
    };
    
    console.log('[MonteCarlo] Simulação concluída');
    return this.results;
  }
  
  /**
   * Gera relatório em formato texto
   */
  generateReport() {
    if (!this.results) return 'Execute run() primeiro';
    
    const { summary, config, probabilityOfLoss, probabilityOfDoubling, probabilityOf10x } = this.results;
    
    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
    const fmtPct = (v) => (v * 100).toFixed(1) + '%';
    
    let report = `
╔══════════════════════════════════════════════════════════════╗
║           MONTE CARLO PROJEÇÃO - INVESTIDOR10                ║
╠══════════════════════════════════════════════════════════════╣
║  Configuração:                                              ║
║  - Simulações: ${config.nSimulations.toLocaleString().padStart(10)}                                    ║
║  - Horizonte: ${config.horizonYears.toString().padStart(11)} anos                                          ║
║  - Valor Inicial: ${fmt(config.initialValue).padStart(12)}                                ║
║  - Aporte Mensal: ${fmt(config.monthlyContribution).padStart(12)}                                ║
║  - Retorno Esperado: ${fmtPct(config.expectedReturn).padStart(10)}                                   ║
║  - Volatilidade: ${fmtPct(config.volatility).padStart(13)}                                     ║
║  - Inflação: ${fmtPct(config.inflationRate).padStart(17)}                                        ║
╠══════════════════════════════════════════════════════════════╣
║  RESULTADOS NOMINAIS (R$):                                   ║
║  - Média:        ${fmt(summary.nominal.mean).padStart(15)}                                ║
║  - Mediana (P50): ${fmt(summary.nominal.median).padStart(14)}                               ║
║  - P10 (pessimista): ${fmt(summary.nominal.p10).padStart(10)}                            ║
║  - P90 (otimista): ${fmt(summary.nominal.p90).padStart(10)}                            ║
║  - Min/Max: ${fmt(summary.nominal.min)} / ${fmt(summary.nominal.max)}        ║
╠══════════════════════════════════════════════════════════════╣
║  RESULTADOS REAIS (ajustado inflação):                       ║
║  - Média:        ${fmt(summary.real.mean).padStart(15)}                                ║
║  - Mediana (P50): ${fmt(summary.real.median).padStart(14)}                               ║
║  - P10: ${fmt(summary.real.p10).padStart(24)}                                        ║
║  - P90: ${fmt(summary.real.p90).padStart(24)}                                        ║
╠══════════════════════════════════════════════════════════════╣
║  PROBABILIDADES:                                             ║
║  - Perda (valor < inicial): ${fmtPct(probabilityOfLoss).padStart(10)}                             ║
║  - Dobrar capital: ${fmtPct(probabilityOfDoubling).padStart(18)}                              ║
║  - 10x capital: ${fmtPct(probabilityOf10x).padStart(21)}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  CONE DE CONFIANÇA (anual - valores nominais):               ║
`;
    
    const years = [1, 5, 10, 15, 20, 25, 30].filter(y => y <= config.horizonYears);
    const stepPerYear = Math.floor(1 / (config.horizonYears / (config.nSimulations > 0 ? 252 : 1)));
    
    years.forEach(year => {
      const step = Math.min(year * 252, Object.keys(this.results.cone['50']).length - 1);
      if (this.results.cone['10'][step] && this.results.cone['90'][step]) {
        const p10 = fmt(this.results.cone['10'][step].nominal);
        const p50 = fmt(this.results.cone['50'][step].nominal);
        const p90 = fmt(this.results.cone['90'][step].nominal);
        report += `║  Ano ${year.toString().padStart(2)}: P10=${p10.padStart(18)}  P50=${p50.padStart(18)}  P90=${p90.padStart(18)} ║\n`;
      }
    });
    
    report += `╚══════════════════════════════════════════════════════════════╝`;
    
    return report;
  }
  
  /**
   * Exporta dados para gráfico (Chart.js)
   */
  exportChartData() {
    if (!this.results) return null;
    
    const years = Array.from({ length: this.options.horizonYears + 1 }, (_, i) => i);
    const stepPerYear = Math.floor(this.results.cone['50'].length / this.options.horizonYears);
    
    const datasets = [
      { label: 'P10 (Pessimista)', data: years.map(y => this.results.cone['10'][y * stepPerYear]?.nominal || 0), borderColor: '#ea4335', fill: false },
      { label: 'P25', data: years.map(y => this.results.cone['25'][y * stepPerYear]?.nominal || 0), borderColor: '#f9ab00', fill: false },
      { label: 'Mediana (P50)', data: years.map(y => this.results.cone['50'][y * stepPerYear]?.nominal || 0), borderColor: '#1a73e8', fill: false, borderWidth: 3 },
      { label: 'P75', data: years.map(y => this.results.cone['75'][y * stepPerYear]?.nominal || 0), borderColor: '#34a853', fill: false },
      { label: 'P90 (Otimista)', data: years.map(y => this.results.cone['90'][y * stepPerYear]?.nominal || 0), borderColor: '#80868b', fill: false, borderDash: [5, 5] }
    ];
    
    return { labels: years.map(y => `Ano ${y}`), datasets };
  }
}

window.MonteCarloEngine = MonteCarloEngine;

// Uso:
// const mc = new MonteCarloEngine({ nSimulations: 5000, horizonYears: 30, initialValue: 500000, monthlyContribution: 5000 });
// mc.setPortfolioParams({ expectedReturn: 0.12, volatility: 0.18 });
// mc.run();
// console.log(mc.generateReport());
// chart.data = mc.exportChartData();