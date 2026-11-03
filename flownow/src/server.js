const express = require('express');
const config = require('./platform/config');
const auth = require('./controllers/authController');
const customers = require('./controllers/customerController');
const requests = require('./controllers/requestController');
const payments = require('./controllers/paymentController');
const notifications = require('./controllers/notificationController');
const integrations = require('./controllers/integrationController');
const reports = require('./controllers/reportController');

// Composición: cada módulo registra sus suscripciones a eventos (orden = orden de efectos del AS-IS).
require('./modules/request/subscriptions').register();
require('./modules/integration/subscriptions').register();
require('./modules/customer/subscriptions').register();

const app = express();
app.use(express.json());
auth.seedAdmin();
app.use(auth.requireAuth);

app.get('/health', (req, res) => res.json({ ok: true, version: '0.6.3' }));
app.post('/auth/login', auth.login);

app.post('/customers', customers.create);
app.get('/customers', customers.list);
app.get('/customers/export.csv', customers.exportCsv);
app.post('/customers/merge', customers.merge);
app.get('/customers/:id', customers.get);
app.put('/customers/:id', customers.update);

app.post('/requests', requests.create);
app.post('/requests/bulk', requests.bulkCreate);
app.get('/requests', requests.list);
app.get('/requests/:id', requests.get);
app.post('/requests/:id/status', requests.changeStatus);
app.post('/requests/:id/cancel', requests.cancel);

app.post('/payments', payments.pay);
app.get('/payments', payments.list);
app.get('/payments/summary', payments.summary);
app.get('/payments/:id', payments.get);
app.post('/payments/:id/refund', payments.refund);
app.post('/payments/:id/retry', payments.retry);

app.get('/notifications', notifications.list);
app.post('/notifications/broadcast', notifications.broadcast);

app.post('/integrations/webhook/crm', integrations.crmWebhook);
app.post('/integrations/webhook/stripey', integrations.stripeyWebhook);
app.post('/integrations/crm/resync', integrations.resyncCrm);
app.get('/integrations/logs', integrations.logs);

app.get('/reports/sales', reports.sales);
app.get('/reports/customers', reports.customers);
app.get('/reports/requests', reports.requests);
app.get('/reports/dashboard', reports.dashboard);

module.exports = app;
if (require.main === module) app.listen(config.port, () => console.log('FlowNow en :' + config.port));
