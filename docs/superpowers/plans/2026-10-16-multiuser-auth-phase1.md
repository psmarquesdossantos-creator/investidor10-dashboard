# Multiuser Auth + Realtime Sync + Demo (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 — auth gate (Google+email), authorization allowlist (UID-keyed, rules-enforced), REAL/DEMO/BLOCKED modes, interactive local-only demo with synthetic fixture, Firestore rules + emulator attack-matrix tests, migration plan docs. Zero hosted financial writes, zero push, zero deploy.

**Architecture:** `auth-gate.js` decide INACTIVE (sem config/CI — comportamento atual intacto) → LOGIN → resolve modo via `get(authorization/users/{uid})` → DEMO (LocalDemoDataSource, localStorage) ou REAL (FirestoreRealDataSource, sections realtime; código pronto, sem produção). Rules re-computam autorização server-side (fail-closed).

**Tech Stack:** Vanilla JS (classic scripts, IIFE), Firebase compat UMD vendorado, Firestore rules, @firebase/rules-unit-testing, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-multiuser-auth-realtime-sync-design.md`

## Global Constraints

- HOSTED_FINANCIAL_WRITES=0 · PRODUCTION_MIGRATION=0 · PUSH=0 · DEPLOY=0 (commits locais apenas)
- Sem `firebase-config.js` → gate INACTIVE → suíte Playwright atual deve permanecer 100% verde
- CSP: `script-src 'self'` (SDK vendorado); `connect-src` += `https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com`
- Demo: 100% sintético, NUNCA derivado de carteira-data.js/sample; storage `investidor10-demo` separado
- Fail-closed: erro de authz → nunca REAL
- ZERO_COST_OPERATION=true (Spark free; sem serviços pagos)
- Conventional Commits; staging seletivo; dados reais nunca commitados

## Review Focus

- **Leakage demo→real**: demo fixture/load nunca lê `CARTEIRA_DATA` real → teste: badge demo + total sintético ≠ dataset real (Task 2/7)
- **CI/regressão**: gate sem config não altera boot → teste: suíte desktop completa verde após Task 4 (Task 7)
- **Rules fail-closed**: allowlist get() inexistente/erro nega → teste rules #1/#5/#8 (Task 6)
- **Overlay sem vazamento de KPI**: overlay opaco cobre app → teste: forçar `demo` sem fixture behind overlay e checar que `#kpiTotal` não está visível quando overlay aberto (Task 7)
- **SyncHub no-op sem REAL**: hooks não escrevem nada sem fonte ativa → teste: `markDirty` após import sem Firebase não lança e não toca rede (Task 5)

---

### Task 1: Firebase config sample + vendor SDK + CSP

**Files:**
- Create: `firebase.config.sample.js`, `vendor/firebase/firebase-app-compat.js`, `vendor/firebase/firebase-auth-compat.js`, `vendor/firebase/firebase-firestore-compat.js`
- Modify: `.gitignore`, `serve.py` (connect-src), index.html (nada ainda)

**Interfaces:**
- Produces: `window.FIREBASE_CONFIG` (objeto, quando `firebase-config.js` real existir); globals `firebase` (compat) carregados só via lazy-load futuro

- [ ] **Step 1:** `npm pack firebase@10` (ou `npm i --no-save firebase@10`), copiar `package/dist/firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-firestore-compat.js` → `vendor/firebase/`; remover node_modules extra
- [ ] **Step 2:** Criar `firebase.config.sample.js`: `window.FIREBASE_CONFIG = { apiKey: 'PREENCHER', authDomain: 'PREENCHER.firebaseapp.com', projectId: 'PREENCHER', storageBucket: 'PREENCHER.appspot.com', messagingSenderId: '0', appId: 'PREENCHER' };`
- [ ] **Step 3:** `.gitignore` += `firebase-config.js`, `firebase-debug.log`, `firebase-debug.*.log`, `*.log`
- [ ] **Step 4:** `serve.py` connect-src += `https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com`; mesmo para `C:\Users\Paulinho\AppData\Local\Temp\opencode\static-server-csp.js`
- [ ] **Step 5:** `node --check vendor/firebase/firebase-app-compat.js` (se falhar por minificado, aceitar; checar tamanho > 100KB)
- [ ] **Step 6:** Commit `chore(auth): firebase vendor sdk + config sample + csp connect-src`

### Task 2: Demo fixture sintético

**Files:**
- Create: `src/auth/demo-fixture.js`
- Test: `tests/e2e/auth-gate.spec.js` (primeiro teste; Task 7 completa o arquivo)

**Interfaces:**
- Produces: `window.DEMO_FIXTURE` — objeto shape CARTEIRA_DATA completo: `{ meta:{source:'demo'}, kpis:{total:123456.78, ...}, patrimony:12 labels, monthly, allocation:{byClass,byAsset}, positions:[12 assets fictícios], earnings:[6], entries:[6], assetReturns, fixedIncome:[2], goals }`
- Regras: tickers fictícios (`ALFA11`, `BETA4`, ...), nomes "AlfaCorp"/"BetaSA", total **123456.78** (nunca valores do dataset real), classes ≥4

- [ ] **Step 1:** Escrever teste em `tests/e2e/auth-gate.spec.js`: `test('demo fixture é sintético', ...)` — via `page.goto`, `addInitScript` `__AUTH_GATE_FORCE__='demo'`, espera `#demoBadge` visível, evaluate `MOCK_DATA.kpis.total === 123456.78` e `JSON.stringify(MOCK_DATA).não contém marcadores do dataset real`
- [ ] **Step 2:** Rodar → FAIL (fixture/gate inexistentes)
- [ ] **Step 3:** Implementar `src/auth/demo-fixture.js` (IIFE, `window.DEMO_FIXTURE = {...}`)
- [ ] **Step 4:** (gate ainda não existe — teste seguirá FAIL até Task 4; apenas `node --check`)
- [ ] **Step 5:** Commit `feat(demo): fixture sintética determinística`

### Task 3: PortfolioDataSource + LocalDemoDataSource

**Files:**
- Create: `src/auth/sync/data-source.js`, `src/auth/sync/local-demo-source.js`

**Interfaces:**
- `PortfolioDataSource`: `start():Promise<void>`, `getPortfolio():object|null`, `saveSection(name:string, data:any):void`, `onUpdate(cb:(portfolio:object)=>void):void`, `stop():void`
- `LocalDemoDataSource implements PortfolioDataSource`: `constructor(storageKey='investidor10-demo')`; `reset():void` restaura fixture; persistência serializa `{portfolio, updatedAt}` no localStorage

- [ ] **Step 1:** `node --check` após implementar (sem runner unitário no projeto — comportamento coberto por E2E Task 7)
- [ ] **Step 2:** Implementar interface (JSDoc) + `LocalDemoDataSource`: `start()` = carrega storage ou clona `DEMO_FIXTURE`; `saveSection` merge seção e persiste; `reset()` remove chave e recarrega fixture
- [ ] **Step 3:** Commit `feat(demo): LocalDemoDataSource com reset e persistência local`

### Task 4: auth-gate.js + overlay UI + boot wiring

