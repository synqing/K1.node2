
/**
 * @package @k1/deps
 * Simple dependency graph and impact radius analysis.
 */
export interface DepEdge { from: string; to: string; kind: "code"|"asset"|"config"; }
export interface DepGraph { nodes: string[]; edges: DepEdge[]; directed: true; }

function buildAdj(dg: DepGraph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of dg.nodes) adj.set(n, []);
  for (const e of dg.edges) {
    (adj.get(e.from)!).push(e.to);
  }
  return adj;
}

export function transitiveClosure(dg: DepGraph, start: string[]): Set<string> {
  const adj = buildAdj(dg);
  const seen = new Set<string>(start);
  const q: string[] = [...start];
  while (q.length) {
    const u = q.shift()!;
    for (const v of (adj.get(u) ?? [])) {
      if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
  }
  return seen;
}

export function impactRadius(dg: DepGraph, changed: string[]): string[] {
  const adj = buildAdj(dg);
  const dist = new Map<string, number>();
  const q: string[] = [];
  for (const c of changed) { dist.set(c, 0); q.push(c); }
  while (q.length) {
    const u = q.shift()!;
    const du = dist.get(u)!;
    for (const v of (adj.get(u) ?? [])) {
      if (!dist.has(v)) { dist.set(v, du + 1); q.push(v); }
    }
  }
  return Array.from(dist.entries())
    .sort((a,b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}

export function toDot(dg: DepGraph): string {
  const lines = ['digraph deps {'];
  for (const e of dg.edges) {
    lines.push(`  "${e.from}" -> "${e.to}" [label="${e.kind}"];`);
  }
  lines.push('}');
  return lines.join('\n');
}
