// ChargeRetryPolicy: política de reintentos del cobro. Razón de cambio propia: cuántas veces y ante qué fallas.
// Reintenta SÓLO fallas transitorias (ProviderUnavailableError); cualquier otra termina el intento de inmediato.
const { ProviderUnavailableError } = require('../providers/errors');

exports.MAX_ATTEMPTS = 3;

// Devuelve { charge, attempts, lastError }. `charge` es null si ningún intento tuvo éxito.
// `onRetry(n)` se invoca tras cada falla transitoria (el dominio no conoce el logger).
exports.chargeWithRetry = async (provider, command, onRetry = () => {}) => {
  let charge = null; let attempts = 0; let lastError = null;
  while (attempts < exports.MAX_ATTEMPTS && !charge) {
    attempts++;
    try { charge = await provider.charge(command); }
    catch (e) {
      lastError = e;
      if (!(e instanceof ProviderUnavailableError)) break;
      onRetry(attempts);
    }
  }
  return { charge, attempts, lastError };
};
