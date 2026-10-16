/* ========================================
   Investidor10 Dashboard - Script
   ======================================== */

/* ========================================
   Utility Functions
   ======================================== */
// Date utility functions
function pad2(value) {
    return String(value).padStart(2, '0');
}

function isValidISODate(value) {
    const s = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function localDateISO(date = new Date()) {
    const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localMonthKey(date = new Date()) {
    const iso = localDateISO(date);
    return iso ? iso.slice(0, 7) : '';
}

function normalizeMonthKey(monthKey, fallbackDate = new Date()) {
    const fallback = localMonthKey(fallbackDate);
    if (typeof monthKey !== 'string') return fallback;
    const s = monthKey.trim().slice(0, 7);
    return /^\d{4}-\d{2}$/.test(s) ? s : fallback;
}

// Money utility functions
function parseMoney(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;
    const cleaned = value.trim().replace(/[^\\d,.-]/g, '');
    if (!cleaned) return 0;
    const negative = cleaned.startsWith('-');
    let number = cleaned.replace(/^-/, '');
    if (number.includes(',')) number = number.replace(/\\./g, '').replace(',', '.');
    else if ((number.match(/\\./g) || []).length > 1) number = number.replace(/\\./g, '');
    const parsed = Number(number);
    return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : 0;
}

function moneyToCents(value) {
    return Math.round(parseMoney(value) * 100);
}

function centsToMoney(cents) {
    return Number((Number(cents) || 0) / 100).toFixed(2) * 1;
}

/* ======================================== */
// Mock Data
/* ======================================== */

const MOCK_DATA = {
  // KPIs
  kpis: {
    total: 686972.13,
    invested: 675043.28,
    profit: 131023.55,
    capitalGain: 11928.84,
    dividends: 119094.71,
    earnings12m: 32323.72,
    totalChange: 1.77,
    return12m: 11.09,
    returnTotal: 32.41,
    yield12m: 4.71
  },

  // Monthly performance
  monthly: [
    { period: '09/25', invested: 338615.07, gain: 11643.14 },
    { period: '10/25', invested: 340764.75, gain: 9220.50 },
    { period: '11/25', invested: 332836.57, gain: 14270.94 },
    { period: '12/25', invested: 427190.95, gain: 21120.21 },
    { period: '01/26', invested: 500425.60, gain: 23562.00 },
    { period: '02/26', invested: 504468.91, gain: 24641.03 },
    { period: '03/26', invested: 528960.65, gain: 18369.03 },
    { period: '04/26', invested: 535186.60, gain: 24210.29 },
    { period: '05/26', invested: 637744.88, gain: 17066.94 },
    { period: '06/26', invested: 645319.50, gain: 11606.64 },
    { period: '07/26', invested: 651460.48, gain: 13946.94 },
    { period: '08/26', invested: 675043.28, gain: 12583.55 },
    { period: '09/26', invested: 675043.28, gain: 11928.85 }
  ],

  // Patrimony chart data (12 months)
  patrimony: {
    labels: ['Set/25', 'Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26', 'Jun/26', 'Jul/26', 'Ago/26', 'Set/26'],
    portfolio: [350258, 349985, 347107, 448311, 523987, 529109, 547329, 559396, 654811, 656926, 665407, 687626, 686972],
    invested: [338615, 340765, 332837, 427191, 500426, 504469, 528961, 535187, 637745, 645320, 651460, 675043, 675043],
    cdi: [342100, 345200, 348900, 432100, 505000, 509800, 534200, 541800, 644500, 652100, 658900, 682300, 681200],
    ibov: [340500, 338900, 342100, 441200, 512300, 508700, 529800, 545600, 648900, 642300, 656700, 678900, 679800]
  },

  // Allocation
  allocation: {
    byAsset: [
      { name: 'PETR4', class: 'stocks', value: 89450.32, pct: 13.2, return: 15.2 },
      { name: 'VALE3', class: 'stocks', value: 78210.15, pct: 11.6, return: 8.7 },
      { name: 'ITUB4', class: 'stocks', value: 65430.80, pct: 9.7, return: 12.4 },
      { name: 'HGLG11', class: 'fiis', value: 58920.45, pct: 8.7, return: 10.1 },
      { name: 'MXRF11', class: 'fiis', value: 52100.30, pct: 7.7, return: 9.8 },
      { name: 'IVVB11', class: 'etfs', value: 48750.00, pct: 7.2, return: 18.5 },
      { name: 'BOVA11', class: 'etfs', value: 42300.60, pct: 6.3, return: 14.2 },
      { name: 'Tesouro IPCA+ 2035', class: 'fixed', value: 85600.00, pct: 12.7, return: 6.2 },
      { name: 'CDB 120% CDI', class: 'fixed', value: 62400.00, pct: 9.2, return: 9.1 },
      { name: 'Outros', class: 'other', value: 91881.66, pct: 13.7, return: 7.3 }
    ],
    byClass: [
      { name: 'Ações', value: 305450.27, pct: 45.2, color: '#1A73E8' },
      { name: 'FIIs', value: 168920.75, pct: 25.0, color: '#34A853' },
      { name: 'Renda Fixa', value: 148000.00, pct: 21.9, color: '#3730A3' },
      { name: 'ETFs', value: 91050.60, pct: 13.5, color: '#F9AB00' },
      { name: 'Outros', value: 91881.66, pct: 13.7, color: '#80868B' }
    ]
  },

  // Positions (42 assets)
  positions: [
    { ticker: 'PETR4', name: 'Petrobras PN', class: 'stocks', qty: 1200, avgPrice: 38.45, currentPrice: 42.12, value: 50544.00, pl: 4404.00, return: 9.5, weight: 7.5 },
    { ticker: 'VALE3', name: 'Vale ON', class: 'stocks', qty: 800, avgPrice: 62.30, currentPrice: 58.90, value: 47120.00, pl: -2720.00, return: -5.5, weight: 7.0 },
    { ticker: 'ITUB4', name: 'Itaú Unibanco PN', class: 'stocks', qty: 1500, avgPrice: 28.90, currentPrice: 31.45, value: 47175.00, pl: 3825.00, return: 8.8, weight: 7.0 },
    { ticker: 'BBDC4', name: 'Bradesco PN', class: 'stocks', qty: 1800, avgPrice: 16.75, currentPrice: 15.80, value: 28440.00, pl: -1710.00, return: -5.7, weight: 4.2 },
    { ticker: 'ABEV3', name: 'Ambev ON', class: 'stocks', qty: 2200, avgPrice: 14.20, currentPrice: 13.45, value: 29590.00, pl: -1650.00, return: -5.3, weight: 4.4 },
    { ticker: 'WEGE3', name: 'WEG ON', class: 'stocks', qty: 600, avgPrice: 35.80, currentPrice: 41.20, value: 24720.00, pl: 3240.00, return: 15.1, weight: 3.7 },
    { ticker: 'RENT3', name: 'Localiza ON', class: 'stocks', qty: 500, avgPrice: 48.90, currentPrice: 52.30, value: 26150.00, pl: 1700.00, return: 7.0, weight: 3.9 },
    { ticker: 'LREN3', name: 'Lojas Renner ON', class: 'stocks', qty: 800, avgPrice: 22.40, currentPrice: 19.80, value: 15840.00, pl: -2080.00, return: -11.6, weight: 2.3 },
    { ticker: 'RADL3', name: 'Raia Drogasil ON', class: 'stocks', qty: 700, avgPrice: 26.50, currentPrice: 28.90, value: 20230.00, pl: 1680.00, return: 9.1, weight: 3.0 },
    { ticker: 'BBAS3', name: 'Banco do Brasil ON', class: 'stocks', qty: 1000, avgPrice: 24.80, currentPrice: 26.10, value: 26100.00, pl: 1300.00, return: 5.2, weight: 3.9 },
    { ticker: 'HGLG11', name: 'CSHG Logística', class: 'fiis', qty: 450, avgPrice: 142.50, currentPrice: 131.20, value: 59040.00, pl: -5085.00, return: -7.9, weight: 8.7 },
    { ticker: 'MXRF11', name: 'Maxi Renda', class: 'fiis', qty: 1200, avgPrice: 10.80, currentPrice: 10.45, value: 12540.00, pl: -420.00, return: -3.2, weight: 1.9 },
    { ticker: 'XPLG11', name: 'XP Log', class: 'fiis', qty: 300, avgPrice: 105.00, currentPrice: 98.50, value: 29550.00, pl: -1950.00, return: -6.2, weight: 4.4 },
    { ticker: 'VGIP11', name: 'VGI Properties', class: 'fiis', qty: 250, avgPrice: 118.00, currentPrice: 112.40, value: 28100.00, pl: -1400.00, return: -4.7, weight: 4.2 },
    { ticker: 'KNCR11', name: 'Kinea Rendimentos', class: 'fiis', qty: 400, avgPrice: 125.00, currentPrice: 119.80, value: 47920.00, pl: -2080.00, return: -4.2, weight: 7.1 },
    { ticker: 'IVVB11', name: 'iShares S&P 500', class: 'etfs', qty: 180, avgPrice: 245.00, currentPrice: 271.50, value: 48870.00, pl: 4770.00, return: 10.8, weight: 7.2 },
    { ticker: 'BOVA11', name: 'iShares IBOV', class: 'etfs', qty: 400, avgPrice: 98.50, currentPrice: 105.75, value: 42300.00, pl: 2900.00, return: 7.4, weight: 6.3 },
    { ticker: 'FIXA11', name: 'Tesouro IPCA+ 2035', class: 'fixed', qty: 85, avgPrice: 980.00, currentPrice: 1007.00, value: 85595.00, pl: 2295.00, return: 2.8, weight: 12.7 },
    { ticker: 'CDB120', name: 'CDB 120% CDI', class: 'fixed', qty: 1, avgPrice: 62400.00, currentPrice: 62400.00, value: 62400.00, pl: 0, return: 9.1, weight: 9.2 },
    { ticker: 'XPBR31', name: 'XP Inc BDR', class: 'bdr', qty: 200, avgPrice: 115.00, currentPrice: 128.50, value: 25700.00, pl: 2700.00, return: 11.7, weight: 3.8 },
    // ... more assets would go here
  ],

  // Earnings (proventos)
  earnings: [
    { date: '2024-08-15', ticker: 'PETR4', name: 'Petrobras PN', type: 'dividend', perShare: 1.25, qty: 1200, gross: 1500.00, tax: 0, net: 1500.00 },
    { date: '2024-08-10', ticker: 'VALE3', name: 'Vale ON', type: 'dividend', perShare: 2.80, qty: 800, gross: 2240.00, tax: 0, net: 2240.00 },
    { date: '2024-07-25', ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'jcp', perShare: 0.35, qty: 1500, gross: 525.00, tax: 78.75, net: 446.25 },
    { date: '2024-07-15', ticker: 'HGLG11', name: 'CSHG Logística', type: 'dividend', perShare: 0.95, qty: 450, gross: 427.50, tax: 0, net: 427.50 },
    { date: '2024-07-10', ticker: 'MXRF11', name: 'Maxi Renda', type: 'dividend', perShare: 0.10, qty: 1200, gross: 120.00, tax: 0, net: 120.00 },
    { date: '2024-06-28', ticker: 'BBDC4', name: 'Bradesco PN', type: 'jcp', perShare: 0.22, qty: 1800, gross: 396.00, tax: 59.40, net: 336.60 },
    { date: '2024-06-20', ticker: 'WEGE3', name: 'WEG ON', type: 'dividend', perShare: 0.18, qty: 600, gross: 108.00, tax: 0, net: 108.00 },
    { date: '2024-06-15', ticker: 'IVVB11', name: 'iShares S&P 500', type: 'dividend', perShare: 1.85, qty: 180, gross: 333.00, tax: 49.95, net: 283.05 },
    { date: '2024-05-30', ticker: 'KNCR11', name: 'Kinea Rendimentos', type: 'dividend', perShare: 1.10, qty: 400, gross: 440.00, tax: 0, net: 440.00 },
    { date: '2024-05-15', ticker: 'XPLG11', name: 'XP Log', type: 'dividend', perShare: 0.85, qty: 300, gross: 255.00, tax: 0, net: 255.00 },
  ],

  // Entries (lançamentos)
  entries: [
    { date: '2024-08-20', ticker: 'PETR4', name: 'Petrobras PN', type: 'buy', qty: 100, price: 41.50, value: 4150.00, fees: 8.50, source: 'manual' },
    { date: '2024-08-15', ticker: 'HGLG11', name: 'CSHG Logística', type: 'buy', qty: 50, price: 129.80, value: 6490.00, fees: 12.00, source: 'b3' },
    { date: '2024-08-10', ticker: 'IVVB11', name: 'iShares S&P 500', type: 'buy', qty: 10, price: 268.00, value: 2680.00, fees: 5.00, source: 'manual' },
    { date: '2024-08-05', ticker: 'VALE3', name: 'Vale ON', type: 'sell', qty: 200, price: 60.20, value: 12040.00, fees: 15.00, source: 'manual' },
    { date: '2024-07-28', ticker: 'MXRF11', name: 'Maxi Renda', type: 'buy', qty: 200, price: 10.35, value: 2070.00, fees: 5.00, source: 'cei' },
    { date: '2024-07-22', ticker: 'WEGE3', name: 'WEG ON', type: 'bonus', qty: 60, price: 0, value: 0, fees: 0, source: 'b3' },
    { date: '2024-07-15', ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'buy', qty: 200, price: 30.80, value: 6160.00, fees: 10.00, source: 'manual' },
    { date: '2024-07-10', ticker: 'BOVA11', name: 'iShares IBOV', type: 'buy', qty: 50, price: 103.50, value: 5175.00, fees: 8.00, source: 'manual' },
  ],

  // Asset returns
  assetReturns: [
    { ticker: 'PETR4', class: 'stocks', weight: 7.5, return: 15.2, contrib: 1.14, benchmark: 8.7, alpha: 6.5 },
    { ticker: 'VALE3', class: 'stocks', weight: 7.0, return: -5.5, contrib: -0.39, benchmark: 8.7, alpha: -14.2 },
    { ticker: 'ITUB4', class: 'stocks', weight: 7.0, return: 12.4, contrib: 0.87, benchmark: 8.7, alpha: 3.7 },
    { ticker: 'HGLG11', class: 'fiis', weight: 8.7, return: 10.1, contrib: 0.88, benchmark: 6.8, alpha: 3.3 },
    { ticker: 'IVVB11', class: 'etfs', weight: 7.2, return: 18.5, contrib: 1.33, benchmark: 14.2, alpha: 4.3 },
    { ticker: 'FIXA11', class: 'fixed', weight: 12.7, return: 6.2, contrib: 0.79, benchmark: 8.8, alpha: -2.6 },
    { ticker: 'CDB120', class: 'fixed', weight: 9.2, return: 9.1, contrib: 0.84, benchmark: 8.8, alpha: 0.3 },
  ],

  // All tickers for autocomplete
  allTickers: ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'RENT3', 'LREN3', 'RADL3', 'BBAS3', 'HGLG11', 'MXRF11', 'XPLG11', 'VGIP11', 'KNCR11', 'IVVB11', 'BOVA11', 'FIXA11', 'CDB120', 'XPBR31']
};

// ========================================
// Formatters
// ========================================

const fmt = {
  currency: (val, compact = false) => {
    if (compact && Math.abs(val) >= 1000) {
      if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1).replace('.', ',') + 'M';
      if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1).replace('.', ',') + 'K';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);
  },
  number: (val, decimals = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val),
  percent: (val, decimals = 2) => (val >= 0 ? '+' : '') + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val) + '%',
  date: (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR'),
  dateShort: (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })
};

