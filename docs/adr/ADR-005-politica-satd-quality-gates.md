# ADR-005: Política de SATD y quality gates

Status: Aceptado (2026-11-04). Implementado: FF4 (SATD + ledger), FF5, `ci/quality-gate.sh`, `ci/prove-rules-fail.sh`, workflow y CODEOWNERS.
Context: Hay 8 marcadores TODO/FIXME/HACK/TEMP/WORKAROUND sin ticket (7 en `src/`, 1 en `test/`) y valores hard-coded (claves, secretos de firma, URLs, tasas FX). Borrar comentarios ocultaría la deuda (§7); `SATDComments = 0` no es la meta, `UnmanagedSATD = 0` sí.
Architectural concern: deuda gestionada y restricciones que no dependan de la memoria del equipo ni del agente de IA (§12).
Decision: (1) Un marcador cuenta como gestionado sólo si referencia su entrada del Debt Ledger (`// TODO(TD-004): …`). (2) El ledger registra `Issue → Owner → Rationale → DueDate → Verification` (Anexo B). (3) `scripts/satd-scan.sh --gate` bloquea el merge ante SATD sin `TD-xxx` y una verificación adicional exige que cada `TD-xxx` citado exista en `docs/E5-debt-ledger.md`. (4) Los valores de ambiente y secretos no pueden estar en el código (FF5). (5) El **quality gate** (Anexo E) se evalúa en CI: SATD no gestionada 0, ciclos 0, dependencias prohibidas 0, hard-coded 0, FF ≥3, ADR ≥5, escenarios ≥4, pruebas críticas verdes antes y después. Un fallo bloquea el merge.
Alternatives considered: (a) borrar todos los comentarios (falta grave según §7). (b) gate sólo informativo: se ignora bajo presión. (c) umbral > 0 "tolerable": contradice el Anexo E.
Consequences: Todo hack nuevo exige ticket; el costo de dejar deuda es visible. Una deuda aceptada sin fecha o verificación rompe el gate.
Trade-offs: Fricción al escribir comentarios; se acepta porque es la finalidad de la regla.
Evidence / fitness function: FF4 (`satd-scan.sh --gate`), FF5, `ci/quality-gate.sh`; E5 estado final `UnmanagedSATD = 0` en el alcance intervenido.
Affected modules: todos (política transversal).
Verificación (TO-BE medido): SATD no gestionada 8 → 0; quality gate del Anexo E APROBADO (`docs/baseline/to-be/quality-gate.md`); 15 casos de fallo demostrados. Limitaciones: el workflow de GitHub Actions aún no se ha ejecutado, la branch protection no está configurada y gitleaks sobre el historial está pendiente (TD-006).
Date: 2026-11-01 (aceptado 2026-11-04)
