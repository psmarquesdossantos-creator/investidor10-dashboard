// tests/e2e/settings-tab.spec.js
// P29: aba Configurações (hub Conta/Aparência/Dados/Sobre) + menu do usuário funcional
import { test, expect } from '@playwright/test';

async function openSettings(page) {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); });
  await page.locator('.tab-btn[data-tab="settings"]').click();
  await page.waitForTimeout(400);
}

test('aba Configurações renderiza as 4 seções com dados reais', async ({ page }) => {
  await openSettings(page);

  // Conta: modo do gate resolvido (local = INACTIVE → "Modo local")
  await expect(page.locator('#settingsAccountMode')).toHaveText('Modo local');
  await expect(page.locator('#settingsSyncInfo')).toContainText('Dados locais');

  // Dados: contagens coerentes com a base carregada
  const stats = await page.locator('#settingsDataStats').textContent();
  const expected = await page.evaluate(() =>
    `${window.MOCK_DATA.positions.length} posições · ${window.MOCK_DATA.entries.length} lançamentos · ${window.MOCK_DATA.earnings.length} proventos`);
  expect(stats).toBe(expected);

  // Sobre: versão presente (não pode ficar "—")
  const version = await page.locator('#settingsVersion').textContent();
  expect(version).toMatch(/^v\d+\.\d+/);

  // 4 cards presentes
  for (const id of ['settingsAccountCard', 'settingsAppearanceCard', 'settingsDataCard', 'settingsAboutCard']) {
    await expect(page.locator('#' + id)).toBeVisible();
  }
});

test('seletor de tema da aba Configurações aplica e persiste', async ({ page }) => {
  await openSettings(page);

  await page.selectOption('#settingsThemeSelect', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('investidor10-dashboard-data');
    return raw ? JSON.parse(raw).theme : null;
  });
  expect(persisted).toBe('dark');

  // sistema remove o atributo (prefers-color-scheme assume)
  await page.selectOption('#settingsThemeSelect', 'system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('seletor de animações aplica data-motion=reduced e persiste', async ({ page }) => {
  await openSettings(page);

  await page.selectOption('#settingsMotionSelect', 'off');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect(await page.evaluate(() => localStorage.getItem('investidor10-motion'))).toBe('off');

  await page.selectOption('#settingsMotionSelect', 'on');
  await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'reduced');
});

test('menu do usuário: Perfil leva à Configurações, Ajuda abre modal, Sair avisado em modo local', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');

  // Perfil → abre a aba Configurações com destaque no card Conta
  await page.locator('#userAvatar').click();
  await page.locator('#userProfileItem').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#panel-settings')).toBeVisible();
  await expect(page.locator('#settingsAccountMode')).toHaveText('Modo local');

  // Ajuda → modal abre e fecha
  await page.locator('#userAvatar').click();
  await page.locator('#userHelpItem').click();
  await expect(page.locator('#helpModal')).toBeVisible();
  await page.locator('#helpModal .modal-close').click();
  await expect(page.locator('#helpModal')).not.toBeVisible();

  // Sair em modo local (INACTIVE) → apenas aviso, sem recarregar
  await page.locator('#userAvatar').click();
  await page.locator('#userSignOutItem').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#userDropdown')).toBeHidden();
});

test('botões de navegação de dados levam às abas corretas', async ({ page }) => {
  await openSettings(page);

  await page.click('#settingsGoImport');
  await expect(page.locator('#panel-import')).toBeVisible();

  await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab('settings'); });
  await page.waitForTimeout(300);
  await page.click('#settingsGoBackup');
  await expect(page.locator('#panel-backup')).toBeVisible();
});
