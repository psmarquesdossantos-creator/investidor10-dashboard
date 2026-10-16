// src/montecarlo/montecarlo-worker.js
// FASE 5: Monte Carlo + Risk Engine
// Web Worker off-main-thread para simulações (10k+ paths)
// VaR histórico, CVaR, stress tests (2008, 2020, cenários custom)
// Correlação real quando houver histórico de preços por ativo

// Monte Carlo Worker - roda em thread separada
// Comunicação via postMessage

const DEFAULT_CONFIG = {
  paths: 10000,           // Número de simulações
  horizonDays: 252,       // Horizonte (1 ano = 252 dias úteis)
  blockBootstrap: true,   // Usa blocos para preservar autocorrelação
  blockSize: 20,          // Tamanho do bloco (dias)
  confidenceLevels: [0.95, 0.99], // Níveis de confiança para VaR/CVaR
  randomSeed: null        // Seed para reprodutibilidade
};

// Cenários de stress pré-definidos
const STRESS_SCENARIOS = {
  '2008_crisis': {
    name: 'Crise 2008',
    description: 'Crise financeira global - queda ~50% em ações',
    shocks: { stocks: -0.45, fiis: -0.35, etfs: -0.40, fixed: 0.05, crypto: -0.60, bdr: -0.50, other: -0.20 },
    correlationMultiplier: 1.5 // Correlações aumentam em crise
  },
  '2020_covid': {
    name: 'COVID-19 (Mar 2020)',
    description: 'Pandemia - queda rápida ~35% e recuperação em V',
    shocks: { stocks: -0.35, fiis: -0.30, etfs: -0.33, fixed: 0.02, crypto: -0.50, bdr: -0.40, other: -0.15 },
    correlationMultiplier: 1.3
  },
  '2022_rate_hike': {
    name: 'Alta de Juros 2022',
    description: 'Ciclo de alta de juros global - renda fixa atrativa, ações pressionadas',
    shocks: { stocks: -0.20, fiis: -0.25, etfs: -0.18, fixed: 0.10, crypto: -0.65, bdr: -0.22, other: -0.10 },
    correlationMultiplier: 1.1
  },
  'brazil_political': {
    name: 'Risco Político Brasil',
    description: 'Incerteza fiscal/política - risco Brasil elevado',
    shocks: { stocks: -0.25, fiis: -0.30, etfs: -0.20, fixed: 0.05, crypto: -0.15, bdr: -0.15, other: -0.10 },
    correlationMultiplier: 1.2
  },
  'custom': {
    name: 'Cenário Personalizado',
    description: 'Defina seus próprios choques',
    shocks: { stocks: -0.20, fiis: -0.20, etfs: -0.20, fixed: 0.00, crypto: -0.30, bdr: -0.20, other: -0.10 },
    correlationMultiplier: 1.0
  }
};

// Utilitários matemáticos
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1)); }
function percentile(arr, p) { const sorted = [...arr].sort((a, b) => a - b); return sorted[Math.floor(p * (arr.length - 1))]; }
function quantile(arr, p) { return percentile(arr, p); }
function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

// Gera números pseudo-aleatórios (Mersenne Twister simplificado)
class RandomGenerator {
  constructor(seed = null) {
    this.seed = seed ?? Date.now();
    this.mt = new Array(624);
    this.mti = 624;
    this.init_genrand(this.seed);
  }
  
