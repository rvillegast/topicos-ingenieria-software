#!/usr/bin/env node
// Mapa de acceso a datos (§6): qué archivo lee/escribe cada tabla. Salida CSV: file,table,reads,writes.
// Las tablas se descubren desde los CREATE TABLE del código; las operaciones se infieren por SQL.
const fs = require('fs'), path = require('path');
function accessMap(root) {
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === 'vendor') continue;
    const p = path.join(d, f.name); f.isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(root);
  const text = Object.fromEntries(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const tables = new Set();
  for (const t of Object.values(text)) for (const m of t.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)) tables.add(m[1]);
  const rows = [];
  for (const f of files.sort()) {
    const t = text[f];
    if (/CREATE TABLE/i.test(t)) continue; // los archivos de esquema no cuentan como acceso
    for (const tb of [...tables].sort()) {
      const w = (t.match(new RegExp(`(INSERT INTO|UPDATE|DELETE FROM)\\s+${tb}\\b`, 'gi')) || []).length;
      const all = (t.match(new RegExp(`(FROM|JOIN)\\s+${tb}\\b`, 'gi')) || []).length;
      const delFrom = (t.match(new RegExp(`DELETE FROM\\s+${tb}\\b`, 'gi')) || []).length;
      const r = all - delFrom;
      if (r || w) rows.push({ file: f, table: tb, reads: r, writes: w });
    }
  }
  return { tables: [...tables].sort(), rows };
}
module.exports = { accessMap };

if (require.main === module) {
  const root = process.argv[2];
  console.log('file,table,reads,writes');
  for (const x of accessMap(root).rows) console.log(`${path.relative(process.cwd(), x.file)},${x.table},${x.reads},${x.writes}`);
}
