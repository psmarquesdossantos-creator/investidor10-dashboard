# SKILLS ROUTING — Investidor10 Dashboard

**Qual skill usar para cada tipo de tarefa. Consultar antes de iniciar missão.**

---

## AVAILABLE SKILLS (Descobertas no runtime atual)

> **Regra**: `AUTO_SKILL_DISCOVERY=true` — Sempre verificar `skill_view(name)` antes de assumir.

### DEFAULT SKILLS (OBRIGATÓRIAS INÍCIO DE TODA TAREFA)

| Skill | Quando Usar | Nível Default |
|-------|-------------|---------------|
| `caveman` | **Toda resposta** — compressão ultra, sem filler, só substância técnica | `full` |
| `ponytail` | **Todo código** — solução mais preguiçosa que funciona (YAGNI → stdlib → native → one-line) | `full` |
| `using-superpowers` | **Toda conversa** — estabelece regra de invocar skills ANTES de qualquer resposta | N/A |

### Process Skills (SEMPRE APÓS DEFAULT SKILLS)

| Skill | Quando Usar | Modelo |
|-------|-------------|--------|
| `brainstorming` | Antes de qualquer trabalho criativo (feature, componente, comportamento) | `nemotron-3-ultra` |
| `systematic-debugging` | Todo bug, teste falhando, comportamento inesperado (4 fases) | `nemotron-3-super` |
| `writing-plans` | Quando há spec/requisitos para tarefa multi-etapa | `nemotron-3-ultra` |
| `executing-plans` | Ao executar plano inline | `nemotron-3-ultra` |
| `doubt-driven-development` | Decisões de alto risco (dinheiro, matemática, produção) | `nemotron-3-ultra` |
| `verification-before-completion` | Antes de qualquer afirmação de "pronto" | `nemotron-3-ultra` |

### Ponytail Skills (ESPECIALIZADAS)

| Skill | Trigger | O que faz |
|-------|---------|-----------|
| `ponytail-review` | `/ponytail-review` | Review over-engineering: `L42: yagni: factory, one product. Inline.` |
| `ponytail-audit` | `/ponytail-audit` | Auditoria repo inteiro: lista rankeada do que deletar |
| `ponytail-debt` | `/ponytail-debt` | Colhe comentários `ponytail:` em ledger rastreado |
| `ponytail-gain` | `/ponytail-gain` | Scoreboard impacto medido: menos código, menos custo, mais velocidade |
| `ponytail-help` | `/ponytail-help` | Quick reference card |

### Implementation Skills (DEPOIS DO PROCESSO)

#### UI/UX/Design

| Skill | Domínio | Quando Usar |
|-------|---------|-------------|
| `impeccable` | UI principal — design system, tokens, componentes | Toda mudança visual |
| `frontend-design` | Direção visual intencional, hierarquia | Decisões de design |
| `ui-styling` | Componentes shadcn/acessíveis, tokens | Implementação CSS |
| `interface-design` | Fluxos de interação, estados | UX flows |
| `design-system` | Tokens (primitive→semantic→component) | Arquitetura de tokens |
| `ui-ux-pro-max` | Base de dados pesquisável de UI/UX | Referência de patterns |

#### Testes/Validação

| Skill | Domínio | Quando Usar |
|-------|---------|-------------|
| `test-driven-development` | RED-GREEN-REFACTOR, testes antes do código | Toda feature/bugfix |
| `playwright` | Automação browser no terminal | E2E tests |
| `browser-testing-with-devtools` | DOM, console, network real | Debug visual |
| `visual-verdict` | QA visual screenshot vs referência | Visual regression |
| `playwright-e2e-testing` | E2E em vanilla HTML/JS | Testes do projeto |

#### Código/Refatoração

| Skill | Domínio | Quando Usar |
|-------|---------|-------------|
| `safe-refactor` | Preservar comportamento | Refatoração grande |
| `surgical-patch` | Fix no menor escopo responsável | Bug fix localizado |
| `minimal-code-discipline` | YAGNI-ladder, menor diff correto | Qualquer mudança código |
| `receiving-code-review` | Ao receber feedback (rigor) | Pós-review |
| `requesting-code-review` | Ao completar task/feature | Pré-commit |

#### Dados/Documentos

