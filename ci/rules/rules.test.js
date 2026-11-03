// Demostración de que las reglas FALLAN ante una violación y PASAN sin ella (E4 §4).
// Uso: node --test ci/rules/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ff-'));
const write = (dir, rel, text) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const run = (script, ...args) => spawnSync('node', [path.join(__dirname, script), ...args], { encoding: 'utf8' });

test('FF5: código limpio pasa y platform/config.js puede tener URLs', () => {
  const d = tmp();
  write(d, 'platform/config.js', "module.exports = { url: 'https://api.ejemplo.com/v1', key: 'sk_test_dev' };");
  write(d, 'modules/a.js', "const config = require('../platform/config');\nmodule.exports = () => config.url;");
  assert.strictEqual(run('no-hardcoded.js', d).status, 0);
});

for (const [name, code] of [
  ['URL literal', "fetch('https://api.ejemplo.com/v1/x');"],
  ['clave sk_live', "const k = 'sk_live_abc123';"],
  ['secreto asignado', "const SECRET = 'valor-secreto';"],
  ['tipo de cambio literal', 'const clp = usd * 950;'],
  ['correo literal', "const from = 'no-reply@empresa.cl';"],
]) {
  test(`FF5: falla ante ${name}`, () => {
    const d = tmp(); write(d, 'modules/a.js', code);
    const r = run('no-hardcoded.js', d);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  });
}

const LEDGER = `| ID | Tipo | Evidencia | Decisión | Rationale | Owner | Fecha | Verificación | Estado |
|---|---|---|---|---|---|---|---|---|
| TD-001 | Defect | x | Refactor | porque | C | 2026-11-15 | prueba | Propuesta |
| TD-002 | Design | x | Accept | porque | D | 2026-11-15 | prueba | Cerrada |
`;
test('FF4: comentario con TD existente pasa', () => {
  const d = tmp(); write(d, 'a.js', '// TODO(TD-001): pendiente'); const l = path.join(d, 'l.md'); fs.writeFileSync(l, LEDGER);
  assert.strictEqual(run('ledger-consistency.js', l, d).status, 0);
});
test('FF4: falla si el código cita un TD que no existe en el ledger', () => {
  const d = tmp(); write(d, 'a.js', '// HACK(TD-999): nada'); const l = path.join(d, 'l.md'); fs.writeFileSync(l, LEDGER);
  assert.strictEqual(run('ledger-consistency.js', l, d).status, 1);
});
test('FF4: falla si el código sigue citando un TD cerrado', () => {
  const d = tmp(); write(d, 'a.js', '// TODO(TD-002): ya cerrada'); const l = path.join(d, 'l.md'); fs.writeFileSync(l, LEDGER);
  assert.strictEqual(run('ledger-consistency.js', l, d).status, 1);
});
test('FF4: falla si una entrada del ledger no tiene owner, fecha o verificación', () => {
  const d = tmp(); write(d, 'a.js', '// nada'); const l = path.join(d, 'l.md');
  fs.writeFileSync(l, LEDGER.replace('| D | 2026-11-15 | prueba |', '|  | sin fecha |  |'));
  const r = run('ledger-consistency.js', l, d);
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /owner/); assert.match(r.stderr, /fecha/); assert.match(r.stderr, /verificación/);
});
test('FF4: el gate de SATD falla con un marcador sin ticket', () => {
  const d = tmp(); write(d, 'a.js', '// TODO arreglar esto');
  const r = spawnSync(path.join(__dirname, '../../scripts/satd-scan.sh'), ['--gate', d], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1);
});

// ---- FF2b: nombres de proveedor (ratchet) ----
const ratchet = (dir, legacy, cycles = 0) => { const f = path.join(dir, 'ratchets.json'); fs.writeFileSync(f, JSON.stringify({ cycles, providerNamePatterns: ['stripey', 'payfast'], providerNameLegacy: legacy })); return f; };

test('FF2b: pasa si los nombres sólo están en adapters, el registro y la configuración', () => {
  const d = tmp(); const src = path.join(d, 'src');
  write(src, 'modules/payment/adapters/stripey/index.js', "exports.name = 'stripey';");
  write(src, 'modules/payment/providers/index.js', "const a = { stripey: 1, payfast: 2 };");
  write(src, 'platform/config.js', "// stripey");
  write(src, 'modules/request/a.js', 'module.exports = 1;');
  assert.strictEqual(run('provider-names.js', src, '--ratchets', ratchet(d, [])).status, 0);
});
test('FF2b: falla si un módulo ajeno nombra al proveedor', () => {
  const d = tmp(); const src = path.join(d, 'src');
  write(src, 'modules/request/a.js', "const x = 'stripey';");
  const r = run('provider-names.js', src, '--ratchets', ratchet(d, []));
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /request\/a\.js/);
});
test('FF2b: un archivo legado tolerado por el ratchet pasa, pero si deja de nombrar al proveedor hay que sacarlo', () => {
  const d = tmp(); const src = path.join(d, 'src');
  write(src, 'old.js', "const x = 'payfast';");
  assert.strictEqual(run('provider-names.js', src, '--ratchets', ratchet(d, ['old.js'])).status, 0);
  write(src, 'old.js', 'const x = 1;');
  const r = run('provider-names.js', src, '--ratchets', ratchet(d, ['old.js']));
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /quitarlo/);
});

