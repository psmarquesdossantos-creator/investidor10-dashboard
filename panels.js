// panels.js — Render engines para abas secundárias
// Todos os cálculos derivam de MOCK_DATA (dados reais importados); nada é inventado.
// Se um dado não existe, a tabela mostra estado vazio apropriado (UNKNOWN≠ZERO).

(function () {
  'use strict';

  // ===== helpers =====
  // Fonte de dados: __CARTEIRA_OVERRIDE (dados reais) ou MOCK_DATA interno do script.js
  function DATA() {
    if (window.__CARTEIRA_OVERRIDE) return window.__CARTEIRA_OVERRIDE;
    // fallback: script.js copia override para MOCK_DATA interno; expomos via init-carteira se disponível
    return window.CARTEIRA_DATA || { kpis: {}, positions: [], earnings: [], entries: [] };
  }
  const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = v => `${Number(v || 0) >= 0 ? '+' : ''}${fmtNum(v)}%`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]));
  const emptyRow = (cols, msg) => `<tr><td colspan="${cols}" class="empty-cell">${esc(msg)}</td></tr>`;

  function tbody(id) { return document.getElementById(id); }

  // ===== REBALANCE (meta de alocação por classe vs atual) =====
  // Meta derivada da própria carteira atual (sem inventar alvo): alvo = alocação atual arredondada a 5%.
  function renderRebalance() {
    const el = tbody('rebalanceBody');
    if (!el) return;
    const positions = DATA().positions || [];
    if (!positions.length) { el.innerHTML = emptyRow(4, 'Sem posições para rebalancear.'); return; }

    // alocação atual por classe (% do total)
    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    const byClass = {};
    positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });

    // alvo: arredondar para múltiplos de 5% normalizados a 100%
    const classes = Object.keys(byClass);
    let rawTargets = classes.map(c => ({ c, pct: byClass[c] / total * 100 }));
    const rounded = rawTargets.map(r => ({ ...r, target: Math.round(r.pct / 5) * 5 }));
    const sumT = rounded.reduce((s, r) => s + r.target, 0);
    // ajustar deriva no maior para fechar 100
    if (sumT !== 100 && rounded.length) {
      const biggest = rounded.reduce((a, b) => (b.pct > a.pct ? b : a));
      biggest.target += (100 - sumT);
    }

    el.innerHTML = rounded.map(r => {
      const currentPct = r.pct;
      const targetPct = r.target;
      const drift = currentPct - targetPct;
      const driftValue = total * (drift / 100);
      const label = ({ stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Cripto', bdr: 'BDRs', other: 'Outros' })[r.c] || r.c;
      return `<tr>
        <td><span class="asset-class ${r.c}">${esc(label)}</span></td>
        <td class="text-right">${fmtNum(currentPct)}%</td>
        <td class="text-right">${fmtNum(targetPct)}%</td>
        <td class="text-right pct-cell ${drift >= 0.5 ? 'positive' : drift <= -0.5 ? 'negative' : ''}">${fmtPct(drift)}</td>
        <td class="text-right ${drift >= 0 ? 'positive' : 'negative'}">${fmtBRL(driftValue)}</td>
      </tr>`;
    }).join('');
  }

  // ===== RENDA FIXA (posições classe fixed; agrupamento por indexador se disponível) =====
  function renderFixedIncome() {
    const el = tbody('fixedBody');
    if (!el) return;
    const fixed = (DATA().positions || []).filter(p => p.class === 'fixed');
    if (!fixed.length) { el.innerHTML = emptyRow(5, 'Nenhum título de renda fixa na carteira.'); return; }

    el.innerHTML = fixed.map(p => {
      const invested = (p.avgPrice || 0) * (p.qty || 0);
      return `<tr>
        <td><div class="asset-cell"><span class="asset-ticker">${esc(p.ticker)}</span><span class="asset-name">${esc(p.name || '')}</span></div></td>
        <td>—</td>
        <td class="text-right">${fmtBRL(invested)}</td>
        <td class="text-right">${fmtBRL(p.value)}</td>
        <td class="text-right pct-cell ${p.return >= 0 ? 'positive' : 'negative'}">${fmtPct(p.return)}</td>
      </tr>`;
    }).join('');
  }

  // ===== BENCHMARKS (comparativo: carteira vs CDI/IBOV acumulados das séries reais) =====
  function renderBenchmarks() {
    const el = tbody('benchBody');
    if (!el) return;
    const k = DATA().kpis;
    const pat = DATA().patrimony;
    if (!pat || !Array.isArray(pat.cdi) || !Array.isArray(pat.portfolio)) {
      el.innerHTML = emptyRow(4, 'Sem séries históricas de benchmark nos dados.');
      return;
    }
    // rentabilidade acumulada da série (primeiro valor > 0 → último) — dados reais
    const acc = arr => {
      if (!arr || arr.length < 2) return null;
      const first = arr.find(v => v != null && Number.isFinite(v) && v > 0);
      const last = arr[arr.length - 1];
      if (first == null || !Number.isFinite(last) || last <= 0) return null;
      return (last / first - 1) * 100;
    };
    const rows = [
      { name: 'Carteira', series: acc(pat.portfolio), own: true },
      { name: 'CDI', series: acc(pat.cdi) },
      { name: 'IBOVESPA', series: acc(pat.ibov) },
    ].map(r => {
      const v = r.series;
      const portfolio = acc(pat.portfolio);
      const diff = (!r.own && v != null && portfolio != null) ? portfolio - v : null;
      return `<tr>
        <td>${esc(r.name)}</td>
        <td class="text-right">${v != null ? fmtNum(v) + '%' : '—'}</td>
        <td class="text-right pct-cell ${diff == null ? '' : diff >= 0 ? 'positive' : 'negative'}">${diff == null ? '—' : fmtPct(diff) + 'pp'}</td>
      </tr>`;
    });
    el.innerHTML = rows.join('');
  }

  // ===== IMPOSTOS (DARF estimado sobre proventos com IR retido) =====
  function renderTax() {
    const el = tbody('darfBody');
    if (!el) return;
    const earnings = DATA().earnings || [];
    if (!earnings.length) { el.innerHTML = emptyRow(4, 'Sem proventos para calcular impostos.'); return; }

    // Agrupa IR por ano a partir de earnings reais (campos: date, gross, tax, net)
    const byYear = {};
    earnings.forEach(e => {
      const year = String(e.date || '').slice(0, 4);
      if (!year || year.length !== 4) return;
      if (!byYear[year]) byYear[year] = { gross: 0, ir: 0, count: 0 };
      byYear[year].gross += (e.gross ?? 0) * 1;
      byYear[year].ir += (e.tax ?? 0) * 1;
      byYear[year].count++;
    });
    const years = Object.keys(byYear).sort().reverse();
    if (!years.length) { el.innerHTML = emptyRow(4, 'Sem proventos com data válida.'); return; }

    el.innerHTML = years.map(y => {
      const d = byYear[y];
      return `<tr>
        <td>${esc(y)}</td>
        <td class="text-right">${d.count}</td>
        <td class="text-right">${fmtBRL(d.gross)}</td>
        <td class="text-right pct-cell ${d.ir > 0 ? 'negative' : ''}">${fmtBRL(d.ir)}</td>
      </tr>`;
    }).join('');

    // GCAP summary se existir elemento
    const gcap = tbody('gcapBody');
    if (gcap) {
      const positions = DATA().positions || [];
      const gains = positions.filter(p => (p.pl || 0) > 0);
      gcap.innerHTML = gains.length ? gains.map(p => `<tr>
        <td>${esc(p.ticker)}</td>
        <td class="text-right">${fmtBRL(p.pl)}</td>
        <td class="text-right pct-cell negative">${fmtBRL(Math.max(0, p.pl * 0.15))}</td>
      </tr>`).join('') : emptyRow(3, 'Nenhum ganho de capital não realizado.');
    }
  }

  // ===== EVENTOS CORPORATIVOS (próximos proventos anunciados com data futura) =====
  function renderCorporateEvents() {
    const el = tbody('corpEventsLogBody');
    if (!el) return;
    const earnings = DATA().earnings || [];
    const today = new Date().toISOString().slice(0, 10);
    // eventos futuros: proventos com data >= hoje (campos reais: perShare, gross)
    const upcoming = earnings
      .filter(e => (e.date || '') >= today)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 20);
    if (!upcoming.length) {
      el.innerHTML = emptyRow(5, 'Nenhum evento futuro nos dados. Importe proventos com datas futuras para projetar renda.');
      return;
    }

    el.innerHTML = upcoming.map(e => {
      const label = ({ dividend: 'Dividendo', jcp: 'JCP', amortization: 'Amortização', interest: 'Juros', rendimento: 'Rendimento FII' })[e.type] || e.type;
      return `<tr>
        <td>${esc(e.date)}</td>
        <td><span class="asset-ticker">${esc(e.ticker)}</span></td>
        <td><span class="asset-class">${esc(label)}</span></td>
        <td class="text-right">${fmtNum(e.perShare ?? 0, 4)}</td>
        <td class="text-right">${fmtBRL(e.gross ?? 0)}</td>
      </tr>`;
    }).join('');
  }

  // ===== DATA TRUST (confiança por ativo: completude dos campos) =====
  function renderDataTrust() {
    const el = tbody('dataTrustBody');
    if (!el) return;
    const positions = DATA().positions || [];
    if (!positions.length) { el.innerHTML = emptyRow(4, 'Sem ativos para auditar.'); return; }

    // score de completude por ativo: campos essenciais preenchidos?
    const rows = positions.map(p => {
      const fields = [p.ticker, p.name, p.qty != null, p.avgPrice != null, p.currentPrice != null, p.value != null, p.return != null];
      const filled = fields.filter(Boolean).length;
      const score = Math.round(filled / fields.length * 100);
      const level = score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low';
      const missing = [];
      if (!p.name) missing.push('nome');
      if (p.qty == null) missing.push('qtd');
      if (p.avgPrice == null) missing.push('preço médio');
      if (p.currentPrice == null) missing.push('preço atual');
      return { p, score, level, missing };
    });

    el.innerHTML = rows.map(r => `<tr>
      <td><span class="asset-ticker">${esc(r.p.ticker)}</span></td>
      <td><span class="asset-class ${r.level === 'high' ? 'fiis' : r.level === 'medium' ? 'etfs' : 'bdr'}">${r.score}%</span></td>
      <td>${r.missing.length ? esc('Falta: ' + r.missing.join(', ')) : 'Completo'}</td>
      <td class="text-right">${fmtBRL(r.p.value)}</td>
    </tr>`).join('');

    // Resumo de confiança da carteira
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
    const summaryEl = document.getElementById('portfolioConfidenceSummary');
    if (summaryEl) {
      summaryEl.textContent = `Confiança média da carteira: ${avg}% (${rows.filter(r => r.score >= 90).length} completos, ${rows.filter(r => r.score < 70).length} incompletos)`;
    }
  }

  // ===== DATA TRUST — snapshots de auditoria (histórico real do localStorage) =====
  function renderAuditSnapshots() {
    const el = tbody('auditSnapshotsBody');
    if (!el) return;
    let snaps = [];
    try { snaps = JSON.parse(localStorage.getItem('investidor10:snapshots') || '[]'); } catch { snaps = []; }
    if (!snaps.length) { el.innerHTML = emptyRow(4, 'Nenhum snapshot registrado. Gere um backup para criar o primeiro.'); return; }
    el.innerHTML = snaps.slice(-10).reverse().map(s => `<tr>
      <td>${esc(s.timestamp || '—')}</td>
      <td>${esc(s.assets ?? '—')}</td>
      <td><code>${esc(String(s.hash || '').slice(0, 16))}…</code></td>
      <td><span class="asset-class ${s.status === 'valid' ? 'fiis' : 'bdr'}">${esc(s.status || 'valid')}</span></td>
    </tr>`).join('');
  }

  // ===== DATA TRUST — freshness (idade dos dados por fonte) =====
  function renderDataFreshness() {
    const el = tbody('dataFreshnessBody');
    if (!el) return;
    const positions = DATA().positions || [];
    const earnings = DATA().earnings || [];
    const today = new Date().toISOString().slice(0, 10);
    const daysAgo = d => { if (!d) return null; const diff = Math.floor((new Date(today) - new Date(d)) / 86400000); return Number.isFinite(diff) ? diff : null; };

    // Fontes: cotações (posição atual), proventos, transações
    const lastEarning = earnings.map(e => e.date).filter(Boolean).sort().pop();
    const rows = [
      { src: 'Posições (cotações)', n: positions.length, age: daysAgo(DATA().meta?.priceDate) },
      { src: 'Proventos', n: earnings.length, age: daysAgo(lastEarning) },
    ].map(r => {
      const level = r.age == null ? 'desconhecido' : r.age <= 7 ? 'fresco' : r.age <= 90 ? 'aceitável' : 'antigo';
      return `<tr>
        <td>${esc(r.src)}</td>
        <td class="text-right">${r.n}</td>
        <td>${r.age == null ? '—' : r.age + ' dias'}</td>
        <td><span class="asset-class ${level === 'fresco' ? 'fiis' : level === 'aceitável' ? 'etfs' : 'bdr'}">${level}</span></td>
      </tr>`;
    });
    el.innerHTML = rows.join('');
  }

  // ===== BACKUP PORTABILITY (histórico de migrações; apenas registro local) =====
  function renderBackupHistory() {
    const el = tbody('migrationLogBody');
    if (!el) return;
    // Histórico real: eventos de import registrados no localStorage
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('investidor10:importHistory') || '[]');
    } catch { history = []; }
    if (!history.length) { el.innerHTML = emptyRow(5, 'Nenhuma importação registrada ainda.'); return; }

    el.innerHTML = history.slice(-10).reverse().map(h => `<tr>
      <td>${esc(h.timestamp || '—')}</td>
      <td>${esc(h.fromVersion || '—')}</td>
      <td>${esc(h.toVersion || '14.0.0')}</td>
      <td><span class="asset-class ${h.status === 'ok' || h.status === 'success' ? 'fiis' : 'bdr'}">${esc(h.status || 'ok')}</span></td>
      <td>${esc(h.details || '')}</td>
    </tr>`).join('');
  }

  // ===== Freshness label dinâmico (substitui "há 2 minutos" hardcoded) =====
  function updateFreshnessLabel() {
    const label = document.getElementById('dataFreshnessLabel');
    if (!label) return;
    const earnings = DATA().earnings || [];
    const lastDate = earnings.map(e => e.date).filter(Boolean).sort().pop();
    if (lastDate) {
      const d = new Date(lastDate + 'T12:00:00');
      const formatted = d.toLocaleDateString('pt-BR');
      const days = Math.floor((Date.now() - d.getTime()) / 86400000);
      const age = days <= 1 ? 'hoje' : days < 30 ? `há ${days} dias` : `há ${Math.floor(days / 30)} ${days < 60 ? 'mês' : 'meses'}`;
      label.textContent = `Carteira consolidada • último provento em ${formatted} (${age})`;
    }
  }

  // ===== FASE 15: Alertas de auditoria (DataTrustEngine) =====
  function renderDataTrustAlerts() {
    const summaryEl = document.getElementById('dataTrustAlertsSummary');
    const listEl = document.getElementById('dataTrustAlertsList');
    if (!summaryEl || !listEl) return;
    if (!window.DataTrustEngine) {
      listEl.innerHTML = '<p class="text-muted">Engine de auditoria não carregado.</p>';
      return;
    }
    const result = window.DataTrustEngine.runFullAudit();
    const Sev = window.DataTrustEngine.SEVERITY;
    const { stats, alerts } = result;
    const order = ['critical', 'warning', 'info'];
    summaryEl.innerHTML = order.map(s => `
      <div style="padding:var(--space-3);border:1px solid ${Sev[s].border};background:${Sev[s].bg};border-radius:var(--radius-md);text-align:center;">
        <div style="font-size:var(--font-size-2xl);font-weight:700;color:${Sev[s].color};">${stats[s] || 0}</div>
        <div style="font-size:var(--font-size-sm);color:${Sev[s].color};">${Sev[s].icon} ${Sev[s].label}</div>
      </div>`).join('');
    if (!alerts.length) {
      listEl.innerHTML = '<p class="text-muted" style="padding:var(--space-4);text-align:center;">✅ Nenhum problema de qualidade detectado.</p>';
      return;
    }
    const sorted = [...alerts].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    listEl.innerHTML = sorted.map(a => `
      <div style="display:flex;gap:var(--space-3);padding:var(--space-3);border-bottom:1px solid var(--color-border);align-items:flex-start;">
        <span style="color:${Sev[a.severity].color};font-size:var(--font-size-lg);line-height:1;">${Sev[a.severity].icon}</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:var(--font-size-sm);">${esc(a.message)}</div>
          ${a.detail ? `<div class="text-muted" style="font-size:var(--font-size-xs);margin-top:2px;">${esc(a.detail)}</div>` : ''}
          <div style="font-size:var(--font-size-xs);color:var(--color-muted-foreground);margin-top:2px;">
            <span class="asset-class" style="font-size:10px;padding:1px 6px;">${esc(a.area)}</span>
            <span style="color:${Sev[a.severity].color};font-weight:600;margin-left:6px;">${Sev[a.severity].label}</span>
          </div>
        </div>
      </div>`).join('');
  }

  // ===== FASE 17: Lazy init das abas + Web Worker Monte Carlo =====
    const renderedTabs = new Set();
    const LAZY_TABS = new Set([
      'rebalance', 'fixed', 'benchmarks', 'tax', 'corporate-events',
      'data-trust', 'backup-portability', 'risk', 'montecarlo', 'import', 'backup'
    ]);

    function maybeRenderLazy(tabName) {
      if (!LAZY_TABS.has(tabName) || renderedTabs.has(tabName)) return;
      renderedTabs.add(tabName);
      try {
        if (tabName === 'rebalance') renderRebalance();
        else if (tabName === 'fixed') renderFixedIncome();
        else if (tabName === 'benchmarks') renderBenchmarks();
        else if (tabName === 'tax') renderTax();
        else if (tabName === 'corporate-events') renderCorporateEvents();
        else if (tabName === 'data-trust') { renderDataTrust(); renderDataTrustAlerts(); }
        else if (tabName === 'backup-portability') renderBackupHistory();
      } catch (e) {
        console.warn('lazy render failed:', tabName, e);
        renderedTabs.delete(tabName);
      }
    }

    // Hook: renderizar quando a aba correspondente abre (via switchTab original)
    const origSwitchTab = window.switchTab;
    window.switchTab = function (tabName) {
      const r = origSwitchTab.call(this, tabName);
      maybeRenderLazy(tabName);
      return r;
    };

    // Auto-init: só renderiza abas críticas no boot
    function boot() {
      // Abas críticas: summary, patrimony, returns, positions, earnings, entries
      // (switchTab já foi chamado pelo script.js para a aba ativa)
      updateFreshnessLabel();
      // Pré-renderizar a aba ativa se for lazy
      const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
      if (activeTab) maybeRenderLazy(activeTab);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      setTimeout(boot, 100);
    }

    // Expor para uso global
    window.renderAllPanels = function() {
      LAZY_TABS.forEach(t => maybeRenderLazy(t));
    };
})();
