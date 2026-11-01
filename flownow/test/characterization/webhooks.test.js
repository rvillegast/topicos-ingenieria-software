const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

const stripey = (type, id) => h.call('POST', '/integrations/webhook/stripey', { type, data: { object: { id } } });

test('webhook del proveedor de pagos: charge.succeeded paga el pago y la solicitud', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const p = await h.pay(r.id, 'tok_3ds');
  assert.strictEqual(p.body.status, 'pending_action');
  const res = await stripey('charge.succeeded', p.body.stripey_charge_id);
  assert.deepStrictEqual(res.body, { ok: true });
  assert.strictEqual((await h.api('GET', '/payments/' + p.body.id)).body.status, 'paid');
  assert.strictEqual((await h.api('GET', '/requests/' + r.id)).body.paid, 1);
});

test('webhook del proveedor de pagos: charge.failed marca failed; id desconocido se ignora', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const p = await h.pay(r.id, 'tok_3ds');
  await stripey('charge.failed', p.body.stripey_charge_id);
  assert.strictEqual((await h.api('GET', '/payments/' + p.body.id)).body.status, 'failed');
  assert.deepStrictEqual((await stripey('charge.succeeded', 'ch_inexistente')).body, { ignored: true });
});

test('webhook CRM: contact.updated actualiza el cliente; contact.deleted lo desactiva; desconocido se ignora', async () => {
  const c = await h.customer();
  const crm = (b) => h.call('POST', '/integrations/webhook/crm', b);
  const up = await crm({ type: 'contact.updated', contact_id: c.crm_id, name: 'Nuevo Nombre', phone: '+56900000000', tier: 'silver' });
  assert.deepStrictEqual(up.body, { updated: c.id });
  const got = (await h.api('GET', '/customers/' + c.id)).body;
  assert.strictEqual(got.name, 'Nuevo Nombre'); assert.strictEqual(got.tier, 'silver');
  assert.deepStrictEqual((await crm({ type: 'contact.deleted', contact_id: c.crm_id })).body, { deactivated: true });
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.status, 'inactive');
  assert.deepStrictEqual((await crm({ type: 'contact.updated', contact_id: 'crm_no_existe' })).body, { ignored: true });
  assert.deepStrictEqual((await crm({ type: 'otro' })).body, { ignored: true });
});

test('los webhooks no exigen token; el resto de la API sí', async () => {
  assert.strictEqual((await h.call('POST', '/integrations/webhook/crm', { type: 'x' })).status, 200);
  assert.strictEqual((await h.call('GET', '/customers')).status, 401);
});

test('re-sincronización manual con el CRM y bitácora de integración', async () => {
  const res = await h.api('POST', '/integrations/crm/resync');
  assert.strictEqual(res.status, 200); assert.ok('pending' in res.body && 'synced' in res.body);
  const logs = (await h.api('GET', '/integrations/logs')).body;
  assert.ok(logs.some((l) => l.system === 'hubcrm' && l.direction === 'in'));
});
