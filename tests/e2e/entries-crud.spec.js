// tests/e2e/entries-crud.spec.js
// Regressão CRUD da aba Lançamentos — bugs corrigidos:
// 1) EDITAR salvava nada (só toast de sucesso)
// 2) EXCLUIR removia o lançamento SEGUINTE da fonte (índice pós-splice)
// 3) NOVO não aparecia na view (filteredEntries stale)
// 4) Filtro de período era decorativo (lido e nunca aplicado)
// 5) class duplicado no pill de origem quebrava o estilo
import { test, expect } from '@playwright/test';

async function openEntries(page) {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); });
  await page.locator('.tab-btn[data-tab="entries"]').click();
  await page.waitForTimeout(500);
}

test('CRUD Lançamentos: adicionar, editar, excluir — o lançamento certo, na hora certa', async ({ page }) => {
  await openEntries(page);

  const initialCount = await page.evaluate(() => window.MOCK_DATA.entries.length);
  const initialFirstTicker = await page.evaluate(() => window.MOCK_DATA.entries[0]?.ticker);

  // --- 1. NOVO: abre modal, preenche, salva ---
  await page.click('#addEntryBtn2');
  await expect(page.locator('#entryModal')).toBeVisible();
  await page.selectOption('#entryType', 'buy');
  await page.fill('#entryAsset', 'TEST11');
  await page.fill('#entryQty', '10');
  await page.fill('#entryPrice', '100');
  await page.fill('#entryFees', '5');
  await page.click('#entryForm button[type="submit"]');
  await page.waitForTimeout(400);

  // Novo item aparece no TOPO da tabela imediatamente (fix da view stale)
  await expect(page.locator('#entriesBody tr').first()).toContainText('TEST11');
  let count = await page.evaluate(() => window.MOCK_DATA.entries.length);
  expect(count).toBe(initialCount + 1);
  let first = await page.evaluate(() => window.MOCK_DATA.entries[0]);
  expect(first.ticker).toBe('TEST11');
  expect(first.qty).toBe(10);
  expect(first.value).toBe(1000);
  // TEST11 não existe em positions → name = ticker (fallback documentado)
  expect(first.name).toBe('TEST11');

  // Persistiu no localStorage (saveToStorage)
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('investidor10-dashboard-data');
    return raw ? JSON.parse(raw).entries.some(e => e.ticker === 'TEST11') : false;
  });
  expect(stored).toBe(true);

  // --- 2. EDITAR: muda quantidade — agora SALVA de verdade ---
  // Mobile: a coluna Ações é ocultada pelo padrão responsivo das tabelas (app-wide).
  // O clique via JS valida a LÓGICA do CRUD em qualquer viewport.
  const vw = (await page.viewportSize()).width;
  const jsClick = async (sel) => page.evaluate(s => document.querySelector(s).click(), sel);
  if (vw >= 768) {
    await page.locator('#entriesBody .edit-entry-btn').first().click();
  } else {
    await jsClick('#entriesBody .edit-entry-btn');
  }
  await expect(page.locator('#entryModal')).toBeVisible();
  await expect(page.locator('#entryQty')).toHaveValue('10'); // form pré-preenchido
  await page.fill('#entryQty', '25');
  await page.click('#entryForm button[type="submit"]');
  await page.waitForTimeout(400);

  await expect(page.locator('#entriesBody tr').first()).toContainText('TEST11');
  first = await page.evaluate(() => window.MOCK_DATA.entries[0]);
  expect(first.qty).toBe(25);
  expect(first.value).toBe(2500);

  // --- 3. EXCLUIR: remove TEST11 (o CERTO) sem dano colateral ---
  page.once('dialog', d => d.accept());
  if (vw >= 768) {
    await page.locator('#entriesBody .delete-entry-btn').first().click();
  } else {
    await jsClick('#entriesBody .delete-entry-btn');
  }
  await page.waitForTimeout(400);

  const tickers = await page.evaluate(() => window.MOCK_DATA.entries.slice(0, 3).map(e => e.ticker));
  expect(tickers).not.toContain('TEST11');
  count = await page.evaluate(() => window.MOCK_DATA.entries.length);
  expect(count).toBe(initialCount); // nenhum lançamento extra sumiu
  // o antigo primeiro da lista permanece intacto
  const zeroth = await page.evaluate(() => window.MOCK_DATA.entries[0]?.ticker);
  expect(zeroth).toBe(initialFirstTicker);
  await expect(page.locator('#entriesBody')).not.toContainText('TEST11');
});

test('Filtro de período da aba Lançamentos funciona (deixou de ser decorativo)', async ({ page }) => {
  await openEntries(page);

  const allCount = await page.locator('#entriesBody tr').count();
  expect(allCount).toBeGreaterThan(0);

  // Últimos 30 dias: corte real por data — histórico antigo não pode aparecer
  await page.selectOption('#entriesPeriod', '30d');
  await page.waitForTimeout(300);
  const count30 = await page.locator('#entriesBody tr').count();
  const expected30 = await page.evaluate(() => {
    const corte = Date.now() - 30 * 86400000;
    const recent = window.MOCK_DATA.entries.filter(e => new Date(String(e.date) + 'T00:00:00').getTime() >= corte).length;
    return recent === 0 ? 1 : Math.min(20, recent); // 1 = linha de estado vazio
  });
  expect(count30).toBe(expected30);

  // Voltar para todo histórico restaura a contagem
  await page.selectOption('#entriesPeriod', 'all');
  await page.waitForTimeout(300);
  const backCount = await page.locator('#entriesBody tr').count();
  expect(backCount).toBe(allCount);

  // Filtro por tipo: só vendas
  await page.selectOption('#entriesType', 'sell');
  await page.waitForTimeout(300);
  const sellRows = await page.locator('#entriesBody tr').count();
  const expectedSell = await page.evaluate(() => {
    const sells = window.MOCK_DATA.entries.filter(e => e.type === 'sell').length;
    return sells === 0 ? 1 : Math.min(20, sells); // 1 = linha de empty state
  });
  expect(sellRows).toBe(expectedSell);
});

test('Paginação da aba Lançamentos atualiza info e navega', async ({ page }) => {
  await openEntries(page);

  const totalPages = await page.evaluate(() =>
    Math.max(1, Math.ceil(window.MOCK_DATA.entries.length / 20)));
  const info = page.locator('#panel-entries .page-info');
  await expect(info).toHaveText(`Página 1 de ${totalPages}`);

  if (totalPages > 1) {
    await page.click('#panel-entries .pagination button[aria-label="Próxima página"]');
    await page.waitForTimeout(300);
    await expect(info).toHaveText(`Página 2 de ${totalPages}`);
    await expect(page.locator('#panel-entries button[aria-label="Página anterior"]')).toBeEnabled();
  }
});
