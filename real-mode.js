// ========================================
// REAL MODE — Features avançadas para carteira real
// Toggle Mock/Real, Importador, Auto-refresh brapi.dev, Rebalance, RF detail
// ========================================
(function() {
  'use strict';

  // ---- Estado ----
  const state = {
    isReal: true,                    // dados reais ativos
    mockData: null,                  // backup do MOCK_DATA original
    livePrices: false,               // polling de preços
    liveTimer: null,
    positionsCache: null             // snapshot posições antes do refresh
  };

  // ---- CSSOM Helper (CSP-safe): data-attrs → CSS custom properties ----
  // element.style.setProperty() não é bloqueado por style-src sem unsafe-inline
  function applyDataAttrs(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-w]').forEach(el => {
      const v = parseFloat(el.dataset.w);
      if (!isNaN(v)) el.style.setProperty('--w', v + '%');
    });
    scope.querySelectorAll('[data-left]').forEach(el => {
      const v = parseFloat(el.dataset.left);
      if (!isNaN(v)) el.style.setProperty('--left', v + '%');
    });
    scope.querySelectorAll('[data-bg]').forEach(el => {
      el.style.setProperty('--dyn-bg', el.dataset.bg);
    });
    scope.querySelectorAll('[data-color]').forEach(el => {
      el.style.setProperty('--dyn-color', el.dataset.color);
    });
    scope.querySelectorAll('[data-border]').forEach(el => {
      el.style.setProperty('--sev-border', el.dataset.border);
    });
  }
  window.__applyDataAttrs = applyDataAttrs;

  // MutationObserver: aplica automaticamente em nós adicionados ao DOM
  const __dataAttrObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        applyDataAttrs(node);
        if (node.querySelectorAll && node.querySelectorAll('[data-w],[data-left],[data-bg],[data-color],[data-border]').length) {
          applyDataAttrs(node);
        }
      }
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    applyDataAttrs(document);
    __dataAttrObserver.observe(document.body, { childList: true, subtree: true });
  });

  // ---- Fase G: Bottom Nav Bar (mobile) ----
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    nav.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        nav.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof window.switchTab === 'function') window.switchTab(tab);
      });
    });
    // Sincroniza bottom-nav com tab ativa (quando muda via header-tabs)
    const observer = new MutationObserver(() => {
      const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
      if (!activeTab) return;
      nav.querySelectorAll('.bottom-nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === activeTab);
      });
    });
    const tablist = document.querySelector('.header-tabs');
    if (tablist) observer.observe(tablist, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });

  // ---- Fase G: Pull-to-Refresh (mobile) ----
  document.addEventListener('DOMContentLoaded', () => {
    if (!matchMedia('(max-width: 639px)').matches) return;
    const indicator = document.getElementById('ptrIndicator');
    if (!indicator) return;
    let startY = 0, pulling = false;
    document.addEventListener('touchstart', e => {
      if (window.scrollY <= 0) { startY = e.touches[0].clientY; pulling = true; }
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 60) indicator.classList.add('visible');
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (indicator.classList.contains('visible')) {
        setTimeout(() => indicator.classList.remove('visible'), 800);
        // Recarrega dados (refresh leve)
        if (typeof window.renderAll === 'function') window.renderAll();
      }
      pulling = false;
    });
  });

  // ---- Helpers ----
  const fmt = {
    cur: v => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(v),
    pct: v => (v>=0?'+':'') + new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v) + '%',
    num: v => new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v),
    date: s => new Date(s+'T00:00:00').toLocaleDateString('pt-BR')
  };

  // ---- Data State Semantics (UNKNOWN≠ZERO, STALE≠FRESH) ----
  const DataState = {
    FRESH: 'fresh',       // dados atualizados há < 1h
    STALE: 'stale',       // dados atualizados há > 1h
    PARTIAL: 'partial',   // dados parciais (ex: falta preço de alguns ativos)
    UNAVAILABLE: 'unavailable', // dados não disponíveis
    DEMO: 'demo'          // dados mock/demo
  };

  const dataState = {
    state: DataState.DEMO,
    lastUpdate: null,
    source: 'none'
  };

  function updateDataState(newState, source) {
    dataState.state = newState;
    dataState.source = source || dataState.source;
    if (newState === DataState.FRESH) dataState.lastUpdate = new Date();
    renderDataStateBadge();
  }

  // Expose globally for other modules
  window.updateDataState = updateDataState;

  function renderDataStateBadge() {
    // Remove badge anterior
    const existing = document.getElementById('dataStateBadge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'dataStateBadge';
    badge.className = 'data-state-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');

    const config = {
      [DataState.FRESH]: { label: 'Atualizado', class: 'state-fresh', icon: '✓' },
      [DataState.STALE]: { label: 'Desatualizado', class: 'state-stale', icon: '⏱' },
      [DataState.PARTIAL]: { label: 'Parcial', class: 'state-partial', icon: '◐' },
      [DataState.UNAVAILABLE]: { label: 'Indisponível', class: 'state-unavailable', icon: '✗' },
      [DataState.DEMO]: { label: 'Demonstração', class: 'state-demo', icon: '○' }
    };

    const c = config[dataState.state] || config[DataState.DEMO];
    const timeStr = dataState.lastUpdate 
      ? ` · ${dataState.lastUpdate.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`
      : '';

    badge.innerHTML = `<span class="state-icon ${c.class}">${c.icon}</span><span class="state-label ${c.class}">${c.label}${timeStr}</span>`;

    // Insere no header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) headerActions.insertBefore(badge, headerActions.firstChild);
  }

  const toast = (msg, type='info') => {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role','alert');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(()=>el.remove(), 4000);
  };

  // ---- 1. Toggle Mock / Real ----
  function setupModeToggle() {
    if (document.getElementById('modeToggle')) return;
    const nav = document.querySelector('.header-actions');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.id = 'modeToggle';
    btn.className = 'btn btn-ghost';
    btn.setAttribute('aria-label', 'Alternar entre dados reais e mock');
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-real-show>
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-mock-show>
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
      <span id="modeLabel">Minha Carteira</span>
    `;
    // CSSOM: seta CSS vars (CSP-safe, não precisa de unsafe-inline)
    btn.querySelector('[data-real-show]').style.display = 'var(--real-show,inline)';
    btn.querySelector('[data-mock-show]').style.display = 'var(--mock-show,none)';
    btn.style.cssText = '--real-show:inline; --mock-show:none;';
    btn.addEventListener('click', toggleMode);
    nav.insertBefore(btn, nav.querySelector('#themeToggle'));
  }

  function toggleMode() {
    const isReal = !state.isReal;
    state.isReal = isReal;
    const btn = document.getElementById('modeToggle');
    const label = document.getElementById('modeLabel');
    btn.style.setProperty('--real-show', isReal ? 'inline' : 'none');
    btn.style.setProperty('--mock-show', isReal ? 'none' : 'inline');
    label.textContent = isReal ? 'Minha Carteira' : 'Dados Demo';
    updateDataState(isReal ? DataState.FRESH : DataState.DEMO, isReal ? 'carteira-real' : 'mock');
    if (isReal) applyRealData();
    else restoreMockData();
    toast(isReal ? 'Modo: Minha Carteira (dados reais)' : 'Modo: Dados Demo', 'info');
    // re-render aba ativa
    if (typeof renderAll === 'function') renderAll();
    else if (typeof switchTab === 'function') {
      const active = document.querySelector('.tab-btn.active');
      if (active) switchTab(active.dataset.tab);
    }
  }

  function backupMockData() {
    if (window.MOCK_DATA && !state.mockData) {
      state.mockData = JSON.parse(JSON.stringify(window.MOCK_DATA));
    }
  }

  function applyRealData() {
        backupMockData();
        if (!window.CARTEIRA_DATA) return;
        const C = window.CARTEIRA_DATA;
        // Guards: sample/backup parcial pode não ter todas as seções (não quebrar boot)
        if (C.kpis) Object.assign(MOCK_DATA.kpis, C.kpis);
        else if (Array.isArray(C.positions) && C.positions.length) {
          const inv = C.positions.reduce((s,p) => s + (p.invested || ((p.qty||0)*(p.avgPrice||0))), 0);
          const tot = C.positions.reduce((s,p) => s + (p.current || ((p.qty||0)*(p.currentPrice||0))), 0);
          MOCK_DATA.kpis.invested = +inv.toFixed(2);
          MOCK_DATA.kpis.total = +tot.toFixed(2);
          MOCK_DATA.kpis.profit = +(tot - inv).toFixed(2);
          MOCK_DATA.kpis.totalChange = inv ? +((tot/inv-1)*100).toFixed(2) : 0;
        }
        if (C.monthly) MOCK_DATA.monthly = C.monthly;
        if (C.patrimony) MOCK_DATA.patrimony = C.patrimony;
        if (C.allocation) MOCK_DATA.allocation = C.allocation;
        if (C.positions) MOCK_DATA.positions = C.positions;
        if (C.earnings) MOCK_DATA.earnings = C.earnings;
        if (C.entries) MOCK_DATA.entries = C.entries;
        if (C.assetReturns) MOCK_DATA.assetReturns = C.assetReturns;
        // Preserve reference return12m (TWR) and returnTotal; only compute capitalGain
        if (C.kpis && C.patrimony) {
          try {
            const derived = computeDerivedKpis(C.entries || [], C.kpis.invested, C.kpis.total, C.patrimony);
            MOCK_DATA.kpis.capitalGain = derived.capitalGain;
          } catch (e) { console.warn('[RealMode] capitalGain skipped:', e && e.message); }
        }
        // Keep C.kpis.return12m (TWR) and C.kpis.returnTotal as authoritative
        
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
        }

        // Re-render all views with new data
        if (typeof window.renderAll === 'function') window.renderAll();
      }

    // Expose applyRealData globally for init-carteira.js
    window.applyRealData = applyRealData;

    // KPIs derivados honestos:
  // - capitalGain: ganho REALIZADO (vendas vs custo médio cronológico) — entries é fonte completa
  // - return12m: retorno real da série patrimonial; null se histórico < 12M (UNKNOWN ≠ ZERO)
  // Proventos NÃO são recalculados aqui: earnings[] é parcial;
  // kpis.dividends/earnings12m vêm da fonte autoritativa (B3) e permanecem.
  function computeDerivedKpis(entries, invested, total, patrimony) {
    const byT = {};
    let realized = 0;
    for (const e of [...(entries || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))) {
      const st = byT[e.ticker] = byT[e.ticker] || { qty: 0, cost: 0 };
      const q = +e.qty || 0, price = +e.price || 0;
      if (e.type === 'sell') {
        if (st.qty > 0) {
          const avg = st.cost / st.qty, qSell = Math.min(q, st.qty);
          realized += qSell * (price - avg);
          st.qty -= qSell; st.cost -= qSell * avg;
        }
      } else {
        st.qty += q; st.cost += q * price;
      }
    }
    let ret12m = null;
    const series = patrimony && patrimony.portfolio;
    if (Array.isArray(series) && series.length >= 13) {
      const base = +series[series.length - 13] || 0;
      if (base > 0) ret12m = +((total / base - 1) * 100).toFixed(2);
    }
    return { capitalGain: +realized.toFixed(2), return12m: ret12m };
  }

  function restoreMockData() {
    if (state.mockData) {
      Object.assign(MOCK_DATA, state.mockData);
    }
  }

  // ---- 2. Importador de backup (drag-drop) ----
  // AGORA USA O NOVO PAINEL DE IMPORT (panel-import) - setupImportDropzone() desabilitado
  function setupImportDropzone() {
    // Desabilitado - agora usa o painel dedicado em panel-import
    return;
  }

  async function processBackupFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // valida formato
      if (!data.payload?.state?.assets) throw new Error('Formato inválido: não é um backup carteira-investimentos');
      toast('Processando backup...', 'info');
      const converted = await convertBackupToCarteiraData(data);
      window.CARTEIRA_DATA = converted;
      // recalcula metas se existirem
      if (data.payload.state.goals) {
        window.CARTEIRA_META = {
          goals: { allocation: data.payload.state.goals.allocation.items.reduce((a,i)=>(a[i.type]=i.pct,a),{}), ...data.payload.state.goals },
          fixedDetail: data.payload.state.assets.filter(a=>a.type==='Renda Fixa').map(a=>({
            ticker:a.ticker, name:a.name||a.ticker, indexer:a.rf_yield_type||a.fixed_indexer||'CDI',
            rate:a.rf_contract_rate||a.fixed_rate||'', issuer:a.fixed_issuer||'',
            application:a.rf_application_date||a.fixed_application_date||'', maturity:a.rf_maturity_date||a.fixed_maturity_date||'',
            applied:a.rf_applied_value||a.fixed_initial_value||0, current:a.fixed_current_value||(a.qty*a.current_price)
          }))
        };
      }
      // sobrescreve no MOCK_DATA
      applyRealData();
      state.isReal = true;
      updateModeToggle(true);
      // Auth (P8): backup substitui carteira inteira → push de todas as seções (se REAL ativo)
      if (window.SyncHub && window.SyncHub.active) window.SyncHub.saveAll();
      toast(`Backup importado: ${converted.positions.length} ativos, ${converted.earnings.length} proventos`, 'success');
      if (typeof renderAll === 'function') renderAll();
      else location.reload();
    } catch (e) {
      toast('Erro ao importar: ' + e.message, 'error');
      console.error(e);
    }
  }

  async function convertBackupToCarteiraData(d) {
    // reusa a lógica do script de conversão (simplificada inline)
    const assets = d.payload.state.assets;
    const prov = d.payload.state.proventos;
    const aportes = d.payload.state.aportes;
    const clsMap = {'Ação':'stocks','FII':'fiis','ETF':'etfs','Renda Fixa':'fixed'};
    const norm = s => s.includes('-') ? new Date(s) : new Date(s.split('/').reverse().join('-'));
    const acts = [];
    for (const a of assets) {
      const q = +a.qty||0; if (q<=0) continue;
      const isRF = a.type==='Renda Fixa';
      const curPrice = isRF ? (+a.fixed_current_value||+a.current_price||0) : (+a.current_price||0);
      const avgPrice = isRF ? (+a.rf_applied_value||+a.fixed_initial_value||curPrice) : (+a.avg_price||0);
      const cur = q*curPrice, inv = q*avgPrice, ret = inv ? (cur/inv-1)*100 : 0;
      acts.push({ticker:a.ticker||a.name, name:a.name||a.ticker, cls:clsMap[a.type]||'other', type:a.type, sector:a.sector||'Outros',
        qty:q, avgPrice:+avgPrice.toFixed(2), currentPrice:+curPrice.toFixed(2), value:+cur.toFixed(2), ret:+ret.toFixed(2), dy:+a.dy||0, invested:inv});
    }
    const total = acts.reduce((s,a)=>s+a.value,0);
    acts.forEach(a=>a.weight=+(a.value/total*100).toFixed(2));
    const invTotal = acts.reduce((s,a)=>s+a.invested,0);
    const profit = total - invTotal;
    // monthly (simplificado: último ano)
    const monthlyInc = {};
    for (const p of prov) {
      const k = norm(p.date).toLocaleString('pt-BR',{month:'2-digit',year:'2-digit'});
      monthlyInc[k] = (monthlyInc[k]||0) + +p.value;
    }
    const keys = Object.keys(monthlyInc).sort((a,b)=>(+a.slice(3))-(+b.slice(3)) || (+a.slice(0,2))-(+b.slice(0,2))).slice(-13);
    const monthly = keys.map(k=>({period:k, invested:0, gain:0}));
    
    // Buscar dados reais de CDI e IBOV para o gráfico patrimônio
    let cdiSeries = [], ibovSeries = [];
    try {
      const bench = new BenchmarkEngine();
      const benchData = await bench.fetchAll(['CDI', 'IBOV'], 365); // últimos 365 dias
      
      // Processar CDI - acumulado
      if (benchData.CDI && benchData.CDI.prices && benchData.CDI.prices.length) {
        const cdiPrices = benchData.CDI.prices;
        const firstCdi = cdiPrices[0].close;
        cdiSeries = cdiPrices.map(p => invTotal * (p.close / firstCdi));
      }
      
      // Processar IBOV - acumulado
      if (benchData.IBOV && benchData.IBOV.prices && benchData.IBOV.prices.length) {
        const ibovPrices = benchData.IBOV.prices;
        const firstIbov = ibovPrices[0].close;
        ibovSeries = ibovPrices.map(p => invTotal * (p.close / firstIbov));
      }
    } catch (e) {
      console.warn('Erro ao buscar benchmarks reais, usando fallback:', e);
      // Fallback para valores fixos (mesmo que o atual)
      cdiSeries = keys.map(()=>invTotal);
      ibovSeries = keys.map(()=>invTotal);
    }
    
    // Garantir que as séries tenham o mesmo tamanho que keys
    // Se não tivermos dados suficientes, repetir o último valor
    while (cdiSeries.length < keys.length) cdiSeries.push(cdiSeries[cdiSeries.length-1] || invTotal);
    while (ibovSeries.length < keys.length) ibovSeries.push(ibovSeries[ibovSeries.length-1] || invTotal);
    cdiSeries = cdiSeries.slice(0, keys.length);
    ibovSeries = ibovSeries.slice(0, keys.length);
    
    // patrimony com dados reais de CDI/IBOV
    const patrimony = {
      labels:keys, 
      portfolio:keys.map(()=>total), 
      invested:keys.map(()=>invTotal), 
      cdi:cdiSeries, 
      ibov:ibovSeries
    };
    
    // allocation
    const classAgg = {}; acts.forEach(a=>classAgg[a.cls]=(classAgg[a.cls]||0)+a.value);
    const cn={'stocks':'Ações','fiis':'FIIs','etfs':'ETFs','fixed':'Renda Fixa','other':'Outros'};
    const cc={'stocks':'#1A73E8','fiis':'#34A853','fixed':'#3730A3','etfs':'#F9AB00','other':'#80868B'};
    const byClass = Object.entries(classAgg).map(([k,v])=>({name:cn[k],value:+v.toFixed(2),pct:+((v/total)*100).toFixed(1),color:cc[k]})).sort((a,b)=>b.value-a.value);
    const byAsset = acts.sort((a,b)=>b.value-a.value).map(a=>({name:a.ticker,class:a.cls,value:a.value,pct:a.weight,return:a.ret}));
    // earnings
    const earnings = prov.map(p=>({date:norm(p.date).toISOString().slice(0,10), ticker:p.ticker, name:p.assetName||p.ticker,
      type:(p.eventType||'').toLowerCase().includes('jcp')?'jcp':'dividend', perShare:+p.unitPrice||0, qty:+p.qty||0, gross:+p.value, tax:0, net:+p.value}))
      .sort((a,b)=>b.date.localeCompare(a.date));
    // entries
    const entries = aportes.map(a=>({date:norm(a.date).toISOString().slice(0,10), ticker:a.ticker, name:a.ticker,
      type:a.operation==='compra'?'buy':'sell', qty:+a.qty, price:+a.price, value:+((+a.qty)*(+a.price)).toFixed(2), fees:0, source:a.source||'manual'}))
      .sort((a,b)=>b.date.localeCompare(a.date));
    const rent12m = invTotal ? +((total/invTotal-1)*100).toFixed(2) : 0;
    const last12 = Object.entries(monthlyInc).filter(([k])=>keys.includes(k)).reduce((s,[,v])=>s+v,0);
    const kpis = {total:+total.toFixed(2), invested:+invTotal.toFixed(2), profit:+profit.toFixed(2),
      dividends:+last12.toFixed(2), earnings12m:+last12.toFixed(2), totalChange:rent12m, returnTotal:rent12m,
      yield12m:total?+((last12/total)*100).toFixed(2):0};
    Object.assign(kpis, computeDerivedKpis(entries, invTotal, total, patrimony));
    return {kpis, monthly, patrimony, allocation:{byAsset, byClass}, positions:acts, earnings, entries, assetReturns:acts.map(a=>({ticker:a.ticker,class:a.cls,weight:+((a.value/total)*100).toFixed(2),return:a.ret,contrib:+(a.ret*a.value/total/100).toFixed(3),benchmark:kpis.totalChange,alpha:+(a.ret-kpis.totalChange).toFixed(2)}))};
  }

  function updateModeToggle(isReal) {
    const btn = document.getElementById('modeToggle');
    const label = document.getElementById('modeLabel');
    if (btn && label) {
      btn.style.setProperty('--real-show', isReal ? 'inline' : 'none');
      btn.style.setProperty('--mock-show', isReal ? 'none' : 'inline');
      label.textContent = isReal ? 'Minha Carteira' : 'Dados Demo';
    }
  }

  // ---- 3. Auto-refresh preços via brapi.dev ----
  function setupLivePrices() {
    const btn = document.getElementById('livePricesToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.livePrices = !state.livePrices;
      btn.classList.toggle('active', state.livePrices);
      btn.setAttribute('aria-label', state.livePrices ? 'Desativar preços em tempo real' : 'Ativar preços em tempo real');
      if (state.livePrices) startLivePrices();
      else stopLivePrices();
      toast(state.livePrices ? 'Preços ao vivo ativados (brapi.dev)' : 'Preços ao vivo desativados', 'info');
    });
  }

  function startLivePrices() {
    // snapshot antes do refresh
    state.positionsCache = MOCK_DATA.positions.map(p=>({...p}));
    // inicial
    fetchLivePrices();
    // a cada 60s
    state.liveTimer = setInterval(fetchLivePrices, 60000);
  }

  function stopLivePrices() {
    if (state.liveTimer) { clearInterval(state.liveTimer); state.liveTimer = null; }
    // restaura snapshot
    if (state.positionsCache) {
      MOCK_DATA.positions = state.positionsCache.map(p=>({...p}));
      recalcFromPositions();
      if (typeof renderAll === 'function') renderAll();
    }
  }

  async function fetchLivePrices() {
    const tickers = MOCK_DATA.positions.map(p=>p.ticker).filter(Boolean).join(',');
    if (!tickers) return;
    try {
      const res = await fetch(`https://brapi.dev/api/quote/${tickers}?currency=BRL`);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const quotes = {};
      for (const q of data.results||[]) {
        if (q.regularMarketPrice) quotes[q.symbol.replace('.SA','')] = q.regularMarketPrice;
      }
      let changed = 0;
      for (const pos of MOCK_DATA.positions) {
        const sym = pos.ticker.replace('F','').replace('.SA','');
        if (quotes[pos.ticker] || quotes[sym]) {
          const newPrice = quotes[pos.ticker] || quotes[sym];
          if (Math.abs(newPrice - pos.currentPrice) > 0.001) {
            pos.currentPrice = newPrice;
            pos.value = +(pos.qty * newPrice).toFixed(2);
            pos.return = +(((pos.value - pos.qty*pos.avgPrice) / (pos.qty*pos.avgPrice)) * 100).toFixed(2);
            changed++;
          }
        }
      }
      if (changed > 0) {
        recalcFromPositions();
        if (typeof renderAll === 'function') renderAll();
        else { renderKPIs(); renderAllocation(); }
        toast(`${changed} preços atualizados via brapi.dev`, 'info');
      }
    } catch (e) {
      console.warn('brapi.dev error:', e);
    }
  }

  function recalcFromPositions() {
    const total = MOCK_DATA.positions.reduce((s,p)=>s+p.value,0);
    MOCK_DATA.positions.forEach(p=>p.weight=+(p.value/total*100).toFixed(2));
    const inv = MOCK_DATA.positions.reduce((s,p)=>s+p.qty*p.avgPrice,0);
    const profit = total - inv;
    MOCK_DATA.kpis.total = +total.toFixed(2);
    MOCK_DATA.kpis.invested = +inv.toFixed(2);
    MOCK_DATA.kpis.profit = +profit.toFixed(2);
    MOCK_DATA.kpis.totalChange = inv ? +((total/inv-1)*100).toFixed(2) : 0;
    MOCK_DATA.kpis.returnTotal = MOCK_DATA.kpis.totalChange;
    Object.assign(MOCK_DATA.kpis, computeDerivedKpis(MOCK_DATA.entries, inv, total, MOCK_DATA.patrimony));
    // allocation
    const cls = {}; MOCK_DATA.positions.forEach(p=>cls[p.class]=(cls[p.class]||0)+p.value);
    const cn={'stocks':'Ações','fiis':'FIIs','etfs':'ETFs','fixed':'Renda Fixa','other':'Outros'};
    const cc={'stocks':'#1A73E8','fiis':'#34A853','fixed':'#3730A3','etfs':'#F9AB00','other':'#80868B'};
    MOCK_DATA.allocation.byClass = Object.entries(cls).map(([k,v])=>({name:cn[k],value:+v.toFixed(2),pct:+((v/total)*100).toFixed(1),color:cc[k]})).sort((a,b)=>b.value-a.value);
  }

  // ---- 4. Rebalance vs Metas ----
  function initRebalance() {
    const meta = window.CARTEIRA_META?.goals?.allocation;
    if (!meta) { document.getElementById('rebalanceBody').innerHTML = '<tr><td colspan="7" class="center-muted-p6">Metas não definidas no backup</td></tr>'; return; }
    const total = MOCK_DATA.kpis.total;
    const cls = {}; MOCK_DATA.positions.forEach(p=>cls[p.class]=(cls[p.class]||0)+p.value);
    const cn={'stocks':'Ação','fiis':'FII','etfs':'ETF','fixed':'Renda Fixa','crypto':'Cripto','bdr':'BDR','other':'Outros'};
    // metas do backup usam rótulos pt-BR; posições usam chaves de classe internas
    const ptToCls={'Ação':'stocks','Ações':'stocks','FII':'fiis','FIIs':'fiis','ETF':'etfs','ETFs':'etfs','Renda Fixa':'fixed','Cripto':'crypto','BDR':'bdr','Outros':'other'};
    const pct1 = v => v.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1});
    const rows = [];
    for (const [goalKey, targetPct] of Object.entries(meta)) {
      const clsKey = ptToCls[goalKey] || goalKey;
      const currentVal = cls[clsKey]||0;
      const currentPct = total ? (currentVal/total)*100 : 0;
      const diff = targetPct - currentPct;
      const toTarget = +(total * targetPct / 100 - currentVal).toFixed(2);
      rows.push({class:cn[clsKey]||goalKey, currentPct:pct1(currentPct), targetPct, diffNum:diff, diff:pct1(diff), currentVal:+currentVal.toFixed(2), toTarget});
    }
    const body = document.getElementById('rebalanceBody');
    body.innerHTML = rows.map(r=>`<tr>
      <td><strong>${r.class}</strong></td>
      <td>${r.currentPct}%</td>
      <td>${r.targetPct}%</td>
      <td class="${r.diffNum>=0?'text-success':'text-error'}">${r.diffNum>=0?'+':''}${r.diff}pp</td>
      <td>${fmt.cur(r.currentVal)}</td>
      <td class="${r.toTarget>=0?'text-success':'text-error'}">${fmt.cur(r.toTarget)}</td>
      <td>${r.toTarget>0?`<span class="badge badge-success">Comprar</span>`:r.toTarget<0?`<span class="badge badge-error">Vender</span>`:`<span class="badge badge-neutral">OK</span>`}</td>
    </tr>`).join('');

    document.getElementById('rebalanceSummary').textContent = `Total alocado: ${fmt.cur(total)} | Diferença total vs meta: ${pct1(rows.reduce((s,r)=>s+Math.abs(r.diffNum),0))}pp`;

    // Aporte sugerido - usa RebalanceEngine se disponível
    const inp = document.getElementById('rebalanceAporte');
    inp.addEventListener('input', renderRebalanceAllocation);
    renderRebalanceAllocation();
    
    // Botão para otimização avançada
    addAdvancedRebalanceButton();
  }
  
  function addAdvancedRebalanceButton() {
    const panel = document.getElementById('panel-rebalance');
    const header = panel.querySelector('.panel-header');
    if (!header.querySelector('#btnAdvancedRebalance')) {
      const btn = document.createElement('button');
      btn.id = 'btnAdvancedRebalance';
      btn.className = 'btn btn-primary btn-sm';
      btn.style.marginLeft = 'var(--space-3)';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Otimização Avançada';
      btn.addEventListener('click', runAdvancedRebalance);
      header.appendChild(btn);
    }
  }
  
  async function runAdvancedRebalance() {
    const btn = document.getElementById('btnAdvancedRebalance');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30" stroke-dashoffset="0" class="spin"></circle></svg> Calculando...';
    btn.disabled = true;
    
    try {
      // Prepara dados para o engine
      const assets = MOCK_DATA.positions.map(p => ({
        ticker: p.ticker,
        name: p.name,
        type: p.class === 'stocks' ? 'Ação' : p.class === 'fiis' ? 'FII' : p.class === 'etfs' ? 'ETF' : 'Renda Fixa',
        sector: p.sector || 'Outros',
        qty: p.qty,
        avg_price: p.avg_price,
        current_price: p.price
      }));
      
      const targets = {};
      const meta = window.CARTEIRA_META?.goals?.allocation;
      if (meta) {
        // Mapeia metas por classe para ativos individuais (proporcional)
        const classAssets = {};
        assets.forEach(a => {
          if (!classAssets[a.type]) classAssets[a.type] = [];
          classAssets[a.type].push(a.ticker);
        });
        
        Object.entries(meta).forEach(([clsKey, targetPct]) => {
          const typeMap = {'stocks': 'Ação', 'fiis': 'FII', 'etfs': 'ETF', 'fixed': 'Renda Fixa'};
          const type = typeMap[clsKey];
          if (classAssets[type]) {
            const perAsset = targetPct / classAssets[type].length;
            classAssets[type].forEach(t => { targets[t] = perAsset / 100; });
          }
        });
      }
      
      const prices = {};
      assets.forEach(a => { prices[a.ticker] = a.current_price; });
      
      const cash = window.CARTEIRA_DATA?.kpis?.cash || 0;
      
      // Executa engine
      const engine = new RebalanceEngine({
        maxAssetPct: 0.20,
        maxSectorPct: 0.40,
        brokerageFee: 0.005,
        minTradeValue: 50
      });
      
      engine.setPortfolio(assets, targets, prices, cash);
      const result = engine.solve();
      
      // Mostra resultado
      showAdvancedRebalanceResult(result);
      
    } catch (e) {
      console.error('Erro no rebalanceamento avançado:', e);
      toast('Erro: ' + e.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
  
  function showAdvancedRebalanceResult(result) {
    const container = document.getElementById('rebalanceAllocation');
    if (!container) return;
    
    let html = `
      <div class="card mt-4-p-4 scroll-400">
        <h4 class="mb-3-flex-between">
          Otimização Avançada (Solver)
          <button class="btn btn-ghost btn-sm" onclick="this.closest('.card').remove()">✕</button>
        </h4>
        <p class="text-muted mb-3-sm">
          ${result.summary.buys} compras, ${result.summary.sells} vendas | 
          Cash: ${fmt.cur(result.summary.cashAfter)} | Custos: ${fmt.cur(result.summary.totalCost)}
        </p>
    `;
    
    if (result.trades.length > 0) {
      html += '<table class="data-table text-sm"><thead><tr><th>Ativo</th><th>Ação</th><th>Qtd</th><th>Preço</th><th>Valor</th><th>Custo</th></tr></thead><tbody>';
      result.trades.forEach(t => {
        html += `<tr>
          <td>${t.ticker}</td>
          <td><span class="badge ${t.action==='buy'?'badge-success':'badge-error'}">${t.action==='buy'?'Comprar':'Vender'}</span></td>
          <td>${t.qty}</td>
          <td>${fmt.cur(t.price)}</td>
          <td>${fmt.cur(t.value)}</td>
          <td>${fmt.cur(t.cost)}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    } else {
      html += '<p class="text-muted" class="p-4-center">Nenhum trade necessário dentro dos parâmetros.</p>';
    }
    
    html += `
        <details class="mt-3">
          <summary class="text-muted cursor-pointer">Ver alocação final detalhada</summary>
          <pre class="debug-box">${JSON.stringify(result.allocations.after, null, 2)}</pre>
        </details>
      </div>
    `;
    
    container.insertAdjacentHTML('afterbegin', html);
  }

  function renderRebalanceAllocation() {
    const meta = window.CARTEIRA_META?.goals?.allocation;
    const aporte = +document.getElementById('rebalanceAporte').value || 0;
    if (!meta || !aporte) { document.getElementById('rebalanceAllocation').innerHTML = ''; return; }
    const total = MOCK_DATA.kpis.total + aporte;
    const cls = {}; MOCK_DATA.positions.forEach(p=>cls[p.class]=(cls[p.class]||0)+p.value);
    const cn={'stocks':'Ação','fiis':'FII','etfs':'ETF','fixed':'Renda Fixa'};
    const html = Object.entries(meta).map(([k,target])=>{
      const cur = cls[k]||0;
      const final = cur + aporte * target/100;
      const curPct = total ? (cur/total)*100 : 0;
      const finalPct = target;
      return `<div class="flex-3-center mt-2 mb-2">
        <span class="w-80 fw-500">${cn[k]||k}</span>
        <div class="bar-track">
          <div class="bar-fill" data-w="${curPct}"></div>
          <div class="bar-marker" data-left="${finalPct}"></div>
        </div>
        <span class="w-60 text-right">${finalPct}%</span>
        <span class="w-100 text-right dyn-color" data-color="${final>cur?'var(--color-success)':'var(--color-error)'}">${fmt.cur(final-cur)}</span>
      </div>`;
    }).join('');
    document.getElementById('rebalanceAllocation').innerHTML = `
      <p class="text-muted mb-2">Com aporte de ${fmt.cur(aporte)} (total projetado: ${fmt.cur(total)})</p>
      ${html}`;
  }

  // ---- 5. Renda Fixa detail ----
  function initFixedIncome() {
    const items = window.CARTEIRA_META?.fixedDetail || [];
    if (!items.length) {
      document.getElementById('fixedKpis').innerHTML = '<p class="text-muted">Nenhuma posição de renda fixa no backup</p>';
      // Não limpa fixedBody — panels.js:renderFixedIncome() é quem popula
      return;
    }
    // KPIs
    const totalApplied = items.reduce((s,i)=>s+(+i.applied||0),0);
    const totalCurrent = items.reduce((s,i)=>s+(+i.current||0),0);
    const totalGain = totalCurrent - totalApplied;
    const avgRate = items.reduce((s,i)=>s+parseFloat(i.rate)||0,0) / items.length || 0;
    document.getElementById('fixedKpis').innerHTML = `
      <div class="kpi-card"><span class="kpi-label">Aplicado</span><span class="kpi-value">${fmt.cur(totalApplied)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Valor Atual</span><span class="kpi-value">${fmt.cur(totalCurrent)}</span></div>
      <div class="kpi-card"><span class="kpi-label">Ganho/Perda</span><span class="kpi-value ${totalGain>=0?'text-success':'text-error'}">${fmt.cur(totalGain)} (${fmt.pct(totalApplied?(totalGain/totalApplied*100):0)})</span></div>
      <div class="kpi-card"><span class="kpi-label">Taxa Média</span><span class="kpi-value">${avgRate.toFixed(2)}%</span></div>
      <div class="kpi-card"><span class="kpi-label">Quantidade</span><span class="kpi-value">${items.length} títulos</span></div>`;

    // Por indexador
    const byIdx = {};
    for (const i of items) {
      const idx = i.indexer || 'CDI';
      if (!byIdx[idx]) byIdx[idx] = {count:0, applied:0, current:0};
      byIdx[idx].count++;
      byIdx[idx].applied += +i.applied||0;
      byIdx[idx].current += +i.current||0;
    }
    document.getElementById('fixedByIndexer').innerHTML = Object.entries(byIdx).map(([idx, v])=>{
      const gain = v.current - v.applied;
      return `<div class="card p-4-mb-3">
        <div class="flex-between">
          <strong>${idx}</strong>
          <span>${v.count} títulos · ${fmt.cur(v.current)} (${fmt.pct(v.applied?gain/v.applied*100:0)})</span>
        </div>
        <div class="bar-track-sm">
          <div class="bar-fill-sm dyn-bg" data-w="${v.applied?Math.min(100,(v.current/v.applied)*100):0}" data-bg="${gain>=0?'var(--color-success)':'var(--color-error)'}"></div>
        </div>
      </div>`;
    }).join('');

    // Tabela
    document.getElementById('fixedBody').innerHTML = items.map(i=>{
      const gain = (+i.current||0) - (+i.applied||0);
      const pct = i.applied ? (gain/(+i.applied))*100 : 0;
      return `<tr>
        <td><strong>${i.ticker||i.name}</strong></td>
        <td>${i.issuer||'-'}</td>
        <td>${i.rate ? i.rate + '% ' + i.indexer : i.indexer}</td>
        <td>${fmt.date(i.application)}</td>
        <td>${fmt.date(i.maturity)||'—'}</td>
        <td>${fmt.cur(i.applied)}</td>
        <td>${fmt.cur(i.current)}</td>
        <td class="${gain>=0?'text-success':'text-error'}">${fmt.pct(pct)}</td>
      </tr>`;
    }).join('');
  }

  // ---- 6. Extras: comparação Investidor10 (diff vs público) ----
  function injectInvestidor10Diff() {
    // adiciona badge no header se houver diferença grande
    const publicValue = 686972.13; // do Investidor10 público
    const myValue = MOCK_DATA.kpis.total;
    const diff = ((myValue - publicValue) / publicValue * 100).toFixed(1);
    if (Math.abs(diff) > 1) {
      const badge = document.createElement('span');
      badge.className = 'badge ' + (diff > 0 ? 'badge-warning' : 'badge-info');
      badge.style.marginLeft = 'var(--space-2)';
      badge.textContent = `vs Investidor10: ${diff>0?'+':''}${diff}%`;
      const logo = document.querySelector('.logo');
      if (logo) logo.appendChild(badge);
    }
  }

  // ---- 7. Extras: atalho teclado (⌘K) paleta comandos ----
  function setupCommandPalette() {
    const btn = document.getElementById('commandPaletteToggle');
    if (!btn) return;
    btn.addEventListener('click', showPalette);
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); showPalette(); }
    });
  }

  function showPalette() {
    if (document.getElementById('cmdPalette')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cmdPalette';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:flex-start;padding-top:10vh;justify-content:center';
    overlay.innerHTML = `
      <div class="card modal-content">
        <div class="flex-3-center-mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="cmdInput" placeholder="Digite um comando..." class="search-input">
          <kbd class="badge-sm">Esc</kbd>
        </div>
        <div id="cmdList"></div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('cmdInput');
    const list = document.getElementById('cmdList');
    const cmds = [
      {keys:['1','Resumo'], action:()=>switchTab('summary')},
      {keys:['2','Posições'], action:()=>switchTab('positions')},
      {keys:['3','Proventos'], action:()=>switchTab('earnings')},
      {keys:['4','Patrimônio'], action:()=>switchTab('patrimony')},
      {keys:['5','Rentabilidade'], action:()=>switchTab('returns')},
      {keys:['6','Lançamentos'], action:()=>switchTab('entries')},
      {keys:['7','Rebalancear'], action:()=>switchTab('rebalance')},
      {keys:['8','Renda Fixa'], action:()=>switchTab('fixed')},
      {keys:['t','Toggle Real/Mock'], action:toggleMode},
      {keys:['r','Refresh Preços'], action:fetchLivePrices},
      {keys:['i','Importar Backup'], action:()=>document.getElementById('importDropzone')?.click()},
      {keys:['e','Exportar CSV (aba ativa)'], action:exportActiveCSV},
      {keys:['d','Toggle Tema'], action:()=>document.getElementById('themeToggle')?.click()}
    ];
    function render(filter='') {
      list.innerHTML = cmds.filter(c=>c.keys.some(k=>k.toLowerCase().includes(filter.toLowerCase())))
        .map(c=>`<button class="cmd-item list-item"
          ><span>${c.keys.slice(1).join(' ')}</span><kbd class="opacity-60">${c.keys[0]}</kbd></button>`).join('');
      list.querySelectorAll('.cmd-item').forEach((el,i)=>{
        const cmd = cmds.filter(c=>c.keys.some(k=>k.toLowerCase().includes(filter.toLowerCase())))[i];
        el.addEventListener('click',()=>{cmd.action(); close();});
      });
    }
    render();
    input.addEventListener('input', e=>render(e.target.value));
    input.focus();
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = e => { if (e.key==='Escape') close(); };
    document.addEventListener('keydown', onEsc);
    overlay.addEventListener('click', e=>{ if (e.target===overlay) close(); });
  }

  function exportActiveCSV() {
    const active = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (!active) return;
    let data, filename;
    if (active==='positions') { data=MOCK_DATA.positions; filename='posicoes'; }
    else if (active==='earnings') { data=MOCK_DATA.earnings; filename='proventos'; }
    else if (active==='entries') { data=MOCK_DATA.entries; filename='lancamentos'; }
    else return;
    if (!data?.length) return toast('Nada para exportar', 'warning');
    const keys = Object.keys(data[0]);
    const csv = [keys.join(';'), ...data.map(r=>keys.map(k=>{let v=r[k]; return typeof v==='string'?'"'+v.replace(/"/g,'""')+'"':v}).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${filename}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${filename}.csv exportado`, 'success');
  }

  // ---- 8. Extras: comparação de rentabilidade vs CDI/IBOV no resumo ----
  function enhanceSummary() {
    // já existe, só garantir que usa dados reais
  }

  // ---- 9. Extras: alertas de vencimento RF próximos ----
  function checkFixedMaturity() {
    const items = window.CARTEIRA_META?.fixedDetail || [];
    const soon = items.filter(i=>{
      if (!i.maturity) return false;
      const d = new Date(i.maturity);
      const diff = (d - new Date()) / (1000*60*60*24);
      return diff > 0 && diff <= 30;
    });
    if (soon.length) {
      toast(`${soon.length} título(s) vencendo em até 30 dias`, 'warning');
    }
  }

  // ---- 10. Extras: projeção de dividendos (DY médio * patrimônio) ----
  function showDividendProjection() {
    const dy = MOCK_DATA.positions.reduce((s,p)=>s+(p.dy||0)*p.weight,0)/100;
    const monthly = MOCK_DATA.kpis.total * dy / 12;
    const el = document.getElementById('divProjection');
    if (el) el.textContent = `Projeção mensal (DY médio ${(dy*100).toFixed(2)}%): ${fmt.cur(monthly)}`;
  }

  // ---- 11. TWR/XIRR Real Calculation ----
  function initTWRXIRR() {
    if (!window.Investidor10Advanced?.ReturnEngine) return;
    
    const engine = window.Investidor10Advanced.ReturnEngine;
    const snapshots = window.Investidor10Advanced.SnapshotManager?.getAll() || [];
    
    // Calculate TWR from snapshots
    const twrResult = engine.calculateTWRFromSnapshots(snapshots);
    
    // Calculate XIRR from entries + current value
    const xirrResult = engine.calculateXIRRFromData(
      MOCK_DATA.entries || [], 
      MOCK_DATA.kpis.total, 
      new Date().toISOString().slice(0,10)
    );
    
    // Render in Rentabilidade tab
    renderTWRXIRRPanel(twrResult, xirrResult);
    
    // Announce for screen readers
    if (window.Investidor10Advanced?.A11y) {
      const msg = `TWR: ${twrResult.status === 'AVAILABLE' ? twrResult.twr.toFixed(2) + '%' : twrResult.reason}. XIRR: ${xirrResult.status === 'AVAILABLE' ? xirrResult.xirr.toFixed(2) + '%' : xirrResult.reason}`;
      window.Investidor10Advanced.A11y.announce(msg);
    }
  }

  function renderTWRXIRRPanel(twrResult, xirrResult) {
    const panel = document.getElementById('panel-returns');
    if (!panel) return;
    
    // Find or create container
    let container = document.getElementById('twr-xirr-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'twr-xirr-container';
      container.style.cssText = 'margin-top:var(--space-6);';
      const h2 = panel.querySelector('h2');
      if (h2) h2.insertAdjacentElement('afterend', container);
      else panel.insertBefore(container, panel.firstChild);
    }
    
    const fmtPct = v => v != null ? (v>=0?'+':'') + v.toFixed(2) + '%' : '—';
    const stateBadge = (status, reason) => {
      const colors = {AVAILABLE:'badge-success', PARTIAL:'badge-warning', UNAVAILABLE:'badge-neutral'};
      return `<span class="data-state-badge ${colors[status]||'badge-neutral'}" title="${reason||''}">${status}</span>`;
    };
    
    container.innerHTML = `
      <div class="card p-4">
        <h3 class="mb-4-flex-2-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="6" y2="6"/><path d="M12 18V6"/></svg>
          Rentabilidade Real (TWR / XIRR)
        </h3>
        <div class="grid-280-4">
          <div class="card p-4">
            <h4 class="mb-0-2-muted">TWR — Time-Weighted Return</h4>
            <div class="fs-2xl-700 mb-2">${fmtPct(twrResult.twr)}</div>
            ${stateBadge(twrResult.status, twrResult.reason)}
            <p class="text-muted mt-2-sm">
              ${twrResult.reason || 'Cálculo baseado em snapshots diários de patrimônio'}
            </p>
            ${twrResult.series ? `
              <details class="mt-3">
                <summary class="text-muted cursor-pointer text-sm">Ver série (${twrResult.series.length} pontos)</summary>
                <div class="table-wrapper mt-2-scroll-200">
                  <table class="data-table"><thead><tr><th>Data</th><th>Patrimônio</th><th>Investido</th></tr></thead><tbody>
                    ${twrResult.series.slice(-20).map(s => `<tr><td>${s.date}</td><td>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(s.value)}</td><td>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(s.invested)}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </details>
            ` : ''}
          </div>
          
          <div class="card p-4">
            <h4 class="mb-0-2-muted">XIRR — Extended Internal Rate of Return</h4>
            <div class="fs-2xl-700 mb-2">${fmtPct(xirrResult.xirr)}</div>
            ${stateBadge(xirrResult.status, xirrResult.reason)}
            <p class="text-muted mt-2-sm">
              ${xirrResult.reason || 'Baseado em todos os aportes/retiradas + valor atual'}
            </p>
            ${xirrResult.cashflows ? `
              <details class="mt-3">
                <summary class="text-muted cursor-pointer text-sm">Ver fluxos (${xirrResult.cashflows.length} transações)</summary>
                <div class="table-wrapper mt-2-scroll-200">
                  <table class="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Ativo</th><th>Valor</th></tr></thead><tbody>
                    ${xirrResult.cashflows.slice(-20).map(c => `<tr><td>${c.date}</td><td>${c.type}</td><td>${c.ticker}</td><td class="${c.amount>0?'text-success':'text-error'}">${c.amount>0?'+':''}${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.abs(c.amount))}</td></tr>`).join('')}
                  </tbody></table>
                </div>
              </details>
            ` : ''}
          </div>
        </div>
        
        <div class="card p-3-mt-3-bg">
          <strong>Metodologia:</strong>
          <ul class="mt-2-ml-4-sm-muted">
            <li><strong>TWR</strong>: Retorno ponderado pelo tempo — elimina efeito de aportes/retiradas. Calculado encadeando retornos de sub-períodos entre fluxos de caixa.</li>
            <li><strong>XIRR</strong>: Taxa interna de retorno estendida — considera timing e valor de cada aporte/retirada. Resolve NPV=0 via Newton-Raphson.</li>
            <li><strong>Fontes</strong>: Snapshots diários automáticos + lançamentos manuais/importados.</li>
            <li><strong>Status</strong>: PARTIAL = dados insuficientes (<30 dias ou <4 transações); AVAILABLE = cálculo confiável.</li>
          </ul>
        </div>
      </div>
    `;
  }

  // ---- Init principal ----
  function init() {
    console.log('[RealMode] init() called');
    // Inicializa estado de dados como DEMO
    updateDataState(DataState.DEMO, 'mock');

    setupModeToggle();
    setupImportDropzone();
    setupLivePrices();
    setupCommandPalette();

    // Initialize advanced engine features
    initAdvancedFeatures();

    // observer para abas novas
    const obs = new MutationObserver(m=>{
      for (const mut of m) {
        if (mut.type==='attributes' && mut.attributeName==='hidden') {
          const panel = mut.target;
          if (!panel.hidden) {
          if (panel.id==='panel-rebalance') initRebalance();
          if (panel.id==='panel-fixed') initFixedIncome();
          if (panel.id==='panel-risk') initRiskPanel();
          if (panel.id==='panel-montecarlo') initMonteCarloPanel();
          }
        }
      }
    });
    document.querySelectorAll('.tab-panel').forEach(p=>obs.observe(p,{attributes:true,attributeFilter:['hidden']}));

    // initial apply if real mode - wait for CARTEIRA_DATA to be ready
        function waitForCarteiraData() {
          if (window.CARTEIRA_DATA) {
            if (state.isReal) {
              applyRealData();
              if (typeof window.renderAll === 'function') window.renderAll();
            }
          } else {
            setTimeout(waitForCarteiraData, 50);
          }
        }
        waitForCarteiraData();

    // inject diff badge
    injectInvestidor10Diff();

    // maturity check
    checkFixedMaturity();

    // dividend projection
    const summary = document.getElementById('panel-summary');
    if (summary) {
      const div = document.createElement('div');
      div.id = 'divProjection';
      div.className = 'text-muted';
      div.style.fontSize = 'var(--font-size-sm)';
      div.style.marginTop = 'var(--space-2)';
      summary.querySelector('.kpis-grid')?.appendChild(div);
      showDividendProjection();
    }

    // Initialize TWR/XIRR after a short delay (ensure data is ready)
    setTimeout(initTWRXIRR, 500);
  }

  // ---- Advanced Engine Integration ----
  function initAdvancedFeatures() {
    // 1. Capture daily snapshot
    if (window.Investidor10Advanced?.SnapshotManager && window.CARTEIRA_DATA) {
      const result = window.Investidor10Advanced.SnapshotManager.capture(window.CARTEIRA_DATA, 'auto');
      if (result.saved) {
        console.log('Snapshot capturado:', result.snapshot.id);
      }
    }

    // 2. Add data state badges to KPIs
    // enhanceKPIsWithStates(); // TEMPORARILY DISABLED - function removed

    // 3. Initialize Import Center (new panel-based)
    initImportCenter();

    // 4. Initialize Corporate Events Center
    initCorporateEventsCenter();

    // 5. Initialize Data Trust Center (data-trust.js já self-inicializa; guard contra API divergente)
    if (typeof window.DataTrust?.initDataTrustCenter === 'function') {
      window.DataTrust.initDataTrustCenter();
    }

    // 6. Add RF confidence to fixed income tab (when opened)
    // Done via MutationObserver in panel-fixed

    // 6. Announce ready for screen readers
    if (window.Investidor10Advanced?.A11y) {
      window.Investidor10Advanced.A11y.announce('Dashboard carregado com dados reais da B3');
    }
  }

  function initImportCenter() {
    console.log('[ImportCenter] initImportCenter called');
    // Setup event listeners for the new Import panel
    const importFile = document.getElementById('importFile');
    console.log('[ImportCenter] importFile element:', importFile);
    if (importFile) {
      importFile.addEventListener('change', async (e) => {
        console.log('[ImportCenter] file change event fired');
        const file = e.target.files[0];
        if (!file) return;
        await runImportPipeline(file);
      });
    }

    // Dropzone click
    const dropzone = document.getElementById('importDropzone');
    if (dropzone) {
      dropzone.addEventListener('click', () => importFile?.click());
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = 'var(--color-primary)'; });
      dropzone.addEventListener('dragleave', () => dropzone.style.borderColor = 'var(--color-border)');
      dropzone.addEventListener('drop', e => {
        e.preventDefault(); dropzone.style.borderColor = 'var(--color-border)';
        const f = e.dataTransfer.files[0] || importFile?.files[0];
        if (f) runImportPipeline(f);
      });
    }

    // Cancel button
    const btnCancel = document.getElementById('btnCancelImport');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        document.getElementById('importPreviewSection').style.display = 'none';
        importFile.value = '';
        document.getElementById('importDetectedFormat').style.display = 'none';
        // Reset stepper
        document.querySelectorAll('.pipeline-stepper .step').forEach(s => s.classList.remove('active'));
        document.querySelector('.pipeline-stepper .step[data-step="1"]').classList.add('active');
      });
    }

    // Confirm button
    const btnConfirm = document.getElementById('btnConfirmImport');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', async () => {
        await confirmImport();
      });
    }
  }

  async function runImportPipeline(file) {
    console.log('[ImportCenter] runImportPipeline called with file:', file.name);
    const dropzone = document.getElementById('importDropzone');
    const previewSection = document.getElementById('importPreviewSection');
    const detectedFormat = document.getElementById('importDetectedFormat');
    const tbody = document.querySelector('#importPreviewTable tbody');
    const btnConfirm = document.getElementById('btnConfirmImport');
    
    console.log('[ImportCenter] Elements found:', { previewSection, detectedFormat, tbody, btnConfirm });

    // Update stepper - step 1
    updateStepper(1);
    
    try {
      // Step 1: Detect format
      detectedFormat.style.display = 'block';
      detectedFormat.textContent = '🔍 Detectando formato...';
      
      const detectResult = await window.ImportCenter.detectFormat(file);
      console.log('[ImportCenter] detectResult:', detectResult);
      detectedFormat.innerHTML = `✅ Formato detectado: <strong>${detectResult.format}</strong> (confiança: ${(detectResult.confidence * 100).toFixed(0)}%)`;
      
      updateStepper(2);

      // Step 2: Parse based on format
      let rawData;
      if (detectResult.parser === 'b3-movimentacao-xlsx') {
        // XLSX de Movimentação (B3/Inter) — proventos e operações históricas
        const sheets = window._xlsxSheets;
        if (!sheets) throw new Error('XLSX não foi lido (detectFormat não rodou?)');
        const movResult = window.ImportCenter.parseB3Movimentacao(sheets);
        if (movResult.skipped.length > 0) {
          detectedFormat.innerHTML += `<br>⚠️ ${movResult.skipped.length} linhas ignoradas (tipo desconhecido/data inválida)`;
        }
        // Prévia resumida: guarda o resultado para o confirm e mostra agregados
        window._pendingMovResult = movResult;
        const provCount = movResult.events.filter(e => ['rendimento','jcp','dividendo','amortizacao','restituicao','reembolso','resgate'].includes(e.type)).length;
        const opCount = movResult.events.filter(e => ['transferencia_liquidacao','aplicacao'].includes(e.type)).length;
        detectedFormat.innerHTML += `<br>📊 ${provCount} proventos + ${opCount} operações (${movResult.events.length} eventos totais, ${movResult.sheetName})`;

        // Prévia de tabela (amostra de proventos)
        previewSection.style.display = 'block';
        const sample = movResult.events.filter(e => e.ticker).slice(0, 50);
        tbody.innerHTML = sample.map(e => `<tr>
          <td>${e.ticker}</td><td>${e.productName || ''}</td><td>${e.rawMov}</td>
          <td>${e.date}</td><td>${e.qty}</td><td>${e.unitPrice}</td>
          <td><strong>R$ ${(e.valor ?? 0).toFixed(2)}</strong></td><td>${e.entradaSaida}</td>
        </tr>`).join('');
        // Ajusta headers da tabela de prévia para movimentação
        const thead = document.querySelector('#importPreviewTable thead');
        if (thead) thead.innerHTML = '<tr><th scope="col">Ticker</th><th scope="col">Produto</th><th scope="col">Movimentação</th><th scope="col">Data</th><th scope="col">Qtd</th><th scope="col">Preço unit.</th><th scope="col">Valor</th><th scope="col">Entrada/Saída</th></tr>';

        btnConfirm.disabled = false;
        updateStepper(3);
        window._pendingImportData = movResult.events; // confirm usa writeMovimentacao
        window._pendingImportFormat = detectResult.format;
        return; // fluxo próprio; confirm detecta o formato e despacha
      }
      if (detectResult.parser === 'b3-posicao-xlsx') {
        // XLSX de Posição B3 (5 sheets: Ações, Empréstimos, ETF, Fundos, Renda Fixa)
        const sheets = window._xlsxSheets;
        if (!sheets) throw new Error('XLSX não foi lido (detectFormat não rodou?)');
        const posResult = window.ImportCenter.parseB3PosicaoXlsx(sheets);
        detectedFormat.innerHTML += `<br>📊 ${posResult.total} ativos: ${posResult.acoes.length} ações, ${posResult.emprestimos.length} empréstimos, ${posResult.etfs.length} ETFs, ${posResult.fundos.length} FIIs, ${posResult.rendaFixa.length} RF`;

        // Converte para o formato canônico de posições e segue pipeline normal (normalize → validate → preview)
        rawData = posToCanonical(posResult);
      }
      else if (detectResult.parser === 'b3-position') {
        const text = await file.text();
        const json = JSON.parse(text);
        rawData = window.ImportCenter.parseB3Position(json);
        console.log('[ImportCenter] parsed B3 position, count:', rawData?.length);
      } else if (detectResult.parser === 'broker-csv') {
        const text = await file.text();
        rawData = window.ImportCenter.parseBrokerCSV(text, detectResult.meta.broker);
        console.log('[ImportCenter] parsed broker CSV, count:', rawData?.length);
      } else if (detectResult.parser === 'b3-events') {
        const text = await file.text();
        rawData = window.ImportCenter.parseB3Events(text, detectResult.meta.delimiter);
        console.log('[ImportCenter] parsed B3 events, count:', rawData?.length);
      } else {
        // generic CSV - would need column mapping UI
        throw new Error('CSV genérico requer mapeamento manual de colunas (não implementado no MVP)');
      }

      // Step 2.5: Normalize
      updateStepper(2);
      detectedFormat.innerHTML += '<br>🔄 Normalizando dados...';
      const normalizedData = window.ImportCenter.normalize(rawData, detectResult.format);
      console.log('[ImportCenter] normalized, count:', normalizedData?.length);

      // Step 2.7: Validate
      updateStepper(2);
      detectedFormat.innerHTML += '<br>✅ Validando dados...';
      const validationResult = window.ImportCenter.validate(normalizedData);
      console.log('[ImportCenter] validation:', { 
        valid: validationResult.valid.length, 
        warnings: validationResult.warnings.length, 
        errors: validationResult.errors.length 
      });

      // Show validation summary
      if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
        detectedFormat.innerHTML += `<br>⚠️ ${validationResult.warnings.length} avisos, ${validationResult.errors.length} erros`;
      }

      // Step 3: Preview
      updateStepper(3);
      previewSection.style.display = 'block';
      console.log('[ImportCenter] previewSection display set to block');
      btnConfirm.disabled = false;

      // Store validation result for confirm step
      window._pendingValidationResult = validationResult;
      
      // Build preview table comparing current vs new (only valid items)
      tbody.innerHTML = buildPreviewTable(validationResult.valid, validationResult.warnings, validationResult.errors);
      console.log('[ImportCenter] preview table built, rows:', tbody.querySelectorAll('tr').length);
      
      // Store valid data for confirm step
      window._pendingImportData = validationResult.valid;
      window._pendingImportFormat = detectResult.format;

    } catch (e) {
      detectedFormat.innerHTML = `❌ Erro: ${e.message}`;
      detectedFormat.style.color = 'var(--color-error)';
      toast('Erro na importação: ' + e.message, 'error');
    }
  }

  function buildPreviewTable(validData, warnings = [], errors = []) {
    // Get current positions from MOCK_DATA
    const current = {};
    if (window.MOCK_DATA?.positions) {
      for (const p of window.MOCK_DATA.positions) {
        current[p.ticker] = p;
      }
    }

    let html = '';
    
    // Valid items
    for (const item of validData) {
      const cur = current[item.ticker];
      const isNew = !cur;
      const isConflict = cur && (Math.abs(cur.qty - item.qty) > 0.001 || Math.abs(cur.currentPrice - item.currentPrice) > 0.01);
      const isUnknown = item.qtyUnknown === true;
      
      let statusClass = 'ok';
      let statusText = 'OK';
      if (isUnknown) { statusClass = 'unknown'; statusText = 'UNKNOWN'; }
      else if (isNew) { statusClass = 'gap'; statusText = 'Novo (gap)'; }
      else if (isConflict) { statusClass = 'conflict'; statusText = 'Conflito'; }

      const curQty = cur ? cur.qty : 0;
      const curPrice = cur ? cur.currentPrice : 0;
      const curValue = cur ? cur.value : 0;
      
      // Compute diff percentage before template to avoid syntax issues
      let diffPct = '0';
      let diffClass = 'text-success';
      if (isUnknown) {
        diffPct = '—';
        diffClass = 'text-muted';
      } else if (isNew) {
        diffPct = '+100';
        diffClass = 'text-warning';
      } else if (isConflict) {
        const pct = curValue ? ((item.value - curValue) / curValue * 100).toFixed(1) : '0';
        diffPct = (item.value > curValue ? '+' : '') + pct;
        diffClass = 'text-error';
      }
      
      const sourceBadge = item.source === 'B3' ? 'success' : 'info';
      const statusBadge = statusClass === 'conflict' ? 'error' : (statusClass === 'gap' ? 'warning' : (statusClass === 'unknown' ? 'muted' : 'success'));
      
      html += `<tr class="${statusClass}">
        <td><strong>${item.ticker}</strong></td>
        <td>${item.name}</td>
        <td><span class="badge badge-${item.class}">${item.type}</span></td>
        <td>${curQty > 0 ? `${curQty} / ${curPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${curValue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` : '—'}</td>
        <td>${isUnknown ? '—' : `${item.qty} / ${item.currentPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${item.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`}</td>
        <td class="${diffClass}">${diffPct}%</td>
        <td><span class="badge badge-${sourceBadge}">${item.source}</span></td>
        <td><span class="badge badge-${statusBadge}">${statusText}</span></td>
      </tr>`;
    }
    
    // Warnings
    for (const w of warnings) {
      const item = w.raw;
      const cur = current[item.ticker];
      const curQty = cur ? cur.qty : 0;
      const curPrice = cur ? cur.currentPrice : 0;
      const curValue = cur ? cur.value : 0;
      
      html += `<tr class="warning">
        <td><strong>${item.ticker}</strong></td>
        <td>${item.name}</td>
        <td><span class="badge badge-${item.class}">${item.type}</span></td>
        <td>${curQty > 0 ? `${curQty} / ${curPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${curValue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` : '—'}</td>
        <td>${item.qty} / ${item.currentPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${item.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
        <td class="text-warning">—</td>
        <td><span class="badge badge-${item.source === 'B3' ? 'success' : 'info'}">${item.source}</span></td>
        <td><span class="badge badge-warning">Aviso: ${w.warnings.join('; ')}</span></td>
      </tr>`;
    }
    
    // Errors
    for (const e of errors) {
      const item = e.raw;
      const cur = current[item.ticker];
      const curQty = cur ? cur.qty : 0;
      const curPrice = cur ? cur.currentPrice : 0;
      const curValue = cur ? cur.value : 0;
      
      html += `<tr class="error">
        <td><strong>${item.ticker}</strong></td>
        <td>${item.name}</td>
        <td><span class="badge badge-${item.class}">${item.type}</span></td>
        <td>${curQty > 0 ? `${curQty} / ${curPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${curValue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}` : '—'}</td>
        <td>${item.qty} / ${item.currentPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})} / ${item.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
        <td class="text-error">—</td>
        <td><span class="badge badge-${item.source === 'B3' ? 'success' : 'info'}">${item.source}</span></td>
        <td><span class="badge badge-error">Erro: ${e.errors.join('; ')}</span></td>
      </tr>`;
    }
    
    return html;
  }

  function updateStepper(activeStep) {
    document.querySelectorAll('.pipeline-stepper .step').forEach(s => {
      const step = parseInt(s.dataset.step);
      s.classList.toggle('active', step === activeStep);
      s.classList.toggle('completed', step < activeStep);
    });
  }

  // Converte resultado do parser de posição XLSX B3 para o formato canônico de posições
  function posToCanonical(posResult) {
    const norm = (a, cls) => ({
      ticker: a.ticker,
      name: a.name,
      class: cls,
      type: cls === 'stocks' ? 'Ação' : cls === 'fiis' ? 'FII' : cls === 'etfs' ? 'ETF' : 'Renda Fixa',
      qty: a.qty,
      avgPrice: a.currentPrice, // B3 posição não traz preço médio; usa preço de fechamento (avgPrice real via Fase 18/extrato PDF)
      currentPrice: a.currentPrice,
      value: a.value,
      sector: 'Outros',
      source: 'B3_POSICAO_XLSX',
      raw: a.raw
    });
    const out = [];
    for (const a of posResult.acoes) out.push(norm(a, 'stocks'));
    for (const a of posResult.etfs) out.push(norm(a, 'etfs'));
    for (const a of posResult.fundos) out.push(norm(a, 'fiis'));
    // RF: avgPrice = preço unitário atual (cenário CURVA); valor é o saldo atualizado
    for (const a of posResult.rendaFixa) out.push(norm(a, 'fixed'));
    // Empréstimos: não são posições — são direitos/obrigações; registra como classe própria
    for (const a of posResult.emprestimos) out.push({
      ...norm(a, 'other'),
      natureza: a.natureza, contrato: a.contrato, taxa: a.taxa,
      dataVencimento: a.dataVencimento
    });
    return out;
  }

  async function confirmImport() {
    console.log('[ImportCenter] confirmImport called');
    const rawData = window._pendingImportData;
    const validationResult = window._pendingValidationResult;
    const format = window._pendingImportFormat;
    if (!rawData?.length) return;

    // Fluxo próprio da Movimentação (proventos + operações)
    if (format === 'b3-movimentacao-xlsx') {
      const btnConfirmMov = document.getElementById('btnConfirmImport');
      btnConfirmMov.disabled = true;
      btnConfirmMov.textContent = 'Importando...';
      updateStepper(4);
      try {
        const res = window.ImportCenter.writeMovimentacao(rawData);
        if (!res.success) throw new Error(res.error);
        toast(`Importação concluída: +${res.addedEarnings} proventos, +${res.addedEntries} operações` + (res.duplicates ? `, ${res.duplicates} duplicatas ignoradas` : ''), 'success');
        document.getElementById('importPreviewSection').style.display = 'none';
        document.getElementById('importFile').value = '';
        document.getElementById('importDetectedFormat').style.display = 'none';
        btnConfirmMov.disabled = true;
        btnConfirmMov.textContent = 'Confirmar Importação';
        updateStepper(1);
      } catch (e) {
        console.error('[ImportCenter] erro writeMovimentacao:', e);
        toast('Erro ao importar movimentação: ' + e.message, 'error');
        btnConfirmMov.disabled = false;
        btnConfirmMov.textContent = 'Confirmar Importação';
      }
      return;
    }

    const btnConfirm = document.getElementById('btnConfirmImport');
    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Importando...';
    updateStepper(4);

    try {
      console.log('[ImportCenter] Running dedup...');
      // Step 4: Dedup
      const existingData = window.MOCK_DATA?.positions || [];
      const dedupResult = window.ImportCenter.dedup(rawData, existingData);
      console.log('[ImportCenter] dedup result:', { kept: dedupResult.kept.length, duplicates: dedupResult.duplicates.length });
      
      // Step 5: Write
      console.log('[ImportCenter] Writing data...');
      const writeResult = await window.ImportCenter.write(dedupResult.kept);
      if (!writeResult.success) {
        throw new Error(writeResult.error);
      }
      
      // Show summary
      let msg = `Importação concluída: ${writeResult.count} posições (${format})`;
      if (dedupResult.duplicates.length > 0) {
        msg += `, ${dedupResult.duplicates.length} duplicatas ignoradas`;
      }
      toast(msg, 'success');
      
      // Reset UI
      document.getElementById('importPreviewSection').style.display = 'none';
      document.getElementById('importFile').value = '';
      document.getElementById('importDetectedFormat').style.display = 'none';
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Confirmar Importação';
      updateStepper(1);

    } catch (e) {
      console.error('[ImportCenter] Error in confirmImport:', e);
      toast('Erro ao confirmar importação: ' + e.message, 'error');
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Confirmar Importação';
    }
  }

  function convertRawPositionsToCarteiraData(rawData) {
    // Filter out UNKNOWN items (qty=0/unknown) for portfolio calculations
    const validData = rawData.filter(a => !a.qtyUnknown);
    const total = validData.reduce((s,a)=>s+a.value,0);
    const invTotal = validData.reduce((s,a)=>s+a.invested,0);
    const profit = total - invTotal;
    
    // Aggregate by class
    const classAgg = {};
    validData.forEach(a => classAgg[a.class] = (classAgg[a.class] || 0) + a.value);
    const cn = {'stocks':'Ações','fiis':'FIIs','etfs':'ETFs','fixed':'Renda Fixa','other':'Outros'};
    const cc = {'stocks':'#1A73E8','fiis':'#34A853','fixed':'#3730A3','etfs':'#F9AB00','other':'#80868B'};
    const byClass = Object.entries(classAgg).map(([k,v])=>({name:cn[k],value:+v.toFixed(2),pct:+((v/total)*100).toFixed(1),color:cc[k]})).sort((a,b)=>b.value-a.value);
    const byAsset = validData.sort((a,b)=>b.value-a.value).map(a=>({name:a.ticker,class:a.cls,value:a.value,pct:+((a.value/total)*100).toFixed(2),return:a.ret}));

    const rent12m = invTotal ? +((total/invTotal-1)*100).toFixed(2) : 0;
    const kpis = {total:+total.toFixed(2), invested:+invTotal.toFixed(2), profit:+profit.toFixed(2), dividends:0, earnings12m:0, totalChange:rent12m, returnTotal:rent12m, yield12m:0};
    Object.assign(kpis, computeDerivedKpis([], invTotal, total));

    return {kpis, monthly:[], patrimony:{labels:[],portfolio:[],invested:[],cdi:[],ibov:[]}, allocation:{byAsset,byClass}, positions:validData, earnings:[], entries:[], assetReturns:validData.map(a=>({ticker:a.ticker,class:a.class,weight:+((a.value/total)*100).toFixed(2),return:a.ret,contrib:+(a.ret*a.value/total/100).toFixed(3),benchmark:kpis.totalChange,alpha:+(a.ret-kpis.totalChange).toFixed(2)}))};
  }

  // Enhance Fixed Income tab with RF Confidence
  const originalInitFixedIncome = initFixedIncome;
  initFixedIncome = function() {
    originalInitFixedIncome();
    enhanceFixedIncomeWithConfidence();
  };

  function enhanceFixedIncomeWithConfidence() {
    if (!window.Investidor10Advanced?.RFConfidence || !window.CARTEIRA_META?.fixedDetail) return;
    
    const tbody = document.getElementById('fixedBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const item = window.CARTEIRA_META.fixedDetail[idx];
      if (!item) return;
      
      // Classify
      const rfItem = {
        type: item.indexer === 'IPCA' ? (item.name.includes('CRA') ? 'CRA' : 'DEB') : 
              item.name.includes('LIG') ? 'LIG' : 'CDB',
        indexer: item.indexer,
        primaryCustodian: true, // Banco Inter
        hasMTM: true,
        lastMTMDate: '2026-09-26'
      };
      
      const level = window.Investidor10Advanced.RFConfidence.classify(rfItem);
      const display = window.Investidor10Advanced.RFConfidence.getDisplay(level);
      
      // Add confidence badge to first cell
      const firstCell = row.querySelector('td');
      if (firstCell) {
        const badge = document.createElement('span');
        badge.className = `confidence-badge ${display.class.replace('var(--color-', 'badge-')}`;
        badge.style.cssText = 'margin-left:var(--space-2);font-size:var(--font-size-xs);';
        badge.innerHTML = `${display.icon} ${display.label}`;
        badge.title = display.description;
        firstCell.appendChild(badge);
      }
    });
    
    // Add legend
    const legend = document.createElement('div');
    legend.className = 'confidence-legend';
    legend.style.cssText = 'margin-top:var(--space-4);padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-sm);font-size:var(--font-size-sm);';
    legend.innerHTML = `
      <strong>Legenda de Confiança RF:</strong>
      <div class="flex-3-wrap-mt-2">
        ${Object.entries({SUPPORTED:'✅ Suportado',SHADOW:'👁️ Sombra',MANUAL:'✏️ Manual',STALE:'⏳ Desatualizado',UNKNOWN:'❓ Desconhecido'}).map(([k,v])=>`<span title="${window.Investidor10Advanced.RFConfidence.getDisplay(k).description}">${v}</span>`).join('')}
      </div>
    `;
    const fixedTable = document.getElementById('fixedTable');
    if (fixedTable) fixedTable.parentNode.appendChild(legend);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Fase 17 — Durabilidade: health check + migração + lembrete de backup
  try {
    if (window.Durability) window.Durability.init();
  } catch (e) {
    console.warn('[Durability] init falhou (não crítico):', e);
  }
})();

// ========================================
// NOVAS INICIALIZAÇÕES: Risk, Monte Carlo, Benchmarks, Tax
// ========================================

// Risk Engine Integration
function initRiskPanel() {
  if (!window.RiskEngine || !window.CARTEIRA_DATA) return;
  
  // Precisa de retornos históricos - usa snapshots se disponível
  const snapshots = window.Investidor10Advanced?.SnapshotManager?.getAll() || [];
  if (snapshots.length < 30) {
    document.getElementById('riskKpis').innerHTML = '<p class="text-muted">Dados insuficientes para análise de risco (mínimo 30 dias de histórico).</p>';
    return;
  }
  
  // Extrai retornos dos snapshots
  const returns = [];
  const dates = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i-1].data.kpis.total;
    const curr = snapshots[i].data.kpis.total;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
      dates.push(snapshots[i].date);
    }
  }
  
  // Benchmarks
  const bench = new BenchmarkEngine();
  bench.fetchAll(['CDI', 'IBOV', 'IFIX']).then(() => {
    const riskEngine = new RiskEngine({ riskFreeRate: 0.1075 });
    riskEngine.setPortfolioReturns(returns, dates);
    
    Object.entries(bench.data).forEach(([key, data]) => {
      if (data.returns.length) {
        riskEngine.addBenchmark(key, data.returns, data.prices.map(p => p.date));
      }
    });
    
    // Asset returns para correlation matrix
    const assetReturns = {};
    window.CARTEIRA_DATA.positions.forEach(p => {
      // Mock returns para correlação (em produção viria de API)
      assetReturns[p.ticker] = {
        returns: Array(100).fill(0).map(() => (Math.random() - 0.5) * 0.04),
        dates: dates.slice(-100)
      };
    });
    riskEngine.addAssetReturns(assetReturns);
    
    const report = riskEngine.generateFullReport();
    renderRiskPanel(report);
  });
}

function renderRiskPanel(report) {
  const kpis = document.getElementById('riskKpis');
  if (!kpis) return;
  
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  
  // KPIs principais
  const var95 = report.var.VaR_95 || {};
  const mdd = report.maxDrawdown || {};
  const sharpe = report.sharpe || {};
  const sortino = report.sortino || {};
  const calmar = report.calmar || {};
  
  kpis.innerHTML = `
    <div class="kpi-card"><span class="kpi-label">VaR 95% (1 dia)</span><span class="kpi-value text-error">${var95.varPct || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">CVaR 95%</span><span class="kpi-value text-error">${var95.cvarPct || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">Max Drawdown</span><span class="kpi-value text-error">${mdd.maxDrawdownPct || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">Sharpe Ratio</span><span class="kpi-value ${sharpe.sharpeRatio >= 1 ? 'text-success' : 'text-warning'}">${sharpe.sharpeRatio || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">Sortino Ratio</span><span class="kpi-value ${sortino.sortinoRatio >= 1 ? 'text-success' : 'text-warning'}">${sortino.sortinoRatio || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">Calmar Ratio</span><span class="kpi-value ${calmar.calmarRatio >= 1 ? 'text-success' : 'text-warning'}">${calmar.calmarRatio || 'N/A'}</span></div>
    <div class="kpi-card"><span class="kpi-label">Vol Anualizada</span><span class="kpi-value">${sharpe.annualizedVolatility || 'N/A'}</span></div>
  `;
  
  // Correlation Matrix
  const corr = report.correlationMatrix;
  if (corr && corr.tickers.length) {
    const container = document.getElementById('correlationMatrix');
    if (container) {
      let html = '<table class="data-table text-12"><thead><tr><th></th>';
      corr.tickers.forEach(t => html += `<th>${t}</th>`);
      html += '</tr></thead><tbody>';
      corr.tickers.forEach(t1 => {
        html += `<tr><th>${t1}</th>`;
        corr.tickers.forEach(t2 => {
          const val = corr.matrix[t1]?.[t2];
          const color = val > 0.7 ? 'text-error' : val > 0.3 ? 'text-warning' : val < -0.3 ? 'text-success' : '';
          html += `<td class="${color}">${val !== null ? val.toFixed(2) : '-'}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    }
  }
  
  // Rolling Chart
  const rolling = report.rolling;
  if (rolling && rolling.dates.length) {
    const ctx = document.getElementById('rollingChart');
    if (ctx && !ctx.chart) {
      ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: rolling.dates,
          datasets: [
            { label: 'Sharpe Rolling', data: rolling.sharpe, borderColor: '#1a73e8', fill: false },
            { label: 'Volatilidade %', data: rolling.volatility, borderColor: '#ea4335', fill: false, yAxisID: 'y1' },
            { label: 'Max DD %', data: rolling.maxDrawdown, borderColor: '#f9ab00', fill: false, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Sharpe' } },
            y1: { type: 'linear', position: 'right', title: { display: true, text: '%' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }
  }
}

// Monte Carlo Integration
function initMonteCarloPanel() {
  const btn = document.getElementById('btnRunMC');
  if (!btn) return;
  if (btn.__mcWired) return; // MutationObserver chama a cada visita: evita listeners duplicados
  btn.__mcWired = true;

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.textContent = 'Simulando...';

    const config = {
      nSimulations: 2000, // mensal + worker: rápido o suficiente para auto-run (estatisticamente adequado)
      horizonYears: +document.getElementById('mcHorizon').value || 30,
      initialValue: +document.getElementById('mcInitial').value || 500000,
      monthlyContribution: +document.getElementById('mcMonthly').value || 5000,
      contributionGrowth: 0.03,
      inflationRate: 0.035,
      timeStep: 1 / 12 // passos mensais: mesmo resultado anual, ~100x mais rápido que diário
    };

    // Stress test wiring
    const btnStress = document.getElementById('btnRunStress');
    if (btnStress && !btnStress.__stressWired) {
      btnStress.__stressWired = true;
      btnStress.addEventListener('click', () => {
        btnStress.disabled = true;
        btnStress.textContent = 'Simulando stress...';
        const mc = new MonteCarloEngine({ nSimulations: 2000, horizonYears: +document.getElementById('mcHorizon').value || 30, initialValue: +document.getElementById('mcInitial').value || 500000, monthlyContribution: +document.getElementById('mcMonthly').value || 5000 });
        const results = mc.runStressTest(['2008', '2020', '2022']);
        const div = document.getElementById('stressResults');
        const tbl = document.getElementById('stressTable');
        if (div && tbl) {
          const rows = Object.entries(results).map(([k, v]) => `
            <tr><th>${v.label}</th><td>${v.median}</td><td>${v.p10}</td><td>${v.survival}</td></tr>`).join('');
          tbl.innerHTML = `<table class="data-table text-sm"><tr><th>Cenário</th><th>Mediana</th><th>P10 (pior)</th><th>Sobrevivência</th></tr>${rows}</table>`;
          div.style.display = 'block';
        }
        btnStress.disabled = false;
        btnStress.textContent = 'Stress Test';
      });
    }
    const params = {
      expectedReturn: (+document.getElementById('mcReturn').value || 12) / 100,
      volatility: (+document.getElementById('mcVol').value || 18) / 100
    };

    const finish = () => {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.textContent = 'Executar Simulação';
    };

    // Caminho preferencial: Web Worker (não bloqueia a UI — fix da auditoria #8)
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker('mc-worker.js');
        worker.onmessage = (ev) => {
          worker.terminate();
          if (ev.data && ev.data.ok) {
            renderMonteCarloPanel(ev.data.results, ev.data.chartData);
          } else {
            document.getElementById('mcKpis').innerHTML =
              '<p class="text-muted">Falha na simulação: ' + (ev.data && ev.data.error ? ev.data.error : 'erro desconhecido') + '</p>';
          }
          finish();
        };
        worker.onerror = () => {
          worker.terminate();
          runSync(config, params, finish); // fallback: main thread
        };
        worker.postMessage({ config, params });
        return;
      } catch (_) { /* Worker indisponível → fallback síncrono abaixo */ }
    }
    runSync(config, params, finish);
  });

  function runSync(config, params, finish) {
    const mc = new MonteCarloEngine(config);
    mc.setPortfolioParams(params);
    mc.run();
    renderMonteCarloPanel(mc.results, mc.exportChartData());
    finish();
  }
}

function renderMonteCarloPanel(results, chartDataArg) {
  const kpis = document.getElementById('mcKpis');
  if (!kpis) return;
  
  const { summary, probabilityOfLoss, probabilityOfDoubling, probabilityOf10x } = results;
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const fmtPct = (v) => (v * 100).toFixed(1) + '%';
  
  kpis.innerHTML = `
    <div class="kpi-card"><span class="kpi-label">Mediana (P50) Nominal</span><span class="kpi-value">${fmt(summary.nominal.median)}</span></div>
    <div class="kpi-card"><span class="kpi-label">P10 (Pessimista)</span><span class="kpi-value text-warning">${fmt(summary.nominal.p10)}</span></div>
    <div class="kpi-card"><span class="kpi-label">P90 (Otimista)</span><span class="kpi-value text-success">${fmt(summary.nominal.p90)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Mediana Real</span><span class="kpi-value">${fmt(summary.real.median)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Prob. Perda</span><span class="kpi-value ${probabilityOfLoss > 0.5 ? 'text-error' : 'text-success'}">${fmtPct(probabilityOfLoss)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Prob. Dobrar</span><span class="kpi-value text-success">${fmtPct(probabilityOfDoubling)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Prob. 10x</span><span class="kpi-value">${fmtPct(probabilityOf10x)}</span></div>
  `;
  
  // Chart
  const chartData = (typeof chartDataArg !== 'undefined' && chartDataArg) ? chartDataArg : (typeof mc !== 'undefined' && mc && mc.exportChartData ? mc.exportChartData() : null);
  const ctx = document.getElementById('mcChart');
  if (ctx) {
    if (ctx.chart) ctx.chart.destroy();
    ctx.chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { title: { display: true, text: 'Patrimônio (R$)' }, ticks: { callback: v => v.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) } } }
      }
    });
  }
}

// Benchmarks Integration
function initBenchmarksPanel() {
  const btn = document.getElementById('btnFetchBenchmarks');
  if (!btn) return;
  
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Buscando...';
    document.getElementById('benchStatus').textContent = 'Carregando dados da brapi.dev...';

    const bench = new BenchmarkEngine({ brapiToken: null }); // sem token = mock
    await bench.fetchAll(['CDI', 'IBOV', 'IFIX', 'SMLL', 'IDIV', 'IMAB', 'BTC', 'DOL', 'USDBRL']);

    renderBenchmarksPanel(bench.data);

    btn.disabled = false;
    btn.textContent = 'Atualizar Benchmarks';
    document.getElementById('benchStatus').textContent = `Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`;
  });

  // Backtest vs Meta (usa dados locais, sem rede)
  const btnBt = document.getElementById('btnBacktest');
  if (btnBt && !btnBt.__btWired) {
    btnBt.__btWired = true;
    btnBt.addEventListener('click', () => {
      const k = window.MOCK_DATA?.kpis || {};
      const series = window.MOCK_DATA?.patrimony?.portfolio || [];
      // Retornos diários simulados a partir da série patrimonial
      const rets = [];
      for (let i = 1; i < series.length; i++) {
        if (series[i - 1] > 0) rets.push(series[i] / series[i - 1] - 1);
      }
      // Bench CDI diário ~13.65%/252
      const benchRets = rets.map(() => 0.1365 / 252);
      const result = new BenchmarkEngine({}).backtest(rets, benchRets, { ticker: 'Carteira', currentPct: 100, targetPct: 100 }, null);
      const div = document.getElementById('backtestResults');
      if (div) {
        const recs = (result.recommendations || []).map(r => `<p class="m-2px text-secondary">• ${r}</p>`).join('');
        div.innerHTML = `
          <table class="data-table text-sm">
            <tr><th>Métrica</th><th>Carteira</th><th>CDI</th><th>Excess</th></tr>
            <tr><td>Retorno total</td><td>${result.portTotal}</td><td>${result.benchTotal}</td><td>${result.excess}</td></tr>
            <tr><td>Max Drawdown</td><td colspan="3">${result.maxDD}</td></tr>
          </table>
          ${recs ? `<p class="mt-2-fw-600">Recomendações:</p>${recs}` : '<p class="mt-2 text-muted">Sem recomendações — carteira alinhada à meta.</p>'}
        `;
      }
    });
  }
}

function renderBenchmarksPanel(data) {
  const kpis = document.getElementById('benchKpis');
  if (!kpis) return;
  
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  
  let html = '';
  Object.entries(data).forEach(([key, d]) => {
    if (!d) return;
    const cls = d.change1d >= 0 ? 'text-success' : 'text-error';
    html += `
      <div class="kpi-card minw-160">
        <span class="kpi-label">${d.name}</span>
        <span class="kpi-value">${d.currentPrice?.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}) || 'N/A'}</span>
        <span class="kpi-change ${cls}">${fmtPct(d.change1d)} (1D)</span>
        <span class="kpi-change ${d.changeYTD >= 0 ? 'text-success' : 'text-error'}" data-fase-e-class="text-11">${fmtPct(d.changeYTD)} YTD</span>
      </div>`;
  });
  kpis.innerHTML = html;
  
  // Table
  const tbody = document.getElementById('benchBody');
  if (tbody) {
    tbody.innerHTML = Object.entries(data).map(([key, d]) => {
      if (!d) return '';
      const cls1d = d.change1d >= 0 ? 'text-success' : 'text-error';
      const clsYTD = d.changeYTD >= 0 ? 'text-success' : 'text-error';
      return `<tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.currentPrice?.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}) || 'N/A'}</td>
        <td class="${cls1d}">${fmtPct(d.change1d)}</td>
        <td class="${clsYTD}">${fmtPct(d.changeYTD)}</td>
        <td>${fmtPct(d.volatility)}</td>
        <td>${d.sharpe?.toFixed(2) || 'N/A'}</td>
        <td class="text-error">${fmtPct(d.maxDrawdown)}</td>
        <td>${d.isMock ? 'Mock' : 'brapi.dev'}</td>
      </tr>`;
    }).join('');
  }
  
  // Comparison vs portfolio (se tiver CARTEIRA_DATA)
  if (window.CARTEIRA_DATA?.positions) {
    const comparison = bench.comparePortfolio(
      window.CARTEIRA_DATA.positions.map(p => p.weight / 100), // weights
      [] // dates - simplificado
    );
    const compDiv = document.getElementById('benchComparison');
    if (compDiv) {
      let html = '<table class="data-table"><thead><tr><th>Benchmark</th><th>Beta</th><th>Alpha</th><th>Tracking Error</th><th>Info Ratio</th><th>Excesso vs Bench</th></tr></thead><tbody>';
      Object.entries(comparison).forEach(([key, c]) => {
        html += `<tr>
          <td>${c.benchmark}</td>
          <td>${c.beta}</td>
          <td class="${c.alpha.startsWith('-') ? 'text-error' : 'text-success'}">${c.alpha}</td>
          <td>${c.trackingError}</td>
          <td>${c.informationRatio}</td>
          <td class="${c.excessReturn.startsWith('-') ? 'text-error' : 'text-success'}">${c.excessReturn}</td>
        </tr>`;
      });
      html += '</tbody></table>';
      compDiv.innerHTML = html;
    }
  }
}

// Tax Engine Integration
function initTaxPanel() {
  const btnProcess = document.getElementById('btnProcessTax');
  const btnXML = document.getElementById('btnExportIRPF');
  const btnDARF = document.getElementById('btnExportDARF');
  
  if (!btnProcess) return;
  
  btnProcess.addEventListener('click', () => {
    const year = +document.getElementById('taxYear').value || 2024;
    btnProcess.disabled = true;
    btnProcess.textContent = 'Processando...';
    
    const tax = new TaxEngine({ year });
    
    // Converte operações da carteira para o tax engine
    if (window.CARTEIRA_DATA?.entries) {
      window.CARTEIRA_DATA.entries.forEach(e => {
        tax.addOperation({
          date: e.date,
          type: e.type === 'buy' ? 'buy' : 'sell',
          assetClass: e.class === 'stocks' ? 'acao' : e.class === 'fiis' ? 'fii' : e.class === 'etfs' ? 'etf' : 'fixed',
          ticker: e.ticker,
          name: e.name,
          quantity: e.qty,
          price: e.price,
          fees: e.fees || 0,
          isDayTrade: e.isDayTrade || false
        });
      });
    }
    
    // Proventos
    if (window.CARTEIRA_DATA?.earnings) {
      window.CARTEIRA_DATA.earnings.forEach(p => {
        tax.addIncome({
          date: p.date,
          type: p.eventType === 'Dividendo' ? 'dividendo' : p.eventType === 'JCP' ? 'jcp' : 'rendimento_fii',
          assetClass: p.assetClass || 'acao',
          ticker: p.ticker,
          name: p.assetName,
          grossValue: p.value,
          irrfRetido: p.irrf || 0
        });
      });
    }
    
    tax.processMonthly();
    renderTaxPanel(tax.generateAnnualReport());
    
    btnProcess.disabled = false;
    btnProcess.textContent = 'Processar Ano';
  });
  
  if (btnXML) {
    btnXML.addEventListener('click', () => {
      const tax = new TaxEngine({ year: +document.getElementById('taxYear').value || 2024 });
      // Reprocessa se necessário
      const xml = tax.exportToIRPFXML();
      downloadFile(xml, `irpf-${tax.options.year}.xml`, 'application/xml');
      toast('XML IRPF baixado', 'success');
    });
  }
  
  if (btnDARF) {
    btnDARF.addEventListener('click', () => {
      const tax = new TaxEngine({ year: +document.getElementById('taxYear').value || 2024 });
      const darfs = tax.generateDARFs();
      darfs.forEach(d => {
        downloadFile(d.barcode, `DARF-${d.month}-${d.tipo||'RV'}.txt`, 'text/plain');
      });
      toast(`${darfs.length} DARFs gerados`, 'success');
    });
  }
}

function renderTaxPanel(report) {
  const kpis = document.getElementById('taxKpis');
  if (!kpis) return;
  
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  
  kpis.innerHTML = `
    <div class="kpi-card"><span class="kpi-label">Total DARF Ano</span><span class="kpi-value text-error">${fmt(report.annualTotals.darfTotal)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Total GCAP</span><span class="kpi-value text-error">${fmt(report.annualTotals.gcapTotal)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Dividendos (isentos)</span><span class="kpi-value text-success">${fmt(report.annualTotals.incomeTotals.dividendo)}</span></div>
    <div class="kpi-card"><span class="kpi-label">JCP (tributado)</span><span class="kpi-value">${fmt(report.annualTotals.incomeTotals.jcp)}</span></div>
    <div class="kpi-card"><span class="kpi-label">Rendimentos FII</span><span class="kpi-value text-success">${fmt(report.annualTotals.incomeTotals.rendimento_fii)}</span></div>
    <div class="kpi-card"><span class="kpi-label">IRRF Retido</span><span class="kpi-value">${fmt(report.annualTotals.incomeTotals.irrfRetido)}</span></div>
  `;
  
  // DARF Table
  const darfBody = document.getElementById('darfBody');
  if (darfBody) {
    darfBody.innerHTML = Object.entries(report.monthly).map(([month, data]) => {
      if (!data.darf.valor || data.darf.valor < 0.01) return '';
      return `<tr>
        <td>${month}</td>
        <td>${fmt(data.darf.valor)}</td>
        <td>${data.darf.codigo}</td>
        <td>${data.darf.vencimento}</td>
        <td>${Object.entries(data.darf.breakdown).filter(([_,v])=>v>0).map(([k,v])=>`${k}: ${fmt(v)}`).join(', ')}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="downloadFile('${data.darf.barcode}', 'DARF-${month}.txt', 'text/plain')">Baixar</button></td>
      </tr>`;
    }).join('');
  }
  
  // GCAP Table
  const gcapBody = document.getElementById('gcapBody');
  if (gcapBody) {
    gcapBody.innerHTML = Object.entries(report.monthly).map(([month, data]) => {
      if (!data.gcap.valor || data.gcap.valor < 0.01) return '';
      return `<tr>
        <td>${month}</td>
        <td>Imóvel/Veículo/Direito</td>
        <td>${fmt(data.gcap.gain || 0)}</td>
        <td>${fmt(data.gcap.valor)}</td>
        <td>${data.gcap.codigo}</td>
        <td>${data.gcap.vencimento}</td>
      </tr>`;
    }).join('');
  }
  
  // Summary
  const summaryDiv = document.getElementById('taxSummary');
  if (summaryDiv) {
    const irpf = tax.calculateAnnualIRPF(0);
    const fmtPct = (v) => (v * 100).toFixed(2) + '%';
    summaryDiv.innerHTML = `
      <div class="card p-4">
        <h4>Cálculo IRPF Anual</h4>
        <p>Renda tributável: ${fmt(irpf.totalTaxableIncome)}</p>
        <p>Imposto devido: ${fmt(irpf.taxDue)}</p>
        <p>IRRF retido + DARFs: ${fmt(irpf.totalIRRF)}</p>
        <p class="${irpf.status === 'RESTITUIÇÃO' ? 'text-success' : 'text-error'}"><strong>${irpf.status}: ${fmt(Math.abs(irpf.balance))}</strong></p>
      </div>
      <details class="mt-4">
        <summary>Ver XML pré-preenchido</summary>
        <pre class="debug-box-300">${tax.exportToIRPFXML().substring(0, 5000)}...</pre>
      </details>
    `;
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ========================================
// Corporate Events Center Initialization
// ========================================
function initCorporateEventsCenter() {
  console.log('[CorporateEvents] initCorporateEventsCenter called');
  
  // Check if CorporateEvents module is loaded
  if (!window.CorporateEvents) {
    console.warn('[CorporateEvents] CorporateEvents module not loaded');
    return;
  }

  // Setup event listeners for Corporate Events panel
  const corpEventsFile = document.getElementById('corpEventsFile');
  const corpDropzone = document.getElementById('corpEventsDropzone');
  const btnClear = document.getElementById('btnClearCorpEvents');
  const btnApply = document.getElementById('btnApplyCorpEvents');
  const manualForm = document.getElementById('manualEventForm');
  
  // Store events in window for persistence
  window._pendingCorpEvents = window._pendingCorpEvents || [];
  window._appliedCorpEvents = window._appliedCorpEvents || [];

  // Dropzone click
  if (corpDropzone && corpEventsFile) {
    corpDropzone.addEventListener('click', () => corpEventsFile?.click());
    corpDropzone.addEventListener('dragover', e => { e.preventDefault(); corpDropzone.style.borderColor = 'var(--color-primary)'; });
    corpDropzone.addEventListener('dragleave', () => corpDropzone.style.borderColor = 'var(--color-border)');
    corpDropzone.addEventListener('drop', e => {
      e.preventDefault(); corpDropzone.style.borderColor = 'var(--color-border)';
      const f = e.dataTransfer.files[0] || corpEventsFile?.files[0];
      if (f) processCorpEventsFile(f);
    });
  }

  // File input change
  if (corpEventsFile) {
    corpEventsFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await processCorpEventsFile(file);
    });
  }

  // Clear log button
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      window._pendingCorpEvents = [];
      renderCorpEventsLog();
      document.getElementById('corpEventsLogSection').style.display = 'none';
      document.getElementById('corpEventsDetected').style.display = 'none';
    });
  }

  // Apply to portfolio button
  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      await applyCorpEventsToPortfolio();
    });
  }

  // Manual event form
  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(manualForm);
      const event = {
        type: formData.get('manualEventType'),
        ticker: formData.get('manualEventTicker')?.toUpperCase().replace('.SA', ''),
        date: formData.get('manualEventDate'),
        quantity: +formData.get('manualEventQty'),
        price: +formData.get('manualEventPrice') || 0,
        ratio: +formData.get('manualEventQty'),
        source: 'MANUAL',
        raw: {}
      };
      
      if (!event.type || !event.ticker || !event.date || event.quantity <= 0) {
        toast('Preencha todos os campos obrigatórios', 'error');
        return;
      }
      
      window._pendingCorpEvents.push(event);
      renderCorpEventsLog();
      manualForm.reset();
    });
  }
}

