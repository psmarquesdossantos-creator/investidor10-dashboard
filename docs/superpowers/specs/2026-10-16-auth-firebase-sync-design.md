# Design Spec — Login + Firebase Sync

**Data**: 2026-10-16 · **Status**: aprovado em chat, aguardando revisão
**Classificação**: architectural (novo subsistema de auth + sync)

---

## 1. Intent

O dono (e-mail) acessa a carteira real de qualquer dispositivo via login;
pessoas sem login veem apenas "Acesso restrito" (landing vazia, zero números).
Dados sincronizam automaticamente entre dispositivos via Firebase.

**Requisitos acordados** (chat 2026-10-16):
- Backend: **Firebase** (Auth e-mail/senha + Firestore)
- Dados: **sync automático contínuo** (mutações locais sobem; outros dispositivos recebem via listener)
- Visitante sem login: **login + landing vazia** (sem KPIs, sem gráficos)
- Frontend continua estático no GitHub Pages

**Não-escopo (YAGNI)**: multiusuário, share, notificações, mobile app, criptografia E2E.

---

## 2. Architecture

```
GitHub Pages (estático)                Firebase (Spark free)
├─ auth-gate.js ─── initializeAuth ──► Auth (e-mail/senha)
├─ sync-engine.js ─ onSnapshot/setDoc ► Firestore users/{uid}/portfolio/current
├─ firebase-config.js (gitignored)
└─ app existente (intacta em localhost/CI)
```

### 2.1 Auth gate (`auth-gate.js`)

Ordem de decisão no boot (antes de `applyRealData`). `window.__AUTH_GATE_FORCE__` (init script de teste; equivalente manual `?auth=required`) **sobrepõe** as regras 1–2 e força o estado "gate ativo":

1. `firebase-config.js` ausente ou `window.FIREBASE_CONFIG` vazio → **gate inativo** (CI, contribuidores). Comportamento = hoje.
2. `location.hostname ∈ {localhost, 127.0.0.1}` ou `protocol === 'file:'` → **bypass** (máquina do dono; fluxo local intacto; login opcional para sync).
3. Produção (ou force) + gate ativo:
   - Sem sessão → overlay #authGate (fixed, opaque, z-index alto). Dashboard não fica visível.
   - Com sessão → aguarda primeiro snapshot do Firestore (ou erro com retry/logout) → aplica dados → remove overlay.

Auth: Firebase Auth **e-mail/senha**. Signup habilitado durante setup do dono; pode ser desativado no console depois. Sem password reset UI custom (SDK resolve).

### 2.2 Sync engine (`sync-engine.js`)

- **Documento**: `users/{uid}/portfolio/current` = `{ data: <CARTEIRA_DATA JSON>, updatedAt: <serverTimestamp> }`. Tamanho real ~516KB < limite 1MB. Guard: antes de escrever, `JSON.stringify(data).length > 900_000` → console.warn + toast "carteira grande; considere podar histórico".
- **Push**: `window.SyncEngine.markDirty()` chamado de 3 pontos:
  - `src/import-center/writer.js` → após `window.CARTEIRA_DATA = converted`
  - `real-mode.js` → `processBackupFile` após assign
  - `script.js` → `saveToStorage()` (cobre CRUD de entries, edição de posição, goals; theme toggle também dispara mas debounce absorve)
  - debounce 2s → `setDoc(ref, {data, updatedAt: Date.now()}, {merge:false})`. Last-write-wins (1 usuário).
- **Pull**: `onSnapshot(ref)` → se remoto `updatedAt` > último aplicado local → `window.CARTEIRA_DATA = snap.data.data` → `applyRealData()` + `renderAll()`. Ignora eventos do próprio push (flag `__syncPushing` ou compara `updatedAt`).
- **Offline**: Firestore SDK com `enableIndexedDbPersistence()`; localStorage existente permanece como estava (não é fonte de verdade do sync).
- **Erros**: permissão negada / offline → toast discreto + badge "sync: desconectado"; app segue local.

### 2.3 Config & rules

- `firebase-config.sample.js` commitado (placeholders). `firebase-config.js` gitignored, carregado antes de auth-gate. Config do Firebase é pública por design (proteção vem das rules).
- Rules:
  ```
  match /users/{uid}/{doc=**} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  ```
- Índices: nenhum (documento único).

### 2.4 Visitante (produção, deslogado)

Overlay: logo, "Acesso restrito", campos e-mail/senha, botão Entrar, link "Criar conta", erros do SDK em pt-BR. Sem métricas, sem tabela, sem chart atrás (overlay opaco cobre tudo; dashboard em demo atrás é inofensivo mas invisível).

### 2.5 Dono — dia a dia

