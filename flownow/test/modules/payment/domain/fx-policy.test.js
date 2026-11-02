const test = require('node:test');
const assert = require('node:assert');
const fx = require('../../../../src/modules/payment/domain/fx-policy');

const rates = { USD: 950, EUR: 1030 };

test('monedas soportadas: CLP y las que tienen tasa', () => {
  assert.ok(fx.isSupported('CLP', rates)); assert.ok(fx.isSupported('USD', rates)); assert.ok(fx.isSupported('EUR', rates));
  assert.ok(!fx.isSupported('JPY', rates)); assert.ok(!fx.isSupported('toString', rates)); assert.ok(!fx.isSupported(undefined, rates));
});
test('fromClp: CLP no se convierte; otras monedas dividen por la tasa', () => {
  assert.strictEqual(fx.fromClp(95000, 'CLP', rates), 95000);
  assert.strictEqual(fx.fromClp(95000, 'USD', rates), 100);
  assert.ok(Math.abs(fx.fromClp(100000, 'EUR', rates) - 97.0873786) < 1e-6);
});
test('toClp es la operación inversa', () => {
  assert.strictEqual(fx.toClp(100, 'USD', rates), 95000);
  assert.strictEqual(fx.toClp(100, 'CLP', rates), 100);
});
test('round2 redondea a 2 decimales', () => {
  assert.strictEqual(fx.round2(97.0873786), 97.09); assert.strictEqual(fx.round2(1.005 * 1000), 1005);
});
test('usa las tasas de configuración por defecto y respeta el entorno', () => {
  assert.strictEqual(fx.toClp(1, 'USD'), 950);
  process.env.FX_USD = '1000';
  try { assert.strictEqual(fx.toClp(1, 'USD'), 1000); } finally { delete process.env.FX_USD; }
});