// ========================================
// Chart Helpers - Enhanced
// ========================================

const CHART_COLORS = {
  portfolio: '#1A73E8',
  invested: '#5F6368',
  cdi: '#EA4335',
  ibov: '#34A853',
  ifix: '#F9AB00',
  smll: '#7C3AED',
  // Semantic class colors (per VISUAL_CANON)
  classAcao: '#1A73E8',
  classFiis: '#8B5CF6',
  classEtfs: '#F5C542',
  classRf: '#10B981',
  classCripto: '#F59E0B',
  classBdr: '#EC4899',
  classOther: '#64748B',
  // Legacy allocation (deprecated - use semantic class colors above)
  allocation: ['#1A73E8', '#8B5CF6', '#F5C542', '#10B981', '#F59E0B', '#EC4899', '#00B8D4', '#FF5722']
};

function createChart(ctx, config) {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js não carregado. Gráficos não funcionarão.');
    return null;
  }
  
  // Destroy existing chart on this canvas if exists
  const existingChart = Chart.getChart(ctx.canvas);
  if (existingChart) {
    existingChart.destroy();
  }
  
  // Default to line chart if type not specified
  const chartConfig = {
    type: 'line',
    ...config
  };
  
  return new Chart(ctx, chartConfig);
}

function getChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(32,33,36,0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 14,
        cornerRadius: 10,
        displayColors: true,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label || '';
            const value = ctx.parsed.y;
            if (ctx.chart.config.type === 'doughnut') {
              const data = ctx.chart.data.datasets[0].data;
              const total = data.reduce((a, b) => a + b, 0);
              const pct = ((value / total) * 100).toFixed(1);
              return `${label}: ${fmt.currency(value)} (${pct}%)`;
            }
            return `${label}: ${fmt.currency(value)}`;
          },
          title: (items) => items[0].label
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#80868B', font: { size: 11 }, maxTicksLimit: 12 } },
      y: { grid: { color: '#E8EAED' }, ticks: { color: '#80868B', font: { size: 11 }, callback: (v) => fmt.currency(v, true) } }
    },
    elements: { line: { tension: 0.35, borderWidth: 2.5 }, point: { radius: 0, hoverRadius: 6, hoverBorderWidth: 3 } },
    animation: { duration: 750, easing: 'easeOutQuart' }
  };
}

// ========================================
// State
// ========================================

const state = {
  activeTab: 'summary',
  charts: {},
  currentPositionsPage: 1,
  currentEarningsPage: 1,
  currentEntriesPage: 1,
  positionsPerPage: 15,
  earningsPerPage: 20,
  entriesPerPage: 20
};

// ========================================
// DOM Elements Cache
// ========================================

const els = {
  // Will be populated in initDOM()
  tabs: null,
  panels: null,
  tabIndicator: null,
  userAvatar: null,
  userDropdown: null,
  entryModal: null,
  modalCloseBtns: null,
  entryForm: null,
  addEntryBtns: null,
  toastContainer: null,
  // Summary
  kpiTotal: null,
  kpiTotalChange: null,
  kpiInvested: null,
  kpiProfit: null,
  kpiCapitalGain: null,
  kpiDividends: null,
  kpiEarnings12m: null,
  return12m: null,
  returnTotal: null,
  yield12m: null,
  monthlyBody: null,
  patrimonyChart: null,
  allocationChart: null,
  patrimonyLegend: null,
  allocationLegend: null,
  patrimonyPeriod: null,
  allocationView: null,
  // Positions
  positionsBody: null,
  positionsSearch: null,
  filterClass: null,
  filterSort: null,
  positionsSummary: null,
  // Earnings
  earningsBody: null,
  earningsType: null,
  earningsPeriod: null,
  earningsSummary: null,
  // Patrimony Detail
  patrimonyDetailChart: null,
  patrimonyDetailLegend: null,
  patrimonyDetailPeriod: null,
  showCDI: null,
  showIBOV: null,
  showIFIX: null,
  showSMLL: null,
  // Returns
  returnChart: null,
  returnLegend: null,
  returnPeriod: null,
  returnMethod: null,
  returnBenchmark: null,
  twrrValue: null,
  mwrrValue: null,
  alphaValue: null,
  sharpeValue: null,
  assetReturnBody: null,
  // Entries
  entriesBody: null,
  entriesType: null,
  entriesPeriod: null,
  entriesSummary: null,
  // Modal
  entryType: null,
  entryDate: null,
  entryAsset: null,
  entryClass: null,
  entryQty: null,
  entryPrice: null,
  entryFees: null,
  entrySource: null,
  assetList: null
};

// ========================================
// DOM Initialization
// ========================================

function initDOM() {
  els.tabs = document.querySelectorAll('.tab-btn');
  els.panels = document.querySelectorAll('.tab-panel');
  els.tabIndicator = document.querySelector('.tab-indicator');
  els.userAvatar = document.querySelector('.user-avatar');
  els.userDropdown = document.querySelector('.user-dropdown');
  els.entryModal = document.getElementById('entryModal');
  els.modalCloseBtns = document.querySelectorAll('.modal-close');
  els.entryForm = document.getElementById('entryForm');
  els.addEntryBtns = document.querySelectorAll('#addEntryBtn, #addEntryBtn2');
  els.toastContainer = document.getElementById('toastContainer');
  // Summary
  els.kpiTotal = document.getElementById('kpiTotal');
  els.kpiTotalChange = document.getElementById('kpiTotalChange');
  els.kpiInvested = document.getElementById('kpiInvested');
  els.kpiProfit = document.getElementById('kpiProfit');
  els.kpiCapitalGain = document.getElementById('kpiCapitalGain');
  els.kpiDividends = document.getElementById('kpiDividends');
  els.kpiDividendsChange = document.getElementById('kpiDividendsChange');
  els.kpiEarnings12m = document.getElementById('kpiEarnings12m');
  els.kpiProfitChange = document.getElementById('kpiProfitChange');
  els.kpiYield12m = document.getElementById('kpiYield12m');
  els.return12m = document.getElementById('return12m');
  els.returnTotal = document.getElementById('returnTotal');
  els.yield12m = document.getElementById('yield12m');
  els.monthlyBody = document.getElementById('monthlyBody');
  els.patrimonyChart = document.getElementById('patrimonyChart');
  els.allocationChart = document.getElementById('allocationChart');
  els.patrimonyLegend = document.getElementById('patrimonyLegend');
  els.allocationLegend = document.getElementById('allocationLegend');
  els.heroFreshnessLabel = document.getElementById('heroFreshnessLabel');
  els.patrimonyPeriod = document.getElementById('patrimonyPeriod');
  els.allocationView = document.getElementById('allocationView');
  // Positions
  els.positionsBody = document.getElementById('positionsBody');
  els.positionsSearch = document.getElementById('positionsSearch');
  els.filterClass = document.getElementById('filterClass');
  els.filterSort = document.getElementById('filterSort');
  els.positionsSummary = document.getElementById('positionsSummary');
  // Earnings
  els.earningsBody = document.getElementById('earningsBody');
  els.earningsType = document.getElementById('earningsType');
  els.earningsPeriod = document.getElementById('earningsPeriod');
  els.earningsSummary = document.getElementById('earningsSummary');
  // Patrimony Detail
  els.patrimonyDetailChart = document.getElementById('patrimonyDetailChart');
  els.patrimonyDetailLegend = document.getElementById('patrimonyDetailLegend');
  els.patrimonyDetailPeriod = document.getElementById('patrimonyDetailPeriod');
  els.showCDI = document.getElementById('showCDI');
  els.showIBOV = document.getElementById('showIBOV');
  els.showIFIX = document.getElementById('showIFIX');
  els.showSMLL = document.getElementById('showSMLL');
  // Returns
  els.returnChart = document.getElementById('returnChart');
  els.returnLegend = document.getElementById('returnLegend');
  els.returnPeriod = document.getElementById('returnPeriod');
  els.returnMethod = document.getElementById('returnMethod');
  els.returnBenchmark = document.getElementById('returnBenchmark');
  els.twrrValue = document.getElementById('twrrValue');
  els.mwrrValue = document.getElementById('mwrrValue');
  els.alphaValue = document.getElementById('alphaValue');
  els.sharpeValue = document.getElementById('sharpeValue');
  els.assetReturnBody = document.getElementById('assetReturnBody');
  // Entries
  els.entriesBody = document.getElementById('entriesBody');
  els.entriesType = document.getElementById('entriesType');
  els.entriesPeriod = document.getElementById('entriesPeriod');
  els.entriesSummary = document.getElementById('entriesSummary');
  // Modal
  els.entryType = document.getElementById('entryType');
  els.entryDate = document.getElementById('entryDate');
  els.entryAsset = document.getElementById('entryAsset');
  els.entryClass = document.getElementById('entryClass');
  els.entryQty = document.getElementById('entryQty');
  els.entryPrice = document.getElementById('entryPrice');
  els.entryFees = document.getElementById('entryFees');
  els.entrySource = document.getElementById('entrySource');
  els.assetList = document.getElementById('assetList');
}

// ========================================
// Tab Navigation
// ========================================

function switchTab(tabName, focusTab = false) {
  // Guard: validate panel exists
  const panel = document.getElementById(`panel-${tabName}`);
  if (!panel) {
    console.warn(`switchTab: painel "panel-${tabName}" não encontrado. Fallback para 'summary'.`);
    tabName = 'summary';
  }

  state.activeTab = tabName;

  // Update tabs - roving tabindex pattern
  els.tabs.forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  // Update panels
  els.panels.forEach(panel => {
    const isActive = panel.id === `panel-${tabName}`;
    panel.hidden = !isActive;
    if (isActive) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  // Update indicator
  const activeTab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (activeTab && els.tabIndicator) {
    els.tabIndicator.style.width = `${activeTab.offsetWidth}px`;
    els.tabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  }

  // Focus the active tab if requested (for keyboard navigation)
  if (focusTab && activeTab) {
    activeTab.focus();
  }

  // Initialize charts on first view
  if (tabName === 'summary' && !state.charts.patrimony) initPatrimonyChart();
  if (tabName === 'summary' && !state.charts.allocation) initAllocationChart();
  if (tabName === 'patrimony' && !state.charts.patrimonyDetail) initPatrimonyDetailChart();
  if (tabName === 'returns' && !state.charts.returns) initReturnsChart();

  // Render tables for non-lazy tabs only (lazy tabs are rendered via maybeRenderLazy in panels.js)
  if (tabName === 'positions') renderPositions();
  if (tabName === 'earnings') renderEarnings();
  if (tabName === 'entries') renderEntries();
  if (tabName === 'returns') renderAssetReturns();
  // 'fixed' and other lazy tabs are rendered by maybeRenderLazy in panels.js
}

// Expor switchTab globalmente para testes e integração
window.switchTab = switchTab;
// Expor funções de renderização globalmente para acesso por outros módulos
window.renderPositions = renderPositions;
window.renderEarnings = renderEarnings;
window.renderEntries = renderEntries;
window.renderAssetReturns = renderAssetReturns;
// renderFixedIncome é exposto por panels.js

function initTabs() {
  // Use event delegation on the container for better reliability
  const tabsContainer = document.querySelector('.header-tabs .container');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn && btn.dataset.tab) {
        switchTab(btn.dataset.tab);
      }
    });
  }

  // Keyboard navigation - roving tabindex pattern
  els.tabs.forEach((btn, index) => {
    btn.addEventListener('keydown', (e) => {
      let targetIndex = -1;
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          targetIndex = (index + 1) % els.tabs.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          targetIndex = (index - 1 + els.tabs.length) % els.tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          targetIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          targetIndex = els.tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          switchTab(btn.dataset.tab);
          return;
      }
      
      if (targetIndex >= 0) {
        const targetTab = els.tabs[targetIndex];
        switchTab(targetTab.dataset.tab, true); // focus the target tab
      }
    });
  });

  // Set initial indicator position
  requestAnimationFrame(() => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && els.tabIndicator) {
      els.tabIndicator.style.width = `${activeTab.offsetWidth}px`;
      els.tabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }
  });

  // Update indicator on resize
  window.addEventListener('resize', debounce(() => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && els.tabIndicator) {
      els.tabIndicator.style.width = `${activeTab.offsetWidth}px`;
      els.tabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }
  }, 100));
}

