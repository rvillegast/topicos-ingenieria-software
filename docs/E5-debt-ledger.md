# E5. Gestión de SATD — Debt Ledger

> §7, §17.5 · Meta del alcance intervenido: `UnmanagedSATD = 0`.
> **Borrar el comentario no elimina la deuda.** Deuda aceptada: `SATD → Issue → Owner → Rationale → DueDate → Verification`.
>
> Convención: una SATD queda **gestionada** cuando su comentario referencia un ID del ledger, p. ej. `// TODO(TD-004): ...`. `scripts/satd-scan.sh --gate` falla si encuentra marcadores sin `TD-xxx`.
> **Estado:** propuesta de decisiones sobre el inventario real del AS-IS. Owners por rol (A Arquitectura · B Diagnóstico · C Refactoring · D Calidad/CI, ver `PLAN.md`); asignar personas al conformar el equipo.

## Flujo de gestión

```mermaid
flowchart LR
  A[Marcador TODO/FIXME/HACK/TEMP/WORKAROUND] --> B{¿Se puede corregir<br/>dentro del alcance?}
  B -- sí --> C[Refactor: corregir la causa<br/>+ prueba + quitar marcador]
  B -- no, decisión consciente --> D[Accept: TD-xxx con owner,<br/>motivo, fecha y verificación]
  B -- ya no aplica --> E[Remove: justificar en el ledger<br/>que la condición dejó de existir]
  C --> F[FF4: satd-scan --gate]
  D --> G["Comentario pasa a // TODO(TD-xxx)"] --> F
  E --> F
  F -->|0 sin gestionar| H[Merge permitido]
  F -->|≥1 sin gestionar| I[Merge bloqueado]
```

## Inventario inicial

Fuente: `docs/baseline/as-is/satd.csv` (`scripts/satd-scan.sh flownow/src flownow/test`) · Total: **8** · En `src/`: 7 · En `test/`: 1 · Con ticket: **0** (AS-IS: SATD no gestionada = 8).

Clasificación según la literatura citada en §7 (diseño, defecto, documentación, requisitos, pruebas):

| Tipo | Cantidad | IDs |
|---|---|---|
| Diseño | 3 | TD-002, TD-005, TD-006 |
| Defecto | 2 | TD-001, TD-004 |
| Requisitos | 1 | TD-003 |
| Pruebas | 1 | TD-008 |
| Duplicación/diseño | 1 | TD-007 |
| Documentación | 0 | — |

## Ledger (plantilla Anexo B)

