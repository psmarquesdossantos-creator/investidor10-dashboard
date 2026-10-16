# BACKUP MANIFEST â€” Investidor10 Dashboard

**Registro de backups realizados, localizaÃ§Ã£o, integridade e procedimento de restore.**

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
| 2026-09-27 19:49 | SOURCE | Fases 1-12 complete | 25+ | 949 KB | N/A | âœ… Manual |
| 2026-09-28 01:38 | SOURCE | FASE 13+14 complete | 30+ | ~1 MB | N/A | âœ… Manual |
| 2026-09-28 01:30 | SENSITIVE | Backup Port. export | 1 JSON | ~50 KB | Embedded in JSON | âœ… App validated |

---

## BACKUP STRUCTURE (SOURCE_BACKUP)

```
G:\Meu Drive\Codex\investidor10-dashboard\
â”œâ”€â”€ .project-identity
â”œâ”€â”€ AGENTS.md
â”œâ”€â”€ README.md
â”œâ”€â”€ COMPLETION_LOG.md
â”œâ”€â”€ MODEL_SELECTION_GUIDE.md
â”œâ”€â”€ MODEL_FALLBACK_FRAMEWORK.md
â”œâ”€â”€ SKILLS_PLAYBOOK.md
â”œâ”€â”€ AGENT_USAGE_GUIDE.md
â”œâ”€â”€ index.html
â”œâ”€â”€ script.js
â”œâ”€â”€ real-mode.js
â”œâ”€â”€ advanced-engine.js
â”œâ”€â”€ rebalance-engine.js
â”œâ”€â”€ risk-engine.js
â”œâ”€â”€ benchmark-engine.js
â”œâ”€â”€ monte-carlo-engine.js
â”œâ”€â”€ tax-engine.js
â”œâ”€â”€ styles.css
â”œâ”€â”€ serve.py
â”œâ”€â”€ sw.js
â”œâ”€â”€ manifest.json
â”œâ”€â”€ robots.txt
â”œâ”€â”€ playwright.config.js
â”œâ”€â”€ package.json
â”œâ”€â”€ package-lock.json
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/ci.yml
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ ai/
â”‚   â”‚   â”œâ”€â”€ PROJECT_MEMORY.md
â”‚   â”‚   â”œâ”€â”€ PROJECT_STATE.md
â”‚   â”‚   â”œâ”€â”€ NEXT_STEP.md
â”‚   â”‚   â”œâ”€â”€ CURRENT_PROJECT_MAP.md
â”‚   â”‚   â”œâ”€â”€ SKILLS_ROUTING.md
â”‚   â”‚   â”œâ”€â”€ DECISIONS.md
â”‚   â”‚   â”œâ”€â”€ VISUAL_CANON.md
â”‚   â”‚   â”œâ”€â”€ TESTING_AND_RELEASE.md
â”‚   â”‚   â””â”€â”€ STORAGE_AND_WORKTREE_POLICY.md
â”‚   â”œâ”€â”€ plans/
â”‚   â”‚   â”œâ”€â”€ 2026-09-27-execucao-noturna.md
â”‚   â”‚   â”œâ”€â”€ 2026-09-27-execucao-noturna.sh
â”‚   â”‚   â””â”€â”€ 2026-09-27-fases-6-a-10.md
â”‚   â””â”€â”€ superpowers/
â”‚       â”œâ”€â”€ plans/
â”‚       â”‚   â””â”€â”€ 2026-09-27-import-corporate-trust-backup-plan.md
â”‚       â””â”€â”€ specs/
â”‚           â””â”€â”€ 2026-09-27-import-corporate-trust-backup-design.md
â”œâ”€â”€ tests/
â”‚   â””â”€â”€ e2e/
â”‚       â”œâ”€â”€ smoke.spec.js
â”‚       â”œâ”€â”€ tabs.spec.js
â”‚       â”œâ”€â”€ import.spec.js
â”‚       â”œâ”€â”€ import-b3-json.spec.js
â”‚       â””â”€â”€ a11y.spec.js
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ import-center/
â”‚   â”‚   â”œâ”€â”€ detectors.js
â”‚   â”‚   â”œâ”€â”€ normalizer.js
â”‚   â”‚   â”œâ”€â”€ validator.js
â”‚   â”‚   â”œâ”€â”€ deduper.js
â”‚   â”‚   â”œâ”€â”€ writer.js
â”‚   â”‚   â””â”€â”€ parsers/
â”‚   â”‚       â”œâ”€â”€ b3-position.js
â”‚   â”‚       â”œâ”€â”€ b3-events.js
â”‚   â”‚       â”œâ”€â”€ broker-csv.js
â”‚   â”‚       â”œâ”€â”€ brapi-enricher.js
â”‚   â”‚       â””â”€â”€ generic-csv.js
â”‚   â”œâ”€â”€ corporate-events/
â”‚   â”‚   â”œâ”€â”€ corporate-events.js
â”‚   â”‚   â””â”€â”€ panel-corporate-events.html
â”‚   â”œâ”€â”€ data-trust/
â”‚   â”‚   â””â”€â”€ data-trust.js
â”‚   â””â”€â”€ backup-portability/
â”‚       â””â”€â”€ backup-portability.js
â””â”€â”€ assets/ (favicons, icons)
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
# 3. Clicar "Importar" â†’ selecionar arquivo JSON exportado
# 4. Validar preview â†’ Confirmar
# 5. Verificar: dados carregam em todas tabs (PatrimÃ´nio R$ [REDACTED])
```

