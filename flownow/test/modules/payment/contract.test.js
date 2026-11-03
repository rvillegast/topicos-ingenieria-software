// Payment como hoja: se usa por su contrato público sin que existan solicitudes ni reglas comerciales (paso 9).
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../../support/harness');
const payments = require('../../../src/modules/payment/contract');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('el contrato público expone sólo la API y los eventos (nada de internos)', () => {
  assert.deepStrictEqual(Object.keys(payments).sort(), [
    'beginRetry', 'createPayment', 'events', 'get', 'handleWebhook', 'list', 'listForRequest', 'paidCountByCustomer',
    'paidTotal', 'refund', 'reassignCustomer', 'reportRows', 'summaryRows', 'toClp'].sort());
});

test('createPayment cobra EXACTAMENTE el monto recibido: no aplica descuentos ni bonos (eso es de Request)', async () => {
  const c = await h.customer({ tier: 'gold' }); const r = await h.request(c.id, 1200000);   // gold: Request aplicaría 15 % y bono
  const p = await payments.createPayment({ requestId: r.id, customerId: c.id, amount: 1200000, token: 'tok_ok' });
  assert.strictEqual(p.amount, 1200000); assert.strictEqual(p.currency, 'CLP'); assert.strictEqual(p.status, 'paid');
});

test('createPayment convierte la moneda (secreto de Payment) y valida que esté soportada', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 95000);
  const p = await payments.createPayment({ requestId: r.id, customerId: c.id, amount: 95000, currency: 'USD', token: 'tok_ok' });
  assert.strictEqual(p.amount, 100); assert.strictEqual(p.currency, 'USD');
  await assert.rejects(() => payments.createPayment({ requestId: r.id, customerId: c.id, amount: 1, currency: 'JPY', token: 'tok_ok' }),
    (e) => e.status === 400 && /moneda/.test(e.message));
});

test('Payment no valida solicitudes ni clientes: eso lo hace Request (la API HTTP conserva sus errores)', async () => {
  // Directo al contrato no hay chequeo de "ya pagada"; por la API HTTP, Request responde 409 como siempre.
  const c = await h.customer(); const r = await h.request(c.id, 10000);
  assert.strictEqual((await h.pay(r.id)).status, 201);
  const again = await h.pay(r.id);
  assert.strictEqual(again.status, 409); assert.match(again.body.error, /ya pagada/);
});

test('toClp y beginRetry', async () => {
  assert.strictEqual(payments.toClp(100, 'USD'), 95000); assert.strictEqual(payments.toClp(5, 'CLP'), 5);
  assert.throws(() => payments.beginRetry(999999), (e) => e.status === 404);
});