| Skill | Domínio | Quando Usar |
|-------|---------|-------------|
| `xlsx` | .xlsx workbooks | Excel B3 |
| `pdf` | Criar/ler/OCR/editar PDFs | Extratos PDF |
| `ocr-and-documents` | pymupdf, marker-pdf | Extração tabelas |
| `agent-doc-discipline` | Docs que agentes consomem | Documentação técnica |
| `slides` | Apresentações HTML estratégicas | Decks |

#### Arquitetura/Diagramas

| Skill | Domínio | Quando Usar |
|-------|---------|-------------|
| `archify` | Diagramas HTML/SVG exploráveis | Arquitetura visual |
| `diagram` | Menor visual quando prose carrega estrutura | Fluxos simples |

---

## TASK TYPE → RECOMMENDED SKILLS (Roteamento Obrigatório)

```
NOVA_FEATURE (nova aba, gráfico, engine):
  1. brainstorming           → explorar intent
  2. writing-plans           → se multi-etapa, escrever plano
  3. impeccable              → design da interface
  4. test-driven-development → testes antes do código
  5. verification-before-completion → antes de declarar pronto

BUG / COMPORTAMENTO ESTRANHO:
  1. systematic-debugging    → 4 fases: entender antes de fixar
  2. investigate-first       → se causa desconhecida
  3. surgical-patch          → fix no menor escopo responsável

UI/DESIGN (estética, hierarquia, tokens, a11y):
  1. impeccable              → skill principal de UI
  2. frontend-design         → direção visual intencional
  3. ui-styling              → componentes acessíveis
  3. interface-design        → fluxos de interação
  4. design-system           → tokens
  5. ui-ux-pro-max           → base de dados UI/UX

TESTES / VALIDAÇÃO NO BROWSER:
  1. test-driven-development → RED-GREEN-REFACTOR
  2. browser-testing-with-devtools → DOM, console, network real
  3. playwright              → automação browser
  4. verification-before-completion → evidência antes de afirmar
  5. visual-verdict          → QA visual

REVISÃO DE CÓDIGO:
  1. requesting-code-review  → ao completar task/feature
  2. receiving-code-review   → ao receber feedback
  3. caveman-review          → review comprimido 1 linha/finding

REFACTORIZAÇÃO:
  1. safe-refactor           → preservar comportamento
  2. minimal-code-discipline → YAGNI-ladder
  3. surgical-patch          → mudança estreita

CÁLCULOS FINANCEIROS (TWR, XIRR, otimização):
  1. doubt-driven-development → revisão adversarial
  2. test-driven-development  → prova matemática antes

ARQUITETURA / DIAGRAMAS:
  1. archify                 → diagramas exploráveis
  2. diagram                 → menor visual

DOCUMENTAÇÃO:
  1. agent-doc-discipline    → docs para agentes
  2. slides                  → apresentações

PDF/EXCEL (extratos B3, proventos, posição):
  1. xlsx                    → .xlsx workbooks
  2. pdf                     → criar/ler/OCR/editar PDFs
  3. ocr-and-documents       → pymupdf, marker-pdf
```

---

## SKILL PRECEDENCE

```
PROJECT_RULES (AGENTS.md) > SKILLS
```

**Nunca** uma skill pode sobrescrever regra do projeto (ex: governance UNKNOWN≠ZERO).

---

## SKILL GAPS (Identificados)

| Gap | Impacto | Ação |
|-----|---------|------|
| Skill específica para "financial-data-governance" | Regras UNKNOWN≠ZERO, pipeline import | Usar `doubt-driven-development` + `agent-doc-discipline` |
| Skill para "vanilla-js-pwa-testing" | Testes PWA offline, sw.js | Usar `playwright-e2e-testing` + `browser-testing-with-devtools` |
| Skill para "chartjs-accessibility" | Chart.js textual summaries, aria | Usar `impeccable` + `ui-styling` |

---

## SKILLS NOT TO AUTO-INSTALL

```
- Marketing skills (ads, seo, cold-email, social, influencer...)
- Smart-home skills
- MLOps skills
- Email/github PR skills (exceto se pedido explícito)
- Obsidian skills
- Qualquer skill não listada acima
```

**Regra**: `AUTO_INSTALL_NEW_SKILLS=false` — Instalação só com autorização explícita.