// src/import-center/validator.js
// Valida dados normalizados - retorna { valid: [], warnings: [], errors: [] }
// Uso: window.ImportCenter.validate(normalizedData)

(function() {
  'use strict';

  function validate(normalizedData) {
    const result = {
      valid: [],
      warnings: [],
      errors: []
    };

    for (const item of normalizedData) {
      const itemWarnings = [];
      const itemErrors = [];

      // Ticker obrigatório
      if (!item.ticker || item.ticker.trim() === '') {
        itemErrors.push('Ticker ausente');
      }

      // Quantidade
      if (item.qtyUnknown === true) {
        itemWarnings.push('Quantidade desconhecida (qty null/ausente) - marcado como UNKNOWN');
      } else if (item.qty <= 0) {
        itemWarnings.push('Quantidade zero ou negativa');
      }

      // Preços
      if (item.currentPrice <= 0) {
        itemWarnings.push('Preço atual zero ou ausente');
      }
      if (item.avgPrice <= 0) {
        itemWarnings.push('Preço médio zero ou ausente');
      }

      // Valor inconsistente
      if (item.qty > 0 && item.currentPrice > 0) {
        const expectedValue = +(item.qty * item.currentPrice).toFixed(2);
        if (Math.abs(item.value - expectedValue) > 0.01) {
          itemWarnings.push(`Valor inconsistente: esperado ${expectedValue}, encontrado ${item.value}`);
        }
      }

      // Classificação
      if (!item.class || item.class === 'other') {
        itemWarnings.push('Classe de ativo não identificada');
      }

      // Dividend yield
      if (item.dy < 0 || item.dy > 100) {
        itemWarnings.push('DY fora de faixa esperada (0-100%)');
      }

      // Retorno
      if (item.ret < -100 || item.ret > 10000) {
        itemWarnings.push('Retorno fora de faixa esperada (-100% a +10000%)');
      }

      if (itemErrors.length > 0) {
        result.errors.push({ ticker: item.ticker, errors: itemErrors, raw: item });
      } else if (itemWarnings.length > 0) {
        result.warnings.push({ ticker: item.ticker, warnings: itemWarnings, raw: item });
        result.valid.push(item);
      } else {
        result.valid.push(item);
      }
    }

    return result;
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.validate = validate;
})();
