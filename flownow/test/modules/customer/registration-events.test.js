// Paso 10: el alta de cliente publica Customer.Registered; CRM y bienvenida son consumidores (ADR-004, TD-001).
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../../support/harness');
const bus = require('../../../src/platform/events');
const customerEvents = require('../../../src/modules/customer/contract/events');
const integrationEvents = require('../../../src/modules/integration/contract/events');
const helpers = require('../../../src/utils/helpers');

let h; const seen = [];
test.before(async () => {
  h = await start();
  for (const t of [customerEvents.REGISTERED, integrationEvents.CONTACT_SYNCED]) bus.subscribe(t, (e) => { seen.push(e); }, 'espía-de-prueba');
});
test.after(async () => { await h.close(); });
const last = (type) => [...seen].reverse().find((e) => e.type === type);

test('el alta publica Customer.Registered v1 y Customer guarda el crm_id que Integration informa', async () => {
  const c = await h.customer();
  assert.deepStrictEqual(last(customerEvents.REGISTERED).payload, { customerId: c.id, name: c.name, email: c.email });
  const synced = last(integrationEvents.CONTACT_SYNCED).payload;
  assert.strictEqual(synced.customerId, c.id); assert.strictEqual(c.crm_id, synced.crmId);
});

test('orden de efectos del alta (igual que el AS-IS): CRM -> bienvenida', async () => {
  const n = helpers.outbox.length; await h.customer();
  assert.deepStrictEqual(helpers.outbox.slice(n).map((x) => x.url), ['https://api.hubcrm.com/v2/contacts', 'https://api.mailblast.io/v3/send']);
});

test('TD-001: CRM caído -> el alta NO falla, el cliente recibe bienvenida, el fallo queda en la bitácora y resync lo repara', async () => {
  const original = helpers.httpPost; let calls = 0;
  helpers.httpPost = async (url, body) => { if (url.includes('hubcrm')) { calls++; throw new Error('crm caído'); } return original(url, body); };
  let c;
  try { c = await h.customer(); } finally { helpers.httpPost = original; }
  assert.strictEqual(calls, 3, 'reintenta 3 veces');
  assert.strictEqual(c.crm_id, null);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Bienvenido a FlowNow'));
  assert.ok(bus.deadLetters().some((d) => d.handler === 'integration.syncCrmContact' && d.error === 'crm caído'));
  await h.api('POST', '/integrations/crm/resync');
  assert.match((await h.api('GET', '/customers/' + c.id)).body.crm_id, /^crm_/);
});
