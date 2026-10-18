// tests/e2e/smoke.spec.js
// Smoke test: página carrega, título, KPIs visíveis, 8 abas presentes
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('página carrega com título correto', async ({ page }) => {
    await expect(page).toHaveTitle(/Investidor10|Dashboard|Carteira/i);
  });

  test('19 abas de navegação presentes', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    await expect(tabs).toHaveCount(19);

    const expectedTabs = [
      'Resumo', 'Patrimônio', 'Rentabilidade', 'Posições', 'Proventos',
      'Lançamentos', 'Renda Fixa', 'Rebalancear', 'Risco', 'Impostos',
      'Eventos Corp.', 'Importar', 'Backup', 'Backup Port.',
      'Metas', 'Benchmarks', 'Simulação', 'Qualidade dos Dados',
      'Configurações'
    ];

    for (const tabName of expectedTabs) {
      // match exato — 'Backup' não pode casar com 'Backup Port.' (substring)
      await expect(page.locator('.tab-btn').filter({ hasText: new RegExp(`^${tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })).toBeVisible();
    }

    // Also verify "Backup" tab exists separately (exact match)
    const backupTab = page.locator('.tab-btn').filter({ hasText: /^Backup$/ });
    await expect(backupTab).toBeVisible();
  });

  test('KPIs principais visíveis', async ({ page }) => {
    // Verifica se existem cards de KPI
    const kpiCards = page.locator('.kpi-card, .metric-card, [data-kpi]');
    await expect(kpiCards.first()).toBeVisible();

    // Pelo menos 4 KPIs: Patrimônio, Investido, Resultado, Yield
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(3);
  });

  test('sem erros de console críticos', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Debug: origem dos erros de console (arquivo:linha)
    errors.forEach(e => {
      const loc = (() => { try { return (e.stack || '').split('\n')[1] || ''; } catch { return ''; } })();
      console.log('CONSOLE ERROR:', e, '|', loc.trim().slice(0, 200));
    });

    // Filtra erros conhecidos não-críticos (ex: favicon, APIs externas, CDN)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('chart.js') && // Chart.js carrega via CDN
      !e.includes('brapi.dev') && // API externa (pode rate-limit)
      !e.includes('503 (Service Unavailable)') && // API externa indisponível
      !e.includes('Failed to load resource') && // Generic resource load (CDN/externos)
      !e.includes('net::ERR_') // Erros de rede (CDN/externos)
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('viewport responsivo - sem overflow horizontal desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const body = page.locator('body');
    await expect(body).not.toHaveCSS('overflow-x', 'scroll');
    const hasHorizontalOverflow = await page.evaluate(() =>
      document.body.scrollWidth > document.body.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('viewport responsivo - sem overflow horizontal mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const hasHorizontalOverflow = await page.evaluate(() =>
      document.body.scrollWidth > document.body.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});