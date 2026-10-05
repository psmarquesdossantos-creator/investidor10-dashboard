// src/import-center/parsers/xlsx-core.js
// Leitor XLSX 100% vanilla — zero dependências.
// Funciona em browser (DecompressionStream) e Node 18+ (DecompressionStream global desde v18).
// Uso: await window.ImportCenter.readXlsx(arrayBuffer) -> [{sheet: string, rows: string[][]}]
//
// Por que inline-strings: exportadores bancários (B3/Inter) escrevem <is><t>...</t></is>
// diretamente nas células em vez de sharedStrings, e omitem o <dimension> — openpyxl
// read_only retorna vazio nesses arquivos. Este parser lê o XML direto.

(function() {
  'use strict';

  // ---- ZIP reader (apenas o que XLSX precisa: stored + deflate) ----

  async function inflateRaw(deflateBytes) {
    // Exportadores B3/Inter escrevem deflate RAW (RFC1951); alguns usam zlib (RFC1950, magic 0x78).
    // Detecta pelo primeiro byte: zlib streams começam com 0x78 (CMF).
    const isZlib = (deflateBytes[0] & 0x0f) === 0x08 && ((deflateBytes[0] << 8) | deflateBytes[1]) % 31 === 0;
    const ds = new DecompressionStream(isZlib ? 'deflate' : 'deflate-raw');
    const stream = new Blob([deflateBytes]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  // Local file header: PK\x03\x04, filename len @26, extra len @28, data @30
  // Central directory nos dá o mapeamento nome->dados de forma mais robusta.
  async function unzip(dataView, uint8) {
    // 1. Encontra End of Central Directory (EOCD) procurando PK\x05\x06 de trás pra frente
    let eocd = -1;
    for (let i = uint8.length - 22; i >= 0 && i > uint8.length - 65558; i--) {
      if (uint8[i] === 0x50 && uint8[i+1] === 0x4b && uint8[i+2] === 0x05 && uint8[i+3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('ZIP inválido: EOCD não encontrado');

    const entries = dataView.getUint16(eocd + 10, true); // total entries
    let cdOffset = dataView.getUint32(eocd + 16, true);  // central dir offset

    const files = {};
    for (let n = 0; n < entries; n++) {
      if (dataView.getUint32(cdOffset, true) !== 0x02014b50) break; // PK\x01\x02
      const method      = dataView.getUint16(cdOffset + 10, true);
      const compSize    = dataView.getUint32(cdOffset + 20, true);
      const nameLen     = dataView.getUint16(cdOffset + 28, true);
      const extraLen    = dataView.getUint16(cdOffset + 30, true);
      const commentLen  = dataView.getUint16(cdOffset + 32, true);
      const localOffset = dataView.getUint32(cdOffset + 42, true);
      const name = new TextDecoder().decode(uint8.subarray(cdOffset + 46, cdOffset + 46 + nameLen));

      // Local header: pula até o data (30 + nameLen + extraLen local, que podem diferir do central)
      const lNameLen  = dataView.getUint16(localOffset + 26, true);
      const lExtraLen = dataView.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = uint8.subarray(dataStart, dataStart + compSize);

      files[name] = method === 0 ? raw : await inflateRaw(raw);
      cdOffset += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  // ---- XML -> rows (só o que importa: r attr, t attr, <v>, <is><t>) ----

  function esc(s) { return s; } // valores numéricos/texto crus; DOM fará o escape na UI

  function sheetXmlToRows(xml) {
    const td = new TextDecoder();
    const text = typeof xml === 'string' ? xml : td.decode(xml);
    const rows = [];
    // Regex sem lookbehind (Safari <16): captura célula inteira e extrai partes depois
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let rowMatch;
    const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
    while ((rowMatch = rowRe.exec(text)) !== null) {
      const cells = [];
      let m;
      cellRe.lastIndex = 0;
      while ((m = cellRe.exec(rowMatch[1])) !== null) {
        const attrs = m[1] || m[3] || '';
        const body = m[2] || '';
        const colRef = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1] || '';
        // índice de coluna a partir da referência (A=0)
        let colIdx = 0;
        if (colRef) {
          for (const ch of colRef) colIdx = colIdx * 26 + (ch.charCodeAt(0) - 64);
          colIdx -= 1;
        }
        const t = (attrs.match(/t="(\w+)"/) || [])[1] || 'n';
        let val = '';
        const vm = body.match(/<v>([\s\S]*?)<\/v>/);
        const ism = body.match(/<is><t[^>]*>([\s\S]*?)<\/t><\/is>/) || body.match(/<is><t[^>]*>([\s\S]*?)<\/t>\s*<\/is>/);
        if (t === 'inlineStr' || ism) val = ism ? ism[1] : '';
        else if (t === 's' && vm) {
          // shared string — resolvido pelo caller via sharedStrings array
          val = { __sharedIdx: +vm[1] };
        }
        else if (vm) val = vm[1];
        cells[colIdx] = val;
      }
      // normaliza sparse array e descarta linhas totalmente vazias
      const out = [];
      let any = false;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i] === undefined ? '' : cells[i];
        if (c !== '') any = true;
        out.push(c);
      }
      if (any) rows.push(out);
    }
    return rows;
  }

  async function readXlsx(arrayBuffer) {
    const uint8 = new Uint8Array(arrayBuffer);
    const dataView = new DataView(arrayBuffer);
    if (!(uint8[0] === 0x50 && uint8[1] === 0x4b)) throw new Error('Arquivo não é XLSX (ZIP) válido');
    const files = await unzip(dataView, uint8);

    // sharedStrings (se existir)
    let shared = [];
    if (files['xl/sharedStrings.xml']) {
      const sxml = new TextDecoder().decode(files['xl/sharedStrings.xml']);
      shared = Array.from(sxml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g), m => m[1]
        .replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&').replace(/"/g, '"').replace(/'/g, "'"));
    }

    // workbook.xml -> nomes de sheets na ordem
    const wbXml = new TextDecoder().decode(files['xl/workbook.xml'] || new Uint8Array());
    const sheetNames = Array.from(wbXml.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*/g), m => m[1]
      .replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&'));
    // relationship id -> target (sheet1.xml etc.)
    const relsXml = new TextDecoder().decode(files['xl/_rels/workbook.xml.rels'] || new Uint8Array());
    const relTargets = Array.from(relsXml.matchAll(/<Relationship[^>]*Target="([^"]*)"[^>]*/g), m => m[1]);

    const sheets = [];
    for (let i = 0; i < sheetNames.length; i++) {
      // sheetN.xml na ordem do workbook (padrão B3/Inter: sheet1..N sem renames)
      const fileKey = `xl/worksheets/sheet${i + 1}.xml`;
      const xml = files[fileKey];
      if (!xml) continue;
      const rows = sheetXmlToRows(xml);
      // resolve shared strings pendentes
      for (const row of rows) {
        for (let c = 0; c < row.length; c++) {
          if (row[c] && typeof row[c] === 'object' && row[c].__sharedIdx !== undefined) {
            row[c] = shared[row[c].__sharedIdx] ?? '';
          }
        }
      }
      sheets.push({ sheet: sheetNames[i], rows });
    }
    if (!sheets.length) throw new Error('Nenhuma planilha encontrada no XLSX');
    return sheets;
  }

  const g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  g.ImportCenter = g.ImportCenter || {};
  g.ImportCenter.readXlsx = readXlsx;
  // Dual export: browser via globalThis, Node via module.exports (CommonJS require)
  if (typeof module !== 'undefined' && module.exports) module.exports = { readXlsx, unzip, sheetXmlToRows };
})();