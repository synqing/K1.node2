
/**
 * Agent: semantic-arbiter
 * Runs type/constraint checks and audio-access policy on a model graph + generated C++ text.
 * Usage: tsx agents/semantic-arbiter.ts [--model path] [--cpp path] [--out dir]
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { checkTypes, checkConstraints, enforceAudioAccess, type ModelGraph } from '../packages/validation/src/index.js';
import { readJSON, writeJSON, resolveInputPath } from './helpers.js';

async function main() {
  const args = new Map<string,string>();
  for (let i=2;i<process.argv.length;i+=2) args.set(process.argv[i], process.argv[i+1]);
  const modelPath = resolveInputPath(args.get('--model'), 'model.sample.json');
  const cppPath = resolveInputPath(args.get('--cpp'), 'generated.sample.cpp');
  const outDir = args.get('--out') ?? path.resolve(process.cwd(), 'artifacts');

  const model = await readJSON<ModelGraph>(modelPath);
  const cpp = await fs.readFile(cppPath, 'utf8');

  const violations = [
    ...checkTypes(model),
    ...checkConstraints(model),
    ...enforceAudioAccess(cpp)
  ];

  await writeJSON(path.join(outDir, 'graph.validation.json'), { violations });
  const hasError = violations.some(v => v.severity === 'error');
  if (hasError) process.exitCode = 2;
}
main().catch(err => { console.error(err); process.exit(2); });