// ========================================
// User Menu
// ========================================

function initUserMenu() {
  if (!els.userAvatar || !els.userDropdown) return;

  els.userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = els.userAvatar.getAttribute('aria-expanded') === 'true';
    els.userAvatar.setAttribute('aria-expanded', !isOpen);
    els.userDropdown.hidden = isOpen;
    if (!isOpen) {
      els.userDropdown.parentElement.classList.add('open');
    } else {
      els.userDropdown.parentElement.classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!els.userAvatar.contains(e.target) && !els.userDropdown.contains(e.target)) {
      els.userAvatar.setAttribute('aria-expanded', 'false');
      els.userDropdown.hidden = true;
      els.userDropdown.parentElement.classList.remove('open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.userDropdown.hidden) {
      els.userAvatar.setAttribute('aria-expanded', 'false');
      els.userDropdown.hidden = true;
      els.userDropdown.parentElement.classList.remove('open');
      els.userAvatar.focus();
    }
  });
}

// ========================================
// Persistence (localStorage)
// ========================================

const STORAGE_KEY = 'investidor10-dashboard-data';

function saveToStorage() {
  const data = {
    positions: MOCK_DATA.positions,
    entries: MOCK_DATA.entries,
    earnings: MOCK_DATA.earnings,
    kpis: MOCK_DATA.kpis,
    monthlyData: MOCK_DATA.monthlyData,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Falha ao salvar no localStorage:', e);
  }
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.positions) MOCK_DATA.positions = data.positions;
      if (data.entries) MOCK_DATA.entries = data.entries;
      if (data.earnings) MOCK_DATA.earnings = data.earnings;
      if (data.kpis) MOCK_DATA.kpis = data.kpis;
      if (data.monthlyData) MOCK_DATA.monthlyData = data.monthlyData;
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
        updateThemeIcons(data.theme);
      }
      return true;
    }
  } catch (e) {
    console.warn('Falha ao carregar do localStorage:', e);
  }
  return false;
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
  showToast('Dados locais limpos', 'info');
}

// ========================================
// Theme Toggle
// ========================================

function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcons(newTheme);
    saveToStorage();
    showToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
  });
}

function updateThemeIcons(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  const sunIcon = themeToggle.querySelector('.icon-sun');
  const moonIcon = themeToggle.querySelector('.icon-moon');
  
  if (theme === 'dark') {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
}

// ========================================
// KPIs Render
// ========================================

function renderKPIs() {
  const k = MOCK_DATA.kpis;

  // ===== Modelo Investidor10 (alinhado à carteira pública do usuário) =====
  // Ganho de Capital = Patrimônio − Valor investido (não realizado)
  // Dividendos Recebidos = soma lifetime dos proventos brutos
  // Lucro total = Ganho de Capital + Dividendos Recebidos
  const dividendsLifetime = (MOCK_DATA.earnings || []).reduce((s, e) => s + (Number(e.gross ?? e.grossValue) || 0), 0);
  const ganhoCapital = k.total - k.invested;
  const lucroTotal = ganhoCapital + dividendsLifetime;
  const rentTotalPct = k.invested > 0 ? (lucroTotal / k.invested) * 100 : 0;

  els.kpiTotal.textContent = fmt.currency(k.total);
  els.kpiTotalChange.innerHTML = `${fmt.percent(k.totalChange)} <span class="kpi-period">(Total)</span>`;
  els.kpiTotalChange.classList.toggle('positive', k.totalChange > 0);
  els.kpiTotalChange.classList.toggle('negative', k.totalChange < 0);
  els.kpiInvested.textContent = fmt.currency(k.invested);

  // Data de última atualização (freshness real)
  const lastEarn = (MOCK_DATA.earnings || []).map(e => e.date).filter(Boolean).sort().pop();
  const lastPatrimony = (MOCK_DATA.patrimony?.portfolio || []).length;
  const lastUpdate = lastEarn || (lastPatrimony ? MOCK_DATA.patrimony.dates?.[MOCK_DATA.patrimony.dates.length - 1] : null);
  if (els.heroFreshnessLabel) {
    if (lastUpdate) {
      const d = new Date(lastUpdate + 'T12:00:00');
      const days = Math.floor((Date.now() - d) / 86400000);
      els.heroFreshnessLabel.textContent = days === 0 ? 'Hoje' : days === 1 ? 'Ontem' : `${days} dias atrás`;
    } else {
      els.heroFreshnessLabel.textContent = '—';
    }
  }

  // Resultado não realizado (ganho de capital) — não mais "Lucro total"
  els.kpiCapitalGain.textContent = fmt.currency(ganhoCapital);
  els.kpiCapitalGain.classList.toggle('positive', ganhoCapital > 0);
  els.kpiCapitalGain.classList.toggle('negative', ganhoCapital < 0);
  els.kpiDividends.textContent = fmt.currency(k.dividends / 12);
  if (els.kpiDividendsChange) {
    const meta = (window.CARTEIRA_META && (window.CARTEIRA_META.divGoal || (window.CARTEIRA_META.goals && window.CARTEIRA_META.goals.proventosMonthly))) || null;
    const divTotalTxt = dividendsLifetime > 0 ? `Recebidos: ${fmt.currency(dividendsLifetime)}${meta ? ' • ' : ''}` : '';
    els.kpiDividendsChange.textContent = meta ? `${divTotalTxt}Meta: ${fmt.currency(meta)}/mês` : (dividendsLifetime > 0 ? divTotalTxt + 'Média 12M' : 'Média dos últimos 12 meses');
  }
  els.kpiEarnings12m.textContent = fmt.currency(k.earnings12m);
  if (els.kpiYield12m) els.kpiYield12m.textContent = `Yield 12M: ${fmt.percent(k.yield12m)}`;
  els.return12m.textContent = k.return12m == null ? '—' : fmt.percent(k.return12m);
  els.return12m.classList.toggle('positive', k.return12m != null && k.return12m > 0);
  els.return12m.classList.toggle('negative', k.return12m != null && k.return12m < 0);
  els.returnTotal.textContent = fmt.percent(k.returnTotal);
  els.returnTotal.classList.toggle('positive', k.returnTotal > 0);
  els.returnTotal.classList.toggle('negative', k.returnTotal < 0);
  els.yield12m.textContent = fmt.percent(k.yield12m);
  els.yield12m.classList.toggle('positive', k.yield12m > 0);
  els.yield12m.classList.toggle('negative', k.yield12m < 0);
}

// ========================================
// Monthly Table
// ========================================

function renderMonthlyTable() {
  els.monthlyBody.innerHTML = MOCK_DATA.monthly.map(m => {
    const ret = m.invested > 0 ? (m.gain / m.invested) * 100 : 0;
    return `
      <tr>
        <td>${m.period}</td>
        <td class="text-right">${fmt.currency(m.invested)}</td>
        <td class="text-right ${m.gain >= 0 ? 'positive' : 'negative'}">${fmt.currency(m.gain)}</td>
        <td class="text-right pct-cell ${ret >= 0 ? 'positive' : 'negative'}">${fmt.percent(ret)}</td>
      </tr>
    `;
  }).join('');
}

// ========================================
// A11y Helpers: Chart Summary & Empty States
// ========================================

function generateChartSummary(chartId, data, type = 'line') {
  if (!data || !data.labels || !data.labels.length) return '';
  
  const firstLabel = data.labels[0];
  const lastLabel = data.labels[data.labels.length - 1];
  
  if (type === 'line' && data.datasets) {
    const mainDataset = data.datasets[0];
    if (!mainDataset || !mainDataset.data || !mainDataset.data.length) return '';
    
    const firstValue = mainDataset.data[0];
    const lastValue = mainDataset.data[mainDataset.data.length - 1];
    const change = firstValue ? ((lastValue - firstValue) / firstValue * 100) : 0;
    const changeStr = change >= 0 ? `alta de ${fmt.percent(change, 1)}` : `queda de ${fmt.percent(Math.abs(change), 1)}`;
    
    const min = Math.min(...mainDataset.data.filter(v => v != null));
    const max = Math.max(...mainDataset.data.filter(v => v != null));
    
    return `${mainDataset.label || 'Série'}: ${changeStr} (${firstLabel} → ${lastLabel}). Mín: ${fmt.currency(min)}. Máx: ${fmt.currency(max)}.`;
  }
  
  if (type === 'doughnut' && data.datasets) {
    const dataset = data.datasets[0];
    if (!dataset || !dataset.data || !data.labels) return '';
    
    const total = dataset.data.reduce((a, b) => a + b, 0);
    const parts = data.labels.map((label, i) => `${label}: ${fmt.percent((dataset.data[i] / total) * 100, 1)}`).join(', ');
    return `Distribuição: ${parts}. Total: ${fmt.currency(total)}.`;
  }
  
  return '';
}

function renderChartSummary(chartId, summary) {
  const container = document.getElementById(chartId);
  if (!container) return;
  
  let summaryEl = container.querySelector('.chart-summary');
  if (!summaryEl) {
    summaryEl = document.createElement('p');
    summaryEl.className = 'chart-summary';
    summaryEl.setAttribute('aria-live', 'polite');
    container.parentNode.insertBefore(summaryEl, container.nextSibling);
  }
  summaryEl.textContent = summary;
}

// Audit 2026-10-16: regiões roláveis acessíveis por teclado
// (axe scrollable-region-focusable, WCAG 2.1.1/2.1.3)
function enhanceScrollableRegions() {
  document.querySelectorAll('.table-wrapper').forEach((w) => {
    if (w.hasAttribute('tabindex')) return;
    const title = w.closest('article, section, .card')?.querySelector('h2, h3, .table-title')?.textContent.trim();
    w.setAttribute('tabindex', '0');
    w.setAttribute('role', 'region');
    w.setAttribute('aria-label', title ? `Tabela rolável: ${title}` : 'Tabela rolável');
  });
}

function renderEmptyState(tableBodyId, message, icon = '📭') {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  
  if (tbody.children.length === 0) {
    const colCount = tbody.closest('table')?.querySelector('thead th') ? 
      tbody.closest('table').querySelectorAll('thead th').length : 5;
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="empty-cell">
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">${icon}</span>
        <p class="empty-state-title">Sem dados</p>
        <p class="empty-state-desc">${message}</p>
      </div>
    </td></tr>`;
  }
}

function renderSkeleton(tableBodyId, rowCount = 3, colCount = 5) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  
  tbody.innerHTML = Array(rowCount).fill(0).map(() =>
    `<tr>${Array(colCount).fill(0).map(() => '<td><div class="skeleton skeleton-line"></div></td>').join('')}</tr>`
  ).join('');
  
  // Add shimmer animation if not exists
  if (!document.getElementById('skeleton-style')) {
    const style = document.createElement('style');
    style.id = 'skeleton-style';
    style.textContent = '@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
    document.head.appendChild(style);
  }
}

function initPatrimonyChart() {
  const ctx = els.patrimonyChart.getContext('2d');
  const data = MOCK_DATA.patrimony;

  state.charts.patrimony = createChart(ctx, {
    ...getChartDefaults(),
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Patrimônio', data: data.portfolio, borderColor: CHART_COLORS.portfolio, backgroundColor: 'rgba(26,115,232,0.1)', fill: true },
        { label: 'Investido', data: data.invested, borderColor: CHART_COLORS.invested, borderDash: [6, 4], fill: false },
        { label: 'CDI', data: data.cdi, borderColor: CHART_COLORS.cdi, borderDash: [4, 4], fill: false }
      ]
    }
  });

  // A11y: Chart summary for screen readers
  const summary = generateChartSummary('patrimonyChart', { labels: data.labels, datasets: [{ label: 'Patrimônio', data: data.portfolio }] }, 'line');
  renderChartSummary('patrimonyChart', summary);

  renderLegend(els.patrimonyLegend, [
    { label: 'Patrimônio', color: CHART_COLORS.portfolio },
    { label: 'Valor Investido', color: CHART_COLORS.invested, dash: [6, 4] },
    { label: 'CDI', color: CHART_COLORS.cdi, dash: [4, 4] }
  ]);

  // Filtro de período funcional (fix da auditoria: select era decorativo)
  if (els.patrimonyPeriod) {
    els.patrimonyPeriod.addEventListener('change', () => {
      const chart = state.charts.patrimony;
      if (!chart) return;
      const periodMap = { '1m': 2, '3m': 4, '6m': 7, '12m': 13, 'all': data.labels.length };
      const take = Math.min(periodMap[els.patrimonyPeriod.value] || data.labels.length, data.labels.length);
      const start = data.labels.length - take;
      chart.data.labels = data.labels.slice(start);
      chart.data.datasets[0].data = data.portfolio.slice(start);
      chart.data.datasets[1].data = data.invested.slice(start);
      chart.data.datasets[2].data = data.cdi.slice(start);
      chart.update();

      // Fase C: atualiza resumo textual e legenda quando filtro muda
      const visible = data.portfolio.slice(start);
      const first = visible[0] || 0;
      const last = visible[visible.length - 1] || 0;
      const pct = first > 0 ? ((last / first - 1) * 100).toFixed(2) : '0.00';
      const periodLabel = els.patrimonyPeriod.options[els.patrimonyPeriod.selectedIndex]?.text || '';
      renderChartSummary('patrimonyChart', `Evolução do patrimônio (${periodLabel}): ${fmt.currency(first)} → ${fmt.currency(last)} (${pct >= 0 ? '+' : ''}${pct}%). Dados até ${data.labels[data.labels.length - 1]}.`);
    });
  }

  // Fase C: marca tabelas com colunas escondidas no mobile
  function markHiddenCols() {
    if (window.innerWidth > 639) {
      document.querySelectorAll('.table-wrapper').forEach(w => w.classList.remove('has-hidden-cols'));
      return;
    }
    document.querySelectorAll('.table-wrapper').forEach(w => {
      const hidden = [...w.querySelectorAll('th')].filter(th => getComputedStyle(th).display === 'none');
      w.classList.toggle('has-hidden-cols', hidden.length > 0);
    });
  }
  window.addEventListener('resize', markHiddenCols);
}

// ========================================
// Allocation Chart (Doughnut)
// ========================================

function initAllocationChart() {
  const ctx = els.allocationChart.getContext('2d');
  const data = MOCK_DATA.allocation.byClass;

  // Map class to semantic color
  const classColorMap = {
    'Ações': CHART_COLORS.classAcao,
    'FIIs': CHART_COLORS.classFiis,
    'ETFs': CHART_COLORS.classEtfs,
    'Renda Fixa': CHART_COLORS.classRf,
    'Outros': CHART_COLORS.classOther
  };

  state.charts.allocation = createChart(ctx, {
    ...getChartDefaults(),
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: data.map(d => classColorMap[d.name] || CHART_COLORS.classOther),
        borderWidth: 0,
        cutout: '65%'
      }]
    },
    plugins: {
      ...getChartDefaults().plugins,
      tooltip: {
        ...getChartDefaults().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const item = data[ctx.dataIndex];
            return `${item.name}: ${fmt.currency(item.value)} (${fmt.percent(item.pct)})`;
          }
        }
      }
    }
  });

  renderAllocationLegend();
  
  // A11y: Chart summary for screen readers
  const allocData = { labels: data.map(d => d.name), datasets: [{ data: data.map(d => d.value) }] };
  const summary = generateChartSummary('allocationChart', allocData, 'doughnut');
  renderChartSummary('allocationChart', summary);
}

function renderAllocationLegend() {
  const data = MOCK_DATA.allocation.byClass;
  els.allocationLegend.innerHTML = data.map(d => `
    <div class="legend-item">
      <span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${d.color}"></span>
      ${d.name}: ${fmt.percent(d.pct)}
    </div>
  `).join('');
}

// Export CSV for allocation chart
function exportAllocationCSV() {
  const data = MOCK_DATA.allocation.byClass;
  const headers = ['Classe', 'Valor', 'Porcentagem'];
  const rows = data.map(d => [d.name, fmt.currency(d.value), fmt.percent(d.pct)]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `alocacao-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Alocação exportada para CSV', 'success');
}

// Generic CSV export function
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const rows = table.querySelectorAll('tr');
  const data = [];
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    const rowData = Array.from(cells).map(cell => {
      // Get text content, handling special cases
      let text = cell.textContent.trim();
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    });
    data.push(rowData.join(','));
  });
  
  const csv = data.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Exportado para CSV', 'success');
}

