const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');
const paymentService = require('./paymentService');
const providers = require('../modules/payment/providers');

exports.pushPaymentToWebhooks = async (paymentId) => {
  const p = paymentService.get(paymentId);
  const c = db.prepare('SELECT crm_id, email FROM customers WHERE id = ?').get(p.customer_id);
  await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/events`, { contact: c.crm_id, type: 'payment.' + p.provider_status, amount: p.amount });
  helpers.log('evento de pago enviado a hubcrm', 'hubcrm');
};

// Webhook entrante desde HubCRM: escribe directo en customers
exports.handleCrmWebhook = (body) => {
  db.prepare('INSERT INTO integration_logs (system, direction, payload, status, created_at) VALUES (?,?,?,?,?)').run('hubcrm', 'in', JSON.stringify(body), 'ok', helpers.now());
  if (body.type === 'contact.updated') {
    const c = db.prepare('SELECT id FROM customers WHERE crm_id = ?').get(body.contact_id);
    if (!c) return { ignored: true };
    db.prepare('UPDATE customers SET name = ?, phone = ?, tier = ? WHERE id = ?').run(body.name, body.phone, body.tier || 'basic', c.id);
    return { updated: c.id };
  }
  if (body.type === 'contact.deleted') {
    db.prepare("UPDATE customers SET status = 'inactive' WHERE crm_id = ?").run(body.contact_id);
    return { deactivated: true };
  }
  return { ignored: true };
};

// Webhook entrante del proveedor de pagos: el adapter traduce y Payment aplica (esta capa no toca sus tablas).
exports.handleStripeyWebhook = (body) => paymentService.applyProviderEvent(providers.byName('stripey').parseWebhook(body));

exports.logs = () => db.prepare('SELECT * FROM integration_logs ORDER BY id DESC LIMIT 100').all();
