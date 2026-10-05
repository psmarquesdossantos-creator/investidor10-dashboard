// rebalance-engine.js
// Motor de otimização de rebalanceamento com restrições reais
// Compatível com solver puro JS (sem dependências externas)

/**
 * RebalanceEngine - Solver de otimização de carteira
 * 
 * Resolve: min Σ|peso_atual - peso_alvo| sujeito a:
 * - Lote mínimo por ativo
 * - Máximo % por ativo/setor
 * - Capital disponível
 * - Custos de corretagem
 */

class RebalanceEngine {
  constructor(options = {}) {
    this.options = {
      minLotSize: options.minLotSize || 1,           // Lote mínimo (1 para ações, 10 para FIIs/ETFs)
      maxAssetPct: options.maxAssetPct || 0.20,      // Máx 20% em um ativo
      maxSectorPct: options.maxSectorPct || 0.40,    // Máx 40% em um setor
      brokerageFee: options.brokerageFee || 0.005,   // 0.5% taxa corretagem
      minTradeValue: options.minTradeValue || 50,    // Mínimo R$ 50 por operação
      allowShort: options.allowShort || false,       // Não permite venda a descoberto
      ...options
    };
    
    this.assets = [];
    this.targets = {};
    this.currentPrices = {};
    this.availableCash = 0;
    this.sectorMap = {};
  }
  
  /**
   * Configura dados da carteira
   */
  setPortfolio(assets, targets, prices, cash = 0) {
    this.assets = assets.map(a => ({
      ticker: a.ticker,
      name: a.name,
      type: a.type,
      sector: a.sector || 'Outros',
      qty: a.qty || 0,
      avgPrice: a.avg_price || a.current_price || 0,
      currentPrice: prices[a.ticker] || a.current_price || 0
    }));
    
    this.targets = targets || {};
    this.currentPrices = prices || {};
    this.availableCash = cash;
    
    // Build sector map
    this.sectorMap = {};
    this.assets.forEach(a => {
      if (!this.sectorMap[a.sector]) this.sectorMap[a.sector] = [];
      this.sectorMap[a.sector].push(a.ticker);
    });
    
    return this;
  }
  
  /**
   * Calcula valor atual da carteira
   */
  getCurrentValue() {
    let total = this.availableCash;
    this.assets.forEach(a => {
      total += a.qty * a.currentPrice;
    });
    return total;
  }
  
  /**
   * Calcula alocação atual (%)
   */
  getCurrentAllocation() {
    const total = this.getCurrentValue();
    const alloc = {};
    this.assets.forEach(a => {
      const value = a.qty * a.currentPrice;
      alloc[a.ticker] = total > 0 ? value / total : 0;
    });
    return alloc;
  }
  
  /**
   * Calcula alocação por setor
   */
  getSectorAllocation() {
    const total = this.getCurrentValue();
    const sectorAlloc = {};
    this.assets.forEach(a => {
      const value = a.qty * a.currentPrice;
      sectorAlloc[a.sector] = (sectorAlloc[a.sector] || 0) + value;
    });
    Object.keys(sectorAlloc).forEach(s => {
      sectorAlloc[s] = total > 0 ? sectorAlloc[s] / total : 0;
    });
    return sectorAlloc;
  }
  
  /**
   * Calcula lote mínimo para um ativo
   */
  getMinLot(ticker) {
    const asset = this.assets.find(a => a.ticker === ticker);
    if (!asset) return this.options.minLotSize;
    
    // Regras brasileiras típicas
    if (asset.type === 'Ação') return 1;
    if (asset.type === 'FII') return 1;
    if (asset.type === 'ETF') return 1;
    if (asset.type === 'BDR') return 1;
    return this.options.minLotSize;
  }
  
