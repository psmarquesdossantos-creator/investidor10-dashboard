# Arquitetura — Investidor10 Dashboard

```mermaid
graph TD
    subgraph Boot["Boot (scripts defer, ordem document order)"]
        A[chart.js + adapter<br/>head] --> B[carteira-data.js<br/>404 em produção]
        B --> C[auth demo-fixture + sources]
        C --> D[auth-gate.js<br/>INACTIVE/LOGIN/DEMO/REAL]
        D --> E[engines + import-center]
        E --> F[script.js init<br/>após DOMContentLoaded]
        F --> G[real-mode.js / panels.js / router.js]
    end

    subgraph Data["Fontes de dados (fonte única por contexto)"]
        H1[carteira-data.js<br/>local real R$702k] -->|__CARTEIRA_OVERRIDE| F
        H2[DEMO_FIXTURE 30k<br/>gate DEMO] --> F
        H3[localStorage<br/>investidor10-dashboard-data] -->|loadFromStorage| F
        H4[Importar Backup<br/>aba Backup] --> H3
        H5[Firestore P22<br/>login real] --> F
    end

    subgraph Tabs["18 abas → renderers"]
        T1[script.js<br/>KPIs, posições, proventos,<br/>lançamentos, charts]
        T2[panels.js LAZY_TABS<br/>data-trust, benchmarks, tax,<br/>backup-port, goals…]
        T3[real-mode.js<br/>calendário, rebalance,<br/>fixed, MC, risk, import]
    end

    F --> T1 & T2 & T3

    subgraph Storage["localStorage (keys reais)"]
        S1[investidor10-dashboard-data<br/>carteira persistida]
        S2[investidor10-snapshots<br/>SnapshotManager 365d]
        S3[auditSnapshots<br/>DataTrust]
        S4[investidor10:importHistory<br/>histórico de migrações]
    end

    T3 --> S4
```

## Módulos

| Arquivo | Papel |
|---|---|
| `script.js` | Core: MOCK_DATA interno, state, renderers primários, charts, paleta ⌘K, modal, PWA |
| `real-mode.js` | Features progressivas: calendário de proventos, import center UI, rebalance, MC/risk panels, live prices |
| `panels.js` | Lazy-render das abas secundárias (LAZY_TABS), DATA() = fonte única de leitura |
| `router.js` | Hash SPA: `#/tab?ticker=X` → filtro + highlight + scroll |
| `advanced-engine.js` | ReturnEngine (TWR/XIRR), SnapshotManager, RFConfidence, DataStates, A11y |
| `data-trust-engine.js` | Auditoria de qualidade → alertas por severidade |
| `src/auth/` | Gate P22 (auth-gate), fixture demo, sources (local-demo, firestore-real) |
| `src/import-center/` | Parsers B3/Inter/CSV, detectors, normalizer, validator, deduper, writer |
| `src/backup-portability/` | Export JSON/CSV/Excel + import de backup + durability (quarentena/restore) |
| `src/rebalance/`, `src/montecarlo/`, `src/data-trust/`, `src/corporate-events/` | Engines modulares (referência; a versão raiz é a carregada — cuidado com conflito de `window.*`) |
| `mc-worker.js` | Web Worker do Monte Carlo (importScripts; `var window = self` antes) |
| `serve.py` | ThreadingHTTPServer local: CSP, headers, upload ≤5MB |
| `scripts/build-dist.py` | Build de produção: allowlist + terser/cleancss + sanity de privacidade |
| `sw.js` | PWA network-first nos críticos; bump de CACHE_NAME a cada release |

## Fluxos críticos

- **Boot**: defer em ordem → gate resolve → init() aplica `__CARTEIRA_OVERRIDE` (real) OU
  `loadFromStorage()` (import) OU fixture (demo). Um único escritor por render.
- **Import**: FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW (com dedup explícito
  por chave econômica `date|ticker|type|valor`) → CONFIRM → DEDUP → WRITE + snapshot
  pré/pós + histórico (`investidor10:importHistory`).
- **Backup**: export JSON v2 completo; import aplica override + MOCK_DATA + persiste na
  chave que `loadFromStorage()` lê (seções completas: patrimony/allocation/monthly).
- **Produção**: github.io = lock→demo 30k (P26/P27); `*.vercel.app` = gate INACTIVE
  (Vercel Authentication cobre deployment URLs; alias público serve só sintético).
