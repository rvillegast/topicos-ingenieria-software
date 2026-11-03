const db = require('../db');
const helpers = require('../utils/helpers');
const requestService = require('../services/requestService');
const customerService = require('../services/customerService');
const payments = require('../modules/payment/contract');
const legacy = require('../modules/payment/http/legacy-presenter');

exports.create = async (req, res) => {
  try { res.status(201).json(legacy.request(await requestService.create(req.body))); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};
exports.list = (req, res) => res.json(requestService.list());
exports.get = (req, res) => { try { res.json(legacy.request(requestService.get(+req.params.id))); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };
exports.changeStatus = (req, res) => { try { res.json(legacy.request(requestService.changeStatus(+req.params.id, req.body.status))); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };

// Lógica de negocio en controller: creación masiva con reglas de prioridad y descuento duplicadas
exports.bulkCreate = async (req, res) => {
  const items = req.body.items || [];
  if (items.length > 50) return res.status(400).json({ error: 'máximo 50' });
  const created = [];
  for (const it of items) {
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(it.customer_id);
    if (!c || c.status !== 'active') continue;
    let discount = 0;
    if (c.tier === 'gold') discount = 0.15; else if (c.tier === 'silver') discount = 0.1;
    let priority = 'normal';
    if (it.amount > 500000 || c.tier === 'gold') priority = 'high'; else if (it.amount < 20000) priority = 'low';
    const info = db.prepare('INSERT INTO requests (customer_id, title, description, priority, amount, discount, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(c.id, it.title, it.description || '', priority, it.amount, discount, helpers.now());
    db.prepare('UPDATE customers SET open_requests = open_requests + 1 WHERE id = ?').run(c.id);
    created.push(Number(info.lastInsertRowid));
  }
  res.status(201).json({ created });
};

// Cancelación con reembolso automático: toca payments y customers desde el controller
exports.cancel = async (req, res) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(+req.params.id);
  if (!r) return res.status(404).json({ error: 'no existe' });
  if (r.status === 'done' || r.status === 'cancelled') return res.status(400).json({ error: 'no cancelable' });
  const paid = payments.listForRequest(r.id).filter((p) => p.status === 'paid');
  for (const p of paid) await payments.refund(p.id);
  db.prepare("UPDATE requests SET status = 'cancelled' WHERE id = ?").run(r.id);
  db.prepare('UPDATE customers SET open_requests = open_requests - 1 WHERE id = ?').run(r.customer_id);
  await helpers.sendEmail(r.customer_id, 'Solicitud cancelada', 'Tu solicitud #' + r.id + ' fue cancelada.');
  res.json(legacy.request(requestService.get(r.id)));
};
