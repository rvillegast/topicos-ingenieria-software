const db = require('../db');
const config = require('../config');
const helpers = require('../utils/helpers');
const notificationService = require('../services/notificationService');

exports.list = (req, res) => res.json(notificationService.list(req.query.customer_id ? +req.query.customer_id : null));

// Difusión masiva: lógica y SQL en el controller, con URL del proveedor SMS repetida
exports.broadcast = async (req, res) => {
  const { subject, body, tier } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'faltan datos' });
  const customers = tier
    ? db.prepare("SELECT * FROM customers WHERE status = 'active' AND tier = ?").all(tier)
    : db.prepare("SELECT * FROM customers WHERE status = 'active'").all();
  let sent = 0;
  for (const c of customers) {
    await helpers.sendEmail(c.id, subject, body);
    sent++;
    if (config.enableSms && c.phone) {
      await helpers.httpPost('https://api.smsgo.com/send', { to: c.phone, text: body.slice(0, 160), key: 'smsgo_live_8812' });
      db.prepare('INSERT INTO notifications (customer_id, channel, subject, body, status, created_at) VALUES (?,?,?,?,?,?)').run(c.id, 'sms', subject, body, 'sent', helpers.now());
    }
  }
  res.json({ sent });
};
