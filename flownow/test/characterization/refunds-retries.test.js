const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('reembolso parcial deja el pago en paid y descuenta total_spent', async () => {
  const { c, p } = await h.paid(100000);
  const r = await h.api('POST', `/payments/${p.body.id}/refund`, { amount: 10000 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'paid'); assert.strictEqual(r.body.refunded_amount, 10000);
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.total_spent, 90000);
});

test('reembolso del saldo completo pasa a refunded; sin monto reembolsa todo', async () => {
  const a = await h.paid(100000);
  await h.api('POST', `/payments/${a.p.body.id}/refund`, { amount: 40000 });
  const full = await h.api('POST', `/payments/${a.p.body.id}/refund`, { amount: 60000 });
  assert.strictEqual(full.body.status, 'refunded'); assert.strictEqual(full.body.refunded_amount, 100000);
  const b = await h.paid(80000);
  const all = await h.api('POST', `/payments/${b.p.body.id}/refund`, {});
  assert.strictEqual(all.body.status, 'refunded');
});

test('reembolso inválido: excede lo pagado o pago no pagado → 400', async () => {
  const { p } = await h.paid(100000);
  const over = await h.api('POST', `/payments/${p.body.id}/refund`, { amount: 100001 });
  assert.strictEqual(over.status, 400); assert.match(over.body.error, /excede/);
  const c = await h.customer(); const r = await h.request(c.id, 5000);
  const declined = await h.pay(r.id, 'tok_declined');
  assert.strictEqual((await h.api('POST', `/payments/${declined.body.id}/refund`, {})).status, 400);
  assert.strictEqual((await h.api('POST', '/payments/999999/refund', {})).status, 404);
});

test('reintento: sólo pagos failed/error; el anterior queda superseded y el nuevo se cobra', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const failed = await h.pay(r.id, 'tok_declined');
  const retry = await h.api('POST', `/payments/${failed.body.id}/retry`, { token: 'tok_ok' });
  assert.strictEqual(retry.status, 201); assert.strictEqual(retry.body.status, 'paid');
  assert.strictEqual((await h.api('GET', '/payments/' + failed.body.id)).body.status, 'superseded');
  assert.strictEqual((await h.api('POST', `/payments/${retry.body.id}/retry`, { token: 'tok_ok' })).status, 400);
});

test('reintento: con 3 pagos fallidos en la misma solicitud responde 429', async () => {
  // Hallazgo: encadenando reintentos el contador nunca llega a 3 (cada reintento marca el anterior superseded);
  // sólo se alcanza con 3 cobros fallidos directos sobre la misma solicitud.
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await h.pay(r.id, 'tok_declined')).body.id);
  const res = await h.api('POST', `/payments/${ids[0]}/retry`, { token: 'tok_ok' });
  assert.strictEqual(res.status, 429);
});

test('cancelar una solicitud pagada reembolsa, la cancela y libera la cuenta de abiertas', async () => {
  const { c, r } = await h.paid(100000);
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.open_requests, 1);
  const res = await h.api('POST', `/requests/${r.id}/cancel`);
  assert.strictEqual(res.status, 200); assert.strictEqual(res.body.status, 'cancelled');
  assert.strictEqual(res.body.payments[0].status, 'refunded');
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.open_requests, 0);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Solicitud cancelada'));
  assert.strictEqual((await h.api('POST', `/requests/${r.id}/cancel`)).status, 400);
});
