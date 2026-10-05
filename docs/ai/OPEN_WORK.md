# OPEN WORK — Investidor10 Dashboard

**Trabalho pendente real. Não incluir ideias vagas.**

---

## CRITICAL (Blockers)

| ID | Item | Owner | Since | Blocked By |
|----|------|-------|-------|------------|
| CW-001 | Fix flaky test import.spec.js (timeout intermitente) | - | 2026-09-28 | Timing do switchTab/init() |

---

## HIGH (Próximos Passos Concretos)

| ID | Item | Owner | Since | Precondição |
|----|------|-------|-------|-------------|
| HW-001 | Criar remote GitHub + push + ativar CI/CD | - | 2026-09-27 | Decisão de nomenclatura repo |
| HW-002 | Estabilizar serve.py sob carga paralela (ThreadingHTTPServer tuning) | - | 2026-09-28 | Reproduzir instabilidade |
| HW-003 | Adicionar testes para novos centros (Corporate Events, Data Trust, Backup Port.) | - | 2026-09-28 | Smoke tests passam |

---

## MEDIUM (Melhorias Reais)

| ID | Item | Owner | Since | Notas |
|----|------|-------|-------|-------|
| MW-001 | Import Center: suporte a PDF (pdfplumber) para extratos B3 | - | 2026-09-27 | Requer ocr-and-documents skill |
| MW-002 | Corporate Events: UI para edição/remoção de eventos aplicados | - | 2026-09-28 | Atualmente só log |
| MW-003 | Data Trust: alertas proativos (toast/notification) para STALE | - | 2026-09-28 | Atualmente só badge |
| MW-004 | Backup Portability: compressão ZIP para backups grandes | - | 2026-09-28 | Opcional |
| MW-005 | PWA: background sync para import offline | - | 2026-09-27 | Requer service worker upgrade |
| MW-006 | Charts: exportar como imagem (PNG) | - | 2026-09-27 | Chart.js toBlob |

---

## LOW (Nice to Have)

| ID | Item | Owner | Since | Notas |
|----|------|-------|-------|-------|
| LW-001 | Tema Light completo (atualmente só Dark) | - | 2026-09-27 | VISUAL_CANON.md tem placeholder |
| LW-002 | Internacionalização (en-US) | - | 2026-09-27 | Strings em pt-BR hardcoded |
| LW-003 | Notificações push (Service Worker) | - | 2026-09-27 | Próximos dividendos, rebalance alerts |
| LW-004 | Multi-carteira (switch user/profile) | - | 2026-09-27 | Arquitetura suporta, UI não |

---

## DEFERRED (Decidido Não Fazer Agora)

| ID | Item | Razão | Revisitar Quando |
|----|------|-------|------------------|
| DW-001 | Backend real (Node/Python API) | Vanilla static é requisito | Mudança de requisito |
| DW-002 | React/Vue migration | Zero build é feature | Performance issue real |
| DW-003 | Database (SQLite/IndexedDB sync) | localStorage + IndexedDB suficiente | Escala >10k ativos |
| DW-004 | Real-time quotes (WebSocket) | brapi.dev polling suficiente | Day trading use case |

---

## TECHNICAL DEBT (Known, Tracked)

| ID | Area | Description | Risk | Mitigation |
|----|------|-------------|------|------------|
| TD-001 | serve.py | ThreadingHTTPServer pode vazar threads sob carga extrema | Medium | Monitorar, reiniciar nightly |
| TD-002 | import.spec.js | Flaky timeout (race condition) | Low | Fix em CW-001 |
| TD-003 | Chart.js | Instância global não destruída ao trocar tab | Low | Destruir em switchTab |
| TD-004 | IndexedDB | Schema migration manual (v1→v2) | Low | Backup Portability valida |
| TD-005 | carteria-data.js | Hardcoded, não versionado no Git | Medium | Backup sensível separado |

---

## DECISIONS NEEDED (User Input Required)

| ID | Decision | Options | Recommendation |
|----|----------|---------|----------------|
| DN-001 | Remote GitHub repo name | investidor10-dashboard / portfolio-dashboard / custom | investidor10-dashboard |
| DN-002 | CI/CD provider | GitHub Actions (pronto) / GitLab / outro | GitHub Actions |
| DN-003 | Deploy target | GitHub Pages / Netlify / Vercel / self-hosted | GitHub Pages (gratuito, estático) |
| DN-004 | Secrets management | GitHub Secrets / .env local / outro | GitHub Secrets para CI |

---

## NEXT SPRINT CANDIDATES (Prioritized)

1. **CW-001** → Fix flaky test (1-2 horas)
2. **HW-001** → GitHub remote + CI/CD (2-4 horas)
3. **HW-002** → Server stability (2-3 horas)
4. **MW-001** → PDF import (4-8 horas)
5. **MW-002** → Corporate Events UI (2-4 horas)

---

## NOTES

- **Não incluir** ideias vagas ("melhorar UX", "otimizar performance")
- **Incluir apenas** trabalho com: arquivo alvo, critério de aceite, estimativa
- **Atualizar** quando item movido entre colunas
- **Remover** quando concluído (mover para PROJECT_MEMORY.md COMPLETED)