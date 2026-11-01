#!/usr/bin/env node
// FF4 (parte 2): coherencia entre los comentarios SATD y el Debt Ledger (ADR-005).
// Uso: node ci/rules/ledger-consistency.js <E5-debt-ledger.md> <ruta-codigo> [<ruta-codigo> ...]
// Falla si: (a) el código cita un TD-xxx que no existe en el ledger; (b) una fila del ledger no tiene
// owner, fecha límite (AAAA-MM-DD) y verificación; (c) un TD "Cerrada" sigue citado en el código.
const fs = require('fs'), path = require('path');

function parseLedger(md) {
  const rows = [];
  for (const l of md.split('\n')) {
    const c = l.split('|').map((s) => s.trim());
    if (c.length >= 11 && /^TD-\d+$/.test(c[1])) rows.push({ id: c[1], decision: c[4], owner: c[6], due: c[7], verification: c[8], state: c[9] });
  }
  return rows;
}
function citedIds(roots) {
  const ids = new Map();
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'vendor', '.git'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.js')) fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (/\b(TODO|FIXME|HACK|TEMP|WORKAROUND|XXX)\b/.test(line)) for (const m of line.matchAll(/TD-\d+/g)) ids.set(m[0], `${p}:${i + 1}`);
    });
  } };
  roots.forEach(walk);
  return ids;
}
function check(ledgerMd, roots) {
  const problems = []; const rows = parseLedger(ledgerMd); const byId = new Map(rows.map((r) => [r.id, r]));
  for (const [id, where] of citedIds(roots)) {
    if (!byId.has(id)) problems.push(`${where}: cita ${id}, que no existe en el ledger`);
    else if (/^\**Cerrada/.test(byId.get(id).state)) problems.push(`${where}: cita ${id}, que el ledger marca como cerrada`);
  }
  for (const r of rows) {
    if (!r.owner) problems.push(`${r.id}: falta owner`);
    if (!/^\d{4}-\d{2}-\d{2}/.test(r.due)) problems.push(`${r.id}: falta fecha límite AAAA-MM-DD (tiene "${r.due}")`);
    if (!r.verification) problems.push(`${r.id}: falta verificación`);
  }
  return { problems, rows: rows.length };
}
module.exports = { check, parseLedger };

if (require.main === module) {
  const [ledger, ...roots] = process.argv.slice(2);
  if (!ledger || !roots.length) { console.error('uso: ledger-consistency.js <ledger.md> <ruta>...'); process.exit(2); }
  const { problems, rows } = check(fs.readFileSync(ledger, 'utf8'), roots);
  problems.forEach((p) => console.error(p));
  console.log(`FF4 ledger: ${rows} entradas, ${problems.length} problemas`);
  process.exit(problems.length ? 1 : 0);
}
