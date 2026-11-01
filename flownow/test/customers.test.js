const test = require('node:test');
const assert = require('node:assert');
const customerService = require('../src/services/customerService');

test('crea un cliente', async () => {
  const c = await customerService.create({ name: 'Ana Pérez', email: 'ana@test.cl' });
  assert.strictEqual(c.tier, 'basic');
});
test('rechaza email inválido', async () => {
  await assert.rejects(() => customerService.create({ name: 'Bob', email: 'x' }), /email/);
});
