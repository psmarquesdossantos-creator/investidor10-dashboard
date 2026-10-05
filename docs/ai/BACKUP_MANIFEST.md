# BACKUP MANIFEST — Investidor10 Dashboard

**Registro de backups realizados, localização, integridade e procedimento de restore.**

---

## BACKUP LOCATIONS

### Primary (Automated Nightly)
```
PATH: G:\Meu Drive\Codex\investidor10-dashboard\
TYPE: SOURCE_BACKUP (tracked files only)
FREQUENCY: Manual via script ou nightly script
LAST_SYNC: 2026-09-28 01:38
SIZE: ~950 KB (source only)
CONTENTS: 
  - All source files (index.html, *.js, *.css, *.md)
  - docs/ (ai/, superpowers/)
  - tests/e2e/
  - .github/workflows/
  - Config files
EXCLUDED: node_modules, test-results, logs, carteira-data.js, data.js, uploads
```

### Sensitive Data (Manual, Separate)
```
PATH: G:\Meu Drive\Codex\investidor10-dashboard\ (same folder, separate concern)
TYPE: SENSITIVE_LOCAL_BACKUP
FREQUENCY: Manual (when user exports backup from app)
LAST_EXPORT: 2026-09-28 (via app Backup Port. tab)
CONTENTS:
  - carteira-data.js (real portfolio: 40 assets, 72 tx, 435 prov)
  - data.js (legacy)
  - User-exported JSON backups (from Backup Portability center)
  - B3 PDF/Excel originals (if any)
```

---

## BACKUP HISTORY

| Date | Type | Trigger | Files | Size | SHA256 Manifest | Verified |
|------|------|---------|-------|------|-----------------|----------|
| 2026-09-27 19:49 | SOURCE | Fases 1-12 complete | 25+ | 949 KB | N/A | ✅ Manual |
| 2026-09-28 01:38 | SOURCE | FASE 13+14 complete | 30+ | ~1 MB | N/A | ✅ Manual |
| 2026-09-28 01:30 | SENSITIVE | Backup Port. export | 1 JSON | ~50 KB | Embedded in JSON | ✅ App validated |

---

## BACKUP STRUCTURE (SOURCE_BACKUP)

```
G:\Meu Drive\Codex\investidor10-dashboard\
├── .project-identity
├── AGENTS.md
├── README.md
├── COMPLETION_LOG.md
├── MODEL_SELECTION_GUIDE.md
├── MODEL_FALLBACK_FRAMEWORK.md
├── SKILLS_PLAYBOOK.md
├── AGENT_USAGE_GUIDE.md
├── index.html
├── script.js
├── real-mode.js
├── advanced-engine.js
├── rebalance-engine.js
├── risk-engine.js
├── benchmark-engine.js
├── monte-carlo-engine.js
├── tax-engine.js
├── styles.css
├── serve.py
├── sw.js
├── manifest.json
├── robots.txt
├── playwright.config.js
├── package.json
├── package-lock.json
├── .github/
│   └── workflows/ci.yml
├── docs/
│   ├── ai/
│   │   ├── PROJECT_MEMORY.md
│   │   ├── PROJECT_STATE.md
│   │   ├── NEXT_STEP.md
│   │   ├── CURRENT_PROJECT_MAP.md
│   │   ├── SKILLS_ROUTING.md
│   │   ├── DECISIONS.md
│   │   ├── VISUAL_CANON.md
│   │   ├── TESTING_AND_RELEASE.md
│   │   └── STORAGE_AND_WORKTREE_POLICY.md
│   ├── plans/
│   │   ├── 2026-09-27-execucao-noturna.md
│   │   ├── 2026-09-27-execucao-noturna.sh
│   │   └── 2026-09-27-fases-6-a-10.md
│   └── superpowers/
│       ├── plans/
│       │   └── 2026-09-27-import-corporate-trust-backup-plan.md
│       └── specs/
│           └── 2026-09-27-import-corporate-trust-backup-design.md
├── tests/
│   └── e2e/
│       ├── smoke.spec.js
│       ├── tabs.spec.js
│       ├── import.spec.js
│       ├── import-b3-json.spec.js
│       └── a11y.spec.js
├── src/
│   ├── import-center/
│   │   ├── detectors.js
│   │   ├── normalizer.js
│   │   ├── validator.js
│   │   ├── deduper.js
│   │   ├── writer.js
│   │   └── parsers/
│   │       ├── b3-position.js
│   │       ├── b3-events.js
│   │       ├── broker-csv.js
│   │       ├── brapi-enricher.js
│   │       └── generic-csv.js
│   ├── corporate-events/
│   │   ├── corporate-events.js
│   │   └── panel-corporate-events.html
│   ├── data-trust/
│   │   └── data-trust.js
│   └── backup-portability/
│       └── backup-portability.js
└── assets/ (favicons, icons)
```

