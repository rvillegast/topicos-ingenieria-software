// Contrato público de eventos de Payment (v1). Payment los publica sin conocer a sus consumidores (ADR-004).
// Los payloads NO llevan campos ni nombres del proveedor. `amount` está en la moneda del cobro (`currency`).
const bus = require('../../../platform/events');

exports.CAPTURED = 'Payment.Captured';
exports.REFUNDED = 'Payment.Refunded';
exports.CONFIRMED = 'Payment.Confirmed';   // confirmación tardía del proveedor (webhook); ver TD-011

const fields = { paymentId: 'number', requestId: 'number', customerId: 'number', amount: 'number', currency: 'string' };
bus.registerContract(exports.CAPTURED, 1, fields);
bus.registerContract(exports.REFUNDED, 1, fields);   // amount = monto reembolsado
bus.registerContract(exports.CONFIRMED, 1, fields);

exports.publishCaptured = (p) => bus.publish(exports.CAPTURED, p);
exports.publishRefunded = (p) => bus.publish(exports.REFUNDED, p);
exports.publishConfirmed = (p) => bus.publish(exports.CONFIRMED, p);
