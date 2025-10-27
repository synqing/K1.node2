
/**
 * Agent: dep-cartographer
 * Builds dependency closure and impact radius. Exports DOT + JSON.
 * Usage: tsx agents/dep-cartographer.ts [--deps path] [--changed A,B,...] [--out dir]
 */
import * as path from 'path';
import { impactRadius, transitiveClosure, toDot, type DepGraph } from '../packages/deps/src/index.js';
import { readJSON, writeJSON, resolveInputPath } from './helpers.js';
import * as fs from 'fs/promises';

async function main() {
  const args = new Map<string,string>();
  for (let i=2;i<process.argv.length;i+=2) args.set(process.argv[i], process.argv[i+1]);
  const depsPath = resolveInputPath(args.get('--deps'), 'deps.sample.json');
  const changed = (args.get('--changed') ?? 'A').split(',').map(s => s.trim()).filter(Boolean);
  const outDir = args.get('--out') ?? path.resolve(process.cwd(), 'artifacts');

  const dg = await readJSON<DepGraph>(depsPath);
  const closure = Array.from(transitiveClosure(dg, changed).values());
  const impact = impactRadius(dg, changed);
  const dot = toDot(dg);

  await writeJSON(path.join(outDir, 'graph.impact.json'), { changed, closure, impact });
  await fs.writeFile(path.join(outDir, 'deps.dot'), dot, 'utf8');
}
main().catch(err => { console.error(err); process.exit(2); });
