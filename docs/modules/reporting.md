# Module Contract: Reporting

> Plantilla Anexo A · Diseño TO-BE. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Reporting |
| Responsibility | Producir reportes y dashboards sin consultar datos operativos de otros módulos. |
| Information secret | Almacén de lectura (esquema de proyecciones, agregaciones) y formatos de salida (JSON/CSV). |
| Reason to change | Nuevos reportes/formatos; separar físicamente el almacén (S5). |
| Owned data | `reporting_sales`, `reporting_customers`, `reporting_requests` (proyecciones alimentadas por eventos). |
| Public interface | `salesReport`, `customersReport`, `requestsReport`, `dashboard` (JSON/CSV). Consume eventos de Customer, Request y Payment. |
| Incoming dependencies | Gateway HTTP. |
| Outgoing dependencies | `platform`; eventos de los tres módulos. |
| Forbidden dependencies | **Cualquier tabla de otro módulo**; llamadas a sus servicios; conversión de moneda propia (usa el `amountBase` del evento de Payment). |
| Invariants | Reporting nunca escribe fuera de sus tablas; los totales por moneda base coinciden con los de Payment; reconstruible reproduciendo eventos. |
| Quality drivers | Modifiability, Data Ownership, Bounded Complexity |
| SATD status | TD-007 (FX duplicado) |
| Tests / evidence | Caracterización de `salesReport`/CSV; prueba de que un evento produce la proyección esperada; FF3 |
| ADR reference | [ADR-002](../adr/ADR-002-propiedad-customer.md), [ADR-004](../adr/ADR-004-integracion-entre-modulos.md) |
