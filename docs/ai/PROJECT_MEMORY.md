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
LAST_KNOWN_GOOD_COMMIT=217e920 (feat(durability): Fase 17) — HEAD
LAST_VALIDATED_TREE=2026-10-16 (working tree G:\ — todas as missões abaixo aplicadas)
LAST_VALIDATION_DATE=2026-10-16:
  node --check OK (script.js, router.js, panels.js, a11y.spec.js, benchmark-engine.js, monte-carlo-engine.js);
  boot probe 0 pageerrors/0 console errors/0 switchTab throws, 17/17 tabs OK, assetRows 37;
  Playwright desktop (servidor Node; sem Python no ambiente):
    a11y 14/14 (reduced-motion com assert real),
    suíte completa 79/85 (6 falhas PRÉ-EXISTENTES: import-xlsx fixtures, panels fixed, test-isolated — não regressões)
COMMITS_PENDING_USER_AUTHORIZATION (6 missões, ~22 arquivos):
  - Higiene raiz (30 arquivos debug/test removidos)
  - Canon regen (VISUAL_CANON.md reconciliado código=verdade)
  - Melhorias usabilidade/visual (inline→classes, reduced-motion, a11y fail-on-serious, KPIs mobile 2col)
  - P0 boot fix (2 braces) + correções latentes (scrollable-region, contraste badges)
  - Home review (hero-card, KPIs simplificados, alertas inteligentes)
  - Tier 1 parcial (reduced-motion assert, gate CI node --check, suíte completa executada)
COMMIT_MISSION_ORDER (quando autorizado):
  1. "chore: higiene raiz + canon regen" (docs + removidos)
  2. "fix: boot path restaurado, a11y enforced, usabilidade mobile" (script.js, styles.css, router.js, panels.js, tests)
  3. "feat: home review — hero patrimônio, KPIs claros, alertas inteligentes" (index.html, script.js, panels.js, styles.css)
  4. "ci: gate node --check *.js no workflow" (.github/workflows/ci.yml)
UNCOMMITTED_FILES=index.html, styles.css, script.js, router.js, panels.js, serve.py, sw.js,
  init-carteira.js, real-mode.js, docs/ai/*, tests/e2e/*, .github/workflows/ci.yml,
  src/import-center/orchestrator.js, src/import-center/parsers/corporate-events.js,
  src/montecarlo/, src/rebalance/, tests/fixtures/backup-investidor10-sample.json
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
```

---

## CURRENT STATE

```
CURRENT_STATE=HOME_REVIEW_COMPLETE — 4 itens aplicados (hero, KPIs, visão executiva, alertas)
BLOCKERS=Nenhum bloqueador crítico
PRE_EXISTING_TEST_FAILURES=6 (não regressões):
  - import-xlsx.spec.js ×4 (fixtures XLSX ausentes no servidor Node estático)
  - panels.spec.js:16 (aba "fixed" não popula fixedBody)
  - test-isolated.spec.js (isolamento de panels.js)
KNOWN_ISSUES=
  - serve.py: 503 errors under parallel load (workaround: --workers=1)
  - Risk/Monte Carlo panels: exigem série diária (estado "dados insuficientes" honesto)
  - 100+ style="" inline no index.html → impede remover 'unsafe-inline' do CSP
NEXT_MISSION=Ver NEXT_STEP.md
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

## TEST STATUS (2026-10-16)

```
a11y desktop=14/14 (critical=0, serious=0, fail-on-serious ativo, reduced-motion com assert real)
a11y mobile=14/14 (rodado em missão anterior)
tabs+smoke desktop=27/27
suíte completa desktop=79/85 (6 falhas pré-existentes — ver CURRENT_STATE)
BUILD=No build step (vanilla)
CI=Workflow atualizado (gate node --check); falta remote
AMBIENTE=Sem Python → harness de teste = servidor Node estático (CSP headers incluídos)
```

---

## RECENT MISSIONS (2026-10-16 — TODAS SEM COMMIT, aguardando autorização)

```
M1 — Higiene raiz + Canon:
  30 arquivos debug_*.cjs/test_*.cjs|js/test-panels.html/dashboard_status.txt removidos;
  VISUAL_CANON.md regenerado do :root real (namespace --color-*, light default, dark via media/data-theme);
  DECISIONS.md atualizado.

M2 — Skill REA:
  reverse-engineer-anything (morluto/rea, MIT, v42) instalada em ~/.agents/skills
  (só instruções; MCP/engines NÃO instalados).

M3 — Melhorias usabilidade/visual (1-6):
  inline style="" → classes (.kbd/.kbd-gap/.dropdown-divider/#correlationMatrix/.chart-summary/.skeleton-line);
  router.js respeita prefers-reduced-motion; a11y serious FALHA (allowlist vazia);
  KPIs mobile 2 colunas (fit medido); item 4-5 verificados sem mudança.

M4 — P0 BOOT FIX (systematic-debugging):
  Root cause provado via V8 precise-coverage: brace do else faltando em renderEntries
  + `};` duplicado no tail → módulo morria em window.renderAssetReturns= (ReferenceError),
  init() nunca rodava, app sustentado por panels.js. Fix = 2 toques cirúrgicos.
  Latentes corrigidas: .table-wrapper rolável por teclado + contraste badges origem (pares AA).
  Validação: 0 pageerrors, 17/17 tabs, assetRows 37.

M5 — Home review (itens 1-4):
  Hero-card patrimônio + dataFreshnessLabel; 4 KPIs compactos (investido, resultado não realizado,
  proventos recebidos, proventos 12M); gráficos após hero; renderAlertBanners
  (desatualizado >30d, proventos parciais <50, concentração >30%, return12M null).
  Validação: a11y 14/14; suíte 79/85 (6 pré-existentes).

M6 — Tier 1 parcial:
  reduced-motion assert real (parseFloat p/ 1e-05s); gate node --check no CI; suíte completa executada.
  Skipped: remover unsafe-inline (pré-req: zerar 100+ style="" — missão separada).
  Novos métodos: benchmark-engine.backtest() e monte-carlo-engine.runStressTest() (T3-8/T3-9).
  Wired mas não conectados à UI (backtest/stress) — próxima missão.
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
1. COMMIT autorizado (4 commits ordenados, arquivos seletivos, Conventional Commits)
2. REMOTE GITHUB + PUSH + CI (validar gate node --check no workflow)
3. UI wiring dos novos métodos: backtest (aba Rentabilidade/Benchmarks) + stress test (aba Monte Carlo)
4. Home review itens 5-7: navegação mobile (scroll-snap hint), gráficos acessíveis (legenda+resumo
   por filtro), colunas mobile (cartões compactos ou aviso)
5. Corrigir 6 falhas pré-existentes (import-xlsx fixtures, panels fixed, test-isolated)
6. Missão unsafe-inline: zerar 100+ style="" inline → remover do CSP
```

---

## LAST UPDATED

```
DATE=2026-10-16
COMMIT=N/A (local only — 6 missões pendentes de autorização)
UPDATED_BY=Muse Spark (consolidação completa pós home review)
```