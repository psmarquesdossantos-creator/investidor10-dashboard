/**
 * Sample data for Investidor10 Dashboard - PUBLIC SAFE
 * This file contains SYNTHETIC data for demonstration purposes.
 * Real financial data is in carteira-data.js (gitignored).
 *
 * Schema mirrors the real carteira-data.js: positions carry canonical
 * class/value/return fields; earnings carry gross/tax/net; kpis + patrimony
 * series are present so charts/panels render without boot errors.
 */

(function () {
  'use strict';

  // ---- positions (21 synthetic assets across 6 classes) ----
  const positions = [
    // stocks (5)
    { ticker: 'PETR4', name: 'Petrobras PN', class: 'stocks', category: 'acao', sector: 'Petróleo e Gás', qty: 100, avgPrice: 30.5, currentPrice: 32.1 },
    { ticker: 'ITUB4', name: 'Itaú Unibanco PN', class: 'stocks', category: 'acao', sector: 'Bancos', qty: 50, avgPrice: 28.0, currentPrice: 29.5 },
    { ticker: 'VALE3', name: 'Vale ON', class: 'stocks', category: 'acao', sector: 'Mineração', qty: 30, avgPrice: 65.0, currentPrice: 68.0 },
    { ticker: 'BBAS3', name: 'Banco do Brasil ON', class: 'stocks', category: 'acao', sector: 'Bancos', qty: 40, avgPrice: 32.0, currentPrice: 34.0 },
    { ticker: 'WEGE3', name: 'WEG ON', class: 'stocks', category: 'acao', sector: 'Bens Industriais', qty: 20, avgPrice: 40.0, currentPrice: 42.0 },
    // fiis (5)
    { ticker: 'HGLG11', name: 'CSHG Logística', class: 'fiis', category: 'fii', sector: 'Logística', qty: 100, avgPrice: 150.0, currentPrice: 155.0 },
    { ticker: 'KNRI11', name: 'Kinea Renda Imobiliária', class: 'fiis', category: 'fii', sector: 'Híbrido', qty: 80, avgPrice: 140.0, currentPrice: 145.0 },
    { ticker: 'XPLG11', name: 'XP Log', class: 'fiis', category: 'fii', sector: 'Logística', qty: 60, avgPrice: 95.0, currentPrice: 98.0 },
    { ticker: 'MXRF11', name: 'Maxi Renda', class: 'fiis', category: 'fii', sector: 'Carteira', qty: 500, avgPrice: 10.2, currentPrice: 10.5 },
    { ticker: 'BTLG11', name: 'BTG Logística', class: 'fiis', category: 'fii', sector: 'Logística', qty: 80, avgPrice: 112.0, currentPrice: 114.0 },
    // etfs (3)
    { ticker: 'DIVD11', name: 'IT Now IDIV', class: 'etfs', category: 'etf', sector: 'Ações', qty: 200, avgPrice: 55.0, currentPrice: 58.0 },
    { ticker: 'IMAB11', name: 'IT Now IMA-B', class: 'etfs', category: 'etf', sector: 'Renda Fixa', qty: 150, avgPrice: 110.0, currentPrice: 112.0 },
    { ticker: 'IVVB11', name: 'iShares S&P 500', class: 'etfs', category: 'etf', sector: 'Ações', qty: 10, avgPrice: 130.0, currentPrice: 135.0 },
    // crypto (2)
    { ticker: 'HODL11', name: 'Investo Bitcoin', class: 'crypto', category: 'cripto', sector: 'Criptoativo', qty: 50, avgPrice: 60.0, currentPrice: 65.0 },
    { ticker: 'QNTM11', name: 'Investo Ethereum', class: 'crypto', category: 'cripto', sector: 'Criptoativo', qty: 30, avgPrice: 45.0, currentPrice: 48.0 },
    // fixed (4)
    { ticker: 'CDB001', name: 'CDB Banco Sample 2027', class: 'fixed', category: 'rf', sector: 'CDB', qty: 1, avgPrice: 50000, currentPrice: 52000, issuer: 'Banco Sample', indexer: 'CDI 110%', maturity: '2027-12-15' },
    { ticker: 'CRA001', name: 'CRA Sample Securitizadora', class: 'fixed', category: 'rf', sector: 'CRA', qty: 1, avgPrice: 30000, currentPrice: 31500, issuer: 'Sample Securitizadora', indexer: 'IPCA+6%', maturity: '2028-06-30' },
    { ticker: 'LCI001', name: 'LCI Banco Sample', class: 'fixed', category: 'rf', sector: 'LCI', qty: 1, avgPrice: 20000, currentPrice: 20800, issuer: 'Banco Sample', indexer: '95% CDI', maturity: '2027-03-15' },
    { ticker: 'CRI001', name: 'CRI Sample Infra', class: 'fixed', category: 'rf', sector: 'CRI', qty: 1, avgPrice: 15000, currentPrice: 15600, issuer: 'Sample Infra', indexer: 'IPCA+5%', maturity: '2029-01-10' },
    // bdr (1)
    { ticker: 'TAEE11', name: 'Taesa BDR', class: 'bdr', category: 'bdr', sector: 'Energia', qty: 40, avgPrice: 36.0, currentPrice: 37.5 }
  ].map((p, i) => {
    const invested = +(p.qty * p.avgPrice).toFixed(2);
    const value = +(p.qty * p.currentPrice).toFixed(2);
    return {
      id: i + 1,
      ...p,
      invested,
      current: value,
      value,
      profit: +(value - invested).toFixed(2),
      profitPct: invested ? +((value / invested - 1) * 100).toFixed(2) : 0,
      return: invested ? +((value / invested - 1) * 100).toFixed(2) : 0,
      weight: 0,
      allocation: 0
    };
  });

  const invested = +positions.reduce((s, p) => s + p.invested, 0).toFixed(2);
  const total = +positions.reduce((s, p) => s + p.value, 0).toFixed(2);
  positions.forEach(p => {
    p.weight = total ? +(p.value / total * 100).toFixed(2) : 0;
    p.allocation = p.weight;
  });

  // ---- earnings (10 events, canonical gross/tax/net + legacy fields) ----
  const rawEarnings = [
    { date: '2026-06-15', asset: 'HGLG11', type: 'Rendimento', etype: 'rendimento', qty: 100, perShare: 1.2, total: 120 },
    { date: '2026-06-30', asset: 'PETR4', type: 'Dividendo', etype: 'dividend', qty: 100, perShare: 0.42, total: 42 },
    { date: '2026-07-15', asset: 'KNRI11', type: 'Rendimento', etype: 'rendimento', qty: 80, perShare: 1.15, total: 92 },
    { date: '2026-07-30', asset: 'BBAS3', type: 'JCP', etype: 'jcp', qty: 40, perShare: 1.5, total: 60 },
    { date: '2026-08-15', asset: 'XPLG11', type: 'Rendimento', etype: 'rendimento', qty: 60, perShare: 1.25, total: 75 },
    { date: '2026-08-30', asset: 'VALE3', type: 'Dividendo', etype: 'dividend', qty: 30, perShare: 1.1, total: 33 },
    { date: '2026-09-15', asset: 'DIVD11', type: 'Dividendo', etype: 'dividend', qty: 200, perShare: 0.25, total: 50 },
    { date: '2026-09-30', asset: 'MXRF11', type: 'Rendimento', etype: 'rendimento', qty: 500, perShare: 0.1, total: 50 },
    { date: '2026-10-05', asset: 'ITUB4', type: 'JCP', etype: 'jcp', qty: 50, perShare: 0.86, total: 43 },
    { date: '2026-10-15', asset: 'IMAB11', type: 'Juros', etype: 'interest', qty: 150, perShare: 1.2, total: 180 }
  ];
  const earnings = rawEarnings.map(e => ({
    ...e,
    ticker: e.asset,
    gross: e.total,
    tax: 0,
    net: e.total
  }));

  // ---- patrimony: 12-month synthetic series (deterministic, PUBLIC SAFE) ----
  const labels = [];
  const portfolio = [];
  const investedSeries = [];
  const cdi = [];
  const ibov = [];
  for (let i = 0; i < 12; i++) {
    const y = 2025 + Math.floor((10 + i) / 12);
    const m = (10 + i) % 12 + 1;
    labels.push(`${String(m).padStart(2, '0')}/${y}`);
    const t = i / 11;
    portfolio.push(+(195000 + (total - 195000) * t).toFixed(2));
    investedSeries.push(+(160000 + (invested - 160000) * t).toFixed(2));
    cdi.push(+(100 * Math.pow(1.007, i)).toFixed(4));
    ibov.push(+(100 * (1 + 0.011 * i + 0.012 * Math.sin(i))).toFixed(4));
  }

  const dividends12m = +earnings.reduce((s, e) => s + e.total, 0).toFixed(2);

  // ---- allocation: byClass/byAsset (mesmo shape do backup real) ----
  const classNameMap = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Outros', bdr: 'Outros', other: 'Outros' };
  const classColorMap = { 'Ações': '#1A73E8', 'FIIs': '#34A853', 'ETFs': '#F9AB00', 'Renda Fixa': '#3730A3', 'Outros': '#80868B' };
  const byClassAgg = {};
  positions.forEach(p => {
    const name = classNameMap[p.class] || 'Outros';
    if (!byClassAgg[name]) byClassAgg[name] = { name, value: 0 };
    byClassAgg[name].value += p.value;
  });
  const byClass = Object.values(byClassAgg)
    .map(c => ({ ...c, value: +c.value.toFixed(2), pct: +(c.value / total * 100).toFixed(1), color: classColorMap[c.name] || classColorMap.Outros }))
    .sort((a, b) => b.value - a.value);
  const byAsset = positions.map(p => ({
    name: p.ticker, class: p.class, value: p.value, pct: p.weight, return: p.return
  }));

  window.CARTEIRA_DATA = {
    meta: {
      source: 'sample',
      version: '14.0.0',
      generatedAt: new Date().toISOString(),
      accounts: ['Sample Account']
    },
    allocation: { byClass, byAsset },
    kpis: {
      total,
      invested,
      profit: +(total - invested).toFixed(2),
      totalChange: +((total / invested - 1) * 100).toFixed(2),
      returnTotal: +((total / invested - 1) * 100).toFixed(2),
      return12m: +((total / invested - 1) * 100).toFixed(2),
      dividends: dividends12m,
      earnings12m: dividends12m,
      yield12m: +(dividends12m / total * 100).toFixed(2),
      capitalGain: +(total - invested).toFixed(2)
    },
    patrimony: {
      labels,
      portfolio,
      invested: investedSeries,
      cdi,
      ibov
    },
    monthly: labels.map((period, i) => ({
      period,
      invested: +(investedSeries[i] - (investedSeries[i - 1] || 0)).toFixed(2),
      gain: +(portfolio[i] - (portfolio[i - 1] || 0)).toFixed(2)
    })),
    assets: positions.map(p => ({
      id: p.id, ticker: p.ticker, name: p.name, category: p.category, class: p.class,
      sector: p.sector, qty: p.qty, avgPrice: p.avgPrice, currentPrice: p.currentPrice,
      target: +(p.currentPrice * 1.05).toFixed(2), idealPerc: p.weight, divMonth: 0,
      issuer: p.issuer, indexer: p.indexer, maturity: p.maturity
    })),
    positions,
    entries: [
      { date: '2026-01-15', type: 'compra', ticker: 'PETR4', asset: 'PETR4', qty: 100, price: 30.5, total: 3050, fees: 5.0, class: 'stocks' },
      { date: '2026-02-20', type: 'compra', ticker: 'ITUB4', asset: 'ITUB4', qty: 50, price: 28.0, total: 1400, fees: 5.0, class: 'stocks' },
      { date: '2026-03-10', type: 'compra', ticker: 'VALE3', asset: 'VALE3', qty: 30, price: 65.0, total: 1950, fees: 5.0, class: 'stocks' },
      { date: '2026-04-05', type: 'compra', ticker: 'HGLG11', asset: 'HGLG11', qty: 100, price: 150.0, total: 15000, fees: 10.0, class: 'fiis' },
      { date: '2026-05-12', type: 'compra', ticker: 'KNRI11', asset: 'KNRI11', qty: 80, price: 140.0, total: 11200, fees: 10.0, class: 'fiis' },
      { date: '2026-06-18', type: 'compra', ticker: 'XPLG11', asset: 'XPLG11', qty: 60, price: 95.0, total: 5700, fees: 10.0, class: 'fiis' },
      { date: '2026-07-22', type: 'compra', ticker: 'DIVD11', asset: 'DIVD11', qty: 200, price: 55.0, total: 11000, fees: 10.0, class: 'etfs' },
      { date: '2026-08-01', type: 'compra', ticker: 'IMAB11', asset: 'IMAB11', qty: 150, price: 110.0, total: 16500, fees: 10.0, class: 'etfs' },
      { date: '2026-08-20', type: 'compra', ticker: 'MXRF11', asset: 'MXRF11', qty: 500, price: 10.2, total: 5100, fees: 10.0, class: 'fiis' },
      { date: '2026-09-05', type: 'compra', ticker: 'CDB001', asset: 'CDB001', qty: 1, price: 50000, total: 50000, fees: 0, class: 'fixed' },
      { date: '2026-09-15', type: 'compra', ticker: 'HODL11', asset: 'HODL11', qty: 50, price: 60.0, total: 3000, fees: 10.0, class: 'crypto' },
      { date: '2026-10-01', type: 'compra', ticker: 'TAEE11', asset: 'TAEE11', qty: 40, price: 36.0, total: 1440, fees: 5.0, class: 'bdr' }
    ],
    earnings,
    fixedIncome: positions.filter(p => p.class === 'fixed').map(p => ({
      name: p.name, issuer: p.issuer, value: p.value, sector: p.sector || p.name,
      indexer: p.indexer, maturity: p.maturity
    })),
    goals: {
      allocation: { stocks: 15, fiis: 45, etfs: 25, fixed: 10, crypto: 5 },
      targetValue: 220000
    },
    reconciliation: {
      b3Total: total,
      backupTotal: total,
      gaps: []
    }
  };
})();
