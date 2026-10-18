#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Reconstrói carteira-data.js a partir dos extratos reais (Inter PDFs + XP XLSX + B3 movimentação).

Pipeline: FILE -> DETECT -> PARSE -> NORMALIZE -> VALIDATE -> DEDUP -> WRITE
Fontes (17/10/2026):
  - extrato-posicao-renda-variavel (2).pdf   (Inter — posições RV)
  - extrato-posicao-renda-fixa (2).pdf        (Inter — CDB Porquinho + LIG)
  - PosicaoDetalhada (1).xlsx                 (XP — RF + Fundos)
  - movimentacao-*.xlsx                       (B3 — proventos e lançamentos)

KPIs (fórmulas documentadas):
  invested    = Σ(avgPrice × qty)
  total       = Σ(value)
  capitalGain = total - invested
  dividends   = Σ(earnings.net)                  (histórico completo)
  earnings12m = Σ(earnings.net) últimos 365 dias
  profit      = capitalGain + dividends
  returnTotal = profit / invested × 100
  return12m  = Σ(monthly.gain últimos 12) / invested[início da janela] × 100  (aprox. documentada)
  yield12m   = earnings12m / total × 100

Uso:
  uv run --with pdfplumber --with openpyxl python scripts/rebuild_carteira_data.py [--data-dir DIR] [--dry-run]
