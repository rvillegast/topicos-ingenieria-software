const db = require('../db');
const config = require('../config');
const helpers = require('../utils/helpers');
const customerService = require('./customerService');
const paymentService = require('./paymentService');
const EmailNotifier = require('./interfaces/EmailNotifier');

const notifier = new EmailNotifier();

exports.notifyWelcome = async (customerId) => {
  const c = customerService.get(customerId);
  await notifier.send(customerId, 'Bienvenido a FlowNow', 'Hola ' + c.name + ', gracias por unirte a FlowNow!');
};

exports.notifyRequestCreated = async (customerId, requestId, amount) => {
  const c = db.prepare('SELECT name, phone, tier FROM customers WHERE id = ?').get(customerId);
  const body = 'Hola ' + c.name + ', recibimos tu solicitud #' + requestId + ' por ' + helpers.formatMoney(amount, 'CLP');
  await notifier.send(customerId, 'Solicitud recibida', body);
  if (config.enableSms && c.phone && c.tier !== 'basic') {
    await helpers.httpPost('https://api.smsgo.com/send', { to: c.phone, text: body.slice(0, 160), key: 'smsgo_live_8812' });
    db.prepare('INSERT INTO notifications (customer_id, channel, subject, body, status, created_at) VALUES (?,?,?,?,?,?)').run(customerId, 'sms', 'Solicitud recibida', body, 'sent', helpers.now());
  }
};

exports.notifyPaymentResult = async (paymentId) => {
  const p = paymentService.get(paymentId);
  const c = db.prepare('SELECT name, phone FROM customers WHERE id = ?').get(p.customer_id);
  let subject, body;
  if (p.stripey_status === 'succeeded') { subject = 'Pago confirmado'; body = 'Hola ' + c.name + ', tu pago de ' + helpers.formatMoney(p.amount, p.currency) + ' fue procesado por Stripey (' + p.stripey_charge_id + ').'; }
  else if (p.stripey_status === 'failed') { subject = 'Pago rechazado'; body = 'Hola ' + c.name + ', Stripey rechazó tu pago de ' + helpers.formatMoney(p.amount, p.currency) + '.'; }
  else { subject = 'Pago pendiente'; body = 'Hola ' + c.name + ', tu pago requiere una acción adicional.'; }
  await notifier.send(p.customer_id, subject, body);
};

exports.list = (customerId) => customerId
  ? db.prepare('SELECT * FROM notifications WHERE customer_id = ? ORDER BY id DESC').all(customerId)
  : db.prepare('SELECT * FROM notifications ORDER BY id DESC').all();
