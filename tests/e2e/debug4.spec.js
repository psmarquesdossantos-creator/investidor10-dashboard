import { test, expect } from '@playwright/test';

test('debug: check if panels.js IIFE runs', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check if the IIFE has run by looking for a variable that would be set inside it
  const iifeRan = await page.evaluate(() => {
    // Check for something that would be set in the IIFE scope
    // We know DATA function is defined inside the IIFE
    // But we can't access it directly from outside
    // Instead, let's check if we can call a function that's exposed
    return typeof window.renderAllPanels === 'function';
  });
  console.log('IIFE ran (renderAllPanels exposed):', iifeRan);
  
  // Also check for __bootRan
  const bootRan = await page.evaluate(() => {
    return window.__bootRan === true;
  });
  console.log('Boot ran (__bootRan flag):', bootRan);
  
  // Check if maybeRenderLazy is available (should be set in boot)
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
});