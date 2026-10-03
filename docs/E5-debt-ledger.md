# E5. Gestión de SATD — Debt Ledger

> §7, §17.5 · Meta del alcance intervenido: `UnmanagedSATD = 0`.
> **Borrar el comentario no elimina la deuda.** Deuda aceptada: `SATD → Issue → Owner → Rationale → DueDate → Verification`.
>
> Convención: una SATD queda **gestionada** cuando su comentario referencia un ID del ledger, p. ej. `// TODO(TD-004): ...`. `scripts/satd-scan.sh --gate` falla si encuentra marcadores sin `TD-xxx`.

## Inventario inicial

Fuente: `docs/baseline/as-is/satd.csv` · Total: `<n>` · En alcance intervenido: `<n>`

## Ledger (plantilla Anexo B)

| ID | Tipo | Evidencia / ubicación | Decisión | Rationale | Owner | Fecha límite | Verificación | Estado |
|---|---|---|---|---|---|---|---|---|
| TD-001 | Design | | Refactor / Accept / Remove | | | | | Abierta |
| TD-002 | Defect | | | | | | | |
| TD-003 | Test | | | | | | | |

Tipos: Design · Defect · Documentation · Requirement · Test.

## Estado final

| | AS-IS | TO-BE |
|---|---|---|
| SATD total (alcance) | | |
| Corregidas | — | |
| Aceptadas y registradas | — | |
| No gestionadas | | 0 |
