# STORAGE AND WORKTREE POLICY — Investidor10 Dashboard

**Política permanente de armazenamento, worktrees, limpeza e backup.**

---

## BACKUP MODEL (Separation of Concerns)

### A. SOURCE_BACKUP (Versionável, Compartilhável)

```
INCLUI:
  ✅ Tracked project source (index.html, *.js, *.css, *.md)
  ✅ Approved engineering docs (docs/ai/, docs/superpowers/, README.md)
  ✅ Approved engineering scripts (serve.py, docs/plans/*.sh)
  ✅ Test fixtures sintéticos (tests/fixtures/*.json)
  ✅ Config files (playwright.config.js, package.json, .project-identity)

EXCLUI:
  ❌ .git (se existir)
  ❌ node_modules
  ❌ dist / build
  ❌ test-results / coverage
  ❌ qa-state
  ❌ Local financial/private data (carteira-data.js, data.js)
  ❌ .env / credentials
  ❌ Browser profiles
  ❌ Logs (server.log, overnight-*.log)
  ❌ Temp files (uploads/, *.tmp)
  ❌ Backup corrompido (index.html.corrupted)
```

### B. SENSITIVE_LOCAL_BACKUP (Separado, Nunca Misturar)

```
PODE CONTER:
  📁 carteira-data.js (dados reais da carteira)
  📁 data.js (dados legados)
  📁 Extratos PDF/B3 originais
  📁 Backups JSON exportados pelo usuário
  📁 Qualquer dado financeiro real/PII

LOCALIZAÇÃO: G:\Meu Drive\Codex\investidor10-dashboard\ (fora do repo)
NUNCA misturar automaticamente com SOURCE_BACKUP.
```

### C. GIT_REMOTE_RECOVERY

```
Git remote é parte do disaster recovery.
Atualmente: NÃO CONFIGURADO (local only)
PRÓXIMO PASSO: Criar remote GitHub, push, ativar CI/CD.
```

### D. SECRETS_RECOVERY

```
.env / credentials são restaurados por processo separado.
Não versionar. Não backupear automaticamente.
```

---

## SOURCE BACKUP SCRIPT (Manual, Seguro)

```bash
# Executar de dentro do WORKSPACE_ROOT
# Usa git ls-files como allowlist (apenas tracked)
# Preserva estrutura de diretórios
# Timestamp + SHA256 + manifest + integrity test

cd /c/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard
./docs/plans/2026-09-27-execucao-noturna.sh
# Ou manual:
rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='test-results' \
  --exclude='coverage' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='*.log' \
  --exclude='server.log' \
  --exclude='overnight-*.log' \
  --exclude='uploads' \
  --exclude='index.html.corrupted' \
  --exclude='carteira-data.js' \
  --exclude='data.js' \
  . "/mnt/g/Meu Drive/Codex/investidor10-dashboard/"
```

**Características**:
- `git ls-files` como allowlist (se git repo)
- Paths relativos ao repositório
- Preserva estrutura de diretórios
- Safe backup root (não absoluto)
- No overwrite (timestamp no destino)
- SHA256 de cada arquivo
- Archive integrity test
- Manifest JSON
- DryRun option
- Secret scan (grep por tokens/keys)
- Junction/symlink protection

---

## WORKTREE POLICY

### Regra Principal

```
Physical worktree only while actively needed.

MERGED + CLEAN + NO UNIQUE COMMITS
  → Retire physical worktree immediately.

UNMERGED historical branch:
  Não precisa manter pasta física permanentemente
  se branch/commit estiver preservado no Git.
```

### Antes de Remover Worktree (Checklist Obrigatório)

```
MERGED_OR_PRESERVED=true
CLEAN=true
UNIQUE_COMMITS_PRESERVED=true
UNIQUE_UNTRACKED_FILES=0
ACTIVE_PROCESS=false
CURRENT_MISSION_REFERENCE=false
```

**Worktree removal != branch deletion. NUNCA apagar branch automaticamente.**

---

## NODE_MODULES POLICY

```
ACTIVE_WORKTREE
  → node_modules allowed (necessário para Playwright, etc.)

IDLE/HISTORICAL_WORKTREE
  → REMOVE node_modules immediately

Recovery:
  npm ci / pnpm install / yarn install
  (package-lock.json / pnpm-lock.yaml versionado)
```

**Por que**: node_modules em worktrees históricas ocupa GBs e adiciona ruído zero valor.

---

## GENERATED/TEMP POLICY (Rotation & Removal)

