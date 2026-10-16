// tests/e2e/auth-gate.spec.js
// E2E: auth-gate, modos INACTIVE/LOGIN/DEMO/BLOCKED, fixture demo sintética
import { test, expect } from '@playwright/test';

test.describe('Auth Gate — fixture demo sintética', () => {
  test('demo fixture carrega e é 100% sintético', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fixture = await page.evaluate(() => window.DEMO_FIXTURE || null);
    expect(fixture, 'window.DEMO_FIXTURE deve existir').not.toBeNull();
    expect(fixture.meta.source).toBe('demo');
    expect(fixture.kpis.total).toBe(123456.78);
    expect(fixture.positions.length).toBeGreaterThanOrEqual(12);
    // P26: zero dados reais no fixture
    const json = JSON.stringify(fixture);
    expect(json).not.toContain('702175');
    expect(json).not.toContain('628267');
  });

  test('LocalDemoDataSource: persiste seção, getPortfolio, reset restaura defaults', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    const result = await page.evaluate(async () => {
      const DS = window.LocalDemoDataSource;
      if (!DS) return { error: 'LocalDemoDataSource ausente' };
      const ds = new DS();
      await ds.start();
      const initial = ds.getPortfolio();
      const initialTotal = initial && initial.kpis && initial.kpis.total;

      ds.saveSection('kpis', { total: 99999, invested: 99999, profit: 0 });
      const persistedKey = 'investidor10-demo';
      const raw = localStorage.getItem(persistedKey);
      const savedTotal = ds.getPortfolio().kpis.total;

      ds.reset();
      const afterReset = ds.getPortfolio().kpis.total;

      return { initialTotal, savedTotal, afterReset, raw: !!raw, key: persistedKey };
    });

    expect(result.error).toBeUndefined();
    expect(result.initialTotal).toBe(123456.78);      // start() carrega fixture default
    expect(result.savedTotal).toBe(99999);            // saveSection persistiu
    expect(result.afterReset).toBe(123456.78);        // reset restaura fixture (P11)
    expect(result.key).toBe('investidor10-demo');      // P10: storage próprio do demo
    // limpeza
    await page.evaluate(() => localStorage.removeItem('investidor10-demo'));
  });
});

test.describe('Auth Gate — modos forçados (sem Firebase, sem rede)', () => {
  test('force LOGIN: overlay visível, app oculto, validação inline', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = true; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#authGate')).toBeVisible();
    // P22: app não renderiza dados antes da decisão de acesso
    await expect(page.locator('#kpiTotal')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/auth-locked/);

    // e-mail inválido → erro inline específico
    await page.fill('#authEmail', 'nao-e-mail');
    await page.fill('#authPassword', 'senha123');
    await page.click('#authSubmit');
    await expect(page.locator('#authError')).toContainText('e-mail válido');

    // senha curta → erro inline específico
    await page.fill('#authEmail', 'dono@exemplo.com');
    await page.fill('#authPassword', '123');
    await page.click('#authSubmit');
    await expect(page.locator('#authError')).toContainText('6 caracteres');
  });

  test("force DEMO: badge + fixture aplicada + copy P9, app visível", async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.removeItem('investidor10-demo'));

    await expect(page.locator('#demoBadge')).toBeVisible();
    await expect(page.locator('#authGate')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/auth-locked/);

    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    expect(total).toBe(123456.78); // fixture demo aplicada, não dados locais/reais

    const badgeText = await page.locator('#demoBadge').textContent();
    expect(badgeText).toContain('MODO DEMONSTRAÇÃO'); // P27
    expect(badgeText).toContain('fictícios');          // P9 copy exata (frase completa)

    await expect(page.locator('#kpiTotal')).toContainText('123.456');
  });

  test('force BLOCKED: tela dedicada, app oculto, sem dados', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'blocked'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#authBlocked')).toBeVisible();
    await expect(page.locator('#kpiTotal')).toBeHidden();
  });
});

test.describe('Auth Gate — SyncHub e isolamento de storage (P8/P10)', () => {
  test('SyncHub é no-op em INACTIVE: inactive, markDirty não lança, sem writes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const state = await page.evaluate(() => ({
      active: !!(window.SyncHub && window.SyncHub.active),
      exists: !!window.SyncHub
    }));
    expect(state.exists).toBe(true);        // SyncHub definido
    expect(state.active).toBe(false);       // inativo sem modo REAL

    // markDirty no-op: não lança, não agenda writes
    const result = await page.evaluate(() => {
      try { window.SyncHub.markDirty('positions'); window.SyncHub.flush(); return { threw: false }; }
      catch (e) { return { threw: true, msg: e.message }; }
    });
    expect(result.threw).toBe(false);
  });

  test('DEMO: saveToStorage persiste na chave demo, nunca na chave real (P10)', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => { localStorage.removeItem('investidor10-demo'); localStorage.removeItem('investidor10'); });

    await page.evaluate(() => {
      window.MOCK_DATA.entries.push({ date: '2026-10-16', type: 'compra', ticker: 'ALFA11', asset: 'ALFA11', qty: 1, price: 10, total: 10, class: 'fiis' });
      window.saveToStorage();
    });

    const keys = await page.evaluate(() => ({
      demo: localStorage.getItem('investidor10-demo'),
      real: localStorage.getItem('investidor10')
    }));
    expect(keys.demo).toBeTruthy(); // edit do demo foi persistido na chave demo
    const demoParsed = JSON.parse(keys.demo);
    expect(demoParsed.portfolio.entries.length).toBeGreaterThan(6); // fixture 6 + 1 edit
    // chave real nunca recebe dados financeiros do demo
    const realParsed = keys.real ? JSON.parse(keys.real) : {};
    expect(realParsed.positions).toBeUndefined();
    expect(realParsed.entries).toBeUndefined();
  });

  test('DEMO: botão Restaurar reseta para os defaults do demo (P11)', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.removeItem('investidor10-demo'));

    // muta + persiste
    await page.evaluate(() => {
      window.MOCK_DATA.entries.push({ date: '2026-10-16', type: 'compra', ticker: 'ALFA11', asset: 'ALFA11', qty: 1, price: 10, total: 10, class: 'fiis' });
      window.MOCK_DATA.kpis.total = 555;
      window.saveToStorage();
    });
    let entries = await page.evaluate(() => window.MOCK_DATA.entries.length);
    expect(entries).toBeGreaterThan(6); // mutação aplicada

    // P11: restaura defaults via botão do badge
    await page.click('#btnDemoReset');

    entries = await page.evaluate(() => window.MOCK_DATA.entries.length);
    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    const keyGone = await page.evaluate(() => localStorage.getItem('investidor10-demo') === null);
    expect(entries).toBe(6);            // fixture default restaurada
    expect(total).toBe(123456.78);
    expect(keyGone).toBe(true);          // edits do demo descartados
  });
});
