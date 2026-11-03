// Request reacciona a eventos de otros módulos. Es el dueño de `requests.paid` y `requests.erp_invoice`:
// nadie más escribe esas columnas (ADR-002).
const db = require('../../db');
const bus = require('../../platform/events');
const paymentEvents = require('../payment/contract/events');
const integrationEvents = require('../integration/contract/events');

let registered = false;
exports.register = () => {
  if (registered) return; registered = true;
  const markPaid = (e) => { db.prepare('UPDATE requests SET paid = 1 WHERE id = ?').run(e.payload.requestId); };
  bus.subscribe(paymentEvents.CAPTURED, markPaid, 'request.markPaid');
  bus.subscribe(paymentEvents.CONFIRMED, markPaid, 'request.markPaidOnConfirmation');
  bus.subscribe(integrationEvents.INVOICE_ISSUED, (e) => {
    db.prepare('UPDATE requests SET erp_invoice = ? WHERE id = ?').run(e.payload.invoice, e.payload.requestId);
  }, 'request.attachInvoice');
};
