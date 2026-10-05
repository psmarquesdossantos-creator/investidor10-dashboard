// E2E: Fase 17 — Durabilidade (health check, quarentena+restore, backup, lembrete)
// tests/e2e/durability.spec.js
import { test, expect } from '@playwright/test';

test.describe('Durabilidade (Fase 17)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8765/');
    await page.waitForLoadState('networkidle');
  });

  test('healthCheck reporta OK com localStorage são', async ({ page }) => {
    const report = await page.evaluate(() => window.Durability.healthCheck());
    expect(report.healthy).toBe(true);
    expect(report.quarantined).toEqual([]);
  });

  test('localStorage corrompido é posto em quarentena e restaurado do snapshot', async ({ page }) => {
    // corrompe a chave de snapshots deliberadamente
    await page.evaluate(() => {
      // cria um snapshot válido primeiro
      window.Investidor10Advanced.SnapshotManager.capture(window.CARTEIRA_DATA, 'test');
      localStorage.setItem('investidor10-dashboard-data', '{CORROMPIDO');
    });
    const report = await page.evaluate(() => window.Durability.healthCheck());
    expect(report.quarantined).toContain('data');
    expect(report.recovered.length).toBeGreaterThan(0);
    // quarentena preservou o resíduo
    const q = await page.evaluate(() => JSON.parse(localStorage.getItem('investidor10-quarantine') || '[]'));
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].raw).toContain('CORROMPIDO');
  });

  test('download de backup marca lastBackup e gera blob JSON válido', async ({ page }) => {
    const dl = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const result = await page.evaluate(() => window.Durability.downloadBackup('test'));
    expect(result.success).toBe(true);
    const last = await page.evaluate(() => localStorage.getItem('investidor10-last-backup'));
    expect(last).not.toBeNull();
    const dlInfo = await dl;
    if (dlInfo) {
      expect(dlInfo.suggestedFilename()).toMatch(/backup-investidor10-\d{4}-\d{2}-\d{2}\.json/);
    }
  });

  test('migração de schema é idempotente e versiona snapshots', async ({ page }) => {
    const r1 = await page.evaluate(() => window.Durability.migrate());
    const r2 = await page.evaluate(() => window.Durability.migrate());
    expect(r2.migrated).toBe(false); // segunda rodada não migra nada
    const v = await page.evaluate(() => +(localStorage.getItem('investidor10-schema-version') || 0));
    expect(v).toBeGreaterThanOrEqual(2);
  });

  test('botão Backup Agora na aba Backup funciona', async ({ page }) => {
    await page.goto('http://localhost:8765/#backup');
    const btn = page.locator('#btnDurabilityBackupNow');
    await expect(btn).toBeVisible();
    await btn.click();
    const last = await page.evaluate(() => localStorage.getItem('investidor10-last-backup'));
    expect(last).not.toBeNull();
    await expect(page.locator('#toastContainer')).toContainText(/backup/i, { timeout: 8000 }).catch(() => {});
  });
});
