import { test, expect } from '@playwright/test';

test('Site renderiza com dados reais 10/10/2026', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  
  // Aguarda dados carregarem
  await page.waitForFunction(() => window.CARTEIRA_DATA && window.CARTEIRA_DATA.kpis && window.CARTEIRA_DATA.kpis.total > 0, { timeout: 15000 });
  
  const total = await page.evaluate(() => window.CARTEIRA_DATA.kpis.total);
  console.log('TOTAL no browser:', total);
  expect(Math.abs(total - 702175.65)).toBeLessThan(0.02);
  
  // KPI visível no DOM
  const kpiTotal = await page.textContent('#kpiTotal');
  console.log('KPI DOM:', kpiTotal);
  expect(kpiTotal).toContain('702.175');
  
  // Verifica série histórica (84 meses)
  const labels = await page.evaluate(() => window.CARTEIRA_DATA.patrimony.labels.length);
  console.log('Meses na série:', labels);
  expect(labels).toBe(84);
  
  // Posições
  const positions = await page.evaluate(() => window.CARTEIRA_DATA.positions.length);
  console.log('Posições:', positions);
  expect(positions).toBe(37);
  
  // Proventos desde 2019
  const earnings = await page.evaluate(() => window.CARTEIRA_DATA.earnings.length);
  console.log('Proventos:', earnings);
  expect(earnings).toBeGreaterThan(2000);
  
  const firstEarn = await page.evaluate(() => window.CARTEIRA_DATA.earnings[0].date);
  console.log('Primeiro provento:', firstEarn);
  expect(firstEarn).toContain('2019');
});
