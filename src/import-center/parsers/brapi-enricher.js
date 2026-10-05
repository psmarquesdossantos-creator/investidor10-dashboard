// src/import-center/parsers/brapi-enricher.js
// Enriquece posições com preços atuais via brapi.dev
// Uso: window.ImportCenter.enrichWithBrapi(tickersArray)

(function() {
  'use strict';

  async function enrichWithBrapi(tickers) {
    if (!tickers?.length) return {};
    // Remove sufixos .SA e F para buscar na brapi
    const unique = [...new Set(tickers.map(t => t.replace('F', '').replace('.SA', '')))];
    const chunks = [];
    for (let i = 0; i < unique.length; i += 50) {
      chunks.push(unique.slice(i, i + 50));
    }
    
    const prices = {};
    for (const chunk of chunks) {
      try {
        const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(',')}?currency=BRL`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const q of data.results || []) {
          if (q.regularMarketPrice) {
            const sym = q.symbol.replace('.SA', '').replace('F', '');
            prices[sym] = q.regularMarketPrice;
          }
        }
      } catch (e) {
        console.warn('brapi.dev enrich failed:', e);
      }
    }
    return prices;
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.enrichWithBrapi = enrichWithBrapi;
})();
