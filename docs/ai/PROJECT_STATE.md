# PROJECT STATE — Investidor10 Dashboard

**Verdade atual do projeto. Atualizar quando fase importante terminar.**

---

## CURRENT PHASE

```
CURRENT_PHASE=DEMO_PERFIL_DONO_LIVE — demo R$ 30.000 (37 ativos espelhando perfil) público; CI verde
```

---

## GIT STATE

```
CURRENT_BRANCH=main
CURRENT_HEAD=a86034e (feat P0-P4) — CI verde (todos os jobs)
CURRENT_WORKTREE=G:\Meu Drive\Codex\investidor10-dashboard (canonical)
REMOTE=https://github.com/psmarquesdossantos-creator/investidor10-dashboard.git
GITHUB_PAGES=https://psmarquesdossantos-creator.github.io/investidor10-dashboard/ (lock + demo)
VERCEL=NÃO conectado (ação do dono — vercel.json pronto)
PAT_SCOPES=repo,workflow (SEM delete_repo → GC do GitHub é ticket do dono)
```

---

## BUILD & TEST STATUS (2026-10-17 pós P0-P4)

```
BUILD=vanilla; node --check OK; htmlhint OK
CI=a86034e VERDE (todos os jobs)
LOCAL (dados reais): full 329p+30s+1 skip(mobile-sort UX desktop) — 0 failed real
LIVE (Pages): 4/4 privacidade ✓ + demo público com by-asset(6) + alloc-cards(5) + Fundos(FUND1) ✓
NOVIDADES P0-P4:
  P0: classe Fundos end-to-end (B3 FII×FIC split, maps, cores, rebalance, demo/sample)
      — dados reais: grupo Fundos 26 ativos (24 FII + 2 FIC) bate com I10
  P1: Proventos por ativo (132 tickers reais agregados) + colunas ordenáveis
      (th[data-sort], aria-sort, dentro de cada grupo)
  P2: cards Alocação vs Meta (home, badges Comprar/Vender/Meta ±2pp) +
      coluna Variação diária (brapi dayChange, '—' honesto sem live)
  P4: card Independência pela Renda (Metas; patrimônio p/ renda-alvo com yield 12m)
DIVERGÊNCIA 702k×623k: snapshots distintos (B3 10/10 vs I10 live) + RF local
  249k vs I10 165k (I10 desatualizado/faltando ativos) — não é bug nosso
HOSTED_FINANCIAL_WRITES=0 · PRODUCTION_MIGRATION=0
BLOCKERS=GitHub GC SHAs antigos (ticket dono); JDK 11+ emulator; Vercel import (dono)
```

---

## ACTIVE WORK

```
OBJETIVO=executar roadmap P0-P4 do dono
STATUS=P0+P1+P2(parcial)+P4 IMPLEMENTADOS E LIVE; P3 parcialmente (PAT sem delete_repo)
NEXT=P3 dono (GitHub GC ticket, Vercel import, Fase 2 Firebase) → P2 agenda externa (sem API pública confiável)
HISTÓRICO_IMPORTANTE: LEAK_RESPONSE 2026-10-16 — 9 arquivos reais purgados do HEAD+história
  (filter-branch + force push; forks 0; residual = SHAs antigos até GC do GitHub → ticket dono)
```

---

## METRICS SNAPSHOT (B3 26/09)

```
Patrimônio:  [REDACTED — ver arquivo local (regra 7)]
Ativos: [REDACTED] | Transações: [REDACTED] | Proventos: [REDACTED] (ver arquivo local, regra 7)
Alocação: [REDACTED — ver arquivo local]
Home: hero patrimônio + 4 KPIs + gráficos + alertas + cards Alocação vs Meta
```

---

## LAST UPDATED

```
DATE=2026-10-17
COMMIT=9d7afa0 (HEAD — docs demo perfil; CI a82ce01 verde, live 4/4)
UPDATED_BY=Muse Spark (pós P0-P4 + demo perfil R$ 30.000; DECISIONS.md com 8 registros da sessão)
```
