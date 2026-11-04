# ci/

Reglas de arquitectura y configuración del quality gate. Diseño completo en [`docs/E4-fitness-functions.md`](../docs/E4-fitness-functions.md).

| FF | Regla | Herramienta | Archivo | Estado |
|---|---|---|---|---|
| FF1 | Sin ciclos entre módulos | dependency-cruiser 18.7.0 vía `rules/arch.js` | `dependency-cruiser.cjs`, `ratchets.json` | ✅ bloqueante en 0 (paso 11) |
| FF2 | Tipos/SDK del proveedor no salen del adapter | dependency-cruiser | `dependency-cruiser.cjs` | ✅ implementada |
| FF2b | Nombres de proveedor sólo en adapters | script portable con ratchet | `rules/provider-names.js`, `ratchets.json` | ✅ con ratchet (10 → 5 archivos legados; meta 0) |
| FF3 | Sólo el owner lee/escribe sus tablas | script Node + `ownership.json` | `rules/table-ownership.js`, `ownership.json`, `ratchets.json` | ✅ implementada (`payment_payments` estricta; resto con ratchet) |
| FF4 | Sin SATD no gestionada | `scripts/satd-scan.sh --gate` + `rules/ledger-consistency.js` | `../scripts/`, `rules/ledger-consistency.js` | ✅ implementada |
| FF5 | Sin URLs/secretos hard-coded | script portable (+ gitleaks para el historial, pendiente) | `rules/no-hardcoded.js` | ✅ implementada |
| FF6 | Dependencias prohibidas / sólo vía `contract/` | dependency-cruiser vía `rules/arch.js` | `dependency-cruiser.cjs` | ✅ implementada (módulos y Payment) |
| FF7 | Pruebas críticas y cobertura | `node:test` + `rules/coverage-threshold.js` | `rules/` | diseñada |
| FF8 | La complejidad no aumenta | lizard + ratchet | `lizard-ratchet.json` | diseñada |

Ejecutar localmente: `ci/run-rules.sh` (reglas + pruebas). Quality gate del Anexo E: `ci/quality-gate.sh` (tabla de criterios, falla si alguno no se cumple). Demostración de fallo: `ci/prove-rules-fail.sh` (inyecta una violación por regla en una copia del código y exige que la regla falle; la copia limpia debe pasar) y `node --test "ci/rules/*.test.js"`.

Workflow: `.github/workflows/quality.yml` (static → architecture → satd → tests → quality-gate). `CODEOWNERS` exige al rol A en contratos, `ci/`, ADRs y ledger (hay que reemplazar el placeholder `@ROL-A-ARQUITECTURA`). Branch protection se configura en GitHub (checks requeridos: los 5 jobs).

Pipeline: `Static Analysis → Architecture Rules → SATD Gate → Tests → Quality Gate`. Cualquier fallo bloquea el merge. Cada regla debe demostrarse **fallando** (`prove-rules-fail.sh`).