async function processCorpEventsFile(file) {
  console.log('[CorporateEvents] Processing file:', file.name);
  const detectedDiv = document.getElementById('corpEventsDetected');
  const logSection = document.getElementById('corpEventsLogSection');
  
  detectedDiv.style.display = 'block';
  detectedDiv.textContent = '🔍 Processando CSV de eventos...';
  
  try {
    const text = await file.text();
    const events = window.CorporateEvents.detectEvents(text);
    
    if (events.length === 0) {
      detectedDiv.innerHTML = '⚠️ Nenhum evento corporativo detectado no arquivo';
      detectedDiv.style.color = 'var(--color-warning)';
      return;
    }
    
    detectedDiv.innerHTML = `✅ <strong>${events.length}</strong> evento(s) detectado(s): ${events.map(e => e.rawType).join(', ')}`;
    detectedDiv.style.color = 'var(--color-primary)';
    
    // Store events and show log
    window._pendingCorpEvents = events;
    renderCorpEventsLog();
    logSection.style.display = 'block';
    
  } catch (e) {
    detectedDiv.innerHTML = `❌ Erro: ${e.message}`;
    detectedDiv.style.color = 'var(--color-error)';
  }
}

function renderCorpEventsLog() {
  const tbody = document.getElementById('corpEventsLogBody');
  const logSection = document.getElementById('corpEventsLogSection');
  
  if (!tbody) return;
  
  if (window._pendingCorpEvents.length === 0) {
    logSection.style.display = 'none';
    return;
  }
  
  logSection.style.display = 'block';
  
  const typeLabels = {
    split: 'Split (Desdobramento)',
    merge: 'Merge (Grupamento)',
    bonus: 'Bonificação',
    subscription: 'Subscrição',
    amortization: 'Amortização'
  };
  
  tbody.innerHTML = window._pendingCorpEvents.map((event, idx) => `
    <tr>
      <td>${event.date || '—'}</td>
      <td><span class="badge badge-info">${typeLabels[event.type] || event.type}</span></td>
      <td><strong>${event.ticker}</strong></td>
      <td>
        ${event.type === 'split' || event.type === 'merge' ? `Fator: ${event.ratio}` : ''}
        ${event.type === 'bonus' ? `Qtd: ${event.quantity}` : ''}
        ${event.type === 'subscription' ? `Qtd: ${event.quantity} @ ${event.price.toFixed(2)}` : ''}
        ${event.type === 'amortization' ? `Qtd: ${event.quantity} @ ${event.price || 'PM'}` : ''}
      </td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
      <td><span class="badge badge-info">Pendente</span></td>
    </tr>
  `).join('');
}

