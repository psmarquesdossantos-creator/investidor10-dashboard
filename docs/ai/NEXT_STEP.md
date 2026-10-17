# NEXT STEP — Investidor10 Dashboard

**Arquivo vivo. Atualizar a cada missão concluída.**

---

## WHAT WAS JUST COMPLETED (2026-10-16, AUTH PHASE 1 — P1–P35)

```
SPEC: docs/superpowers/specs/2026-10-16-multiuser-auth-realtime-sync-design.md (7111af4)
PLAN: docs/superpowers/plans/2026-10-16-multiuser-auth-phase1.md

ENTREGA (código local, ~10 commits 153c5ad..9600d13, PUSH=0 por P34):
  ✅ auth-gate.js — INACTIVE/LOGIN/DEMO/REAL/BLOCKED; fail-closed; force-testável
  ✅ Login overlay (Google + e-mail/senha, erros pt-BR, focus trap, P22 sem
     render antes da decisão; localhost bypass; sem config = site intacto)
  ✅ Demo: fixture sintética (13 ativos fictícios, total 123456.78, zero dados
     reais), badge "MODO DEMONSTRAÇÃO" + copy P9, reset via botão (P11),
     storage próprio investidor10-demo (P10), saveToStorage roteado (P26)
  ✅ PortfolioDataSource (P23): LocalDemoDataSource (P25) +
     FirestoreRealDataSource (P24: sections users/{uid}/portfolio/{section},
     realtime onSnapshot, batch field-scoped P8, eco suprimido, timeout boot P20)
  ✅ SyncHub: no-op por padrão; hooks em writer.js (seções-alvo), processBackupFile
     (saveAll), saveToStorage (saveAll em REAL / demo source em DEMO)
  ✅ firestore.rules: allowlist authorization/{uid} (leitura só do dono, escrita
     deny p/ client P16) + users/{uid}/{doc=**} com get() server-side (P5/P6/P15)
  ✅ tests/rules/rules.test.cjs — matriz P14 (10 casos) — BLOCKER local: Java 8
     (emulator exige 11+); roda em CI/ubuntu quando push autorizado
  ✅ scripts/migration-dry-run.js — P33: readback counts+sha256 OK, idempotente OK
  ✅ docs/ai/FIREBASE_MIGRATION_PLAN.md (P17/P18) + FIREBASE_SETUP.md (runbook)
VALIDAÇÃO:
  Desktop 105p/9s · Mobile 108p · Tablet 111p · 0 failed (1 flake a11y mobile
  em run paralelo, isolado 14/14 ✅) · node --check/eslint/htmlhint OK
  Demo nunca vê real: badge test, storage isolado, fixture sintética (asserts de
  não-vazamento via tests/e2e/real-data.values.local.json, gitignored)
HISTÓRICO DESTA SESSÃO: CI-GREEN antes desta (26→0 falhas, runs 38944485486+84ac8d7)
```

---

## NEXT MISSION (ordem atual)

```
CONCLUÍDO (2026-10-16/17):
  ✅ Purge vazamento + preview lock público + live tests 4/4
  ✅ Bug real corrigido: renderEarnings/renderEntries usavam cópia obsoleta do
     parse — abas exibiam dados LEGADOS mesmo com carteira real aplicada
     (agora: real 2202 proventos visíveis; demo 100% fixture; teste purity P26
     pinando ausência de 14 tickers legados nas abas posições/proventos/patrimônio)

AUDITORIA vs investidor10.com.br/wallet/public/2206425 (extraída 2026-10-17):
  Carteira pública I10: 37 ativos (7 Ações, 24 FIIs, 4 RF, 1 FUNDO, 1 Cripto, 0 ETFs)
  Alocação: FIIs 52,93% · RF 26,55% · FUNDOS 16,43% · Ações 4,06% · Criptos 0,03%
  GAPS nossos: (1) classe FUNDOS não existe no pipeline (16% da carteira!);
  (2) coluna Variação diária por ativo; (3) nota/score por ativo (I10 = dado
  proprietário — usar score próprio data-trust); (4) cards % atual vs % ideal
  na home; (5) agenda de proventos ANUNCIADOS (I10 tem database própria; nosso
  calendário cobre pagamentos futuros do backup)
  DIVERGÊNCIA A INVESTIGAR: nosso total 702k vs I10 público 623k (snapshot/preços
  ou fundo não contabilizado no I10)

ROADMAP SUGERIDO (prioridade):
  P0 fidelidade: classe Fundos end-to-end (parsers→engines→rebalance→demo) + investigar divergência
  P1 ORGANIZAÇÃO (pedido do dono): Proventos por ATIVO (grupo por ticker, yield on
     cost, frequência, filtro ano) + Posições AGRUPADAS por classe com subtotais
     e colunas ordenáveis
  P2 UX: variação diária (brapi), cards % ideal na home, agenda proventos anunciados
  P3 pendências dono: GitHub GC dos SHAs antigos, Vercel import, Fase 2 Firebase
  P4 vida longa: metas/projeções, alertas push, multi-carteira, comparador ativos

STOP: implementar P1/P2 requer escolha do dono (proposta entregue em 2026-10-17)
```

---

## STOP CONDITIONS

```
PARE SE:
- Dados reais da carteira forem para o repo público (violação de privacidade)
- Push sem autorização explícita (diretiva P34 PUSH=0 ativa)
- serviceAccount/firebase-config reais forem commitados
- 3+ fixes falhando no mesmo sintoma → parar e questionar arquitetura
```

---

## META

```
DATE=2026-10-16
UPDATED_BY=Muse Spark (pós AUTH PHASE 1: gate+demo+sync+rules+dry-run, tudo local)
```
