# CHANGELOG — Investidor10 Dashboard

**Registro de mudanças relevantes. Formato: Keep a Changelog + Conventional Commits.**

---

## [15.1.0] — 2026-10-17 (P30)

### Changed — Rebrand e UX da aba Ativos

- **Rebrand**: logo/título/lock agora "Carteira de Investimentos" (antes "Investidor10")
- **Badge "vs Investidor10: +2.2%" removido** — comparava contra valor real hardcoded (686.972,13) no código público (P26)
- **Rótulos de grupo da barra de abas removidos** (Visão Geral/Ativos/Análise/Mercado/Configurações — não clicáveis, só poluíam)
- **Ativos sem arrastar**: colunas de contexto somem progressivamente (≤1600: Classe/Variação/Confiança; ≤1370: % Ideal + célula Ativo empilhada + padding compacto) — no monitor 2560 TODAS as 16 colunas continuam visíveis
- **Grupos colapsáveis** em Ativos (Ações/Fundos/Renda Fixa/ETFs/Outros): clique no header recolhe/expand com chevron + aria-expanded; linhas ficam no DOM (dados/testes intactos)
- Fix: atributo `class` duplicado na célula % Ideal (caía o estilo)
- +5 specs E2E (`positions-groups.spec.js`): rebrand, barra slim, colapso, no-drag 1366, 16 colunas @2560
- SW v28

---

## [15.0.0] — 2026-10-17

### Added — Conta Google, Configurações e UX (P29)

- **Entrar com Google** como login primário (botão primário com branding no lock; e-mail/senha vira alternativa) — `FIREBASE_SETUP.md` atualizado com provider Google + allowlist P16 passo a passo
- **Logout limpa o dispositivo (P26)**: ao sair da conta REAL, os dados locais da carteira são removidos e o app recarrega só com o fictício — "deslogado = apenas demonstração"
- **Aba Configurações** (hub organizado): Conta (modo/e-mail/login/sair), Aparência (tema claro/escuro/sistema + animações reduzidas persistidas), Dados (stats + atalhos + wipe local), Sobre (versão/stack/docs) — +3 testes E2E
- **Menu do usuário funcional**: Perfil → Configurações (card Conta destacado), Configurações → aba, Ajuda → modal de atalhos/fluxos, Sair → fluxo único por modo (REAL/DEMO/local)
- **Modal Ajuda** (⌘K também) e entradas novas na paleta de comandos
- `docs/compare-investidor10.md` — paridade de números (auditoria de fórmulas ✅ Lucro = GC + Dividendos exato) + matriz de features vs investidor10.com.br
- `scripts/preview-screenshot.mjs` — preview do README em modo DEMO com guard de privacidade (aborta se dados ≠ fixture)

### Fixed — Lançamentos (CRUD de verdade) e modais

- **Editar lançamento salvava nada** (só toast de sucesso) — agora atualiza o objeto e re-renderiza
- **Excluir removia o lançamento SEGUINTE** (índice lido pós-splice) — remoção por identidade
- **Novo lançamento não aparecia** (view filtrada stale) — re-filter após mutação
- **Filtro de período era decorativo** (lido e nunca aplicado) — 30d/90d/12m/todo funciona
- **"Salvar" inaclicável com mouse**: `.modal-backdrop` cobria o conteúdo (z-index) — afetava TODOS os modais
- **Fechar modal fechava o errado**: todo `.modal-close` fechava o entryModal; agora cada botão/ESC/backdrop fecha o próprio dialog
- **class duplicada** no pill de origem quebrava o tema dinâmico (dyn-bg)
- 3 specs de regressão E2E: `entries-crud.spec.js` (add/edit/delete/filtros/paginação)
- Teste de produção vazava o arquivo real na simulação (glob sem `?v=`) — `carteira-data.js*`

### Changed — Privacidade (P26) e higiene

- **MOCK_DATA interno (R$ 687k real-derivado) substituído pela fixture sintética 30k** — o padrão sem login agora é SEMPRE fictício (≤100k) e os valores reais saíram do código público
- Links mortos do topo removidos (Carteira/Mercados/Recomendações/Cursos/IR)
- SW v27 · README: seção Documentação + preview real + backup xcopy correto
- `build-dist.py`: allowlist agora inclui `assets/` (ícones PWA que davam 404)
- CONTRASTE/estados: `.toast-content` com cor explícita (axe AA)

---

## [Unreleased] — 2026-09-28

### Added — Governance & Memory Bootstrap

