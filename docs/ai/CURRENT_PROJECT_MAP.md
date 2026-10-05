# CURRENT PROJECT MAP — Investidor10 Dashboard

**Mapa extremamente simples para onboarding rápido.**

---

## CANONICAL REPOSITORY

```
WORKTREE_ROOT=C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
BACKUP_ROOT=G:\Meu Drive\Codex\investidor10-dashboard
ACTIVE_BRANCH=main (local only)
ACTIVE_WORKTREE=scratch (expires 24h idle)
```

---

## SOURCE ENTRYPOINTS

```
MODERN_APP=index.html (SPA single-page, 17 tabs)
CORE_MODULE=script.js (UI, charts, state management)
INTEGRATION=real-mode.js (data integration, 17 panel inits)
ENGINES_CORE=advanced-engine.js (ReturnEngine, SnapshotManager, RFConfidence, ImportPipeline, DataStates, A11y)
ENGINE_REBALANCE=rebalance-engine.js (Solver JS)
ENGINE_RISK=risk-engine.js (VaR, Greeks, Correlation)
ENGINE_BENCHMARK=benchmark-engine.js (9 indices via brapi.dev)
ENGINE_MONTECARLO=monte-carlo-engine.js (GBM, 10k paths)
ENGINE_TAX=tax-engine.js (IRPF, DARF, GCAP, XML)
ENGINE_CORPORATE=src/corporate-events/corporate-events.js (5 event types)
ENGINE_DATATRUST=src/data-trust/data-trust.js (confidence + audit)
ENGINE_BACKUP=src/backup-portability/backup-portability.js (export/import + schema)
DATA_REAL=carteira-data.js (40 ativos, 72 tx, 435 prov, 4 metas)
DATA_LEGACY=data.js (não modificar)
STYLES=styles.css (design system completo)
SERVER=serve.py (ThreadingHTTPServer + CSP + Security Headers)
PWA_SW=sw.js (Service Worker)
PWA_MANIFEST=manifest.json
```

---

## MODULES

```
FRONTEND=index.html + script.js + styles.css
BACKEND=N/A (static only, Python HTTP server for CSP)
DATA_LAYER=carteira-data.js + IndexedDB (offline-first)
PERSISTENCE=localStorage + IndexedDB + JSON backup export/import
TESTS=tests/e2e/*.spec.js (Playwright + axe-core)
SCRIPTS=serve.py, docs/plans/*.sh
CONFIG=playwright.config.js, package.json, .project-identity
DOCS=README.md, AGENTS.md, docs/ai/*.md, MODEL_SELECTION_GUIDE.md, SKILLS_PLAYBOOK.md
SKILLS=C:\Users\Paulinho\AppData\Local\hermes\skills\ (224 skills installed)
REFERENCES=docs/superpowers/{plans,specs}/
LOCAL_DATA=carteira-data.js (real portfolio data)
BACKUPS=G:\Meu Drive\Codex\investidor10-dashboard\
UPLOADS=uploads/ (temporary import files)
```

---

## COMMANDS

```
DEV_SERVER=python serve.py (port 8765, CSP + Security Headers)
SIMPLE_SERVER=python -m http.server 8000
TEST_ALL=npx playwright test
TEST_DESKTOP=npx playwright test --project=desktop
TEST_MOBILE=npx playwright test --project=mobile
TEST_TABLET=npx playwright test --project=tablet
TEST_REPORT=npx playwright show-report
INSTALL_PLAYWRIGHT=npx playwright install
```

---

## ACTIVE WORKTREES

```
scratch (current) — C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
```

---

## ARCHIVED BRANCHES

```
N/A (local only, no git remote)
```

---

## DO NOT TOUCH

```
carteira-data.js          # Dados reais da carteira
data.js                   # Dados legados
advanced-engine.js        # Engines core
rebalance-engine.js       # Solver otimização
risk-engine.js            # Risk engine
benchmark-engine.js       # Benchmarks
monte-carlo-engine.js     # Monte Carlo
tax-engine.js             # Tax engine
corporate-events.js       # Corporate events center
data-trust.js             # Data trust center
backup-portability.js     # Backup portability
index.html                # Estrutura SPA (tabs/panels)
styles.css                # Design system
script.js                 # Core UI module
real-mode.js              # Integração panels
serve.py                  # Server with CSP
tests/e2e/*.spec.js       # Test suite (41 tests)
playwright.config.js      # Playwright config
```

---

## KNOWN LEGACY

```
data.js                   # Dados antigos, substituído por carteira-data.js
index.html.corrupted      # Backup corrompido, ignorar
overnight-*.log           # Logs de execução noturna
server.log                # Log do servidor (rotacionar)
```