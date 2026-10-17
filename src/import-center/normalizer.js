// src/import-center/normalizer.js
// Normaliza dados de diferentes fontes para formato canônico
// Uso: window.ImportCenter.normalize(rawData, sourceFormat)

(function() {
  'use strict';

  const CLASS_MAP = {
    'Ação': 'stocks', 'Ações': 'stocks',
    'FII': 'fiis', 'Fundos Imobiliários': 'fiis',
    'ETF': 'etfs',
    'Renda Fixa': 'fixed',
    'BDR': 'bdr',
    'Criptomoeda': 'crypto'
  };

  const SECTOR_MAP = {
    'Petróleo e Gás': 'Petróleo e Gás',
    'Bancos': 'Bancos',
    'Energia Elétrica': 'Energia Elétrica',
    'Saneamento': 'Saneamento',
    'Logística': 'Logística',
    'Shopping': 'Shopping',
    'Lajes Corporativas': 'Lajes Corporativas',
    'Híbrido': 'Híbrido',
    'Títulos Públicos': 'Títulos Públicos',
    'Crédito Privado': 'Crédito Privado',
    'Internacional': 'Internacional'
  };

  function normalize(rawData, sourceFormat) {
    return rawData.map(item => {
      const normalized = { ...item };
      
      // Normaliza ticker
      if (normalized.ticker) {
        normalized.ticker = normalized.ticker.toUpperCase().replace('.SA', '').replace('F', '');
      }
      
      // Normaliza classe
      if (normalized.type && CLASS_MAP[normalized.type]) {
        normalized.class = CLASS_MAP[normalized.type];
      }
      
      // Normaliza setor
      if (normalized.sector && SECTOR_MAP[normalized.sector]) {
        normalized.sector = SECTOR_MAP[normalized.sector];
      } else if (!normalized.sector || normalized.sector === 'Outros') {
        normalized.sector = 'Outros';
      }
      
      // Handle qty: keep null/undefined as unknown, else convert to number
      let qtyValue = normalized.qty;
      if (qtyValue === null || qtyValue === undefined) {
        normalized.qtyUnknown = true;
        normalized.qty = null; // keep as null to indicate unknown
      } else {
        normalized.qty = Number(qtyValue) || 0;
        normalized.qtyUnknown = false;
      }
      
      normalized.avgPrice = Number(normalized.avgPrice) || 0;
      normalized.currentPrice = Number(normalized.currentPrice) || 0;
      normalized.value = Number(normalized.value) || 0;
      normalized.invested = Number(normalized.invested) || 0;
      normalized.ret = Number(normalized.ret) || 0;
      normalized.dy = Number(normalized.dy) || 0;
      
      // Calcula value e invested somente se qty conhecido e >0
      if (!normalized.qtyUnknown && normalized.qty > 0) {
        if (normalized.value === 0 && normalized.currentPrice > 0) {
          normalized.value = +(normalized.qty * normalized.currentPrice).toFixed(2);
        }
        if (normalized.invested === 0 && normalized.avgPrice > 0) {
          normalized.invested = +(normalized.qty * normalized.avgPrice).toFixed(2);
        }
        if (normalized.ret === 0 && normalized.invested > 0 && normalized.value > 0) {
          normalized.ret = +(((normalized.value / normalized.invested) - 1) * 100).toFixed(2);
        }
      }
      
      // Adiciona metadata de normalização
      normalized._normalized = true;
      normalized._sourceFormat = sourceFormat;
      normalized._normalizedAt = new Date().toISOString();
      
      return normalized;
    });
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.normalize = normalize;
})();
