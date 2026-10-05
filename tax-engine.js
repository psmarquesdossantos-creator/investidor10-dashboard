// tax-engine.js
// Tax Helper IRPF: DARF mensal, GCAP, declaração pré-preenchida, carnê-leão
// Brasil 2024/2025 - regras Receita Federal

/**
 * TaxEngine - Cálculos fiscais para investidores pessoa física
 * 
 * Funcionalidades:
 * - DARF mensal (ações, FIIs, ETFs, BDRs, cripto, exterior)
 * - GCAP (Ganho de Capital) - imóveis, veículos, direitos
 * - Carnê-Leão (rendimentos do exterior, aluguel PJ)
 * - Declaração pré-preenchida (XML para programa IRPF)
 * - Controle de prejuízos compensáveis
 * - Isenções (vendas < R$ 20k ações, FIIs, etc.)
 * - Day trade vs swing trade
 * - Fundos imobiliários (isenção proventos, ganho capital)
 * - ETFs (tributação 15% ganho capital)
 * - Criptoativos (15% ganho capital, isenção < R$ 35k/mês)
 * - BDRs Nível 1/2/3
 * - Investimento exterior (declaração anual, GCAP)
 */

class TaxEngine {
  constructor(options = {}) {
    this.options = {
      year: options.year || new Date().getFullYear(),
      aliquotaAcoes: 0.15,           // 15% ações swing trade
      aliquotaDayTrade: 0.20,        // 20% day trade
      aliquotaFII_ETF: 0.15,         // 15% FII/ETF ganho capital
      aliquotaCripto: 0.15,          // 15% cripto
      aliquotaExterior: 0.15,        // 15% exterior (GCAP)
      isencaoAcoesMensal: 20000,     // R$ 20k/mês ações
      isencaoCriptoMensal: 35000,    // R$ 35k/mês cripto
      deducaoIRRF: 0.00005,          // 0,005% IRRF day trade (dedutível)
      ...options
    };
    
    this.operations = [];
    this.monthlySummary = {};
    this.lossCarryforward = {
      swing: 0,
      dayTrade: 0,
      fii: 0,
      etf: 0,
      cripto: 0,
      exterior: 0
    };
    
    // Tabela IRPF 2024 (anual)
    this.irpfBrackets = [
      { min: 0, max: 24511.92, rate: 0, deducao: 0 },
      { min: 24511.93, max: 36652.16, rate: 0.075, deducao: 1838.40 },
      { min: 36652.17, max: 48654.40, rate: 0.15, deducao: 4612.56 },
      { min: 48654.41, max: 60556.64, rate: 0.225, deducao: 8278.08 },
      { min: 60556.65, max: Infinity, rate: 0.275, deducao: 10872.72 }
    ];
  }
  
  // ========================================
  // REGISTRO DE OPERAÇÕES
  // ========================================
  
  /**
   * Adiciona operação de compra/venda
   */
  addOperation(op) {
    const operation = {
      id: op.id || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(op.date),
      type: op.type, // 'buy' | 'sell'
      assetClass: op.assetClass, // 'acao' | 'fii' | 'etf' | 'bdr' | 'cripto' | 'exterior' | 'imovel' | 'veiculo' | 'direito'
      ticker: op.ticker || '',
      name: op.name || '',
      quantity: Number(op.quantity),
      price: Number(op.price),
      fees: Number(op.fees) || 0, // corretagem, emolumentos, ISS
      isDayTrade: op.isDayTrade || false,
      isExercise: op.isExercise || false, // exercício de opção
      ...op
    };
    
    // Calcula valor líquido
    operation.grossValue = operation.quantity * operation.price;
    operation.netValue = operation.type === 'sell' 
      ? operation.grossValue - operation.fees
      : operation.grossValue + operation.fees;
    
    this.operations.push(operation);
    return operation;
  }
  
