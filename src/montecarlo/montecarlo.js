// src/montecarlo/montecarlo.js
// FASE 5: Monte Carlo + Risk Engine - Main Thread Wrapper
// Usa Web Worker para simulações off-main-thread

(function() {
  'use strict';

  let worker = null;
  let pendingRequests = new Map();
  let requestId = 0;

  // Inicializa worker
  function initWorker() {
    if (worker) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      try {
        // Cria worker inline (blob URL)
        const workerCode = `
          // Monte Carlo Worker - auto-registrado
          ${document.getElementById('montecarlo-worker-code')?.textContent || ''}
        `;
        
        // Tenta carregar worker externo primeiro
        worker = new Worker('src/montecarlo/montecarlo-worker.js');
        
        worker.onmessage = (e) => {
          const { id, success, result, error } = e.data;
          const pending = pendingRequests.get(id);
          if (pending) {
            pendingRequests.delete(id);
            if (success) pending.resolve(result);
            else pending.reject(new Error(error));
          }
        };
        
        worker.onerror = (err) => {
          console.error('[MonteCarlo] Worker error:', err);
          // Fallback para main thread
          worker = null;
          reject(err);
        };
        
        // Testa worker
        worker.postMessage({ type: 'ping', id: 0 });
        setTimeout(() => resolve(), 100);
      } catch (err) {
        console.warn('[MonteCarlo] Worker init failed, using main thread fallback:', err);
        worker = null;
        resolve(); // Fallback para main thread
      }
    });
  }

  // Envia comando para worker
  function sendToWorker(type, data, config = {}) {
    if (!worker) return initWorker().then(() => sendToWorker(type, data, config));
    
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pendingRequests.set(id, { resolve, reject });
      
      worker.postMessage({ type, data, config, id });
      
      // Timeout de segurança
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Worker timeout'));
        }
      }, 120000); // 2 minutos
    });
  }

  // API Principal
  async function runMonteCarlo(data, config = {}) {
    try {
      return await sendToWorker('montecarlo', data, config);
    } catch (err) {
      console.warn('[MonteCarlo] Worker failed, using main thread fallback:', err);
      return runMonteCarloMainThread(data, config);
    }
  }

  async function runStressTest(data, shocks) {
    try {
      return await sendToWorker('stress', data, { shocks });
    } catch (err) {
      console.warn('[MonteCarlo] Worker failed for stress test:', err);
      return runStressMainThread(data, shocks);
    }
  }

  async function getScenarios() {
    try {
      return await sendToWorker('stress_scenarios', null, {});
    } catch (err) {
      return STRESS_SCENARIOS;
    }
  }

  // Fallback Main Thread (se worker falhar)
  function runMonteCarloMainThread(data, config) {
    // Importa lógica do worker (inline)
    return runMonteCarloFallback(data, config);
  }

  function runStressMainThread(data, shocks) {
    return runCustomStressFallback(data, shocks);
  }

  // Fallback inline (código simplificado do worker)
  function runMonteCarloFallback(data, config = {}) {
    const cfg = { 
      paths: 5000, 
      horizonDays: 252, 
      confidenceLevels: [0.95, 0.99],
      ...config 
    };
    
    const positions = data.positions || [];
    if (!positions.length) return { error: 'Nenhuma posição' };
    
    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    const byClass = {};
    positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });
    const classes = Object.keys(byClass);
    
    // Simulação simplificada
    const results = [];
    for (let i = 0; i < cfg.paths; i++) {
      let portfolioValue = total;
      for (const cls of classes) {
        const weight = byClass[cls] / total;
        // Retorno aleatório simplificado
        const dailyReturn = (Math.random() - 0.5) * 0.03; // ~3% vol diário
        portfolioValue *= (1 + dailyReturn * weight * 252);
      }
      results.push((portfolioValue - total) / total);
    }
    
    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const std = Math.sqrt(results.reduce((s, r) => s + (r - mean) ** 2, 0) / (results.length - 1));
    
    const varCvar = {};
    for (const cl of (cfg.confidenceLevels || [0.95, 0.99])) {
      const idx = Math.floor((1 - cl) * results.length);
      varCvar[`VaR_${Math.round(cl * 100)}%`] = results[idx];
      varCvar[`CVaR_${Math.round(cl * 100)}%`] = results.slice(0, idx + 1).reduce((a, b) => a + b, 0) / (idx + 1);
    }
    
    return {
      totalPortfolio: total,
      metrics: { mean, std, min: results[0], max: results[results.length - 1] },
      varCvar,
      stressTests: {},
      probabilities: { loss: results.filter(r => r < 0).length / results.length },
      timestamp: new Date().toISOString()
    };
  }

  function runCustomStressFallback(data, shocks) {
    const positions = data.positions || [];
    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    const byClass = {};
    positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });
    
    let portfolioValue = total;
    for (const [cls, value] of Object.entries(byClass)) {
      const weight = value / total;
      const shock = shocks[cls] || 0;
      portfolioValue *= (1 + shock * weight);
    }
    
    return {
      portfolioReturn: (portfolioValue - total) / total,
      portfolioValue,
      byClass: Object.fromEntries(
        Object.entries(byClass).map(([cls, value]) => [
          cls, { current: value, shocked: value * (1 + (shocks[cls] || 0)), shock: shocks[cls] || 0 }
        ])
      )
    };
  }

  // Cenários de stress
  const STRESS_SCENARIOS = {
    '2008_crisis': { name: 'Crise 2008', shocks: { stocks: -0.45, fiis: -0.35, etfs: -0.40, fixed: 0.05, crypto: -0.60, bdr: -0.50, other: -0.20 } },
    '2020_covid': { name: 'COVID-19 (Mar 2020)', shocks: { stocks: -0.35, fiis: -0.30, etfs: -0.33, fixed: 0.02, crypto: -0.50, bdr: -0.40, other: -0.15 } },
    '2022_rate_hike': { name: 'Alta de Juros 2022', shocks: { stocks: -0.20, fiis: -0.25, etfs: -0.18, fixed: 0.10, crypto: -0.65, bdr: -0.22, other: -0.10 } },
    'brazil_political': { name: 'Risco Político Brasil', shocks: { stocks: -0.25, fiis: -0.30, etfs: -0.20, fixed: 0.05, crypto: -0.15, bdr: -0.15, other: -0.10 } },
    'custom': { name: 'Cenário Personalizado', shocks: { stocks: -0.20, fiis: -0.20, etfs: -0.20, fixed: 0.00, crypto: -0.30, bdr: -0.20, other: -0.10 } }
  };

  // Renderiza resultados
  function renderMonteCarloResult(result) {
    const container = document.getElementById('montecarloResult');
    if (!container) return;
    
    const { metrics, varCvar, stressTests, probabilities, percentilePaths } = result;
    
    let html = `
      <div class="mc-summary">
        <div class="summary-cards">
          <div class="card"><strong>Retorno Esperado</strong><br>${fmtPct(metrics.mean * 100)}</div>
          <div class="card"><strong>Volatilidade</strong><br>${fmtPct(metrics.std * 100)}</div>
          <div class="card">${Object.entries(varCvar).filter(([k]) => k.startsWith('VaR')).map(([k,v]) => `${k}: <strong>${fmtPct(v * 100)}</strong>`).join('<br>')}</div>
          <div class="card">${Object.entries(varCvar).filter(([k]) => k.startsWith('CVaR')).map(([k,v]) => `${k}: <strong>${fmtPct(v * 100)}</strong>`).join('<br>')}</div>
          <div class="card"><strong>Prob. Perda</strong><br>${fmtPct(probabilities.loss * 100)}</div>
          <div class="card"><strong>Prob. Perda >10%</strong><br>${fmtPct((probabilities.loss10pct || 0) * 100)}</div>
          <div class="card"><strong>Prob. Perda >20%</strong><br>${fmtPct((probabilities.loss20pct || 0) * 100)}</div>
        </div>
      </div>
    `;
    
    // Stress tests
    if (result.stressTests && Object.keys(result.stressTests).length) {
      html += `
        <div class="stress-tests">
          <h4>🧪 Testes de Estresse</h4>
          <table class="data-table">
            <thead><tr><th>Cenário</th><th>Retorno</th><th>Valor Final</th><th>Descrição</th></tr></thead>
            <tbody>
      `;
      for (const [key, stress] of Object.entries(result.stressTests)) {
        html += `<tr><td><strong>${stress.name}</strong></td><td class="${stress.portfolioReturn >= 0 ? 'positive' : 'negative'}">${fmtPct(stress.portfolioReturn * 100)}</td><td>${fmtBRL(stress.portfolioValue)}</td><td class="text-muted">${stress.description}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    
    container.innerHTML = html;
  }

  // Formatters
  const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = v => `${Number(v || 0) >= 0 ? '+' : ''}${fmtNum(v)}%`;

  // API pública
  window.MonteCarloEngine = {
    run: runMonteCarlo,
    stress: runStressTest,
    scenarios: STRESS_SCENARIOS,
    render: renderMonteCarloResult,
    getScenarios,
    fmtBRL,
    fmtPct
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorker);
  } else {
    initWorker();
  }

})();