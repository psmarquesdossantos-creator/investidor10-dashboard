// src/import-center/deduper.js
// Remove duplicatas baseadas em ticker + fonte
// Uso: window.ImportCenter.dedup(validData, existingData)

(function() {
  'use strict';

  function dedup(validData, existingData = []) {
    const seen = new Map();
    const result = { kept: [], duplicates: [] };
    
    // Primeiro, indexa dados existentes
    for (const item of existingData) {
      const key = `${item.ticker}|${item.source || 'UNKNOWN'}`;
      seen.set(key, item);
    }
    
    // Processa novos dados
    for (const item of validData) {
      const key = `${item.ticker}|${item.source || 'UNKNOWN'}`;
      if (seen.has(key)) {
        // Duplicata - compara qual é mais recente/completa
        const existing = seen.get(key);
        const isNewer = item._normalizedAt && existing._normalizedAt 
          ? new Date(item._normalizedAt) > new Date(existing._normalizedAt)
          : false;
        
        if (isNewer) {
          result.duplicates.push({ 
            action: 'replaced', 
            old: existing, 
            new: item,
            reason: 'Novo dado mais recente'
          });
          seen.set(key, item);
        } else {
          result.duplicates.push({ 
            action: 'skipped', 
            old: existing, 
            new: item,
            reason: 'Dado existente mantido (mais antigo ou sem timestamp)'
          });
        }
      } else {
        seen.set(key, item);
        result.kept.push(item);
      }
    }
    
    return result;
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.dedup = dedup;
})();