- `.project-identity` — Identidade física do projeto (workspace, backup path, repo)
- `AGENTS.md` — Constituição operacional (identity gate, protected files, git rules, data safety, skills policy, agent autonomy)
- `docs/ai/PROJECT_MEMORY.md` — Memória persistente entre sessões/agentes/computadores
- `docs/ai/PROJECT_STATE.md` — Verdade atual (phase, git, test status, active work, metrics)
- `docs/ai/NEXT_STEP.md` — Próxima ação concreta (GitHub remote + CI/CD)
- `docs/ai/CURRENT_PROJECT_MAP.md` — Mapa simples para onboarding (entrypoints, modules, commands)
- `docs/ai/SKILLS_ROUTING.md` — Skills descobertas + roteamento obrigatório por task type
- `docs/ai/DECISIONS.md` — 11 decisões arquiteturais registradas (stack, server, governance, visual, pipeline, centers, tests, PWA)
- `docs/ai/VISUAL_CANON.md` — Design system tokens (cores, tipografia, spacing, componentes, states, a11y)
- `docs/ai/TESTING_AND_RELEASE.md` — Comandos reais, viewports, validações, release checklist
- `docs/ai/STORAGE_AND_WORKTREE_POLICY.md` — Backup model, worktree policy, node_modules, generated temp, root hygiene, storage audit
- `docs/ai/BACKUP_MANIFEST.md` — Backup locations, history, structure, restore procedures, validation schedule
- `docs/ai/AGENT_ROUTER.md` — Model routing by capability (critical/standard/simple/specialized)
- `docs/ai/AGENT_AUTONOMY.md` — Autonomia permitida vs human blocker, loop guard, decision matrix
- `docs/ai/RECOVERY_PLAYBOOK.md` — 8 cenários de recuperação (chat apagado, novo computador, worktree corrompida, servidor, dados, git, testes, rate limit)
- `docs/ai/OPEN_WORK.md` — Trabalho pendente real (critical/high/medium/low/deferred/tech debt/decisions needed)
- `CHANGELOG.md` — Registro de mudanças (Keep a Changelog + Conventional Commits)

### Changed — Test Stabilization

- Fixed flaky `import.spec.js` (increased timeouts from 5s/15s to 20s/45s, improved waitForFunction to check switchTab + active tab)
- Serial test execution (`--workers=1`) for stability under ThreadingHTTPServer
- Desktop: 47/47 passing (was 43/44 with flaky)
- Mobile: 47/47 passing (was 44/44 but with flaky)
- A11y: 14/14 passing (critical=0)

### Security

- Documented: separação SOURCE_BACKUP vs SENSITIVE_LOCAL_BACKUP
- Documentado: categorias de dados (PUBLIC_SAFE, PROJECT_PRIVATE, SENSITIVE_LOCAL, SECRET)
- Documentado: nunca misturar dados sensíveis em backup público

---

## [12.0.0] — 2026-09-27

### Added — Fases 1-12 Complete

- **Core Application**: SPA 12 tabs (index.html, script.js, real-mode.js)
- **Engines**: advanced-engine.js (ReturnEngine, SnapshotManager, RFConfidence, ImportPipeline, DataStates, A11y), rebalance-engine.js, risk-engine.js, benchmark-engine.js, monte-carlo-engine.js, tax-engine.js
- **Data**: carteira-data.js (40 ativos, 72 tx, 435 prov, 4 metas, B3 26/09 reconciliado)
- **Server**: serve.py (ThreadingHTTPServer + CSP completo + Security Headers)
- **PWA**: sw.js (cache-first static, network-first API), manifest.json, robots.txt
- **Tests**: 41 testes Playwright (desktop 1366x768, mobile 390x844, tablet 768x900) + axe-core a11y (critical=0)
- **CI/CD**: .github/workflows/ci.yml (lint + test + security check)
- **Docs**: README.md, MODEL_SELECTION_GUIDE.md, SKILLS_PLAYBOOK.md, AGENT_USAGE_GUIDE.md, MODEL_FALLBACK_FRAMEWORK.md
- **Governance**: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE≠DATA_READY codificados

### Fixed

- ThreadingHTTPServer resolveu crashes sob carga Playwright paralela
- Mobile overflow (header-actions 466px, canvas 800px) → max-width:100%, overflow-x:hidden
- ARIA role="group" inside tablist → spans com aria-hidden="true"
- tabindex="0" como CSS property → HTML attribute
- window.updateDataState, window.renderAll expostos globalmente
- getEarningsTypeLabel extraído como função standalone
- Import panel activation timing → waitForFunction

### Security

- CSP headers completos validados
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP, CORP
- Upload validation: ≤5MB, .json/.csv only, filename sanitization
- Axe-core critical=0 gate

---

## [13.0.0] — 2026-09-28 (FASE 13)

### Added — Import Center

- `src/import-center/detectors.js` — Detecção formato (B3 JSON/Events, broker CSVs, brapi.dev)
- `src/import-center/parsers/` — 5 parsers (b3-position, b3-events, broker-csv, brapi-enricher, generic-csv)
- `src/import-center/{normalizer,validator,deduper,writer}.js` — Pipeline stages 9-12
- `real-mode.js` — `initImportCenter()`, `runImportPipeline()`, `buildPreviewTable()`, `confirmImport()`
- `index.html` — Tab "Importar" + panel com dropzone, preview, confirmação
- `tests/fixtures/backup-investidor10-sample.json` — Fixture sintético validado
- `tests/e2e/import-b3-json.spec.js` — E2E test fluxo completo B3 JSON

### Added — Corporate Events Center (13.2)

