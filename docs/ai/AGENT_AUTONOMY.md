# AGENT AUTONOMY — Investidor10 Dashboard

**Define o que o agente pode fazer sozinho vs. quando deve parar e pedir autorização.**

---

## DO NOT WAIT FOR MINOR APPROVALS

```
DO_NOT_WAIT_FOR_MINOR_APPROVALS=true
FULL_AUTONOMY=true (quando risco permite)
NO_INTERMEDIATE_APPROVALS=true
FINAL_REPORT_ONLY=true
```

---

## PODE CONTINUAR SOZINHO (Autonomia Total)

### Read-Only / Analysis
- [x] Auditoria read-only (grep, read_file, search_files)
- [x] Análise de código / arquitetura
- [x] Leitura de docs / specs / decisions
- [x] Verificação de estado atual (git status, test results)
- [x] Screenshots / visual inspection (browser tools)
- [x] Extração de dados / parsing (não mutação)

### Tests & Builds
- [x] Rodar testes existentes (npx playwright test)
- [x] Rodar build / lint (node --check, python -m py_compile)
- [x] Instalar dependências (npm ci, npx playwright install)
- [x] Iniciar/parar servidor local (python serve.py)

### Documentation
- [x] Atualizar docs canônicas (PROJECT_MEMORY.md, PROJECT_STATE.md, NEXT_STEP.md, DECISIONS.md)
- [x] Gerar relatórios / summaries
- [x] Criar/atualizar CHANGELOG.md

### Safe Refactors (Non-Breaking)
- [x] Renomear variáveis/funções (escopo local)
- [x] Extrair constantes / helpers
- [x] Reorganizar imports
- [x] Formatação / lint fixes
- [x] Remover código morto (com evidência de não uso)

### Non-Destructive Validation
- [x] Verificar CSP headers
- [x] Validar schema JSON
- [x] Check accessibility (axe-core)
- [x] Verificar responsive breakpoints
- [x] Comparar snapshots visuais

---

## DEVE PARAR E PEDIR AUTORIZAÇÃO (Human Blocker)

### Wrong Project / Identity
- [ ] `HUMAN_BLOCKER_WRONG_PROJECT` — Identity gate falhou
- [ ] Workspace/remote/branch mismatch

### Credentials & Secrets
- [ ] Acesso a .env, tokens, API keys
- [ ] Credenciais de banco/cloud
- [ ] Browser profiles com login

### Destructive Filesystem Actions
- [ ] `rm -rf` / `git clean` / `git reset --hard`
- [ ] Apagar pastas/arquivos não gerados
- [ ] Mover arquivos entre projetos
- [ ] Sobrescrever arquivos protegidos (ver AGENTS.md §4)

### Schema / Data Migration
- [ ] Alterar schema de dados (carteira-data.js structure)
- [ ] Migration de backup (v1→v2, schema changes)
- [ ] ImportPipeline write real (CONFIRM step)
- [ ] IndexedDB/localStorage clear/write real

### Financial / Real Data Mutation
- [ ] Modificar dados reais da carteira (carteira-data.js)
- [ ] Cálculos de imposto/valuation em produção
- [ ] Geração de DARF/GCAP/XML IRPF real
- [ ] Qualquer escrita que afete dinheiro real

### Git History Rewrite
- [ ] `git rebase` (automático)
- [ ] `git commit --amend` (push forçado)
- [ ] `git filter-branch` / `git replace`
- [ ] Force push (`git push --force`)

### Merge / Deploy / Production
- [ ] Merge para main/production branch
- [ ] Deploy para produção
- [ ] Tag de release
- [ ] CI/CD pipeline activation

### Ambiguous Sensitive Data
- [ ] Dados que podem ser PII/financeiros mas não confirmados
- [ ] Arquivos em uploads/ não validados
- [ ] Backup JSON de origem desconhecida

### Canonical Source Conflict
- [ ] Conflito entre docs canônicas (AGENTS.md vs PROJECT_MEMORY.md)
- [ ] Decisão não documentada em DECISIONS.md
- [ ] Skill routing ambíguo

---

## ESCALATION PATH

```
1. Tentar resolver com autonomia (acima)
2. Se bloqueado → Documentar blocker em NEXT_STEP.md
3. Reportar ao usuário com:
   - O que tentou
   - Por que parou
   - Opções recomendadas
   - Risco de cada opção
4. Aguardar decisão explícita
5. Continuar após autorização
```

---

## LOOP GUARD (Anti-Loop Protection)

```
AGENT_LOOP_GUARD=true

Regras:
- Não repetir o mesmo comando mais de 2 vezes sem nova evidência
- Se ferramenta falhar 2 vezes → trocar estratégia
- Se leitura de arquivo falhar → tentar alternativa 1 vez
- Não produzir milhares de linhas de planejamento operacional
- Não narrar cada microação
- Depois de detectar loop → STATUS=HUMAN_BLOCKER_TOOL_LOOP → STOP
- Se FINAL_REPORT já existe → ler uma vez e retornar
- Não recriar trabalho já concluído sem necessidade

MAX_IDENTICAL_COMMAND_RETRIES=2
```

---

## MISSION BOUNDARIES

### Grandes Missões (Full Autonomy Permitido)
- Implementar feature completa (com writing-plans + TDD + verification)
- Refatoração arquitetural (com safe-refactor + tests)
- Auditoria completa + relatório
- Bootstrap governança (este trabalho)

### Grandes Missões (Precisam Acceptance Criteria)
- Escopo definido
- Acceptance criteria claros
- Arquivos permitidos listados
- Safety gates definidos
- Testes obrigatórios especificados
- Stop conditions definidas

**Não confundir autonomia com liberdade irrestrita.**

---

## DECISION MATRIX (Quick Reference)

| Ação | Autonomia? | Condição |
|------|------------|----------|
| Ler arquivo | ✅ Sempre | - |
| Grep/search | ✅ Sempre | - |
| Rodar teste | ✅ Sempre | - |
| Editar doc canônica | ✅ Sempre | Fim de missão |
| Fix bug (surgical-patch) | ✅ Sim | Escopo conhecido, testes passam |
| Nova feature | ⚠️ Com plano | writing-plans + TDD + verification |
| Refatorar engine core | ❌ Parar | Requer autorização + independent review |
| Mudar schema dados | ❌ Parar | Requer autorização + migration plan |
| Write real data | ❌ Parar | Requer CONFIRM explícito |
| Git push | ❌ Parar | Requer autorização |
| Deploy | ❌ Parar | Requer autorização + smoke test |
| Apagar worktree | ⚠️ Ver checklist | STORAGE_AND_WORKTREE_POLICY.md |
| Instalar skill | ❌ Parar | Requer autorização explícita |