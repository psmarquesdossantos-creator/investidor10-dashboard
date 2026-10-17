// src/auth/auth-gate.js
// Phase 1 — P1/P2/P4/P21/P22/P27/P28/P29:
// Gate de acesso com modos INACTIVE | LOGIN | DEMO | REAL | BLOCKED.
// AUTHENTICATION (Firebase) != AUTHORIZATION (allowlist authorization/{uid}).
// Fail-closed: qualquer erro de resolução NUNCA cai em REAL.
// Sem firebase-config.js → gate INACTIVE → comportamento do site intacto (CI/local).
// Logging seguro (P29): só transições de modo; nunca valores/tokens/dados.
(function () {
  'use strict';

  const FORCE = (typeof window.__AUTH_GATE_FORCE__ !== 'undefined')
    ? window.__AUTH_GATE_FORCE__
    : (new URLSearchParams(location.search).get('auth') === 'required' ? true : undefined);

  let mode = null;
  let authBound = false;

  const AuthGate = {
    get mode() { return mode; },
    isInactive() { return mode === 'INACTIVE'; },
    async signOut() {
      if (window.firebase && window.firebase.auth) {
        try { await window.firebase.auth().signOut(); } catch (e) { console.warn('[authz] signOut falhou:', e && e.message); }
      }
    }
  };
  window.AuthGate = AuthGate;

  let resolveResolved;
  window.__AUTH_RESOLVED__ = new Promise(res => { resolveResolved = res; });

  function resolve(m) { console.info('[authz] boot →', m); mode = m; resolveResolved(m); }

  function localBypass() {
    // *.vercel.app: deployment atrás da Vercel Authentication (login do dono) e
    // alias público serve apenas dados sintéticos (carteira-data.js nunca é deployado
    // — .gitignore). Dados reais entram SOMENTE via Importar Backup → localStorage
    // do navegador de quem importa (P26 preservado: zero dados reais no host).
    if (location.hostname.endsWith('.vercel.app')) return true;
    return ['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:';
  }

  function configPresent() {
    const c = window.FIREBASE_CONFIG;
    return !!(c && c.projectId && c.projectId !== 'PREENCHER' && c.apiKey && c.apiKey !== 'PREENCHER');
  }

  // ---------- UI helpers ----------
  function lockUI() { document.body.classList.add('auth-locked'); }
  function unlockUI() { document.body.classList.remove('auth-locked'); }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function showLoginOverlay(opts) {
    hide(document.getElementById('authBlocked'));
    hide(document.getElementById('authLoading'));
    const gate = document.getElementById('authGate');
    if (gate) gate.removeAttribute('data-authmode'); // modo login (form completo)
    show(gate);
    bindAuthEvents(opts && opts.validateOnly);
  }

  // Produção sem Firebase configurado (Fase 2 pendente): lock + CTA demo.
  // Dados reais NUNCA existem no servidor estático — aqui só há demo sintético (P26).
  function showPreviewOverlay() {
    hide(document.getElementById('authBlocked'));
    hide(document.getElementById('authLoading'));
    const gate = document.getElementById('authGate');
    if (gate) gate.setAttribute('data-authmode', 'preview');
    show(gate);
    const btn = document.getElementById('authDemoEntry');
    if (btn && !btn.__previewBound) {
      btn.__previewBound = true;
      btn.addEventListener('click', enterDemoFromPreview);
    }
  }

  function enterDemoFromPreview() {
    return activateDemo().then(() => {
      mode = 'DEMO';
      const gate = document.getElementById('authGate');
      if (gate) { gate.removeAttribute('data-authmode'); gate.classList.add('hidden'); }
      unlockUI();
      showDemoBadge();
      try { if (typeof window.applyRealData === 'function') window.applyRealData(); } catch (e) { console.warn('[authz] applyRealData falhou (demo):', e && e.message); }
      try { if (typeof window.renderAll === 'function') window.renderAll(); } catch (e) { console.warn('[authz] renderAll falhou (demo):', e && e.message); }
      document.dispatchEvent(new CustomEvent('authz:ready', { detail: { mode } }));
    });
  }

  function showBlocked() {
    hide(document.getElementById('authGate'));
    hide(document.getElementById('authLoading'));
    show(document.getElementById('authBlocked'));
  }

  function showDemoBadge() {
    show(document.getElementById('demoBadge'));
  }

  function finishUI() {
    hide(document.getElementById('authLoading'));
    if (mode === 'INACTIVE' || mode === 'DEMO' || mode === 'REAL') unlockUI();
    else lockUI();
    if (mode === 'DEMO') showDemoBadge();
    document.dispatchEvent(new CustomEvent('authz:ready', { detail: { mode } }));
  }

  // ---------- Data activation ----------
  // Gate define window.CARTEIRA_DATA + __CARTEIRA_OVERRIDE (mesmo contrato de init-carteira.js)
  // — script.js init aplica no MOCK_DATA após __AUTH_RESOLVED__ (P22).
  function setGatePortfolio(p) {
    window.CARTEIRA_DATA = p;
    window.__CARTEIRA_OVERRIDE = p;
  }

  function activateDemo() {
    const ds = new window.LocalDemoDataSource();
    window.__DEMO_SOURCE__ = ds;
    return ds.start().then(() => {
      setGatePortfolio(ds.getPortfolio());
      ds.onUpdate(setGatePortfolio);
      const btn = document.getElementById('btnDemoReset');
      if (btn && !btn.__demoBound) {
        btn.__demoBound = true;
        btn.addEventListener('click', function () {
          ds.reset();
          setGatePortfolio(ds.getPortfolio());
          if (typeof window.applyRealData === 'function') window.applyRealData();
          if (typeof window.renderAll === 'function') window.renderAll();
          if (typeof window.showToast === 'function') window.showToast('Dados de demonstração restaurados', 'info');
        });
      }
    });
  }

  function activateReal(user) {
    if (!window.FirestoreRealDataSource) {
      console.warn('[authz] FirestoreRealDataSource ausente — fail-closed p/ DEMO');
      return activateDemo();
    }
    const src = new window.FirestoreRealDataSource(user);
    window.__REAL_SOURCE__ = src;
    return src.start().then(() => {
      setGatePortfolio(src.getPortfolio());
      src.onUpdate(p => {
        setGatePortfolio(p);
        if (typeof window.applyRealData === 'function') window.applyRealData();
        if (typeof window.renderAll === 'function') window.renderAll();
      });
      if (window.SyncHub) window.SyncHub.attach(src);
    });
  }

  // ---------- Firebase (production path only) ----------
  function loadVendorSDK() {
    if (window.firebase) return Promise.resolve();
    const files = ['vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js'];
    return files.reduce((p, src) => p.then(() => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('falha ao carregar ' + src));
      document.head.appendChild(s);
    })), Promise.resolve());
  }

  function firstUser() {
    return new Promise(res => {
      const unsub = window.firebase.auth().onAuthStateChanged(u => { unsub(); res(u); });
    });
  }

  function resolveUser(user) {
    let authz = null;
    let snapPromise;
    try {
      snapPromise = window.firebase.firestore().collection('authorization').doc(user.uid).get();
    } catch (e) {
      snapPromise = Promise.reject(e);
    }
    return snapPromise
      .then(snap => { if (snap.exists) authz = snap.data(); return null; })
      .catch(e => { console.warn('[authz] allowlist read falhou — fail-closed (DEMO):', (e && e.code) || (e && e.message)); return null; })
      .then(() => {
        const blocked = !!(authz && authz.blocked === true);
        const enabled = !!(authz && authz.enabled === true);
        if (blocked) {
          console.info('[authz]', user.uid, '→ BLOCKED');
          showBlocked();
          resolve('BLOCKED');
        } else if (enabled && user.emailVerified) {
          console.info('[authz]', user.uid, '→ REAL');
          return activateReal(user).then(() => resolve('REAL'));
        } else {
          console.info('[authz]', user.uid, '→ DEMO (não autorizado' + (enabled && !user.emailVerified ? ' — e-mail não verificado' : '') + ')');
          return activateDemo().then(() => resolve('DEMO'));
        }
      })
      .then(() => { finishUI(); return mode; });
  }

  function bindRealAuthChanges() {
    if (authBound) return;
    authBound = true;
    window.firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        // logout → volta ao overlay de login (P27/P28)
        console.info('[authz] logout → LOGIN');
        mode = 'LOGIN';
        lockUI();
        showLoginOverlay({ validateOnly: false });
        return;
      }
      // login efetivado: resolve modo (oculta overlay dentro de resolveUser)
      hide(document.getElementById('authGate'));
      resolveUser(user);
    });
  }

  // ---------- Login form (validação + auth real quando disponível) ----------
  function bindAuthEvents(validateOnly) {
    const btn = document.getElementById('authSubmit');
    const google = document.getElementById('authGoogle');
    const signup = document.getElementById('authSignup');
    if (!btn || btn.__gateBound) return;
    btn.__gateBound = true;

    const errEl = document.getElementById('authError');
    function fail(msg) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      errEl.setAttribute('role', 'alert');
    }

    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    btn.addEventListener('click', async () => {
      const email = (document.getElementById('authEmail').value || '').trim().toLowerCase();
      const pass = document.getElementById('authPassword').value || '';
      if (!validEmail(email)) { fail('Informe um e-mail válido.'); return; }
      if (pass.length < 6) { fail('Senha deve ter pelo menos 6 caracteres.'); return; }
      errEl.classList.add('hidden');
      if (validateOnly) { fail('Autenticação não configurada neste ambiente (modo força/teste).'); return; }
      try {
        await window.firebase.auth().signInWithEmailAndPassword(email, pass);
      } catch (e) {
        fail(ptBRAuthError(e && (e.code || e.message)));
      }
    });

    if (signup) signup.addEventListener('click', async () => {
      const email = (document.getElementById('authEmail').value || '').trim().toLowerCase();
      const pass = document.getElementById('authPassword').value || '';
      if (!validEmail(email)) { fail('Informe um e-mail válido.'); return; }
      if (pass.length < 6) { fail('Senha deve ter pelo menos 6 caracteres.'); return; }
      errEl.classList.add('hidden');
      if (validateOnly) { fail('Autenticação não configurada neste ambiente (modo força/teste).'); return; }
      try {
        const cred = await window.firebase.auth().createUserWithEmailAndPassword(email, pass);
        if (cred.user && typeof cred.user.sendEmailVerification === 'function') {
          try { await cred.user.sendEmailVerification(); } catch (e) { console.warn('[authz] email verification send falhou:', e && e.message); }
        }
      } catch (e) {
        fail(ptBRAuthError(e && (e.code || e.message)));
      }
    });

    if (google) google.addEventListener('click', async () => {
      if (validateOnly) { fail('Autenticação não configurada neste ambiente (modo força/teste).'); return; }
      try {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        await window.firebase.auth().signInWithPopup(provider);
      } catch (e) {
        fail(ptBRAuthError(e && (e.code || e.message)));
      }
    });

    bindFocusTrap();
  }

  function ptBRAuthError(code) {
    const map = {
      'auth/invalid-email': 'E-mail inválido.',
      'auth/user-disabled': 'Conta desativada.',
      'auth/user-not-found': 'E-mail ou senha incorretos.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/email-already-in-use': 'Este e-mail já possui conta. Use "Entrar".',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
      'auth/popup-closed-by-user': 'Login com Google cancelado.',
      'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.'
    };
    return map[code] || 'Falha na autenticação. Tente novamente.';
  }

  // A11y: mantém Tab dentro do overlay enquanto aberto (P27/axe)
  function bindFocusTrap() {
    if (window.__focusTrapBound) return;
    window.__focusTrapBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const gate = document.getElementById('authGate');
      const blocked = document.getElementById('authBlocked');
      const panel = (!gate || gate.classList.contains('hidden')) ? blocked : gate;
      if (!panel || panel.classList.contains('hidden')) return;
      const focusables = panel.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    });
  }

  // ---------- Boot ----------
  async function start() {
    // 1. Force (testes) — sobrepõe config/localhost (spec §2.1)
    if (FORCE === 'demo' || FORCE === 'blocked' || FORCE === true || FORCE === 'preview') {
      if (FORCE === 'demo') {
        await activateDemo();
        resolve('DEMO');
      } else if (FORCE === 'blocked') {
        lockUI();
        showBlocked();
        resolve('BLOCKED');
      } else if (FORCE === 'preview') {
        lockUI();
        showPreviewOverlay();
        resolve('LOGIN');
      } else {
        lockUI();
        showLoginOverlay({ validateOnly: true });
        resolve('LOGIN');
      }
      finishUI();
      return mode;
    }

    // 2. Sem config: localhost = INACTIVE (CI/dev, fluxo atual);
    //    produção = lock screen + demo sintético (nenhum dado real existe no host)
    if (!configPresent()) {
      if (localBypass()) { resolve('INACTIVE'); finishUI(); return mode; }
      console.info('[authz] produção sem Firebase config → preview lock (demo apenas)');
      lockUI();
      showPreviewOverlay();
      resolve('LOGIN');
      finishUI();
      return mode;
    }

    // 3. Localhost → bypass (máquina do dono; login/sync em fases futuras)
    if (localBypass()) { resolve('INACTIVE'); finishUI(); return mode; }

    // 4. Produção: Firebase real (P22 — decide ANTES de qualquer dado)
    lockUI();
    show(document.getElementById('authLoading'));
    try {
      await loadVendorSDK();
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
      const user = await firstUser();
      if (!user) {
        showLoginOverlay({ validateOnly: false });
        bindRealAuthChanges();
        resolve('LOGIN');
        finishUI();
        return mode;
      }
      await resolveUser(user); // resolveUser chama finishUI
      bindRealAuthChanges();
    } catch (e) {
      console.warn('[authz] boot Firebase falhou — fail-closed p/ LOGIN:', (e && e.message));
      showLoginOverlay({ validateOnly: false, });
      var errEl = document.getElementById('authError');
      if (errEl) { errEl.textContent = 'Serviço de autenticação indisponível. Tente recarregar.'; errEl.classList.remove('hidden'); }
      resolve('LOGIN');
      finishUI();
    }
    return mode;
  }

  start();
})();