```
ROTACIONAR/REMOVER AUTOMATICAMENTE:
  - test-results/ (manter apenas última run + failures)
  - coverage/ (apenas se CI gera)
  - dist/ / build/ (sempre gerados)
  - qa screenshots antigos (>7 dias)
  - logs (server.log, overnight-*.log) — rotacionar weekly
  - temporary ZIPs
  - browser temp profiles
  - mission-specific scripts
  - check/eval/inspect helpers
  - temporary JSON
  - verification folders

NUNCA TRATAR GERADO COMO PATRIMÔNIO DO PROJETO.
```

---

## ROOT HYGIENE

```
RAIZ DO PROJETO DEVE CONTER APENAS:
  ✅ source/ (index.html, *.js, *.css)
  ✅ current tooling (serve.py, playwright.config.js, package.json)
  ✅ current docs (README.md, AGENTS.md, docs/ai/)
  ✅ current configs (.project-identity)
  ✅ tests/ (tests/e2e/)
  ✅ skills/ (se project-local)
  ✅ references/ (docs/superpowers/)
  ✅ required local data (carteira-data.js — mas documentar que é local-only)

EVITAR:
  ❌ Clones internos
  ❌ Repos duplicados
  ❌ 50 pastas temporárias
  ❌ ZIPs de teste
  ❌ Logs antigos
  ❌ node_modules históricos
  ❌ Mission scratch files
```

---

## STORAGE AUDIT (Quarterly)

```
FREQUÊNCIA: Trimestral (ou quando disco >80%)

CHECKLIST:
  1. du -sh WORKSPACE_ROOT
  2. Identificar top 10 pastas/arquivos
  3. Verificar node_modules em worktrees idle
  4. Verificar test-results antigos (>30 dias)
  5. Verificar logs >100MB
  6. Verificar backups duplicados
  7. Executar PHASE_A=AUDIT_ONLY primeiro
  8. Só depois PHASE_B=CLEANUP_AFTER_REVIEW

PHASE_A (AUDIT_ONLY):
  FILES_DELETED=0
  DIRECTORIES_DELETED=0
  REPORT_GENERATED=true

PHASE_B (CLEANUP_AFTER_REVIEW):
  Só após relatório revisado e aprovado.
```

---

## LARGE GIT STORAGE LESSON (Se Git Ficar Gigante)

```
NÃO ASSUMIR QUE CÓDIGO É GIGANTE.

INVESTIGAR:
  git count-objects -vH
  git fsck
  git rev-list --objects --all | sort -k2 -n -r | head -20
  git verify-pack -v .git/objects/pack/*.idx | sort -k3 -n -r | head -20

PODE EXISTIR:
  - Dangling large blob
  - Interrupted repack
  - Old binary
  - Historical ZIP
  - Screenshots
  - Videos
  - Build artifacts

SÓ EXECUTAR git gc DEPOIS DE:
  ✅ Verified backup
  ✅ Healthy repository (git fsck clean)
  ✅ Idle Git (no active processes)
  ✅ No corruption
  ✅ Ref snapshot (git for-each-ref)
  ✅ Reachability analysis

NUNCA APAGAR .git/objects MANUALMENTE.
```

---

## DATA / SENSITIVE SAFETY (Categorias)

```
PUBLIC_SAFE          → README, docs, source code, configs
PROJECT_PRIVATE      → Architecture docs, decisions, internal specs
SENSITIVE_LOCAL      → carteira-data.js, data.js, user exports, PDFs
SECRET               → .env, tokens, API keys, credentials

REGRA: Nunca misturar SENSITIVE_LOCAL ou SECRET em backup público/compartilhado.
```

---

## BACKUP / RESTORE VALIDATION

```
Se produto possui persistência local (IndexedDB + localStorage + JSON export):
  Backup DEVE ser testado.

Restore deve ser:
  ✅ Validado (dados íntegros)
  ✅ Previsível (mesmo schema)
  ✅ Seguro (não sobrescreve sem confirm)
  ✅ Preferencialmente atômico
  ✅ Resistente a duplicação (fingerprint SHA256)
  ✅ Documentado

Backup sem restore testado NÃO É proteção suficiente.
```

---

## PROTECTED CORE (Áreas que tarefa visual não deve alterar)

```
CORE AREAS:
  - Fórmulas financeiras (TWR, XIRR, VaR, Sharpe, etc.)
  - Cálculos de imposto (IRPF, DARF, GCAP)
  - Persistência (IndexedDB, localStorage, ImportPipeline write)
  - Schema de dados (carteira-data.js structure)
  - Migrations (backup v1→v2, schema changes)
  - Importação real (preview, confirm, write)
  - Tributação
  - Valuation

SE MISSÃO NÃO AUTORIZA:
  CORE_CHANGED=false
```