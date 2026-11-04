#!/usr/bin/env bash
# Demuestra, sobre una COPIA del código real, que cada fitness function FALLA ante su violación (E4, §12) y
# que la copia limpia pasa. No toca el repo. Uso: ci/prove-rules-fail.sh   (desde cualquier lugar)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
bad=0

fresh() { rm -rf "$WORK/flownow"; mkdir -p "$WORK/flownow"; cp -R "$ROOT/flownow/src" "$WORK/flownow/src"; }
inject() { printf '%s\n' "$2" > "$WORK/flownow/src/$1"; }   # inject <ruta relativa a src> <contenido>

# expect <fail|pass> <nombre> <comando...>
expect() {
  local want="$1" name="$2"; shift 2
  "$@" >"$WORK/out.txt" 2>&1; local rc=$?
  if [[ $want == fail && $rc -ne 0 ]] || [[ $want == pass && $rc -eq 0 ]]; then
    printf '  ✔ %-52s %s (rc=%s)\n' "$name" "$([[ $want == fail ]] && echo 'FALLA como se esperaba' || echo 'pasa')" "$rc"
  else
    printf '  ✘ %-52s esperado=%s rc=%s\n' "$name" "$want" "$rc"; sed 's/^/      /' "$WORK/out.txt" | tail -5; bad=1
  fi
}

cd "$ROOT"
S="$WORK/flownow/src"
RULES=(
  "FF1|ciclo nuevo|services/ciclo-a.js|module.exports = require('./ciclo-b');|node ci/rules/arch.js $S"
  "FF2|SDK del proveedor fuera de su adapter|services/usa-sdk.js|const sdk = require('../vendor/stripey-sdk'); module.exports = sdk;|node ci/rules/arch.js $S"
  "FF6|import a un interno de otro módulo|services/usa-interno.js|module.exports = require('../modules/payment/service');|node ci/rules/arch.js $S"
  "FF3|tabla de Payment leída por un ajeno|services/lee-pagos.js|const db = require('../db'); module.exports = () => db.prepare('SELECT * FROM payment_payments').all();|node ci/rules/table-ownership.js $S"
  "FF3|tabla sin owner declarado|services/tabla-nueva.js|const db = require('../db'); db.exec('CREATE TABLE IF NOT EXISTS huerfana (id INTEGER)');|node ci/rules/table-ownership.js $S"
  "FF2b|nombre de proveedor en archivo nuevo|services/menciona-proveedor.js|module.exports = 'cobrar con stripey';|node ci/rules/provider-names.js $S"
  "FF4|TODO sin ticket del ledger|services/deuda-oculta.js|// TODO: arreglar esto despues|scripts/satd-scan.sh --gate $S"
  "FF4|marcador que cita un TD inexistente|services/td-fantasma.js|// TODO(TD-999): no existe en el ledger|node ci/rules/ledger-consistency.js docs/E5-debt-ledger.md $S"
  "FF5|URL hard-coded|services/url-fija.js|module.exports = 'https://api.ejemplo.com/v1/x';|node ci/rules/no-hardcoded.js $S"
  "FF5|clave sk_live en el código|services/clave.js|module.exports = 'sk_live_abc123';|node ci/rules/no-hardcoded.js $S"
)

echo "== Copia limpia (debe pasar cada regla)"
fresh
expect pass "FF1/FF2/FF6 dependency-cruiser"      node ci/rules/arch.js "$S"
expect pass "FF3 ownership"                       node ci/rules/table-ownership.js "$S"
expect pass "FF2b nombres de proveedor"           node ci/rules/provider-names.js "$S"
expect pass "FF4 SATD gate"                       scripts/satd-scan.sh --gate "$S"
expect pass "FF5 hard-coded"                      node ci/rules/no-hardcoded.js "$S"

echo; echo "== Una violación por vez (cada regla debe FALLAR)"
for spec in "${RULES[@]}"; do
  IFS='|' read -r ff name file content cmd <<<"$spec"
  fresh
  inject "$file" "$content"
  [[ $ff == FF1 ]] && inject services/ciclo-b.js "module.exports = require('./ciclo-a');"
  # shellcheck disable=SC2086
  expect fail "$ff · $name" $cmd
done

echo
if [[ $bad -eq 0 ]]; then echo "OK: todas las reglas pasan en limpio y fallan ante su violación"; else echo "FALLA: alguna regla no se comporta como se esperaba"; fi
exit $bad