  /**
   * Adiciona provento (dividendo, JCP, rendimento FII)
   */
  addIncome(income) {
    const inc = {
      id: income.id || `inc_${Date.now()}`,
      date: new Date(income.date),
      type: income.type, // 'dividendo' | 'jcp' | 'rendimento_fii' | 'amortizacao' | 'juros_sobre_capital' | 'aluguel_exterior'
      assetClass: income.assetClass,
      ticker: income.ticker || '',
      name: income.name || '',
      grossValue: Number(income.grossValue),
      irrfRetido: Number(income.irrfRetido) || 0,
      isExempt: income.isExempt || false
    };
    
    // Classifica isenção
    if (inc.assetClass === 'fii' && inc.type === 'rendimento_fii') {
      inc.isExempt = true; // Rendimentos FII isentos para PF
    }
    if (inc.assetClass === 'acao' && inc.type === 'dividendo') {
      inc.isExempt = true; // Dividendos isentos
    }
    if (inc.type === 'jcp') {
      inc.isExempt = false; // JCP tributado na fonte 15%
    }
    
    this.operations.push(inc);
    return inc;
  }
  
  // ========================================
  // PROCESSAMENTO MENSAL
  // ========================================
  
  /**
   * Processa todas as operações e calcula impostos mês a mês
   */
  processMonthly() {
    // Ordena por data
    this.operations.sort((a, b) => a.date - b.date);
    
    // Agrupa por mês
    const byMonth = {};
    this.operations.forEach(op => {
      const key = `${op.date.getFullYear()}-${String(op.date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(op);
    });
    
    // Processa cada mês
    Object.entries(byMonth).forEach(([monthKey, ops]) => {
      const [year, month] = monthKey.split('-').map(Number);
      this.monthlySummary[monthKey] = this._processMonth(ops, monthKey);
    });
    
    return this.monthlySummary;
  }
  
  _processMonth(ops, monthKey) {
    const summary = {
      month: monthKey,
      operations: ops.length,
      totals: {
        acoes: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0, irff: 0 },
        dayTrade: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0, irff: 0 },
        fii: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0 },
        etf: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0 },
        bdr: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0 },
        cripto: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0 },
        exterior: { buy: 0, sell: 0, gain: 0, loss: 0, tax: 0 },
        imovel: { gain: 0, tax: 0 },
        veiculo: { gain: 0, tax: 0 },
        direitos: { gain: 0, tax: 0 }
      },
      income: {
        dividendo: 0,
        jcp: 0,
        rendimento_fii: 0,
        amortizacao: 0,
        aluguel_exterior: 0,
        irrfRetido: 0
      },
      darf: { valor: 0, codigo: '', vencimento: '' },
      gcap: { valor: 0, codigo: '0601', vencimento: '' }
    };
    
    // Precisa do custo médio por ativo
    const positionCost = {}; // { ticker: { qty, avgPrice, assetClass } }
    
    ops.forEach(op => {
      if (op.type === 'buy' || op.type === 'sell') {
        this._processTrade(op, summary, positionCost);
      } else {
        this._processIncome(op, summary);
      }
    });
    
    // Calcula DARF do mês
    summary.darf = this._calculateDARF(summary, monthKey);
    
    // Atualiza prejuízos a compensar
    this._updateLossCarryforward(summary);
    
    return summary;
  }
  
  _processTrade(op, summary, positionCost) {
    const key = `${op.assetClass}:${op.ticker}`;
    const isDayTrade = op.isDayTrade;
    const category = isDayTrade ? 'dayTrade' : op.assetClass;
    const catSummary = summary.totals[category] || summary.totals.acoes; // fallback
    
    if (op.type === 'buy') {
      catSummary.buy += op.netValue;
      
      // Atualiza custo médio
      if (!positionCost[key]) {
        positionCost[key] = { qty: 0, totalCost: 0, assetClass: op.assetClass };
      }
      const pos = positionCost[key];
      const newQty = pos.qty + op.quantity;
      const newTotalCost = pos.totalCost + op.netValue;
      pos.qty = newQty;
      pos.totalCost = newTotalCost;
      pos.avgPrice = newTotalCost / newQty;
      
    } else if (op.type === 'sell') {
      catSummary.sell += op.netValue;
      
      // Calcula ganho/perda usando custo médio
      const pos = positionCost[key];
      if (pos && pos.qty > 0) {
        const avgCost = pos.avgPrice;
        const costBasis = op.quantity * avgCost;
        const gain = op.netValue - costBasis;
        
        if (gain >= 0) {
          catSummary.gain += gain;
        } else {
          catSummary.loss += Math.abs(gain);
        }
        
        // Atualiza posição
        pos.qty -= op.quantity;
        pos.totalCost -= costBasis;
        if (pos.qty <= 0) {
          delete positionCost[key];
        }
      }
    }
  }
  
  _processIncome(op, summary) {
    switch (op.type) {
      case 'dividendo':
        summary.income.dividendo += op.grossValue;
        break;
      case 'jcp':
        summary.income.jcp += op.grossValue;
        summary.income.irrfRetido += op.irrfRetido;
        break;
      case 'rendimento_fii':
        summary.income.rendimento_fii += op.grossValue;
        break;
      case 'amortizacao':
        summary.income.amortizacao += op.grossValue;
        break;
      case 'aluguel_exterior':
        summary.income.aluguel_exterior += op.grossValue;
        summary.income.irrfRetido += op.irrfRetido;
        break;
    }
  }
  
  _calculateDARF(summary, monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const vencimento = new Date(year, month, 1);
    vencimento.setMonth(vencimento.getMonth() + 1);
    vencimento.setDate(0); // último dia do mês seguinte
    if (vencimento.getDay() === 0) vencimento.setDate(vencimento.getDate() - 1);
    if (vencimento.getDay() === 6) vencimento.setDate(vencimento.getDate() - 1);
    
    let totalTax = 0;
    const aliquotas = {
      acoes: this.options.aliquotaAcoes,
      dayTrade: this.options.aliquotaDayTrade,
      fii: this.options.aliquotaFII_ETF,
      etf: this.options.aliquotaFII_ETF,
      bdr: this.options.aliquotaAcoes,
      cripto: this.options.aliquotaCripto,
      exterior: this.options.aliquotaExterior
    };
    
    // Ações swing trade - isenção R$ 20k/mês
    const acoesVendas = summary.totals.acoes.sell;
    const acoesGain = summary.totals.acoes.gain;
    const acoesLoss = summary.totals.acoes.loss;
    const acoesTaxableGain = Math.max(0, acoesGain - acoesLoss - this.lossCarryforward.swing);
    const acoesIsencao = Math.min(acoesVendas, this.options.isencaoAcoesMensal);
    const acoesGainAfterIsencao = Math.max(0, acoesTaxableGain - acoesIsencao);
    summary.totals.acoes.tax = acoesGainAfterIsencao * aliquotas.acoes;
    totalTax += summary.totals.acoes.tax;
    
    // Day trade - sem isenção, IRRF 0,005% dedutível
    const dtGain = summary.totals.dayTrade.gain;
    const dtLoss = summary.totals.dayTrade.loss;
    const dtTaxableGain = Math.max(0, dtGain - dtLoss - this.lossCarryforward.dayTrade);
    summary.totals.dayTrade.tax = dtTaxableGain * aliquotas.dayTrade;
    summary.totals.dayTrade.irrf = summary.totals.dayTrade.sell * this.options.deducaoIRRF;
    totalTax += summary.totals.dayTrade.tax - summary.totals.dayTrade.irrf;
    
    // FII/ETF
    ['fii', 'etf', 'bdr', 'cripto', 'exterior'].forEach(cat => {
      const gain = summary.totals[cat].gain;
      const loss = summary.totals[cat].loss;
      const cf = this.lossCarryforward[cat] || 0;
      const taxable = Math.max(0, gain - loss - cf);
      summary.totals[cat].tax = taxable * aliquotas[cat];
      totalTax += summary.totals[cat].tax;
    });
    
    // GCAP (imóvel, veículo, direitos) - separado
    const gcapGain = (summary.totals.imovel.gain || 0) + (summary.totals.veiculo.gain || 0) + (summary.totals.direitos.gain || 0);
    summary.gcap.valor = gcapGain * this.options.aliquotaExterior;
    
    return {
      valor: Math.round(totalTax * 100) / 100,
      codigo: '6015', // DARF ganhos líquidos renda variável
      vencimento: vencimento.toISOString().split('T')[0],
      breakdown: {
        acoes: summary.totals.acoes.tax,
        dayTrade: summary.totals.dayTrade.tax - summary.totals.dayTrade.irrf,
        fii: summary.totals.fii.tax,
        etf: summary.totals.etf.tax,
        bdr: summary.totals.bdr.tax,
        cripto: summary.totals.cripto.tax,
        exterior: summary.totals.exterior.tax
      }
    };
  }
  
  _updateLossCarryforward(summary) {
    // Prejuízos compensáveis (podem ser levados para meses futuros)
    Object.keys(this.lossCarryforward).forEach(cat => {
      const gain = summary.totals[cat]?.gain || 0;
      const loss = summary.totals[cat]?.loss || 0;
      const taxable = Math.max(0, gain - loss);
      const usedLoss = Math.min(loss, gain);
      this.lossCarryforward[cat] = Math.max(0, this.lossCarryforward[cat] + loss - usedLoss);
    });
  }
  
  // ========================================
  // GCAP - GANHO DE CAPITAL
  // ========================================
  
  /**
   * Calcula GCAP para venda de imóvel, veículo, direitos
   */
  calculateGCAP(sale) {
    // sale: { type: 'imovel'|'veiculo'|'direito', salePrice, acquisitionCost, improvements, saleExpenses, acquisitionDate, saleDate }
    const costBasis = (sale.acquisitionCost || 0) + (sale.improvements || 0) + (sale.saleExpenses || 0);
    const gain = sale.salePrice - costBasis;
    
    if (gain <= 0) return { gain: 0, tax: 0, isExempt: true, reason: 'Sem ganho de capital' };
    
    // Isenções imóvel
    if (sale.type === 'imovel') {
      // Imóvel adquirido antes de 1969
      if (sale.acquisitionDate && new Date(sale.acquisitionDate).getFullYear() < 1969) {
        return { gain, tax: 0, isExempt: true, reason: 'Imóvel adquirido antes de 1969' };
      }
      // Único imóvel, valor <= R$ 440k, não vendeu outro nos últimos 5 anos
      if (sale.isOnlyProperty && sale.salePrice <= 440000 && !sale.soldOtherIn5Years) {
        return { gain, tax: 0, isExempt: true, reason: 'Isenção único imóvel até R$ 440k' };
      }
      // Recompra em 180 dias
      if (sale.willRepurchaseIn180Days) {
        return { gain, tax: 0, isExempt: true, reason: 'Recompra em 180 dias (diferido)' };
      }
    }
    
    // Veículo - isenção até R$ 35k ganho
    if (sale.type === 'veiculo' && gain <= 35000) {
      return { gain, tax: 0, isExempt: true, reason: 'Veículo ganho até R$ 35k' };
    }
    
    // Calcula imposto (15% a 22,5% progressivo para GCAP)
    const tax = this._calculateGCAPTax(gain);
    
    return {
      gain,
      costBasis,
      tax,
      isExempt: false,
      aliquotaEfetiva: (tax / gain * 100).toFixed(2) + '%',
      codigo: '0601',
      vencimento: this._getGCAPDueDate(sale.saleDate)
    };
  }
  
  _calculateGCAPTax(gain) {
    // GCAP usa tabela progressiva mensal simplificada
    // Até 5 milhões: 15%
    // 5M a 10M: 17,5%
    // 10M a 30M: 20%
    // Acima 30M: 22,5%
    if (gain <= 5000000) return gain * 0.15;
    if (gain <= 10000000) return 750000 + (gain - 5000000) * 0.175;
    if (gain <= 30000000) return 1625000 + (gain - 10000000) * 0.20;
    return 5625000 + (gain - 30000000) * 0.225;
  }
  
  _getGCAPDueDate(saleDate) {
    const d = new Date(saleDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // último dia mês seguinte
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  
  // ========================================
  // RELATÓRIOS E EXPORTAÇÃO
  // ========================================
  
  /**
   * Gera relatório anual para declaração IRPF
   */
  generateAnnualReport() {
    this.processMonthly();
    
    const report = {
      year: this.options.year,
      monthly: this.monthlySummary,
      annualTotals: {
        darfTotal: 0,
        gcapTotal: 0,
        incomeTotals: {
          dividendo: 0,
          jcp: 0,
          rendimento_fii: 0,
          amortizacao: 0,
          aluguel_exterior: 0,
          irrfRetido: 0
        },
        lossCarryforward: { ...this.lossCarryforward }
      },
      positions: {}, // posições em 31/12 para declaração de bens
      operations: this.operations
    };
    
    // Agrega totais
    Object.values(this.monthlySummary).forEach(month => {
      report.annualTotals.darfTotal += month.darf.valor || 0;
      report.annualTotals.gcapTotal += month.gcap.valor || 0;
      
      Object.keys(month.income).forEach(k => {
        if (report.annualTotals.incomeTotals[k] !== undefined) {
          report.annualTotals.incomeTotals[k] += month.income[k];
        }
      });
    });
    
    // Posições finais
    report.positions = this._calculateFinalPositions();
    
    return report;
  }
  
  _calculateFinalPositions() {
    const positions = {};
    this.operations
      .filter(op => op.type === 'buy' || op.type === 'sell')
      .forEach(op => {
        const key = `${op.assetClass}:${op.ticker}`;
        if (!positions[key]) {
          positions[key] = { ticker: op.ticker, name: op.name, assetClass: op.assetClass, qty: 0, totalCost: 0, avgPrice: 0 };
        }
        const pos = positions[key];
        if (op.type === 'buy') {
          pos.qty += op.quantity;
          pos.totalCost += op.netValue;
        } else {
          pos.qty -= op.quantity;
          pos.totalCost -= op.quantity * pos.avgPrice;
        }
        pos.avgPrice = pos.qty > 0 ? pos.totalCost / pos.qty : 0;
      });
    
    // Remove posições zeradas
    Object.keys(positions).forEach(k => {
      if (positions[k].qty <= 0) delete positions[k];
    });
    
    return positions;
  }
  
  /**
   * Exporta para XML (Declaração Pré-Preenchida - programa IRPF)
   */
  exportToIRPFXML() {
    const report = this.generateAnnualReport();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<DeclaraçãoAjusteAnual exercicio="${report.year}" versao="1.0">\n`;
    
    // Rendimentos isentos
    xml += `  <RendimentosIsentos>\n`;
    xml += `    <Dividendos>${report.annualTotals.incomeTotals.dividendo.toFixed(2)}</Dividendos>\n`;
    xml += `    <RendimentosFII>${report.annualTotals.incomeTotals.rendimento_fii.toFixed(2)}</RendimentosFII>\n`;
    xml += `  </RendimentosIsentos>\n`;
    
    // Rendimentos tributáveis exclusivamente na fonte
    xml += `  <RendimentosTributaveisExclusivamenteNaFonte>\n`;
    xml += `    <JCP>${report.annualTotals.incomeTotals.jcp.toFixed(2)}</JCP>\n`;
    xml += `    <IRRFRetido>${report.annualTotals.incomeTotals.irrfRetido.toFixed(2)}</IRRFRetido>\n`;
    xml += `  </RendimentosTributaveisExclusivamenteNaFonte>\n`;
    
    // Ganhos de capital - renda variável
    xml += `  <GanhosRendaVariavel>\n`;
    Object.entries(report.monthly).forEach(([month, data]) => {
      if (data.darf.valor > 0) {
        xml += `    <Mes mes="${month}" darf="${data.darf.valor.toFixed(2)}" codigo="${data.darf.codigo}" vencimento="${data.darf.vencimento}">\n`;
        Object.entries(data.darf.breakdown).forEach(([cat, val]) => {
          if (val > 0) xml += `      <${cat}>${val.toFixed(2)}</${cat}>\n`;
        });
        xml += `    </Mes>\n`;
      }
    });
    xml += `  </GanhosRendaVariavel>\n`;
    
    // GCAP
    xml += `  <GanhosCapital>\n`;
    Object.values(report.monthly).forEach(data => {
      if (data.gcap.valor > 0) {
        xml += `    <GCAP valor="${data.gcap.valor.toFixed(2)}" codigo="${data.gcap.codigo}" vencimento="${data.gcap.vencimento}" />\n`;
      }
    });
    xml += `  </GanhosCapital>\n`;
    
    // Prejuízos a compensar
    xml += `  <PrejuizosACompensar>\n`;
    Object.entries(report.annualTotals.lossCarryforward).forEach(([cat, val]) => {
      if (val > 0) xml += `    <${cat}>${val.toFixed(2)}</${cat}>\n`;
    });
    xml += `  </PrejuizosACompensar>\n`;
    
    // Bens e direitos (posições em 31/12)
    xml += `  <BensDireitos>\n`;
    Object.values(report.positions).forEach(pos => {
      xml += `    <Bem codigo="${this._getBensCodigo(pos.assetClass)}" descricao="${pos.name} (${pos.ticker}) - ${pos.qty} cotas/ações" valor="${pos.totalCost.toFixed(2)}" />\n`;
    });
    xml += `  </BensDireitos>\n`;
    
    xml += `</DeclaraçãoAjusteAnual>`;
    
    return xml;
  }
  
  _getBensCodigo(assetClass) {
    const codes = {
      'acao': '31',      // Ações
      'fii': '32',       // Fundos imobiliários
      'etf': '33',       // ETFs
      'bdr': '34',       // BDRs
      'cripto': '35',    // Criptoativos
      'exterior': '36',  // Investimentos exterior
      'imovel': '11',    // Imóveis
      'veiculo': '12'    // Veículos
    };
    return codes[assetClass] || '99';
  }
  
  /**
   * Gera DARFs individuais para pagamento
   */
  generateDARFs() {
    this.processMonthly();
    const darfList = [];
    
    Object.entries(this.monthlySummary).forEach(([month, data]) => {
      if (data.darf.valor > 0.01) { // mínimo R$ 0,01
        darfList.push({
          month,
          valor: data.darf.valor,
          codigo: data.darf.codigo,
          vencimento: data.darf.vencimento,
          breakdown: data.darf.breakdown,
          barcode: this._generateDARFBarcode(data.darf.valor, data.darf.codigo, data.darf.vencimento)
        });
      }
      if (data.gcap.valor > 0.01) {
        darfList.push({
          month,
          tipo: 'GCAP',
          valor: data.gcap.valor,
          codigo: data.gcap.codigo,
          vencimento: data.gcap.vencimento,
          barcode: this._generateDARFBarcode(data.gcap.valor, data.gcap.codigo, data.gcap.vencimento)
        });
      }
    });
    
    return darfList;
  }
  
  _generateDARFBarcode(valor, codigo, vencimento) {
    // Gera código de barras DARF simplificado (formato real é mais complexo)
    const valorStr = Math.round(valor * 100).toString().padStart(12, '0');
    const dataStr = vencimento.replace(/-/g, '');
    return `${codigo}${valorStr}${dataStr}00000000`;
  }
  
  /**
   * Calcula IRPF anual (simplificado)
   */
  calculateAnnualIRPF(otherIncome = 0) {
    const report = this.generateAnnualReport();
    const totalTaxableIncome = otherIncome + report.annualTotals.incomeTotals.jcp + report.annualTotals.incomeTotals.aluguel_exterior;
    const totalIRRF = report.annualTotals.incomeTotals.irrfRetido + report.annualTotals.darfTotal;
    
    // Calcula imposto devido pela tabela progressiva
    let taxDue = 0;
    let remaining = totalTaxableIncome;
    
    for (const bracket of this.irpfBrackets) {
      const taxableInBracket = Math.min(remaining, bracket.max - bracket.min + 1);
      if (taxableInBracket <= 0) break;
      taxDue += taxableInBracket * bracket.rate;
      remaining -= taxableInBracket;
    }
    
    taxDue -= this.irpfBrackets.find(b => totalTaxableIncome > b.min && totalTaxableIncome <= b.max)?.deducao || 0;
    taxDue = Math.max(0, taxDue);
    
    const balance = totalIRRF - taxDue;
    
    return {
      totalTaxableIncome,
      taxDue: Math.round(taxDue * 100) / 100,
      totalIRRF: Math.round(totalIRRF * 100) / 100,
      balance: Math.round(balance * 100) / 100, // positivo = restituição, negativo = pagar
      status: balance >= 0 ? 'RESTITUIÇÃO' : 'IMPOSTO A PAGAR'
    };
  }
}

window.TaxEngine = TaxEngine;

// Uso:
// const tax = new TaxEngine({ year: 2024 });
// tax.addOperation({ date: '2024-03-15', type: 'buy', assetClass: 'acao', ticker: 'PETR4', quantity: 100, price: 35.50, fees: 15 });
// tax.addOperation({ date: '2024-03-20', type: 'sell', assetClass: 'acao', ticker: 'PETR4', quantity: 50, price: 38.00, fees: 10 });
// tax.addIncome({ date: '2024-04-10', type: 'dividendo', assetClass: 'acao', ticker: 'PETR4', grossValue: 500 });
// tax.processMonthly();
// console.log(tax.generateAnnualReport());
// console.log(tax.exportToIRPFXML());
// console.log(tax.generateDARFs());