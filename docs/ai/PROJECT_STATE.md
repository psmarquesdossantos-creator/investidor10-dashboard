# PROJECT STATE — Investidor10 Dashboard

**Verdade atual do projeto. Atualizar quando fase importante terminar.**

---

## CURRENT PHASE

```
CURRENT_PHASE=LEAK_PURGED + PREVIEW_LOCK_LIVE — dados reais fora do repo; produção com lock screen; CI verde
```

---

## GIT STATE

```
CURRENT_BRANCH=main
CURRENT_HEAD=a119f5b (fix a11y toasts) — histórico REESCRITO (filter-branch purge)
CURRENT_WORKTREE=G:\Meu Drive\Codex\investidor10-dashboard (canonical)
REMOTE=https://github.com/psmarquesdossantos-creator/investidor10-dashboard.git
HISTORY_REWRITE=ce41446 (força) — 9 arquivos de dados reais removidos de TODA a história
GITHUB_PAGES=https://psmarquesdossantos-creator.github.io/investidor10-dashboard/ (lock ativo)
VERCEL=NÃO conectado (vercel.json pronto; falta import no dashboard — ação do dono)
```

---

## BUILD & TEST STATUS (2026-10-16 pós purge + preview lock)

```
BUILD=vanilla; node --check OK; eslint OK; htmlhint OK
CI=a119f5b VERDE (todos os jobs; flake a11y corrigido: toasts fora do scan axe)
LIVE (Pages público, spec live-prod.spec.js): 4/4 ✅
  - lock "Acesso restrito" + "Explorar demonstração" aparece; NADA renderiza antes
  - carteira-data.js/data.js/parsed_data.json/carteira-data-real/backups → 404
  - demo = fixture sintética 123456.78 + badge MODO DEMONSTRAÇÃO
  - localStorage sem marcadores reais
LOCAL (dados reais): desktop 105p+9s · mobile 108p · tablet 111p (flakes paralelos re-testados isolados ✅)
LEAK_RESPONSE (incidente 2026-10-16):
  - VAZAMENTO: data files reais commitados em fases antigas (data.js NUNCA — era gitignored;
    vazaram: 2 backups .js, carteira-data-real.json, parsed_data.json, 5 generate_*.py)
  - FIX: git rm --cached + .gitignore + scrub de valores em docs/tests (valores → arquivo
    local gitignored tests/e2e/real-data.values.local.json) + filter-branch purge histórico
    + force push. Forks: 0.
  - RESIDUAL: GitHub ainda serve SHAs antigos (objetos inalcançáveis até GC interno) →
    AÇÃO DO DONO: ticket GitHub Support "remove sensitive data" OU delete+recreate repo
HOSTED_FINANCIAL_WRITES=0 · PRODUCTION_MIGRATION=0
BLOCKERS=GitHub GC dos SHAs antigos (ação do dono); JDK 11+ (emulator); Vercel import
```

---

## ACTIVE WORK

```
OBJETIVO=AUTH_PHASE_1 (P1-P35) — concluída em código local
STATUS=PHASE_1_CODE_COMPLETE (aguardando revisão do usuário; push é Fase 2)
NEXT_MISSION=PHASE_2: revisão → autorizar push → Firebase console (setup runbook) → rules deploy → certificação manual
```

---

## METRICS SNAPSHOT (B3 26/09)

```
Patrimônio:  [REDACTED — ver arquivo local (regra 7)]
Ativos: [REDACTED] | Transações: [REDACTED] | Proventos: [REDACTED] (ver arquivo local, regra 7)
Alocação: FIIs 43,8% · RF 32,1% · ETFs 21,5% · Ações 2,6%
Home: hero patrimônio + 4 KPIs + gráficos + alertas inteligentes
```

---

## LAST UPDATED

```
DATE=2026-10-16
UPDATED_BY=Muse Spark (pós CI-green: 26→0 falhas com sample+CSP)
```
