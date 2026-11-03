# ADR-002: Propiedad de los datos (Customer y ownership general)

Status: Propuesto (implementado en el paso 7 para Payment: repositorio único, tabla `payment_payments`, FF3 estricta; Customer y el resto siguen con ratchet)
Context: `customers` se lee desde 11 archivos y se escribe desde 7 (customerService, integrationService vía webhook, paymentService al sumar `total_spent`/tier, customerController.merge…). 5 de 6 tablas tienen escritores múltiples; 7 controllers hacen SQL. Cambiar el modelo de Customer (S3) obliga a revisar 13 archivos y 7 "módulos".
Architectural concern: Data Ownership (§6): una autoridad por dato sobre significado, validación, mutación y evolución.
Decision: (1) Cada tabla tiene un único módulo owner y lleva su prefijo (`customer_*`, `payment_*`, `request_*`, `notification_*`, `reporting_*`, `integration_*`, `identity_*`). (2) Nadie lee ni escribe tablas ajenas: se integra por API/DTO o evento. (3) Customer es dueño de `totalSpent` y `tier`, y los actualiza **reaccionando** a `PaymentCaptured/Refunded`; Payment deja de escribir en `customers`. (4) El webhook de HubCRM no escribe: llama `CustomerDirectory.applyExternalProfile`. (5) `merge` se orquesta por contratos (cada owner reasigna lo suyo). (6) Reporting lee sólo sus proyecciones. La separación es **lógica** (un SQLite); la física es decisión futura.
Alternatives considered: (a) una BD por módulo ya: costo de coordinación sin necesidad (~700 LOC). (b) dejar el esquema compartido y "acordar" disciplina: no es verificable. (c) vistas de BD compartidas: acoplan al esquema interno.
Consequences: Cambiar el modelo de Customer afecta a su módulo y, a lo sumo, al DTO `v1`/`v2`. Se necesitan migraciones de nombre de tabla y pruebas del flujo de merge.
Trade-offs: Consistencia eventual en `totalSpent`/proyecciones a cambio de ownership claro (aceptado, TD-009).
Evidence / fitness function: FF3 (ownership por prefijo, regla ejecutable), matriz `acceso-datos.csv` TO-BE: **0** accesos cruzados; escenarios S3 y S5.
Affected modules: Customer, Payment, Request, Notification, Reporting, Integration, Identity.
Date: 2026-11-01
