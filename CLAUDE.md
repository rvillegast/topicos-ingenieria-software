# CLAUDE.md

Proyecto del curso de Magíster *Tópicos de Ingeniería de Software*: resolver el **Caso DecidArch — "De Vibe Coding a Vibe Architecting"**, sobre la plataforma ficticia **FlowNow**.

- Enunciado original: `Caso DecidArch.pdf`
- Versión Markdown (fuente de consulta preferida): `Caso DecidArch.md` — citar secciones por número (p. ej. "§12.2").

Idioma de trabajo: **español** (documentos, ADRs, informes). Identificadores de código, nombres de módulos y plantillas pueden ir en inglés, como en el enunciado.

## El caso en una frase

Recuperar la arquitectura de una base de código deteriorada por desarrollo asistido por IA (FlowNow: clientes, solicitudes, pagos, notificaciones, integraciones, reportes), **sin reescribirla**, preservando comportamiento, y **demostrar con evidencia AS-IS / TO-BE** que el sistema ahora puede cambiar sin propagar impacto innecesario.

Pregunta central (§16.1): *¿Qué evidencia demuestra que el sistema ahora puede cambiar sin propagar innecesariamente el impacto de ese cambio?*

## Principios que gobiernan TODA decisión

1. **Parnas / information hiding** (§3): cada módulo se define por la *decisión volátil que oculta*, no por capa técnica (`controllers/services/repositories/utils` no es una descomposición válida por sí sola). Contrato de módulo: `M = ⟨Responsibility, Secret, Interface, OwnedData, Dependencies, Invariants⟩`.
2. **Cohesión alta, acoplamiento bajo** (§4): preguntar "¿cuántas razones independientes de cambio tiene esto?". Modelar módulos como grafo `G=(V,E)`; cero ciclos. Prueba de cambio: cambiar el proveedor de pago debería tocar ≈1 módulo.
3. **Granularidad equilibrada** (§5): `C_total = C_internal + C_coordination`. No se premian más microservicios, interfaces o capas.
4. **Un único owner por dato** (§6): nadie lee/escribe tablas internas de otro módulo; se integra vía contrato (API, evento, DTO, schema versionado).
5. **SATD gestionada, no ocultada** (§7): la meta es `UnmanagedSATD = 0`, **no** "cero comentarios TODO". Borrar un `TODO/FIXME/HACK/TEMP/WORKAROUND` sin corregirlo o registrarlo es una falta. Deuda aceptada → `Issue → Owner → Rationale → DueDate → Verification` (Debt Ledger, Anexo B).
6. **SOLID y patrones sólo ante presión de cambio concreta** (§9–10): toda abstracción o patrón debe responder "¿qué problema de cambio/dependencia resuelve?". Problema → patrón candidato → trade-off. Nada de interfaces "porque SOLID lo dice".
7. **Refactoring incremental, nunca reescritura** (§11): `CharacterizationTests → SmallRefactoring → Tests → ArchitectureCheck → Commit`.
8. **Las decisiones viven en CI** (§12): convertir reglas arquitectónicas en fitness functions ejecutables (ArchUnit, dependency-cruiser, Semgrep, CodeQL, SonarQube… según stack).
9. **Evidencia triangulada** (§19): `ArchitectureModel + SourceCode + AutomatedEvidence`. Una afirmación como "ahora está desacoplado" no vale sin métrica, escenario y regla automática que la respalde.

## Reglas para Claude al trabajar en este repo

Estas reglas aplican el propio caso (Vibe Architecting) al agente:

- **Antes de generar código en un módulo**, ubicar o redactar su *Architectural Intent* (§13 / plantilla Anexo A) y respetarlo: dependencias permitidas/prohibidas, datos que posee, contrato público, restricciones de calidad.
- **No reescribir** archivos o subsistemas completos. Cambios pequeños, con pruebas de caracterización previas cuando el comportamiento no esté cubierto.
- **No eliminar comentarios SATD** salvo que la deuda quede resuelta o registrada en el Debt Ledger. Al tocar código con SATD, reportarlo.
- **No introducir**: ciclos entre módulos, acceso a datos de otro owner, tipos de proveedor externo fuera de su adapter, valores de ambiente/URLs/secretos hard-coded, abstracciones sin variabilidad o frontera que las justifique.
- **No inventar métricas**: los valores AS-IS/TO-BE deben salir de scripts o herramientas reproducibles y ejecutadas (Paso 1 y Paso 10 de §15).
- Al cerrar un cambio, verificar el **Checklist de PR** (Anexo D) y actualizar los ADRs afectados.
- Lista inicial de responsabilidades sugerida (hipótesis, no obligatoria): `Identity, Customer, Request, Payment, Notification, Reporting, Integration`.

## Metodología (10 pasos, §15)

