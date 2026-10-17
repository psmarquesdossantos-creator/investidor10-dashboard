# Segurança & Privacidade

## Política de dados (o princípio P26)

**Dados financeiros reais NUNCA vão para um servidor público.** Este repo e os deploys
carregam apenas código + dados sintéticos. Os dados reais do dono entram **apenas no
localStorage do navegador dele**, via *Importar Backup* (aba Backup) ou via sync Firebase
privado (P22, ver `FIREBASE_SETUP.md`).

### Camadas de defesa (em ordem)
1. **`.gitignore`** — dados reais ficam fora do git: `carteira-data.js`, `parsed_data.json`,
   `carteira-data-real.json`, `backup-*.json`, `firebase-config.js`, `data.js`.
2. **`.vercelignore`** — ⚠️ quando existe, o CLI Vercel **para de aplicar o `.gitignore`**;
   TODOS os padrões sensíveis precisam estar nos DOIS arquivos. (Incidente real 17/10/2026:
   `carteira-data.js` vazou em 4 deployments por essa armadilha; deployments deletados,
   alias verificado 404.)
3. **`scripts/build-dist.py` (allowlist)** — o build de produção copia SOMENTE os assets
   da lista + valida pós-build que nenhum arquivo de dados existe no `dist/`.
   O build falha se algo sensível aparecer.
4. **Gate de produção (P22/P26)** — hosts públicos sem Firebase mostram lock + demo
   sintético (fixture 30k); nada renderiza antes da decisão.
5. **Vercel Authentication (Standard Protection)** — deployment URLs exigem login da
   conta do dono. No plano Hobby o alias de produção permanece público — por isso ele
   serve apenas dados sintéticos.
6. **`tests/e2e/live-prod.spec.js`** — CI manual contra produção: asserta 404 nos arquivos
   proibidos, `localStorage` sem marcadores de dados reais e demo = fixture sintético.

### Verificação pós-deploy (nunca pule)
```bash
# arquivos da árvore do deployment (API Vercel — árvore ANINHADA, varrer children!)
# + curl no alias: cada arquivo sensível deve responder 404
curl -s -o /dev/null -w "%{http_code}\n" https://<alias>/carteira-data.js   # → 404
```
Proteção de URL: `curl` SEM `-L` — urllib segue o 302 do login e reporta "200 público".

## Headers de segurança
`serve.py` (local) e `vercel.json` (produção) aplicam CSP, `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
Upload local: ≤5MB, apenas `.json`/`.csv`, filename sanitizado.

## Reportar vulnerabilidade
Abra uma issue privada no repo ou contate o dono diretamente. Não abra issue pública
com detalhes exploráveis.
