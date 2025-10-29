import fs from 'fs';
import path from 'path';

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p: string, obj: any) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }
function readText(p: string): string { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const args = process.argv.slice(2);
const modelIdx = args.indexOf('--model');
const cppIdx = args.indexOf('--cpp');
const outIdx = args.indexOf('--out');

if (modelIdx < 0 || cppIdx < 0 || outIdx < 0) {
  console.error('Usage: qa:validate --model <model.json> --cpp <generated.cpp> --out <dir>');
  process.exit(2);
}

const modelPath = path.resolve(args[modelIdx + 1]);
const cppPath = path.resolve(args[cppIdx + 1]);
const outDir = path.resolve(args[outIdx + 1]);
ensureDir(outDir);

// Extremely simple rules for now: presence checks and placeholder violations
const modelTxt = readText(modelPath);
const cppTxt = readText(cppPath);

const violations: { rule: string; severity: 'error'|'warn'; detail: string }[] = [];
if (!modelTxt.trim()) violations.push({ rule: 'ModelLoad', severity: 'error', detail: 'model.json unreadable' });
if (!cppTxt.trim()) violations.push({ rule: 'CppLoad', severity: 'error', detail: 'generated.cpp unreadable' });

writeJson(path.join(outDir, 'graph.validation.json'), {
  violations,
  counts: {
    errors: violations.filter(v => v.severity === 'error').length,
    warnings: violations.filter(v => v.severity === 'warn').length
  }
});

console.log('[qa:validate] graph.validation.json emitted');