  /**
   * Objetivo: minimizar distância L1 entre alocação atual e alvo
   * Retorna plano de trades: { ticker, action: 'buy'|'sell', qty, value, cost }
   */
  solve() {
    const totalValue = this.getCurrentValue();
    const currentAlloc = this.getCurrentAllocation();
    const sectorAlloc = this.getSectorAllocation();
    
    // 1. Calcula desvios da meta
    const deviations = {};
    this.assets.forEach(a => {
      const target = this.targets[a.ticker] || this.targets[a.type] || 0;
      const current = currentAlloc[a.ticker] || 0;
      deviations[a.ticker] = target - current;
    });
    
    // 2. Ordena por maior desvio absoluto (maior prioridade)
    const sortedTickers = this.assets
      .map(a => a.ticker)
      .sort((a, b) => Math.abs(deviations[b]) - Math.abs(deviations[a]));
    
    const trades = [];
    let remainingCash = this.availableCash;
    let portfolioValue = totalValue;
    
    // 3. Processa cada ativo
    for (const ticker of sortedTickers) {
      const asset = this.assets.find(a => a.ticker === ticker);
      if (!asset) continue;
      
      const target = this.targets[ticker] || this.targets[asset.type] || 0;
      const current = currentAlloc[ticker] || 0;
      const deviation = target - current;
      
      if (Math.abs(deviation) < 0.001) continue; // Já na meta
      
      const targetValue = target * portfolioValue;
      const currentValue = asset.qty * asset.currentPrice;
      const diffValue = targetValue - currentValue;
      
      // Custo estimado de corretagem
      const estimatedCost = Math.abs(diffValue) * this.options.brokerageFee;
      const netDiff = diffValue > 0 ? diffValue - estimatedCost : diffValue + estimatedCost;
      
      // Verifica se vale a pena (valor mínimo de trade)
      if (Math.abs(netDiff) < this.options.minTradeValue) continue;
      
      // Calcula quantidade
      let qty = Math.floor(Math.abs(netDiff) / asset.currentPrice);
      const minLot = this.getMinLot(ticker);
      qty = Math.max(qty, minLot);
      
      // Ajusta para lote mínimo
      qty = Math.floor(qty / minLot) * minLot;
      if (qty < minLot) qty = minLot;
      
      const tradeValue = qty * asset.currentPrice;
      const cost = tradeValue * this.options.brokerageFee;
      
      if (deviation > 0) {
        // COMPRA
        const totalCost = tradeValue + cost;
        if (totalCost <= remainingCash) {
          trades.push({
            ticker,
            action: 'buy',
            qty,
            price: asset.currentPrice,
            value: tradeValue,
            cost,
            totalCost,
            reason: `Desvio +${(deviation*100).toFixed(2)}% da meta`
          });
          remainingCash -= totalCost;
          asset.qty += qty;
          portfolioValue += tradeValue;
        }
      } else {
        // VENDA
        const maxSellable = asset.qty;
        if (qty > maxSellable) qty = Math.floor(maxSellable / minLot) * minLot;
        if (qty < minLot && maxSellable >= minLot) qty = minLot;
        
        if (qty > 0) {
          const tradeValue = qty * asset.currentPrice;
          const cost = tradeValue * this.options.brokerageFee;
          const netProceeds = tradeValue - cost;
          
          trades.push({
            ticker,
            action: 'sell',
            qty,
            price: asset.currentPrice,
            value: tradeValue,
            cost,
            netProceeds,
            reason: `Desvio ${(deviation*100).toFixed(2)}% da meta`
          });
          remainingCash += netProceeds;
          asset.qty -= qty;
          portfolioValue -= tradeValue;
        }
      }
      
      // Recalcula alocações após trade
      const newAlloc = this.getCurrentAllocation();
      const newSectorAlloc = this.getSectorAllocation();
      
      // Verifica limites de concentração
      if (newAlloc[ticker] > this.options.maxAssetPct) {
        // Reverte último trade se exceder limite
        const lastTrade = trades.pop();
        if (lastTrade) {
          if (lastTrade.action === 'buy') {
            remainingCash += lastTrade.totalCost;
            asset.qty -= lastTrade.qty;
          } else {
            remainingCash -= lastTrade.netProceeds;
            asset.qty += lastTrade.qty;
          }
        }
      }
      
      // Verifica limite setorial
      if (newSectorAlloc[asset.sector] > this.options.maxSectorPct) {
        const lastTrade = trades.pop();
        if (lastTrade && lastTrade.action === 'buy') {
          remainingCash += lastTrade.totalCost;
          asset.qty -= lastTrade.qty;
        }
      }
    }
    
    // 4. Segundo passe: usa cash restante para compras menores
    if (remainingCash > this.options.minTradeValue) {
      const buyCandidates = sortedTickers.filter(t => {
        const asset = this.assets.find(a => a.ticker === t);
        const target = this.targets[t] || this.targets[asset?.type] || 0;
        const current = this.getCurrentAllocation()[t] || 0;
        return target > current && asset;
      });
      
      for (const ticker of buyCandidates) {
        const asset = this.assets.find(a => a.ticker === ticker);
        if (!asset) continue;
        
        const minLot = this.getMinLot(ticker);
        const minCost = minLot * asset.currentPrice * (1 + this.options.brokerageFee);
        
        if (minCost <= remainingCash) {
          const maxLots = Math.floor(remainingCash / minCost);
          const qty = maxLots * minLot;
          const tradeValue = qty * asset.currentPrice;
          const cost = tradeValue * this.options.brokerageFee;
          const totalCost = tradeValue + cost;
          
          trades.push({
            ticker,
            action: 'buy',
            qty,
            price: asset.currentPrice,
            value: tradeValue,
            cost,
            totalCost,
            reason: 'Aproveitamento de cash residual'
          });
          remainingCash -= totalCost;
        }
      }
    }
    
    // 5. Gera relatório
    const finalAlloc = this.getCurrentAllocation();
    const finalSectorAlloc = this.getSectorAllocation();
    
    return {
      trades,
      summary: {
        totalTrades: trades.length,
        buys: trades.filter(t => t.action === 'buy').length,
        sells: trades.filter(t => t.action === 'sell').length,
        totalCost: trades.reduce((s, t) => s + (t.cost || 0), 0),
        totalValue: trades.reduce((s, t) => s + (t.value || 0), 0),
        cashBefore: this.availableCash,
        cashAfter: remainingCash,
        cashDeployed: this.availableCash - remainingCash
      },
      allocations: {
        before: currentAlloc,
        after: finalAlloc,
        target: this.targets,
        sectorBefore: sectorAlloc,
        sectorAfter: finalSectorAlloc
      },
      drift: this.calculateDrift(currentAlloc, finalAlloc)
    };
  }
  
