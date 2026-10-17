# Firebase P22 — Guia de Ativação (login real + sync Firestore)

O dashboard já tem TODO o código pronto: gate de acesso (INACTIVE | LOGIN | DEMO | REAL | BLOCKED),
auth por e-mail/senha (`src/auth/auth-gate.js`), fonte de sync Firestore
(`src/auth/sync/firestore-real-source.js`) e regras de segurança (`firestore.rules`).
Faltam só as **ações da sua conta** no Console Firebase. Sem elas, o site funciona em modo
local/demo — nada quebra.

## Por que ativar
- Elimina o import manual de backup: a carteira sincroniza automaticamente entre
  dispositivos (Realtime via Firestore).
- O lock de produção passa a aceitar SEU login (modo REAL) em vez de só demo.

## Passo a passo (sua conta — ~10 min)

1. **Criar projeto**: https://console.firebase.google.com → *Add project* → sugestão de nome:
   `investidor10-dashboard` → desative Analytics (não usamos) → Create.
2. **App Web**: Project Overview → ícone `</>` → apelido `dashboard` → Register app →
   copie o objeto `firebaseConfig` que aparece.
3. **Arquivo local**: copie `firebase.config.sample.js` → `firebase-config.js` (na raiz) e cole os
   valores. **`firebase-config.js` é gitignored** — nunca é commitado. A config não é segredo;
   a proteção real vem das Firestore Rules.
4. **Authentication (Entrar com Google)**: Console → Authentication → Get started →
   Sign-in method → habilite **Google** → defina o e-mail de suporte → Save.
   (E-mail/senha fica como alternativa secundária — opcional.)
5. **Firestore Database**: Build → Firestore Database → Create database →
   **Production mode** → região `southamerica-east1` (São Paulo) → Enable.
6. **Regras**: aba Rules do Firestore → cole o conteúdo de `firestore.rules` (repo) → Publish.
   As regras restringem leitura/escrita ao usuário dono do documento (`request.auth.uid`).
7. **Autorizar SEU login (allowlist P16)**: entre no site com sua conta Google
   (`psmarquesdossantos@gmail.com`) UMA vez → abra o Console → Authentication → Users →
   copie o **User UID** → Firestore → coleção `authorization` → criar documento com
   **ID = UID** e campos: `{ "email": "psmarquesdossantos@gmail.com", "enabled": true,
   "role": "owner", "blocked": false }`. Sem este passo você entra em modo DEMO
   (dados fictícios) — a autorização é sempre server-side (P5/P16).
8. **(Opcional) Deploy**: o `firebase-config.js` não vai ao git — no Vercel, adicione o arquivo
   via **Vercel Dashboard → Files** (arquivos persistidos fora do repo) ou cole a config em
   uma Environment Variable e injete no boot.

## Teste de aceitação
```bash
# local (gate INACTIVE sempre) — produção com Firebase:
LIVE_BASE_URL=https://psmarquesdossantos-creator.github.io/investidor10-dashboard \
  npx playwright test tests/e2e/live-prod.spec.js
```
Com o `firebase-config.js` em produção: lock → **Entrar com Google** → popup da conta →
modo REAL → KPIs carregam do Firestore → edição em um dispositivo aparece no outro (refresh).
**Sair** (menu do usuário, canto direito) = seus dados saem do dispositivo e só a carteira
fictícia de demonstração permanece (P26).

## Modelo de dados (Firestore)
- `users/{uid}` — perfil (e-mail, createdAt)
- `users/{uid}/wallet/sections/{section}` — seções sincronizadas via SyncHub (field-scoped):
  `kpis`, `positions`, `entries`, `earnings`, `monthly`
- Snapshots/backup continuam em localStorage (determinísticos, hash SHA-like local) —
  o Firestore é a fonte de SYNC, não a de auditoria.

## Riscos e mitigações
| Risco | Mitigação |
|---|---|
| API key "exposta" no client | Key de Firebase NÃO é segredo por design; acesso é regido pelas Rules |
| Quota do plano Spark (grátis) | Tráfego de 1 usuário é desprezível; limites: 50k leituras/dia |
| Firestore indisponível | Gate cai para lock (nada renderiza) — sem estado intermediário |
