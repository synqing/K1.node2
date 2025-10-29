import fs from 'fs';
import path from 'path';

function readJson(p: string): any | null { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

const args = process.argv.slice(2);
const artifactsDir = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : path.resolve(process.cwd(), 'artifacts');

function fail(msg: string) { console.error(`[qa:gates] FAIL: ${msg}`); finalize(false, [msg], notes); process.exit(1); }
function note(msg: string) { console.log(`[qa:gates] ${msg}`); }

const notes: string[] = [];
const failures: string[] = [];
const metrics = readJson(path.join(artifactsDir, 'graph.metrics.json'));
const estimate = readJson(path.join(artifactsDir, 'graph.estimate.json'));
const analysis = readJson(path.join(artifactsDir, 'graph.analysis.json'));
const validation = readJson(path.join(artifactsDir, 'graph.validation.json'));
const ast = readJson(path.join(artifactsDir, 'ast.findings.json'));

if (!metrics) notes.push('graph.metrics.json missing (bench not run yet)');
if (!estimate) notes.push('graph.estimate.json missing');
if (!analysis) notes.push('graph.analysis.json missing');
if (!validation) notes.push('graph.validation.json missing');
if (!ast) notes.push('ast.findings.json missing');

// Cycles gate
if (analysis?.cycle?.detected === true) fail('Cycles detected');
// DAG flag gate (compile-time graphs expected DAG)
if (metrics && metrics.isDag === false) fail('Metrics isDag === false');
// Perf budget (calibrated to 60 FPS target)
const msVal = estimate ? (estimate.est?.ms ?? estimate.ms) : null;
const cpuVal = estimate ? (estimate.est?.cpuPct ?? estimate.cpu_pct ?? estimate.cpuPct) : null;
if (msVal != null && msVal > 16.67) failures.push('Predicted ms exceeds 16.67');
if (cpuVal != null && cpuVal > 85) failures.push('Predicted CPU exceeds 85%');
// Validation errors
if (validation && (validation.counts?.errors ?? 0) > 0) failures.push('Validation errors present');
// AST sentry raw mem access (no direct audio buffer reads)
if (ast && Array.isArray(ast.memAccess) && ast.memAccess.length > 0) failures.push('AST memAccess findings present');

function finalize(passed: boolean, fails: string[], nts: string[]) {
  const outPath = path.join(artifactsDir, 'gates.status.json');
  const status = {
    passed,
    failures: fails,
    notes: nts,
    metrics: {
      ms: msVal ?? null,
      cpuPct: cpuVal ?? null,
      isDag: metrics?.isDag ?? null,
      cyclesDetected: analysis?.cycle?.detected ?? null,
      validationErrors: validation?.counts?.errors ?? null,
    }
  };
  try { require('fs').writeFileSync(outPath, JSON.stringify(status, null, 2)); } catch {}
}

if (failures.length > 0) {
  failures.forEach(f => note(`Gate failure: ${f}`));
  finalize(false, failures, notes);
  process.exit(1);
}

console.log('[qa:gates] All gates passed');
finalize(true, [], notes);