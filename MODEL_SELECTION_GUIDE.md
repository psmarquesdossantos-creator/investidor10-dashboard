# NVIDIA NIM Model Selection Guide — Investidor10 Dashboard

Reference: https://build.nvidia.com/models?filters=nimType%3Anim_type_preview

---

## Model Catalog (Relevant Subset)

| Model | Size | Context | Strengths | Best For |
|-------|------|---------|-----------|----------|
| **nemotron-3-ultra-550b-a55b** | 550B (55B active) | 1M | Agentic reasoning, coding, planning, tool calling | **Default/Complex tasks** — Current model |
| **nemotron-3-super-120b-a12b** | 120B (12B active) | 1M | Agentic reasoning, coding, planning, tool calling | **Faster complex tasks** — When ultra is overkill |
| **nemotron-3-nano-30b-a3b** | 30B (3B active) | 1M | Coding, reasoning, instruction following, tool calling | **Quick edits, simple refactors** |
| **nemotron-3.5-lightning-30b-a3b** | 30B (3B active) | ? | Fastest, specialized agentic tasks | **Low-latency interactive** |
| **deepseek-v4-pro-0813** | ? | 1M | Coding tasks, efficient MoE | **Large codebase work, multi-file edits** |
| **deepseek-v4-flash-0731** | 284B (13B active) | 1M | Long-context, coding, chat, agentic | **Huge context needs** (entire repo) |
| **mistral-nemotron** | ? | ? | Agentic workflows, coding, function calling | **Function/tool-heavy workflows** |
| **nemotron-3-nano-omni-30b-a3b-reasoning** | 30B | ? | Omni-modal (image, video, speech, text) | **Multimodal: screenshots, charts, PDFs** |
| **nemotron-parse** | ? | ? | Vision-language: text + metadata from images | **PDF parsing, document understanding** |
| **nemotron-ocr-v2** | ? | ? | Multilingual OCR on complex real-world images | **Scanned PDFs, images with tables** |
| **nemotron-table-structure-v1** | ? | ? | Detect charts, tables, titles in documents | **Financial reports, statements** |
| **nemotron-graphic-elements-v1** | ? | ? | Detect charts, tables, titles | **Chart extraction from PDFs** |
| **paddleocr** | ? | ? | Table extraction + OCR + bounding boxes | **Structured table data from PDFs** |
| **nemoretriever-ocr** | ? | ? | Fast OCR, layout, structure analysis | **Quick PDF text extraction** |
| **nemotron-3-embed-1b** | 1B | ? | Semantic search, retrieval, RAG | **Embeddings for docs, search** |
| **cuopt** | ? | ? | Route optimization, complex optimization | **Portfolio optimization, rebalancing** |

---

## Task → Model Mapping

### 🏗️ **Architecture & Planning**
| Task | Model | Why |
|------|-------|-----|
| System design, ADR writing | `nemotron-3-ultra-550b-a55b` | Best reasoning, long context |
| Sprint planning, task breakdown | `nemotron-3-super-120b-a12b` | Fast, structured output |
| Tech debt analysis | `deepseek-v4-pro-0813` | Coding-savvy, large context |

### 💻 **Code Implementation**
| Task | Model | Why |
|------|-------|-----|
| New feature (multi-file) | `nemotron-3-ultra-550b-a55b` | Best agentic coding |
| Bug fix (localized) | `nemotron-3-nano-30b-a3b` | Fast, precise |
| Refactor large module | `deepseek-v4-pro-0813` | 1M context, coding focus |
| TypeScript/JS complex types | `mistral-nemotron` | Strong TS, function calling |
| Algorithm implementation (TWR/XIRR) | `nemotron-3-ultra-550b-a55b` | Mathematical reasoning |

### 📄 **Document Processing (PDFs, Reports)**
| Task | Model | Why |
|------|-------|-----|
| Parse B3 position PDF | `nemotron-parse` / `nemotron-table-structure-v1` | Purpose-built for tables |
| OCR scanned statements | `nemotron-ocr-v2` / `nemoretriever-ocr` | Best OCR quality |
| Extract tables from PDF | `paddleocr` | Returns structured tables + bbox |
| Chart/image understanding | `nemotron-3-nano-omni-30b-a3b-reasoning` | Omni-modal reasoning |
| Quick text extraction | `nemoretriever-ocr` | Fast, good enough |

