import fs from 'fs';
import path from 'path';

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p: string, obj: any) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }
function readJson(p: string): any | null { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

const args = process.argv.slice(2);
const depsIdx = args.indexOf('--deps');
const changedIdx = args.indexOf('--changed');
const outIdx = args.indexOf('--out');

if (depsIdx < 0 || outIdx < 0) {
  console.error('Usage: qa:deps --deps <deps.json> --changed <csv> --out <dir>');
  process.exit(2);
}

const depsPath = path.resolve(args[depsIdx + 1]);
const changedCsv = changedIdx >= 0 ? args[changedIdx + 1] : '';
const outDir = path.resolve(args[outIdx + 1]);
ensureDir(outDir);

const deps = readJson(depsPath) ?? { edges: [] };
const changed = new Set(changedCsv.split(',').map(s => s.trim()).filter(Boolean));

// Simple blast radius: BFS from changed nodes over dependency edges
const adj = new Map<string, string[]>();
for (const [a,b] of deps.edges as [string,string][]) {
  if (!adj.has(a)) adj.set(a, []);
  adj.get(a)!.push(b);
}
const impacted = new Set<string>();
const queue: string[] = Array.from(changed);
for (let i=0;i<queue.length;i++) {
  const u = queue[i];
  impacted.add(u);
  for (const v of adj.get(u) ?? []) if (!impacted.has(v)) queue.push(v);
}

writeJson(path.join(outDir, 'graph.impact.json'), {
  changed: Array.from(changed),
  impacted: Array.from(impacted),
  edges: deps.edges ?? []
});

// Emit a dot for quick visualization
const dot = ['digraph deps {'];
for (const [a,b] of deps.edges ?? []) dot.push(`  "${a}" -> "${b}";`);
dot.push('}');
fs.writeFileSync(path.join(outDir, 'deps.dot'), dot.join('\n'));

console.log('[qa:deps] graph.impact.json emitted');