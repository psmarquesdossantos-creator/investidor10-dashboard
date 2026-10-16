# PROJECT MEMORY — Investidor10 Dashboard

**Memória persistente entre sessões, agentes, computadores, chats.**

---

## IDENTITY

```
PROJECT=investidor10-dashboard
PURPOSE=Dashboard de carteira de investimentos estilo Investidor10 com dados reais, engines avançados (TWR/XIRR, Risk, Monte Carlo, IRPF, Rebalance), PWA, testes E2E/a11y
STACK=Vanilla HTML/CSS/JS (ES6 modules), Chart.js vendored, Playwright, axe-core, Python HTTP server (CSP)
CANONICAL_WORKSPACE=C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
BACKUP_PATH=G:\Meu Drive\Codex\investidor10-dashboard
REPOSITORY=local-only (no remote)
DEFAULT_BRANCH=main
```

---

## LAST KNOWN GOOD STATE

```
LAST_KNOWN_GOOD_COMMIT=f4b0984 (docs(plan): implementation plan phase 1 auth)
LAST_VALIDATED_TREE=2026-10-16 (pós AUTH PHASE 1, dados reais + CSP server)
LAST_VALIDATION_DATE=2026-10-16:
  node --check OK (todos src/auth/*, scripts, core); eslint@8 OK; htmlhint OK;
  Playwright (dados reais + CSP server = CI-equivalent):
    desktop 105p+9s ✅, mobile 108p ✅, tablet 111p ✅, a11y 14/14 desktop+mobile ✅,
    PWA 4/4 ✅, auth-gate 8/8 ✅ (force modes, sem rede)
  Dry-run migração P33: readback OK + idempotente OK
  CI GitHub Actions: VERDE (runs 38944485486 + 84ac8d7 — Lint/Desktop/Mobile/Tablet/A11y/Security/Build)
COMMITS_STATUS=TODAS as missões commitadas. Histórico consolidado em main (local → pushed):
  - 10 missões B-E2 (commitadas em fases anteriores, ver git log)
  - Fases F/G/H (deploy Pages, mobile UX, calendário dividendos, export PDF) — f15c50e..2c6859e
  - CI-GREEN (26→0 falhas: sample rica, guards boot, CSP A11y, sw.js allSettled,
    testes adaptativos) — b2db200, CI runs 38944485486+84ac8d7 VERDES
  - AUTH PHASE 1 (P1-P35: auth-gate, demo sintético, sources, sync, rules,
    dry-run) — 3ce229e..f4b0984, ~13 commits
UNCOMMITTED_FILES=nenhum (worktree limpo exceto specs ófãs de debug: tests/e2e/audit-full.spec.js,
  tests/e2e/debug-fmt.spec.js — artefatos de sessão antiga, NÃO desta missão)
```

---

## ARCHITECTURE CONTRACT (aprendido 2026-10-08 — NÃO QUEBRAR)

