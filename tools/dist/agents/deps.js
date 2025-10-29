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
const depsIdx = args.indexOf('--deps');
const changedIdx = args.indexOf('--changed');
const outIdx = args.indexOf('--out');
if (depsIdx < 0 || outIdx < 0) {
    console.error('Usage: qa:deps --deps <deps.json> --changed <csv> --out <dir>');
    process.exit(2);
}
const depsPath = path_1.default.resolve(args[depsIdx + 1]);
const changedCsv = changedIdx >= 0 ? args[changedIdx + 1] : '';
const outDir = path_1.default.resolve(args[outIdx + 1]);
ensureDir(outDir);
const deps = readJson(depsPath) ?? { edges: [] };
const changed = new Set(changedCsv.split(',').map(s => s.trim()).filter(Boolean));
// Simple blast radius: BFS from changed nodes over dependency edges
const adj = new Map();
for (const [a, b] of deps.edges) {
    if (!adj.has(a))
        adj.set(a, []);
    adj.get(a).push(b);
}
const impacted = new Set();
const queue = Array.from(changed);
for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    impacted.add(u);
    for (const v of adj.get(u) ?? [])
        if (!impacted.has(v))
            queue.push(v);
}
writeJson(path_1.default.join(outDir, 'graph.impact.json'), {
    changed: Array.from(changed),
    impacted: Array.from(impacted),
    edges: deps.edges ?? []
});
// Emit a dot for quick visualization
const dot = ['digraph deps {'];
for (const [a, b] of deps.edges ?? [])
    dot.push(`  "${a}" -> "${b}";`);
dot.push('}');
fs_1.default.writeFileSync(path_1.default.join(outDir, 'deps.dot'), dot.join('\n'));
console.log('[qa:deps] graph.impact.json emitted');
