#!/usr/bin/env node
/*
 Update docs/INDEX.md by appending status/owner badges next to links
 using metadata from docs/docs_index.json.

 Looks for lines like:
 - Label — `path/to/doc.md`

 Appends badges:
 - Label — `path/to/doc.md` [status: approved] [owner: Docs Maintainers]
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_JSON = path.join(ROOT, 'docs', 'docs_index.json');
const INDEX_MD = path.join(ROOT, 'docs', 'INDEX.md');

function loadInventory() {
  if (!fs.existsSync(INDEX_JSON)) {
    throw new Error('docs/docs_index.json not found. Run: node tools/src/docs-inventory.js');
  }
  const j = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
  const map = new Map();
  for (const it of (j.items || [])) {
    if (it.path) map.set(it.path, it);
  }
  return map;
}

function processLine(line, invMap) {
  // Match: bullet, label, em dash, backticked path
  const m = line.match(/^(-\s+.*?—\s+)`([^`]+)`(.*)$/);
  if (!m) return line;
  const prefix = m[1];
  const docPath = m[2];
  let suffix = m[3] || '';

  // If badges already present, strip them first
  suffix = suffix.replace(/\s*\[status:[^\]]+\]/g, '')
                 .replace(/\s*\[owner:[^\]]+\]/g, '');

  const meta = invMap.get(docPath);
  if (!meta) return `${prefix}

\`${docPath}\`${suffix}`.replace(/\n\n/g, '\n'); // leave unchanged if not in inventory

  const status = meta.status || 'unknown';
  const owner = meta.owner || '-';
  const badges = ` [status: ${status}] [owner: ${owner}]`;
  return `${prefix}\`${docPath}\`${suffix}${badges}`;
}

function main() {
  const invMap = loadInventory();
  if (!fs.existsSync(INDEX_MD)) {
    throw new Error('docs/INDEX.md not found.');
  }
  const lines = fs.readFileSync(INDEX_MD, 'utf8').split(/\r?\n/);
  const out = lines.map(l => processLine(l, invMap)).join('\n');
  fs.writeFileSync(INDEX_MD, out);
  console.log('Updated docs/INDEX.md with status/owner badges where available.');
}

main();

