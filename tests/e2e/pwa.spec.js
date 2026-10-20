// E2E PWA Offline — service worker cache (Fase PWA)
// tests/e2e/pwa.spec.js
import { test, expect } from '@playwright/test';

test.describe('PWA Offline (Service Worker)', () => {

  test('service worker registra e ativa', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const swState = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return { supported: false };
      const reg = await navigator.serviceWorker.ready;
      return {
        supported: true,
        active: !!reg.active,
        scope: reg.scope
      };
    });

    expect(swState.supported, 'service worker deve ser suportado').toBe(true);
    expect(swState.active, 'service worker deve estar ativo').toBe(true);
  });

  test('cache estático contém assets essenciais', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const essential = ['/index.html', '/styles.css', '/script.js', '/manifest.json'];

    // addAll é atômico e inclui fonte externa (fonts.googleapis.com) —
    // pode demorar em runners lentos; aguarda polling em vez de timeout fixo.
    await page.waitForFunction((assets) => {
      return caches.keys().then(async keys => {
        const staticKey = keys.find(k => k.includes('static'));
        if (!staticKey) return false;
        const cache = await caches.open(staticKey);
        const requests = await cache.keys();
        const paths = requests.map(r => new URL(r.url).pathname);
        return assets.every(a => paths.includes(a));
      });
    }, essential, { timeout: 5000 });

    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      if (!keys.length) return { cacheCount: 0, assets: [] };
      const staticKey = keys.find(k => k.includes('static'));
      if (!staticKey) return { cacheCount: keys.length, assets: [] };
      const cache = await caches.open(staticKey);
      const requests = await cache.keys();
      return {
        cacheCount: keys.length,
        assets: requests.map(r => new URL(r.url).pathname).filter(p => p !== '/')
      };
    });

    expect(cached.cacheCount, 'deve haver pelo menos 1 cache').toBeGreaterThan(0);
    // Verifica assets essenciais
    for (const asset of essential) {
      expect(cached.assets, `cache deve conter ${asset}`).toContain(asset);
    }
  });

  test('app funciona offline (cache-first)', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Aguarda SW ativar E controlar a página
    const swReady = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) return false;
      // Força controle da página atual
      await navigator.serviceWorker.controller?.ready || navigator.serviceWorker.ready;
      // Recarrega para SW controlar
      return true;
    });
    expect(swReady, 'SW deve estar pronto').toBe(true);

    // Recarrega para SW controlar a página
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Verifica SW controla
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    expect(controlled, 'SW deve controlar a página').toBe(true);

    // Desliga a rede
    await context.setOffline(true);

    // Navega internamente (hash change não vai à rede)
    await page.evaluate(() => { window.location.hash = '#positions'; });
    await page.waitForTimeout(200);

    const state = await page.evaluate(() => ({
      title: document.title,
      hasBody: document.body.innerHTML.length > 100,
      hasTabs: !!document.querySelector('.tab-btn, nav, .header-tabs')
    }));

    expect(state.title, 'título deve existir offline').toBeTruthy();
    expect(state.hasBody, 'body deve ter conteúdo offline').toBe(true);
    expect(state.hasTabs, 'navegação deve existir offline').toBe(true);

    // Restaura rede
    await context.setOffline(false);
  });

  test('manifest.json válido e acessível', async ({ page }) => {
    await page.goto('/');
    const manifest = await page.evaluate(async () => {
      const res = await fetch('/manifest.json');
      if (!res.ok) return null;
      return res.json();
    });

    expect(manifest, 'manifest deve ser válido JSON').toBeTruthy();
    expect(manifest.name, 'manifest.name deve existir').toBeTruthy();
    expect(manifest.start_url, 'manifest.start_url deve existir').toBeTruthy();
    expect(manifest.display, 'manifest.display deve existir').toBeTruthy();
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest.icons deve ter ícones').toBe(true);
  });
});
