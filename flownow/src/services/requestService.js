const db = require('../db');
const helpers = require('../utils/helpers');
const customerService = require('./customerService');
const payments = require('../modules/payment/contract');
const { amountDue } = require('../modules/request/pricing');
const notificationService = require('./notificationService');

exports.countOpenFor = (customerId) =>
  db.prepare("SELECT COUNT(*) n FROM requests WHERE customer_id = ? AND status NOT IN ('done','cancelled')").get(customerId).n;

exports.create = async (data) => {
  if (!customerService.isActive(data.customer_id)) throw customerService.httpError(400, 'cliente inactivo o inexistente');
  const c = customerService.get(data.customer_id);
  if (c.open_requests >= 10) throw customerService.httpError(429, 'demasiadas solicitudes abiertas');
  const amount = Number(data.amount);
  if (!(amount > 0)) throw customerService.httpError(400, 'monto inválido');
  const discount = helpers.tierDiscount(c.tier);
  let priority = 'normal';
  if (amount > 500000 || c.tier === 'gold') priority = 'high';
  else if (amount < 20000) priority = 'low';
  const info = db.prepare('INSERT INTO requests (customer_id, title, description, priority, amount, discount, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(c.id, data.title, data.description || '', priority, amount, discount, helpers.now());
  db.prepare('UPDATE customers SET open_requests = open_requests + 1 WHERE id = ?').run(c.id);
  const id = Number(info.lastInsertRowid);
  await notificationService.notifyRequestCreated(c.id, id, amount);
  return exports.get(id);
};

exports.get = (id) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!r) throw customerService.httpError(404, 'solicitud no encontrada');
  r.payments = payments.listForRequest(id);
  return r;
};

exports.list = () => db.prepare('SELECT * FROM requests ORDER BY id DESC').all();

exports.changeStatus = (id, status) => {
  const r = exports.get(id);
  const allowed = { new: ['in_progress', 'cancelled'], in_progress: ['done', 'cancelled'], done: [], cancelled: [] };
  if (!allowed[r.status] || !allowed[r.status].includes(status)) throw customerService.httpError(400, 'transición inválida ' + r.status + '->' + status);
  if (status === 'done' && !r.paid) throw customerService.httpError(400, 'no se puede cerrar sin pago');
  db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, id);
  if (status === 'done' || status === 'cancelled') db.prepare('UPDATE customers SET open_requests = open_requests - 1 WHERE id = ?').run(r.customer_id);
  return exports.get(id);
};

// Paga una solicitud: Request decide SI se puede pagar y CUÁNTO (precio con descuento y bono) y le pide a Payment
// que cobre ese monto. Payment no conoce solicitudes ni clientes. Orden de validación preservado del AS-IS.
exports.payRequest = async (requestId, token, currency) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!r) throw customerService.httpError(404, 'solicitud no encontrada');
  if (r.paid) throw customerService.httpError(409, 'solicitud ya pagada');
  if (r.status === 'cancelled') throw customerService.httpError(400, 'solicitud cancelada');
  const customer = customerService.pricingInfo(r.customer_id);
  if (customer.status !== 'active') throw customerService.httpError(400, 'cliente inactivo');
  const amount = amountDue({ amount: r.amount, discount: r.discount, tier: customer.tier });
  return payments.createPayment({ requestId: r.id, customerId: r.customer_id, amount, currency, token });
};

// Reintenta un cobro fallido: Payment valida y reemplaza el pago anterior; Request vuelve a resolver el monto y cobra.
exports.retryPayment = async (paymentId, token) => {
  const { requestId, currency } = payments.beginRetry(paymentId);
  return exports.payRequest(requestId, token, currency);
};
