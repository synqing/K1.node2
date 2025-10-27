
/**
 * Agent: perf-oracle
 * Estimates runtime/resources using a simple cost model.
 * Usage: tsx agents/perf-oracle.ts [--graph path] [--kinds path] [--model path] [--out dir]
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { graphFromJSON } from '../packages/graph/src/index.js';
import { estimateRuntime, calibrate, type CostModel } from '../packages/estimator/src/index.js';
import { writeJSON, resolveInputPath } from './helpers.js';

async function main() {
  const args = new Map<string,string>();
  for (let i=2;i<process.argv.length;i+=2) args.set(process.argv[i], process.argv[i+1]);
  const graphPath = resolveInputPath(args.get('--graph'), 'graph.sample.json');
  const kindsPath = resolveInputPath(args.get('--kinds'), 'graph-kinds.sample.json');
  const modelPath = args.get('--model'); // optional
  const outDir = args.get('--out') ?? path.resolve(process.cwd(), 'artifacts');

  const g = graphFromJSON(JSON.parse(await fs.readFile(graphPath, 'utf8')));
  const kindsArr = JSON.parse(await fs.readFile(kindsPath, 'utf8'));
  const kinds = new Uint16Array(kindsArr);
  let model: CostModel;
  if (modelPath) model = JSON.parse(await fs.readFile(modelPath, 'utf8'));
  else {
    // derive naive model from kinds frequency (calibration placeholder)
    const samples = Array.from(kinds).map(k => ({nodeKind: String(k), us: 100 + (k % 5)*20 }));
    model = calibrate(samples);
  }
  const est = estimateRuntime(g, kinds, model);
  await writeJSON(path.join(outDir, 'graph.estimate.json'), { est, model });
}
main().catch(err => { console.error(err); process.exit(2); });
