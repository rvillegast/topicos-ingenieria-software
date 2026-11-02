// Caracterización del flujo de pago (E3 §3). Documenta el comportamiento ACTUAL, no el deseado.
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../support/harness');
const helpers = require('../../src/utils/helpers');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.close(); });

test('pago aprobado: pagado, solicitud marcada, 1 intento, factura ERP y aviso', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 100000);
  const res = await h.pay(r.id, 'tok_ok');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, 'paid');
  assert.strictEqual(res.body.amount, 100000);
  assert.strictEqual(res.body.currency, 'CLP');
  assert.strictEqual(res.body.attempts, 1);
  assert.strictEqual(res.body.provider, 'stripey');
  assert.strictEqual(res.body.request.paid, 1);
  assert.match(res.body.request.erp_invoice, /^INV-/);
  const subjects = (await h.notifications(c.id)).map((n) => n.subject);
  assert.ok(subjects.includes('Pago confirmado'));
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.total_spent, 100000);
});

test('descuento por tier: silver 10 %, gold 15 %, basic 0 %', async () => {
  const cases = [['basic', 100000, 100000], ['silver', 100000, 90000], ['gold', 100000, 85000]];
  for (const [tier, amount, expected] of cases) {
    const c = await h.customer({ tier }); const r = await h.request(c.id, amount);
    assert.strictEqual(r.discount, { basic: 0, silver: 0.1, gold: 0.15 }[tier]);
    const res = await h.pay(r.id);
    assert.strictEqual(res.body.amount, expected, tier);
  }
});

test('bono gold: -5000 si el monto con descuento supera 1.000.000', async () => {
  const c = await h.customer({ tier: 'gold' });
  const big = await h.request(c.id, 1200000);   // 1.200.000 - 15 % = 1.020.000 -> -5000
  assert.strictEqual((await h.pay(big.id)).body.amount, 1015000);
  const small = await h.request(c.id, 1100000); // 1.100.000 - 15 % = 935.000 -> sin bono
  assert.strictEqual((await h.pay(small.id)).body.amount, 935000);
});

test('moneda: USD ÷ 950 y EUR ÷ 1030 con redondeo a 2 decimales', async () => {
  const c = await h.customer();
  const r1 = await h.request(c.id, 95000);
  const usd = await h.pay(r1.id, 'tok_ok', 'USD');
  assert.strictEqual(usd.body.amount, 100); assert.strictEqual(usd.body.currency, 'USD');
  const r2 = await h.request(c.id, 100000);
  const eur = await h.pay(r2.id, 'tok_ok', 'EUR');
  assert.strictEqual(eur.body.amount, 97.09); assert.strictEqual(eur.body.currency, 'EUR');
});

test('rechazo: pago failed, solicitud sin pagar, aviso de rechazo', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const res = await h.pay(r.id, 'tok_declined');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, 'failed');
  assert.strictEqual(res.body.stripey_status, 'failed');
  assert.strictEqual(res.body.request.paid, 0);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Pago rechazado'));
});

test('3DS: queda pending_action y avisa que falta una acción', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const res = await h.pay(r.id, 'tok_3ds');
  assert.strictEqual(res.body.status, 'pending_action');
  assert.strictEqual(res.body.request.paid, 0);
  assert.ok((await h.notifications(c.id)).some((n) => n.subject === 'Pago pendiente'));
});

test('timeout del proveedor: 3 intentos, pago en error y HTTP 502', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  const res = await h.pay(r.id, 'tok_timeout');
  assert.strictEqual(res.status, 502);
  const p = (await h.api('GET', '/payments')).body.find((x) => x.request_id === r.id);
  assert.strictEqual(p.status, 'error'); assert.strictEqual(p.attempts, 3);
});

