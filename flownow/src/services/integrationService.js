const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');
const paymentService = require('./paymentService');
const providers = require('../modules/payment/providers');

exports.pushPaymentToWebhooks = async (paymentId) => {
  const p = paymentService.get(paymentId);
  const c = db.prepare('SELECT crm_id, email FROM customers WHERE id = ?').get(p.customer_id);
  await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/events`, { contact: c.crm_id, type: 'payment.' + p.stripey_status, amount: p.amount });
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

// Webhook entrante del proveedor de pagos: muta payments y requests directo
exports.handleStripeyWebhook = (body) => {
  const evt = providers.byName('stripey').parseWebhook(body);   // el adapter traduce al vocabulario del dominio
  const p = evt && db.prepare('SELECT * FROM payments WHERE stripey_charge_id = ?').get(evt.providerRef);
  if (!p) return { ignored: true };
  if (evt.event === 'captured') {
    db.prepare("UPDATE payments SET status = 'paid', stripey_status = 'succeeded' WHERE id = ?").run(p.id);
    db.prepare('UPDATE requests SET paid = 1 WHERE id = ?').run(p.request_id);
  } else if (evt.event === 'declined') {
    db.prepare("UPDATE payments SET status = 'failed', stripey_status = 'failed' WHERE id = ?").run(p.id);
  }
  return { ok: true };
};

exports.logs = () => db.prepare('SELECT * FROM integration_logs ORDER BY id DESC LIMIT 100').all();
