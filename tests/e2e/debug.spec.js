import { test, expect } from '@playwright/test';

test('debug: check data and lazy loading', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check if window.CARTEIRA_DATA is available
  const data = await page.evaluate(() => {
    return {
      hasCarteiraData: !!window.CARTEIRA_DATA,
      hasOverride: !!window.__CARTEIRA_OVERRIDE,
      hasSwitchTab: typeof window.switchTab === 'function',
      hasMaybeRenderLazy: typeof window.maybeRenderLazy === 'function',
      carteiraDataKeys: window.CARTEIRA_DATA ? Object.keys(window.CARTEIRA_DATA) : [],
      positionsCount: window.CARTEIRA_DATA?.positions?.length || 0,
      fixedPositions: (window.CARTEIRA_DATA?.positions || []).filter(p => p.class === 'fixed'),
      earningsCount: window.CARTEIRA_DATA?.earnings?.length || 0,
      patrimonyKeys: window.CARTEIRA_DATA?.patrimony ? Object.keys(window.CARTEIRA_DATA.patrimony) : [],
    };
  });
  console.log('Data check:', JSON.stringify(data, null, 2));
  
  // Click benchmarks tab and check if maybeRenderLazy is called
  const btn = page.locator('.tab-btn[data-tab="benchmarks"]');
  await expect(btn).toHaveCount(1);
  await btn.click();
  await page.waitForTimeout(500);
  
  // Check if benchBody has content
  const rows = await page.locator('#benchBody tr').count();
  console.log('benchBody rows:', rows);
  
  // Check console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Check if renderBenchmarks was called
  const benchCalled = await page.evaluate(() => window.__benchmarksRendered || false);
  console.log('benchmarks rendered:', benchCalled);
});