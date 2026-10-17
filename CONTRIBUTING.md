# Contribuindo

Dashboard de carteira de investimentos estilo Investidor10 — vanilla HTML/CSS/JS,
zero build no runtime, zero dependências de framework. Chart.js self-hosted em `vendor/`.

## Setup local

```bash
python serve.py        # ThreadingHTTPServer + CSP na porta 8765 (não use file://)
```

## Regras de ouro

1. **Dados reais nunca são commitados** (`.gitignore` cobre; ver `SECURITY.md`). Se um
   arquivo de dados novo for criado, adicione o padrão ao `.gitignore` **e** ao
   `.vercelignore` **e** mantenha-o fora da allowlist do `scripts/build-dist.py`.
2. **UNKNOWN ≠ ZERO**: valor ausente nunca vira 0 — renderize estado vazio/badge
   (`DataStates`). Nada de `Math.random()` como dado.
3. **Every render re-binds**: qualquer `renderX()` com `innerHTML` precisa re-anexar
   handlers (`attachActionHandlers()` / guards `__wired`).
4. **Um escritor por elemento** na ativação de aba (o MutationObserver do real-mode.js
   compete com o lazy-render do panels.js — atrasar ~300ms quando necessário).
5. **Helper de escopo alheio não existe fora do escopo dele** — antes de usar
   `toast(`/`fmt.cur(`, grep quem define (`showToast`, `fmt.currency`). Cada IIFE
   tem os próprios helpers.
6. **Bump da versão do SW** (`sw.js` → `CACHE_NAME`) a CADA mudança de JS/HTML/CSS.

## Testes (gate de merge)

```bash
npx playwright test --project=desktop   # workers=1 é default (config) — NÃO paralelize
npx playwright test --project=mobile
# smoke de produção (opcional, precisa de host público):
LIVE_BASE_URL=https://<host> npx playwright test tests/e2e/live-prod.spec.js
```

- Toda aba nova precisa de: spec em `tabs.spec` + `panels.spec` (tbody nunca mudo) +
  entrada na paleta ⌘K (`COMMANDS` no script.js) + `role="tabpanel"`/`aria-labelledby`.
- Renderer novo lê `DATA()` (panels.js) — nunca `window.MOCK_DATA` (interno do script.js).
- Grep o ID real do `<tbody id=` no index.html antes de codar um renderer.

## Deploy

```bash
python scripts/build-dist.py    # dist/ minificado (terser + cleancss) + sanity de privacidade
cd dist && vercel --prod --yes  # (uma vez: vercel link --project investidor10-dashboard)
```
GitHub Pages: push na `main` reconstrói automaticamente (legacy, com `.nojekyll`).

## Modelo de KPIs (paridade com Investidor10)

O dono compara com a carteira pública dele (investidor10.com.br/wallet/public/2206425).
Fórmulas canônicas em `renderKPIs` (script.js): Lucro total = Ganho de Capital +
Dividendos; GC = Patrimônio − Investido. Divergência: (1) fórmula, (2) STALE → re-importar,
(3) PARTIAL → fórmula correta com base incompleta ≠ bug.
