// Interfaz para pasarelas de pago (por si algún día hay más de una)
class IPaymentGateway {
  async charge() { throw new Error('not implemented'); }
  async refund() { throw new Error('not implemented'); }
}
module.exports = IPaymentGateway;
