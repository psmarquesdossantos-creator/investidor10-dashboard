// scripts/preview-screenshot.mjs — gera docs/preview.png em MODO DEMO (dados sintéticos 30k)
// Privacidade: nunca capturar dados reais locais para o repo público (SECURITY.md P26).
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();
await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
await page.goto('http://localhost:8765/');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);

// sanity: DEVE ser o fixture sintético, nunca dados reais
const total = await page.evaluate(() => window.MOCK_DATA?.kpis?.total);
if (total !== 30000) {
  console.error(`ABORT: total=${total} ≠ 30000 — dados não-sintéticos, screenshot descartado`);
  await browser.close();
  process.exit(1);
}

await page.screenshot({ path: 'docs/preview.png', fullPage: false });
console.log('OK: docs/preview.png gerado em modo DEMO (total=30.000 sintético)');
await browser.close();