// ---- FF1 / FF2 con dependency-cruiser ----
const arch = (d, cycles) => spawnSync('node', [path.join(__dirname, 'arch.js'), 'src', '--ratchets', ratchet(d, [], cycles)], { cwd: d, encoding: 'utf8' });

test('FF2: falla si un módulo ajeno importa el SDK del proveedor; pasa si lo hace el adapter', () => {
  const d = tmp();
  write(d, 'vendor/stripey-sdk.js', 'module.exports = class {};');
  write(d, 'src/modules/payment/adapters/stripey/index.js', "module.exports = require('../../../../../vendor/stripey-sdk');");
  assert.strictEqual(arch(d, 0).status, 0);
  write(d, 'src/modules/notification/n.js', "module.exports = require('../../../vendor/stripey-sdk');");
  const r = arch(d, 0);
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /not-to-sdk-outside-adapter/);
});
test('FF1: falla ante un ciclo nuevo y respeta el ratchet (no puede subir; si baja hay que bajarlo)', () => {
  const d = tmp();
  write(d, 'src/a.js', "exports.b = () => require('./b');");
  write(d, 'src/b.js', "const a = require('./a'); exports.a = a;");
  assert.strictEqual(arch(d, 0).status, 1);           // 1 ciclo > ratchet 0
  assert.strictEqual(arch(d, 1).status, 0);           // tolerado por el ratchet
  assert.strictEqual(arch(d, 2).status, 1);           // mejoró: obliga a fijar el avance
});

// ---- FF3: ownership de tablas ----
const OWN = { tables: {
  payment_payments: { owner: 'payment', paths: ['modules/payment/'], enforced: true },
  customers: { owner: 'customer', paths: ['modules/customer/'], enforced: false } } };
const own = (dir, ratchets) => { const o = path.join(dir, 'own.json'), r = path.join(dir, 'r.json');
  fs.writeFileSync(o, JSON.stringify(OWN)); fs.writeFileSync(r, JSON.stringify({ tableForeignFiles: ratchets })); return ['--ownership', o, '--ratchets', r]; };
const schema = (src) => write(src, 'db.js', 'db.exec(`CREATE TABLE IF NOT EXISTS payment_payments (id INTEGER); CREATE TABLE IF NOT EXISTS customers (id INTEGER)`);');

test('FF3: pasa si sólo el owner toca su tabla', () => {
  const d = tmp(); const src = path.join(d, 'src'); schema(src);
  write(src, 'modules/payment/repo.js', "db.prepare('SELECT * FROM payment_payments');");
  write(src, 'modules/customer/repo.js', "db.prepare('SELECT * FROM customers');");
  assert.strictEqual(run('table-ownership.js', src, ...own(d, { customers: 0 })).status, 0);
});
test('FF3: falla si otro módulo lee o escribe una tabla enforced', () => {
  const d = tmp(); const src = path.join(d, 'src'); schema(src);
  write(src, 'modules/notification/n.js', "db.prepare('SELECT * FROM payment_payments');");
  const r = run('table-ownership.js', src, ...own(d, { customers: 0 }));
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /payment_payments.*notification\/n\.js/);
  write(src, 'modules/notification/n.js', "db.prepare('UPDATE payment_payments SET status = 1');");
  assert.strictEqual(run('table-ownership.js', src, ...own(d, { customers: 0 })).status, 1);
});
test('FF3: tabla aún no migrada respeta el ratchet (no puede subir; si baja hay que fijarlo)', () => {
  const d = tmp(); const src = path.join(d, 'src'); schema(src);
  write(src, 'services/other.js', "db.prepare('SELECT * FROM customers');");
  assert.strictEqual(run('table-ownership.js', src, ...own(d, { customers: 1 })).status, 0);
  assert.strictEqual(run('table-ownership.js', src, ...own(d, { customers: 0 })).status, 1);   // subió
  assert.strictEqual(run('table-ownership.js', src, ...own(d, { customers: 2 })).status, 1);   // mejoró: fijar
});
test('FF3: una tabla sin owner declarado es una violación', () => {
  const d = tmp(); const src = path.join(d, 'src');
  write(src, 'db.js', 'db.exec(`CREATE TABLE IF NOT EXISTS huerfana (id INTEGER)`);');
  const r = run('table-ownership.js', src, ...own(d, { customers: 0 }));
  assert.strictEqual(r.status, 1); assert.match(r.stderr, /huerfana.*sin owner/);
});
