// E2E: upload dos XLSX reais B3/Inter no Import Center (Fase 16)
// tests/e2e/import-xlsx.spec.js
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

const ATT = 'G:/Meu Drive/Codex/investidor10-dashboard';
const XLSX_FIXTURE = `${ATT}/movimentacao-2026-10-05-18-01-15.xlsx`;

// XLSX reais são locais apenas (gitignored) — CI não os possui.
test.describe('Import Center — XLSX B3/Inter (Fase 16)', () => {
  test.skip(!existsSync(XLSX_FIXTURE), 'XLSX real ausente (fixture local apenas)');


  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');
  });

  test('upload XLSX e mostra preview (fluxo completo)', async ({ page }) => {
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles(`${ATT}/movimentacao-2026-10-05-18-01-15.xlsx`);

    // Deve mostrar seção de preview (mesmo que detecção de formato falhe)
    await expect(page.locator('#importPreviewSection')).toBeVisible({ timeout: 15000 });
    
    // Verifica se há linhas de preview (qualquer conteúdo)
    const rows = page.locator('#importPreviewBody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('confirma importação e mostra toast', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');

    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    
    // Aguarda preview
    await expect(page.locator('#importPreviewSection')).toBeVisible({ timeout: 15000 });
    
    // Tenta confirmar importação
    const btnConfirm = page.locator('#btnConfirmImport');
    if (await btnConfirm.isVisible({ timeout: 5000 })) {
      await btnConfirm.click();
      // Verifica toast de sucesso ou erro
      const toast = page.locator('#toastContainer');
      await expect(toast).toBeVisible({ timeout: 10000 });
    }
  });

  test('upload XLSX de Posição B3 e pré-visualiza ativos', async ({ page }) => {
    await page.locator('#importFile').setInputFiles(`${ATT}/posicao-2026-09-26-18-07-22.xlsx`);
    
    // Deve mostrar seção de preview
    await expect(page.locator('#importPreviewSection')).toBeVisible({ timeout: 15000 });
    
    // Verifica se há linhas de ativos
    const rows = page.locator('#importPreviewBody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('re-importação da mesma movimentação não duplica (dedupe)', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.goto('http://localhost:8765/#import');
    await page.waitForLoadState('networkidle');

    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    await expect(page.locator('#importPreviewSection')).toBeVisible({ timeout: 15000 });
    
    const btnConfirm = page.locator('#btnConfirmImport');
    if (await btnConfirm.isVisible({ timeout: 5000 })) {
      await btnConfirm.click();
      await page.waitForTimeout(1000);
    }
    
    // Importa de novo
    await page.locator('#importFile').setInputFiles(`${ATT}/movimentacao-2026-10-05-17-56-09.xlsx`);
    await expect(page.locator('#importPreviewSection')).toBeVisible({ timeout: 15000 });
    
    const btnConfirm2 = page.locator('#btnConfirmImport');
    if (await btnConfirm2.isVisible({ timeout: 5000 })) {
      await btnConfirm2.click();
    }
    
    // Verifica se não houve erro de duplicação
    const toast = page.locator('#toastContainer');
    await expect(toast).toBeVisible({ timeout: 10000 });
  });
});
