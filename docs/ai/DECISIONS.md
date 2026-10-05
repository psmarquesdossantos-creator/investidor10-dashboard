# DECISIONS — Investidor10 Dashboard

**Registro de decisões arquiteturais/produto que não devem ser redescobertas.**

---

## 2026-09-27 — Vanilla HTML/CSS/JS (sem build step)

**CONTEXT**: Início do projeto, escolha de stack tecnológica.
**DECISION**: Usar vanilla HTML/CSS/JS (ES6 modules) via file:// ou python -m http.server. Zero build, zero dependencies, full control.
**WHY**: 
- Requisito do usuário: protótipos funcionais testáveis no browser
- File:// protocol deve funcionar
- Controle total sem toolchain complexa
- Deploy simples (arquivos estáticos)
**ALTERNATIVES_REJECTED**: React/Vite, Next.js, Svelte, Vue — todos requerem build step
**RISKS**: Nenhum risco técnico significativo para escopo do projeto
**REVERSIBLE**: true (mas custoso reescrever)
**RELATED_FILES**: index.html, script.js, styles.css, serve.py
**RELATED_COMMIT**: N/A (local only)

---

## 2026-09-27 — ThreadingHTTPServer em serve.py

**CONTEXT**: SimpleHTTPRequestHandler single-threaded travava/crashava sob carga paralela do Playwright (múltiplos browsers simultâneos).
**DECISION**: Migrar para ThreadingHTTPServer (multi-thread) em serve.py.
**WHY**: 
- Playwright roda testes em paralelo (desktop + mobile + tablet)
- Single-threaded não aguenta conexões simultâneas
- ThreadingHTTPServer nativo Python, sem deps extras
**ALTERNATIVES_REJECTED**: 
- Manter single-threaded + serializar testes (lento)
- uvicorn/fastapi (dependência externa)
- node/http-server (outro runtime)
**RISKS**: Threading pode ter edge cases em Windows, mas validado em 41/41 testes
**REVERSIBLE**: true
**RELATED_FILES**: serve.py
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — Governança de Dados: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE≠DATA_READY

**CONTEXT**: Projeto lida com dados financeiros reais; inventar zeros ou dados parciais como completos é perigoso.
**DECISION**: Codificar 4 princípios inquebráveis no código (advanced-engine.js: DataStates, RFConfidence, ImportPipeline) e na UI (badges, estados).
**WHY**: 
- Dados financeiros: UNKNOWN nunca pode virar 0 (esconde risco)
- Import pipeline: preview obrigatório, writes=0 antes de confirm
- Freshness: dados antigos ≠ dados atuais (STALE alert)
- Engine pronto ≠ dados prontos (confidence scoring separa)
**ALTERNATIVES_REJECTED**: 
- Tratar null como 0 (padrão JS)
- Assumir import completo se parser não erra
- Usar cache sem validar freshness
**RISKS**: Complexidade extra no pipeline, mas essencial para integridade financeira
**REVERSIBLE**: false (quebraria contratos de dados)
**RELATED_FILES**: advanced-engine.js, real-mode.js, styles.css (badges), index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — Azul #1A73E8 como Identidade Visual Corporativa

**CONTEXT**: Auditoria OpenCode sugeriu verde #22C55E; usuário rejeitou explicitamente.
**DECISION**: Manter Azul #1A73E8 como primary color em todo design system.
**WHY**: 
- Decisão do usuário (dono do produto)
- Azul transmite confiança, estabilidade, finanças corporativas
- Já aplicado em 17 tabs, charts, buttons, focus states
**ALTERNATIVES_REJECTED**: Verde #22C55E (sugestão auditoria), IBM Plex Sans (tipografia)
**RISKS**: Nenhum — preferência do usuário
**REVERSIBLE**: true (mas não solicitado)
**RELATED_FILES**: styles.css (--primary, --primary-hover, --focus-ring, chart colors)
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — Tabs Agrupadas em 4 Categorias (17 tabs total)

**CONTEXT**: 12 tabs originais + 5 novos centros = 17 tabs. Navbar horizontal não escala.
**DECISION**: Agrupar tabs em 4 categorias visuais com separadores ARIA-compliant:
1. Visão Geral (5 tabs)
2. Operações (4 tabs) 
3. Análise (5 tabs)
4. Centros Avançados (3 tabs)
**WHY**: 
- UX escalável para crescimento futuro
- Acessibilidade: role="tablist" + spans com aria-hidden="true" como separadores visuais
- Mobile: sidebar colapsável mantém navegação
**ALTERNATIVES_REJECTED**: 
- Scroll horizontal (quebra touch targets)
- Dropdown único (esconde opções)
- Duas linhas de tabs (visual clutter)
**RISKS**: CSS complexity moderada, mas validada em testes
**REVERSIBLE**: true
**RELATED_FILES**: index.html, styles.css, script.js (navigation)
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — Import Pipeline 12 Etapas (FILE→DETECT→PARSE→NORMALIZE→VALIDATE→PREVIEW→DEDUP→CONFIRM→WRITE)

