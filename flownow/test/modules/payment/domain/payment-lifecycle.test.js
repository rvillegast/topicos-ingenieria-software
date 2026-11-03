const test = require('node:test');
const assert = require('node:assert');
const lc = require('../../../../src/modules/payment/domain/payment-lifecycle');
const { PaymentError } = require('../../../../src/modules/payment/domain/errors');

test('statusFor traduce el resultado neutro a estado interno', () => {
  assert.strictEqual(lc.statusFor('captured'), 'paid'); assert.strictEqual(lc.statusFor('declined'), 'failed');
  assert.strictEqual(lc.statusFor('action_required'), 'pending_action'); assert.strictEqual(lc.statusFor('unknown'), 'unknown');
  assert.strictEqual(lc.statusFor('raro'), 'unknown');
});
test('assertCurrency: acepta CLP y las monedas con tasa; rechaza el resto con 400', () => {
  for (const c of ['CLP', 'USD', 'EUR']) assert.doesNotThrow(() => lc.assertCurrency(c));
  for (const c of ['JPY', undefined, 'toString']) assert.throws(() => lc.assertCurrency(c), (e) => e instanceof PaymentError && e.status === 400 && /moneda/.test(e.message));
});
test('planRefund: parcial deja paid, total pasa a refunded, sin monto reembolsa el saldo del pago', () => {
  const p = { status: 'paid', amount: 100000, refunded_amount: 0 };
  assert.deepStrictEqual(lc.planRefund(p, 40000), { amount: 40000, total: 40000, status: 'paid' });
  assert.deepStrictEqual(lc.planRefund({ ...p, refunded_amount: 40000 }, 60000), { amount: 60000, total: 100000, status: 'refunded' });
  assert.deepStrictEqual(lc.planRefund(p), { amount: 100000, total: 100000, status: 'refunded' });
});
test('planRefund: sólo pagos pagados y sin exceder lo pagado', () => {
  assert.throws(() => lc.planRefund({ status: 'failed', amount: 1, refunded_amount: 0 }), (e) => e.status === 400 && /pagados/.test(e.message));
  assert.throws(() => lc.planRefund({ status: 'paid', amount: 100, refunded_amount: 50 }, 51), (e) => e.status === 400 && /excede/.test(e.message));
  assert.doesNotThrow(() => lc.planRefund({ status: 'paid', amount: 100, refunded_amount: 50 }, 50));
});
test('isRetryable: sólo failed/error; el límite por solicitud es 3', () => {
  assert.ok(lc.isRetryable({ status: 'failed' })); assert.ok(lc.isRetryable({ status: 'error' }));
  assert.ok(!lc.isRetryable({ status: 'paid' })); assert.ok(!lc.isRetryable({ status: 'superseded' }));
  assert.strictEqual(lc.MAX_FAILED_PER_REQUEST, 3);
});
