# NEXT STEP — Investidor10 Dashboard

**Arquivo vivo. Atualizar a cada missão concluída.**

---

## WHAT WAS JUST COMPLETED (2026-10-16, MISSÃO CI-GREEN)

```
FASE F — DEPLOY: GitHub Pages ativo (push automático em main)
FASE G — MOBILE UX: bottom nav, position cards, pull-to-refresh
FASE H — CALENDÁRIO + EXPORT PDF

MISSÃO CI-GREEN (26 falhas → 0):
  ✅ carteira-data.sample.js enriquecida: kpis, patrimony (12m), monthly,
     allocation.byClass/byAsset, 20 posições × 6 classes (class/value/return),
     earnings com gross/tax/net, entries com class, fixedIncome, reconciliation
  ✅ script.js: guards no branch __CARTEIRA_OVERRIDE (backup parcial não zera
     allocation); Object.assign preserva meta/assets/goals em CARTEIRA_DATA
  ✅ real-mode.js: guards em applyRealData (kpis/patrimony/monthly deriváveis)
  ✅ CSP: A11y.initFocusVisible/ensureTouchTargets viraram no-ops — regras
     migradas para styles.css (style-src-elem inline era violado: 2 hashes CI)
  ✅ data-trust.js: badge/indicator via data-attrs + CSSOM (0 style= inline)
  ✅ styles.css: .data-table display:none mobile escopado a #panel-positions
     (Fase G escondia TODAS as tabelas no mobile — bug)
  ✅ sw.js: cache parcial com allSettled (URL externa fonts não anula cache)
  ✅ Testes adaptativos: real-data.spec pula com meta.source==='sample';
     import-xlsx.spec pula sem XLSX local; pwa cache com polling 15s
VALIDAÇÃO:
  Sample+CSP (CI-equivalent): desktop 88p/10s, mobile+tablet 185p/11s, 0 failed
  Real+CSP desktop: 89p/9s ✅ | Real full: 276p/18s ✅
  eslint@8/htmlhint/node --check: OK
```

---

## NEXT MISSÃO (ordem recomendada)

```
1. COMMIT + PUSH desta missão → acompanhar GitHub Actions até verde
2. LOGIN/PRIVACIDADE (pedido do usuário):
   - Apenas o dono (login por e-mail) vê a carteira real
   - Visitantes veem site vazio ou com conta demo
   - carteira-data.js continua local/gitignored; dados nunca no repo público
3. FEATURES futuras:
   - Comparativo vs benchmarks detalhado
   - Alertas de preço push notification
   - Multi-carteira (perfis)
```

---

## STOP CONDITIONS

```
PARE SE:
- Dados reais da carteira forem para o repo público (violação de privacidade)
- Segredos no push (.gitignore: carteira-data, .env, backups reais)
- 3+ fixes falhando no mesmo sintoma → parar e questionar arquitetura
```

---

## META

```
DATE=2026-10-16
UPDATED_BY=Muse Spark (pós CI-green: 26→0 falhas sample+CSP)
```