async function applyCorpEventsToPortfolio() {
  if (!window.CARTEIRA_DATA || !window.CARTEIRA_DATA.positions) {
    toast('Carteira não carregada', 'error');
    return;
  }
  
  if (window._pendingCorpEvents.length === 0) {
    toast('Nenhum evento para aplicar', 'warning');
    return;
  }
  
  const positions = window.CARTEIRA_DATA.positions;
  const results = window.CorporateEvents.processEvents(positions, window._pendingCorpEvents);
  
  if (results.applied.length > 0) {
    // Update window._appliedCorpEvents log
    window._appliedCorpEvents.push(...results.applied.map(r => ({ ...r, appliedAt: new Date().toISOString() })));
    
    // Save to localStorage
    localStorage.setItem('corpEventsLog', JSON.stringify(window._appliedCorpEvents));
    
    // Re-render tables
    if (typeof renderAll === 'function') {
      renderAll();
    } else {
      if (typeof renderPositions === 'function') renderPositions();
      if (typeof renderKPIs === 'function') renderKPIs();
    }
    
    // Capture snapshot
    if (window.Investidor10Advanced?.SnapshotManager) {
      window.Investidor10Advanced.SnapshotManager.capture(window.CARTEIRA_DATA, 'corporate-events');
    }
    
    toast(`${results.applied.length} evento(s) aplicado(s) à carteira`, 'success');
    console.log('[CorporateEvents] Applied:', results.applied);
    
    // Update log display to show applied
    renderCorpEventsLog();
  }
  
  if (results.skipped.length > 0) {
    console.warn('[CorporateEvents] Skipped:', results.skipped);
    toast(`${results.skipped.length} evento(s) ignorado(s)`, 'warning');
  }
  
  // Clear pending
  window._pendingCorpEvents = [];
}

