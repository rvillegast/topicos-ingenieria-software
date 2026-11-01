#!/usr/bin/env bash
# Línea base reproducible (§15 paso 1). Misma ejecución para AS-IS y TO-BE.
# Uso: scripts/baseline.sh <ruta-codigo> <dir-salida>
#   p. ej. scripts/baseline.sh flownow docs/baseline/as-is
# Stack FlowNow: Node.js. Herramientas fijadas: dependency-cruiser 18.7.0, jscpd 5.4.2, lizard 1.24.3 (.venv).
# Se mide el código fuente en <ruta-codigo>/src; las pruebas en <ruta-codigo>/test.
set -euo pipefail

src=${1:?ruta del código}; out=${2:?directorio de salida}
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
mkdir -p "$out"
case "$(realpath "$out")/" in "$(realpath "$src")"/*)
  echo "error: <dir-salida> no puede estar dentro de <ruta-codigo> (se mediría a sí misma)" >&2; exit 2;;
esac
code="$src/src"
[[ -d "$code" ]] || { echo "error: no existe $code" >&2; exit 2; }

# Herramientas (lizard en un venv local, ignorado por git)
if [[ ! -x "$root/.venv/bin/lizard" ]]; then
  python3 -m venv "$root/.venv" && "$root/.venv/bin/pip" install -q lizard==1.24.3
fi

excl_dirs=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor)
excl_files=(--exclude=package-lock.json)

{
  echo "fecha: $(date -Iseconds)"
  echo "commit: $(git -C "$src" rev-parse HEAD 2>/dev/null || echo 'sin git')"
  echo "node: $(node -v)"
  echo "dependency-cruiser: 18.7.0 · jscpd: 5.4.2 · lizard: $("$root/.venv/bin/lizard" --version)"
} > "$out/meta.txt"

# 1. Estructura y tamaño (sin node_modules, vendor ni lockfile)
find "$code" -type f -not -path "*/vendor/*" | sort > "$out/archivos.txt"
find "$code" -type f -not -path "*/vendor/*" -print0 | xargs -0 wc -l | sort -rn | head -50 > "$out/archivos-mas-grandes.txt"

# 2. SATD (incluye pruebas: un TODO en test/ también es deuda autoadmitida)
"$here/satd-scan.sh" "$code" "$src/test" > "$out/satd.csv" 2> "$out/satd-resumen.txt" || true

# 3. Hard-coded: URLs y posibles secretos
grep -rnIE 'https?://[^" '"'"']+' "${excl_dirs[@]}" "${excl_files[@]}" "$code" > "$out/urls.txt" || true
grep -rnIiE '(api[_-]?key|secret|password|token|sk_live|_live_)[[:space:]]*[:=]|sk_live_|smsgo_live_' "${excl_dirs[@]}" "${excl_files[@]}" "$code" > "$out/posibles-secretos.txt" || true

# 4. Grafo de dependencias y ciclos (FF1 usa la misma configuración)
( cd "$root" && npx --yes dependency-cruiser@18.7.0 --config ci/dependency-cruiser.cjs --output-type json "$code" ) > "$out/dependencias.json" || true
( cd "$root" && npx --yes dependency-cruiser@18.7.0 --config ci/dependency-cruiser.cjs --output-type mermaid "$code" ) > "$out/dependencias.mmd" || true

# 5. Complejidad (lizard) y duplicación (jscpd; umbral bajo porque la duplicación del caso es lógica, no copia literal)
"$root/.venv/bin/lizard" "$code" --csv --exclude "*/vendor/*" > "$out/complejidad.csv" || true
npx --yes jscpd@5.4.2 "$code" --min-tokens 25 --min-lines 3 --ignore "**/vendor/**" --reporters json --output "$out/jscpd" --silent > /dev/null 2>&1 || true

# 6. Acceso a tablas por componente (ownership actual)
node "$here/data-access.js" "$code" > "$out/acceso-datos.csv"

# 7. Pruebas y cobertura
( cd "$src" && node --test --experimental-test-coverage --test-coverage-include="src/**/*.js" --test-coverage-exclude="src/vendor/**" --no-warnings "test/**/*.test.js" ) > "$out/cobertura.txt" 2>&1 || true

# 8. Referencias a proveedores externos (escenario: cambiar de proveedor)
{
  echo "proveedor,archivos,ocurrencias"
  for p in stripey hubcrm mailblast smsgo payfast acme-internal; do
    files=$(grep -rlIi "${excl_dirs[@]}" "${excl_files[@]}" -- "$p" "$code" | wc -l | tr -d ' ')
    occ=$(grep -rIio "${excl_dirs[@]}" "${excl_files[@]}" -- "$p" "$code" | wc -l | tr -d ' ')
    echo "$p,$files,$occ"
  done
} > "$out/proveedores.csv"
grep -rIioE "${excl_dirs[@]}" "${excl_files[@]}" -e 'stripey|hubcrm|mailblast|smsgo|payfast|acme-internal' "$code" | sort | uniq -c > "$out/proveedores-por-archivo.txt" || true

# 9. Impacto de los escenarios de cambio (docs/escenarios/escenarios.json)
node "$here/change-impact.js" "$code" > "$out/escenarios.csv"

# 10. FF5: valores fijos (misma regla que el pipeline)
node "$root/ci/rules/no-hardcoded.js" "$code" > "$out/ff5-hardcoded.txt" 2>&1 || true

# Resumen legible a partir de los datos crudos
node "$here/summarize.js" "$out" > "$out/resumen.md"

echo "Línea base escrita en $out"