// Setup export buttons
function setupExportButtons() {
  const exportPositionsBtn = document.getElementById('exportPositionsBtn');
  const exportEarningsBtn = document.getElementById('exportEarningsBtn');
  const exportEntriesBtn = document.getElementById('exportEntriesBtn');
  
  if (exportPositionsBtn) {
    exportPositionsBtn.addEventListener('click', () => exportTableToCSV('positionsTable', 'posicoes'));
  }
  if (exportEarningsBtn) {
    exportEarningsBtn.addEventListener('click', () => exportTableToCSV('earningsTable', 'proventos'));
  }
  if (exportEntriesBtn) {
    exportEntriesBtn.addEventListener('click', () => exportTableToCSV('entriesTable', 'lancamentos'));
  }
}

// Make allocation chart clickable to filter positions
function setupAllocationChartClick() {
  const canvas = els.allocationChart;
  if (!canvas) return;
  
  canvas.style.cursor = 'pointer';
  canvas.title = 'Clique numa fatia para filtrar posições por classe';
  
  canvas.addEventListener('click', (e) => {
    const chart = state.charts.allocation;
    if (!chart) return;
    
    const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    if (points.length > 0) {
      const index = points[0].index;
      const data = MOCK_DATA.allocation.byClass;
      const clickedClass = data[index]?.name;
      
      // Map class name to filter value
      const classMap = {
        'Ações': 'stocks',
        'FIIs': 'fiis',
        'ETFs': 'etfs',
        'Renda Fixa': 'fixed',
        'Criptomoedas': 'crypto',
        'BDRs': 'bdr'
      };
      
      const filterValue = classMap[clickedClass] || '';
      
      if (els.filterClass) {
        els.filterClass.value = filterValue;
        filterPositions();
        
        // Show toast
        showToast(`Filtrado por: ${clickedClass || 'Todas'}`, 'info');
        
        // Visual feedback on canvas
        canvas.style.outline = '2px solid var(--color-primary)';
        setTimeout(() => canvas.style.outline = '', 500);
      }
    }
  });
}

// ========================================
// Patrimony Detail Chart
// ========================================

function initPatrimonyDetailChart() {
  const ctx = els.patrimonyDetailChart.getContext('2d');
  const data = MOCK_DATA.patrimony;

  state.charts.patrimonyDetail = createChart(ctx, {
    ...getChartDefaults(),
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Carteira', data: data.portfolio, borderColor: CHART_COLORS.portfolio, backgroundColor: 'rgba(26,115,232,0.15)', fill: true, borderWidth: 2.5 },
        { label: 'CDI', data: data.cdi, borderColor: CHART_COLORS.cdi, borderDash: [6, 4], fill: false, hidden: !els.showCDI.checked },
        { label: 'IBOV', data: data.ibov, borderColor: CHART_COLORS.ibov, borderDash: [4, 4], fill: false, hidden: !els.showIBOV.checked }
      ]
    }
  });

  renderPatrimonyDetailLegend();

  // Toggle handlers
  [els.showCDI, els.showIBOV, els.showIFIX, els.showSMLL].forEach(cb => {
    cb.addEventListener('change', () => updatePatrimonyDetailChart());
  });
  els.patrimonyDetailPeriod.addEventListener('change', () => updatePatrimonyDetailChart());
  
  // A11y: Initial chart summary
  const detailData = { labels: data.labels, datasets: [{ label: 'Carteira', data: data.portfolio }] };
  const summary = generateChartSummary('patrimonyDetailChart', detailData, 'line');
  renderChartSummary('patrimonyDetailChart', summary);
}

function updatePatrimonyDetailChart() {
  if (!state.charts.patrimonyDetail) return;
  const chart = state.charts.patrimonyDetail;
  chart.data.datasets[1].hidden = !els.showCDI.checked;
  chart.data.datasets[2].hidden = !els.showIBOV.checked;
  // IFIX and SMLL would need data
  chart.update();
  renderPatrimonyDetailLegend();
}

function renderPatrimonyDetailLegend() {
  if (!state.charts.patrimonyDetail) return;
  const chart = state.charts.patrimonyDetail;
  els.patrimonyDetailLegend.innerHTML = chart.data.datasets
    .filter((_, i) => i === 0 || !chart.getDatasetMeta(i).hidden)
    .map((ds, i) => `
      <div class="legend-item">
        <span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${ds.borderColor}"></span>
        ${ds.label}
      </div>
    `).join('');
}

// ========================================
// Returns Chart
// ========================================

function initReturnsChart() {
  const ctx = els.returnChart.getContext('2d');
  const data = MOCK_DATA.patrimony;

  // Calculate cumulative returns
  const portfolioReturns = data.portfolio.map((v, i) => ((v / data.portfolio[0]) - 1) * 100);
  const cdiReturns = data.cdi.map((v, i) => ((v / data.cdi[0]) - 1) * 100);
  const ibovReturns = data.ibov.map((v, i) => ((v / data.ibov[0]) - 1) * 100);

  state.charts.returns = createChart(ctx, {
    ...getChartDefaults(),
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Carteira', data: portfolioReturns, borderColor: CHART_COLORS.portfolio, backgroundColor: 'rgba(26,115,232,0.1)', fill: true, borderWidth: 2.5 },
        { label: 'CDI', data: cdiReturns, borderColor: CHART_COLORS.cdi, borderDash: [6, 4], fill: false },
        { label: 'IBOV', data: ibovReturns, borderColor: CHART_COLORS.ibov, borderDash: [4, 4], fill: false }
      ]
    },
    scales: {
      ...getChartDefaults().scales,
      y: { ...getChartDefaults().scales.y, ticks: { ...getChartDefaults().scales.y.ticks, callback: (v) => fmt.percent(v, 1) } }
    }
  });

  renderReturnsLegend();
  els.returnPeriod.addEventListener('change', () => updateReturnsChart());
  els.returnBenchmark.addEventListener('change', () => updateReturnsChart());
  
  // A11y: Chart summary for screen readers
  const returnsData = { labels: data.labels, datasets: [{ label: 'Carteira', data: portfolioReturns }] };
  const summary = generateChartSummary('returnChart', returnsData, 'line');
  renderChartSummary('returnChart', summary);
}

function updateReturnsChart() {
  // Simplified - would recalculate based on period/benchmark
  renderReturnsLegend();
}

function renderReturnsLegend() {
  els.returnLegend.innerHTML = `
    <div class="legend-item"><span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${CHART_COLORS.portfolio}"></span> Carteira (Retorno Total: ${fmt.percent(MOCK_DATA.kpis.returnTotal)})</div>
    <div class="legend-item"><span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${CHART_COLORS.cdi}"></span> CDI</div>
    <div class="legend-item"><span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${CHART_COLORS.ibov}"></span> IBOV</div>
  `;
  els.twrrValue.textContent = fmt.percent(11.09);
  els.mwrrValue.textContent = fmt.percent(10.42);
  els.alphaValue.textContent = '+2,30pp';
  els.sharpeValue.textContent = '1,24';
}

// ========================================
// Positions Table
// ========================================

let filteredPositions = [...MOCK_DATA.positions];

