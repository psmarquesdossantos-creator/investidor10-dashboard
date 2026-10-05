# FASE 13+14 Implementation Plan — Import Center + Corporate Events + Data Trust + Backup Portability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four cross-cutting centers that elevate the dashboard to a lifetime portfolio management platform: Import Center (multi-source), Corporate Events (automated B3 events), Data Trust (confidence per asset/source), Backup Portability (universal export/import).

**Architecture:** Four independent modules integrated via shared `ImportPipeline`. Each exposes `initX()` API, registers with tab `MutationObserver`. Data flow: **Import → Normalize → Validate → Preview → Dedup → Confirm → Write → Snapshot → Engines**.

**Tech Stack:** Vanilla JS (ES modules), IndexedDB, Chart.js, brapi.dev, B3 API, SheetJS/xlsx (dynamic import), FileReader, Web Workers.

**Spec:** `docs/superpowers/specs/2026-09-27-import-corporate-trust-backup-design.md`

---

## Global Constraints

- **Governança**: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE_AVAILABLE≠DATA_READY
- **Pipeline**: FILE→DETECT→PARSE→NORMALIZE→VALIDATE→PREVIEW→DEDUP→CONFIRM→WRITE — preview obrigatório, `writes=0` antes de confirm
- **Snapshots**: hash SHA-256 diário, retenção 365d, `SnapshotManager` existente
- **A11y**: WCAG 2.1 AA, axe critical=0, touch targets ≥44px, focus-visible, heading hierarchy
- **Performance**: mobile 390×844 sem overflow, animações <300ms transform/opacity, `prefers-reduced-motion`
- **Visual**: **Azul #1A73E8 mantido**, Inter font, dark mode WCAG AA (#F8FAFC/#CBD5E1/#94A3B8/#020617)
- **Testes**: Playwright E2E (desktop 1366×768 + mobile 390×844), a11y todas abas, 82/82 baseline + 9 novos
- **Backup**: `G:\Meu Drive\Codex\investidor10-dashboard\` sincronizado por fase

---

## Review Focus

1. **CSV malformado** (ISO-8859-1, `;`, decimal `,`) → detectar, normalizar, preview com erros destacados
2. **Evento sem data ex** → status `PENDING`, não alterar posição até confirmação
3. **Dados STALE** (>1h preço, >24h posição) → badge `⏳ Desatualizado`, aviso em Monte Carlo/Tax
4. **Backup v1→v2 migration** → automática silenciosa com log, rollback se falhar
5. **Conflito deduplicação** (B3 + CSV mesmo ativo) → B3 vence, CSV preenche gaps, log visível no preview

---

## File Structure (Novos)

```
src/
├── import-center/
│   ├── index.js                 # orchestrador público
│   ├── detectors.js             # detectFormat(file) → {format, parser}
│   ├── parsers/
│   │   ├── b3-position.js
│   │   ├── b3-events.js
│   │   ├── broker-csv.js        # XP, Inter, Rico, Clear
│   │   ├── brapi-enricher.js
│   │   └── generic-csv.js
│   ├── normalizer.js            # → CarteiraDataV2
│   ├── validator.js             # regras + erros estruturados
│   ├── preview-ui.js            # tabela diff, conflitos, gaps
│   ├── deduper.js               # merge inteligente
│   └── writer.js                # apply + snapshot
├── corporate-events/
│   ├── index.js
│   ├── fetcher.js               # B3 API + CSV + manual
│   ├── classifier.js            # string → tipo evento
│   ├── simulator.js             # preview impacto
│   ├── applier.js               # transação atômica
│   └── ui.js                    # painel eventos
├── data-trust/
│   ├── index.js
│   ├── confidence.js            # estende RFConfidence
│   ├── badge-renderer.js        # KPI + tabelas
│   ├── snapshot-audit.js        # verifyIntegrity()
│   └── lineage.js               # DataLineage por campo
└── backup-portability/
    ├── index.js
    ├── exporters/
    │   ├── json-v2.js
    │   ├── csv.js
    │   └── excel.js             # SheetJS dynamic import
    ├── importers/
    │   ├── json-v1.js           # migração v1→v2
    │   └── json-v2.js
    └── version-manager.js       # lista/restore backups
