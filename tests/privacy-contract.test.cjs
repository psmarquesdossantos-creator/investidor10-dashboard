const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

const root = process.cwd();
function loadGlobal(file, key) {
  const context = { window: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { timeout: 1000 });
  return context.window[key];
}

test('demo fixture is small, synthetic, and independent from local wallet files', () => {
  const fixture = loadGlobal('src/auth/demo-fixture.js', 'DEMO_FIXTURE');
  const source = fs.readFileSync(path.join(root, 'src/auth/demo-fixture.js'), 'utf8');
  assert.equal(fixture.meta.source, 'demo');
  assert.equal(fixture.meta.synthetic, true);
  assert.equal(fixture.positions.length, 21);
  assert.ok(fixture.positions.every(p => p.ticker.startsWith('SYN-') && p.id.startsWith('demo-')));
  assert.ok(fixture.positions.some(p => p.class === 'funds'));
  assert.ok(fixture.earnings.length >= 3);
  assert.ok(fixture.positions.every(p => p.value === p.qty * p.currentPrice && p.invested === p.qty * p.avgPrice));
  assert.equal(/carteira-data\.js|localStorage|__CARTEIRA_OVERRIDE__/.test(source), false);
  assert.equal(fixture.kpis.total, fixture.positions.reduce((sum, p) => sum + p.value, 0));
});

test('published sample and backup fixture contain only synthetic identity and finance data', () => {
  const sample = loadGlobal('carteira-data.sample.js', 'CARTEIRA_DATA');
  assert.equal(sample.meta.synthetic, true);
  assert.equal(sample.meta.source, 'sample');
  assert.ok(sample.positions.length > 0);
  assert.ok(sample.assets.every((asset, i) => asset.ticker === `SYN-${String(i + 1).padStart(2, '0')}` && /^Ativo Sintético /.test(asset.name)));
  assert.ok(sample.assets.every((asset, i) => asset.qty === 1 + (i % 4) && asset.avgPrice === 10 + i && asset.currentPrice === 11 + i && asset.idealPerc === 5 + (i % 4)));
  assert.ok(sample.positions.every(position => /^SYN-\d{2}$/.test(position.ticker) && /^Ativo Sintético /.test(position.name)));
  assert.ok(sample.positions.every(position => position.value === position.qty * position.currentPrice && position.invested === position.qty * position.avgPrice));
  const sampleStrings = [];
  const collectStrings = value => {
    if (Array.isArray(value)) return value.forEach(collectStrings);
    if (value && typeof value === 'object') return Object.values(value).forEach(collectStrings);
    if (typeof value === 'string') sampleStrings.push(value);
  };
  collectStrings(sample);
  assert.equal(sampleStrings.some(value => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(value)), false);
  const backup = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/backup-investidor10-sample.json'), 'utf8'));
  const visit = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach(item => visit(item, key));
    if (!value || typeof value !== 'object') {
      if (/^ticker$/i.test(key)) assert.match(value, /^SYN-BKP-/);
      if (/^(name|asset|issuer)$/i.test(key)) assert.match(value, /^Ativo Sintético /);
      return;
    }
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  };
  visit(backup);
});

test('Vercel static build allowlist serves app references and excludes local/private roots', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const sources = config.builds.map(item => item.src);
  const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
  const included = file => sources.some(pattern => pattern === file || (pattern === 'src/**/*.js' && file.startsWith('src/') && file.endsWith('.js')) || (pattern === 'vendor/*.js' && file.startsWith('vendor/') && file.endsWith('.js') && !file.slice('vendor/'.length).includes('/')) || (pattern === 'assets/**' && file.startsWith('assets/')));
  assert.ok(included('src/auth/demo-fixture.js'));
  assert.ok(included('carteira-data.sample.js'));
  assert.ok(config.rewrites.some(r => r.source === '/carteira-data.js' && r.destination === '/carteira-data.sample.js'));
  for (const file of ['carteira-data.js', 'firebase-config.js', 'firebase.config.sample.js', 'AGENTS.md', 'package.json', 'COMPLETION_LOG.md']) assert.equal(included(file), false);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1].split('?')[0];
    if (/^(https?:|data:|#)/i.test(ref) || ref === 'carteira-data.js') continue;
    assert.equal(tracked.has(ref), true, 'local HTML reference must be tracked');
    assert.equal(included(ref), true, 'local HTML reference must be in the static allowlist');
  }
});

test('Git ignores local finance exports, backups, uploads, and environment files', () => {
  const samples = ['carteira-data.js', 'carteira-data-backup-local.json', 'backup-carteira-local.json', 'statement.pdf', 'export.csv', 'export.xlsx', 'uploads/file.ofx', 'backups/export.json', '.env', '.env.production'];
  for (const file of samples) {
    const result = spawnSync('git', ['check-ignore', '--no-index', '-q', file], { cwd: root });
    assert.equal(result.status, 0, 'local sensitive path must be ignored');
  }
});

test('tracked text files contain no non-reserved email addresses', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const reserved = new Set(['example.com', 'example.org', 'example.net', 'example.invalid', 'test.com']);
  let matches = 0;
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(root, file));
    if (buffer.includes(0)) continue;
    const text = buffer.toString('utf8');
    for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi)) if (!reserved.has(match[1].toLowerCase())) matches++;
  }
  assert.equal(matches, 0, 'tracked text must not contain personal email addresses');
});
