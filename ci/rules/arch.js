#!/usr/bin/env node
// FF1 y FF2 (y futuras FF6): reglas de dependencia con dependency-cruiser 18.7.0.
// Uso: node ci/rules/arch.js <ruta-src> [--ratchets ci/ratchets.json]   (ejecutar desde la raíz del repo o desde el cwd deseado)
// - Reglas con ratchet (no-circular): el número de ciclos distintos no puede SUBIR respecto a ratchets.cycles.
//   Si baja, el script lo avisa y falla hasta bajar el ratchet (así el avance queda fijado).
// - Cualquier otra regla: cero violaciones.
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const src = args[0];
const ri = args.indexOf('--ratchets');
const ratchetsFile = ri >= 0 ? args[ri + 1] : path.join(__dirname, '../ratchets.json');
const config = path.join(__dirname, '../dependency-cruiser.cjs');

function cruise(root) {
  const r = spawnSync('npx', ['--yes', 'dependency-cruiser@18.7.0', '--config', config, '--output-type', 'json', root], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (!r.stdout) { console.error(r.stderr); process.exit(2); }
  return JSON.parse(r.stdout);
}
function summarize(report) {
  const byRule = {}; const cycles = new Map();
  for (const v of report.summary.violations) {
    (byRule[v.rule.name] ||= []).push(v);
    if (v.type === 'cycle') {
      const ring = [v.from, ...v.cycle.map((c) => c.name)];
      cycles.set([...new Set(ring)].sort().join('|'), ring.join(' → '));
    }
  }
  return { byRule, cycles };
}

if (require.main === module) {
  if (!src) { console.error('uso: arch.js <ruta-src> [--ratchets archivo]'); process.exit(2); }
  const ratchets = fs.existsSync(ratchetsFile) ? JSON.parse(fs.readFileSync(ratchetsFile, 'utf8')) : { cycles: 0 };
  const { byRule, cycles } = summarize(cruise(src));
  let bad = 0;
  const nCycles = cycles.size;
  if (nCycles > ratchets.cycles) { bad++; console.error(`FF1: ${nCycles} ciclos > ratchet ${ratchets.cycles} (no puede subir)`); [...cycles.values()].forEach((c) => console.error('   ' + c)); }
  else if (nCycles < ratchets.cycles) { bad++; console.error(`FF1: mejoró (${nCycles} ciclos < ratchet ${ratchets.cycles}): bajar "cycles" en ci/ratchets.json para fijar el avance`); }
  else console.log(`FF1 ciclos: ${nCycles} (ratchet ${ratchets.cycles})`);
  for (const [name, list] of Object.entries(byRule)) {
    if (name === 'no-circular') continue;
    bad += list.length; list.forEach((v) => console.error(`${name}: ${v.from} → ${v.to}`));
  }
  const others = Object.entries(byRule).filter(([n]) => n !== 'no-circular').reduce((a, [, l]) => a + l.length, 0);
  console.log(`FF2/FF6 dependencias prohibidas: ${others} violaciones`);
  process.exit(bad ? 1 : 0);
}
module.exports = { cruise, summarize };
