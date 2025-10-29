#!/usr/bin/env node
/*
 Scaffolds a new documentation file from a template.
 Usage:
   node tools/src/new-doc.js --type feature|analysis|plan --title "My Title" --out docs/features/my-title.md
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--type') out.type = args[++i];
    else if (a === '--title') out.title = args[++i];
    else if (a === '--out') out.out = args[++i];
  }
  return out;
}

function pickTemplate(type) {
  const map = {
    feature: path.join(ROOT, 'docs', 'templates', 'Doc_Template_Feature.md'),
    analysis: path.join(ROOT, 'docs', 'templates', 'Doc_Template_Analysis.md'),
    plan: path.join(ROOT, 'docs', 'templates', 'Doc_Template_Plan.md'),
  };
  const p = map[type];
  if (!p) throw new Error(`Unknown type '${type}'. Expected feature|analysis|plan.`);
  if (!fs.existsSync(p)) throw new Error(`Template not found: ${p}`);
  return p;
}

function kebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function main() {
  const { type, title, out } = parseArgs();
  if (!type || !title || !out) {
    console.error('Usage: node tools/src/new-doc.js --type feature|analysis|plan --title "My Title" --out docs/features/my-title.md');
    process.exit(1);
  }
  const tplPath = pickTemplate(type);
  const tpl = fs.readFileSync(tplPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const content = tpl
    .replace('<Feature Title>', title)
    .replace('<Analysis Title>', title)
    .replace('<Plan Title>', title)
    .replace('YYYY-MM-DD', today);
  const outAbs = path.join(ROOT, out);
  const dir = path.dirname(outAbs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(outAbs)) {
    console.error(`Refusing to overwrite existing file: ${out}`);
    process.exit(1);
  }
  fs.writeFileSync(outAbs, content);
  console.log(`Created ${out}`);
}

main();

