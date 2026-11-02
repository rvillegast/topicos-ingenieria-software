// Adapter de PayFast: proveedor de respaldo (TD-005). Antes era código inline dentro de processPayment.
// Mismo puerto que el adapter de Stripey (ver adapters/stripey/index.js).
const config = require('../../../../platform/config');
const helpers = require('../../../../utils/helpers');
const { ProviderError } = require('../../providers/errors');

exports.name = 'payfast';

exports.charge = async ({ amount, currency, token }) => {
  try {
    await helpers.httpPost(config.providers.payfast.payUrl, { amount, currency, token });
  } catch (e) { throw new ProviderError(e && e.message ? e.message : 'error del proveedor', { cause: e }); }
  // El AS-IS no leía la respuesta: cualquier llamada sin error se daba por cobrada.
  return { status: 'captured', providerRef: 'pf_' + Date.now(), providerStatus: 'succeeded' };
};

// PayFast no implementa reembolsos: el AS-IS reembolsaba siempre por Stripey (ver providers/index.js).
exports.refund = async () => { throw new ProviderError('PayFast no soporta reembolsos'); };
exports.parseWebhook = () => null;
