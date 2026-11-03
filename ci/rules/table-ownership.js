#!/usr/bin/env node
// FF3: sólo el owner lee/escribe sus tablas (ADR-001, ADR-002).
// Uso: node ci/rules/table-ownership.js <ruta-src> [--ownership archivo] [--ratchets archivo]
// - Tabla `enforced`: cualquier archivo fuera de los paths del owner que la mencione en SQL es una violación.
// - Tabla aún no migrada: la cantidad de archivos ajenos que la tocan tiene ratchet (no puede subir; si baja, hay que fijarlo).
// - Una tabla creada en el código y no declarada en ownership.json no tiene owner: violación.
const fs = require('fs'), path = require('path');
const { accessMap } = require('../../scripts/data-access.js');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const src = args[0];

function evaluate(root, ownership, ratchets) {
  const { tables, rows } = accessMap(root);
  const problems = []; const report = [];
  for (const t of tables) if (!ownership.tables[t]) problems.push(`${t}: tabla sin owner declarado en ownership.json`);
  for (const [table, def] of Object.entries(ownership.tables)) {
    const foreign = [...new Set(rows.filter((r) => r.table === table).map((r) => path.relative(root, r.file).split(path.sep).join('/'))
      .filter((f) => !def.paths.some((p) => f === p || f.startsWith(p))))].sort();
    if (def.enforced) {
      foreign.forEach((f) => problems.push(`${table}: accedida por ${f}, fuera de ${def.owner} (${def.paths.join(', ')})`));
      report.push(`${table}: ${foreign.length} accesos ajenos (enforced)`);
    } else {
      const max = (ratchets.tableForeignFiles || {})[table];
      if (max === undefined) problems.push(`${table}: falta ratchet en ratchets.json (tableForeignFiles)`);
      else if (foreign.length > max) problems.push(`${table}: ${foreign.length} archivos ajenos > ratchet ${max} (no puede subir): ${foreign.join(', ')}`);
      else if (foreign.length < max) problems.push(`${table}: mejoró (${foreign.length} < ratchet ${max}): bajar tableForeignFiles.${table} en ratchets.json`);
      report.push(`${table}: ${foreign.length} archivos ajenos (ratchet ${max})`);
    }
  }
  return { problems, report };
}
module.exports = { evaluate };

if (require.main === module) {
  if (!src) { console.error('uso: table-ownership.js <ruta-src> [--ownership f] [--ratchets f]'); process.exit(2); }
  const ownership = JSON.parse(fs.readFileSync(opt('--ownership', path.join(__dirname, '../ownership.json')), 'utf8'));
  const ratchets = JSON.parse(fs.readFileSync(opt('--ratchets', path.join(__dirname, '../ratchets.json')), 'utf8'));
  const { problems, report } = evaluate(src, ownership, ratchets);
  report.forEach((l) => console.log('  ' + l));
  problems.forEach((p) => console.error(p));
  console.log(`FF3 ownership de tablas: ${problems.length} problemas`);
  process.exit(problems.length ? 1 : 0);
}
