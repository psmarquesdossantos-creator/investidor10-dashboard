// src/import-center/detectors.js
// Detecta formato de arquivo e retorna parser apropriado
// Uso: window.ImportCenter.detectFormat(file)

(function() {
  'use strict';

  async function detectFormat(file) {
    const text = await file.text();
    const firstLine = text.split('\n')[0].trim();
    const first500 = text.slice(0, 500);
    
    // B3 Events CSV - header oficial B3
    if (firstLine.includes('Tipo;Data;Ativo') || firstLine.includes('Tipo,Data,Ativo')) {
      return { 
        format: 'b3-events', 
        parser: 'b3-events', 
        confidence: 0.95, 
        meta: { delimiter: firstLine.includes(';') ? ';' : ',' } 
      };
    }
    
    // Broker CSVs - detecta por padrões no header
    const brokerPatterns = {
      'xp': /Corretora\s*[,:]\s*XP/i,
      'inter': /Banco\s*Inter/i,
      'rico': /Rico\s*Corretora/i,
      'clear': /Clear\s*Corretora/i
    };
    for (const [broker, pattern] of Object.entries(brokerPatterns)) {
      if (pattern.test(first500)) {
        return { 
          format: `broker-${broker}`, 
          parser: 'broker-csv', 
          confidence: 0.9, 
          meta: { broker } 
        };
      }
    }
    
    // JSON (Investidor10 backup)
    try {
      const json = JSON.parse(text);
      if (json.payload?.state?.assets) {
        return { 
          format: 'b3-position', 
          parser: 'b3-position', 
          confidence: 1.0, 
          meta: { version: json.version || 1 } 
        };
      }
    } catch {}
    
    // Generic CSV fallback
    return { 
      format: 'generic-csv', 
      parser: 'generic-csv', 
      confidence: 0.5, 
      meta: { delimiter: firstLine.includes(';') ? ';' : ',' } 
    };
  }

  function getParserName(format) {
    const map = {
      'b3-position': 'b3-position',
      'b3-events': 'b3-events',
      'broker-xp': 'broker-csv',
      'broker-inter': 'broker-csv',
      'broker-rico': 'broker-csv',
      'broker-clear': 'broker-csv',
      'generic-csv': 'generic-csv'
    };
    return map[format] || 'generic-csv';
  }

  // Expose to window
  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.detectFormat = detectFormat;
  window.ImportCenter.getParserName = getParserName;
})();
