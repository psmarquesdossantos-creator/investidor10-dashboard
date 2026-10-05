// tests/e2e/import-b3-json.spec.js
// Teste de importação B3 JSON backup → preview → confirm → snapshot
import { test, expect } from '@playwright/test';

test.describe('Import Center - B3 JSON Backup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('import B3 JSON backup → preview → confirm → snapshot created', async ({ page }) => {
    // Capture console logs - MUST be before navigation to catch early logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Switch to Import tab (in Configurações group)
    await page.click('.tab-btn[data-tab="import"]');
    await page.waitForTimeout(500);

    // Upload fixture
    const fileInput = page.locator('#importFile');
    await fileInput.setInputFiles('tests/fixtures/backup-investidor10-sample.json');

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check for errors in detected format
    const errorMsg = await page.locator('#importDetectedFormat').textContent();
    console.log('Detected format element:', errorMsg);

    // Check if preview section exists and its display style
    const previewStyle = await page.locator('#importPreviewSection').getAttribute('style');
    console.log('Preview section style:', previewStyle);

    // Check if preview table has rows
    const rows = await page.locator('#importPreviewTable tbody tr').count();
    console.log('Preview table rows:', rows);

    // Wait for preview section to be visible
    await page.waitForSelector('#importPreviewSection:not([style*="display: none"])', { timeout: 20000 });
    await page.waitForSelector('#importPreviewTable tbody tr', { timeout: 5000 });
    const previewRows = await page.locator('#importPreviewTable tbody tr').count();
    expect(previewRows).toBeGreaterThan(0);

    // Check preview has expected columns
    const headers = await page.locator('#importPreviewTable thead th').allTextContents();
    expect(headers).toContain('Ticker');
    expect(headers.some(h => h.includes('Atual'))).toBeTruthy();
    expect(headers.some(h => h.includes('Novo'))).toBeTruthy();
    expect(headers).toContain('Status');

    // Confirm import
    await page.click('#btnConfirmImport');
    await page.waitForTimeout(3000);

    // Check data state after import
    const badgeText = await page.locator('#dataStateBadge .state-label').textContent();
    console.log('DataState badge after import:', badgeText);

    // Verify DataState FRESH
    const badge = page.locator('#dataStateBadge .state-label');
    await expect(badge).toContainText('Atualizado');

    // Verify snapshot created
    const snapshots = await page.evaluate(() => window.Investidor10Advanced?.SnapshotManager?.getAll() || []);
    console.log('Snapshots:', snapshots.length);
    expect(snapshots.length).toBeGreaterThan(0);
  });
});
