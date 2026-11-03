# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)

```
fecha: 2026-11-03T06:47:34-03:00
commit: 41d63438356a081c0aba516fe9d8263fe56bbac5
node: v24.18.0
dependency-cruiser: 18.7.0 · jscpd: 5.4.2 · lizard: 1.24.3
```

## Tamaño

- Archivos fuente: **36** · LOC totales: **1126**

## Dependencias (dependency-cruiser)

- Módulos (archivos): **36** · aristas: **114** · violaciones de ciclo reportadas: **5**
- Dependencias circulares: **5** ciclos distintos
  - services/customerService.js → services/notificationService.js → services/customerService.js
  - services/customerService.js → services/requestService.js → services/customerService.js
  - services/integrationService.js → services/paymentService.js → services/integrationService.js
  - services/notificationService.js → services/paymentService.js → services/notificationService.js
  - services/requestService.js → services/notificationService.js → services/customerService.js → services/requestService.js
- Mayor fan-in: db.js (17), platform/config.js (15), utils/helpers.js (15), services/paymentService.js (8), platform/events.js (6)
- Mayor fan-out: services/paymentService.js (12), server.js (11), modules/integration/subscriptions.js (7), controllers/requestController.js (6), services/customerService.js (5)

## Complejidad (lizard)

- Funciones: **189** · CCN > 10: **3** · NLOC > 50: **0** · CCN máx: **12**

| Función | Archivo | NLOC | CCN |
|---|---|---|---|
| exports.publish | platform/events.js | 8 | 12 |
| exports.bulkCreate | controllers/requestController.js | 18 | 12 |
| exports.salesReport | services/reportService.js | 17 | 12 |
| exports.create | services/customerService.js | 19 | 10 |
| exports.update | services/customerService.js | 7 | 8 |
| exports.create | services/requestService.js | 17 | 8 |
| exports.parseWebhook | modules/payment/adapters/stripey/index.js | 7 | 7 |
| exports.broadcast | controllers/notificationController.js | 17 | 7 |

NLOC por archivo (top 5): services/paymentService.js (76), services/reportService.js (48), utils/helpers.js (41), controllers/requestController.js (37), services/customerService.js (36)

## Duplicación (jscpd, mín. 25 tokens / 3 líneas)

- Clones: **15** · líneas duplicadas: **67** de 1126 (**5.95 %**)

## Acceso a datos (ownership actual)

| Tabla | Archivos que leen | Archivos que escriben |
|---|---|---|
| users | 1 | 1 |
| customers | 13 | 7 |
| notifications | 2 | 4 |
| requests | 5 | 4 |
| payment_payments | 1 | 1 |
| integration_logs | 1 | 2 |

- Tablas con escritura desde más de un archivo: **4** de 6
- Controllers con acceso directo a tablas: **6**

## Valores hard-coded y SATD

- Líneas con URLs: **5** · líneas con posibles secretos: **4**
- SATD no gestionada: 0
- FF5 hard-coded: 0 violaciones (regla FF5, `ci/rules/no-hardcoded.js`)
- Marcadores SATD totales: **6**

## Referencias a proveedores externos

| Proveedor | Archivos | Ocurrencias |
|---|---|---|
| stripey | 12 | 39 |
| hubcrm | 7 | 19 |
| mailblast | 2 | 5 |
| smsgo | 3 | 9 |
| payfast | 3 | 13 |
| acme-internal | 1 | 1 |

## Impacto de escenarios de cambio (heurística por patrón; ver docs/escenarios/)

| Escenario | Archivos | Módulos (por nombre) | Módulos |
|---|---|---|---|
| S1 | 12 | 5 | integration notification payment reporting shared |
| S2 | 5 | 3 | notification request shared |
| S3 | 15 | 7 | customer integration notification payment reporting request shared |
| S4 | 11 | 5 | customer integration notification payment shared |
| S5 | 11 | 4 | customer payment reporting shared |

## Pruebas y cobertura (node:test)

- Pruebas: **107** · pasan: **107** · fallan: **0**
- Cobertura global (todos los archivos de src/): línea/rama/función = `98.67 |    90.73 |   96.84 |`
- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **0** de 36
  - 

| Archivo | línea % | rama % | func % |
|---|---|---|---|
| paymentController.js | 100.00 | 90.00 | 100.00 |
| requestController.js | 100.00 | 87.50 | 85.71 |
| integrationService.js | 100.00 | 90.91 | 100.00 |
| paymentService.js | 100.00 | 94.87 | 100.00 |
| reportService.js | 100.00 | 89.66 | 100.00 |
| requestService.js | 100.00 | 100.00 | 80.00 |
