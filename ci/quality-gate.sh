#!/usr/bin/env bash
# Quality gate del ejercicio (Anexo E). Sale con código != 0 si algún criterio no se cumple.
# Uso: ci/quality-gate.sh   (desde cualquier lugar). Las mediciones salen de las reglas ejecutadas, no de números escritos a mano.
set -uo pipefail
cd "$(dirname "$0")/.."
SRC=flownow/src
fail=0; rules_ok=0
row() { printf '| %-34s | %-8s | %-8s | %s |\n' "$1" "$2" "$3" "$4"; }
check() { # check <criterio> <meta> <valor> <ok:0|1>
  local mark='✔ cumple'; [[ $4 -ne 0 ]] && { mark='✘ FALLA'; fail=1; }
  row "$1" "$2" "$3" "$mark"
}
run() { "$@" >/dev/null 2>&1; }   # silencioso; el detalle se ve con ci/run-rules.sh

echo "# Quality gate (Anexo E)"; echo
row "Criterio" "Meta" "Medido" "Estado"; row "---" "---" "---" "---"

run scripts/satd-scan.sh --gate $SRC flownow/test;                       s=$?; [[ $s -eq 0 ]] && rules_ok=$((rules_ok+1))
unmanaged=$(scripts/satd-scan.sh $SRC flownow/test 2>/dev/null | awk -F, 'NR>1 && $4=="no"' | wc -l | tr -d ' ')
check "SATD no gestionada" "0" "$unmanaged" $s

run node ci/rules/ledger-consistency.js docs/E5-debt-ledger.md $SRC flownow/test; l=$?; [[ $l -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Marcadores coherentes con el Ledger" "ok" "$([[ $l -eq 0 ]] && echo ok || echo roto)" $l

run node ci/rules/arch.js $SRC;                                          a=$?; [[ $a -eq 0 ]] && rules_ok=$((rules_ok+1))
ratchet_cycles=$(node -p "require('./ci/ratchets.json').cycles")
check "Ciclos entre módulos" "0" "ratchet=$ratchet_cycles" $(( a != 0 || ratchet_cycles != 0 ))
check "Dependencias prohibidas (FF2/FF6)" "0" "$([[ $a -eq 0 ]] && echo 0 || echo '>0')" $a

run node ci/rules/no-hardcoded.js $SRC;                                  h=$?; [[ $h -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Secretos/URLs hard-coded" "0" "$([[ $h -eq 0 ]] && echo 0 || echo '>0')" $h

run node ci/rules/table-ownership.js $SRC;                               o=$?; [[ $o -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Ownership de tablas (FF3)" "ok" "$([[ $o -eq 0 ]] && echo ok || echo violado)" $o

run node ci/rules/provider-names.js $SRC;                                p=$?; [[ $p -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Proveedor sólo en adapters (FF2b)" "ok" "$([[ $p -eq 0 ]] && echo ok || echo violado)" $p

run node ci/rules/complexity-ratchet.js $SRC;                            c=$?; [[ $c -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Complejidad no aumenta (FF8)" "ok" "$([[ $c -eq 0 ]] && echo ok || echo sube)" $c

run node ci/rules/coverage-threshold.js;                                 v=$?; [[ $v -eq 0 ]] && rules_ok=$((rules_ok+1))
check "Cobertura crítica y pruebas (FF7)" "ok" "$([[ $v -eq 0 ]] && echo ok || echo baja)" $v

check "Fitness functions que pasan" ">=3" "$rules_ok" $(( rules_ok < 3 ))

adrs=$(ls docs/adr/ADR-[0-9]*.md 2>/dev/null | wc -l | tr -d ' ')
check "ADRs" ">=5" "$adrs" $(( adrs < 5 ))

esc=$(node -p "const j=require('./docs/escenarios/escenarios.json'); (Array.isArray(j)?j:j.escenarios||Object.values(j)).length")
check "Escenarios de cambio" ">=4" "$esc" $(( esc < 4 ))

(cd flownow && npm test >/dev/null 2>&1);                                t=$?
check "Pruebas de FlowNow (caracterización)" "pasan" "$([[ $t -eq 0 ]] && echo pasan || echo fallan)" $t
run node --test "ci/rules/*.test.js";                                    d=$?
check "Reglas demuestran su fallo" "pasan" "$([[ $d -eq 0 ]] && echo pasan || echo fallan)" $d

echo; [[ $fail -eq 0 ]] && echo "QUALITY GATE: APROBADO" || echo "QUALITY GATE: RECHAZADO"
exit $fail
