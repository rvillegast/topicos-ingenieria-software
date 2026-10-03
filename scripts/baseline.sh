#!/usr/bin/env bash
# Línea base reproducible (§15 paso 1). Misma ejecución para AS-IS y TO-BE.
# Uso: scripts/baseline.sh <ruta-codigo> <dir-salida>
#   p. ej. scripts/baseline.sh flownow docs/baseline/as-is
set -euo pipefail

src=${1:?ruta del código}; out=${2:?directorio de salida}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
case "$(realpath "$out")/" in "$(realpath "$src")"/*)
  echo "error: <dir-salida> no puede estar dentro de <ruta-codigo> (se mediría a sí misma)" >&2; exit 2;;
esac

{
  echo "fecha: $(date -Iseconds)"
  echo "commit: $(git -C "$src" rev-parse HEAD 2>/dev/null || echo 'sin git')"
} > "$out/meta.txt"

# 1. Estructura y tamaño
find "$src" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | sort > "$out/archivos.txt"
find "$src" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -print0 \
  | xargs -0 wc -l 2>/dev/null | sort -rn | head -50 > "$out/archivos-mas-grandes.txt"

# 2. SATD
"$here/satd-scan.sh" "$src" > "$out/satd.csv" 2> "$out/satd-resumen.txt" || true

# 3. Hard-coded: URLs y posibles secretos
grep -rnIE 'https?://[^" '"'"']+' --exclude-dir=.git --exclude-dir=node_modules "$src" > "$out/urls.txt" || true
grep -rnIiE '(api[_-]?key|secret|password|token)[[:space:]]*[:=]' --exclude-dir=.git --exclude-dir=node_modules "$src" > "$out/posibles-secretos.txt" || true

# 4–7. Dependientes del stack: completar cuando se conozca FlowNow.
# 4. Grafo de dependencias y ciclos   -> $out/dependencias.*  (dependency-cruiser / jdeps / pydeps / ...)
# 5. Complejidad y duplicación        -> $out/complejidad.*   (lizard / sonar-scanner / jscpd / ...)
# 6. Acceso a tablas por componente   -> $out/acceso-datos.txt (grep de nombres de tablas / repositorios)
# 7. Pruebas y cobertura              -> $out/cobertura.*

echo "Línea base escrita en $out"
