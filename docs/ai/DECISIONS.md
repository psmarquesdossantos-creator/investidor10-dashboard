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

---

## 2026-10-16 — VISUAL_CANON regenerado a partir do código (código = verdade)

**CONTEXT**: VISUAL_CANON.md documentava namespace `--primary`/`--bg-*`/`--text-*` e "Dark Mode" como padrão; o `styles.css` real usa namespace `--color-*`, tema default light (Material) e dark via `@media (prefers-color-scheme: dark)` + `html[data-theme]`.
**DECISION**: Canon regenerado do `:root` real (styles.css:5-38, 107-184); decisão NEXT_STEP 2026-10-08 executada — código light/Material é a verdade, canon dark era ficção.
**WHY**:
- Canon que mente quebra qualquer manutenção futura (agente ou humano)
- Tokens `-text`/`-ink`/tags com ratios AA documentados no CSS viram referência oficial
- Tipografia real `--font-size-*` (0.7rem–1.875rem) substitui escala fictícia `--text-*`
**ALTERNATIVES_REJECTED**:
- Reescrever CSS para o canon antigo (risco alto, zero benefício)
**RISKS**: Nenhum — só documentação
**REVERSIBLE**: true
**RELATED_FILES**: docs/ai/VISUAL_CANON.md, styles.css
**RELATED_COMMIT**: N/A (uncommitted — commit pendente de autorização)
---

## 2026-10-16 � AUTH Phase 1: Multiuser REAL/DEMO/BLOCKED (P1�P35)

