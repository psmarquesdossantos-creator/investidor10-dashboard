# AGENT USAGE GUIDE — Investidor10 Dashboard

**Rule:** Toda tarefa deve iniciar com a invocação da skill `using-superpowers` (via `skill_view(name='using-superpowers')`) antes de qualquer resposta ou ação, incluindo perguntas de esclarecimento. Após a invocação, indique o agente NVIDIA NIM recomendado para aquela tarefa conforme o `MODEL_SELECTION_GUIDE.md`.

## Como usar

1. **Antes de qualquer resposta**, chame:  
   `skill_view(name='using-superpowers')`  
   (isso já carrega a regra de iniciar com processo primeiro).

2. **Em seguida, na sua resposta**, indique claramente qual agente NVIDIA NIM será usado para aquela subtarefa, baseado na tabela abaixo ou no guia completo (`MODEL_SELECTION_GUIDE.md`).

3. **Se for delegar a subagentes**, use `delegate_task` com o campo `delegation.model` apontando para o modelo escolhido.

## Mapeamento rápido de tarefa → agente (resumido do MODEL_SELECTION_GUIDE.md)

| Tipo de tarefa | Agente recomendado | Quando usar |
|----------------|-------------------|-------------|
| **Raciocínio complexo / planejamento arquitetural** | `nemotron-3-ultra-550b-a55b` | Padrão para design, especificação, análise de dívida técnica, planejamento de sprint. |
| **Edição localizada / refatoração simples** | `nemotron-3-nano-30b-a3b` | Correção de bug, ajuste de UI, pequena alteração de função. |
| **Trabalho com grandes bases de código** | `deepseek-v4-pro-0813` ou `deepseek-v4-flash-0731` | Quando precisar de 1M de contexto (inteiro repositório). |
| **Parsing de PDFs / extração de tabelas** | `nemotron-parse` + `paddleocr` | Para entender documentos financeiros, extratos, relatórios. |
| **Ocr de imagens escaneadas** | `nemotron-ocr-v2` / `nemoretriever-ocr` | Quando o PDF é imagem apenas. |
| **Entendimento de gráficos / imagens** | `nemotron-3-nano-omni-30b-a3b-reasoning` | Para analisar screenshots, charts, fotos. |
| **Otimização de carteira / rebalanceamento** | `cuopt` | Solver de otimização de classe mundial. |
| **Workflow com muitas chamadas de função / ferramentas** | `mistral-nemotron` | Ideal para pipelines de importação, geração de dados estruturados. |
| **Geração de embeddings / busca semântica** | `nemotron-3-embed-1b` | Para RAG, busca em documentos. |
| **Auditoria de acessibilidade via screenshot** | `nemotron-3-nano-omni-30b-a3b-reasoning` | Pode analisar imagens para detectar problemas de contraste, tamanho de alvo, etc. |
| **Geração de testes E2E ou unitários** | `nemotron-3-ultra-550b-a55b` (E2E) ou `nemotron-3-nano-30b-a3b` (unitário) | Compreensão do fluxo total ou foco em unidade. |

## Exemplo de uso em resposta

> Usando `using-superpowers` para garantir que o processo seja seguido primeiro.  
> Para esta tarefa de criar o guia de uso de agente, seleciono o agente `nemotron-3-ultra-550b-a55b` (raciocínio complexo e documentação).  
> [continua com a resposta...]

## Observação importante

- Nunca pule a etapa de invocar `using-superpowers`, mesmo que pareça uma pergunta simples.  
- Se houver dúvida sobre qual agente usar, comece com `nemotron-3-ultra-550b-a55b` e reduza apenas se latência ou custo forem críticos.  
- Esta regra está gravada na memória permanente do Hermes para que todas as conversas futuras sigam esse padrão.

---
*Arquivo gerado automaticamente como parte da padronização do processo do projeto Investidor10 Dashboard.*