```
1. script.js é <script type="module"> → const MOCK_DATA/switchTab NÃO vazam para window.
   Classic scripts (real-mode.js, panels.js) acessam dados via:
   - window.MOCK_DATA (bridge explícita no fim do script.js)
   - window.__CARTEIRA_OVERRIDE (setado por init-carteira.js) — usado por panels.js
   - window.switchTab / window.renderAll (expostos no fim do script.js)
2. panels.js: wrap de window.switchTab DEVE rodar no boot (DOMContentLoaded),
   nunca no parse-time — module executa depois e sobrescreve (bug fixado 2026-10-08).
3. CARTEIRA_DATA.earnings[] é PARCIAL (120 de 435 proventos). NUNCA calcular
   proventos somando earnings[]; usar kpis.dividends/earnings12m (fonte B3 autoritativa).
4. KPIs: cor por sinal via classList.toggle (nunca hardcoded); return12m=null → "—"
   quando histórico < 12M (UNKNOWN ≠ ZERO).
5. Metas de alocação (CARTEIRA_META.goals.allocation) usam chaves pt-BR ("Ação","FII");
   positions[].class usa chaves internas ('stocks','fiis') — mapear via ptToCls.
6. JS puro: `node --check` NÃO pega brace desbalanceado que se cancela (missing `}` + extra `};`);
   gate CI agora inclui node --check (lição do P0 boot 2026-10-16).
7. AUTH BOOT ORDER (2026-10-16): carteira-data.js → auth scripts (fixture/sources/gate)
   → script.js. O gate PRECISA executar após carteira-data.js (senão o arquivo local
   sobrescreve a decisão) e ANTES de script.js (que aguarda window.__AUTH_RESOLVED__).
   Microtasks entre script tags completam o gate antes do DOMContentLoaded (force modes).
8. CSS: `.hidden{display:none}` (styles.css ~L958) EMPATA em especificidade com qualquer
   `.classe{display:flex}` definida DEPOIS — componente novo com display próprio
   PRECISA de regra explícita `.classe.hidden{display:none}` (lição do overlay auth).
9. sw.js cache.addAll é ATÔMICO: 1 asset externo falhando (fonts) anula TODO o cache
   estático → usar Promise.allSettled por asset (cache parcial resiliente).
10. npm no workspace G:\ (Google Drive sync) falha com EBADF — instalar fora
    (%TEMP%) + NODE_PATH (CJS apenas; ESM ignora NODE_PATH → usar .cjs).
```

---

## CURRENT STATE

```
CURRENT_STATE=AUTH_PHASE_1_COMPLETE — multiuser auth+sync+demo em código; CI verde; PUSH autorizado p/ Fase 2
BLOCKERS=JDK 11+ ausente (emulator rules tests locais); npm EBADF workspace (devDep fora do lockfile)
AUTH_PHASE1_ASSETS=
  - src/auth/auth-gate.js: INACTIVE/LOGIN/DEMO/REAL/BLOCKED, fail-closed,
    force-testável (__AUTH_GATE_FORCE__ = true|'demo'|'blocked'), localhost bypass
  - src/auth/demo-fixture.js: 100% sintético (13 ativos fictícios, total 123456.78)
  - src/auth/sync/: data-source.js (interface P23), local-demo-source.js
    ('investidor10-demo', reset), firestore-real-source.js (sections + SyncHub)
  - firestore.rules + tests/rules/rules.test.cjs (matriz P14, 10 casos)
  - scripts/migration-dry-run.js (P33: readback+idempotência OK)
  - docs/ai/FIREBASE_SETUP.md + FIREBASE_MIGRATION_PLAN.md
  - vendor/firebase/*.js (compat UMD, lazy-load só com config; CSP 'self' intacto)
DEMO_ISOLAMENTO=storage próprio; saveToStorage roteado por modo; fixture nunca
  contém valores reais (702175.64/628267.44 pinados como ausentes nos testes)
NEXT_MISSION=Ver NEXT_STEP.md (Fase 2: push → Firebase console → rules deploy → certificação)
```

---

## ARQUITETURA ATUAL

