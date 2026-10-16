// src/auth/sync/firestore-real-source.js
// P24: FirestoreRealDataSource — dados reais do dono, isolados por UID (P6).
// P8: seções como documentos independentes (users/{uid}/portfolio/{section})
//     — write field-scoped, batch em import; NUNCA overwrite destrutivo do doc inteiro.
// P7: listeners realtime (onSnapshot) — mobile ↔ desktop via Firestore.
// P20: boot com timeout; offline → app segue com o que carregou (badge de sync fica a cargo do caller).
// P29: logs sem valores financeiros.
// Fail-closed: qualquer erro → sem emissão de dados, sem fallback p/ outro uid.
(function () {
  'use strict';

  const SECTIONS = ['kpis', 'monthly', 'patrimony', 'allocation', 'positions', 'earnings', 'entries', 'assetReturns', 'fixedIncome', 'goals'];

  function emptyPortfolio() {
    // Estado vazio honesto (UNKNOWN ≠ ZERO — não inventar dados na nuvem vazia)
    return {
      meta: { source: 'cloud', empty: true },
      kpis: {},
      monthly: [],
      patrimony: { labels: [], portfolio: [], invested: [], cdi: [], ibov: [] },
      allocation: { byClass: [], byAsset: [] },
      positions: [],
      earnings: [],
      entries: [],
      assetReturns: [],
      fixedIncome: [],
      goals: {}
    };
  }

  class FirestoreRealDataSource extends window.PortfolioDataSource {
    constructor(user) {
      super();
      if (!user || !user.uid) throw new Error('FirestoreRealDataSource exige user.uid');
      this.user = user;
      this.portfolio = emptyPortfolio();
      this.listeners = [];
      this.unsubs = [];
      this.lastApplied = {}; // section -> updatedAt aplicado (suprime eco do próprio write)
      this.coll = null;
    }

    async start() {
      const db = window.firebase.firestore();
      // P6: users/{uid}/portfolio/{section} — propriedade por UID
      this.coll = db.collection('users').doc(this.user.uid).collection('portfolio');

      const load = Promise.all(SECTIONS.map(async name => {
        try {
          const snap = await this.coll.doc(name).get();
          if (snap.exists) {
            const d = snap.data();
            this.lastApplied[name] = d.updatedAt || 0;
            this._merge(name, d.data);
          }
        } catch (e) {
          console.warn('[authz] section load falhou (fail-closed):', name, (e && e.code) || (e && e.message));
        }
        // P7: realtime listener por seção
        try {
          this.unsubs.push(this.coll.doc(name).onSnapshot(snap => {
            if (!snap.exists) return;
            const d = snap.data();
            const ts = d.updatedAt || 0;
            if (this.lastApplied[name] && ts <= this.lastApplied[name]) return; // eco do próprio push
            this.lastApplied[name] = ts;
            this._merge(name, d.data);
            this._emit();
          }, err => console.warn('[authz] listener', name, (err && err.code) || (err && err.message))));
        } catch (e) {
          console.warn('[authz] listener setup falhou:', name, (e && e.message));
        }
      }));

      // P20: boot não trava em rede lenta — 5s e segue com o que houver
      await Promise.race([load, new Promise(res => setTimeout(res, 5000))]);
      this._emit();
    }

    getPortfolio() {
      return this.portfolio;
    }

    // P8: write field-scoped — só a seção alterada
    saveSection(name, data) {
      return this.saveSections({ [name]: data });
    }

    saveSections(map) {
      if (!this.coll || !map) return Promise.resolve();
      const db = window.firebase.firestore();
      const batch = db.batch();
      let has = false;
      Object.keys(map).forEach(name => {
        if (!SECTIONS.includes(name)) { console.warn('[authz] seção desconhecida ignorada:', name); return; }
        const updatedAt = Date.now();
        this.lastApplied[name] = updatedAt; // suprime eco
        this._merge(name, map[name]);
        batch.set(this.coll.doc(name), { data: map[name], updatedAt }, { merge: false });
        has = true;
      });
      if (!has) return Promise.resolve();
      return batch.commit().catch(e => {
        console.warn('[authz] batch write falhou (fail-closed):', (e && e.code) || (e && e.message));
      });
    }

    onUpdate(cb) {
      if (typeof cb === 'function') this.listeners.push(cb);
    }

    stop() {
      this.unsubs.forEach(u => { try { u(); } catch (e) { /* noop */ } });
      this.unsubs = [];
      this.listeners = [];
    }

    _merge(name, data) {
      this.portfolio[name] = data;
      if (this.portfolio.meta) this.portfolio.meta.empty = false;
    }

    _emit() {
      const snapshot = this.portfolio;
      this.listeners.forEach(cb => {
        try { cb(snapshot); } catch (e) { console.warn('[authz] real listener error:', e && e.message); }
      });
    }
  }

  window.FirestoreRealDataSource = FirestoreRealDataSource;

  // ---- SyncHub: ponto único de push (hooks de mutação → debounce → batch) ----
  // Inativo por padrão (INACTIVE/DEMO): markDirty/saveAll são no-op (P10 — demo nunca
  // escreve no Firestore). Ativado apenas pelo gate quando mode=REAL.
  const SyncHub = {
    active: false,
    source: null,
    _timer: null,
    _dirty: new Set(),

    attach(src) { this.source = src; this.active = true; },
    detach() { this.source = null; this.active = false; },

    markDirty(section) {
      if (!this.active || !this.source || !SECTIONS.includes(section)) return;
      this._dirty.add(section);
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), 2000);
    },

    // Todas as seções do MOCK_DATA (usado por mutações de escopo amplo)
    saveAll() {
      if (!this.active || !this.source) return;
      const M = window.MOCK_DATA;
      if (!M) return;
      const map = {};
      SECTIONS.forEach(s => { if (M[s] !== undefined) map[s] = M[s]; });
      this._dirty.clear();
      clearTimeout(this._timer);
      this.source.saveSections(map);
    },

    flush() {
      if (!this.active || !this.source || !this._dirty.size) return;
      const M = window.MOCK_DATA;
      if (!M) { this._dirty.clear(); return; }
      const map = {};
      this._dirty.forEach(s => { if (M[s] !== undefined) map[s] = M[s]; });
      this._dirty.clear();
      clearTimeout(this._timer);
      this.source.saveSections(map);
    }
  };

  window.SyncHub = SyncHub;
})();