// ========================================
// Data Trust Center Panel Rendering
// ========================================
function renderDataTrustPanel() {
  if (!window.DataTrust || !window.CARTEIRA_DATA?.positions) return;
  
  const positions = window.CARTEIRA_DATA.positions;
  
  // 1. Portfolio Confidence Summary
  const portfolioConf = window.DataTrust.calculatePortfolioConfidence(positions);
  const summaryDiv = document.getElementById('portfolioConfidenceSummary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="kpi-card">
        <span class="kpi-label">Score Geral</span>
        <span class="kpi-value" class="dyn-color" data-color="${portfolioConf.color}">${(portfolioConf.score * 100).toFixed(0)}%</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Nível</span>
        <span class="kpi-value">${portfolioConf.label}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Ativos</span>
        <span class="kpi-value">${portfolioConf.assetCount}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Precisam Revisão</span>
        <span class="kpi-value text-warning">${portfolioConf.needsReview.length}</span>
      </div>
    `;
  }
  
  // 2. Assets Confidence Table
  const tbody = document.getElementById('dataTrustBody');
  if (tbody && portfolioConf.assetConfidences) {
    tbody.innerHTML = portfolioConf.assetConfidences.map(ac => {
      const asset = positions.find(p => p.ticker === ac.ticker);
      const factorsHtml = ac.factors.map(f => 
        `<span class="badge badge-${f.penalty ? 'warning' : (f.bonus ? 'success' : 'info')}">${f.factor}</span>`
      ).join(' ');
      
      return `
        <tr>
          <td><strong>${ac.ticker}</strong></td>
          <td>${asset?.name || '—'}</td>
          <td><span class="badge badge-info">${ac.source}</span></td>
          <td><div class="confidence-indicator"><div class="confidence-bar" class="dyn-bg" data-w="${Math.round(ac.score*100)}" data-bg="${ac.color}"></div><span>${Math.round(ac.score*100)}%</span></div></td>
          <td><span class="badge badge-${ac.level}">${ac.label}</span></td>
          <td>${factorsHtml || '<span class="text-muted">OK</span>'}</td>
          <td>${ac.lastUpdate ? new Date(ac.lastUpdate).toLocaleDateString('pt-BR') : '<span class="text-muted">—</span>'}</td>
        </tr>
      `;
    }).join('');
  }
  
  // 3. Audit Snapshots
  renderAuditSnapshots();
  
  // 4. Data Freshness
  renderDataFreshness(positions);
}

function renderAuditSnapshots() {
  const tbody = document.getElementById('auditSnapshotsBody');
  if (!tbody) return;

  // Unifica as DUAS fontes reais de snapshots:
  // 1. DataTrust (src/data-trust) — criados por "Criar Snapshot Manual" → key 'auditSnapshots'
  // 2. SnapshotManager (advanced-engine) — criados por "Backup Agora" → key 'investidor10-snapshots'
  const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
  const dt = readLS('auditSnapshots').map(s => ({
    when: s.timestamp, type: s.type, assets: s.metadata?.assetCount,
    total: s.metadata?.totalValue, hash: s.dataHash, extra: Object.keys(s.metadata || {}).length > 2 ? 'metadata manual' : ''
  }));
  const sm = readLS('investidor10-snapshots').map(s => ({
    when: s.date, type: 'snapshot_' + (s.source || 'auto'), assets: s.data?.positions?.length,
    total: s.data?.kpis?.total, hash: s.fingerprint, extra: s.priceCoverage != null ? 'cobertura ' + Math.round(s.priceCoverage * 100) + '%' : ''
  }));
  const all = [...dt, ...sm].sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));

  if (all.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="center-muted-p4">Nenhum snapshot registrado. Clique em "Criar Snapshot Manual" ou "Backup Agora".</td></tr>';
    return;
  }

  const fmt = v => (v != null && Number.isFinite(+v)) ? (+v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
  tbody.innerHTML = all.slice(0, 10).map(s => `
    <tr>
      <td>${s.when ? new Date(s.when).toLocaleString('pt-BR') : '—'}</td>
      <td><span class="badge badge-info">${s.type || '—'}</span></td>
      <td>${s.assets ?? '—'}</td>
      <td>${fmt(s.total)}</td>
      <td><code>${String(s.hash || '').slice(0, 16)}</code></td>
      <td>${s.extra || ''}</td>
    </tr>
  `).join('');
}

function renderDataFreshness(positions) {
  const freshness = window.DataTrust?.checkDataFreshness(positions);
  if (!freshness) return;
  
  const summaryDiv = document.getElementById('dataFreshnessSummary');
  if (summaryDiv) {
    summaryDiv.innerHTML = `
      <div class="kpi-card ${freshness.overallStatus === 'FRESH' ? 'border-success' : (freshness.overallStatus === 'STALE' ? 'border-error' : 'border-warning')}">
        <span class="kpi-label">Status Geral</span>
        <span class="kpi-value">${freshness.overallStatus}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Frescos (≤7d)</span>
        <span class="kpi-value text-success">${freshness.fresh}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Envelhecendo (8-30d)</span>
        <span class="kpi-value text-warning">${freshness.aging}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">STALE (>30d)</span>
        <span class="kpi-value text-error">${freshness.stale}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Desconhecidos</span>
        <span class="kpi-value text-muted">${freshness.unknown}</span>
      </div>
    `;
  }
  
  const tbody = document.getElementById('dataFreshnessBody');
  if (tbody && freshness.assets) {
    tbody.innerHTML = freshness.assets.map(a => `
      <tr class="${a.status.toLowerCase()}">
        <td><strong>${a.ticker}</strong></td>
        <td><span class="badge badge-${a.status === 'FRESH' ? 'success' : (a.status === 'STALE' ? 'error' : (a.status === 'AGING' ? 'warning' : 'muted'))}">${a.status}</span></td>
        <td>${a.ageDays !== null ? a.ageDays + 'd' : '—'}</td>
      </tr>
    `).join('');
  }
}

// Setup Data Trust panel event listeners
function initDataTrustPanel() {
  const btnRefresh = document.getElementById('btnRefreshAudit');
  const btnVerify = document.getElementById('btnVerifyIntegrity');
  const btnCreate = document.getElementById('btnCreateSnapshot');
  
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      renderAuditSnapshots();
      toast('Lista de snapshots atualizada', 'success');
    });
  }
  
  if (btnVerify) {
    btnVerify.addEventListener('click', () => {
      if (!window.CARTEIRA_DATA) {
        toast('Carteira não carregada', 'error');
        return;
      }
      const result = window.DataTrust?.verifyDataIntegrity(window.CARTEIRA_DATA);
      if (result) {
        if (result.verified) {
          toast('✅ Integridade verificada: dados íntegros', 'success');
        } else {
          toast(`⚠️ ${result.reason || 'Dados alterados desde último snapshot'}`, 'warning');
        }
      }
    });
  }
  
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      if (!window.CARTEIRA_DATA) {
        toast('Carteira não carregada', 'error');
        return;
      }
      const snap = window.DataTrust?.createAuditSnapshot('manual_snapshot', window.CARTEIRA_DATA, { manual: true });
      if (snap) {
        toast(`Snapshot criado: ${snap.id.slice(0,8)}`, 'success');
        renderAuditSnapshots();
      }
    });
  }
  
  // Initial render
  renderDataTrustPanel();
}

// Expose for global access
window.renderDataTrustPanel = renderDataTrustPanel;
window.initDataTrustPanel = initDataTrustPanel;

// ========================================
// Fase H — Calendário de Dividendos + Export PDF
// ========================================
(function() {
  'use strict';

  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth(); // 0-11

  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  // fmt local do calendário (o fmt global do script.js não tem .cur — bug "fmt.cur is not a function")
  const fmtCur = v => (v != null && !isNaN(v)) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

  function getEarningsByDate() {
    const earnings = window.CARTEIRA_DATA?.earnings || window.MOCK_DATA?.earnings || [];
    const map = {};
    earnings.forEach(e => {
      if (!e.date) return;
      const key = e.date; // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }

  function renderCalendar() {
    const container = document.getElementById('divCalendar');
    const label = document.getElementById('calMonthLabel');
    if (!container) return;
    if (label) label.textContent = `${MONTHS[calMonth]} ${calYear}`;

    const byDate = getEarningsByDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let html = DOW.map(d => `<div class="cal-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = byDate[dateStr] || [];
      const isToday = dateStr === todayStr;
      html += `<div class="cal-day${isToday ? ' today' : ''}" aria-label="${d} de ${MONTHS[calMonth]}${events.length ? ', ' + events.length + ' provento(s)' : ''}">
        <span class="cal-day-num">${d}</span>`;
      events.slice(0, 2).forEach(e => {
        const type = (e.type || 'dividend').toLowerCase();
        const label = e.ticker || '?';
        html += `<span class="cal-event${type === 'jcp' ? ' jcp' : ''}" title="${e.ticker}: ${fmt.cur(e.gross ?? e.grossValue ?? 0)}">${label}</span>`;
      });
      if (events.length > 2) html += `<span class="cal-event">+${events.length - 2}</span>`;
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // Nav buttons
  document.addEventListener('DOMContentLoaded', () => {
    const prev = document.getElementById('calPrevBtn');
    const next = document.getElementById('calNextBtn');
    if (prev) prev.addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    });
    if (next) next.addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    });

    // Render calendar when earnings tab becomes visible
    const observer = new MutationObserver(() => {
      const panel = document.getElementById('panel-earnings');
      if (panel && !panel.hidden) renderCalendar();
    });
    const earningsTab = document.getElementById('tab-earnings');
    if (earningsTab) observer.observe(earningsTab, { attributes: true, attributeFilter: ['class'] });

    // Export PDF
    const pdfBtn = document.getElementById('exportPdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', () => {
      toast('Preparando PDF…', 'info');
      setTimeout(() => window.print(), 300);
    });
  });

  // Expose for manual render
  window.renderDivCalendar = renderCalendar;
})();