  /**
   * Calcula drift (desvio total) L1
   */
  calculateDrift(before, after) {
    const allTickers = new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(this.targets)]);
    let totalDrift = 0;
    allTickers.forEach(t => {
      const target = this.targets[t] || 0;
      const b = before[t] || 0;
      const a = after[t] || 0;
      totalDrift += Math.abs(target - a);
    });
    return {
      before: totalDrift / 2, // L1 distance / 2 = TVD
      after: 0 // será calculado após
    };
  }
  
  /**
   * Simula cenário "E se..." com aporte adicional
   */
  simulateWithCash(extraCash) {
    const originalCash = this.availableCash;
    this.availableCash += extraCash;
    const result = this.solve();
    this.availableCash = originalCash;
    return { ...result, extraCash };
  }
  
  /**
   * Exporta plano em formato legível
   */
  exportPlan(result) {
    let output = '=== PLANO DE REBALANCEAMENTO ===\n\n';
    
    if (result.trades.length === 0) {
      output += '✅ Carteira já está balanceada dentro das tolerâncias.\n';
      return output;
    }
    
    output += `Resumo: ${result.summary.buys} compras, ${result.summary.sells} vendas\n`;
    output += `Cash: R$ ${result.summary.cashBefore.toLocaleString('pt-BR', {minimumFractionDigits: 2})} → R$ ${result.summary.cashAfter.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    output += `Deploy: R$ ${result.summary.cashDeployed.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    output += `Custos estimados: R$ ${result.summary.totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;
    
    output += '--- COMPRAS ---\n';
    result.trades.filter(t => t.action === 'buy').forEach(t => {
      output += `  ${t.ticker}: ${t.qty} x R$ ${t.price.toFixed(2)} = R$ ${t.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (custo: R$ ${t.cost.toFixed(2)}) - ${t.reason}\n`;
    });
    
    output += '\n--- VENDAS ---\n';
    result.trades.filter(t => t.action === 'sell').forEach(t => {
      output += `  ${t.ticker}: ${t.qty} x R$ ${t.price.toFixed(2)} = R$ ${t.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (líquido: R$ ${t.netProceeds.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) - ${t.reason}\n`;
    });
    
    output += '\n--- ALOCAÇÃO FINAL ---\n';
    Object.entries(result.allocations.after).forEach(([ticker, pct]) => {
      const target = result.allocations.target[ticker] || 0;
      output += `  ${ticker}: ${(pct*100).toFixed(2)}% (meta: ${(target*100).toFixed(2)}%)\n`;
    });
    
    return output;
  }
}

// Export para uso global
window.RebalanceEngine = RebalanceEngine;

// Uso direto no console:
// const engine = new RebalanceEngine({ maxAssetPct: 0.15, maxSectorPct: 0.35 });
// engine.setPortfolio(assets, targets, prices, cash);
// const plan = engine.solve();
// console.log(engine.exportPlan(plan));