// tests/e2e/live-prod.spec.js
// Testes contra a produção REAL (GitHub Pages / Vercel). Opcional:
// roda apenas quando LIVE_BASE_URL está definida:
//   LIVE_BASE_URL=https://<host> npx playwright test tests/e2e/live-prod.spec.js
import { test, expect } from '@playwright/test';

const BASE = (process.env.LIVE_BASE_URL || '').replace(/\/$/, '');
const ENABLED = !!BASE;

test.skip(!ENABLED, 'LIVE_BASE_URL ausente — teste live é opcional (produção)');

test.describe('Live — produção pública (privacidade + lock)', () => {
  test('lock screen aparece e NADA renderiza antes da decisão (P22)', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#authGate')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#authDemoEntry')).toBeVisible();
    await expect(page.locator('#kpiTotal')).toBeHidden();
    await expect(page.locator('#authEmail')).toBeHidden(); // sem Firebase: form oculto
  });

  test('nenhum arquivo de dados reais é servido (404 obrigatório)', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    const forbidden = ['carteira-data.js', 'data.js', 'parsed_data.json', 'carteira-data-real.json',
      'carteira-data-backup-20261012.js', 'carteira-data-backup-antigo.js'];
    for (const f of forbidden) {
      const status = await page.evaluate(async (file) => (await fetch(file, { cache: 'no-store' })).status, f);
      expect(status, `${f} deve ser 404 na produção`).toBe(404);
    }
  });

  test('explorar demonstração → fixture sintética + badge (P26/P27)', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await page.click('#authDemoEntry');

    await expect(page.locator('#demoBadge')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#authGate')).toBeHidden();
    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    expect(total).toBe(123456.78); // sintético — jamais o dataset legado/real
    await expect(page.locator('#kpiTotal')).toContainText('123.456');
  });

  test('localStorage da produção não contém dados reais após visita', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await page.click('#authDemoEntry');
    await page.waitForTimeout(500);
    const dump = await page.evaluate(() => JSON.stringify(localStorage));
    // marcadores do dataset real nunca presentes (valores locais, se existirem)
    const markers = ['702175', '628267', '610219', '630889'];
    for (const m of markers) expect(dump).not.toContain(m);
  });
});
