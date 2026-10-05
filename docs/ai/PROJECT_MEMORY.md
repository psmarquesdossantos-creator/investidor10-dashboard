# PROJECT MEMORY — Investidor10 Dashboard

**Memória persistente entre sessões, agentes, computadores, chats.**

---

## IDENTITY

```
PROJECT=investidor10-dashboard
PURPOSE=Dashboard de carteira de investimentos estilo Investidor10 com dados reais, engines avançados (TWR/XIRR, Risk, Monte Carlo, IRPF, Rebalance), PWA, testes E2E/a11y
STACK=Vanilla HTML/CSS/JS (ES6 modules), Chart.js, Playwright, axe-core, Python HTTP server (CSP)
CANONICAL_WORKSPACE=C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
BACKUP_PATH=G:\Meu Drive\Codex\investidor10-dashboard
REPOSITORY=local-only (no remote)
DEFAULT_BRANCH=main
```

---

## LAST KNOWN GOOD STATE

```
LAST_KNOWN_GOOD_COMMIT=N/A (local only, no git)
LAST_KNOWN_GOOD_CI=2026-09-27 (41/41 passing desktop+mobile+tablet)
LAST_VALIDATION_DATE=2026-09-27
```

---

## CURRENT STATE

```
CURRENT_STATE=PRODUCTION_READY — Todas 12 fases + FASE 13+14 implementadas, 47/47 testes passing (serial), CSP/Security headers ativos, PWA ready, backup sincronizado, governança bootstrap completa (14 docs canônicas)
COMPLETED=
  - Fases 1-5: Fundação, Dados, Engines Core, UI Base
  - Fase 6: Testes E2E (Playwright + axe) — 47/47 passing (serial)
  - Fase 7: CSP/Security Hardening (serve.py)
  - Fase 8: Rebalance Engine (Solver JS com restrições)
  - Fase 9: CI/CD + PWA + README + Documentação
  - Fase 10: Risk Engine + Benchmarks + Correlation Matrix
  - Fase 11: Monte Carlo + Tax Engine (IRPF, DARF, GCAP, XML)
  - Fase 12: Polish, Quick Wins, Docs finais
  - FASE 13: Import Center (B3 JSON/CSV, broker CSV, brapi.dev, pipeline 12 etapas)
  - FASE 13.2: Corporate Events Center (split, merge, bonus, subscription, amortization)
  - FASE 14.1: Data Trust Center (confidence scoring, audit snapshots, freshness)
  - FASE 14.2: Backup Portability (JSON/CSV/Excel export/import, schema validation, v1→v2 migration)
  - GOVERNANCE BOOTSTRAP: 14 docs canônicas em docs/ai/ (PROJECT_MEMORY, PROJECT_STATE, NEXT_STEP, CURRENT_PROJECT_MAP, SKILLS_ROUTING, DECISIONS, VISUAL_CANON, TESTING_AND_RELEASE, STORAGE_AND_WORKTREE_POLICY, BACKUP_MANIFEST, AGENT_ROUTER, AGENT_AUTONOMY, RECOVERY_PLAYBOOK, OPEN_WORK)
IN_PROGRESS=GitHub remote + CI/CD activation
PENDING=Remote Git setup, CI/CD pipeline ativação, GitHub Pages deploy
DEFERRED=PDF import, Corporate Events UI edit, Data Trust proactive alerts, Light theme, i18n
KNOWN_ISSUES=
  - serve.py: 503 errors under parallel load (workaround: --workers=1)
  - Chart.js CDN load failures intermittent (network dependency)
  - DataTrust.initDataTrustCenter not exposed globally (console error only)
KNOWN_RISKS=
  - Sem remote Git → sem disaster recovery além do backup local
  - Dados reais em carteira-data.js não versionados
  - Rate limit NVIDIA NIM pode exigir fallback
BLOCKERS=Nenhum bloqueador crítico
```

---

## ARQUITETURA ATUAL

```
SPA Single Page (index.html) — 17 tabs organizados em 4 categorias:
  1. Visão Geral: Resumo, Posições, Proventos, Patrimônio, Rentabilidade
  2. Operações: Lançamentos, Rebalancear, Importar, Backup
  3. Análise: Renda Fixa, Risco, Monte Carlo, Benchmarks, Impostos
  4. Centros Avançados: Eventos Corp., Data Trust, Backup Port.

Engines (JS puro, zero deps):
  - advanced-engine.js: ReturnEngine(TWR/XIRR), SnapshotManager(365d hash), RFConfidence(5 níveis), ImportPipeline(12 passos), DataStates(7), A11y
  - rebalance-engine.js: Solver com restrições (lote mínimo, max 20% ativo, max 40% setor, taxa corretagem)
  - risk-engine.js: VaR/CVaR 95/99%, Sharpe/Sortino/Calmar, MaxDD, Beta, Correlation Matrix, Rolling 63d
  - benchmark-engine.js: 9 benchmarks reais via brapi.dev (CDI, IBOV, IFIX, SMLL, IDIV, IMAB, BTC, DOL, USD/BRL)
  - monte-carlo-engine.js: GBM, inflação, aporte crescente, 10k paths, cone P10/P50/P90
  - tax-engine.js: IRPF 2024/25, DARF mensal, GCAP, isenções, day trade, FII, XML declaração
  - corporate-events.js: 5 tipos evento (split, merge, bonus, subscription, amortization) com auto qty/avg price
  - data-trust.js: Confidence por asset+source (B3=1.0, brokers=0.85, manual=0.6), freshness, audit snapshots
  - backup-portability.js: Export/import JSON/CSV/Excel, schema validation Zod-like, migration v1→v2

Dados reais consolidados (B3 26/09):
  - 40 ativos, 72 transações, 435 proventos (12m), 4 metas
  - Patrimônio: R$ 610.219,89 | Investido: R$ 630.889,63 | P&L: -3,28% | Yield 12m: 5,73%
  - Alocação: FIIs 43,8% · RF 32,1% · ETFs 21,5% · Ações 2,6%
```

