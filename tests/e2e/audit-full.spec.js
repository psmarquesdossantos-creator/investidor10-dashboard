// Auditoria funcional: navega em todas as abas, coleta estado real de cada painel
import { test } from '@playwright/test';

const TABS = [
  { tab: 'summary', name: 'Resumo' },
  { tab: 'patrimony', name: 'Patrimônio' },
  { tab: 'returns', name: 'Rentabilidade' },
  { tab: 'positions', name: 'Posições' },
  { tab: 'earnings', name: 'Proventos' },
  { tab: 'entries', name: 'Lançamentos' },
  { tab: 'fixed', name: 'Renda Fixa' },
  { tab: 'rebalance', name: 'Rebalancear' },
  { tab: 'risk', name: 'Risco' },
  { tab: 'montecarlo', name: 'Monte Carlo' },
  { tab: 'data-quality', name: 'Qualidade dos Dados' },
  { tab: 'goals', name: 'Metas' },
  { tab: 'benchmarks', name: 'Benchmarks' },
  { tab: 'tax', name: 'Impostos' },
  { tab: 'corporate-events', name: 'Eventos Corp.' },
  { tab: 'import', name: 'Importar' },
  { tab: 'backup', name: 'Backup' },
  { tab: 'backup-portability', name: 'Backup Port.' },
];

test('Auditoria funcional completa — todas as abas', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text().slice(0, 150)}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message.slice(0, 150)}`));

  // Load + metrics
  const t0 = Date.now();
  await page.goto('http://localhost:8765/');
  await page.waitForLoadState('networkidle');
  const loadMs = Date.now() - t0;

  await page.waitForFunction(() => window.CARTEIRA_DATA && window.CARTEIRA_DATA.kpis && window.CARTEIRA_DATA.kpis.total > 0, { timeout: 15000 });
  await page.waitForTimeout(1200);

  const kpis = await page.evaluate(() => ({
    total: window.CARTEIRA_DATA.kpis.total,
    domKpiTotal: document.getElementById('kpiTotal')?.textContent?.trim(),
    domKpiEarnings: document.getElementById('kpiEarnings12m')?.textContent?.trim(),
    domKpiYield: document.getElementById('kpiYield12m')?.textContent?.trim(),
    labels: window.CARTEIRA_DATA.patrimony.labels.length,
    firstLabel: window.CARTEIRA_DATA.patrimony.labels[0],
    lastLabel: window.CARTEIRA_DATA.patrimony.labels[window.CARTEIRA_DATA.patrimony.labels.length - 1],
  }));

  console.log('=== LOAD ===');
  console.log('tempo_ate_networkidle_ms=' + loadMs);
  console.log('total_js=' + kpis.total);
  console.log('dom_kpi_total=' + kpis.domKpiTotal);
  console.log('dom_kpi_earnings12m=' + kpis.domKpiEarnings);
  console.log('dom_kpi_yield=' + kpis.domKpiYield);
  console.log('serie=' + kpis.labels + '_meses (' + kpis.firstLabel + ' a ' + kpis.lastLabel + ')');

  // Charts visíveis no resumo
  const charts = await page.evaluate(() => {
    const c1 = document.getElementById('patrimonyChart');
    const c2 = document.getElementById('allocationChart');
    return {
      patrimony_has_data: !!(window.Chart && c1 && window.Chart.getChart(c1)?.data?.labels?.length),
      allocation_has_data: !!(window.Chart && c2 && window.Chart.getChart(c2)?.data?.labels?.length),
      insights_count: document.querySelectorAll('#insightsList > *').length,
      class_summary_count: document.querySelectorAll('#classSummaryCards > *').length,
      monthly_rows: document.querySelectorAll('#monthlyBody tr').length,
    };
  });
  console.log('=== RESUMO ===');
  console.log('chart_patrimonio=' + charts.patrimony_has_data);
  console.log('chart_alocacao=' + charts.allocation_has_data);
  console.log('insights=' + charts.insights_count);
  console.log('cards_classe=' + charts.class_summary_count);
  console.log('linhas_performance_mensal=' + charts.monthly_rows);

  // Itera todas as abas
  console.log('=== ABAS ===');
  for (const { tab, name } of TABS) {
    try {
      await page.evaluate((t) => { if (typeof window.__resetRenderedTabs === 'function') window.__resetRenderedTabs(); window.switchTab(t); }, tab);
      await page.waitForTimeout(900);

      const state = await page.evaluate((t) => {
        const panel = document.getElementById('panel-' + t);
        if (!panel) return { exists: false };
        const visible = !panel.hidden && panel.offsetParent !== null;
        const textLen = (panel.innerText || '').trim().length;
        const tbodies = [...panel.querySelectorAll('tbody[id]')];
        const tables = tbodies.map(tb => ({ id: tb.id, rows: tb.querySelectorAll('tr').length, empty: tb.querySelectorAll('tr').length === 0 }));
        const kpiDivs = [...panel.querySelectorAll('[id*="Kpis"], [id*="kpiStrip"], [id*="Strip"]')].map(d => ({ id: d.id, filled: d.children.length > 0 }));
        const emptyMsgs = [...panel.querySelectorAll('.empty-cell, .empty-state, p.text-muted')].length;
        const canvases = [...panel.querySelectorAll('canvas')].map(c => ({ id: c.id, hasChart: !!(window.Chart && window.Chart.getChart(c)) }));
        const buttons = [...panel.querySelectorAll('button')].filter(b => !b.disabled).length;
        return { exists: true, visible, textLen, tables, kpiDivs, emptyMsgs, canvases, buttons };
      }, tab);

      if (!state.exists) {
        console.log(`${tab}|${name}|NAO_EXISTE`);
        continue;
      }
      const tablesStr = state.tables.map(t => `${t.id}=${t.rows}${t.empty ? '(VAZIA)' : ''}`).join(' ');
      const canvasStr = state.canvases.map(c => `${c.id}=${c.hasChart ? 'OK' : 'sem-chart'}`).join(' ');
      console.log(`${tab}|${name}|${state.visible ? 'visivel' : 'OCULTA'}|texto=${state.textLen}ch|${tablesStr}|${canvasStr}|botoes=${state.buttons}`);
    } catch (e) {
      console.log(`${tab}|${name}|ERRO|${e.message.slice(0, 80)}`);
    }
  }

  console.log('=== CONSOLE_ERRORS ===');
  const unique = [...new Set(consoleErrors)];
  console.log('total_erros=' + unique.length);
  unique.slice(0, 15).forEach(e => console.log(e));
});
