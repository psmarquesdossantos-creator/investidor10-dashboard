# 📚 PLAYBOOK DE SKILLS — Projeto Investidor10 Dashboard
**Regra #1 (using-superpowers): Toda tarefa começa com skill_view(name) ANTES de qualquer resposta ou ação.**
Se houver 1% de chance de uma skill aplicar → ela DEVE ser invocada. Skills de processo vêm antes; skills de implementação vêm depois.

---

## 🗺️ MAPA: Necessidade do Projeto → Skill → Modelo NVIDIA

### 1. NOVA FEATURE (ex: nova aba, novo gráfico)
```
Ordem obrigatória:
1. skill_view(name='brainstorming')          → explorar intent antes de criar (processo)
2. skill_view(name='writing-plans')            → se multi-etapa, escrever plano
3. skill_view(name='impeccable')               → design da interface
4. skill_view(name='test-driven-development')  → testes antes do código
5. skill_view(name='verification-before-completion') → antes de declarar pronto

Modelo: nemotron-3-ultra (feature complexa) | nemotron-3-nano (simples)
```

### 2. BUG / COMPORTAMENTO ESTRANHO
```
1. skill_view(name='systematic-debugging')     → 4 fases: entender antes de fixar
2. skill_view(name='investigate-first')        → se causa desconhecida
3. skill_view(name='surgical-patch')           → fix no menor escopo responsável

Modelo: nemotron-3-super-120b (raciocínio rápido com precisão)
```

### 3. UI/DESIGN (estética, hierarquia, tokens, acessibilidade)
```
1. skill_view(name='impeccable')               → skill principal de UI
2. skill_view(name='frontend-design')          → direção visual intencional
3. skill_view(name='ui-styling')               → componentes shadcn/acessíveis
4. skill_view(name='interface-design')         → fluxos de interação
5. skill_view(name='design-system')            → tokens (primitive→semantic→component)
6. skill_view(name='ui-ux-pro-max')            → base de dados pesquisável de UI/UX

Modelo: nemotron-3-nano-omni (screenshots) | nemotron-3-ultra (decisões)
```

### 4. PDF/EXCEL (extratos B3, proventos, posição)
```
1. skill_view(name='xlsx')                     → .xlsx workbooks
2. skill_view(name='pdf')                      → criar/ler/OCR/editar PDFs
3. skill_view(name='ocr-and-documents')         → pymupdf, marker-pdf

Modelo NVIDIA: nemotron-parse (texto+metadata de imagens)
              paddleocr (tabelas estruturadas + bounding boxes)
              nemotron-table-structure-v1 (detectar tabelas em docs)
```

### 5. TESTES / VALIDAÇÃO NO BROWSER
```
1. skill_view(name='test-driven-development')  → RED-GREEN-REFACTOR
2. skill_view(name='browser-testing-with-devtools') → DOM, console, network real
3. skill_view(name='playwright')               → automação de browser no terminal
4. skill_view(name='verification-before-completion') → evidência antes de afirmar
5. skill_view(name='visual-verdict')           → QA visual screenshot vs referência

Modelo: nemotron-3-nano-omni (análise de screenshot) | axe via playwright
```

### 6. REVISÃO DE CÓDIGO
```
1. skill_view(name='requesting-code-review')   → ao completar task/feature
2. skill_view(name='receiving-code-review')    → ao receber feedback (rigor, não concordância performática)
3. skill_view(name='caveman-review')           → review comprimido 1 linha/finding

Modelo: nemotron-3-ultra (review completo) | deepseek-v4-pro (diffs grandes)
```

### 7. REFACTORIZAÇÃO
```
1. skill_view(name='safe-refactor')            → preservar comportamento
2. skill_view(name='minimal-code-discipline')  → YAGNI-ladder, menor diff correto
3. skill_view(name='surgical-patch')           → mudança estreita

Modelo: deepseek-v4-pro (multi-arquivo) | nemotron-3-nano (localizado)
```

### 8. CÁLCULOS FINANCEIROS (TWR, XIRR, otimização)
```
1. skill_view(name='doubt-driven-development') → revisão adversarial de decisões não-triviais
2. skill_view(name='test-driven-development')  → prova matemática antes

Modelo: nemotron-3-ultra (matemática) | cuopt (otimização de carteira/rebalanceamento)
```

### 9. ARQUITETURA / DIAGRAMAS
```
1. skill_view(name='archify')                  → diagramas HTML/SVG exploráveis
2. skill_view(name='diagram')                  → menor visual quando prose carrega estrutura

Modelo: nemotron-3-ultra
```

### 10. DOCUMENTAÇÃO
```
1. skill_view(name='agent-doc-discipline')     → docs que agentes consomem
2. skill_view(name='slides')                   → apresentações HTML estratégicas

Modelo: nemotron-3-super (estrutura) | nemotron-3-embed-1b (RAG)
```

---

## 🔄 PIPELINE PADRÃO DO PROJETO (fluxo recomendado)

```
NECESSIDADE
  → skill_view(brainstorming)          [se feature nova]
  → skill_view(writing-plans)          [se multi-etapa]
  → IMPLEMENTAÇÃO (impeccable + TDD)
  → skill_view(requesting-code-review)
  → skill_view(verification-before-completion)
  → ENTREGA (evidência real, nunca promessa)
```

## 🧩 SKILLS DE PROCESSO (sempre primeiro)
| Skill | Quando |
|-------|--------|
| `using-superpowers` | toda conversa — estabelece a regra de invocar skills |
| `brainstorming` | antes de qualquer trabalho criativo (feature, componente, comportamento) |
| `systematic-debugging` | todo bug, teste falhando, comportamento inesperado |
| `writing-plans` | quando há spec/requisitos para tarefa multi-etapa |
| `executing-plans` | ao executar plano inline |
| `doubt-driven-development` | decisões de alto risco (dinheiro, matemática, produção) |
| `verification-before-completion` | antes de qualquer afirmação de "pronto" |

## 🛠️ SKILLS DE IMPLEMENTAÇÃO (depois do processo)
| Skill | Domínio |
|-------|---------|
| `impeccable` / `frontend-design` / `interface-design` | UI |
| `ui-styling` / `ui-ux-pro-max` / `design-system` | styling/tokens |
| `xlsx` / `pdf` / `ocr-and-documents` | dados |
| `test-driven-development` / `playwright` / `browser-testing-with-devtools` | testes |
| `archify` / `slides` / `design` / `banner-design` | visual/apresentação |
| `safe-refactor` / `surgical-patch` / `minimal-code-discipline` | mudança de código |
| `source-driven-development` | decisões baseadas em documentação oficial |

## ⚠️ NÃO USAR (não relevantes ao projeto)
Marketing (ads, seo, cold-email...), smart-home, mlops, email, github PRs, obsidian — ignorar a menos que o pedido mude de contexto.

---

## 📌 REGRAS DO USUÁRIO (memory)
- Comunicar em **pt-BR**
- Protótipos **HTML/CSS/JS vanilla** funcionando via file:// ou python -m http.server
- Valida interativamente no browser e dá feedback direto
- Mock data baseado em dados reais públicos
