#!/usr/bin/env node
// Resume en Markdown los datos crudos de scripts/baseline.sh. No inventa nada: sólo agrega lo que hay en <dir>.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const csv = (f) => read(f).trim().split('\n').slice(1).filter(Boolean);
const short = (p) => p.replace(/^.*?\/src\//, '');
const out = [];
const h = (t) => out.push('\n## ' + t + '\n');

out.push('# Resumen de línea base (generado por `scripts/summarize.js`; no editar a mano)');
out.push('\n```\n' + read('meta.txt').trim() + '\n```');

// Tamaño
const files = read('archivos.txt').trim().split('\n');
const sizes = read('archivos-mas-grandes.txt').trim().split('\n').map((l) => l.trim().split(/\s+/));
h('Tamaño');
out.push(`- Archivos fuente: **${files.length}** · LOC totales: **${sizes.find((s) => s[1] === 'total')?.[0]}**`);

// Dependencias
const dc = JSON.parse(read('dependencias.json'));
const mods = dc.modules.filter((m) => !m.coreModule && !/node_modules/.test(m.source));
const edges = mods.reduce((n, m) => n + m.dependencies.filter((d) => !d.coreModule && !/node_modules/.test(d.resolved)).length, 0);
const cycles = new Map();
for (const v of dc.summary.violations.filter((v) => v.type === 'cycle')) {
  const ring = [v.from, ...v.cycle.map((c) => c.name)];
  const nodes = [...new Set(ring)].sort();
  cycles.set(nodes.join('|'), ring.map(short).join(' → '));
}
const inFan = {}, outFan = {};
for (const m of mods) for (const d of m.dependencies) { if (d.coreModule || /node_modules/.test(d.resolved)) continue; outFan[m.source] = (outFan[m.source] || 0) + 1; inFan[d.resolved] = (inFan[d.resolved] || 0) + 1; }
h('Dependencias (dependency-cruiser)');
out.push(`- Módulos (archivos): **${mods.length}** · aristas: **${edges}** · violaciones de ciclo reportadas: **${dc.summary.violations.filter((v) => v.type === 'cycle').length}**`);
out.push(`- Dependencias circulares: **${cycles.size}** ciclos distintos`);
for (const c of cycles.values()) out.push(`  - ${c}`);
const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${short(k)} (${v})`).join(', ');
out.push(`- Mayor fan-in: ${top(inFan)}`);
out.push(`- Mayor fan-out: ${top(outFan)}`);

// Complejidad
const fn = csv('complejidad.csv').map((l) => { const c = l.match(/^(\d+),(\d+),(\d+),(\d+),(\d+),"([^"]*)","([^"]*)","([^"]*)"/); return c && { nloc: +c[1], ccn: +c[2], file: c[7], name: c[8] }; }).filter(Boolean);
h('Complejidad (lizard)');
out.push(`- Funciones: **${fn.length}** · CCN > 10: **${fn.filter((f) => f.ccn > 10).length}** · NLOC > 50: **${fn.filter((f) => f.nloc > 50).length}** · CCN máx: **${Math.max(...fn.map((f) => f.ccn))}**`);
out.push('\n| Función | Archivo | NLOC | CCN |\n|---|---|---|---|');
for (const f of [...fn].sort((a, b) => b.ccn - a.ccn).slice(0, 8)) out.push(`| ${f.name} | ${short(f.file)} | ${f.nloc} | ${f.ccn} |`);
const loc = {}; for (const f of fn) loc[f.file] = (loc[f.file] || 0) + f.nloc;
out.push('\nNLOC por archivo (top 5): ' + Object.entries(loc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${short(k)} (${v})`).join(', '));

// Duplicación
const dup = JSON.parse(read('jscpd/jscpd-report.json')).statistics.total;
h('Duplicación (jscpd, mín. 25 tokens / 3 líneas)');
out.push(`- Clones: **${dup.clones}** · líneas duplicadas: **${dup.duplicatedLines}** de ${dup.lines} (**${dup.percentage.toFixed(2)} %**)`);

// Acceso a datos
const acc = csv('acceso-datos.csv').map((l) => l.split(','));
const byTable = {};
for (const [f, t, r, w] of acc) { (byTable[t] ||= { r: new Set(), w: new Set() }); if (+r) byTable[t].r.add(f); if (+w) byTable[t].w.add(f); }
h('Acceso a datos (ownership actual)');
out.push('| Tabla | Archivos que leen | Archivos que escriben |\n|---|---|---|');
for (const [t, v] of Object.entries(byTable)) out.push(`| ${t} | ${v.r.size} | ${v.w.size} |`);
out.push(`\n- Tablas con escritura desde más de un archivo: **${Object.values(byTable).filter((v) => v.w.size > 1).length}** de ${Object.keys(byTable).length}`);
out.push(`- Controllers con acceso directo a tablas: **${new Set(acc.filter((a) => /controllers\//.test(a[0])).map((a) => a[0])).size}**`);

// Hard-coded y SATD
const lines = (f) => read(f).trim().split('\n').filter(Boolean).length;
h('Valores hard-coded y SATD');
out.push(`- Líneas con URLs: **${lines('urls.txt')}** · líneas con posibles secretos: **${lines('posibles-secretos.txt')}**`);
out.push(`- ${read('satd-resumen.txt').trim()}`);
const satd = csv('satd.csv'); out.push(`- Marcadores SATD totales: **${satd.length}**`);

// Proveedores
h('Referencias a proveedores externos');
out.push('| Proveedor | Archivos | Ocurrencias |\n|---|---|---|');
for (const l of csv('proveedores.csv')) out.push('| ' + l.split(',').join(' | ') + ' |');

// Escenarios
h('Impacto de escenarios de cambio (heurística por patrón; ver docs/escenarios/)');
out.push('| Escenario | Archivos | Módulos (por nombre) | Módulos |\n|---|---|---|---|');
for (const l of csv('escenarios.csv')) { const m = l.match(/^(\w+),(\d+),(\d+),"([^"]*)"/); out.push(`| ${m[1]} | ${m[2]} | ${m[3]} | ${m[4]} |`); }

// Cobertura
const cov = read('cobertura.txt').split('\n').filter((l) => /\|/.test(l));
const all = cov.find((l) => /all files/.test(l));
h('Pruebas y cobertura (node:test)');
const t = read('cobertura.txt'); const g = (k) => (t.match(new RegExp(`ℹ ${k} (\\d+)`)) || [])[1];
out.push(`- Pruebas: **${g('tests')}** · pasan: **${g('pass')}** · fallan: **${g('fail')}**`);
if (all) out.push(`- Cobertura global (todos los archivos de src/): línea/rama/función = \`${all.replace(/^ℹ\s*all files\s*\|/, '').trim()}\``);
const covered = new Set(cov.map((l) => l.replace(/^ℹ\s*/, '').split('|')[0].trim()));
const unloaded = files.map((f) => path.basename(f)).filter((b) => !covered.has(b));
out.push(`- Archivos de src/ que ninguna prueba carga (no aparecen en el reporte, así que el global **sobreestima**): **${unloaded.length}** de ${files.length}`);
out.push('  - ' + unloaded.join(', '));
out.push('\n| Archivo | línea % | rama % | func % |\n|---|---|---|---|');
for (const l of cov) { const c = l.replace(/^ℹ\s*/, '').split('|').map((s) => s.trim()); if (/\.js$/.test(c[0]) && /(paymentService|requestService|requestController|paymentController|reportService|integrationService)/.test(c[0])) out.push(`| ${c[0]} | ${c[1]} | ${c[2]} | ${c[3]} |`); }
console.log(out.join('\n'));
