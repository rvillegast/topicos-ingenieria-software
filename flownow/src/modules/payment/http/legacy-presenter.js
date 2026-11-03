// Presentador de compatibilidad HTTP (TD-010). Es el ÚNICO archivo, fuera de los adapters, autorizado a usar los
// nombres legados de la API pública (`stripey_charge_id`, `stripey_status`) hasta versionar la API (§6.2).
// El dominio y el esquema usan nombres neutros (`provider_ref`, `provider_status`).
const rename = (obj, map) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [map[k] || k, v]));   // preserva el orden de las claves
const LEGACY = { provider_ref: 'stripey_charge_id', provider_status: 'stripey_status' };

exports.payment = (p) => rename(p, LEGACY);
exports.request = (r) => (r && r.payments ? { ...r, payments: r.payments.map(exports.payment) } : r);   // solicitud con sus pagos
exports.reportRow = (p) => ({ payment_id: p.id, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider,
  stripey_status: p.provider_status, refunded_amount: p.refunded_amount, request_id: p.request_id });