---

## RESTORE PROCEDURE

### Source Code Restore (Clean Checkout)

```bash
# 1. Nova pasta
mkdir -p /c/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard-restore
cd /c/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard-restore

# 2. Copiar source backup
cp -r "G:\Meu Drive\Codex\investidor10-dashboard\*" .

# 3. Instalar deps
npm ci

# 4. Instalar Playwright
npx playwright install

# 5. Validar identidade
cat .project-identity
# Deve mostrar WORKSPACE correto

# 6. Rodar testes
python serve.py &
npx playwright test

# 7. Validar: 44/44 desktop + 44/44 mobile + 14/14 a11y
```

### Sensitive Data Restore (App Import)

```bash
# 1. Iniciar app
python serve.py
# http://localhost:8765

# 2. Navegar para aba "Backup Port."
# 3. Clicar "Importar" → selecionar arquivo JSON exportado
# 4. Validar preview → Confirmar
# 5. Verificar: dados carregam em todas tabs (Patrimônio R$ 610k)
```

### Full Disaster Recovery (Source + Data)

```bash
# 1. Restore source (acima)
# 2. Copiar dados sensíveis para workspace
cp "G:\Meu Drive\Codex\investidor10-dashboard\carteira-data.js" .
cp "G:\Meu Drive\Codex\investidor10-dashboard\data.js" .

# 3. Ou usar app Backup Port. para importar JSON exportado
# 4. Validar completo: testes + dados reais
```

---

## INTEGRITY CHECKS

### Source Backup
```bash
# Verificar contagem de arquivos
find "G:\Meu Drive\Codex\investidor10-dashboard" -type f | wc -l
# Expected: ~30-35 tracked files

# Verificar arquivos críticos existem
ls -la "G:\Meu Drive\Codex\investidor10-dashboard/index.html"
ls -la "G:\Meu Drive\Codex\investidor10-dashboard/serve.py"
ls -la "G:\Meu Drive\Codex\investidor10-dashboard/docs/ai/PROJECT_MEMORY.md"
```

### Sensitive Backup (JSON Export)
```json
// Estrutura esperada no JSON exportado
{
  "version": 2,
  "exportedAt": "2026-09-28T...",
  "assets": [...],
  "operations": [...],
  "dividends": [...],
  "contributions": [...],
  "notes": [...],
  "goals": {...},
  "schemaVersion": "2.0",
  "checksum": "sha256:..."
}
```

**Validação**: App Backup Portability faz schema validation Zod-like + checksum verification automaticamente.

---

## BACKUP VALIDATION SCHEDULE

```
WEEKLY:
  - Verificar se G:\Meu Drive\Codex\investidor10-dashboard\ acessível
  - Verificar tamanho razoável (>500KB source, >10KB sensitive)

MONTHLY:
  - Test restore completo em pasta temporária
  - Rodar testes: npx playwright test --project=desktop
  - Validar dados: patrimônio R$ 610k carrega

QUARTERLY:
  - Storage audit (STORAGE_AND_WORKTREE_POLICY.md)
  - Verificar SHA256 de arquivos críticos
  - Testar restore em máquina limpa (clean checkout test)
```

---

## EMERGENCY CONTACTS / ESCALATION

```
Se backup corrompido:
  1. Verificar Git local (se configurado) — git log, git stash
  2. Verificar scratch workspace — C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
  3. Verificar Hermes desktop app cache — C:\Users\Paulinho\AppData\Local\hermes\cache\
  4. Verificar browser IndexedDB (F12 → Application → IndexedDB → investidor10)
  5. Contatar usuário para re-export manual se necessário
```

---

## NOTES

- **Source backup** = versionável, compartilhável, não contém dados financeiros reais
- **Sensitive backup** = local-only, contém carteira real, nunca misturar
- **App export/import** (Backup Portability center) = forma canônica de backup/restore de dados do usuário
- **Test fixtures** (tests/fixtures/) = sintéticos, versionados, para CI/CD
- **Clean checkout test** = validação final de portabilidade (PROJECT_STATE.md)