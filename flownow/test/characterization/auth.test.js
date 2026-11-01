const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('login correcto entrega token y rol; incorrecto → 401', async () => {
  const ok = await h.call('POST', '/auth/login', { email: 'admin@flownow.cl', password: 'admin123' });
  assert.strictEqual(ok.status, 200); assert.strictEqual(ok.body.role, 'admin'); assert.ok(ok.body.token);
  assert.strictEqual((await h.call('POST', '/auth/login', { email: 'admin@flownow.cl', password: 'mala' })).status, 401);
  assert.strictEqual((await h.call('POST', '/auth/login', { email: 'nadie@flownow.cl', password: 'x' })).status, 401);
});

test('rutas protegidas exigen token válido; /health es público', async () => {
  assert.strictEqual((await h.call('GET', '/health')).status, 200);
  assert.strictEqual((await h.call('GET', '/payments')).status, 401);
  assert.strictEqual((await h.call('GET', '/payments', undefined, 'token-invalido')).status, 401);
  assert.strictEqual((await h.api('GET', '/payments')).status, 200);
});
