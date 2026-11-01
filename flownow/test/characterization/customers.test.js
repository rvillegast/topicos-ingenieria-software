const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('alta: valores por defecto, sync con CRM (crm_id) y aviso de bienvenida', async () => {
  const c = await h.customer({ name: 'Ana Pérez' });
  assert.strictEqual(c.status, 'active'); assert.strictEqual(c.tier, 'basic'); assert.strictEqual(c.total_spent, 0);
  assert.match(c.crm_id, /^crm_/);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Bienvenido a FlowNow'));
});

test('validaciones de alta: nombre, email, teléfono y duplicado', async () => {
  const post = (b) => h.api('POST', '/customers', b);
  assert.strictEqual((await post({ name: 'A', email: 'a@b.cl' })).status, 400);
  assert.strictEqual((await post({ name: 'Ana', email: 'x' })).status, 400);
  assert.strictEqual((await post({ name: 'Ana', email: 'dup@b.cl', phone: '123' })).status, 400);
  assert.strictEqual((await post({ name: 'Ana', email: 'dup@b.cl' })).status, 201);
  assert.strictEqual((await post({ name: 'Ana', email: 'dup@b.cl' })).status, 409);
});

test('consulta y actualización de cliente', async () => {
  const c = await h.customer();
  assert.strictEqual((await h.api('GET', '/customers/999999')).status, 404);
  const up = await h.api('PUT', '/customers/' + c.id, { tier: 'gold', phone: '+56933334444' });
  assert.strictEqual(up.body.tier, 'gold'); assert.strictEqual(up.body.phone, '+56933334444');
  assert.strictEqual((await h.api('PUT', '/customers/' + c.id, { email: 'malo' })).status, 400);
  assert.ok((await h.api('GET', '/customers')).body.some((x) => x.id === c.id));
});

test('fusión de clientes (admin): reasigna solicitudes y pagos, suma gasto, marca merged', async () => {
  const keep = await h.customer(); const rem = await h.customer();
  const r = await h.request(rem.id, 100000); await h.pay(r.id);
  const res = await h.api('POST', '/customers/merge', { keep_id: keep.id, remove_id: rem.id });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total_spent, 100000);
  assert.strictEqual((await h.api('GET', '/customers/' + rem.id)).body.status, 'merged');
  assert.strictEqual((await h.api('GET', '/requests/' + r.id)).body.customer_id, keep.id);
  assert.strictEqual((await h.api('POST', '/customers/merge', { keep_id: keep.id, remove_id: keep.id })).status, 400);
});

test('exportación CSV de clientes activos', async () => {
  const res = await h.call('GET', '/customers/export.csv', undefined, h.token);
  assert.strictEqual(res.status, 200);
  assert.match(res.text.split('\n')[0], /^id,name,email,tier,total_spent$/);
});

test('difusión: envía un correo por cliente activo, filtrable por tier', async () => {
  const gold = await h.customer({ tier: 'gold' });
  const res = await h.api('POST', '/notifications/broadcast', { subject: 'Aviso', body: 'Mantención', tier: 'gold' });
  assert.ok(res.body.sent >= 1);
  assert.ok((await h.notifications(gold.id)).some((n) => n.subject === 'Aviso' && n.channel === 'email'));
  assert.strictEqual((await h.api('POST', '/notifications/broadcast', { subject: 'x' })).status, 400);
});
