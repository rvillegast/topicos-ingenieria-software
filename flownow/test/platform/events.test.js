const test = require('node:test');
const assert = require('node:assert');
const bus = require('../../src/platform/events');

test.beforeEach(() => { bus._resetForTests(); bus.configure({ logger: () => {} }); });

test('entrega el evento en un sobre versionado, en orden de suscripción', async () => {
  const seen = [];
  bus.subscribe('Payment.Captured', (e) => { seen.push(['a', e]); });
  bus.subscribe('Payment.Captured', (e) => { seen.push(['b', e]); });
  const res = await bus.publish('Payment.Captured', { paymentId: 1 });
  assert.deepStrictEqual(seen.map((s) => s[0]), ['a', 'b']);
  const e = seen[0][1];
  assert.strictEqual(e.type, 'Payment.Captured'); assert.strictEqual(e.schemaVersion, 1);
  assert.deepStrictEqual(e.payload, { paymentId: 1 });
  assert.match(e.id, /^evt_\d+$/); assert.ok(!Number.isNaN(Date.parse(e.occurredAt)));
  assert.deepStrictEqual({ delivered: res.delivered, failed: res.failed }, { delivered: 2, failed: 0 });
  assert.ok(Object.isFrozen(e), 'el sobre es inmutable');
});

test('sin consumidores no es un error y los tipos están aislados entre sí', async () => {
  let other = 0;
  bus.subscribe('Request.Created', () => { other++; });
  const res = await bus.publish('Payment.Captured', { x: 1 });
  assert.strictEqual(res.delivered, 0); assert.strictEqual(other, 0);
});

test('aislamiento de fallos: un consumidor que falla no impide a los demás ni rompe al publicador', async () => {
  const seen = [];
  bus.subscribe('Payment.Captured', () => { throw new Error('boom'); }, 'notificaciones');
  bus.subscribe('Payment.Captured', () => { seen.push('ok'); }, 'reporting');
  const res = await bus.publish('Payment.Captured', { paymentId: 7 });
  assert.deepStrictEqual(seen, ['ok']);
  assert.strictEqual(res.delivered, 1); assert.strictEqual(res.failed, 1);
  const dl = bus.deadLetters();
  assert.strictEqual(dl.length, 1); assert.strictEqual(dl[0].handler, 'notificaciones'); assert.strictEqual(dl[0].error, 'boom');
  assert.strictEqual(dl[0].eventId, res.id);
});

test('también aísla consumidores asíncronos que rechazan', async () => {
  bus.subscribe('Payment.Captured', async () => { throw new Error('async boom'); });
  const res = await bus.publish('Payment.Captured', {});
  assert.strictEqual(res.failed, 1);
});

test('publish espera a los consumidores asíncronos antes de resolver', async () => {
  let done = false;
  bus.subscribe('Payment.Captured', async () => { await new Promise((r) => setTimeout(r, 15)); done = true; });
  await bus.publish('Payment.Captured', {});
  assert.strictEqual(done, true);
});

test('desuscribirse detiene la entrega', async () => {
  let n = 0;
  const off = bus.subscribe('Payment.Captured', () => { n++; });
  await bus.publish('Payment.Captured', {});
  off();
  await bus.publish('Payment.Captured', {});
  assert.strictEqual(n, 1);
});

test('un consumidor puede publicar otro evento (reentrancia)', async () => {
  const order = [];
  bus.subscribe('Payment.Captured', async () => { order.push('captured'); await bus.publish('Customer.TierChanged', { tier: 'gold' }); });
  bus.subscribe('Customer.TierChanged', () => { order.push('tier'); });
  await bus.publish('Payment.Captured', {});
  assert.deepStrictEqual(order, ['captured', 'tier']);
});

test('contrato: exige campos mínimos y tolera campos extra (lector tolerante)', async () => {
  bus.registerContract('Payment.Captured', 1, { paymentId: 'number', amount: 'object' });
  let got;
  bus.subscribe('Payment.Captured', (e) => { got = e.payload; });
  await bus.publish('Payment.Captured', { paymentId: 1, amount: { minor: 100 }, campoNuevo: 'ok' });
  assert.strictEqual(got.campoNuevo, 'ok');
});

test('contrato: un payload inválido es error del publicador y no se entrega a nadie', async () => {
  bus.registerContract('Payment.Captured', 1, { paymentId: 'number' });
  let n = 0; bus.subscribe('Payment.Captured', () => { n++; });
  await assert.rejects(() => bus.publish('Payment.Captured', { paymentId: 'uno' }), /paymentId.*number/);
  await assert.rejects(() => bus.publish('Payment.Captured', {}), /ausente/);
  assert.strictEqual(n, 0);
});

test('versionado: el contrato es por versión; la v2 convive con la v1', async () => {
  bus.registerContract('Payment.Captured', 1, { paymentId: 'number' });
  bus.registerContract('Payment.Captured', 2, { paymentId: 'string' });
  const versions = []; bus.subscribe('Payment.Captured', (e) => { versions.push(e.schemaVersion); });
  await bus.publish('Payment.Captured', { paymentId: 1 }, { schemaVersion: 1 });
  await bus.publish('Payment.Captured', { paymentId: 'p-1' }, { schemaVersion: 2 });
  assert.deepStrictEqual(versions, [1, 2]);
  await assert.rejects(() => bus.publish('Payment.Captured', { paymentId: 1 }, { schemaVersion: 2 }), TypeError);
});

test('argumentos inválidos se rechazan', async () => {
  await assert.rejects(() => bus.publish('', {}), TypeError);
  await assert.rejects(() => bus.publish('X', null), TypeError);
  await assert.rejects(() => bus.publish('X', []), TypeError);
  await assert.rejects(() => bus.publish('X', {}, { schemaVersion: 0 }), TypeError);
  assert.throws(() => bus.subscribe('X', 'no-fn'), TypeError);
  assert.throws(() => bus.subscribe('', () => {}), TypeError);
});

test('la bitácora de fallos está acotada (100)', async () => {
  bus.subscribe('X', () => { throw new Error('e'); });
  for (let i = 0; i < 105; i++) await bus.publish('X', {});
  assert.strictEqual(bus.deadLetters().length, 100);
});
