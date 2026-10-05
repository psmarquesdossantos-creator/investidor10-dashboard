// data-trust-engine.js — Motor de Auditoria de Qualidade de Dados (Data Trust Center)
// Adaptado de controle-financeiro/audit-engine.js para a estrutura do investidor10-dashboard
// Executa auditorias determinísticas: duplicatas, preços zerados, tickers inválidos, datas futuras, qualidade de dados

(function () {
  'use strict';

  // ===== Helpers =====
  function DATA() {
    return window.__CARTEIRA_OVERRIDE || window.CARTEIRA_DATA || { positions: [], earnings: [], entries: [], fixedIncome: [], kpis: {} };
  }

  const SEVERITY = {
    critical: { label: 'Crítico', color: '#EA4335', bg: 'rgba(234,67,53,.1)', border: 'rgba(234,67,53,.25)', icon: '⛔' },
    warning:  { label: 'Atenção', color: '#F9AB00', bg: 'rgba(249,171,0,.08)', border: 'rgba(249,171,0,.25)', icon: '⚠️' },
    info:     { label: 'Info', color: '#1A73E8', bg: 'rgba(26,115,232,.08)', border: 'rgba(26,115,232,.25)', icon: 'ℹ️' },
    ok:       { label: 'OK', color: '#34A853', bg: 'rgba(52,168,83,.08)', border: 'rgba(52,168,83,.25)', icon: '✅' }
  };

  function makeAlert(severity, area, message, detail, context = {}) {
    return { severity, area, message, detail, context, timestamp: new Date().toISOString() };
  }

  // ===== CORE AUDIT =====
  function runFullAudit() {
    const d = DATA();
    const alerts = [];
    const stats = { critical: 0, warning: 0, info: 0, ok: 0 };

    // 1. Posições (ativos)
    alerts.push(...auditPositions(d.positions || []));

    // 2. Renda Fixa (classe 'fixed')
    alerts.push(...auditFixedIncome(d.positions || []));

    // 3. Lançamentos (entries)
    alerts.push(...auditEntries(d.entries || []));

    // 4. Proventos
    alerts.push(...auditProventos(d.earnings || []));

    // 5. Cotações (staleness)
    alerts.push(...auditQuotesStaleness(d.positions || [], d.quotes || {}));

    // 7. Qualidade de Dados (Data Quality)
    alerts.push(...runDataQualityCheck(d));

    // Contar por severidade
    alerts.forEach(a => { stats[a.severity] = (stats[a.severity] || 0) + 1; });

    return { alerts, stats, total: alerts.length, generatedAt: new Date().toISOString() };
  }

  // ===== 1. POSIÇÕES =====
  function auditPositions(positions) {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);
    const seenTickers = new Map();

    (positions || []).forEach((p, i) => {
      const ticker = (p.ticker || '').trim().toUpperCase();
      const name = (p.name || '').trim();
      const type = p.class || p.type || '';
      const qty = Number(p.qty) || 0;
      const avgPrice = Number(p.avgPrice) || 0;
      const currentPrice = Number(p.currentPrice) || 0;
      const applied = Number(p.applied) || 0;

      if (!ticker) {
        alerts.push(makeAlert('critical', 'positions', `Posição #${i}: ticker vazio`, `Nome: ${name || 'sem nome'}`, { index: i, field: 'ticker' }));
      }

      // Ticker duplicado
      if (ticker && seenTickers.has(ticker)) {
        alerts.push(makeAlert('warning', 'positions', `Ticker duplicado: ${ticker}`, `Já existe na posição #${seenTickers.get(ticker)}`, { index: i, field: 'ticker', duplicateOf: seenTickers.get(ticker) }));
      } else if (ticker) {
        seenTickers.set(ticker, i);
      }

      if (qty <= 0) {
        alerts.push(makeAlert('warning', 'positions', `${ticker}: quantidade zero ou negativa (${qty})`, 'Verifique se o ativo deve permanecer', { index: i, field: 'qty' }));
      }

      if (qty > 0 && avgPrice <= 0) {
        alerts.push(makeAlert('warning', 'positions', `${ticker}: preço médio zero`, 'Não é possível calcular resultado sem preço médio', { index: i, field: 'avgPrice' }));
      }

      // currentPrice: verificar fonte de cotação primeiro
      if (qty > 0) {
        const quotes = window.__CARTEIRA_OVERRIDE?.quotes || window.CARTEIRA_DATA?.quotes || {};
        const hasQuote = quotes[ticker] && Number(quotes[ticker].price) > 0;
        if (!hasQuote && currentPrice <= 0) {
          alerts.push(makeAlert('info', 'positions', `${ticker}: sem cotação disponível`, 'Valor de mercado não pôde ser calculado', { index: i, field: 'currentPrice' }));
        } else if (hasQuote && currentPrice <= 0) {
          alerts.push(makeAlert('critical', 'positions', `${ticker}: preço atual zerado apesar de cotação disponível`, 'Valor de mercado está zerado enquanto há cotação', { index: i, field: 'currentPrice' }));
        } else if (!hasQuote && currentPrice > 0) {
          // preço informado mas sem cotação cacheada — ok, pode ser entrada manual
        }
      }

      // Valor aplicado inconsistente
      if (qty > 0 && avgPrice > 0 && applied > 0) {
        const expected = qty * avgPrice;
        if (Math.abs(expected - applied) / expected > 0.02) {
          alerts.push(makeAlert('warning', 'positions', `${ticker}: valor aplicado inconsistente`, `Esperado: R$ ${expected.toLocaleString('pt-BR', {minimumFractionDigits: 2})} | Informado: R$ ${applied.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, { index: i, field: 'applied' }));
        }
      }

      // Valor de mercado inconsistente com preço médio/quantidade
      if (qty > 0 && avgPrice > 0 && currentPrice > 0) {
        const invested = qty * avgPrice;
        const marketValue = qty * currentPrice;
        if (invested > 0 && Math.abs(invested - marketValue) / invested > 0.5) {
          alerts.push(makeAlert('info', 'positions', `${ticker}: grande variação entre valor investido e valor de mercado`, `Investido: R$ ${invested.toLocaleString('pt-BR', {minimumFractionDigits: 2})} | Mercado: R$ ${marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, { index: i, field: 'currentPrice' }));
        }
      }

      // Tipos válidos para nossa estrutura
      const validTypes = ['stocks', 'fiis', 'etfs', 'fixed', 'crypto', 'bdr'];
      if (type && !validTypes.includes(type)) {
        alerts.push(makeAlert('info', 'positions', `${ticker}: classe não reconhecida: "${type}"`, 'Afeta classificação e benchmarks', { index: i, field: 'class' }));
      }
    });

    return alerts;
  }

  // ===== 2. RENDA FIXA =====
  function auditFixedIncome(positions) {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);
    const fixed = (positions || []).filter(p => (p.class || p.type) === 'fixed');

    fixed.forEach((p, i) => {
      const ticker = (p.ticker || '').trim().toUpperCase();
      const name = (p.name || '').trim();
      const applied = Number(p.applied) || 0;
      const current = Number(p.currentPrice) || 0;
      const maturityDate = p.maturityDate || p.vencimento || '';
      const indexer = p.indexer || '';
      const rate = Number(p.rate) || 0;

      if (!ticker && !name) {
        alerts.push(makeAlert('critical', 'fixedIncome', `RF #${i}: sem identificador`, 'Ticker ou nome obrigatório', { index: i, field: 'ticker' }));
      }

      if (applied <= 0) {
        alerts.push(makeAlert('warning', 'fixedIncome', `${ticker || name}: valor aplicado zero`, 'Impossível calcular rentabilidade', { index: i, field: 'applied' }));
      }

      if (current <= 0) {
        alerts.push(makeAlert('critical', 'fixedIncome', `${ticker || name}: valor atual zerado`, 'Valor de mercado não calculado', { index: i, field: 'currentPrice' }));
      }

      if (maturityDate && maturityDate < new Date().toISOString().slice(0, 10)) {
        alerts.push(makeAlert('warning', 'fixedIncome', `${ticker || name}: vencido em ${maturityDate}`, 'Verifique se deve ser removido ou resgatado', { index: i, field: 'maturityDate' }));
      }

      if (maturityDate) {
        const days = Math.ceil((new Date(maturityDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (days > 0 && days <= 30) {
          alerts.push(makeAlert('info', 'fixedIncome', `${ticker || name}: vence em ${days} dias`, 'Prepare resgate ou rolagem', { index: i, field: 'maturityDate' }));
        }
      }

      if (!indexer) {
        alerts.push(makeAlert('info', 'fixedIncome', `${ticker || name}: indexador não informado`, 'Afeta comparação com benchmarks', { index: i, field: 'indexer' }));
      }
    });

    return alerts;
  }

  // ===== 3. LANÇAMENTOS (entries) =====
  function auditEntries(entries) {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);

    (entries || []).forEach((e, i) => {
      const ticker = (e.ticker || '').trim().toUpperCase();
      const type = e.type || '';
      const qty = Number(e.qty) || 0;
      const price = Number(e.price) || 0;
      const value = Number(e.value) || 0;
      const date = e.date || '';
      const fees = Number(e.fees) || 0;

      if (!ticker) {
        alerts.push(makeAlert('critical', 'entries', `Lançamento #${i}: ticker vazio`, '', { index: i, field: 'ticker' }));
      }

      if (!['buy', 'sell'].includes(type)) {
        alerts.push(makeAlert('warning', 'entries', `${ticker}: tipo inválido "${type}"`, 'Use "buy" ou "sell"', { index: i, field: 'type' }));
      }

      if (qty <= 0) {
        alerts.push(makeAlert('warning', 'entries', `${ticker}: quantidade inválida (${qty})`, '', { index: i, field: 'qty' }));
      }

      if (price <= 0) {
        alerts.push(makeAlert('warning', 'entries', `${ticker}: preço zero`, '', { index: i, field: 'price' }));
      }

      if (qty > 0 && price > 0) {
        const expected = qty * price;
        if (value > 0 && Math.abs(expected - value) / expected > 0.05) {
          alerts.push(makeAlert('warning', 'entries', `${ticker}: valor inconsistente`, `Qtd×Preço = ${expected.toLocaleString('pt-BR', {minimumFractionDigits: 2})} | Informado = ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, { index: i, field: 'value' }));
        }
      }

      if (date && date > new Date().toISOString().slice(0, 10)) {
        alerts.push(makeAlert('warning', 'entries', `${ticker}: data futura`, 'Verifique se a data está correta', { index: i, field: 'date' }));
      }

      if (value > 0 && fees > 0 && fees / value > 0.05) {
        alerts.push(makeAlert('info', 'entries', `${ticker}: taxas altas (${(fees / value * 100).toFixed(1)}%)`, 'Verifique corretagem/emolumentos', { index: i, field: 'fees' }));
      }
    });

    // Duplicatas exatas
    const seen = new Map();
    (entries || []).forEach((e, i) => {
      const key = `${e.ticker}|${e.type}|${e.qty}|${e.price}|${e.date}`;
      if (seen.has(key)) {
        alerts.push(makeAlert('warning', 'entries', `Lançamento duplicado: ${e.ticker} ${e.type} ${e.qty}@${e.price} em ${e.date}`, `Duplicata de lançamento #${seen.get(key)}`, { index: i, field: 'duplicate', duplicateOf: seen.get(key) }));
      } else {
        seen.set(key, i);
      }
    });

    return alerts;
  }

  // ===== 4. PROVENTOS =====
  function auditProventos(earnings) {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);

    (earnings || []).forEach((e, i) => {
      const ticker = (e.ticker || '').trim().toUpperCase();
      const type = e.type || '';
      const perShare = Number(e.perShare) || 0;
      const gross = Number(e.gross) || Number(e.grossValue) || 0;
      const date = e.date || '';
      const tax = Number(e.tax) || Number(e.irValue) || 0;
      const net = Number(e.net) || Number(e.netValue) || 0;

      if (!ticker) {
        alerts.push(makeAlert('critical', 'proventos', `Provento #${i}: ticker vazio`, '', { index: i, field: 'ticker' }));
      }

      const validTypes = ['dividend', 'jcp', 'amortization', 'interest', 'rendimento'];
      if (type && !validTypes.includes(type)) {
        alerts.push(makeAlert('info', 'proventos', `${ticker}: tipo não padrão "${type}"`, '', { index: i, field: 'type' }));
      }

      if (perShare <= 0 && gross <= 0) {
        alerts.push(makeAlert('warning', 'proventos', `${ticker}: valor zero`, '', { index: i, field: 'value' }));
      }

      if (date && date > new Date().toISOString().slice(0, 10)) {
        alerts.push(makeAlert('warning', 'proventos', `${ticker}: data futura (${date})`, '', { index: i, field: 'date' }));
      }

      if (gross > 0 && net > 0 && net > gross) {
        alerts.push(makeAlert('warning', 'proventos', `${ticker}: líquido maior que bruto`, `Bruto: ${gross.toLocaleString('pt-BR', {minimumFractionDigits: 2})} | Líquido: ${net.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, { index: i, field: 'grossValue' }));
      }
    });

    return alerts;
  }

  // ===== 5. COTAÇÕES (STALENESS) =====
  function auditQuotesStaleness(positions, quotes) {
    const alerts = [];
    const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 dias

    (positions || []).forEach(p => {
      const ticker = (p.ticker || '').trim().toUpperCase();
      if (!ticker) return;

      const quote = quotes[ticker];
      if (!quote) {
        alerts.push(makeAlert('info', 'quotes', `${ticker}: sem cotação cacheada`, 'Será buscado na próxima atualização', { ticker, field: 'quotes' }));
      } else if (quote.timestamp && quote.timestamp < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        const age = Math.floor((Date.now() - quote.timestamp) / (1000 * 60 * 60 * 24));
        alerts.push(makeAlert('warning', 'quotes', `${ticker}: cotação antiga (${age} dias)`, `Fonte: ${quote.source || 'desconhecida'}`, { ticker, field: 'quotes', ageDays: age }));
      } else if (Number(quote.price) <= 0) {
        alerts.push(makeAlert('critical', 'quotes', `${ticker}: cotação zerada no cache`, '', { ticker, field: 'quotes' }));
      }
    });

    return alerts;
  }

  // ===== DATA QUALITY CHECKS =====
  function runDataQualityCheck(d) {
    const issues = [];
    const assets = d.positions || [];
    const entries = d.entries || [];
    const earnings = d.earnings || [];

    // 1. Ativos sem classe
    assets.filter(a => !a.class).forEach(a => {
      issues.push(makeAlert('warning', a.ticker || 'sem ticker', 'Ativo sem classe definida', 'classification', 'Defina: stocks, fiis, etfs, fixed, crypto, bdr'));
    });

    // 2. Entradas sem corretora (source)
    (d.entries || []).filter(e => !e.source).forEach(e => {
      issues.push(makeAlert('info', e.ticker, 'Lançamento sem corretora', 'metadata', 'Adicione corretora para rastreamento'));
    });

    // 3. Proventos sem tipo
    (earnings || []).filter(e => !e.type).forEach(e => {
      issues.push(makeAlert('warning', e.ticker, 'Provento sem tipo', 'classification', 'Defina: dividend, jcp, amortization, interest'));
    });

    // 4. Renda fixa sem indexador
    assets.filter(a => a.class === 'fixed' && !a.indexer).forEach(a => {
      issues.push(makeAlert('info', a.ticker || a.name, 'Renda fixa sem indexador', 'metadata', 'Ex: CDI, IPCA+, Pré, etc.'));
    });

    // 5. Quantidade fracionária em ações (não FII/ETF/BDR)
    assets.filter(a => a.class === 'stocks' && Number(a.qty) % 1 !== 0).forEach(a => {
      issues.push(makeAlert('warning', a.ticker, 'Quantidade fracionária em ação', 'data_integrity', 'Ações BR geralmente são inteiras; verifique se é BDR/ETF'));
    });

    return issues;
  }

  // ===== API PÚBLICA =====
  window.DataTrustEngine = {
    runFullAudit,
    auditPositions,
    auditFixedIncome,
    auditEntries,
    auditProventos,
    auditQuotesStaleness,
    runDataQualityCheck,
    SEVERITY,
    // helper para UI
    formatAlertsForUI: (auditResult) => {
      if (!auditResult || !auditResult.alerts) return [];
      return auditResult.alerts.map(a => ({
        ...a,
        severityLabel: SEVERITY[a.severity]?.label || a.severity,
        severityColor: SEVERITY[a.severity]?.color || '#666',
        severityBg: SEVERITY[a.severity]?.bg || 'rgba(0,0,0,.05)',
        severityIcon: SEVERITY[a.severity]?.icon || '•'
      }));
    }
  };

  // Auto-run on load para preencher Data Trust Center
  function boot() {
    const result = runFullAudit();
    console.log('[DataTrustEngine] Auditoria completa:', result.stats);
    // Disparar evento para UI consumir
    window.dispatchEvent(new CustomEvent('data-trust:audit-complete', { detail: result }));
  }

  // Boot imediato (dados já disponíveis via __CARTEIRA_OVERRIDE)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();