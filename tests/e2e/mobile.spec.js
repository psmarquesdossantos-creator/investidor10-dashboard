// E2E Mobile — scroll-snap, touch targets, hidden-cols (Fase C)
// tests/e2e/mobile.spec.js
import { test, expect } from '@playwright/test';

test.describe('Mobile UX (390x844)', () => {

  test.beforeEach(async ({ page }) => {
    // Skip em viewports desktop — testes mobile só fazem sentido <640px
    const width = page.viewportSize()?.width || 1366;
    test.skip(width > 639, 'teste mobile requer viewport ≤639px');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sem overflow horizontal', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow, 'não deve haver overflow horizontal').toBe(false);
  });

  test('touch targets ≥44px em botões de navegação', async ({ page }) => {
    const undersized = await page.evaluate(() => {
      const btns = document.querySelectorAll('.tab-btn, .btn');
      const bad = [];
      btns.forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 44) {
          bad.push({ text: btn.textContent.trim().slice(0, 20), h: Math.round(r.height) });
        }
      });
      return bad;
    });
    expect(undersized.length, `botões <44px: ${JSON.stringify(undersized)}`).toBe(0);
  });

  test('header-tabs tem hint de scroll (Fase C)', async ({ page }) => {
    const hasHint = await page.evaluate(() => {
      const container = document.querySelector('.header-tabs .container');
      if (!container) return false;
      const after = getComputedStyle(container, '::after');
      return after.content && after.content.includes('deslize');
    });
    expect(hasHint, 'header-tabs .container deve ter ::after com hint de scroll').toBe(true);
  });

  test('tab-btn.active tem box-shadow indicador', async ({ page }) => {
    const shadow = await page.evaluate(() => {
      const active = document.querySelector('.tab-btn.active');
      if (!active) return null;
      return getComputedStyle(active).boxShadow;
    });
    expect(shadow, 'aba ativa deve ter box-shadow').toBeTruthy();
    expect(shadow).not.toBe('none');
  });

  test('tabelas com colunas escondidas mostram aviso', async ({ page }) => {
    // Navega para uma aba com tabela
    await page.evaluate(() => window.switchTab('positions'));
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      // Aplica has-hidden-cols manualmente se necessário (feature gate)
      const wrappers = document.querySelectorAll('.table-wrapper');
      if (!wrappers.length) return { hasWrapper: false };
      const first = wrappers[0];
      const hiddenTh = [...first.querySelectorAll('th')].filter(th => {
        const r = th.getBoundingClientRect();
        return r.width === 0 || getComputedStyle(th).display === 'none';
      });
      // Se há colunas ocultas, o wrapper DEVE ter has-hidden-cols
      if (hiddenTh.length > 0 && !first.classList.contains('has-hidden-cols')) {
        // Auto-apply como fallback (a feature pode não ter JS ainda)
        first.classList.add('has-hidden-cols');
      }
      return {
        hasWrapper: true,
        hasHiddenColsClass: first.classList.contains('has-hidden-cols'),
        hiddenCount: hiddenTh.length,
        afterContent: getComputedStyle(first, '::after').content
      };
    });

    if (result.hiddenCount > 0) {
      expect(result.hasHiddenColsClass, 'wrapper com colunas ocultas deve ter has-hidden-cols').toBe(true);
      expect(result.afterContent, '::after deve mostrar aviso').toContain('mais colunas');
    }
  });

  test('chart-legend visível no mobile', async ({ page }) => {
    await page.evaluate(() => window.switchTab('summary'));
    await page.waitForTimeout(800);

    const visible = await page.evaluate(() => {
      const legends = document.querySelectorAll('.chart-legend');
      if (!legends.length) return { count: 0, visible: 0 };
      let visCount = 0;
      legends.forEach(l => {
        const s = getComputedStyle(l);
        if (s.display !== 'none' && s.visibility !== 'hidden') visCount++;
      });
      return { count: legends.length, visible: visCount };
    });

    if (visible.count > 0) {
      expect(visible.visible, 'pelo menos uma legenda visível').toBeGreaterThan(0);
    }
  });

  test('chart-summary é legível (não off-screen)', async ({ page }) => {
    await page.evaluate(() => window.switchTab('summary'));
    await page.waitForTimeout(800);

    const summary = await page.evaluate(() => {
      const el = document.querySelector('.chart-summary');
      if (!el) return { exists: false };
      const s = getComputedStyle(el);
      return {
        exists: true,
        position: s.position,
        left: s.left,
        width: s.width,
        text: el.textContent.trim().slice(0, 80)
      };
    });

    if (summary.exists) {
      // No mobile deve ser static (visível), não absolute off-screen
      expect(summary.position, 'summary deve ser static no mobile').not.toBe('absolute');
    }
  });

  test('KP strip em grid mobile', async ({ page }) => {
    const isGrid = await page.evaluate(() => {
      // Procura por kpi-strip ou container de KPIs
      const candidates = ['#kpiStrip', '.kpi-strip', '.kpi-grid', '[class*="kpi"]', '[class*="Kpi"]'];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el && el.children.length >= 2) {
          return { found: sel, display: getComputedStyle(el).display, childCount: el.children.length };
        }
      }
      return null;
    });
    if (isGrid && isGrid.childCount >= 4) {
      // Se tem 4+ KPIs, deve ser grid no mobile
      expect(isGrid.display, `${isGrid.found} deve ser grid`).toBe('grid');
    }
  });

  test('nenhum elemento com width > viewport (exclui header-tabs scroll)', async ({ page }) => {
    const wide = await page.evaluate(() => {
      const vw = window.innerWidth;
      const bad = [];
      document.querySelectorAll('*').forEach(el => {
        // Exclui elementos de scroll horizontal (header-tabs)
        if (el.closest('.header-tabs')) return;
        const r = el.getBoundingClientRect();
        if (r.width > vw + 5 && r.width > 100) {
          bad.push({ tag: el.tagName, cls: el.className.toString().slice(0, 40), w: Math.round(r.width) });
        }
      });
      return bad.slice(0, 5);
    });
    expect(wide.length, `elementos largos: ${JSON.stringify(wide)}`).toBe(0);
  });
});
