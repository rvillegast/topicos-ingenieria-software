// Archivo aparte: necesita una base de datos limpia para verificar totales exactos.
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');

let h; let refundedPaymentId;
test.before(async () => {
  h = await start();
  const a = await h.customer({ tier: 'silver' });
  const ra = await h.request(a.id, 100000); const pa = await h.pay(ra.id);       // 90.000 CLP
  const b = await h.customer();
  const rb = await h.request(b.id, 95000); await h.pay(rb.id, 'tok_ok', 'USD');  // 100 USD = 95.000 CLP
  const c = await h.customer();
  const rc = await h.request(c.id, 5000); await h.pay(rc.id, 'tok_declined');    // fallido
  await h.api('POST', `/payments/${pa.body.id}/refund`, { amount: 10000 });
  refundedPaymentId = pa.body.id;
});
test.after(async () => { await h.close(); });

test('reporte de ventas: totales en CLP, por tier, proveedor y moneda; reembolsos y neto', async () => {
  const r = (await h.api('GET', '/reports/sales')).body;
  assert.strictEqual(r.count, 3); assert.strictEqual(r.paidCount, 2); assert.strictEqual(r.failedCount, 1);
  assert.strictEqual(r.total, 185000); assert.strictEqual(r.refunded, 10000); assert.strictEqual(r.net, 175000);
  assert.deepStrictEqual(r.byTier, { silver: 90000, basic: 95000 });
  assert.deepStrictEqual(r.byProvider, { stripey: 185000 });
  assert.deepStrictEqual(r.byCurrency, { CLP: 90000, USD: 100 });
  assert.strictEqual(r.stripeyShare, 1);
  assert.match(r.totalFormatted, /^\$185[.,]000$/);
});

test('reporte de ventas: filtro por fechas y exportación CSV', async () => {
  assert.strictEqual((await h.api('GET', '/reports/sales?from=2999-01-01')).body.count, 0);
  const csv = await h.call('GET', '/reports/sales?format=csv', undefined, h.token);
  const lines = csv.text.split('\n');
  assert.strictEqual(lines[0], 'payment_id,amount,currency,status,provider,stripey_status,refunded_amount,request_id,title,discount,customer_id,customer,tier,email');
  assert.strictEqual(lines.length, 4);
});

test('reporte de clientes y de solicitudes', async () => {
  const c = (await h.api('GET', '/reports/customers')).body;
  // Hallazgo (defecto AS-IS): total_spent suma el monto en la moneda del pago, sin convertir a CLP
  // (90.000 - 10.000 reembolsados en CLP + 100 de un pago en USD = 80.100). Se preserva; ver E3 y E5.
  assert.strictEqual(c.count, 3); assert.strictEqual(c.total, 80100); assert.strictEqual(c.top.length, 3);
  const q = (await h.api('GET', '/reports/requests')).body;
  assert.strictEqual(q.count, 3); assert.deepStrictEqual(q.byStatus, { new: 3 }); assert.strictEqual(q.total, 200000);
  const csv = await h.call('GET', '/reports/requests?format=csv', undefined, h.token);
  assert.match(csv.text.split('\n')[0], /^id,title,status,priority,amount,discount,paid,customer,tier$/);
});

test('dashboard: contadores y pagado en CLP', async () => {
  const d = (await h.api('GET', '/reports/dashboard')).body;
  assert.strictEqual(d.customers, 3); assert.strictEqual(d.openRequests, 3);
  assert.match(d.paidCLP, /^\$90[.,]000$/);
  assert.ok(d.notifications >= 6);
  assert.ok(refundedPaymentId);
});
