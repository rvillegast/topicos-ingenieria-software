// FxPolicy: política de moneda de cobro. Razón de cambio propia: el tipo de cambio y las monedas aceptadas.
const config = require('../../../platform/config');

// TEMP(TD-002): las tasas son valores fijos de configuración hasta integrar un servicio de FX.
exports.isSupported = (currency, rates = config.fx.rates) => currency === 'CLP' || Object.prototype.hasOwnProperty.call(rates, currency);

exports.round2 = (n) => Math.round(n * 100) / 100;

// Convierte un monto en CLP a la moneda de cobro.
exports.fromClp = (amountClp, currency, rates = config.fx.rates) => (currency === 'CLP' ? amountClp : amountClp / rates[currency]);

// Convierte un monto en moneda de cobro a CLP (moneda base de los reportes).
exports.toClp = (amount, currency, rates = config.fx.rates) => (currency === 'CLP' ? amount : amount * rates[currency]);
