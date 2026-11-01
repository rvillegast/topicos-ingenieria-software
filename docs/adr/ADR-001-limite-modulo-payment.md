# ADR-001: Límite del módulo Payment

Status: Propuesto
Context: El pago está repartido en `paymentService.processPayment` (71 NLOC, CCN 26: validación, descuento, FX, reintentos, ERP, CRM, aviso), `paymentController` (retry y summary con SQL propio), `reportService`, `integrationService` y `notificationService`. `payments` se escribe desde 4 archivos y `paymentService` forma ciclos con request, notification e integration.
Architectural concern: Parnas (§3) y cohesión: ¿qué decisión volátil debe quedar oculta y qué NO es responsabilidad del pago?
Decision: Payment es un módulo con secreto = proveedor, tokenización, reintentos, FX, estados de transacción y persistencia. Es **hoja** del grafo (no depende de otros módulos). Expone `createPayment`, `refundPayment`, `retryPayment`, `getPaymentStatus` y eventos `PaymentCaptured/Failed/Refunded/ActionRequired` v1. Quedan **fuera**: descuento y prioridad (→ Request), factura ERP y evento CRM (→ Integration), avisos (→ Notification), tier/total gastado (→ Customer), agregación de ventas (→ Reporting). Dueño único de `payment_payments`.
Alternatives considered: (a) mantener `PaymentService` y sólo extraer métodos: reduce CCN pero no el radio de cambio ni los ciclos. (b) Pago dentro de Request: mezcla política comercial con ejecución de cobro (razones de cambio distintas). (c) Separar Payment y Transaction: sin variabilidad ni datos propios distintos hoy.
Consequences: Cambiar de proveedor toca `payment/adapters` (S1: de 12 archivos/5 módulos a 1 módulo). Request orquesta el cobro; los efectos secundarios ocurren por eventos. Se requieren pruebas de caracterización antes de mover lógica (TD-008).
Trade-offs: Más archivos y un bus de eventos a cambio de localidad; los efectos secundarios dejan de ser una llamada síncrona visible (ver ADR-004 y TD-009).
Evidence / fitness function: FF1 (sin ciclos), FF2 (tipos del proveedor sólo en `adapters/stripey`), FF3 (sólo Payment toca `payment_*`); escenario S1; métricas CCN de `processPayment` y archivos que nombran al proveedor (`proveedores.csv`).
Affected modules: Payment, Request, Notification, Integration, Reporting, Customer.
Date: 2026-11-01
