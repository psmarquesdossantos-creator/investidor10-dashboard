import { test, expect } from '@playwright/test';

test('test panels.js in isolation', async ({ page }) => {
  await page.goto('http://localhost:8765/test-panels.html');
  
  // Wait for load
  await page.waitForLoadState('networkidle');
  
  // Check if panels.js executed
  const results = await page.evaluate(() => {
    return {
      renderAllPanels: typeof window.renderAllPanels,
      bootRan: window.__bootRan,
      maybeRenderLazy: typeof window.maybeRenderLazy,
      switchTab: typeof window.switchTab,
      switchTabWrapped: typeof window.switchTab === 'function' && 
                     window.switchTab.toString().includes('maybeRenderLazy'),
      consoleErrors: [] // We can't easily get console errors from evaluate, but we can check if window had errors
    };
  });
  
  console.log('Test results:', JSON.stringify(results, null, 2));
});