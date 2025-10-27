"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readJson(p) { try {
    return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
}
catch {
    return null;
} }
const args = process.argv.slice(2);
const artifactsDir = args[0] && !args[0].startsWith('--') ? path_1.default.resolve(args[0]) : path_1.default.resolve(process.cwd(), 'artifacts');
function fail(msg) { console.error(`[qa:gates] FAIL: ${msg}`); process.exit(1); }
function note(msg) { console.log(`[qa:gates] ${msg}`); }
const metrics = readJson(path_1.default.join(artifactsDir, 'graph.metrics.json'));
const estimate = readJson(path_1.default.join(artifactsDir, 'graph.estimate.json'));
const analysis = readJson(path_1.default.join(artifactsDir, 'graph.analysis.json'));
const validation = readJson(path_1.default.join(artifactsDir, 'graph.validation.json'));
const ast = readJson(path_1.default.join(artifactsDir, 'ast.findings.json'));
if (!metrics)
    note('graph.metrics.json missing (bench not run yet)');
if (!estimate)
    note('graph.estimate.json missing');
if (!analysis)
    note('graph.analysis.json missing');
if (!validation)
    note('graph.validation.json missing');
if (!ast)
    note('ast.findings.json missing');
// Cycles gate
if (analysis?.cycle?.detected === true)
    fail('Cycles detected');
// DAG flag gate (compile-time graphs expected DAG)
if (metrics && metrics.isDag === false)
    fail('Metrics isDag === false');
// Perf budget
if (estimate && (estimate.est?.ms ?? estimate.ms) > 8.0)
    fail('Predicted ms exceeds 8.0');
if (estimate && (estimate.est?.cpuPct ?? estimate.cpu_pct ?? estimate.cpuPct) > 80)
    fail('Predicted CPU exceeds 80%');
// Validation errors
if (validation && (validation.counts?.errors ?? 0) > 0)
    fail('Validation errors present');
// AST sentry raw mem access (no direct audio buffer reads)
if (ast && Array.isArray(ast.memAccess) && ast.memAccess.length > 0)
    fail('AST memAccess findings present');
console.log('[qa:gates] All gates passed');
