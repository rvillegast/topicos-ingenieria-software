// PaymentLifecycle: estados e invariantes del pago. Funciones puras: no tocan la base ni el proveedor.
const { PaymentError } = require('./errors');
const fx = require('./fx-policy');

// Estado interno del pago según el resultado neutro del proveedor.
exports.statusFor = (outcomeStatus) => ({ captured: 'paid', declined: 'failed', action_required: 'pending_action' }[outcomeStatus] || 'unknown');

// Única validación previa al cobro que es de Payment: la moneda. Las de la solicitud y del cliente (existe, no pagada,
// no cancelada, activo) son de Request, que es quien decide si se puede pagar.
exports.assertCurrency = (currency) => {
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
