import json
from datetime import datetime

# Load parsed data
with open('parsed_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

renda_var = data['renda_variavel']
mov = data['movimentacoes']
acoes_xlsx = data['posicoes_acoes']
fiis_xlsx = data['posicoes_fiis']
rf_xlsx = data['posicoes_rf']

# Create lookup maps for renda_variavel (has avg price and current price)
rv_by_ticker = {p['ticker']: p for p in renda_var}

# Build positions for dashboard
posicoes = []

# Add acoes - merge XLSX with PDF data
for p in acoes_xlsx:
    ticker = p['ticker']
    rv = rv_by_ticker.get(ticker, {})
    avg_price = rv.get('preco_medio', p['preco_fechamento'])
    current_price = rv.get('preco_atual', p['preco_fechamento'])
    
    pos = {
        'ticker': ticker,
        'name': p['produto'],
        'qty': p['quantidade'],
        'avgPrice': avg_price,
        'currentPrice': current_price,
        'value': current_price * p['quantidade'],
        'class': 'stocks'
    }
    pos['pl'] = (current_price - avg_price) * p['quantidade']
    pos['return'] = (current_price / avg_price - 1) * 100 if avg_price > 0 else 0
    posicoes.append(pos)

# Add FIIs - merge XLSX with PDF data
for p in fiis_xlsx:
    ticker = p['ticker']
    rv = rv_by_ticker.get(ticker, {})
    avg_price = rv.get('preco_medio', p['preco_fechamento'])
    current_price = rv.get('preco_atual', p['preco_fechamento'])
    
    pos = {
        'ticker': ticker,
        'name': p['produto'],
        'qty': p['quantidade'],
        'avgPrice': avg_price,
        'currentPrice': current_price,
        'value': current_price * p['quantidade'],
        'class': 'fiis'
    }
    pos['pl'] = (current_price - avg_price) * p['quantidade']
    pos['return'] = (current_price / avg_price - 1) * 100 if avg_price > 0 else 0
    posicoes.append(pos)

# Add RF - use XLSX data (MTM prices)
for p in rf_xlsx:
    if p['valor_mtm'] > 0:
        pos = {
            'ticker': p.get('codigo', p['produto'][:10]),
            'name': p['produto'],
            'qty': p['quantidade'],
            'avgPrice': p['preco_mtm'] if p['preco_mtm'] > 0 else 1,
            'currentPrice': p['preco_mtm'] if p['preco_mtm'] > 0 else 1,
            'value': p['valor_mtm'],
            'class': 'fixed'
        }
        pos['pl'] = 0
        pos['return'] = 0
        posicoes.append(pos)

# Calculate totals
total_value = sum(p['value'] for p in posicoes)
total_invested = sum(p['qty'] * p['avgPrice'] for p in posicoes if p['avgPrice'] > 0)
total_pl = sum(p['pl'] for p in posicoes)
total_return = (total_value / total_invested - 1) * 100 if total_invested > 0 else 0

# Yield 12M - sum of dividend values from renda variavel
yield_12m = sum(p['retorno_valor'] for p in renda_var)

# Capital gain - only from stocks
capital_gain = sum(p['pl'] for p in posicoes if p['class'] == 'stocks')

kpis = {
    'total': total_value,
    'invested': total_invested,
    'pl': total_pl,
    'returnTotal': total_return,
    'yield12m': yield_12m,
    'capitalGain': capital_gain
}

print('KPIs:', json.dumps(kpis, indent=2))
print('Total posicoes:', len(posicoes))

# Build portfolio series from movimentacoes
# Group by month and calculate portfolio value
monthly = {}
for m in mov:
    if m['data']:
        try:
            dt = datetime.fromisoformat(m['data'])
            month_key = dt.strftime('%Y-%m')
            if month_key not in monthly:
                monthly[month_key] = {'value': 0, 'invested': 0, 'gain': 0}
            
            if m['movimentacao'] == 'APLICAÇÃO':
                monthly[month_key]['invested'] += m['valor']
            elif m['movimentacao'] == 'RESGATE':
                monthly[month_key]['invested'] -= m['valor']
            elif m['movimentacao'] == 'DIVIDENDOS' or m['movimentacao'] == 'JUROS SOBRE CAPITAL PRÓPRIO':
                monthly[month_key]['gain'] += m['valor']
        except:
            pass

# Sort months
sorted_months = sorted(monthly.keys())
portfolio_series = []
cumulative_invested = 0
cumulative_gain = 0

for month in sorted_months:
    cumulative_invested += monthly[month]['invested']
    cumulative_gain += monthly[month]['gain']
    portfolio_series.append({
        'date': month,
        'value': cumulative_invested + cumulative_gain,
        'invested': cumulative_invested,
        'gain': cumulative_gain
    })

print('Portfolio series:', len(portfolio_series))

# Class allocation
class_allocation = {}
for p in posicoes:
    cls = p['class']
    if cls not in class_allocation:
        class_allocation[cls] = {'value': 0, 'invested': 0}
    class_allocation[cls]['value'] += p['value']
    class_allocation[cls]['invested'] += p['qty'] * p['avgPrice']

# Build class returns table
class_returns = []
for cls, data in class_allocation.items():
    ret = (data['value'] / data['invested'] - 1) * 100 if data['invested'] > 0 else 0
    class_returns.append({
        'class': cls,
        'value': data['value'],
        'invested': data['invested'],
        'return': ret,
        'pct': (data['value'] / total_value * 100) if total_value > 0 else 0
    })

# Dividend history from movimentacoes
dividends = [m for m in mov if m['movimentacao'] in ['DIVIDENDOS', 'JUROS SOBRE CAPITAL PRÓPRIO']]
print(f'Dividendos: {len(dividends)}')

# Monthly dividend summary
div_monthly = {}
for d in dividends:
    try:
        dt = datetime.fromisoformat(d['data'])
        month_key = dt.strftime('%Y-%m')
        if month_key not in div_monthly:
            div_monthly[month_key] = 0
        div_monthly[month_key] += d['valor']
    except:
        pass

# Top dividend payers
div_by_ticker = {}
for d in dividends:
    ticker = d['produto'].split()[0] if d['produto'] else 'Unknown'
    if ticker not in div_by_ticker:
        div_by_ticker[ticker] = 0
    div_by_ticker[ticker] += d['valor']

# Build dashboard data structure matching the expected format
dashboard_data = {
    'kpis': kpis,
    'positions': posicoes,
    'portfolioSeries': portfolio_series,
    'classReturns': class_returns,
    'dividendHistory': {
        'monthly': div_monthly,
        'byTicker': div_by_ticker
    },
    'movimentacoes': mov[:1000],  # Limit for performance
    'extractedAt': datetime.now().isoformat()
}

with open('carteira-data-real.json', 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print('Real data saved to carteira-data-real.json')
print('KPIs:', json.dumps(kpis, indent=2))
"