# AGENTS.md — Investidor10 Dashboard

**Constituição operacional do projeto. Todo agente deve ler este arquivo primeiro.**

---

## 1. PROJECT IDENTITY GATE (OBRIGATÓRIO ANTES DE QUALQUER ESCRITA)

```bash
# Execute antes de qualquer alteração:
pwd
git rev-parse --show-toplevel 2>/dev/null || echo "NOT_A_GIT_REPO"
cat .project-identity
# Validar:
# WORKSPACE == G:\Meu Drive\Codex\investidor10-dashboard
# PROJECT_NAME == investidor10-dashboard
# REPOSITORY == psmarquesdossantos-creator/investidor10-dashboard
```

**Se mismatch → HUMAN_BLOCKER_WRONG_PROJECT → PARE IMEDIATAMENTE**

---

## 2. STARTUP PROTOCOL (Toda missão)

1. Validar identidade do projeto (gate acima)
2. **ATIVAR DEFAULT SKILLS (ordem fixa):**
   ```
   /caveman full
   /ponytail full
   skill_view(name='using-superpowers')
   ```
3. Ler `AGENTS.md` (este arquivo)
4. Ler `docs/ai/PROJECT_MEMORY.md`
5. Ler `docs/ai/PROJECT_STATE.md`
6. Ler `docs/ai/NEXT_STEP.md`
7. Ler `docs/ai/SKILLS_ROUTING.md`
8. Inspecionar código/testes físicos da área
9. Escolher skills adicionais (Process → Implementation)
10. Executar

---

## 3. ARQUIVOS CANÔNICOS (Single Source of Truth)

| Arquivo | Propósito | Atualização |
|---------|-----------|-------------|
| `.project-identity` | Identidade física do projeto | Raramente |
| `AGENTS.md` | Constituição operacional | Quando regras mudam |
| `docs/ai/PROJECT_MEMORY.md` | Memória durável entre sessões | Mudança arquitetural, feature relevante, bug crítico |
| `docs/ai/PROJECT_STATE.md` | Estado atual (phase, branch, head, blockers) | Fim de fase importante |
| `docs/ai/NEXT_STEP.md` | Próxima ação concreta | Fim de missão relevante |
| `docs/ai/SKILLS_ROUTING.md` | Skills disponíveis e roteamento | Nova skill ou mudança de roteamento |
| `docs/ai/DECISIONS.md` | Decisões arquiteturais/produto | Decisão importante |
| `docs/ai/VISUAL_CANON.md` | Padrão visual (tokens, componentes) | Mudança de design system |
| `docs/ai/TESTING_AND_RELEASE.md` | Comandos de teste, build, viewports | Mudança de pipeline |

---

## 4. ARQUIVOS PROTEGIDOS (Não tocar sem autorização explícita)

```
carteira-data.js          # Dados financeiros reais (local only; nunca publicar)
data.js                   # Dados legados (não modificar)
advanced-engine.js        # Engines core: ReturnEngine, SnapshotManager, RFConfidence, ImportPipeline, DataStates, A11y
rebalance-engine.js       # Solver de otimização (JS puro)
risk-engine.js            # VaR, Sharpe, Sortino, Calmar, MaxDD, Beta, Correlation
benchmark-engine.js       # 9 benchmarks via brapi.dev
monte-carlo-engine.js     # GBM, 10k paths, cone P10/P50/P90
tax-engine.js             # IRPF, DARF, GCAP, Carnê-Leão, XML
real-mode.js              # Integração e inicialização de painéis
script.js                 # Core UI, charts, state
styles.css                # Design system completo
index.html                # Aplicação SPA
serve.py                  # HTTP Server com CSP/Security headers
sw.js / manifest.json     # PWA
tests/e2e/*.spec.js       # Testes E2E (desktop/mobile/tablet)
playwright.config.js      # Config Playwright
```

---

## 5. REGRAS GIT

- **NUNCA**: `git reset --hard`, `git clean`, `git add .`, `git add -A`, `git push --force`
- **SEMPRE**: `git diff`, `git diff --cached`, `git status --short` antes de commit
- **STAGING**: Seletivo apenas (arquivos da missão)
- **COMMIT**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)

---

## 6. REGRAS DE WORKTREE

- Worktree física só enquanto ativamente necessária
- `MERGED + CLEAN + NO UNIQUE COMMITS` → remover worktree física
- Branch histórica não mergeada: não precisa pasta física (commits preservados)
- **NUNCA** apagar branch automaticamente

---

## 7. REGRAS DE DADOS SENSÍVEIS

- **NUNCA** versionar: tokens, senhas, API keys, cookies, backups reais com dados financeiros, .env, credenciais
- Test fixtures e exemplos públicos devem conter somente dados **sintéticos**
- `.vercelignore` protege deploys via CLI; deploys via Git dependem da árvore versionada e das configurações do Vercel
- Manter as exclusões do CLI alinhadas a dados locais, exports, uploads, documentos pessoais e segredos
- `vercel.json` deve usar allowlist estática explícita; deploy Git não é protegido por `.vercelignore`
- Executar E2E em cópia isolada sem carteira, config Firebase ou marcadores locais; nunca imprimir valores reais em logs
- Se houver dúvida sobre um artefato, excluí-lo da distribuição e interromper a publicação até validação
- Dados reais da carteira: `carteira-data.js` (local only, não commitado em repo público)

---

## 8. POLÍTICA DE TESTES

| Comando | Descrição |
|---------|-----------|
| `npx playwright test` | Todos (desktop + mobile + tablet) |
| `npx playwright test --project=desktop` | Desktop 1366x768 |
| `npx playwright test --project=mobile` | Mobile 390x844 |
| `npx playwright test --project=tablet` | Tablet 768x900 |
| `npx playwright show-report` | Relatório HTML |

