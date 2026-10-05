# Import Center Cross-Source + Corporate Events Center + Data Trust Center + Backup Portability — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar quatro centros transversais que elevam o dashboard de "ferramenta funcional" para "plataforma vitalícia de gestão de carteira": Import Center (multi-fonte), Corporate Events (eventos B3 automáticos), Data Trust (confiança por ativo/fonte), Backup Portability (export/import universal).

**Architecture:** Quatro módulos independentes mas integrados via pipeline compartilhado (`ImportPipeline` existente). Cada centro expõe API clara (`initImportCenter`, `initCorporateEvents`, `initDataTrust`, `initBackupPortability`) e registra-se no `MutationObserver` de abas. Dados fluem: **Import → Normalize → Validate → Preview → Confirm → Write → Snapshot → Engines**.

**Tech Stack:** Vanilla JS (ES modules), IndexedDB (persistência), Chart.js (já presente), brapi.dev (preços), B3 API pública (eventos/posição), SheetJS/xlsx (Excel export), FileReader API (drag-drop), Web Workers (parsing pesado).

**Spec:** Este documento.

---

## Global Constraints

- **Governança financeira**: UNKNOWN≠ZERO, PARTIAL≠COMPLETE, STALE≠FRESH, ENGINE_AVAILABLE≠DATA_READY — **nunca inventar preços/histórico/benchmarks**
- **Pipeline importação**: FILE→DETECT→PARSE→NORMALIZE→VALIDATE→PREVIEW→DEDUP→CONFIRM→WRITE — preview obrigatório, `writes=0` antes de confirm
- **Snapshots determinísticos**: hash SHA-256 diário, retenção 365 dias, `SnapshotManager` existente
- **Acessibilidade**: WCAG 2.1 AA, axe critical=0, touch targets ≥44px, focus-visible, heading hierarchy
- **Performance**: mobile 390×844 sem overflow horizontal, animações <300ms transform/opacity, `prefers-reduced-motion`
- **Identidade visual**: **Azul #1A73E8 mantido** (decisão do usuário), Inter font, dark mode WCAG AA (#F8FAFC/#CBD5E1/#94A3B8/#020617)
- **Testes**: Playwright E2E (desktop 1366×768 + mobile 390×844), a11y em todas abas, 82/82 passing baseline
- **Backup**: `G:\Meu Drive\Codex\investidor10-dashboard\` sincronizado a cada fase

---

## Review Focus

1. **Import de CSV malformado** (encoding ISO-8859-1, delimitador `;`, decimal `,`) → deve detectar, normalizar para UTF-8/CSV padrão, mostrar preview com erros destacados
2. **Evento corporativo sem data de ex** (split anunciado mas não efetivado) → mostrar como `PENDING`, não alterar posição até confirmação
3. **Dados STALE em snapshot** (>1h sem atualização de preço) → badge `⏳ Desatualizado` no KPI, não usar em Monte Carlo/Tax sem aviso
4. **Backup v1 → v2 migration** (schema change) → migração automática silenciosa com log, rollback se falhar
5. **Conflito de deduplicação** (mesmo ativo em B3 + CSV XP) → regra: B3 vence (fonte oficial), CSV preenche gaps, log de conflitos visível no preview

---

## 1. Import Center Cross-Source

### 1.1 Arquitetura

```
ImportCenter (orchestrador)
├── Detector (formato → {format, confidence, parser})
├── Parsers (um por fonte)
│   ├── B3PositionParser (JSON oficial B3)
│   ├── B3EventsParser (CSV eventos corporativos)
│   ├── BrokerCSVParser (XP, Inter, Rico, Clear — detecta por header)
│   ├── BrapiPriceEnricher (preenche currentPrice via brapi.dev)
│   └── GenericCSVParser (fallback genérico com mapeamento manual)
├── Normalizer (campos → schema interno CARTEIRA_DATA)
├── Validator (regras: qtd>0, preço>0, data válida, ticker B3 válido)
├── PreviewUI (tabela comparativa: atual vs importado, conflitos, gaps)
├── Deduper (regra: B3 > broker CSV > manual; merge inteligente)
└── Writer (aplica no MOCK_DATA + CARTEIRA_DATA + SnapshotManager.capture)
```

### 1.2 Fontes Suportadas (MVP)

| Fonte | Formato | Detecção | Campos Mapeados |
|-------|---------|----------|-----------------|
| **B3 Posição** | JSON (backup Investidor10) | `payload.state.assets` | ticker, name, qty, avg_price, current_price, type, sector |
| **B3 Eventos** | CSV (site B3) | header `Tipo;Data;Ativo;Quantidade;Preço` | split, merge, bonus, subscription, amortization |
| **XP/Inter/Rico/Clear** | CSV (extrato/posição) | header conhecido por corretora | ticker, qtd, preco_medio, preco_atual, tipo |
| **brapi.dev** | REST API | enriquecimento opcional | currentPrice, regularMarketChange, dy |

### 1.3 Schema Interno (CARTEIRA_DATA v2)

```typescript
interface CarteiraDataV2 {
  version: 2;
  meta: { importedAt: string; sources: string[]; hash: string };
  kpis: KPIs;
  monthly: MonthlyPoint[];
  patrimony: PatrimonySeries;
  allocation: { byAsset: AssetAlloc[]; byClass: ClassAlloc[] };
  positions: Position[];           // unificado: posições atuais
  earnings: Earning[];             // proventos históricos
  entries: Entry[];                // lançamentos (compras/vendas/eventos)
  assetReturns: AssetReturn[];     // rentabilidade por ativo
  corporateEvents: CorporateEvent[]; // NOVO: log de eventos aplicados
  dataLineage: DataLineage[];      // NOVO: rastreabilidade por campo
}
```

### 1.4 UI — Aba "Importar" (nova tab no grupo Configurações)

- Dropzone drag-drop + click para selecionar
- Seletor de fonte (auto-detect / manual)
- Pipeline visual: 8 steps com status (⏳/✅/❌)
- Preview: tabela lado-a-lado (atual vs novo), conflitos em vermelho, gaps em amarelo
- Botão "Confirmar Importação" só habilitado após preview válido
- Toast + badge DataState atualizado para `FRESH` após write

---

## 2. Corporate Events Center

### 2.1 Tipos de Eventos (MVP)

| Evento | Ação na Posição | Entrada em `entries` | Regra |
|--------|-----------------|----------------------|-------|
| **Split (desdobramento)** | `qty *= ratio; avgPrice /= ratio` | `type: 'split', qty: delta, price: 0` | Ratio inteiro (ex: 1:2 → ratio=2) |
| **Merge (grupamento)** | `qty /= ratio; avgPrice *= ratio` | `type: 'merge', qty: -delta, price: 0` | Ratio inteiro (ex: 10:1 → ratio=10) |
| **Bonificação** | `qty += bonusQty; avgPrice unchanged` | `type: 'bonus', qty: bonusQty, price: 0` | % sobre posição (ex: 10% → 0.1*qty) |
| **Subscrição** | `qty += subscribedQty; avgPrice = weighted` | `type: 'subscription', qty: +, price: strike` | Preço de exercício conhecido |
| **Amortização (FII/RF)** | `qty -= amortizedQty; realizedGain +=` | `type: 'amortization', qty: -, price: unit` | Principal devolvido, ganho realizado |

### 2.2 Pipeline de Eventos

```
CorporateEventsCenter
├── Fetcher (B3 API / CSV upload / entrada manual)
├── Classifier (detecta tipo por padrão: "DESDOBRAMENTO", "BONIFICAÇÃO", etc.)
├── Validator (data ex ≥ hoje? ratio inteiro? ticker existe na carteira?)
├── Preview (simula impacto: posição antes/depois, P&L realizado)
├── Applier (transação atômica: positions + entries + corporateEvents log)
└── Notifier (toast + badge DataState + announcer A11y)
```

### 2.3 UI — Sub-aba em "Análise" ou painel dedicado

- Lista de eventos detectados (pendentes/confirmados/histórico)
- Card por evento: tipo, ticker, data ex, ratio/%, impacto simulado
- Ações: Confirmar, Rejeitar, Editar manual
- Filtro por status e período

---

## 3. Data Trust Center

### 3.1 Confidence Scoring Estendido

Reutiliza `RFConfidence` (5 níveis) e estende para **todas classes**:

```typescript
type ConfidenceLevel = 'SUPPORTED' | 'SHADOW' | 'MANUAL' | 'STALE' | 'UNKNOWN';

