# DECISIONS ‚Äî Investidor10 Dashboard

**Registro de decis√µes arquiteturais/produto que n√£o devem ser redescobertas.**

---

## 2026-09-27 ‚Äî Vanilla HTML/CSS/JS (sem build step)

**CONTEXT**: In√≠cio do projeto, escolha de stack tecnol√≥gica.
**DECISION**: Usar vanilla HTML/CSS/JS (ES6 modules) via file:// ou python -m http.server. Zero build, zero dependencies, full control.
**WHY**: 
- Requisito do usu√°rio: prot√≥tipos funcionais test√°veis no browser
- File:// protocol deve funcionar
- Controle total sem toolchain complexa
- Deploy simples (arquivos est√°ticos)
**ALTERNATIVES_REJECTED**: React/Vite, Next.js, Svelte, Vue ‚Äî todos requerem build step
**RISKS**: Nenhum risco t√©cnico significativo para escopo do projeto
**REVERSIBLE**: true (mas custoso reescrever)
**RELATED_FILES**: index.html, script.js, styles.css, serve.py
**RELATED_COMMIT**: N/A (local only)

---

## 2026-09-27 ‚Äî ThreadingHTTPServer em serve.py

**CONTEXT**: SimpleHTTPRequestHandler single-threaded travava/crashava sob carga paralela do Playwright (m√∫ltiplos browsers simult√¢neos).
**DECISION**: Migrar para ThreadingHTTPServer (multi-thread) em serve.py.
**WHY**: 
- Playwright roda testes em paralelo (desktop + mobile + tablet)
- Single-threaded n√£o aguenta conex√µes simult√¢neas
- ThreadingHTTPServer nativo Python, sem deps extras
**ALTERNATIVES_REJECTED**: 
- Manter single-threaded + serializar testes (lento)
- uvicorn/fastapi (depend√™ncia externa)
- node/http-server (outro runtime)
**RISKS**: Threading pode ter edge cases em Windows, mas validado em 41/41 testes
**REVERSIBLE**: true
**RELATED_FILES**: serve.py
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî Governan√ßa de Dados: UNKNOWN‚â†ZERO, PARTIAL‚â†COMPLETE, STALE‚â†FRESH, ENGINE‚â†DATA_READY

**CONTEXT**: Projeto lida com dados financeiros reais; inventar zeros ou dados parciais como completos √© perigoso.
**DECISION**: Codificar 4 princ√≠pios inquebr√°veis no c√≥digo (advanced-engine.js: DataStates, RFConfidence, ImportPipeline) e na UI (badges, estados).
**WHY**: 
- Dados financeiros: UNKNOWN nunca pode virar 0 (esconde risco)
- Import pipeline: preview obrigat√≥rio, writes=0 antes de confirm
- Freshness: dados antigos ‚â† dados atuais (STALE alert)
- Engine pronto ‚â† dados prontos (confidence scoring separa)
**ALTERNATIVES_REJECTED**: 
- Tratar null como 0 (padr√£o JS)
- Assumir import completo se parser n√£o erra
- Usar cache sem validar freshness
**RISKS**: Complexidade extra no pipeline, mas essencial para integridade financeira
**REVERSIBLE**: false (quebraria contratos de dados)
**RELATED_FILES**: advanced-engine.js, real-mode.js, styles.css (badges), index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî Azul #1A73E8 como Identidade Visual Corporativa

**CONTEXT**: Auditoria OpenCode sugeriu verde #22C55E; usu√°rio rejeitou explicitamente.
**DECISION**: Manter Azul #1A73E8 como primary color em todo design system.
**WHY**: 
- Decis√£o do usu√°rio (dono do produto)
- Azul transmite confian√ßa, estabilidade, finan√ßas corporativas
- J√° aplicado em 17 tabs, charts, buttons, focus states
**ALTERNATIVES_REJECTED**: Verde #22C55E (sugest√£o auditoria), IBM Plex Sans (tipografia)
**RISKS**: Nenhum ‚Äî prefer√™ncia do usu√°rio
**REVERSIBLE**: true (mas n√£o solicitado)
**RELATED_FILES**: styles.css (--primary, --primary-hover, --focus-ring, chart colors)
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî Tabs Agrupadas em 4 Categorias (17 tabs total)

