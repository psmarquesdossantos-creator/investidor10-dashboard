# FIREBASE_MIGRATION_PLAN — Fases 2–3 (P17/P18/P33)

> **Status**: PLANO — NÃO EXECUTAR na Fase 1. HOSTED_FINANCIAL_WRITES=0.
> Validação local disponível: `node scripts/migration-dry-run.js` (sintético).

## Objetivo

Migrar o dataset do dono (Package1A = `carteira-data.js`, local/gitignored) para o
escopo UID-isolado `users/{ownerUid}/portfolio/{section}` sem perda de dados,
determinístico, idempotente, com verificação de readback e plano de rollback.

## Packages certificados

| Package | Conteúdo | Origem | Destino |
|---|---|---|---|
| **Package1A** | `carteira-data.js` (~516KB: kpis, patrimony 84m, positions, earnings 2202, entries, allocation, assetReturns) | arquivo local | `users/{uid}/portfolio/*` |
| **Package2** | backup JSON `payload.state.assets` (formato carteira-investimentos) | arquivo de backup | via `processBackupFile` → mesmas seções |

## Arquitetura alvo

```
users/{ownerUid}/portfolio/{section}     (Firestore, 10 seções — P8 field-scoped)
authorization/{ownerUid}                  (allowlist: enabled, role=owner, blocked=false)
```

## Passos (Fase 3, com autorização explícita)

1. **Backup + hash**: copiar `carteira-data.js` → `carteira-data.backup-<data>.js`;
   `sha256sum` registrado. Também exportar localStorage (chave `investidor10`) se existir.
2. **Dry-run sintético**: `node scripts/migration-dry-run.js` → RESULT: OK obrigatório.
3. **Upload via Admin SDK** (fora do browser — regra P16/P24: client nunca escreve
   na própria autorização; upload usa credencial de serviço):
   - script Node com `firebase-admin` (serviceAccount baixado do console, JAMAIS commitado);
   - upsert por seção: `set(doc('users/{uid}/portfolio/{s}'), {data, updatedAt})`;
   - idempotente por construção (re-run sobrescreve mesmos docs).
4. **Readback**: ler todas as seções; comparar `counts + sha256` por seção contra o
   fingerprint local (mesma função do dry-run). Qualquer DIFF → abortar e NÃO prometer
   o arquivo local como fonte de verdade.
5. **Allowlist**: no console Firestore, criar `authorization/{ownerUid}` =
   `{ email: 'owner@example.invalid', enabled: true, role: 'owner', blocked: false }`
   (email trim+lowercase — P15).
6. **Certificação cross-device**: login no desktop + celular; validar sync em ambos
   sentidos (P7) e resolução REAL (P4) — checklist em FIREBASE_SETUP.md.
7. **Rollback**: até a certificação completa, `carteira-data.js` local PERMANECE a
   fonte de verdade. Rollback = deletar coleção `users/{uid}` (console) + manter
   arquivo local intacto. Após certificação (Fase 4), arquivo local vira backup frio.

## Invariantes

- UNKNOWN ≠ ZERO: seção ausente não vira zero — seção ausente permanece ausente.
- Zero writes hospedados antes da autorização explícita desta fase.
- `firebase-config.js`/serviceAccount NUNCA commitados (.gitignore).
- Migração NUNCA copia dados demo → real (P13) nem real → demo (P26).
