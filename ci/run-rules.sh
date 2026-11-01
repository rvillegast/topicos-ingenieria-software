#!/usr/bin/env bash
# Ejecuta localmente las fitness functions disponibles (misma lista que el pipeline de CI).
# Uso: ci/run-rules.sh   (desde la raíz del repo)
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { printf '\n== %s\n' "$1"; shift; "$@" || fail=1; }
step "FF4 · SATD gate (sin marcador sin TD-xxx)"   scripts/satd-scan.sh --gate flownow/src flownow/test
step "FF4 · coherencia con el Debt Ledger"          node ci/rules/ledger-consistency.js docs/E5-debt-ledger.md flownow/src flownow/test
step "FF5 · sin URLs/secretos/valores fijos"        node ci/rules/no-hardcoded.js flownow/src
step "Reglas: demostración de fallo"                node --test "ci/rules/*.test.js"
step "Pruebas de FlowNow (caracterización)"         bash -c 'cd flownow && npm test'
echo; [[ $fail -eq 0 ]] && echo "OK: todas las reglas pasan" || echo "FALLA: alguna regla no pasa"
exit $fail