test('validaciones: doble pago 409, moneda no soportada, cliente inactivo, solicitud cancelada y solicitud inexistente', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 50000);
  assert.strictEqual((await h.pay(r.id, 'tok_ok', 'JPY')).status, 400);
  assert.strictEqual((await h.pay(r.id)).status, 201);
  const again = await h.pay(r.id);
  assert.strictEqual(again.status, 409); assert.match(again.body.error, /ya pagada/);

  const c2 = await h.customer(); const r2 = await h.request(c2.id, 50000);
  await h.api('PUT', '/customers/' + c2.id, { status: 'inactive' });
  assert.strictEqual((await h.pay(r2.id)).status, 400);

  const c3 = await h.customer(); const r3 = await h.request(c3.id, 50000);
  await h.api('POST', `/requests/${r3.id}/status`, { status: 'cancelled' });
  assert.strictEqual((await h.pay(r3.id)).status, 400);

  assert.strictEqual((await h.pay(999999)).status, 404);
});

test('promoción a gold: acumulado > 2.000.000 sube el tier y notifica al CRM', async () => {
  const c = await h.customer({ tier: 'silver' });
  const r = await h.request(c.id, 2500000); // 2.500.000 - 10 % = 2.250.000
  const before = helpers.outbox.length;
  await h.pay(r.id);
  assert.strictEqual((await h.api('GET', '/customers/' + c.id)).body.tier, 'gold');
  const calls = helpers.outbox.slice(before).map((x) => x.url);
  assert.ok(calls.some((u) => u.startsWith('https://api.hubcrm.com/v2/contacts/')), 'actualiza el contacto en el CRM');
});

test('efectos laterales de un pago aprobado: ERP, evento CRM y bitácora de integración', async () => {
  const c = await h.customer(); const r = await h.request(c.id, 70000);
  const before = helpers.outbox.length;
  await h.pay(r.id);
  const urls = helpers.outbox.slice(before).map((x) => x.url);
  assert.ok(urls.includes('https://erp.acme-internal.net/api/invoices'));
  assert.ok(urls.includes('https://api.hubcrm.com/v2/events'));
  const systems = (await h.api('GET', '/integrations/logs')).body.map((l) => l.system);
  assert.ok(systems.includes('erp') && systems.includes('hubcrm'));
});

test('proveedor de respaldo (USE_BACKUP_PROVIDER=1): cobra por payfast', async () => {
  process.env.USE_BACKUP_PROVIDER = '1';
  try {
    const c = await h.customer(); const r = await h.request(c.id, 40000);
    const before = helpers.outbox.length;
    const res = await h.pay(r.id);
    assert.strictEqual(res.body.status, 'paid');
    assert.strictEqual(res.body.provider, 'payfast');
    assert.match(res.body.stripey_charge_id, /^pf_/);
    assert.ok(helpers.outbox.slice(before).some((x) => x.url === 'https://api.payfast.cl/v1/pay'));
  } finally { delete process.env.USE_BACKUP_PROVIDER; }
});

test('resumen de pagos: total en CLP, fallidos y proveedor', async () => {
  const s = (await h.api('GET', '/payments/summary')).body;
  assert.ok(s.total > 0 && s.failed >= 1);
  assert.strictEqual(s.provider, 'stripey');
  assert.match(s.totalFormatted, /^\$/);
});

test('respaldo PayFast: no registra intentos (attempts = 0) y su pago se reembolsa por el proveedor principal', async () => {
  // Quirk del AS-IS (TD-005): la ruta de respaldo no pasa por el bucle de reintentos y los reembolsos
  // siempre salen por Stripey, aunque el cobro haya sido por PayFast. Se caracteriza antes de refactorizar.
  process.env.USE_BACKUP_PROVIDER = '1';
  let paid;
  try { const c = await h.customer(); const r = await h.request(c.id, 40000); paid = (await h.pay(r.id)).body; }
  finally { delete process.env.USE_BACKUP_PROVIDER; }
  assert.strictEqual(paid.provider, 'payfast'); assert.strictEqual(paid.attempts, 0); assert.strictEqual(paid.stripey_status, 'succeeded');
  const refund = await h.api('POST', `/payments/${paid.id}/refund`, {});
  assert.strictEqual(refund.status, 200); assert.strictEqual(refund.body.status, 'refunded');
});
