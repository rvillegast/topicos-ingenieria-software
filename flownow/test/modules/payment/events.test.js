// Pruebas de contrato de los eventos de pago y de sus consumidores (paso 6, ADR-004).
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../../support/harness');
const bus = require('../../../src/platform/events');
const paymentEvents = require('../../../src/modules/payment/contract/events');
const customerEvents = require('../../../src/modules/customer/contract/events');
const integrationEvents = require('../../../src/modules/integration/contract/events');
const helpers = require('../../../src/utils/helpers');

let h; const seen = [];
test.before(async () => {
  h = await start();
  for (const t of [paymentEvents.CAPTURED, paymentEvents.REFUNDED, paymentEvents.CONFIRMED, customerEvents.TIER_CHANGED, integrationEvents.INVOICE_ISSUED])
    bus.subscribe(t, (e) => { seen.push(e); }, 'espía-de-prueba');
});
test.after(async () => { await h.close(); });
const last = (type) => [...seen].reverse().find((e) => e.type === type);
const row = async (path) => (await h.api('GET', path)).body;

test('un cobro aprobado publica Payment.Captured v1 sin datos del proveedor', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 100000);
  const p = (await h.pay(r.id)).body;
  const e = last(paymentEvents.CAPTURED);
  assert.strictEqual(e.schemaVersion, 1);
  assert.deepStrictEqual(e.payload, { paymentId: p.id, requestId: r.id, customerId: c.id, amount: 100000, currency: 'CLP' });
  assert.ok(!/stripey|payfast|ch_|pf_/i.test(JSON.stringify(e)), 'el evento no filtra el proveedor');
});

test('rechazo, 3DS y timeout NO publican Payment.Captured', async () => {
  const before = seen.filter((e) => e.type === paymentEvents.CAPTURED).length;
  const c = await h.customer();
  for (const tok of ['tok_declined', 'tok_3ds', 'tok_timeout']) { const r = await h.request(c.id, 5000); await h.pay(r.id, tok); }
  assert.strictEqual(seen.filter((e) => e.type === paymentEvents.CAPTURED).length, before);
});

test('Request (dueño de paid) y Customer (dueño de total_spent) reaccionan; Payment ya no los escribe', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 80000);
  const res = await h.pay(r.id);
  assert.strictEqual(res.body.request.paid, 1);                                 // Request marcó paid
  assert.strictEqual((await row('/customers/' + c.id)).total_spent, 80000);     // Customer sumó el gasto
  assert.match(res.body.request.erp_invoice, /^INV-/);                          // Request adjuntó la factura que emitió Integration
  assert.ok(last(integrationEvents.INVOICE_ISSUED).payload.invoice.startsWith('INV-'));
});

test('el reembolso publica Payment.Refunded y Customer descuenta el gasto', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 100000); const p = (await h.pay(r.id)).body;
  await h.api('POST', `/payments/${p.id}/refund`, { amount: 30000 });
  const e = last(paymentEvents.REFUNDED);
  assert.deepStrictEqual(e.payload, { paymentId: p.id, requestId: r.id, customerId: c.id, amount: 30000, currency: 'CLP' });
  assert.strictEqual((await row('/customers/' + c.id)).total_spent, 70000);
});

test('promoción a gold: Customer publica TierChanged e Integration actualiza el CRM', async () => {
  const c = await h.customer({ tier: 'silver' }); const r = await h.request(c.id, 2500000);
  const before = helpers.outbox.length;
  await h.pay(r.id);
  assert.deepStrictEqual(last(customerEvents.TIER_CHANGED).payload, { customerId: c.id, tier: 'gold', crmId: c.crm_id });
  assert.strictEqual((await row('/customers/' + c.id)).tier, 'gold');
  const crm = helpers.outbox.slice(before).find((x) => x.url.endsWith('/contacts/' + c.crm_id));
  assert.deepStrictEqual(crm.body, { tier: 'gold' });
});

test('los consumidores toleran campos extra y reaccionan a un evento publicado a mano (contrato)', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 10000);
  await paymentEvents.publishCaptured({ paymentId: 999, requestId: r.id, customerId: c.id, amount: 10000, currency: 'CLP', campoFuturo: 'x' });
  assert.strictEqual((await row('/requests/' + r.id)).paid, 1);
  assert.strictEqual((await row('/customers/' + c.id)).total_spent, 10000);
});

test('un evento que viola el contrato lo rechaza el publicador y no toca a nadie', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 10000);
  await assert.rejects(() => paymentEvents.publishCaptured({ paymentId: 1, requestId: r.id, customerId: c.id, amount: '10000', currency: 'CLP' }), /amount/);
  assert.strictEqual((await row('/requests/' + r.id)).paid, 0);
});

test('aislamiento: un consumidor que falla no rompe el cobro y queda en la bitácora de fallos', async () => {
  bus.subscribe(paymentEvents.CAPTURED, () => { throw new Error('consumidor roto'); }, 'consumidor-roto');
  const c = await h.customer(); const r = await h.request(c.id, 20000);
  const res = await h.pay(r.id);
  assert.strictEqual(res.status, 201); assert.strictEqual(res.body.status, 'paid'); assert.strictEqual(res.body.request.paid, 1);
  assert.ok(bus.deadLetters().some((d) => d.handler === 'consumidor-roto' && d.error === 'consumidor roto'));
});

test('confirmación tardía (webhook): publica Payment.Confirmed, marca la solicitud y NO suma gasto (TD-011)', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const p = (await h.pay(r.id, 'tok_3ds')).body;
  const res = await h.call('POST', '/integrations/webhook/stripey', { type: 'charge.succeeded', data: { object: { id: p.stripey_charge_id } } });
  assert.deepStrictEqual(res.body, { ok: true });
  assert.deepStrictEqual(last(paymentEvents.CONFIRMED).payload, { paymentId: p.id, requestId: r.id, customerId: c.id, amount: 50000, currency: 'CLP' });
  assert.strictEqual((await row('/requests/' + r.id)).paid, 1);
  assert.strictEqual((await row('/customers/' + c.id)).total_spent, 0);          // defecto AS-IS preservado
  assert.strictEqual((await row('/requests/' + r.id)).erp_invoice, null);
  assert.strictEqual((await row('/payments/' + p.id)).stripey_status, 'succeeded');
});

test('reintento: el límite se informa sin nombrar al proveedor', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 5000); const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await h.pay(r.id, 'tok_declined')).body.id);
  const res = await h.api('POST', `/payments/${ids[0]}/retry`, { token: 'tok_ok' });
  assert.strictEqual(res.status, 429); assert.ok(!/stripey/i.test(res.body.error));
});