  init_genrand(seed) {
    this.mt[0] = seed >>> 0;
    for (this.mti = 1; this.mti < 624; this.mti++) {
      const s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] = ((((s & 0xffff0000) >>> 16) * 1812433253) + (s & 0x0000ffff) * 1812433253) + this.mti;
      this.mt[this.mti] >>>= 0;
    }
  }
  
  genrand_int32() {
    let y;
    const mag01 = [0x0, 0x9908b0df];
    if (this.mti >= 624) {
      let kk;
      for (kk = 0; kk < 624 - 397; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + 397] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < 623; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + 397 - 624] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (this.mt[623] & 0x80000000) | (this.mt[0] & 0x7fffffff);
      this.mt[623] = this.mt[396] ^ (y >>> 1) ^ mag01[y & 0x1];
      this.mti = 0;
    }
    y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);
    return y >>> 0;
  }
  
  random() { return this.genrand_int32() * (1.0 / 4294967296.0); }
  normal() { // Box-Muller
    const u1 = this.random();
    const u2 = this.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

// Cholesky decomposition para correlação
function cholesky(matrix) {
  const n = matrix.length;
  const L = Array(n).fill().map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

// Multiplica matriz * vetor
function matVecMul(L, z) {
  return L.map(row => row.reduce((sum, val, i) => sum + val * z[i], 0));
}

// Gera retornos correlacionados
function generateCorrelatedReturns(meanReturns, covMatrix, n, rng) {
  const nAssets = meanReturns.length;
  const L = cholesky(covMatrix);
  const results = Array(n).fill().map(() => Array(nAssets).fill(0));
  
  for (let i = 0; i < n; i++) {
    const z = Array(nAssets).fill().map(() => rng.normal());
    const correlated = matVecMul(L, z);
    for (let j = 0; j < nAssets; j++) {
      results[i][j] = meanReturns[j] + correlated[j];
    }
  }
  return results;
}

// Block bootstrap - preserva autocorrelação
function blockBootstrap(returns, blockSize, nPaths, horizonDays, rng) {
  const nDays = returns.length;
  const nAssets = returns[0].length;
  const nBlocks = Math.ceil(nDays / blockSize);
  const paths = Array(nPaths).fill().map(() => Array(horizonDays).fill().map(() => Array(nAssets).fill(0)));
  
  for (let path = 0; path < nPaths; path++) {
    let day = 0;
    while (day < horizonDays) {
      const blockStart = Math.floor(rng.random() * (nBlocks - 1)) * blockSize;
      const blockEnd = Math.min(blockStart + blockSize, nDays);
      const blockLen = blockEnd - blockStart;
      const take = Math.min(blockLen, horizonDays - day);
      
      for (let d = 0; d < take; d++) {
        for (let a = 0; a < nAssets; a++) {
          paths[path][day + d][a] = returns[blockStart + d][a];
        }
      }
      day += take;
    }
  }
  return paths;
}

// Simulação principal
function runMonteCarlo(data, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new RandomGenerator(cfg.randomSeed);
  
  // Extrai dados dos ativos
  const positions = data.positions || [];
  if (!positions.length) return { error: 'Nenhuma posição' };
  
  const total = positions.reduce((s, p) => s + (p.value || 0), 0);
  const classes = [...new Set(positions.map(p => p.class))];
  
  // Agrupa por classe
  const classData = {};
  for (const cls of classes) {
    const classPositions = positions.filter(p => p.class === cls);
    const classValue = classPositions.reduce((s, p) => s + (p.value || 0), 0);
    const classWeight = total > 0 ? classValue / total : 0;
    
    // Retornos históricos médios por classe (simplificado - em produção usaria série histórica real)
    const histReturns = classPositions.map(p => p.return || 0).filter(r => r !== 0);
    const meanReturn = histReturns.length ? histReturns.reduce((a, b) => a + b, 0) / histReturns.length / 100 : 0.0005; // diário
    const vol = histReturns.length > 1 ? std(histReturns.map(r => r / 100)) : 0.015; // diário
    
    classData[cls] = { weight: classWeight, meanReturn, vol, value: classValue };
  }
  
  // Matriz de correlação entre classes (simplificada)
  const classList = Object.keys(classData);
  const nClasses = classList.length;
  const corrMatrix = Array(nClasses).fill().map(() => Array(nClasses).fill(0.3));
  for (let i = 0; i < nClasses; i++) corrMatrix[i][i] = 1.0;
  
  // Covariance matrix
  const covMatrix = Array(nClasses).fill().map((_, i) => 
    Array(nClasses).fill().map((_, j) => 
      corrMatrix[i][j] * classData[classList[i]].vol * classData[classList[j]].vol
    )
  );
  
  // Mean returns vector
  const meanReturns = classList.map(cls => classData[cls].meanReturn);
  
  // Roda simulação
  let paths;
  if (cfg.blockBootstrap) {
    // Cria série histórica sintética para bootstrap
    const nDays = Math.max(252, cfg.paths);
    const syntheticReturns = Array(cfg.paths).fill().map(() => 
      classList.map((_, i) => rng.normal() * classData[classList[i]].vol + classData[classList[i]].meanReturn)
    );
    paths = blockBootstrap(syntheticReturns, cfg.blockSize, cfg.paths, cfg.horizonDays, rng);
  } else {
    paths = generateCorrelatedReturns(meanReturns, covMatrix, cfg.paths, rng);
  }
  
  // Calcula resultados por path
  const results = paths.map(path => {
    let portfolioValue = total;
    for (const dayReturns of path) {
      for (let i = 0; i < nClasses; i++) {
        const cls = classList[i];
        const weight = classData[cls].weight;
        portfolioValue *= (1 + dayReturns[i] * weight);
      }
    }
    return (portfolioValue - total) / total; // Retorno total do período
  });
  
  // Métricas de risco
  results.sort((a, b) => a - b);
  
  const metrics = {
    mean: mean(results),
    std: std(results),
    min: results[0],
    max: results[results.length - 1],
    median: percentile(results, 0.5)
  };
  
  // VaR e CVaR
  const varCvar = {};
  for (const cl of cfg.confidenceLevels) {
    const varIdx = Math.floor((1 - cl) * results.length);
    const varValue = results[varIdx];
    const cvarValues = results.slice(0, varIdx + 1);
    const cvar = cvarValues.length ? mean(cvarValues) : varValue;
    
    varCvar[`VaR_${Math.round(cl * 100)}%`] = varValue;
    varCvar[`CVaR_${Math.round(cl * 100)}%`] = cvar;
  }
  
  // Stress tests
  const stressResults = {};
  for (const [key, scenario] of Object.entries(STRESS_SCENARIOS)) {
    let portfolioValue = total;
    for (const cls of classList) {
      const weight = classData[cls].weight;
      const shock = scenario.shocks[cls] || 0;
      portfolioValue *= (1 + shock * weight);
    }
    stressResults[key] = {
      name: scenario.name,
      description: scenario.description,
      portfolioReturn: (portfolioValue - total) / total,
      portfolioValue,
      shocks: scenario.shocks
    };
  }
  
  // Probabilidade de perda
  const probLoss = results.filter(r => r < 0).length / results.length;
  const probLoss10 = results.filter(r => r < -0.1).length / results.length;
  const probLoss20 = results.filter(r => r < -0.2).length / results.length;
  
  return {
    config: cfg,
    totalPortfolio: total,
    classData: classList.map(cls => ({ class: cls, ...classData[cls] })),
    metrics,
    varCvar,
    stressTests: stressResults,
    probabilities: {
      loss: probLoss,
      loss10pct: probLoss10,
      loss20pct: probLoss20
    },
    percentilePaths: {
      p5: percentile(results, 0.05),
      p10: percentile(results, 0.10),
      p25: percentile(results, 0.25),
      p50: percentile(results, 0.50),
      p75: percentile(results, 0.75),
      p90: percentile(results, 0.90),
      p95: percentile(results, 0.95)
    },
    timestamp: new Date().toISOString(),
    pathsSample: results.slice(0, 100) // Amostra para gráfico
  };
}

// Stress test personalizado
function runCustomStress(data, customShocks) {
  const positions = data.positions || [];
  const total = positions.reduce((s, p) => s + (p.value || 0), 0);
  const byClass = {};
  positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });
  
  let portfolioValue = total;
  for (const [cls, value] of Object.entries(byClass)) {
    const weight = value / total;
    const shock = customShocks[cls] || 0;
    portfolioValue *= (1 + shock * weight);
  }
  
  return {
    portfolioReturn: (portfolioValue - total) / total,
    portfolioValue,
    byClass: Object.fromEntries(
      Object.entries(byClass).map(([cls, value]) => [
        cls, { 
          current: value, 
          shocked: value * (1 + (customShocks[cls] || 0)),
          shock: customShocks[cls] || 0
        }
      ])
    )
  };
}

// Handler de mensagens do Worker
self.onmessage = function(e) {
  const { type, data, config, id } = e.data;
  
  try {
    let result;
    switch (type) {
      case 'montecarlo':
        result = runMonteCarlo(data, config);
        break;
      case 'stress':
        result = runCustomStress(data, config.shocks);
        break;
      case 'stress_scenarios':
        result = STRESS_SCENARIOS;
        break;
      default:
        throw new Error(`Tipo desconhecido: ${type}`);
    }
    self.postMessage({ id, success: true, result });
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};

// Exporta para uso no main thread (fallback)
if (typeof window !== 'undefined') {
  window.MonteCarloEngine = {
    run: runMonteCarlo,
    stress: runCustomStress,
    scenarios: STRESS_SCENARIOS,
    DEFAULT_CONFIG
  };
}