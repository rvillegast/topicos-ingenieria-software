// Simulación del SDK del proveedor de pagos "Stripey" (en producción sería el paquete npm real).
// Se deja en el repo para que la app funcione sin red.
let n = 1000;
class Stripey {
  constructor(apiKey) { this.apiKey = apiKey; this.charges = { create: async (p) => this._charge(p) }; this.refunds = { create: async (p) => this._refund(p) }; }
  async _charge(p) {
    n++;
    if (!this.apiKey) throw Object.assign(new Error('No API key provided'), { type: 'StripeyAuthenticationError' });
    if (p.source === 'tok_declined') return { id: 'ch_' + n, object: 'charge', status: 'failed', failure_code: 'card_declined', amount: p.amount, currency: p.currency };
    if (p.source === 'tok_timeout') throw Object.assign(new Error('timeout'), { type: 'StripeyConnectionError' });
    if (p.source === 'tok_3ds') return { id: 'ch_' + n, object: 'charge', status: 'requires_action', amount: p.amount, currency: p.currency };
    return { id: 'ch_' + n, object: 'charge', status: 'succeeded', amount: p.amount, currency: p.currency, metadata: p.metadata };
  }
  async _refund(p) {
    n++;
    return { id: 're_' + n, object: 'refund', status: 'succeeded', charge: p.charge, amount: p.amount };
  }
}
module.exports = Stripey;