**CONTEXT**: Dono quer carteira na nuvem acess�vel de qualquer device; visitantes sem acesso real. Site est�tico, zero backend, dados reais sempre locais (gitignored).
**DECISION**: Firebase Auth (Google + e-mail/senha) via SDK compat UMD **vendorado** (vendor/firebase/, CSP `script-src 'self'` intacto); AUTHENTICATION ? AUTHORIZATION (P2) � allowlist Firestore `authorization/{uid}` = {email normalizado P15, enabled, role, blocked}, leitura s� do pr�prio uid, escrita deny p/ client (P16); resolu��o de modo no boot (P21/P22: INACTIVE?LOGIN?DEMO/REAL/BLOCKED, nada renderiza antes); **rules re-computam autoriza��o server-side via get()** (P5 � frontend forjado n�o passa); fail-closed: erro nunca resolve REAL (P24); dados UID-isolados `users/{uid}/portfolio/{section}` field-scoped (P6/P8); sync FirestoreRealDataSource (onSnapshot P7) + SyncHub no-op por padr�o; localhost bypass (CI/dev intactos � su�te verde sem Firebase).
**WHY**: requisitos P1�P35 do dono (chat 2026-10-16); zero-custo Spark (P30); demo nunca toca Firestore.
**ALTERNATIVES_REJECTED**: Supabase; claims via Admin SDK (exige fun��o/backend); hardcode allowlist no JS (P16).
**RISKS**: REAL path n�o exercitado contra Firebase vivo at� Fase 2 (config do dono); emulator rules tests bloqueados local (Java 8) � escritos p/ CI.
**REVERSIBLE**: true
**RELATED_FILES**: src/auth/*, firestore.rules, firebase.json, tests/rules/rules.test.cjs, tests/e2e/auth-gate.spec.js, docs/ai/FIREBASE_SETUP.md
**RELATED_COMMIT**: 153c5ad..f4b0984 (13 commits)

---

## 2026-10-16 � Vazamento de dados reais no repo: PURGE TOTAL (incidente)

**CONTEXT**: Arquivos com dados financeiros REAIS estavam commitados e p�blicos: carteira-data-backup-*.js (�2), carteira-data-real.json (3.7MB), parsed_data.json (3.7MB), generate_carteira_data*.py (�5). data.js NUNCA vazou (gitignored desde o in�cio).
**DECISION**: `git rm --cached` (locais preservados) + .gitignore ampliado + scrub de valores em docs/tests (valores esperados ? tests/e2e/real-data.values.local.json gitignored; real-data.spec pula sem o arquivo) + **filter-branch --index-filter em TODA a hist�ria** + force push. Forks: 0.
**WHY**: regra 7 AGENTS.md (NUNCA versionar dados financeiros); privacidade > continuidade de hashes.
**ALTERNATIVES_REJECTED**: s� remover do HEAD (hist�ria continuaria p�blica por SHA).
**RISKS**: RESIDUAL � GitHub serve objetos inalcan��veis por raw URL at� GC interno ? **a��o do dono: ticket support.github.com "remove sensitive data" OU delete+recreate** (PAT sem delete_repo). hashes antigos mudaram (mem�ria referencia os novos).
**REVERSIBLE**: false (hist�ria reescrita � backup local impl�cito: arquivos reais seguem no worktree + backup-pre-purge)
**RELATED_FILES**: .gitignore, tests/e2e/real-data.spec.js, docs/ai/PROJECT_STATE.md
**RELATED_COMMIT**: ce41446 (force), e87d7e2

---

## 2026-10-16 � Preview lock p�blico (produ��o sem Firebase ainda configurado)

**CONTEXT**: Sem firebase-config.js (Fase 2 pendente do dono), a produ��o renderizava o dataset legado realista (ativo legado, [valor financeiro redigido]k) para qualquer visitante sem login � parecia uma carteira real.
**DECISION**: Origem n�o-localhost + sem config ? **lock screen "Acesso restrito" + bot�o "Explorar demonstra��o"** (fixture sint�tica + badge P27). Form de login escondido nesse modo (sem Firebase n�o h� login real). CI/localhost continuam INACTIVE (fluxo atual, su�te verde).
**WHY**: P22 (nada antes da decis�o) + expectativa do dono "site com tela de login"; legado realista n�o pode passar por carteira verdadeira.
**ALTERNATIVES_REJECTED**: manter aberto at� Fase 2; for�ar login sem backend (imposs�vel).
**RISKS**: nenhum � dados reais nunca existem no host est�tico.
**REVERSIBLE**: true
**RELATED_FILES**: src/auth/auth-gate.js, index.html (#authDemoEntry), styles.css (data-authmode=preview)
**RELATED_COMMIT**: e87d7e2, validado por tests/e2e/live-prod.spec.js (4/4 na produ��o)

---

## 2026-10-17 � Classe Fundos end-to-end (fidelidade P0)

**CONTEXT**: Carteira real tem 2 fundos FIC (TRENDDI/TREND D2, ~13%); import B3 XLSX jogava o sheet "Fundos" inteiro em 'fiis' � fundo sumia da classe correta; I10 p�blico mostra "Fundos 16%".
**DECISION**: Heur�stica no posToCanonical: ticker termina em '11' OU nome FII/imobili�rio ? 'fiis', sen�o ? 'funds'. Classe funds propagada em TODOS os maps (writer cn/cc, classColorMap+CHART_COLORS.classFundos, getClassLabel, ptToCls rebalance, panels labels, demo fixture FUND1, sample FUND1).
**WHY**: diverg�ncia de relat�rio vs I10; agrupamento correto na home/posi��es.
**ALTERNATIVES_REJECTED**: classificar tudo como fundos (quebraria FIIs); campo manual.
**RISKS**: heur�stica erra nomes at�picos (edge raro, mitig�vel por alias manual).
**REVERSIBLE**: true
**RELATED_FILES**: real-mode.js (posToCanonical/ptToCls), script.js, panels.js, src/import-center/writer.js, src/auth/demo-fixture.js, carteira-data.sample.js
**RELATED_COMMIT**: a86034e � validado com dados reais: grupo Fundos 26 ativos (24 FII + 2 FIC) bate com I10

---

## 2026-10-17 � Organiza��o P1/P2/P4 (proventos, ordena��o, metas)

**CONTEXT**: Dono pediu "organiza��o em dividendos e ativos" + auditoria vs I10 apontou gaps.
**DECISION**: (P1) tabela **Proventos por ativo** (ticker, total, 12M, yield on cost, frequ�ncia, �ltimo � 132 tickers reais agregados) + **colunas orden�veis** th[data-sort] asc/desc com aria-sort dentro de cada grupo; (P2) **cards Aloca��o vs Meta** na home (badge Comprar/Vender/Meta �2pp, CSP-safe data-w) + **coluna Varia��o di�ria** via brapi regularMarketChangePercent ('�' honesto sem live prices); (P4) card **Independ�ncia pela Renda** em Metas (patrim�nio p/ renda-alvo com yield 12m).
**WHY**: pedido expl�cito + paridade I10 (colunas Varia��o/Nota/%ideal; nota I10 = dado propriet�rio � substitu�da por score/confian�a pr�prio).
**ALTERNATIVES_REJECTED**: agenda de proventos anunciados externa (sem API p�blica confi�vel � calend�rio Fase H + eventos corp cobrem futuros de import).
**RISKS**: sort mobile (cards) � teste skipa UX desktop-only.
**REVERSIBLE**: true
**RELATED_FILES**: script.js (renderEarningsByAsset/renderAllocationVsGoal/initPositionsSorting/dayChange), panels.js (renderGoals), index.html, styles.css, tests/e2e/organization.spec.js
**RELATED_COMMIT**: a86034e

---

## Privacidade da demonstração

A demonstração usa uma fixture sintética independente de arquivos locais. A fixture não imita a composição nem o histórico da carteira do proprietário.

## 2026-10-17 � Bug: renders usavam c�pia filtrada obsoleta (earnings/entries)

**CONTEXT**: renderEarnings/renderEntries renderizavam `filteredEarnings/Entries` (c�pia do parse-time) � abas exibiam dataset LEGADO mesmo ap�s applyRealData/gate (mascarado: testes s� exigiam "=1 row").
**DECISION**: Sync por troca de refer�ncia (`if (MOCK_DATA.x !== ref) ref=�; filtered=[...]; page=1`) � mesmo garantia que renderPositions (L1289) j� tinha. Detectado pelo teste demo-purity P26 (ativo legado no demo).
**WHY**: dados trocam ap�s import/gate; render nunca pode mostrar dados que n�o s�o a fonte atual (integridade > performance).
**ALTERNATIVES_REJECTED**: re-sync incondicional a cada render (quebraria filtros ativos).
**RISKS**: troca de dados reset filtros/pagina��o (aceit�vel � dado mudou por completo).
**REVERSIBLE**: true
**RELATED_FILES**: script.js (renderEarnings/renderEntries), tests/e2e/auth-gate.spec.js (purity)
**RELATED_COMMIT**: d9c0721
