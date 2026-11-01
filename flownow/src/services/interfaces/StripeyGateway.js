const IPaymentGateway = require('./IPaymentGateway');
const Stripey = require('../../vendor/stripey-sdk');
const config = require('../../platform/config');

// Única implementación de IPaymentGateway
class StripeyGateway extends IPaymentGateway {
  constructor() { super(); this.client = new Stripey(config.providers.stripey.apiKey); }
  async charge(amount, currency, token, meta) {
    return this.client.charges.create({ amount: Math.round(amount * 100), currency: currency.toLowerCase(), source: token, metadata: meta });
  }
  async refund(chargeId, amount) {
    return this.client.refunds.create({ charge: chargeId, amount: Math.round(amount * 100) });
  }
}
module.exports = StripeyGateway;