**CONTEXT**: 12 tabs originais + 5 novos centros = 17 tabs. Navbar horizontal n√£o escala.
**DECISION**: Agrupar tabs em 4 categorias visuais com separadores ARIA-compliant:
1. Vis√£o Geral (5 tabs)
2. Opera√ß√µes (4 tabs) 
3. An√°lise (5 tabs)
4. Centros Avan√ßados (3 tabs)
**WHY**: 
- UX escal√°vel para crescimento futuro
- Acessibilidade: role="tablist" + spans com aria-hidden="true" como separadores visuais
- Mobile: sidebar colaps√°vel mant√©m navega√ß√£o
**ALTERNATIVES_REJECTED**: 
- Scroll horizontal (quebra touch targets)
- Dropdown √∫nico (esconde op√ß√µes)
- Duas linhas de tabs (visual clutter)
**RISKS**: CSS complexity moderada, mas validada em testes
**REVERSIBLE**: true
**RELATED_FILES**: index.html, styles.css, script.js (navigation)
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî Import Pipeline 12 Etapas (FILE‚ÜíDETECT‚ÜíPARSE‚ÜíNORMALIZE‚ÜíVALIDATE‚ÜíPREVIEW‚ÜíDEDUP‚ÜíCONFIRM‚ÜíWRITE)

