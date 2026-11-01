# Module Contract: Request

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Request |
| Responsibility | Gobernar la solicitud: creación, estados, prioridad, precio/descuento, cancelación y orquestación de su pago. |
| Information secret | Máquina de estados; reglas de prioridad y de descuento (incluye el bono comercial gold); límite de solicitudes abiertas; cómo se traduce una solicitud en un monto a cobrar. |
| Reason to change | Política comercial (descuentos/prioridades) y flujo de la solicitud. |
| Owned data | `request_requests`. |
| Public interface | `createRequest`, `bulkCreate`, `changeStatus`, `cancel`, `payRequest`, `get`, `list`. Eventos: `RequestCreated`, `RequestStatusChanged`, `RequestCancelled` (v1). |
| Incoming dependencies | Gateway HTTP · Notification, Reporting (eventos). |
| Outgoing dependencies | `customer/contract` (`isEligible`, `get`), `payment/contract` (`createPayment`, `refundPayment`); evento `PaymentCaptured` para marcar `paid`. |
| Forbidden dependencies | Tablas `customer_*`/`payment_*`; Notification; SQL en controllers. |
| Invariants | Transiciones válidas; no `done` sin pago; ≤10 abiertas por cliente; monto > 0; `bulkCreate` aplica **las mismas** reglas que `createRequest` (una sola implementación). |
| Quality drivers | Modifiability, Maintainability |
| SATD status | TD-003 (bono gold) |
| Tests / evidence | Caracterización de reglas de descuento/prioridad y transiciones; contract tests; FF1/FF3 |
| ADR reference | [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |
