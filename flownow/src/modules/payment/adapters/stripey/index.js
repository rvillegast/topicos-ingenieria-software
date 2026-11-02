// Adapter de Stripey (ACL). ÚNICO archivo del sistema autorizado a importar su SDK (FF2) y a conocer sus
// estados y errores. Implementa el puerto de proveedor de pagos:
//
//   charge({ amount, currency, token, metadata }) -> { status, providerRef, providerStatus }
//        status: 'captured' | 'declined' | 'action_required' | 'unknown'   (vocabulario del dominio)
//        providerStatus: estado crudo del proveedor, sólo para persistencia legacy (TD-010)
//   refund({ providerRef, amount })               -> { ok }
//   parseWebhook(body)                            -> { providerRef, event: 'captured' | 'declined' } | null
//   Lanza ProviderUnavailableError (reintentable) o ProviderError (no reintentable).
const Stripey = require('../../../../vendor/stripey-sdk');
const config = require('../../../../platform/config');
const { ProviderError, ProviderUnavailableError } = require('../../providers/errors');

const STATUS = { succeeded: 'captured', failed: 'declined', requires_action: 'action_required' };

let cached = null;
const client = () => {   // creación perezosa: la clave se lee al usarse, no al cargar el módulo
  const key = config.providers.stripey.apiKey;
  if (!cached || cached.key !== key) cached = { key, sdk: new Stripey(key) };
  return cached.sdk;
};

function translate(e) {
  if (e && e.type === 'StripeyConnectionError') return new ProviderUnavailableError(e.message, { cause: e });
  return new ProviderError(e && e.message ? e.message : 'error del proveedor', { cause: e });   // incluye autenticación
}

exports.name = 'stripey';

exports.charge = async ({ amount, currency, token, metadata }) => {
  try {
    const r = await client().charges.create({ amount: Math.round(amount * 100), currency: currency.toLowerCase(), source: token, metadata });
    return { status: STATUS[r.status] || 'unknown', providerRef: r.id, providerStatus: r.status };
  } catch (e) { throw translate(e); }
};

exports.refund = async ({ providerRef, amount }) => {
  try {
    const r = await client().refunds.create({ charge: providerRef, amount: Math.round(amount * 100) });
    return { ok: r.status === 'succeeded' };
  } catch (e) { throw translate(e); }
};

exports.parseWebhook = (body) => {
  const providerRef = body && body.data && body.data.object && body.data.object.id;
  if (!providerRef) return null;
  if (body.type === 'charge.succeeded') return { providerRef, event: 'captured' };
  if (body.type === 'charge.failed') return { providerRef, event: 'declined' };
  return { providerRef, event: null };   // evento conocido pero sin efecto (se ignora)
};
