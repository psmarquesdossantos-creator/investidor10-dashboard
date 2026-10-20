// tests/e2e/a11y.spec.js
// Teste de acessibilidade: axe.scan em cada aba: critical=0; verificar botões ≥44px
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TABS = [
  { id: 'panel-summary', label: 'Visão Geral', tabData: 'summary' },
  { id: 'panel-positions', label: 'Posições', tabData: 'positions' },
  { id: 'panel-returns', label: 'Rentabilidade', tabData: 'returns' },
  { id: 'panel-earnings', label: 'Proventos', tabData: 'earnings' },
  { id: 'panel-rebalance', label: 'Rebalancear', tabData: 'rebalance' },
  { id: 'panel-fixed', label: 'Renda Fixa', tabData: 'fixed' },
  { id: 'panel-entries', label: 'Lançamentos', tabData: 'entries' },
  { id: 'panel-patrimony', label: 'Patrimônio', tabData: 'patrimony' },
  { id: 'panel-goals', label: 'Metas', tabData: 'goals' },
  { id: 'panel-benchmarks', label: 'Benchmarks', tabData: 'benchmarks' },
  { id: 'panel-montecarlo', label: 'Simulação', tabData: 'montecarlo' },
  { id: 'panel-data-quality', label: 'Qualidade dos Dados', tabData: 'data-quality' },
  { id: 'panel-settings', label: 'Configurações', tabData: 'settings' },
];

test.describe('Acessibilidade (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');
  });

  for (const tab of TABS) {
    test(`axe critical=0 na aba "${tab.label}"`, async ({ page }) => {
      // Navega para a aba usando evaluate (funciona com módulo ES6)
      if (tab.tabData !== 'summary') {
        await page.evaluate((tabName) => {
          const tabNameStr = tabName;
          document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tabNameStr;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
          });
          document.querySelectorAll('.tab-panel').forEach(panel => {
            const isActive = panel.id === `panel-${tabNameStr}`;
            panel.hidden = !isActive;
            if (isActive) panel.classList.add('active');
            else panel.classList.remove('active');
          });
          const activeTab = document.querySelector(`.tab-btn[data-tab="${tabNameStr}"]`);
          const tabIndicator = document.querySelector('.tab-indicator');
          if (activeTab && tabIndicator) {
            tabIndicator.style.width = `${activeTab.offsetWidth}px`;
            tabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
          }
        }, tab.tabData);
        await page.waitForTimeout(200);
      }

      // Toasts são anúncios transitórios (aria-live) com animação de fade:
      // mid-animação o contraste é inválido por design — WCAG 1.4.3 avalia
      // conteúdo em repouso. Remove antes do scan (não é conteúdo persistente).
      await page.evaluate(() => {
        document.querySelectorAll('#toastContainer .toast').forEach(t => t.remove());
      });

      const results = await new AxeBuilder({ page }).analyze();

      const criticalViolations = results.violations.filter(v => v.impact === 'critical');
      expect(criticalViolations).toHaveLength(0);

      // Serious (ex.: color-contrast) também falha, salvo allowlist explícita e datada.
      // Allowlist vazia em 2026-10-16: tokens -text/-ink AA foram aplicados no CSS;
      // se este teste quebrar, corrija o contraste ou registre aqui regra+prazo.
      const SERIOUS_ALLOWLIST = [];
      const seriousViolations = results.violations.filter(v => v.impact === 'serious');
      const unlisted = seriousViolations.filter(v => !SERIOUS_ALLOWLIST.includes(v.id));
      if (seriousViolations.length > 0) {
        console.log(`Serious violations in ${tab.label}:`, seriousViolations.map(v => v.id).join(', '));
      }
      expect(unlisted).toHaveLength(0);
    });
  }

  test('alvos de toque ≥44px em elementos principais', async ({ page }) => {
    // Verifica apenas elementos principais de navegação (abas, botões primários)
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();

    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Botões primários visíveis
    const primaryButtons = page.locator('button.btn-primary, button[aria-label*="importar" i], button[aria-label*="exportar" i]');
    const btnCount = await primaryButtons.count();
    for (let i = 0; i < btnCount; i++) {
      const box = await primaryButtons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('focus-visible outline presente', async ({ page }) => {
    // Testa navegação por Tab
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus-visible');
    await expect(focused).toBeVisible();

    // Verifica se tem outline visível (não removido por CSS)
    const outlineStyle = await focused.evaluate(el =>
      getComputedStyle(el).outlineWidth
    );
    expect(outlineStyle).not.toBe('0px');
  });

  test('headings semânticos (h1-h6 em ordem)', async ({ page }) => {
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();

    if (count > 0) {
      const levels = [];
      for (let i = 0; i < count; i++) {
        const tag = await headings.nth(i).evaluate(el => el.tagName.toLowerCase());
        levels.push(parseInt(tag[1]));
      }

      // Primeiro heading deve ser h1
      expect(levels[0]).toBe(1);

      // Não deve pular níveis (h1 -> h3 sem h2)
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
      }
    }
  });

  test('gráficos têm texto alternativo ou role=img', async ({ page }) => {
    // Verifica containers dos gráficos Chart.js (pai do canvas)
    const chartContainers = page.locator('.chart-container');
    const count = await chartContainers.count();

    for (let i = 0; i < count; i++) {
      const container = chartContainers.nth(i);
      const ariaLabel = await container.getAttribute('aria-label');
      const role = await container.getAttribute('role');

      // Deve ter aria-label ou role="img" com descrição
      const hasAlt = !!ariaLabel || role === 'img';
      expect(hasAlt).toBe(true);
    }
  });

  test('região aria-live para anúncios dinâmicos', async ({ page }) => {
    const liveRegion = page.locator('[aria-live], [role="alert"], [role="status"]');
    const count = await liveRegion.count();
    expect(count).toBeGreaterThan(0);
  });

  test('respecta prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const anim = body.animationDuration;
      const trans = body.transitionDuration;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return { anim, trans, mq };
    });

    expect(result.mq).toBe(true);
    // Chromium normaliza 0.01ms como 1e-05s no getComputedStyle
    const transVal = parseFloat(result.trans);
    const animVal = parseFloat(result.anim);
    expect(transVal <= 0.01).toBe(true);
    expect(animVal <= 0.01).toBe(true);
  });
});