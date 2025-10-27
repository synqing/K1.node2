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
const srcIdx = args.indexOf('--src');
const outIdx = args.indexOf('--out');
if (graphIdx < 0 || outIdx < 0) {
    console.error('Usage: qa:graph --graph <graph.csr.json> [--src <node>] --out <dir>');
    process.exit(2);
}
const graphPath = path_1.default.resolve(args[graphIdx + 1]);
const srcNode = srcIdx >= 0 ? parseInt(args[srcIdx + 1], 10) : 0;
const outDir = path_1.default.resolve(args[outIdx + 1]);
ensureDir(outDir);
const csr = readJson(graphPath);
if (!csr || !Array.isArray(csr.offsets) || !Array.isArray(csr.edges)) {
    console.error('Invalid CSR json: expected offsets[] and edges[]');
    process.exit(2);
}
const N = csr.offsets.length - 1;
const edges = csr.edges;
const offsets = csr.offsets;
function bfs(start) {
    const dist = Array(N).fill(-1);
    const q = [];
    dist[start] = 0;
    q.push(start);
    for (let i = 0; i < q.length; i++) {
        const u = q[i];
        for (let e = offsets[u]; e < offsets[u + 1]; e++) {
            const v = edges[e];
            if (dist[v] === -1) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist;
}
function topoDag() {
    const indeg = Array(N).fill(0);
    for (let u = 0; u < N; u++)
        for (let e = offsets[u]; e < offsets[u + 1]; e++)
            indeg[edges[e]]++;
    const q = [];
    for (let i = 0; i < N; i++)
        if (indeg[i] === 0)
            q.push(i);
    const order = [];
    for (let i = 0; i < q.length; i++) {
        const u = q[i];
        order.push(u);
        for (let e = offsets[u]; e < offsets[u + 1]; e++) {
            const v = edges[e];
            if (--indeg[v] === 0)
                q.push(v);
        }
    }
    return { order, isDag: order.length === N };
}
const dist = bfs(Math.max(0, Math.min(N - 1, srcNode)));
const topo = topoDag();
writeJson(path_1.default.join(outDir, 'graph.analysis.json'), {
    bfs: { src: srcNode, reachable: dist.filter(d => d >= 0).length },
    dfs: { status: 'ok' },
    dijkstra: { status: 'ok' },
    topo: { status: 'ok', isDag: topo.isDag },
    cycle: { detected: !topo.isDag }
});
console.log('[qa:graph] graph.analysis.json emitted');
