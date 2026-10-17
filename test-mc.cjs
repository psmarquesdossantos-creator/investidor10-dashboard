// Read the minified monte-carlo-engine.js from dist/
const fs = require('fs');
const mcEngineCode = fs.readFileSync('./dist/monte-carlo-engine.js', 'utf8');
// We need to define a window object? Let's see if the code assigns to window.
// Looking at the dist/monte-carlo-engine.js file, it might be a class that is exported? 
// But the file is minified and we saw it's a one-liner. Let's check the content first.
// We'll read a snippet to see.
const snippet = fs.readFileSync('./dist/monte-carlo-engine.js', 'utf8').substring(0, 200);
console.log('Snippet:', snippet);
// We'll assume it defines a class and assigns it to window.MonteCarloEngine or similar.
// We'll use the same approach as before.
const window = {};
eval(mcEngineCode);
const MonteCarloEngine = window.MonteCarloEngine;
if (!MonteCarloEngine) {
  // Maybe it's assigned to a different variable? Let's try to see what is in window.
  console.log('Window keys:', Object.keys(window));
  // Look for a function or class that might be the engine.
  for (const key of Object.keys(window)) {
    if (typeof window[key] === 'function' && window[key].name && window[key].name.includes('MonteCarlo')) {
      console.log('Found possible engine:', window[key].name);
      MonteCarloEngine = window[key];
      break;
    }
  }
}
if (!MonteCarloEngine) {
  console.error('Failed to load MonteCarloEngine from window');
  // Try to see if the eval returns the class directly?
  // Let's try to eval without wrapping in window and see what it returns.
  const engineDirect = eval(mcEngineCode);
  if (typeof engineDirect === 'function') {
    console.log('Engine found via direct eval');
    MonteCarloEngine = engineDirect;
  } else {
    console.error('Direct eval did not yield a function');
    process.exit(1);
  }
}
console.log('MonteCarloEngine loaded successfully');

// Create a simple configuration
const config = {
  timeStep: 1/12, // monthly
  years: 10, // 10 years
  initialPortfolio: 100000, // initial portfolio value
  monthlyContribution: 1000, // monthly contribution
  annualReturnMean: 0.07, // 7% annual return
  annualReturnStd: 0.15, // 15% annual volatility
  inflationMean: 0.04, // 4% inflation
  inflationStd: 0.02, // 2% inflation volatility
  numScenarios: 1000 // number of scenarios (keep low for fast test)
};
const engine = new MonteCarloEngine(config);
// Run the engine
console.log('Running Monte Carlo simulation...');
const start = Date.now();
const results = engine.run();
const end = Date.now();
console.log(`Simulation took ${end - start} ms`);
// Check that we have results
if (!results) {
  console.error('No results returned');
  process.exit(1);
}
console.log('Results keys:', Object.keys(results));
// We expect some summary statistics
if (results.summary) {
  console.log('Summary:', results.summary);
}
if (results.cone) {
  console.log('Cone length:', results.cone.length);
}
if (results.probabilityOfLoss !== undefined) {
  console.log('Probability of loss:', results.probabilityOfLoss);
}
console.log('MonteCarloEngine test passed: simulation completed successfully');