**Meta**: 41/41 passing, axe critical=0

---

## 9. REGRAS DE QA VISUAL

- Validar: desktop (1366x768, 1920x1080) + mobile (390x844, 430x932) + tablet (768x900)
- Touch targets ≥44px
- Sem horizontal overflow
- Semântica: headings, focus-visible, textual chart summaries
- Animações: transform/opacity <300ms, `prefers-reduced-motion`

---

## 10. GOVERNANÇA DE DADOS (PRINCÍPIOS INQUEBRÁVEIS)

> **UNKNOWN ≠ ZERO** • **PARTIAL ≠ COMPLETE** • **STALE ≠ FRESH** • **ENGINE ≠ DATA_READY**

- Nunca inventar preços, histórico, benchmark, dividendos, rentabilidade
- Pipeline obrigatório: FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW → DEDUP → CONFIRM → WRITE
- Preview = obrigatório, writes = 0 antes da confirmação
- Snapshots determinísticos com hash de conteúdo
- Confidence scoring para RF (5 níveis: SUPPORTED/SHADOW/MANUAL/STALE/UNKNOWN)
- Acessibilidade: axe critical=0

---

## 11. POLÍTICA DE SKILLS

```
REGRA: MINIMUM_NECESSARY_SKILLS=true
Nova Skill só entra se:
  CURRENT_PROJECT_GAP=true
  MEASURABLE_WORKFLOW_BENEFIT=true
  LOW_OR_CONTROLLED_RISK=true
  NO_STRONG_EXISTING_EQUIVALENT=true

ZERO_NEW_SKILLS_IS_VALID=true
```

**DEFAULT SKILLS (OBRIGATÓRIAS INÍCIO DE TODA TAREFA):**
```
1. caveman (full)        → respostas ultra-comprimidas, sem filler
2. ponytail (full)       → solução mais preguiçosa que funciona (YAGNI → stdlib → native → one-line)
3. using-superpowers     → invoca skills relevantes ANTES de qualquer resposta
```

**Ordem de precedência**: PROJECT_RULES > DEFAULT_SKILLS > OTHER_SKILLS

**Roteamento obrigatório** (consultar `docs/ai/SKILLS_ROUTING.md`):
- Nova feature → brainstorming → writing-plans → impeccable → TDD → verification
- Bug → systematic-debugging → investigate-first → surgical-patch
- UI/Design → impeccable → frontend-design → ui-styling → interface-design
- Testes → TDD → playwright → browser-testing-with-devtools → verification
- Over-engineering review → ponytail-review
- Whole-repo audit → ponytail-audit
- Debt ledger → ponytail-debt
- Gain scoreboard → ponytail-gain

---

## 12. AGENTES / MODELOS NVIDIA NIM

| Tarefa | Modelo Recomendado |
|--------|-------------------|
| Raciocínio complexo / arquitetura | `nemotron-3-ultra-550b-a55b` |
| Edição localizada / refatoração simples | `nemotron-3-nano-30b-a3b` |
| Grandes bases de código (>100k) | `deepseek-v4-pro-0813` |
| Parsing PDF / tabelas | `nemotron-parse` + `paddleocr` |
| OCR imagens | `nemotron-ocr-v2` |
| Entendimento gráficos/screenshots | `nemotron-3-nano-omni-30b-a3b-reasoning` |
| Otimização carteira/rebalanceamento | `cuopt` |
| Workflow muitas tools | `mistral-nemotron` |
| Embeddings / busca semântica | `nemotron-3-embed-1b` |
| Rate limit fallback | `nemotron-3-nano-30b-a3b` |

**Framework de fallback**: `MODEL_FALLBACK_FRAMEWORK.md`

---

## 13. AUTONOMIA DO AGENTE

**Pode continuar sozinho em**:
- Auditoria read-only
- Testes, builds
- Documentação
- Safe refactors
- Screenshots
- Análise
- Validação não-destrutiva

**Deve parar e pedir autorização em**:
- Wrong project (gate falhou)
- Credenciais
- Ação destrutiva no filesystem
- Schema migration
- Mutação de dados financeiros
- History rewrite
- Force push
- Merge/deploy
- Produção mutation
- Dados sensíveis ambíguos
- Conflito de fonte canônica

---

## 14. COMANDOS DE DESENVOLVIMENTO

```bash
# Servidor seguro (CSP + Security Headers)
python serve.py
# http://localhost:8765

# Servidor simples
python -m http.server 8000
# http://localhost:8000

# Testes
npx playwright install  # primeira vez
npx playwright test
```

---

## 15. RELATÓRIO FINAL PADRÃO (Toda missão relevante)

```
MISSION=
STATUS=
PROJECT=investidor10-dashboard
WORKSPACE=G:\Meu Drive\Codex\investidor10-dashboard
SKILLS_USED=
FILES_CHANGED=
FILES_CREATED=
TESTS= (total/pass/fail)
BUILD=
VALIDATION=
BLOCKERS=
NEXT_SINGLE_BEST_ACTION=
PROJECT_MEMORY_UPDATED=
DECISIONS_UPDATED=
SKILLS_ROUTING_UPDATED=
```

---

## 16. RECUPERAÇÃO SEM CHAT

Se todo chat desaparecer:
1. Clone o repo correto
2. Valide remote/origin
3. Checkout main
4. Leia `.project-identity`
5. Rode identity gate
6. Leia `AGENTS.md` → `PROJECT_STATE.md` → `NEXT_STEP.md` → `PROJECT_MEMORY.md`
7. Continue a partir do estado canônico

---

**Última atualização**: 2026-09-28
**Versão**: 1.0