function renderPositions() {
  // Sync filteredPositions with current MOCK_DATA.positions
  filteredPositions = [...MOCK_DATA.positions];
  const start = (state.currentPositionsPage - 1) * state.positionsPerPage;
  const end = start + state.positionsPerPage;
  const pageData = filteredPositions.slice(start, end);

  // % Ideal por ativo (modelo Investidor10): meta da classe (arredondada a 5%) dividida
  // igualmente entre os ativos da classe; Comprar? = peso atual < ideal
  const allPos = MOCK_DATA.positions;
  const totalValue = allPos.reduce((s, p) => s + (p.value || 0), 0) || 1;

  // Div./mês e DY por ativo: soma dos proventos dos últimos 12 meses por ticker (dados reais)
  const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const div12mByTicker = {};
  (MOCK_DATA.earnings || []).forEach(e => {
    if ((e.date || '') >= yearAgo) {
      div12mByTicker[e.ticker] = (div12mByTicker[e.ticker] || 0) + (Number(e.gross ?? e.grossValue) || 0);
    }
  });

  // KPI strip acima da tabela (modelo tela "Aportes e Ativos")
  const strip = document.getElementById('positionsKpiStrip');
  if (strip) {
    const totalInvested = MOCK_DATA.kpis.invested || 0;
    const lucro = totalValue - totalInvested;
    const valorizacao = totalInvested > 0 ? lucro / totalInvested * 100 : 0;
    const kpi = (label, value, sub, cls = '') => `<div class="stat-block">
      <div class="fs-11-caps">${label}</div>
      <div class="${cls} fs-lg-700-mt">${value}</div>
      ${sub ? `<div class="fs-11-muted">${sub}</div>` : ''}
    </div>`;
    strip.innerHTML =
      kpi('Total investido', fmt.currency(totalInvested), `${allPos.length} ativos`) +
      kpi('Valor de mercado', fmt.currency(totalValue), 'Cotações atuais') +
      kpi('Lucro / Prejuízo', fmt.currency(lucro), '', lucro >= 0 ? 'text-success' : 'text-error') +
      kpi('Valorização', fmt.percent(valorizacao), 'Mercado vs. custo', valorizacao >= 0 ? 'text-success' : 'text-error');
  }
  const classTotals = {}, classCounts = {};
  allPos.forEach(p => {
    const c = p.class || 'other';
    classTotals[c] = (classTotals[c] || 0) + (p.value || 0);
    classCounts[c] = (classCounts[c] || 0) + 1;
  });
  const classIdeal = {};
  let idealSum = 0;
  Object.keys(classTotals).forEach(c => {
    const pct = classTotals[c] / totalValue * 100;
    const ideal = Math.round(pct / 5) * 5;
    classIdeal[c] = ideal;
    idealSum += ideal;
  });
  // fecha em 100% ajustando a maior classe
  if (idealSum !== 100) {
    const biggest = Object.keys(classTotals).reduce((a, b) => classTotals[b] > classTotals[a] ? b : a);
    classIdeal[biggest] += (100 - idealSum);
  }

  // ===== GROUPING BY CATEGORY =====
  // Define category groups in display order
  const categoryGroups = [
    { key: 'acoes', label: 'Ações', classes: ['stocks'], icon: '📈' },
    { key: 'fundos', label: 'Fundos', classes: ['fiis', 'funds'], icon: '🏢' },
    { key: 'renda-fixa', label: 'Renda Fixa', classes: ['fixed'], icon: '📊' },
    { key: 'etfs', label: 'ETFs', classes: ['etfs'], icon: '📦' },
    { key: 'outros', label: 'Outros', classes: ['crypto', 'bdr', 'other'], icon: '📌' }
  ];

  // Build rows with group headers
  const allRows = [];
  let globalRowIndex = 0;

  categoryGroups.forEach(group => {
    // Filter positions belonging to this group
    const groupPositions = filteredPositions.filter(p => group.classes.includes(p.class || 'other'));
    if (groupPositions.length === 0) return;

    // Add group header row
    const groupValue = groupPositions.reduce((s, p) => s + (p.value || 0), 0);
    const groupPct = totalValue > 0 ? (groupValue / totalValue * 100) : 0;
    allRows.push(`
      <tr class="group-header" data-group="${group.key}">
        <td colspan="14">
          <div class="group-header-content">
            <span class="group-icon">${group.icon}</span>
            <span class="group-label">${group.label}</span>
            <span class="group-count">${groupPositions.length} ativo${groupPositions.length !== 1 ? 's' : ''}</span>
            <span class="group-value">${fmt.currency(groupValue)}</span>
            <span class="group-pct">${fmt.percent(groupPct)}</span>
          </div>
        </td>
      </tr>
    `);

    // Add position rows for this group (paginated)
    const groupStart = allRows.length === 1 ? 0 : allRows.filter(r => r.includes('group-header')).length; // simplified
    groupPositions.forEach((p, idx) => {
      const globalIndex = start + globalRowIndex++;
      const cls = p.class || 'other';
      const idealAssetPct = classCounts[cls] > 0 ? (classIdeal[cls] || 0) / classCounts[cls] : 0;
      const currentPct = p.weight != null ? p.weight : (p.value / totalValue * 100);
      const shouldBuy = currentPct < idealAssetPct * 0.9; // 10% de tolerância
      allRows.push(`
        <tr data-group="${group.key}">
          <td>
            <div class="asset-cell">
              <span class="asset-ticker">${p.ticker}</span>
              <span class="asset-name">${p.name}</span>
            </div>
          </td>
          <td><span class="asset-class ${p.class}">${getClassLabel(p.class)}</span></td>
          <td class="text-right">${fmt.number(p.qty, 4)}</td>
          <td class="text-right">${fmt.currency(p.avgPrice)}</td>
          <td class="text-right">${fmt.currency(p.currentPrice)}</td>
          <td class="text-right fw-600">${fmt.currency(p.value)}</td>
          <td class="text-right pl-cell ${p.pl >= 0 ? 'positive' : 'negative'}">${fmt.currency(p.pl)}</td>
          <td class="text-right pct-cell ${p.return >= 0 ? 'positive' : 'negative'}">${fmt.percent(p.return)}</td>
          <td class="text-right">${fmt.percent(p.weight)}</td>
          <td class="text-right" class="text-primary-ink">${idealAssetPct > 0 ? fmt.percent(idealAssetPct) : '—'}</td>
          <td class="text-right">${idealAssetPct > 0 ? `<span class="asset-class ${shouldBuy ? 'fiis' : 'bdr'}">${shouldBuy ? 'Sim' : '—'}</span>` : '—'}</td>
          <td class="text-right">${div12mByTicker[p.ticker] > 0 ? fmt.currency(div12mByTicker[p.ticker] / 12) : '—'}</td>
           <td class="text-right">${div12mByTicker[p.ticker] > 0 && p.value > 0 ? fmt.percent(div12mByTicker[p.ticker] / p.value * 100) : '—'}</td>
           <td>${getConfidenceBadge(p)}</td>
           <td>
             <button class="action-btn edit-position-btn" data-index="${globalIndex}" aria-label="Editar ${p.ticker}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </td>
        </tr>
      `);
    });
  });

  // Apply pagination to the combined rows (headers + positions)
  const paginatedRows = allRows.slice(start, end);
  els.positionsBody.innerHTML = paginatedRows.join('');

  els.positionsSummary.textContent = `Mostrando ${filteredPositions.length} ativos • Valor total: ${fmt.currency(MOCK_DATA.kpis.invested)}`;

  // Attach edit handlers
  document.querySelectorAll('.edit-position-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      openPositionModalForEdit(index);
    });
  });

  // Update pagination
  updatePositionsPagination();

  // Fase G: cards mobile simplificados (visíveis apenas <640px via CSS)
  renderMobilePositionCards(filteredPositions);
}

function renderMobilePositionCards(positions) {
  const container = document.getElementById('positionsCardsMobile');
  if (!container) return;
  const totalValue = positions.reduce((s, p) => s + (p.value || 0), 0) || 1;
  container.innerHTML = positions.map(p => {
    const ret = p.return || 0;
    const weight = p.value / totalValue * 100;
    return `<div class="pos-card">
      <div class="pos-card-header">
        <span class="pos-card-ticker">${p.ticker || '—'}</span>
        <span class="pos-card-return ${ret >= 0 ? 'positive' : 'negative'}">${fmt.percent(ret)}</span>
      </div>
      <div class="pos-card-row">
        <span class="label">Valor</span>
        <span class="value">${fmt.currency(p.value)}</span>
      </div>
      <div class="pos-card-row">
        <span class="label">Peso</span>
        <span class="value">${fmt.percent(weight)}</span>
      </div>
      <div class="pos-card-row">
        <span class="label">P&L</span>
        <span class="value ${p.pl >= 0 ? 'text-success' : 'text-error'}">${fmt.currency(p.pl)}</span>
      </div>
    </div>`;
  }).join('');
}

function getClassLabel(cls) {
  const labels = { stocks: 'Ações', fiis: 'FIIs', etfs: 'ETFs', fixed: 'Renda Fixa', crypto: 'Cripto', bdr: 'BDRs', other: 'Outros' };
  return labels[cls] || cls;
}

function getConfidenceBadge(p) {
  if (!p.ticker) return '<span class="badge badge-neutral" title="Sem dados">—</span>';
  const src = p.source || p.dataSource || 'unknown';
  const age = p.lastUpdate ? (Date.now() - new Date(p.lastUpdate).getTime()) / 86400000 : 999;
  const isStale = age > 30;
  const isManual = src === 'manual' || src === 'MANUAL';
  const isB3 = src === 'b3' || src === 'B3';
  if (isStale) return '<span class="badge badge-error" title={`Desatualizado: ${Math.round(age)}d`}>⏳ STALE</span>';
  if (isB3) return '<span class="badge badge-success" title="Fonte B3 (confiável)">✓ B3</span>';
  if (isManual) return '<span class="badge badge-info" title="Entrada manual">✏️ Manual</span>';
  return '<span class="badge badge-neutral" title="Fonte: ' + src + '">' + src + '</span>';
}

function filterPositions() {
  const search = els.positionsSearch.value.toLowerCase();
  const classFilter = els.filterClass.value;
  const sortBy = els.filterSort.value;

  filteredPositions = MOCK_DATA.positions.filter(p => {
    const matchSearch = p.ticker.toLowerCase().includes(search) || p.name.toLowerCase().includes(search);
    const matchClass = !classFilter || p.class === classFilter;
    return matchSearch && matchClass;
  });

  // Sort
  switch (sortBy) {
    case 'value-desc': filteredPositions.sort((a, b) => b.value - a.value); break;
    case 'value-asc': filteredPositions.sort((a, b) => a.value - b.value); break;
    case 'return-desc': filteredPositions.sort((a, b) => b.return - a.return); break;
    case 'return-asc': filteredPositions.sort((a, b) => a.return - b.return); break;
    case 'name-asc': filteredPositions.sort((a, b) => a.ticker.localeCompare(b.ticker)); break;
  }

  state.currentPositionsPage = 1;
  renderPositions();
}

function initPositionsFilters() {
  if (els.positionsSearch) {
    els.positionsSearch.addEventListener('input', debounce(filterPositions, 300));
  }
  if (els.filterClass) {
    els.filterClass.addEventListener('change', filterPositions);
  }
  if (els.filterSort) {
    els.filterSort.addEventListener('change', filterPositions);
  }
}

// ========================================
// Earnings Table - Enhanced with Pagination
// ========================================

let filteredEarnings = [...MOCK_DATA.earnings];

// Helper para label de tipo de provento
function getEarningsTypeLabel(type) {
  const labels = {
    'dividendo': 'Dividendo',
    'jcp': 'JCP',
    'rendimento': 'Rendimento',
    'amortizacao': 'Amortização',
    'juros': 'Juros',
    'dividend': 'Dividendo'
  };
  return labels[type?.toLowerCase()] || type || 'Provento';
}

function renderEarnings() {
  const start = (state.currentEarningsPage - 1) * state.earningsPerPage;
  const end = start + state.earningsPerPage;
  const pageData = filteredEarnings.slice(start, end);

  if (els.earningsBody) {
    if (filteredEarnings.length === 0) {
      // Empty state
      els.earningsBody.innerHTML = `<tr><td colspan="8" class="empty-cell">
        <div class="empty-state flex-center-col">
          <span class="empty-state-icon" aria-hidden="true">📭</span>
          <p class="empty-state-title">Sem proventos</p>
          <p class="empty-state-desc">Nenhum provento encontrado para os filtros atuais.</p>
        </div>
      </td></tr>`;
    } else {
      els.earningsBody.innerHTML = pageData.map(e => `
        <tr>
          <td>${fmt.date(e.date)}</td>
          <td><div class="asset-cell"><span class="asset-ticker">${e.ticker}</span><span class="asset-name">${e.name}</span></div></td>
          <td><span class="asset-class ${e.type}">${getEarningsTypeLabel(e.type)}</span></td>
          <td class="text-right">${fmt.currency(e.perShare)}</td>
          <td class="text-right">${fmt.number(e.qty)}</td>
          <td class="text-right">${fmt.currency(e.gross)}</td>
          <td class="text-right ${e.tax > 0 ? 'negative' : ''}">${e.tax > 0 ? '-' + fmt.currency(e.tax) : '-'}</td>
          <td class="text-right fw-600">${fmt.currency(e.net)}</td>
        </tr>
      `).join('');
    }
  }

  const totalNet = filteredEarnings.reduce((sum, e) => sum + e.net, 0);
  if (els.earningsSummary) {
    const earningsLen = filteredEarnings.length;
    const kpisTotal = MOCK_DATA.kpis?.earnings12M;
    const isPartial = kpisTotal && earningsLen < kpisTotal.count;
    const partialBadge = isPartial
      ? ` <span class="badge badge-warning" title="Dados parciais: ${earningsLen} de ${kpisTotal.count} proventos">⚠️ Parcial</span>`
      : '';
    els.earningsSummary.innerHTML = `Mostrando ${earningsLen} proventos • Total líquido: ${fmt.currency(totalNet)}${partialBadge}`;
  }

  // Update pagination
  updateEarningsPagination();
}

function updateEarningsPagination() {
  const totalPages = Math.ceil(filteredEarnings.length / state.earningsPerPage);
  const prevBtn = document.querySelector('#panel-earnings .pagination button[aria-label="Página anterior"]');
  const nextBtn = document.querySelector('#panel-earnings .pagination button[aria-label="Próxima página"]');
  const pageInfo = document.querySelector('#panel-earnings .page-info');
  
  if (prevBtn) prevBtn.disabled = state.currentEarningsPage <= 1;
  if (nextBtn) nextBtn.disabled = state.currentEarningsPage >= totalPages;
  if (pageInfo) pageInfo.textContent = `Página ${state.currentEarningsPage} de ${totalPages}`;
}

function filterEarnings() {
  const typeFilter = els.earningsType?.value;
  const periodFilter = els.earningsPeriod?.value;

  filteredEarnings = MOCK_DATA.earnings.filter(e => {
    const matchType = !typeFilter || e.type === typeFilter;
    // Period filter would need date parsing
    return matchType;
  });

  state.currentEarningsPage = 1;
  renderEarnings();
}

function initEarningsFilters() {
  if (els.earningsType) {
    els.earningsType.addEventListener('change', filterEarnings);
  }
  if (els.earningsPeriod) {
    els.earningsPeriod.addEventListener('change', filterEarnings);
  }
  
  // Pagination buttons
  const prevBtn = document.querySelector('#panel-earnings .pagination button[aria-label="Página anterior"]');
  const nextBtn = document.querySelector('#panel-earnings .pagination button[aria-label="Próxima página"]');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentEarningsPage > 1) {
        state.currentEarningsPage--;
        renderEarnings();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredEarnings.length / state.earningsPerPage);
      if (state.currentEarningsPage < totalPages) {
        state.currentEarningsPage++;
        renderEarnings();
      }
    });
  }
}

// ========================================
// Entries Table
// ========================================

let filteredEntries = [...MOCK_DATA.entries];

function renderEntries() {
  const start = (state.currentEntriesPage - 1) * state.entriesPerPage;
  const end = start + state.entriesPerPage;
  const pageData = filteredEntries.slice(start, end);

  if (filteredEntries.length === 0) {
    // Empty state
    els.entriesBody.innerHTML = `<tr><td colspan="10" class="empty-cell">
      <div class="empty-state flex-center-col">
        <span class="empty-state-icon" aria-hidden="true">📝</span>
        <p class="empty-state-title">Sem lançamentos</p>
        <p class="empty-state-desc">Nenhum lançamento encontrado para os filtros atuais.</p>
      </div>
    </td></tr>`;
  } else {
    els.entriesBody.innerHTML = pageData.map((e, index) => {
    const globalIndex = start + index;
    return `
    <tr>
      <td>${fmt.date(e.date)}</td>
      <td><div class="asset-cell"><span class="asset-ticker">${e.ticker}</span><span class="asset-name">${e.name}</span></div></td>
      <td><span class="asset-class ${e.type}">${getEntryTypeLabel(e.type)}</span></td>
      <td class="text-right">${fmt.number(e.qty, 4)}</td>
      <td class="text-right">${fmt.currency(e.price)}</td>
      <td class="text-right fw-600">${fmt.currency(e.value)}</td>
      <td class="text-right">${fmt.currency(e.fees)}</td>
      <td><span class="asset-class" class="tag-pill dyn-bg dyn-color" data-bg="${getSourceColor(e.source)}" data-color="${getSourceTextColor(e.source)}">${getSourceLabel(e.source)}</span></td>
      <td>
        <button class="action-btn edit-entry-btn" data-index="${globalIndex}" aria-label="Editar lançamento ${e.ticker}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete-entry-btn" data-index="${globalIndex}" aria-label="Excluir lançamento ${e.ticker}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
    `;
  }).join('');
  }

  els.entriesSummary.textContent = `Mostrando ${filteredEntries.length} lançamentos`;

  // Attach edit/delete handlers
  attachEntryActionHandlers();
}

