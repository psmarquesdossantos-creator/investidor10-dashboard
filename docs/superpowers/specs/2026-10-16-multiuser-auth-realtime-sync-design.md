# Design Spec — Multiuser Auth + Realtime Sync + Demo (Phase 1)

**Data**: 2026-10-16 · **Status**: ARCHITECTURE_APPROVED (P1–P35 fornecidos pelo usuário; spec técnica aqui)
**Supersede**: `2026-10-16-auth-firebase-sync-design.md` (design anterior simplificado)
**Phase 1 only**: HOSTED_FINANCIAL_WRITES=0 · PRODUCTION_MIGRATION=0 · PUSH=0 · DEPLOY=0

---

## 0. Decisões técnicas resolvidas nesta spec

| Questão | Decisão |
|---|---|
| Allowlist key | **UID-keyed** `authorization/users/{uid}` (case-proof; email normalizado trim+lowercase armazenado como campo, usado só pra policy/display). P15 satisfied via normalização na escrita; enforcement por UID. |
| Registry vs rules | Registry = Firestore doc por uid; **rules independently** fazem `get()` do doc → P5 (frontend mente, Firestore nega). Sem hardcode em JS (P16); rules são estado server-side. |
| SDK Firebase | **Vendor local** em `vendor/firebase/` (CSP `script-src 'self'` intacto); carregado só quando gate ativo (dynamic import). connect-src CSP += `https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com`. |
| Auth methods | Google + e-mail/senha. REAL exige `emailVerified` (P1). |
| Firestore shape (REAL) | **Section-scoped** `users/{uid}/portfolio/sections/{section}` (kpis, monthly, patrimony, allocation, positions, earnings, entries, assetReturns, fixedIncome, goals) — P8 field-scoped, batch no import. |
| Demo storage | localStorage `investidor10-demo` (P10). Chave separada de `investidor10` (edits reais locais) — sem vazamento. |
| Emulator | Java local = 1.8 (emulator exige 11+). Testes escritos p/ rodar local OU CI (ubuntu Java 17). Se local falhar → REMAINING_BLOCKERS. |
| Fail-closed | Qualquer erro em authz/resolve → **nunca REAL** (P24). Erro de rede no REAL → badge "sync desconectado", app segue com cache local da sessão. |
| CI/local | Sem `firebase-config.js` → gate **inactive** → comportamento atual 100% intacto (suíte verde sem mudança). |

---

## 1. Account modes (P4)

```
resolve(uid, token):
  blocked   = doc(blocked==true)                     → BLOCKED
  real      = doc(enabled) && token.emailVerified && !blocked → REAL
  demo      = autenticado, sem bloqueio              → DEMO
  (não autenticado)                                  → LOGIN_OVERLAY
```

- Resolução: 1 `get()` em `authorization/users/{uid}` após `onAuthStateChanged`.
- Modo é **UX only** (P5). Firestore rules re-computam autorização server-side.
- Transição DEMO→REAL (P13): próxima sessão resolve REAL; toast "Sua conta foi autorizada. Os dados usados anteriormente pertenciam ao modo demonstração."; **zero migração automática** de dados demo.

## 2. Boot order (P21/P22)

```
1. auth-gate.js carrega cedo (antes de carteira-data.js)
2. sem config && sem __AUTH_GATE_FORCE__ → GATE_INACTIVE (resolve imediato; CI/local intactos)
3. init Firebase (vendor lazy)
4. onAuthStateChanged
5. emailVerified check
6. get(authorization/users/{uid}) → mode
7. mode → data source (REAL: FirestoreReal | DEMO: LocalDemo | BLOCKED: tela)
8. __AUTH_RESOLVED__ promise resolve → app renderiza
```

Nenhum fetch de dado real antes do passo 7. real-mode.js aguarda `window.__AUTH_RESOLVED__` antes de `applyRealData`.

## 3. Components

