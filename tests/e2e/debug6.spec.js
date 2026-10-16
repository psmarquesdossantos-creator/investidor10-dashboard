import { test, expect } from '@playwright/test';

test('debug: wait for panels.js to execute', async ({ page }) => {
  await page.goto('/');
  
  // Wait for networkidle
  await page.waitForLoadState('networkidle');
  
  // Now wait for panels.js to have executed by checking for a known global
  await page.waitForFunction(() => {
    return typeof window.renderAllPanels === 'function';
  }, { timeout: 5000 });
  
  // If we get here, panels.js has executed
  const iifeRan = await page.evaluate(() => {
    return typeof window.renderAllPanels === 'function';
  });
  console.log('IIFE ran (renderAllPanels exposed):', iifeRan);
  
  // Check boot flag
  const bootRan = await page.evaluate(() => {
    return window.__bootRan === true;
  });
  console.log('Boot ran (__bootRan flag):', bootRan);
  
  // Check maybeRenderLazy
  const maybeRenderLazyAvailable = await page.evaluate(() => {
    return typeof window.maybeRenderLazy === 'function';
  });
  console.log('maybeRenderLazy available:', maybeRenderLazyAvailable);
  
  // Check switchTab wrapping
  const switchTabWrapped = await page.evaluate(() => {
    return typeof window.switchTab === 'function' && 
           window.switchTab.toString().includes('maybeRenderLazy');
  });
  console.log('switchTab wrapped:', switchTabWrapped);
  
  // Now test a tab click
  const btn = page.locator('.tab-btn[data-tab="benchmarks"]');
  await btn.click();
  await page.waitForTimeout(500);
  
  const rows = await page.locator('#benchBody tr').count();
  console.log('benchBody rows after click:', rows);
});