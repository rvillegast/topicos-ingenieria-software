# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)

```
fecha: 2026-11-01T20:37:57-03:00
commit: 0b44ab53a045a64f0da6d9ca0cd11e1af250962f
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
- SATD no gestionada: 7
- Marcadores SATD totales: **7**

## Referencias a proveedores externos

| Proveedor | Archivos | Ocurrencias |
|---|---|---|
| stripey | 11 | 51 |
| hubcrm | 6 | 16 |
| mailblast | 1 | 1 |
| smsgo | 2 | 4 |
| payfast | 1 | 3 |
| acme-internal | 2 | 2 |

## Impacto de escenarios de cambio (heurística por patrón; ver docs/escenarios/)

| Escenario | Archivos | Módulos (por nombre) | Módulos |
|---|---|---|---|
| S1 | 12 | 5 | integration notification payment reporting shared |
| S2 | 7 | 3 | notification request shared |
| S3 | 13 | 7 | customer integration notification payment reporting request shared |
| S4 | 9 | 5 | customer integration notification payment shared |
| S5 | 7 | 4 | customer payment reporting shared |

## Pruebas y cobertura (node:test)

- Pruebas: **46** · pasan: **46** · fallan: **0**
- Cobertura global (todos los archivos de src/): línea/rama/función = `98.18 |    87.96 |   92.86 |`
- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **0** de 22
  - 

| Archivo | línea % | rama % | func % |
|---|---|---|---|
| paymentController.js | 100.00 | 88.00 | 100.00 |
| requestController.js | 100.00 | 86.96 | 83.33 |
| integrationService.js | 100.00 | 93.33 | 100.00 |
| paymentService.js | 100.00 | 98.08 | 100.00 |
| reportService.js | 100.00 | 82.14 | 100.00 |
| requestService.js | 100.00 | 100.00 | 80.00 |
