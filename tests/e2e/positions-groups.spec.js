// tests/e2e/positions-groups.spec.js
// P30: rebrand do header, grupos colapsáveis na aba Ativos e tabela sem arrasto
import { test, expect } from '@playwright/test';

test('rebrand: logo/título do site sem "Investidor10"', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  // router.js sincroniza o título com a aba ativa ("Carteira — Resumo")
  await expect(page).toHaveTitle(/Carteira/);
  await expect(page).not.toHaveTitle(/Investidor10/);
  await expect(page.locator('.logo span')).toHaveText('Carteira de Investimentos');
  // badge vs Investidor10 não pode existir mais
  await expect(page.locator('.logo .badge')).toHaveCount(0);
});

test('barra de abas não tem rótulos de grupo (não clicáveis removidos)', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.tabs-group-label')).toHaveCount(0);
  // as 19 abas continuam presentes
  await expect(page.locator('.tab-btn')).toHaveCount(19);
});

test('Ativos: grupos colapsam e expandem com clique', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');

  // ≤639px a tabela vira cards (Fase G) — colapso é do layout tabela (≥640)
  const vw = (await page.viewportSize()).width;
  test.skip(vw < 640, 'layout mobile usa cards em vez da tabela');

  await page.locator('.tab-btn[data-tab="positions"]').click();
  await page.waitForTimeout(600);

  const firstHeader = page.locator('#positionsBody tr.group-header').first();
  const groupKey = await firstHeader.getAttribute('data-group');
  const toggle = firstHeader.locator('.group-toggle');

  // estado inicial: expandido (linhas visíveis)
  const visibleBefore = await page.locator(`#positionsBody tr[data-group="${groupKey}"]:not(.group-header):visible`).count();
  expect(visibleBefore).toBeGreaterThan(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // clica → colapsa
  await firstHeader.click();
  await page.waitForTimeout(300);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const visibleAfter = await page.locator(`#positionsBody tr[data-group="${groupKey}"]:not(.group-header):visible`).count();
  expect(visibleAfter).toBe(0);
  // as linhas continuam no DOM (estado preservado para dados/testes)
  const inDom = await page.locator(`#positionsBody tr[data-group="${groupKey}"]:not(.group-header)`).count();
  expect(inDom).toBeGreaterThan(0);

  // clica de novo → expande
  await firstHeader.click();
  await page.waitForTimeout(300);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const visibleRestored = await page.locator(`#positionsBody tr[data-group="${groupKey}"]:not(.group-header):visible`).count();
  expect(visibleRestored).toBe(visibleBefore);
});

test('Ativos: colunas de contexto somem em 1366 e a tabela não arrasta', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.locator('.tab-btn[data-tab="positions"]').click();
  await page.waitForTimeout(600);

  // colunas escondidas em <=1600: Classe/Variação/Confiança; <=1370: % Ideal
  await expect(page.locator('#positionsTable th.col-classe')).toBeHidden();
  await expect(page.locator('#positionsTable th.col-var')).toBeHidden();
  await expect(page.locator('#positionsTable th.col-conf')).toBeHidden();
  await expect(page.locator('#positionsTable th.col-ideal')).toBeHidden();

  // sem arrasto horizontal: o wrapper não tem overflow além da viewport
  const overflow = await page.evaluate(() => {
    const wrap = document.querySelector('#panel-positions .table-wrapper');
    return wrap ? wrap.scrollWidth - wrap.clientWidth : -1;
  });
  expect(overflow).toBeLessThanOrEqual(0);
  // e o body também não transborda
  const bodyOverflow = await page.evaluate(() =>
    document.body.scrollWidth - document.documentElement.clientWidth);
  expect(bodyOverflow).toBeLessThanOrEqual(0);

  // colunas essenciais continuam visíveis
  for (const label of ['Ativo', 'Qtd.', 'Preço médio', 'Valor total', 'P&L', 'Rentab.', '% Carteira']) {
    const th = page.locator('#positionsTable thead th', { hasText: label }).first();
    await expect(th).toBeVisible();
  }
});

test('Ativos em 2560: TODAS as 16 colunas visíveis (sem esconder nada no monitor grande)', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.locator('.tab-btn[data-tab="positions"]').click();
  await page.waitForTimeout(600);

  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('#positionsTable thead th')].filter(th => getComputedStyle(th).display === 'none').length);
  expect(hidden).toBe(0);
  const thCount = await page.locator('#positionsTable thead th').count();
  expect(thCount).toBe(16);
});
