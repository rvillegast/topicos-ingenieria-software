# ci/

Reglas de arquitectura y configuración del quality gate. Se completa cuando se conozca el stack de FlowNow.

| FF | Regla | Opciones según stack | Archivo |
|---|---|---|---|
| FF1 | Sin ciclos entre módulos | JS/TS: dependency-cruiser · Java: ArchUnit/jQAssistant · Python: import-linter · .NET: NetArchTest | |
| FF2 | Tipos del proveedor no salen del adapter | ArchUnit · dependency-cruiser · Semgrep | |
| FF3 | Sólo el owner escribe sus tablas | Semgrep · ArchUnit | |
| FF4 | Sin SATD no gestionada | `scripts/satd-scan.sh --gate` | ✅ |
| FF5 | Sin URLs/secretos hard-coded | Semgrep · gitleaks | |

Pipeline: `Static Analysis → Architecture Rules → SATD Gate → Tests → Quality Gate`. Cualquier fallo bloquea el merge.
