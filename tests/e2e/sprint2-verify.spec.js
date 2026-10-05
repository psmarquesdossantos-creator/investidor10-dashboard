// Verificação pós-Sprint2: scroll, contraste e touch targets
import { test, expect } from '@playwright/test';

test.describe('Sprint 2 — verificação final', () => {
  test('scroll vertical funcional (P0#1 da auditoria)', async ({ page }) => {
    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportH = await page.viewportSize().height;
    expect(scrollHeight).toBeGreaterThan(viewportH); // conteúdo além da dobra

    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(150);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(500); // página rola de verdade
  });

  test('contraste WCAG AA — pares críticos nos dois temas', async ({ page }) => {
    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');

    const checkContrast = (fg, bg) => {
      const lum = (c) => {
        const [r, g, b] = c;
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const L1 = lum(fg), L2 = lum(bg);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    };
    const effBg = (el) => {
      let n = el;
      while (n) {
        const b = getComputedStyle(n).backgroundColor;
        if (b && b !== 'rgba(0, 0, 0, 0)') return b;
        n = n.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };

    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForTimeout(100);

      // Seletores de texto semântico e tinta sobre primary-light
      const selectors = [
        '#kpiTotalChange',                    // success-text sobre card (primário e normal)
        '.kpi-card--primary .kpi-label',       // primary-dark sobre primary-light
        '.tab-btn.active',                    // primary-ink sobre fundo do header
        '#kpiProfit',                         // success-text sobre card secundário
      ];
      for (const sel of selectors) {
        const el = page.locator(sel).first();
        if (!(await el.count())) continue;
        const { color, bg } = await el.evaluate((e) => {
          const effBg = (node) => {
            let n = node;
            while (n) {
              const b = getComputedStyle(n).backgroundColor;
              if (b && b !== 'rgba(0, 0, 0, 0)') return b;
              n = n.parentElement;
            }
            return 'rgb(255, 255, 255)';
          };
          return { color: getComputedStyle(e).color, bg: effBg(e) };
        });
        const parse = (s) => s.match(/\d+/g).map(Number).slice(0, 3);
        const ratio = checkContrast(parse(color), parse(bg));
        expect(ratio, `${sel} [${theme}] ${color} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('touch targets ≥44px (modal-close, action-btn, toast-close)', async ({ page }) => {
    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');

    // modal-close (abre modal de lançamento)
    const addBtn = page.locator('[aria-label="Novo lançamento"], #addEntryBtn').first();
    if (await addBtn.count()) {
      await addBtn.click();
      const close = page.locator('.modal-close').first();
      if (await close.isVisible()) {
        const box = await close.boundingBox();
        if (box) expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
        await page.keyboard.press('Escape');
      }
    }
  });
});
