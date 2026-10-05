// src/import-center/parsers/generic-csv.js
// Parser genérico para CSV com mapeamento manual de colunas
// Uso: window.ImportCenter.parseGenericCSV(csvText, mapping, delimiter)

(function() {
  'use strict';

  function parseCSV(text, delimiter = ';') {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
  }

  function parseGenericCSV(csvText, mapping, delimiter = ';') {
    // mapping = { ticker: 'colName', qty: 'colName', avgPrice: 'colName', currentPrice: 'colName', type: 'colName' }
    const rows = parseCSV(csvText, delimiter);
    const clsMap = { 'Ação': 'stocks', 'Ações': 'stocks', 'FII': 'fiis', 'ETF': 'etfs', 'Renda Fixa': 'fixed', 'BDR': 'bdr' };
    
    return rows
      .filter(r => +(r[mapping.qty] || 0) > 0)
      .map(r => {
        const ticker = (r[mapping.ticker] || '').replace('.SA', '').toUpperCase();
        const qty = +(r[mapping.qty] || 0).replace(',', '.');
        const avgPrice = +(r[mapping.avgPrice] || 0).replace(',', '.');
        const currentPrice = +(r[mapping.currentPrice] || 0).replace(',', '.');
        const type = r[mapping.type] || 'Ação';
        
        const value = qty * currentPrice;
        const invested = qty * avgPrice;
        const ret = invested ? ((value / invested - 1) * 100) : 0;
        
        return {
          ticker,
          name: ticker,
          class: clsMap[type] || 'other',
          type,
          sector: 'Outros',
          qty,
          avgPrice,
          currentPrice,
          value: +value.toFixed(2),
          invested: +invested.toFixed(2),
          ret: +ret.toFixed(2),
          dy: 0,
          source: 'GENERIC_CSV',
          raw: r
        };
      });
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.parseGenericCSV = parseGenericCSV;
})();