| Arquivo | Papel |
|---|---|
| `src/auth/auth-gate.js` | boot, auth (Google+senha), resolução, overlay/estados, logging seguro (P29: só transições/denials; nunca valores/tokens) |
| `src/auth/sync/data-source.js` | interface `PortfolioDataSource` (P23): `start()|getPortfolio()|saveSection(name,data)|onUpdate(cb)|stop()` |
| `src/auth/sync/local-demo-source.js` | P25: fixture sintético, persistência local, reset, determinístico |
| `src/auth/sync/firestore-real-source.js` | P24: UID autenticado, listeners realtime, writes section-scoped, fail-closed, nunca fallback p/ outro uid |
| `src/auth/demo-fixture.js` | P12/P26: 100% fictício (nomes AlphaCorp/BetaSA, totais R$ 123.456,78), NÃO derivado de carteira-data nem sample |
| `firebase.config.sample.js` (raiz) | placeholders; real `firebase-config.js` gitignored |
| `firestore.rules` + `firebase.json` | P5/P6/P14 |
| `tests/rules/rules.test.js` | matriz de ataque P14 (9 casos) via `@firebase/rules-unit-testing` |
| `tests/e2e/auth-gate.spec.js` | overlay, validação, badge demo, reset, forced mode (init script) |
| `docs/ai/FIREBASE_SETUP.md` | runbook do dono (fases 2+) |
| `docs/ai/FIREBASE_MIGRATION_PLAN.md` | P17/P18/P33 — plano, NÃO execução |
| `scripts/migration-dry-run.js` | dry-run sintético (counts/hashes/idempotência) |

Hooks de sync (só ativos com FirestoreReal ativo): `writer.js`, `processBackupFile`, `saveToStorage` → `SyncHub.markDirty(section)` debounce 2s → batch. Pull: onSnapshot por seção → merge por `updatedAt` → `applyRealData`+`renderAll`.

## 4. UI states (P27/P28)

- REAL: UX normal.
- DEMO: badge persistente "MODO DEMONSTRAÇÃO" + texto "Os dados desta carteira são fictícios e servem apenas para demonstrar o funcionamento do sistema." + botão "Restaurar dados de demonstração" (menu usuário). CRUD habilitado (P11) sobre fixture.
- BLOCKED: tela dedicada "Acesso restrito — contate o administrador".
- LOGIN: overlay opaco, Google + e-mail/senha + criar conta + erros pt-BR. Sem KPIs atrás.

## 5. Firestore rules (P6/P5)

```
match /authorization/users/{uid} {
  allow get: if request.auth != null && request.auth.uid == uid;
  allow write: if false;                 // só console/Admin SDK (P16)
}
match /users/{uid}/{doc=**} {
  allow read, write: if isAuthorized(uid);   // get() do allowlist
}
function isAuthorized(uid) {
  return request.auth != null && request.auth.uid == uid
    && get(/databases/$(database)/documents/authorization/users/$(request.auth.uid)).data.enabled == true
    && get(...).data.blocked != true;
}
```

## 6. Attack matrix (P14) → tests/rules.test.js

1 não-autenticado lê owner portfolio → DENIED · 2 DEMO lê owner → DENIED · 3 A lê B → DENIED · 4 A escreve em B → DENIED · 5 ACCOUNT_MODE forçado no client → rules negam · 6 owner lê own → ALLOWED · 7 owner escreve own → ALLOWED · 8 blocked lê/escreve → DENIED · 9 client escreve allowlist → DENIED.

## 7. Migration plan (P17/P18) — FASE 2+, NÃO executado agora

Package1A (`carteira-data.js`) → `users/{ownerUid}/portfolio/sections/*`:
1. backup local + hash SHA-256 · 2. dry-run com dados sintéticos (script) · 3. migração real com Admin SDK (fora do browser) · 4. readback: counts + hash por seção · 5. rollback = restaurar arquivo local (fonte de verdade permanece local até certificação) · idempotente (re-run não duplica; upsert por seção).
Package2 (backup JSON `payload.state`) → via `processBackupFile` → mesmas seções.
Owner data NÃO migra na Fase 1 (P17/P34).

## 8. Testes (P31)

- Regressão total: suíte Playwright atual (localhost → inactive) — verde obrigatório.
- `auth-gate.spec.js`: force-on sem config → overlay renderiza; validação de form; `__AUTH_GATE_FORCE__='demo'` → app + badge demo + fixture (total ≠ valores reais) + reset.
- `tests/rules/*`: P14 matrix (emulator; local Java 8 pode bloquear → CI/limitação documentada).
- Dry-run migration: `node scripts/migration-dry-run.js` (sintético, idempotente).

## 9. Zero-cost (P30)

Spark free: Auth 50K MAU, Firestore 1GB/20K writes-dia — 1 dono + demo local = folga enorme. Emulator local gratuito. Sem serviços pagos.

## 10. Phase gates (P35)

Phase 1 (esta missão) → Phase 2 auth+rules production → Phase 3 migração owner UID → Phase 4 certificação realtime → Phase 5 release DEMO → Phase 6 production. Cada fase fail-closed. PUSH/DEPLOY autorizados apenas em fases seguintes com autorização explícita.
