// Utilitarios generales de FlowNow
const crypto = require('crypto');
const db = require('../db');
const config = require('../platform/config');

exports.formatMoney = (n, cur) => {
  if (cur === 'CLP') return '$' + Math.round(n).toLocaleString('es-CL');
  if (cur === 'USD') return 'US$' + Number(n).toFixed(2);
  return Number(n).toFixed(2) + ' ' + cur;
};

exports.validateEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');
exports.validatePhone = (p) => /^\+?\d{8,15}$/.test((p || '').replace(/\s/g, ''));
exports.now = () => new Date().toISOString();
exports.hash = (s) => crypto.createHash('sha1').update(s + config.security.tokenSecret).digest('hex');
exports.signToken = (u) => Buffer.from(JSON.stringify({ id: u.id, role: u.role, sig: exports.hash(u.email) })).toString('base64');
exports.parseToken = (t) => { try { return JSON.parse(Buffer.from(t, 'base64').toString()); } catch (e) { return null; } };

// log "genérico" que además escribe a la tabla de integración
exports.log = (msg, system) => {
  console.log('[flownow]', msg);
  if (system) db.prepare('INSERT INTO integration_logs (system, direction, payload, status, created_at) VALUES (?,?,?,?,?)').run(system, 'out', String(msg), 'ok', exports.now());
};

// HTTP "genérico": en este entorno se simula (no sale a la red)
exports.outbox = [];
exports.httpPost = async (url, body) => {
  exports.outbox.push({ url, body });
  if (url.startsWith(config.providers.hubcrm.baseUrl)) return { ok: true, id: 'crm_' + Math.floor(Math.random() * 99999) };
  if (url.startsWith(config.providers.erp.baseUrl)) return { ok: true, invoice: 'INV-' + Date.now() };
  return { ok: true };
};

// Retry para cualquier cosa (usado por pagos, CRM y notificaciones)
exports.retry = async (fn, times) => {
  let last;
  for (let i = 0; i < (times || 3); i++) { try { return await fn(); } catch (e) { last = e; } }
  throw last;
};

// Cálculo de descuento por tier (lo usan requests, reports y payments)
exports.tierDiscount = (tier) => (tier === 'gold' ? 0.15 : tier === 'silver' ? 0.1 : 0);

// Envío de email directo (mezclado con acceso a datos)
exports.sendEmail = async (customerId, subject, body) => {
  const c = db.prepare('SELECT email FROM customers WHERE id = ?').get(customerId);
  if (!c) return false;
  await exports.httpPost(config.providers.mailblast.sendUrl, { to: c.email, subject, body, from: config.providers.mailblast.from });
  db.prepare('INSERT INTO notifications (customer_id, channel, subject, body, status, created_at) VALUES (?,?,?,?,?,?)').run(customerId, 'email', subject, body, 'sent', exports.now());
  return true;
};

exports.toCsv = (rows) => {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.join(',')].concat(rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
};
