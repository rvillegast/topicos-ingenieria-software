# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)

```
fecha: 2026-11-03T06:36:05-03:00
commit: 5c222a2933a616924e1a3245571f8e520d479cda
node: v24.18.0
dependency-cruiser: 18.7.0 · jscpd: 5.4.2 · lizard: 1.24.3
```

## Tamaño

- Archivos fuente: **33** · LOC totales: **1050**

## Dependencias (dependency-cruiser)

- Módulos (archivos): **33** · aristas: **106** · violaciones de ciclo reportadas: **5**
- Dependencias circulares: **5** ciclos distintos
  - services/customerService.js → services/notificationService.js → services/customerService.js
  - services/customerService.js → services/requestService.js → services/customerService.js
  - services/integrationService.js → services/paymentService.js → services/integrationService.js
  - services/notificationService.js → services/paymentService.js → services/notificationService.js
  - services/requestService.js → services/notificationService.js → services/customerService.js → services/requestService.js
- Mayor fan-in: db.js (17), platform/config.js (15), utils/helpers.js (15), platform/events.js (6), services/paymentService.js (5)
- Mayor fan-out: server.js (11), services/paymentService.js (10), modules/integration/subscriptions.js (7), controllers/paymentController.js (6), services/customerService.js (5)

## Complejidad (lizard)

- Funciones: **148** · CCN > 10: **3** · NLOC > 50: **0** · CCN máx: **14**

| Función | Archivo | NLOC | CCN |
|---|---|---|---|
| exports.salesReport | services/reportService.js | 20 | 14 |
| exports.publish | platform/events.js | 8 | 12 |
| exports.bulkCreate | controllers/requestController.js | 18 | 12 |
| exports.create | services/customerService.js | 19 | 10 |
| exports.update | services/customerService.js | 7 | 8 |
| exports.create | services/requestService.js | 17 | 8 |
| exports.parseWebhook | modules/payment/adapters/stripey/index.js | 7 | 7 |
| exports.broadcast | controllers/notificationController.js | 17 | 7 |

NLOC por archivo (top 5): services/paymentService.js (55), utils/helpers.js (41), controllers/requestController.js (39), services/reportService.js (38), services/customerService.js (36)

## Duplicación (jscpd, mín. 25 tokens / 3 líneas)

- Clones: **17** · líneas duplicadas: **78** de 1050 (**7.43 %**)

## Acceso a datos (ownership actual)

| Tabla | Archivos que leen | Archivos que escriben |
|---|---|---|
| users | 1 | 1 |
| customers | 13 | 7 |
| notifications | 2 | 4 |
| payments | 6 | 4 |
| requests | 5 | 5 |
| integration_logs | 1 | 2 |

- Tablas con escritura desde más de un archivo: **5** de 6
- Controllers con acceso directo a tablas: **7**

## Valores hard-coded y SATD

- Líneas con URLs: **5** · líneas con posibles secretos: **4**
- SATD no gestionada: 0
- FF5 hard-coded: 0 violaciones (regla FF5, `ci/rules/no-hardcoded.js`)
- Marcadores SATD totales: **6**

## Referencias a proveedores externos

| Proveedor | Archivos | Ocurrencias |
|---|---|---|
| stripey | 12 | 48 |
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
| S5 | 8 | 4 | customer payment reporting shared |

## Pruebas y cobertura (node:test)

- Pruebas: **100** · pasan: **100** · fallan: **0**
- Cobertura global (todos los archivos de src/): línea/rama/función = `98.57 |    89.67 |   95.97 |`
- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **0** de 33
  - 

| Archivo | línea % | rama % | func % |
|---|---|---|---|
| paymentController.js | 100.00 | 85.71 | 100.00 |
| requestController.js | 100.00 | 86.96 | 83.33 |
| integrationService.js | 100.00 | 93.33 | 100.00 |
| paymentService.js | 100.00 | 91.67 | 100.00 |
| reportService.js | 100.00 | 86.96 | 100.00 |
| requestService.js | 100.00 | 100.00 | 80.00 |
