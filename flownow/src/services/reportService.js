const db = require('../db');
const config = require('../config');
const helpers = require('../utils/helpers');

// Reporte de ventas: una sola función hace consulta, cálculo, formato y exportación
exports.salesReport = (from, to, format) => {
  const rows = db.prepare(`SELECT p.id payment_id, p.amount, p.currency, p.status, p.provider, p.stripey_status, p.refunded_amount,
      r.id request_id, r.title, r.discount, c.id customer_id, c.name customer, c.tier, c.email
    FROM payments p JOIN requests r ON r.id = p.request_id JOIN customers c ON c.id = p.customer_id
    WHERE p.created_at >= ? AND p.created_at <= ? ORDER BY p.id`).all(from || '0000', to || '9999');
  let total = 0, refunded = 0, paidCount = 0, failedCount = 0;
  const byTier = {}; const byProvider = {}; const byCurrency = {};
  for (const x of rows) {
    if (x.status === 'paid' || x.status === 'refunded') {
      let clp = x.amount;
      if (x.currency === 'USD') clp = x.amount * 950; // TEMP: mismo tipo de cambio fijo que en pagos
      else if (x.currency === 'EUR') clp = x.amount * 1030;
      total += clp; paidCount++;
      byTier[x.tier] = (byTier[x.tier] || 0) + clp;
      byProvider[x.provider] = (byProvider[x.provider] || 0) + clp;
      byCurrency[x.currency] = (byCurrency[x.currency] || 0) + x.amount;
      refunded += x.refunded_amount * (x.currency === 'USD' ? 950 : x.currency === 'EUR' ? 1030 : 1);
    } else if (x.status === 'failed' || x.status === 'error') failedCount++;
  }
  if (format === 'csv') return helpers.toCsv(rows);
  return { count: rows.length, paidCount, failedCount, total, refunded, net: total - refunded, totalFormatted: helpers.formatMoney(total, 'CLP'), byTier, byProvider, byCurrency, stripeyShare: byProvider.stripey ? byProvider.stripey / (total || 1) : 0 };
};

// Reporte de clientes (casi copia del de ventas)
exports.customersReport = (format) => {
  const rows = db.prepare(`SELECT c.id, c.name, c.email, c.tier, c.status, c.total_spent,
    (SELECT COUNT(*) FROM requests r WHERE r.customer_id = c.id) requests,
    (SELECT COUNT(*) FROM payments p WHERE p.customer_id = c.id AND p.status = 'paid') paid_payments
    FROM customers c ORDER BY c.total_spent DESC`).all();
  if (format === 'csv') return helpers.toCsv(rows);
  let total = 0; const byTier = {};
  for (const x of rows) { total += x.total_spent; byTier[x.tier] = (byTier[x.tier] || 0) + x.total_spent; }
  return { count: rows.length, total, totalFormatted: helpers.formatMoney(total, 'CLP'), byTier, top: rows.slice(0, 5) };
};

exports.requestsReport = (format) => {
  const rows = db.prepare(`SELECT r.id, r.title, r.status, r.priority, r.amount, r.discount, r.paid, c.name customer, c.tier
    FROM requests r JOIN customers c ON c.id = r.customer_id ORDER BY r.id`).all();
  if (format === 'csv') return helpers.toCsv(rows);
  const byStatus = {}; let total = 0;
  for (const x of rows) { byStatus[x.status] = (byStatus[x.status] || 0) + 1; total += x.amount; }
  return { count: rows.length, byStatus, total, totalFormatted: helpers.formatMoney(total, 'CLP') };
};
