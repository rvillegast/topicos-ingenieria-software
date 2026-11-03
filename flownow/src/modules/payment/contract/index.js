// CONTRATO PÚBLICO de Payment (v1): lo único que otros módulos pueden importar (FF6), junto con `./events`.
// Los internos (domain/, persistence/, providers/, adapters/, service.js) no se importan desde fuera.
//
//   createPayment({ requestId, customerId, amount, currency?, token })  amount en CLP, ya con descuentos resueltos
//   refund(paymentId, amount?) · beginRetry(paymentId) · handleWebhook(providerName, body)
//   get(id) · list() · listForRequest(requestId)
//   Consultas para reportes y mantenimiento: reportRows, paidCountByCustomer, paidTotal, summaryRows, reassignCustomer, toClp
const service = require('../service');

module.exports = {
  createPayment: service.createPayment,
  refund: service.refund,
  beginRetry: service.beginRetry,
  handleWebhook: service.handleWebhook,
  get: service.get,
  list: service.list,
  listForRequest: service.listForRequest,
  reportRows: service.reportRows,
  paidCountByCustomer: service.paidCountByCustomer,
  paidTotal: service.paidTotal,
  summaryRows: service.summaryRows,
  reassignCustomer: service.reassignCustomer,
  toClp: service.toClp,
  events: require('./events'),
};
