const db = require('../db');
const helpers = require('../utils/helpers');
const customerService = require('../services/customerService');
const paymentService = require('../services/paymentService');

exports.create = async (req, res) => {
  try { res.status(201).json(await customerService.create(req.body)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
};
exports.list = (req, res) => res.json(customerService.list());
exports.get = (req, res) => { try { res.json(customerService.get(+req.params.id)); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };
exports.update = (req, res) => { try { res.json(customerService.update(+req.params.id, req.body)); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };

// Lógica de negocio directamente en el controller: fusionar clientes duplicados
exports.merge = (req, res) => {
  const { keep_id, remove_id } = req.body;
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'sólo admin' });
  const keep = db.prepare('SELECT * FROM customers WHERE id = ?').get(keep_id);
  const rem = db.prepare('SELECT * FROM customers WHERE id = ?').get(remove_id);
  if (!keep || !rem || keep_id === remove_id) return res.status(400).json({ error: 'ids inválidos' });
  db.prepare('UPDATE requests SET customer_id = ? WHERE customer_id = ?').run(keep_id, remove_id);
  paymentService.reassignCustomer(remove_id, keep_id);
  db.prepare('UPDATE notifications SET customer_id = ? WHERE customer_id = ?').run(keep_id, remove_id);
  const spent = keep.total_spent + rem.total_spent;
  const tier = spent > 2000000 ? 'gold' : spent > 500000 ? 'silver' : keep.tier;
  db.prepare('UPDATE customers SET total_spent = ?, tier = ?, open_requests = open_requests + ? WHERE id = ?').run(spent, tier, rem.open_requests, keep_id);
  db.prepare("UPDATE customers SET status = 'merged' WHERE id = ?").run(remove_id);
  helpers.log('clientes fusionados ' + remove_id + ' -> ' + keep_id, 'hubcrm');
  res.json(customerService.get(keep_id));
};

// Exportación duplicada (misma lógica que reportService.customersReport, versión "rápida")
exports.exportCsv = (req, res) => {
  const rows = db.prepare("SELECT id, name, email, tier, total_spent FROM customers WHERE status = 'active'").all();
  res.type('text/csv').send(helpers.toCsv(rows));
};
