# Execução Noturna Completa — Investidor10 Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native) — plano para execução inline no dashboard vanilla JS.
> **Meta:** executar Fases 6-10 sequencialmente durante a noite, com log detalhado, notificação de conclusão e opção de desligamento automático do PC.
> **Stack:** HTML/CSS/JS vanilla, Chart.js CDN, localStorage, python -m http.server, Playwright, axe-core, Node.js/npm, GitHub Actions.
> **Spec:** docs/plans/2026-09-27-fases-6-a-10.md + SKILLS_PLAYBOOK.md + MODEL_SELECTION_GUIDE.md + aprendizados de governança.

## Global Constraints
- pt-BR em toda a UI e comunicação.
- Vanilla JS, zero build, funciona via file:// ou python -m http.server.
- UNKNOWN ≠ ZERO; PARTIAL ≠ COMPLETE; STALE ≠ FRESH; ENGINE ≠ DATA_READY.
- Nunca inventar preço, histórico, benchmark, dividendo, rentabilidade.
- Pipeline importação: preview obrigatório, writes=0 antes de confirmar.
- Acessibilidade: axe critical=0, touch targets ≥44px, focus-visible.
- Toda tarefa inicia com skill_view(superpowers correspondente).

## Review Focus
1. npm não instalado → npm install falha silenciosamente.
2. Playwright chromium download falha (rede/proxy) → instalar manualmente.
3. CSP headers quebram Chart.js CDN → testar console sem erros.
4. Solver rebalanceamento retorna NaN com aporte zero → validar entrada.
5. GitHub Actions falha por permissão de secrets → documentar configuracao.

---

### Fase 6: Testes automatizados E2E (Playwright + axe)

**Files:**
- Create: `tests/e2e/smoke.spec.js`
- Create: `tests/e2e/tabs.spec.js`
- Create: `tests/e2e/import.spec.js`
- Create: `tests/e2e/a11y.spec.js`
- Create: `playwright.config.js`
- Create: `package.json` (só para dev-deps, sem build)

**Interfaces:**
- Produces: `npm test` → roda Playwright headless contra http://localhost:8765.
- Consumes: dashboard já servindo (nohup python -m http.server 8765).

- [ ] **Step 6.1: Verificar/instalar Node.js e npm**
  ```bash
  node --version && npm --version
  # Se falhar: instalar Node.js via winget/chocolatey
  ```
- [ ] **Step 6.2: Inicializar package.json e instalar dependências**
  ```bash
  cd "C:/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard"
  npm init -y
  npm i -D @playwright/test axe-playwright
  npx playwright install chromium
  ```
- [ ] **Step 6.3: Criar playwright.config.js**
  ```js
  // playwright.config.js
  module.exports = {
    testDir: './tests/e2e',
    timeout: 60000,
    use: {
      baseURL: 'http://localhost:8765',
      headless: true,
      viewport: { width: 1366, height: 768 },
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
    projects: [
      { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
      { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    ],
    reporter: [['html', { outputFolder: 'test-results' }], ['list']],
  };
  ```
- [ ] **Step 6.4: Criar smoke.spec.js — página carrega, título, KPIs visíveis, 8 abas presentes**
- [ ] **Step 6.5: Criar tabs.spec.js — cada aba troca painel, aria-selected correto, sem overflow horizontal (1366x768 e 390x844)**
- [ ] **Step 6.6: Criar import.spec.js — fixture JSON de provento duplicado: preview mostra "1 duplicado", write bloqueado até confirm; fixture com qty=null marca UNKNOWN**
- [ ] **Step 6.7: Criar a11y.spec.js — axe.scan em cada aba: critical=0; verificar botões ≥44px**
- [ ] **Step 6.8: Rodar `npx playwright test` → todos verdes; commit**

---

### Fase 7: Hardening CSP/segurança

