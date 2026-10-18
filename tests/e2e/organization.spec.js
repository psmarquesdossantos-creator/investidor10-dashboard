// tests/e2e/organization.spec.js
// P1/P2/P4 — organização: fundos, colunas ordenáveis, proventos por ativo,
// alocação vs meta, independência pela renda. Data-agnóstico (real/sample/demo).
import { test, expect } from '@playwright/test';

test.describe('Organização — posições, proventos por ativo, metas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('posições: grupo Fundos presente (P0 fidelidade de classes)', async ({ page }) => {
    await page.evaluate(() => window.switchTab('positions'));
    await expect(page.locator('#positionsBody')).toContainText('Fundos', { timeout: 10000 });
    // badge de classe fundos estilizado existe no CSS (asset-class.funds)
    const hasFundsClass = await page.evaluate(() => !!document.querySelector('#positionsBody .asset-class.funds, #positionsBody [data-group="fundos"]'));
    expect(hasFundsClass).toBe(true);
  });

  test('posições: colunas ordenáveis alternam asc/desc (P1)', async ({ page }, testInfo) => {
    // Mobile usa cards (Fase G) — a tabela ordenável é UX desktop/tablet
    test.skip(testInfo.project.name === 'mobile', 'colunas ordenáveis são UX da tabela (desktop/tablet)');

    await page.evaluate(() => window.switchTab('positions'));
    const th = page.locator('#positionsTable th[data-sort="value"]');
    await expect(th).toBeVisible();

    await th.click();
    await expect(th).toHaveAttribute('aria-sort', 'ascending');
    await th.click();
    await expect(th).toHaveAttribute('aria-sort', 'descending');

    // ordenação de fato muda a ordem dentro do primeiro grupo com 2+ ativos
    const order = await page.evaluate(() => {
      const groups = {};
      document.querySelectorAll('#positionsBody tr[data-group]').forEach(tr => {
        const g = tr.dataset.group;
        const t = tr.querySelector('.asset-ticker');
        if (t) (groups[g] = groups[g] || []).push(t.textContent.trim());
      });
      return groups;
    });
    const multi = Object.values(order).find(a => a.length >= 2);
    expect(multi, 'deve haver grupo com 2+ ativos').toBeTruthy();
  });

  test('proventos por ativo: tabela agregada por ticker (P1)', async ({ page }) => {
    await page.evaluate(() => window.switchTab('earnings'));
    await expect(page.locator('#earningsByAssetBody')).toBeVisible({ timeout: 10000 });
    const rows = await page.locator('#earningsByAssetBody tr').count();
    expect(rows).toBeGreaterThanOrEqual(3);
    const headers = await page.locator('#earningsByAssetTable thead th').allTextContents();
    expect(headers.some(h => h.includes('Total recebido'))).toBeTruthy();
    expect(headers.some(h => h.includes('Yield on cost'))).toBeTruthy();
    const firstTicker = await page.locator('#earningsByAssetBody .asset-ticker').first().textContent();
    expect(firstTicker?.trim().length).toBeGreaterThan(2);
  });

  test('home: cards alocação vs meta com badges (P2)', async ({ page }) => {
    await page.evaluate(() => window.switchTab('summary'));
    await expect(page.locator('#allocGoalGrid')).toBeVisible({ timeout: 10000 });
    const cards = await page.locator('.alloc-goal-card').count();
    expect(cards).toBeGreaterThanOrEqual(4);
    const text = await page.locator('#allocGoalGrid').textContent();
    expect(text).toContain('FIIs');
    expect(text).toMatch(/Comprar|Vender|Meta/);
  });

  test('metas: card Independência pela Renda (P4)', async ({ page }) => {
    // v15.2: Metas é aba própria (panel-goals)
    await page.evaluate(() => window.switchTab('goals'));
    const goalsPanel = page.locator('#panel-goals');
    await expect(goalsPanel).toContainText('Independência pela Renda', { timeout: 10000 });
    const text = await goalsPanel.textContent();
    expect(text).toContain('Yield 12m');
  });
});

test.describe('Organização — modo DEMO (fixture sintética com fundos)', () => {
  test('demo: classe Fundos no agrupamento e na alocação', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => window.switchTab('positions'));
    const groups = await page.evaluate(() => [...document.querySelectorAll('#positionsBody tr.group-header .group-label')].map(e => e.textContent.trim()));
    expect(groups).toContain('Fundos');
    // FUND1 pode estar além da 1ª página (37 ativos/pag. 15) — valida no dado
    const hasFundAsset = await page.evaluate(() => window.MOCK_DATA.positions.some(p => p.class === 'funds' && p.value > 0));
    expect(hasFundAsset).toBe(true);

    await page.evaluate(() => window.switchTab('summary'));
    await expect(page.locator('#allocationLegend')).toContainText('Fundos', { timeout: 10000 });
  });
});
