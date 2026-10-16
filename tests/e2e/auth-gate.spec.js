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
});
