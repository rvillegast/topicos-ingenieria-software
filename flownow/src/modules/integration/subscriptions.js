// Integration reacciona a eventos del negocio y habla con los sistemas externos (ERP, CRM).
// Por ahora sólo toma lo que antes hacía `processPayment` directamente; el resto llega en el paso 8.
const db = require('../../db');
const config = require('../../platform/config');
const helpers = require('../../utils/helpers');
const bus = require('../../platform/events');
const paymentEvents = require('../payment/contract/events');
const customerEvents = require('../customer/contract/events');
const integrationEvents = require('./contract/events');

let registered = false;
exports.register = () => {
  if (registered) return; registered = true;
  // Factura en el ERP al capturarse un pago.
  bus.subscribe(paymentEvents.CAPTURED, async (e) => {
    const { requestId, customerId, amount, currency } = e.payload;
    const customer = db.prepare('SELECT email FROM customers WHERE id = ?').get(customerId);
    try {
      const inv = await helpers.httpPost(`${config.providers.erp.baseUrl}/invoices`, { request: requestId, amount, currency, customer: customer.email });
      helpers.log('factura ERP ' + inv.invoice, 'erp');
      await integrationEvents.publishInvoiceIssued({ requestId, invoice: inv.invoice });
    } catch (err) {
      helpers.log('ERP caído, factura pendiente', 'erp'); // TODO(TD-004): cola de reintentos para facturas
    }
  }, 'integration.issueInvoice');
  // Mantiene el tier del contacto en el CRM.
  bus.subscribe(customerEvents.TIER_CHANGED, async (e) => {
    await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts/${e.payload.crmId}`, { tier: e.payload.tier });
  }, 'integration.syncCrmTier');
};
