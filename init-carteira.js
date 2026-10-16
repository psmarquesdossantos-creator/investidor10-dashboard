// init-carteira.js - Carrega dados reais da carteira se disponível
// Este arquivo substitui o script inline no index.html para compatibilidade CSP

(function () {
  if (!window.CARTEIRA_DATA) return;
  // impede que um snapshot antigo do localStorage sobrescreva os dados reais
  try { localStorage.removeItem('investidor10-dashboard-data'); } catch(e) {}
  window.__CARTEIRA_OVERRIDE = window.CARTEIRA_DATA;
  
  // Auto-aplica dados reais se real-mode estiver disponível
  if (window.applyRealData) {
    window.applyRealData();
  } else if (window.Investidor10RealMode && window.Investidor10RealMode.applyRealData) {
    window.Investidor10RealMode.applyRealData();
  }

  // Setup default CARTEIRA_META for rebalanceador if not already set from backup
  if (!window.CARTEIRA_META) {
    // Default target allocation for a balanced portfolio
    window.CARTEIRA_META = {
      goals: {
        allocation: {
          "FIIs": 0.20,      // 20% - reduced from current ~49%
          "Renda Fixa": 0.40, // 40% - increased from current ~32%
          "Fundos": 0.15,     // 15% - similar to current ~15%
          "Ações": 0.20,      // 20% - increased from current ~4%
          "Criptos": 0.05     // 5% - added allocation
        },
        // Preserve other goal properties if needed
      }
    };
    // Flag to indicate that our code ran
    window.__INIT_CARTEIRA_RAN = true;
  }

  // Dispara evento para outros módulos
  window.dispatchEvent(new CustomEvent('carteira-data-loaded', { detail: window.CARTEIRA_DATA }));
})();