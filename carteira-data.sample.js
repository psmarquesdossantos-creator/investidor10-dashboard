/**
 * Sample data for Investidor10 Dashboard - PUBLIC SAFE
 * This file contains SYNTHETIC data for demonstration purposes.
 * Real financial data is in carteira-data.js (gitignored).
 */

window.CARTEIRA_DATA = {
  meta: {
    source: "sample",
    version: "14.0.0",
    generatedAt: new Date().toISOString(),
    accounts: ["Sample Account"]
  },
  assets: [
    { id: 1, ticker: "PETR4", name: "Petrobras PN", category: "acao", sector: "Petróleo e Gás", qty: 100, avgPrice: 30.50, currentPrice: 32.10, target: 35.00, idealPerc: 5.0, divMonth: 0, color: "#3B82F6" },
    { id: 2, ticker: "ITUB4", name: "Itaú Unibanco PN", category: "acao", sector: "Bancos", qty: 50, avgPrice: 28.00, currentPrice: 29.50, target: 32.00, idealPerc: 3.0, divMonth: 0, color: "#EF4444" },
    { id: 3, ticker: "VALE3", name: "Vale ON", category: "acao", sector: "Mineração", qty: 30, avgPrice: 65.00, currentPrice: 68.00, target: 75.00, idealPerc: 4.0, divMonth: 0, color: "#06B6D4" },
    { id: 4, ticker: "HGLG11", name: "Pátria Log", category: "fii", sector: "Logística", qty: 100, avgPrice: 150.00, currentPrice: 155.00, target: 160.00, idealPerc: 10.0, divMonth: 120, color: "#8B5CF6" },
    { id: 5, ticker: "KNRI11", name: "Kinea Renda", category: "fii", sector: "Híbrido", qty: 80, avgPrice: 140.00, currentPrice: 145.00, target: 150.00, idealPerc: 8.0, divMonth: 95, color: "#8B5CF6" },
    { id: 6, ticker: "XPLG11", name: "XP Log", category: "fii", sector: "Logística", qty: 60, avgPrice: 95.00, currentPrice: 98.00, target: 105.00, idealPerc: 5.0, divMonth: 75, color: "#8B5CF6" },
    { id: 7, ticker: "DIVD11", name: "IT Now IDIV", category: "etf", sector: "Ações", qty: 200, avgPrice: 55.00, currentPrice: 58.00, target: 62.00, idealPerc: 8.0, divMonth: 45, color: "#3B82F6" },
    { id: 8, ticker: "IMAB11", name: "IT Now IMA-B", category: "etf", sector: "Renda Fixa", qty: 150, avgPrice: 110.00, currentPrice: 112.00, target: 115.00, idealPerc: 10.0, divMonth: 180, color: "#10B981" },
    { id: 9, ticker: "HODL11", name: "Investo Bitcoin", category: "cripto", sector: "Criptoativo", qty: 50, avgPrice: 60.00, currentPrice: 65.00, target: 80.00, idealPerc: 3.0, divMonth: 0, color: "#F59E0B" },
    { id: 10, ticker: "CDB001", name: "CDB Banco Sample 2027", category: "rf", sector: "CDB", qty: 1, avgPrice: 50000, currentPrice: 52000, target: 55000, idealPerc: 15.0, divMonth: 350, color: "#10B981", issuer: "Banco Sample" },
    { id: 11, ticker: "CRA001", name: "CRA Sample Securitizadora", category: "rf", sector: "CRA", qty: 1, avgPrice: 30000, currentPrice: 31500, target: 33000, idealPerc: 8.0, divMonth: 210, color: "#10B981", issuer: "Sample Securitizadora" },
    { id: 12, ticker: "LCI001", name: "LCI Banco Sample", category: "rf", sector: "LCI", qty: 1, avgPrice: 20000, currentPrice: 20800, target: 22000, idealPerc: 5.0, divMonth: 140, color: "#10B981", issuer: "Banco Sample" }
  ],
  positions: [
    { ticker: "PETR4", name: "Petrobras PN", category: "acao", qty: 100, avgPrice: 30.50, currentPrice: 32.10, target: 35.00, invested: 3050, current: 3210, profit: 160, profitPct: 5.25, allocation: 5.2 },
    { ticker: "ITUB4", name: "Itaú Unibanco PN", category: "acao", qty: 50, avgPrice: 28.00, currentPrice: 29.50, target: 32.00, invested: 1400, current: 1475, profit: 75, profitPct: 5.36, allocation: 2.4 },
    { ticker: "VALE3", name: "Vale ON", category: "acao", qty: 30, avgPrice: 65.00, currentPrice: 68.00, target: 75.00, invested: 1950, current: 2040, profit: 90, profitPct: 4.62, allocation: 3.3 },
    { ticker: "HGLG11", name: "Pátria Log", category: "fii", qty: 100, avgPrice: 150.00, currentPrice: 155.00, target: 160.00, invested: 15000, current: 15500, profit: 500, profitPct: 3.33, allocation: 25.0 },
    { ticker: "KNRI11", name: "Kinea Renda", category: "fii", qty: 80, avgPrice: 140.00, currentPrice: 145.00, target: 150.00, invested: 11200, current: 11600, profit: 400, profitPct: 3.57, allocation: 18.7 },
    { ticker: "XPLG11", name: "XP Log", category: "fii", qty: 60, avgPrice: 95.00, currentPrice: 98.00, target: 105.00, invested: 5700, current: 5880, profit: 180, profitPct: 3.16, allocation: 9.5 },
    { ticker: "DIVD11", name: "IT Now IDIV", category: "etf", qty: 200, avgPrice: 55.00, currentPrice: 58.00, target: 62.00, invested: 11000, current: 11600, profit: 600, profitPct: 5.45, allocation: 18.7 },
    { ticker: "IMAB11", name: "IT Now IMA-B", category: "etf", qty: 150, avgPrice: 110.00, currentPrice: 112.00, target: 115.00, invested: 16500, current: 16800, profit: 300, profitPct: 1.82, allocation: 27.1 },
    { ticker: "HODL11", name: "Investo Bitcoin", category: "cripto", qty: 50, avgPrice: 60.00, currentPrice: 65.00, target: 80.00, invested: 3000, current: 3250, profit: 250, profitPct: 8.33, allocation: 5.2 },
    { ticker: "CDB001", name: "CDB Banco Sample 2027", category: "rf", qty: 1, avgPrice: 50000, currentPrice: 52000, target: 55000, invested: 50000, current: 52000, profit: 2000, profitPct: 4.0, allocation: 83.9 },
    { ticker: "CRA001", name: "CRA Sample Securitizadora", category: "rf", qty: 1, avgPrice: 30000, currentPrice: 31500, target: 33000, invested: 30000, current: 31500, profit: 1500, profitPct: 5.0, allocation: 50.8 },
    { ticker: "LCI001", name: "LCI Banco Sample", category: "rf", qty: 1, avgPrice: 20000, currentPrice: 20800, target: 22000, invested: 20000, current: 20800, profit: 800, profitPct: 4.0, allocation: 33.6 }
  ],
  entries: [
    { date: "2026-01-15", type: "compra", asset: "PETR4", qty: 100, price: 30.50, total: 3050, fees: 5.00 },
    { date: "2026-02-20", type: "compra", asset: "ITUB4", qty: 50, price: 28.00, total: 1400, fees: 5.00 },
    { date: "2026-03-10", type: "compra", asset: "VALE3", qty: 30, price: 65.00, total: 1950, fees: 5.00 },
    { date: "2026-04-05", type: "compra", asset: "HGLG11", qty: 100, price: 150.00, total: 15000, fees: 10.00 },
    { date: "2026-05-12", type: "compra", asset: "KNRI11", qty: 80, price: 140.00, total: 11200, fees: 10.00 },
    { date: "2026-06-18", type: "compra", asset: "XPLG11", qty: 60, price: 95.00, total: 5700, fees: 10.00 },
    { date: "2026-07-22", type: "compra", asset: "DIVD11", qty: 200, price: 55.00, total: 11000, fees: 10.00 },
    { date: "2026-08-01", type: "compra", asset: "IMAB11", qty: 150, price: 110.00, total: 16500, fees: 10.00 },
    { date: "2026-09-15", type: "compra", asset: "HODL11", qty: 50, price: 60.00, total: 3000, fees: 10.00 }
  ],
  earnings: [
    { date: "2026-06-15", asset: "HGLG11", type: "Rendimento", qty: 100, perShare: 1.20, total: 120 },
    { date: "2026-07-15", asset: "KNRI11", type: "Rendimento", qty: 80, perShare: 1.15, total: 92 },
    { date: "2026-08-15", asset: "XPLG11", type: "Rendimento", qty: 60, perShare: 1.25, total: 75 },
    { date: "2026-09-15", asset: "DIVD11", type: "Dividendo", qty: 200, perShare: 0.25, total: 50 },
    { date: "2026-10-15", asset: "IMAB11", type: "Juros", qty: 150, perShare: 1.20, total: 180 }
  ],
  fixedIncome: [
    { name: "CDB Banco Sample 2027", issuer: "Banco Sample", value: 52000, sector: "CDB", indexer: "CDI 110%", maturity: "2027-12-15" },
    { name: "CRA Sample Securitizadora", issuer: "Sample Securitizadora", value: 31500, sector: "CRA", indexer: "IPCA+6%", maturity: "2028-06-30" },
    { name: "LCI Banco Sample", issuer: "Banco Sample", value: 20800, sector: "LCI", indexer: "95% CDI", maturity: "2027-03-15" }
  ],
  goals: {
    allocation: { acao: 15, fii: 45, etf: 25, rf: 10, cripto: 5 },
    targetValue: 62000
  },
  reconciliation: {
    b3Total: 62000,
    backupTotal: 62000,
    gaps: []
  }
};
