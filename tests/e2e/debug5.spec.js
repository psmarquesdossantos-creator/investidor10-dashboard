import { test, expect } from '@playwright/test';

test('debug: check for errors and execution', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  
  // Also collect page errors
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  
  await page.waitForLoadState('networkidle');
  
  // Check if the IIFE has run
  const iifeRan = await page.evaluate(() => {
    return typeof window.renderAllPanels === 'function';
  });
  
  // Wait a bit more to allow for async boot
  await page.waitForTimeout(200);
  
  // Check again
  const iifeRanAfter = await page.evaluate(() => {
    return typeof window.renderAllPanels === 'function';
  });
  
  const bootRan = await page.evaluate(() => {
    return window.__bootRan === true;
  });
  
  const maybeRenderLazyAvailable = await page.evaluate(() => {
    return typeof window.maybeRenderLazy === 'function';
  });
  
  // Report findings
  console.log('=== TEST RESULTS ===');
  console.log('IIFE ran (initial):', iifeRan);
  console.log('IIFE ran (after 200ms):', iifeRanAfter);
  console.log('Boot ran:', bootRan);
  console.log('maybeRenderLazy available:', maybeRenderLazyAvailable);
  console.log('Console messages count:', consoleMessages.length);
  console.log('Page errors count:', pageErrors.length);
  
  if (consoleMessages.length > 0) {
    console.log('Console messages:');
    consoleMessages.forEach((msg, idx) => {
      console.log(`  ${idx}: [${msg.type}] ${msg.text}`);
    });
  }
  
  if (pageErrors.length > 0) {
    console.log('Page errors:');
    pageErrors.forEach((err, idx) => {
      console.log(`  ${idx}: ${err}`);
    });
  }
});