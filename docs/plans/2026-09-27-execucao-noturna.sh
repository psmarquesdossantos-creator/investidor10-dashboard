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