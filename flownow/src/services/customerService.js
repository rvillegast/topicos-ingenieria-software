const db = require('../db');
const helpers = require('../utils/helpers');
const customerEvents = require('../modules/customer/contract/events');

exports.create = async (data) => {
  if (!data.name || data.name.length < 2) throw httpError(400, 'nombre inválido');
  if (!helpers.validateEmail(data.email)) throw httpError(400, 'email inválido');
  if (data.phone && !helpers.validatePhone(data.phone)) throw httpError(400, 'teléfono inválido');
  const dup = db.prepare('SELECT id FROM customers WHERE email = ?').get(data.email);
  if (dup) throw httpError(409, 'cliente ya existe');
  const info = db.prepare('INSERT INTO customers (name, email, phone, tier, created_at) VALUES (?,?,?,?,?)')
    .run(data.name, data.email, data.phone || null, data.tier || 'basic', helpers.now());
  const id = Number(info.lastInsertRowid);
  // Quién reacciona al alta (CRM, bienvenida) no es asunto de Customer: se entera por el evento.
  await customerEvents.publishRegistered({ customerId: id, name: data.name, email: data.email });
  return exports.get(id);
};

exports.get = (id) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!c) throw httpError(404, 'cliente no encontrado');
  return c;
};

exports.list = () => db.prepare('SELECT * FROM customers ORDER BY id').all();

exports.update = (id, data) => {
  const c = exports.get(id);
  if (data.email && !helpers.validateEmail(data.email)) throw httpError(400, 'email inválido');
  db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, tier = ?, status = ? WHERE id = ?')
    .run(data.name ?? c.name, data.email ?? c.email, data.phone ?? c.phone, data.tier ?? c.tier, data.status ?? c.status, id);
  return exports.get(id);
};

// Datos de elegibilidad y precio que Request necesita para cobrar (contrato de Customer; no expone la tabla).
exports.pricingInfo = (id) => db.prepare('SELECT status, tier FROM customers WHERE id = ?').get(id);

exports.isActive = (id) => { const c = db.prepare('SELECT status FROM customers WHERE id = ?').get(id); return !!c && c.status === 'active'; };

function httpError(status, message) { return Object.assign(new Error(message), { status }); }
exports.httpError = httpError;