**CONTEXT**: Múltiplas fontes de dados (B3 JSON/CSV, broker CSV, brapi.dev) com schemas diferentes.
**DECISION**: Pipeline atômico de 12 passos com preview obrigatório e writes=0 antes de confirm.
**WHY**: 
- Governança: PARTIAL≠COMPLETE, ENGINE≠DATA_READY
- Fingerprint SHA256 por conteúdo (não path) para dedup cross-computer
- Validação Zod-like antes de write
- Rollback suportado via snapshots
**ALTERNATIVES_REJECTED**: 
- Import direto sem preview (risco de corrupção)
- Merge automático sem dedup (duplicatas)
- Single parser para todos formatos (frágil)
**RISKS**: Complexidade, mas testado com fixtures B3 reais
**REVERSIBLE**: false (quebra contratos de import)
**RELATED_FILES**: advanced-engine.js (ImportPipeline), src/import-center/*, real-mode.js
**RELATED_COMMIT**: N/A

---

## 2026-09-28 — Corporate Events Engine (5 tipos: split, merge, bonus, subscription, amortization)

**CONTEXT**: Eventos corporativos alteram qty e preço médio; precisam de log, rollback, detecção B3.
**DECISION**: Engine dedicado (corporate-events.js) com auto-ajuste de qty/avgPrice, applied events log, rollback, B3 CSV detection.
**WHY**: 
- Separação de responsabilidades (não misturar com import pipeline)
- Auditoria: log imutável de eventos aplicados
- Rollback seguro para correção de erros
- Detecção automática em CSVs B3
**ALTERNATIVES_REJECTED**: 
- Lógica inline no import pipeline (acoplamento)
- Apenas registro manual sem auto-ajuste (propenso a erro)
**RISKS**: Complexidade matemática (split ratios, bonus calculations) — testado com dados reais
**REVERSIBLE**: true
**RELATED_FILES**: src/corporate-events/corporate-events.js, real-mode.js, index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-28 — Data Trust Center: Confidence Scoring por Asset+Source

**CONTEXT**: Dados vêm de fontes com confiabilidade diferente (B3=alta, broker=média, manual=baixa).
**DECISION**: Engine data-trust.js com confidence scoring (B3=1.0, brokers=0.85, manual=0.6), freshness states (FRESH/AGING/STALE/UNKNOWN), audit snapshots com hash verification, portfolio-level rollup.
**WHY**: 
- Estende RFConfidence (5 níveis) para nível portfolio
- Visual badges em tabelas (verde/amarelo/vermelho)
- Alertas de STALE/PARTIAL automáticos
- Snapshots determinísticos 365d com hash para integridade
**ALTERNATIVES_REJECTED**: 
- Confiança única por ativo (ignora fonte)
- Sem freshness check (dados velhos = atuais)
- Sem audit trail (não rastreável)
**RISKS**: Storage para snapshots, mas <1MB/ano
**REVERSIBLE**: true
**RELATED_FILES**: src/data-trust/data-trust.js, real-mode.js, index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-28 — Backup Portability: JSON/CSV/Excel + Schema Validation + Migration v1→v2

**CONTEXT**: Backup deve ser portável, versionado, validado, migratível.
**DECISION**: Engine backup-portability.js com:
- Export: JSON v2 (schema completo), CSV por tabela, Excel multi-sheet (SheetJS dynamic import)
- Import: Schema validation Zod-like, migration v1→v2 automática, integrity checks
- Testado restore completo
**WHY**: 
- Portabilidade: mesmo backup funciona em outro computador
- Versioning: v1→v2 migration automática
- Validação: reject corrupt/invalid backups antes de write
- Multi-formato: JSON (completo), CSV (análise), Excel (compartilhamento)
**ALTERNATIVES_REJECTED**: 
- Apenas JSON (não analisável em Excel)
- Sem versioning (break on schema change)
- Sem validação (corrupção silenciosa)
**RISKS**: SheetJS dynamic import (async), mas fallback graceful
**REVERSIBLE**: true
**RELATED_FILES**: src/backup-portability/backup-portability.js, index.html, real-mode.js
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — Test Strategy: Playwright + axe-core (41 tests, 3 viewports)

**CONTEXT**: Validação real no browser requerida pelo usuário.
**DECISION**: Playwright E2E com 3 projects (desktop 1366x768, mobile 390x844, tablet 768x900) + axe-core a11y (critical=0).
**WHY**: 
- Testes reais no browser (não jsdom)
- Multi-viewport valida responsividade real
- axe-core integrada no CI para a11y regressão
- 41 testes cobrem: smoke, tabs, import, a11y
**ALTERNATIVES_REJECTED**: 
- Jest + jsdom (não testa browser real)
- Cypress (mais pesado, menos flexível multi-viewport)
- Manual only (não regressível)
**RISKS**: Flaky tests (import.spec.js), server instability under load
**REVERSIBLE**: true
**RELATED_FILES**: tests/e2e/*.spec.js, playwright.config.js, package.json
**RELATED_COMMIT**: N/A

---

## 2026-09-27 — PWA Ready (sw.js + manifest.json)

**CONTEXT**: Usuário quer "site para lifetime use" — offline capability.
**DECISION**: Service Worker (cache-first static, network-first API) + manifest.json instalável + robots.txt privacy.
**WHY**: 
- Offline-first para uso vitalício
- Instalável como app nativo
- Cache versionado com cleanup
- Privacy: robots.txt bloqueia crawlers
**ALTERNATIVES_REJECTED**: 
- Sem PWA (requer conexão sempre)
- Workbox (dependência extra)
**RISKS**: SW lifecycle complexity, mas testado
**REVERSIBLE**: true
**RELATED_FILES**: sw.js, manifest.json, robots.txt, index.html
**RELATED_COMMIT**: N/A