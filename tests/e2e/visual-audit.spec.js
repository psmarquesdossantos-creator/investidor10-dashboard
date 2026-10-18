// Diagnóstico visual: screenshots de todas as abas em 2 viewports + dump de métricas
import { test, expect } from '@playwright/test';

const TABS = ['summary','patrimony','returns','positions','earnings','entries','fixed','rebalance','risk','montecarlo','benchmarks','tax','import','backup','corporate-events','data-quality','backup-portability'];

test('audit visual — abas principais desktop 1366', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:8765');
  await page.waitForLoadState('networkidle');

  for (const tab of TABS.slice(0, 12)) {
    const btn = page.locator(`.tab-btn[data-tab="${tab}"]`);
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/audit-${tab}-1366.png`, fullPage: false });
    }
  }
});

test('audit visual — summary mobile 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:8765');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/audit-summary-390.png' });

  // métricas de layout problemático
  const metrics = await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')];
    const issues = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2)) {
        issues.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,60), right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
      }
    }
    return { overflow: document.body.scrollWidth, innerWidth: window.innerWidth, issues: issues.slice(0, 15) };
  });
  console.log('MOBILE METRICS:', JSON.stringify(metrics, null, 2));
});
