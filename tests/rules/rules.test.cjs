// tests/rules/rules.test.cjs
// P14 — matriz de ataque contra firestore.rules (Firebase Emulator).
// Runner: node tests/rules/rules.test.cjs (com emulator Firestore ativo na :8080)
// ou: npx firebase-tools emulators:exec --only firestore "node tests/rules/rules.test.cjs"
// Requer devDep @firebase/rules-unit-testing + Java 11+ (emulator).
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertDenied
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('node:fs');

const PROJECT_ID = 'investidor10-rules-test';
const RULES = readFileSync(require('node:path').join(__dirname, '..', '..', 'firestore.rules'), 'utf8');

let env;
let passed = 0, failed = 0;
const fails = [];

function test(name, fn) {
  return fn().then(() => { passed++; console.log('  PASS', name); })
    .catch(e => { failed++; fails.push(name); console.log('  FAIL', name, '\n    ', (e && e.message || e).toString().slice(0, 160)); });
}

// Cenários
function ctx(uid, email) {
  return env.authenticatedContext(uid, { email, email_verified: true });
}
function unauth() { return env.unauthenticatedContext(); }

async function main() {
  env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } });
  await env.withSecurityRulesDisabled(async (c) => {
    // seed: allowlist via "admin" (simula Admin SDK/console — P16)
    const db = c.firestore();
    await db.collection('authorization').doc('ownerUid').set({
      email: 'psmarquesdossantos@gmail.com', enabled: true, role: 'owner', blocked: false
    });
    await db.collection('authorization').doc('blockedUid').set({
      email: 'blocked@example.com', enabled: true, role: 'viewer', blocked: true
    });
    await db.collection('users').doc('ownerUid').collection('portfolio').doc('positions')
      .set({ data: [{ ticker: 'SECRET4' }], updatedAt: 1 });
  });

  const owner = ctx('ownerUid', 'psmarquesdossantos@gmail.com');
  const demo = ctx('demoUid', 'curioso@example.com');        // autenticado, NÃO autorizado
  const blocked = ctx('blockedUid', 'blocked@example.com');  // autenticado, bloqueado
  const stranger = ctx('strangerUid', 'stranger@example.com');

  console.log('P14 attack matrix:');

  // 1. não-autenticado lê carteira real → DENIED
  await test('1 unauthenticated read owner portfolio → DENIED', async () => {
    const db = unauth().firestore();
    await assertDenied(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions').get());
  });

  // 2. DEMO (autenticado não autorizado) lê owner → DENIED
  await test('2 demo user reads owner portfolio → DENIED', async () => {
    const db = demo.firestore();
    await assertDenied(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions').get());
  });

  // 3. User A lê User B → DENIED
  await test('3 user A reads user B → DENIED', async () => {
    const db = stranger.firestore();
    await assertDenied(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions').get());
  });

  // 4. User A escreve em User B → DENIED
  await test('4 user A writes user B → DENIED', async () => {
    const db = stranger.firestore();
    await assertDenied(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions')
      .set({ data: [{ ticker: 'HACKED' }], updatedAt: 2 }));
  });

  // 5. ACCOUNT_MODE forçado no client não muda rules → DEMO continua DENIED
  await test('5 client-side ACCOUNT_MODE=REAL bypass attempt → DENIED', async () => {
    const db = demo.firestore();
    // mesmo com flags "forjadas" no client, rules re-computam autorização server-side
    await assertDenied(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions').get());
    await assertDenied(db.collection('users').doc('demoUid').collection('portfolio').doc('positions')
      .set({ data: [], updatedAt: 3 }));
  });

  // 6. autorizado lê o próprio UID → ALLOWED
  await test('6 authorized user reads own UID → ALLOWED', async () => {
    const db = owner.firestore();
    const snap = await assertSucceeds(db.collection('users').doc('ownerUid').collection('portfolio').doc('positions').get());
    if (!snap.exists) throw new Error('doc deveria existir');
  });

  // 7. autorizado escreve os próprios recursos → ALLOWED
  await test('7 authorized user writes own resources → ALLOWED', async () => {
    const db = owner.firestore();
    await assertSucceeds(db.collection('users').doc('ownerUid').collection('portfolio').doc('kpis')
      .set({ data: { total: 1 }, updatedAt: 4 }));
  });

  // 8. blocked tenta read/write → DENIED
  await test('8 blocked user read/write → DENIED', async () => {
    const db = blocked.firestore();
    await assertDenied(db.collection('users').doc('blockedUid').collection('portfolio').doc('positions').get());
    await assertDenied(db.collection('users').doc('blockedUid').collection('portfolio').doc('positions')
      .set({ data: [], updatedAt: 5 }));
  });

  // 9. usuário comum tenta editar allowlist → DENIED (P16)
  await test('9 normal user edits authorization allowlist → DENIED', async () => {
    const db = demo.firestore();
    await assertDenied(db.collection('authorization').doc('demoUid').set({
      email: 'curioso@example.com', enabled: true, role: 'owner', blocked: false
    }));
    // também não pode escrever no doc do owner
    await assertDenied(db.collection('authorization').doc('ownerUid').set({
      email: 'psmarquesdossantos@gmail.com', enabled: true, role: 'owner', blocked: false
    }));
  });

  // 10 (extra P15/P3): próprio doc de autorização é legível pelo dono (UX resolve modo)
  await test('10 user reads own authorization doc → ALLOWED', async () => {
    const db = owner.firestore();
    await assertSucceeds(db.collection('authorization').doc('ownerUid').get());
    // mas não lê o do outro
    const db2 = stranger.firestore();
    await assertDenied(db2.collection('authorization').doc('ownerUid').get());
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) { fails.forEach(f => console.log('  FAILED:', f)); process.exitCode = 1; }
  await env.cleanup();
}

main().catch(e => { console.error('FATAL:', e && e.message); process.exit(1); });
