# E7. Architectural Intent Prompt (reusable)

> §13, §17.7 · Contrato que se entrega a un agente de IA **antes** de pedirle código, para que implemente una nueva capacidad sin romper las fronteras.

## Cómo usarlo

1. Copiar el bloque, completar los campos del módulo objetivo (desde `modules/<módulo>.md`).
2. Agregar la tarea concreta en `Task`.
3. Guardar el prompt usado en `intents/AAAA-MM-DD-<tarea>.md` (trazabilidad).
4. Validar el resultado con el checklist de PR y las fitness functions.

```
ARCHITECTURAL INTENT

Module:
<módulo>

Responsibility:
<qué problema resuelve>

Secret:
<qué decisión de diseño oculta>

Owned data:
<entidades que gobierna>

Allowed dependencies:
<contratos de los que puede depender>

Forbidden dependencies:
<bases de datos / implementaciones ajenas>

Public contract:
<operaciones / eventos expuestos — no modificar sin ADR>

Quality constraints:
- no circular dependency
- no unmanaged SATD (any TODO/FIXME must reference TD-xxx)
- configuration externalized, no hard-coded URLs/secrets
- external provider types must not leak outside the adapter
- no new abstraction without a concrete change pressure
- behavior preserved by tests (write characterization tests first)
- small incremental changes, no rewrite

Evidence required:
unit tests + contract tests + passing architecture rules + ADR update if a boundary changes

Task:
<capacidad a implementar>
```

## Ejemplo de validación

<!-- Mostrar que otro agente implementó p. ej. un nuevo canal de Notification usando este intent y las FF pasaron. -->
