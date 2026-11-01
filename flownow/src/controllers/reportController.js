const reportService = require('../services/reportService');
const config = require('../config');
const db = require('../db');
const helpers = require('../utils/helpers');

exports.sales = (req, res) => {
  const out = reportService.salesReport(req.query.from, req.query.to, req.query.format);
  if (req.query.format === 'csv') return res.type('text/csv').send(out);
  res.json(out);
};
exports.customers = (req, res) => {
  const out = reportService.customersReport(req.query.format);
  if (req.query.format === 'csv') return res.type('text/csv').send(out);
  res.json(out);
};
exports.requests = (req, res) => {
  const out = reportService.requestsReport(req.query.format);
  if (req.query.format === 'csv') return res.type('text/csv').send(out);
  res.json(out);
};

// Dashboard calculado en el controller leyendo todas las tablas
exports.dashboard = (req, res) => {
  if (!config.useNewReports) return res.json({ legacy: true });
  const customers = db.prepare('SELECT COUNT(*) n FROM customers').get().n;
  const open = db.prepare("SELECT COUNT(*) n FROM requests WHERE status NOT IN ('done','cancelled')").get().n;
  const paid = db.prepare("SELECT SUM(amount) s FROM payments WHERE status = 'paid' AND currency = 'CLP'").get().s || 0;
  const notif = db.prepare('SELECT COUNT(*) n FROM notifications').get().n;
  res.json({ customers, openRequests: open, paidCLP: helpers.formatMoney(paid, 'CLP'), notifications: notif });
};
