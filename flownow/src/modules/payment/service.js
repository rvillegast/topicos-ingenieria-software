// Servicio interno de Payment. Nadie fuera del módulo lo importa: el resto usa `contract/index.js`.
// Payment es una HOJA del grafo: recibe el monto ya resuelto en CLP y no lee ni escribe tablas de otros módulos.
const repo = require('./persistence/payment-repository');
const helpers = require('../../utils/helpers');
const providers = require('./providers');
const paymentEvents = require('./contract/events');
const lifecycle = require('./domain/payment-lifecycle');
const { PaymentError } = require('./domain/errors');
const fx = require('./domain/fx-policy');
const { chargeWithRetry } = require('./domain/charge-retry-policy');

exports.get = (id) => {
  const p = repo.get(id);
  if (!p) throw new PaymentError('pago no encontrado', 404);
  return p;
};
exports.listForRequest = (rid) => repo.listForRequest(rid);
exports.list = () => repo.list();

// --- Consultas para otros módulos (nadie más toca payment_payments) ---
exports.reassignCustomer = (fromId, toId) => repo.reassignCustomer(fromId, toId);
exports.paidCountByCustomer = () => repo.paidCountByCustomer();
exports.paidTotal = (currency) => repo.paidTotal(currency);
exports.summaryRows = () => repo.summaryRows();
exports.reportRows = (from, to) => repo.between(from || '0000', to || '9999');
exports.toClp = (amount, currency) => fx.toClp(amount, currency);   // la conversión de moneda es secreto de Payment

// --- Pasos de createPayment (cada uno con una sola razón de cambio) ---

const insertPending = (cmd, amount, currency, providerName) =>
  repo.insertPending({ requestId: cmd.requestId, customerId: cmd.customerId, amount, currency, provider: providerName, createdAt: helpers.now() });

const recordOutcome = (pid, charge) =>
  repo.recordOutcome(pid, { status: lifecycle.statusFor(charge.status), providerRef: charge.providerRef, providerStatus: charge.providerStatus });

const failUnreachable = async (pid, base, providerName, lastError) => {
  repo.markError(pid);
  helpers.log('pago ' + pid + ' falló: ' + (lastError && lastError.message), providerName);
  await paymentEvents.publishFailed({ ...base, reason: 'unavailable' });
  throw Object.assign(new Error('no se pudo contactar al proveedor de pagos'), { status: 502 });
};

// Publica el resultado del cobro. Quién reacciona (solicitud, cliente, avisos, ERP, CRM) no es asunto de Payment.
const publishOutcome = (base, charge) => {
  switch (charge.status) {
    case 'captured': return paymentEvents.publishCaptured(base);
    case 'declined': return paymentEvents.publishFailed({ ...base, reason: 'declined' });
    case 'action_required': return paymentEvents.publishActionRequired(base);
    default: return paymentEvents.publishFailed({ ...base, reason: 'unknown' });
  }
};

// Cobra `cmd.amount` (CLP, ya con descuentos resueltos por quien lo pide) en la moneda indicada.
//   cmd: { requestId, customerId, amount, currency?, token }
// Orquesta: validar moneda -> convertir -> cobrar con reintentos -> registrar -> publicar el resultado.
exports.createPayment = async (cmd) => {
  const currency = cmd.currency || 'CLP';
  lifecycle.assertCurrency(currency);
  const amount = fx.round2(fx.fromClp(cmd.amount, currency));

  const provider = providers.active();
  const pid = insertPending(cmd, amount, currency, provider.name);
  const { charge, attempts, lastError } = await chargeWithRetry(
    provider, { amount, currency, token: cmd.token, metadata: { request_id: cmd.requestId, customer_id: cmd.customerId } },
    (n) => helpers.log('reintento ' + provider.name + ' ' + n));
  repo.setAttempts(pid, attempts);
  const base = { paymentId: pid, requestId: cmd.requestId, customerId: cmd.customerId, amount, currency };
  if (!charge) return failUnreachable(pid, base, provider.name, lastError);

  recordOutcome(pid, charge);
  await publishOutcome(base, charge);
  return exports.get(pid);
};

exports.refund = async (paymentId, amount) => {
  const p = exports.get(paymentId);
  const plan = lifecycle.planRefund(p, amount);
  const re = await providers.forRefund().refund({ providerRef: p.provider_ref, amount: plan.amount });
  if (!re.ok) throw Object.assign(new Error('refund rechazado por el proveedor'), { status: 502 });
  repo.applyRefund(paymentId, plan.total, plan.status);
  await paymentEvents.publishRefunded({ paymentId, requestId: p.request_id, customerId: p.customer_id, amount: plan.amount, currency: p.currency });
  return exports.get(paymentId);
};

// Primera mitad de un reintento: valida los invariantes y marca el pago anterior como reemplazado. Devuelve lo
// que quien reintenta necesita para volver a cobrar (la solicitud y la moneda); el nuevo cobro lo pide Request.
exports.beginRetry = (paymentId) => {
  const p = repo.get(paymentId);
  if (!p) throw new PaymentError('no existe', 404);
  if (!lifecycle.isRetryable(p)) throw new PaymentError('sólo pagos fallidos', 400);
  if (repo.countFailedForRequest(p.request_id) >= lifecycle.MAX_FAILED_PER_REQUEST) throw new PaymentError('máximo 3 reintentos', 429);
  repo.supersede(p.id);
  return { requestId: p.request_id, currency: p.currency };
};

// Webhook entrante de un proveedor: el adapter traduce, Payment aplica. Preserva el AS-IS: una confirmación tardía
// marca el pago y la solicitud, pero NO suma gasto ni factura (TD-011).
exports.handleWebhook = async (providerName, body) => {
  const evt = providers.byName(providerName).parseWebhook(body);
  const p = evt && repo.findByProviderRef(evt.providerRef);
  if (!p) return { ignored: true };
  if (evt.event === 'captured') {
    repo.setProviderResult(p.id, 'paid', evt.providerStatus);
    await paymentEvents.publishConfirmed({ paymentId: p.id, requestId: p.request_id, customerId: p.customer_id, amount: p.amount, currency: p.currency });
  } else if (evt.event === 'declined') {
    repo.setProviderResult(p.id, 'failed', evt.providerStatus);
  }
  return { ok: true };
};
