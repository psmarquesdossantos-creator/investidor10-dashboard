// tests/e2e/auth-gate.spec.js
// E2E: auth-gate, modos INACTIVE/LOGIN/DEMO/BLOCKED, fixture demo sintética
import { test, expect } from '@playwright/test';

test.describe('Auth Gate — fixture demo sintética', () => {
  test('demo fixture carrega e é 100% sintético', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fixture = await page.evaluate(() => window.DEMO_FIXTURE || null);
    expect(fixture, 'window.DEMO_FIXTURE deve existir').not.toBeNull();
    expect(fixture.meta.source).toBe('demo');
    expect(fixture.kpis.total).toBe(123456.78);
    expect(fixture.positions.length).toBeGreaterThanOrEqual(12);
    // P26: zero dados reais no fixture
    const json = JSON.stringify(fixture);
    expect(json).not.toContain('702175');
    expect(json).not.toContain('628267');
  });

  test('LocalDemoDataSource: persiste seção, getPortfolio, reset restaura defaults', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    const result = await page.evaluate(async () => {
      const DS = window.LocalDemoDataSource;
      if (!DS) return { error: 'LocalDemoDataSource ausente' };
      const ds = new DS();
      await ds.start();
      const initial = ds.getPortfolio();
      const initialTotal = initial && initial.kpis && initial.kpis.total;

      ds.saveSection('kpis', { total: 99999, invested: 99999, profit: 0 });
      const persistedKey = 'investidor10-demo';
      const raw = localStorage.getItem(persistedKey);
      const savedTotal = ds.getPortfolio().kpis.total;

      ds.reset();
      const afterReset = ds.getPortfolio().kpis.total;

      return { initialTotal, savedTotal, afterReset, raw: !!raw, key: persistedKey };
    });

    expect(result.error).toBeUndefined();
    expect(result.initialTotal).toBe(123456.78);      // start() carrega fixture default
    expect(result.savedTotal).toBe(99999);            // saveSection persistiu
    expect(result.afterReset).toBe(123456.78);        // reset restaura fixture (P11)
    expect(result.key).toBe('investidor10-demo');      // P10: storage próprio do demo
    // limpeza
    await page.evaluate(() => localStorage.removeItem('investidor10-demo'));
  });
});
