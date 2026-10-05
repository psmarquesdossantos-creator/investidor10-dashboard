# AGENT ROUTER — Investidor10 Dashboard

**Divisão de trabalho entre tipos de agentes/modelos. Capacidade > Nome do Modelo.**

---

## PRINCÍPIO

```
Nenhum projeto deve depender de um agente específico.
AGENT_INDEPENDENCE=true
CAPABILITY > MODEL_NAME
```

O projeto deve sobreviver à troca de modelo/runtime (Hermes ↔ Codex ↔ OpenCode ↔ outro).

---

## ROUTING BY TASK COMPLEXITY

### CRITICAL / HIGH STAKES (Raciocínio forte, contexto longo, precisão)

| Task Type | Recommended Model | Fallback |
|-----------|-------------------|----------|
| Arquitetura / Design de sistema | `nemotron-3-ultra-550b-a55b` | `deepseek-v4-pro-0813` |
| Planejamento multi-etapa (writing-plans) | `nemotron-3-ultra-550b-a55b` | `deepseek-v4-pro-0813` |
| Cálculos financeiros (TWR, XIRR, VaR, IRPF) | `nemotron-3-ultra-550b-a55b` | `cuopt` (otimização) |
| Persistência / Schema / Migration | `nemotron-3-ultra-550b-a55b` | `deepseek-v4-pro-0813` |
| Segurança / CSP / Headers | `nemotron-3-ultra-550b-a55b` | `nemotron-3-super-120b-a12b` |
| Recuperação Git / Corrupção workspace | `nemotron-3-ultra-550b-a55b` | `deepseek-v4-pro-0813` |
| Semântica financeira / Governança dados | `nemotron-3-ultra-550b-a55b` | `doubt-driven-development` skill |
| Auditoria completa / Code review | `nemotron-3-ultra-550b-a55b` | `deepseek-v4-pro-0813` |

### STANDARD / NORMAL (Tarefas típicas de desenvolvimento)

| Task Type | Recommended Model | Fallback |
|-----------|-------------------|----------|
| UI/UX Design (impeccable, frontend-design) | `nemotron-3-ultra-550b-a55b` | `nemotron-3-nano-omni-30b-a3b-reasoning` (screenshots) |
| Implementação feature (TDD) | `nemotron-3-ultra-550b-a55b` | `nemotron-3-nano-30b-a3b` |
| Refatoração localizada | `nemotron-3-nano-30b-a3b` | `nemotron-3-ultra-550b-a55b` |
| Bug fix / surgical-patch | `nemotron-3-nano-30b-a3b` | `systematic-debugging` skill |
| Testes E2E / Playwright | `nemotron-3-nano-30b-a3b` | `nemotron-3-ultra-550b-a55b` (E2E complexo) |
| Documentação / Docs | `nemotron-3-super-120b-a12b` | `nemotron-3-nano-30b-a3b` |
| CI/CD / YAML | `nemotron-3-super-120b-a12b` | `nemotron-3-nano-30b-a3b` |

### SIMPLE / FAST (Leitura, grep, pequenos ajustes)

| Task Type | Recommended Model | Fallback |
|-----------|-------------------|----------|
| Leitura de arquivos / grep | `nemotron-3-nano-30b-a3b` | Qualquer |
| Geração de relatório / summary | `nemotron-3-nano-30b-a3b` | Qualquer |
| Pequenas alterações mecânicas | `nemotron-3-nano-30b-a3b` | Qualquer |
| Extração de dados / parsing | `mistral-nemotron` | `nemotron-parse` |

### SPECIALIZED CAPABILITIES

| Capability | Model | When |
|------------|-------|------|
| PDF parsing / tabelas | `nemotron-parse` + `paddleocr` | Extratos B3, proventos PDF |
| OCR imagens escaneadas | `nemotron-ocr-v2` / `nemoretriever-ocr` | PDFs que são só imagem |
| Entendimento screenshots/charts | `nemotron-3-nano-omni-30b-a3b-reasoning` | Visual QA, chart analysis |
| Otimização carteira/rebalance | `cuopt` | Solver de classe mundial |
| Workflow muitas function calls | `mistral-nemotron` | Pipeline import, geração estruturada |
| Embeddings / busca semântica | `nemotron-3-embed-1b` | RAG, busca docs |
| Contexto muito longo (>100k tokens) | `deepseek-v4-pro-0813` | Repo inteiro, logs grandes |

---

## FALLBACK FRAMEWORK (Auto on HTTP 429)

```
Consulte: MODEL_FALLBACK_FRAMEWORK.md

Rotation on rate limit:
  1. NVIDIA primary → 429 detected
  2. Retry with exponential backoff (1s, 2s, 4s, 8s, max 60s)
  3. Rotate provider: NVIDIA → OpenRouter → Ollama local
  4. Map task to fallback model (table above)
  5. Persistent task queue in JSON
  6. Continuous health check
```

---

## DELEGATION RULES (delegate_task)

```json
{
  "delegation": {
    "provider": "nvidia",
    "model": "nemotron-3-ultra-550b-a55b"  // ou conforme tabela acima
  }
}
```

**Sempre** passar no `context`:
- Output language: "pt-BR"
- Project: "investidor10-dashboard"
- Workspace: "C:\\Users\\Paulinho\\AppData\\Local\\hermes\\cache\\scratch\\investidor10-dashboard"
- Governance rules: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE≠DATA_READY
- Required skills: consultar SKILLS_ROUTING.md

---

## INDEPENDENT REVIEW (Não auto-review)

```
Antes de:
  - Filesystem deletion
  - Git maintenance (gc, repack)
  - Migration (schema, backup version)
  - Financial/data mutation
  - Release / Deploy
  - Security-sensitive change

USAR:
  - Outro agente (Codex se Hermes, Hermes se Codex)
  - Outro modelo (nemotron-3-ultra se nemotron-3-nano, etc.)
  - Outra implementação (skill diferente)

NUNCA chamar auto-review do mesmo agente de "independent".
```