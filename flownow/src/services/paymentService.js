const db = require('../db');   // sólo para LEER requests/customers al validar el cobro (se corta en el paso 9)
const repo = require('../modules/payment/persistence/payment-repository');
const helpers = require('../utils/helpers');
const providers = require('../modules/payment/providers');
const paymentEvents = require('../modules/payment/contract/events');
const lifecycle = require('../modules/payment/domain/payment-lifecycle');
const { PaymentError } = require('../modules/payment/domain/errors');
const fx = require('../modules/payment/domain/fx-policy');
const { amountDue } = require('../modules/payment/domain/amount-due');
const { chargeWithRetry } = require('../modules/payment/domain/charge-retry-policy');

exports.get = (id) => {
  const p = repo.get(id);
  if (!p) throw new PaymentError('pago no encontrado', 404);
  return p;
};
exports.listForRequest = (rid) => repo.listForRequest(rid);
exports.list = () => repo.list();

// --- Contrato de consulta para otros módulos (nadie más toca payment_payments) ---
exports.reassignCustomer = (fromId, toId) => repo.reassignCustomer(fromId, toId);
exports.paidCountByCustomer = () => repo.paidCountByCustomer();
exports.paidTotal = (currency) => repo.paidTotal(currency);
exports.summaryRows = () => repo.summaryRows();
exports.reportRows = (from, to) => repo.between(from || '0000', to || '9999');

// --- Pasos de processPayment (cada uno con una sola razón de cambio) ---

const loadPayable = (requestId, currency) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  const customer = request && db.prepare('SELECT * FROM customers WHERE id = ?').get(request.customer_id);
  lifecycle.assertPayable({ request, customer, currency });
  return { request, customer };
};

const insertPending = (request, customer, amount, currency, providerName) =>
  repo.insertPending({ requestId: request.id, customerId: customer.id, amount, currency, provider: providerName, createdAt: helpers.now() });

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
  repo.setAttempts(pid, attempts);
  const base = { paymentId: pid, requestId: request.id, customerId: customer.id, amount, currency };
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

// Reintento de un cobro fallido (antes: SQL y reglas en el controller). Respeta los invariantes del ciclo de vida.
exports.retryPayment = async (paymentId, token) => {
  const p = repo.get(paymentId);
  if (!p) throw new PaymentError('no existe', 404);
  if (!lifecycle.isRetryable(p)) throw new PaymentError('sólo pagos fallidos', 400);
  if (repo.countFailedForRequest(p.request_id) >= lifecycle.MAX_FAILED_PER_REQUEST) throw new PaymentError('máximo 3 reintentos', 429);
  repo.supersede(p.id);
  return exports.processPayment(p.request_id, token, p.currency);
};

// Confirmación tardía del proveedor (webhook): el adapter ya tradujo el evento al vocabulario del dominio.
// Preserva el AS-IS: una confirmación tardía marca el pago y la solicitud, pero NO suma gasto ni factura (TD-011).
exports.applyProviderEvent = async (evt) => {
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
