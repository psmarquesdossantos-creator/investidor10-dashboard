# NEXT STEP — Investidor10 Dashboard

**Próxima missão e passos para continuar.**

---

## WHAT WAS JUST COMPLETED (2026-10-16, 6 missões, sem commit)

```
✅ Higiene raiz + Canon regen (código=verdade)
✅ Skill REA instalada (instruções)
✅ Melhorias usabilidade/visual 1-6 (inline→classes, reduced-motion, a11y enforced, KPIs 2col)
✅ P0 BOOT FIX: brace do else + `};` duplicado → init() vivo, 0 pageerrors, 17/17 tabs
✅ Latentes: scrollable-region (tabindex/role) + contraste badges origem (AA)
✅ HOME REVIEW 1-4: hero patrimônio+data, 4 KPIs compactos, alertas inteligentes
✅ Tier 1 parcial: reduced-motion assert (parseFloat/1e-05s), gate node --check no CI
✅ T3-8/T3-9: benchmark-engine.backtest() + monte-carlo-engine.runStressTest() (NÃO wired na UI)
✅ Validação: a11y 14/14; suíte completa 79/85 (6 falhas PRÉ-EXISTENTES, não regressões)
```

---

## NEXT MISSÃO (ordem recomendada)

```
FASE A — GOVERNANÇA (bloqueador de tudo o mais):
  1. COMMIT autorizado — 4 commits ordenados (ver COMMIT_MISSION_ORDER em PROJECT_MEMORY):
     - "chore: higiene raiz + canon regen"
     - "fix: boot path restaurado, a11y enforced, usabilidade mobile"
     - "feat: home review — hero patrimônio, KPIs claros, alertas inteligentes"
     - "ci: gate node --check *.js no workflow"
  2. REMOTE GITHUB + PUSH — repo "investidor10-dashboard"; validar gate node --check no CI

FASE B — UI WIRING (métodos novos existem, falta conectar):
  3. Backtest na aba Rentabilidade/Benchmarks: botão "Backtest vs Meta" → benchmark-engine.backtest()
     (gaps de alocação, drawdown, recomendações)
  4. Stress test na aba Monte Carlo: botão "Stress Test (2008/2020/2022)" → mc-engine.runStressTest()

FASE C — HOME REVIEW 5-7:
  5. Navegação mobile: hint de scroll-snap na barra de abas + manter área selecionada visível
  6. Gráficos: legenda + resumo textual atualizados por filtro; nunca só cor (ganho/perda/estado)
  7. Colunas mobile: cartões compactos ou aviso "mais colunas disponíveis" (hoje esconde sem avisar)

FASE D — CORREÇÕES PRÉ-EXISTENTES:
  8. import-xlsx.spec.js ×4: fixtures XLSX (servidor Node estático não serve uploads reais)
  9. panels.spec.js:16: aba "fixed" popula fixedBody
  10. test-isolated.spec.js: isolamento de panels.js

FASE E — SEGURANÇA (missão separada, maior):
  11. Zerar 100+ style="" inline no index.html → remover 'unsafe-inline' do CSP (serve.py)
```

---

## STOP CONDITIONS

```
PARE SE:
- Commit/push sem autorização explícita do usuário
- Segredos no push (.gitignore: carteira-data, .env, backups reais)
- 3+ fixes falhando no mesmo sintoma → parar e questionar arquitetura
- UI wiring criar double-render contra renderKPIs/renderAll (verificar na sonda)
```

---

## NEXT SINGLE BEST ACTION

```
1. Pedir autorização para COMMIT (4 commits ordenados, arquivos seletivos, Conventional Commits)
   → depois criar remote GitHub + push → validar CI (gate node --check)
   → depois Fase B (UI wiring backtest + stress)
```

---

## LAST UPDATED

```
DATE=2026-10-16
UPDATED_BY=Muse Spark (pós home review + consolidação)
```