function attachEntryActionHandlers() {
  // Edit buttons
  document.querySelectorAll('.edit-entry-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      openEntryModalForEdit(index);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-entry-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteEntry(index);
    });
  });
}

function openEntryModalForEdit(index) {
  const entry = filteredEntries[index];
  if (!entry) return;

  currentEditEntry = entry;
  currentEditEntry._index = index;

  // Fill form
  if (els.entryType) els.entryType.value = entry.type;
  if (els.entryDate) els.entryDate.value = entry.date;
  if (els.entryAsset) els.entryAsset.value = entry.ticker;
  if (els.entryClass) els.entryClass.value = entry.class || '';
  if (els.entryQty) els.entryQty.value = entry.qty;
  if (els.entryPrice) els.entryPrice.value = entry.price;
  if (els.entryFees) els.entryFees.value = entry.fees || 0;
  if (els.entrySource) els.entrySource.value = entry.source || 'manual';

  // Update modal title
  if (els.modalTitle) els.modalTitle.textContent = 'Editar lançamento';

  // Show modal
  els.entryModal.showModal();
  if (els.entryType) els.entryType.focus();
}

function deleteEntry(index) {
  if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
  
  filteredEntries.splice(index, 1);
  // Also remove from main MOCK_DATA.entries
  const mainIndex = MOCK_DATA.entries.findIndex(e => 
    e.date === filteredEntries[index]?.date && 
    e.ticker === filteredEntries[index]?.ticker &&
    e.type === filteredEntries[index]?.type
  );
  if (mainIndex !== -1) MOCK_DATA.entries.splice(mainIndex, 1);
  
  renderEntries();
  saveToStorage();
  showToast('Lançamento excluído', 'success');
}

function getEntryTypeLabel(type) {
  const labels = { buy: 'Compra', sell: 'Venda', subscription: 'Subscrição', bonus: 'Bonificação', amortization: 'Amortização', split: 'Desdobramento', merge: 'Grupamento' };
  return labels[type] || type;
}

function getSourceLabel(source) {
  const labels = { manual: 'Manual', b3: 'B3', cei: 'CEI' };
  return labels[source] || source;
}

function getSourceColor(source) {
  const colors = { manual: '#E8F0FE', b3: '#E6F4EA', cei: '#FEF3C7' };
  return colors[source] || '#E8EAED';
}

function getSourceTextColor(source) {
  // Pares AA ≥4.5:1 com getSourceColor (ver --tag-*-bg/text no canon):
  // manual 6.06:1, b3 6.15:1, cei 5.72:1
  const colors = { manual: '#1557B0', b3: '#14672F', cei: '#7A5A00' };
  return colors[source] || '#5F6368';
}

function filterEntries() {
  const typeFilter = els.entriesType?.value;
  const periodFilter = els.entriesPeriod?.value;

  filteredEntries = MOCK_DATA.entries.filter(e => {
    const matchType = !typeFilter || e.type === typeFilter;
    return matchType;
  });

  state.currentEntriesPage = 1;
  renderEntries();
}

function initEntriesFilters() {
  if (els.entriesType) {
    els.entriesType.addEventListener('change', filterEntries);
  }
  if (els.entriesPeriod) {
    els.entriesPeriod.addEventListener('change', filterEntries);
  }
  
  // Pagination buttons
  const prevBtn = document.querySelector('#panel-entries .pagination button[aria-label="Página anterior"]');
  const nextBtn = document.querySelector('#panel-entries .pagination button[aria-label="Próxima página"]');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentEntriesPage > 1) {
        state.currentEntriesPage--;
        renderEntries();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredEntries.length / state.entriesPerPage);
      if (state.currentEntriesPage < totalPages) {
        state.currentEntriesPage++;
        renderEntries();
      }
    });
  }
}

// ========================================
// Positions Pagination
// ========================================

function updatePositionsPagination() {
  const totalPages = Math.ceil(filteredPositions.length / state.positionsPerPage);
  const prevBtn = document.querySelector('#panel-positions .pagination button[aria-label="Página anterior"]');
  const nextBtn = document.querySelector('#panel-positions .pagination button[aria-label="Próxima página"]');
  const pageInfo = document.querySelector('#panel-positions .page-info');
  
  if (prevBtn) prevBtn.disabled = state.currentPositionsPage <= 1;
  if (nextBtn) nextBtn.disabled = state.currentPositionsPage >= totalPages;
  if (pageInfo) pageInfo.textContent = `Página ${state.currentPositionsPage} de ${totalPages}`;
}

function initPositionsPagination() {
  const prevBtn = document.querySelector('#panel-positions .pagination button[aria-label="Página anterior"]');
  const nextBtn = document.querySelector('#panel-positions .pagination button[aria-label="Próxima página"]');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentPositionsPage > 1) {
        state.currentPositionsPage--;
        renderPositions();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredPositions.length / state.positionsPerPage);
      if (state.currentPositionsPage < totalPages) {
        state.currentPositionsPage++;
        renderPositions();
      }
    });
  }
}

// ========================================
// Asset Returns Table
// ========================================

function renderAssetReturns() {
  els.assetReturnBody.innerHTML = MOCK_DATA.assetReturns.map(a => `
    <tr>
      <td><div class="asset-cell"><span class="asset-ticker">${a.ticker}</span></div></td>
      <td><span class="asset-class ${a.class}">${getClassLabel(a.class)}</span></td>
      <td class="text-right">${fmt.percent(a.weight)}</td>
      <td class="text-right pct-cell ${a.return >= 0 ? 'positive' : 'negative'}">${fmt.percent(a.return)}</td>
      <td class="text-right ${a.contrib >= 0 ? 'positive' : 'negative'}">${fmt.percent(a.contrib)}</td>
      <td class="text-right">${fmt.percent(a.benchmark)}</td>
      <td class="text-right pct-cell ${a.alpha >= 0 ? 'positive' : 'negative'}">${fmt.percent(a.alpha)}</td>
    </tr>
  `).join('');
}

// ========================================
// Modal - Enhanced with Edit Functionality
// ========================================

let currentEditEntry = null;

function initModal() {
  // Populate asset datalist
  if (els.assetList) {
    els.assetList.innerHTML = MOCK_DATA.allTickers.map(t => `<option value="${t}">`).join('');
  }

  // Set default date to today
  if (els.entryDate) {
    els.entryDate.value = new Date().toISOString().split('T')[0];
  }

  // Open modal for new entry
  if (els.addEntryBtns) {
    els.addEntryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentEditEntry = null;
        els.entryModal.showModal();
        resetModalForm();
        if (els.modalTitle) els.modalTitle.textContent = 'Novo lançamento';
        if (els.entryType) els.entryType.focus();
      });
    });
  }

  // Close modal
  if (els.modalCloseBtns) {
    els.modalCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => els.entryModal.close());
    });
  }

  // Close on backdrop click
  if (els.entryModal) {
    els.entryModal.addEventListener('click', (e) => {
      if (e.target === els.entryModal || e.target.classList.contains('modal-backdrop')) {
        els.entryModal.close();
      }
    });
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.entryModal?.open) {
      els.entryModal.close();
    }
  });

  // Form submit
  if (els.entryForm) {
    els.entryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(els.entryForm);
      const entry = Object.fromEntries(formData);
      
      // Convert numeric fields
      entry.qty = parseFloat(entry.qty);
      entry.price = parseFloat(entry.price);
      entry.fees = parseFloat(entry.fees) || 0;
      entry.value = entry.qty * entry.price;
      
      console.log(currentEditEntry ? 'Editando lançamento:' : 'Novo lançamento:', entry);
      showToast(currentEditEntry ? 'Lançamento atualizado com sucesso!' : 'Lançamento salvo com sucesso!', 'success');
      els.entryModal.close();
      
      // In real app: add to entries table
      if (!currentEditEntry) {
        // Add to mock data for demo
        MOCK_DATA.entries.unshift({
          date: entry.date,
          ticker: entry.asset,
          name: entry.asset,
          type: entry.type,
          qty: entry.qty,
          price: entry.price,
          value: entry.value,
          fees: entry.fees,
          source: entry.source
        });
        renderEntries();
      }
      saveToStorage();
    });
  }

  // Auto-fill class based on ticker
  if (els.entryAsset) {
    els.entryAsset.addEventListener('blur', () => {
      const ticker = els.entryAsset.value.toUpperCase();
      const knownAsset = MOCK_DATA.positions.find(p => p.ticker === ticker);
      if (knownAsset && els.entryClass && !els.entryClass.value) {
        els.entryClass.value = knownAsset.class;
      }
    });
  }
}

function resetModalForm() {
  if (!els.entryForm) return;
  els.entryForm.reset();
  if (els.entryDate) els.entryDate.value = new Date().toISOString().split('T')[0];
  if (els.entryFees) els.entryFees.value = '0';
  if (els.entrySource) els.entrySource.value = 'manual';
  if (els.entryClass) els.entryClass.value = '';
}

// ========================================
// Position Edit Modal (Separate from Entry Modal)
// ========================================

let currentEditPosition = null;

function initPositionModal() {
  const modal = document.getElementById('positionModal');
  const form = document.getElementById('positionForm');
  const closeBtns = modal?.querySelectorAll('.modal-close');
  
  if (!modal) return;
  
  if (closeBtns) {
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => modal.close());
    });
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
      modal.close();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.open) {
      modal.close();
    }
  });
  
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const index = parseInt(formData.get('index'));
      const qty = parseFloat(formData.get('qty'));
      const avgPrice = parseFloat(formData.get('avgPrice'));
      const currentPrice = parseFloat(formData.get('currentPrice')) || 0;
      
      if (isNaN(index) || index < 0 || index >= filteredPositions.length) return;
      
      const position = filteredPositions[index];
      position.qty = qty;
      position.avgPrice = avgPrice;
      if (currentPrice > 0) position.currentPrice = currentPrice;
      position.value = qty * (currentPrice > 0 ? currentPrice : position.currentPrice);
      position.pl = position.value - (qty * avgPrice);
      position.return = (qty * avgPrice) > 0 ? (position.pl / (qty * avgPrice)) * 100 : 0;
      position.weight = (MOCK_DATA.kpis.invested > 0) ? (position.value / MOCK_DATA.kpis.invested) * 100 : 0;
      
      // Update main data
      const mainIndex = MOCK_DATA.positions.findIndex(p => p.ticker === position.ticker);
      if (mainIndex !== -1) {
        MOCK_DATA.positions[mainIndex] = { ...position };
      }
      
      // Recalculate totals
      recalculateTotals();
      
      modal.close();
      renderPositions();
      renderKPIs();
      if (state.charts.allocation) initAllocationChart();
      saveToStorage();
      showToast('Posição atualizada com sucesso!', 'success');
    });
  }
}

function openPositionModalForEdit(index) {
  const position = filteredPositions[index];
  if (!position) return;
  
  currentEditPosition = position;
  currentEditPosition._index = index;
  
  const modal = document.getElementById('positionModal');
  if (!modal) return;
  
  document.getElementById('positionIndex').value = index;
  document.getElementById('positionAsset').value = position.ticker;
  document.getElementById('positionClass').value = position.class;
  document.getElementById('positionQty').value = position.qty;
  document.getElementById('positionAvgPrice').value = position.avgPrice;
  document.getElementById('positionCurrentPrice').value = position.currentPrice;
  
  document.getElementById('positionModalTitle').textContent = `Editar posição: ${position.ticker}`;
  
  modal.showModal();
  document.getElementById('positionQty').focus();
}

function recalculateTotals() {
  MOCK_DATA.kpis.invested = MOCK_DATA.positions.reduce((sum, p) => sum + (p.qty * p.avgPrice), 0);
  MOCK_DATA.kpis.total = MOCK_DATA.positions.reduce((sum, p) => sum + (p.qty * p.currentPrice), 0);
  MOCK_DATA.kpis.profit = MOCK_DATA.kpis.total - MOCK_DATA.kpis.invested;
  MOCK_DATA.kpis.capitalGain = MOCK_DATA.positions.filter(p => p.pl > 0).reduce((sum, p) => sum + p.pl, 0);
  MOCK_DATA.kpis.totalChange = MOCK_DATA.kpis.invested > 0 ? (MOCK_DATA.kpis.profit / MOCK_DATA.kpis.invested) * 100 : 0;
}

// ========================================
// Toast
// ========================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Fechar">&times;</button>
  `;
  els.toastContainer.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 4000);
}

// ========================================
// Legend Helper
// ========================================

function renderLegend(container, items) {
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="legend-item">
      <span class="legend-color" class="chart-legend-dot dyn-bg" data-bg="${item.color}${item.dash ? ';border-top:2px dashed ' + item.color : ''}"></span>
      ${item.label}
    </div>
  `).join('');
}

// ========================================
// Live Prices (WebSocket Mock)
// ========================================

let livePricesInterval = null;
let livePricesActive = false;

function initLivePricesToggle() {
  const toggle = document.getElementById('livePricesToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    livePricesActive = !livePricesActive;
    toggle.classList.toggle('active', livePricesActive);
    toggle.setAttribute('aria-label', livePricesActive ? 'Desativar preços em tempo real' : 'Ativar preços em tempo real');
    
    if (livePricesActive) {
      startLivePrices();
      showToast('Preços em tempo real ativados (simulação)', 'info');
    } else {
      stopLivePrices();
      showToast('Preços em tempo real desativados', 'info');
    }
  });
}

