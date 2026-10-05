// src/import-center/parsers/broker-csv.js
// Parser para CSVs de corretoras (XP, Inter, Rico, Clear)
// Uso: window.ImportCenter.parseBrokerCSV(csvText, broker)

(function() {
  'use strict';

  const BROKER_MAPPINGS = {
    xp: { ticker: 'Ativo', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Preço Atual', type: 'Tipo' },
    inter: { ticker: 'Código', qty: 'Qtd', avgPrice: 'PM', currentPrice: 'Preço', type: 'Classe' },
    rico: { ticker: 'Ativo', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Último', type: 'Segmento' },
    clear: { ticker: 'Ticker', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Preço Atual', type: 'Tipo' }
  };

  function parseCSV(text, delimiter = ';') {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
  }

  function parseBrokerCSV(csvText, broker) {
    const mapping = BROKER_MAPPINGS[broker] || BROKER_MAPPINGS.xp;
    const delimiter = csvText.includes(';') ? ';' : ',';
    const rows = parseCSV(csvText, delimiter);
    const clsMap = { 
      'Ação': 'stocks', 'Ações': 'stocks', 
      'FII': 'fiis', 'Fundos Imobiliários': 'fiis', 
      'ETF': 'etfs', 
      'Renda Fixa': 'fixed', 
      'BDR': 'bdr' 
    };
    
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
          source: `BROKER_${broker.toUpperCase()}`,
          raw: r
        };
      });
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.parseBrokerCSV = parseBrokerCSV;
})();
