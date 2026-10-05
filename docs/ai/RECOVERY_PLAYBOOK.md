# RECOVERY PLAYBOOK — Investidor10 Dashboard

**Procedimentos de recuperação para cenários de desastre. Ordem de execução.**

---

## CENÁRIO 1: CHAT APAGADO / NOVA SESSÃO / NOVO AGENTE

### Protocolo Padrão (5 minutos)

```bash
# 1. Validar identidade do projeto
cd /c/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard
cat .project-identity
# Verificar: PROJECT_NAME=investidor10-dashboard, WORKSPACE correto

# 2. Ler documentos canônicos (ORDEM OBRIGATÓRIA)
cat AGENTS.md
cat docs/ai/PROJECT_STATE.md
cat docs/ai/NEXT_STEP.md
cat docs/ai/PROJECT_MEMORY.md
cat docs/ai/CURRENT_PROJECT_MAP.md

# 3. Verificar estado Git (se aplicável)
git status 2>/dev/null || echo "Not a git repo (OK - local only)"

# 4. Verificar servidor
python serve.py &
curl -s http://localhost:8765 | head -5

# 5. Rodar smoke test rápido
npx playwright test --project=desktop tests/e2e/smoke.spec.js

# 6. Continuar a partir de NEXT_STEP.md
```

**NÃO perguntar ao usuário para repetir tudo. Reconstruir do repositório primeiro.**

---

## CENÁRIO 2: TROCA DE COMPUTADOR

### Processo Completo

```bash
# 1. Clonar repo correto (quando houver remote)
# git clone <remote-url>
# cd investidor10-dashboard

# 2. Se local only - copiar workspace
# scp/rsync de máquina anterior OU usar backup
cp -r "G:\Meu Drive\Codex\investidor10-dashboard" /novo/workspace/

# 3. Validar remote (se existir)
git remote -v
git fetch
git status

# 4. Checkout main
git checkout main 2>/dev/null || echo "Local only"

# 5. Confirmar origin/main (se remote)
git rev-parse origin/main 2>/dev/null || echo "No remote"

# 6. Ler .project-identity e ajustar WORKSPACE local se necessário
# WORKSPACE pode mudar; PROJECT_NAME, REPOSITORY, BACKUP_PATH não mudam

# 7. Rodar identity gate
cat .project-identity
# Validar campos

# 8. Ler docs canônicos (ordem acima)

# 9. Instalar deps
npm ci
npx playwright install

# 10. Validar: testes passam
python serve.py &
npx playwright test --project=desktop
```

---

## CENÁRIO 3: WORKTREE CORROMPIDA (HEAD OK mas arquivos errados)

### Detecção

```bash
# Sintomas:
# - HEAD/main correto
# - Mas arquivos mostram conteúdo histórico/antigo
# - git status mostra centenas de modificações não intencionais

# Diagnóstico:
git status --short
git diff HEAD --name-only | head -20
# Classificar cada arquivo:
# PRESERVE | CORRUPTED_HISTORICAL | UNKNOWN
```

### Recuperação Seletiva (NUNCA global)

```bash
# 1. Inventariar + preservar hashes
find . -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sha256sum > /tmp/hashes_before.txt

# 2. Identificar arquivos legítimos (PRESERVE)
# - Docs canônicas (docs/ai/*.md, DECISIONS.md, etc.)
# - Configs recentes (.project-identity, playwright.config.js)
# - Testes atualizados (tests/e2e/*.spec.js)
# - Novos centros (src/*/)

# 3. Identificar corrupção histórica
# - Arquivos que voltaram para versão antiga
# - Conteúdo que não bate com PROJECT_STATE.md

# 4. Recuperar seletivamente (arquivo por arquivo)
git checkout HEAD -- <arquivo_corrompido>
# OU copiar do backup
cp "G:\Meu Drive\Codex\investidor10-dashboard\<arquivo>" .

# 5. Verificar interseção PRESERVE x RECOVERY = 0
# 6. Validar: recovered file == HEAD; preserved file hash unchanged

# 7. Testes completos
npx playwright test
```

---

## CENÁRIO 4: SERVIDOR CAI / INSTÁVEL

### Diagnóstico Rápido

```bash
# Verificar processo
ps aux | grep serve.py
netstat -an | grep 8765

# Verificar logs
tail -50 serve.log
tail -100 server.log

# Causas conhecidas:
# - ThreadingHTTPServer sob carga paralela Playwright
# - ConnectionAbortedError [WinError 10053] (cliente fechou - normal)
# - Port already in use
```

### Recuperação

```bash
# 1. Matar processos órfãos
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *serve.py*" 2>/dev/null
# Ou: pkill -f serve.py

# 2. Verificar porta livre
netstat -an | findstr 8765

# 3. Reiniciar
cd /c/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard
python serve.py > serve.log 2>&1 &

# 4. Health check
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:8765
# Deve retornar 200

# 5. Se instável persistir → aumentar thread pool ou serializar testes
# Editar serve.py: ThreadingHTTPServer -> aumentar max threads
# Editar playwright.config.js: workers: 1 (serializar)
```

---

## CENÁRIO 5: DADOS REAIS CORROMPIDOS / PERDIDOS

### Camadas de Recuperação (Ordem de Prioridade)