function startLivePrices() {
  if (livePricesInterval) return;
  
  livePricesInterval = setInterval(() => {
    MOCK_DATA.positions.forEach(p => {
      // Small random variation: -0.5% to +0.5%
      const variation = (Math.random() - 0.5) * 0.01;
      const oldPrice = p.currentPrice;
      const newPrice = Math.max(0.01, oldPrice * (1 + variation));
      
      p.currentPrice = Number(newPrice.toFixed(2));
      p.value = Number((p.qty * p.currentPrice).toFixed(2));
      p.pl = Number((p.value - p.qty * p.avgPrice).toFixed(2));
      p.return = p.avgPrice > 0 ? Number(((p.currentPrice - p.avgPrice) / p.avgPrice * 100).toFixed(1)) : 0;
    });
    
    // Update UI if on positions tab
    const positionsPanel = document.getElementById('panel-positions');
    if (positionsPanel && !positionsPanel.hidden) {
      renderPositions();
    }
    
    // Update KPIs
    recalculateTotals();
    renderKPIs();
    
    // Update allocation chart if visible
    if (state.charts.allocation) {
      initAllocationChart();
    }
  }, 2000); // Update every 2 seconds
}

function stopLivePrices() {
  if (livePricesInterval) {
    clearInterval(livePricesInterval);
    livePricesInterval = null;
  }
}

// ========================================
// CSV Import
// ========================================

const CSV_TEMPLATES = {
  positions: [
    ['ticker', 'name', 'class', 'qty', 'avgPrice', 'currentPrice'],
    ['PETR4', 'Petrobras PN', 'stocks', '1200', '38.45', '42.12'],
    ['VALE3', 'Vale ON', 'stocks', '800', '62.30', '58.90'],
    ['HGLG11', 'CSHG Logística', 'fiis', '450', '142.50', '131.20']
  ],
  earnings: [
    ['date', 'ticker', 'type', 'valuePerShare', 'qty', 'grossValue', 'tax', 'netValue'],
    ['2024-08-15', 'PETR4', 'dividend', '1.25', '1200', '1500.00', '0.00', '1500.00'],
    ['2024-08-10', 'HGLG11', 'amortization', '0.85', '450', '382.50', '0.00', '382.50']
  ],
  entries: [
    ['date', 'ticker', 'type', 'class', 'qty', 'price', 'fees', 'source'],
    ['2024-08-20', 'PETR4', 'buy', 'stocks', '100', '41.50', '8.50', 'manual'],
    ['2024-08-15', 'HGLG11', 'buy', 'fiis', '50', '129.80', '12.00', 'b3']
  ]
};

function downloadTemplate(type) {
  const template = CSV_TEMPLATES[type] || CSV_TEMPLATES.positions;
  const csv = template.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `template-${type}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Template baixado', 'success');
}

function parseCSV(text, delimiter = ',') {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

function importPositions(data) {
  let imported = 0;
  data.forEach(row => {
    const ticker = row.ticker?.toUpperCase();
    if (!ticker) return;
    
    const existingIndex = MOCK_DATA.positions.findIndex(p => p.ticker === ticker);
    const position = {
      ticker,
      name: row.name || ticker,
      class: row.class || 'stocks',
      qty: parseFloat(row.qty) || 0,
      avgPrice: parseFloat(row.avgprice) || parseFloat(row.avg_price) || 0,
      currentPrice: parseFloat(row.currentprice) || parseFloat(row.current_price) || 0,
    };
    position.value = position.qty * position.currentPrice;
    position.pl = position.value - (position.qty * position.avgPrice);
    position.return = position.avgPrice > 0 ? ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100 : 0;
    position.weight = 0; // Will be recalculated
    
    if (existingIndex >= 0) {
      MOCK_DATA.positions[existingIndex] = { ...MOCK_DATA.positions[existingIndex], ...position };
    } else {
      MOCK_DATA.positions.push(position);
    }
    imported++;
  });
  return imported;
}

function importEarnings(data) {
  let imported = 0;
  data.forEach(row => {
    const earning = {
      date: row.date || new Date().toISOString().split('T')[0],
      ticker: row.ticker?.toUpperCase() || '',
      name: row.name || row.ticker?.toUpperCase() || '',
      type: row.type || 'dividend',
      valuePerShare: parseFloat(row.valuepershare) || parseFloat(row.value_per_share) || 0,
      qty: parseFloat(row.qty) || 0,
      grossValue: parseFloat(row.grossvalue) || parseFloat(row.gross_value) || 0,
      tax: parseFloat(row.tax) || 0,
      netValue: parseFloat(row.netvalue) || parseFloat(row.net_value) || 0,
    };
    if (earning.ticker) {
      MOCK_DATA.earnings.unshift(earning);
      imported++;
    }
  });
  return imported;
}

function importEntries(data) {
  let imported = 0;
  data.forEach(row => {
    const entry = {
      date: row.date || new Date().toISOString().split('T')[0],
      ticker: row.ticker?.toUpperCase() || '',
      name: row.name || row.ticker?.toUpperCase() || '',
      type: row.type || 'buy',
      class: row.class || '',
      qty: parseFloat(row.qty) || 0,
      price: parseFloat(row.price) || 0,
      fees: parseFloat(row.fees) || 0,
      source: row.source || 'manual',
      value: (parseFloat(row.qty) || 0) * (parseFloat(row.price) || 0),
    };
    if (entry.ticker) {
      MOCK_DATA.entries.unshift(entry);
      imported++;
    }
  });
  return imported;
}

function handleCSVImport(formData) {
  const type = formData.get('type');
  const file = formData.get('file');
  const delimiter = formData.get('delimiter') || ',';
  const encoding = formData.get('encoding') || 'utf-8';
  
  if (!type || !file) {
    showToast('Selecione tipo e arquivo', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let text = e.target.result;
      // Handle encoding if needed (basic)
      const parsed = parseCSV(text, delimiter);
      let imported = 0;
      
      switch (type) {
        case 'positions': imported = importPositions(parsed); break;
        case 'earnings': imported = importEarnings(parsed); break;
        case 'entries': imported = importEntries(parsed); break;
      }
      
      if (imported > 0) {
        recalculateTotals();
        renderPositions();
        renderEarnings();
        renderEntries();
        renderKPIs();
        if (state.charts.allocation) initAllocationChart();
        saveToStorage();
        showToast(`${imported} registros importados com sucesso`, 'success');
        document.getElementById('importModal').close();
      } else {
        showToast('Nenhum registro válido encontrado', 'error');
      }
    } catch (err) {
      console.error('Import error:', err);
      showToast('Erro ao importar: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, encoding);
}

// ========================================
// Command Palette
// ========================================

const COMMANDS = [
  { id: 'tab-summary', title: 'Ir para Resumo', desc: 'Visão geral da carteira', shortcut: '1', icon: '📊', action: () => switchTab('summary') },
  { id: 'tab-positions', title: 'Ir para Posições', desc: 'Ativos da carteira', shortcut: '2', icon: '📈', action: () => switchTab('positions') },
  { id: 'tab-earnings', title: 'Ir para Proventos', desc: 'Dividendos e JCP', shortcut: '3', icon: '💰', action: () => switchTab('earnings') },
  { id: 'tab-patrimony', title: 'Ir para Patrimônio', desc: 'Evolução histórica', shortcut: '4', icon: '📈', action: () => switchTab('patrimony') },
  { id: 'tab-returns', title: 'Ir para Rentabilidade', desc: 'Métricas de performance', shortcut: '5', icon: '📉', action: () => switchTab('returns') },
  { id: 'tab-entries', title: 'Ir para Lançamentos', desc: 'Histórico de operações', shortcut: '6', icon: '📝', action: () => switchTab('entries') },
  { id: 'tab-fixed', title: 'Ir para Renda Fixa', desc: 'Títulos e indexadores', icon: '🏦', action: () => switchTab('fixed') },
  { id: 'tab-rebalance', title: 'Ir para Rebalancear', desc: 'Metas de alocação', icon: '⚖️', action: () => switchTab('rebalance') },
  { id: 'tab-risk', title: 'Ir para Risco', desc: 'VaR, Sharpe, drawdown', icon: '⚠️', action: () => switchTab('risk') },
  { id: 'tab-montecarlo', title: 'Ir para Monte Carlo', desc: 'Projeção estocástica', icon: '🎲', action: () => switchTab('montecarlo') },
  { id: 'tab-benchmarks', title: 'Ir para Benchmarks', desc: 'Comparação de mercado', icon: '🎯', action: () => switchTab('benchmarks') },
  { id: 'tab-tax', title: 'Ir para Impostos', desc: 'DARF, GCAP, IRPF', icon: '🧾', action: () => switchTab('tax') },
  { id: 'tab-import', title: 'Ir para Importar', desc: 'Centro de importação', icon: '📥', action: () => switchTab('import') },
  { id: 'tab-backup', title: 'Ir para Backup', desc: 'Exportar/importar dados', icon: '💾', action: () => switchTab('backup') },
  { id: 'tab-corporate-events', title: 'Ir para Eventos Corp.', desc: 'Splits, JCP, dividendas', icon: '📅', action: () => switchTab('corporate-events') },
  { id: 'tab-data-trust', title: 'Ir para Data Trust', desc: 'Auditoria e confiança', icon: '🔍', action: () => switchTab('data-trust') },
  { id: 'tab-goals', title: 'Ir para Metas', desc: 'Objetivos financeiros', icon: '🎯', action: () => switchTab('goals') },
  { id: 'tab-backup-portability', title: 'Ir para Backup Port.', desc: 'Portabilidade avançada', icon: '📦', action: () => switchTab('backup-portability') },
  { id: 'new-entry', title: 'Novo lançamento', desc: 'Adicionar compra/venda', shortcut: 'N', icon: '➕', action: () => { currentEditEntry = null; els.entryModal.showModal(); resetModalForm(); } },
  { id: 'toggle-theme', title: 'Alternar tema', desc: 'Dark/Light mode', shortcut: 'T', icon: '🌓', action: () => document.getElementById('themeToggle').click() },
  { id: 'toggle-live', title: 'Alternar preços tempo real', desc: 'Simular variação de preços', shortcut: 'L', icon: '⚡', action: () => document.getElementById('livePricesToggle').click() },
  { id: 'export-positions', title: 'Exportar posições CSV', desc: 'Baixar tabela de posições', shortcut: 'E', icon: '📥', action: () => exportTableToCSV('positionsTable', 'posicoes') },
  { id: 'export-earnings', title: 'Exportar proventos CSV', desc: 'Baixar tabela de proventos', icon: '📥', action: () => exportTableToCSV('earningsTable', 'proventos') },
  { id: 'export-entries', title: 'Exportar lançamentos CSV', desc: 'Baixar tabela de lançamentos', icon: '📥', action: () => exportTableToCSV('entriesTable', 'lancamentos') },
  { id: 'import-csv', title: 'Importar CSV', desc: 'Importar posições/proventos/lancamentos', icon: '📤', action: () => document.getElementById('importModal').showModal() },
  { id: 'price-alerts', title: 'Gerenciar alertas de preço', desc: 'Criar/editar alertas', icon: '🔔', action: () => { renderAlertsList(); document.getElementById('alertsModal').showModal(); } },
  { id: 'clear-storage', title: 'Limpar dados locais', desc: 'Resetar para dados originais', icon: '🗑️', action: () => { if (confirm('Tem certeza? Isso apaga todas as edições.')) { clearStorage(); location.reload(); } } },
];

let paletteSelectedIndex = 0;
let filteredCommands = [...COMMANDS];

function initCommandPalette() {
  const toggle = document.getElementById('commandPaletteToggle');
  const modal = document.getElementById('commandPaletteModal');
  const search = document.getElementById('paletteSearch');
  const results = document.getElementById('paletteResults');
  const closeBtns = modal?.querySelectorAll('.modal-close');
  
  if (!toggle || !modal || !search || !results) return;
  
  toggle.addEventListener('click', () => openCommandPalette());
  
  if (closeBtns) {
    closeBtns.forEach(btn => btn.addEventListener('click', () => modal.close()));
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
      modal.close();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    // Open with Cmd/Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    // Close with Escape
    if (e.key === 'Escape' && modal.open) {
      modal.close();
      search.value = '';
      filterPaletteCommands('');
    }
  });
  
  search.addEventListener('input', (e) => {
    filterPaletteCommands(e.target.value);
  });
  
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteSelectedIndex = Math.min(paletteSelectedIndex + 1, filteredCommands.length - 1);
      renderPaletteResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteSelectedIndex = Math.max(paletteSelectedIndex - 1, 0);
      renderPaletteResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[paletteSelectedIndex]) {
        executePaletteCommand(filteredCommands[paletteSelectedIndex]);
      }
    }
  });
}

function openCommandPalette() {
  const modal = document.getElementById('commandPaletteModal');
  const search = document.getElementById('paletteSearch');
  if (!modal || !search) return;
  
  paletteSelectedIndex = 0;
  filteredCommands = [...COMMANDS];
  renderPaletteResults();
  modal.showModal();
  search.focus();
}

function filterPaletteCommands(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredCommands = [...COMMANDS];
  } else {
    filteredCommands = COMMANDS.filter(cmd => 
      cmd.title.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.shortcut?.toLowerCase().includes(q)
    );
  }
  paletteSelectedIndex = 0;
  renderPaletteResults();
}

function renderPaletteResults() {
  const results = document.getElementById('paletteResults');
  if (!results) return;
  
  // Group by section
  const sections = {
    'Navegação': filteredCommands.filter(c => c.id.startsWith('tab-')),
    'Ações': filteredCommands.filter(c => ['new-entry', 'import-csv', 'price-alerts'].includes(c.id)),
    'Exportar': filteredCommands.filter(c => c.id.startsWith('export-')),
    'Sistema': filteredCommands.filter(c => ['toggle-theme', 'toggle-live', 'clear-storage'].includes(c.id))
  };
  
  results.innerHTML = Object.entries(sections)
    .filter(([_, cmds]) => cmds.length > 0)
    .map(([section, cmds]) => `
      <div class="palette-section">${section}</div>
      ${cmds.map((cmd, i) => `
        <div class="palette-item ${i === paletteSelectedIndex && filteredCommands.indexOf(cmd) === paletteSelectedIndex ? 'selected' : ''}" 
             data-id="${cmd.id}" role="option">
          <div class="palette-item-icon">${cmd.icon}</div>
          <div class="palette-item-info">
            <div class="palette-item-title">${cmd.title}</div>
            <div class="palette-item-desc">${cmd.desc}</div>
          </div>
          ${cmd.shortcut ? `<span class="palette-item-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
      `).join('')}
    `).join('');
  
  // Add click handlers
  results.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('click', () => {
      const cmd = COMMANDS.find(c => c.id === item.dataset.id);
      if (cmd) executePaletteCommand(cmd);
    });
  });
}

