import { test, expect } from '@playwright/test';

test('debug: check boot and wrapping', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check if boot has run
  const bootRan = await page.evaluate(() => {
    return window.__bootRan === true;
  });
  console.log('Boot ran (__bootRan flag):', bootRan);
  
  // Check switchTab function
  const switchTabInfo = await page.evaluate(() => {
    return {
      exists: typeof window.switchTab === 'function',
      source: window.switchTab ? window.switchTab.toString() : null,
      hasMaybeRenderLazyCall: window.switchTab ? window.switchTab.toString().includes('maybeRenderLazy') : false,
      hasWrapSwitchTab: window.switchTab ? window.switchTab.toString().includes('wrapSwitchTab') : false,
      hasBootRanCall: window.switchTab ? window.switchTab.toString().includes('__bootRan') : false
    };
  });
  console.log('SwitchTab info:', JSON.stringify(switchTabInfo, null, 2));
  
  // Check if maybeRenderLazy is available
  const maybeRenderLazyAvailable = await page.evaluate(() => {
    return typeof window.maybeRenderLazy === 'function';
  });
  console.log('maybeRenderLazy available:', maybeRenderLazyAvailable);
});