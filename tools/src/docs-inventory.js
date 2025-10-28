#!/usr/bin/env node
/*
 Generate a simple documentation inventory as JSON at docs/docs_index.json.
 Collects path, title, status, version, owner, last_updated, tags from frontmatter.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs', 'docs_index.json');
const TARGETS = [path.join(ROOT, 'docs'), path.join(ROOT, 'Implementation.plans')];

function isMarkdown(filePath) {
  return filePath.endsWith('.md');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && isMarkdown(full)) {
      out.push(full);
    }
  }
  return out;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function getFieldValue(fm, field) {
  const re = new RegExp(`^${field}:\s*(.+)$`, 'm');
  const m = fm.match(re);
  if (!m) return null;
  return m[1].trim();
}

function parseArray(value) {
  if (!value) return [];
  // Allow YAML array syntax like [a, b] or simple comma-separated
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function collect() {
  const files = [];
  for (const t of TARGETS) {
    if (fs.existsSync(t)) files.push(...walk(t));
  }
  const rows = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const content = fs.readFileSync(f, 'utf8');
    const fm = extractFrontmatter(content);
    const row = { path: rel };
    if (fm) {
      row.title = getFieldValue(fm, 'title') || null;
      row.status = getFieldValue(fm, 'status') || null;
      row.version = getFieldValue(fm, 'version') || null;
      row.owner = getFieldValue(fm, 'owner') || null;
      row.last_updated = getFieldValue(fm, 'last_updated') || null;
      row.tags = parseArray(getFieldValue(fm, 'tags'));
    }
    rows.push(row);
  }
  return rows;
}

function main() {
  const rows = collect();
  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ generated_at: new Date().toISOString(), items: rows }, null, 2));
  console.log(`Wrote ${OUTPUT} with ${rows.length} entries.`);
}

main();

