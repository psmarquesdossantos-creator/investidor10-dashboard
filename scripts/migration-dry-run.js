// scripts/migration-dry-run.js
// P33 — MIGRATION DRY RUN (sintético; NUNCA toca dados hospedados nem o arquivo real).
// Valida o algoritmo de migração Package1A (carteira-data.js shape) →
// users/{uid}/portfolio/{section} (UID-scoped shape) SEM escrever em lugar nenhum:
//   1. mapeia seções, computa counts + sha256 por seção (pré-migração)
//   2. simula upsert em store temporário (arquivo em %TEMP%)
//   3. readback: counts + hashes idênticos
//   4. idempotência: segunda execução produz store idempêntico (byte a byte)
// Package2 (backup JSON payload.state) é validado em shape apenas (contagens).
// Runner: node scripts/migration-dry-run.js
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SECTIONS = ['kpis', 'monthly', 'patrimony', 'allocation', 'positions', 'earnings', 'entries', 'assetReturns', 'fixedIncome', 'goals'];
const TMP_DIR = join(process.env.TEMP || process.env.TEMPDIR || '/tmp', 'opencode', 'migration-dry-run');
const STORE = join(TMP_DIR, 'uid-store.json');

// Carrega fixture sintética (janela global, como no browser)
globalThis.window = globalThis;
await import('../src/auth/demo-fixture.js'); //Define window.DEMO_FIXTURE — Package1A sintético
const PKG1A = globalThis.DEMO_FIXTURE;      // stand-in 100% sintético do dataset real

if (!PKG1A || !PKG1A.kpis) { console.error('FATAL: fixture sintética não carregou'); process.exit(1); }

const sha = (s) => createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 16);
const fingerprint = (obj) => {
  const out = {};
  SECTIONS.forEach(s => {
    const v = obj[s];
    out[s] = v == null ? null : { count: Array.isArray(v) ? v.length : Object.keys(v).length, hash: sha(v) };
  });
  return out;
};

// ---- 1. fingerprint pré-migração (fonte) ----
const before = fingerprint(PKG1A);

// ---- 2. simula upsert UID-scoped ----
function migrate(source, storePath) {
  let store = { meta: { uid: 'SYNTHETIC_UID', migratedAt: null } };
  if (existsSync(storePath)) store = JSON.parse(readFileSync(storePath, 'utf8'));
  SECTIONS.forEach(s => {
    if (source[s] !== undefined) store[s] = source[s]; // upsert por seção (idempotente)
  });
  store.meta.migratedAt = new Date().toISOString();
  writeFileSync(storePath, JSON.stringify(store));
  return store;
}

mkdirSync(TMP_DIR, { recursive: true });
rmSync(STORE, { force: true });

const store1 = migrate(PKG1A, STORE);
const after1 = fingerprint(store1);

// ---- 3. readback ----
let readbackOK = true;
const diffs = [];
SECTIONS.forEach(s => {
  const b = before[s], a = after1[s];
  if (b === null && a === null) return; // seção ausente na fonte = ausente no store (correto)
  if (!b || !a || b.count !== a.count || b.hash !== a.hash) {
    readbackOK = false;
    diffs.push(`${s}: fonte(${b && b.count}/${b && b.hash}) ≠ store(${a && a.count}/${a && a.hash})`);
  }
});

// ---- 4. idempotência (re-run não altera conteúdo, só timestamp) ----
const firstContent = JSON.stringify({ ...store1, meta: { ...store1.meta, migratedAt: null } });
const store2 = migrate(PKG1A, STORE);
const secondContent = JSON.stringify({ ...store2, meta: { ...store2.meta, migratedAt: null } });
const idempotent = firstContent === secondContent;

// ---- 5. Package2: shape backup JSON (payload.state) ----
let pkg2 = { ok: false, detail: 'fixture ausente' };
try {
  const backup = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'backup-investidor10-sample.json'), 'utf8'));
  const assets = backup?.payload?.state?.assets;
  pkg2 = { ok: Array.isArray(assets), detail: Array.isArray(assets) ? `${assets.length} assets no shape payload.state.assets` : 'shape inesperado' };
} catch (e) {
  pkg2 = { ok: false, detail: 'fixture Package2 não encontrada: ' + (e && e.message) };
}

// ---- relatório ----
console.log('=== MIGRATION DRY RUN (P33) — sintético, zero escrita hospedada ===');
console.log('Package1A (fixture sintética) → users/{uid}/portfolio/{section}');
console.log('  seções:', SECTIONS.join(', '));
console.log('  readback counts+hash:', readbackOK ? 'OK' : 'FAIL');
if (diffs.length) diffs.forEach(d => console.log('    DIFF', d));
console.log('  idempotência (2ª execução):', idempotent ? 'OK — store idêntico' : 'FAIL');
console.log('Package2 (backup payload.state):', pkg2.ok ? 'OK — ' + pkg2.detail : 'FAIL — ' + pkg2.detail);

const ok = readbackOK && idempotent && pkg2.ok;
console.log('RESULT:', ok ? 'DRY RUN OK (algoritmo pronto p/ Fase 3 com dados reais)' : 'DRY RUN FAIL');
if (!ok) process.exit(1);
rmSync(STORE, { force: true });
