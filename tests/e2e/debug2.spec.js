import { test, expect } from '@playwright/test';

test('debug: check switchTab wrapping', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check switchTab function
  const switchTabInfo = await page.evaluate(() => {
    return {
      exists: typeof window.switchTab === 'function',
      source: window.switchTab ? window.switchTab.toString() : null,
      hasMaybeRenderLazyCall: window.switchTab ? window.switchTab.toString().includes('maybeRenderLazy') : false,
      hasWrapSwitchTab: window.switchTab ? window.switchTab.toString().includes('wrapSwitchTab') : false
    };
  });
  console.log('SwitchTab info:', JSON.stringify(switchTabInfo, null, 2));
  
  // Check if boot has run
  const bootRan = await page.evaluate(() => {
    return typeof window.maybeRenderLazy === 'function';
  });
  console.log('Boot ran (maybeRenderLazy available):', bootRan);
  
  // Wait a bit more and check again
  await page.waitForTimeout(200);
  const bootRanAfter = await page.evaluate(() => {
    return typeof window.maybeRenderLazy === 'function';
  });
  console.log('Boot ran after 200ms:', bootRanAfter);
});