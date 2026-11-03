const { DatabaseSync } = require('node:sqlite');
const config = require('./platform/config');

// Conexión global compartida: todos los controllers y services la importan directo.
const db = new DatabaseSync(config.dbFile);

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'basic', crm_id TEXT, total_spent REAL DEFAULT 0, open_requests INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY, customer_id INTEGER, title TEXT, description TEXT, status TEXT DEFAULT 'new',
  priority TEXT, amount REAL, discount REAL DEFAULT 0, paid INTEGER DEFAULT 0, erp_invoice TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, customer_id INTEGER, channel TEXT, subject TEXT, body TEXT, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS integration_logs (id INTEGER PRIMARY KEY, system TEXT, direction TEXT, payload TEXT, status TEXT, created_at TEXT);
`);

require('./modules/payment/persistence/schema').ensure(db);   // cada módulo es dueño de su esquema

module.exports = db;
