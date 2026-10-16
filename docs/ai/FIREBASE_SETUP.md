# FIREBASE_SETUP — Runbook do dono (Fases 2+)

> Fase 1 entregou TODO o código (gate, sources, rules, testes). Este runbook é
> o que VOCÊ faz no console Firebase para ativar produção — **Fase 2**, com
> autorização explícita e `PUSH=0` revogado.

## 1. Criar projeto (Spark free — P30)

1. https://console.firebase.google.com → "Adicionar projeto" → nome: `investidor10-dashboard`
2. Plano Spark (gratuito) — Auth 50k MAU, Firestore 1GB/20k writes-dia (folga p/ 1 dono).

## 2. Authentication (P1)

1. Console → Authentication → Get started
2. Sign-in method: **E-mail/senha** (enable) + **Google** (enable)
3. (Opcional depois) Authorized domains: conferir `psmarquesdossantos-creator.github.io`

## 3. Firestore + Rules (P5/P6)

1. Console → Firestore Database → Create (production mode, região `southamerica-east1`)
2. Rules: colar conteúdo de `firestore.rules` do repo → Publish
3. Criar índices: nenhum necessário (docs por seção, sem queries compostas)

## 4. Allowlist do dono (P3/P15)

1. Authentication → Users → criar sua conta (e-mail `psmarquesdossantos@gmail.com`,
   verificar e-mail) — OU criar via primeira execução do app com signup e depois:
2. Firestore → coleção `authorization` → doc com **ID = seu UID** (copiar de Auth → Users):
   ```json
   { "email": "psmarquesdossantos@gmail.com", "enabled": true, "role": "owner", "blocked": false }
   ```
   (email trim+lowercase)
3. Signup público pode ficar aberto na Fase 2 (visitantes caem em DEMO — P28);
   para travar: Authentication → Settings → User actions → "Allow users to sign up" OFF.

## 5. Config local

1. Copiar `firebase.config.sample.js` → `firebase-config.js` (gitignored)
2. Console → Project settings → Your apps → Web app → copiar valores (apiKey NÃO é segredo;
   a proteção real são as rules — P5)
3. Preencher `firebase-config.js` com os valores reais.

## 6. Deploy da Fase 2 (quando autorizado)

```bash
# rules (re-deploy se mudarem):
npx firebase-tools deploy --only firestore:rules
# site: commit + push em main (Pages redeploy automático)
```

## 7. Checklist manual de certificação (Fase 4)

- [ ] Pages: sem login → overlay "Acesso restrito", zero KPIs visíveis (P22)
- [ ] Login com seu e-mail → resolve REAL → carteira carrega do Firestore
- [ ] Login com e-mail não autorizado → DEMO: badge + fixture + reset (P27/P11)
- [ ] Desktop: editar (import B3 novo) → celular recebe atualização em tempo real (P7)
- [ ] Celular: editar → desktop recebe
- [ ] Offline no celular → reconectar → sem overwrite silencioso (P20)
- [ ] DevTools: `AuthGate.mode='REAL'` forjado → Firestore segue negando (P5)
- [ ] Regras: rodar `tests/rules/rules.test.cjs` (emulator) — 10/10 PASS (P14)
- [ ] `node scripts/migration-dry-run.js` → OK antes de qualquer migração real

## Bloqueadores conhecidos (ambiente local Windows)

- **JDK 11+ ausente** (Java 8 instalado): emulator Firebase recusa rodar
  (`firebase-tools no longer supports Java versions before 11`).
  Fix: instalar JDK 17 → `npx firebase-tools emulators:exec --only firestore "node tests/rules/rules.test.cjs"`.
  CI (ubuntu, Java 17) roda os mesmos testes quando o push for autorizado.
- **npm EBADF no workspace** (G:\Meu Drive — sync do Drive bloqueia writes do npm):
  `npm i -D @firebase/rules-unit-testing` falha dentro do workspace. Workaround usado:
  instalação em `%TEMP%\opencode\fbrules` + `NODE_PATH`. Para CI: adicionar o devDep
  ao package.json/lockfile a partir de um clone não-sincronizado (ex.: C:\src\...).
