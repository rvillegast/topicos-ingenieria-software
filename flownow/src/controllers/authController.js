const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');

exports.seedAdmin = () => {
  if (!db.prepare('SELECT id FROM users WHERE email = ?').get(config.security.adminEmail))
    db.prepare('INSERT INTO users (email, password, role) VALUES (?,?,?)').run(config.security.adminEmail, helpers.hash(config.security.adminPassword), 'admin');
};

exports.login = (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
  if (!u || u.password !== helpers.hash(req.body.password || '')) return res.status(401).json({ error: 'credenciales inválidas' });
  res.json({ token: helpers.signToken(u), role: u.role });
};

exports.requireAuth = (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/health' || req.path.startsWith('/integrations/webhook')) return next();
  const t = helpers.parseToken((req.headers.authorization || '').replace('Bearer ', ''));
  if (!t) return res.status(401).json({ error: 'no autenticado' });
  req.user = t;
  next();
};
