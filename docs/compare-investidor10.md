# Comparação — Dashboard vs investidor10.com.br

Carteira pública de referência: `investidor10.com.br/wallet/public/2206425`.
Data da comparação: **17/10/2026** (dados locais: importação de 10/10/26 + backup em `backup-carteira-2026-10-17.json`).

> **UNKNOWN ≠ ZERO**: os números vivos do site exigem a tela logada do dono (a página
> pública renderiza via JS e não expõe valores no HTML). Células `UNKNOWN` abaixo significam
> "requer conferência manual na tela logada" — **não** significam zero.

## 1. Paridade de números (KPIs)

| KPI | Nosso dashboard (17/10/26) | Site (logado) | Status |
|---|---|---|---|
| Patrimônio total | **R$ 702.175,64** | UNKNOWN | conferir |
| Valor investido | **R$ 698.681,79** | UNKNOWN | conferir |
| Lucro total | **R$ 132.611,06** | UNKNOWN | conferir |
| Ganho de Capital | **R$ 3.493,85** (Patrimônio − Investido) | UNKNOWN | conferir |
| Dividendos recebidos (lifetime) | **R$ 129.117,21** | UNKNOWN | conferir |
| Proventos 12M | **R$ 35.574,51** | UNKNOWN | conferir |
| Rentabilidade 12M | **6,97%** | UNKNOWN | conferir |
| Rentabilidade total | **18,98%** (display: Lucro/Investido) | UNKNOWN | conferir (site é money-weighted — sinal deve bater) |
| Yield 12M | **5,07%** | UNKNOWN | conferir |
| Ativos | **37 posições** | UNKNOWN | conferir |
| Proventos (eventos) | 2.202 registros | UNKNOWN | conferir |
| Lançamentos | 995 registros | UNKNOWN | conferir |
| Série patrimonial | 84 meses | UNKNOWN | conferir |

**Auditoria de fórmulas (camada de render, `renderKPIs`):**
- ✅ Lucro total = Ganho de Capital + Dividendos: 3.493,85 + 129.117,21 = **132.611,06** (exato)
- ✅ Ganho de Capital = Patrimônio − Valor investido (não realizado — nunca rotular "realizado")
- ✅ Rentabilidade total (display) = Lucro total / Valor investido = 18,98%
- ⚠️ Campo bruto `kpis.capitalGain` = −196.996,61 (legado da importação) **não é usado pelo render** —
  o card calcula GC na hora. Documentado para evitar triagem equivocada no futuro.

## 2. Matriz de paridade de features

| Feature do Investidor10 | Nosso dashboard | Notas |
|---|---|---|
| Resumo com KPIs + cards por classe | ✅ | Cards "X% na carteira / Y% ideal" (modelo canônico) |
| Evolução do patrimônio (gráfico) | ✅ | 84 meses + benchmarks CDI/IBOV/IFIX/SMLL |
| Tabela mensal (valor aplicado/ganho) | ✅ | `renderPatrimonySummaryTable` (aba Patrimônio) |
| Posições com % ideal + Comprar? | ✅ | % ideal classe ÷ nº ativos; Comprar? < 90% do ideal |
| Proventos com filtros | ✅ | 2.202 eventos; dashboard 12M + calendário |
| Rentabilidade (TWR/XIRR) | ✅ | Determinística (snapshots; readiness states) |
| Rebalanceamento | ✅ | Solver com restrições (lote, max ativo/setor, taxa) |
| Risco (VaR/Sharpe/MaxDD) | ✅ | Métricas reais da série (sem Math.random) |
| Projeção (cone de confiança) | ✅ | Monte Carlo 10k cenários via Web Worker |
| Benchmarks de mercado | ✅ | CDI, IBOV, IFIX, SMLL, IDIV, IMAB, BTC, DOL, USD/BRL |
| Impostos (DARF/GCAP/IRPF) | ✅ | DARF mensal, GCAP 35 linhas, XML pré-preenchido |
| Importação de corretagem (B3/CEI) | ✅ | Pipeline 12 passos com dedup + preview |
| Comparação com outras carteiras | ❌ | Não implementado (não era requisito) |
| Blog/Comunidade/Cursos do site | ❌ | Fora de escopo — conteúdo do site, não da carteira |
| **Login Google + sync entre dispositivos** | 🔶 | Código pronto (P22); ativa após os passos do FIREBASE_SETUP.md |
| **Modo convidado fictício** | ✅ | Demo 30k sintético; produção sem login = só fictício (P26) |

## 3. Triagem de divergências (procedimento vitalício)

Ao conferir a coluna "Site (logado)", divergências seguem esta ordem **antes** de tocar em código:

1. **Fórmula diferente?** — o % do site é money-weighted; o módulo pode divergir em
   decimal — **o SINAL precisa bater** (lucro/prejuízo).
2. **Dados STALE?** — última importação 10/10/26 vs site vivo → re-importar
   posição/proventos (aba Importar).
3. **Dados PARTIAL?** — base local menor que o histórico real (ex.: proventos faltando
   eventos) subestima Dividendos lifetime e Lucro total — fórmula correta com base
   incompleta **não é bug** — re-importar a fonte completa.

## 4. Conclusão

- **Paridade estrutural completa**: todos os módulos de carteira do Investidor10 têm
  equivalente funcional com as fórmulas canônicas (§1 auditoria ✅).
- **Pendência vitalícia do dono**: conferir a coluna UNKNOWN na tela logada quando
  conveniente e registrar aqui (qualquer divergência → triagem §3).
- **Diferencial nosso**: engines que o site não expõe (Data Trust, Backup Portability,
  Monte Carlo custom, IRPF XML, Renda Fixa com confidence levels).
