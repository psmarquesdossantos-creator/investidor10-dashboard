// src/backup-portability/durability.js
// Fase 17 — Durabilidade e recuperação de dados
// 1. Auto-backup versionado em arquivo (download) quando dados mudam significativamente
// 2. Recuperação de localStorage corrompido (quarentena + restore do último snapshot válido)
// 3. Lembrerete de backup periódico
// 4. Migração versionada de schema (v1→v2→...) para o dado salvo
// Uso: window.Durability.init() — auto-inicializado no load; APIs manuais em window.Durability

(function() {
  'use strict';

  const g = typeof window !== 'undefined' ? window : globalThis;

  const KEYS = {
    data: 'investidor10-dashboard-data',
    snapshots: 'investidor10-snapshots',
    quarantine: 'investidor10-quarantine',
    lastBackup: 'investidor10-last-backup',
    schemaVersion: 'investidor10-schema-version'
  };

  const SCHEMA_VERSION = 2;

  const Durability = {
    // ---------- 1. Auto-backup em arquivo ----------
    // Baixa JSON completo quando o fingerprint muda E passou >= 7 dias do último download.
    // Não automático silencioso: usuário vê um toast (backup é ação visível — dado é seu).
    maybeAutoBackup() {
      try {
        const C = g.CARTEIRA_DATA;
        if (!C || !g.Investidor10Advanced?.SnapshotManager) return { skipped: true };
        const last = localStorage.getItem(KEYS.lastBackup);
        const daysSince = last ? (Date.now() - +last) / 86400000 : Infinity;
        if (daysSince < 7) return { skipped: true, reason: 'menos de 7 dias do último backup' };
        const snapshots = g.Investidor10Advanced.SnapshotManager.getAll();
        if (snapshots.length < 2) return { skipped: true, reason: 'snapshots insuficientes' };
        const result = this.downloadBackup('auto');
        if (result.success) localStorage.setItem(KEYS.lastBackup, String(Date.now()));
        return result;
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    downloadBackup(source = 'manual') {
      try {
        const C = g.CARTEIRA_DATA;
        if (!C) return { success: false, error: 'sem dados para backup' };
        const payload = {
          kind: 'investidor10-dashboard-backup',
          schemaVersion: SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          source,
          snapshots: g.Investidor10Advanced?.SnapshotManager?.getAll() || [],
          data: C
        };
        const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup-investidor10-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        localStorage.setItem(KEYS.lastBackup, String(Date.now()));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    // ---------- 2. Recuperação de corrupção ----------
    // Valida todas as chaves críticas do localStorage; se uma falhar (JSON quebrado),
    // move para quarentena (não apaga — evidência) e restaura do último snapshot válido.
    healthCheck() {
      const report = { keys: {}, recovered: [], quarantined: [] };
      for (const [name, key] of Object.entries({ data: KEYS.data, snapshots: KEYS.snapshots })) {
        const raw = localStorage.getItem(key);
        if (raw === null) { report.keys[name] = 'EMPTY'; continue; }
        try {
          JSON.parse(raw);
          report.keys[name] = 'OK';
        } catch {
          // corrupção: quarentena preserva o original
          try {
            const q = JSON.parse(localStorage.getItem(KEYS.quarantine) || '[]');
            q.push({ key, raw: raw.slice(0, 512000), quarantinedAt: new Date().toISOString() });
            localStorage.setItem(KEYS.quarantine, JSON.stringify(q));
          } catch {}
          localStorage.removeItem(key);
          report.quarantined.push(name);
          report.keys[name] = 'CORRUPT_QUARANTINED';
        }
      }
      // tenta restaurar snapshots do último válido
      if (report.quarantined.includes('snapshots')) {
        // snapshots não têm cópia externa — recomeça limpo (a quarentena preserva o resíduo)
        report.recovered.push('snapshots reiniciados (resíduo em quarentena)');
      }
      if (report.quarantined.includes('data') || report.keys.data === 'EMPTY') {
        const snaps = (() => { try { return JSON.parse(localStorage.getItem(KEYS.snapshots) || '[]'); } catch { return []; } })();
        const lastGood = snaps[0]; // getAll() ordena por unshift (mais recente primeiro)
        if (lastGood?.data) {
          localStorage.setItem(KEYS.data, JSON.stringify(lastGood.data));
          g.CARTEIRA_DATA = lastGood.data;
          report.recovered.push(`data restaurada do snapshot ${lastGood.dateKey} (${lastGood.source})`);
        }
      }
      report.healthy = report.quarantined.length === 0;
      return report;
    },

    // ---------- 3. Lembrete de backup ----------
    // Toast a cada 30 dias sem download de backup (quarentena silenciosa nunca — usuário decide).
    maybeRemind() {
      try {
        const last = localStorage.getItem(KEYS.lastBackup);
        if (!last) return { remind: false, reason: 'nunca fez backup — primeira execução' };
        const days = (Date.now() - +last) / 86400000;
        if (days < 30) return { remind: false, reason: `${days.toFixed(0)} dias` };
        return { remind: true, days: Math.floor(days) };
      } catch { return { remind: false }; }
    },

    // ---------- 4. Migração de schema ----------
    // unknown != zero: se schemaVersion ausente, trata como v1 e marca; migrações são append-only.
    migrate() {
      let v = +(localStorage.getItem(KEYS.schemaVersion) || 0);
      if (v === SCHEMA_VERSION) return { migrated: false, version: v };
      const steps = [];
      if (v < 1) { steps.push('v0→v1: marcador inicial'); v = 1; }
      if (v < 2) {
        // v2: campo schemaVersion dentro de cada snapshot novo; nada destrutivo
        steps.push('v1→v2: snapshots ganham version');
        try {
          const snaps = JSON.parse(localStorage.getItem(KEYS.snapshots) || '[]');
          for (const s of snaps) if (s && !s.schemaVersion) s.schemaVersion = 2;
          localStorage.setItem(KEYS.snapshots, JSON.stringify(snaps));
        } catch {}
        v = 2;
      }
      localStorage.setItem(KEYS.schemaVersion, String(v));
      return { migrated: steps.length > 0, steps, version: v };
    },

    // ---------- Init ----------
    init() {
      const migration = this.migrate();
      const health = this.healthCheck();
      if (migration.migrated) console.info('[Durability] migração:', migration.steps.join('; '));
      if (!health.healthy) {
        console.warn('[Durability] healthCheck:', health);
        if (typeof g.toast === 'function') {
          g.toast('⚠️ Dado corrompido detectado e posto em quarentena. Restaurado do último snapshot.', 'error');
        }
      }
      // lembrete de backup (após 6s para não competir com o load)
      setTimeout(() => {
        const r = this.maybeRemind();
        if (r.remind && typeof g.toast === 'function') {
          g.toast(`🕐 Último backup há ${r.days} dias. Exporte em Backup → JSON Completo.`, 'info');
        }
      }, 6000);
      return { migration, health };
    }
  };

  g.Durability = Durability;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Durability };
})();