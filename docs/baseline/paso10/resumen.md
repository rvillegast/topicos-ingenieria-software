# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)

```
fecha: 2026-11-03T20:55:03-03:00
commit: fc244b18c50ba3f2da4289b4b1e184c9e212cea0
node: v24.18.0
dependency-cruiser: 18.7.0 · jscpd: 5.4.2 · lizard: 1.24.3
```

## Tamaño

- Archivos fuente: **39** · LOC totales: **1225**

## Dependencias (dependency-cruiser)

- Módulos (archivos): **39** · aristas: **115** · violaciones de ciclo reportadas: **1**
- Dependencias circulares: **1** ciclos distintos
  - services/customerService.js → services/requestService.js → services/customerService.js
- Mayor fan-in: db.js (16), utils/helpers.js (15), platform/config.js (14), modules/payment/contract/index.js (7), platform/events.js (7)
- Mayor fan-out: server.js (12), modules/payment/service.js (8), modules/integration/subscriptions.js (8), services/requestService.js (6), controllers/requestController.js (6)

## Complejidad (lizard)

- Funciones: **209** · CCN > 10: **3** · NLOC > 50: **0** · CCN máx: **12**

| Función | Archivo | NLOC | CCN |
|---|---|---|---|
| exports.publish | platform/events.js | 8 | 12 |
| exports.bulkCreate | controllers/requestController.js | 18 | 12 |
| exports.salesReport | services/reportService.js | 17 | 12 |
| exports.create | services/customerService.js | 12 | 9 |
| exports.update | services/customerService.js | 7 | 8 |
| exports.create | services/requestService.js | 17 | 8 |
| exports.parseWebhook | modules/payment/adapters/stripey/index.js | 7 | 7 |
| exports.broadcast | controllers/notificationController.js | 17 | 7 |

NLOC por archivo (top 5): modules/payment/service.js (77), services/reportService.js (48), services/requestService.js (48), utils/helpers.js (41), modules/integration/subscriptions.js (39)

## Duplicación (jscpd, mín. 25 tokens / 3 líneas)

- Clones: **14** · líneas duplicadas: **66** de 1225 (**5.39 %**)

## Acceso a datos (ownership actual)

| Tabla | Archivos que leen | Archivos que escriben |
|---|---|---|
| users | 1 | 1 |
| customers | 12 | 7 |
| notifications | 2 | 4 |
| requests | 4 | 4 |
| payment_payments | 1 | 1 |
| integration_logs | 1 | 2 |

- Tablas con escritura desde más de un archivo: **4** de 6
- Controllers con acceso directo a tablas: **6**

## Valores hard-coded y SATD

- Líneas con URLs: **5** · líneas con posibles secretos: **5**
- SATD no gestionada: 0
- FF5 hard-coded: 0 violaciones (regla FF5, `ci/rules/no-hardcoded.js`)
- Marcadores SATD totales: **5**

## Referencias a proveedores externos

| Proveedor | Archivos | Ocurrencias |
|---|---|---|
| stripey | 11 | 37 |
| hubcrm | 6 | 16 |
| mailblast | 2 | 5 |
| smsgo | 3 | 9 |
| payfast | 3 | 13 |
| acme-internal | 1 | 1 |

## Impacto de escenarios de cambio (heurística por patrón; ver docs/escenarios/)

| Escenario | Archivos | Módulos (por nombre) | Módulos |
|---|---|---|---|
| S1 | 11 | 4 | integration payment reporting shared |
| S2 | 5 | 3 | notification request shared |
| S3 | 14 | 6 | customer integration notification reporting request shared |
| S4 | 10 | 5 | customer integration notification payment shared |
| S5 | 12 | 4 | customer payment reporting shared |

## Pruebas y cobertura (node:test)

- Pruebas: **124** · pasan: **124** · fallan: **0**
- Cobertura global (todos los archivos de src/): línea/rama/función = `99.35 |    91.48 |   97.14 |`
- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **0** de 39
  - 

| Archivo | línea % | rama % | func % |
|---|---|---|---|
| paymentController.js | 100.00 | 90.48 | 100.00 |
| requestController.js | 100.00 | 87.50 | 85.71 |
| integrationService.js | 100.00 | 90.91 | 100.00 |
| reportService.js | 100.00 | 89.66 | 100.00 |
| requestService.js | 100.00 | 100.00 | 85.71 |
