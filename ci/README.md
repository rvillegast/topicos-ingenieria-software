# ci/

Reglas de arquitectura y configuración del quality gate. Diseño completo en [`docs/E4-fitness-functions.md`](../docs/E4-fitness-functions.md).

| FF | Regla | Herramienta | Archivo | Estado |
|---|---|---|---|---|
| FF1 | Sin ciclos entre módulos | dependency-cruiser 18.7.0 vía `rules/arch.js` | `dependency-cruiser.cjs`, `ratchets.json` | ✅ con ratchet (6 → 0) |
| FF2 | Tipos/SDK del proveedor no salen del adapter | dependency-cruiser | `dependency-cruiser.cjs` | ✅ implementada |
| FF2b | Nombres de proveedor sólo en adapters | script portable con ratchet | `rules/provider-names.js`, `ratchets.json` | ✅ con ratchet (8 → 0) |
| FF3 | Sólo el owner lee/escribe sus tablas | script Node + `ownership.json` | `rules/table-ownership.js` | diseñada |
| FF4 | Sin SATD no gestionada | `scripts/satd-scan.sh --gate` + `rules/ledger-consistency.js` | `../scripts/`, `rules/ledger-consistency.js` | ✅ implementada |
| FF5 | Sin URLs/secretos hard-coded | script portable (+ gitleaks para el historial, pendiente) | `rules/no-hardcoded.js` | ✅ implementada |
| FF6 | Dependencias prohibidas / sólo vía `contract/` | dependency-cruiser | `dependency-cruiser.cjs` | diseñada |
| FF7 | Pruebas críticas y cobertura | `node:test` + `rules/coverage-threshold.js` | `rules/` | diseñada |
| FF8 | La complejidad no aumenta | lizard + ratchet | `lizard-ratchet.json` | diseñada |

Ejecutar localmente: `ci/run-rules.sh`. Demostración de fallo: `node --test "ci/rules/*.test.js"`.

Pipeline: `Static Analysis → Architecture Rules → SATD Gate → Tests → Quality Gate`. Cualquier fallo bloquea el merge. Cada regla debe demostrarse **fallando** (`prove-rules-fail.sh`).
