// PaymentRepository: ÚNICA vía de acceso a `payment_payments` (ADR-002, FF3). Nadie fuera de modules/payment/
// lee ni escribe esta tabla; los demás módulos usan el contrato de Payment.
const db = require('../../../db');

exports.insertPending = ({ requestId, customerId, amount, currency, provider, createdAt }) =>
  Number(db.prepare('INSERT INTO payment_payments (request_id, customer_id, amount, currency, status, provider, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(requestId, customerId, amount, currency, 'pending', provider, createdAt).lastInsertRowid);

exports.get = (id) => db.prepare('SELECT * FROM payment_payments WHERE id = ?').get(id);
exports.list = () => db.prepare('SELECT * FROM payment_payments ORDER BY id DESC').all();
exports.listForRequest = (requestId) => db.prepare('SELECT * FROM payment_payments WHERE request_id = ? ORDER BY id').all(requestId);
exports.findByProviderRef = (ref) => db.prepare('SELECT * FROM payment_payments WHERE provider_ref = ?').get(ref);
exports.between = (from, to) => db.prepare('SELECT * FROM payment_payments WHERE created_at >= ? AND created_at <= ? ORDER BY id').all(from, to);

exports.setAttempts = (id, attempts) => { db.prepare('UPDATE payment_payments SET attempts = ? WHERE id = ?').run(attempts, id); };
exports.markError = (id) => { db.prepare("UPDATE payment_payments SET status = 'error', provider_status = 'error' WHERE id = ?").run(id); };
exports.supersede = (id) => { db.prepare("UPDATE payment_payments SET status = 'superseded' WHERE id = ?").run(id); };

// Resultado de un cobro. Un estado 'unknown' no guarda referencia del proveedor (comportamiento del AS-IS).
exports.recordOutcome = (id, { status, providerRef, providerStatus }) => {
  if (status === 'unknown') db.prepare("UPDATE payment_payments SET status = 'unknown', provider_status = ? WHERE id = ?").run(providerStatus, id);
  else db.prepare('UPDATE payment_payments SET status = ?, provider_ref = ?, provider_status = ? WHERE id = ?').run(status, providerRef, providerStatus, id);
};
exports.setProviderResult = (id, status, providerStatus) => { db.prepare('UPDATE payment_payments SET status = ?, provider_status = ? WHERE id = ?').run(status, providerStatus, id); };
exports.applyRefund = (id, refundedTotal, status) => { db.prepare('UPDATE payment_payments SET refunded_amount = ?, status = ? WHERE id = ?').run(refundedTotal, status, id); };
exports.reassignCustomer = (fromId, toId) => { db.prepare('UPDATE payment_payments SET customer_id = ? WHERE customer_id = ?').run(toId, fromId); };

exports.countFailedForRequest = (requestId) =>
  db.prepare("SELECT COUNT(*) n FROM payment_payments WHERE request_id = ? AND status IN ('failed','error')").get(requestId).n;
exports.paidCountByCustomer = () => new Map(db.prepare("SELECT customer_id id, COUNT(*) n FROM payment_payments WHERE status = 'paid' GROUP BY customer_id").all().map((r) => [r.id, r.n]));
exports.paidTotal = (currency) => db.prepare("SELECT SUM(amount) s FROM payment_payments WHERE status = 'paid' AND currency = ?").get(currency).s || 0;
exports.summaryRows = () => db.prepare('SELECT amount, currency, status FROM payment_payments').all();
