// Integration reacciona a eventos del negocio y habla con los sistemas externos (ERP, CRM).
// Por ahora sólo toma lo que antes hacía `processPayment` directamente; el resto llega en el paso 8.
const db = require('../../db');
const config = require('../../platform/config');
const helpers = require('../../utils/helpers');
const bus = require('../../platform/events');
const paymentEvents = require('../payment/contract/events');
const customerEvents = require('../customer/contract/events');
const integrationEvents = require('./contract/events');
const integrationService = require('../../services/integrationService');

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
  // Alta de cliente -> contacto en el CRM. Si el CRM no responde, el fallo queda en la bitácora de eventos
  // (deadLetters) y el contacto se repara con POST /integrations/crm/resync (TD-001 mitigada).
  bus.subscribe(customerEvents.REGISTERED, async (e) => {
    const { customerId, name, email } = e.payload;
    const r = await helpers.retry(() => helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts`, { name, email }), 3);
    helpers.log('cliente sincronizado con hubcrm ' + r.id, 'hubcrm');
    await integrationEvents.publishContactSynced({ customerId, crmId: r.id });
  }, 'integration.syncCrmContact');
  // Mantiene el tier del contacto en el CRM.
  bus.subscribe(customerEvents.TIER_CHANGED, async (e) => {
    await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts/${e.payload.crmId}`, { tier: e.payload.tier });
  }, 'integration.syncCrmTier');
};

// Evento de pago hacia el CRM. Se registra aparte (después de Customer y Notification) para conservar el orden
// de efectos del AS-IS: ERP -> tier -> aviso al cliente -> evento al CRM.
let registeredCrm = false;
exports.registerCrmEvents = () => {
  if (registeredCrm) return; registeredCrm = true;
  bus.subscribe(paymentEvents.CAPTURED, (e) => integrationService.onPaymentOutcome('captured', e.payload), 'integration.crmPaymentCaptured');
  bus.subscribe(paymentEvents.FAILED, (e) => {
    if (e.payload.reason === 'unavailable') return;   // AS-IS: si el proveedor no responde no se notifica al CRM
    return integrationService.onPaymentOutcome(e.payload.reason === 'declined' ? 'declined' : 'unknown', e.payload);
  }, 'integration.crmPaymentFailed');
  bus.subscribe(paymentEvents.ACTION_REQUIRED, (e) => integrationService.onPaymentOutcome('action_required', e.payload), 'integration.crmPaymentActionRequired');
};
