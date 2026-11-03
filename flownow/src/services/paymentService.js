const db = require('../db');
const helpers = require('../utils/helpers');
const providers = require('../modules/payment/providers');
const paymentEvents = require('../modules/payment/contract/events');
const lifecycle = require('../modules/payment/domain/payment-lifecycle');
const fx = require('../modules/payment/domain/fx-policy');
const { amountDue } = require('../modules/payment/domain/amount-due');
const { chargeWithRetry } = require('../modules/payment/domain/charge-retry-policy');
const notificationService = require('./notificationService');
const integrationService = require('./integrationService');

exports.get = (id) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  if (!p) throw Object.assign(new Error('pago no encontrado'), { status: 404 });
  return p;
};
exports.listForRequest = (rid) => db.prepare('SELECT * FROM payments WHERE request_id = ? ORDER BY id').all(rid);
exports.list = () => db.prepare('SELECT * FROM payments ORDER BY id DESC').all();

// --- Pasos de processPayment (cada uno con una sola razón de cambio) ---

const loadPayable = (requestId, currency) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  const customer = request && db.prepare('SELECT * FROM customers WHERE id = ?').get(request.customer_id);
  lifecycle.assertPayable({ request, customer, currency });
  return { request, customer };
};

const insertPending = (request, customer, amount, currency, providerName) =>
  Number(db.prepare('INSERT INTO payments (request_id, customer_id, amount, currency, status, provider, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(request.id, customer.id, amount, currency, 'pending', providerName, helpers.now()).lastInsertRowid);

// Persiste el resultado del cobro (columnas stripey_* heredadas: se renombran en el paso 7, TD-010).
const recordOutcome = (pid, charge) => {
  const status = lifecycle.statusFor(charge.status);
  if (status === 'unknown') db.prepare("UPDATE payments SET status = 'unknown', stripey_status = ? WHERE id = ?").run(charge.providerStatus, pid);
  else db.prepare('UPDATE payments SET status = ?, stripey_charge_id = ?, stripey_status = ? WHERE id = ?').run(status, charge.providerRef, charge.providerStatus, pid);
};

const failUnreachable = async (pid, providerName, lastError) => {
  db.prepare("UPDATE payments SET status = 'error', stripey_status = 'error' WHERE id = ?").run(pid);
  helpers.log('pago ' + pid + ' falló: ' + (lastError && lastError.message), providerName);
  await notificationService.notifyPaymentResult(pid);
  throw Object.assign(new Error('no se pudo contactar al proveedor de pagos'), { status: 502 });
};

// Orquesta el cobro: validar -> calcular monto -> cobrar con reintentos -> registrar -> publicar evento -> avisar.
exports.processPayment = async (requestId, token, currency) => {
  currency = currency || 'CLP';
  const { request, customer } = loadPayable(requestId, currency);
  const amount = fx.round2(fx.fromClp(amountDue({ amount: request.amount, discount: request.discount, tier: customer.tier }), currency));

  const provider = providers.active();
  const pid = insertPending(request, customer, amount, currency, provider.name);
  const { charge, attempts, lastError } = await chargeWithRetry(
    provider, { amount, currency, token, metadata: { request_id: request.id, customer_id: customer.id } },
    (n) => helpers.log('reintento ' + provider.name + ' ' + n));
  db.prepare('UPDATE payments SET attempts = ? WHERE id = ?').run(attempts, pid);
  if (!charge) return failUnreachable(pid, provider.name, lastError);

  recordOutcome(pid, charge);
  // Los efectos de un cobro capturado (solicitud pagada, gasto del cliente, factura ERP, tier en el CRM) los
  // aplican sus dueños al recibir el evento: Payment ya no escribe en requests ni en customers.
  if (charge.status === 'captured') {
    await paymentEvents.publishCaptured({ paymentId: pid, requestId: request.id, customerId: customer.id, amount, currency });
  }
  await notificationService.notifyPaymentResult(pid);
  await integrationService.pushPaymentToWebhooks(pid);
  return exports.get(pid);
};

exports.refund = async (paymentId, amount) => {
  const p = exports.get(paymentId);
  const plan = lifecycle.planRefund(p, amount);
  const re = await providers.forRefund().refund({ providerRef: p.stripey_charge_id, amount: plan.amount });
  if (!re.ok) throw Object.assign(new Error('refund rechazado por el proveedor'), { status: 502 });
  db.prepare('UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?').run(plan.total, plan.status, paymentId);
  await paymentEvents.publishRefunded({ paymentId, requestId: p.request_id, customerId: p.customer_id, amount: plan.amount, currency: p.currency });
  return exports.get(paymentId);
};
