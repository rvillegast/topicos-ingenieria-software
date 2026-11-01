#!/usr/bin/env node
// FF5: sin URLs, secretos ni valores de ambiente hard-coded (ADR-005).
// Uso: node ci/rules/no-hardcoded.js <ruta-src> [archivo-permitido ...]
// Por defecto sólo se permite `platform/config.js` (defaults de desarrollo). Sale con código 1 si hay violaciones.
// Equivalente portable a una regla Semgrep (§12 admite herramientas equivalentes); no requiere instalar nada.
const fs = require('fs'), path = require('path');

const RULES = [
  { id: 'url', re: /https?:\/\/[^\s'"`)]+/, msg: 'URL literal: debe venir de platform/config' },
  { id: 'secret-literal', re: /\b(sk|pk)_(live|test)_\w+|\w+_live_\w+/, msg: 'clave/secreto literal' },
  { id: 'secret-assign', re: /\b(secret|password|passwd|api_?key|token_?secret)\w*\s*[:=]\s*['"][^'"]{4,}['"]/i, msg: 'secreto asignado a un literal' },
  { id: 'fx-rate', re: /(?<![\w.])(950|1030)(?![\w.])/, msg: 'tipo de cambio literal: usar config.fx.rates' },
  { id: 'email-literal', re: /['"][\w.+-]+@[\w-]+\.[\w.]+['"]/, msg: 'correo literal: usar configuración' },
];

function scan(root, allow = ['platform/config.js']) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'vendor', '.git'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!p.endsWith('.js')) continue;
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (allow.some((a) => rel === a || rel.endsWith('/' + a))) continue;
      fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*\/\//.test(line)) return; // comentarios de línea completa
        for (const r of RULES) if (r.re.test(line)) out.push({ file: rel, line: i + 1, rule: r.id, msg: r.msg, text: line.trim().slice(0, 100) });
      });
    }
  })(root);
  return out;
}
module.exports = { scan };

if (require.main === module) {
  const root = process.argv[2]; if (!root) { console.error('uso: no-hardcoded.js <ruta-src> [permitido...]'); process.exit(2); }
  const v = scan(root, process.argv.length > 3 ? process.argv.slice(3) : undefined);
  for (const x of v) console.error(`${x.file}:${x.line} [${x.rule}] ${x.msg}\n    ${x.text}`);
  console.log(`FF5 hard-coded: ${v.length} violaciones`);
  process.exit(v.length ? 1 : 0);
}
