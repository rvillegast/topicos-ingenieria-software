const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('prioridad: >500.000 o gold = high; <20.000 = low; resto normal', async () => {
  const basic = await h.customer(); const gold = await h.customer({ tier: 'gold' });
  assert.strictEqual((await h.request(basic.id, 600000)).priority, 'high');
  assert.strictEqual((await h.request(basic.id, 15000)).priority, 'low');
  assert.strictEqual((await h.request(basic.id, 100000)).priority, 'normal');
  assert.strictEqual((await h.request(gold.id, 100000)).priority, 'high');
});

test('crear solicitud: valida monto y cliente activo, registra aviso', async () => {
  const c = await h.customer();
  assert.strictEqual((await h.api('POST', '/requests', { customer_id: c.id, title: 'x', amount: 0 })).status, 400);
  assert.strictEqual((await h.api('POST', '/requests', { customer_id: c.id, title: 'x', amount: 'abc' })).status, 400);
  assert.strictEqual((await h.api('POST', '/requests', { customer_id: 999999, title: 'x', amount: 10 })).status, 400);
  const ok = await h.api('POST', '/requests', { customer_id: c.id, title: 'x', amount: 10000 });
  assert.strictEqual(ok.status, 201); assert.strictEqual(ok.body.status, 'new'); assert.strictEqual(ok.body.paid, 0);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Solicitud recibida'));
});

test('máximo 10 solicitudes abiertas por cliente → 429', async () => {
  const c = await h.customer();
  for (let i = 0; i < 10; i++) assert.strictEqual((await h.api('POST', '/requests', { customer_id: c.id, title: 'r' + i, amount: 10000 })).status, 201);
  assert.strictEqual((await h.api('POST', '/requests', { customer_id: c.id, title: 'r11', amount: 10000 })).status, 429);
});

test('máquina de estados: new→in_progress→done; done exige pago; transiciones inválidas → 400', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 30000);
  const st = (s) => h.api('POST', `/requests/${r.id}/status`, { status: s });
  assert.strictEqual((await st('done')).status, 400);                  // new → done
  assert.strictEqual((await st('in_progress')).body.status, 'in_progress');
  const unpaid = await st('done');
  assert.strictEqual(unpaid.status, 400); assert.match(unpaid.body.error, /sin pago/);
  await h.pay(r.id);
  assert.strictEqual((await st('done')).body.status, 'done');
  assert.strictEqual((await st('cancelled')).status, 400);             // done es terminal
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.open_requests, 0);
});

test('creación masiva: omite clientes inactivos, calcula prioridad y descuento, máximo 50', async () => {
  const silver = await h.customer({ tier: 'silver' }); const off = await h.customer();
  await h.api('PUT', '/customers/' + off.id, { status: 'inactive' });
  const res = await h.api('POST', '/requests/bulk', { items: [
    { customer_id: silver.id, title: 'a', amount: 15000 },
    { customer_id: silver.id, title: 'b', amount: 600000 },
    { customer_id: off.id, title: 'c', amount: 1000 },
  ] });
  assert.strictEqual(res.status, 201); assert.strictEqual(res.body.created.length, 2);
  const [a, b] = await Promise.all(res.body.created.map((id) => h.api('GET', '/requests/' + id)));
  assert.strictEqual(a.body.priority, 'low'); assert.strictEqual(b.body.priority, 'high');
  assert.strictEqual(a.body.discount, 0.1);
  const many = Array.from({ length: 51 }, () => ({ customer_id: silver.id, title: 'x', amount: 1000 }));
  assert.strictEqual((await h.api('POST', '/requests/bulk', { items: many })).status, 400);
});

test('solicitud inexistente → 404', async () => {
  assert.strictEqual((await h.api('GET', '/requests/999999')).status, 404);
});
