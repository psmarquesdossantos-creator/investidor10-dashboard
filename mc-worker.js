// mc-worker.js — Web Worker: simulação Monte Carlo fora da main thread (UI não trava)
// Carrega o mesmo engine da página principal via importScripts.
// shim: monte-carlo-engine.js termina com window.MonteCarloEngine = ...; em Worker, window = self.
var window = self;

importScripts('monte-carlo-engine.js');

onmessage = function (e) {
  var payload = e.data || {};
  try {
    var config = payload.config || {};
    // Passos MENSAIS em vez de diários: mesmo drift/vol anual (dt entra no cálculo),
    // ~100x menos iterações e cone anual estatisticamente equivalente.
    if (!config.timeStep || config.timeStep < 1) config.timeStep = 1 / 12;

    var mc = new MonteCarloEngine(config);
    if (payload.params) mc.setPortfolioParams(payload.params);
    mc.run();

    var r = mc.results;
    // NÃO enviar results.paths (milhões de pontos): a UI usa apenas
    // summary, cone, probabilidades e yearsToDouble. Paths brutos travam o
    // structured clone do postMessage.
    var light = {
      config: r.config,
      summary: r.summary,
      cone: r.cone,
      probabilityOfLoss: r.probabilityOfLoss,
      probabilityOfDoubling: r.probabilityOfDoubling,
      probabilityOf10x: r.probabilityOf10x,
      yearsToDouble: r.yearsToDouble
    };

    postMessage({
      ok: true,
      results: light,
      chartData: mc.exportChartData()
    });
  } catch (err) {
    postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
