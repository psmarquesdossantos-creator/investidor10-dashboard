// src/auth/sync/local-demo-source.js
// P25: LocalDemoDataSource — dados do modo DEMO.
// - fixture sintético (DEMO_FIXTURE) como default determinístico
// - persistência local apenas (localStorage 'investidor10-demo') — P10
// - reset restaura defaults — P11
// - zero acesso a dados reais, zero Firestore — P26
(function () {
  'use strict';

  const DEMO_KEY = 'investidor10-demo';

  class LocalDemoDataSource extends window.PortfolioDataSource {
    constructor(storageKey) {
      super();
      this.storageKey = storageKey || DEMO_KEY;
      this.portfolio = null;
      this.listeners = [];
    }

    async start() {
      let stored = null;
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) stored = JSON.parse(raw);
      } catch (e) {
        console.warn('[authz] demo storage corrompido, usando fixture default:', e && e.message);
      }
      const base = this._cloneFixture();
      if (stored && stored.portfolio) {
        // merge por seção: edits locais do usuário prevalecem sobre o default
        Object.keys(stored.portfolio).forEach(k => { base[k] = stored.portfolio[k]; });
      }
      this.portfolio = base;
    }

    getPortfolio() {
      return this.portfolio;
    }

    saveSection(name, data) {
      if (!this.portfolio) return;
      this.portfolio[name] = data;
      this._persist();
      this.listeners.forEach(cb => {
        try { cb(this.portfolio); } catch (e) { console.warn('[authz] demo listener error:', e && e.message); }
      });
    }

    // Múltiplas seções + persistência única (usado por saveToStorage no modo DEMO)
    saveSections(map) {
      if (!this.portfolio || !map) return;
      Object.keys(map).forEach(k => { this.portfolio[k] = map[k]; });
      this._persist();
    }

    onUpdate(cb) {
      if (typeof cb === 'function') this.listeners.push(cb);
    }

    stop() {
      this.listeners = [];
    }

    // P11: restaura defaults (fixture sintética), descarta edits locais
    reset() {
      try { localStorage.removeItem(this.storageKey); } catch (e) { /* noop */ }
      this.portfolio = this._cloneFixture();
      this.listeners.forEach(cb => {
        try { cb(this.portfolio); } catch (e) { console.warn('[authz] demo listener error:', e && e.message); }
      });
    }

    _persist() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ portfolio: this.portfolio, updatedAt: new Date().toISOString() }));
      } catch (e) {
        console.warn('[authz] demo persist falhou (quota?):', e && e.message);
      }
    }

    _cloneFixture() {
      if (!window.DEMO_FIXTURE) throw new Error('DEMO_FIXTURE ausente — fixture demo não carregada');
      return JSON.parse(JSON.stringify(window.DEMO_FIXTURE));
    }
  }

  window.LocalDemoDataSource = LocalDemoDataSource;
  window.DEMO_STORAGE_KEY = DEMO_KEY;
})();
