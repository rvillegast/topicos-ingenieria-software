const test = require('node:test');
const assert = require('node:assert');
const { chargeWithRetry, MAX_ATTEMPTS } = require('../../../../src/modules/payment/domain/charge-retry-policy');
const { ProviderError, ProviderUnavailableError } = require('../../../../src/modules/payment/providers/errors');

// Fake del puerto: devuelve/lanza lo que se le programe, sin red ni base de datos.
const fake = (...script) => { const calls = []; return { calls, charge: async (c) => { calls.push(c); const s = script[Math.min(calls.length - 1, script.length - 1)]; if (s instanceof Error) throw s; return s; } }; };
const OK = { status: 'captured', providerRef: 'r1', providerStatus: 'ok' };

test('éxito al primer intento: 1 intento, sin reintentos', async () => {
  const p = fake(OK); const retries = [];
  const r = await chargeWithRetry(p, { amount: 1 }, (n) => retries.push(n));
  assert.deepStrictEqual({ charge: r.charge, attempts: r.attempts, lastError: r.lastError }, { charge: OK, attempts: 1, lastError: null });
  assert.deepStrictEqual(retries, []);
});
test('reintenta fallas transitorias y se recupera', async () => {
  const p = fake(new ProviderUnavailableError('red'), new ProviderUnavailableError('red'), OK); const retries = [];
  const r = await chargeWithRetry(p, {}, (n) => retries.push(n));
  assert.strictEqual(r.attempts, 3); assert.strictEqual(r.charge, OK); assert.deepStrictEqual(retries, [1, 2]);
});
test('agota los intentos: MAX_ATTEMPTS (3) y devuelve el último error', async () => {
  const p = fake(new ProviderUnavailableError('caído')); const retries = [];
  const r = await chargeWithRetry(p, {}, (n) => retries.push(n));
  assert.strictEqual(MAX_ATTEMPTS, 3);
  assert.strictEqual(r.attempts, 3); assert.strictEqual(r.charge, null); assert.match(r.lastError.message, /caído/);
  assert.deepStrictEqual(retries, [1, 2, 3]);   // preserva el AS-IS: también se registra tras el último intento
});
test('una falla NO transitoria no se reintenta', async () => {
  const p = fake(new ProviderError('credenciales')); const retries = [];
  const r = await chargeWithRetry(p, {}, (n) => retries.push(n));
  assert.strictEqual(r.attempts, 1); assert.strictEqual(p.calls.length, 1); assert.strictEqual(r.charge, null); assert.deepStrictEqual(retries, []);
});
test('un resultado "declined" no es una falla: se devuelve sin reintentar', async () => {
  const declined = { status: 'declined', providerRef: 'x', providerStatus: 'failed' };
  const r = await chargeWithRetry(fake(declined), {});
  assert.strictEqual(r.attempts, 1); assert.strictEqual(r.charge, declined);
});
test('pasa el comando tal cual al puerto', async () => {
  const p = fake(OK); await chargeWithRetry(p, { amount: 5, currency: 'CLP', token: 't', metadata: { a: 1 } });
  assert.deepStrictEqual(p.calls[0], { amount: 5, currency: 'CLP', token: 't', metadata: { a: 1 } });
});
