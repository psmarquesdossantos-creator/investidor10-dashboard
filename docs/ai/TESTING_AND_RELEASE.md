# TESTING AND RELEASE — Investidor10 Dashboard

**Comandos reais, viewports, validações obrigatórias.**

---

## TEST COMMANDS

```bash
# Instalação (primeira vez)
npx playwright install

# Todos os testes (desktop + mobile + tablet)
npx playwright test

# Por viewport
npx playwright test --project=desktop    # 1366x768
npx playwright test --project=mobile     # 390x844
npx playwright test --project=tablet     # 768x900

# Suíte específica
npx playwright test tests/e2e/smoke.spec.js
npx playwright test tests/e2e/tabs.spec.js
npx playwright test tests/e2e/import.spec.js
npx playwright test tests/e2e/a11y.spec.js
npx playwright test tests/e2e/import-b3-json.spec.js

# Relatório HTML
npx playwright show-report

# Debug headed
npx playwright test --project=desktop --headed

# Trace on failure
npx playwright test --trace=on-first-retry
```

---

## VIEWPORTS OBRIGATÓRIOS

| Viewport | Projeto | Device Real |
|----------|---------|-------------|
| 1366×768 | desktop | Laptop padrão |
| 1920×1080 | desktop | Monitor full HD |
| 390×844 | mobile | iPhone 12/13/14 |
| 430×932 | mobile | iPhone 14 Pro / Android large |
| 768×900 | tablet | iPad portrait |

---

## VALIDAÇÕES POR TESTE

### Smoke Tests (6 tests)
- [ ] App carrega sem erros console
- [ ] Navegação tabs funciona
- [ ] Gráficos renderizam (Chart.js)
- [ ] Dados reais carregam (carteira-data.js)
- [ ] Responsividade básica
- [ ] PWA manifest/sw registra

### Tabs Tests (16 tests → 21 com novos centros)
- [ ] Cada uma das 17 tabs navega e renderiza painel
- [ ] Conteúdo específico de cada tab presente
- [ ] Estados vazios/erro/loading aparecem quando apropriado
- [ ] Sidebar mobile abre/fecha

### Import Tests (5 tests + 1 B3 JSON)
- [ ] Dropzone aparece ao clicar aba Importar
- [ ] Detecção formato B3 JSON
- [ ] Pipeline preview renderiza
- [ ] Confirmação escreve no IndexedDB
- [ ] Rollback/limpeza funciona
- [ ] B3 JSON real importa sem erro

### A11y Tests (14 tests)
- [ ] axe-core critical = 0
- [ ] axe-core serious = 0
- [ ] Focus visible em todos elementos interativos
- [ ] Touch targets ≥44px
- [ ] Semantic headings (h1→h2→h3)
- [ ] ARIA roles corretos (tablist, tabpanel, etc.)
- [ ] Chart textual summaries presentes
- [ ] Color contrast WCAG AA
- [ ] Reduced motion respeitado
- [ ] Skip link funcional

---

## BUILD COMMANDS

```bash
# Sem build step (vanilla)
# Apenas validação sintaxe
node --check script.js
node --check real-mode.js
node --check advanced-engine.js
# ... todos .js

# Python server syntax
python -m py_compile serve.py
```

---

## RELEASE CHECKLIST

### Pré-Release
- [ ] `npx playwright test` → 44/44 desktop + 44/44 mobile + 14/14 a11y
- [ ] Zero console errors em todas viewports
- [ ] Zero horizontal overflow
- [ ] CSP headers validados (serve.py)
- [ ] Security headers validados
- [ ] Backup sincronizado: `G:\Meu Drive\Codex\investidor10-dashboard\`

### Release
- [ ] Tag version (se git remote existir)
- [ ] Deploy arquivos estáticos
- [ ] Smoke test produção

### Pós-Release
- [ ] Monitorar erros reais
- [ ] Atualizar PROJECT_STATE.md
- [ ] Atualizar NEXT_STEP.md

---

## CI/CD PIPELINE (Ready, Not Activated)

```yaml
# .github/workflows/ci.yml (exists, needs remote)
on: [push, pull_request]
jobs:
  lint:
    - node --check *.js
    - python -m py_compile serve.py
  test:
    - npx playwright install --with-deps
    - npx playwright test (desktop + mobile + tablet)
    - axe-core critical=0 gate
  security:
    - python .github/scripts/check_security_headers.py
  build:
    - No build step (vanilla)
```

---

## VALIDAÇÃO MANUAL (Quando automatizado não cobre)

```bash
# 1. Iniciar servidor
python serve.py
# http://localhost:8765

# 2. Abrir no browser
# Testar cada uma das 17 tabs:
#   Resumo, Posições, Proventos, Patrimônio, Rentabilidade,
#   Lançamentos, Rebalancear, Importar, Backup,
#   Renda Fixa, Risco, Monte Carlo, Benchmarks, Impostos,
#   Eventos Corp., Data Trust, Backup Port.

# 3. Verificar:
#   - Dados reais carregam (R$ 610k patrimônio)
#   - Gráficos interativos (hover, zoom)
#   - Modais abrem/fecham (Esc, click overlay)
#   - Import B3 JSON → preview → confirm
#   - Export/Import backup JSON
#   - Mobile: sidebar, touch targets, sem overflow
#   - Console: zero erros
#   - Network: CSP não bloqueia recursos legítimos
```

---

## PERFORMANCE BENCHMARKS

```
Initial load (cached):     <500ms
Initial load (uncached):   <1.5s
Tab switch:                <100ms
Chart render (100 pts):    <200ms
Import pipeline (B3 JSON): <2s (preview)
Backup export (JSON):      <500ms
```

---

## REGRESSION GATES

```
NÃO RELEASE SE:
- Qualquer teste flaky em 3 runs consecutivas
- axe critical > 0
- Console error em viewport testado
- Horizontal overflow em qualquer viewport
- CSP violation em recurso legítimo
- Dados reais corrompidos (carteira-data.js)
```