#!/usr/bin/env node
// FF2b: los nombres de proveedores externos sólo pueden aparecer en su adapter, la configuración y el
// presentador de compatibilidad (ADR-003, TD-010). Ratchet: los archivos "legados" que aún los nombran están
// listados en ci/ratchets.json (providerNameLegacy) y esa lista sólo puede ENCOGER.
// Uso: node ci/rules/provider-names.js <ruta-src> [--ratchets archivo]
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const root = args[0];
const ri = args.indexOf('--ratchets');
const ratchetsFile = ri >= 0 ? args[ri + 1] : path.join(__dirname, '../ratchets.json');
const ALLOWED = [/(^|\/)adapters\//, /(^|\/)payment\/providers\/index\.js$/, /(^|\/)platform\/config\.js$/, /(^|\/)payment\/http\/legacy-presenter\.js$/];

function scan(src, patterns) {
  const re = new RegExp(patterns.join('|'), 'i'); const found = new Set();
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'vendor', '.git'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.js')) continue;
    const rel = path.relative(src, p).split(path.sep).join('/');
    if (ALLOWED.some((a) => a.test(rel))) continue;
    if (re.test(fs.readFileSync(p, 'utf8'))) found.add(rel);
  } })(src);
  return [...found].sort();
}
module.exports = { scan };

if (require.main === module) {
  if (!root) { console.error('uso: provider-names.js <ruta-src> [--ratchets archivo]'); process.exit(2); }
  const r = JSON.parse(fs.readFileSync(ratchetsFile, 'utf8'));
  const found = scan(root, r.providerNamePatterns);
  const legacy = new Set(r.providerNameLegacy);
  const added = found.filter((f) => !legacy.has(f));
  const stale = [...legacy].filter((f) => !found.includes(f));
  added.forEach((f) => console.error(`${f}: nombra un proveedor fuera de su adapter y no está en el ratchet`));
  stale.forEach((f) => console.error(`${f}: ya no nombra proveedores: quitarlo de providerNameLegacy en ci/ratchets.json`));
  console.log(`FF2b nombres de proveedor: ${found.length} archivos legados (ratchet ${legacy.size}), ${added.length} nuevos`);
  process.exit(added.length || stale.length ? 1 : 0);
}
