#!/usr/bin/env node
/*
 Generate tag index pages under docs/tags/ from docs/docs_index.json.
 Each tag page lists docs with that tag and shows status/owner/updated.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_JSON = path.join(ROOT, 'docs', 'docs_index.json');
const TAG_DIR = path.join(ROOT, 'docs', 'tags');

function loadIndex() {
  if (!fs.existsSync(INDEX_JSON)) {
    throw new Error('docs/docs_index.json not found. Run: node tools/src/docs-inventory.js');
  }
  return JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
}

function groupByTag(items) {
  const map = new Map();
  for (const it of items) {
    const tags = Array.isArray(it.tags) ? it.tags : [];
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(it);
    }
  }
  return map;
}

function renderTagPage(tag, items) {
  // Compute Top Links by most recent last_updated
  const parsed = items.map(it => ({
    ...it,
    _date: it.last_updated && /^\d{4}-\d{2}-\d{2}$/.test(it.last_updated) ? new Date(it.last_updated) : null,
  }));
  const top = parsed
    .sort((a, b) => (b._date?.getTime() || 0) - (a._date?.getTime() || 0))
    .slice(0, 5);

  const rows = items.map(it => [
    it.title || path.basename(it.path),
    it.status || 'unknown',
    it.owner || '-',
    it.last_updated || '-',
    it.path,
  ]);
  const table = [
    '| Title | Status | Owner | Last Updated | Path |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n');

  return `---\n` +
`title: Tag: ${tag}\n` +
`status: approved\n` +
`version: v1.0\n` +
`owner: [Docs Maintainers]\n` +
`reviewers: [Engineering Leads]\n` +
`last_updated: ${new Date().toISOString().slice(0,10)}\n` +
`next_review_due: ${new Date(Date.now()+90*24*3600*1000).toISOString().slice(0,10)}\n` +
`tags: [index, tag, ${tag}]\n` +
`related_docs: [docs/INDEX.md]\n` +
`---\n\n` +
`# Tag: ${tag}\n\n` +
`> [Index](../INDEX.md) / [Tags](../tags/index.md) / ${tag}\n\n` +
`## Top Links\n` +
top.map(it => {
  const title = it.title || path.basename(it.path, path.extname(it.path));
  // Compute relative path from docs/tags/ to the document
  const relativePath = it.path.startsWith('docs/') 
    ? `../${it.path.slice(5)}` // Remove 'docs/' and add '../'
    : `../../${it.path}`; // For Implementation.plans/ etc.
  return `- [${title}](${relativePath}) [status: ${it.status || 'unknown'}] [owner: ${it.owner || '-'}]`;
}).join('\n') +
`\n\n` +
table + '\n';
}

function main() {
  const index = loadIndex();
  const items = index.items || [];
  const byTag = groupByTag(items);
  if (!fs.existsSync(TAG_DIR)) fs.mkdirSync(TAG_DIR, { recursive: true });
  for (const [tag, group] of byTag.entries()) {
    const out = path.join(TAG_DIR, `${tag}.md`);
    fs.writeFileSync(out, renderTagPage(tag, group));
    console.log(`Wrote ${out}`);
  }
  console.log(`Generated ${byTag.size} tag pages in docs/tags/`);
}

main();
