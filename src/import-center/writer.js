// src/import-center/writer.js
// Escreve dados confirmados no armazenamento (IndexedDB via CARTEIRA_DATA)
// Uso: window.ImportCenter.write(keptData)

(function() {
  'use strict';

  async function write(keptData) {
    console.log('[ImportCenter.writer] write called with', keptData?.length, 'items');
    try {
      // Converte para formato CARTEIRA_DATA
      const converted = convertToCarteiraData(keptData);
      window.CARTEIRA_DATA = converted;
      console.log('[ImportCenter.writer] CARTEIRA_DATA set');
      
      // Aplica no MOCK_DATA
      if (typeof applyRealData === 'function') {
        console.log('[ImportCenter.writer] calling applyRealData');
        applyRealData();
      }
      
      // Captura snapshot
      if (window.Investidor10Advanced?.SnapshotManager) {
        const result = window.Investidor10Advanced.SnapshotManager.capture(window.CARTEIRA_DATA, 'import');
        if (result.saved) console.log('Snapshot import capturado:', result.snapshot.id);
      }
      
      // Re-render
      if (typeof renderAll === 'function') {
        console.log('[ImportCenter.writer] calling renderAll');
        renderAll();
      }

      // Auth (P8): import de posição B3 altera só as seções que ele possui —
      // push field-scoped; NUNCA sobe monthly/patrimony/earnings (history) do import
      if (window.SyncHub && window.SyncHub.active) {
        window.SyncHub.source.saveSections({
          positions: converted.positions,
          allocation: converted.allocation,
          assetReturns: converted.assetReturns,
          kpis: converted.kpis
        });
      }
      
      // Atualiza estado de dados - FORÇA chamada global
      console.log('[ImportCenter.writer] calling window.updateDataState with fresh');
      if (typeof window.updateDataState === 'function') {
        window.updateDataState('fresh', 'import');
        console.log('[ImportCenter.writer] window.updateDataState called successfully');
      } else {
        console.warn('[ImportCenter.writer] window.updateDataState not available');
        // Try to call directly if available
        if (typeof updateDataState === 'function') {
          updateDataState('fresh', 'import');
          console.log('[ImportCenter.writer] local updateDataState called');
        }
      }
      
      return { success: true, count: keptData.length };
      
    } catch (e) {
      console.error('[ImportCenter.writer] Erro ao escrever importação:', e);
      return { success: false, error: e.message };
    }
  }

  function convertToCarteiraData(rawData) {
    // Filter out UNKNOWN items for portfolio calculations
    const validData = rawData.filter(a => !a.qtyUnknown);
    const total = validData.reduce((s,a)=>s+a.value,0);
    const invTotal = validData.reduce((s,a)=>s+a.invested,0);
    const profit = total - invTotal;
    
    // Aggregate by class
    const classAgg = {};
    validData.forEach(a => classAgg[a.class] = (classAgg[a.class] || 0) + a.value);
    const cn = {'stocks':'Ações','fiis':'FIIs','etfs':'ETFs','fixed':'Renda Fixa','funds':'Fundos','other':'Outros'};
    const cc = {'stocks':'#1A73E8','fiis':'#34A853','fixed':'#3730A3','etfs':'#F9AB00','funds':'#00ACC1','other':'#80868B'};
    const byClass = Object.entries(classAgg).map(([k,v])=>({name:cn[k],value:+v.toFixed(2),pct:+((v/total)*100).toFixed(1),color:cc[k]})).sort((a,b)=>b.value-a.value);
    const byAsset = validData.sort((a,b)=>b.value-a.value).map(a=>({name:a.ticker,class:a.class,value:a.value,pct:+((a.value/total)*100).toFixed(2),return:a.ret}));

    const rent12m = invTotal ? +((total/invTotal-1)*100).toFixed(2) : 0;
    const kpis = {total:+total.toFixed(2), invested:+invTotal.toFixed(2), profit:+profit.toFixed(2), capitalGain:+profit.toFixed(2), dividends:0, earnings12m:0, totalChange:rent12m, return12m:rent12m, returnTotal:rent12m, yield12m:0};

    return {kpis, monthly:[], patrimony:{labels:[],portfolio:[],invested:[],cdi:[],ibov:[]}, allocation:{byAsset,byClass}, positions:validData, earnings:[], entries:[], assetReturns:validData.map(a=>({ticker:a.ticker,class:a.class,weight:+((a.value/total)*100).toFixed(2),return:a.ret,contrib:+(a.ret*a.value/total/100).toFixed(3),benchmark:rent12m,alpha:+(a.ret-rent12m).toFixed(2)}))};
  }

  window.ImportCenter = window.ImportCenter || {};
  window.ImportCenter.write = write;
})();
