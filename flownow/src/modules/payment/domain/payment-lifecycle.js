// PaymentLifecycle: estados e invariantes del pago. Funciones puras: no tocan la base ni el proveedor.
const { PaymentError } = require('./errors');
const fx = require('./fx-policy');

// Estado interno del pago según el resultado neutro del proveedor.
exports.statusFor = (outcomeStatus) => ({ captured: 'paid', declined: 'failed', action_required: 'pending_action' }[outcomeStatus] || 'unknown');

// Invariantes para cobrar una solicitud. Orden de validación preservado del AS-IS.
exports.assertPayable = ({ request, customer, currency }) => {
  if (!request) throw new PaymentError('solicitud no encontrada', 404);
  if (request.paid) throw new PaymentError('solicitud ya pagada', 409);
  if (request.status === 'cancelled') throw new PaymentError('solicitud cancelada', 400);
  if (customer.status !== 'active') throw new PaymentError('cliente inactivo', 400);
  if (!fx.isSupported(currency)) throw new PaymentError('moneda no soportada', 400);
};

// Invariantes del reembolso: sólo pagos `paid`; reembolsado acumulado <= pagado. Devuelve el plan a aplicar.
exports.planRefund = (payment, requestedAmount) => {
  if (payment.status !== 'paid') throw new PaymentError('sólo se reembolsan pagos pagados', 400);
  const amount = requestedAmount || payment.amount;
  if (amount + payment.refunded_amount > payment.amount) throw new PaymentError('excede el monto pagado', 400);
  const total = payment.refunded_amount + amount;
  return { amount, total, status: total >= payment.amount ? 'refunded' : 'paid' };
};

// Un pago fallido/en error admite reintento; el límite por solicitud lo aplica quien cuenta los pagos.
exports.isRetryable = (payment) => payment.status === 'failed' || payment.status === 'error';
exports.MAX_FAILED_PER_REQUEST = 3;
