# E4. Fitness Functions y Quality Gate

> §12, §17.4 · Mínimo 3 reglas automatizadas ejecutables en CI. Cada regla debe demostrarse **fallando** ante una violación intencional.

| # | Regla | Decisión que protege (ADR) | Herramienta | Archivo de regla | Demostración de fallo |
|---|---|---|---|---|---|
| FF1 | No existen ciclos entre módulos | ADR-004 | | `ci/` | |
| FF2 | Tipos del proveedor de pagos no salen del adapter | ADR-003 | | `ci/` | |
| FF3 | Sólo Payment escribe en sus tablas | ADR-001 | | `ci/` | |
| FF4 | Sin SATD no gestionada en código intervenido | ADR-005 | `scripts/satd-scan.sh --gate` | `scripts/` | |
| FF5 | Sin URLs/secretos de ambiente hard-coded | ADR-005 | | `ci/` | |

## Pipeline

```
Source Code → Static Analysis → Architecture Rules → SATD Gate → Tests → Quality Gate
```

Archivo del pipeline: `<.github/workflows/quality.yml | .gitlab-ci.yml | …>`

## Quality gate (Anexo E)

| Regla | Umbral | Resultado |
|---|---|---|
| Unmanaged SATD en código intervenido | 0 | |
| Ciclos entre módulos TO-BE | 0 | |
| Dependencias prohibidas | 0 | |
| Hard-coded de secretos/URLs de ambiente | 0 | |
| Fitness functions automatizadas | ≥3 | |
| ADRs | ≥5 | |
| Escenarios de cambio comparados | ≥4 | |
| Pruebas críticas | pasan antes y después | |
