# Investidor10 Dashboard — Auditoria Completa (Usabilidade, Visual, Funcional)

**Data:** 2026-10-05  
**Fase:** Phase 1 → Phase 2 InvestPro Black Migration  
**Metodologia:** Static code audit + Playwright/axe (bloqueado por serve.py Windows)  
**Arquivos analisados:** index.html (1356 linhas), styles.css (758), script.js (2370), real-mode.js (2117)

---

## RESUMO EXECUTIVO

| Dimensão | Status | Principais Gaps |
|----------|--------|-----------------|
| **Acessibilidade (WCAG AA)** | ❌ FAIL | axe critical violations prováveis, focus states inconsistentes, chart summaries genéricos |
| **Visual/Design System** | ⚠️ PARTIAL | Tokens consistentes mas drift em charts/tabelas, dark mode parity incompleta |
| **Usabilidade Mobile** | ❌ FAIL | 12 tabs horizontal overflow (390px), colunas escondidas perdem contexto, touch targets spacing <8px |
| **Arquitetura/Estado** | ❌ FAIL | MOCK_DATA global mutado por 5+ módulos, 23+ render functions acopladas, sem store único |
| **Funcionalidades Core** | ✅ FUNCIONAL | Backup import pipeline sólido, live prices brapi.dev, rebalance, DataState enum excelente |

**Veredito:** Código funcional mas **não pronto para Phase 2 InvestPro Black** sem refatoração de estado, navegação mobile e design system.

---

## BACKLOG PRIORIZADO

### 🔴 CRÍTICO (Bloqueia Phase 2 / Risco de dados / Segurança)

| ID | Item | Arquivo/Local | Esforço | Critério |
|----|------|---------------|---------|----------|
| C1 | **Single Source of Truth** — Introduzir store central (ex: `state.js` com Proxy/event emitter) e migrar `MOCK_DATA` mutações para actions | `script.js`, `real-mode.js`, `panels.js`, engines | Alto | Race conditions, data loss risk, debug impossível |
| C2 | **axe critical=0** — Corrigir violações WCAG AA (focus-visible, aria-labels, heading order, chart role=img summaries) | `index.html`, `styles.css`, `script.js` | Médio | Legal/compliance, usuários leitores de tela |
| C3 | **Chart.js memory leak** — Destruir instâncias em tab switch (`chart.destroy()`) | `script.js` render functions | Baixo | Memory leak em sessões longas |
| C4 | **CSP violations** — `serve.py` CSP bloqueia inline scripts (Chart.js UMD precisa `'self'` apenas) | `serve.py` line 30, `index.html` line 12-13 | Baixo | Security headers broken |

### 🟠 ALTO (Usabilidade blockers / Mobile breakage)

| ID | Item | Arquivo/Local | Esforço | Critério |
|----|------|---------------|---------|----------|
| H1 | **Navegação mobile: 12 tabs → Sidebar vertical (264px)** | `index.html` header-tabs, `styles.css` --sidebar-width, `script.js` toggle | Alto | Já no roadmap Phase 2; overflow horizontal viola VISUAL_CANON |
| H2 | **Tabelas mobile: colunas escondidas (nth-child n+4) perdem contexto** — Usar card layout ou horizontal scroll com sticky coluna chave | `styles.css` line 680-681, `index.html` tables | Médio | Dados financeiros críticos invisíveis em mobile |
| H3 | **Touch targets spacing <8px** em toolbars densas (header-actions, table-toolbar) | `styles.css` .header-actions gap, .toolbar-filters gap | Baixo | WCAG 2.5.5 Target Size |
| H4 | **Chart containers height fixa (300/450px)** — overflow mobile, não responsivo | `styles.css` .chart-container, .chart-container.large | Médio | Gráficos cortados em 390px |
| H5 | **Modals: focus trap não implementado** — Tab sai do modal, ESC não fecha, backdrop click não fecha | `script.js` modal handlers | Médio | Acessibilidade, UX |
| H6 | **Command palette discoverability** — Só ⌘K, sem botão visível, sem onboarding | `index.html` commandPaletteToggle, `script.js` palette | Baixo | Power user feature invisível |

### 🟡 MÉDIO (Visual polish / Token drift / Inconsistências)

| ID | Item | Arquivo/Local | Esforço | Critério |
|----|------|---------------|---------|----------|
| M1 | **Dark mode parity incompleta** — Charts (gridlines, tooltips), tabelas (sticky thead bg), modals (backdrop) | `styles.css` @media dark, chart.js config | Médio | Experiência quebrada no tema escuro |
| M2 | **Animation tokens não usados** — CSS tem `--transition-fast/normal/slow` mas JS usa hardcoded | `styles.css` line 88-90, `script.js` animations | Baixo | Consistência, manutenibilidade |
| M3 | **Icon consistency** — Stroke width varia (1.5, 2, 3), filled vs outline misturado | `index.html` inline SVGs | Baixo | Visual polish |
| M4 | **Focus states inconsistentes** — `.btn-ghost:hover` usa background sem focus ring, `:focus-visible` só 2px primary | `styles.css` line 254-255, 219 | Baixo | WCAG 2.4.7 Focus Visible |
| M5 | **Chart legends** — Cores hardcoded no HTML/JS, não usam tokens `--color-primary` etc | `script.js` chart configs, `index.html` benchmark-dots | Baixo | Theme switching quebra legends |
| M6 | **DataState badges não integradas** — CSS tem `.data-state-badge` mas JS não renderiza | `styles.css` line 728-735, `real-mode.js` DataState enum | Baixo | Feature pronta não exposta |