- Pages → login → carteira de qualquer lugar.
- Import B3 novo → confirma → sync sobe em ~2s.
- Localhost → como hoje, sem login; logar é opcional (habilita sync da máquina local).

---

## 3. Components & files

| File | Papel |
|---|---|
| `auth-gate.js` (novo) | decide bypass/inativo/ativo; carrega Firebase via dynamic `import()` só quando necessário; monta/lida overlay |
| `sync-engine.js` (novo) | `SyncEngine.init(auth)`, `markDirty()`, onSnapshot pull, guard de tamanho |
| `firebase-config.sample.js` (novo) | placeholders `apiKey` etc. |
| `index.html` | `<script src="auth-gate.js">` antes de carteira-data.js; markup do overlay #authGate; link do config condicional |
| `styles.css` | estilo do overlay (segue design system, focus-visible, 44px) |
| `src/import-center/writer.js` | 1 linha: `window.SyncEngine?.markDirty()` |
| `real-mode.js` | 1 linha em `processBackupFile` |
| `script.js` | 1 linha em `saveToStorage` |
| `docs/ai/FIREBASE_SETUP.md` (novo) | passos do dono: projeto, Auth, rules, conta, config, deploy |
| `serve.py` | `connect-src` ganha `https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com` (necessário para specs que forçam o gate; sem config Firebase nada é carregado) |
| `tests/e2e/auth-gate.spec.js` (novo) | overlay e validações com gate forçado via init script `window.__AUTH_GATE_FORCE__` (sem rede/Firebase) |

SDK Firebase: CDN modular v10+ (`https://www.gstatic.com/firebasejs/10.x/firebase-app.js` etc.) via dynamic import — **não** bundle local; `connect-src` do CSP ganha `https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com` (servidor local de testes também precisa para specs que forçam gate — mas specs não falam com rede real, ver §5).

---

## 4. Data flow (happy path)

1. Dono abre Pages → auth-gate detecta produção+config → Firebase init → `onAuthStateChanged`
2. Sem sessão → overlay; digita e-mail/senha → `signInWithEmailAndPassword`
3. Sucesso → `sync-engine.init(user)` → `onSnapshot` → primeiro snapshot (vazio no primeiro uso → oferece "Importar carteira" ou sobe do localStorage se houver) → `applyRealData` → overlay some
4. Import B3 → writer.write → `markDirty` → debounce → `setDoc`
5. Celular do dono → mesmo fluxo → snapshot chega → dashboard atualiza

Primeiro uso em dispositivo novo: snapshot vazio → tela com estado vazio honesto ("Nenhuma carteira na nuvem — importe um backup") + CTA import. **NUNCA** preencher com demo quando logado (UNKNOWN ≠ ZERO).

---

## 5. Testing

- Suíte atual intocada: localhost → bypass → 276 passing como hoje.
- `auth-gate.spec.js` (nova): gate testável sem Firebase real via **um único mecanismo de force**: init script do Playwright seta `window.__AUTH_GATE_FORCE__ = true` (equivalente manual: query param `?auth=required`). Com force + sem config → overlay renderiza em modo "demo do gate" (form funciona, auth resolve para falha amigável sem rede). Specs:
  - overlay renderizado, logo + form visíveis, zero elementos de KPI atrás
  - Submit com campos vazios → erro de validação inline.
  - Logout (`window.__AUTH_GATE_TEST__.signOut()`) → overlay volta.
- Firebase real (Auth + regra rules + sync entre 2 contexts): **validação manual 1x** pelo dono, checklist no FIREBASE_SETUP.md. Não mockar SDK em E2E (frágil, rede).
- a11y: overlay testado com axe (focus trap simples:Tab cycle dentro do overlay enquanto aberto).

---

## 6. Security & privacy

- Dados reais no Firestore protegidos por rules uid-only. apiKey no cliente é seguro (é assim que Firebase funciona).
- `firebase-config.js` gitignored; sample commitado sem valores reais (mesmo que o config seja público, evitamos acoplar o repo a um projeto específico).
- Overlay não vaza KPI/demo atrás (opaque).
- CI: sem config → nada muda; nenhum segredo em logs.
- Governança mantida: import continua exigindo preview+confirm; sync só propagar estado já confirmado.

---

## 7. Rollout (owner)

1. Deploy desta feature (gate inativo sem config → site igual hoje)
2. Dono cria projeto Firebase (passos no FIREBASE_SETUP.md): Auth e-mail/senha, regras Firestore, conta própria
3. Baixa config → `firebase-config.js` local → testa login + import + 2 dispositivos
4. (Opcional) desativa signup no console

Risco residual aceito: 1º snapshot em device novo vazio → fluxo de import; sem multi-device conflict UI (last-write-wins).
