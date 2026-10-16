// src/import-center/orchestrator.js
// Pipeline principal de importação: FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUP → CONFIRM → WRITE
// Uso: window.ImportCenter.pipeline.process(file).then(result => { if (result.needsConfirmation) showPreview(result); else autoConfirm(); })

(function() {
  'use strict';

  // Estado do pipeline
  let pipelineState = {
    step: 'idle', // idle, detect, parse, normalize, validate, preview, dedup, confirm, write, done
    file: null,
    format: null,
    rawData: null,
    parsedData: null,
    normalizedData: null,
    validationResult: null,
    dedupResult: null,
    previewData: null,
    error: null
  };

  // Helpers
  function setState(updates) {
    pipelineState = { ...pipelineState, ...updates };
    console.log('[ImportCenter.pipeline] State:', pipelineState.step);
    if (window.ImportCenter?.onStateChange) {
      window.ImportCenter.onStateChange(pipelineState);
    }
  }

  function resetState() {
    pipelineState = {
      step: 'idle',
      file: null,
      format: null,
      rawData: null,
      parsedData: null,
      normalizedData: null,
      validationResult: null,
      dedupResult: null,
      previewData: null,
      error: null
    };
  }

  // Passo 1: DETECT - Detecta formato do arquivo
  async function detect(file) {
    setState({ step: 'detect', file });
    try {
      const result = await window.ImportCenter.detectFormat(file);
      setState({ step: 'detected', format: result.format, formatMeta: result.meta, parserName: result.parser });
      return result;
    } catch (e) {
      setState({ step: 'error', error: 'Falha na detecção: ' + e.message });
      throw e;
    }
  }

  // Passo 2: PARSE - Processa arquivo com parser apropriado
  async function parse(file) {
    setState({ step: 'parse' });
    try {
      const parserName = pipelineState.parserName || window.ImportCenter.getParserName(pipelineState.format);
      const parser = window.ImportCenter.parsers?.[parserName];
      if (!parser) throw new Error(`Parser não encontrado: ${parserName}`);
      
      let parsedData;
      if (parserName.includes('xlsx')) {
        const buf = await file.arrayBuffer();
        const sheets = await window.ImportCenter.readXlsx(buf);
        window._xlsxSheets = sheets;
        parsedData = await parser(sheets);
      } else {
        const text = await file.text();
        parsedData = await parser(text, pipelineState.formatMeta);
      }
      
      // Adiciona metadados de origem
      parsedData = parsedData.map(item => ({
        ...item,
        _sourceFile: pipelineState.file?.name,
        _parsedAt: new Date().toISOString()
      }));
      
      setState({ step: 'parsed', parsedData });
      return parsedData;
    } catch (e) {
      setState({ step: 'error', error: 'Falha no parsing: ' + e.message });
      throw e;
    }
  }

  // Passo 3: NORMALIZE - Normaliza dados para formato canônico
  async function normalize() {
    setState({ step: 'normalize' });
    try {
      const normalizedData = window.ImportCenter.normalize(pipelineState.parsedData, pipelineState.format);
      setState({ step: 'normalized', normalizedData });
      return normalizedData;
    } catch (e) {
      setState({ step: 'error', error: 'Falha na normalização: ' + e.message });
      throw e;
    }
  }

  // Passo 4: VALIDATE - Valida dados normalizados
  async function validate() {
    setState({ step: 'validate' });
    try {
      const validationResult = window.ImportCenter.validate(pipelineState.normalizedData);
      setState({ step: 'validated', validationResult });
      return validationResult;
    } catch (e) {
      setState({ step: 'error', error: 'Falha na validação: ' + e.message });
      throw e;
    }
  }

  // Passo 5: PREVIEW - Prepara dados para confirmação do usuário
  async function preview() {
    setState({ step: 'preview' });
    try {
      const { valid, warnings, errors } = pipelineState.validationResult;
      
      // Estatísticas do preview
      const stats = {
        total: pipelineState.normalizedData.length,
        valid: valid.length,
        warnings: warnings.length,
        errors: errors.length,
        byClass: {},
        byType: {}
      };
      
      valid.forEach(item => {
        stats.byClass[item.class] = (stats.byClass[item.class] || 0) + 1;
        stats.byType[item.type || 'unknown'] = (stats.byType[item.type || 'unknown'] || 0) + 1;
      });
      
      const previewData = {
        stats,
        valid: valid.slice(0, 20), // Primeiros 20 para preview
        warnings: warnings.slice(0, 10),
        errors: errors.slice(0, 10),
        needsConfirmation: valid.length > 0,
        canAutoConfirm: valid.length > 0 && warnings.length === 0 && errors.length === 0
      };
      
      setState({ step: 'preview_ready', previewData });
      return previewData;
    } catch (e) {
      setState({ step: 'error', error: 'Falha no preview: ' + e.message });
      throw e;
    }
  }

  // Passo 6: DEDUP - Remove duplicatas contra dados existentes
  async function dedup() {
    setState({ step: 'dedup' });
    try {
      // Obtém dados existentes do CARTEIRA_DATA
      const existingData = window.CARTEIRA_DATA?.positions || [];
      const validData = pipelineState.validationResult.valid;
      
      const dedupResult = window.ImportCenter.dedup(validData, existingData);
      setState({ step: 'deduped', dedupResult });
      return dedupResult;
    } catch (e) {
      setState({ step: 'error', error: 'Falha na deduplicação: ' + e.message });
      throw e;
    }
  }

  // Passo 7: CONFIRM - Usuário confirma importação
  async function confirm(userConfirmed = true, options = {}) {
    setState({ step: userConfirmed ? 'confirmed' : 'cancelled' });
    if (!userConfirmed) {
      resetState();
      return { success: false, cancelled: true };
    }
    
    // Usuário confirmou - prossegue para write
    const keptData = pipelineState.dedupResult?.kept || pipelineState.validationResult.valid;
    return await write(keptData);
  }

  // Passo 8: WRITE - Grava no armazenamento
  async function write(data) {
    setState({ step: 'writing' });
    try {
      const result = await window.ImportCenter.write(data);
      if (result.success) {
        setState({ step: 'done', writeResult: result });
        // Notifica UI
        if (window.ImportCenter.onImportComplete) {
          window.ImportCenter.onImportComplete(result);
        }
      } else {
        setState({ step: 'error', error: result.error });
      }
      return result;
    } catch (e) {
      setState({ step: 'error', error: 'Falha na escrita: ' + e.message });
      throw e;
    }
  }

  // Pipeline completo automatizado
  async function process(file, options = {}) {
    resetState();
    setState({ step: 'starting', file });
    
    try {
      // 1. DETECT
      await detect(file);
      
      // 2. PARSE
      await parse(file);
      
      // 3. NORMALIZE
      await normalize();
      
      // 4. VALIDATE
      await validate();
      
      // 5. PREVIEW
      const previewData = await preview();
      
      // Auto-confirm se configurado e sem warnings/errors
      if (options.autoConfirm && previewData.canAutoConfirm) {
        await dedup();
        return await confirm(true, options);
      }
      
      // Retorna preview para confirmação manual
      return { needsConfirmation: true, preview: previewData };
      
    } catch (e) {
      console.error('[ImportCenter.pipeline] Error:', e);
      return { success: false, error: e.message };
    }
  }

  // API pública
  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.pipeline = {
    process,
    detect,
    parse,
    normalize,
    validate,
    preview,
    dedup,
    confirm,
    write,
    getState: () => ({ ...pipelineState }),
    reset: resetState,
    
    // Registra parsers
    registerParser: (name, fn) => {
      window.ImportCenter.parsers = window.ImportCenter.parsers || {};
      window.ImportCenter.parsers[name] = fn;
    },
    
    // Registra parsers XLSX
    registerXlsxParser: (name, fn) => {
      window.ImportCenter.parsers = window.ImportCenter.parsers || {};
      window.ImportCenter.parsers[name] = fn;
    }
  };
  
  // Expõe estado para debug
  window.ImportCenter.getPipelineState = () => ({ ...pipelineState });
  
})();