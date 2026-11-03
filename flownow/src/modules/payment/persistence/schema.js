// Esquema de la tabla de Payment (única dueña: modules/payment). `ensure(db)` crea la tabla y migra, sin pérdida de
// datos, una base creada con el esquema anterior (`payments` con columnas `stripey_*`), de forma idempotente.
exports.ensure = (db) => {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (has('payments') && !has('payment_payments')) {
    db.exec(`ALTER TABLE payments RENAME TO payment_payments;
             ALTER TABLE payment_payments RENAME COLUMN stripey_charge_id TO provider_ref;
             ALTER TABLE payment_payments RENAME COLUMN stripey_status TO provider_status;`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS payment_payments (id INTEGER PRIMARY KEY, request_id INTEGER, customer_id INTEGER, amount REAL, currency TEXT,
    status TEXT, provider_ref TEXT, provider_status TEXT, provider TEXT DEFAULT 'stripey', attempts INTEGER DEFAULT 0,
    refunded_amount REAL DEFAULT 0, created_at TEXT)`);
};