1. Línea base reproducible (estructura, dependencias, complejidad, smells, SATD, ownership, cobertura, integraciones).
2. ≥4 escenarios de cambio con impacto AS-IS (cambiar proveedor de pagos, nuevo canal de notificación, cambiar modelo Customer, nueva integración externa, separar reporting).
3. Descubrir responsabilidades por razón de cambio (no copiar la estructura actual).
4. Declarar el secreto de Parnas de cada módulo candidato.
5. Contratos y ownership.
6. Grafo TO-BE; justificar cohesión, acoplamiento, granularidad.
7. Plan incremental de refactoring (seams, pruebas, extracción de dependencias, fronteras).
8. Implementar un **slice representativo** (no todo el sistema).
9. Fitness functions y quality gate.
10. Comparar AS-IS vs TO-BE con medidas y escenarios.

## Entregables (§17)

| ID | Entregable | Mínimos |
|---|---|---|
| E1 | Diagnóstico AS-IS | ≤5 págs + anexos; mapa, smells, SATD clasificada, ciclos, ownership actual, 4 escenarios, baseline reproducible |
| E2 | Arquitectura TO-BE (Parnas) | por módulo: responsabilidad, secreto, contratos, owned data, deps permitidas/prohibidas, invariantes, granularidad |
| E3 | Plan e implementación de refactoring | secuencia, tests de caracterización, diff/PR, evidencia de comportamiento preservado |
| E4 | Fitness functions + quality gate | ≥3 reglas automatizadas, pipeline reproducible |
| E5 | Gestión de SATD | inventario, clasificación, resolución/aceptación, estado final; `UnmanagedSATD = 0` en alcance intervenido |
| E6 | ADRs | ≥5 (plantilla Anexo C) |
| E7 | Architectural Intent Prompt | contrato reusable para otro agente |
| E8 | Informe AS-IS / TO-BE | matriz §17.8 + métricas del stack |

Quality gate del ejercicio (Anexo E): SATD no gestionada 0 · ciclos 0 · dependencias prohibidas 0 · secretos/URLs hard-coded 0 · fitness functions ≥3 · ADRs ≥5 · escenarios ≥4 · pruebas críticas pasan antes y después.

## Rúbrica (§18)

Descomposición por Parnas **20 %** · Cohesión/acoplamiento/complejidad 15 % · Data ownership e interoperabilidad 15 % · Refactoring y pruebas 15 % · Diagnóstico 10 % · SATD 10 % · Fitness functions 10 % · ADRs y Vibe Architecting 5 %.

"Insuficiente" = limpieza superficial, reordenar carpetas o SOLID/patrones declarativos sin evidencia de reducción de cambios, dependencias o deuda.

## Estructura del repo

- `PLAN.md`: plan de trabajo por fases.
- `flownow/`: código del caso (AS-IS sintético en Node/Express; reemplazable por el repo del docente).
- `docs/E1…E8-*.md`: entregables. `docs/modules/`: una ficha de módulo por módulo (Anexo A). `docs/adr/`: ADR-001 a 005. `docs/intents/`: intents y prompts usados con IA, para la trazabilidad.
- `docs/baseline/{as-is,to-be}/`: salida de los scripts. No se edita a mano.
- `scripts/baseline.sh <código> <salida>`: genera la línea base. Los pasos 4–7 (dependencias, complejidad, acceso a datos, cobertura) quedan por completar según el stack.
- `scripts/satd-scan.sh [--gate] <ruta>`: genera el CSV de deuda autoadmitida. Con `--gate` falla si encuentra alguna sin gestionar (FF4).
- `ci/`: reglas de arquitectura. `.github/PULL_REQUEST_TEMPLATE.md`: checklist del Anexo D.

**Convención de deuda autoadmitida:** un comentario cuenta como gestionado cuando referencia su entrada en el Debt Ledger, por ejemplo `// TODO(TD-004): …`.

## Contexto del curso

- Equipos de 3–4 estudiantes, 2 semanas, 10–14 h por equipo.
- Tecnologías libres según el repositorio entregado por el docente. Mientras no llegue, `flownow/` contiene una versión AS-IS construida a mano con los síntomas de §14.2 (ver `flownow/README.md`).
- **Stack de `flownow/`:** Node.js ≥ 22 (probado en 24) · Express 5 · SQLite (`node:sqlite`) · `node:test`. Proveedores externos simulados (sin red).
- **Comandos** (desde `flownow/`): `npm install` · `npm start` (:3000) · `npm test`. SATD: `scripts/satd-scan.sh flownow/src flownow/test`.
- Herramientas de fitness functions para este stack (por definir): dependency-cruiser (FF1/FF2), Semgrep (FF2/FF3/FF5), `satd-scan.sh --gate` (FF4). Ver `ci/README.md`.
- El uso de IA está permitido y esperado, pero debe quedar **trazabilidad** de cómo fue controlada por intención arquitectónica (guardar los prompts/intents usados).
- Defensa oral: ver preguntas en §20 (secreto principal por módulo, dependencia aún riesgosa, deuda aceptada, patrón rechazado, cómo evitar que un agente reintroduzca el problema, etc.).
