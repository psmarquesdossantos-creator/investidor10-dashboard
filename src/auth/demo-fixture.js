// src/auth/demo-fixture.js
// P12/P26: dataset 100% SINTÉTICO para o modo demonstração.
// Estrutura ESPELHA o perfil da carteira do dono (2026-10-17, a pedido):
// 37 ativos — 7 ações, 24 FIIs, 4 renda fixa, 1 fundo, 1 cripto, caixa —
// FII-heavy com proventos mensais. TICKERS/NOMES/VALORES 100% FICTÍCIOS:
// NENHUM valor real é derivado da carteira real (regra P26).
// Total determinístico: 30000.00 (caixa absorve o resto).
(function () {
  'use strict';

  const raw = [
    // ===== Ações (7) — ~7% da carteira, perfil do dono =====
    { ticker: 'ALFA4', name: 'AlfaInd PN', class: 'stocks', category: 'acao', sector: 'Indústria', qty: 150, avgPrice: 22.00, currentPrice: 24.80 },
    { ticker: 'BETA3', name: 'BetaSA ON', class: 'stocks', category: 'acao', sector: 'Varejo', qty: 200, avgPrice: 15.50, currentPrice: 16.90 },
    { ticker: 'GAMM4', name: 'GammaEnerg PN', class: 'stocks', category: 'acao', sector: 'Energia', qty: 120, avgPrice: 30.00, currentPrice: 32.40 },
    { ticker: 'DELT3', name: 'DeltaBanc ON', class: 'stocks', category: 'acao', sector: 'Bancos', qty: 100, avgPrice: 25.00, currentPrice: 26.50 },
    { ticker: 'EPSL4', name: 'EpsilonTech PN', class: 'stocks', category: 'acao', sector: 'Tecnologia', qty: 180, avgPrice: 12.00, currentPrice: 13.10 },
    { ticker: 'ZETB3', name: 'ZetaTel ON', class: 'stocks', category: 'acao', sector: 'Telecom', qty: 90, avgPrice: 18.00, currentPrice: 19.20 },
    { ticker: 'KAPP4', name: 'KappaSul PN', class: 'stocks', category: 'acao', sector: 'Saneamento', qty: 130, avgPrice: 11.00, currentPrice: 11.90 },
    // ===== FIIs (24) — ~48%, núcleo da carteira =====
    { ticker: 'ALFA11', name: 'AlphaCorp Logística', class: 'fiis', category: 'fii', sector: 'Logística', qty: 60, avgPrice: 98.50, currentPrice: 104.20 },
    { ticker: 'DALF11', name: 'DemoAlfa Shoppings', class: 'fiis', category: 'fii', sector: 'Shoppings', qty: 50, avgPrice: 85.00, currentPrice: 89.30 },
    { ticker: 'DBET11', name: 'DemoBeta Renda', class: 'fiis', category: 'fii', sector: 'Carteira', qty: 200, avgPrice: 9.20, currentPrice: 9.85 },
    { ticker: 'DGAM11', name: 'DemoGamma Papel', class: 'fiis', category: 'fii', sector: 'Papel', qty: 80, avgPrice: 115.00, currentPrice: 119.40 },
    { ticker: 'DDEL11', name: 'DemoDelta Híbrido', class: 'fiis', category: 'fii', sector: 'Híbrido', qty: 40, avgPrice: 128.00, currentPrice: 132.70 },
    { ticker: 'DEPS11', name: 'DemoEpsilon Lajes', class: 'fiis', category: 'fii', sector: 'Lajes Corporativas', qty: 70, avgPrice: 95.00, currentPrice: 98.60 },
    { ticker: 'DZET11', name: 'DemoZeta Recebíveis', class: 'fiis', category: 'fii', sector: 'Recebíveis', qty: 150, avgPrice: 10.10, currentPrice: 10.70 },
    { ticker: 'DKAP11', name: 'DemoKappa Imobiliário', class: 'fiis', category: 'fii', sector: 'Imobiliário', qty: 90, avgPrice: 72.00, currentPrice: 75.20 },
    { ticker: 'DSIG11', name: 'DemoSigma Fundos', class: 'fiis', category: 'fii', sector: 'Fundo de Fundos', qty: 110, avgPrice: 8.50, currentPrice: 9.05 },
    { ticker: 'DOMG11', name: 'DemoOmega CRI', class: 'fiis', category: 'fii', sector: 'Títulos', qty: 65, avgPrice: 102.00, currentPrice: 106.10 },
    { ticker: 'DTET11', name: 'DemoTeta Log', class: 'fiis', category: 'fii', sector: 'Logística', qty: 55, avgPrice: 88.00, currentPrice: 91.50 },
    { ticker: 'DIOT11', name: 'DemoIota Interiors', class: 'fiis', category: 'fii', sector: 'Lajes Corporativas', qty: 75, avgPrice: 68.00, currentPrice: 70.90 },
    { ticker: 'DRHO11', name: 'DemoRho Residential', class: 'fiis', category: 'fii', sector: 'Residencial', qty: 85, avgPrice: 52.00, currentPrice: 54.30 },
    { ticker: 'DTHW11', name: 'DemoTheta Towers', class: 'fiis', category: 'fii', sector: 'Logística', qty: 45, avgPrice: 118.00, currentPrice: 121.80 },
    { ticker: 'DXIP11', name: 'DemoXi Prédios', class: 'fiis', category: 'fii', sector: 'Imobiliário', qty: 95, avgPrice: 14.20, currentPrice: 15.00 },
    { ticker: 'DNOV11', name: 'DemoNovo Regionais', class: 'fiis', category: 'fii', sector: 'Regional', qty: 120, avgPrice: 7.80, currentPrice: 8.30 },
    { ticker: 'DLUN11', name: 'DemoLuna Parks', class: 'fiis', category: 'fii', sector: 'Shoppings', qty: 60, avgPrice: 92.00, currentPrice: 95.40 },
    { ticker: 'DSOL11', name: 'DemoSolar Energy', class: 'fiis', category: 'fii', sector: 'Energia', qty: 100, avgPrice: 11.50, currentPrice: 12.10 },
    { ticker: 'DMAR11', name: 'DemoMar Ports', class: 'fiis', category: 'fii', sector: 'Logística', qty: 50, avgPrice: 99.00, currentPrice: 102.50 },
    { ticker: 'DVNT11', name: 'DemoVentus Agro', class: 'fiis', category: 'fii', sector: 'Agro', qty: 70, avgPrice: 60.00, currentPrice: 62.40 },
    { ticker: 'DTEC11', name: 'DemoTech Data Centers', class: 'fiis', category: 'fii', sector: 'Data Centers', qty: 40, avgPrice: 130.00, currentPrice: 135.20 },
    { ticker: 'DSAU11', name: 'DemoSaúde Hospitais', class: 'fiis', category: 'fii', sector: 'Saúde', qty: 80, avgPrice: 48.00, currentPrice: 50.10 },
    { ticker: 'DENC11', name: 'DemoEnce Garagens', class: 'fiis', category: 'fii', sector: 'Imobiliário', qty: 130, avgPrice: 6.90, currentPrice: 7.35 },
    // ===== Renda Fixa (4) — ~29% =====
    { ticker: 'CDBD1', name: 'CDB Banco Demo 2029', class: 'fixed', category: 'rf', sector: 'CDB', qty: 1, avgPrice: 14000, currentPrice: 14950, issuer: 'Banco Demo', indexer: 'CDI 110%', maturity: '2029-06-15' },
    { ticker: 'LCID2', name: 'LCI Banco Demo', class: 'fixed', category: 'rf', sector: 'LCI', qty: 1, avgPrice: 9000, currentPrice: 9580, issuer: 'Banco Demo', indexer: '95% CDI', maturity: '2028-03-10' },
    { ticker: 'CRID3', name: 'CRI Demo Infra', class: 'fixed', category: 'rf', sector: 'CRI', qty: 1, avgPrice: 7500, currentPrice: 8010, issuer: 'Demo Infra', indexer: 'IPCA+5,5%', maturity: '2029-01-10' },
    { ticker: 'TESD4', name: 'Tesouro IPCA+ Demo 2035', class: 'fixed', category: 'rf', sector: 'Tesouro', qty: 1, avgPrice: 3200, currentPrice: 3410, issuer: 'Tesouro Demo', indexer: 'IPCA+6%', maturity: '2035-05-15' },
    // ===== Fundos (1) — ~13% =====
    { ticker: 'FUND1', name: 'AlfaGest FIC Renda Fixa Demo', class: 'funds', category: 'fundos', sector: 'Fundo de Investimento', qty: 260, avgPrice: 58.00, currentPrice: 61.95, issuer: 'AlfaGest Demo', indexer: 'DI 90%', maturity: '' },
    // ===== Cripto (1) =====
    { ticker: 'KAPA6', name: 'KriptoKapa Demo', class: 'crypto', category: 'cripto', sector: 'Criptoativo', qty: 3, avgPrice: 68.00, currentPrice: 67.90 }
  ];

  // ===== Escala proporcional determinística (perfil do dono, valores fictícios) =====
  // Distribuição-alvo por classe (espelha o PERFIL real, nunca os valores):
  // FIIs ~46% · RF ~24% · Fundos ~13% · Ações ~10% · Cripto ~0,2% · caixa ~7%
  const TARGET_TOTAL = 30000.00;
  const CLASS_SHARE = { stocks: 0.10, fiis: 0.46, fixed: 0.24, funds: 0.13, crypto: 0.002 };
  Object.entries(CLASS_SHARE).forEach(([cls, share]) => {
    const items = raw.filter(p => p.class === cls);
    if (!items.length) return;
    const currentSum = items.reduce((s, p) => s + p.qty * p.currentPrice, 0);
    const f = (TARGET_TOTAL * share) / currentSum;
    items.forEach(p => {
      if (cls === 'fixed') {
        // RF: qty 1 — escala o preço unitário (mantém forma de título)
        p.avgPrice = +(p.avgPrice * f).toFixed(2);
        p.currentPrice = +(p.currentPrice * f).toFixed(2);
      } else {
        p.qty = Math.max(1, Math.round(p.qty * f));
      }
    });
  });

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

  // Caixa Demo absorve o resto da escala → total determinístico 30000.00
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

  // ===== Proventos mensais fictícios (perfil FII-heavy do dono) =====
  // 24 FIIs pagando em meses alternados + ações com dividendo/JCP
  const divPerShare = { ALFA11: 1.10, DALF11: 0.90, DBET11: 0.09, DGAM11: 1.15, DDEL11: 1.05, DEPS11: 0.85, DZET11: 0.10, DKAP11: 0.72, DSIG11: 0.08, DOMG11: 0.95, DTET11: 0.88, DIOT11: 0.65, DRHO11: 0.52, DTHW11: 1.20, DXIP11: 0.14, DNOV11: 0.07, DLUN11: 0.93, DSOL11: 0.12, DMAR11: 1.02, DVNT11: 0.60, DTEC11: 1.35, DSAU11: 0.48, DENC11: 0.065, ALFA4: 0.55, BETA3: 0.35, GAMM4: 0.80, ZETB3: 0.45 };
  const posByTicker = {};
  positions.forEach(p => { posByTicker[p.ticker] = p; });
  const rawEarnings = [];
  const months = [['2026-04', '15'], ['2026-05', '15'], ['2026-06', '15'], ['2026-07', '15'], ['2026-08', '15'], ['2026-09', '15'], ['2026-10', '15']];
  Object.entries(divPerShare).forEach(([ticker, perShare], idx) => {
    const pos = posByTicker[ticker];
    if (!pos) return;
    const isFii = pos.class === 'fiis';
    // FIIs: mensal (últimos 7 meses); ações: trimestral (3 pagamentos)
    const payMonths = isFii ? months : [months[1], months[3], months[5]];
    payMonths.forEach(([ym, day], k) => {
      const date = `${ym}-${day}`;
      const gross = +(pos.qty * perShare).toFixed(2);
      const isJcp = !isFii && k === 1;
      rawEarnings.push({
        date, asset: ticker, ticker,
        type: isFii ? 'Rendimento' : (isJcp ? 'JCP' : 'Dividendo'),
        etype: isFii ? 'rendimento' : (isJcp ? 'jcp' : 'dividend'),
        qty: pos.qty, perShare, total: gross
      });
    });
  });
  const earnings = rawEarnings
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ ...e, gross: e.total, tax: 0, net: e.total }));

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

  const classNameMap = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Criptos', bdr: 'Outros', funds: 'Fundos', other: 'Outros' };
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
    meta: { source: 'demo', version: '15.1.0', generatedAt: '2026-10-17T00:00:00Z', accounts: ['Conta Demo'] },
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
      { date: '2026-01-20', type: 'compra', ticker: 'ALFA4', asset: 'ALFA4', qty: 150, price: 22.00, total: 3300, fees: 5, class: 'stocks' },
      { date: '2026-02-15', type: 'compra', ticker: 'ALFA11', asset: 'ALFA11', qty: 60, price: 98.50, total: 5910, fees: 10, class: 'fiis' },
      { date: '2026-03-10', type: 'compra', ticker: 'DGAM11', asset: 'DGAM11', qty: 80, price: 115.00, total: 9200, fees: 10, class: 'fiis' },
      { date: '2026-04-22', type: 'compra', ticker: 'CDBD1', asset: 'CDBD1', qty: 1, price: 14000, total: 14000, fees: 0, class: 'fixed' },
      { date: '2026-05-30', type: 'compra', ticker: 'DSIG11', asset: 'DSIG11', qty: 110, price: 8.50, total: 935, fees: 10, class: 'fiis' },
      { date: '2026-06-18', type: 'compra', ticker: 'FUND1', asset: 'FUND1', qty: 260, price: 58.00, total: 15080, fees: 0, class: 'funds' },
      { date: '2026-07-25', type: 'compra', ticker: 'LCID2', asset: 'LCID2', qty: 1, price: 9000, total: 9000, fees: 0, class: 'fixed' },
      { date: '2026-08-12', type: 'compra', ticker: 'DZET11', asset: 'DZET11', qty: 150, price: 10.10, total: 1515, fees: 10, class: 'fiis' },
      { date: '2026-09-08', type: 'compra', ticker: 'BETA3', asset: 'BETA3', qty: 200, price: 15.50, total: 3100, fees: 5, class: 'stocks' },
      { date: '2026-10-02', type: 'compra', ticker: 'DRHO11', asset: 'DRHO11', qty: 85, price: 52.00, total: 4420, fees: 10, class: 'fiis' }
    ],
    earnings,
    fixedIncome: positions.filter(p => (p.issuer || '').length).map(p => ({
      name: p.name, issuer: p.issuer, value: p.value, sector: p.sector,
      indexer: p.indexer, maturity: p.maturity
    })),
    goals: {
      allocation: { 'Ações': 10, 'FIIs': 45, 'ETFs': 0, 'Renda Fixa': 30, 'Criptos': 0, 'Fundos': 15, 'Outros': 0 },
      targetValue: 200000
    },
    reconciliation: { b3Total: total, backupTotal: total, gaps: [] }
  };
})();
