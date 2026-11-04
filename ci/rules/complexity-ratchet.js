#!/usr/bin/env node
// FF8: la complejidad ciclomática no aumenta (§8). lizard 1.24.3.
// Uso: node ci/rules/complexity-ratchet.js <ruta-src> [--ratchets archivo] [--csv archivo-de-lizard]
// - Alcance intervenido (modules/ y platform/): toda función debe tener CCN <= 10, sin excepciones.
// - Resto (legado): una función con CCN > 10 debe figurar en ratchets.ccnLegacy ("archivo::función": CCN máximo).
//   No puede subir; si baja o deja de superar 10, hay que fijar el avance (bajar o quitar la entrada).
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const LIMIT = 10;
const STRICT = [/^modules\//, /^platform\//];
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const src = args[0];
const ratchetsFile = opt('--ratchets', path.join(__dirname, '../ratchets.json'));

function lizardBin() {
  const local = path.join(__dirname, '../../.venv/bin/lizard');
  return fs.existsSync(local) ? local : 'lizard';
}
function loadCsv() {
  const f = opt('--csv');
  if (f) return fs.readFileSync(f, 'utf8');
  const r = spawnSync(lizardBin(), [src, '--csv', '--exclude', '*/vendor/*'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || !r.stdout) { console.error('FF8: no se pudo ejecutar lizard (pip install lizard==1.24.3)', r.error || r.stderr); process.exit(2); }
  return r.stdout;
}
// Columnas de lizard: NLOC,CCN,token,PARAM,length,"location","file","function","long_name",start,end
function parse(csv) {
  return csv.split('\n').filter(Boolean).map((l) => {
    const m = l.match(/^(\d+),(\d+),\d+,\d+,\d+,"[^"]*","([^"]*)","([^"]*)"/);
    if (!m) return null;
    const rel = path.relative(path.resolve(src), path.resolve(m[3])).split(path.sep).join('/');
    return { file: rel, fn: m[4], ccn: +m[2] };
  }).filter(Boolean);
}

function evaluate(funcs, ratchets) {
  const legacy = ratchets.ccnLegacy || {};
  const problems = []; const seen = new Set();
  for (const { file, fn, ccn } of funcs) {
    if (ccn <= LIMIT) continue;
    const key = `${file}::${fn}`; seen.add(key);
    if (STRICT.some((re) => re.test(file))) { problems.push(`${key}: CCN ${ccn} > ${LIMIT} en alcance intervenido (sin excepciones)`); continue; }
    if (!(key in legacy)) problems.push(`${key}: CCN ${ccn} > ${LIMIT} y no está en el ratchet (función nueva o empeoró)`);
    else if (ccn > legacy[key]) problems.push(`${key}: CCN ${ccn} > ratchet ${legacy[key]} (no puede subir)`);
    else if (ccn < legacy[key]) problems.push(`${key}: mejoró (CCN ${ccn} < ratchet ${legacy[key]}): actualizar ccnLegacy`);
  }
  for (const key of Object.keys(legacy)) if (!seen.has(key)) problems.push(`${key}: ya no supera ${LIMIT} (o no existe): quitar de ccnLegacy para fijar el avance`);
  return problems;
}

module.exports = { parse, evaluate };
if (require.main === module) {
  if (!src) { console.error('uso: complexity-ratchet.js <ruta-src> [--ratchets archivo] [--csv archivo]'); process.exit(2); }
  const ratchets = fs.existsSync(ratchetsFile) ? JSON.parse(fs.readFileSync(ratchetsFile, 'utf8')) : {};
  const funcs = parse(loadCsv());
  const problems = evaluate(funcs, ratchets);
  const over = funcs.filter((f) => f.ccn > LIMIT).length;
  console.log(`FF8 complejidad: ${funcs.length} funciones, ${over} con CCN > ${LIMIT} (ratchet ${Object.keys(ratchets.ccnLegacy || {}).length}), máx. ${Math.max(0, ...funcs.map((f) => f.ccn))}`);
  problems.forEach((p) => console.error('  ✘ ' + p));
  console.log(`FF8 complejidad: ${problems.length} problemas`);
  process.exit(problems.length ? 1 : 0);
}
