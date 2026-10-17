// Read the minified tax-engine.js from dist/
const fs = require('fs');
const taxEngineCode = fs.readFileSync('./dist/tax-engine.js', 'utf8');
// We need to define a window object because the code assigns to window.TaxEngine
const window = {};
eval(taxEngineCode);
const TaxEngine = window.TaxEngine;
if (!TaxEngine) {
  console.error('Failed to load TaxEngine');
  process.exit(1);
}
console.log('TaxEngine loaded successfully');

// Create 995 buy operations of a stock
const engine = new TaxEngine({ year: 2023 });
const ticker = 'PETR4';
const name = 'Petrobras';
const quantity = 10;
const price = 30.0;
const fees = 0.0;
for (let i = 0; i < 995; i++) {
  // Spread over 2 years to avoid too many months? We'll just use increasing days.
  const date = new Date(2023, 0, ((i % 365) + 1)); // cycle through days of the year
  const op = engine.addOperation({
    date: date,
    type: 'buy',
    assetClass: 'acao',
    ticker,
    name,
    quantity,
    price,
    fees
  });
  if (i === 0) {
    console.log('First operation:', op);
  }
}
console.log(`Added 995 operations`);

// Process monthly
try {
  engine.processMonthly();
  console.log('processMonthly succeeded');
} catch (e) {
  console.error('Error during processMonthly:', e);
  process.exit(1);
}
// Get the monthly summary
const summary = engine.monthlySummary;
console.log('Number of months with data:', Object.keys(summary).length);
// Calculate total DARF
let totalDARF = 0;
for (const month of Object.keys(summary)) {
  const darf = summary[month].darf;
  totalDARF += darf.valor;
}
console.log(`Total DARF for the period: ${totalDARF.toFixed(2)}`);
// If we got here without error, it's success.
console.log('TaxEngine test passed: 995 entries processed successfully');
