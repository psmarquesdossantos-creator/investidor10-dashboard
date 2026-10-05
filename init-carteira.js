// init-carteira.js - Carrega dados reais da carteira se disponível
// Este arquivo substitui o script inline no index.html para compatibilidade CSP

(function() {
  if (!window.CARTEIRA_DATA) return;
  // impede que um snapshot antigo do localStorage sobrescreva os dados reais
  try { localStorage.removeItem('investidor10-dashboard-data'); } catch(e) {}
  window.__CARTEIRA_OVERRIDE = window.CARTEIRA_DATA;
})();