#!/usr/bin/env node
// FF7: las pruebas críticas siguen existiendo, pasan y cubren lo que deben (§11).
// Uso: node ci/rules/coverage-threshold.js [--lcov archivo --tests N]   (sin args ejecuta `npm test` con cobertura en flownow/)
// - Cobertura de líneas por alcance >= umbral de ci/coverage-thresholds.json.
// - Cantidad de pruebas >= ratchets.minTests (borrar pruebas para "mejorar" el resultado es una violación).
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const thresholds = JSON.parse(fs.readFileSync(path.join(__dirname, '../coverage-thresholds.json'), 'utf8')).lineas;
const ratchets = JSON.parse(fs.readFileSync(path.join(__dirname, '../ratchets.json'), 'utf8'));

// lcov: SF:<ruta>\nLF:<líneas>\nLH:<cubiertas>\n
function parseLcov(text, root) {
  const files = []; let cur = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) { const sf = line.slice(3); cur = { file: path.relative(root, path.isAbsolute(sf) ? sf : path.resolve(root, '..', sf)).split(path.sep).join('/'), lf: 0, lh: 0 }; }
    else if (line.startsWith('LF:') && cur) cur.lf = +line.slice(3);
    else if (line.startsWith('LH:') && cur) cur.lh = +line.slice(3);
    else if (line === 'end_of_record' && cur) { files.push(cur); cur = null; }
  }
  return files;
}
function evaluate(files, tests, thr, minTests) {
  const problems = []; const report = [];
  for (const [scope, min] of Object.entries(thr)) {
    const sel = files.filter((f) => f.file.startsWith(scope));
    const lf = sel.reduce((a, f) => a + f.lf, 0), lh = sel.reduce((a, f) => a + f.lh, 0);
    const pct = lf ? (100 * lh) / lf : 0;
    report.push(`${scope}: ${pct.toFixed(1)} % líneas (${sel.length} archivos, mínimo ${min} %)`);
    if (!sel.length) problems.push(`${scope}: sin archivos medidos`);
    else if (pct < min) problems.push(`${scope}: cobertura ${pct.toFixed(1)} % < ${min} %`);
  }
  report.push(`pruebas: ${tests} (mínimo ${minTests})`);
  if (tests < minTests) problems.push(`pruebas ${tests} < ${minTests} (se eliminaron pruebas)`);
  return { problems, report };
}
module.exports = { parseLcov, evaluate };

if (require.main === module) {
  let lcov, tests;
  if (opt('--lcov')) { lcov = fs.readFileSync(opt('--lcov'), 'utf8'); tests = +opt('--tests'); }
  else {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cov-')), 'lcov.info');
    const r = spawnSync('node', ['--test', '--no-warnings', '--experimental-test-coverage', '--test-reporter=spec', '--test-reporter-destination=stdout',
      '--test-reporter=lcov', `--test-reporter-destination=${out}`, 'test/**/*.test.js'], { cwd: path.join(__dirname, '../../flownow'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) { console.error('FF7: las pruebas fallan\n' + (r.stdout || '').split('\n').slice(-25).join('\n')); process.exit(1); }
    tests = +(r.stdout.match(/ℹ tests (\d+)/) || [])[1];
    lcov = fs.readFileSync(out, 'utf8');
  }
  const root = path.join(__dirname, '../../flownow/src');
  const { problems, report } = evaluate(parseLcov(lcov, root).filter((f) => !f.file.startsWith('..')), tests, thresholds, ratchets.minTests || 0);
  report.forEach((l) => console.log('  ' + l));
  problems.forEach((p) => console.error('  ✘ ' + p));
  console.log(`FF7 cobertura y pruebas críticas: ${problems.length} problemas`);
  process.exit(problems.length ? 1 : 0);
}
