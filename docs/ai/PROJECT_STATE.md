# PROJECT STATE — Investidor10 Dashboard

## Fase atual

```
CURRENT_PHASE=PRIVACY_REMEDIATION_AND_QA
IDENTITY_GATE=PASS
```

## Git

```
CURRENT_BRANCH=codex/identity-privacy-recovery
BASE_HEAD=1e69f385170a67748b8c58d98b3cc639453a28ce
CANONICAL_WORKSPACE=G:\Meu Drive\Codex\investidor10-dashboard
REMOTE=https://github.com/psmarquesdossantos-creator/investidor10-dashboard.git
PUSH=NOT_AUTHORIZED
MERGE=NOT_AUTHORIZED
DEPLOY=NOT_AUTHORIZED
```

## Controles aplicados

- Fixture de demonstração sintética com 21 posições e sem dependência de arquivos locais.
- Amostra pública e fixture de backup recompostos com valores sintéticos; schema e contagens preservados.
- E2E verifica que payload local-canário sintético é descartado no modo DEMO.
- Distribuição Vercel usa allowlist estática e redireciona a rota local para amostra sintética.
- Git e CLI ignoram carteiras, exports, extratos, backups, uploads e segredos locais.
- Documentos rastreados atuais não mantêm snapshots de carteira nem e-mails pessoais.

## Validação desta missão

```
PRIVACY_CONTRACT=5/5
PLAYWRIGHT_DESKTOP=121_PASS,0_FAIL,9_SKIP
PLAYWRIGHT_MOBILE=128_PASS,0_FAIL,2_SKIP
PLAYWRIGHT_TABLET=121_PASS,0_FAIL,9_SKIP
PLAYWRIGHT_TOTAL=370_PASS,0_FAIL,20_SKIP
NODE_CHECK=PASS
JSON_CONFIG=PASS
GIT_DIFF_CHECK=PASS
VERCEL_PROJECT_LINK=LOCAL_PRESENT_REMOTE_403
VERCEL_DRY_RUN=NOT_RUN_SCOPE_UNVERIFIED
```

Os E2E rodaram em cópia temporária com fixtures sintéticas; sem carteira local, Firebase real ou dados financeiros locais. Nenhum dado financeiro foi alterado.

## Bloqueios

- A conexão Vercel ativa não tem acesso à equipe do vínculo local (403); validar a reconexão antes do dry-run.
- Histórico remoto público não foi reescrito; avaliar mitigação em tarefa separada.
