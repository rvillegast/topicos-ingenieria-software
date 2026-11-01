# Module Contract: Notification

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Notification |
| Responsibility | Comunicar eventos del negocio a los clientes por el canal adecuado. |
| Information secret | Canales disponibles y sus proveedores (MailBlast, SmsGo, futuro WhatsApp); plantillas y textos; política de qué canal usa cada tier; formato de envío. |
| Reason to change | Nuevo canal o proveedor de entrega (S2); textos y plantillas. |
| Owned data | `notification_log`. |
| Public interface | `send(customerId, template, params)`, `broadcast(filter, message)`, `list(customerId?)`. Consume: `CustomerRegistered`, `RequestCreated`, `PaymentCaptured/Failed/ActionRequired`. |
| Incoming dependencies | Gateway HTTP (`broadcast`, `list`). |
| Outgoing dependencies | `customer/contract` (`getContactInfo`); eventos de Customer, Request y Payment. `ChannelPort` interno con adapters `email`, `sms`. |
| Forbidden dependencies | `customer_*` y cualquier tabla ajena; `PaymentService`/internos de Payment; nombres del proveedor de pagos en los textos. |
| Invariants | Todo envío queda en `notification_log`. SMS sólo si el canal está habilitado por configuración y el tier lo permite. Los mensajes no mencionan al proveedor de pagos. |
| Quality drivers | Evolvability, Modifiability |
| SATD status | sin SATD propia |
| Tests / evidence | Caracterización de textos y reglas de canal; prueba de contrato de eventos consumidos; fake de `ChannelPort`; FF2 (nombres de proveedor) y FF5 |
| ADR reference | [ADR-003](../adr/ADR-003-estrategia-proveedores-externos.md), [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |
