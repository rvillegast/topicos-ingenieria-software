# Pitch de grabación — FlowNow / Caso DecidArch

> Deck principal: `docs/presentacion/FlowNow-DecidArch.pptx` (template de la Facultad; el guion de cada lámina está en sus notas del orador).
> Alternativa web: `docs/presentacion/slides.html` (abrir en el navegador, `F` = pantalla completa, flechas para avanzar; la URL guarda la lámina, p. ej. `#7`).
> **Duración objetivo: ~10 min** (11 láminas, ~130 palabras/min). El enunciado no fija formato ni duración de la presentación; si el docente pide otra, recortar según la tabla del final.
> Cada lámina lleva su peso de rúbrica (§18) para que lo que se cuente sea proporcional a lo que se evalúa.
> Reparto sugerido con 3–4 personas: A = láminas 1–4 · B = 5–6 · C = 7–8 · D = 9–11 (o una sola voz si es un solo video).

---

## Guion

### 1 · Portada (0:00–0:35)
"Hola, somos [equipo]. Les presentamos cómo recuperamos la arquitectura de FlowNow, una plataforma que quedó deteriorada por desarrollo asistido por IA, **sin reescribirla** y preservando su comportamiento. Todo el trabajo gira en torno a una sola pregunta: *¿qué evidencia demuestra que el sistema ahora puede cambiar sin propagar innecesariamente el impacto de ese cambio?* Al final se las respondemos con números."

### 2 · Diagnóstico AS-IS (0:35–1:40) — *Diagnóstico 10 %*
"Partimos midiendo, no opinando. Armamos una línea base reproducible con `baseline.sh`. El problema no es el tamaño del código, es el **radio de cambio**: cambiar el proveedor de pagos obligaba a revisar **12 archivos en 5 áreas**. Había **6 ciclos** entre servicios, **5 de 6 tablas** escritas desde más de un archivo, y `processPayment` concentraba ocho responsabilidades con complejidad ciclomática 26 y solo 18,9 % de cobertura. Además, 8 comentarios de deuda sin ticket y una clave `sk_live` hard-coded. Esto es lo que llamamos vibe coding: cada cambio funcionó localmente, pero nadie cuidó la estructura."

### 3 · Parnas (1:40–3:00) — *Descomposición 20 %* (la más pesada: darle tiempo)
"La descomposición la hicimos con el criterio de Parnas: cada módulo se define por **la decisión volátil que oculta**, no por capa técnica. `controllers/services/repositories` no es una descomposición. Payment oculta el proveedor, los reintentos, el FX y los estados de transacción. Customer oculta el modelo del cliente y la política de tiers. Request, la máquina de estados y el precio. Notification, los canales y proveedores. Reporting, el almacén de lectura. Integration, los protocolos de CRM y ERP. Identity, las credenciales y el token. Además **eliminamos** `utils/helpers`: cada función se fue al módulo que justifica su secreto. Y rechazamos crear un módulo 'Stripey' aparte, porque el proveedor es un secreto *de Payment*, no un módulo."

### 4 · Cohesión, acoplamiento y granularidad (3:00–4:00) — *15 %*
"El grafo TO-BE tiene **cero ciclos**, contra seis en el AS-IS. Payment e Identity son hojas; el orden topológico es Payment, Customer, Request, y recién después Notification, Integration y Reporting, que nadie consume. Las flechas punteadas son eventos versionados: así Payment publica `PaymentCaptured` sin conocer a quienes lo escuchan. Elegimos un **monolito modular** y no microservicios, porque el costo de coordinación no se justifica a esta escala. Y el costo existe y lo medimos: pasamos de 22 a 39 archivos y de 67 a 115 aristas. La mejora no viene de tener menos código, sino de que las aristas apuntan a contratos."

### 5 · Ownership e interoperabilidad (4:00–4:50) — *15 %*
"Cada dato tiene un único owner. Las tablas llevan el prefijo de su módulo y nadie fuera de él las nombra; la regla FF3 lo verifica. Los demás módulos leen vía API pública o eventos versionados, con lector tolerante y convivencia v1/v2. El proveedor entra por un puerto neutro con un adapter que traduce estados y errores, así su vocabulario no se filtra. Ojo: hoy el ownership estricto está cerrado solo para `payment_payments`; el resto de las tablas están bajo un *ratchet* que solo puede bajar."

