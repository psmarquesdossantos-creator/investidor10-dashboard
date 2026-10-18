// firebase-config.js — Configuração web do Firebase (PÚBLICA por design).
// A apiKey de app web NÃO é segredo: a proteção real é:
//   1. Firestore Rules (firestore.rules) — só uid autorizado lê/escreve
//   2. Allowlist authorization/{uid} — escrita só via console/Admin SDK
//   3. Authorized domains no Firebase Auth
// NUNCA coloque aqui: serviceAccount keys, tokens admin, senhas.
window.FIREBASE_CONFIG = {
  apiKey: "PREENCHER",
  authDomain: "investidor10-dashboard.firebaseapp.com",
  projectId: "investidor10-dashboard",
  storageBucket: "investidor10-dashboard.firebasestorage.app",
  messagingSenderId: "PREENCHER",
  appId: "PREENCHER"
};