interface ConfidenceConfig {
  source: 'B3' | 'BROKER_CSV' | 'BRAPI' | 'MANUAL' | 'SNAPSHOT';
  lastUpdate: number;           // timestamp
  hasMTM: boolean;              // mark-to-market disponível
  primaryCustodian: boolean;    // custódia primária (B3)
  stalenessThreshold: number;   // ms (default: 1h para preços, 24h para posições)
}
```

**Regras de classificação** (por ativo + campo):

| Campo | SUPPORTED | SHADOW | MANUAL | STALE | UNKNOWN |
|-------|-----------|--------|--------|-------|---------|
| `currentPrice` | brapi.dev <1h | brapi.dev 1-24h | digitado | >24h | sem fonte |
| `qty` | B3 oficial | broker CSV | digitado | - | - |
| `avgPrice` | calculado entries | broker CSV | digitado | - | - |
| `earnings` | B3 oficial | broker CSV | digitado | >12m | - |

### 3.2 Badge Visual Unificado

- **Em KPIs**: `DataStates.renderBadge()` já existe → estender para todos cards
- **Em tabelas**: badge inline na primeira coluna (ícone + tooltip)
- **Legenda**: fixa no rodapé de painéis com dados (Risco, RF, Benchmarks, Import)

### 3.3 Auditoria de Snapshots

- `SnapshotManager.verifyIntegrity()` — compara hash armazenado vs recalculado
- Relatório: `OK`, `CORRUPTED`, `MISSING_DAYS` (gaps >1 dia)
- Alerta se `STALE` > 7 dias consecutivos

---

## 4. Backup Portability

### 4.1 Formatos de Export

| Formato | Uso | Estrutura |
|---------|-----|-----------|
| **JSON v2** | Restore completo, migração | `CarteiraDataV2` (schema acima) |
| **CSV** | Excel/Sheets, análise rápida | 4 arquivos: `positions.csv`, `earnings.csv`, `entries.csv`, `events.csv` |
| **Excel (.xlsx)** | Usuário final, compartilhamento | 4 abas + aba `Metadata` (versão, data, hash, fontes) |

### 4.2 Import com Migração Automática

- Detecta `version` no JSON (v1 = legado, v2 = atual)
- `migrateV1toV2(data)` — adiciona `corporateEvents: []`, `dataLineage: []`, recalcula hashes
- Validação de schema (Zod-like leve) antes de confirmar
- Rollback automático se falhar (restaura `MOCK_DATA` anterior)

### 4.3 UI — Sub-aba em "Configurações"

- Export: botões JSON / CSV / Excel (com data no filename)
- Import: dropzone reaproveita ImportCenter, detecta formato, migra se v1
- Versionamento: lista últimos 10 backups com hash, data, tamanho, fonte
- Restore: seleciona backup → preview diff → confirmar

---

## 5. Integração com Engines Existentes

| Engine | Gatilho | Dados Consumidos |
|--------|---------|------------------|
| **ReturnEngine (TWR/XIRR)** | `SnapshotManager.capture()` pós-import | `snapshots`, `entries`, `kpis.total` |
| **RiskEngine** | Snapshot diário + posições atualizadas | `positions`, `patrimony`, `allocation` |
| **MonteCarlo** | Snapshot + posições | `allocation.byClass`, `patrimony`, `returns` |
| **TaxEngine** | `entries` + `earnings` + `corporateEvents` | ganhos realizados, amortizações, JCP |
| **RebalanceEngine** | Posições + metas | `positions`, `CARTEIRA_META.goals.allocation` |
| **BenchmarkEngine** | Preços atualizados (brapi.dev) | `benchmarks` auto-refresh |

**Fluxo unificado**: `ImportCenter.confirm()` → `SnapshotManager.capture('import')` → `renderAll()` → engines recalculam assincronamente.

---

## 6. Estrutura de Arquivos (Novos/Modificados)

### Novos Arquivos

```
src/
├── import-center/
│   ├── index.js                 # orchestrador público
│   ├── detectors.js             # detectFormat(file) → {format, parser}
│   ├── parsers/
│   │   ├── b3-position.js
│   │   ├── b3-events.js
│   │   ├── broker-csv.js        # XP, Inter, Rico, Clear
│   │   ├── brapi-enricher.js
│   │   └── generic-csv.js
│   ├── normalizer.js            # → CarteiraDataV2
│   ├── validator.js             # regras + erros estruturados
│   ├── preview-ui.js            # tabela diff, conflitos, gaps
│   ├── deduper.js               # merge inteligente
│   └── writer.js                # apply + snapshot
├── corporate-events/
│   ├── index.js
│   ├── fetcher.js               # B3 API + CSV + manual
│   ├── classifier.js            # string → tipo evento
│   ├── simulator.js             # preview impacto
│   ├── applier.js               # transação atômica
│   └── ui.js                    # painel eventos
├── data-trust/
│   ├── index.js
│   ├── confidence.js            # estende RFConfidence
│   ├── badge-renderer.js        # KPI + tabelas
│   ├── snapshot-audit.js        # verifyIntegrity()
│   └── lineage.js               # DataLineage por campo
└── backup-portability/
    ├── index.js
    ├── exporters/
    │   ├── json-v2.js
    │   ├── csv.js
    │   └── excel.js             # SheetJS
    ├── importers/
    │   ├── json-v1.js           # migração v1→v2
    │   └── json-v2.js
    └── version-manager.js       # lista/restore backups
