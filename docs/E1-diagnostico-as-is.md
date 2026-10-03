# E1. Diagnóstico AS-IS

> §17.1 · Máximo sugerido: 5 páginas más anexos automáticos.
> Toda cifra debe provenir de `scripts/baseline.sh` → `docs/baseline/as-is/`. No se copian números a mano.

**Commit / versión analizada:** `<hash>` · **Fecha:** `<AAAA-MM-DD>` · **Comando:** `scripts/baseline.sh flownow docs/baseline/as-is`

## 1. Mapa de módulos y clases actuales

<!-- Estructura de carpetas, componentes principales, diagrama del grafo de dependencias actual. -->

## 2. Smells y complejidad

| Archivo / clase | Smell (§8) | Métrica | Riesgo | Pregunta arquitectónica |
|---|---|---|---|---|
| | Clase grande | LOC / métodos | | ¿qué responsabilidades están mezcladas? |
| | Función larga | complejidad ciclomática/cognitiva | | |
| | Duplicación | % / bloques | | |
| | Interfaz trivial | nº implementaciones | | |

## 3. SATD clasificada

Fuente: `docs/baseline/as-is/satd.csv` · Detalle y decisiones en [E5](E5-debt-ledger.md).

| Tipo | Cantidad | Ejemplos (archivo:línea) |
|---|---|---|
| Diseño | | |
| Defecto | | |
| Documentación | | |
| Requisitos | | |
| Pruebas | | |
| **Total** | | |

## 4. Ciclos y dependencias problemáticas

| Ciclo / dependencia | Módulos involucrados | Por qué es problemática |
|---|---|---|
| | | |

## 5. Valores hard-coded

| Valor | Ubicaciones | ¿Configuración, política o secreto? |
|---|---|---|
| URL proveedor de pagos | | |

## 6. Ownership de datos actual

| Tabla / entidad | Componentes que leen | Componentes que escriben | ¿Owner claro? |
|---|---|---|---|
| customer | | | |
| payment | | | |
| request | | | |
| notification | | | |

## 7. Puntos de integración con terceros

| Proveedor / API | Dónde se usa | ¿Hay frontera (adapter/ACL)? |
|---|---|---|
| | | |

## 8. Escenarios de cambio e impacto AS-IS

| # | Escenario | Archivos a modificar | Módulos afectados | Evidencia (rutas) |
|---|---|---|---|---|
| S1 | Cambiar proveedor de pagos | | | |
| S2 | Agregar nuevo canal de notificación | | | |
| S3 | Cambiar el modelo de Customer | | | |
| S4 | Introducir nueva integración externa | | | |
| S5 | Separar reporting de datos transaccionales | | | |

## 9. Cobertura y pruebas

| Área crítica | Cobertura | Pruebas existentes |
|---|---|---|
| Pagos | | |

## 10. Conclusiones del diagnóstico

<!-- 3–5 hallazgos principales que motivan el TO-BE. -->
