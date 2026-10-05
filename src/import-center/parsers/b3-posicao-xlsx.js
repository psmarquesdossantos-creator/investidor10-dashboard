// src/import-center/parsers/b3-posicao-xlsx.js
// Parser para XLSX "Posição" da B3/Inter (export B3 → Posição em Contas e Custódia).
// 5 sheets: Acoes | Empréstimos | ETF | Fundo de Investimento | Renda Fixa
// Colunas resolvidas por NOME do header (à prova de reordenação); ignora linha "Total".
// Uso: window.ImportCenter.parseB3PosicaoXlsx(sheets)

(function() {
  'use strict';

  function deaccent(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  function parseNum(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === '' || s === '-') return null;
    // formato BR: vírgula decimal
    if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s)) {
      const n = Number(s.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    // formato EN (B3 XLSX usa ponto): "23.72", "0.018", "5953.72"
    const n2 = Number(s);
    return Number.isFinite(n2) ? n2 : null;
  }

  function parseDateBR(v) {
    const m = String(v || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  function findSheet(sheets, namePart) {
    const target = deaccent(namePart).toLowerCase();
    return sheets.find(s => deaccent(s.sheet).toLowerCase().includes(target)) || null;
  }

  // Mapa header-normalizado -> índice de coluna
  function headerIndex(headerRow) {
    const map = {};
    (headerRow || []).forEach((h, i) => {
      const key = deaccent(String(h || '').trim()).toLowerCase();
      if (key) map[key] = i;
    });
    return map;
  }

  function hget(map, row, ...names) {
    for (const n of names) {
      const idx = map[deaccent(n).toLowerCase()];
      if (idx !== undefined && row[idx] !== undefined && String(row[idx]).trim() !== '') {
        return String(row[idx]).trim();
      }
    }
    return '';
  }

  function hnum(map, row, ...names) {
    const v = hget(map, row, ...names);
    return v === '' ? null : parseNum(v);
  }

  // ---- Ações / ETF / Fundos: header padrão posição B3 ----
  function parseAssetSheet(sheet, classHint) {
    if (!sheet) return [];
    const rows = sheet.rows;
    let hdrIdx = rows.findIndex(r => deaccent(String(r[0] || '')).trim().toLowerCase().startsWith('produto'));
    if (hdrIdx < 0) return [];
    const hdr = headerIndex(rows[hdrIdx]);
    const out = [];
    for (let i = hdrIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const produto = hget(hdr, r, 'Produto');
      if (!produto || /^total$/i.test(produto)) continue;
      const ticker = hget(hdr, r, 'Código de Negociação') || (produto.match(/^([A-Z0-9]{4,6})/) || [])[1] || '';
      const qty = hnum(hdr, r, 'Quantidade') ?? 0;
      const currentPrice = hnum(hdr, r, 'Preço de Fechamento') ?? 0;
      const value = hnum(hdr, r, 'Valor Atualizado') ?? 0;
      if (qty === 0 && value === 0) continue;
      out.push({
        ticker: ticker.toUpperCase(),
        name: produto.split(' - ')[1] || produto,
        class: classHint,
        qty, currentPrice, value,
        institution: hget(hdr, r, 'Instituição'),
        account: hget(hdr, r, 'Conta'),
        cnpj: hget(hdr, r, 'CNPJ da Empresa', 'CNPJ do Fundo'),
        raw: r
      });
    }
    return out;
  }

  // ---- Empréstimos (aluguel de ativos): Doador/Tomador ----
  function parseEmprestimosSheet(sheet) {
    if (!sheet) return [];
    const rows = sheet.rows;
    let hdrIdx = rows.findIndex(r => deaccent(String(r[0] || '')).trim().toLowerCase().startsWith('produto'));
    if (hdrIdx < 0) return [];
    const hdr = headerIndex(rows[hdrIdx]);
    const out = [];
    for (let i = hdrIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const produto = hget(hdr, r, 'Produto');
      if (!produto || /^total$/i.test(produto)) continue;
      const qty = hnum(hdr, r, 'Quantidade') ?? 0;
      const value = hnum(hdr, r, 'Valor Atualizado') ?? 0;
      if (qty === 0 && value === 0) continue;
      out.push({
        ticker: (produto.match(/^([A-Z0-9]{4,6})/) || [])[1] || produto,
        name: produto.split(' - ')[1] || produto,
        class: 'emprestimo',
        natureza: hget(hdr, r, 'Natureza'),                 // Doador | Tomador
        contrato: hget(hdr, r, 'Número de Contrato'),
        modalidade: hget(hdr, r, 'Modalidade'),
        taxa: hnum(hdr, r, 'Taxa') ?? 0,
        dataRegistro: parseDateBR(hget(hdr, r, 'Data de registro')) || null,
        dataVencimento: parseDateBR(hget(hdr, r, 'Data de vencimento')) || null,
        qty,
        currentPrice: hnum(hdr, r, 'Preço de Fechamento') ?? 0,
        value,
        raw: r
      });
    }
    return out;
  }

    // ---- Renda Fixa: CDBs etc. (cenários MTM/CURVA/FECHAMENTO) ----
  function parseRendaFixaSheet(sheet) {
    if (!sheet) return [];
    const rows = sheet.rows;
    let hdrIdx = rows.findIndex(r => deaccent(String(r[0] || '')).trim().toLowerCase().startsWith('produto'));
    if (hdrIdx < 0) return [];
    const hdr = headerIndex(rows[hdrIdx]);
    // prioridade de cenário: FECHAMENTO > CURVA > MTM; índices de Preço e Valor por nome completo
    const cenarios = [
      { p: hdr['preço atualizado fechamento'], v: hdr['valor atualizado fechamento'] },
      { p: hdr['preço atualizado curva'], v: hdr['valor atualizado curva'] },
      { p: hdr['preço atualizado mtm'], v: hdr['valor atualizado mtm'] }
    ].filter(c => c.v !== undefined);
    const out = [];
    for (let i = hdrIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const produto = hget(hdr, r, 'Produto');
      if (!produto || /^total$/i.test(produto)) continue;
      const qty = hnum(hdr, r, 'Quantidade') ?? 0;
      let currentPrice = 0, value = 0;
      for (const c of cenarios) {
        const v = parseNum(r[c.v]);
        if (v !== null && v > 0) {
          value = v;
          currentPrice = c.p !== undefined ? (parseNum(r[c.p]) ?? 0) : 0;
          break;
        }
      }
      if (qty === 0 && value === 0) continue;
      out.push({
        ticker: hget(hdr, r, 'Código') || produto,
        name: produto,
        class: 'fixed',
        indexer: hget(hdr, r, 'Indexador'),
        regime: hget(hdr, r, 'Tipo de regime'),
        emissao: parseDateBR(hget(hdr, r, 'Data de Emissão')) || null,
        vencimento: parseDateBR(hget(hdr, r, 'Vencimento')) || null,
        qty,
        currentPrice,
        value,
        institution: hget(hdr, r, 'Instituição'),
        emissor: hget(hdr, r, 'Emissor'),
        raw: r
      });
    }
    return out;
  }

  function parseB3PosicaoXlsx(sheets) {
    const result = {
      acoes: parseAssetSheet(findSheet(sheets, 'Acoes'), 'stocks'),
      emprestimos: parseEmprestimosSheet(findSheet(sheets, 'Empréstimos')),
      etfs: parseAssetSheet(findSheet(sheets, 'ETF'), 'etfs'),
      fundos: parseAssetSheet(findSheet(sheets, 'Fundo de Investimento'), 'fiis'),
      rendaFixa: parseRendaFixaSheet(findSheet(sheets, 'Renda Fixa')),
      source: 'B3_POSICAO_XLSX'
    };
    result.total = result.acoes.length + result.emprestimos.length + result.etfs.length +
                   result.fundos.length + result.rendaFixa.length;
    if (result.total === 0) throw new Error('Nenhuma posição encontrada no XLSX da B3');
    return result;
  }

  const g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  g.ImportCenter = g.ImportCenter || {};
  g.ImportCenter.parseB3PosicaoXlsx = parseB3PosicaoXlsx;
  // Dual export: browser via globalThis, Node via module.exports (CommonJS require)
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseB3PosicaoXlsx };
})();