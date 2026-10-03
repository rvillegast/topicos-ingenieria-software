# Module Contract: Payment

> Plantilla Anexo A · Prellenado con el ejemplo del enunciado (§3, §13). **Validar contra el código real.**

| Campo | Contenido |
|---|---|
| Module | Payment |
| Responsibility | Gestionar el ciclo de vida del pago. |
| Information secret | Proveedor externo, tokenización, política de reintentos, estados internos de transacción, persistencia, mapeo de errores externos, idiosincrasias de la API. |
| Reason to change | Cambio de proveedor o de reglas de cobro/reembolso. |
| Owned data | Payment, Transaction. |
| Public interface | `createPayment()`, `authorizePayment()`, `capturePayment()`, `refundPayment()`, `getPaymentStatus()` |
| Incoming dependencies | Request (crear/consultar pagos) · Reporting (vía evento/proyección) |
| Outgoing dependencies | CustomerIdentity API |
| Forbidden dependencies | Customer database · Notification implementation · Reporting database |
| Invariants | <!-- p. ej. un pago capturado no puede volver a autorizarse; monto reembolsado ≤ capturado --> |
| Quality drivers | Modifiability, Evolvability, Interoperability, Testability |
| SATD status | <!-- ver E5 --> |
| Tests / evidence | unit tests + contract tests + FF1/FF2/FF3 |
| ADR reference | [ADR-001](../adr/ADR-001-limite-modulo-payment.md), [ADR-003](../adr/ADR-003-estrategia-proveedores-externos.md) |
