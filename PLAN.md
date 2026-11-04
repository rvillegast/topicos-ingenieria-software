# Plan de trabajo — Caso DecidArch / FlowNow

> **Estado (2026-11-04):** esta lista es el plan original; los ítems marcados `[x]` tienen evidencia en el repositorio. Quedan sin marcar los que no se cumplieron o no son verificables desde aquí (repo del docente, workflow ejecutado en GitHub, escenarios S2–S5 con experimento real, revisión final contra la rúbrica, ensayo de la defensa). Estado vigente: `docs/00-guia-de-diseno.md` y `docs/E8-evidencia-as-is-to-be.md`.

Referencia: `Caso DecidArch.md` (las secciones se citan como §N). Duración: **2 semanas**. Esfuerzo: **10–14 h por equipo** (§16.3). Equipo de 3–4 personas.

> **Supuesto:** las horas se cuentan como horas del equipo y van en paralelo según los roles. Si el docente se refiere a horas por persona, el plan sirve igual y queda más holgado.

## 0. Bloqueante previo

- [ ] Recibir el repositorio de FlowNow que entrega el docente y copiarlo a `flownow/` (o como submódulo).
- [x] Inicializar git en este directorio y abrir una rama por cada fase. Hace falta para el entregable E3, que pide un PR o un diff.
- [x] Anotar en `CLAUDE.md` el stack, los comandos de build y de test, y cómo levantar la aplicación.

Mientras no llegue el repositorio solo se puede avanzar en lo marcado con 🟢 (no depende del código).

## Roles sugeridos

| Rol | Responsable de | Entregables |
|---|---|---|
| **A. Arquitectura** | descomposición por Parnas, contratos, ownership, grafo TO-BE | E2, E6, E7 |
| **B. Diagnóstico y evidencia** | línea base, métricas, escenarios, informe final | E1, E8 |
| **C. Refactoring** | pruebas de caracterización, implementación del slice | E3 |
| **D. Calidad y CI** | fitness functions, quality gate, deuda autoadmitida (SATD) | E4, E5 |

Con 3 personas, B y D se juntan en un solo rol.

## Estructura de entregables

```
docs/
  E1-diagnostico-as-is.md
  E2-arquitectura-to-be.md        # un Module Contract (Anexo A) por módulo
  E3-plan-refactoring.md
  E4-fitness-functions.md
  E5-debt-ledger.md               # plantilla Anexo B
  E7-architectural-intent.md      # prompt reusable (§13)
  E8-evidencia-as-is-to-be.md     # matriz §17.8
  adr/ADR-001..005.md             # plantilla Anexo C
  intents/                        # prompts/intents usados con IA (trazabilidad)
scripts/
  baseline.sh                     # regenera todas las métricas AS-IS/TO-BE
  satd-scan.sh
ci/                               # pipeline + reglas (Semgrep, dependency-cruiser/ArchUnit, etc.)
```

---

## Semana 1: entender y diseñar

### Fase 1. Línea base reproducible (§15 paso 1) · ~2,5 h · B + D

- [x] `scripts/baseline.sh`: grafo de dependencias, ciclos, complejidad por archivo y función, duplicación, cobertura actual.
- [x] `scripts/satd-scan.sh`: buscar `TODO|FIXME|HACK|TEMP|WORKAROUND`, exportar a CSV y clasificar (diseño, defecto, documentación, requisitos, pruebas).
- [x] Inventario de valores fijos en el código: URLs, nombres de proveedores, flags, secretos.
- [x] Mapa de acceso a datos: qué componente lee o escribe cada tabla. De ahí sale el ownership actual.
- [x] Puntos de integración con terceros.
- [x] Guardar la salida en `docs/baseline/as-is/`, sin editarla a mano.

**Listo cuando:** cualquier integrante puede volver a correr el script y obtiene los mismos números.

### Fase 2. Escenarios de cambio (§15 paso 2) · ~1 h · B 🟢 (la redacción no depende del código)

- [x] Redactar 4 o 5 escenarios: cambiar el proveedor de pagos, agregar un canal de notificación, cambiar el modelo de Customer, sumar una integración externa, separar reporting.
- [x] Para cada uno, contar los archivos y módulos que habría que tocar hoy (impacto AS-IS) con rutas concretas.

### Fase 3. Responsabilidades y secretos de Parnas (§15 pasos 3–4) · ~2 h · A (con todo el equipo)

- [x] Agrupar el comportamiento según su razón de cambio. La hipótesis de partida es: Identity, Customer, Request, Payment, Notification, Reporting, Integration.
- [x] Llenar un Module Contract (Anexo A) por módulo: responsabilidad, **secreto**, razón de cambio, datos que posee, interfaz y dependencias prohibidas.
- [x] Revisar con dos preguntas: "¿qué módulo eliminaríamos?" y "¿algún módulo no tiene un secreto real?". Si no lo tiene, se fusiona con otro.

### Fase 4. Contratos, ownership y grafo TO-BE (§15 pasos 5–6) · ~1,5 h · A

- [x] Tabla de datos con su owner (§6.1) y cómo los leen los demás módulos (API, evento o proyección).
- [x] Contratos: API, interfaz o eventos, DTO o schema, versionado y compatibilidad hacia atrás.
- [x] Grafo TO-BE sin ciclos, con una justificación de la granularidad (§5).
- [x] Escribir los ADRs 001 a 003: límite de Payment, ownership de Customer y estrategia para proveedores externos.

### Fase 5. Plan incremental (§15 paso 7) · ~0,5 h · A + C

- [x] **Elegir el slice.** Recomiendo **Payment**: es el escenario de cambio más claro, se presta para Strategy/Adapter, hace evidente la prueba de cambio y probablemente concentra deuda autoadmitida.
- [x] Ordenar los pasos de menor a mayor riesgo: caracterizar, extraer configuración, extraer el adapter del proveedor, cerrar el acceso a la tabla de pagos, romper ciclos.
- [x] Redactar el intent de Payment (formato §13) en `docs/intents/payment.md` **antes** de pedirle código a la IA.

**Hito al cierre de la semana 1:** E1 y E2 en borrador, ADR-001 a 003 escritos, slice elegido. Conviene mostrárselo al docente si se puede.

---

## Semana 2: intervenir, automatizar y demostrar

### Fase 6. Implementar el slice (§15 paso 8, §11) · ~3 h · C

- [x] Escribir pruebas de caracterización del comportamiento crítico de pagos **antes** de tocar nada.
- [x] Hacer refactorings pequeños, un commit cada uno: pruebas, refactoring pequeño, pruebas otra vez, chequeo de arquitectura y commit.
- [x] Transformaciones previstas: valor fijo a configuración, dependencia directa del proveedor a interfaz más adapter, mutación de datos compartidos a frontera de ownership, clase o método grande a extract class/method.
- [x] Cada prompt que se le dé a la IA se basa en el intent y se guarda en `docs/intents/`.
- [ ] Recorrer el checklist de PR (Anexo D) en cada PR.

### Fase 7. Fitness functions y quality gate (§12, §15 paso 9) · ~2 h · D (en paralelo con la fase 6)

Mínimo 3 reglas automáticas. Propuesta:

| # | Regla | Herramienta según el stack |
|---|---|---|
| FF1 | No hay ciclos entre módulos | dependency-cruiser / ArchUnit / import-linter |
| FF2 | Los tipos del proveedor de pagos no salen del adapter | ArchUnit / Semgrep |
| FF3 | Solo Payment escribe en sus tablas | Semgrep / ArchUnit |
| FF4 | No hay deuda autoadmitida sin ticket en el código intervenido (`TODO` sin `TD-xxx`) | Semgrep / script |
| FF5 | No hay URLs ni secretos de ambiente en el código | Semgrep / gitleaks |

- [ ] Pipeline de CI: análisis estático, reglas de arquitectura, gate de deuda autoadmitida, pruebas y quality gate. Un fallo bloquea el merge.
- [x] Demostrar que cada regla **falla** con una violación introducida a propósito. Esa es la evidencia de que sirve.
- [x] ADR-004 (integración entre módulos) y ADR-005 (política de deuda autoadmitida y quality gate).

### Fase 8. Gestión de la deuda autoadmitida (E5) · ~0,5 h · D

- [x] Para cada ítem del inventario dentro del alcance intervenido, decidir: corregir, aceptar con ticket, owner, motivo, fecha y verificación, o eliminar con justificación.
- [x] Meta: cero deuda autoadmitida sin gestionar en el alcance intervenido. Nunca borrar comentarios para bajar la cuenta.

### Fase 9. Evidencia AS-IS / TO-BE (§15 paso 10, §19) · ~1 h · B

- [x] Volver a correr `scripts/baseline.sh` sobre el código TO-BE y llenar la matriz de §17.8.
- [ ] Repetir los escenarios de cambio. Ejemplo de resultado buscado: "cambiar el proveedor de pagos tocaba N módulos y ahora toca 1 (el adapter), y FF2 impide que se repita".
- [x] Para cada afirmación, cubrir los cinco puntos de §19: problema, decisión, artefacto, prueba o regla, y escenario.
- [x] Escribir E7: un intent reusable para que otro agente agregue una capacidad nueva, por ejemplo un nuevo canal de Notification.

### Fase 10. Cierre y defensa · ~0,5 h · todo el equipo

- [ ] Revisar contra el quality gate (Anexo E) y la rúbrica (§18).
- [ ] Ensayar las 10 preguntas de la defensa oral (§20). Cada persona debe poder contestar las de las otras áreas.

---

## Resumen del esfuerzo

| Fase | Horas | Semana |
|---|---|---|
| 1 Línea base | 2,5 | 1 |
| 2 Escenarios | 1 | 1 |
| 3 Parnas | 2 | 1 |
| 4 Contratos y grafo | 1,5 | 1 |
| 5 Plan incremental | 0,5 | 1 |
| 6 Slice | 3 | 2 |
| 7 Fitness functions | 2 | 2 (en paralelo con la 6) |
| 8 Deuda autoadmitida | 0,5 | 2 |
| 9 Evidencia | 1 | 2 |
| 10 Cierre | 0,5 | 2 |
| **Total** | **~14,5** | |

## Prioridades según la rúbrica

1. **Descomposición por Parnas (20 %).** Si falta tiempo, se recorta en otra parte, nunca acá. Cada módulo necesita un secreto real.
2. **Cohesión, ownership y refactoring (15 % cada uno).** Es mejor un slice bien demostrado que muchos a medias.
3. Fitness functions, deuda autoadmitida y diagnóstico (10 % cada uno). Las reglas deben correr de verdad en CI.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El repositorio llega tarde | Adelantar los escenarios, las plantillas y los borradores de ADR con la hipótesis de módulos de §4.1 |
| El slice crece de más | Limitarse a Payment; los demás módulos quedan solo en el diseño TO-BE |
| Faltan pruebas para caracterizar | Probar en los bordes (endpoints) antes de mover lógica interna |
| La IA reintroduce acoplamiento | Usar siempre el intent y dejar que las fitness functions en CI bloqueen el merge |
| Métricas no reproducibles | Todo número sale de `scripts/`, nada se copia a mano |
