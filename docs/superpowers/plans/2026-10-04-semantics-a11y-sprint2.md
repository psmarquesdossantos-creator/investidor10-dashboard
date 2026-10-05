# Semântica e Acessibilidade Sprint 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir bloqueios de semântica e acessibilidade identificados na auditoria: estrutura HTML, padrão ARIA para abas, e contraste WCAG AA.

**Architecture:** Abordagem incremental por componentes: primeiro corrigir estrutura HTML principal (skip-link, h1s, header fechado), depois implementar ARIA tab pattern completo, finalmente ajustar contraste de cores conforme VISUAL_CANON.md.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript, Chart.js 4 (self-hosted)

**Spec:** docs/ai/VISUAL_CANON.md, docs/ai/TESTING_AND_RELEASE.md

## Global Constraints
- UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE_AVAILABLE≠DATA_READY
- Nunca inventar preços/history/benchmarks
- Ícones e botões devem ter touch target ≥44px
- Viewports suportados: 1920×1080, 1366×768, 768×900, 430×932, 390×844
- Sem overflow horizontal
- Semântica correta: headings, landmarks, labels
- prefers-reduced-motion respeitado
- CSP compliance mantida (sem 'unsafe-inline' no script-src)

## Review Focus
- Estrutura HTML válida (sem tags não fechadas, elementos duplicados)
- Padrão ARIA tablist/tab/tabpanel corretamente implementado
- Contraste WCAG AA para texto normal e grande
- Skip link funcional e visível ao foco
- A11y tests passando com axe-core (critical=0)

### Task 1: Corrigir estrutura HTML principal

**Files:**
- Modify: `index.html:1-300` (corrigir header fechado, remover main duplicado, ajustar skip-link)
- Modify: `styles.css` (se necessário para ajustes de layout)

**Interfaces:**
- Consumes: Nenho (tarefa inicial)
- Produces: Estrutura HTML válida com header fechado corretamente, skip-link funcional, apenas um `<main>` elemento

- [ ] **Step 1: Analisar estrutura HTML atual para identificar problemas**
  - Verificar linhas 18-100 do index.html para confirmar onde o header deve ser fechado
  - Identificar o `<main>` duplicado mencionado na auditoria

- [ ] **Step 2: Corrigir fechamento do header antes do conteúdo principal**
  - Mover `</header>` da linha ~400 para linha ~99 (antes do `<main id="main">`)
  - Remover o segundo bloco `<main>` duplicado (linhas 231-248 aproximadamente)
  - Garantir que o skip-link `<a href="#main">` aponte para o elemento correto

- [ ] **Step 3: Verificar que há apenas um elemento com id="main"**
  - Garantir que o elemento principal tenha id="main" e role="main"
  - Confirmar que não há outros elementos com id="main" ou duplicação desnecessária

- [ ] **Step 4: Testar estrutura básica**
  - Abrir arquivo no navegador e verificar se não há erros de parsing
  - Verificar visualmente se o layout básico está intacto

- [ ] **Step 5: Commit**
  ```bash
  git add index.html
  git commit -m "feat: corrigir estrutura HTML - header fechado corretamente, main duplicado removido"
  ```

### Task 2: Implementar ARIA tab pattern completo

**Files:**
- Modify: `script.js` (função switchTab e inicialização)
- Modify: `index.html` (atributos ARIA nos elementos de tab e panel)
- Modify: `styles.css` (se necessário para estilos de foco)

**Interfaces:**
- Consumes: Estrutura HTML corrigida da Task 1
- Produces: Padrão ARIA tablist/tab/tabpanel totalmente funcional

- [ ] **Step 1: Analisar implementação atual de tabs no script.js**
  - Examinar função switchTab (linhas ~400)
  - Verificar como os tabs e painéis são ativados/desativados
  - Identificar onde os atributos ARIA estão faltando

- [ ] **Step 2: Atualizar HTML com atributos ARIA necessários**
  - Garantir que o container dos tabs tenha `role="tablist"` e `aria-label="Abas da carteira"`
  - Garantir que cada botão de tab tenha:
    - `role="tab"`
    - `aria-controls="panel-{tabName}"`
    - `aria-selected="true|false"`
    - `id="tab-{tabName}"`
  - Garantir que cada painel tenha:
    - `role="tabpanel"`
    - `aria-labelledby="tab-{tabName}"`
    - `id="panel-{tabName}"`

