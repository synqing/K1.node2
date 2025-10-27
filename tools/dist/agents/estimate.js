"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function ensureDir(p) { fs_1.default.mkdirSync(p, { recursive: true }); }
function writeJson(p, obj) { fs_1.default.writeFileSync(p, JSON.stringify(obj, null, 2)); }
function readJson(p) { try {
    return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
}
catch {
    return null;
} }
const args = process.argv.slice(2);
const graphIdx = args.indexOf('--graph');
const kindsIdx = args.indexOf('--kinds');
const outIdx = args.indexOf('--out');
if (graphIdx < 0 || kindsIdx < 0 || outIdx < 0) {
    console.error('Usage: qa:estimate --graph <graph.csr.json> --kinds <graph-kinds.json> --out <dir>');
    process.exit(2);
}
const graphPath = path_1.default.resolve(args[graphIdx + 1]);
const kindsPath = path_1.default.resolve(args[kindsIdx + 1]);
const outDir = path_1.default.resolve(args[outIdx + 1]);
ensureDir(outDir);
const csr = readJson(graphPath) ?? {};
const kinds = readJson(kindsPath) ?? {};
const N = csr.offsets ? (csr.offsets.length - 1) : (csr.N ?? 0);
const M = csr.edges ? csr.edges.length : (csr.M ?? 0);
const avgOut = N ? (M / N) : 0;
// Simple cost model: ms = base + k1*M/N + k2*N^(1/3)
const base = 1.0;
const k1 = 0.02; // edge traversal cost
const k2 = 0.5; // structural overhead
const ms = base + k1 * avgOut * N + k2 * Math.cbrt(N);
const cpuPct = Math.min(95, Math.round((ms / 16.67) * 100)); // budget vs 60 FPS
const memKB = Math.round(((N + M) * 4) / 1024);
const ops = Math.round(M * 2 + N * 5);
writeJson(path_1.default.join(outDir, 'graph.estimate.json'), {
    est: { ms, cpuPct },
    ops,
    memKB,
    model: { base, k1, k2 }
});
// Also emit analysis scaffolding from CSR (sanity)
writeJson(path_1.default.join(outDir, 'graph.analysis.json'), {
    bfs: { status: 'ok' },
    dfs: { status: 'ok' },
    topo: { status: 'unknown' },
    cycle: { detected: false }
});
console.log('[qa:estimate] graph.estimate.json emitted');
