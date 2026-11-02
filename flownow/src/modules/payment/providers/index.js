// Selección del proveedor de pagos. No es una "factory genérica": existen DOS variantes reales (Stripey y el
// respaldo PayFast) y la elección es una decisión de configuración (flag), no de código de negocio.
const config = require('../../../platform/config');
const adapters = { stripey: require('../adapters/stripey'), payfast: require('../adapters/payfast') };

// Proveedor con el que se COBRA una operación nueva.
exports.active = () => (config.flags.useBackupProvider ? adapters.payfast : adapters.stripey);

// Proveedor con el que se REEMBOLSA. TODO(TD-005): PayFast no implementa reembolsos; el AS-IS reembolsaba
// siempre por Stripey y se preserva hasta decidir con el negocio qué hacer con los cobros de respaldo.
exports.forRefund = () => adapters.stripey;

// Para webhooks entrantes: se resuelve por el nombre que registró el adapter.
exports.byName = (name) => {
  const a = adapters[name];
  if (!a) throw new Error(`proveedor de pagos desconocido: ${name}`);
  return a;
};
