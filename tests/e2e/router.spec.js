// router.spec.js — Regressão do hash routing
import { test, expect } from '@playwright/test';

test.describe('Hash Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Flag para router fazer scroll imediato em testes
    await page.addInitScript(() => { window.__TESTING__ = true; });
  });

  test('navegação via hash muda aba ativa', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // hash inicial deve ser summary
    await expect(page).toHaveURL(/#summary/);

    // navegar via click na tab
    await page.locator('.tab-btn[data-tab="positions"]').click();
    await expect(page).toHaveURL(/#positions/);

    // painel correto deve estar visível
    await expect(page.locator('#panel-positions')).toBeVisible();
    await expect(page.locator('#panel-summary')).toBeHidden();
  });

  test('history.back / history.forward funcionam', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // navegar para 3 tabs diferentes
    await page.locator('.tab-btn[data-tab="earnings"]').click();
    await page.waitForURL(/#earnings/);
    await page.locator('.tab-btn[data-tab="benchmarks"]').click();
    await page.waitForURL(/#benchmarks/);
    await page.locator('.tab-btn[data-tab="tax"]').click();
    await page.waitForURL(/#tax/);

    // voltar duas vezes - usar waitForFunction para hash
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#benchmarks');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#earnings');

    // avançar
    await page.goForward();
    await page.waitForFunction(() => location.hash === '#benchmarks');
  });

  test('deep linking com query params', async ({ page }) => {
    // navegação direta com hash + query params
    await page.goto('/#earnings?period=2024&type=dividend');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/#earnings\?period=2024&type=dividend/);
    await expect(page.locator('#panel-earnings')).toBeVisible();
  });

  test('document.title atualiza por aba', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Resumo/);

    await page.locator('.tab-btn[data-tab="patrimony"]').click();
    await expect(page).toHaveTitle(/Patrimônio/);

    await page.locator('.tab-btn[data-tab="returns"]').click();
    await expect(page).toHaveTitle(/Rentabilidade/);
  });

  test('scroll to top ao navegar entre abas', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // scroll down
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(100);

    // navegar para outra aba
    await page.locator('.tab-btn[data-tab="patrimony"]').click();
    await page.waitForURL(/#patrimony/);

    // deve ter scrollado para topo
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(50);
  });

  test('url inválida cai para summary', async ({ page }) => {
    await page.goto('/#rota-inexistente');
    await page.waitForLoadState('networkidle');

    // deve redirecionar para summary
    await expect(page).toHaveURL(/#summary/);
  });

  test('router API exposta no window', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Aguardar router estar pronto
    await page.waitForFunction(() => window.router && typeof window.router.navigate === 'function', { timeout: 10000 });

    // Verificar tipos via evaluate serializando cada tipo
    const navigateType = await page.evaluate(() => typeof window.router.navigate);
    const replaceType = await page.evaluate(() => typeof window.router.replace);
    const getCurrentType = await page.evaluate(() => typeof window.router.getCurrent);

    expect(navigateType).toBe('function');
    expect(replaceType).toBe('function');
    expect(getCurrentType).toBe('function');
  });
});