"""
import pdfplumber, openpyxl, os, re, json, sys, glob
from datetime import datetime, date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = r'C:/Users/Paulinho/AppData/Local/hermes/attachments'

args = sys.argv[1:]
DRY = '--dry-run' in args
DATA_DIR = DEFAULT_DATA_DIR
if '--data-dir' in args:
    DATA_DIR = args[args.index('--data-dir') + 1]

TODAY = date(2026, 10, 17)  # posição em 17/10/2026 (data dos extratos)

def br_to_f(s):
    return float(str(s).replace('R$', '').replace('.', '').replace(',', '.').strip())

def find_one(pattern):
    matches = glob.glob(os.path.join(DATA_DIR, pattern))
    if not matches:
        raise FileNotFoundError(f'Arquivo não encontrado: {pattern} em {DATA_DIR}')
    matches.sort(key=os.path.getmtime)
    return matches[-1]

# ============ 1. PARSE RV PDF (Inter) ============
def parse_rv_pdf():
    path = find_one('extrato-posicao-renda-variavel*.pdf')
    with pdfplumber.open(path) as pdf:
        full = '\n'.join((p.extract_text() or '') for p in pdf.pages)
    lines = [l.strip() for l in full.split('\n')]
    out = []
    i = 0
    row_re = re.compile(
        r'^([\d.]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+(-?[\d.,]+)\s+(-?R\$\s*[\d.,]+)$')
    while i < len(lines):
        if re.match(r'^[A-Z]{4}\d{1,2}$', lines[i]) and i + 2 < len(lines):
            m = row_re.match(lines[i + 2])
            if m:
                out.append({
                    'ticker': lines[i],
                    'qty': float(m.group(1).replace('.', '')),
                    'avgPrice': br_to_f(m.group(2)),
                    'cost': br_to_f(m.group(3)),
                    'currentPrice': br_to_f(m.group(4)),
                    'value': br_to_f(m.group(5)),
                    'ret': float(m.group(6).replace(',', '.')),
                })
                i += 3
                continue
        i += 1
    return out

# ============ 2. PARSE RF PDF (Inter) ============
def parse_rf_pdf():
    path = find_one('extrato-posicao-renda-fixa*.pdf')
    with pdfplumber.open(path) as pdf:
        full = '\n'.join((p.extract_text() or '') for p in pdf.pages)
    sections = {}
    cur = None
    for l in full.split('\n'):
        ls = l.strip()
        m = re.match(r'^(CDB PORQUINHO OBJETIVO|LIG LIQUIDEZ)$', ls)
        if m:
            cur = m.group(1)
            sections[cur] = {}
            continue
        if cur:
            t = re.match(r'^Valor Bruto Total:\s*R\$\s*([\d.,]+)\s+Valor Líquido Total:\s*R\$\s*([\d.,]+)\s+Valor Aplicado Total:\s*R\$\s*([\d.,]+)', ls)
            if t and 'bruto' not in sections[cur]:
                sections[cur] = {'bruto': br_to_f(t.group(1)), 'liquido': br_to_f(t.group(2)), 'aplicado': br_to_f(t.group(3))}
    # valida CDB somando as notas
    note_re = re.compile(
        r'^(\d{7,})\s+(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})\s+R\$\s*([\d.,]+)\s+CDB\s+(.+?)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)')
    n_cdb, sum_ap, sum_br = 0, 0.0, 0.0
    for l in full.split('\n'):
        m = note_re.match(l.strip())
        if m:
            n_cdb += 1
            sum_ap += br_to_f(m.group(4))
            sum_br += br_to_f(m.group(9))
    assert abs(sum_ap - sections['CDB PORQUINHO OBJETIVO']['aplicado']) < 0.05, f'CDB aplicado divergente: {sum_ap} vs {sections["CDB PORQUINHO OBJETIVO"]["aplicado"]}'
    assert abs(sum_br - sections['CDB PORQUINHO OBJETIVO']['bruto']) < 0.05, f'CDB bruto divergente: {sum_br} vs {sections["CDB PORQUINHO OBJETIVO"]["bruto"]}'
    sections['_cdb_notas'] = n_cdb
    return sections

# ============ 3. PARSE XP PosicaoDetalhada ============
def parse_xp():
    path = find_one('PosicaoDetalhada*.xlsx')
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    def money(v):
        if v is None: return None
        return br_to_f(v)
    rf, funds, total_pat = [], [], None
    section = None
    for r in rows:
        c0 = str(r[0]).strip() if r[0] else ''
        if c0 == 'Renda Fixa': section = 'rf'; continue
        if c0.startswith('Fundos de Invest'): section = 'funds'; continue
        if c0.startswith('Dividendos'): section = None; continue
        if section == 'rf' and ('DEB' in c0 or 'CRA' in c0):
            rf.append({'name': c0, 'value': money(r[1]), 'aplicado': money(r[3]), 'taxa': str(r[5] or '').strip(), 'venc': str(r[7] or '').strip()})
        if section == 'funds' and 'Trend' in c0:
            funds.append({'name': c0, 'value': money(r[3]), 'aplicado': money(r[5])})
    # total patrimônio: primeira célula "R$ x" da planilha (linha do cabeçalho pessoal)
    total_pat = None
    m = None
    for r in rows:
        if r[0] and re.match(r'^R\$\s*[\d.,]+$', str(r[0]).strip()):
            m = br_to_f(str(r[0]).strip()); break
    total_pat = m
    assert total_pat is not None, 'Total do XP não encontrado'
    soma = sum(x['value'] for x in rf) + sum(x['value'] for x in funds)
    assert abs(soma - total_pat) < 0.5, f'XP: soma das seções {soma:.2f} != total {total_pat:.2f}'
    return {'rf': rf, 'funds': funds, 'total': total_pat}

# ============ 4. PARSE + DEDUP MOVIMENTAÇÃO (B3) ============
def parse_movimentos():
    movs = []
    seen = set()
    files = sorted(glob.glob(os.path.join(DATA_DIR, 'movimentacao-*.xlsx')))
    files = [f for f in files if '2026-10-17' in os.path.basename(f)] or files[-2:]
    for path in files:
        wb = openpyxl.load_workbook(path, data_only=True)
        ws = wb['Movimentação']
        for row in ws.iter_rows(min_row=2, values_only=True):
            es, dt, mov, prod, inst, qtd, preco, valor = row
            if not (dt and mov and prod):
                continue
            try:
                d = datetime.strptime(str(dt), '%d/%m/%Y').date()
            except ValueError:
                continue
            def fnum(v):
                try:
                    if v in (None, '', '-'): return 0.0
                    return float(v)
                except Exception:
                    return 0.0
            preco_val, valor_val, qtd_val = fnum(preco), fnum(valor), fnum(qtd)
            # dedup por linha INTEIRA (inclui Entrada/Saída) — os dois arquivos
            # exportados pela B3 são sobrepostos; linhas idênticas = mesmo evento
            key = (str(es), str(dt), str(mov), str(prod), qtd_val, preco_val, valor_val)
            if key in seen:
                continue
            seen.add(key)
            movs.append({'date': d, 'es': str(es), 'mov': str(mov), 'produto': str(prod), 'qtd': qtd_val, 'preco': preco_val, 'valor': valor_val})
    movs.sort(key=lambda x: x['date'])
    return movs

# ============ EXECUÇÃO ============
print('=== 1/6 Parsing das fontes ===')
rv = parse_rv_pdf()
rf = parse_rf_pdf()
xp = parse_xp()
movs = parse_movimentos()
print(f'  RV: {len(rv)} posições | CDB: {rf["_cdb_notas"]} notas | XP total: R$ {xp["total"]:,.2f} | movimentos únicos: {len(movs)}')

# dado antigo (validado 10/10) — base para histórico de patrimônio/invested,
# lista de lançamentos e comparação final
with open(os.path.join(REPO, 'carteira-data.js'), encoding='utf-8') as f:
    old_raw = f.read()
OLD = json.loads(old_raw.split('window.CARTEIRA_DATA = ')[1].rsplit(';', 1)[0].strip())

# earnings: dividendos, JCP e rendimentos.
# REGRA "Transferido": pares Debito+Credito do mesmo evento (ex.: "Dividendo -
# Transferido" com data/produto/qtd/valor idênticos) são as duas pernas da MESMA
# transferência entre contas → conta UMA vez (a perna Credito). O dado antigo
# contava as duas pernas (inflava ~R$ 8,5k em dividendos históricos).
earnings = []
_seen_earn = set()
for m in movs:
    mu = m['mov'].upper()
    # P-NIGHT: 'PAGAMENTO DE JUROS' = juros de debêntura (DEB/CRA) — renda real,
    # tipificada como 'interest' (o dado antigo também as tinha)
    if ('DIVIDEND' in mu or 'JUROS SOBRE CAPITAL' in mu or mu == 'RENDIMENTO'
            or mu == 'PAGAMENTO DE JUROS'):
        group_key = (m['date'], m['mov'], m['produto'], m['qtd'], m['preco'], m['valor'])
        is_transfer = 'TRANSFERIDO' in mu
        if is_transfer:
            # mantém apenas uma perna por grupo: prefere Credito
            prefer = 'Credito' if any(x['es'] == 'Credito' and (x['date'], x['mov'], x['produto'], x['qtd'], x['preco'], x['valor']) == group_key for x in movs) else m['es']
            if m['es'] != prefer:
                continue
            if group_key in _seen_earn:
                continue
            _seen_earn.add(group_key)
        ticker = m['produto'].split()[0]
        name = ' '.join(m['produto'].split(' - ', 1)[1].split())[:40] if ' - ' in m['produto'] else ticker
        gross = round(m['valor'], 2)
        etype = 'jcp' if 'JUROS SOBRE CAPITAL' in mu else ('interest' if mu == 'PAGAMENTO DE JUROS' else 'dividend')
        earnings.append({
            'date': m['date'].isoformat(),
            'ticker': ticker,
            'name': name,
            'type': etype,
            'perShare': round(m['preco'], 4),
            'qty': m['qtd'],
            'gross': gross,
            'tax': 0,
            'net': gross,
        })
earnings.sort(key=lambda x: x['date'])  # ASC — convenção do dataset: [0] = mais antigo (2019)
print(f'  earnings: {len(earnings)}')

# entries: histórico validado (10/10) + eventos novos (09-15/10/2026).
# Os "lançamentos" do app representam operações da carteira — mantemos a lista
# aprovada e anexamos apenas a semana nova (TL com valor + trades COMPRA/VENDA),
# sem inundar com 3.143 day-trades de 2020 (feature futura com o dono acordado).
OLD_ENTRIES = OLD['entries']
NEW_CUTOFF = datetime(2026, 10, 9).date()
new_events = []
tl_keys = set()
for m in movs:
    if m['date'] < NEW_CUTOFF or m['valor'] <= 0:
        continue
    if m['mov'] in ('Transferência - Liquidação', 'COMPRA', 'VENDA'):
        ticker = m['produto'].split()[0]
        name = ' '.join(m['produto'].split(' - ', 1)[1].split())[:40] if ' - ' in m['produto'] else ticker
        new_events.append({
            'date': m['date'].isoformat(),
            'ticker': ticker,
            'name': name,
            'type': 'buy' if m['es'] == 'Credito' else 'sell',
            'qty': m['qtd'],
            'price': round(m['preco'], 2),
            'value': round(m['valor'], 2),
            'fees': 0,
            'source': 'B3',
        })
# dedup contra a lista antiga (mesmo evento já registrado)
old_keys = set((e['date'], e['ticker'], round(float(e['qty']), 2), round(float(e['value']), 2)) for e in OLD_ENTRIES)
# eventos TL e trade da mesma operação (liquidação D+2): dedup interno por (ticker, qtd, valor)
by_op = {}
for e in new_events:
    k = (e['ticker'], round(float(e['qty']), 2), round(abs(float(e['value'])), 2))
    by_op.setdefault(k, []).append(e)
deduped_new = []
for k, evs in by_op.items():
    # mantém o mais recente (liquidação preferida sobre o trade de mesmo valor)
    best = sorted(evs, key=lambda x: x['date'])[-1]
    ok = (best['date'], best['ticker'], round(float(best['qty']), 2), round(float(best['value']), 2))
    if ok not in old_keys:
        deduped_new.append(best)
entries = OLD_ENTRIES + deduped_new
entries.sort(key=lambda x: x['date'], reverse=True)
print(f'  entries: {len(entries)} (antigos {len(OLD_ENTRIES)} + novos {len(deduped_new)})')

print('=== 2/6 Série mensal de proventos (rebuild completo) ===')
# ganho mensal = Σ net de earnings no mês (série TODA reconstruída da fonte
# corrigida — o dado antigo tinha os pares "Transferido" duplicados)
gains_by_month = {}
for e in earnings:
    d = datetime.fromisoformat(e['date'])
    key = d.strftime('%m/%Y')
    gains_by_month[key] = gains_by_month.get(key, 0) + e['net']

MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
def month_key_to_label(k):
    mm, yyyy = k.split('/')
    return f'{MESES[int(mm)-1]}/{yyyy[2:]}'

# valida meses históricos (até Set/26): imprime divergências para inspeção
# (esperado: meses com pares "Transferido" caem pela metade — correção de dupla contagem)
divergencias = 0
for m in OLD['monthly']:
    label = m['period']
    mes_idx = [i for i, s in enumerate(MESES) if label.startswith(s)][0]
    yyyy = '20' + label.split('/')[1]
    k = f'{mes_idx+1:02d}/{yyyy}'
    novo = round(gains_by_month.get(k, 0), 2)
    if abs(novo - m['gain']) > 0.5 and label != 'Out/26':
        divergencias += 1
print(f'  meses com ganho corrigido vs antigo: {divergencias} (pares Transferido contados 2x antes)')

# série mensal: invested HISTÓRICO preservado (aportes reais por mês) +
# gain RECONSTRUÍDO dos earnings corrigidos
monthly = []
for m in OLD['monthly']:
    label = m['period']
    mes_idx = [i for i, s in enumerate(MESES) if label.startswith(s)][0]
    yyyy = '20' + label.split('/')[1]
    k = f'{mes_idx+1:02d}/{yyyy}'
    monthly.append({'period': label, 'invested': m['invested'], 'gain': round(gains_by_month.get(k, 0), 2)})
old_out_invested = OLD['monthly'][-1]['invested'] if OLD['monthly'][-1]['period'] == 'Out/26' else OLD['monthly'][-2]['invested']

print('=== 3/6 Posições (RV + RF + Fundos) ===')
positions = []
name_by_ticker = {}
for m in movs:
    t = m['produto'].split()[0]
    if t not in name_by_ticker and ' - ' in m['produto']:
        name_by_ticker[t] = ' '.join(m['produto'].split(' - ', 1)[1].split())[:40]

STOCKS = {'BBAS3','ITUB4','CMIG4','SAPR11','PETR4','VALE3','SUZB3'}
for p in rv:
    t = p['ticker']
    cls = 'stocks' if t in STOCKS else ('fiis' if re.match(r'^[A-Z]{4}11$', t) else ('fiis' if t.endswith('11') or t.endswith('12') else 'stocks'))
    positions.append({
        'ticker': t,
        'name': name_by_ticker.get(t, t),
        'class': cls,
        'qty': p['qty'],
        'avgPrice': round(p['avgPrice'], 2),
        'currentPrice': round(p['currentPrice'], 2),
        'value': round(p['value'], 2),
        'pl': round(p['value'] - p['cost'], 2),
        'ret': round(p['ret'], 2),
        'cost': round(p['cost'], 2),
        'weight': 0, 'dy': 0,
    })
# BTLG12 (direito de subscrição ainda sem preço) já vem do parse (value 0) — incluído acima

cdb = rf['CDB PORQUINHO OBJETIVO']
lig = rf['LIG LIQUIDEZ']
positions.append({'ticker': 'CDB-PORQ', 'name': f'CDB Inter 100% CDI ({rf["_cdb_notas"]} titulos consolidados)', 'class': 'fixed',
                  'qty': 1, 'avgPrice': round(cdb['aplicado'], 2), 'currentPrice': round(cdb['bruto'], 2), 'value': round(cdb['bruto'], 2),
                  'pl': round(cdb['bruto'] - cdb['aplicado'], 2), 'ret': round((cdb['bruto']/cdb['aplicado']-1)*100, 2), 'cost': round(cdb['aplicado'], 2), 'weight': 0, 'dy': 0})
positions.append({'ticker': 'LIG-LIQ', 'name': 'LIG Liquidez Inter (consolidado)', 'class': 'fixed',
                  'qty': 1, 'avgPrice': round(lig['aplicado'], 2), 'currentPrice': round(lig['bruto'], 2), 'value': round(lig['bruto'], 2),
                  'pl': round(lig['bruto'] - lig['aplicado'], 2), 'ret': round((lig['bruto']/lig['aplicado']-1)*100, 2), 'cost': round(lig['aplicado'], 2), 'weight': 0, 'dy': 0})
for x in xp['rf']:
    t = 'DEBMOV' if 'MOVIDA' in x['name'] else 'CRAJBS'
    positions.append({'ticker': t, 'name': x['name'], 'class': 'fixed',
                     'qty': 1, 'avgPrice': round(x['aplicado'], 2), 'currentPrice': round(x['value'], 2), 'value': round(x['value'], 2),
                     'pl': round(x['value'] - x['aplicado'], 2), 'ret': round((x['value']/x['aplicado']-1)*100, 2), 'cost': round(x['aplicado'], 2), 'weight': 0, 'dy': 0})
for x in xp['funds']:
    t = 'TRENDDI' if x['name'].startswith('Trend DI FIC') else 'TRENDD2'
    positions.append({'ticker': t, 'name': x['name'] + ' (XP)', 'class': 'funds',
                     'qty': 1, 'avgPrice': round(x['aplicado'], 2), 'currentPrice': round(x['value'], 2), 'value': round(x['value'], 2),
                     'pl': round(x['value'] - x['aplicado'], 2), 'ret': round((x['value']/x['aplicado']-1)*100, 2), 'cost': round(x['aplicado'], 2), 'weight': 0, 'dy': 0})

total = round(sum(p['value'] for p in positions), 2)
invested = round(sum(p['avgPrice'] * p['qty'] for p in positions), 2)

print(f'  posições: {len(positions)} | total: R$ {total:,.2f} | invested: R$ {invested:,.2f}')

# weights + dy
for p in positions:
    p['weight'] = round(p['value'] / total * 100, 2) if total > 0 else 0
cutoff12 = datetime(TODAY.year - 1, TODAY.month, TODAY.day).date()
divs_per_ticker = {}
for e in earnings:
    d = datetime.fromisoformat(e['date']).date()
    if d >= cutoff12:
        divs_per_ticker[e['ticker']] = divs_per_ticker.get(e['ticker'], 0) + e['perShare']
for p in positions:
    ps = divs_per_ticker.get(p['ticker'], 0)
    p['dy'] = round(ps / p['currentPrice'] * 100, 2) if p['currentPrice'] > 0 and ps > 0 else 0

print('=== 4/6 KPIs ===')
dividends = round(sum(e['net'] for e in earnings), 2)
earnings12m = round(sum(e['net'] for e in earnings if datetime.fromisoformat(e['date']).date() >= cutoff12), 2)
capitalGain = round(total - invested, 2)
profit = round(capitalGain + dividends, 2)
returnTotal = round(profit / invested * 100, 2) if invested > 0 else 0

# série mensal: último ponto = invested e total atuais (Out/26)
monthly[-1]['invested'] = invested
# return12m = Σgains últimos 12 meses / invested no início da janela
last12 = monthly[-12:]
g12 = sum(m['gain'] for m in last12)
inv_start = monthly[-13]['invested'] if len(monthly) >= 13 else monthly[0]['invested']
return12m = round(g12 / inv_start * 100, 2) if inv_start > 0 else 0
yield12m = round(earnings12m / total * 100, 2) if total > 0 else 0

kpis = {
    'total': total, 'invested': invested, 'profit': profit, 'capitalGain': capitalGain,
    'dividends': dividends, 'earnings12m': earnings12m,
    'totalChange': return12m, 'return12m': return12m, 'returnTotal': returnTotal, 'yield12m': yield12m,
}

print(f'  total {total:,.2f} | invested {invested:,.2f} | capGain {capitalGain:,.2f} | dividends {dividends:,.2f}')
print(f'  earnings12m {earnings12m:,.2f} | return12m {return12m}% | returnTotal {returnTotal}% | yield12m {yield12m}%')

print('=== 5/6 Patrimônio, alocação e assetReturns ===')
P = OLD['patrimony']
P['portfolio'][-1] = total
P['invested'][-1] = invested
classes_map = {'stocks': 'Ações', 'fiis': 'FIIs', 'fixed': 'Renda Fixa', 'etfs': 'ETFs', 'funds': 'Fundos', 'crypto': 'Criptos', 'other': 'Outros'}
colors_map = {'stocks': '#1A73E8', 'fiis': '#34A853', 'fixed': '#3730A3', 'etfs': '#F9AB00', 'funds': '#8B5CF6', 'crypto': '#F7931A', 'other': '#80868B'}
class_agg = {}
for p in positions:
    class_agg[p['class']] = class_agg.get(p['class'], 0) + p['value']
by_class = [{'name': classes_map.get(c, c), 'value': round(v, 2), 'pct': round(v/total*100, 1), 'color': colors_map.get(c, '#80868B')}
            for c, v in sorted(class_agg.items(), key=lambda x: -x[1])]
by_asset = [{'name': p['ticker'], 'class': p['class'], 'value': p['value'], 'pct': p['weight'], 'return': p['ret']}
            for p in sorted(positions, key=lambda x: -x['value'])]
asset_returns = [{'ticker': p['ticker'], 'class': p['class'], 'weight': p['weight'], 'return': p['ret'],
                  'contrib': round(p['ret'] * p['value'] / total / 100, 3), 'benchmark': return12m,
                  'alpha': round(p['ret'] - return12m, 2)} for p in positions]

carteira = {
    'kpis': kpis,
    'monthly': monthly,
    'patrimony': P,
    'allocation': {'byAsset': by_asset, 'byClass': by_class},
    'positions': positions,
    'earnings': earnings,
    'entries': entries,
    'assetReturns': asset_returns,
}

print('=== 6/6 Validação final ===')
ok = True
checks = [
    ('posições >= 35', len(positions) >= 35),
    ('total 600k-800k', 600000 < total < 800000),
    ('invested < total*1.05', invested < total * 1.05),
    ('dividends 100k-160k', 100000 < dividends < 160000),
    ('patrimônio 84 pontos', len(P['labels']) == 84 and len(P['portfolio']) == 84),
    ('monthly 84 pontos', len(monthly) == 84),
    ('Σ monthly.gain == dividends', abs(sum(m['gain'] for m in monthly) - dividends) < 1),
    ('earnings > 2000', len(earnings) > 2000),
]
for name, cond in checks:
    print(f'  [{"OK" if cond else "FALHOU"}] {name}')
    ok = ok and cond

print(f'\nComparativo com dado antigo (10/10):')
print(f'  total:     {OLD["kpis"]["total"]:,.2f} -> {total:,.2f}')
print(f'  invested:  {OLD["kpis"]["invested"]:,.2f} -> {invested:,.2f}')
print(f'  dividends: {OLD["kpis"]["dividends"]:,.2f} -> {dividends:,.2f}  (correção: pares "Transferido" não contam 2x)')
print(f'  posições:  {len(OLD["positions"])} -> {len(positions)}')
print(f'  earnings:  {len(OLD["earnings"])} -> {len(earnings)} | entries: {len(OLD["entries"])} -> {len(entries)}')
print(f'  Out/26 gain: {OLD["monthly"][-1]["gain"]} -> {monthly[-1]["gain"]}')

if not ok:
    print('\nVALIDAÇÃO FALHOU — carteira-data.js NÃO foi escrito. Use --dry-run implícito.')
    sys.exit(1)
if DRY:
    print('\n--dry-run: carteira-data.js NÃO foi escrito.')
    sys.exit(0)

out_path = os.path.join(REPO, 'carteira-data.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('window.CARTEIRA_DATA = ')
    json.dump(carteira, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print(f'\ncarteira-data.js escrito com sucesso: {out_path}')
