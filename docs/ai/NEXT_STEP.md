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
  Demo nunca vê real: badge test, storage isolado, fixture ≠ 702175.64/628267
HISTÓRICO DESTA SESSÃO: CI-GREEN antes desta (26→0 falhas, runs 38944485486+84ac8d7)
```

---

## NEXT MISSION (Fase 2 — requer autorização explícita do usuário)

```
1. Revisão humana do código Phase 1 (specs/plans/docs acima)
2. Autorizar PUSH (revogar PUSH=0) → push dos ~10 commits → CI verde no GitHub
3. Dono: seguir docs/ai/FIREBASE_SETUP.md (projeto, Auth Google+e-mail, rules,
   allowlist authorization/{uid}, firebase-config.js local)
4. Rules deploy + signup → resolver DEMO/REAL em produção
5. Rodar tests/rules no CI (ubuntu Java 17) — 10/10 obrigatório
6. Depois: FASE 3 migração owner (FIREBASE_MIGRATION_PLAN.md) → FASE 4
   certificação cross-device → FASE 5 release DEMO → FASE 6 produção
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
