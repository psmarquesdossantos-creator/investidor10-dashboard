// Demo data is synthetic and independent from local portfolio files.
(function () {
  const source = [
    { name: 'Empresa Sintética', class: 'stocks', category: 'stocks', sector: 'Exemplo', avgPrice: 10 },
    { name: 'Fundo Imobiliário Sintético', class: 'fiis', category: 'fiis', sector: 'Exemplo', avgPrice: 20 },
    { name: 'Título Sintético', class: 'fixed', category: 'fixed', sector: 'Exemplo', avgPrice: 100, issuer: 'Emissor Sintético', indexer: 'FIXO', maturity: '2030-12-31' },
    { name: 'Ativo Digital Sintético', class: 'crypto', category: 'crypto', sector: 'Exemplo', avgPrice: 5 },
    { name: 'Fundo Sintético', class: 'funds', category: 'funds', sector: 'Exemplo', avgPrice: 30 }
  ];
  const positions = Array.from({ length: 21 }, (_, i) => {
    const base = source[i % source.length];
    const id = `demo-${String(i + 1).padStart(2, '0')}`;
    const qty = 1 + (i % 4);
    const avgPrice = base.avgPrice + i;
    const currentPrice = avgPrice + 1 + (i % 3);
    const p = { ...base, id, ticker: `SYN-${base.class.toUpperCase()}-${String(i + 1).padStart(2, '0')}`, name: `${base.name} ${String(i + 1).padStart(2, '0')}`, qty, avgPrice, currentPrice };
    const invested = qty * avgPrice;
    const value = qty * currentPrice;
    const profit = value - invested;
    return { ...p, invested, current: value, value, profit, pl: profit, profitPct: invested ? profit / invested * 100 : 0, return: invested ? profit / invested * 100 : 0, weight: 0, allocation: 0 };
  });
  const total = positions.reduce((sum, p) => sum + p.value, 0);
  const invested = positions.reduce((sum, p) => sum + p.invested, 0);
  positions.forEach(p => { p.weight = total ? p.value / total * 100 : 0; p.allocation = p.weight; });
  const labels = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`);
  const portfolio = labels.map((_, i) => +(total * (0.9 + 0.1 * i / 11)).toFixed(2));
  const investedSeries = labels.map((_, i) => +(invested * (0.93 + 0.07 * i / 11)).toFixed(2));
  const classNames = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Criptos', funds: 'Fundos', other: 'Outros' };
  const colors = { Ações: '#3b82f6', FIIs: '#10b981', ETFs: '#8b5cf6', 'Renda Fixa': '#f59e0b', Criptos: '#ef4444', Fundos: '#06b6d4', Outros: '#64748b' };
  const sums = {};
  positions.forEach(p => { const name = classNames[p.class] || 'Outros'; sums[name] = (sums[name] || 0) + p.value; });
  const byClass = Object.entries(sums).map(([name, value]) => ({ name, value, pct: value / total * 100, color: colors[name] }));
  const earnings = positions.filter(p => p.class === 'fiis' || p.class === 'funds').slice(0, 5).map((p, i) => ({ date: `2025-${String(i + 1).padStart(2, '0')}-15`, asset: p.name, ticker: p.ticker, type: 'Rendimento', etype: 'Rendimento', qty: p.qty, perShare: 0.5 + i / 10, total: p.qty * (0.5 + i / 10), gross: p.qty * (0.5 + i / 10), tax: 0, net: p.qty * (0.5 + i / 10) }));
  const dividends = earnings.reduce((sum, item) => sum + item.net, 0);
  const portfolioReturn = (total / invested - 1) * 100;

  window.DEMO_FIXTURE = {
    meta: { source: 'demo', synthetic: true, version: '1', generatedAt: '2025-12-31', accounts: ['demo'] },
    kpis: { total, invested, profit: total - invested, totalChange: portfolioReturn, returnTotal: portfolioReturn, return12m: portfolioReturn, dividends, earnings12m: dividends, yield12m: dividends / total * 100, capitalGain: 0 },
    patrimony: { labels, portfolio, invested: investedSeries, cdi: labels.map((_, i) => 100 + i * 0.5), ibov: labels.map((_, i) => 100 + i * 0.4) },
    monthly: labels.map((period, i) => ({ period, invested: i ? investedSeries[i] - investedSeries[i - 1] : investedSeries[i], gain: i ? portfolio[i] - portfolio[i - 1] : portfolio[i] })),
    allocation: { byClass, byAsset: positions.map(p => ({ name: p.ticker, class: p.class, value: p.value, pct: p.weight, return: p.return })) },
    assetReturns: positions.map(p => ({ ticker: p.ticker, class: p.class, weight: p.weight, return: p.return, contrib: p.return * p.weight / 100, benchmark: portfolioReturn, alpha: p.return - portfolioReturn })),
    assets: positions.map(p => ({ id: p.id, ticker: p.ticker, name: p.name, category: p.category, class: p.class, sector: p.sector, qty: p.qty, avgPrice: p.avgPrice, currentPrice: p.currentPrice, target: p.currentPrice, idealPerc: p.weight, divMonth: 12, issuer: p.issuer || '', indexer: p.indexer || '', maturity: p.maturity || '' })),
    positions,
    entries: positions.slice(0, 12).map((p, i) => ({ date: `2025-${String(i + 1).padStart(2, '0')}-15`, type: i % 3 === 0 ? 'sell' : 'buy', ticker: p.ticker, asset: p.name, qty: 1, price: p.currentPrice, total: p.currentPrice, fees: 0, class: p.class })),
    earnings,
    fixedIncome: positions.filter(p => p.class === 'fixed').map(p => ({ name: p.name, issuer: p.issuer, value: p.value, sector: p.sector, indexer: p.indexer, maturity: p.maturity })),
    goals: { allocation: { Ações: 20, FIIs: 20, ETFs: 0, 'Renda Fixa': 20, Criptos: 20, Fundos: 20, Outros: 0 }, targetValue: total },
    reconciliation: { b3Total: total, backupTotal: total, gaps: [] }
  };
})();