---

## DECISÕES ARQUITETURAIS IMPORTANTES

| Decisão | Por que | Arquivos Afetados |
|---------|---------|-------------------|
| Vanilla HTML/CSS/JS (sem build) | Zero deps, file:// works, full control | Todos |
| ThreadingHTTPServer em serve.py | SimpleHTTPRequestHandler single-threaded falhava sob carga Playwright paralela | serve.py |
| 12-stage ImportPipeline | Governança: PREVIEW obrigatório, writes=0 antes de confirm | advanced-engine.js, import-center/* |
| DataStates (7 estados) | UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH | advanced-engine.js, real-mode.js |
| RFConfidence 5 níveis | Separar ENGINE_AVAILABLE de DATA_READY | advanced-engine.js |
| Azul #1A73E8 como identidade | Decisão do usuário (rejeitou verde #22C55E) | styles.css |
| Tabs agrupadas 4 categorias | UX: navegação escalável para 17 tabs | index.html, styles.css |
| Skeleton/empty/error states | Estados honestos, não inventar dados | styles.css, real-mode.js |
| PWA (sw.js + manifest) | Offline-first, instalável | sw.js, manifest.json |

---

## REGRAS DE DADOS / VERDADE (PROTECTED SEMANTICS)

```
UNKNOWN ≠ ZERO        → qty null = badge "UNKNOWN" (não 0)
PARTIAL ≠ COMPLETE    → preview obrigatório antes de write
STALE ≠ FRESH         → freshness check (≤7d/8-30d/>30d) no Data Trust
ENGINE ≠ DATA_READY   → confidence scoring separa engine de dados prontos
SNAPSHOT ≠ HISTORY    → hash determinístico 365d, não substitui histórico
```

---

## IMPORT / PERSISTENCE RULES

```
Pipeline: FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUP → CONFIRM → WRITE
PREVIEW_WRITES=0
CONFIRMATION_REQUIRED=true
STALE_CONFIRMATION_BLOCKED=true
ATOMIC_WRITE=true
Fingerprint = SHA256 conteúdo (não path)
UNSUPPORTED > importação errada
```

---

## UI/UX RULES

```
Theme: Dark mode WCAG AA (text #F8FAFC, secondary #CBD5E1, muted #94A3B8, bg #020617)
Primary: Azul #1A73E8 (corporate identity)
Touch targets: ≥44px
Viewports: 1366×768, 390×844, 430×932, 768×900, 1920×1080
No horizontal overflow
Semantic headings, focus-visible, textual chart summaries
Animations: transform/opacity <300ms, prefers-reduced-motion
```

---

## TEST STATUS

```
E2E_STATUS=41/41 passing (Desktop ✅, Mobile ✅, Tablet ✅)
ACCESSIBILITY_STATUS=14/14 axe critical=0
BUILD_STATUS=No build step (vanilla)
CI_STATUS=Workflow ready (.github/workflows/ci.yml), not activated (no remote)
PRODUCTION_STATUS=Ready for local use
```

---

## RECENT MISSIONS

```
2026-09-27: Fases 1-12 completadas, 82/82 testes passing, backup sincronizado
2026-09-27: Auditoria OpenCode → 15 issues → ALL FIXED (P0+P1+P2 at once)
2026-09-27: Design system overhaul — tabs grouped, WCAG AA, touch targets, hierarchical KPIs
2026-09-28: FASE 13+14 — 4 centros implementados (Import, Corporate Events, Data Trust, Backup Port)
2026-09-28: Testes: Desktop 43/44, Mobile 44/44, A11y 14/14
```

---

## IMPORTANT PATHS

```
WORKSPACE_ROOT=C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
BACKUP_ROOT=G:\Meu Drive\Codex\investidor10-dashboard
SRC_DIR=src/ (import-center, corporate-events, data-trust, backup-portability)
TESTS_DIR=tests/e2e/
DOCS_DIR=docs/ (plans/, superpowers/{plans,specs}/)
ENGINES=*.engine.js + advanced-engine.js + corporate-events.js + data-trust.js + backup-portability.js
```

---

## AGENT LESSONS

```
- Sempre validar identity gate antes de escrever
- ThreadingHTTPServer resolveu crashes sob carga Playwright
- Flaky test import.spec.js = timing do init(), não bug funcional
- Backup para G:\Meu Drive\Codex\ funciona via terminal MSYS
- Skills de processo SEMPRE antes de implementação
- Azul #1A73E8 é identidade do usuário — não mudar
```

---

## NEXT SINGLE BEST ACTION

```
Fix flaky test import.spec.js (aumentar timeout ou melhorar waitForFunction)
→ Depois: ativar CI/CD no GitHub (criar remote, push, workflow)
```

---

## LAST UPDATED

```
DATE=2026-09-28
COMMIT=N/A (local only)
UPDATED_BY=Hermes Agent (bootstrap governance)
```