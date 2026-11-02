const db = require('../db');
const config = require('../platform/config');
const helpers = require('../utils/helpers');
const providers = require('../modules/payment/providers');
const { ProviderUnavailableError } = require('../modules/payment/providers/errors');
const requestService = require('./requestService');
const notificationService = require('./notificationService');
const integrationService = require('./integrationService');

exports.get = (id) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  if (!p) throw Object.assign(new Error('pago no encontrado'), { status: 404 });
  return p;
};
exports.listForRequest = (rid) => db.prepare('SELECT * FROM payments WHERE request_id = ? ORDER BY id').all(rid);
exports.list = () => db.prepare('SELECT * FROM payments ORDER BY id DESC').all();

// Procesa un pago completo: validación, descuento, cobro, reintentos, estados, ERP, CRM, notificación
exports.processPayment = async (requestId, token, currency) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!r) throw Object.assign(new Error('solicitud no encontrada'), { status: 404 });
  if (r.paid) throw Object.assign(new Error('solicitud ya pagada'), { status: 409 });
  if (r.status === 'cancelled') throw Object.assign(new Error('solicitud cancelada'), { status: 400 });
  const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(r.customer_id);
  if (cust.status !== 'active') throw Object.assign(new Error('cliente inactivo'), { status: 400 });
  currency = currency || 'CLP';
  if (['CLP', 'USD', 'EUR'].indexOf(currency) === -1) throw Object.assign(new Error('moneda no soportada'), { status: 400 });

  let amount = r.amount;
  if (r.discount > 0) amount = amount - amount * r.discount;
  if (cust.tier === 'gold' && amount > 1000000) amount = amount - 5000; // HACK(TD-003): bono comercial acordado por teléfono con ventas
  if (currency !== 'CLP') amount = amount / config.fx.rates[currency]; // TEMP(TD-002): tasa fija hasta integrar un servicio de FX
  amount = Math.round(amount * 100) / 100;

  const provider = providers.active();
  const info = db.prepare('INSERT INTO payments (request_id, customer_id, amount, currency, status, provider, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(requestId, cust.id, amount, currency, 'pending', provider.name, helpers.now());
  const pid = Number(info.lastInsertRowid);

  // Cobro vía el puerto del proveedor: el dominio sólo ve resultados y errores neutros.
  let charge = null;
  let attempts = 0;
  let lastError = null;
  while (attempts < 3 && !charge) {
    attempts++;
    try {
      charge = await provider.charge({ amount, currency, token, metadata: { request_id: requestId, customer_id: cust.id } });
    } catch (e) {
      lastError = e;
      if (e instanceof ProviderUnavailableError) { helpers.log('reintento ' + provider.name + ' ' + attempts); continue; }
      break;
    }
  }
  db.prepare('UPDATE payments SET attempts = ? WHERE id = ?').run(attempts, pid);

  if (!charge) {
    db.prepare("UPDATE payments SET status = 'error', stripey_status = 'error' WHERE id = ?").run(pid);
    helpers.log('pago ' + pid + ' falló: ' + (lastError && lastError.message), provider.name);
    await notificationService.notifyPaymentResult(pid);
    throw Object.assign(new Error('no se pudo contactar al proveedor de pagos'), { status: 502 });
  }

  if (charge.status === 'captured') {
    db.prepare("UPDATE payments SET status = 'paid', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.providerRef, charge.providerStatus, pid);
    db.prepare('UPDATE requests SET paid = 1 WHERE id = ?').run(requestId);
    db.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?').run(amount, cust.id);
    // factura en ERP
    try {
      const inv = await helpers.httpPost(`${config.providers.erp.baseUrl}/invoices`, { request: requestId, amount, currency, customer: cust.email });
      db.prepare('UPDATE requests SET erp_invoice = ? WHERE id = ?').run(inv.invoice, requestId);
      helpers.log('factura ERP ' + inv.invoice, 'erp');
    } catch (e) {
      helpers.log('ERP caído, factura pendiente', 'erp'); // TODO(TD-004): cola de reintentos para facturas
    }
    // actualiza el CRM si el cliente superó el umbral
    if (cust.total_spent + amount > 2000000 && cust.tier !== 'gold') {
      db.prepare("UPDATE customers SET tier = 'gold' WHERE id = ?").run(cust.id);
      await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts/${cust.crm_id}`, { tier: 'gold' });
    }
  } else if (charge.status === 'declined') {
    db.prepare("UPDATE payments SET status = 'failed', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.providerRef, charge.providerStatus, pid);
  } else if (charge.status === 'action_required') {
    db.prepare("UPDATE payments SET status = 'pending_action', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.providerRef, charge.providerStatus, pid);
  } else {
    db.prepare("UPDATE payments SET status = 'unknown', stripey_status = ? WHERE id = ?").run(charge.providerStatus, pid);
  }
  await notificationService.notifyPaymentResult(pid);
  await integrationService.pushPaymentToWebhooks(pid);
  return Object.assign(exports.get(pid), { request: requestService.get(requestId) });
};

exports.refund = async (paymentId, amount) => {
  const p = exports.get(paymentId);
  if (p.status !== 'paid') throw Object.assign(new Error('sólo se reembolsan pagos pagados'), { status: 400 });
  amount = amount || p.amount;
  if (amount + p.refunded_amount > p.amount) throw Object.assign(new Error('excede el monto pagado'), { status: 400 });
  const re = await providers.forRefund().refund({ providerRef: p.stripey_charge_id, amount });
  if (!re.ok) throw Object.assign(new Error('refund rechazado por el proveedor'), { status: 502 });
  const total = p.refunded_amount + amount;
  db.prepare('UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?').run(total, total >= p.amount ? 'refunded' : 'paid', paymentId);
  db.prepare('UPDATE customers SET total_spent = total_spent - ? WHERE id = ?').run(amount, p.customer_id);
  return exports.get(paymentId);
};
