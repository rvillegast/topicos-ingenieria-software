// Contrato público de eventos de Payment (v1). Payment los publica sin conocer a sus consumidores (ADR-004).
// Los payloads NO llevan campos ni nombres del proveedor. `amount` está en la moneda del cobro (`currency`).
const bus = require('../../../platform/events');

exports.CAPTURED = 'Payment.Captured';
exports.REFUNDED = 'Payment.Refunded';
exports.FAILED = 'Payment.Failed';                  // reason: 'declined' | 'unavailable' | 'unknown'
exports.ACTION_REQUIRED = 'Payment.ActionRequired';
exports.CONFIRMED = 'Payment.Confirmed';   // confirmación tardía del proveedor (webhook); ver TD-011

const fields = { paymentId: 'number', requestId: 'number', customerId: 'number', amount: 'number', currency: 'string' };
bus.registerContract(exports.CAPTURED, 1, fields);
bus.registerContract(exports.REFUNDED, 1, fields);   // amount = monto reembolsado
bus.registerContract(exports.CONFIRMED, 1, fields);
bus.registerContract(exports.ACTION_REQUIRED, 1, fields);
bus.registerContract(exports.FAILED, 1, { ...fields, reason: 'string' });

exports.publishCaptured = (p) => bus.publish(exports.CAPTURED, p);
exports.publishRefunded = (p) => bus.publish(exports.REFUNDED, p);
exports.publishConfirmed = (p) => bus.publish(exports.CONFIRMED, p);
exports.publishFailed = (p) => bus.publish(exports.FAILED, p);
exports.publishActionRequired = (p) => bus.publish(exports.ACTION_REQUIRED, p);
