# Module Contract: Payment

> Plantilla Anexo A · Diseño TO-BE (aún no implementado). Ver [E2](../E2-arquitectura-to-be.md) §6. Slice de implementación del caso.

| Campo | Contenido |
|---|---|
| Module | Payment |
| Responsibility | Gestionar el ciclo de vida del pago: cobrar, reembolsar, reintentar y reportar su estado. |
| Information secret | Proveedor externo (Stripey) y su SDK; tokenización; política de reintentos; tipo de cambio/moneda de cobro; estados internos de la transacción; mapeo de errores y estados del proveedor; persistencia de pagos. |
| Reason to change | Cambio o adición de proveedor; reglas de cobro/reembolso/reintento; política de FX. |
| Owned data | `payment_payments` (Payment, Transaction). |
| Public interface | `createPayment(cmd)`, `refundPayment(paymentId, amount?)`, `retryPayment(paymentId, token)`, `getPaymentStatus(paymentId)`. Eventos: `PaymentCaptured`, `PaymentFailed`, `PaymentRefunded`, `PaymentActionRequired` (v1). Webhook de proveedor: `/payments/webhooks/provider`. |
| Incoming dependencies | Request (API) · Customer, Notification, Integration, Reporting y Request (eventos). |
| Outgoing dependencies | `platform` (config, event bus, Money). Ninguna otra. |
| Forbidden dependencies | Cualquier otro módulo, sus tablas o contratos · tipos del SDK fuera de `adapters/` · URLs/claves literales. *(La ficha prellenada del enunciado listaba "CustomerIdentity API"; se elimina: Request ya valida la elegibilidad del cliente, así Payment queda como hoja del grafo.)* |
| Invariants | Un pago `paid` no se vuelve a cobrar. `refunded ≤ amount`. Sólo se reembolsa un pago `paid`. ≤3 intentos ante error de conexión; ≤3 reintentos por solicitud. El payload de eventos no contiene tipos ni nombres del proveedor. |
| Quality drivers | Modifiability, Evolvability, Interoperability, Testability |
| SATD status | TD-002, TD-003, TD-004, TD-005, TD-006 (ver [E5](../E5-debt-ledger.md)) |
| Tests / evidence | Caracterización del flujo de pago (ok, rechazado, 3DS, timeout, reembolso, reintento) + contract tests de eventos + `ProviderPort` con fake + FF1/FF2/FF3/FF5 |
| ADR reference | [ADR-001](../adr/ADR-001-limite-modulo-payment.md), [ADR-003](../adr/ADR-003-estrategia-proveedores-externos.md), [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |

**Estructura interna prevista:** `contract/` (fachada, DTOs, eventos y schemas) · `domain/` (`PaymentLifecycle`, `ChargeRetryPolicy`, `FxPolicy`) · `persistence/` (`PaymentRepository`) · `adapters/stripey/` (único lugar que importa el SDK).
