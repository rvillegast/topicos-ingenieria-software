const helpers = require('../utils/helpers');
const payments = require('../modules/payment/contract');
const legacy = require('../modules/payment/http/legacy-presenter');
const requestService = require('../services/requestService');

// Adaptador HTTP de Payment: traduce a los nombres públicos (TD-010) y compone la respuesta en el borde.
// La respuesta de un cobro incluye la solicitud actualizada; se compone aquí para que Payment no dependa de Request.
const withRequest = (payment) => Object.assign(legacy.payment(payment), { request: legacy.request(requestService.get(payment.request_id)) });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });

exports.pay = async (req, res) => {
  try { res.status(201).json(withRequest(await requestService.payRequest(+req.body.request_id, req.body.token, req.body.currency))); }
  catch (e) { fail(res, e); }
};
exports.list = (req, res) => res.json(payments.list().map(legacy.payment));
exports.get = (req, res) => { try { res.json(legacy.payment(payments.get(+req.params.id))); } catch (e) { fail(res, e); } };
exports.refund = async (req, res) => {
  try { res.json(legacy.payment(await payments.refund(+req.params.id, req.body.amount))); }
  catch (e) { fail(res, e); }
};
exports.retry = async (req, res) => {
  try { res.status(201).json(withRequest(await requestService.retryPayment(+req.params.id, req.body.token))); }
  catch (e) { fail(res, e); }
};

// Resumen para el dashboard de finanzas
exports.summary = (req, res) => {
  let total = 0, failed = 0;
  for (const x of payments.summaryRows()) {
    if (x.status === 'paid') total += payments.toClp(x.amount, x.currency);
    if (x.status === 'failed') failed++;
  }
  res.json({ total, totalFormatted: helpers.formatMoney(total, 'CLP'), failed, provider: 'stripey' });
};