**CONTEXT**: M√∫ltiplas fontes de dados (B3 JSON/CSV, broker CSV, brapi.dev) com schemas diferentes.
**DECISION**: Pipeline at√¥mico de 12 passos com preview obrigat√≥rio e writes=0 antes de confirm.
**WHY**: 
- Governan√ßa: PARTIAL‚â†COMPLETE, ENGINE‚â†DATA_READY
- Fingerprint SHA256 por conte√∫do (n√£o path) para dedup cross-computer
- Valida√ß√£o Zod-like antes de write
- Rollback suportado via snapshots
**ALTERNATIVES_REJECTED**: 
- Import direto sem preview (risco de corrup√ß√£o)
- Merge autom√°tico sem dedup (duplicatas)
- Single parser para todos formatos (fr√°gil)
**RISKS**: Complexidade, mas testado com fixtures B3 reais
**REVERSIBLE**: false (quebra contratos de import)
**RELATED_FILES**: advanced-engine.js (ImportPipeline), src/import-center/*, real-mode.js
**RELATED_COMMIT**: N/A

---

## 2026-09-28 ‚Äî Corporate Events Engine (5 tipos: split, merge, bonus, subscription, amortization)

**CONTEXT**: Eventos corporativos alteram qty e pre√ßo m√©dio; precisam de log, rollback, detec√ß√£o B3.
**DECISION**: Engine dedicado (corporate-events.js) com auto-ajuste de qty/avgPrice, applied events log, rollback, B3 CSV detection.
**WHY**: 
- Separa√ß√£o de responsabilidades (n√£o misturar com import pipeline)
- Auditoria: log imut√°vel de eventos aplicados
- Rollback seguro para corre√ß√£o de erros
- Detec√ß√£o autom√°tica em CSVs B3
**ALTERNATIVES_REJECTED**: 
- L√≥gica inline no import pipeline (acoplamento)
- Apenas registro manual sem auto-ajuste (propenso a erro)
**RISKS**: Complexidade matem√°tica (split ratios, bonus calculations) ‚Äî testado com dados reais
**REVERSIBLE**: true
**RELATED_FILES**: src/corporate-events/corporate-events.js, real-mode.js, index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-28 ‚Äî Data Trust Center: Confidence Scoring por Asset+Source

**CONTEXT**: Dados v√™m de fontes com confiabilidade diferente (B3=alta, broker=m√©dia, manual=baixa).
**DECISION**: Engine data-trust.js com confidence scoring (B3=1.0, brokers=0.85, manual=0.6), freshness states (FRESH/AGING/STALE/UNKNOWN), audit snapshots com hash verification, portfolio-level rollup.
**WHY**: 
- Estende RFConfidence (5 n√≠veis) para n√≠vel portfolio
- Visual badges em tabelas (verde/amarelo/vermelho)
- Alertas de STALE/PARTIAL autom√°ticos
- Snapshots determin√≠sticos 365d com hash para integridade
**ALTERNATIVES_REJECTED**: 
- Confian√ßa √∫nica por ativo (ignora fonte)
- Sem freshness check (dados velhos = atuais)
- Sem audit trail (n√£o rastre√°vel)
**RISKS**: Storage para snapshots, mas <1MB/ano
**REVERSIBLE**: true
**RELATED_FILES**: src/data-trust/data-trust.js, real-mode.js, index.html
**RELATED_COMMIT**: N/A

---

## 2026-09-28 ‚Äî Backup Portability: JSON/CSV/Excel + Schema Validation + Migration v1‚Üív2

**CONTEXT**: Backup deve ser port√°vel, versionado, validado, migrat√≠vel.
**DECISION**: Engine backup-portability.js com:
- Export: JSON v2 (schema completo), CSV por tabela, Excel multi-sheet (SheetJS dynamic import)
- Import: Schema validation Zod-like, migration v1‚Üív2 autom√°tica, integrity checks
- Testado restore completo
**WHY**: 
- Portabilidade: mesmo backup funciona em outro computador
- Versioning: v1‚Üív2 migration autom√°tica
- Valida√ß√£o: reject corrupt/invalid backups antes de write
- Multi-formato: JSON (completo), CSV (an√°lise), Excel (compartilhamento)
**ALTERNATIVES_REJECTED**: 
- Apenas JSON (n√£o analis√°vel em Excel)
- Sem versioning (break on schema change)
- Sem valida√ß√£o (corrup√ß√£o silenciosa)
**RISKS**: SheetJS dynamic import (async), mas fallback graceful
**REVERSIBLE**: true
**RELATED_FILES**: src/backup-portability/backup-portability.js, index.html, real-mode.js
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî Test Strategy: Playwright + axe-core (41 tests, 3 viewports)

**CONTEXT**: Valida√ß√£o real no browser requerida pelo usu√°rio.
**DECISION**: Playwright E2E com 3 projects (desktop 1366x768, mobile 390x844, tablet 768x900) + axe-core a11y (critical=0).
**WHY**: 
- Testes reais no browser (n√£o jsdom)
- Multi-viewport valida responsividade real
- axe-core integrada no CI para a11y regress√£o
- 41 testes cobrem: smoke, tabs, import, a11y
**ALTERNATIVES_REJECTED**: 
- Jest + jsdom (n√£o testa browser real)
- Cypress (mais pesado, menos flex√≠vel multi-viewport)
- Manual only (n√£o regress√≠vel)
**RISKS**: Flaky tests (import.spec.js), server instability under load
**REVERSIBLE**: true
**RELATED_FILES**: tests/e2e/*.spec.js, playwright.config.js, package.json
**RELATED_COMMIT**: N/A

---

## 2026-09-27 ‚Äî PWA Ready (sw.js + manifest.json)

**CONTEXT**: Usu√°rio quer "site para lifetime use" ‚Äî offline capability.
**DECISION**: Service Worker (cache-first static, network-first API) + manifest.json instal√°vel + robots.txt privacy.
**WHY**: 
- Offline-first para uso vital√≠cio
- Instal√°vel como app nativo
- Cache versionado com cleanup
- Privacy: robots.txt bloqueia crawlers
**ALTERNATIVES_REJECTED**: 
- Sem PWA (requer conex√£o sempre)
- Workbox (depend√™ncia extra)
**RISKS**: SW lifecycle complexity, mas testado
**REVERSIBLE**: true
**RELATED_FILES**: sw.js, manifest.json, robots.txt, index.html
**RELATED_COMMIT**: N/A

---

## 2026-10-16 ‚Äî VISUAL_CANON regenerado a partir do c√≥digo (c√≥digo = verdade)

**CONTEXT**: VISUAL_CANON.md documentava namespace `--primary`/`--bg-*`/`--text-*` e "Dark Mode" como padr√£o; o `styles.css` real usa namespace `--color-*`, tema default light (Material) e dark via `@media (prefers-color-scheme: dark)` + `html[data-theme]`.
**DECISION**: Canon regenerado do `:root` real (styles.css:5-38, 107-184); decis√£o NEXT_STEP 2026-10-08 executada ‚Äî c√≥digo light/Material √© a verdade, canon dark era fic√ß√£o.
**WHY**:
- Canon que mente quebra qualquer manuten√ß√£o futura (agente ou humano)
- Tokens `-text`/`-ink`/tags com ratios AA documentados no CSS viram refer√™ncia oficial
- Tipografia real `--font-size-*` (0.7rem‚Äì1.875rem) substitui escala fict√≠cia `--text-*`
**ALTERNATIVES_REJECTED**:
- Reescrever CSS para o canon antigo (risco alto, zero benef√≠cio)
**RISKS**: Nenhum ‚Äî s√≥ documenta√ß√£o
**REVERSIBLE**: true
**RELATED_FILES**: docs/ai/VISUAL_CANON.md, styles.css
**RELATED_COMMIT**: N/A (uncommitted ‚Äî commit pendente de autoriza√ß√£o)
---

## 2026-10-16 ó AUTH Phase 1: Multiuser REAL/DEMO/BLOCKED (P1ñP35)

**CONTEXT**: Dono quer carteira na nuvem acessÌvel de qualquer device; visitantes sem acesso real. Site est·tico, zero backend, dados reais sempre locais (gitignored).
**DECISION**: Firebase Auth (Google + e-mail/senha) via SDK compat UMD **vendorado** (vendor/firebase/, CSP `script-src 'self'` intacto); AUTHENTICATION ? AUTHORIZATION (P2) ó allowlist Firestore `authorization/{uid}` = {email normalizado P15, enabled, role, blocked}, leitura sÛ do prÛprio uid, escrita deny p/ client (P16); resoluÁ„o de modo no boot (P21/P22: INACTIVE?LOGIN?DEMO/REAL/BLOCKED, nada renderiza antes); **rules re-computam autorizaÁ„o server-side via get()** (P5 ó frontend forjado n„o passa); fail-closed: erro nunca resolve REAL (P24); dados UID-isolados `users/{uid}/portfolio/{section}` field-scoped (P6/P8); sync FirestoreRealDataSource (onSnapshot P7) + SyncHub no-op por padr„o; localhost bypass (CI/dev intactos ó suÌte verde sem Firebase).
**WHY**: requisitos P1ñP35 do dono (chat 2026-10-16); zero-custo Spark (P30); demo nunca toca Firestore.
**ALTERNATIVES_REJECTED**: Supabase; claims via Admin SDK (exige funÁ„o/backend); hardcode allowlist no JS (P16).
**RISKS**: REAL path n„o exercitado contra Firebase vivo atÈ Fase 2 (config do dono); emulator rules tests bloqueados local (Java 8) ó escritos p/ CI.
**REVERSIBLE**: true
**RELATED_FILES**: src/auth/*, firestore.rules, firebase.json, tests/rules/rules.test.cjs, tests/e2e/auth-gate.spec.js, docs/ai/FIREBASE_SETUP.md
**RELATED_COMMIT**: 153c5ad..f4b0984 (13 commits)

---

## 2026-10-16 ó Vazamento de dados reais no repo: PURGE TOTAL (incidente)

**CONTEXT**: Arquivos com dados financeiros REAIS estavam commitados e p˙blicos: carteira-data-backup-*.js (◊2), carteira-data-real.json (3.7MB), parsed_data.json (3.7MB), generate_carteira_data*.py (◊5). data.js NUNCA vazou (gitignored desde o inÌcio).
**DECISION**: `git rm --cached` (locais preservados) + .gitignore ampliado + scrub de valores em docs/tests (valores esperados ? tests/e2e/real-data.values.local.json gitignored; real-data.spec pula sem o arquivo) + **filter-branch --index-filter em TODA a histÛria** + force push. Forks: 0.
**WHY**: regra 7 AGENTS.md (NUNCA versionar dados financeiros); privacidade > continuidade de hashes.
**ALTERNATIVES_REJECTED**: sÛ remover do HEAD (histÛria continuaria p˙blica por SHA).
**RISKS**: RESIDUAL ó GitHub serve objetos inalcanÁ·veis por raw URL atÈ GC interno ? **aÁ„o do dono: ticket support.github.com "remove sensitive data" OU delete+recreate** (PAT sem delete_repo). hashes antigos mudaram (memÛria referencia os novos).
**REVERSIBLE**: false (histÛria reescrita ó backup local implÌcito: arquivos reais seguem no worktree + backup-pre-purge)
**RELATED_FILES**: .gitignore, tests/e2e/real-data.spec.js, docs/ai/PROJECT_STATE.md
**RELATED_COMMIT**: ce41446 (force), e87d7e2

---

## 2026-10-16 ó Preview lock p˙blico (produÁ„o sem Firebase ainda configurado)

**CONTEXT**: Sem firebase-config.js (Fase 2 pendente do dono), a produÁ„o renderizava o dataset legado realista (PETR4, R$ 686k) para qualquer visitante sem login ó parecia uma carteira real.
**DECISION**: Origem n„o-localhost + sem config ? **lock screen "Acesso restrito" + bot„o "Explorar demonstraÁ„o"** (fixture sintÈtica + badge P27). Form de login escondido nesse modo (sem Firebase n„o h· login real). CI/localhost continuam INACTIVE (fluxo atual, suÌte verde).
**WHY**: P22 (nada antes da decis„o) + expectativa do dono "site com tela de login"; legado realista n„o pode passar por carteira verdadeira.
**ALTERNATIVES_REJECTED**: manter aberto atÈ Fase 2; forÁar login sem backend (impossÌvel).
**RISKS**: nenhum ó dados reais nunca existem no host est·tico.
**REVERSIBLE**: true
**RELATED_FILES**: src/auth/auth-gate.js, index.html (#authDemoEntry), styles.css (data-authmode=preview)
**RELATED_COMMIT**: e87d7e2, validado por tests/e2e/live-prod.spec.js (4/4 na produÁ„o)

---

## 2026-10-17 ó Classe Fundos end-to-end (fidelidade P0)

**CONTEXT**: Carteira real tem 2 fundos FIC (TRENDDI/TREND D2, ~13%); import B3 XLSX jogava o sheet "Fundos" inteiro em 'fiis' ó fundo sumia da classe correta; I10 p˙blico mostra "Fundos 16%".
**DECISION**: HeurÌstica no posToCanonical: ticker termina em '11' OU nome FII/imobili·rio ? 'fiis', sen„o ? 'funds'. Classe funds propagada em TODOS os maps (writer cn/cc, classColorMap+CHART_COLORS.classFundos, getClassLabel, ptToCls rebalance, panels labels, demo fixture FUND1, sample FUND1).
**WHY**: divergÍncia de relatÛrio vs I10; agrupamento correto na home/posiÁıes.
**ALTERNATIVES_REJECTED**: classificar tudo como fundos (quebraria FIIs); campo manual.
**RISKS**: heurÌstica erra nomes atÌpicos (edge raro, mitig·vel por alias manual).
**REVERSIBLE**: true
**RELATED_FILES**: real-mode.js (posToCanonical/ptToCls), script.js, panels.js, src/import-center/writer.js, src/auth/demo-fixture.js, carteira-data.sample.js
**RELATED_COMMIT**: a86034e ó validado com dados reais: grupo Fundos 26 ativos (24 FII + 2 FIC) bate com I10

---

## 2026-10-17 ó OrganizaÁ„o P1/P2/P4 (proventos, ordenaÁ„o, metas)

**CONTEXT**: Dono pediu "organizaÁ„o em dividendos e ativos" + auditoria vs I10 apontou gaps.
**DECISION**: (P1) tabela **Proventos por ativo** (ticker, total, 12M, yield on cost, frequÍncia, ˙ltimo ó 132 tickers reais agregados) + **colunas orden·veis** th[data-sort] asc/desc com aria-sort dentro de cada grupo; (P2) **cards AlocaÁ„o vs Meta** na home (badge Comprar/Vender/Meta ±2pp, CSP-safe data-w) + **coluna VariaÁ„o di·ria** via brapi regularMarketChangePercent ('ó' honesto sem live prices); (P4) card **IndependÍncia pela Renda** em Metas (patrimÙnio p/ renda-alvo com yield 12m).
**WHY**: pedido explÌcito + paridade I10 (colunas VariaÁ„o/Nota/%ideal; nota I10 = dado propriet·rio ó substituÌda por score/confianÁa prÛprio).
**ALTERNATIVES_REJECTED**: agenda de proventos anunciados externa (sem API p˙blica confi·vel ó calend·rio Fase H + eventos corp cobrem futuros de import).
**RISKS**: sort mobile (cards) ó teste skipa UX desktop-only.
**REVERSIBLE**: true
**RELATED_FILES**: script.js (renderEarningsByAsset/renderAllocationVsGoal/initPositionsSorting/dayChange), panels.js (renderGoals), index.html, styles.css, tests/e2e/organization.spec.js
**RELATED_COMMIT**: a86034e

---

## 2026-10-17 ó Demo espelha o PERFIL do dono, total fictÌcio R$ 30.000

**CONTEXT**: Dono: "demo deve parecer o que tenho, mas 100% fictÌcia, total ~R$ 30.000 apenas para demonstraÁ„o".
**DECISION**: Fixture com 37 ativos espelhando a ESTRUTURA real (7 aÁıes, 24 FIIs, 4 RF, 1 fundo, 1 cripto, caixa), proventos mensais (173 eventos fictÌcios), **escala proporcional determinÌstica por classe** (FIIs 46% ∑ RF 24% ∑ fundos 13% ∑ aÁıes 10% ∑ cripto 0,2%) + **caixa absorvedora** p/ total exato 30000.00. Tickers D-prefix/gregos; ZERO valores/nomes reais (P26).
**WHY**: demo realista no funcionamento (renda mensal FII-heavy) sem vazar nada.
**ALTERNATIVES_REJECTED**: valores prÛximos dos reais (viola P26 e o pedido "claramente demo").
**RISKS**: colis„o coincidental de ticker com FII real existente (inofensivo ó badge MODO DEMONSTRA«√O + valores fictÌcios).
**REVERSIBLE**: true
**RELATED_FILES**: src/auth/demo-fixture.js, tests/e2e/auth-gate.spec.js, tests/e2e/live-prod.spec.js
**RELATED_COMMIT**: a82ce01

---

## 2026-10-17 ó Bug: renders usavam cÛpia filtrada obsoleta (earnings/entries)

**CONTEXT**: renderEarnings/renderEntries renderizavam `filteredEarnings/Entries` (cÛpia do parse-time) ó abas exibiam dataset LEGADO mesmo apÛs applyRealData/gate (mascarado: testes sÛ exigiam "=1 row").
**DECISION**: Sync por troca de referÍncia (`if (MOCK_DATA.x !== ref) ref=Ö; filtered=[...]; page=1`) ó mesmo garantia que renderPositions (L1289) j· tinha. Detectado pelo teste demo-purity P26 (PETR4 no demo).
**WHY**: dados trocam apÛs import/gate; render nunca pode mostrar dados que n„o s„o a fonte atual (integridade > performance).
**ALTERNATIVES_REJECTED**: re-sync incondicional a cada render (quebraria filtros ativos).
**RISKS**: troca de dados reset filtros/paginaÁ„o (aceit·vel ó dado mudou por completo).
**REVERSIBLE**: true
**RELATED_FILES**: script.js (renderEarnings/renderEntries), tests/e2e/auth-gate.spec.js (purity)
**RELATED_COMMIT**: d9c0721
