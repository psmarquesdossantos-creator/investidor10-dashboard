// src/import-center/parsers/b3-position.js
// Parser para backup JSON do Investidor10 (formato B3 oficial)
// Uso: window.ImportCenter.parseB3Position(json)

(function() {
  'use strict';

  function parseB3Position(json) {
    const assets = json.payload?.state?.assets || [];
    const clsMap = { 
      'Ação': 'stocks', 
      'FII': 'fiis', 
      'ETF': 'etfs', 
      'Renda Fixa': 'fixed', 
      'BDR': 'bdr', 
      'Criptomoeda': 'crypto' 
    };
    
    const normDate = s => s.includes('-') ? s : s.split('/').reverse().join('-');
    
    return assets
      .filter(a => a.qty !== undefined) // Keep null (becomes UNKNOWN), filter only undefined
      .map(a => {
        const isRF = a.type === 'Renda Fixa';
        const curPrice = isRF 
          ? (+a.fixed_current_value || +a.current_price || 0) 
          : (+a.current_price || 0);
        const avgPrice = isRF 
          ? (+a.rf_applied_value || +a.fixed_initial_value || curPrice) 
          : (+a.avg_price || 0);
        const qty = +a.qty;
        const isUnknown = isNaN(qty) || qty <= 0;
        const value = isUnknown ? 0 : qty * curPrice;
        const invested = isUnknown ? 0 : qty * avgPrice;
        const ret = invested ? ((value / invested - 1) * 100) : 0;
        
        return {
          ticker: (a.ticker || a.name || '').toUpperCase().replace('.SA', ''),
          name: a.name || a.ticker,
          class: clsMap[a.type] || 'other',
          type: a.type,
          sector: a.sector || 'Outros',
          qty: isUnknown ? 0 : qty,
          avgPrice: +avgPrice.toFixed(2),
          currentPrice: +curPrice.toFixed(2),
          value: +value.toFixed(2),
          invested: +invested.toFixed(2),
          ret: +ret.toFixed(2),
          dy: +a.dy || 0,
          source: 'B3',
          raw: a,
          qtyUnknown: isUnknown
        };
      });
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.parseB3Position = parseB3Position;
})();