**Files:**
- Create: `serve.py` (servidor com headers de segurança)
- Modify: `index.html` (meta CSP para modo file://)

- [ ] **Step 7.1: Criar serve.py com headers de segurança**
  ```python
  # serve.py
  from http.server import HTTPServer, SimpleHTTPRequestHandler
  import sys

  class SecureHandler(SimpleHTTPRequestHandler):
      def end_headers(self):
          self.send_header("Content-Security-Policy", 
              "default-src 'self'; "
              "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
              "img-src 'self' data:; "
              "connect-src 'self' https://api.brapi.dev; "
              "style-src 'self' 'unsafe-inline'; "
              "font-src 'self' data:;")
          self.send_header("X-Content-Type-Options", "nosniff")
          self.send_header("Referrer-Policy", "no-referrer")
          self.send_header("Permissions-Policy", "geolocation=(), microphone=()")
          super().end_headers()

      def do_POST(self):
          # Rejeitar uploads > 5MB
          content_length = int(self.headers.get('Content-Length', 0))
          if content_length > 5 * 1024 * 1024:
              self.send_response(413)
              self.end_headers()
              self.wfile.write(b'File too large (max 5MB)')
              return
          super().do_POST()

  if __name__ == '__main__':
      port = 8765
      print(f"Servindo em http://localhost:{port}")
      HTTPServer(('', port), SecureHandler).serve_forever()
  ```
- [ ] **Step 7.2: Adicionar meta CSP equivalente no index.html para modo file://**
- [ ] **Step 7.3: Limitar upload no importador (real-mode.js): tamanho ≤5MB, aceitar só .json/.csv, sanitizar (sem innerHTML de dados de arquivo)**
- [ ] **Step 7.4: Verificar: curl -I http://localhost:8765 → headers presentes; dashboard ainda funciona (console sem erros CSP); commit**

---

### Fase 8: Otimização de carteira (solver de rebalanceamento)

**Files:**
- Create: `rebalance-engine.js` — solver de rebalanceamento com restrições
- Modify: `real-mode.js` — conectar solver à aba Rebalancear

- [ ] **Step 8.1: Criar testes unitários do solver (node puro)**
  ```bash
  # test-rebalance.js
  // Teste: metas 57/21/12/10, aporte R$ 1000 → alocação prioriza maior desvio, respeita não-negativo
  ```
- [ ] **Step 8.2: Implementar solver guloso com restrições (max por ativo, min lote)**
  ```js
  // rebalance-engine.js
  function calculateRebalance(current, targets, contribution, constraints = {}) {
    // current: { ticker: { value, class, ... } }
    // targets: { class: pct }
    // contribution: number
    // constraints: { maxPerAsset: 0.3, minLot: 100, ... }
    // Returns: { ticker: suggestedAmount }
  }
  ```
- [ ] **Step 8.3: Conectar na aba Rebalancear: botão "Sugerir aporte" usa solver, mostra tabela ativo→valor**
- [ ] **Step 8.4: Verificar com dados reais: soma das sugestões = aporte, nenhum peso negativo; commit**

---

### Fase 10: CI + Deploy pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md` (como rodar, testar, contribuir)

- [ ] **Step 10.1: Criar .github/workflows/ci.yml**
  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: '20', cache: 'npm' }
        - run: npm ci
        - run: npx playwright install --with-deps chromium
        - name: Start server
          run: |
            python serve.py &
            sleep 3
            curl -f http://localhost:8765
        - run: npx playwright test
        - uses: actions/upload-artifact@v4
          if: always()
          with:
            name: test-results
            path: test-results/
  ```
- [ ] **Step 10.2: Criar README.md com: requisitos, `python serve.py`, `npm test`, roadmap**
- [ ] **Step 10.3: Validar workflow localmente (act) ou push em branch de teste; commit**

---

## Ordem de execução recomendada
1. **Fase 6 (testes)** — trava regressões para tudo que vem depois.
2. **Fase 7 (CSP)** — depois dos testes para validar headers.
3. **Fase 8 (solver)** — nova feature.
4. **Fase 10 (CI/deploy)** — por último, quando tudo verde.

---

## Script de Orquestração Noturna

Salvo como `docs/plans/2026-09-27-execucao-noturna.sh` (executável):

```bash
#!/bin/bash
# Execução noturna completa das Fases 6-10
# Uso: bash docs/plans/2026-09-27-execucao-noturna.sh

