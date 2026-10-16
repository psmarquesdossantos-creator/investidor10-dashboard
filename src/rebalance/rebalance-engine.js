// src/rebalance/rebalance-engine.js
// FASE 4: Rebalance Engine Avançado
// Solver JS com restrições: lotes mínimos, custo transação, IR, limites setoriais
// Sugestão de ordens: comprar/vender para atingir target ± tolerância
// Integração com metas de alocação por classe (CARTEIRA_META.goals.allocation)

(function() {
  'use strict';

  // Configuração padrão
  const DEFAULT_CONFIG = {
    tolerancePct: 2.0,        // Tolerância ±2% do target
    minLotSize: 1,            // Lote mínimo (ações=1, FIIs=1, ETFs=1)
    transactionCostPct: 0.005, // 0.5% custo transação (corretagem + emolumentos)
    taxRate: 0.15,            // 15% IR sobre ganho de capital
    maxSectorPct: 30,         // Limite setorial máximo 30%
    maxAssetPct: 15,          // Limite por ativo 15%
    minTradeValue: 50,        // Valor mínimo de operação R$ 50
    allowFractional: false,   // Permitir fracionário (para ETFs/FIIs)
    preferSellFirst: true     // Prefere vender antes de comprar (caixa)
  };

  // Metas de alocação por classe (de CARTEIRA_META.goals.allocation ou derivadas)
  function getAllocationTargets(positions, meta) {
    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    
    // Se há metas explícitas no CARTEIRA_META.goals.allocation
    if (meta?.goals?.allocation) {
      const targets = {};
      for (const [label, pct] of Object.entries(meta.goals.allocation)) {
        const classMap = {
          'FII': 'fiis', 'FIIs': 'fiis',
          'ETF': 'etfs', 'ETFs': 'etfs',
          'Ação': 'stocks', 'Ações': 'stocks',
          'Renda Fixa': 'fixed', 'Renda Fixa': 'fixed',
          'Cripto': 'crypto', 'BDR': 'bdr', 'BDRs': 'bdr',
          'Outros': 'other'
        };
        const cls = classMap[label] || label.toLowerCase();
        targets[cls] = pct;
      }
      // Normaliza para 100%
      const sum = Object.values(targets).reduce((a, b) => a + b, 0);
      for (const k of Object.keys(targets)) targets[k] = targets[k] / sum * 100;
      return targets;
    }
    
    // Fallback: alocação atual arredondada a 5% (comportamento atual)
    const byClass = {};
    positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });
    const classes = Object.keys(byClass);
    let rawTargets = classes.map(c => ({ c, pct: byClass[c] / total * 100 }));
    const rounded = rawTargets.map(r => ({ ...r, target: Math.round(r.pct / 5) * 5 }));
    const sumT = rounded.reduce((s, r) => s + r.target, 0);
    if (sumT !== 100 && rounded.length) {
      const biggest = rounded.reduce((a, b) => (b.pct > a.pct ? b : a));
      biggest.target += (100 - sumT);
    }
    const targets = {};
    rounded.forEach(r => targets[r.c] = r.target);
    return targets;
  }

  // Calcula alocação atual por classe
  function getCurrentAllocation(positions) {
    const total = positions.reduce((s, p) => s + (p.value || 0), 0);
    const byClass = {};
    positions.forEach(p => { byClass[p.class] = (byClass[p.class] || 0) + (p.value || 0); });
    const result = {};
    for (const [cls, value] of Object.entries(byClass)) {
      result[cls] = { value, pct: total > 0 ? value / total * 100 : 0 };
    }
    return { total, byClass: result };
  }

  // Calcula drift por ativo
  function calculateAssetDrift(positions, targetAllocation, config) {
    const current = getCurrentAllocation(positions);
    const results = [];
    
    for (const pos of positions) {
      const cls = pos.class;
      const targetClsPct = targetAllocation[cls] || 0;
      const currentClsPct = current.byClass[cls]?.pct || 0;
      const clsDrift = currentClsPct - targetClsPct;
      
      // Drift do ativo dentro da classe
      const assetPct = current.total > 0 ? pos.value / current.total * 100 : 0;
      const targetAssetPct = targetClsPct * (pos.value / (current.byClass[cls]?.value || pos.value));
      const assetDrift = assetPct - targetAssetPct;
      
      results.push({
        ...pos,
        currentPct: assetPct,
        targetPct: targetAssetPct,
        drift: assetDrift,
        driftValue: current.total * assetDrift / 100,
        classDrift: clsDrift,
        classTargetPct: targetClsPct,
        classCurrentPct: currentClsPct
      });
    }
    
    return results;
  }

  // Solver: Sugere ordens para atingir target
  function suggestOrders(assetsWithDrift, config) {
    const orders = [];
    
    // Separa ativos para vender (drift > tolerância) e comprar (drift < -tolerância)
    const toSell = assetsWithDrift
      .filter(a => a.drift > config.tolerancePct)
      .sort((a, b) => b.driftValue - a.driftValue); // Maior drift primeiro
    
    const toBuy = assetsWithDrift
      .filter(a => a.drift < -config.tolerancePct)
      .sort((a, b) => a.driftValue - b.driftValue); // Menor drift primeiro (mais negativo)
    
    // Calcula caixa disponível (vendas - custos)
    let availableCash = 0;
    
    // Processa vendas
    for (const asset of toSell) {
      const excessPct = asset.drift - config.tolerancePct;
      const excessValue = asset.value * excessPct / 100;
      
      // Ajusta para lote mínimo
      const qtyToSell = Math.floor(excessValue / asset.currentPrice / config.minLotSize) * config.minLotSize;
      if (qtyToSell < config.minLotSize) continue;
      
      const sellValue = qtyToSell * asset.currentPrice;
      const cost = sellValue * config.transactionCostPct;
      const netValue = sellValue - cost;
      
      // Calcula IR se houver ganho
      const avgCost = asset.avgPrice || asset.currentPrice;
      const gainPerUnit = asset.currentPrice - avgCost;
      const totalGain = gainPerUnit * qtyToSell;
      const tax = totalGain > 0 ? totalGain * config.taxRate : 0;
      const netAfterTax = netValue - tax;
      
      if (sellValue < config.minTradeValue) continue;
      
      orders.push({
        action: 'SELL',
        ticker: asset.ticker,
        name: asset.name,
        class: asset.class,
        qty: qtyToSell,
        price: asset.currentPrice,
        grossValue: sellValue,
        cost,
        tax,
        netValue: netAfterTax,
        reason: `Excesso ${excessPct.toFixed(2)}pp acima do target (${config.tolerancePct}% tolerância)`,
        priority: excessValue
      });
      
      availableCash += netAfterTax;
    }
    
    // Processa compras
    for (const asset of toBuy) {
      const neededPct = -asset.drift - config.tolerancePct;
      const neededValue = (asset.classTargetPct * asset.classCurrentTotal / 100) * neededPct / 100;
      
      // Ajusta para lote mínimo
      const qtyToBuy = Math.floor(neededValue / asset.currentPrice / config.minLotSize) * config.minLotSize;
      if (qtyToBuy < config.minLotSize) continue;
      
      const buyValue = qtyToBuy * asset.currentPrice;
      const cost = buyValue * config.transactionCostPct;
      const totalCost = buyValue + cost;
      
      if (totalCost < config.minTradeValue) continue;
      if (totalCost > availableCash) {
        // Ajusta quantidade para caber no caixa
        const maxQty = Math.floor((availableCash / (1 + config.transactionCostPct)) / asset.currentPrice / config.minLotSize) * config.minLotSize;
        if (maxQty < config.minLotSize) continue;
        const adjustedBuyValue = maxQty * asset.currentPrice;
        const adjustedCost = adjustedBuyValue * config.transactionCostPct;
        orders.push({
          action: 'BUY',
          ticker: asset.ticker,
          name: asset.name,
          class: asset.class,
          qty: maxQty,
          price: asset.currentPrice,
          grossValue: adjustedBuyValue,
          cost: adjustedCost,
          tax: 0,
          netValue: -(adjustedBuyValue + adjustedCost),
          reason: `Déficit ${neededPct.toFixed(2)}pp abaixo do target (ajustado para caixa disponível)`,
          priority: neededValue
        });
        availableCash -= (adjustedBuyValue + adjustedCost);
      } else {
        orders.push({
          action: 'BUY',
          ticker: asset.ticker,
          name: asset.name,
          class: asset.class,
          qty: qtyToBuy,
          price: asset.currentPrice,
          grossValue: buyValue,
          cost,
          tax: 0,
          netValue: -totalCost,
          reason: `Déficit ${neededPct.toFixed(2)}pp abaixo do target`,
          priority: neededValue
        });
        availableCash -= totalCost;
      }
    }
    
    // Ordena por prioridade (maior impacto primeiro)
    orders.sort((a, b) => b.priority - a.priority);
    
    return {
      orders,
      summary: {
        totalSells: orders.filter(o => o.action === 'SELL').length,
        totalBuys: orders.filter(o => o.action === 'BUY').length,
        totalSellValue: orders.filter(o => o.action === 'SELL').reduce((s, o) => s + o.grossValue, 0),
        totalBuyValue: orders.filter(o => o.action === 'BUY').reduce((s, o) => s + o.grossValue, 0),
        totalCosts: orders.reduce((s, o) => s + o.cost, 0),
        totalTax: orders.reduce((s, o) => s + o.tax, 0),
        netCashFlow: orders.reduce((s, o) => s + o.netValue, 0),
        remainingCash: availableCash
      }
    };
  }

  // Verifica restrições setoriais e por ativo
  function checkConstraints(orders, positions, config) {
    const violations = [];
    const newPositions = { ...positions };
    
    // Aplica ordens simuladas
    for (const order of orders) {
      const pos = newPositions.find(p => p.ticker === order.ticker);
      if (!pos) continue;
      
      if (order.action === 'SELL') {
        pos.qty -= order.qty;
        pos.value -= order.grossValue;
      } else {
        pos.qty += order.qty;
        pos.value += order.grossValue;
      }
    }
    
    const total = Object.values(newPositions).reduce((s, p) => s + (p.value || 0), 0);
    
    // Verifica limite por ativo
    for (const pos of Object.values(newPositions)) {
      const pct = total > 0 ? pos.value / total * 100 : 0;
      if (pct > config.maxAssetPct) {
        violations.push({
          type: 'MAX_ASSET_PCT',
          ticker: pos.ticker,
          current: pct.toFixed(2) + '%',
          limit: config.maxAssetPct + '%'
        });
      }
    }
    
    // Verifica limite setorial (precisa de mapeamento setor)
    const bySector = {};
    for (const pos of Object.values(newPositions)) {
      const sector = pos.sector || 'Outros';
      bySector[sector] = (bySector[sector] || 0) + (pos.value || 0);
    }
    
    for (const [sector, value] of Object.entries(bySector)) {
      const pct = total > 0 ? value / total * 100 : 0;
      if (pct > config.maxSectorPct) {
        violations.push({
          type: 'MAX_SECTOR_PCT',
          sector,
          current: pct.toFixed(2) + '%',
          limit: config.maxSectorPct + '%'
        });
      }
    }
    
    return violations;
  }

  // Engine principal
  function runRebalanceEngine(positions, meta, userConfig = {}) {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const targetAllocation = getAllocationTargets(positions, meta);
    const assetsWithDrift = calculateAssetDrift(positions, targetAllocation, config);
    
    // Adiciona info de classe para cada ativo
    const classTotals = {};
    positions.forEach(p => { 
      classTotals[p.class] = (classTotals[p.class] || 0) + (p.value || 0);
    });
    
    const assetsWithClassInfo = assetsWithDrift.map(a => ({
      ...a,
      classTargetPct: targetAllocation[a.class] || 0,
      classCurrentTotal: classTotals[a.class] || 0
    }));
    
    const { orders, summary } = suggestOrders(assetsWithClassInfo, config);
    const violations = checkConstraints(orders, positions, config);
    
    return {
      config,
      targetAllocation,
      currentAllocation: getCurrentAllocation(positions),
      assetsWithDrift: assetsWithClassInfo,
      orders,
      summary,
      violations,
      timestamp: new Date().toISOString()
    };
  }

  // Renderiza resultado no painel
  function renderRebalanceResult(result) {
    const container = document.getElementById('rebalanceResult');
    if (!container) return;
    
    const { orders, summary, violations, targetAllocation, currentAllocation } = result;
    
    let html = `
      <div class="rebalance-summary">
        <div class="summary-cards">
          <div class="card"><strong>${summary.totalSells}</strong> Vendas</div>
          <div class="card"><strong>${summary.totalBuys}</strong> Compras</div>
          <div class="card">Vendas: <strong>${fmtBRL(summary.totalSellValue)}</strong></div>
          <div class="card">Compras: <strong>${fmtBRL(summary.totalBuyValue)}</strong></div>
          <div class="card">Custos: <strong>${fmtBRL(summary.totalCosts)}</strong></div>
          <div class="card">IR: <strong>${fmtBRL(summary.totalTax)}</strong></div>
          <div class="card">Caixa líquido: <strong class="${summary.netCashFlow >= 0 ? 'positive' : 'negative'}">${fmtBRL(summary.netCashFlow)}</strong></div>
          <div class="card">Caixa remanescente: <strong>${fmtBRL(summary.remainingCash)}</strong></div>
        </div>
    `;
    
    if (violations.length > 0) {
      html += `
        <div class="violations warning">
          <h4>⚠️ Restrições violadas:</h4>
          <ul>${violations.map(v => `<li>${v.type}: ${v.ticker || v.sector} - ${v.current} > ${v.limit}</li>`).join('')}</ul>
        </div>
      `;
    }
    
    html += `
        <table class="data-table">
          <thead>
            <tr>
              <th>Ação</th><th>Ativo</th><th>Classe</th>
              <th>Qtde</th><th>Preço</th><th>Valor Bruto</th>
              <th>Custos</th><th>IR</th><th>Valor Líquido</th><th>Motivo</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (const order of result.orders) {
      html += `
        <tr class="${order.action === 'SELL' ? 'sell-row' : 'buy-row'}">
          <td><span class="badge badge-${order.action === 'SELL' ? 'error' : 'success'}">${order.action}</span></td>
          <td><span class="asset-ticker">${order.ticker}</span> ${order.name}</td>
          <td><span class="asset-class ${order.class}">${order.class}</span></td>
          <td class="text-right">${order.qty.toLocaleString('pt-BR')}</td>
          <td class="text-right">${fmtBRL(order.price)}</td>
          <td class="text-right">${fmtBRL(order.grossValue)}</td>
          <td class="text-right">${fmtBRL(order.cost)}</td>
          <td class="text-right">${fmtBRL(order.tax)}</td>
          <td class="text-right ${order.netValue >= 0 ? 'positive' : 'negative'}">${fmtBRL(order.netValue)}</td>
          <td class="text-muted small">${order.reason}</td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
  }

  // Formatters
  const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v, d = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = v => `${Number(v || 0) >= 0 ? '+' : ''}${fmtNum(v)}%`;

  // Expõe API
  window.RebalanceEngine = {
    DEFAULT_CONFIG,
    run: runRebalanceEngine,
    render: renderRebalanceResult,
    getAllocationTargets,
    getCurrentAllocation,
    calculateAssetDrift,
    suggestOrders,
    checkConstraints,
    fmtBRL,
    fmtNum,
    fmtPct
  };

})();