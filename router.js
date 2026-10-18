// router.js — Hash-only SPA routing (simples, robusto, sem pushState)
// Suporta: #/tab, #/tab?param=value, browser back/forward, document.title sync

(function () {
  'use strict';

  const ROUTE_MAP = {
    summary:      { panel: 'summary',      title: 'Resumo' },
    patrimony:    { panel: 'patrimony',    title: 'Patrimônio' },
    returns:      { panel: 'returns',      title: 'Rentabilidade' },
    positions:    { panel: 'positions',    title: 'Posições' },
    earnings:     { panel: 'earnings',     title: 'Proventos' },
    entries:      { panel: 'entries',      title: 'Lançamentos' },
    fixed:        { panel: 'fixed',        title: 'Renda Fixa' },
    rebalance:    { panel: 'rebalance',    title: 'Rebalancear' },
    risk:         { panel: 'risk',         title: 'Risco' },
    montecarlo:   { panel: 'montecarlo',   title: 'Monte Carlo' },
    benchmarks:   { panel: 'benchmarks',   title: 'Benchmarks' },
    tax:          { panel: 'tax',          title: 'Impostos' },
    import:       { panel: 'import',       title: 'Importar' },
    backup:       { panel: 'backup',       title: 'Backup' },
    'corporate-events': { panel: 'corporate-events', title: 'Eventos Corp.' },
    'data-quality': { panel: 'data-quality', title: 'Qualidade dos Dados' },
    'goals':      { panel: 'goals',        title: 'Metas' },
    'backup-portability': { panel: 'backup-portability', title: 'Backup Port.' },
  };

  const DEFAULT_TAB = 'summary';
  let isNavigating = false;

  function parseHash() {
    const hash = location.hash.slice(1) || DEFAULT_TAB;
    const [path, search] = hash.split('?');
    const params = new URLSearchParams(search || '');
    return { tab: path, params };
  }

  function applyRoute(tab, params, { triggerSwitch = true } = {}) {
    const route = ROUTE_MAP[tab];
    if (!route) {
      console.warn(`Router: rota desconhecida "${tab}", caindo para ${DEFAULT_TAB}`);
      return applyRoute(DEFAULT_TAB, new URLSearchParams());
    }

    // Atualiza document.title
    document.title = `Carteira — ${route.title}`;

    // Atualiza hash diretamente (sem pushState — mais simples e confiável)
    const newHash = tab + (params && params.toString() ? '?' + params.toString() : '');
    if (location.hash.slice(1) !== newHash) {
      isNavigating = true;
      location.hash = newHash;
      // isNavigating será resetado pelo hashchange listener
    }

    // Dispara switchTab original
    if (triggerSwitch && window.switchTab) {
      window.switchTab(route.panel);
    }

    // Scroll to top ao navegar (imediato para testes, suave para usuários;
    // 'auto' quando o usuário prefere movimento reduzido — WCAG 2.3.3)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.__TESTING__ || reduceMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Atualiza indicador ativo nas tabs
    updateActiveTab(tab);

    return true;
  }

  function updateActiveTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  }

  function initRouter() {
    // 1. Hashchange listener (única fonte de verdade)
    window.addEventListener('hashchange', () => {
      if (isNavigating) {
        isNavigating = false;
        return; // navegação programática já fez o switchTab
      }
      // Navegação via botão voltar/avançar do browser ou link direto
      const { tab, params } = parseHash();
      applyRoute(tab, params, { triggerSwitch: true });
    });

    // 2. Navegação inicial
    const { tab, params } = parseHash();
    applyRoute(tab, params, { triggerSwitch: true });

    // 3. Interceptar cliques nos tabs para usar router
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const tab = btn.dataset.tab;
        if (ROUTE_MAP[tab]) {
          ev.preventDefault();
          applyRoute(tab, new URLSearchParams());
        }
      });
    });

    // 4. Deep-link por ativo: ?ticker=PETR4#positions → filtra + destaca + scroll
    const { ticker } = params;
    if (ticker) {
      // F (audit 17/10): aplica o ticker no filtro de busca → tabela isolada do ativo
      const search = document.getElementById('positionsSearch');
      if (search) {
        search.value = ticker.toUpperCase();
        search.dispatchEvent(new Event('input', { bubbles: true })); // filterPositions com debounce
      }
      setTimeout(() => {
        const cells = document.querySelectorAll(`#panel-positions td .asset-ticker`);
        for (const cell of cells) {
          if (cell.textContent.trim() === ticker.toUpperCase()) {
            cell.closest('tr')?.classList.add('row-highlight');
            cell.closest('tr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }, 800);
    }

    // 5. Expor API pública
    window.router = {
      navigate: (tab, params) => applyRoute(tab, params instanceof URLSearchParams ? params : new URLSearchParams(params)),
      replace:  (tab, params) => applyRoute(tab, params instanceof URLSearchParams ? params : new URLSearchParams(params)),
      getCurrent: () => parseHash(),
      parseHash,
    };
  }

  // Auto-init
  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', initRouter);
  } else {
    initRouter();
  }
})();