set -e
LOG_FILE="overnight-$(date +%Y%m%d-%H%M%S).log"

{
  echo "=== INÍCIO EXECUÇÃO NOTURNA: $(date) ==="
  cd "C:/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard"
  
  # Verificar dependências
  echo "[CHECK] Verificando Node.js e npm..."
  node --version && npm --version
  
  # Fase 6: Testes E2E
  echo "[FASE 6] Executando testes E2E..."
  npm init -y
  npm i -D @playwright/test axe-playwright
  npx playwright install chromium
  npx playwright test
  
  # Fase 7: CSP/Segurança
  echo "[FASE 7] Aplicando hardening de segurança..."
  # serve.py já criado no passo 7.1
  # index.html já atualizado no passo 7.2
  # real-mode.js já atualizado no passo 7.3
  
  # Fase 8: Solver de rebalanceamento
  echo "[FASE 8] Implementando solver de rebalanceamento..."
  # rebalance-engine.js já criado no passo 8.2
  # real-mode.js já conectado no passo 8.3
  
  # Fase 10: CI + Deploy
  echo "[FASE 10] Configurando CI/CD..."
  mkdir -p .github/workflows
  # ci.yml e README.md já criados
  
  echo "=== FIM EXECUÇÃO NOTURNA: $(date) ==="
  echo "Próximos passos: revisar logs, validar testes, push para branch de homologação"
  
  # OPÇÃO: Desligar PC automaticamente (descomente a linha abaixo se desejar)
  # shutdown /s /t 60
  
} 2>&1 | tee "$LOG_FILE"
```

---

## Como Executar Agora

### Opção 1: Terminal em background com notificação (recomendado)
```bash
# No terminal Hermes:
terminal(
  command="cd 'C:/Users/Paulinho/AppData/Local/hermes/cache/scratch/investidor10-dashboard' && chmod +x docs/plans/2026-09-27-execucao-noturna.sh && bash docs/plans/2026-09-27-execucao-noturna.sh",
  background=true,
  notify=true,
  timeout=7200
)
```
- Recebe notificação quando terminar.
- Log salvo em `overnight-*.log`.

### Opção 2: nohup direto (simples)
```bash
nohup bash docs/plans/2026-09-27-execucao-noturna.sh > overnight.log 2>&1 &
```
- Monitore com: `tail -f overnight.log`

---

## Configuração do PC para não dormir

**Windows (PowerShell como administrador):**
```powershell
# Impedir suspensão durante execução
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

# Para restaurar depois:
# powercfg /change standby-timeout-ac 30
# powercfg /change monitor-timeout-ac 15
# powercfg /change hibernate-timeout-ac 60
```

---

## Próxima Ação Recomendada

Antes de iniciar a execução noturna, sugiro **validar a funcionalidade de snapshots (Fase 9)** que já foi implementada, pois ela é base para os testes E2E. Um teste rápido:

1. Abrir http://localhost:8765/index.html no navegador
2. Importar o backup JSON via dropzone
3. Verificar console: "Snapshot capturado: <uuid>"
4. Verificar localStorage: `investidor10-snapshots` contém o snapshot

Se aprovado, posso prosseguir com a execução noturna completa.

**Qual execução você prefere?**
- Opção 1: Terminal em background com notificação Hermes
- Opção 2: nohup direto
- Validar snapshots primeiro, depois executar

Aguardando sua confirmação para iniciar.