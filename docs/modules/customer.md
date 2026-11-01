# Module Contract: Customer

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Customer |
| Responsibility | Gobernar al cliente: alta, actualización, estado, tier, fusión y datos de contacto. |
| Information secret | Modelo de datos del cliente (campos, formato del nombre, identificadores); política de tiers y umbrales de promoción; reglas de fusión; mapeo de/hacia los datos externos del CRM. |
| Reason to change | Cambio del modelo de Customer (S3); política comercial de tiers. |
| Owned data | `customer_customers` (incluye `totalSpent` y `tier` como estado propio, actualizado por eventos). |
| Public interface | `CustomerDirectory`: `register`, `get`, `update`, `merge`, `isEligible`, `getContactInfo`, `applyExternalProfile`. Eventos: `CustomerRegistered`, `CustomerProfileChanged` (v1). |
| Incoming dependencies | Request, Notification, Integration (API) · Reporting (eventos). |
| Outgoing dependencies | `platform`; eventos de Payment (`PaymentCaptured`, `PaymentRefunded`) para `totalSpent`/tier. |
| Forbidden dependencies | Request, Notification, Integration, Reporting; llamadas HTTP a CRM; tablas ajenas. |
| Invariants | Email único. No se opera con clientes `inactive`/`merged`. `totalSpent` cambia sólo por eventos de pago. La fusión conserva solicitudes, pagos y notificaciones vía comandos a sus owners, no por SQL ajeno. |
| Quality drivers | Modifiability, Data Ownership, Interoperability |
| SATD status | TD-001 (ver [E5](../E5-debt-ledger.md)) |
| Tests / evidence | Caracterización de alta/validación/duplicado; contract tests de `CustomerDirectory` y eventos; FF3 |
| ADR reference | [ADR-002](../adr/ADR-002-propiedad-customer.md), [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |
