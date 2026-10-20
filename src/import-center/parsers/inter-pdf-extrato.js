// src/import-center/parsers/inter-pdf-extrato.js
// Fase 18 — Conciliação: Extrato PDF Inter (Renda Variável + Renda Fixa) vs Posição B3 XLSX
// O extrato traz PREÇO MÉDIO e custo (que a posição B3 não tem) e notas CDB completas.
// Input: texto plano do PDF (pdftotext -layout no build; no browser o usuário cola o texto
// do extrato — ver painel Conciliação). Sem dependências: parsing por regex de blocos.
// Uso: window.Reconciliation.parseExtratoRV(text) / .parseExtratoRF(text)
//      window.Reconciliation.reconcile(extrato, posicaoB3, carteiraAtual)

(function() {
  'use strict';
  const g = typeof window !== 'undefined' ? window : globalThis;

  // PDFs do Inter vêm com acentos quebrados (sem ToUnicode). Normaliza NFKD + remove
  // diacríticos e qualquer char de controle antes do matching — à prova de encoding.
  function norm(s) {
    return String(s || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')   // diacríticos
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // não-ASCII residual -> espaço (PRESERVA quebras de linha)
      .replace(/[^\S\n\r]+/g, ' ')         // colapsa espaços, mantém \n/\r
  }

  // moeda pt-BR: "R$ [exemplo sintético omitido]" -> 4929.64
  function br(v) {
    const m = String(v || '').replace(/R\$/g, '').trim().match(/-?[\d.]*\d,\d{2}/);
    if (!m) return null;
    const n = Number(m[0].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  function num(v) {
    const m = String(v || '').trim().match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const n = Number(m[0].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // ---- Extrato RV: blocos
  // "Quantidade  Preço Médio  Custo Médio   TICKER  Valor Mercado  % Retorno  Retorno"
  // "    251      R$ [exemplo sintético omitido]   R$ [exemplo sintético omitido]   Preço Mercado   R$ [exemplo sintético omitido]  34.06  R$ [exemplo sintético omitido]"
  // "                                             R$ [exemplo sintético omitido]"   (linha extra com preço mercado unitário)
  function parseExtratoRV(rawText) {
    const text = norm(rawText); // à prova de encoding quebrado
    const lines = text.split(/\r?\n/);
    const assets = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/Quantidade\s+Preco\s+Medio\s+Custo\s+Medio\s+([A-Z0-9]{4,6}(?:F|11)?)\s+Valor Mercado/);
      if (!m) continue;
      const ticker = m[1];
      const data = lines[i + 1] || '';
      const extra = lines[i + 2] || '';
      // linha de dados: qtd  pm  custo  'Preco Mercado'  vm  %ret  ret (já normalizado)
      const dm = data.match(/\s*(\d+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+Preco Mercado\s+R\$\s*([\d.,]+)(?:\s+(-?[\d.,]+)\s+R\$\s*(-?[\d.,]+))?/);
      if (!dm) { assets.push({ ticker, parseError: true, raw: data.trim() }); continue; }
      // retorno pode estar na linha extra (layout quebra após Valor Mercado)
      let retPct = dm[5] !== undefined ? num(dm[5]) : null;
      let retValue = dm[6] !== undefined ? br('R$ ' + dm[6]) : null;
      if (retPct === null) {
        const rm = extra.match(/(-?[\d.,]+)\s+R\$\s*(-?[\d.,]+)/);
        if (rm) { retPct = num(rm[1]); retValue = br('R$ ' + rm[2]); }
      }
      // preço unitário de mercado às vezes vem na linha extra
      const unitExtra = br(extra);
      assets.push({
        ticker,
        qty: +dm[1],
        avgPrice: br('R$ ' + dm[2]),
        invested: br('R$ ' + dm[3]),
        value: br('R$ ' + dm[4]),
        retPct,
        retValue,
        marketUnitPrice: unitExtra !== null ? unitExtra : (br('R$ ' + dm[4]) !== null && +dm[1] ? +(br('R$ ' + dm[4]) / +dm[1]).toFixed(4) : null),
        source: 'EXTRATO_RV_PDF'
      });
    }
    return { assets, count: assets.length };
  }

  // ---- Extrato RF: notas CDB (Nota | Início | Venc | Valor Aplicado | Tipo | Taxa | Rendimento | ... | Líquido | IR)
  // Cabeçalho de grupo: "CDB PORQUINHO OBJETIVO  Valor Líquido Total: R$ [exemplo sintético omitido] Valor Aplicado Total: R$ [exemplo sintético omitido]"
  // Linha: 529032803  18/02/2026  09/02/2028  R$ [exemplo sintético omitido] CDB  100% do CDI  R$ [exemplo sintético omitido] R$ [exemplo sintético omitido] R$ [exemplo sintético omitido] R$ [exemplo sintético omitido] R$ [exemplo sintético omitido] 20%
  function parseExtratoRF(rawText) {
    const text = norm(rawText);
    const lines = text.split(/\r?\n/);
    const notes = [];
    let currentGroup = null;
    const noteRe = /^(\d{6,})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+R\$\s*([\d.,]+)\s+(\S+)?\s*(.*)$/;
    for (const line of lines) {
      const gm = line.match(/^(.+?)\s+Valor L[ií]quido Total:\s*R\$\s*([\d.,]+)/);
      if (gm && !/^\d/.test(gm[1].trim())) { currentGroup = gm[1].trim(); continue; }
      const nm = line.match(noteRe);
      if (!nm) continue;
      // resto da linha depois do valor aplicado: tipo, taxa e demais valores
      const rest = nm[6] || '';
      const typeM = rest.match(/^(CDB|LIG|CRA|DEB|LCI|LCA|TESO|CDBA)\b/);
      const taxaM = rest.match(/(\d+[.,]?\d*%\s*(?:do|de)?\s*CDI|IPCA\s*\+?\s*\d+[.,]?\d*%?|PREFIXADO\s*\d+[.,]?\d*%?)/i);
      const moneyAll = Array.from(rest.matchAll(/R\$\s*([\d.,]+)/g)).map(x => br('R$ ' + x[1]));
      notes.push({
        nota: nm[1],
        group: currentGroup,
        startDate: nm[2].split('/').reverse().join('-'),
        maturity: nm[3].split('/').reverse().join('-'),
        applied: br('R$ ' + nm[4]),
        type: typeM ? typeM[1] : null,
        taxa: taxaM ? taxaM[1] : null,
        // sequência aproximada: [rendimento?, retirada?, desconto?, bruto, desconto2?, líquido]
        values: moneyAll,
        irPct: (line.match(/(\d+[.,]?\d*)%\s*$/) || [])[1] ? num((line.match(/(\d+[.,]?\d*)%\s*$/) || [])[1]) : null,
        source: 'EXTRATO_RF_PDF'
      });
    }
    return { notes, count: notes.length };
  }

  // ---- Reconcile: extrato (fonte de preço médio) vs posição B3 (fonte de qtd/preço atual) vs carteira
  // Regra: UNKNOWN != ZERO — quando um lado não tem o dado, o campo fica null (nunca 0 inventado).
  function reconcile(extratoRV, posicaoB3, carteiraPositions) {
    const byTicker = (arr) => {
      const m = {};
      for (const a of arr || []) if (a?.ticker) m[a.ticker.toUpperCase()] = a;
      return m;
    };
    const E = byTicker(extratoRV?.assets);
    const B = {}; // posição B3 agrupada por classe (inclui emprestimos — ativos doados seguem na custódia)
    for (const [cls, list] of Object.entries({ stocks: posicaoB3?.acoes, etfs: posicaoB3?.etfs, fiis: posicaoB3?.fundos, emprestimo: posicaoB3?.emprestimos })) {
      for (const a of list || []) B[a.ticker.toUpperCase()] = { ...a, class: cls };
    }
    const W = byTicker(carteiraPositions);

    const tickers = [...new Set([...Object.keys(E), ...Object.keys(B), ...Object.keys(W)])].sort();
    const rows = [];
    for (const t of tickers) {
      const e = E[t], b = B[t], w = W[t];
      const row = {
        ticker: t,
        inExtrato: !!e, inB3: !!b, inWallet: !!w,
        qtyExtrato: e?.qty ?? null,
        qtyB3: b?.qty ?? null,
        qtyWallet: w?.qty ?? null,
        avgPriceExtrato: e?.avgPrice ?? null,
        currentPriceB3: b?.currentPrice ?? null,
        valueExtrato: e?.value ?? null,
        valueB3: b?.value ?? null,
        issues: []
      };
      // divergências com tolerância (penny rounding): 0.01 valor, 0.5% preço.
      // VALOR não é comparado entre extrato×B3 (datas de preço diferentes — extrato usa
      // preço do dia do extrato, B3 usa fechamento); a divergência real é de QTD/preço-médio.
      if (e && b && e.qty !== null && b.qty !== null && Math.abs(e.qty - b.qty) > 0.001) row.issues.push('QTD_DIVERGENTE');
      if (e && b && e.value !== null && b.value !== null && e.qty !== null && b.qty !== null && e.qty === b.qty && Math.abs(e.value - b.value) / Math.max(b.value, 1) > 0.10) row.issues.push('VALOR_DIVERGENTE');
      if (e && !b) row.issues.push('AUSENTE_NA_B3');
      if (b && !e) row.issues.push('AUSENTE_NO_EXTRATO');
      if (!w && (e || b)) row.issues.push('AUSENTE_NA_CARTEIRA');
      if (w && e && e.qty !== null && w.qty !== null && Math.abs(e.qty - w.qty) > 0.001) row.issues.push('QTD_CARTEIRA_DIVERGENTE');
      rows.push(row);
    }
    const summary = {
      total: rows.length,
      matched: rows.filter(r => !r.issues.length).length,
      issues: rows.filter(r => r.issues.length),
      issuesCount: rows.filter(r => r.issues.length).length
    };
    return { rows, summary };
  }

  const Reconciliation = { parseExtratoRV, parseExtratoRF, reconcile };
  g.Reconciliation = Reconciliation;
  if (typeof module !== 'undefined' && module.exports) module.exports = Reconciliation;
})();