# E8. Informe de evidencia AS-IS / TO-BE

> §17.8, §19 · Triangulación: `ArchitectureModel + SourceCode + AutomatedEvidence`.
> Cifras generadas por `scripts/baseline.sh` en `docs/baseline/as-is/` y `docs/baseline/to-be/`.

## Matriz

| Indicador | AS-IS | TO-BE | Fuente |
|---|---|---|---|
| SATD no gestionada | | 0 | |
| Ciclos entre módulos | | 0 | |
| Dependencias prohibidas | | 0 | |
| Hard-coded críticos | | 0 o justificados | |
| Datos sin owner | | 0 | |
| Complejidad extrema | | ↓ | |
| Duplicación relevante | | ↓ | |
| Cobertura crítica | % | ↑ | |
| Cambio de proveedor afecta | N módulos | acotado | |
| ADRs | 0 | ≥5 | |
| Fitness functions | 0 | ≥3 | |
| <métrica del stack> | | | |

## Escenarios de cambio comparados

| # | Escenario | Impacto AS-IS | Impacto TO-BE | Regla que lo protege |
|---|---|---|---|---|
| S1 | Cambiar proveedor de pagos | | | FF2 |
| S2 | Nuevo canal de notificación | | | |
| S3 | Cambiar modelo de Customer | | | |
| S4 | Nueva integración externa | | | |

## Trazabilidad de afirmaciones (§19)

| Afirmación | Problema observado | Decisión (ADR) | Artefacto cambiado | Prueba / regla | Escenario mejorado |
|---|---|---|---|---|---|
| | | | | | |

## Conclusión

<!-- Responder la pregunta central (§16.1) con base en la evidencia anterior. -->
