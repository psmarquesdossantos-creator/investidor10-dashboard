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
    console.log('renderFixedIncome called');
    const el = tbody('fixedBody');
    if (!el) {
      console.log('renderFixedIncome: fixedBody element not found');
      return;
    }
    const fixed = (DATA().positions || []).filter(p => p.class === 'fixed');
    console.log('renderFixedIncome: found', fixed.length, 'fixed positions');
    if (!fixed.length) { 
      console.log('renderFixedIncome: no fixed positions, showing empty row');
      el.innerHTML = emptyRow(5, 'Nenhum título de renda fixa na carteira.'); 
      return;
    }

    console.log('renderFixedIncome: generating rows for', fixed.length, 'positions');
    el.innerHTML = fixed.map(p => {
      const invested = (p.avgPrice || 0) * (p.qty || 0);
      return `<tr>
        <td><div class="asset-cell"><span class="asset-ticker">${esc(p.ticker)}</span><span class="asset-name">${esc(p.name || '')}</span></div></td>
        <td>—</td>
        <td class="text-right">${fmtBRL(invested)}</td>
        <td class="text-right">${fmtBRL(p.value)}</td>
        <td class="text-right pct-cell ${p.return >= 0 ? 'positive' : 'negative'}">${fmtPct(p.return)}</td>
      </tr>`
    }).join('');
    console.log('renderFixedIncome: innerHTML set, length:', el.innerHTML.length);
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
        </tr>`
      });
      el.innerHTML = rows.join('');
      // Flag para debug
      window.__benchmarksRendered = true;
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
    // Delega para a versão unificada do real-mode.js (lê DataTrust 'auditSnapshots'
    // + SnapshotManager 'investidor10-snapshots' mesclados — mesma tabela dos botões).
    if (typeof window.renderAuditSnapshots === 'function' && window.renderAuditSnapshots !== renderAuditSnapshots) {
      window.renderAuditSnapshots();
      return;
    }
    // Fallback local (mesma lógica unificada)
    const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
    const dt = readLS('auditSnapshots').map(s => ({
      when: s.timestamp, type: s.type, assets: s.metadata?.assetCount,
      total: s.metadata?.totalValue, hash: s.dataHash
    }));
    const sm = readLS('investidor10-snapshots').map(s => ({
      when: s.date, type: 'snapshot_' + (s.source || 'auto'), assets: s.data?.positions?.length,
      total: s.data?.kpis?.total, hash: s.fingerprint
    }));
    const all = [...dt, ...sm].sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
    if (!all.length) { el.innerHTML = emptyRow(6, 'Nenhum snapshot registrado. Clique em "Criar Snapshot Manual" ou "Backup Agora".'); return; }
    el.innerHTML = all.slice(0, 10).map(s => `<tr>
      <td>${esc(s.when ? new Date(s.when).toLocaleString('pt-BR') : '—')}</td>
      <td>${esc(s.type || '—')}</td>
      <td class="text-right">${s.assets ?? '—'}</td>
      <td class="text-right">${s.total != null ? fmtBRL(s.total) : '—'}</td>
      <td><code>${esc(String(s.hash || '').slice(0, 16))}</code></td>
      <td>—</td>
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

  // ===== ALERTAS INTELIGENTES (home review 2026-10-16) =====
  function renderAlertBanners() {
    const host = document.getElementById('alertBanners');
    if (!host) return;
    const d = DATA();
    const k = d.kpis || {};
    const banners = [];

    // 1. Dados desatualizados (>30 dias desde último provento ou patrimônio)
    const lastEarn = (d.earnings || []).map(e => e.date).filter(Boolean).sort().pop();
    if (lastEarn) {
      const days = Math.floor((Date.now() - new Date(lastEarn + 'T12:00:00')) / 86400000);
      if (days > 30) {
        banners.push({
          level: 'warning', icon: '⏳',
          title: `Dados desatualizados há ${days} dias`,
          desc: 'Último provento importado está defasado. Importe dados atualizados na aba Importar.',
          link: '#import', linkText: 'Importar dados'
        });
      }
    }

    // 2. Proventos parciais (earnings[] < total esperado)
    const earningsLen = (d.earnings || []).length;
    if (earningsLen > 0 && earningsLen < 50) {
      banners.push({
        level: 'info', icon: '⚠️',
        title: 'Histórico de proventos incompleto',
        desc: `Amostra parcial (${earningsLen} proventos). Os totais de renda podem estar subestimados.`,
        link: '#earnings', linkText: 'Ver proventos'
      });
    }

    // 3. Concentração elevada (>30% em um ativo)
    const positions = d.positions || [];
    const total = positions.reduce((s, p) => s + (p.value || 0), 0) || 1;
    const maxPct = Math.max(...positions.map(p => ((p.value || 0) / total) * 100), 0);
    if (maxPct > 30) {
      const top = positions.find(p => ((p.value || 0) / total) * 100 === maxPct);
      banners.push({
        level: 'warning', icon: '📊',
        title: `Concentração elevada: ${top?.ticker || '—'} ${maxPct.toFixed(1)}%`,
        desc: 'Ativo representa mais de 30% do patrimônio. Considere diversificar.',
        link: '#positions', linkText: 'Ver posições'
      });
    }

    // 4. Incomplete: return12m null (UNKNOWN ≠ ZERO)
    if (k.return12m == null && k.total > 0) {
      banners.push({
        level: 'info', icon: '❓',
        title: 'Retorno 12M indisponível',
        desc: 'Histórico insuficiente para calcular retorno de 12 meses. Importe snapshots diários.',
        link: '#import', linkText: 'Importar dados'
      });
    }

    const levelClass = { warning: 'alert-banner--warning', danger: 'alert-banner--danger', info: 'alert-banner--info', success: 'alert-banner--success' };
    host.innerHTML = banners.map(b => `
      <div class="alert-banner ${levelClass[b.level] || 'alert-banner--info'}">
        <span class="alert-icon" aria-hidden="true">${b.icon}</span>
        <div class="alert-body">
          <p class="alert-title">${esc(b.title)}</p>
          <p class="alert-desc">${esc(b.desc)}</p>
          <a class="alert-link" href="${b.link}">${esc(b.linkText)}</a>
        </div>
      </div>`).join('');
  }

  // ===== ALERTAS E INSIGHTS (modelo Tela Principal de referência) =====
  function renderInsights() {
    const host = document.getElementById('insightsList');
    if (!host) return;
    const d = DATA();
    const k = d.kpis || {};
    const meta = window.CARTEIRA_META || {};
    const today = new Date().toISOString().slice(0, 10);

    const insights = [];

    // 1. Carteira atualizada (freshness real do último provento)
    const lastEarn = (d.earnings || []).map(e => e.date).filter(Boolean).sort().pop();
    if (lastEarn) {
      const days = Math.floor((Date.now() - new Date(lastEarn + 'T12:00:00')) / 86400000);
      insights.push({
        icon: '✅', title: 'Carteira consolidada',
        text: `Último provento importado em ${new Date(lastEarn + 'T12:00:00').toLocaleDateString('pt-BR')}${days > 0 ? ` (há ${days} dias)` : ' (hoje)'}.`
      });
    }

    // 2. Dividendos a receber (eventos com data futura — sem inventar)
    const upcoming = (d.earnings || []).filter(e => (e.date || '') > today);
    if (upcoming.length > 0) {
      const in30d = upcoming.filter(e => e.date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      insights.push({
        icon: '📅', title: 'Dividendos a receber',
        text: `Você tem ${upcoming.length} provento(s) com data futura${in30d.length ? `, ${in30d.length} nos próximos 30 dias` : ''}.`
      });
    } else {
      insights.push({
        icon: '📅', title: 'Proventos futuros',
        text: 'Nenhum provento futuro importado. Importe eventos com data futura na aba Importar para projetar renda.'
      });
    }

    // 3. Rentabilidade vs CDI (12M, da série real)
    const pat = d.patrimony || {};
    const cdiSeries = (pat.cdi || []).filter(v => Number.isFinite(v) && v > 0);
    const cdi12 = cdiSeries.length >= 13 ? (cdiSeries[cdiSeries.length - 1] / cdiSeries[cdiSeries.length - 13] - 1) * 100 : null;
    const ret12 = k.return12m;
    if (ret12 != null && cdi12 != null) {
      const diff = ret12 - cdi12;
      insights.push({
        icon: diff >= 0 ? '📈' : '📉', title: diff >= 0 ? 'Rentabilidade acima do CDI' : 'Rentabilidade abaixo do CDI',
        text: `Carteira ${fmtNum(ret12)}% vs. CDI ${fmtNum(cdi12)}% nos últimos 12 meses (${diff >= 0 ? '+' : ''}${fmtNum(diff)}pp).`
      });
    }

    // 4. Meta de patrimônio (real: CARTEIRA_META.goals.patrimonioTarget)
    const goals = meta.goals || {};
    const target = goals.patrimonioTarget;
    if (target && k.total) {
      const pct = Math.min(100, k.total / target * 100);
      const falta = Math.max(0, target - k.total);
      insights.push({
        icon: '🎯', title: 'Meta de patrimônio',
        text: `${fmtNum(pct)}% da meta de ${fmtBRL(target)} atingida${falta > 0 ? ` — faltam ${fmtBRL(falta)}` : ' — meta conquistada!'}`
      });
    }

    // 5. Meta de proventos mensais (real: CARTEIRA_META.goals.proventosMonthly / divGoal)
    const divMeta = goals.proventosMonthly || meta.divGoal;
    const mediaMensal = k.earnings12m != null ? k.earnings12m / 12 : null;
    if (divMeta && mediaMensal != null) {
      const pct = mediaMensal / divMeta * 100;
      insights.push({
        icon: pct >= 100 ? '🏆' : '💰', title: 'Meta de renda mensal',
        text: `${fmtNum(pct)}% da meta de ${fmtBRL(divMeta)}/mês (média atual: ${fmtBRL(mediaMensal)}/mês).`
      });
    }

    host.innerHTML = insights.slice(0, 6).map(i => `
      <div class="flex-3-card">
        <span class="icon-lg" aria-hidden="true">${i.icon}</span>
        <div>
          <div class="fw-600-13">${esc(i.title)}</div>
          <div class="text-muted fs-12-mt-2">${esc(i.text)}</div>
        </div>
      </div>`).join('') || '<p class="text-muted p-3">Sem insights no momento.</p>';
  }

  // ===== RESUMO POR CLASSE (modelo Investidor10: % na carteira / % ideal) =====
  function renderClassSummaryCards() {
    const host = document.getElementById('classSummaryCards');
    if (!host) return;
    const positions = DATA().positions || [];
    if (!positions.length) { host.innerHTML = '<p class="text-muted p-3">Sem posições.</p>'; return; }

    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    const labels = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Criptos', bdr: 'BDRs', other: 'Outros', funds: 'Fundos' };

    const byClass = {};
    positions.forEach(p => {
      const c = p.class || 'other';
      if (!byClass[c]) byClass[c] = { count: 0, value: 0, pl: 0 };
      byClass[c].count++;
      byClass[c].value += (p.value || 0);
      byClass[c].pl += (p.pl || 0);
    });

    // % ideal = alocação atual arredondada a 5% (mesma meta do Rebalance), fechando 100%
    const keys = Object.keys(byClass);
    let raw = keys.map(c => ({ c, pct: total > 0 ? byClass[c].value / total * 100 : 0 }));
    const rounded = raw.map(r => ({ ...r, ideal: Math.round(r.pct / 5) * 5 }));
    const sumIdeal = rounded.reduce((s, r) => s + r.ideal, 0);
    if (sumIdeal !== 100 && rounded.length) {
      const biggest = rounded.reduce((a, b) => (b.pct > a.pct ? b : a));
      biggest.ideal += (100 - sumIdeal);
    }

    host.innerHTML = rounded.map(r => {
      const d = byClass[r.c];
      const label = labels[r.c] || r.c;
      const retPct = d.value > 0 ? (d.pl / (d.value - d.pl)) * 100 : null; // PL / custo
      return `<div class="stat-block">
        <div class="fw-700-sm mb-2">${esc(label)}</div>
        <div class="fs-12-muted">Ativos: <strong>${d.count}</strong></div>
        <div class="fs-12-muted">Valor: <strong>${fmtBRL(d.value)}</strong></div>
        ${retPct != null && Number.isFinite(retPct) ? `<div class="fs-12-muted">Rentab.: <strong class="${retPct >= 0 ? 'positive' : 'negative'}">${fmtPct(retPct)}</strong></div>` : ''}
        <div class="fs-12-mt-1-muted">
          ${fmtNum(r.pct, 0)}% na carteira <span class="opacity-60">/</span> <strong class="text-primary-ink">${r.ideal}% ideal</strong>
        </div>
      </div>`;
    }).join('');
  }

  // ===== FASE AUDIT: Risk metrics — calculados da série REAL do patrimônio =====
  // Nenhum dado é inventado: usa apenas MOCK_DATA.patrimony.portfolio (13 pontos mensais reais).
  // Amostra pequena → nota de transparência exibida ao usuário.
  function renderRiskMetrics() {
    const kpiEl = document.getElementById('riskKpis');
    if (!kpiEl) return;
    const pat = DATA().patrimony;
    if (!pat || !Array.isArray(pat.portfolio) || pat.portfolio.length < 3) {
      kpiEl.innerHTML = '<p class="text-muted">Série de patrimônio insuficiente para análise de risco.</p>';
      return;
    }

    // Retornos mensais reais: apenas a partir do primeiro valor > 0 (carteira vazia = sem retorno)
    const series = pat.portfolio.filter(v => Number.isFinite(v) && v > 0);
    const rets = [];
    for (let i = 1; i < series.length; i++) {
      if (series[i - 1] > 0) rets.push((series[i] - series[i - 1]) / series[i - 1]);
    }
    if (rets.length < 2) {
      kpiEl.innerHTML = '<p class="text-muted">Histórico insuficiente (mínimo 3 meses com patrimônio > 0).</p>';
      return;
    }

    // Estatísticas dos retornos reais
    const n = rets.length;
    const mean = rets.reduce((s, r) => s + r, 0) / n;
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1 || 1);
    const std = Math.sqrt(variance);
    const volAnual = std * Math.sqrt(12);

    // VaR 95% histórico: 5º percentil empírico dos retornos
    const sorted = [...rets].sort((a, b) => a - b);
    const var95 = sorted[Math.max(0, Math.floor(n * 0.05))];

    // Max Drawdown real (série completa não-nula)
    let peak = series[0], maxDD = 0;
    for (const v of series) { if (v > peak) peak = v; const dd = (v - peak) / peak; if (dd < maxDD) maxDD = dd; }

    // CDI mensal real como proxy de risk-free (mesma janela)
    const cdiSeries = (pat.cdi || []).filter(v => Number.isFinite(v) && v > 0);
    const cdiRets = [];
    for (let i = 1; i < cdiSeries.length; i++) cdiRets.push((cdiSeries[i] - cdiSeries[i - 1]) / cdiSeries[i - 1]);
    const cdiMean = cdiRets.length ? cdiRets.reduce((s, r) => s + r, 0) / cdiRets.length : 0.009; // ~CDI mensal

    // Sharpe e Sortino (excesso sobre CDI)
    const excess = rets.map(r => r - cdiMean);
    const exMean = excess.reduce((s, r) => s + r, 0) / n;
    const sharpe = std > 0 ? (exMean / std) * Math.sqrt(12) : null;
    const downside = excess.filter(r => r < 0);
    const downStd = downside.length ? Math.sqrt(downside.reduce((s, r) => s + r * r, 0) / downside.length) : null;
    const sortino = downStd && downStd > 0 ? (exMean / downStd) * Math.sqrt(12) : null;

    const pct = v => (v * 100).toFixed(2) + '%';
    const kpi = (label, value, cls = '') => `<div class="kpi-card"><span class="kpi-label">${label}</span><span class="kpi-value ${cls}">${value}</span></div>`;

    kpiEl.innerHTML =
      kpi('Vol. Anualizada', pct(volAnual), volAnual > 0.20 ? 'text-error' : 'text-success') +
      kpi('VaR 95% (mensal)', pct(var95), 'text-error') +
      kpi('Max Drawdown', pct(maxDD), 'text-error') +
      kpi('Sharpe Ratio', sharpe != null ? sharpe.toFixed(2) : '—', sharpe != null && sharpe >= 1 ? 'text-success' : 'text-warning') +
      kpi('Sortino Ratio', sortino != null ? sortino.toFixed(2) : '—', sortino != null && sortino >= 1 ? 'text-success' : 'text-warning') +
      kpi('Meses de histórico', String(n), '') +
      `<p class="text-muted grid-1/-1-fs-12-m0">Base: ${n} retornos mensais reais da série do patrimônio (amostra limitada — importe snapshots diários para métricas mais robustas).</p>`;

    // Correlação por ativo: requer histórico de preços por ativo — sem inventar dados
    const corrEl = document.getElementById('correlationMatrix');
    if (corrEl) {
      corrEl.innerHTML = '<p class="text-muted p-4">Correlação por ativo requer histórico de preços por ativo (ainda não importado). Importe cotações por ativo para habilitar a matriz de correlação real.</p>';
    }

    // Rolling chart: 13 pontos mensais são insuficientes para janela de 63 dias
    const rollCard = document.getElementById('rollingChart')?.closest('.card');
    if (rollCard && !document.getElementById('rollingChartPlaceholder')) {
      const note = document.createElement('p');
      note.id = 'rollingChartPlaceholder';
      note.className = 'text-muted';
      note.style.cssText = 'padding:var(--space-4)';
      note.textContent = 'Rolling metrics exigem histórico diário (janela de 63 dias). A série atual é mensal — gere snapshots diários para habilitar.';
      rollCard.appendChild(note);
    }
  }

  // ===== FASE AUDIT: Resumo mensal do patrimônio (aba Patrimônio) =====
  function renderPatrimonySummaryTable() {
    const host = document.getElementById('patrimonySummaryTable');
    if (!host) return;
    const pat = DATA().patrimony;
    if (!pat || !Array.isArray(pat.portfolio)) { host.innerHTML = '<p class="text-muted">Sem série de patrimônio.</p>'; return; }
    const investedSeries = pat.invested || [];
    const rowsHtml = pat.labels.map((label, i) => {
      const v = pat.portfolio[i];
      const inv = investedSeries[i];
      const gain = (v != null && inv != null) ? v - inv : null;
      const prev = i > 0 ? pat.portfolio[i - 1] : null;
      const change = prev != null && prev > 0 && v != null && v > 0 ? (v - prev) / prev * 100 : null;
      return `<tr>
        <td>${esc(label)}</td>
        <td class="text-right">${inv > 0 ? fmtBRL(inv) : '—'}</td>
        <td class="text-right ${gain == null ? '' : gain >= 0 ? 'positive' : 'negative'}">${gain != null ? fmtBRL(gain) : '—'}</td>
        <td class="text-right">${v > 0 ? fmtBRL(v) : '—'}</td>
        <td class="text-right pct-cell ${diff == null ? '' : diff >= 0 ? 'positive' : 'negative'}">${diff == null ? '—' : fmtPct(diff) + 'pp'}</td>
      </tr>`
    }).join('');
    host.innerHTML = `<div class="table-wrapper"><table class="data-table">
      <thead><tr><th scope="col">Período</th><th scope="col">Valor aplicado</th><th scope="col">Ganho de Capital</th><th scope="col">Patrimônio</th><th scope="col">Var. mês</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table></div>`;
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
      <div class="p-3 sev-card" data-border="${Sev[s].border}" data-bg="${Sev[s].bg}">
        <div class="fs-2xl-700 dyn-color" data-color="${Sev[s].color}">${stats[s] || 0}</div>
        <div class="text-sm dyn-color" data-color="${Sev[s].color}">${Sev[s].icon} ${Sev[s].label}</div>
      </div>`).join('');
    if (!alerts.length) {
      listEl.innerHTML = '<p class="text-muted p-4-center">✅ Nenhum problema de qualidade detectado.</p>';
      return;
    }
    const sorted = [...alerts].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    listEl.innerHTML = sorted.map(a => `
      <div class="flex-3-card-border-bottom">
        <span class="dyn-color" data-color="${Sev[a.severity].color}" class="icon-md">${Sev[a.severity].icon}</span>
        <div class="flex-1">
          <div class="fw-600-sm">${esc(a.message)}</div>
          ${a.detail ? `<div class="text-muted fs-xs-mt-2">${esc(a.detail)}</div>` : ''}
          <div class="fs-xs-mt-2-muted">
            <span class="asset-class fs-10-p1">${esc(a.area)}</span>
            <span class="dyn-color fw-600" data-color="${Sev[a.severity].color}">${Sev[a.severity].label}</span>
          </div>
        </div>
      </div>`).join('');
  }

  // ===== RENTABILIDADE POR CLASSE (modelo investidor10 5/6) =====
  function renderClassReturns() {
    const el = tbody('classReturnBody');
    if (!el) return;
    const positions = DATA().positions || [];
    if (!positions.length) { el.innerHTML = emptyRow(7, 'Sem posições.'); return; }

    const labels = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Criptos', bdr: 'BDRs', other: 'Outros', funds: 'Fundos' };
    const byClass = {};
    const totalValue = positions.reduce((s, p) => s + (p.value || 0), 0) || 1;
    positions.forEach(p => {
      const c = p.class || 'other';
      if (!byClass[c]) byClass[c] = { count: 0, cost: 0, value: 0, pl: 0 };
      byClass[c].count++;
      byClass[c].value += (p.value || 0);
      byClass[c].pl += (p.pl || 0);
      // custo = valor - PL (custo real por ativo)
      byClass[c].cost += ((p.value || 0) - (p.pl || 0));
    });

    const rows = Object.entries(byClass).sort((a, b) => b[1].value - a[1].value).map(([c, d]) => {
      const rentab = d.cost > 0 ? d.pl / d.cost * 100 : null;
      const pct = d.value / totalValue * 100;
      return `<tr>
        <td><span class="asset-class ${c}">${esc(labels[c] || c)}</span></td>
        <td class="text-right">${d.count}</td>
        <td class="text-right">${fmtBRL(d.cost)}</td>
        <td class="text-right">${fmtBRL(d.value)}</td>
        <td class="text-right ${d.pl >= 0 ? 'positive' : 'negative'}">${fmtBRL(d.pl)}</td>
        <td class="text-right pct-cell ${rentab == null ? '' : rentab >= 0 ? 'positive' : 'negative'}">${rentab != null ? fmtPct(rentab) : '—'}</td>
        <td class="text-right">${fmtNum(pct)}%</td>
      </tr>`;
    }).join('');
    el.innerHTML = rows;
  }

  // ===== APORTES (modelo Tela de aportes e ativos) =====
  function renderAportes() {
    const strip = document.getElementById('aportesKpiStrip');
    const canvas = document.getElementById('aportesChart');
    if (!strip) return;
    const entries = DATA().entries || [];
    const buys = entries.filter(e => e.type === 'buy');
    if (!buys.length) {
      strip.innerHTML = '<p class="text-muted grid-1/-1-p3">Nenhum aporte (compra) registrado.</p>';
      return;
    }

    const val = e => Number(e.value) || (Number(e.qty) * Number(e.price)) || 0;
    const byMonth = {};
    buys.forEach(e => {
      const key = String(e.date || '').slice(0, 7);
      if (key.length === 7) byMonth[key] = (byMonth[key] || 0) + val(e);
    });
    const months = Object.keys(byMonth).sort();
    const totalAportado = months.reduce((s, m) => s + byMonth[m], 0);
    const mediaMensal = months.length ? totalAportado / months.length : 0;
    const maiorAporte = buys.reduce((mx, e) => Math.max(mx, val(e)), 0);

    const kpi = (label, value, sub, cls = '') => `<div class="stat-block">
      <div class="fs-11-caps">${label}</div>
      <div class="${cls} fs-lg-700-mt">${value}</div>
      ${sub ? `<div class="fs-11-muted">${sub}</div>` : ''}
    </div>`;

    strip.innerHTML =
      kpi('Total aportado', fmtBRL(totalAportado), `${buys.length} aportes`) +
      kpi('Média mensal', fmtBRL(mediaMensal), `${months.length} meses com aportes`) +
      kpi('Maior aporte', fmtBRL(maiorAporte), 'Operação única') +
      kpi('Meses com aportes', String(months.length), months.length ? `${months[0]} → ${months[months.length - 1]}` : '');

    // Bar chart: aportes por mês
    if (canvas && window.Chart) {
      const existing = window.Chart.getChart(canvas);
      if (existing) existing.destroy();
      new window.Chart(canvas, {
        type: 'bar',
        data: {
          labels: months.map(m => m.slice(5) + '/' + m.slice(2, 4)),
          datasets: [{
            label: 'Aportes',
            data: months.map(m => byMonth[m]),
            backgroundColor: 'rgba(26,115,232,.75)',
            borderRadius: 6,
            maxBarThickness: 48
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => 'R$ ' + fmtNum(v / 1000, 0) + 'k' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }

  // ===== METAS (modelo "Tela remtabilidade e metas e patrimonio") =====
  function renderGoals() {
    const host = document.getElementById('goalsList');
    const allocHost = document.getElementById('allocationGoalsBody');
    if (!host) return;
    const d = DATA();
    const k = d.kpis || {};
    const meta = window.CARTEIRA_META || {};
    const goals = meta.goals || {};

    const cards = [];

    // Meta 1: Patrimônio (real: goals.patrimonioTarget)
    if (goals.patrimonioTarget && k.total) {
      const target = goals.patrimonioTarget;
      const pct = Math.min(100, k.total / target * 100);
      const falta = Math.max(0, target - k.total);
      cards.push({ title: 'Meta de Patrimônio', tag: 'Objetivo principal', target, current: k.total, pct, falta, unit: 'R$', note: `${fmtNum(pct)}% • faltam ${fmtBRL(falta)}` });
    }

    // Meta 2: Renda mensal de proventos (real: goals.proventosMonthly)
    if ((goals.proventosMonthly || meta.divGoal) && k.earnings12m != null) {
      const target = goals.proventosMonthly || meta.divGoal;
      const current = k.earnings12m / 12;
      const pct = Math.min(100, current / target * 100);
      const falta = Math.max(0, target - current);
      cards.push({ title: 'Renda Mensal de Proventos', tag: 'Liberdade financeira', target, current, pct, falta, unit: 'R$/mês', note: `${fmtNum(pct)}% • faltam ${fmtBRL(falta)}/mês` });
    }

    const cardHtml = c => `
      <div class="card p-4">
        <div class="flex-between-start-mb-2">
          <div>
            <div class="fs-15-700">${esc(c.title)}</div>
            <div class="fs-11-caps-ink">${esc(c.tag)}</div>
          </div>
          <div class="text-right">
            <div class="fs-22-800">${fmtNum(c.pct)}%</div>
          </div>
        </div>
        <div class="h-10-track">
          <div class="h-10-fill" data-w="${Math.min(100, c.pct)}"></div>
        </div>
        <div class="flex-between fs-12">
          <span class="text-muted">Atual: <strong>${fmtBRL(c.current)}${c.unit === 'R$/mês' ? '/mês' : ''}</strong></span>
          <span class="text-muted">Objetivo: <strong>${fmtBRL(c.target)}${c.unit === 'R$/mês' ? '/mês' : ''}</strong></span>
        </div>
        <p class="text-muted fs-12 mt-2">${esc(c.note)}</p>
      </div>`;

    host.innerHTML = cards.length
      ? cards.map(cardHtml).join('')
      : '<p class="text-muted grid-1/-1-p4">Nenhuma meta configurada. Defina metas em CARTEIRA_META.goals.</p>';

    // Metas de alocação por classe (real: goals.allocation)
    if (allocHost) {
      const alloc = goals.allocation || {};
      const positions = d.positions || [];
      const total = positions.reduce((s, p) => s + (p.value || 0), 0) || 1;
      // mapa de labels do allocation (FII, ETF, Ação, Renda Fixa) para classes do data
      const labelToClass = { 'FII': 'fiis', 'FIIs': 'fiis', 'ETF': 'etfs', 'ETFs': 'etfs', 'Ação': 'stocks', 'Ações': 'stocks', 'Renda Fixa': 'fixed' };
      const allocKeys = Object.keys(alloc);
      if (!allocKeys.length) {
        allocHost.innerHTML = '<p class="text-muted p-3">Nenhuma meta de alocação configurada.</p>';
      } else {
        allocHost.innerHTML = allocKeys.map(label => {
          const targetPct = alloc[label];
          const cls = labelToClass[label] || label.toLowerCase();
          const byClass = positions.filter(p => p.class === cls).reduce((s, p) => s + (p.value || 0), 0);
          const currentPct = byClass / total * 100;
          const diff = currentPct - targetPct;
          const ok = Math.abs(diff) <= 2;
          return `<div class="flex-3-center-p2-border">
            <span class="minw-110-fw-600-13">${esc(label)}</span>
            <div class="h-10-track-rel">
              <div class="h-10-fill-anim" data-w="${Math.min(100, currentPct)}"></div>
              <div class="h-10-marker" data-left="${Math.min(100, targetPct)}" title="Meta: ${targetPct}%"></div>
            </div>
            <span class="minw-170">
              <strong>${fmtNum(currentPct)}%</strong> atual
              <span class="text-muted">/ meta ${targetPct}%</span>
              <span class="${ok ? 'text-success' : (diff > 0 ? 'text-error' : 'text-warning')}" data-fe="fw-600">(${diff >= 0 ? '+' : ''}${fmtNum(diff)}pp)</span>
            </span>
          </div>`;
        }).join('') + '<p class="text-muted fs-11-mt-2">A linha vermelha indica a meta por classe. Verde = dentro da tolerância (±2pp).</p>';
      }
    }
  }

  // ===== DIVIDENDOS: dashboard completo (modelo das telas de referência) =====
  function renderDividendDashboard() {
    const earnings = DATA().earnings || [];
    const kpis = DATA().kpis || {};
    const kpiStrip = document.getElementById('divKpiStrip');
    const topEl = document.getElementById('divTopAssets');
    const gridEl = document.getElementById('divMonthlyGrid');
    const yearEl = document.getElementById('divYearSummary');
    if (!kpiStrip) return;
    if (!earnings.length) {
      kpiStrip.innerHTML = '<p class="text-muted grid-1/-1-p3">Sem proventos importados.</p>';
      return;
    }

    // --- Agregações reais dos eventos ---
    const byMonth = {}; // {year: {month(0-11): total}}
    const byYear = {};  // {year: total}
    const byTicker = {}; // {ticker: total}
    earnings.forEach(e => {
      const d = String(e.date || '');
      if (d.length < 7) return;
      const y = +d.slice(0, 4), m = +d.slice(5, 7) - 1;
      const v = Number(e.gross ?? e.grossValue ?? e.net) || 0;
      byMonth[y] = byMonth[y] || new Array(12).fill(0);
      byMonth[y][m] += v;
      byYear[y] = (byYear[y] || 0) + v;
      byTicker[e.ticker] = (byTicker[e.ticker] || 0) + v;
    });
    const years = Object.keys(byYear).sort();
    const curYear = +new Date().getFullYear();
    const lastYearWithData = years.length ? +years[years.length - 1] : curYear;
    const prevYear = lastYearWithData - 1;
    const recebidoAno = byYear[lastYearWithData] || 0;
    const recebidoAnoAnt = byYear[prevYear] || 0;
    const varAno = recebidoAnoAnt > 0 ? (recebidoAno - recebidoAnoAnt) / recebidoAnoAnt * 100 : null;

    // Média mensal: meses com valor > 0 no último ano com dados
    const mesesComDados = byMonth[lastYearWithData] ? byMonth[lastYearWithData].filter(v => v > 0).length : 0;
    const mediaMensal = mesesComDados > 0 ? recebidoAno / mesesComDados : 0;
    // Último mês com valor
    let ultMesIdx = -1, ultMesVal = 0;
    (byMonth[lastYearWithData] || []).forEach((v, i) => { if (v > 0) { ultMesIdx = i; ultMesVal = v; } });
    const mesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    // Projeção anual = média × 12
    const projAnual = mediaMensal * 12;
    // Yield atual = 12M / patrimônio
    const total12m = (kpis.earnings12m != null) ? kpis.earnings12m : recebidoAno;
    const yieldAtual = kpis.total > 0 ? total12m / kpis.total * 100 : 0;

    const kpiCard = (label, value, sub, cls = '') => `<div class="stat-block">
      <div class="fs-11-caps">${label}</div>
      <div class="${cls} fs-lg-700-mt">${value}</div>
      ${sub ? `<div class="fs-11-muted">${sub}</div>` : ''}
    </div>`;

    kpiStrip.innerHTML =
      kpiCard('Recebido em ' + lastYearWithData, fmtBRL(recebidoAno), varAno != null ? `${varAno >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(varAno))}% vs. ${prevYear}` : `sem base ${prevYear}`, varAno == null || varAno >= 0 ? 'text-success' : 'text-error') +
      kpiCard('Média mensal', fmtBRL(mediaMensal), `${mesesComDados} meses com proventos`) +
      kpiCard('Último mês', ultMesIdx >= 0 ? fmtBRL(ultMesVal) : '—', ultMesIdx >= 0 ? `${mesNome[ultMesIdx]}/${lastYearWithData}` : '') +
      kpiCard('Projeção anual', fmtBRL(projAnual), 'Mantendo o ritmo atual') +
      kpiCard('Yield atual', fmtNum(yieldAtual) + '%', 'Sobre o patrimônio total');

    // --- Top ativos ---
    if (topEl) {
      const totalAll = Object.values(byTicker).reduce((s, v) => s + v, 0) || 1;
      const ranked = Object.entries(byTicker).sort((a, b) => b[1] - a[1]);
      topEl.innerHTML = ranked.slice(0, 10).map(([t, v], i) => `
        <div class="flex-between-center-p2-border">
          <span class="fw-600-13">${i + 1}. ${esc(t)}</span>
          <span class="text-12">${fmtBRL(v)} <span class="text-muted">(${fmtNum(v / totalAll * 100)}%)</span></span>
        </div>`).join('') + (ranked.length > 10 ? `<p class="text-muted fs-11-mt-2">+ ${ranked.length - 10} outros ativos</p>` : '');
    }

    // --- Histórico mensal Ano × Jan-Dez ---
    if (gridEl) {
      const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const fmtCell = v => v > 0 ? fmtNum(v, 0) : '—';
      const rows = years.slice().reverse().map(y => {
        const arr = byMonth[y] || new Array(12).fill(0);
        const mesesAtivos = arr.filter(v => v > 0).length;
        const media = mesesAtivos > 0 ? byYear[y] / mesesAtivos : 0;
        return `<tr${+y === lastYearWithData ? ' class="fw-600-bg"' : ''}>
          <td>${y}</td>
          ${arr.map(v => `<td class="text-right">${fmtCell(v)}</td>`).join('')}
          <td class="text-right">${media > 0 ? fmtNum(media, 0) : '—'}</td>
          <td class="text-right">${fmtNum(byYear[y], 0)}</td>
        </tr>`;
      }).join('');
      gridEl.innerHTML = `<table class="data-table text-12">
        <thead><tr><th>Ano</th>${MESES.map(m => `<th class="text-right">${m}</th>`).join('')}<th class="text-right">Média</th><th class="text-right">Total</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="text-muted fs-11-p2">Valores brutos dos proventos importados${years.length ? ' • ' + years.length + ' ano(s) com histórico' : ''}.</p>`;
    }

    // --- Resumo por ano ---
    if (yearEl) {
      const totalAll = Object.values(byYear).reduce((s, v) => s + v, 0) || 1;
      const anoRows = years.slice().reverse().map(y => {
        const pct = byYear[y] / totalAll * 100;
        return `<div class="flex-3-center-p2">
          <span class="minw-44-fw-600">${y}</span>
          <div class="h-10-track-simple">
            <div class="h-10-fill-anim" data-w="${pct}"></div>
          </div>
          <span class="minw-110 text-right">${fmtBRL(byYear[y])} <span class="text-muted">(${fmtNum(pct)}%)</span></span>
        </div>`;
      }).join('');
      yearEl.innerHTML = anoRows + `<p class="text-muted fs-11-mt-2">Total geral: <strong>${fmtBRL(totalAll)}</strong></p>`;
    }

    // --- Gráfico de evolução (2 anos mais recentes) ---
    const canvas = document.getElementById('divEvoChart');
    if (canvas && window.Chart) {
      const y1 = lastYearWithData, y2 = prevYear;
      const d1 = byMonth[y1] || new Array(12).fill(0);
      const d2 = byMonth[y2] || new Array(12).fill(0);
      const existing = window.Chart.getChart(canvas);
      if (existing) existing.destroy();
      new window.Chart(canvas, {
        type: 'line',
        data: {
          labels: mesNome,
          datasets: [
            { label: String(y1), data: d1, borderColor: '#1A73E8', backgroundColor: 'rgba(26,115,232,.12)', fill: true, tension: .3, borderWidth: 2.5 },
            { label: String(y2), data: d2, borderColor: '#F9AB00', borderDash: [6, 4], fill: false, tension: .3, borderWidth: 2 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { ticks: { callback: v => 'R$ ' + fmtNum(v, 0) } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }

  // ===== FASE 17: Lazy init das abas + Web Worker Monte Carlo =====
      const renderedTabs = new Set();
      const LAZY_TABS = new Set([
        'rebalance', 'fixed', 'benchmarks', 'tax', 'corporate-events',
        'data-trust', 'backup-portability', 'risk', 'montecarlo', 'import', 'backup',
        'patrimony', 'earnings', 'goals', 'entries', 'returns'
      ]);

      // Expor para testes: permite resetar o estado de abas renderizadas
      window.__resetRenderedTabs = () => renderedTabs.clear();

      function maybeRenderLazy(tabName) {
      if (!LAZY_TABS.has(tabName) || renderedTabs.has(tabName)) return;
      renderedTabs.add(tabName);
      try {
        console.log('maybeRenderLazy called for:', tabName);
        if (tabName === 'rebalance') renderRebalance();
        else if (tabName === 'fixed') (typeof window.renderFixedIncome === 'function' ? window.renderFixedIncome : renderFixedIncome)();
        else if (tabName === 'benchmarks') renderBenchmarks();
        else if (tabName === 'tax') renderTax();
        else if (tabName === 'corporate-events') renderCorporateEvents();
        else if (tabName === 'data-trust') {
          renderDataTrust();
          renderDataTrustAlerts();
          renderAuditSnapshots();
          renderDataFreshness();
        }
        else if (tabName === 'backup-portability') renderBackupHistory();
        else if (tabName === 'risk') {
          // Delay: real-mode.js MutationObserver sobrescreve #riskKpis logo após o
          // painel ficar visível ("Dados insuficientes"). Rodamos depois e ganhamos.
          setTimeout(renderRiskMetrics, 300);
        }
        else if (tabName === 'patrimony') renderPatrimonySummaryTable();
        else if (tabName === 'earnings') renderDividendDashboard();
        else if (tabName === 'goals') renderGoals();
        else if (tabName === 'entries') renderAportes();
        else if (tabName === 'returns') renderClassReturns();
        else if (tabName === 'montecarlo') autoRunMonteCarlo();
      } catch (e) {
        console.warn('lazy render failed:', tabName, e);
        renderedTabs.delete(tabName);
      }
    }

    // Monte Carlo: auto-executa com os defaults ao abrir a aba (1ª vez)
    function autoRunMonteCarlo() {
      setTimeout(() => {
        const canvas = document.getElementById('mcChart');
        const alreadyHas = canvas && window.Chart && window.Chart.getChart && window.Chart.getChart(canvas);
        if (alreadyHas) return;
        const btn = document.getElementById('btnRunMC');
        if (btn && !btn.disabled) btn.click();
      }, 500);
    }

    // Hook: renderizar quando a aba correspondente abre (via switchTab original)
        // Deve rodar NO BOOT (DOMContentLoaded), depois do script.js module atribuir
        // window.switchTab — no parse-time o module ainda não rodou e o wrap seria sobrescrito.
        function wrapSwitchTab() {
          const origSwitchTab = window.switchTab;
          if (typeof origSwitchTab !== 'function') return;
          window.switchTab = function (tabName) {
            console.log('wrapped switchTab called for:', tabName);
            const r = origSwitchTab.call(this, tabName);
            console.log('calling maybeRenderLazy for:', tabName);
            maybeRenderLazy(tabName);
            return r;
          };
        }

    // Auto-init: só renderiza abas críticas no boot
    function boot() {
      window.__bootRan = true;
      wrapSwitchTab();
      // Abas críticas: summary, patrimony, returns, positions, earnings, entries
      // (switchTab já foi chamado pelo script.js para a aba ativa)
      updateFreshnessLabel();
      renderAlertBanners();
      renderClassSummaryCards();
      renderInsights();
      // Re-render dos insights após o module (script.js) popular MOCK_DATA/CARTEIRA_META
      setTimeout(() => { try { renderAlertBanners(); renderInsights(); renderClassSummaryCards(); } catch (e) { console.warn('insights re-render:', e); } }, 600);
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
        // Expor funções de renderização individuais (não sobrescreve override de teste)
        if (typeof window.renderFixedIncome !== 'function') window.renderFixedIncome = renderFixedIncome;
        window.renderRebalance = renderRebalance;
        window.renderBenchmarks = renderBenchmarks;
        window.renderTax = renderTax;
        window.renderCorporateEvents = renderCorporateEvents;
        window.renderDataTrust = renderDataTrust;
      })();