- [ ] **Step 3: Melhorar função switchTab para suporte ARIA completo**
  - Atualizar função para gerenciar corretamente os atributos ARIA
  - Implementar roving tabindex para navegação por teclado (opcional inicialmente)
  - Garantir que o foco seja gerenciado adequadamente ao mudar de aba

- [ ] **Step 4: Adicionar suporte para teclas de atalho**
  - Garantir que as tabs sejam focáveis e ativáveis com Enter/Space
  - Verificar que as setas esquerda/direita funcionam para navegação entre tabs (melhoria futura)

- [ ] **Step 5: Testar implementação ARIA**
  - Usar ferramentas de desenvolvimento para verificar atributos ARIA
  - Testar navegação por teclado (Tab, Enter, Space)
  - Verificar que leitores de tela announciariam corretamente as mudanças de aba

- [ ] **Step 6: Commit**
  ```bash
  git add index.html script.js
  git commit -m "feat: implementar ARIA tab pattern completo com atributos corretos"
  ```

### Task 3: Corrigir contraste WCAG AA

**Files:**
- Modify: `styles.css` (ajustar cores de texto, fundo, bordas)
- Modify: `index.html` (se necessário para ajustes específicos de elementos)

**Interfaces:**
- Consumes: Implementação ARIA da Task 2
- Produces: Contraste WCAG AA para todos os elementos de texto e controles

- [ ] **Step 1: Mapear elementos que precisam de ajuste de contraste baseado na auditoria**
  - Avatar (círculo verde no header)
  - `.nav-item.active`
  - `.positive` e `.negative` classes
  - `.kpi-label`
  - Qualquer outro elemento mencionado na auditoria com contraste insuficiente

- [ ] **Step 2: Consultar VISUAL_CANON.md para tokens de cor definidos**
  - Verificar quais variáveis CSS estão definidas (--primary, --bg-card, etc.)
  - Ajustar cores específicas para atender ao contraste mínimo de 4.5:1 (texto normal) ou 3:1 (texto grande)

- [ ] **Step 3: Implementar ajustes de contraste no CSS**
  - Ajustar cor do avatar para garantir contraste com fundo #1A73E8
  - Ajustar cores de estados ativos (.nav-item.active)
  - Ajustar cores de indicadores positivos/negativos
  - Ajustar cor do texto dos KPI labels
  - Verificar e ajustar cores de bordas e outros elementos visuais

- [ ] **Step 4: Testar contraste com ferramentas**
  - Usar ferramentas de desenvolvedor para verificar contraste razão
  - Testar em modo claro e escuro
  - Verificar que todos os elementos atendem ao WCAG AA

- [ ] **Step 5: Commit**
  ```bash
  git add styles.css
  git commit -m "feat: corrigir contraste WCAG AA para elementos críticos"
  ```

### Task 4: Validar e testar acessibilidade

**Files:**
- Modify: Nenhum (apenas testes)
- Create: Nenhum

**Interfaces:**
- Consumes: Todas as correções anteriores
- Produces: Relatório de teste de acessibilidade

- [ ] **Step 1: Executar testes de acessibilidade existentes**
  ```bash
  npx playwright test --project=desktop --workers=1 tests/e2e/a11y.spec.js
  ```

- [ ] **Step 2: Executar teste completo para verificar regressões**
  ```bash
  npx playwright test --project=desktop --workers=1
  ```

- [ ] **Step 3: Verificar especificamente os problemas identificados na auditoria**
  - Testar scroll vertical (deveria funcionar agora)
  - Testar funcionalidade da paleta de comandos (Cmd+K)
  - Testar renderização de gráficos
  - Testar navegação entre abas

- [ ] **Step 4: Documentar resultados e ajustar se necessário**
  - Se testes falharem, identificar causa e criar tarefas de follow-up
  - Se passar, prosseguir para próxima fase

- [ ] **Step 5: Commit dos resultados de teste (se houver ajustes)**
  ```bash
  # Apenas se houver mudanças de código
  git add index.html script.js styles.css
  git commit -m "fix: ajustes finais baseados em resultados de teste A11y"
  ```