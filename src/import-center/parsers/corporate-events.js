// src/import-center/parsers/corporate-events.js
// Parser para Eventos Corporativos (Dividendos, JCP, Amortizações, Grupamentos, Desdobramentos, etc.)
// Suporta: CSV B3, CSV Bróker, XLSX, JSON Investidor10
// Uso: window.ImportCenter.parseCorporateEvents(data, format)

(function() {
  'use strict';

  // Mapeamento de tipos de evento
  const EVENT_TYPE_MAP = {
    // B3 / CEI
    'dividendo': 'dividend',
    'dividendos': 'dividend',
    'jcp': 'jcp',
    'juros sobre capital próprio': 'jcp',
    'juros sobre capital proprio': 'jcp',
    'amortização': 'amortization',
    'amortizacao': 'amortization',
    'rendimento': 'rendimento',
    'rendimentos': 'rendimento',
    'grupamento': 'split_reverse',
    'grupamento de ações': 'split_reverse',
    'desdobramento': 'split',
    'desdobramento de ações': 'split',
    'subscrição': 'subscription',
    'subscricao': 'subscription',
    'cessão de direitos': 'rights',
    'cessao de direitos': 'rights',
    'direito de subscrição': 'rights',
    'direito de subscricao': 'rights',
    'reembolso': 'reimbursement',
    
    // Brókeres (padrões comuns)
    'dividend': 'dividend',
    'jcp': 'jcp',
    'interest on capital': 'jcp',
    'amortization': 'amortization',
    'yield': 'rendimento',
    'stock split': 'split',
    'reverse split': 'split_reverse',
    'rights issue': 'rights',
    'rights offering': 'rights',
    
    // Generic
    'provento': 'dividend',
    'proventos': 'dividend'
  };

  function deaccent(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function parseNumBR(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === '' || s === '-') return null;
    // Formato BR: vírgula decimal
    if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s) || /^-?,\d+$/.test(s)) {
      const n = Number(s.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    // Formato EN
    const n = Number(s.replace(',', ''));
    return Number.isFinite(n) ? n : null;
  }

  function parseDateBR(v) {
    // "01/10/2026" -> "2026-10-01"
    const m = String(v || '').trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  function parseDateISO(v) {
    // "2026-10-01" -> "2026-10-01"
    const m = String(v || '').trim().match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }

  function detectEventType(rawType) {
    const normalized = deaccent(String(rawType || '').toLowerCase().trim());
    for (const [key, type] of Object.entries(EVENT_TYPE_MAP)) {
      if (normalized.includes(key)) return type;
    }
    return 'dividend'; // default
  }

  function extractTicker(produto) {
    const m = String(produto || '').trim().match(/^([A-Z0-9]{4,6}(?:F|11)?)[\s-]/);
    return m ? m[1] : null;
  }

  function extractName(produto) {
    const s = String(produto || '').trim();
    const m = s.match(/^[A-Z0-9]{4,6}(?:F|11)?\s*-\s*(.*)$/);
    return m ? m[1].trim() : s;
  }

  // Parser para CSV B3 Eventos (header: Tipo;Data;Ativo;Quantidade;Valor;Preço)
  function parseB3EventsCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const header = lines[0].toLowerCase();
    const delimiter = header.includes(';') ? ';' : ',';
    const events = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      if (cols.length < 3) continue;
      
      const rawType = cols[0];
      const date = parseDateBR(cols[1]) || parseDateISO(cols[1]);
      const ticker = extractTicker(cols[2]) || cols[2];
      const qty = parseNumBR(cols[3]);
      const perShare = parseNumBR(cols[4]);
      const gross = parseNumBR(cols[5]);
      
      if (!date || !ticker) continue;
      
      events.push({
        date,
        ticker: ticker.toUpperCase(),
        name: extractName(cols[2]) || ticker,
        type: detectEventType(rawType),
        perShare: perShare || 0,
        qty: qty || 0,
        gross: gross || (perShare * (qty || 0)) || 0,
        tax: 0,
        net: gross || (perShare * (qty || 0)) || 0,
        source: 'b3-csv',
        rawType
      });
    }
    
    return events;
  }

  // Parser para CSV genérico de proventos
  function parseGenericDividendCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const header = lines[0].toLowerCase();
    const delimiter = header.includes(';') ? ';' : ',';
    
    // Mapeia colunas por nome
    const headerCols = lines[0].split(delimiter).map(c => c.trim().toLowerCase());
    const colMap = {};
    headerCols.forEach((name, idx) => {
      if (name.includes('tipo') || name.includes('event')) colMap.type = idx;
      else if (name.includes('data') || name.includes('date')) colMap.date = idx;
      else if (name.includes('ativo') || name.includes('ticker') || name.includes('codigo')) colMap.ticker = idx;
      else if (name.includes('quantidade') || name.includes('qty') || name.includes('qtd')) colMap.qty = idx;
      else if (name.includes('valor') || name.includes('value') || name.includes('bruto') || name.includes('gross')) colMap.gross = idx;
      else if (name.includes('preço') || name.includes('price') || name.includes('unit')) colMap.perShare = idx;
      else if (name.includes('imposto') || name.includes('tax') || name.includes('ir')) colMap.tax = idx;
      else if (name.includes('líquido') || name.includes('liquido') || name.includes('net')) colMap.net = idx;
    });
    
    const events = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      if (cols.length < 3) continue;
      
      const date = parseDateBR(cols[colMap.date]) || parseDateISO(cols[colMap.date]);
      const ticker = (cols[colMap.ticker] || '').toUpperCase();
      const rawType = cols[colMap.type] || 'dividend';
      const qty = parseNumBR(cols[colMap.qty]) || 0;
      const perShare = parseNumBR(cols[colMap.perShare]) || 0;
      const gross = parseNumBR(cols[colMap.gross]) || 0;
      const tax = parseNumBR(cols[colMap.tax]) || 0;
      const net = parseNumBR(cols[colMap.net]) || (gross - tax);
      
      if (!date || !ticker) continue;
      
      events.push({
        date,
        ticker,
        name: ticker,
        type: detectEventType(rawType),
        perShare,
        qty,
        gross,
        tax,
        net,
        source: 'generic-csv',
        rawType
      });
    }
    
    return events;
  }

  // Parser para XLSX (usa sheets já lidas)
  function parseCorporateEventsXLSX(sheets) {
    // Procura sheet com eventos/proventos
    const eventSheet = sheets.find(s => {
      const hdr = (s.rows[0] || []).join(' ').toLowerCase();
      return hdr.includes('provento') || hdr.includes('evento') || 
             hdr.includes('dividendo') || hdr.includes('jcp') ||
             hdr.includes('amortiza') || hdr.includes('rendimento');
    });
    
    if (!eventSheet) return [];
    
    const rows = eventSheet.rows.slice(1);
    const events = [];
    
    for (const r of rows) {
      // Tenta múltiplas posições de colunas
      const date = parseDateBR(r[0]) || parseDateBR(r[1]) || parseDateISO(r[0]) || parseDateISO(r[1]);
      const ticker = extractTicker(r[2]) || r[2] || r[3];
      const rawType = r[3] || r[2] || r[4] || 'dividend';
      const qty = parseNumBR(r[4]) || parseNumBR(r[5]) || 0;
      const perShare = parseNumBR(r[5]) || parseNumBR(r[6]) || 0;
      const gross = parseNumBR(r[6]) || parseNumBR(r[7]) || 0;
      
      if (!date || !ticker) continue;
      
      events.push({
        date,
        ticker: ticker.toUpperCase(),
        name: extractName(r[2]) || ticker,
        type: detectEventType(rawType),
        perShare,
        qty,
        gross,
        tax: 0,
        net: gross,
        source: 'b3-xlsx',
        rawType
      });
    }
    
    return events;
  }

  // Parser principal - detecta formato automaticamente
  async function parseCorporateEvents(data, formatHint) {
    // data pode ser: File, string (text/csv), ArrayBuffer (xlsx), JSON
    let events = [];
    
    if (data instanceof File) {
      const ext = data.name.split('.').pop().toLowerCase();
      if (ext === 'csv') {
        const text = await data.text();
        events = parseB3EventsCSV(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await data.arrayBuffer();
        const sheets = await window.ImportCenter.readXlsx(buf);
        events = parseCorporateEventsXLSX(sheets);
      } else if (ext === 'json') {
        const text = await data.text();
        const json = JSON.parse(text);
        if (json.events) events = json.events;
        else if (json.earnings) events = json.earnings;
      }
    } else if (typeof data === 'string') {
      // Tenta CSV
      events = parseB3EventsCSV(data);
      if (events.length === 0) events = parseGenericDividendCSV(data);
    } else if (data instanceof ArrayBuffer) {
      const sheets = await window.ImportCenter.readXlsx(data);
      events = parseCorporateEventsXLSX(sheets);
    } else if (Array.isArray(data)) {
      events = data; // Já é array de eventos
    }
    
    // Adiciona metadados
    return events.map(e => ({
      ...e,
      _sourceFormat: formatHint || 'auto',
      _parsedAt: new Date().toISOString()
    }));
  }

  // Expõe API
  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.parseCorporateEvents = parseCorporateEvents;
  window.ImportCenter.EVENT_TYPE_MAP = EVENT_TYPE_MAP;
  
  // Registra parser
  if (window.ImportCenter.parsers) {
    window.ImportCenter.parsers['corporate-events'] = parseCorporateEvents;
    window.ImportCenter.parsers['b3-events'] = async (data) => {
      if (data instanceof File) {
        const text = await data.text();
        return parseB3EventsCSV(text);
      }
      return parseB3EventsCSV(data);
    };
  }

})();