```bash
# 1. IndexedDB do browser (mais recente)
# F12 → Application → IndexedDB → investidor10 → exportar

# 2. localStorage
# F12 → Application → Local Storage → exportar

# 3. App Backup Portability (JSON exportado pelo usuário)
# Aba "Backup Port." → Exportar → arquivo JSON v2

# 4. Backup sensível local
cp "G:\Meu Drive\Codex\investidor10-dashboard\carteira-data.js" .

# 5. Backup sensível exportado (JSON v2 do usuário)
# Usar aba "Backup Port." → Importar

# 6. Dados originais B3 (PDF/Excel) → re-importar via Import Center
# Aba "Importar" → B3 JSON/CSV/Excel

# 7. Reconstruir do zero (último recurso)
# carteira-data.js tem dados hardcoded de 26/09/2026
```

### Validação Pós-Recuperação

```bash
# Verificar métricas-chave
# Patrimônio: R$ 610.219,89
# Investido: R$ 630.889,63
# P&L: -3,28%
# Yield 12m: 5,73%
# Ativos: 40
# Transações: 72
# Proventos: 435
```

---

## CENÁRIO 6: GIT REPO CORROMPIDO / GRANDE

### Investigação (NÃO apagar .git/objects)

```bash
git count-objects -vH
git fsck --full
git rev-list --objects --all | sort -k2 -n -r | head -20
git verify-pack -v .git/objects/pack/*.idx | sort -k3 -n -r | head -20
```

### Causas Comuns
- Dangling large blob
- Interrupted repack
- Old binary (ZIP, screenshots, videos)
- Build artifacts commitados acidentalmente

### Recuperação (Após Backup Verificado)

```bash
# 1. Backup verificado (SHA256 + restore test)
# 2. Healthy repository (git fsck clean)
# 3. Idle Git
# 4. Ref snapshot: git for-each-ref > /tmp/refs_backup.txt
# 5. git gc --aggressive --prune=now
# 6. Verificar: git fsck clean, tamanho reduzido
# 7. Validar: testes passam, HEAD correto
```

---

## CENÁRIO 7: TESTES FLAKY / CI FALHANDO

### Flaky Test (import.spec.js)

```bash
# 1. Rodar 3x para confirmar flaky
for i in 1 2 3; do npx playwright test --project=desktop tests/e2e/import.spec.js; done

# 2. Analisar: timeout no waitForSelector('#panel-import:not([hidden])')
# Root cause: switchTab/init() timing

# 3. Fix: aumentar timeout ou melhorar waitForFunction
# tests/e2e/import.spec.js linha 22

# 4. Validar: 3x consecutivas passing
```

### CI Falhando (Quando Ativado)

```bash
# 1. Verificar CI_COMMIT_SHA == COMMIT_SHA local
# 2. Verificar logs CI (não inferir "local passou")
# 3. Reproduzir localmente com mesmo ambiente
# 4. Fix + commit + push + aguardar CI real
```

---

## CENÁRIO 8: MODEL RATE LIMIT (HTTP 429)

### Auto-Fallback (MODEL_FALLBACK_FRAMEWORK.md)

```bash
# 1. Detectar 429
# 2. Exponential backoff: 1s, 2s, 4s, 8s, max 60s
# 3. Rotate provider: NVIDIA → OpenRouter → Ollama local
# 4. Mapear task para fallback model (AGENT_ROUTER.md)
# 5. Persistent task queue JSON
# 6. Health check contínuo
```

### Mapeamento Rápido

| Original Task | Fallback Model |
|---------------|----------------|
| nemotron-3-ultra (arch) | nemotron-3-nano-30b-a3b |
| Long context | deepseek-v4-pro-0813 |
| Tool calling | mistral-nemotron |
| PDF parsing | nemotron-parse |
| Optimization | cuopt |

---

## QUICK REFERENCE CARD

| Cenário | Primeiro Comando | Docs Chave |
|---------|------------------|------------|
| Chat apagado | `cat AGENTS.md` | PROJECT_STATE.md, NEXT_STEP.md |
| Novo computador | `cp backup → workspace` | .project-identity, PROJECT_MEMORY.md |
| Worktree corrompida | `git status --short` | STORAGE_AND_WORKTREE_POLICY.md |
| Servidor cai | `pkill -f serve.py; python serve.py &` | serve.log, server.log |
| Dados perdidos | F12 → IndexedDB | Backup Portability tab |
| Git gigante | `git count-objects -vH` | STORAGE_AND_WORKTREE_POLICY.md |
| Testes flaky | `npx playwright test 3x` | NEXT_STEP.md |
| Rate limit | Check MODEL_FALLBACK_FRAMEWORK.md | AGENT_ROUTER.md |

---

## PRINCÍPIOS DE RECUPERAÇÃO

1. **EVIDÊNCIA > RELATÓRIO** — Git real, testes reais, build real, diff real
2. **SELETIVO > GLOBAL** — Recuperar arquivo por arquivo, nunca `git checkout .`
3. **BACKUP VERIFICADO > CONFIANÇA** — Testar restore antes de confiar
4. **DOCUMENTAR > MEMORIZAR** — Atualizar PROJECT_STATE.md, NEXT_STEP.md após recovery
5. **HUMAN BLOCKER SE DÚVIDA** — Parar se ambíguo (finanças, schema, destroy)