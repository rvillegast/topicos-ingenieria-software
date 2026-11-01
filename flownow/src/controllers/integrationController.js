const integrationService = require('../services/integrationService');
const db = require('../db');
const helpers = require('../utils/helpers');
const config = require('../platform/config');

exports.crmWebhook = (req, res) => res.json(integrationService.handleCrmWebhook(req.body));
exports.stripeyWebhook = (req, res) => res.json(integrationService.handleStripeyWebhook(req.body));
exports.logs = (req, res) => res.json(integrationService.logs());

// Re-sincronización manual con HubCRM: SQL + llamada HTTP en el controller
exports.resyncCrm = async (req, res) => {
  const pending = db.prepare('SELECT * FROM customers WHERE crm_id IS NULL').all();
  let ok = 0;
  for (const c of pending) {
    const r = await helpers.httpPost(`${config.providers.hubcrm.baseUrl}/contacts`, { name: c.name, email: c.email });
    db.prepare('UPDATE customers SET crm_id = ? WHERE id = ?').run(r.id, c.id);
    ok++;
  }
  res.json({ pending: pending.length, synced: ok });
};
