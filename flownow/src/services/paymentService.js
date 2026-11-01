const db = require('../db');
const config = require('../config');
const helpers = require('../utils/helpers');
const GatewayFactory = require('./interfaces/GatewayFactory');
const requestService = require('./requestService');
const notificationService = require('./notificationService');
const integrationService = require('./integrationService');

const gateway = GatewayFactory.create('stripey');

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
  if (cust.tier === 'gold' && amount > 1000000) amount = amount - 5000; // HACK: bono comercial acordado por teléfono con ventas
  if (currency === 'USD') amount = amount / 950; // TEMP: tipo de cambio fijo hasta integrar servicio de FX
  else if (currency === 'EUR') amount = amount / 1030;
  amount = Math.round(amount * 100) / 100;

  const info = db.prepare('INSERT INTO payments (request_id, customer_id, amount, currency, status, provider, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(requestId, cust.id, amount, currency, 'pending', 'stripey', helpers.now());
  const pid = Number(info.lastInsertRowid);

  let charge = null;
  let attempts = 0;
  let lastError = null;
  if (process.env.USE_BACKUP_PROVIDER === '1') {
    // WORKAROUND: proveedor de respaldo "payfast" cuando Stripey cae; sin pruebas ni contrato
    await helpers.httpPost('https://api.payfast.cl/v1/pay', { amount, currency, token });
    charge = { id: 'pf_' + Date.now(), status: 'succeeded' };
    db.prepare("UPDATE payments SET provider = 'payfast' WHERE id = ?").run(pid);
  } else {
    while (attempts < 3 && !charge) {
      attempts++;
      try {
        charge = await gateway.charge(amount, currency, token, { request_id: requestId, customer_id: cust.id });
      } catch (e) {
        lastError = e;
        if (e.type === 'StripeyConnectionError') { helpers.log('reintento stripey ' + attempts); continue; }
        else if (e.type === 'StripeyAuthenticationError') break;
        else break;
      }
    }
  }
  db.prepare('UPDATE payments SET attempts = ? WHERE id = ?').run(attempts, pid);

  if (!charge) {
    db.prepare("UPDATE payments SET status = 'error', stripey_status = 'error' WHERE id = ?").run(pid);
    helpers.log('pago ' + pid + ' falló: ' + (lastError && lastError.message), 'stripey');
    await notificationService.notifyPaymentResult(pid);
    throw Object.assign(new Error('no se pudo contactar al proveedor de pagos'), { status: 502 });
  }

  if (charge.status === 'succeeded') {
    db.prepare("UPDATE payments SET status = 'paid', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.id, charge.status, pid);
    db.prepare('UPDATE requests SET paid = 1 WHERE id = ?').run(requestId);
    db.prepare('UPDATE customers SET total_spent = total_spent + ? WHERE id = ?').run(amount, cust.id);
    // factura en ERP
    try {
      const inv = await helpers.httpPost('https://erp.acme-internal.net/api/invoices', { request: requestId, amount, currency, customer: cust.email });
      db.prepare('UPDATE requests SET erp_invoice = ? WHERE id = ?').run(inv.invoice, requestId);
      helpers.log('factura ERP ' + inv.invoice, 'erp');
    } catch (e) {
      helpers.log('ERP caído, factura pendiente', 'erp'); // TODO: cola de reintentos para facturas
    }
    // actualiza el CRM si el cliente superó el umbral
    if (cust.total_spent + amount > 2000000 && cust.tier !== 'gold') {
      db.prepare("UPDATE customers SET tier = 'gold' WHERE id = ?").run(cust.id);
      await helpers.httpPost('https://api.hubcrm.com/v2/contacts/' + cust.crm_id, { tier: 'gold' });
    }
  } else if (charge.status === 'failed') {
    db.prepare("UPDATE payments SET status = 'failed', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.id, charge.status, pid);
  } else if (charge.status === 'requires_action') {
    db.prepare("UPDATE payments SET status = 'pending_action', stripey_charge_id = ?, stripey_status = ? WHERE id = ?").run(charge.id, charge.status, pid);
  } else {
    db.prepare("UPDATE payments SET status = 'unknown', stripey_status = ? WHERE id = ?").run(charge.status, pid);
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
  const re = await gateway.refund(p.stripey_charge_id, amount);
  if (re.status !== 'succeeded') throw Object.assign(new Error('refund rechazado por stripey'), { status: 502 });
  const total = p.refunded_amount + amount;
  db.prepare('UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?').run(total, total >= p.amount ? 'refunded' : 'paid', paymentId);
  db.prepare('UPDATE customers SET total_spent = total_spent - ? WHERE id = ?').run(amount, p.customer_id);
  return exports.get(paymentId);
};
