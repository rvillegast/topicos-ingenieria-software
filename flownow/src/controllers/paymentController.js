const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');
const paymentService = require('../services/paymentService');

exports.pay = async (req, res) => {
  try { res.status(201).json(await paymentService.processPayment(+req.body.request_id, req.body.token, req.body.currency)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};
exports.list = (req, res) => res.json(paymentService.list());
exports.get = (req, res) => { try { res.json(paymentService.get(+req.params.id)); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };
exports.refund = async (req, res) => {
  try { res.json(await paymentService.refund(+req.params.id, req.body.amount)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};

// Reintento de pago fallido: reglas de negocio y SQL en el controller
exports.retry = async (req, res) => {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(+req.params.id);
  if (!p) return res.status(404).json({ error: 'no existe' });
  if (p.status !== 'failed' && p.status !== 'error') return res.status(400).json({ error: 'sólo pagos fallidos' });
  const count = db.prepare("SELECT COUNT(*) n FROM payments WHERE request_id = ? AND status IN ('failed','error')").get(p.request_id).n;
  if (count >= 3) return res.status(429).json({ error: 'máximo 3 reintentos con Stripey' });
  db.prepare("UPDATE payments SET status = 'superseded' WHERE id = ?").run(p.id);
  try { res.status(201).json(await paymentService.processPayment(p.request_id, req.body.token, p.currency)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};

// Resumen para el dashboard de finanzas (otra consulta que duplica la de reportes)
exports.summary = (req, res) => {
  const rows = db.prepare("SELECT amount, currency, status FROM payments").all();
  let total = 0, failed = 0;
  for (const x of rows) {
    if (x.status === 'paid') total += x.amount * (config.fx.rates[x.currency] || 1);
    if (x.status === 'failed') failed++;
  }
  res.json({ total, totalFormatted: helpers.formatMoney(total, 'CLP'), failed, provider: 'stripey' });
};
