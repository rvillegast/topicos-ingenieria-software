const test = require('node:test');
const assert = require('node:assert');
const h = require('../src/utils/helpers');

test('formatMoney CLP', () => assert.match(h.formatMoney(1500, 'CLP'), /^\$1[.,]500$/));
test('validateEmail', () => { assert.ok(h.validateEmail('a@b.cl')); assert.ok(!h.validateEmail('nope')); });
test('tierDiscount', () => assert.strictEqual(h.tierDiscount('gold'), 0.15));
// TODO: agregar pruebas de pagos, reembolsos y webhooks (hoy no hay ninguna)
