// Notification reacciona a los resultados de pago (antes: llamada directa desde processPayment).
const bus = require('../../platform/events');
const paymentEvents = require('../payment/contract/events');
const notificationService = require('../../services/notificationService');

let registered = false;
exports.register = () => {
  if (registered) return; registered = true;
  bus.subscribe(paymentEvents.CAPTURED, (e) => notificationService.onPaymentOutcome('captured', e.payload), 'notification.paymentCaptured');
  bus.subscribe(paymentEvents.FAILED, (e) => notificationService.onPaymentOutcome(e.payload.reason === 'declined' ? 'declined' : 'pending', e.payload), 'notification.paymentFailed');
  bus.subscribe(paymentEvents.ACTION_REQUIRED, (e) => notificationService.onPaymentOutcome('pending', e.payload), 'notification.paymentActionRequired');
};
