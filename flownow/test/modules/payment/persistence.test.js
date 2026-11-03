const test = require('node:test');
const assert = require('node:assert');
const { DatabaseSync } = require('node:sqlite');
const schema = require('../../../src/modules/payment/persistence/schema');
const legacy = require('../../../src/modules/payment/http/legacy-presenter');

const OLD = `CREATE TABLE payments (id INTEGER PRIMARY KEY, request_id INTEGER, customer_id INTEGER, amount REAL, currency TEXT,
  status TEXT, stripey_charge_id TEXT, stripey_status TEXT, provider TEXT DEFAULT 'stripey', attempts INTEGER DEFAULT 0,
  refunded_amount REAL DEFAULT 0, created_at TEXT)`;
const cols = (db) => db.prepare('PRAGMA table_info(payment_payments)').all().map((c) => c.name);
const tables = (db) => db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);

test('base nueva: crea payment_payments con columnas neutras', () => {
  const db = new DatabaseSync(':memory:'); schema.ensure(db);
  assert.deepStrictEqual(cols(db), ['id', 'request_id', 'customer_id', 'amount', 'currency', 'status', 'provider_ref', 'provider_status', 'provider', 'attempts', 'refunded_amount', 'created_at']);
  assert.ok(!tables(db).includes('payments'));
});

test('migración: una base con el esquema anterior conserva sus datos y se renombra', () => {
  const db = new DatabaseSync(':memory:'); db.exec(OLD);
  db.prepare("INSERT INTO payments (request_id, customer_id, amount, currency, status, stripey_charge_id, stripey_status, refunded_amount, created_at) VALUES (1, 2, 90000, 'CLP', 'paid', 'ch_1001', 'succeeded', 10000, 'ayer')").run();
  schema.ensure(db);
  assert.ok(tables(db).includes('payment_payments')); assert.ok(!tables(db).includes('payments'));
  const row = db.prepare('SELECT * FROM payment_payments').get();
  assert.strictEqual(row.provider_ref, 'ch_1001'); assert.strictEqual(row.provider_status, 'succeeded');
  assert.strictEqual(row.amount, 90000); assert.strictEqual(row.refunded_amount, 10000); assert.strictEqual(row.status, 'paid');
});

test('ensure es idempotente: puede ejecutarse varias veces sin perder datos', () => {
  const db = new DatabaseSync(':memory:'); db.exec(OLD);
  db.prepare("INSERT INTO payments (request_id, amount, status) VALUES (1, 5, 'paid')").run();
  schema.ensure(db); schema.ensure(db); schema.ensure(db);
  assert.strictEqual(db.prepare('SELECT COUNT(*) n FROM payment_payments').get().n, 1);
});

test('presentador legado: renombra sólo las columnas del proveedor y preserva el orden', () => {
  const p = { id: 1, status: 'paid', provider_ref: 'ch_1', provider_status: 'succeeded', provider: 'stripey', amount: 5 };
  const v = legacy.payment(p);
  assert.deepStrictEqual(Object.keys(v), ['id', 'status', 'stripey_charge_id', 'stripey_status', 'provider', 'amount']);
  assert.strictEqual(v.stripey_charge_id, 'ch_1'); assert.strictEqual(v.stripey_status, 'succeeded');
  assert.ok(!('provider_ref' in v));
  assert.strictEqual(p.provider_ref, 'ch_1', 'no muta el original');
});

test('presentador legado: solicitud con pagos y fila de reporte', () => {
  const r = legacy.request({ id: 1, payments: [{ id: 9, provider_ref: 'x', provider_status: 'y' }], paid: 0 });
  assert.deepStrictEqual(Object.keys(r), ['id', 'payments', 'paid']);
  assert.strictEqual(r.payments[0].stripey_charge_id, 'x');
  assert.deepStrictEqual(legacy.request({ id: 2 }), { id: 2 });
  assert.deepStrictEqual(Object.keys(legacy.reportRow({ id: 1, provider_status: 's' })), ['payment_id', 'amount', 'currency', 'status', 'provider', 'stripey_status', 'refunded_amount', 'request_id']);
});
