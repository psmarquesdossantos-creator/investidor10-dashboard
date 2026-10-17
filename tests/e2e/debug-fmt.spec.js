
import { test } from '@playwright/test';
test('debug fmt.cur', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push({ msg: err.message, stack: (err.stack || '').split('\n').slice(0, 5).join(' | ') }));
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.CARTEIRA_DATA && window.CARTEIRA_DATA.kpis.total > 0, { timeout: 15000 });
  await page.waitForTimeout(1000);
  for (const tab of ['rebalance', 'montecarlo', 'risk', 'goals', 'patrimony']) {
    await page.evaluate((t) => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab(t); }, tab);
    await page.waitForTimeout(900);
  }
  console.log('ERRORS_JSON=' + JSON.stringify(errors, null, 1));
  console.log('TOTAL_ERRORS=' + errors.length);
});
