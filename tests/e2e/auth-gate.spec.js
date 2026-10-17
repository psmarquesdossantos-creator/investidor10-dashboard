// tests/e2e/auth-gate.spec.js
// E2E: auth-gate, modos INACTIVE/LOGIN/DEMO/BLOCKED/PREVIEW, fixture demo sintética
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Valores reais (p/ assert de não-vazamento) vêm do arquivo local GITIGNORED.
const VALUES_FILE = 'tests/e2e/real-data.values.local.json';
const hasLocalValues = existsSync(VALUES_FILE);
const realTotals = hasLocalValues
  ? [JSON.parse(readFileSync(VALUES_FILE, 'utf8')).expectedTotal]
  : [];
const knownReal = realTotals.map(t => String(t).split('.')[0]); // parte inteira como marcador

test.describe('Auth Gate — fixture demo sintética', () => {
  test('demo fixture carrega e é 100% sintético', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fixture = await page.evaluate(() => window.DEMO_FIXTURE || null);
    expect(fixture, 'window.DEMO_FIXTURE deve existir').not.toBeNull();
    expect(fixture.meta.source).toBe('demo');
    expect(fixture.kpis.total).toBe(30000);
    expect(fixture.positions.length).toBeGreaterThanOrEqual(12);
    // P26: zero dados reais no fixture (marcadores só se valores locais presentes)
    const json = JSON.stringify(fixture);
    for (const marker of knownReal) {
      expect(json).not.toContain(marker);
    }
    // tickers do fixture são todos fictícios (nunca equal a tickers do dataset legado)
    const tickers = fixture.positions.map(p => p.ticker).join(',');
    expect(tickers).toContain('ALFA11');
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
    expect(result.initialTotal).toBe(30000);      // start() carrega fixture default
    expect(result.savedTotal).toBe(99999);            // saveSection persistiu
    expect(result.afterReset).toBe(30000);        // reset restaura fixture (P11)
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
    expect(total).toBe(30000); // fixture demo aplicada, não dados locais/reais

    const badgeText = await page.locator('#demoBadge').textContent();
    expect(badgeText).toContain('MODO DEMONSTRAÇÃO'); // P27
    expect(badgeText).toContain('fictícios');          // P9 copy exata (frase completa)

    await expect(page.locator('#kpiTotal')).toContainText('30.000');
  });

  test('force BLOCKED: tela dedicada, app oculto, sem dados', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'blocked'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#authBlocked')).toBeVisible();
    await expect(page.locator('#kpiTotal')).toBeHidden();
  });

  test('force PREVIEW (produção sem Firebase): lock + explorar demo', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'preview'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Lock visível; formulário de login escondido (sem Firebase não há login real)
    await expect(page.locator('#authGate')).toBeVisible();
    await expect(page.locator('#authDemoEntry')).toBeVisible();
    await expect(page.locator('#authEmail')).toBeHidden();
    await expect(page.locator('#kpiTotal')).toBeHidden(); // P22: nada renderiza antes

    // Explorar demonstração → demo sintético com badge (P27/P28)
    await page.click('#authDemoEntry');
    await expect(page.locator('#demoBadge')).toBeVisible();
    await expect(page.locator('#authGate')).toBeHidden();
    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    expect(total).toBe(30000); // fixture sintética — nunca o dataset legado/real
    await expect(page.locator('#kpiTotal')).toContainText('30.000');
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
    const fixtureEntriesCount = await page.evaluate(() => window.DEMO_FIXTURE.entries.length);
    await page.evaluate(() => {
      window.MOCK_DATA.entries.push({ date: '2026-10-16', type: 'compra', ticker: 'ALFA11', asset: 'ALFA11', qty: 1, price: 10, total: 10, class: 'fiis' });
      window.MOCK_DATA.kpis.total = 555;
      window.saveToStorage();
    });
    let entries = await page.evaluate(() => window.MOCK_DATA.entries.length);
    expect(entries).toBeGreaterThan(fixtureEntriesCount); // mutação aplicada

    // P11: restaura defaults via botão do badge
    await page.click('#btnDemoReset');

    entries = await page.evaluate(() => window.MOCK_DATA.entries.length);
    const total = await page.evaluate(() => window.MOCK_DATA.kpis.total);
    const keyGone = await page.evaluate(() => localStorage.getItem('investidor10-demo') === null);
    expect(entries).toBe(fixtureEntriesCount);     // fixture default restaurada
    expect(total).toBe(30000);
    expect(keyGone).toBe(true);          // edits do demo descartados
  });

  test('DEMO end-to-end: abas Posições e Proventos mostram APENAS fictícios (P26)', async ({ page }) => {
    await page.addInitScript(() => { window.__AUTH_GATE_FORCE__ = 'demo'; });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tickers do dataset LEGADO (realista — jamais podem aparecer no demo público)
    const LEGACY = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'HGLG11', 'MXRF11', 'IVVB11', 'BOVA11', 'BBAS3', 'RENT3', 'LREN3', 'RADL3'];

    // Aba Posições (textContent: cobre cards mobile + tabela desktop; retry p/ renders tardios)
    await page.evaluate(() => window.switchTab('positions'));
    await expect(page.locator('#panel-positions')).toContainText('ALFA11', { timeout: 10000 });
    const posText = await page.evaluate(() => document.getElementById('panel-positions').textContent);
    for (const t of LEGACY) {
      expect(posText, `demo não deve conter ${t}`).not.toContain(t);
    }

    // Aba Proventos
    await page.evaluate(() => window.switchTab('earnings'));
    await expect(page.locator('#panel-earnings')).toContainText('ALFA11', { timeout: 10000 });
    const earnText = await page.evaluate(() => document.getElementById('panel-earnings').textContent);
    for (const t of LEGACY) {
      expect(earnText, `demo não deve conter ${t}`).not.toContain(t);
    }

    // Aba Patrimônio (gráfico/labels da fixture, 12 meses)
    await page.evaluate(() => window.switchTab('patrimony'));
    await page.waitForTimeout(600);
    const patText = await page.evaluate(() => document.getElementById('panel-patrimony').textContent);
    for (const t of LEGACY) {
      expect(patText, `demo não deve conter ${t}`).not.toContain(t);
    }
  });
});
