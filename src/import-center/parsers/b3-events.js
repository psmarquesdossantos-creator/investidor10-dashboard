// src/import-center/parsers/b3-events.js
// Parser para CSV de eventos corporativos B3
// Uso: window.ImportCenter.parseB3Events(csvText, delimiter)

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

  function parseB3Events(csvText, delimiter = ';') {
    const rows = parseCSV(csvText, delimiter);
    const eventTypeMap = {
      'DESDOBRAMENTO': 'split',
      'GRUPAMENTO': 'merge',
      'BONIFICACAO': 'bonus',
      'BONIFICAÇÃO': 'bonus',
      'SUBSCRICAO': 'subscription',
      'SUBSCRIÇÃO': 'subscription',
      'AMORTIZACAO': 'amortization',
      'AMORTIZAÇÃO': 'amortization',
      'JUROS': 'interest',
      'DIVIDENDO': 'dividend',
      'JCP': 'jcp'
    };

    return rows
      .filter(r => r.Tipo && r.Ativo)
      .map(r => {
        const type = eventTypeMap[r.Tipo?.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || 'unknown';
        return {
          type,
          rawType: r.Tipo,
          ticker: r.Ativo?.toUpperCase().replace('.SA', ''),
          date: r.Data ? r.Data.split('/').reverse().join('-') : '',
          quantity: +(r.Quantidade || r.Qtd || 0).replace(',', '.'),
          price: +(r.Preco || r.Preço || 0).replace(',', '.'),
          ratio: +(r.Fator || r.Ratio || 0).replace(',', '.'),
          source: 'B3_EVENTS',
          raw: r
        };
      })
      .filter(e => e.type !== 'unknown');
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.parseB3Events = parseB3Events;
})();
