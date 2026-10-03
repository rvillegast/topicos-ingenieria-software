# E3. Plan e implementación de refactoring

> §17.3 · Sin reescritura. Ciclo por paso:
> `CharacterizationTests → SmallRefactoring → Tests → ArchitectureCheck → Commit`

**Slice elegido:** Payment · **Justificación:** <!-- escenario S1, deuda concentrada, prueba de cambio clara -->

## 1. Pruebas de caracterización

| Comportamiento | Prueba | Estado antes | Estado después |
|---|---|---|---|
| | | ✅ | ✅ |

## 2. Secuencia incremental

| # | Transformación (§11) | Archivos | Riesgo | Commit / PR | Pruebas | FF |
|---|---|---|---|---|---|---|
| 1 | HardcodedValue → Configuration | | bajo | | ✅ | |
| 2 | DirectVendorDependency → Interface + Adapter | | medio | | | |
| 3 | SharedDataMutation → OwnershipBoundary | | medio | | | |
| 4 | Romper ciclo X ↔ Y | | | | | |
| 5 | LargeClass → ExtractClass | | | | | |

## 3. Evidencia de comportamiento preservado

<!-- Salida de tests antes/después, enlaces a CI. -->

## 4. Uso de IA

Intents usados: [`intents/`](intents/). Cada prompt se basó en el Architectural Intent del módulo.
