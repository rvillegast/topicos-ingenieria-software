const db = require('../db');
const config = require('../platform/config');
const helpers = require('../utils/helpers');
const { paymentMessage } = require('../modules/notification/payment-messages');

exports.notifyWelcome = async ({ customerId, name }) => {
  await helpers.sendEmail(customerId, 'Bienvenido a FlowNow', 'Hola ' + name + ', gracias por unirte a FlowNow!');
};

exports.notifyRequestCreated = async (customerId, requestId, amount) => {
  const c = db.prepare('SELECT name, phone, tier FROM customers WHERE id = ?').get(customerId);
  const body = 'Hola ' + c.name + ', recibimos tu solicitud #' + requestId + ' por ' + helpers.formatMoney(amount, 'CLP');
  await helpers.sendEmail(customerId, 'Solicitud recibida', body);
  if (config.flags.enableSms && c.phone && c.tier !== 'basic') {
    await helpers.httpPost(config.providers.smsgo.sendUrl, { to: c.phone, text: body.slice(0, 160), key: config.providers.smsgo.apiKey });
    db.prepare('INSERT INTO notifications (customer_id, channel, subject, body, status, created_at) VALUES (?,?,?,?,?,?)').run(customerId, 'sms', 'Solicitud recibida', body, 'sent', helpers.now());
  }
};

// Aviso de resultado de pago a partir del evento (el contrato trae el monto; el nombre se resuelve aquí).
exports.onPaymentOutcome = async (outcome, payload) => {
  const c = db.prepare('SELECT name FROM customers WHERE id = ?').get(payload.customerId);
  const { subject, body } = paymentMessage({ outcome, name: c.name, formattedAmount: helpers.formatMoney(payload.amount, payload.currency) });
  await helpers.sendEmail(payload.customerId, subject, body);
};

exports.list = (customerId) => customerId
  ? db.prepare('SELECT * FROM notifications WHERE customer_id = ? ORDER BY id DESC').all(customerId)
  : db.prepare('SELECT * FROM notifications ORDER BY id DESC').all();