| ID | Tipo | Evidencia / ubicación | Decisión | Rationale | Owner | Fecha límite | Verificación | Estado |
|---|---|---|---|---|---|---|---|---|
| TD-001 | Defect | `services/customerService.js:21` `FIXME: reintentar luego, hoy se pierde el contacto` (sync con CRM) | **Refactor** | El alta de cliente ya no llama al CRM: publica `CustomerRegistered` e Integration sincroniza con reintento y bitácora (ADR-003/004). | D (Calidad) + C | 2026-11-15 | prueba: CRM caído no pierde el contacto (queda pendiente en `integration_log`); FF3 | Propuesta · marcador ya cita `TD-001` (gestionada) |
| TD-002 | Design | `services/paymentService.js:33` `TEMP: tipo de cambio fijo` (950/1030) | **Refactor** | FX es política de Payment: `FxPolicy` con tasas externalizadas (FF5). | C | 2026-11-15 | caracterización de conversión USD/EUR antes y después; FF5 sin literales | **Parcial (paso 2):** tasas externalizadas a `config.fx.rates` (FF5 = 0); sigue pendiente `FxPolicy` y un servicio de FX. Marcador cita `TD-002` |
| TD-003 | Requirement | `services/paymentService.js:32` `HACK: bono comercial… por teléfono con ventas` (−5000 si gold y > 1.000.000) | **Accept** (temporal) | Regla de negocio sin respaldo documentado; se **preserva** el comportamiento (§11), se traslada a pricing de Request y se confirma con el negocio. No se puede decidir sola por el equipo. | A (consulta al docente/negocio) | 2026-11-08 | confirmación escrita; si se elimina, prueba de caracterización actualizada y ADR | Propuesta |
| TD-004 | Defect | `services/paymentService.js:81` `TODO: cola de reintentos para facturas` (ERP caído) | **Accept** | Mover la factura a Integration y registrar la falla en `integration_log` es corrección parcial; la **cola de reintentos** es mejora fuera del slice. | D | 2026-11-15 | prueba: factura fallida queda en bitácora con estado `pending`; revisión del ledger | Propuesta |
| TD-005 | Design | `services/paymentService.js:45` `WORKAROUND: proveedor de respaldo payfast` | **Refactor** (o Remove si el negocio confirma que no se usa) | Es una segunda variante real de proveedor: justifica `ProviderPort`. Hoy es código inline, sin pruebas ni contrato. | C | 2026-11-15 | contract test del adapter de respaldo con fake; FF2 (sin nombre `payfast` fuera del adapter) | Propuesta |
| TD-006 | Design | `config.js:7` `TODO: mover a un secret manager` (clave `sk_live_…` en el repo) | **Refactor** | Secreto de ambiente en código; debe venir de variable de entorno/secreto. La clave expuesta debe **rotarse** (está en el historial de git). | D | 2026-11-08 | FF5 sin secretos literales; rotación registrada | **Código corregido (paso 2):** la clave sale de `STRIPEY_API_KEY` (obligatoria en producción) y el marcador se retiró. **Pendiente operacional:** rotar la clave `sk_live_…` que sigue en el historial de git (owner D); no es verificable desde el repo |
| TD-007 | Design | `services/reportService.js:16` `TEMP: mismo tipo de cambio fijo` | **Refactor** | Duplica la regla de TD-002; Reporting usa `amountBase` del evento de Payment (una fuente de FX). | C | 2026-11-15 | prueba de `salesReport` en USD/EUR; búsqueda de literales 950/1030 = 0 | **Parcial (paso 2):** literales 950/1030 = 0 (FF5). Sigue pendiente usar `amountBase` del evento. Marcador cita `TD-007` |
| TD-008 | Test | `test/helpers.test.js:8` `TODO: agregar pruebas de pagos, reembolsos y webhooks` | **Refactor** | Es el primer paso de E3: pruebas de caracterización antes de mover lógica. | C | 2026-11-08 | cobertura de `paymentService` y `integrationService` ↑; pruebas verdes antes y después | **Cerrada** (paso 1 de E3): marcador retirado porque la condición se corrigió; 46 pruebas verdes sobre el AS-IS; `paymentService` 18,9 % → 100 % líneas, `integrationService` 39,0 % → 100 % (`docs/baseline/paso1/`) |
| TD-009 | Design (decisión consciente, sin marcador) | Eventos en proceso (ADR-004): sin garantía de entrega ante caída entre commit y publicación | **Accept** | Con un solo proceso y ~700 LOC, un outbox/broker sería sobreingeniería (§5). Se registra para que no sea deuda oculta. | A | 2026-11-15 (revisión) | prueba de aislamiento de fallos del bus; bitácora de eventos; escenario documentado en E8 | **Aceptada**; mitigación implementada y probada en el paso 3 (`test/platform/events.test.js`: aislamiento, bitácora acotada). Sigue vigente la ausencia de outbox |
| TD-010 | Design (decisión consciente, sin marcador) | Respuestas HTTP de pagos siguen exponiendo `stripey_charge_id`/`stripey_status` (compatibilidad con clientes actuales) | **Accept** | Cambiar el contrato HTTP rompería consumidores; se confina a **un** presentador de compatibilidad `payment/http/legacy-presenter` (allowlist explícita de FF2b) mientras se versiona la API (§6.2). | A | 2026-11-15 (revisión) | FF2b sólo permite el nombre del proveedor en ese archivo; prueba de compatibilidad de la respuesta | Propuesta |

Tipos: Design · Defect · Documentation · Requirement · Test.

### Hallazgos de valores fijos que **no** son comentarios SATD

No cuentan en la métrica de SATD, pero rompen FF5 y deben resolverse en el alcance (se vigilan con Semgrep, no con `satd-scan`):

| ID | Ubicación | Qué es | Acción |
|---|---|---|---|
| H-1 | `utils/helpers.js` (`SECRET`) y `controllers/authController.js` (admin sembrado `admin123`) | secreto de firma y credencial por defecto en código | configuración + credencial inicial por entorno (Identity) |
| H-2 | `notificationService.js`, `notificationController.js` (`smsgo_live_8812`) | clave de SMS literal repetida | configuración del adapter SMS |
| H-3 | 9 líneas con URLs de proveedores (`hubcrm`, `erp.acme-internal.net`, `mailblast`, `smsgo`, `payfast`) | URLs de ambiente | configuración por adapter |
| H-4 | `requestService.js` (límite 10, umbrales 500000/20000), `paymentService.js` (umbral gold 2.000.000) | políticas como números mágicos | constantes nombradas dentro de su módulo (política, no secreto) |

## Reglas de operación

1. Todo marcador nuevo debe nacer como `// TODO(TD-xxx)` con su fila en el ledger (FF4).
2. Una deuda `Accept` sin owner, fecha o verificación **no** cuenta como gestionada.
3. Al cerrar una deuda: `Estado = Cerrada`, enlace al commit/PR y a la prueba que la verifica.

## Estado final

| | AS-IS | TO-BE (meta) |
|---|---|---|
| SATD total (alcance) | 8 | 8 gestionadas (ninguna borrada sin resolver) + 2 decisiones conscientes registradas |
| Corregidas (Refactor/Remove) | — | TD-001, 002, 005, 006, 007, 008 (**cerradas hasta ahora:** TD-008; TD-006 en código) |
| Aceptadas y registradas | — | TD-003, 004, 009, 010 (009 y 010 son decisiones conscientes sin marcador) |
| **No gestionadas** | **8** | **0** (medido tras el paso 2: los 6 marcadores restantes citan su `TD-xxx`) |

> "TO-BE" aquí es la meta de diseño. El valor final sale de `satd-scan.sh --gate` sobre el código TO-BE (E8).