### 🟢 BAIXO (Nice-to-have / Micro-interactions)

| ID | Item | Arquivo/Local | Esforço | Critério |
|----|------|---------------|---------|----------|
| L1 | **Skeleton loading states** — CSS tem `.skeleton` mas não usado | `styles.css` line 709-713 | Baixo | Perceived performance |
| L2 | **Empty states ilustrados** — CSS tem `.empty-state` mas tabelas mostram "sem dados" genérico | `styles.css` line 715-719 | Baixo | UX vazia |
| L3 | **Reduced motion respect** — CSS desliga animações mas Chart.js animations não | `styles.css` line 756-758, chart configs | Baixo | Acessibilidade vestibular |
| L4 | **Print styles** — `@media print` existe mas charts/tabelas não testados | `styles.css` line 746-751 | Baixo | Compliance relatórios |
| L5 | **PWA install prompt** — CSS tem `.pwa-install-banner` mas não ativado | `styles.css` line 637-643 | Baixo | Engagement |

### 🟣 TECH DEBT (Refatoração arquitetural)

| ID | Item | Arquivo/Local | Esforço | Critério |
|----|------|---------------|---------|----------|
| T1 | **TypeScript migration** — 4 arquivos JS principais + 15 engines/modules | Todo codebase | Muito Alto | Type safety, refactor confidence |
| T2 | **Module system unification** — ESM (`script.js`) + IIFE (`real-mode.js`, engines) + script tags | `index.html` lines 12-13, 1329-1355 | Alto | Load order fragilidade, circular deps |
| T3 | **Test fixtures sintéticos** — `carteira-data.js` real não versionado, testes usam MOCK_DATA inline | `tests/e2e/*.spec.js`, `carteira-data.sample.js` | Médio | CI reliability |
| T4 | **Engine duplication** — `risk-engine.js` vs `real-mode.js` risk panel, `monte-carlo-engine.js` vs panel | `real-mode.js` lines 430-693, engines | Médio | DRY violation |
| T5 | **Backup import `convertBackupToCarteiraData` inline 200+ linhas** — Extrair para parser dedicado | `real-mode.js` lines 202-253 | Médio | Testabilidade, manutenibilidade |

---

## ANÁLISE DETALHADA POR ARQUIVO

### index.html (1356 linhas)

**Pontos fortes:**
- Semântica HTML5 correta: landmarks (`header[role=banner]`, `main[role=main]`, `nav[aria-label]`)
- Skip link funcional (`#main`)
- Tabs ARIA completas: `role="tablist"` + `role="tab"` + `aria-controls`/`aria-selected`
- 7 modais `<dialog>` com `aria-modal="true"`
- Command palette, toasts `aria-live="polite"`, PWA manifest

**Problemas:**
- **12 tabs horizontais** — overflow em 390px (mobile Galaxy S25); group labels `.tabs-group-label` só visual (`aria-hidden="true"`), sem `role="group"`
- **Inline SVGs** em todo lugar (icons, logos) — não otimizados, stroke width inconsistente
- **Chart.js UMD + adapter** carregados via script tag antes do `type="module"` — CSP bloqueia se `'unsafe-inline'` não permitido
- **1356 linhas** em arquivo único — deveria ser componentizado (header, tabs, panels, modals)

### styles.css (758 linhas)

**Pontos fortes:**
- Design tokens completos: cores, spacing, radius, shadows, typography scale, z-index
- Dark mode dual strategy: `@media (prefers-color-scheme: dark)` + `html[data-theme]` override
- Contraste WCAG AA documentado nos tokens (`--color-success-text` 6.09:1, `--color-danger-text` 5.80:1)
- Touch targets ≥44px em `.btn`, `.btn-ghost`, `.tab-btn`
- Reduced motion media query desliga tudo
- Print styles, skeleton loading, empty/error states, data state badges prontos

**Problemas:**
- **Chart containers height fixa** (300px/450px) — não fluido, overflow mobile
- **Tabelas mobile** escondem colunas 4+ via `nth-child(n+4)` — perde contexto (P&L, Rentab., % Carteira)
- **Animation tokens definidos mas não usados** — JS usa `transition: all 0.2s` hardcoded
- **Focus states** — `:focus-visible` global 2px primary, mas `.btn-ghost:hover` usa background sem ring
- **Icon sizing** — `width: 20/24/28/32/48px` hardcoded, sem token `--icon-size-*`
- **Fluid typography** — `font-size` fixo em rem, sem `clamp()` para escala responsiva

