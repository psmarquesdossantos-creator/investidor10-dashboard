// Regressão: abas secundárias devem renderizar conteúdo real (não podem ficar vazias para sempre)
import { test, expect } from '@playwright/test';

const PANELS = [
  { tab: 'rebalance', body: 'rebalanceBody', minRows: 1 },
  { tab: 'fixed', body: 'fixedBody', minRows: 1 },
  { tab: 'benchmarks', body: 'benchBody', minRows: 1 },
  { tab: 'tax', body: 'darfBody', minRows: 1 },
  { tab: 'corporate-events', body: 'corpEventsLogBody', minRows: 1 },
  { tab: 'data-trust', body: 'dataTrustBody', minRows: 1 },
  { tab: 'backup-portability', body: 'migrationLogBody', minRows: 1 },
];

test.describe('Painéis secundários — render real', () => {
  for (const { tab, body, minRows } of PANELS) {
    test(`aba "${tab}" popula ${body} com conteúdo`, async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
      });
      await page.reload();
      await page.waitForLoadState('networkidle');

      const btn = page.locator(`.tab-btn[data-tab="${tab}"]`);
      await expect(btn).toHaveCount(1);
      await btn.click();
      await page.waitForTimeout(300);

      const rows = await page.locator(`#${body} tr`).count();
      // O painel precisa ter AO MENOS uma linha — dados OU estado vazio explícito
      // (estado vazio legível é aceitável; tabela totalmente vazia é bug)
      expect(rows, `${tab}: ${body} deve ter conteúdo`).toBeGreaterThanOrEqual(minRows);

      const firstText = await page.locator(`#${body} tr`).first().textContent();
      expect(firstText?.trim().length, `${tab}: linha não pode ser vazia`).toBeGreaterThan(5);
    });
  }

  test('data-trust audita todos os ativos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tab-btn[data-tab="data-trust"]').click();
    await page.waitForTimeout(300);
    const rows = await page.locator('#dataTrustBody tr').count();
    expect(rows).toBeGreaterThanOrEqual(30); // 39 ativos reais
  });

  test('rebalance mostra drift por classe', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tab-btn[data-tab="rebalance"]').click();
    await page.waitForTimeout(300);
    const rows = await page.locator('#rebalanceBody tr').count();
    expect(rows).toBeGreaterThanOrEqual(4); // ≥4 classes de ativo
    // primeira linha deve conter % atual e alvo
    const text = await page.locator('#rebalanceBody tr').first().textContent();
    expect(text).toMatch(/\d+,\d+%/);
  });
});
