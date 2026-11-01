const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');
const requestService = require('./requestService');
const notificationService = require('./notificationService');

exports.create = async (data) => {
  if (!data.name || data.name.length < 2) throw httpError(400, 'nombre inválido');
  if (!helpers.validateEmail(data.email)) throw httpError(400, 'email inválido');
  if (data.phone && !helpers.validatePhone(data.phone)) throw httpError(400, 'teléfono inválido');
  const dup = db.prepare('SELECT id FROM customers WHERE email = ?').get(data.email);
  if (dup) throw httpError(409, 'cliente ya existe');
  const info = db.prepare('INSERT INTO customers (name, email, phone, tier, created_at) VALUES (?,?,?,?,?)')
    .run(data.name, data.email, data.phone || null, data.tier || 'basic', helpers.now());
  const id = Number(info.lastInsertRowid);
  // sincroniza con el CRM (HubCRM) al crear
  try {
    const r = await helpers.retry(() => helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts`, { name: data.name, email: data.email }), 3);
    db.prepare('UPDATE customers SET crm_id = ? WHERE id = ?').run(r.id, id);
    helpers.log('cliente sincronizado con hubcrm ' + r.id, 'hubcrm');
  } catch (e) {
    helpers.log('falló sync hubcrm: ' + e.message, 'hubcrm'); // FIXME(TD-001): reintentar luego, hoy se pierde el contacto
  }
  await notificationService.notifyWelcome(id);
  return exports.get(id);
};

exports.get = (id) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!c) throw httpError(404, 'cliente no encontrado');
  c.open_requests = requestService.countOpenFor(id);
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

exports.isActive = (id) => { const c = db.prepare('SELECT status FROM customers WHERE id = ?').get(id); return !!c && c.status === 'active'; };

function httpError(status, message) { return Object.assign(new Error(message), { status }); }
exports.httpError = httpError;
