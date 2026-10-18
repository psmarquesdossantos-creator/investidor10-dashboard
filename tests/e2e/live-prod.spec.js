// tests/e2e/live-prod.spec.js
// Testes contra a produção REAL (GitHub Pages / Vercel). Opcional:
// roda apenas quando LIVE_BASE_URL está definida:
//   LIVE_BASE_URL=https://<host> npx playwright test tests/e2e/live-prod.spec.js
import { test, expect } from '@playwright/test';

const BASE = (process.env.LIVE_BASE_URL || '').replace(/\/$/, '');
const ENABLED = !!BASE;
// *.vercel.app: auth-gate resolve INACTIVE (deploy atrás da Vercel Authentication)
// → sem lock. Demais hosts de produção (github.io): lock P22 + entrada demo.
const IS_VERCEL = /\.vercel\.app$/.test(BASE.replace(/^https?:\/\//, '').split('/')[0]);

test.skip(!ENABLED, 'LIVE_BASE_URL ausente — teste live é opcional (produção)');

// Entrada no app em qualquer modo de produção: clica no demo se o lock aparecer
async function enterApp(page) {
  const demo = page.locator('#authDemoEntry');
  if (await demo.isVisible({ timeout: 8000 }).catch(() => false)) {
    await demo.click();
    await page.waitForTimeout(1200);
  }
}

test.describe('Live — produção pública (privacidade + lock)', () => {

  test('lock screen aparece e NADA renderiza antes da decisão (P22)', async ({ page }) => {
    test.skip(IS_VERCEL, '*.vercel.app: gate INACTIVE por design (Vercel Authentication cobre o acesso) — lock não se aplica');
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#authGate')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#authDemoEntry')).toBeVisible();
    await expect(page.locator('#kpiTotal')).toBeHidden();
    await expect(page.locator('#authEmail')).toBeHidden(); // sem Firebase: form oculto
  });

  test('nenhum arquivo de dados reais é servido (404 obrigatório)', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    const forbidden = ['carteira-data.js', 'data.js', 'parsed_data.json', 'carteira-data-real.json',
      'carteira-data-backup-20261012.js', 'carteira-data-backup-antigo.js'];
    for (const f of forbidden) {
      const status = await page.evaluate(async (file) => (await fetch(file, { cache: 'no-store' })).status, f);
      expect(status, `${f} deve ser 404 na produção`).toBe(404);
    }
  });

  test('explorar demonstração → fixture sintética + badge (P26/P27)', async ({ page }) => {
    test.skip(IS_VERCEL, '*.vercel.app: sem lock não há fluxo demo (fixture 30k é do gate P22)');
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await page.click('#authDemoEntry');

    await expect(page.locator('#demoBadge')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#authGate')).toBeHidden();
    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    expect(total).toBe(30000); // sintético — jamais o dataset legado/real
    await expect(page.locator('#kpiTotal')).toContainText('30.000');
  });

  test('localStorage da produção não contém dados reais após visita', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await enterApp(page); // Vercel: sem lock; github.io: entra no demo
    await page.waitForTimeout(500);
    const dump = await page.evaluate(() => JSON.stringify(localStorage));
    // marcadores do dataset real nunca presentes (valores locais, se existirem)
    const markers = ['702175', '628267', '610219', '630889', '699992'];
    for (const m of markers) expect(dump).not.toContain(m);
  });
});

test.describe('Live — saúde funcional da produção', () => {
  test('Monte Carlo executa via Web Worker na produção', async ({ page }) => {
    test.setTimeout(120000); // Monte Carlo pode demorar >60s na produção
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await enterApp(page);
    // Monte Carlo agora é aba própria (tab-montecarlo)
    await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab('montecarlo'); });
    await page.waitForFunction(() => {
      const k = document.getElementById('mcKpis');
      return k && k.innerText && k.innerText.includes('P50') && !/Carregando|Simulando/.test(k.innerText);
    }, { timeout: 90000 });
    const txt = await page.evaluate(() => document.getElementById('mcKpis')?.innerText?.replace(/\n/g, ' | ').slice(0, 180));
    console.log('MC (produção):', txt);
    const hasChart = await page.evaluate(() => !!(window.Chart && window.Chart.getChart(document.getElementById('mcChart'))));
    expect(hasChart).toBe(true);
  });

  test('IRPF: DARF e GCAP renderizam na produção', async ({ page }) => {
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await enterApp(page);
    await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab('tax'); });
    await page.waitForTimeout(1500);
    const darf = await page.evaluate(() => document.getElementById('darfBody')?.querySelectorAll('tr').length || 0);
    const gcap = await page.evaluate(() => document.getElementById('gcapBody')?.querySelectorAll('tr').length || 0);
    console.log(`IRPF (produção): DARF ${darf} linhas | GCAP ${gcap} linhas`);
    expect(darf).toBeGreaterThan(0);
  });

  test('todas as abas renderizam sem pageerror na produção', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE + '/index.html');
    await page.waitForLoadState('networkidle');
    await enterApp(page);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.tab-btn[data-tab]')].map(b => b.dataset.tab));
    const vazias = [];
    for (const tab of tabs) {
      await page.evaluate(t => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab(t); }, tab);
      await page.waitForTimeout(600);
      const ok = await page.evaluate(t => {
        const p = document.getElementById('panel-' + t);
        return !!p && !p.hidden && (p.innerText || '').trim().length > 50;
      }, tab);
      if (!ok) vazias.push(tab);
    }
    console.log(`${tabs.length} abas varridas; vazias: ${vazias.join(', ') || 'nenhuma'}`);
    expect(vazias).toEqual([]);
    expect(errors).toEqual([]);
  });
});
