#!/usr/bin/env bash
# Inventario de Self-Admitted Technical Debt (§7).
# Uso: scripts/satd-scan.sh [--gate] <ruta> [<ruta>...]
#   Salida: CSV en stdout -> file,line,tag,managed,ticket,text
#   --gate: además falla (exit 1) si hay SATD no gestionada (marcador sin TD-xxx). Para CI (FF4).
set -euo pipefail

gate=0
if [[ "${1:-}" == "--gate" ]]; then gate=1; shift; fi
[[ $# -ge 1 ]] || { echo "uso: $0 [--gate] <ruta>..." >&2; exit 2; }

tags='TODO|FIXME|HACK|TEMP|WORKAROUND|XXX'
excludes=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=dist
          --exclude-dir=build --exclude-dir=target --exclude-dir=.venv --exclude-dir=docs)

echo "file,line,tag,managed,ticket,text"
unmanaged=0
while IFS= read -r hit; do
  file=${hit%%:*}; rest=${hit#*:}; line=${rest%%:*}; text=${rest#*:}
  tag=$(grep -oE "\b($tags)\b" <<< "$text" | head -1)
  ticket=$(grep -oE 'TD-[0-9]+' <<< "$text" | head -1 || true)
  if [[ -n "$ticket" ]]; then managed=yes; else managed=no; unmanaged=$((unmanaged + 1)); fi
  text=$(sed -E 's/^[[:space:]]+//; s/"/""/g' <<< "$text")
  echo "\"$file\",$line,$tag,$managed,$ticket,\"$text\""
done < <(grep -rnIE "\b($tags)\b" "${excludes[@]}" "$@" || true)

echo "SATD no gestionada: $unmanaged" >&2
if (( gate && unmanaged > 0 )); then exit 1; fi
