const test = require('node:test');
const assert = require('node:assert');
const { paymentMessage } = require('../../../src/modules/notification/payment-messages');

const input = (outcome) => ({ outcome, name: 'Ana', formattedAmount: '$90.000' });

test('pago capturado: confirmación sin nombrar al proveedor ni su referencia', () => {
  const m = paymentMessage(input('captured'));
  assert.strictEqual(m.subject, 'Pago confirmado');
  assert.strictEqual(m.body, 'Hola Ana, tu pago de $90.000 fue procesado.');
});
test('pago rechazado', () => {
  const m = paymentMessage(input('declined'));
  assert.strictEqual(m.subject, 'Pago rechazado'); assert.strictEqual(m.body, 'Hola Ana, tu pago de $90.000 fue rechazado.');
});
test('pendiente: acción adicional, caída del proveedor o resultado desconocido (TD-012)', () => {
  for (const o of ['pending', 'action_required', 'unavailable', 'unknown', 'cualquier-otro']) {
    const m = paymentMessage(input(o));
    assert.strictEqual(m.subject, 'Pago pendiente'); assert.strictEqual(m.body, 'Hola Ana, tu pago requiere una acción adicional.');
  }
});
test('ningún texto nombra a un proveedor', () => {
  for (const o of ['captured', 'declined', 'pending']) assert.ok(!/stripey|payfast|ch_|pf_/i.test(JSON.stringify(paymentMessage(input(o)))));
});