```

---

## Task Decomposition

### Task 1: Import Center — Detectors & Parsers

**Files:**
- Create: `src/import-center/detectors.js`
- Create: `src/import-center/parsers/b3-position.js`
- Create: `src/import-center/parsers/b3-events.js`
- Create: `src/import-center/parsers/broker-csv.js`
- Create: `src/import-center/parsers/brapi-enricher.js`
- Create: `src/import-center/parsers/generic-csv.js`
- Test: `tests/e2e/import-b3-json.spec.js`
- Test: `tests/e2e/import-broker-csv.spec.js`

**Interfaces:**
- Consumes: `File` (drag-drop/upload)
- Produces: `detectFormat(file) → {format: string, parser: string, confidence: number, meta: object}`
- Produces: `parseB3Position(json) → RawPosition[]`, `parseB3Events(csv) → RawEvent[]`, `parseBrokerCSV(csv, broker) → RawPosition[]`, `enrichWithBrapi(tickers) → PriceMap`, `parseGenericCSV(csv, mapping) → RawPosition[]`

- [ ] **Step 1: Write failing test** `tests/e2e/import-b3-json.spec.js`
```javascript
test('import B3 JSON backup → preview → confirm → snapshot created', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Switch to Import tab
  await page.click('.tab-btn[data-tab="import"]');
  await page.waitForTimeout(500);
  
  // Upload fixture
  const fileInput = page.locator('#importFile');
  await fileInput.setInputFiles('tests/fixtures/backup-investidor10-sample.json');
  
  // Wait for preview
  await page.waitForSelector('#importPreviewTable', { timeout: 10000 });
  const previewRows = await page.locator('#importPreviewTable tbody tr').count();
  expect(previewRows).toBeGreaterThan(0);
  
  // Confirm
  await page.click('#btnConfirmImport');
  await page.waitForTimeout(2000);
  
  // Verify DataState FRESH
  const badge = page.locator('#dataStateBadge .state-label');
  await expect(badge).toContainText('Atualizado');
  
  // Verify snapshot created
  const snapshots = await page.evaluate(() => window.Investidor10Advanced?.SnapshotManager?.getAll() || []);
  expect(snapshots.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx playwright test tests/e2e/import-b3-json.spec.js --project=desktop -v
```
Expected: FAIL — `import` tab not found, modules not exist

- [ ] **Step 3: Implement `detectors.js`**
```javascript
// src/import-center/detectors.js
export async function detectFormat(file) {
  const text = await file.text();
  const firstLine = text.split('\n')[0].trim();
  
  // B3 Events CSV
  if (firstLine.includes('Tipo;Data;Ativo') || firstLine.includes('Tipo,Data,Ativo')) {
    return { format: 'b3-events', parser: 'b3-events', confidence: 0.95, meta: { delimiter: firstLine.includes(';') ? ';' : ',' } };
  }
  
  // Broker CSVs (detect by header patterns)
  const brokerPatterns = {
    'xp': /Corretora\s*[,:]\s*XP/i,
    'inter': /Banco\s*Inter/i,
    'rico': /Rico\s*Corretora/i,
    'clear': /Clear\s*Corretora/i
  };
  for (const [broker, pattern] of Object.entries(brokerPatterns)) {
    if (pattern.test(text.slice(0, 500))) {
      return { format: `broker-${broker}`, parser: 'broker-csv', confidence: 0.9, meta: { broker } };
    }
  }
  
  // JSON (Investidor10 backup)
  try {
    const json = JSON.parse(text);
    if (json.payload?.state?.assets) {
      return { format: 'b3-position', parser: 'b3-position', confidence: 1.0, meta: { version: json.version || 1 } };
    }
  } catch {}
  
  // Generic CSV fallback
  return { format: 'generic-csv', parser: 'generic-csv', confidence: 0.5, meta: { delimiter: firstLine.includes(';') ? ';' : ',' } };
}
```

- [ ] **Step 4: Implement `parsers/b3-position.js`**
```javascript
// src/import-center/parsers/b3-position.js
export function parseB3Position(json) {
  const assets = json.payload.state.assets;
  const clsMap = { 'Ação': 'stocks', 'FII': 'fiis', 'ETF': 'etfs', 'Renda Fixa': 'fixed', 'BDR': 'bdr', 'Criptomoeda': 'crypto' };
  const normDate = s => s.includes('-') ? s : s.split('/').reverse().join('-');
  
  return assets
    .filter(a => +a.qty > 0)
    .map(a => {
      const isRF = a.type === 'Renda Fixa';
      const curPrice = isRF ? (+a.fixed_current_value || +a.current_price || 0) : (+a.current_price || 0);
      const avgPrice = isRF ? (+a.rf_applied_value || +a.fixed_initial_value || curPrice) : (+a.avg_price || 0);
      const qty = +a.qty;
      const value = qty * curPrice;
      const invested = qty * avgPrice;
      const ret = invested ? ((value / invested - 1) * 100) : 0;
      
      return {
        ticker: a.ticker || a.name,
        name: a.name || a.ticker,
        class: clsMap[a.type] || 'other',
        type: a.type,
        sector: a.sector || 'Outros',
        qty,
        avgPrice: +avgPrice.toFixed(2),
        currentPrice: +curPrice.toFixed(2),
        value: +value.toFixed(2),
        invested: +invested.toFixed(2),
        ret: +ret.toFixed(2),
        dy: +a.dy || 0,
        source: 'B3',
        raw: a
      };
    });
}
```

- [ ] **Step 5: Implement `parsers/broker-csv.js`** (XP, Inter, Rico, Clear)
```javascript
// src/import-center/parsers/broker-csv.js
const BROKER_MAPPINGS = {
  xp: { ticker: 'Ativo', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Preço Atual', type: 'Tipo' },
  inter: { ticker: 'Código', qty: 'Qtd', avgPrice: 'PM', currentPrice: 'Preço', type: 'Classe' },
  rico: { ticker: 'Ativo', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Último', type: 'Segmento' },
  clear: { ticker: 'Ticker', qty: 'Quantidade', avgPrice: 'Preço Médio', currentPrice: 'Preço Atual', type: 'Tipo' }
};

function parseCSV(text, delimiter = ';') {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

export function parseBrokerCSV(text, broker) {
  const mapping = BROKER_MAPPINGS[broker] || BROKER_MAPPINGS.xp;
  const rows = parseCSV(text, text.includes(';') ? ';' : ',');
  const clsMap = { 'Ação': 'stocks', 'Ações': 'stocks', 'FII': 'fiis', 'Fundos Imobiliários': 'fiis', 'ETF': 'etfs', 'Renda Fixa': 'fixed', 'BDR': 'bdr' };
  
  return rows
    .filter(r => +(r[mapping.qty] || 0) > 0)
    .map(r => {
      const ticker = r[mapping.ticker]?.replace('.SA', '').toUpperCase();
      const qty = +(r[mapping.qty] || 0).replace(',', '.');
      const avgPrice = +(r[mapping.avgPrice] || 0).replace(',', '.');
      const currentPrice = +(r[mapping.currentPrice] || 0).replace(',', '.');
      const type = r[mapping.type] || 'Ação';
      
      return {
        ticker,
        name: ticker,
        class: clsMap[type] || 'other',
        type,
        sector: 'Outros',
        qty,
        avgPrice,
        currentPrice,
        value: +(qty * currentPrice).toFixed(2),
        invested: +(qty * avgPrice).toFixed(2),
        ret: avgPrice ? +(((currentPrice / avgPrice) - 1) * 100).toFixed(2) : 0,
        dy: 0,
        source: `BROKER_${broker.toUpperCase()}`,
        raw: r
      };
    });
}
```

- [ ] **Step 6: Implement `parsers/brapi-enricher.js`**
```javascript
// src/import-center/parsers/brapi-enricher.js
export async function enrichWithBrapi(tickers) {
  if (!tickers.length) return {};
  const unique = [...new Set(tickers.map(t => t.replace('F', '').replace('.SA', '')))];
  const chunks = [];
  for (let i = 0; i < unique.length; i += 50) {
    chunks.push(unique.slice(i, i + 50));
  }
  
  const prices = {};
  for (const chunk of chunks) {
    try {
      const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(',')}?currency=BRL`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const q of data.results || []) {
        if (q.regularMarketPrice) {
          const sym = q.symbol.replace('.SA', '').replace('F', '');
          prices[sym] = q.regularMarketPrice;
        }
      }
    } catch (e) {
      console.warn('brapi.dev enrich failed:', e);
    }
  }
  return prices;
}
```

- [ ] **Step 7: Run tests to verify pass**
```bash
npx playwright test tests/e2e/import-b3-json.spec.js tests/e2e/import-broker-csv.spec.js --project=desktop -v
```
Expected: PASS

- [ ] **Step 8: Commit**
```bash
git add src/import-center/detectors.js src/import-center/parsers/*.js tests/e2e/import-*.spec.js
git commit -m "feat(import-center): detectors + parsers (B3 JSON, B3 Events, XP/Inter/Rico/Clear CSV, brapi.dev enricher)"
```

---

### Task 2: Import Center — Normalizer, Validator, Preview, Deduper, Writer

**Files:**
- Create: `src/import-center/normalizer.js`
- Create: `src/import-center/validator.js`
- Create: `src/import-center/preview-ui.js`
- Create: `src/import-center/deduper.js`
- Create: `src/import-center/writer.js`
- Create: `src/import-center/index.js` (orchestrador)
- Modify: `index.html` (add Import tab in Configurações group)
- Modify: `styles.css` (pipeline steps, preview diff table)
- Test: `tests/e2e/import-b3-json.spec.js` (complete flow)

**Interfaces:**
- Consumes: `RawPosition[]`, `RawEvent[]` from parsers
- Produces: `normalized: CarteiraDataV2`, `validation: {valid: boolean, errors: ValidationError[]}`, `preview: PreviewData`, `deduped: CarteiraDataV2`, `writeResult: {saved: boolean, snapshotId: string}`

- [ ] **Step 1: Write failing test** (preview UI renders diff table)
```javascript
test('import preview shows diff table with conflicts and gaps', async ({ page }) => {
  // ... setup import tab ...
  await page.locator('#importFile').setInputFiles('tests/fixtures/backup-with-conflicts.json');
  await page.waitForSelector('#importPreviewTable');
  
  // Check conflict rows (red)
  const conflicts = await page.locator('#importPreviewTable tbody tr.conflict').count();
  expect(conflicts).toBeGreaterThan(0);
  
  // Check gap rows (yellow)
  const gaps = await page.locator('#importPreviewTable tbody tr.gap').count();
  expect(gaps).toBeGreaterThan(0);
  
  // Check B3 wins badge
  const b3Wins = await page.locator('#importPreviewTable .badge-source-b3').count();
  expect(b3Wins).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `normalizer.js`** → builds `CarteiraDataV2` from raw positions/events/entries
- [ ] **Step 4: Implement `validator.js`** — rules: qty>0, price>0, valid date, ticker regex `^[A-Z]{4}\d{1,2}$`
- [ ] **Step 5: Implement `preview-ui.js`** — table with columns: Ticker, Atual (qty/preço/valor), Novo (qty/preço/valor), Diff, Fonte, Status (conflict/gap/ok)
- [ ] **Step 6: Implement `deduper.js`** — rule: B3 > BROKER_CSV > MANUAL; merge by ticker, keep B3 qty/price, fill missing from broker
- [ ] **Step 7: Implement `writer.js`** — applies to `MOCK_DATA` + `CARTEIRA_DATA`, calls `SnapshotManager.capture('import')`, updates DataState to FRESH
- [ ] **Step 8: Implement `index.js`** — orchestrates pipeline steps, exposes `initImportCenter()`, `runImportPipeline(file)`
- [ ] **Step 9: Modify `index.html`** — add "Importar" tab in Configurações group, dropzone UI, pipeline stepper, preview table
- [ ] **Step 10: Modify `styles.css`** — `.pipeline-stepper`, `.preview-diff-table`, `.conflict`, `.gap`, `.badge-source-b3`, `.badge-source-broker`
- [ ] **Step 11: Run tests to verify pass**
- [ ] **Step 12: Commit**

---

### Task 3: Corporate Events Center — Core Engine

**Files:**
- Create: `src/corporate-events/index.js`
- Create: `src/corporate-events/fetcher.js`
- Create: `src/corporate-events/classifier.js`
- Create: `src/corporate-events/simulator.js`
- Create: `src/corporate-events/applier.js`
- Create: `src/corporate-events/ui.js`
- Modify: `index.html` (add Eventos sub-tab in Análise group)
- Modify: `styles.css` (event cards, pending/confirmed badges)
- Test: `tests/e2e/corporate-events-split.spec.js`
- Test: `tests/e2e/corporate-events-bonus.spec.js`

**Interfaces:**
- Consumes: `CARTEIRA_DATA.positions`, `CARTEIRA_META` (optional), B3 events CSV/API
- Produces: `events: CorporateEvent[]`, `simulate(event) → {before: Position, after: Position, pnl: number}`, `apply(event) → {success: boolean, log: string}`

- [ ] **Step 1: Write failing test** (split PETR4 1:2)
```javascript
test('corporate event split 1:2 → qty doubles, avgPrice halves, entry created', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Switch to Eventos tab (Análise group)
  await page.click('.tab-btn[data-tab="events"]');
  await page.waitForTimeout(500);
  
  // Add manual event
  await page.click('#btnAddEvent');
  await page.selectOption('#eventType', 'split');
  await page.fill('#eventTicker', 'PETR4');
  await page.fill('#eventRatio', '2');
  await page.fill('#eventDate', '2026-09-20');
  await page.click('#btnPreviewEvent');
  
  // Verify preview: qty 1200→2400, avgPrice 38.45→19.22
  const previewQty = await page.locator('#eventPreviewQty').textContent();
  const previewPrice = await page.locator('#eventPreviewAvgPrice').textContent();
  expect(previewQty).toContain('2400');
  expect(previewPrice).toContain('19,22');
  
  // Confirm
  await page.click('#btnConfirmEvent');
  await page.waitForTimeout(1000);
  
  // Verify position updated
  await page.click('.tab-btn[data-tab="positions"]');
  await page.waitForTimeout(500);
  const petr4Row = page.locator('#positionsTable tbody tr:has-text("PETR4")');
  await expect(petr4Row.locator('td:nth-child(3)')).toContainText('2.400');
  await expect(petr4Row.locator('td:nth-child(4)')).toContainText('19,22');
  
  // Verify entry created
  await page.click('.tab-btn[data-tab="entries"]');
  await page.waitForTimeout(500);
  const splitEntry = page.locator('#entriesTable tbody tr:has-text("split")');
  await expect(splitEntry).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `classifier.js`** — maps B3 strings ("DESDOBRAMENTO", "BONIFICAÇÃO", "GRUPAMENTO", "SUBSCRIÇÃO", "AMORTIZAÇÃO") → enum types
- [ ] **Step 4: Implement `simulator.js`** — pure function: given position + event → returns new position + P&L impact
- [ ] **Step 5: Implement `applier.js`** — atomic: updates `positions`, pushes to `entries`, appends to `corporateEvents` log, calls `writer` pattern
- [ ] **Step 6: Implement `fetcher.js`** — B3 API (public), CSV upload, manual form
- [ ] **Step 7: Implement `ui.js`** — event list (pending/confirmed/history), card with preview, confirm/reject/edit buttons
- [ ] **Step 8: Implement `index.js`** — orchestrator, exposes `initCorporateEvents()`
- [ ] **Step 9: Modify `index.html`** — "Eventos" tab in Análise group, modal form, preview panel
- [ ] **Step 10: Modify `styles.css`** — `.event-card`, `.event-badge-pending`, `.event-badge-confirmed`, `.event-preview`
- [ ] **Step 11: Run tests to verify pass**
- [ ] **Step 12: Commit**

---

### Task 4: Data Trust Center — Confidence + Badges + Snapshot Audit

**Files:**
- Create: `src/data-trust/index.js`
- Create: `src/data-trust/confidence.js` (estende RFConfidence)
- Create: `src/data-trust/badge-renderer.js`
- Create: `src/data-trust/snapshot-audit.js`
- Create: `src/data-trust/lineage.js`
- Modify: `real-mode.js` (chama `initDataTrust()` in `initAdvancedFeatures()`)
- Modify: `styles.css` (confidence badges, legend)
- Test: `tests/e2e/data-trust-badges.spec.js`
- Test: `tests/e2e/data-trust-snapshot-audit.spec.js`

**Interfaces:**
- Consumes: `CARTEIRA_DATA`, `MOCK_DATA`, `SnapshotManager`, `RFConfidence`
- Produces: `getConfidence(asset, field) → ConfidenceLevel`, `renderBadge(level, element) → void`, `verifyIntegrity() → {status: 'OK'|'CORRUPTED'|'MISSING_DAYS', details: []}`

- [ ] **Step 1: Write failing test** (badges render on KPIs and tables)
```javascript
test('data trust badges render on KPIs and position table', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check KPI badges
  const kpiBadges = await page.locator('.kpi-card .data-state-badge').count();
  expect(kpiBadges).toBe(6); // 6 KPI cards
  
  // Check position table badges
  await page.click('.tab-btn[data-tab="positions"]');
  await page.waitForTimeout(500);
  const tableBadges = await page.locator('#positionsTable tbody tr .confidence-badge').count();
  expect(tableBadges).toBeGreaterThan(0);
  
  // Check legend exists
  const legend = await page.locator('.confidence-legend').count();
  expect(legend).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `confidence.js`** — extends `RFConfidence.classify()` to all asset classes, adds source-based rules (B3=SUPPORTED, BROKER_CSV=SHADOW, MANUAL=MANUAL, STALE>1h=STALE)
- [ ] **Step 4: Implement `badge-renderer.js`** — injects badges in KPI labels (reuses `DataStates.renderBadge`) and table first cells
- [ ] **Step 5: Implement `snapshot-audit.js`** — `verifyIntegrity()` iterates snapshots, recomputes hash, checks gaps >1 day
- [ ] **Step 6: Implement `lineage.js`** — `DataLineage` tracks field→source→timestamp for each asset
- [ ] **Step 7: Implement `index.js`** — orchestrator, exposes `initDataTrust()`
- [ ] **Step 8: Modify `real-mode.js`** — call `initDataTrust()` in `initAdvancedFeatures()`
- [ ] **Step 9: Modify `styles.css`** — `.confidence-badge`, `.confidence-legend`, badge colors per level
- [ ] **Step 10: Run tests to verify pass**
- [ ] **Step 11: Commit**

---

### Task 5: Backup Portability — Export/Import + Migration

**Files:**
- Create: `src/backup-portability/index.js`
- Create: `src/backup-portability/exporters/json-v2.js`
- Create: `src/backup-portability/exporters/csv.js`
- Create: `src/backup-portability/exporters/excel.js`
- Create: `src/backup-portability/importers/json-v1.js`
- Create: `src/backup-portability/importers/json-v2.js`
- Create: `src/backup-portability/version-manager.js`
- Modify: `index.html` (Backup sub-tab in Configurações)
- Modify: `styles.css` (backup version list, export buttons)
- Test: `tests/e2e/backup-export-json.spec.js`
- Test: `tests/e2e/backup-export-excel.spec.js`
- Test: `tests/e2e/backup-migration-v1.spec.js`

**Interfaces:**
- Consumes: `CARTEIRA_DATA`, `MOCK_DATA`
- Produces: `exportJSON() → Blob`, `exportCSV() → Blob[]`, `exportExcel() → Blob`, `importJSON(blob) → CarteiraDataV2`, `listBackups() → BackupMeta[]`, `restore(backupId) → boolean`

- [ ] **Step 1: Write failing test** (export JSON → import → identical hash)
```javascript
test('export JSON v2 → import → identical hash', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Switch to Backup tab
  await page.click('.tab-btn[data-tab="backup"]');
  await page.waitForTimeout(500);
  
  // Export JSON
  const downloadPromise = page.waitForEvent('download');
  await page.click('#btnExportJSON');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/carteira-backup-\d{4}-\d{2}-\d{2}\.json/);
  
  // Read downloaded file
  const fs = require('fs');
  const content = fs.readFileSync(await download.path(), 'utf-8');
  const data = JSON.parse(content);
  expect(data.version).toBe(2);
  expect(data.meta.hash).toBeDefined();
  
  // Import same file
  await page.locator('#importFile').setInputFiles(await download.path());
  await page.waitForSelector('#importPreviewTable');
  await page.click('#btnConfirmImport');
  await page.waitForTimeout(2000);
  
  // Verify DataState FRESH
  const badge = page.locator('#dataStateBadge .state-label');
  await expect(badge).toContainText('Atualizado');
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `exporters/json-v2.js`** — builds `CarteiraDataV2` with `meta: {importedAt, sources, hash: SHA256}`
- [ ] **Step 4: Implement `exporters/csv.js`** — 4 files: positions, earnings, entries, events (semicolon delimiter, BRL format)
- [ ] **Step 5: Implement `exporters/excel.js`** — dynamic `import('xlsx')`, workbook with 5 sheets (4 data + Metadata)
- [ ] **Step 6: Implement `importers/json-v1.js`** — `migrateV1toV2(v1data)` adds `corporateEvents: []`, `dataLineage: []`, recalculates hash
- [ ] **Step 7: Implement `importers/json-v2.js`** — validates schema, applies via ImportCenter.writer
- [ ] **Step 8: Implement `version-manager.js`** — IndexedDB store `backups` (id, filename, hash, size, date, version), list/restore/delete
- [ ] **Step 9: Implement `index.js`** — orchestrator, exposes `initBackupPortability()`
- [ ] **Step 10: Modify `index.html`** — "Backup" tab in Configurações, export buttons, version list table, restore flow
- [ ] **Step 11: Modify `styles.css`** — `.backup-version-table`, `.export-buttons`, `.restore-modal`
- [ ] **Step 12: Run tests to verify pass**
- [ ] **Step 13: Commit**

---

### Task 6: Integration — UI Registration, Tab Wiring, real-mode.js

**Files:**
- Modify: `script.js` (register 4 centers in MutationObserver)
- Modify: `real-mode.js` (call all 4 `initX()` in `initAdvancedFeatures()`)
- Modify: `advanced-engine.js` (export new classes for external access)
- Test: `tests/e2e/integration-full-flow.spec.js` (smoke test all centers)

**Interfaces:**
- Consumes: all 4 center `initX()` functions
- Produces: fully wired dashboard with 4 new tabs functional

- [ ] **Step 1: Write failing integration test**
```javascript
test('full flow: import → event → trust badges → backup export/import', async ({ page }) => {
  // Import B3 JSON
  // Add split event
  // Verify trust badges update
  // Export backup → import → verify identical
  // All assertions pass
});
```

- [ ] **Step 2: Modify `script.js`** — add cases for `panel-import`, `panel-events`, `panel-backup` in MutationObserver
- [ ] **Step 3: Modify `real-mode.js`** — import and call `initImportCenter()`, `initCorporateEvents()`, `initDataTrust()`, `initBackupPortability()` in `initAdvancedFeatures()`
- [ ] **Step 4: Modify `advanced-engine.js`** — export `ImportCenter`, `CorporateEvents`, `DataTrust`, `BackupPortability`
- [ ] **Step 5: Run integration test to verify pass**
- [ ] **Step 6: Run full test suite (82+9) to verify no regressions**
```bash
npx playwright test --project=desktop --project=mobile --reporter=line
```
Expected: 91/91 passing

- [ ] **Step 7: Commit**

---

### Task 7: Documentation & Sync

**Files:**
- Modify: `README.md` (document new features)
- Modify: `CHANGELOG.md` (add v2.0.0 entry)
- Sync: `G:\Meu Drive\Codex\investidor10-dashboard\`

- [ ] **Step 1: Update README.md** with Import Center, Corporate Events, Data Trust, Backup sections
- [ ] **Step 2: Write CHANGELOG.md** entry for v2.0.0
- [ ] **Step 3: Sync backup**
```bash
mkdir -p "/g/Meu Drive/Codex/investidor10-dashboard/src" "/g/Meu Drive/Codex/investidor10-dashboard/tests/e2e"
cp -r src/* "/g/Meu Drive/Codex/investidor10-dashboard/src/"
cp tests/e2e/*.spec.js "/g/Meu Drive/Codex/investidor10-dashboard/tests/e2e/"
cp index.html styles.css script.js real-mode.js advanced-engine.js "/g/Meu Drive/Codex/investidor10-dashboard/"
```
- [ ] **Step 4: Commit**

---

## Execution Recommendation

**Recommendation: Subagent-driven** — 7 tasks with clear interfaces, moderate coupling (Task 1→2→3→4→5→6), each independently testable. A fresh reviewer per task catches interface mismatches early. Cost is acceptable for this scope.

---

**Plan saved to:** `docs/superpowers/plans/2026-09-27-import-corporate-trust-backup-plan.md`

Please review the plan. Does it capture what you want? Which execution approach should we use?