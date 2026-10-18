// E2E: simula PRODUÇÃO (sem carteira-data.js) — importa backup real e verifica persistência
import { test, expect } from '@playwright/test';
import path from 'path';

const BACKUP = path.resolve('backup-carteira-2026-10-17.json');

// P-NIGHT: em dev local o Service Worker precacheia carteira-data.js e o
// serve no reload, burlando o bloqueio de rota abaixo (em produção o arquivo
// 404 no servidor e o SW nunca o cacheia — live-prod verifica isso).
// serviceWorkers:'block' mantém o teste fiel ao cenário de produção.
test.use({ serviceWorkers: 'block' });

test('Import backup em produção simulada + persiste após reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Bloqueia carteira-data.js — simula deploy (arquivo não existe no host)
  // (glob com * final: a tag usa ?v=20261012 — sem ele o arquivo real vazava na simulação)
  await page.route('**/carteira-data.js*', route => route.fulfill({ status: 404, body: '' }));
  // Primeira visita: localStorage limpo — mas SOMENTE na primeira (flag em
  // sessionStorage, que sobrevive ao reload). O addInitScript roda em todo
  // load; limpar sempre aniquilava o backup importado (P-NIGHT fix).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__primeira_visita__')) {
      sessionStorage.setItem('__primeira_visita__', '1');
      try { localStorage.clear(); } catch (e) {}
    }
  });

  // 1) Load sem dados reais → deve mostrar base sintética (30.000,00 — fixture demo P26/P27)
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const kpiAntes = await page.textContent('#kpiTotal');
  console.log('KPI antes do import (mock):', kpiAntes?.trim());

  // 2) Vai na aba Backup e importa o arquivo real
  await page.evaluate(() => { if (window.__resetRenderedTabs) window.__resetRenderedTabs(); window.switchTab('backup'); });
  await page.waitForTimeout(800);

  const fileInput = page.locator('#backupFile');
  await fileInput.setInputFiles(BACKUP);
  await page.click('#backupImportForm button[type="submit"]');
  await page.waitForTimeout(2500);

  // 3) Verifica dados reais aplicados
  const kpiDepois = await page.textContent('#kpiTotal');
  console.log('KPI depois do import:', kpiDepois?.trim());
  expect(kpiDepois).toContain('702.175');

  const resultMsg = await page.textContent('#backupImportResult');
  console.log('Resultado import:', resultMsg?.trim().slice(0, 100));
  expect(resultMsg || '').toContain('sucesso');

  // 4) RELOAD — dados precisam persistir (fix da chave + seções)
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const kpiReload = await page.textContent('#kpiTotal');
  console.log('KPI após reload:', kpiReload?.trim());
  expect(kpiReload).toContain('702.175');

  // 5) Série de 84 meses restaurada (patrimony no loadFromStorage)
  const meses = await page.evaluate(() => window.MOCK_DATA?.patrimony?.labels?.length || window.CARTEIRA_DATA?.patrimony?.labels?.length || 0);
  console.log('Meses na série após reload:', meses);
  expect(meses).toBe(84);

  console.log('Erros de página:', errors.length === 0 ? 'NENHUM ✅' : errors.join(' | '));
  expect(errors).toEqual([]);
});
