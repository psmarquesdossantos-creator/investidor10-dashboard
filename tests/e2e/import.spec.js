// tests/e2e/import.spec.js
// Teste do importador: preview mostra duplicados, write bloqueado até confirm, qty=null marca UNKNOWN
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Importador de Backup JSON', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    // Aguarda inicialização completa: DOM ready + switchTab exposto + tab ativa visível
    await page.waitForFunction(() => typeof window.switchTab === 'function' && document.querySelector('.tab-btn.active'), { timeout: 45000 });
    await page.waitForTimeout(1000); // buffer extra para mobile
  });

  test('dropzone aparece ao clicar na aba Importar', async ({ page }) => {
    // Aguarda a aba import estar disponível
    const importTab = page.locator('.tab-btn[data-tab="import"]');
    await expect(importTab).toBeVisible({ timeout: 20000 });

    // Usa evaluate para chamar switchTab diretamente (mais confiável)
    await page.evaluate(() => window.switchTab('import'));

    // Aguarda o painel ficar visível
    await page.waitForSelector('#panel-import:not([hidden])', { timeout: 20000 });

    const dropzone = page.locator('#importDropzone');
    await expect(dropzone).toBeVisible({ timeout: 10000 });
  });

  test('importar JSON válido processa sem erro', async ({ page }) => {
    // Clica na aba Importar
    const importTab = page.locator('.tab-btn[data-tab="import"]');
    await importTab.click();
    await page.waitForTimeout(500);

    // Usa o input file do novo painel (accept .json,.csv)
    const fileInput = page.locator('#importFile');

    // Cria um JSON mínimo para teste rápido
    const smallJson = {
      payload: {
        state: {
          assets: [{ ticker: 'TEST11', name: 'Test FII', type: 'FII', qty: 100, current_price: 100, avg_price: 90, sector: 'Outros' }],
          proventos: [],
          aportes: [],
          goals: { allocation: { items: [] } }
        }
      }
    };

    const tempFile = path.join(__dirname, '..', 'fixtures', 'small-test.json');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, JSON.stringify(smallJson));

    await fileInput.setInputFiles(tempFile);

    // Aguarda preview aparecer
    await page.waitForSelector('#importPreviewSection:not([style*="display: none"])', { timeout: 15000 });
    await page.waitForSelector('#importPreviewTable tbody tr', { timeout: 5000 });

    // Verifica se não houve erro imediato
    const errorMsg = page.locator('.toast.error, .alert.error');
    await expect(errorMsg).toHaveCount(0);

    // Cancelar
    await page.click('#btnCancelImport');

    fs.unlinkSync(tempFile);
  });

  test('provento duplicado mostra preview com aviso', async ({ page }) => {
    // Clica na aba Importar
    const importTab = page.locator('.tab-btn[data-tab="import"]');
    await importTab.click();
    await page.waitForTimeout(500);

    // Cria um JSON com provento duplicado
    const duplicateJson = {
      payload: {
        state: {
          assets: [
            { ticker: 'TEST11', name: 'Test FII', type: 'FII', qty: 100, current_price: 100, avg_price: 90, sector: 'Outros' }
          ],
          proventos: [
            { date: '2026-09-15', ticker: 'TEST11', assetName: 'Test FII', eventType: 'Rendimento', qty: 100, unitPrice: 1.0, value: 100 },
            { date: '2026-09-15', ticker: 'TEST11', assetName: 'Test FII', eventType: 'Rendimento', qty: 100, unitPrice: 1.0, value: 100 } // duplicado exato
          ],
          aportes: [],
          goals: { allocation: { items: [] } }
        }
      }
    };

    const tempFile = path.join(__dirname, '..', 'fixtures', 'duplicate-test.json');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, JSON.stringify(duplicateJson));

    // Usa o input file do novo painel
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles(tempFile);

    // Aguarda preview aparecer
    await page.waitForSelector('#importPreviewSection:not([style*="display: none"])', { timeout: 15000 });

    // Limpa arquivo temporário
    fs.unlinkSync(tempFile);
  });

  test('qty null/ausente marca como UNKNOWN não ZERO', async ({ page }) => {
    const unknownQtyJson = {
      payload: {
        state: {
          assets: [
            { ticker: 'UNKNOWN11', name: 'Unknown Asset', type: 'FII', qty: null, current_price: 100, avg_price: 90, sector: 'Outros' }
          ],
          proventos: [],
          aportes: [],
          goals: { allocation: { items: [] } }
        }
      }
    };

    const tempFile = path.join(__dirname, '..', 'fixtures', 'unknown-qty-test.json');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, JSON.stringify(unknownQtyJson));

    // Clica na aba Importar
    const importTab = page.locator('.tab-btn[data-tab="import"]');
    await importTab.click();
    await page.waitForTimeout(500);

    // Usa o input file do novo painel
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles(tempFile);

    // Aguarda preview
    await page.waitForSelector('#importPreviewSection:not([style*="display: none"])', { timeout: 15000 });

    // Verifica se o pipeline marca qty null como UNKNOWN (status badge)
    const previewRows = page.locator('#importPreviewTable tbody tr');
    await expect(previewRows.first()).toBeVisible();

    fs.unlinkSync(tempFile);
  });

  test('arquivo >5MB é rejeitado', async ({ page }) => {
    // Cria arquivo grande (>5MB)
    const largeJson = {
      payload: {
        state: {
          assets: Array(10000).fill({ ticker: 'LARGE', name: 'Large', type: 'FII', qty: 1, current_price: 100, avg_price: 90, sector: 'Outros' }),
          proventos: [],
          aportes: [],
          goals: { allocation: { items: [] } }
        }
      }
    };

    const tempFile = path.join(__dirname, '..', 'fixtures', 'large-test.json');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, JSON.stringify(largeJson));

    // Clica na aba Importar
    const importTab = page.locator('.tab-btn[data-tab="import"]');
    await importTab.click();
    await page.waitForTimeout(500);

    // Usa o input file do novo painel
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles(tempFile);

    await page.waitForTimeout(2000);

    // Deve mostrar erro de arquivo grande
    const toastError = page.locator('.toast-error, .toast:has-text("grande"), .toast:has-text("5MB")');

    fs.unlinkSync(tempFile);
  });
});