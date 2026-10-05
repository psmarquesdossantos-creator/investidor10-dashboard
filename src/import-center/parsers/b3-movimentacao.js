// src/import-center/parsers/b3-movimentacao.js
// Parser para XLSX "Movimentação" da B3/Inter (export do site B3 → Movimentação).
// Schema: Entrada/Saída | Data | Movimentação | Produto | Instituição | Quantidade | Preço unitário | Valor da Operação
// Cobre: Rendimento, JSCP, Dividendo, Amortização, Resgate, Restituição de Capital,
//        APLICAÇÃO, Transferência-Liquidação (compra/venda), Empréstimo (aluguel), Cessão de Direitos, subscrições.
// Uso: window.ImportCenter.parseB3Movimentacao(sheets) — sheets = saída de readXlsx()

(function() {
  'use strict';

  // Chaves MAIS ESPECÍFICAS primeiro (matching por prefixo)
  const MOV_MAP = [
    ['CESSAO DE DIREITOS - SOLICITADA', 'cessao_solicitada'],
    ['DIREITOS DE SUBSCRICAO - NAO EXERCIDO', 'subscricao_nao_exercida'],
    ['TRANSFERENCIA - LIQUIDACAO', 'transferencia_liquidacao'],
    ['RESTITUICAO DE CAPITAL', 'restituicao'],
    ['JUROS SOBRE CAPITAL PROPRI', 'jcp'],
    ['RENDIMENTO', 'rendimento'],
    ['DIVIDENDO', 'dividendo'],
    ['AMORTIZACAO', 'amortizacao'],
    ['RESGATE', 'resgate'],
    ['APLICACAO', 'aplicacao'],
    ['EMPRESTIMO', 'emprestimo'],
    ['TRANSFERENCIA', 'transferencia'],
    ['CESSAO DE DIREITOS', 'cessao_direitos'],
    ['DIREITO DE SUBSCRICAO', 'subscricao'],
    ['REEMBOLSO', 'reembolso']
  ];

  function deaccent(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // XLSX da B3/Inter usa ponto decimal puro ("23.72", "0.018", "5953.72").
  // CSVs de corretoras usam vírgula pt-BR. Detecta pelo padrão do valor.
  function parseNum(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === '' || s === '-') return null;
    // formato BR: vírgula decimal (com ou sem ponto de milhar)
    if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s) || /^-?,\d+$/.test(s)) {
      const n = Number(s.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    // formato EN/usado pela B3 XLSX: ponto decimal
    const n2 = Number(s);
    return Number.isFinite(n2) ? n2 : null;
  }

  function parseDateBR(v) {
    // "01/10/2026" -> "2026-10-01"
    const m = String(v || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  // Extrai ticker do campo Produto ("BTLG11 - BTG PACTUAL LOGISTICA ..." -> BTLG11)
  function extractTicker(produto) {
    const m = String(produto || '').trim().match(/^([A-Z0-9]{4,6}(?:F|11)?)[\s-]/);
    return m ? m[1] : null;
  }

  // Extrai nome limpo do Produto (sem ticker): "BTLG11 - BTG PACTUAL..." -> "BTG PACTUAL..."
  function extractName(produto) {
    const s = String(produto || '').trim();
    const m = s.match(/^[A-Z0-9]{4,6}(?:F|11)?\s*-\s*(.*)$/);
    return m ? m[1].trim() : s;
  }

  function detectMovSheet(sheets) {
    // sheet com header "Movimentação"
    for (const s of sheets) {
      const hdr = s.rows[0] || [];
      const j = deaccent((hdr[2] || '')).toUpperCase();
      if (j.startsWith('MOVIMENTACAO')) return s;
    }
    return null;
  }

  function parseB3Movimentacao(sheets) {
    const sheet = detectMovSheet(sheets);
    if (!sheet) throw new Error('Planilha de Movimentação não encontrada (header "Movimentação" ausente)');

    const rows = sheet.rows.slice(1); // pula header
    const events = [];
    const skipped = [];

    for (const r of rows) {
      const entradaSaida = String(r[0] || '').trim();        // Credito | Debito
      const rawMov = String(r[2] || '').trim();
      // linha "Total" ou vazia
      if (!rawMov || /^total$/i.test(rawMov)) continue;
      const date = parseDateBR(r[1]);
      const produto = String(r[3] || '').trim();
      const instituicao = String(r[4] || '').trim();
      const qty = parseNum(r[5]);
      const unitPrice = parseNum(r[6]);
      const valor = parseNum(r[7]);

      const key = deaccent(rawMov).toUpperCase().replace(/\s+/g, ' ').trim();
      let type = null;
      for (const [pat, val] of MOV_MAP) {
        if (key.startsWith(pat)) { type = val; break; }
      }

      if (!type) { skipped.push({ rawMov, produto }); continue; }
      if (!date) { skipped.push({ rawMov, produto, reason: 'data inválida' }); continue; }

      const ticker = extractTicker(produto);

      events.push({
        type,
        rawMov,
        entradaSaida,
        date,
        ticker,           // null para RF (ex: "CDB - CDBA260Y6ZR")
        productName: extractName(produto),
        institution: instituicao,
        qty: qty ?? 0,
        unitPrice: unitPrice ?? 0,
        valor: valor ?? 0,
        source: 'B3_MOVIMENTACAO',
        raw: r
      });
    }

    return { events, skipped, sheetName: sheet.sheet };
  }

  const g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  // ===== Importação de Movimentação (escrita com merge + dedupe) =====

  // Mapeia eventos B3 -> shapes de MOCK_DATA.earnings / MOCK_DATA.entries
  // PROVENTOS (rendimento/jcp/dividendo/amortizacao/restituicao/reembolso/resgate)
  const EARNING_TYPES = { rendimento: 'dividend', jcp: 'jcp', dividendo: 'dividend', amortizacao: 'dividend', restituicao: 'dividend', reembolso: 'dividend', resgate: 'dividend' };
  function toEarnings(events) {
    return events.filter(e => EARNING_TYPES[e.type] && e.ticker).map(e => ({
      date: e.date,
      ticker: e.ticker,
      name: e.productName,
      type: EARNING_TYPES[e.type],
      perShare: e.qty > 0 ? +(e.valor / e.qty).toFixed(6) : 0,
      qty: e.qty,
      gross: +e.valor.toFixed(2),
      tax: 0, // IR retido na fonte não vem separado no XLSX da movimentação
      net: +e.valor.toFixed(2),
      source: 'b3-movimentacao'
    }));
  }

  // OPERAÇÕES (transferencia_liquidacao = compra/venda por liquidação; aplicacao = aporte RF)
  function toEntries(events) {
    return events.filter(e => ['transferencia_liquidacao', 'aplicacao'].includes(e.type)).map(e => {
      const isSell = e.entradaSaida.toLowerCase().startsWith('debit');
      return {
        date: e.date,
        ticker: e.ticker || e.productName,
        name: e.productName,
        type: e.type === 'aplicacao' ? 'buy' : (isSell ? 'sell' : 'buy'),
        qty: e.qty,
        price: e.unitPrice,
        value: e.valor,
        fees: 0,
        source: 'b3-movimentacao'
      };
    });
  }

  // Escreve proventos + operações no CARTEIRA_DATA com snapshot prévio e dedupe.
  // Retorna { success, addedEarnings, addedEntries, duplicates }
  function writeMovimentacao(events) {
    try {
      const g = typeof window !== 'undefined' ? window : globalThis;
      const C = g.CARTEIRA_DATA;
      if (!C) throw new Error('CARTEIRA_DATA não inicializado');

      // Snapshot ANTES (durabilidade — Fase 17)
      if (g.Investidor10Advanced?.SnapshotManager) {
        const pre = g.Investidor10Advanced.SnapshotManager.capture(C, 'pre-import-movimentacao');
        if (!pre.saved) console.warn('[mov] snapshot pré-import falhou:', pre.error);
      }

      C.earnings = Array.isArray(C.earnings) ? C.earnings : [];
      C.entries = Array.isArray(C.entries) ? C.entries : [];

      const existing = new Set(
        C.earnings.map(e => `${e.date}|${e.ticker}|${e.type}|${e.gross}`.toLowerCase())
        .concat(C.entries.map(e => `${e.date}|${e.ticker}|${e.type}|${e.value}`.toLowerCase()))
      );

      const newEarnings = toEarnings(events).filter(e => {
        const k = `${e.date}|${e.ticker}|${e.type}|${e.gross}`.toLowerCase();
        if (existing.has(k)) return false;
        existing.add(k); return true;
      });
      const newEntries = toEntries(events).filter(e => {
        const k = `${e.date}|${e.ticker}|${e.type}|${e.value}`.toLowerCase();
        if (existing.has(k)) return false;
        existing.add(k); return true;
      });

      C.earnings.push(...newEarnings);
      C.entries.push(...newEntries);
      // proventos 12m (KPI) recalculado a partir dos earnings reais
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 12);
      const last12 = C.earnings.filter(e => new Date(e.date) >= cutoff);
      const sum12 = last12.reduce((s, e) => s + (e.net || e.gross || 0), 0);
      if (C.kpis) {
        C.kpis.earnings12m = +sum12.toFixed(2);
        C.kpis.dividends = +C.earnings.reduce((s, e) => s + (e.net || e.gross || 0), 0).toFixed(2);
      }

      if (typeof applyRealData === 'function') applyRealData();
      if (g.Investidor10Advanced?.SnapshotManager) {
        g.Investidor10Advanced.SnapshotManager.capture(C, 'import-movimentacao');
      }
      if (typeof renderAll === 'function') renderAll();
      else if (typeof g.renderAll === 'function') g.renderAll();
      if (typeof g.updateDataState === 'function') g.updateDataState('fresh', 'import-movimentacao');

      const duplicates = (events.length - newEarnings.length - newEntries.length);
      return { success: true, addedEarnings: newEarnings.length, addedEntries: newEntries.length, duplicates: Math.max(0, duplicates) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  g.ImportCenter = g.ImportCenter || {};
  g.ImportCenter.parseB3Movimentacao = parseB3Movimentacao;
  g.ImportCenter.toEarnings = toEarnings;
  g.ImportCenter.toEntries = toEntries;
  g.ImportCenter.writeMovimentacao = writeMovimentacao;
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseB3Movimentacao, toEarnings, toEntries, writeMovimentacao };
})();