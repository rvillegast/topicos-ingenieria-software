# Module Contract: Platform (núcleo transversal mínimo)

> Plantilla Anexo A · No es un módulo de negocio: existe para que los módulos **no** compartan un `utils` genérico. Ver [E2](../E2-arquitectura-to-be.md).

| Campo | Contenido |
|---|---|
| Module | Platform |
| Responsibility | Entregar a los módulos configuración tipada, un bus de eventos y el tipo `Money`. |
| Information secret | De dónde viene la configuración (env/secretos/defaults de desarrollo) y cómo se transportan los eventos (en proceso hoy; cola mañana). |
| Reason to change | Cambio de gestor de secretos o del transporte de eventos. |
| Owned data | ninguna (cada módulo abre sus propias tablas con su prefijo). |
| Public interface | `config.get(key)`, `eventBus.publish/subscribe` (eventos con `schemaVersion`), `Money`. |
| Incoming dependencies | Todos los módulos. |
| Outgoing dependencies | ninguna. |
| Forbidden dependencies | cualquier módulo de negocio; lógica de negocio; funciones "de conveniencia" no relacionadas (anti-`helpers`). |
| Invariants | Es el **único** lugar donde puede haber URLs/valores por defecto de desarrollo (FF5 lo permite sólo aquí). El bus aísla errores de un consumidor del publicador. Tamaño acotado (meta: ≤150 NLOC). |
| Quality drivers | Bounded Complexity, Maintainability |
| SATD status | TD-009 (entrega de eventos en proceso) |
| Tests / evidence | Pruebas del bus (orden, aislamiento de fallos) y de `config`; FF1/FF5 |
| ADR reference | [ADR-004](../adr/ADR-004-integracion-entre-modulos.md), [ADR-006](../adr/ADR-006-monolito-modular-granularidad.md) |
