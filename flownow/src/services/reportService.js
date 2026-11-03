const db = require('../db');
const payments = require('../modules/payment/contract');
const legacy = require('../modules/payment/http/legacy-presenter');
const helpers = require('../utils/helpers');

// Filas del reporte de ventas: los pagos vienen del contrato de Payment (ya no se consulta su tabla) y se
// completan con solicitud y cliente. Mismo contenido y orden de columnas que el JOIN anterior.
function salesRows(from, to) {
  const reqs = new Map(db.prepare('SELECT id, title, discount FROM requests').all().map((r) => [r.id, r]));
  const custs = new Map(db.prepare('SELECT id, name, tier, email FROM customers').all().map((c) => [c.id, c]));
  return payments.reportRows(from, to)
    .filter((p) => reqs.has(p.request_id) && custs.has(p.customer_id))   // equivale al JOIN interno
    .map((p) => { const r = reqs.get(p.request_id); const c = custs.get(p.customer_id);
      return { ...legacy.reportRow(p), title: r.title, discount: r.discount, customer_id: c.id, customer: c.name, tier: c.tier, email: c.email }; });
}

// Reporte de ventas: una sola función hace consulta, cálculo, formato y exportación
exports.salesReport = (from, to, format) => {
  const rows = salesRows(from, to);
  let total = 0, refunded = 0, paidCount = 0, failedCount = 0;
  const byTier = {}; const byProvider = {}; const byCurrency = {};
  for (const x of rows) {
    if (x.status === 'paid' || x.status === 'refunded') {
      // TEMP(TD-007): convierte con la política de Payment; debe venir como monto base en el evento de pago (paso 12)
      const clp = payments.toClp(x.amount, x.currency);
      total += clp; paidCount++;
      byTier[x.tier] = (byTier[x.tier] || 0) + clp;
      byProvider[x.provider] = (byProvider[x.provider] || 0) + clp;
      byCurrency[x.currency] = (byCurrency[x.currency] || 0) + x.amount;
      refunded += payments.toClp(x.refunded_amount, x.currency);
    } else if (x.status === 'failed' || x.status === 'error') failedCount++;
  }
  if (format === 'csv') return helpers.toCsv(rows);
  return { count: rows.length, paidCount, failedCount, total, refunded, net: total - refunded, totalFormatted: helpers.formatMoney(total, 'CLP'), byTier, byProvider, byCurrency, stripeyShare: byProvider.stripey ? byProvider.stripey / (total || 1) : 0 };
};

// Reporte de clientes (casi copia del de ventas)
exports.customersReport = (format) => {
  const paidByCustomer = payments.paidCountByCustomer();
  const rows = db.prepare(`SELECT c.id, c.name, c.email, c.tier, c.status, c.total_spent,
    (SELECT COUNT(*) FROM requests r WHERE r.customer_id = c.id) requests
    FROM customers c ORDER BY c.total_spent DESC`).all().map((c) => ({ ...c, paid_payments: paidByCustomer.get(c.id) || 0 }));
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