### 6 · Refactoring y pruebas (4:50–5:50) — *15 %*
"Nada de reescritura. Primero escribimos **63 pruebas de caracterización** black-box sobre la API HTTP, antes de tocar una línea; la misma suite quedó verde tras cada paso. Fueron once pasos pequeños sobre el slice de Payment, siguiendo caracterización, refactor, tests, chequeo de arquitectura y commit. Una sola modificación a esa suite, aprobada: un conteo de intentos inconsistente del AS-IS. Hoy hay **125 pruebas verdes**, Payment con 100 % de cobertura y complejidad máxima 12, contra 26. Y decimos claramente que es un **slice representativo**, no todo el sistema."

### 7 · Fitness functions (5:50–6:50) — *10 %*
"Las decisiones viven en CI. Convertimos los ADRs en **ocho reglas ejecutables**: cero ciclos, el proveedor confinado a su adapter, ownership de tablas, SATD sin gestionar en cero, sin secretos ni URLs hard-coded, dependencias solo vía contrato, cobertura crítica y complejidad que no sube. Y cada regla fue **demostrada fallando**: `prove-rules-fail.sh` introduce 15 violaciones intencionales y el pipeline las detecta todas. El workflow corrió en GitHub Actions con cinco jobs en verde, y el quality gate del Anexo E sobre el TO-BE está aprobado."

### 8 · SATD (6:50–7:40) — *10 %*
"Con la deuda autoadmitida el objetivo no es borrar comentarios, es que **`UnmanagedSATD` sea cero**. Pasamos de 8 sin ticket a 0 sin gestionar: quedan 5 marcadores, todos con su `TD-xxx` en el Debt Ledger, con owner, justificación, fecha y verificación; FF4 lo exige. Aceptamos conscientemente cuatro: el bono gold, la cola ERP, los eventos en proceso y los campos legacy de Stripey. Y somos honestos: solo TD-008 está realmente cerrada; el resto está *gestionada*. TD-006, la clave en el historial de git, requiere rotarla, y eso no se arregla desde el repositorio."

### 9 · ADRs y Vibe Architecting (7:40–8:20) — *5 %*
"Documentamos seis ADRs: límite de Payment, propiedad de Customer, proveedores externos, integración entre módulos, política de SATD y granularidad. Para la IA escribimos un **Architectural Intent** reutilizable —módulo, dependencias permitidas y prohibidas, datos que posee, contrato y calidad— y guardamos los prompts usados. Pero el control real no es el prompt: si un agente cruza una frontera, **falla el CI**. Eso responde cómo evitamos que reintroduzca el problema."

### 10 · Evidencia AS-IS / TO-BE (8:20–9:20) — *responde §16.1 y §19*
"Acá está la respuesta. SATD sin gestionar, de 8 a 0. Ciclos, de 6 a 0. Cobertura de Payment, de 18,9 % a 100 %. Complejidad máxima, de 26 a 12. Fitness functions, de 0 a 8. Y la prueba central: hicimos un **experimento** agregando un proveedor ficticio, NovaPay. Antes eran 12 archivos en 5 áreas; ahora fueron **4 archivos, todos dentro de Payment, y ninguno del código legado**. Eso es la triangulación que pide el enunciado: modelo, código y evidencia automática que lo respalda."

### 11 · Límites y cierre (9:20–10:10)
"Para cerrar, lo que **no** demostramos. Solo el escenario S1 tiene experimento real; S2 a S5 están planificados pero no ejecutados. El ownership estricto cubre una de seis tablas, y el fan-in de `db` y `helpers` subió en vez de bajar. Con NovaPay fallan 24 pruebas, porque la suite valida el vocabulario de Stripey. Y quedan pendientes rotar la clave y configurar la branch protection. La dependencia que sigue más riesgosa es Customer escuchando eventos de Payment, mitigada con contrato v1 y un solo sentido. Nuestra conclusión defendible: el radio de cambio de la decisión más volátil quedó confinado y protegido por reglas ejecutables. Gracias."

---

## Chequeo contra el enunciado y la rúbrica

### Condiciones obligatorias (§16.2)

| # | Condición | Lámina | Evidencia |
|---|---|---|---|
| 1 | Criterio de Parnas | 3 | E2 §9, `docs/modules/` |
| 2 | Cohesión / acoplamiento | 4 | E2 §5.1, §14 |
| 3 | Ownership de datos | 5 | E2 §10, ADR-002, FF3 |
| 4 | Contratos de interoperabilidad | 5 | E2 §11, ADR-004 |
| 5 | SATD sin ocultarla | 8 | E5, FF4 |
| 6 | Refactoring incremental con pruebas | 6 | E3 |
| 7 | ≥ 3 reglas automatizadas | 7 | 8 reglas (E4) |
| 8 | ADRs | 9 | `docs/adr/` (6) |
| 9 | Instrucciones de Vibe Architecting | 9 | E7, `docs/intents/` |
| 10 | Evidencia AS-IS / TO-BE | 10 | E8 |

### Rúbrica (§18) y tiempo asignado

| Dimensión | Peso | Láminas | Tiempo | ¿Proporcional? |
|---|---|---|---|---|
| Descomposición por Parnas | 20 % | 3 | ~1:20 | ✅ la lámina más larga |
| Cohesión / acoplamiento | 15 % | 4 | ~1:00 | ✅ |
| Data ownership e interoperabilidad | 15 % | 5 | ~0:50 | ✅ |
| Refactoring y pruebas | 15 % | 6 | ~1:00 | ✅ |
| Diagnóstico | 10 % | 2 | ~1:05 | ✅ |
| SATD | 10 % | 8 | ~0:50 | ✅ |
| Fitness functions | 10 % | 7 | ~1:00 | ✅ |
| ADRs y Vibe Architecting | 5 % | 9 | ~0:40 | ✅ |
| Evidencia (§16.1, §19) | transversal | 10–11 | ~1:50 | ✅ |

### Regla de evidencia (§19): las 5 preguntas por afirmación
Cada cifra del deck sale de `docs/baseline/{as-is,to-be}/` o de `docs/E8-evidencia-as-is-to-be.md`; la tabla de trazabilidad por afirmación está en E8 ("Trazabilidad de afirmaciones"). No usar ninguna cifra que no esté ahí.

### Nivel "Excelente" (§18.1): lo que hay que dejar claro en el video
Localiza decisiones de cambio (3) · demuestra reducción de impacto (10) · automatiza invariantes (7) · IA dentro de fronteras verificables (9) · coherencia drivers → módulos → código → pruebas → ADRs (10).

---

## Respuestas de defensa (§20), por si preguntan después del video

1. **Secreto principal por módulo:** lámina 3.
2. **Módulo a eliminar:** Integration (se fusionaría con `platform`/outbox); CRM y ERP cambian por razones distintas a Customer o Payment, pero es el que menos secreto propio tiene.
3. **Dependencia riesgosa:** `Customer ⇢ Payment` por evento (lámina 11).
4. **Deuda aceptada:** TD-003, TD-004, TD-009, TD-010 (lámina 8).
5. **Interfaz sin beneficio:** `authorizePayment/capturePayment`, `GatewayFactory`, `IPaymentGateway`/`INotifier` genéricos.
6. **Patrón rechazado:** Factory abstracta de proveedores, CQRS/Event Sourcing, saga distribuida (E2 §15).
7. **Comportamiento preservado:** suite de caracterización black-box idéntica, verde antes y después.
8. **FF más importante:** FF2/FF2b (proveedor), FF1 (grafo), FF3 (ownership).
9. **Si cambia el modelo de Customer:** se modifica Customer y, a lo más, el DTO v1→v2. **Pero S3 no se demostró** (Customer se desacopló solo parcialmente; la heurística pasó de 13 a 14 archivos). Decirlo así.
10. **Que un agente no reintroduzca el problema:** intent versionado + CI bloqueante + CODEOWNERS + `prove-rules-fail` (lámina 9).

## Si hay que acortar

| Duración | Qué hacer |
|---|---|
| 5 min | Fusionar 2+11 (30 s c/u), 4+5 (1 min), 6+7 (1 min), 8+9 (45 s), 10 (1 min) |
| 7 min | Quitar el detalle de la lámina 5 y la lista de reglas de la 7 (dejar "8 reglas, 15 violaciones detectadas") |

## Antes de grabar

- `ci/run-rules.sh` y `cd flownow && npm test`: verificado hoy (2026-11-05): **todas las reglas pasan, 125/125 pruebas**.
- Completar en la lámina 1: nombres del equipo y fecha.
- Opcional, como respaldo visual: mostrar 20 s de terminal con `ci/run-rules.sh` en verde y `docs/experimentos/S1-novapay.stat.txt` en la lámina 10.
- **Inconsistencias en `docs/E8-evidencia-as-is-to-be.md`** (no las toqué): la fila de ADRs y el punto 5 de "Qué queda fuera" dicen "Propuesto", pero los ADRs están en **Aceptado** (2026-11-04); y el experimento habla de 127 pruebas mientras que hoy `npm test` da 125 (no pude verificar de dónde sale la diferencia; revisar antes de entregar). En el video usé "Aceptados" y "125". Conviene corregir E8 antes de entregar para que el docente no vea dos versiones.
