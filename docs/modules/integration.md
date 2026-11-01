# Module Contract: Integration

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Integration |
| Responsibility | Mantener sincronizados los sistemas de negocio externos (CRM, ERP) con los eventos de FlowNow. |
| Information secret | Protocolos, URLs, autenticación y mapeos de HubCRM y ERP; política de reintentos/bitácora de salida; traducción de webhooks entrantes (ACL). |
| Reason to change | Cambio de CRM/ERP o nueva integración externa (S4). |
| Owned data | `integration_log`. |
| Public interface | `handleCrmWebhook(body)`. Consume: `CustomerRegistered`, `PaymentCaptured`. Adapters `crm/hubcrm`, `erp/acme`. |
| Incoming dependencies | Gateway HTTP (webhook entrante). |
| Outgoing dependencies | `customer/contract` (`applyExternalProfile`); eventos de Customer y Payment. |
| Forbidden dependencies | Escribir `customer_*`/`payment_*`; tipos de HubCRM/ERP fuera de sus adapters; URLs literales. |
| Invariants | Toda llamada externa queda en `integration_log`. Un fallo externo no revierte la operación origen y queda para reintento (nunca se pierde silenciosamente). |
| Quality drivers | Evolvability, Interoperability |
| SATD status | TD-004, TD-008 |
| Tests / evidence | Contract tests de cada adapter con fake HTTP; prueba de webhook → `applyExternalProfile`; FF2 y FF5 |
| ADR reference | [ADR-003](../adr/ADR-003-estrategia-proveedores-externos.md), [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |
