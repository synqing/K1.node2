
/**
 * Agent: graph-theorist
 * Computes BFS/DFS/Dijkstra/topo/cycle on a CSR graph JSON.
 * Usage: tsx agents/graph-theorist.ts [--graph path] [--src N] [--out dir]
 */
import * as path from 'path';
import { graphFromJSON, bfs, dfs, dijkstra, topoSort, hasCycle } from '../packages/graph/src/index.js';
import { writeJSON, resolveInputPath } from './helpers.js';
import * as fs from 'fs/promises';

async function main() {
  const args = new Map<string,string>();
  for (let i=2;i<process.argv.length;i+=2) {
    args.set(process.argv[i], process.argv[i+1]);
  }
  const graphPath = resolveInputPath(args.get('--graph'), 'graph.sample.json');
  const srcStr = args.get('--src') ?? '0';
  const outDir = args.get('--out') ?? path.resolve(process.cwd(), 'artifacts');
  const src = parseInt(srcStr, 10) || 0;

  const raw = JSON.parse(await fs.readFile(graphPath, 'utf8'));
  const g = graphFromJSON(raw);

  const metrics: any = {};
  metrics.N = g.offsets.length - 1;
  metrics.M = g.edges.length;
  metrics.directed = g.directed;

  metrics.bfs = Array.from(bfs(g, src));
  metrics.dfs = Array.from(dfs(g, src));
  metrics.dijkstra = Array.from(dijkstra(g, src));
  try {
    metrics.topo = Array.from(topoSort(g));
    metrics.cycle = false;
  } catch {
    metrics.topo = null;
    metrics.cycle = true;
  }
  await writeJSON(path.join(outDir, 'graph.metrics.json'), metrics);
  if (metrics.cycle) {
    // Emit a simple DOT file when cycle detected (edges only for now)
    const lines = ['digraph G {'];
    for (let u=0; u<metrics.N; u++) {
      for (let i=g.offsets[u]; i<g.offsets[u+1]; i++) {
        const v = g.edges[i];
        lines.push(`  ${u} -> ${v};`);
      }
    }
    lines.push('}');
    await fs.writeFile(path.join(outDir, 'graph.cycles.dot'), lines.join('\n'), 'utf8');
    process.exitCode = 1; // non-fatal; pipeline continues
  }
}
main().catch(err => { console.error(err); process.exit(2); });