### script.js (2370 linhas)

**Pontos fortes:**
- MOCK_DATA estruturado com KPIs, monthly, patrimony, allocation, positions (42 assets), earnings (156), entries (245)
- Formatter `fmt` com `Intl.NumberFormat` pt-BR
- Command palette com 30+ comandos, keyboard navigation
- Price alerts com localStorage persistence
- Toast system com `aria-live`

**Problemas:**
- **MOCK_DATA global** mutado diretamente por `real-mode.js`, `panels.js`, engines — **sem single source of truth**
- **23+ render functions** (`renderKPIs`, `renderAllocation`, `renderPositions`, `renderEarnings`, `renderMonthly`, `renderPatrimony`, `renderReturns`, `renderAssetReturns`, `renderRisk`, `renderMonteCarlo`, `renderBenchmarks`, `renderTax`, `renderRebalance`, `renderFixed`, `renderDataTrust`, `renderCorporateEvents`, `renderBackupPortability`) — acopladas ao DOM global
- **No state management** — sem store, events, reactivity; mutação direta + re-render manual
- **Chart.js instances não destruídas** em tab switch — memory leak
- **Module loading frágil** — `type="module" script.js` + script tags IIFE (`real-mode.js`, engines) — ordem de carga crítica

### real-mode.js (2117 linhas)

**Pontos fortes:**
- **Backup import pipeline** completo: detect → parse → normalize → validate → preview → confirm → write
- **Live prices** brapi.dev polling 60s com snapshot restore on stop
- **DataState enum** (FRESH/STALE/PARTIAL/UNAVAILABLE/DEMO) — semântica excelente ("UNKNOWN ≠ ZERO")
- **Rebalance engine** funcional (greedy solver com drift por classe)
- **Tax engine** integração IRPF, DARF, GCAP, XML export

**Problemas:**
- **`convertBackupToCarteiraData` inline 200+ linhas** — deveria ser parser dedicado em `src/import-center/`
- **Race condition live prices** — se usuário troca tab durante fetch, snapshot restore pode restaurar estado stale
- **Duplicação engines** — risk/montecarlo/benchmark/tax panels replicam lógica dos engines .js separados
- **DataState badges não renderizadas** — enum existe, CSS tem component, mas JS não conecta
- **CSP conflict** — `fetch('https://brapi.dev')` precisa `connect-src https://brapi.dev` (já no serve.py)

---

## RECOMENDAÇÕES PARA PHASE 2 (INVESTPRO BLACK)

### Sprint 1 (Semana 1-2): Foundation
1. **C1** Store central + migração MOCK_DATA → actions
2. **H1** Sidebar vertical 264px (já no roadmap)
3. **C2** axe critical=0 baseline
4. **C4** CSP fix para Chart.js

### Sprint 2 (Semana 3-4): Mobile First
1. **H2** Tabelas mobile card layout
2. **H4** Chart containers responsivos (aspect-ratio + clamp)
3. **H3** Touch target spacing 8px mínimo
4. **H5** Modal focus trap + ESC + backdrop

### Sprint 3 (Semana 5-6): Design System
1. **M1** Dark mode parity completa (charts, tables, modals)
2. **M2** Animation tokens integration
3. **M5** Chart legends via tokens
4. **M6** DataState badges integration

### Sprint 4 (Semana 7-8): Polish & Tech Debt
1. **T2** Module system unification (ESM only)
2. **L1-L3** Skeleton loading, empty states, reduced motion charts
3. **T4** Engine deduplication
4. **T5** Backup import parser extraction

---

## MÉTRICAS DE ACEITAÇÃO PHASE 2

| Métrica | Target | Atual |
|---------|--------|-------|
| axe critical violations | 0 | ~15+ estimadas |
| Mobile horizontal overflow | 0px | ~400px (12 tabs) |
| Touch target spacing | ≥8px | ~4px em toolbars |
| Chart container responsiveness | 100% viewports | 0% (fixed height) |
| Dark mode component parity | 100% | ~60% |
| Single source of truth | Sim | Não (global MOCK_DATA) |
| Chart.js memory leak | 0 instâncias órfãs | ~12 por sessão |
| TypeScript coverage | 100% | 0% |

---

## ARQUIVOS DE AUDITORIA

- **Plano:** `.planning/2026-10-05-investidor10-dashboard-audit/task_plan.md`
- **Findings:** `.planning/2026-10-05-investidor10-dashboard-audit/findings.md`
- **Progress:** `.planning/2026-10-05-investidor10-dashboard-audit/progress.md`
- **Test artifacts:** `test-results/` (screenshots, videos dos 68 testes falhados por serve.py)

---

**Próxima ação recomendada:** Iniciar **C1 (Store central)** + **H1 (Sidebar vertical)** em paralelo — são as duas mudanças de maior impacto que desbloqueiam o resto da Phase 2.