function executePaletteCommand(cmd) {
  cmd.action();
  document.getElementById('commandPaletteModal').close();
  document.getElementById('paletteSearch').value = '';
  filterPaletteCommands('');
}

// ========================================
// Price Alerts
// ========================================

function initPriceAlerts() {
  // Load from storage
  const stored = localStorage.getItem('priceAlerts');
  if (stored) {
    try {
      MOCK_DATA.priceAlerts = JSON.parse(stored);
    } catch {}
  }
  
  const addBtn = document.getElementById('addAlertBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAlertModal());
  }
}

function saveAlerts() {
  localStorage.setItem('priceAlerts', JSON.stringify(MOCK_DATA.priceAlerts || []));
}

function renderAlertsList() {
  const list = document.getElementById('alertsList');
  if (!list) return;
  
  const alerts = MOCK_DATA.priceAlerts || [];
  
  if (alerts.length === 0) {
    list.innerHTML = '<p class="center-muted-p6">Nenhum alerta configurado. Clique em "Novo alerta" para começar.</p>';
    return;
  }
  
  list.innerHTML = alerts.map((alert, index) => `
    <div class="alert-item">
      <div class="alert-item-info">
        <div class="alert-item-header">
          <span class="alert-item-ticker">${alert.ticker}</span>
          <span class="alert-item-type">${alert.type === 'above' ? 'Acima de' : 'Abaixo de'}</span>
        </div>
        <div class="alert-item-condition">R$ ${fmt.currency(alert.price)} • ${alert.enabled ? 'Ativo' : 'Pausado'}</div>
      </div>
      <div class="alert-item-actions">
        <button class="btn btn-ghost btn-sm" onclick="toggleAlert(${index})" aria-label="${alert.enabled ? 'Pausar' : 'Ativar'} alerta">
          ${alert.enabled ? '⏸️' : '▶️'}
        </button>
        <button class="btn btn-ghost btn-sm" onclick="editAlert(${index})" aria-label="Editar alerta">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteAlert(${index})" aria-label="Excluir alerta">🗑️</button>
      </div>
    </div>
  `).join('');
}

function openAlertModal(alert = null, index = null) {
  const isEdit = alert !== null;
  const ticker = alert?.ticker || '';
  const price = alert?.price || '';
  const type = alert?.type || 'above';
  const enabled = alert?.enabled !== false;
  
  const html = `
    <form id="alertForm" class="modal-form mt-4">
      <input type="hidden" name="editIndex" value="${index ?? ''}">
      <div class="form-row">
        <div class="form-group">
          <label for="alertTicker">Ativo *</label>
          <input type="text" id="alertTicker" name="ticker" value="${ticker}" placeholder="Ex: PETR4" required class="uppercase">
        </div>
        <div class="form-group">
          <label for="alertPrice">Preço alvo *</label>
          <input type="number" id="alertPrice" name="price" value="${price}" min="0.01" step="0.01" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="alertType">Condição *</label>
          <select id="alertType" name="type" required>
            <option value="above" ${type === 'above' ? 'selected' : ''}>Acima de (preço >= alvo)</option>
            <option value="below" ${type === 'below' ? 'selected' : ''}>Abaixo de (preço <= alvo)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="flex-2-center cursor-pointer">
            <input type="checkbox" name="enabled" ${enabled ? 'checked' : ''}>
            Ativo
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar alterações' : 'Criar alerta'}</button>
      </div>
    </form>
  `;
  
  const list = document.getElementById('alertsList');
  if (!list) return;
  
  // Replace list content with form
  list.innerHTML = html;
  
  const form = document.getElementById('alertForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const editIndex = formData.get('editIndex');
    const newAlert = {
      ticker: formData.get('ticker').toUpperCase(),
      price: parseFloat(formData.get('price')),
      type: formData.get('type'),
      enabled: formData.get('enabled') === 'on',
      createdAt: new Date().toISOString()
    };
    
    if (editIndex !== '' && !isNaN(parseInt(editIndex))) {
      MOCK_DATA.priceAlerts[parseInt(editIndex)] = newAlert;
      showToast('Alerta atualizado', 'success');
    } else {
      if (!MOCK_DATA.priceAlerts) MOCK_DATA.priceAlerts = [];
      MOCK_DATA.priceAlerts.push(newAlert);
      showToast('Alerta criado', 'success');
    }
    
    saveAlerts();
    renderAlertsList();
  });
  
  // Focus first input
  setTimeout(() => document.getElementById('alertTicker')?.focus(), 100);
}

function toggleAlert(index) {
  if (!MOCK_DATA.priceAlerts || !MOCK_DATA.priceAlerts[index]) return;
  MOCK_DATA.priceAlerts[index].enabled = !MOCK_DATA.priceAlerts[index].enabled;
  saveAlerts();
  renderAlertsList();
}

function editAlert(index) {
  if (!MOCK_DATA.priceAlerts || !MOCK_DATA.priceAlerts[index]) return;
  openAlertModal(MOCK_DATA.priceAlerts[index], index);
}

function deleteAlert(index) {
  if (!MOCK_DATA.priceAlerts || !MOCK_DATA.priceAlerts[index]) return;
  if (!confirm('Excluir este alerta?')) return;
  MOCK_DATA.priceAlerts.splice(index, 1);
  saveAlerts();
  renderAlertsList();
  showToast('Alerta excluído', 'success');
}

function checkPriceAlerts() {
  if (!MOCK_DATA.priceAlerts) return;
  
  MOCK_DATA.priceAlerts.forEach(alert => {
    if (!alert.enabled) return;
    
    const position = MOCK_DATA.positions.find(p => p.ticker === alert.ticker);
    if (!position) return;
    
    const currentPrice = position.currentPrice;
    const triggered = alert.type === 'above' 
      ? currentPrice >= alert.price 
      : currentPrice <= alert.price;
    
    if (triggered && !alert.triggered) {
      alert.triggered = true;
      saveAlerts();
      showToast(`🔔 Alerta: ${alert.ticker} ${alert.type === 'above' ? 'atingiu' : 'caiu abaixo de'} R$ ${fmt.currency(alert.price)} (atual: R$ ${fmt.currency(currentPrice)})`, 'info');
      // Could also use Notification API here
      if (Notification.permission === 'granted') {
        new Notification(`Alerta de Preço: ${alert.ticker}`, {
          body: `${alert.type === 'above' ? 'Subiu para' : 'Caiu para'} R$ ${fmt.currency(currentPrice)}`,
          icon: '/assets/icons/logo.svg'
        });
      }
    } else if (!triggered && alert.triggered) {
      alert.triggered = false;
      saveAlerts();
    }
  });
}

// ========================================
// PWA Support
// ========================================

function initPWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW not available in file:// protocol
    });
  }
  
  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });
  
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
    showToast('App instalado com sucesso!', 'success');
  });
}

function showInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.remove('hidden');
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        showToast('Instalando...', 'info');
      }
      deferredPrompt = null;
      hideInstallBanner();
    });
  }
}

// ========================================
// Utility
// ========================================

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// ========================================
// Chart.js inclusion check
// ========================================

if (typeof Chart === 'undefined') {
  console.warn('Chart.js não carregado. Gráficos não funcionarão. Verifique vendor/chart.umd.min.js');
}

// ========================================
// Init
// ========================================

async function init() {
  // P22 (auth): aguarda decisão de acesso (INACTIVE resolve imediato) antes de
  // renderizar ou carregar qualquer dado. Overlay/loading cobre a UI enquanto isso.
  if (window.__AUTH_RESOLVED__) { try { await window.__AUTH_RESOLVED__; } catch (e) { console.warn('[boot] auth resolve falhou:', e && e.message); } }
  const gateMode = (window.AuthGate && window.AuthGate.mode) || 'INACTIVE';

  // Initialize DOM references first
  initDOM();

  // Apply real wallet override if provided by carteira-data.js
  if (window.__CARTEIRA_OVERRIDE) {
    const C = window.__CARTEIRA_OVERRIDE;
    // Guards: backup/sample parcial pode não ter todas as seções
    Object.assign(MOCK_DATA.kpis, C.kpis || {});
    if (C.monthly) MOCK_DATA.monthly = C.monthly;
    if (C.patrimony) MOCK_DATA.patrimony = C.patrimony;
    if (C.allocation) MOCK_DATA.allocation = C.allocation;
    if (C.positions) MOCK_DATA.positions = C.positions;
    if (C.earnings) MOCK_DATA.earnings = C.earnings;
    if (C.entries) MOCK_DATA.entries = C.entries;
    if (C.assetReturns) MOCK_DATA.assetReturns = C.assetReturns;
  } else if (gateMode === 'INACTIVE') {
    // Load persisted data only when not overriding e sem gate ativo
    // (P26: LOGIN/BLOCKED não carregam cache local; DEMO/REAL têm fonte própria)
    loadFromStorage();
  }

  renderKPIs();
  renderMonthlyTable();
  initTabs();
  initUserMenu();
  initThemeToggle();
  initLivePricesToggle();
  initCommandPalette();
  initPriceAlerts();
  initPWA();
  initModal();
  initPositionModal();
  initPositionsFilters();
  initPositionsPagination();
  initEarningsFilters();
  initEntriesFilters();
  enhanceScrollableRegions();

  // Initial render of tables
    renderPositions();
    renderEarnings();
    renderEntries();

    // Setup allocation chart click and export
    if (state.charts.allocation) {
      setupAllocationChartClick();
    }
    const exportBtn = document.getElementById('exportAllocationBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportAllocationCSV);
    }

    // Expose data globally for panels.js and other modules (UNKNOWN≠ZERO: data must be accessible)
    // Object.assign preserva chaves extras (meta, assets, fixedIncome, goals...) da fonte real.
    // DEMO/REAL: o gate é dono de CARTEIRA_DATA (fonte demo/cloud) — não sobrescrever.
    if (gateMode === 'INACTIVE') {
      window.CARTEIRA_DATA = Object.assign({}, window.CARTEIRA_DATA, {
        kpis: MOCK_DATA.kpis,
        monthly: MOCK_DATA.monthly,
        patrimony: MOCK_DATA.patrimony,
        allocation: MOCK_DATA.allocation,
        positions: MOCK_DATA.positions,
        earnings: MOCK_DATA.earnings,
        entries: MOCK_DATA.entries,
        assetReturns: MOCK_DATA.assetReturns
      });
    }

    // Setup table export buttons
    setupExportButtons();

  // Show welcome toast
  if (gateMode === 'INACTIVE') {
    setTimeout(() => showToast('Dashboard carregado com dados de demonstração', 'info'), 500);
  }
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expor switchTab globalmente (para testes e integração) - DEVE SER NO FINAL
window.switchTab = switchTab;

// Ponte para scripts clássicos (real-mode.js) acessarem os dados do módulo
window.MOCK_DATA = MOCK_DATA;

// Função global para re-renderizar tudo após importação
window.renderAll = function() {
  try { if (typeof renderKPIs === 'function') renderKPIs(); } catch(e) { console.warn('renderKPIs failed:', e); }
  try { if (typeof renderMonthlyTable === 'function') renderMonthlyTable(); } catch(e) { console.warn('renderMonthlyTable failed:', e); }
  try { if (typeof renderAllocationLegend === 'function') renderAllocationLegend(); } catch(e) { console.warn('renderAllocationLegend failed:', e); }
  try { if (typeof renderPositions === 'function') renderPositions(); } catch(e) { console.warn('renderPositions failed:', e); }
  try { if (typeof renderEarnings === 'function') renderEarnings(); } catch(e) { console.warn('renderEarnings failed:', e); }
  try { if (typeof renderEntries === 'function') renderEntries(); } catch(e) { console.warn('renderEntries failed:', e); }
  try { if (typeof renderAssetReturns === 'function') renderAssetReturns(); } catch(e) { console.warn('renderAssetReturns failed:', e); }
  try { if (typeof renderPatrimonyDetailChart === 'function') renderPatrimonyDetailChart(); } catch(e) { console.warn('renderPatrimonyDetailChart failed:', e); }
  try { if (typeof renderReturnsChart === 'function') renderReturnsChart(); } catch(e) { console.warn('renderReturnsChart failed:', e); }
  try { if (typeof initPatrimonyChart === 'function') initPatrimonyChart(); } catch(e) { console.warn('initPatrimonyChart failed:', e); }
  try { if (typeof initAllocationChart === 'function') initAllocationChart(); } catch(e) { console.warn('initAllocationChart failed:', e); }
};