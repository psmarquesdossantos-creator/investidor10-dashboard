// src/corporate-events/corporate-events.js
// Corporate Events Engine: Split, Merge, Bonus, Subscription, Amortization
// Detecta eventos via B3 e ajusta automaticamente qtd/preço médio

(function() {
  'use strict';

  const EVENT_TYPES = {
    SPLIT: 'split',
    MERGE: 'merge',
    BONUS: 'bonus',
    SUBSCRIPTION: 'subscription',
    AMORTIZATION: 'amortization'
  };

  // Detecta eventos em arquivos B3 Events CSV
  function detectEvents(csvText, delimiter = ';') {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const events = [];
    
    const typeMap = {
      'DESDOBRAMENTO': EVENT_TYPES.SPLIT,
      'GRUPAMENTO': EVENT_TYPES.MERGE,
      'BONIFICACAO': EVENT_TYPES.BONUS,
      'BONIFICAÇÃO': EVENT_TYPES.BONUS,
      'SUBSCRICAO': EVENT_TYPES.SUBSCRIPTION,
      'SUBSCRIÇÃO': EVENT_TYPES.SUBSCRIPTION,
      'AMORTIZACAO': EVENT_TYPES.AMORTIZATION,
      'AMORTIZAÇÃO': EVENT_TYPES.AMORTIZATION
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
      
      if (!row.Tipo || !row.Ativo) continue;
      
      const normType = row.Tipo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const eventType = typeMap[normType];
      
      if (eventType) {
        events.push({
          type: eventType,
          rawType: row.Tipo,
          ticker: row.Ativo?.toUpperCase().replace('.SA', ''),
          date: row.Data ? row.Data.split('/').reverse().join('-') : '',
          quantity: +(row.Quantidade || row.Qtd || 0).replace(',', '.'),
          price: +(row.Preco || row.Preço || 0).replace(',', '.'),
          ratio: +(row.Fator || row.Ratio || 0).replace(',', '.'),
          source: 'B3_EVENTS',
          raw: row
        });
      }
    }
    
    return events;
  }

  // Aplica evento de split (desdobramento)
  function applySplit(positions, event) {
    const pos = positions.find(p => p.ticker === event.ticker);
    if (!pos) return { success: false, reason: 'Posição não encontrada' };
    
    const ratio = event.ratio || event.quantity;
    if (ratio <= 0) return { success: false, reason: 'Ratio inválido' };
    
    const oldQty = pos.qty;
    const oldAvg = pos.avgPrice;
    
    pos.qty = oldQty * ratio;
    pos.avgPrice = +(oldAvg / ratio).toFixed(4);
    pos.currentPrice = +(pos.currentPrice / ratio).toFixed(2);
    pos.value = +(pos.qty * pos.currentPrice).toFixed(2);
    pos.invested = +(pos.qty * pos.avgPrice).toFixed(2);
    
    return { 
      success: true, 
      ticker: event.ticker,
      oldQty, 
      newQty: pos.qty,
      oldAvg, 
      newAvg: pos.avgPrice,
      ratio
    };
  }

  // Aplica evento de merge (grupamento)
  function applyMerge(positions, event) {
    const pos = positions.find(p => p.ticker === event.ticker);
    if (!pos) return { success: false, reason: 'Posição não encontrada' };
    
    const ratio = event.ratio || event.quantity;
    if (ratio <= 0) return { success: false, reason: 'Ratio inválido' };
    
    const oldQty = pos.qty;
    const oldAvg = pos.avgPrice;
    
    pos.qty = oldQty / ratio;
    pos.avgPrice = +(oldAvg * ratio).toFixed(4);
    pos.currentPrice = +(pos.currentPrice * ratio).toFixed(2);
    pos.value = +(pos.qty * pos.currentPrice).toFixed(2);
    pos.invested = +(pos.qty * pos.avgPrice).toFixed(2);
    
    return { 
      success: true, 
      ticker: event.ticker,
      oldQty, 
      newQty: pos.qty,
      oldAvg, 
      newAvg: pos.avgPrice,
      ratio
    };
  }

  // Aplica bonificação (ações gratuitas)
  function applyBonus(positions, event) {
    const pos = positions.find(p => p.ticker === event.ticker);
    if (!pos) return { success: false, reason: 'Posição não encontrada' };
    
    const bonusQty = event.quantity || 0;
    if (bonusQty <= 0) return { success: false, reason: 'Quantidade de bonificação inválida' };
    
    const oldQty = pos.qty;
    const oldAvg = pos.avgPrice;
    const oldInvested = pos.invested;
    
    pos.qty = oldQty + bonusQty;
    pos.avgPrice = +(oldInvested / pos.qty).toFixed(4);
    pos.value = +(pos.qty * pos.currentPrice).toFixed(2);
    
    return { 
      success: true, 
      ticker: event.ticker,
      oldQty, 
      newQty: pos.qty,
      bonusQty,
      oldAvg, 
      newAvg: pos.avgPrice
    };
  }

  // Aplica subscrição (direito de preferência)
  function applySubscription(positions, event) {
    const pos = positions.find(p => p.ticker === event.ticker);
    if (!pos) return { success: false, reason: 'Posição não encontrada' };
    
    const subQty = event.quantity || 0;
    const subPrice = event.price || 0;
    if (subQty <= 0 || subPrice <= 0) return { success: false, reason: 'Quantidade ou preço de subscrição inválido' };
    
    const oldQty = pos.qty;
    const oldAvg = pos.avgPrice;
    const oldInvested = pos.invested;
    const subInvested = subQty * subPrice;
    
    pos.qty = oldQty + subQty;
    pos.invested = oldInvested + subInvested;
    pos.avgPrice = +(pos.invested / pos.qty).toFixed(4);
    pos.value = +(pos.qty * pos.currentPrice).toFixed(2);
    
    return { 
      success: true, 
      ticker: event.ticker,
      oldQty, 
      newQty: pos.qty,
      subQty,
      subPrice,
      oldAvg, 
      newAvg: pos.avgPrice
    };
  }

  // Aplica amortização (devolução de capital)
  function applyAmortization(positions, event) {
    const pos = positions.find(p => p.ticker === event.ticker);
    if (!pos) return { success: false, reason: 'Posição não encontrada' };
    
    const amtQty = event.quantity || 0;
    const amtPrice = event.price || 0;
    if (amtQty <= 0) return { success: false, reason: 'Quantidade de amortização inválida' };
    
    const oldQty = pos.qty;
    const oldAvg = pos.avgPrice;
    const oldInvested = pos.invested;
    
    pos.qty = oldQty - amtQty;
    if (pos.qty < 0) pos.qty = 0;
    
    const amortizedValue = amtQty * (amtPrice || oldAvg);
    pos.invested = +(oldInvested - amortizedValue).toFixed(2);
    if (pos.invested < 0) pos.invested = 0;
    
    if (pos.qty > 0) {
      pos.avgPrice = +(pos.invested / pos.qty).toFixed(4);
    } else {
      pos.avgPrice = 0;
    }
    pos.value = +(pos.qty * pos.currentPrice).toFixed(2);
    
    return { 
      success: true, 
      ticker: event.ticker,
      oldQty, 
      newQty: pos.qty,
      amtQty,
      amtPrice,
      amortizedValue,
      oldAvg, 
      newAvg: pos.avgPrice
    };
  }

  // Processa todos os eventos
  function processEvents(positions, events) {
    const results = { applied: [], skipped: [] };
    
    for (const event of events) {
      let result;
      
      switch (event.type) {
        case EVENT_TYPES.SPLIT:
          result = applySplit(positions, event);
          break;
        case EVENT_TYPES.MERGE:
          result = applyMerge(positions, event);
          break;
        case EVENT_TYPES.BONUS:
          result = applyBonus(positions, event);
          break;
        case EVENT_TYPES.SUBSCRIPTION:
          result = applySubscription(positions, event);
          break;
        case EVENT_TYPES.AMORTIZATION:
          result = applyAmortization(positions, event);
          break;
        default:
          result = { success: false, reason: 'Tipo de evento desconhecido' };
      }
      
      if (result.success) {
        results.applied.push({ ...result, event: event.type, date: event.date });
      } else {
        results.skipped.push({ ...result, event: event.type, ticker: event.ticker });
      }
    }
    
    return results;
  }

  // Log de eventos aplicados
  function logEvents(results) {
    if (results.applied.length > 0) {
      console.log('[CorporateEvents] Eventos aplicados:', results.applied.length);
      for (const r of results.applied) {
        console.log(`  ${r.event.toUpperCase()} ${r.ticker}: ${r.oldQty} -> ${r.newQty} (PM: ${r.oldAvg} -> ${r.newAvg})`);
      }
    }
    if (results.skipped.length > 0) {
      console.warn('[CorporateEvents] Eventos ignorados:', results.skipped.length);
      for (const r of results.skipped) {
        console.warn(`  ${r.event.toUpperCase()} ${r.ticker}: ${r.reason}`);
      }
    }
  }

  // Rollback (reverte último evento)
  function rollbackEvent(positions, eventLog) {
    return { success: false, reason: 'Rollback não implementado - requer snapshot anterior' };
  }

  window.CorporateEvents = {
    EVENT_TYPES,
    detectEvents,
    applySplit,
    applyMerge,
    applyBonus,
    applySubscription,
    applyAmortization,
    processEvents,
    logEvents,
    rollbackEvent
  };
})();