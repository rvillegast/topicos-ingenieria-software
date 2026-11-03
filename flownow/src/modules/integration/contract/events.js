// Contrato público de eventos de Integration (v1).
const bus = require('../../../platform/events');

exports.INVOICE_ISSUED = 'Integration.InvoiceIssued';
bus.registerContract(exports.INVOICE_ISSUED, 1, { requestId: 'number', invoice: 'string' });

exports.publishInvoiceIssued = (p) => bus.publish(exports.INVOICE_ISSUED, p);

exports.CONTACT_SYNCED = 'Integration.ContactSynced';
bus.registerContract(exports.CONTACT_SYNCED, 1, { customerId: 'number', crmId: 'string' });

exports.publishContactSynced = (p) => bus.publish(exports.CONTACT_SYNCED, p);
