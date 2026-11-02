// Error de reglas del dominio de pagos. `status` es el código HTTP con el que hoy se informa (convención del AS-IS).
class PaymentError extends Error {
  constructor(message, status) { super(message); this.name = 'PaymentError'; this.status = status; }
}
module.exports = { PaymentError };
