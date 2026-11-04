# Fichas de módulo (Anexo A)

Las fichas son el **contrato de diseño** de cada módulo (E2). Lo implementado (E3, pasos 1–11) las cumple en el alcance del slice Payment y difiere en los puntos siguientes; la fuente de verdad del código es `flownow/src/modules/<módulo>/contract/`.

| Ficha | Diferencia entre la ficha y el código |
|---|---|
| `payment.md` | API real: `createPayment`, `refund`, `beginRetry`, `handleWebhook`, `get`, `list`, `listForRequest`, `reportRows`, `paidCountByCustomer`, `paidTotal`, `summaryRows`, `reassignCustomer`, `toClp` (no existen `refundPayment`/`retryPayment`/`getPaymentStatus` con esos nombres). Eventos reales: `Payment.Captured/Refunded/Confirmed/Failed/ActionRequired` v1. Tabla real: `payment_payments`. |
| `customer.md` | La tabla sigue llamándose `customers` (no `customer_customers`) y la tocan 10 archivos ajenos bajo ratchet (FF3). Eventos reales: `Customer.Registered`, `Customer.TierChanged` v1. `open_requests` lo compone el gateway HTTP. |
| `request.md` | Sólo `modules/request/pricing.js` y `subscriptions.js` están en `modules/`; el resto sigue en `services/requestService.js`. No se implementaron los eventos `RequestCreated/StatusChanged/Cancelled`. |
| `integration.md` | Reacciona a `Payment.*`, `Customer.Registered` y `Customer.TierChanged`; publica `Integration.InvoiceIssued` y `Integration.ContactSynced`. Mantiene SQL y servicio legado (`integrationService`, `integrationController`). |
| `notification.md` | Sólo `payment-messages.js` y `subscriptions.js` están en `modules/`. No existe `ChannelPort` (no se hizo el experimento WhatsApp). |
| `reporting.md`, `identity.md` | **Sin módulo físico**: siguen siendo código legado (`reportService`, `authController`). Paso 12 no ejecutado. |
| `platform.md` | Implementado: `platform/config.js` y `platform/events.js` (bus, contratos, bitácora de fallos). |

Para el análisis de lo logrado y lo no logrado ver [E8](../E8-evidencia-as-is-to-be.md).