```
SPA Single Page (index.html) — 17 tabs organizados em 4 categorias:
  1. Visão Geral: Resumo, Posições, Proventos, Patrimônio, Rentabilidade
  2. Operações: Lançamentos, Rebalancear, Importar, Backup
  3. Análise: Renda Fixa, Risco, Monte Carlo, Benchmarks, Impostos
  4. Centros Avançados: Eventos Corp., Data Trust, Backup Port.

Resumo (home review): hero-card patrimônio → 4 KPIs compactos → gráficos (evolução + alocação)
  → classe summary → alertas inteligentes → insights → returns → tabela mensal

Engines (JS puro, zero deps):
  - advanced-engine.js: ReturnEngine(TWR/XIRR), SnapshotManager(365d hash), RFConfidence(5 níveis), ImportPipeline(12 passos), DataStates(7), A11y
  - rebalance-engine.js: Solver com restrições
  - risk-engine.js: VaR/CVaR, Sharpe/Sortino/Calmar, MaxDD, Beta, Correlation, Rolling 63d
  - benchmark-engine.js: 10 benchmarks via brapi.dev + backtest(portfolio, benchmark) 2026-10-16
  - monte-carlo-engine.js: GBM, 10k paths, cone P10/P50/P90 + runStressTest(2008/2020/2022) 2026-10-16
  - tax-engine.js: IRPF, DARF, GCAP, Carnê-Leão, XML
  - corporate-events.js: 5 tipos evento
  - data-trust.js: Confidence por asset+source, freshness, audit snapshots
  - backup-portability.js: Export/import JSON/CSV/Excel, schema validation, v1→v2

Dados reais consolidados (B3 26/09):
  - 40 ativos, 72 transações, 435 proventos (12m), 4 metas
  - Patrimônio: R$ 610.219,89 | Investido: R$ 630.889,63 | P&L: -3,28% | Yield 12m: 5,73%
```

---

## DECISÕES ARQUITETURAIS IMPORTANTES

| Decisão | Por que | Status |
|---------|---------|--------|
| Vanilla HTML/CSS/JS (sem build) | Zero deps, file:// works | Aplicada |
| Governança UNKNOWN≠ZERO, PARTIAL≠COMPLETE | Integridade financeira | Aplicada |
| Azul #1A73E8 como identidade | Decisão do usuário | Aplicada — NÃO MUDAR |
| Tabs agrupadas 4 categorias | UX escalável | Aplicada |
| Canon = código (regen 2026-10-16) | Canon que mente quebra manutenção | Aplicada |
| node --check no CI (gate) | Brace cancelado pega no runtime, não no check | Aplicada |
| prefers-reduced-motion no router scroll | WCAG 2.3.3 | Aplicada |
| assert real reduced-motion (parseFloat) | Chromium retorna 1e-05s não 0.01ms | Aplicada |
| Hero patrimônio + 4 KPIs compactos | Lucro sem ambiguidade + foco executivo | Aplicada |
| Alertas inteligentes (banners) | Dados desatualizados/concentração/incompleto com caminho | Aplicada |
| A11y serious = fail (allowlist vazia) | Suíte não pode passar verde com contraste quebrado | Aplicada |

---

## REGRAS DE DADOS / VERDADE (PROTECTED SEMANTICS)

```
UNKNOWN ≠ ZERO        → qty null = badge "UNKNOWN" (não 0)
PARTIAL ≠ COMPLETE    → preview obrigatório antes de write; earnings[] parcial tem badge ⚠️ Parcial
STALE ≠ FRESH         → freshness check no Data Trust; banner >30d
ENGINE ≠ DATA_READY   → confidence scoring separa engine de dados prontos
SNAPSHOT ≠ HISTORY    → hash determinístico 365d
LUCRO ≠ GANHO         → "Resultado não realizado" (patrimônio−investido); "Lucro total" só na aba Rentabilidade
DATA ≠ FONTE          → dataFreshnessLabel (hero) + badges de origem (B3/Manual) por linha
```

---

## TEST STATUS (2026-10-16 pós AUTH PHASE 1)

```
a11y desktop=14/14, mobile=14/14 (critical=0, fail-on-serious ativo)
auth-gate=8/8 (fixture sintética, demo source, force LOGIN/DEMO/BLOCKED,
  SyncHub no-op, isolamento P10, reset P11)
suíte (dados reais + CSP server): desktop 105p+9s · mobile 108p · tablet 111p · 0 failed
suíte CI (sample + serve.py): verde no GitHub Actions (runs 38944485486, 84ac8d7)
BUILD=No build step (vanilla)
CI=GitHub Actions VERDE — Lint/Desktop/Mobile/Tablet/A11y/Security/Build
  (tests/rules NÃO roda no CI ainda — requer devDep + step; Fase 2)
AMBIENTE=Sem Python local → servidor Node com CSP (espelha serve.py);
  Java 8 bloqueia emulator; npm EBADF no workspace G:\ (Drive)
```

---

## RECENT MISSIONS (2026-10-16, sessão consolidada)

```
M1-M6 — (histórico) ver git log: higiene, REA, usabilidade, P0 boot, home review, Tier 1.

M7 — FASES F/G/H: GitHub Pages ativo, mobile UX (bottom nav/cards/PTR),
  calendário dividendos, export PDF (f15c50e..2c6859e).

M8 — CI-GREEN (26→0 falhas): sample data rica (20 posições/6 classes/allocation/kpis/
  patrimony), guards applyRealData + __CARTEIRA_OVERRIDE branch, meta preservado via
  Object.assign, CSP-safe A11y (styles migrados p/ CSS), .data-table mobile escopado
  a #panel-positions, sw.js allSetteld, testes adaptativos (real-data skip sample,
  import-xlsx skip fixture, pwa polling). CI runs 38944485486+84ac8d7 VERDES (b2db200).

M9 — AUTH PHASE 1 (P1-P35 do usuário; spec 7111af4 + plan f4b0984):
  brainstorming→spec→writing-plans→TDD (red-green por task)→13 commits locais.
  Entrega: auth-gate 5 modos, demo sintético local-only c/ reset, PortfolioDataSource,
  FirestoreRealDataSource sections+SyncHub, firestore.rules UID+allowlist, matriz P14
  (emulator-ready), dry-run P33 OK, FIREBASE_SETUP/MIGRATION_PLAN. HOSTED_WRITES=0.
  Bug-lessons: script order (contrato 7), .hidden especificidade (contrato 8),
  addAll atômico (contrato 9), EBADF/NODE_PATH (contrato 10).
```

---

## AGENT LESSONS

```
- Sempre validar identity gate antes de escrever (gate divergente scratch×G:\ — decisão: G:\ com autorização)
- Auditoria antiga ≠ estado físico: reinspecionar arquivos antes de propor (P0s antigos já estavam fixados)
- Medir no browser antes de alterar (KPIs 2col cabem; header sem overflow; thead já sticky)
- Missão que toca boot DEVE coletar pageerrors (módulo pode morrer em silêncio e panels.js mascarar)
- node --check NÃO pega brace que se cancela → diagnosticar com V8 precise-coverage via CDP
- Chromium getComputedStyle retorna "1e-05s" (não "0.01ms") → asserts com parseFloat, não string array
- Skill REA: usar só p/ binário/package sem fonte; repo com fonte → ferramentas normais
- Cada missão: bounded aprovado, sem commit/push, validação no browser, memória atualizada
```

---

## PRÓXIMA MISSÃO (ver NEXT_STEP.md para detalhe)

```
FASE 2 (autorização de push concedida 2026-10-16 "atualizar github"):
  1. push 13+ commits → CI verde no GitHub
  2. Dono: FIREBASE_SETUP.md (projeto, Auth Google+e-mail, rules, allowlist, config)
  3. Rules tests 10/10 (CI ubuntu/Java 17 ou JDK 17 local)
  4. FASE 3 migração owner (FIREBASE_MIGRATION_PLAN.md) → 4 cross-device → 5 demo → 6 prod
VERCEL: vercel.json commitado (static+headers CSP); deploy = import do repo no
  dashboard Vercel (integração GitHub → auto-deploy a cada push em main)
```

---

## LAST UPDATED

```
DATE=2026-10-16
COMMIT=f4b0984 (HEAD local; push Fase 2 autorizado)
UPDATED_BY=Muse Spark (pós AUTH PHASE 1 + memória consolidada + push/vercel)
```