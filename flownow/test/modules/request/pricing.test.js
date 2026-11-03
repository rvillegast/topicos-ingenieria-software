const test = require('node:test');
const assert = require('node:assert');
const { amountDue } = require('../../../src/modules/request/pricing');

test('sin descuento ni bono el monto no cambia', () => assert.strictEqual(amountDue({ amount: 100000, discount: 0, tier: 'basic' }), 100000));
test('aplica el descuento del tier', () => assert.strictEqual(amountDue({ amount: 100000, discount: 0.1, tier: 'silver' }), 90000));
test('bono gold: -5000 sólo si, con descuento, supera 1.000.000', () => {
  assert.strictEqual(amountDue({ amount: 1200000, discount: 0.15, tier: 'gold' }), 1015000);
  assert.strictEqual(amountDue({ amount: 1100000, discount: 0.15, tier: 'gold' }), 935000);
  assert.strictEqual(amountDue({ amount: 1200000, discount: 0.15, tier: 'silver' }), 1020000);
  assert.strictEqual(amountDue({ amount: 1000000, discount: 0, tier: 'gold' }), 1000000);   // el umbral es estricto (>)
});