### 📊 **Financial Calculations & Optimization**
| Task | Model | Why |
|------|-------|-----|
| Portfolio optimization | `cuopt` | World-record optimization solver |
| Rebalancing algorithms | `nemotron-3-ultra-550b-a55b` | Complex math + constraints |
| Risk metrics (VaR, Sharpe) | `nemotron-3-ultra-550b-a55b` | Quantitative reasoning |
| Tax optimization | `deepseek-v4-pro-0813` | Complex rule-based logic |

### 🔍 **Data Analysis & Reconciliation**
| Task | Model | Why |
|------|-------|-----|
| Schema mapping (CSV→JSON) | `mistral-nemotron` | Function calling, structured output |
| Data quality rules | `nemotron-3-super-120b-a12b` | Fast validation logic |
| Deduplication logic | `nemotron-3-nano-30b-a3b` | Algorithmic, deterministic |

### 🧪 **Testing & Quality**
| Task | Model | Why |
|------|-------|-----|
| E2E test generation | `nemotron-3-ultra-550b-a55b` | Understands full app flow |
| Unit test generation | `nemotron-3-nano-30b-a3b` | Fast, focused |
| Accessibility audit | `nemotron-3-nano-omni-30b-a3b-reasoning` | Can analyze screenshots |
| Performance analysis | `deepseek-v4-flash-0731` | Long context for flamegraphs |

### 📚 **Documentation & Knowledge**
| Task | Model | Why |
|------|-------|-----|
| API docs generation | `deepseek-v4-pro-0813` | Code-aware, large context |
| Architecture diagrams (Mermaid) | `nemotron-3-ultra-550b-a55b` | Structured output |
| Changelog from commits | `nemotron-3-super-120b-a12b` | Summarization |
| RAG embeddings for docs | `nemotron-3-embed-1b` | Purpose-built |

---

## Delegation Strategy (Hermes Skills)

Use Hermes's `delegate_task` with subagents pinned to specific models:

```yaml
# Example: Delegate PDF parsing to nemotron-parse
delegation:
  provider: nvidia
  model: nemotron-parse
  
# Example: Delegate optimization to cuopt  
delegation:
  provider: nvidia
  model: cuopt

# Example: Delegate coding to deepseek-v4-pro
delegation:
  provider: nvidia
  model: deepseek-v4-pro-0813
```

---

## Current Project Model Assignments

| Component | Assigned Model | Status |
|-----------|----------------|--------|
| Dashboard core (script.js) | `nemotron-3-ultra-550b-a55b` | ✅ Active |
| Advanced engine (TWR/XIRR) | `nemotron-3-ultra-550b-a55b` | ✅ Done |
| Import pipeline | `mistral-nemotron` | 🔄 Next |
| PDF parsing (new PDFs) | `nemotron-parse` + `paddleocr` | 🔄 Next |
| Portfolio optimization | `cuopt` | 📋 Planned |
| Accessibility audit | `nemotron-3-nano-omni-30b-a3b-reasoning` | 📋 Planned |
| Test generation | `nemotron-3-nano-30b-a3b` | 📋 Planned |

---

## Usage Rules

1. **Default to `nemotron-3-ultra-550b-a55b`** for anything requiring deep reasoning, multi-step planning, or cross-file changes
2. **Downsize to `nemotron-3-nano-30b-a3b`** for localized edits, simple refactors, quick answers
3. **Use specialized models** for their domain: `nemotron-parse` for PDFs, `cuopt` for optimization, `nemotron-3-embed-1b` for embeddings
4. **Use `deepseek-v4-pro-0813`** when you need 1M context (entire codebase in context)
5. **Use `nemotron-3-nano-omni-30b-a3b-reasoning`** for any image/video/speech input
6. **Never guess** — if unsure, start with ultra and downsize if latency/cost matters

---

## Next Immediate Actions

1. **Parse 3 new PDFs** → delegate to `nemotron-parse` + `paddleocr`
2. **Implement import pipeline UI** → `mistral-nemotron` (function calling heavy)
3. **Portfolio optimization engine** → `cuopt`
4. **A11y audit via screenshots** → `nemotron-3-nano-omni-30b-a3b-reasoning`