// E2E: upload dos XLSX reais B3/Inter no Import Center (Fase 16)
// tests/e2e/import-xlsx.spec.js
import { test, expect } from '@playwright/test';

const ATT = 'C:/Users/Paulo Sergio/AppData/Local/hermes/attachments';

test.describe('Import Center — XLSX B3/Inter (Fase 16)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');
  });

  test('detecta e pré-visualiza XLSX de Movimentação (2.118 eventos)', async ({ page }) => {
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles(`${ATT}/movimentacao-2026-10-05-18-01-15.xlsx`);

    const detected = page.locator('#importDetectedFormat');
    await expect(detected).toBeVisible({ timeout: 15000 });
    await expect(detected).toContainText('b3-movimentacao-xlsx', { timeout: 10000 });
    await expect(detected).toContainText(/proventos/i);

    // prévia visível com linhas de proventos
    await expect(page.locator('#importPreviewSection')).toBeVisible();
    const rows = page.locator('#importPreviewBody tr');
    expect(await rows.count()).toBeGreaterThan(10);
  });

  test('confirma importação de Movimentação e atualiza KPIs de proventos', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');

    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    await expect(page.locator('#importDetectedFormat')).toContainText('b3-movimentacao-xlsx', { timeout: 10000 });
    await expect(page.locator('#importPreviewSection')).toBeVisible();

    await page.locator('#btnConfirmImport').click();
    await expect(page.locator('#toastContainer')).toContainText(/proventos/i, { timeout: 15000 });

    // CARTEIRA_DATA.earnings cresceu
    const n = await page.evaluate(() => (window.CARTEIRA_DATA?.earnings || []).length);
    expect(n).toBeGreaterThan(20);
  });

  test('detecta XLSX de Posição B3 (5 sheets) e pré-visualiza ativos', async ({ page }) => {
    await page.locator('#importFile').setInputFiles(`${ATT}/posicao-2026-10-05-17-48-34.xlsx`);
    const detected = page.locator('#importDetectedFormat');
    await expect(detected).toContainText('b3-posicao-xlsx', { timeout: 15000 });
    await expect(detected).toContainText(/ativos/i);
    await expect(page.locator('#importPreviewSection')).toBeVisible();
    const rows = page.locator('#importPreviewBody tr');
    expect(await rows.count()).toBeGreaterThan(50);
  });

  test('re-importação da mesma movimentação não duplica (dedupe)', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');

    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    await expect(page.locator('#importDetectedFormat')).toContainText('b3-movimentacao-xlsx', { timeout: 10000 });
    await page.locator('#btnConfirmImport').click();
    await expect(page.locator('#importPreviewSection')).toBeHidden({ timeout: 15000 });
    const n1 = await page.evaluate(() => (window.CARTEIRA_DATA?.earnings || []).length);

    // importa de novo
    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    await expect(page.locator('#importDetectedFormat')).toContainText('b3-movimentacao-xlsx', { timeout: 10000 });
    await page.locator('#btnConfirmImport').click();
    await expect(page.locator('#importPreviewSection')).toBeHidden({ timeout: 15000 });
    const n2 = await page.evaluate(() => (window.CARTEIRA_DATA?.earnings || []).length);

    expect(n2).toBe(n1); // zero duplicatas
  });
});
