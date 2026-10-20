import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Valores esperados vivem em tests/e2e/real-data.values.local.json (GITIGNORED —
// nunca versionar valores reais, regra 7). Sem o arquivo (CI), o teste pula.
const VALUES_FILE = 'tests/e2e/real-data.values.local.json';
const hasLocalValues = existsSync(VALUES_FILE);
const V = hasLocalValues ? JSON.parse(readFileSync(VALUES_FILE, 'utf8')) : null;

test('Site renderiza com dados reais (valores locais)', async ({ page }) => {
  test.skip(!hasLocalValues, 'valores reais não presentes (arquivo local gitignored)');

  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');

  // Aguarda dados carregarem
  await page.waitForFunction(() => window.CARTEIRA_DATA && window.CARTEIRA_DATA.kpis && window.CARTEIRA_DATA.kpis.total > 0, { timeout: 5000 });

  // CI roda com carteira-data.sample.js (source: 'sample') — validações de
  // valores reais só aplicam quando os dados locais reais estão presentes.
  const isSample = await page.evaluate(() => window.CARTEIRA_DATA.meta && window.CARTEIRA_DATA.meta.source === 'sample');
  test.skip(isSample, 'Dados sintéticos (sample) — valores reais só em ambiente local');

  const total = await page.evaluate(() => window.CARTEIRA_DATA.kpis.total);
  expect(Math.abs(total - V.expectedTotal)).toBeLessThan(0.02);

  // KPI visível no DOM
  const kpiTotal = await page.textContent('#kpiTotal');
  expect(kpiTotal).toContain(V.kpiTotalText);

  // Série histórica
  const labels = await page.evaluate(() => window.CARTEIRA_DATA.patrimony.labels.length);
  expect(labels).toBe(V.expectedLabels);

  // Posições
  const positions = await page.evaluate(() => window.CARTEIRA_DATA.positions.length);
  expect(positions).toBe(V.expectedPositions);

  // Proventos
  const earnings = await page.evaluate(() => window.CARTEIRA_DATA.earnings.length);
  expect(earnings).toBeGreaterThan(V.minEarnings);

  const firstEarn = await page.evaluate(() => window.CARTEIRA_DATA.earnings[0].date);
  expect(firstEarn).toContain(V.firstEarnYear);
});
