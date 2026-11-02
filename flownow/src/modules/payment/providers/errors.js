// Errores NEUTROS del módulo Payment: es el vocabulario con el que el dominio entiende las fallas de un proveedor.
// Cada adapter traduce los errores de su SDK a estos tipos (ACL, ADR-003); el dominio nunca ve tipos del proveedor.
class ProviderError extends Error {            // falla no recuperable (credenciales, petición inválida, respuesta inesperada)
  constructor(message, { cause } = {}) { super(message); this.name = 'ProviderError'; this.retryable = false; if (cause) this.cause = cause; }
}
class ProviderUnavailableError extends ProviderError {   // falla transitoria (red, timeout): se puede reintentar
  constructor(message, opts) { super(message, opts); this.name = 'ProviderUnavailableError'; this.retryable = true; }
}
module.exports = { ProviderError, ProviderUnavailableError };
