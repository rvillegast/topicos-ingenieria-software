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
