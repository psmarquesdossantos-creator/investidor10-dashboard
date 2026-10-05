// src/data-trust/data-trust.js
// Data Trust Center: Confidence scoring per asset+source, audit snapshots, STALE/PARTIAL alerts

(function() {
  'use strict';

  const CONFIDENCE_LEVELS = {
    VERY_HIGH: { level: 'very-high', label: 'Muito Alta', color: 'var(--color-success)', score: 1.0, minScore: 0.9 },
    HIGH: { level: 'high', label: 'Alta', color: 'var(--color-primary)', score: 0.75, minScore: 0.7 },
    MEDIUM: { level: 'medium', label: 'Média', color: 'var(--color-warning)', score: 0.5, minScore: 0.4 },
    LOW: { level: 'low', label: 'Baixa', color: 'var(--color-error)', score: 0.25, minScore: 0.1 },
    UNKNOWN: { level: 'unknown', label: 'Desconhecida', color: 'var(--color-muted)', score: 0, minScore: 0 }
  };

  // Default source confidence weights
  const SOURCE_CONFIDENCE = {
    'B3_POSITION': 1.0,    // B3 official position
    'B3_EVENTS': 1.0,      // B3 official events
    'B3': 0.95,            // B3 generic
    'CEI': 0.9,            // CEI official
    'XP': 0.85,            // XP broker
    'INTER': 0.85,         // Inter broker
    'RICO': 0.85,          // Rico broker
    'CLEAR': 0.85,         // Clear broker
    'BRAPI': 0.8,          // brapi.dev prices
    'MANUAL': 0.6,         // Manual entry
    'IMPORTED': 0.7,       // Generic import
    'ESTIMATED': 0.3       // Estimated/derived
  };

  // Calculate confidence for a single asset
  function calculateAssetConfidence(asset) {
    const source = asset.source || 'UNKNOWN';
    const baseConfidence = SOURCE_CONFIDENCE[source.toUpperCase()] || SOURCE_CONFIDENCE.UNKNOWN;
    
    let confidence = baseConfidence;
    const factors = [];
    
    // Quantity known?
    if (asset.qty === null || asset.qty === undefined || isNaN(asset.qty)) {
      confidence *= 0.3;
      factors.push({ factor: 'quantity_unknown', penalty: 0.7 });
    } else if (asset.qty === 0) {
      confidence *= 0.5;
      factors.push({ factor: 'quantity_zero', penalty: 0.5 });
    }
    
    // Price known?
    if (!asset.currentPrice || asset.currentPrice <= 0) {
      confidence *= 0.5;
      factors.push({ factor: 'price_missing', penalty: 0.5 });
    }
    
    // Avg price known?
    if (!asset.avgPrice || asset.avgPrice <= 0) {
      confidence *= 0.7;
      factors.push({ factor: 'avg_price_missing', penalty: 0.3 });
    }
    
    // Has recent update timestamp?
    if (asset.lastUpdate) {
      const ageDays = (Date.now() - new Date(asset.lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 30) {
        confidence *= 0.7;
        factors.push({ factor: 'stale_data', penalty: 0.3, ageDays: Math.round(ageDays) });
      } else if (ageDays > 7) {
        confidence *= 0.9;
        factors.push({ factor: 'aging_data', penalty: 0.1, ageDays: Math.round(ageDays) });
      }
    } else {
      confidence *= 0.6;
      factors.push({ factor: 'no_timestamp', penalty: 0.4 });
    }
    
    // Has transaction history?
    if (!asset.entries || asset.entries.length === 0) {
      confidence *= 0.8;
      factors.push({ factor: 'no_history', penalty: 0.2 });
    }
    
    // Has corporate events applied?
    if (asset.corpEventsApplied && asset.corpEventsApplied.length > 0) {
      confidence = Math.min(1.0, confidence * 1.1);
      factors.push({ factor: 'corp_events_applied', bonus: 0.1 });
    }
    
    // Clamp
    confidence = Math.max(0, Math.min(1, confidence));
    
    // Determine level
    let level = CONFIDENCE_LEVELS.UNKNOWN;
    for (const [key, lvl] of Object.entries(CONFIDENCE_LEVELS)) {
      if (confidence >= lvl.minScore) {
        level = lvl;
        break;
      }
    }
    
    return {
      score: confidence,
      level: level.level,
      label: level.label,
      color: level.color,
      factors,
      source,
      lastUpdate: asset.lastUpdate
    };
  }

  // Calculate portfolio-level confidence
  function calculatePortfolioConfidence(assets) {
    if (!assets || assets.length === 0) {
      return { score: 0, level: 'unknown', label: 'Sem dados', assets: [] };
    }
    
    const assetConfidences = assets.map(a => ({
      ticker: a.ticker,
      ...calculateAssetConfidence(a)
    }));
    
    // Weighted by position value
    let totalValue = 0;
    let weightedScore = 0;
    
    for (const a of assetConfidences) {
      const asset = assets.find(x => x.ticker === a.ticker);
      const value = asset?.value || 0;
      totalValue += value;
      weightedScore += a.score * value;
    }
    
    const portfolioScore = totalValue > 0 ? weightedScore / totalValue : 0;
    
    // Count by level
    const levelCounts = {};
    for (const a of assetConfidences) {
      levelCounts[a.level] = (levelCounts[a.level] || 0) + 1;
    }
    
    // Determine overall level
    let overallLevel = CONFIDENCE_LEVELS.UNKNOWN;
    for (const [key, lvl] of Object.entries(CONFIDENCE_LEVELS)) {
      if (portfolioScore >= lvl.minScore) {
        overallLevel = lvl;
        break;
      }
    }
    
    // Identify assets needing attention
    const needsReview = assetConfidences
      .filter(a => a.level === 'low' || a.level === 'unknown')
      .sort((a, b) => a.score - b.score);
    
    return {
      score: portfolioScore,
      level: overallLevel.level,
      label: overallLevel.label,
      color: overallLevel.color,
      assetCount: assets.length,
      levelCounts,
      needsReview: needsReview.slice(0, 10), // Top 10 needing attention
      assetConfidences
    };
  }

  // Generate confidence badge HTML
  function renderConfidenceBadge(confidence, size = 'normal') {
    const sizeClass = size === 'small' ? 'badge-sm' : '';
    return `<span class="confidence-badge badge badge-${confidence.level} ${sizeClass}" 
      style="background: ${confidence.color}20; color: ${confidence.color}; border: 1px solid ${confidence.color}40;"
      title="Confiança: ${confidence.label} (${(confidence.score * 100).toFixed(0)}%)">
      ${confidence.label}
    </span>`;
  }

  // Generate confidence indicator for table cells
  function renderConfidenceIndicator(confidence) {
    const barWidth = Math.round(confidence.score * 100);
    return `
      <div class="confidence-indicator" title="Confiança: ${confidence.label} (${barWidth}%)">
        <div class="confidence-bar" style="width: ${barWidth}%; background: ${confidence.color};"></div>
        <span class="confidence-text">${barWidth}%</span>
      </div>
    `;
  }

  // Audit snapshot functions
  const AUDIT_TYPES = {
    IMPORT: 'import',
    CORPORATE_EVENTS: 'corporate_events',
    REBALANCE: 'rebalance',
    MANUAL_EDIT: 'manual_edit',
    AUTO_SNAPSHOT: 'auto_snapshot'
  };

  function createAuditSnapshot(type, data, metadata = {}) {
    const snapshot = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      dataHash: hashData(data),
      metadata: {
        assetCount: data?.positions?.length || 0,
        totalValue: data?.positions?.reduce((sum, p) => sum + (p.value || 0), 0) || 0,
        ...metadata
      }
    };
    
    // Store in localStorage
    const existing = JSON.parse(localStorage.getItem('auditSnapshots') || '[]');
    existing.unshift(snapshot);
    // Keep last 100
    if (existing.length > 100) existing.length = 100;
    localStorage.setItem('auditSnapshots', JSON.stringify(existing));
    
    return snapshot;
  }

  function hashData(data) {
    // Simple deterministic hash for data integrity
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  function getAuditSnapshots() {
    return JSON.parse(localStorage.getItem('auditSnapshots') || '[]');
  }

  function verifyDataIntegrity(currentData) {
    const snapshots = getAuditSnapshots();
    if (snapshots.length === 0) return { verified: false, reason: 'No baseline snapshot' };
    
    const latest = snapshots[0];
    const currentHash = hashData(currentData);
    
    return {
      verified: currentHash === latest.dataHash,
      currentHash,
      baselineHash: latest.dataHash,
      baselineTimestamp: latest.timestamp,
      changed: currentHash !== latest.dataHash
    };
  }

  // Data freshness check
  function checkDataFreshness(assets) {
    if (!assets || assets.length === 0) {
      return { status: 'EMPTY', message: 'Nenhum ativo na carteira', assets: [] };
    }
    
    const now = Date.now();
    const results = { fresh: 0, aging: 0, stale: 0, unknown: 0, assets: [] };
    
    for (const asset of assets) {
      let status = 'UNKNOWN';
      let ageDays = null;
      
      if (asset.lastUpdate) {
        ageDays = (now - new Date(asset.lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 7) status = 'FRESH';
        else if (ageDays <= 30) status = 'AGING';
        else status = 'STALE';
      } else {
        status = 'UNKNOWN';
      }
      
      results[status.toLowerCase()]++;
      results.assets.push({ ticker: asset.ticker, status, ageDays: ageDays ? Math.round(ageDays) : null });
    }
    
    // Overall status
    let overallStatus = 'FRESH';
    if (results.stale > 0) overallStatus = 'STALE';
    else if (results.aging > results.fresh) overallStatus = 'AGING';
    else if (results.unknown > 0) overallStatus = 'PARTIAL';
    
    return { ...results, overallStatus };
  }

  // Initialize Data Trust panel
  function initDataTrustCenter() {
    console.log('[DataTrust] initDataTrustCenter called');
    
    // This will be called when the Data Trust tab is opened
    // For now, expose functions globally
    window.DataTrust = {
      CONFIDENCE_LEVELS,
      SOURCE_CONFIDENCE,
      calculateAssetConfidence,
      calculatePortfolioConfidence,
      renderConfidenceBadge,
      renderConfidenceIndicator,
      AUDIT_TYPES,
      createAuditSnapshot,
      getAuditSnapshots,
      verifyDataIntegrity,
      checkDataFreshness
    };
  }

  // Auto-run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDataTrustCenter);
  } else {
    initDataTrustCenter();
  }

})();