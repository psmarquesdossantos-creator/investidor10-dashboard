// src/auth/sync/data-source.js
// P23: abstração PortfolioDataSource — UI consome interface comum.
// Implementações: LocalDemoDataSource (P25, local), FirestoreRealDataSource (P24, cloud).
//
// Interface (JSDoc contrato):
//   start(): Promise<void>            — inicializa/carrega dados
//   getPortfolio(): object|null       — objeto shape CARTEIRA_DATA
//   saveSection(name, data): void     — persiste seção (kpis|positions|entries|...)
//   onUpdate(cb): void                — registra listener (cb recebe portfolio)
//   stop(): void                      — desliga listeners/persistência
// Nota: classe base documentacional; sem lógica.

/**
 * @typedef {Object} PortfolioDataSource
 * @property {() => Promise<void>} start
 * @property {() => (object|null)} getPortfolio
 * @property {(name: string, data: any) => void} saveSection
 * @property {(cb: (portfolio: object) => void) => void} onUpdate
 * @property {() => void} stop
 */

window.PortfolioDataSource = class PortfolioDataSource {
  async start() { throw new Error('PortfolioDataSource: start() não implementado'); }
  getPortfolio() { return null; }
  saveSection() { throw new Error('PortfolioDataSource: saveSection() não implementado'); }
  onUpdate() {}
  stop() {}
};
