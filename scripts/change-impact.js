#!/usr/bin/env node
// Impacto de los escenarios de cambio (§15 paso 2): archivos y módulos que un cambio obliga a revisar.
// Uso: node scripts/change-impact.js <ruta-src> [escenarios.json]   Salida CSV: id,archivos,modulos,lista_modulos,lista_archivos
// Es una heurística por patrón (ver docs/escenarios/escenarios.json): estima el radio de cambio, no lo prueba.
// Misma ejecución para AS-IS y TO-BE. Módulo: `modules/<m>/` en TO-BE; en AS-IS se infiere del nombre del archivo.
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const defs = JSON.parse(fs.readFileSync(process.argv[3] || path.join(__dirname, '../docs/escenarios/escenarios.json'), 'utf8'));
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
  if (['node_modules', 'vendor', '.git'].includes(f.name)) continue;
  const p = path.join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(root);

const hints = [['auth', 'identity'], ['customer', 'customer'], ['request', 'request'], ['payment', 'payment'], ['gateway', 'payment'],
  ['stripey', 'payment'], ['notif', 'notification'], ['report', 'reporting'], ['integration', 'integration']];
const moduleOf = (f) => {
  const m = f.match(/modules\/([^/]+)\//); if (m) return m[1];
  const b = path.basename(f).toLowerCase();
  return (hints.find(([k]) => b.includes(k)) || [0, 'shared'])[1];
};
console.log('id,archivos,modulos,lista_modulos,lista_archivos');
for (const d of defs) {
  const re = new RegExp(d.patron, 'i');
  const hit = files.filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(process.cwd(), f)).sort();
  const mods = [...new Set(hit.map(moduleOf))].sort();
  console.log([d.id, hit.length, mods.length, `"${mods.join(' ')}"`, `"${hit.join(' ')}"`].join(','));
}
