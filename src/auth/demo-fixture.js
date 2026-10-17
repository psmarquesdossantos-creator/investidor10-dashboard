// src/auth/demo-fixture.js
// P12/P26: dataset 100% SINTÉTICO para o modo demonstração.
// NUNCA derivar de carteira-data.js (dados reais) nem de carteira-data.sample.js.
// Tickers/nomes fictícios (AlphaCorp, BetaSA...). Total determinístico: 123456.78.
(function () {
  'use strict';

  const raw = [
    { ticker: 'TETA5', name: 'Título Tesoura Demo', class: 'fixed', category: 'rf', sector: 'CDB', qty: 1, avgPrice: 28000, currentPrice: 30000, issuer: 'Banco Demo', indexer: 'CDI 105%', maturity: '2029-06-15' },
    { ticker: 'IOTA3', name: 'Nota Iota Demo', class: 'fixed', category: 'rf', sector: 'LCI', qty: 1, avgPrice: 13500, currentPrice: 14600, issuer: 'Banco Demo', indexer: 'IPCA+5%', maturity: '2028-03-10' },
    { ticker: 'ALFA11', name: 'AlphaCorp Logística', class: 'fiis', category: 'fii', sector: 'Logística', qty: 120, avgPrice: 98.50, currentPrice: 104.20 },
    { ticker: 'BETA4', name: 'BetaSA PN', class: 'stocks', category: 'acao', sector: 'Varejo', qty: 300, avgPrice: 21.40, currentPrice: 23.75 },
    { ticker: 'GAMM3', name: 'GammaInd ON', class: 'stocks', category: 'acao', sector: 'Indústria', qty: 150, avgPrice: 44.90, currentPrice: 49.30 },
    { ticker: 'DELT11', name: 'DeltaImob Renda', class: 'fiis', category: 'fii', sector: 'Carteira', qty: 90, avgPrice: 118.00, currentPrice: 121.40 },
    { ticker: 'EPSL4', name: 'EpsilonTech PN', class: 'stocks', category: 'acao', sector: 'Tecnologia', qty: 200, avgPrice: 32.15, currentPrice: 35.60 },
    { ticker: 'ZETB11', name: 'ZetaFin Imobiliário', class: 'fiis', category: 'fii', sector: 'Híbrido', qty: 60, avgPrice: 145.00, currentPrice: 149.80 },
    { ticker: 'OMGA11', name: 'Omega Índice Demo', class: 'etfs', category: 'etf', sector: 'Índice', qty: 100, avgPrice: 62.00, currentPrice: 66.45 },
    { ticker: 'SIGM4', name: 'SigmaBanc PN', class: 'stocks', category: 'acao', sector: 'Bancos', qty: 250, avgPrice: 18.75, currentPrice: 20.10 },
    { ticker: 'KAPA6', name: 'KriptoKapa Demo', class: 'crypto', category: 'cripto', sector: 'Criptoativo', qty: 40, avgPrice: 95.00, currentPrice: 102.30 },
    { ticker: 'RHOB4', name: 'RhoBdr PN', class: 'bdr', category: 'bdr', sector: 'Internacional', qty: 80, avgPrice: 55.00, currentPrice: 57.55 },
    { ticker: 'FUND1', name: 'Trend Demo FIC Multimercado', class: 'funds', category: 'fundos', sector: 'Fundo de Investimento', qty: 300, avgPrice: 60.00, currentPrice: 61.95, issuer: 'Gestora Demo', indexer: 'DI 90%', maturity: '' }
  ];

  const positions = raw.map((p, i) => {
    const invested = +(p.qty * p.avgPrice).toFixed(2);
    const value = +(p.qty * p.currentPrice).toFixed(2);
    return {
      id: i + 1,
      ...p,
      invested,
      current: value,
      value,
      profit: +(value - invested).toFixed(2),
      profitPct: +((value / invested - 1) * 100).toFixed(2),
      return: +((value / invested - 1) * 100).toFixed(2),
      weight: 0,
      allocation: 0,
      pl: +(value - invested).toFixed(2)
    };
  });

  // Caixa Demo absorve o resto → total determinístico 123456.78
  const TARGET_TOTAL = 123456.78;
  const othersSum = +positions.reduce((s, p) => s + p.value, 0).toFixed(2);
  const cash = +(TARGET_TOTAL - othersSum).toFixed(2);
  positions.push({
    id: positions.length + 1,
    ticker: 'CAXA1', name: 'Caixa Demo', class: 'fixed', category: 'rf',
    sector: 'Caixa', qty: 1, avgPrice: cash, currentPrice: cash,
    invested: cash, current: cash, value: cash, profit: 0, profitPct: 0,
    return: 0, weight: 0, allocation: 0, pl: 0
  });

  const total = +positions.reduce((s, p) => s + p.value, 0).toFixed(2);
  const invested = +positions.reduce((s, p) => s + p.invested, 0).toFixed(2);
  positions.forEach(p => {
    p.weight = +(p.value / total * 100).toFixed(2);
    p.allocation = p.weight;
  });

  const rawEarnings = [
    { date: '2026-07-15', asset: 'ALFA11', type: 'Rendimento', etype: 'rendimento', qty: 120, perShare: 1.10, total: 132.00 },
    { date: '2026-08-10', asset: 'BETA4', type: 'Dividendo', etype: 'dividend', qty: 300, perShare: 0.35, total: 105.00 },
    { date: '2026-09-15', asset: 'DELT11', type: 'Rendimento', etype: 'rendimento', qty: 90, perShare: 0.95, total: 85.50 },
    { date: '2026-09-20', asset: 'GAMM3', type: 'Dividendo', etype: 'dividend', qty: 150, perShare: 0.80, total: 120.00 },
    { date: '2026-10-05', asset: 'OMGA11', type: 'Dividendo', etype: 'dividend', qty: 100, perShare: 0.50, total: 50.00 },
    { date: '2026-10-15', asset: 'ZETB11', type: 'Rendimento', etype: 'rendimento', qty: 60, perShare: 1.20, total: 72.00 }
  ];
  const earnings = rawEarnings.map(e => ({
    ...e,
    ticker: e.asset,
    gross: e.total,
    tax: 0,
    net: e.total
  }));

  const labels = [], portfolio = [], investedSeries = [], cdi = [], ibov = [];
  for (let i = 0; i < 12; i++) {
    const y = 2025 + Math.floor((10 + i) / 12);
    const m = (10 + i) % 12 + 1;
    labels.push(`${String(m).padStart(2, '0')}/${y}`);
    const t = i / 11;
    portfolio.push(+(105000 + (total - 105000) * t).toFixed(2));
    investedSeries.push(+(95000 + (invested - 95000) * t).toFixed(2));
    cdi.push(+(100 * Math.pow(1.0065, i)).toFixed(4));
    ibov.push(+(100 * (1 + 0.0105 * i + 0.011 * Math.sin(i))).toFixed(4));
  }

  const classNameMap = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Criptos', bdr: 'Outros', funds: 'Fundos' };
  const classColorMap = { 'Ações': '#1A73E8', 'FIIs': '#34A853', 'ETFs': '#F9AB00', 'Renda Fixa': '#3730A3', 'Criptos': '#9C27B0', 'Fundos': '#00ACC1', 'Outros': '#80868B' };
  const byClassAgg = {};
  positions.forEach(p => {
    const name = classNameMap[p.class] || 'Outros';
    byClassAgg[name] = (byClassAgg[name] || 0) + p.value;
  });
  const byClass = Object.entries(byClassAgg)
    .map(([name, v]) => ({ name, value: +v.toFixed(2), pct: +(v / total * 100).toFixed(1), color: classColorMap[name] }))
    .sort((a, b) => b.value - a.value);
  const byAsset = positions.map(p => ({ name: p.ticker, class: p.class, value: p.value, pct: p.weight, return: p.return }));
  const portfolioReturn = +((total / invested - 1) * 100).toFixed(2);
  const assetReturns = positions.map(p => ({
    ticker: p.ticker, class: p.class, weight: p.weight, return: p.return,
    contrib: +(p.return * p.value / total / 100).toFixed(3),
    benchmark: portfolioReturn, alpha: +(p.return - portfolioReturn).toFixed(2)
  }));

  const dividends = +earnings.reduce((s, e) => s + e.total, 0).toFixed(2);

  window.DEMO_FIXTURE = {
    meta: { source: 'demo', version: '15.0.0', generatedAt: '2026-10-16T00:00:00Z', accounts: ['Conta Demo'] },
    kpis: {
      total,
      invested,
      profit: +(total - invested).toFixed(2),
      totalChange: +((total / invested - 1) * 100).toFixed(2),
      returnTotal: +((total / invested - 1) * 100).toFixed(2),
      return12m: +((total / invested - 1) * 100).toFixed(2),
      dividends,
      earnings12m: dividends,
      yield12m: +(dividends / total * 100).toFixed(2),
      capitalGain: 0
    },
    patrimony: { labels, portfolio, invested: investedSeries, cdi, ibov },
    monthly: labels.map((period, i) => ({
      period,
      invested: +(investedSeries[i] - (investedSeries[i - 1] || 0)).toFixed(2),
      gain: +(portfolio[i] - (portfolio[i - 1] || 0)).toFixed(2)
    })),
    allocation: { byClass, byAsset },
    assetReturns,
    assets: positions.map(p => ({
      id: p.id, ticker: p.ticker, name: p.name, category: p.category, class: p.class,
      sector: p.sector, qty: p.qty, avgPrice: p.avgPrice, currentPrice: p.currentPrice,
      target: +(p.currentPrice * 1.05).toFixed(2), idealPerc: p.weight, divMonth: 0,
      issuer: p.issuer, indexer: p.indexer, maturity: p.maturity
    })),
    positions,
    entries: [
      { date: '2026-01-20', type: 'compra', ticker: 'BETA4', asset: 'BETA4', qty: 300, price: 21.40, total: 6420, fees: 5, class: 'stocks' },
      { date: '2026-02-15', type: 'compra', ticker: 'ALFA11', asset: 'ALFA11', qty: 120, price: 98.50, total: 11820, fees: 10, class: 'fiis' },
      { date: '2026-03-10', type: 'compra', ticker: 'GAMM3', asset: 'GAMM3', qty: 150, price: 44.90, total: 6735, fees: 5, class: 'stocks' },
      { date: '2026-04-22', type: 'compra', ticker: 'DELT11', asset: 'DELT11', qty: 90, price: 118.00, total: 10620, fees: 10, class: 'fiis' },
      { date: '2026-05-30', type: 'compra', ticker: 'TETA5', asset: 'TETA5', qty: 1, price: 28000, total: 28000, fees: 0, class: 'fixed' },
      { date: '2026-06-18', type: 'compra', ticker: 'OMGA11', asset: 'OMGA11', qty: 100, price: 62.00, total: 6200, fees: 10, class: 'etfs' }
    ],
    earnings,
    fixedIncome: positions.filter(p => (p.issuer || '').length).map(p => ({
      name: p.name, issuer: p.issuer, value: p.value, sector: p.sector,
      indexer: p.indexer, maturity: p.maturity
    })),
    goals: {
      allocation: { 'Ações': 25, 'FIIs': 30, 'ETFs': 8, 'Renda Fixa': 31, 'Criptos': 3, 'Fundos': 3, 'Outros': 0 },
      targetValue: 150000
    },
    reconciliation: { b3Total: total, backupTotal: total, gaps: [] }
  };
})();