### Full Disaster Recovery (Source + Data)

```bash
# 1. Restore source (acima)
# 2. Copiar dados sensÃ­veis para workspace
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

# Verificar arquivos crÃ­ticos existem
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

**ValidaÃ§Ã£o**: App Backup Portability faz schema validation Zod-like + checksum verification automaticamente.

---

## BACKUP VALIDATION SCHEDULE

```
WEEKLY:
  - Verificar se G:\Meu Drive\Codex\investidor10-dashboard\ acessÃ­vel
  - Verificar tamanho razoÃ¡vel (>500KB source, >10KB sensitive)

MONTHLY:
  - Test restore completo em pasta temporÃ¡ria
  - Rodar testes: npx playwright test --project=desktop
  - Validar dados: patrimÃ´nio R$ [REDACTED] carrega

QUARTERLY:
  - Storage audit (STORAGE_AND_WORKTREE_POLICY.md)
  - Verificar SHA256 de arquivos crÃ­ticos
  - Testar restore em mÃ¡quina limpa (clean checkout test)
```

---

## EMERGENCY CONTACTS / ESCALATION

```
Se backup corrompido:
  1. Verificar Git local (se configurado) â€” git log, git stash
  2. Verificar scratch workspace â€” C:\Users\Paulinho\AppData\Local\hermes\cache\scratch\investidor10-dashboard
  3. Verificar Hermes desktop app cache â€” C:\Users\Paulinho\AppData\Local\hermes\cache\
  4. Verificar browser IndexedDB (F12 â†’ Application â†’ IndexedDB â†’ investidor10)
  5. Contatar usuÃ¡rio para re-export manual se necessÃ¡rio
```

---

## NOTES

- **Source backup** = versionÃ¡vel, compartilhÃ¡vel, nÃ£o contÃ©m dados financeiros reais
- **Sensitive backup** = local-only, contÃ©m carteira real, nunca misturar
- **App export/import** (Backup Portability center) = forma canÃ´nica de backup/restore de dados do usuÃ¡rio
- **Test fixtures** (tests/fixtures/) = sintÃ©ticos, versionados, para CI/CD
- **Clean checkout test** = validaÃ§Ã£o final de portabilidade (PROJECT_STATE.md)
