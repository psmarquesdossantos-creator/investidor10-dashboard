// ========================================
// ADVANCED FINANCIAL ENGINE — Investidor10 Dashboard
// TWR/XIRR, Snapshots, RF Confidence, States, Accessibility, Import Pipeline
// ========================================

(function() {
  'use strict';

  // ========================================
  // 1. TWR / XIRR ENGINE (separado de DATA_READY)
  // ========================================
  const ReturnEngine = {
    // TWR: Time-Weighted Return
    // Requer: série diária de patrimônio + fluxos de caixa
    calculateTWR: function(dailySeries, cashflows) {
      if (!dailySeries || dailySeries.length < 2) {
        return { status: 'UNAVAILABLE', reason: 'Série histórica insuficiente (<2 pontos)' };
      }
      // Validar cobertura
      const coverage = this._checkCoverage(dailySeries);
      if (coverage < 0.8) {
        return { status: 'PARTIAL', reason: `Cobertura ${(coverage*100).toFixed(0)}% < 80%`, twr: this._computeTWR(dailySeries, cashflows) };
      }
      return { status: 'AVAILABLE', twr: this._computeTWR(dailySeries, cashflows) };
    },

    _computeTWR: function(series, cashflows) {
      // Simplified TWR: geometric link of sub-period returns
      let twr = 1;
      for (let i = 1; i < series.length; i++) {
        const prev = series[i-1].value;
        const curr = series[i].value;
        const cf = cashflows.find(c => c.date === series[i].date)?.amount || 0;
        const subReturn = (curr - cf - prev) / prev;
        twr *= (1 + subReturn);
      }
      return (twr - 1) * 100;
    },

    _checkCoverage: function(series) {
      // Check for gaps > 3 days
      let gaps = 0;
      for (let i = 1; i < series.length; i++) {
        const d1 = new Date(series[i-1].date);
        const d2 = new Date(series[i].date);
        if ((d2 - d1) / (1000*60*60*24) > 3) gaps++;
      }
      return 1 - gaps / (series.length - 1);
    },

    // XIRR: Extended Internal Rate of Return
    // Requer: fluxos de caixa com datas + valor final
    calculateXIRR: function(cashflows, finalValue, finalDate) {
      if (!cashflows || cashflows.length < 2) {
        return { status: 'UNAVAILABLE', reason: 'Mínimo 2 fluxos de caixa necessários' };
      }
      // Validate: at least one positive and one negative
      const hasPositive = cashflows.some(c => c.amount > 0);
      const hasNegative = cashflows.some(c => c.amount < 0);
      if (!hasPositive || !hasNegative) {
        return { status: 'UNAVAILABLE', reason: 'Fluxos devem ter entradas e saídas' };
      }
      // Newton-Raphson
      const xirr = this._newtonRaphson(cashflows, finalValue, finalDate);
      if (xirr === null) {
        return { status: 'PARTIAL', reason: 'Não convergiu', xirr: null };
      }
      return { status: 'AVAILABLE', xirr: xirr * 100 };
    },

    _newtonRaphson: function(cashflows, finalValue, finalDate) {
      // Add final value as positive cashflow
      const flows = [...cashflows, { date: finalDate, amount: finalValue }];
      // Sort by date
      flows.sort((a,b) => new Date(a.date) - new Date(b.date));
      
      let guess = 0.1; // 10% initial
      for (let iter = 0; iter < 100; iter++) {
        let f = 0, df = 0;
        for (const cf of flows) {
          const days = (new Date(cf.date) - new Date(flows[0].date)) / (1000*60*60*24);
          const factor = Math.pow(1 + guess, days / 365);
          f += cf.amount / factor;
          df += -cf.amount * days / (365 * Math.pow(1 + guess, days/365 + 1));
        }
        if (Math.abs(f) < 0.01) return guess;
        if (df === 0) return null;
        guess -= f / df;
        if (guess <= -0.99) return null; // Invalid
      }
      return null;
    },

    // Engine availability flags (separado de data ready)
    TWR_ENGINE_AVAILABLE: true,
    XIRR_ENGINE_AVAILABLE: true,
    
    // Data readiness check
    isTWRDataReady: function(dailySeries) {
      return dailySeries && dailySeries.length >= 252; // ~1 ano útil
    },
    isXIRRDataReady: function(cashflows) {
      return cashflows && cashflows.length >= 4 && 
             cashflows.some(c => c.amount > 0) && 
             cashflows.some(c => c.amount < 0);
    },

    // Helper: Calculate TWR from snapshots
    calculateTWRFromSnapshots: function(snapshots) {
      if (!snapshots || snapshots.length < 2) {
        return { status: 'TRACKING_STARTED', reason: 'Snapshots insuficientes (<2)', twr: null, series: [] };
      }
      
      // Sort snapshots by date
      const sorted = [...snapshots].sort((a,b) => new Date(a.date) - new Date(b.date));
      
      // Extract daily series
      const series = sorted.map(s => ({
        date: s.dateKey || s.date.slice(0,10),
        value: s.data?.kpis?.total || 0,
        invested: s.data?.kpis?.invested || 0
      })).filter(s => s.value > 0);
      
      if (series.length < 2) {
        return { status: 'PARTIAL', reason: 'Snapshots sem patrimônio válido', twr: null, series };
      }
      
      // Get cashflows from entries
      const cashflows = this._extractCashflows(sorted);
      
      const result = this.calculateTWR(series, cashflows);
      return { ...result, series, cashflows };
    },

    _extractCashflows: function(snapshots) {
      // Extract from entries in first snapshot that has them
      const firstWithEntries = snapshots.find(s => s.data?.entries?.length);
      if (!firstWithEntries) return [];
      
      return firstWithEntries.data.entries
        .filter(e => e.type === 'buy') // Only inflows for TWR
        .map(e => ({ date: e.date, amount: e.value }));
    },

    // Helper: Calculate XIRR from entries + current value
    calculateXIRRFromData: function(entries, finalValue, finalDate) {
      if (!entries || entries.length < 2) {
        return { status: 'TRACKING_STARTED', reason: 'Transações insuficientes (<2)', xirr: null, cashflows: [] };
      }
      
      // Convert entries to cashflows (buys = negative/outflow, sells = positive/inflow)
      const cashflows = entries
        .filter(e => e.type === 'buy' || e.type === 'sell')
        .map(e => ({
          date: e.date,
          amount: e.type === 'buy' ? -e.value : e.value,
          ticker: e.ticker,
          type: e.type
        }))
        .sort((a,b) => new Date(a.date) - new Date(b.date));
      
      if (cashflows.length < 2) {
        return { status: 'PARTIAL', reason: 'Mínimo 2 transações de compra/venda', xirr: null, cashflows };
      }
      
      const hasPositive = cashflows.some(c => c.amount > 0);
      const hasNegative = cashflows.some(c => c.amount < 0);
      if (!hasPositive || !hasNegative) {
        return { status: 'PARTIAL', reason: 'Apenas compras ou apenas vendas', xirr: null, cashflows };
      }
      
      const result = this.calculateXIRR(cashflows, finalValue, finalDate);
      return { ...result, cashflows };
    }
  };

  // ========================================
  // 2. DETERMINISTIC DAILY SNAPSHOT
  // ========================================
  const SnapshotManager = {
    STORAGE_KEY: 'investidor10-snapshots',
    MAX_SNAPSHOTS: 365,
    
    // Create deterministic fingerprint
    fingerprint: function(data) {
      // Sort keys, remove volatile fields
      const clean = JSON.parse(JSON.stringify(data));
      delete clean.timestamp;
      delete clean.nonce;
      const str = JSON.stringify(clean, Object.keys(clean).sort());
      // Simple hash (in production use crypto.subtle.digest)
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 'sha256:' + Math.abs(hash).toString(16).padStart(8, '0');
    },

    // Capture snapshot
    capture: function(portfolioData, source = 'manual') {
      const snapshots = this.getAll();
      const today = new Date().toISOString().slice(0, 10);
      
      // Prevent duplicate same-day auto snapshots
      if (source === 'auto') {
        const lastAuto = snapshots.find(s => s.source === 'auto' && s.date.startsWith(today));
        if (lastAuto) return { skipped: true, reason: 'Auto snapshot already exists today' };
      }

      const snapshot = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        dateKey: today,
        source: source, // 'manual' | 'auto' | 'import'
        fingerprint: this.fingerprint(portfolioData),
        data: portfolioData,
        priceCoverage: this._calcPriceCoverage(portfolioData),
        version: '1.0'
      };

      snapshots.unshift(snapshot);
      // Retention
      if (snapshots.length > this.MAX_SNAPSHOTS) snapshots.length = this.MAX_SNAPSHOTS;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshots));
      return { saved: true, snapshot };
    },

    _calcPriceCoverage: function(data) {
      const positions = data.positions || [];
      const withPrice = positions.filter(p => p.currentPrice && p.currentPrice > 0).length;
      return positions.length ? withPrice / positions.length : 0;
    },

    getAll: function() {
      try {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      } catch { return []; }
    },

    getByDate: function(dateKey) {
      return this.getAll().find(s => s.dateKey === dateKey);
    },

    // Readiness states
    getHistoryReadiness: function() {
      const snaps = this.getAll();
      if (snaps.length === 0) return 'NOT_STARTED';
      if (snaps.length < 30) return 'BUILDING';
      if (snaps.length < 252) return 'PARTIAL';
      return 'READY';
    }
  };

  // ========================================
  // 3. RENDA FIXA CONFIDENCE LEVELS
  // ========================================
  const RFConfidence = {
    LEVELS: ['MANUAL', 'SHADOW', 'SUPPORTED', 'UNSUPPORTED', 'STALE', 'UNKNOWN'],
    
    classify: function(rfItem) {
      // rfItem: { type: 'CDB'|'CRA'|'DEB'|'LIG'|'FUNDO', indexer, maturity, custodian, hasMTM, lastMTMDate }
      
      // Manual: user entered, no auto price
      if (rfItem.manualEntry) return 'MANUAL';
      
      // Shadow: has MTM but not from primary custodian
      if (rfItem.hasMTM && !rfItem.primaryCustodian) return 'SHADOW';
      
      // Supported: CDB/Tesouro from major custodian with fresh MTM
      if (['CDB', 'TESOURO', 'LFT', 'NTNB', 'LTN'].includes(rfItem.type) && 
          rfItem.primaryCustodian && rfItem.hasMTM && this._isFresh(rfItem.lastMTMDate)) {
        return 'SUPPORTED';
      }
      
      // CRA/DEB/LIG/Private: need manual review
      if (['CRA', 'DEB', 'LIG', 'CRI', 'FIDC'].includes(rfItem.type)) {
        return rfItem.hasMTM && this._isFresh(rfItem.lastMTMDate) ? 'SHADOW' : 'MANUAL';
      }
      
      // Fundos DI: supported if from major custodian
      if (rfItem.type === 'FUNDO_DI' && rfItem.primaryCustodian) {
        return rfItem.hasMTM && this._isFresh(rfItem.lastMTMDate) ? 'SUPPORTED' : 'SHADOW';
      }
      
      // Stale: MTM > 5 business days old
      if (rfItem.hasMTM && !this._isFresh(rfItem.lastMTMDate)) return 'STALE';
      
      return 'UNKNOWN';
    },

    _isFresh: function(dateStr) {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const now = new Date();
      const diff = (now - d) / (1000*60*60*24);
      return diff <= 5; // 5 business days
    },

    getDisplay: function(level) {
      const displays = {
        MANUAL: { label: 'Manual', color: 'var(--color-warning)', icon: '✏️', description: 'Valor informado manualmente' },
        SHADOW: { label: 'Sombra', color: 'var(--color-info)', icon: '👁️', description: 'MTM secundário, revisar' },
        SUPPORTED: { label: 'Suportado', color: 'var(--color-success)', icon: '✅', description: 'MTM primário atualizado' },
        UNSUPPORTED: { label: 'Não suportado', color: 'var(--color-error)', icon: '❌', description: 'Sem valuation automático' },
        STALE: { label: 'Desatualizado', color: 'var(--color-warning)', icon: '⏳', description: 'MTM > 5 dias úteis' },
        UNKNOWN: { label: 'Desconhecido', color: 'var(--color-muted)', icon: '❓', description: 'Classificação pendente' }
      };
      return displays[level] || displays.UNKNOWN;
    }
  };

  // ========================================
  // 4. EXPLICIT DATA STATES
  // ========================================
  const DataStates = {
    STATES: ['AVAILABLE', 'PARTIAL', 'UNAVAILABLE', 'TRACKING_STARTED', 'STALE', 'LOADING', 'ERROR'],
    
    // Determine state for a metric
    getMetricState: function(metricName, data, engine) {
      // Check engine availability
      if (!engine[`${metricName}_ENGINE_AVAILABLE`]) {
        return { state: 'UNAVAILABLE', reason: 'Motor não implementado' };
      }
      
      // Check data readiness
      const readyFn = engine[`is${metricName}DataReady`];
      if (readyFn && !readyFn(data)) {
        return { state: 'PARTIAL', reason: 'Dados insuficientes para cálculo confiável' };
      }
      
      // Check if data exists
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return { state: 'TRACKING_STARTED', reason: 'Ainda não há dados coletados' };
      }
      
      // Check staleness
      if (data.lastUpdated) {
        const age = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000*60*60*24);
        if (age > 7) return { state: 'STALE', reason: `Dados com ${age.toFixed(0)} dias` };
      }
      
      return { state: 'AVAILABLE' };
    },

    // Render state badge
    renderBadge: function(stateObj) {
      const configs = {
        AVAILABLE: { class: 'badge-success', text: 'Disponível' },
        PARTIAL: { class: 'badge-warning', text: 'Parcial' },
        UNAVAILABLE: { class: 'badge-neutral', text: 'Indisponível' },
        TRACKING_STARTED: { class: 'badge-info', text: 'Iniciando...' },
        STALE: { class: 'badge-warning', text: 'Desatualizado' },
        LOADING: { class: 'badge-info', text: 'Carregando...' },
        ERROR: { class: 'badge-error', text: 'Erro' }
      };
      const cfg = configs[stateObj.state] || configs.UNAVAILABLE;
      return `<span class="data-state-badge ${cfg.class}" title="${stateObj.reason || ''}">${cfg.text}</span>`;
    }
  };

  // ========================================
  // 5. IMPORT PIPELINE (FILE → DETECT → PARSE → NORMALIZE → CLASSIFY → FINGERPRINT → ASSET_RESOLUTION → DEDUP → RECONCILIATION → PREVIEW → BLOCKERS → CONFIRMATION → WRITE)
  // ========================================
  const ImportPipeline = {
    steps: ['DETECT', 'PARSE', 'NORMALIZE', 'CLASSIFY', 'FINGERPRINT', 'ASSET_RESOLUTION', 'DEDUP', 'RECONCILIATION', 'PREVIEW', 'BLOCKERS', 'CONFIRMATION', 'WRITE'],
  
    state: {
      currentStep: 0,
      file: null,
      format: null,
      parsed: null,
      normalized: null,
      classified: null,
      fingerprints: null,
      resolvedAssets: null,
      deduped: null,
      reconciled: null,
      preview: null,
      blockers: [],
      confirmed: false
    },

    reset: function() {
      this.state = { ...this.state, currentStep: 0, file: null, format: null, parsed: null, normalized: null, classified: null, fingerprints: null, resolvedAssets: null, deduped: null, reconciled: null, preview: null, blockers: [], confirmed: false };
    },

    // Step 1: Detect format
    detect: function(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          let format = 'UNKNOWN';
          if (text.includes('carteira-investimentos-backup')) format = 'CARTEIRA_INVESTIMENTOS_BACKUP';
          else if (text.includes('"Produto"') && text.includes('"Preço de Fechamento"')) format = 'B3_POSICAO_CSV';
          else if (text.includes('"Data"') && text.includes('"Tipo de Evento"')) format = 'B3_PROVENTOS_CSV';
          else if (text.trim().startsWith('{')) format = 'JSON_GENERIC';
          else if (text.includes('Código de Negociação') && text.includes('Quantidade')) format = 'B3_POSICAO_CSV_ALT';
        
          this.state.file = file;
          this.state.format = format;
          this.state.currentStep = 1;
          resolve({ format, size: file.size, name: file.name, preview: text.slice(0, 500) });
        };
        reader.readAsText(file);
      });
    },

    // Step 2: Parse based on format
    parse: function() {
      const { format, file } = this.state;
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          let parsed = null;

          try {
            switch (format) {
              case 'CARTEIRA_INVESTIMENTOS_BACKUP':
                parsed = this._parseBackup(JSON.parse(text));
                break;
              case 'B3_POSICAO_CSV':
              case 'B3_POSICAO_CSV_ALT':
                parsed = this._parseB3Posicao(text);
                break;
              case 'B3_PROVENTOS_CSV':
                parsed = this._parseB3Proventos(text);
                break;
              case 'JSON_GENERIC':
                parsed = this._parseGeneric(JSON.parse(text));
                break;
              default:
                throw new Error('Formato não suportado: ' + format);
            }

            this.state.parsed = parsed;
            this.state.currentStep = 2;
            resolve({ records: parsed.length, sample: parsed.slice(0, 3) });
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsText(file);
      });
    },

    _parseBackup: function(json) {
      // Convert backup format to internal events
      const events = [];
      const payload = json.payload?.state || {};
    
      // Aportes -> entries
      (payload.aportes || []).forEach(a => {
        events.push({
          source: 'backup',
          type: 'entry',
          date: a.date,
          ticker: a.ticker,
          operation: a.operation,
          qty: a.qty,
          price: a.price,
          value: a.qty * a.price,
          fees: 0,
          raw: a
        });
      });
    
      // Proventos -> earnings
      (payload.proventos || []).forEach(p => {
        events.push({
          source: 'backup',
          type: 'earning',
          date: p.date,
          ticker: p.ticker,
          name: p.assetName || p.ticker,
          eventType: p.eventType || 'Rendimento',
          qty: p.qty,
          unitPrice: p.unitPrice,
          value: p.value,
          raw: p
        });
      });
    
      // Assets -> positions (for cost basis)
      (payload.assets || []).forEach(a => {
        if (a.qty > 0) {
          events.push({
            source: 'backup',
            type: 'position',
            ticker: a.ticker,
            name: a.name,
            qty: a.qty,
            avgPrice: a.avg_price,
            currentPrice: a.current_price,
            type: a.type,
            sector: a.sector,
            raw: a
          });
        }
      });
    
      return events;
    },

    _parseB3Posicao: function(text) {
      // Parse B3 position CSV
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const events = [];
    
      for (let i = 1; i < lines.length; i++) {
        const vals = this._parseCSVLine(lines[i]);
        if (vals.length < headers.length) continue;
      
        const row = {};
        headers.forEach((h, idx) => row[h] = vals[idx]);
      
        // Skip totals
        if (!row['Código de Negociação'] || row['Código de Negociação'].includes('Total')) continue;
      
        events.push({
          source: 'b3_posicao',
          type: 'position',
          ticker: row['Código de Negociação'],
          name: row['Produto'],
          qty: parseFloat(row['Quantidade']) || 0,
          currentPrice: parseFloat(row['Preço de Fechamento']) || 0,
          currentValue: parseFloat(row['Valor Atualizado']) || 0,
          institution: row['Instituição'],
          sector: row['Setor'] || row['Tipo'],
          raw: row
        });
      }
    
      return events;
    },

    _parseB3Proventos: function(text) {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const events = [];
    
      for (let i = 1; i < lines.length; i++) {
        const vals = this._parseCSVLine(lines[i]);
        if (vals.length < headers.length) continue;
      
        const row = {};
        headers.forEach((h, idx) => row[h] = vals[idx]);
      
        if (!row['Produto'] || row['Produto'].includes('Total')) continue;
      
        events.push({
          source: 'b3_proventos',
          type: 'earning',
          date: row['Pagamento'],
          ticker: row['Produto'].split(' - ')[0].trim(),
          name: row['Produto'],
          eventType: row['Tipo de Evento'],
          qty: parseFloat(row['Quantidade']) || 0,
          unitPrice: parseFloat(row['Preço unitário']) || 0,
          value: parseFloat(row['Valor líquido']) || 0,
          institution: row['Instituição'],
          raw: row
        });
      }
    
      return events;
    },

    _parseGeneric: function(json) {
      // Try to detect common formats
      if (json.kpis && json.positions) return [{ type: 'full_portfolio', data: json }];
      return [{ type: 'unknown', data: json }];
    },

    _parseCSVLine: function(line) {
      // Simple CSV parser handling quoted fields
      const result = [];
      let current = '';
      let inQuotes = false;
    
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i+1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    },

    // Step 3: Normalize to internal schema
    normalize: function() {
      const normalized = this.state.parsed.map(event => {
        const base = {
          id: crypto.randomUUID(),
          source: event.source,
          type: event.type,
          timestamp: new Date().toISOString()
        };
      
        switch (event.type) {
          case 'entry':
            return { ...base, 
              date: event.date,
              ticker: event.ticker,
              operation: event.operation,
              qty: Number(event.qty),
              price: Number(event.price),
              value: Number(event.value),
              fees: Number(event.fees) || 0
            };
          case 'earning':
            return { ...base,
              date: event.date,
              ticker: event.ticker,
              name: event.name,
              eventType: event.eventType,
              qty: Number(event.qty),
              unitPrice: Number(event.unitPrice),
              value: Number(event.value)
            };
          case 'position':
            return { ...base,
              ticker: event.ticker,
              name: event.name,
              qty: Number(event.qty),
              avgPrice: Number(event.avgPrice) || 0,
              currentPrice: Number(event.currentPrice) || 0,
              currentValue: Number(event.currentValue) || 0,
              assetType: event.type,
              sector: event.sector
            };
          default:
            return { ...base, ...event };
        }
      });
    
      this.state.normalized = normalized;
      this.state.currentStep = 3;
      return { records: normalized.length };
    },

    // Step 4: Classify assets
    classify: function() {
      // Asset class mapping
      const classMap = {
        'Ação': 'stocks', 'Ações': 'stocks', 'ON': 'stocks', 'PN': 'stocks',
        'FII': 'fiis', 'Fundos Imobiliários': 'fiis',
        'ETF': 'etfs', 'Fundo de Índice': 'etfs',
        'Renda Fixa': 'fixed', 'CDB': 'fixed', 'CRA': 'fixed', 'DEB': 'fixed', 'LIG': 'fixed', 'Tesouro': 'fixed',
        'BDR': 'bdr', 'Criptomoeda': 'crypto', 'Criptoativo': 'crypto'
      };
    
      const sectorMap = {}; // Could be expanded
    
      this.state.classified = this.state.normalized.map(event => {
        if (event.type !== 'position') return event;
      
        const assetClass = classMap[event.assetType] || 'other';
        return { ...event, assetClass };
      });
    
      this.state.currentStep = 4;
      return { classes: [...new Set(this.state.classified.filter(e=>e.type==='position').map(e=>e.assetClass))] };
    },

    // Step 5: Fingerprint (deterministic content hash)
    fingerprint: function() {
      this.state.fingerprints = this.state.classified.map(event => {
        // Create deterministic fingerprint from economic content
        const content = [
          event.type,
          event.ticker,
          event.date || '',
          event.operation || '',
          event.qty,
          event.price || event.unitPrice || event.currentPrice || 0,
          event.value
        ].join('|');
      
        // Simple hash (production: crypto.subtle.digest('SHA-256', ...))
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          hash = ((hash << 5) - hash) + content.charCodeAt(i);
          hash |= 0;
        }
      
        return { ...event, fingerprint: 'fp:' + Math.abs(hash).toString(16).padStart(8, '0') };
      });
    
      this.state.currentStep = 5;
      return { fingerprints: this.state.fingerprints.length };
    },

    // Step 6: Asset Resolution
    resolveAssets: function() {
      // Match tickers to known assets, flag unknown
      const knownTickers = new Set([
        // From current portfolio
        'BBAS3','CMIG4','ITUB4','PETR4','VALE3','SAPR11','SUZB3',
        'DIVD11','HODL11','IMAB11','NDIV11','WRLD11',
        'BRCO11','BTLG11','FATN11','GARE11','GGRC11','HGLG11','HGRU11','IRIM11',
        'KNHF11','KNRI11','KNUQ11','MCCI11','PMLL11','PVBI11','RBRY11',
        'TEPP11','TGAR11','TRXF11','VGHF11','VGIP11','VISC11','VRTA11',
        'XPLG11','XPML11','XPML12'
      ]);
    
      this.state.resolvedAssets = this.state.fingerprints.map(event => {
        if (event.type !== 'position' && event.type !== 'entry' && event.type !== 'earning') {
          return { ...event, resolved: true, known: true };
        }
      
        const known = knownTickers.has(event.ticker);
        return { 
          ...event, 
          resolved: true, 
          known,
          resolution: known ? 'MATCHED' : 'UNKNOWN'
        };
      });
    
      this.state.currentStep = 6;
      const unknown = this.state.resolvedAssets.filter(e => !e.known && ['position','entry','earning'].includes(e.type));
      return { resolved: this.state.resolvedAssets.length, unknown: unknown.length, unknownTickers: [...new Set(unknown.map(e=>e.ticker))] };
    },

    // Step 7: Deduplication
    dedup: function() {
      const seen = new Map();
      const duplicates = [];
      const unique = [];
    
      for (const event of this.state.resolvedAssets) {
        const key = event.fingerprint;
        if (seen.has(key)) {
          duplicates.push({ original: seen.get(key), duplicate: event });
        } else {
          seen.set(key, event);
          unique.push(event);
        }
      }
    
      // Also check for same economic event (same ticker, date, type, similar value)
      const economicKey = e => `${e.type}|${e.ticker}|${e.date}|${e.operation||e.eventType||''}|${Math.round((e.value||0)/10)*10}`;
      const ecoSeen = new Map();
      const ecoDuplicates = [];
      const ecoUnique = [];
    
      for (const event of unique) {
        const key = economicKey(event);
        if (ecoSeen.has(key)) {
          ecoDuplicates.push({ original: ecoSeen.get(key), duplicate: event, reason: 'Same economic event' });
        } else {
          ecoSeen.set(key, event);
          ecoUnique.push(event);
        }
      }
    
      this.state.deduped = ecoUnique;
      this.state.currentStep = 7;
      return { 
        original: this.state.resolvedAssets.length, 
        exactDuplicates: duplicates.length, 
        economicDuplicates: ecoDuplicates.length,
        final: ecoUnique.length,
        duplicatesDetail: [...duplicates, ...ecoDuplicates].slice(0, 10)
      };
    },

    // Step 8: Reconciliation
    reconcile: function() {
      const existing = this._getExistingData();
      const incoming = this.state.deduped;
    
      const conflicts = [];
      const newEvents = [];
      const updatedEvents = [];
    
      for (const event of incoming) {
        const existingEvent = this._findExisting(event, existing);
      
        if (!existingEvent) {
          newEvents.push(event);
        } else {
          // Check for conflicts
          const conflict = this._detectConflict(event, existingEvent);
          if (conflict) {
            conflicts.push({ incoming: event, existing: existingEvent, ...conflict });
          } else if (this._isDifferent(event, existingEvent)) {
            updatedEvents.push({ incoming: event, existing: existingEvent });
          }
        }
      }
    
      this.state.reconciled = { newEvents, updatedEvents, conflicts, existing };
      this.state.currentStep = 8;
      return { new: newEvents.length, updated: updatedEvents.length, conflicts: conflicts.length };
    },

    _getExistingData: function() {
      // Get from localStorage / MOCK_DATA
      const data = [];
      if (window.MOCK_DATA) {
        // Entries
        (window.MOCK_DATA.entries || []).forEach(e => data.push({ ...e, _source: 'mock', _type: 'entry' }));
        // Earnings
        (window.MOCK_DATA.earnings || []).forEach(e => data.push({ ...e, _source: 'mock', _type: 'earning' }));
        // Positions
        (window.MOCK_DATA.positions || []).forEach(p => data.push({ ...p, _source: 'mock', _type: 'position' }));
      }
      return data;
    },

    _findExisting: function(event, existing) {
      if (event.type === 'position') {
        return existing.find(e => e._type === 'position' && e.ticker === event.ticker);
      }
      if (event.type === 'entry') {
        return existing.find(e => e._type === 'entry' && e.ticker === event.ticker && e.date === event.date && e.operation === event.operation);
      }
      if (event.type === 'earning') {
        return existing.find(e => e._type === 'earning' && e.ticker === event.ticker && e.date === event.date && Math.abs((e.value||0) - (event.value||0)) < 0.01);
      }
      return null;
    },

    _detectConflict: function(incoming, existing) {
      // Check for significant differences
      const fields = event => ['qty','price','value','unitPrice','currentPrice','avgPrice'].filter(f => event[f] != null);
      const incomingFields = fields(incoming);
      const existingFields = fields(existing);
    
      for (const f of incomingFields) {
        const iv = incoming[f];
        const ev = existing[f];
        if (iv != null && ev != null && Math.abs(iv - ev) > Math.max(Math.abs(iv), Math.abs(ev)) * 0.05) {
          return { field: f, incoming: iv, existing: ev, diff: iv - ev };
        }
      }
      return null;
    },

    _isDifferent: function(incoming, existing) {
      return incoming.value !== existing.value || 
             incoming.qty !== existing.qty ||
             incoming.price !== existing.price;
    },

    // Step 9: Preview (READ ONLY)
    generatePreview: function() {
      const { newEvents, updatedEvents, conflicts, existing } = this.state.reconciled;
    
      // Coverage calculation
      const totalIncoming = newEvents.length + updatedEvents.length;
      const totalExisting = existing.length;
      const coverage = totalExisting > 0 ? (totalIncoming / (totalIncoming + totalExisting)) * 100 : 100;
    
      // Warnings
      const warnings = [];
      if (conflicts.length > 0) warnings.push(`${conflicts.length} conflitos de dados detectados`);
      const unknownAssets = this.state.resolvedAssets.filter(e => !e.known && ['position','entry','earning'].includes(e.type));
      if (unknownAssets.length > 0) warnings.push(`${unknownAssets.length} ativos desconhecidos: ${[...new Set(unknownAssets.map(e=>e.ticker))].join(', ')}`);
    
      this.state.preview = {
        newEvents,
        updatedEvents,
        conflicts,
        unknownAssets: [...new Set(unknownAssets.map(e=>e.ticker))],
        coverage: Math.round(coverage * 100) / 100,
        warnings,
        summary: `${newEvents.length} novos, ${updatedEvents.length} atualizados, ${conflicts.length} conflitos`
      };
    
      this.state.currentStep = 9;
      return this.state.preview;
    },

    // Step 10: Blockers
    checkBlockers: function() {
      this.state.blockers = [];
      const preview = this.state.preview;
    
      if (preview.unknownAssets.length > 0) {
        this.state.blockers.push({ 
          type: 'UNKNOWN_ASSETS', 
          count: preview.unknownAssets.length,
          assets: preview.unknownAssets,
          message: 'Ativos não reconhecidos precisam de mapeamento manual'
        });
      }
      if (preview.conflicts.length > 0) {
        this.state.blockers.push({ 
          type: 'CONFLICTS', 
          count: preview.conflicts.length,
          message: 'Conflitos de dados precisam ser resolvidos'
        });
      }
      if (preview.coverage < 50 && preview.newEvents > 0) {
        this.state.blockers.push({ 
          type: 'LOW_COVERAGE', 
          coverage: preview.coverage,
          message: `Cobertura baixa (${preview.coverage}%) — verificar se importação está completa`
        });
      }
    
      this.state.currentStep = 10;
      return this.state.blockers;
    },

    // Step 11: Confirmation
    confirm: function() {
      if (this.state.blockers.length > 0) {
        throw new Error('Blockers must be resolved before confirmation');
      }
      this.state.confirmed = true;
      this.state.currentStep = 11;
      return { confirmed: true };
    },

    // Step 12: Write (atomic)
    write: async function() {
      if (!this.state.confirmed) throw new Error('Not confirmed');
    
      const { newEvents, updatedEvents } = this.state.reconciled;
      let written = 0;
    
      // Use localStorage as atomic batch (in production: IndexedDB transaction)
      const updates = {};
    
      // Apply new entries
      for (const event of newEvents) {
        if (event.type === 'entry') {
          if (!updates.entries) updates.entries = [...(window.MOCK_DATA.entries || [])];
          updates.entries.unshift(this._eventToEntry(event));
          written++;
        } else if (event.type === 'earning') {
          if (!updates.earnings) updates.earnings = [...(window.MOCK_DATA.earnings || [])];
          updates.earnings.unshift(this._eventToEarning(event));
          written++;
        } else if (event.type === 'position') {
          if (!updates.positions) updates.positions = [...(window.MOCK_DATA.positions || [])];
          // Update or add position
          const idx = updates.positions.findIndex(p => p.ticker === event.ticker);
          const pos = this._eventToPosition(event);
          if (idx >= 0) updates.positions[idx] = pos;
          else updates.positions.push(pos);
          written++;
        }
      }
    
      // Apply updates
      for (const { incoming } of updatedEvents) {
        if (incoming.type === 'entry') {
          if (!updates.entries) updates.entries = [...(window.MOCK_DATA.entries || [])];
          const idx = updates.entries.findIndex(e => e.ticker === incoming.ticker && e.date === incoming.date && e.type === incoming.type);
          if (idx >= 0) { updates.entries[idx] = this._eventToEntry(incoming); written++; }
        } else if (incoming.type === 'earning') {
          if (!updates.earnings) updates.earnings = [...(window.MOCK_DATA.earnings || [])];
          const idx = updates.earnings.findIndex(e => e.ticker === incoming.ticker && e.date === incoming.date);
          if (idx >= 0) { updates.earnings[idx] = this._eventToEarning(incoming); written++; }
        } else if (incoming.type === 'position') {
          if (!updates.positions) updates.positions = [...(window.MOCK_DATA.positions || [])];
          const idx = updates.positions.findIndex(p => p.ticker === incoming.ticker);
          if (idx >= 0) { updates.positions[idx] = this._eventToPosition(incoming); written++; }
        }
      }
    
      // Atomic commit
      if (updates.entries) window.MOCK_DATA.entries = updates.entries;
      if (updates.earnings) window.MOCK_DATA.earnings = updates.earnings;
      if (updates.positions) window.MOCK_DATA.positions = updates.positions;
    
      // Save to localStorage
      try {
        localStorage.setItem('investidor10-dashboard-data', JSON.stringify({
          entries: window.MOCK_DATA.entries,
          earnings: window.MOCK_DATA.earnings,
          positions: window.MOCK_DATA.positions,
          lastImport: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Failed to persist to localStorage:', e);
      }
    
      this.state.currentStep = 12;
      return { written, timestamp: new Date().toISOString() };
    },

    _eventToEntry: function(event) {
      return {
        date: event.date,
        ticker: event.ticker,
        name: event.ticker,
        type: event.operation === 'compra' ? 'buy' : 'sell',
        qty: event.qty,
        price: event.price,
        value: event.value,
        fees: event.fees || 0,
        source: event.source || 'import'
      };
    },

    _eventToEarning: function(event) {
      return {
        date: event.date,
        ticker: event.ticker,
        name: event.name || event.ticker,
        type: this._mapEventType(event.eventType),
        perShare: event.unitPrice || 0,
        qty: event.qty,
        gross: event.value,
        tax: 0,
        net: event.value
      };
    },

    _eventToPosition: function(event) {
      return {
        ticker: event.ticker,
        name: event.name || event.ticker,
        class: event.assetClass || 'other',
        qty: event.qty,
        avgPrice: event.avgPrice || event.currentPrice || 0,
        currentPrice: event.currentPrice || 0,
        value: event.currentValue || (event.qty * event.currentPrice) || 0,
        pl: 0,
        return: 0,
        weight: 0
      };
    },

    _mapEventType: function(type) {
      const t = (type || '').toLowerCase();
      if (t.includes('jcp') || t.includes('juros sobre capital')) return 'jcp';
      if (t.includes('dividendo')) return 'dividend';
      if (t.includes('reembolso')) return 'reimbursement';
      if (t.includes('juros') || t.includes('pagamento de juros')) return 'interest';
      return 'rendimento';
    }
  };

  // ========================================
  // 6. EMPTY/LOADING/ERROR STATES COMPONENT
  // ========================================
  const StateComponents = {
    render: function(container, state, config = {}) {
      const states = {
        NO_DATA: { icon: '📭', title: 'Nenhum dado', message: config.message || 'Não há registros para exibir', action: config.action },
        FILTER_NO_RESULTS: { icon: '🔍', title: 'Sem resultados', message: 'Nenhum item corresponde aos filtros ativos', action: { label: 'Limpar filtros', handler: config.clearFilters } },
        LOADING: { icon: '⏳', title: 'Carregando', message: config.message || 'Buscando dados...', spinner: true },
        ERROR: { icon: '⚠️', title: 'Erro', message: config.message || 'Não foi possível carregar os dados', action: { label: 'Tentar novamente', handler: config.retry } },
        STALE: { icon: '🕐', title: 'Dados desatualizados', message: `Última atualização: ${config.lastUpdated}`, action: { label: 'Atualizar', handler: config.refresh } },
        UNAVAILABLE: { icon: '🚫', title: 'Indisponível', message: config.reason || 'Esta informação não está disponível no momento' },
        PARTIAL: { icon: '📊', title: 'Dados parciais', message: `${config.coverage}% de cobertura — ${config.reason}`, badge: 'PARTIAL' },
        TRACKING_STARTED: { icon: '📈', title: 'Acompanhamento iniciado', message: 'Dados históricos estão sendo construídos. Volte em alguns dias.' }
      };
      
      const s = states[state] || states.NO_DATA;
      container.innerHTML = `
        <div class="state-container" role="status" aria-live="polite">
          <div class="state-icon" aria-hidden="true">${s.icon}</div>
          <h3 class="state-title">${s.title}</h3>
          <p class="state-message">${s.message}</p>
          ${s.badge ? `<span class="data-state-badge badge-warning">${s.badge}</span>` : ''}
          ${s.spinner ? '<div class="spinner" aria-hidden="true"></div>' : ''}
          ${s.action ? `<button class="btn btn-primary state-action" data-action="${state}">${s.action.label}</button>` : ''}
        </div>
      `;
      
      if (s.action && s.action.handler) {
        container.querySelector('.state-action').addEventListener('click', s.action.handler);
      }
    }
  };

  // ========================================
  // 7. ACCESSIBILITY HELPERS
  // ========================================
  const A11y = {
    // CSP sem unsafe-inline bloqueia injeção de <style> via JS.
    // Regras migradas para styles.css (fim do arquivo) — no-ops mantêm a API.
    initFocusVisible: function() {},
    ensureTouchTargets: function() {},

    // Semantic headings
    fixHeadings: function(container) {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let level = 0;
      headings.forEach(h => {
        const current = parseInt(h.tagName[1]);
        if (current > level + 1) {
          console.warn('Heading skip detected:', h);
        }
        level = current;
      });
    },

    // Chart text alternative
    addChartAltText: function(chartId, data, config) {
      const canvas = document.getElementById(chartId);
      if (!canvas) return;
      
      // Generate textual summary
      let summary = `${config.title || 'Gráfico'}. `;
      if (data.labels && data.datasets) {
        const last = data.datasets[0].data[data.datasets[0].data.length - 1];
        const first = data.datasets[0].data[0];
        const change = ((last - first) / first * 100).toFixed(1);
        summary += `Período: ${data.labels[0]} a ${data.labels[data.labels.length-1]}. `;
        summary += `Variação: ${change >= 0 ? '+' : ''}${change}%. `;
        summary += `Valores: ${data.datasets.map(d => `${d.label}: ${d.data.join(', ')}`).join('; ')}`;
      }
      
      canvas.setAttribute('aria-label', summary);
      // Add hidden table alternative
      const table = this._createDataTable(chartId, data);
      canvas.parentNode.appendChild(table);
    },

    _createDataTable: function(chartId, data) {
      const table = document.createElement('table');
      table.className = 'chart-data-table visually-hidden';
      table.setAttribute('aria-hidden', 'true');
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr><th scope="col">Período</th>${data.datasets.map(d => `<th scope="col">${d.label}</th>`).join('')}</tr>`;
      const tbody = document.createElement('tbody');
      data.labels.forEach((label, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `<th scope="row">${label}</th>${data.datasets.map(d => `<td>${d.data[i]}</td>`).join('')}`;
        tbody.appendChild(row);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      return table;
    },

    // Live region for dynamic updates
    announce: function(message, priority = 'polite') {
      const region = document.getElementById('a11y-live-region') || (() => {
        const r = document.createElement('div');
        r.id = 'a11y-live-region';
        r.setAttribute('aria-live', priority);
        r.setAttribute('aria-atomic', 'true');
        r.className = 'visually-hidden';
        document.body.appendChild(r);
        return r;
      })();
      region.textContent = message;
    },

    // Reduced motion
    respectsReducedMotion: function() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  // ========================================
  // 8. INTEGRATION HOOKS
  // ========================================
  window.Investidor10Advanced = {
    ReturnEngine,
    SnapshotManager,
    RFConfidence,
    DataStates,
    ImportPipeline,
    StateComponents,
    A11y
  };

  // Auto-init accessibility
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      A11y.initFocusVisible();
      A11y.ensureTouchTargets();
    });
  } else {
    A11y.initFocusVisible();
    A11y.ensureTouchTargets();
  }

})();