```

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Nova tab "Importar" (grupo Configurações), sub-abas Eventos/Backup em Análise/Config |
| `styles.css` | Estilos: pipeline steps, preview diff table, confidence badges, event cards, backup version list |
| `script.js` | Registro dos 4 centros no `MutationObserver`, init nas abas correspondentes |
| `real-mode.js` | `initAdvancedFeatures()` chama `initImportCenter()`, `initCorporateEvents()`, `initDataTrust()`, `initBackupPortability()` |
| `advanced-engine.js` | Export `ImportPipeline`, `CorporateEventsEngine`, `DataTrust`, `BackupManager` |

---

## 7. Testes (Playwright E2E)

| Teste | Cenário | Assertiva |
|-------|---------|-----------|
| `import-b3-json.spec.js` | Drag-drop backup Investidor10 → preview → confirm | `CARTEIRA_DATA` atualizado, snapshot criado, DataState=FRESH |
| `import-broker-csv.spec.js` | Upload CSV XP → detecta corretora → preview conflitos B3 | Conflitos marcados, B3 vence, gaps preenchidos |
| `corporate-events-split.spec.js` | Simula split PETR4 1:2 → confirm → verifica qtd/preço médio | `qty*=2`, `avgPrice/=2`, entry tipo split criada |
| `corporate-events-bonus.spec.js` | Bonificação HGLG11 10% → confirm | `qty+=10%`, entry tipo bonus, P&L não alterado |
| `data-trust-badges.spec.js` | Abre abas → verifica badges em KPIs e tabelas | Badge correto por fonte/idade, tooltip com descrição |
| `data-trust-snapshot-audit.spec.js` | Corrompe snapshot → roda auditoria | Detecta `CORRUPTED` ou `MISSING_DAYS` |
| `backup-export-json.spec.js` | Export JSON → download → import → restore idêntico | Hash idêntico, `CARTEIRA_DATA` igual |
| `backup-export-excel.spec.js` | Export Excel → abre no Excel → 4 abas + Metadata | Estrutura correta, dados íntegros |
| `backup-migration-v1.spec.js` | Import JSON v1 (legado) → migra auto → v2 | `version=2`, `corporateEvents=[]`, `dataLineage=[]` |

---

## 8. Sequência de Implementação (Dependency Order)

1. **ImportCenter** (base — parsers, normalizer, validator, preview, writer)
2. **CorporateEvents** (usa ImportCenter.parser para B3 events, writer compartilhado)
3. **DataTrust** (estende RFConfidence, integra badges em UI existente)
4. **BackupPortability** (usa ImportCenter.detector + normalizer + writer inverso)
5. **Integração UI** (tabs, MutationObserver, init em real-mode.js)
6. **Testes E2E** (9 suítes acima)
7. **Documentação** (README atualizado, CHANGELOG)

---

## 9. Critérios de Aceitação (Definition of Done)

- [ ] Import Center: B3 JSON + 3 CSVs broker + brapi.dev enriquecimento → preview → confirm → snapshot → engines OK
- [ ] Corporate Events: split/merge/bonus/subscription/amortization → preview impacto → apply atômico → log
- [ ] Data Trust: badge em 100% KPIs + tabelas, auditoria snapshots detecta corrupção/gaps
- [ ] Backup Portability: export JSON/CSV/Excel → import com migração v1→v2 → restore idêntico
- [ ] 82/82 testes existentes **não regressam** + 9 novos testes passing
- [ ] A11y: axe critical=0 em novas abas/painéis, touch targets ≥44px, focus-visible
- [ ] Mobile: 390×844 sem overflow, tabs scrollável, tabelas colapsam
- [ ] Dark mode: contraste WCAG AA mantido em todos novos componentes
- [ ] Backup `G:\Meu Drive\Codex\investidor10-dashboard\` sincronizado

---

## 10. Riscos & Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CSV broker com encoding inesperado | Alta | Médio | `TextDecoder('iso-8859-1')` fallback, preview mostra garbled text |
| B3 API muda formato | Média | Alto | Versionamento no detector, parser tolerante a campos extras |
| Conflito deduplicação complexo | Média | Médio | Regra clara (B3 > broker > manual), log visível, usuário decide no preview |
| SheetJS bundle size | Baixa | Baixo | Dynamic import `import('xlsx')` só no botão Export Excel |
| Performance parsing 10k+ linhas | Baixa | Médio | Web Worker para parse >500 linhas, skeleton loading |

---

**Próximo passo após aprovação:** Invocar `writing-plans` para gerar plano de implementação task-by-task com assinaturas, testes e comandos exatos.