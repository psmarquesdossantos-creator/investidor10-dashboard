// src/backup-portability/backup-portability.js
// Backup Portability: Export/Import JSON, CSV (per table), Excel multi-sheet with schema validation

(function() {
  'use strict';

  // Schema validation (Zod-like minimal implementation)
  const SCHEMA = {
    version: { type: 'number', required: true, min: 1 },
    timestamp: { type: 'string', required: true },
    kpis: { type: 'object', required: true },
    monthly: { type: 'array', required: true },
    patrimony: { type: 'object', required: true },
    allocation: { type: 'object', required: true },
    positions: { type: 'array', required: true },
    earnings: { type: 'array', required: true },
    entries: { type: 'array', required: true },
    assetReturns: { type: 'array', required: false },
    goals: { type: 'object', required: false },
    settings: { type: 'object', required: false }
  };

  function validateSchema(data) {
    const errors = [];
    const warnings = [];
    
    for (const [key, rules] of Object.entries(SCHEMA)) {
      if (rules.required && (data[key] === undefined || data[key] === null)) {
        errors.push(`Campo obrigatório ausente: ${key}`);
        continue;
      }
      
      if (data[key] !== undefined) {
        if (rules.type === 'array' && !Array.isArray(data[key])) {
          errors.push(`Campo ${key} deve ser array`);
        } else if (rules.type === 'object' && typeof data[key] !== 'object') {
          errors.push(`Campo ${key} deve ser objeto`);
        } else if (rules.type === 'number' && typeof data[key] !== 'number') {
          errors.push(`Campo ${key} deve ser número`);
        } else if (rules.type === 'string' && typeof data[key] !== 'string') {
          errors.push(`Campo ${key} deve ser string`);
        }
        
        if (rules.min !== undefined && data[key] < rules.min) {
          errors.push(`Campo ${key} deve ser >= ${rules.min}`);
        }
      }
    }
    
    // Additional validations
    if (data.positions) {
      for (let i = 0; i < data.positions.length; i++) {
        const p = data.positions[i];
        if (!p.ticker) errors.push(`Position ${i}: ticker obrigatório`);
        if (p.qty === undefined || p.qty === null) warnings.push(`Position ${i} (${p.ticker}): qty ausente`);
        if (p.currentPrice === undefined) warnings.push(`Position ${i} (${p.ticker}): currentPrice ausente`);
      }
    }
    
    if (data.earnings) {
      for (let i = 0; i < data.earnings.length; i++) {
        const e = data.earnings[i];
        if (!e.ticker) errors.push(`Earning ${i}: ticker obrigatório`);
        if (!e.date) errors.push(`Earning ${i} (${e.ticker}): date obrigatório`);
        if (!e.value) warnings.push(`Earning ${i} (${e.ticker}): value ausente`);
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }

  // Version migration
  function migrateV1toV2(v1Data) {
    // Add version field if missing
    if (!v1Data.version) {
      v1Data.version = 1;
    }
    
    // Ensure all required fields exist
    const defaults = {
      kpis: { total: 0, invested: 0, pnl: 0, pnlPct: 0, yield12m: 0 },
      monthly: [],
      patrimony: [],
      allocation: { items: [] },
      positions: [],
      earnings: [],
      entries: [],
      assetReturns: [],
      goals: { allocation: { items: [] } },
      settings: { theme: 'dark', currency: 'BRL' }
    };
    
    for (const [key, defaultVal] of Object.entries(defaults)) {
      if (v1Data[key] === undefined) {
        v1Data[key] = defaultVal;
      }
    }
    
    v1Data.version = 2;
    v1Data.migratedAt = new Date().toISOString();
    
    return v1Data;
  }

  // Export functions
  function exportJSON(data) {
    const exportData = {
      ...data,
      version: 2,
      timestamp: new Date().toISOString(),
      exportedBy: 'Investidor10 Dashboard'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  function exportCSV(data, tableName) {
    let csv = '';
    
    switch (tableName) {
      case 'positions':
        csv = exportPositionsCSV(data.positions || []);
        break;
      case 'earnings':
        csv = exportEarningsCSV(data.earnings || []);
        break;
      case 'entries':
        csv = exportEntriesCSV(data.entries || []);
        break;
      case 'monthly':
        csv = exportMonthlyCSV(data.monthly || []);
        break;
      case 'patrimony':
        csv = exportPatrimonyCSV(data.patrimony || []);
        break;
      case 'allocation':
        csv = exportAllocationCSV(data.allocation?.items || []);
        break;
      default:
        throw new Error(`Tabela desconhecida: ${tableName}`);
    }
    
    return csv;
  }

  function exportPositionsCSV(positions) {
    const headers = ['ticker', 'name', 'type', 'class', 'qty', 'avgPrice', 'currentPrice', 'value', 'invested', 'pnl', 'pnlPct', 'sector', 'source', 'lastUpdate'];
    const rows = positions.map(p => [
      p.ticker || '',
      p.name || '',
      p.type || '',
      p.class || '',
      p.qty ?? '',
      p.avgPrice ?? '',
      p.currentPrice ?? '',
      p.value ?? '',
      p.invested ?? '',
      p.pnl ?? '',
      p.pnlPct ?? '',
      p.sector || '',
      p.source || '',
      p.lastUpdate || ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  function exportEarningsCSV(earnings) {
    const headers = ['date', 'ticker', 'assetName', 'eventType', 'qty', 'unitPrice', 'value', 'irrf', 'source'];
    const rows = earnings.map(e => [
      e.date || '',
      e.ticker || '',
      e.assetName || '',
      e.eventType || '',
      e.qty ?? '',
      e.unitPrice ?? '',
      e.value ?? '',
      e.irrf ?? '',
      e.source || ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  function exportEntriesCSV(entries) {
    const headers = ['date', 'type', 'ticker', 'class', 'qty', 'price', 'fees', 'total', 'source'];
    const rows = entries.map(e => [
      e.date || '',
      e.type || '',
      e.ticker || '',
      e.class || '',
      e.qty ?? '',
      e.price ?? '',
      e.fees ?? '',
      e.total ?? '',
      e.source || ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  function exportMonthlyCSV(monthly) {
    const headers = ['month', 'invested', 'dividends', 'jcp', 'rentabilidade', 'patrimony'];
    const rows = monthly.map(m => [
      m.month || '',
      m.invested ?? '',
      m.dividends ?? '',
      m.jcp ?? '',
      m.return ?? '',
      m.patrimony ?? ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  function exportPatrimonyCSV(patrimony) {
    const headers = ['date', 'value'];
    const rows = patrimony.map(p => [
      p.date || '',
      p.value ?? ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  function exportAllocationCSV(allocation) {
    const headers = ['class', 'targetPct', 'minPct', 'maxPct'];
    const rows = allocation.map(a => [
      a.class || '',
      a.targetPct ?? '',
      a.minPct ?? '',
      a.maxPct ?? ''
    ]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  // Excel export (using SheetJS if available, fallback to CSV zip)
  async function exportExcel(data) {
    // Check if SheetJS is available
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      
      // Positions sheet
      if (data.positions?.length) {
        const ws = XLSX.utils.json_to_sheet(data.positions.map(p => ({
          Ticker: p.ticker,
          Nome: p.name,
          Tipo: p.type,
          Classe: p.class,
          Quantidade: p.qty,
          'Preço Médio': p.avgPrice,
          'Preço Atual': p.currentPrice,
          Valor: p.value,
          Investido: p.invested,
          'P&L': p.pnl,
          'P&L %': p.pnlPct,
          Setor: p.sector,
          Fonte: p.source,
          'Última Atualização': p.lastUpdate
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Posições');
      }
      
      // Earnings sheet
      if (data.earnings?.length) {
        const ws = XLSX.utils.json_to_sheet(data.earnings.map(e => ({
          Data: e.date,
          Ticker: e.ticker,
          Ativo: e.assetName,
          Tipo: e.eventType,
          Quantidade: e.qty,
          'Preço Unit.': e.unitPrice,
          Valor: e.value,
          IRRF: e.irrf,
          Fonte: e.source
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Proventos');
      }
      
      // Entries sheet
      if (data.entries?.length) {
        const ws = XLSX.utils.json_to_sheet(data.entries.map(e => ({
          Data: e.date,
          Tipo: e.type,
          Ticker: e.ticker,
          Classe: e.class,
          Quantidade: e.qty,
          Preço: e.price,
          Taxas: e.fees,
          Total: e.total,
          Fonte: e.source
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
      }
      
      // Monthly sheet
      if (data.monthly?.length) {
        const ws = XLSX.utils.json_to_sheet(data.monthly.map(m => ({
          Mês: m.month,
          Investido: m.invested,
          Dividendos: m.dividends,
          JCP: m.jcp,
          Rentabilidade: m.return,
          Patrimônio: m.patrimony
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Mensal');
      }
      
      // Patrimony sheet
      if (data.patrimony?.length) {
        const ws = XLSX.utils.json_to_sheet(data.patrimony.map(p => ({
          Data: p.date,
          Valor: p.value
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Patrimônio');
      }
      
      // Allocation sheet
      if (data.allocation?.items?.length) {
        const ws = XLSX.utils.json_to_sheet(data.allocation.items.map(a => ({
          Classe: a.class,
          'Target %': a.targetPct,
          'Min %': a.minPct,
          'Max %': a.maxPct
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Alocação');
      }
      
      // KPIs sheet
      if (data.kpis) {
        const ws = XLSX.utils.json_to_sheet([{
          'Patrimônio Total': data.kpis.total,
          Investido: data.kpis.invested,
          'P&L': data.kpis.pnl,
          'P&L %': data.kpis.pnlPct,
          'Yield 12m': data.kpis.yield12m
        }]);
        XLSX.utils.book_append_sheet(wb, ws, 'KPIs');
      }
      
      // Settings sheet
      if (data.settings) {
        const ws = XLSX.utils.json_to_sheet([data.settings]);
        XLSX.utils.book_append_sheet(wb, ws, 'Configurações');
      }
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    } else {
      // Fallback: return CSV files as object
      const sheets = {};
      if (data.positions?.length) sheets['Posições.csv'] = exportCSV(data, 'positions');
      if (data.earnings?.length) sheets['Proventos.csv'] = exportCSV(data, 'earnings');
      if (data.entries?.length) sheets['Lançamentos.csv'] = exportCSV(data, 'entries');
      if (data.monthly?.length) sheets['Mensal.csv'] = exportCSV(data, 'monthly');
      if (data.patrimony?.length) sheets['Patrimônio.csv'] = exportCSV(data, 'patrimony');
      if (data.allocation?.items?.length) sheets['Alocação.csv'] = exportCSV(data, 'allocation');
      if (data.kpis) sheets['KPIs.csv'] = 'Chave;Valor\n' + Object.entries(data.kpis).map(([k,v]) => `${k};${v}`).join('\n');
      
      return sheets;
    }
  }

  // Import functions
  async function importJSON(text) {
    const data = JSON.parse(text);
    
    // Validate schema
    const validation = validateSchema(data);
    if (!validation.valid) {
      throw new Error(`Schema inválido: ${validation.errors.join(', ')}`);
    }
    
    // Migrate if needed
    if (data.version === 1) {
      return migrateV1toV2(data);
    }
    
    return data;
  }

  async function importCSV(text, tableName) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vazio ou apenas cabeçalho');
    
    const headers = lines[0].split(';').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      rows.push(row);
    }
    
    // Convert based on table
    switch (tableName) {
      case 'positions':
        return rows.map(r => ({
          ticker: r.ticker,
          name: r.name,
          type: r.type,
          class: r.class,
          qty: r.qty ? +r.qty : 0,
          avgPrice: r.avgPrice ? +r.avgPrice : 0,
          currentPrice: r.currentPrice ? +r.currentPrice : 0,
          value: r.value ? +r.value : 0,
          invested: r.invested ? +r.invested : 0,
          pnl: r.pnl ? +r.pnl : 0,
          pnlPct: r.pnlPct ? +r.pnlPct : 0,
          sector: r.sector,
          source: r.source,
          lastUpdate: r.lastUpdate
        }));
      case 'earnings':
        return rows.map(r => ({
          date: r.date,
          ticker: r.ticker,
          assetName: r.assetName,
          eventType: r.eventType,
          qty: r.qty ? +r.qty : 0,
          unitPrice: r.unitPrice ? +r.unitPrice : 0,
          value: r.value ? +r.value : 0,
          irrf: r.irrf ? +r.irrf : 0,
          source: r.source
        }));
      case 'entries':
        return rows.map(r => ({
          date: r.date,
          type: r.type,
          ticker: r.ticker,
          class: r.class,
          qty: r.qty ? +r.qty : 0,
          price: r.price ? +r.price : 0,
          fees: r.fees ? +r.fees : 0,
          total: r.total ? +r.total : 0,
          source: r.source
        }));
      default:
        throw new Error(`Importação de ${tableName} não suportada`);
    }
  }

  // Download helper
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Initialize Backup panel
  function initBackupPanel() {
    console.log('[Backup] initBackupPanel called');
    
    const btnExportJSON = document.getElementById('btnExportJSON');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnDurabilityBackupNow = document.getElementById('btnDurabilityBackupNow');
    const durabilityStatus = document.getElementById('durabilityStatus');
    const backupImportForm = document.getElementById('backupImportForm');
    const backupFile = document.getElementById('backupFile');
    const backupImportResult = document.getElementById('backupImportResult');

    // Fase 17 — status de durabilidade + botão Backup Agora
    if (btnDurabilityBackupNow) {
      btnDurabilityBackupNow.addEventListener('click', () => {
        const r = window.Durability?.downloadBackup('manual');
        if (r?.success) showToast('Backup completo exportado (dados + snapshots)', 'success');
        else showToast('Falha no backup: ' + (r?.error || 'desconhecido'), 'error');
      });
    }
    if (durabilityStatus) {
      try {
        const h = window.Durability?.healthCheck();
        const last = localStorage.getItem('investidor10-last-backup');
        const days = last ? Math.floor((Date.now() - +last) / 86400000) : null;
        durabilityStatus.innerHTML = h?.healthy
          ? `🛡️ Storage íntegro${days !== null ? ` · último backup há ${days}d` : ' · nenhum backup ainda'}`
          : '⚠️ Storage com problemas — veja o console';
      } catch {}
    }
    
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => {
        if (!window.CARTEIRA_DATA) {
          showToast('Carteira não carregada', 'error');
          return;
        }
        const json = exportJSON(window.CARTEIRA_DATA);
        downloadFile(json, `backup-investidor10-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        showToast('Backup JSON exportado', 'success');
      });
    }
    
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        if (!window.CARTEIRA_DATA) {
          showToast('Carteira não carregada', 'error');
          return;
        }
        const data = window.CARTEIRA_DATA;
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Download each CSV
        if (data.positions?.length) {
          downloadFile(exportCSV(data, 'positions'), `posicoes-${timestamp}.csv`, 'text/csv');
        }
        if (data.earnings?.length) {
          downloadFile(exportCSV(data, 'earnings'), `proventos-${timestamp}.csv`, 'text/csv');
        }
        if (data.entries?.length) {
          downloadFile(exportCSV(data, 'entries'), `lancamentos-${timestamp}.csv`, 'text/csv');
        }
        if (data.monthly?.length) {
          downloadFile(exportCSV(data, 'monthly'), `mensal-${timestamp}.csv`, 'text/csv');
        }
        if (data.patrimony?.length) {
          downloadFile(exportCSV(data, 'patrimony'), `patrimonio-${timestamp}.csv`, 'text/csv');
        }
        if (data.allocation?.items?.length) {
          downloadFile(exportCSV(data, 'allocation'), `alocacao-${timestamp}.csv`, 'text/csv');
        }
        
        showToast('CSVs exportados (verifique downloads)', 'success');
      });
    }
    
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', async () => {
        if (!window.CARTEIRA_DATA) {
          showToast('Carteira não carregada', 'error');
          return;
        }
        
        btnExportExcel.disabled = true;
        btnExportExcel.textContent = 'Gerando...';
        
        try {
          const result = await exportExcel(window.CARTEIRA_DATA);
          const timestamp = new Date().toISOString().split('T')[0];
          
          if (result instanceof ArrayBuffer) {
            // SheetJS available - download xlsx
            downloadFile(result, `backup-investidor10-${timestamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showToast('Excel exportado', 'success');
          } else {
            // Fallback - download zip of CSVs
            // For simplicity, just download first CSV
            const firstKey = Object.keys(result)[0];
            if (firstKey) {
              downloadFile(result[firstKey], firstKey, 'text/csv');
            }
            showToast('CSVs exportados (SheetJS não disponível para .xlsx)', 'warning');
          }
        } catch (e) {
          showToast('Erro ao exportar Excel: ' + e.message, 'error');
        } finally {
          btnExportExcel.disabled = false;
          btnExportExcel.textContent = 'Excel (multi-aba)';
        }
      });
    }
    
    if (backupImportForm && backupFile) {
      backupImportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = backupFile.files[0];
        if (!file) {
          showToast('Selecione um arquivo', 'error');
          return;
        }
        
        if (!file.name.endsWith('.json')) {
          showToast('Apenas arquivos .json são suportados para importação completa', 'error');
          return;
        }
        
        backupImportResult.style.display = 'block';
        backupImportResult.innerHTML = '<span class="text-muted">Processando...</span>';
        
        try {
          const text = await file.text();
          const importedData = await importJSON(text);
          
          // Validate critical data
          if (!importedData.positions || !Array.isArray(importedData.positions)) {
            throw new Error('Dados de posições inválidos');
          }
          
          // Apply to CARTEIRA_DATA + override + MOCK_DATA (renders lêem MOCK_DATA)
          window.CARTEIRA_DATA = importedData;
          window.__CARTEIRA_OVERRIDE = importedData;
          if (window.MOCK_DATA) {
            Object.assign(window.MOCK_DATA.kpis, importedData.kpis || {});
            ['monthly', 'patrimony', 'allocation', 'positions', 'earnings', 'entries', 'assetReturns', 'monthlyData']
              .forEach(k => { if (importedData[k]) window.MOCK_DATA[k] = importedData[k]; });
          }

          // Persiste na chave que loadFromStorage() lê (investidor10-dashboard-data)
          localStorage.setItem('investidor10-dashboard-data', JSON.stringify({
            positions: importedData.positions,
            entries: importedData.entries,
            earnings: importedData.earnings,
            kpis: importedData.kpis,
            monthly: importedData.monthly,
            monthlyData: importedData.monthlyData,
            patrimony: importedData.patrimony,
            allocation: importedData.allocation,
            assetReturns: importedData.assetReturns,
            theme: document.documentElement.getAttribute('data-theme') || 'light',
            timestamp: Date.now()
          }));
          
          // Re-render
          if (typeof renderAll === 'function') {
            renderAll();
          } else {
            if (typeof renderPositions === 'function') renderPositions();
            if (typeof renderKPIs === 'function') renderKPIs();
            if (typeof renderEarnings === 'function') renderEarnings();
            if (typeof renderEntries === 'function') renderEntries();
          }
          
          // Capture snapshot
          if (window.Investidor10Advanced?.SnapshotManager) {
            window.Investidor10Advanced.SnapshotManager.capture(window.CARTEIRA_DATA, 'backup-import');
          }
          
          backupImportResult.innerHTML = `<span class="text-success">✅ Backup importado com sucesso! ${importedData.positions.length} posições, ${importedData.earnings?.length || 0} proventos, ${importedData.entries?.length || 0} lançamentos.</span>`;
          backupImportResult.style.color = 'var(--color-success)';
          showToast('Backup importado com sucesso', 'success');
          
        } catch (err) {
          backupImportResult.innerHTML = `<span class="text-error">❌ Erro: ${err.message}</span>`;
          backupImportResult.style.color = 'var(--color-error)';
          showToast('Erro ao importar backup: ' + err.message, 'error');
        }
        
        // Reset form
        backupFile.value = '';
      });
    }
  }

  // Expose globally
  window.BackupPortability = {
    SCHEMA,
    validateSchema,
    migrateV1toV2,
    exportJSON,
    exportCSV,
    exportExcel,
    importJSON,
    importCSV,
    downloadFile,
    initBackupPanel
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackupPanel);
  } else {
    initBackupPanel();
  }

})();