- `src/corporate-events/corporate-events.js` — 5 tipos evento (split, merge, bonus, subscription, amortization) com auto qty/avgPrice, log, rollback, B3 detection
- `src/corporate-events/panel-corporate-events.html` — Panel UI
- `real-mode.js` — `initCorporateEventsCenter()` pipeline completo
- `index.html` — Tab "Eventos Corp." + panel

---

## [14.0.0] — 2026-09-28 (FASE 14)

### Added — Data Trust Center (14.1)

- `src/data-trust/data-trust.js` — Confidence scoring (B3=1.0, brokers=0.85, manual=0.6), freshness (FRESH/AGING/STALE/UNKNOWN), audit snapshots (365d hash), portfolio rollup
- `real-mode.js` — `renderDataTrustPanel()` com badges, snapshots, alertas
- `index.html` — Tab "Data Trust" + panel

### Added — Backup Portability (14.2)

- `src/backup-portability/backup-portability.js` — Export/import JSON v2/CSV/Excel, schema validation Zod-like, migration v1→v2, integrity checks
- `index.html` — Tab "Backup Port." + panel
- `tests/e2e/smoke.spec.js` + `tabs.spec.js` — Atualizados para 17 tabs

### Test Results (2026-09-28)

```
Desktop:  43/44 passing (1 flaky: import.spec.js timeout)
Mobile:   44/44 passing
A11y:     14/14 passing (critical=0)
Total:    ~90/91 (~99%)
```

---

## [11.0.0] — 2026-09-27 (Fases 10-11)

### Added — Risk Engine + Benchmarks

- `risk-engine.js` — VaR/CVaR 95/99%, Sharpe/Sortino/Calmar, MaxDD, Beta, Correlation Matrix, Rolling 63d
- `benchmark-engine.js` — 9 benchmarks reais via brapi.dev (CDI, IBOV, IFIX, SMLL, IDIV, IMAB, BTC, DOL, USD/BRL)
- Tabs: "Risco", "Benchmarks"

### Added — Monte Carlo + Tax Engine

- `monte-carlo-engine.js` — GBM, inflação, aporte crescente, 10k paths, cone P10/P50/P90
- `tax-engine.js` — IRPF 2024/25, DARF mensal, GCAP, isenções, day trade, FII, XML declaração
- Tabs: "Monte Carlo", "Impostos"

---

## [10.0.0] — 2026-09-27 (Fase 9)

### Added — CI/CD + PWA + Docs

- `.github/workflows/ci.yml` — Lint + Playwright (3 viewports) + axe + security check
- `sw.js` — Service Worker PWA
- `manifest.json` — PWA instalável
- `robots.txt` — Privacy
- `README.md` — Documentação completa
- `MODEL_SELECTION_GUIDE.md` — NVIDIA NIM selection
- `SKILLS_PLAYBOOK.md` — Skills workflow obrigatório
- `AGENT_USAGE_GUIDE.md` — Agent usage rules
- `MODEL_FALLBACK_FRAMEWORK.md` — Auto-fallback on HTTP 429

---

## [9.0.0] — 2026-09-27 (Fase 8)

### Added — Rebalance Engine

- `rebalance-engine.js` — Solver JS puro com restrições (lote mínimo, max 20% ativo, max 40% setor, taxa corretagem)
- Tab "Rebalancear" com simulador de aporte + otimização

---

## [8.0.0] — 2026-09-27 (Fase 7)

### Added — CSP/Security Hardening

- `serve.py` — ThreadingHTTPServer, CSP completo, Security Headers, upload validation
- Validado: 41/41 testes passing

---

## [7.0.0] — 2026-09-27 (Fase 6)

### Added — Testes E2E + A11y

- `tests/e2e/smoke.spec.js` (6 tests)
- `tests/e2e/tabs.spec.js` (16 tests)
- `tests/e2e/import.spec.js` (5 tests)
- `tests/e2e/a11y.spec.js` (14 tests)
- `playwright.config.js` — 3 projects (desktop, mobile, tablet)
- Resultado: 41/41 passing (desktop + mobile + tablet)

---

## [6.0.0] — 2026-09-27 (Fases 1-5)

### Added — Foundation

- `index.html` — SPA structure, 12 tabs, ARIA compliant
- `script.js` — Core ES6 module (UI, charts, state)
- `real-mode.js` — Data integration, 12 panel inits
- `advanced-engine.js` — ReturnEngine (TWR/XIRR), SnapshotManager (365d hash), RFConfidence (5 níveis), ImportPipeline (12 passos), DataStates (7), A11y
- `carteira-data.js` — Dados reais consolidados (B3 26/09)
- `styles.css` — Design system completo (dark mode WCAG AA, touch targets 44px, grouped tabs, skeleton/empty/error states)
- `data.js` — Dados legados (preservado)

---

## Legend

- **Added** — Nova funcionalidade
- **Changed** — Mudança em funcionalidade existente
- **Deprecated** — Funcionalidade marcada para remoção
- **Removed** — Funcionalidade removida
- **Fixed** — Correção de bug
- **Security** — Melhoria de segurança