**Files:**
- Create: `src/auth/auth-gate.js`
- Modify: `index.html` (overlay #authGate, #authLoading, #demoBadge, #btnDemoReset; `<script src="src/auth/auth-gate.js">` antes de carteira-data.js; `src/auth/demo-fixture.js` + `src/auth/sync/*.js` após), `styles.css` (estados), `real-mode.js` (aguardar `window.__AUTH_RESOLVED__` antes de `waitForCarteiraData`)

**Interfaces:**
- `window.AuthGate = { mode, start():Promise<string>, signOut():Promise<void> }`
- `window.__AUTH_RESOLVED__: Promise<string>` — modos: `'INACTIVE'|'LOGIN'|'DEMO'|'REAL'|'BLOCKED'`
- `window.__AUTH_GATE_FORCE__` (init script de teste): `true`→LOGIN overlay; `'demo'`→DEMO; `'blocked'`→BLOCKED
- Lógica: force > config ausente→INACTIVE; localhost bypass→INACTIVE (a menos que force); com config→Firebase compat lazy (injetar 3 `<script>` vendor + espera `window.firebase`)
- Resolução REAL exige: user + `emailVerified` + `get('authorization/users/'+uid).data.enabled && !blocked`; doc ausente/erro→DEMO (fail-closed); blocked→BLOCKED
- `start()` resolve e só então remove `#authLoading`; REAL/DEMO escondem overlay e disparam `document.dispatchEvent(new CustomEvent('authz:ready',{detail:{mode}}))`
- Logging: `console.info('[authz]', de, '→', para, mode)` — nunca valores

- [ ] **Step 1:** E2E: teste `overlay de login renderiza com gate forçado` (force=true → `#authGate` visível, `#kpiTotal` não visível) + `modo demo força fixture e badge` (force='demo' → badge visível, `#authGate` oculto) + `modo blocked mostra tela dedicada` — rodar → FAIL
- [ ] **Step 2:** Implementar overlay markup/HTML + CSS + `auth-gate.js` (force paths primeiro; Firebase path com lazy compat)
- [ ] **Step 3:** Wire: script tag order, `real-mode.js` await `__AUTH_RESOLVED__`
- [ ] **Step 4:** Rodar 3 testes → PASS; rodar suíte desktop COMPLETA → verde (regressão CI)
- [ ] **Step 5:** Commit `feat(auth): auth-gate com modos INACTIVE/LOGIN/DEMO/BLOCKED + overlay`

### Task 5: FirestoreRealDataSource + SyncHub + hooks

**Files:**
- Create: `src/auth/sync/firestore-real-source.js`
- Modify: `src/import-center/writer.js` (+1 hook), `real-mode.js` `processBackupFile` (+1), `script.js` `saveToStorage` (+1)

**Interfaces:**
- `FirestoreRealDataSource implements PortfolioDataSource`: `constructor(user)` (FirebaseAuth user); listeners `onSnapshot` em `users/{uid}/portfolio/sections/{section}`; `saveSection` = `setDoc(..., {merge:true})` com `{data, updatedAt:Date.now()}`; `SECTIONS = ['kpis','monthly','patrimony','allocation','positions','earnings','entries','assetReturns','fixedIncome','goals']`
- `window.SyncHub = { markDirty(section:string):void, active:boolean }` — debounce 2s → batch writes das seções sujas; no-op com `active=false`
- REAL ativa SyncHub; hooks chamam `window.SyncHub?.markDirty('<seção>')`

- [ ] **Step 1:** E2E (force='real-nofirebase' path não existe — usar teste de invariante): após import em modo INACTIVE, `SyncHub.active===false` e `markDirty` não lança → FAIL
- [ ] **Step 2:** Implementar classe (fail-closed: qualquer erro→`onUpdate` não chamado, console.warn `[authz] sync error`), SyncHub, hooks
- [ ] **Step 3:** Passar teste; `node --check` nos 3 modificados
- [ ] **Step 4:** Commit `feat(sync): FirestoreRealDataSource + SyncHub no-op por padrão`

### Task 6: firestore.rules + emulator attack matrix

**Files:**
- Create: `firestore.rules`, `firebase.json`, `tests/rules/rules.test.js`
- Modify: `package.json` (+devDeps `firebase`, `@firebase/rules-unit-testing`; script `test:rules`)

**Interfaces:**
- Rules: §5 da spec (allowlist get(), write deny para clients em authorization)
- Teste: 9 casos P14 com `initializeTestEnvironment` (rules lidas de `firestore.rules`)

- [ ] **Step 1:** `npm i -D firebase @firebase/rules-unit-testing`; escrever `firebase.json` (emulator firestore porta 8080)
- [ ] **Step 2:** Escrever `tests/rules/rules.test.js` com os 9 casos (asserts `assertSucceeds`/`assertDenied`)
- [ ] **Step 3:** `npm run test:rules` — se Java 8 bloquear emulator: capturar erro, documentar no relatório (REMAINING_BLOCKERS), manter teste commitado p/ CI
- [ ] **Step 4:** Commit `feat(security): firestore rules + matriz de ataque P14 (emulator)`

### Task 7: E2E auth-gate completo + demo reset

**Files:**
- Modify: `tests/e2e/auth-gate.spec.js` (completar)

**Interfaces:** usa Task 2–4

- [ ] **Step 1:** Adicionar: `validação de login` (force=true, submit vazio → erro inline), `demo permite reset` (force='demo', mutar MOCK_DATA.entries via evaluate + save, chamar `LocalDemoDataSource.reset()` → total volta a 123456.78), `demo badge tem texto exigido` (P9 copy exata)
- [ ] **Step 2:** Rodar spec → PASS; rodar mobile → PASS
- [ ] **Step 3:** Commit `test(auth): e2e gate, demo reset, validação`

### Task 8: Migration plan + dry-run (NÃO executar migração)

**Files:**
- Create: `docs/ai/FIREBASE_MIGRATION_PLAN.md`, `scripts/migration-dry-run.js`, `docs/ai/FIREBASE_SETUP.md`

- [ ] **Step 1:** Dry-run: script lê `DEMO_FIXTURE` (sintético), computa counts+sha256 por seção, simula upsert, re-run idempotente, imprime OK/FAIL; `node scripts/migration-dry-run.js` → OK
- [ ] **Step 2:** FIREBASE_MIGRATION_PLAN.md: passos P17/P18 (backup→hash→dry-run→Admin SDK→readback→rollback), Package1A/Package2 mapping, "NÃO executar na Fase 1"
- [ ] **Step 3:** FIREBASE_SETUP.md: runbook fases 2+ (criar projeto, Auth Google+senha, regras deploy, allowlist via console, config local, verificação email, checklist manual 2 dispositivos)
- [ ] **Step 4:** Commit `docs(migration): plano fase 2+ + dry-run sintético`

### Task 9: Regressão total + memória + relatório Phase 1

- [ ] **Step 1:** Servidor CSP local + `npx playwright test` completo → 0 failed
- [ ] **Step 2:** `node --check` em todos JS novos; htmlhint
- [ ] **Step 3:** Atualizar `docs/ai/PROJECT_STATE.md`, `NEXT_STEP.md`, `PROJECT_MEMORY.md`
- [ ] **Step 4:** Commit `docs: phase 1 auth architecture complete (hosted writes=0, push=0)`
- [ ] **Step 5:** Relatório final no formato do usuário (P34/FINAL PHASE-1 REPORT)
