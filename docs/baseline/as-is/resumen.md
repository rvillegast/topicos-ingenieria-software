# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)

```
fecha: 2026-11-01T20:07:54-03:00
commit: 6e0b3b18f490b915a511e56a1e7bd9ebe4dd146c
node: v24.18.0
dependency-cruiser: 18.7.0 · jscpd: 5.4.2 · lizard: 1.24.3
```

## Tamaño

- Archivos fuente: **22** · LOC totales: **714**

## Dependencias (dependency-cruiser)

- Módulos (archivos): **22** · aristas: **67** · violaciones de ciclo reportadas: **6**
- Dependencias circulares: **6** ciclos distintos
  - services/customerService.js → services/notificationService.js → services/customerService.js
  - services/customerService.js → services/requestService.js → services/customerService.js
  - services/integrationService.js → services/paymentService.js → services/integrationService.js
  - services/notificationService.js → services/paymentService.js → services/notificationService.js
  - services/paymentService.js → services/requestService.js → services/paymentService.js
  - services/requestService.js → services/notificationService.js → services/customerService.js → services/requestService.js
- Mayor fan-in: db.js (14), utils/helpers.js (14), config.js (8), services/paymentService.js (5), services/customerService.js (4)
- Mayor fan-out: server.js (8), services/paymentService.js (7), services/notificationService.js (6), services/requestService.js (5), controllers/requestController.js (5)

## Complejidad (lizard)

- Funciones: **83** · CCN > 10: **3** · NLOC > 50: **1** · CCN máx: **26**

| Función | Archivo | NLOC | CCN |
|---|---|---|---|
| exports.processPayment | services/paymentService.js | 71 | 26 |
| exports.salesReport | services/reportService.js | 22 | 18 |
| exports.bulkCreate | controllers/requestController.js | 18 | 12 |
| exports.create | services/customerService.js | 19 | 10 |
| exports.update | services/customerService.js | 7 | 8 |
| exports.create | services/requestService.js | 17 | 8 |
| exports.retry | controllers/paymentController.js | 10 | 7 |
| exports.broadcast | controllers/notificationController.js | 17 | 7 |

NLOC por archivo (top 5): services/paymentService.js (90), services/reportService.js (40), controllers/requestController.js (39), utils/helpers.js (36), services/customerService.js (36)

## Duplicación (jscpd, mín. 25 tokens / 3 líneas)

- Clones: **13** · líneas duplicadas: **56** de 712 (**7.87 %**)

## Acceso a datos (ownership actual)

| Tabla | Archivos que leen | Archivos que escriben |
|---|---|---|
| users | 1 | 1 |
| customers | 11 | 7 |
| notifications | 2 | 4 |
| payments | 6 | 4 |
| requests | 5 | 5 |
| integration_logs | 1 | 2 |

- Tablas con escritura desde más de un archivo: **5** de 6
- Controllers con acceso directo a tablas: **7**

## Valores hard-coded y SATD

- Líneas con URLs: **9** · líneas con posibles secretos: **7**
- SATD no gestionada: 8
- Marcadores SATD totales: **8**

## Referencias a proveedores externos

| Proveedor | Archivos | Ocurrencias |
|---|---|---|
| stripey | 11 | 51 |
| hubcrm | 6 | 16 |
| mailblast | 1 | 1 |
| smsgo | 2 | 4 |
| payfast | 1 | 3 |
| acme-internal | 2 | 2 |

## Pruebas y cobertura (node:test)

- Pruebas: **5** · pasan: **5** · fallan: **0**
- Cobertura global (todos los archivos de src/): línea/rama/función = `56.42 |    73.08 |   36.96 |`
- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **9** de 22
  - authController.js, customerController.js, integrationController.js, notificationController.js, paymentController.js, reportController.js, requestController.js, server.js, reportService.js

| Archivo | línea % | rama % | func % |
|---|---|---|---|
| integrationService.js | 39.02 | 100.00 | 0.00 |
| paymentService.js | 18.92 | 100.00 | 0.00 |
| requestService.js | 42.22 | 100.00 | 20.00 |
