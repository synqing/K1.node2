#!/usr/bin/env node
/*
 Build docs/Dashboard.md from docs/docs_index.json.
 Shows counts by status, missing frontmatter, and a table of critical areas.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_JSON = path.join(ROOT, 'docs', 'docs_index.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'Dashboard.md');

function loadIndex() {
  if (!fs.existsSync(INDEX_JSON)) {
    throw new Error('docs/docs_index.json not found. Run: node tools/src/docs-inventory.js');
  }
  return JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
}

function summarize(items) {
  const statusCounts = {};
  let missingFrontmatter = 0;
  let orphanOwners = 0;
  for (const it of items) {
    const st = it.status || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (!it.title || !it.status || !it.owner || !it.last_updated || !it.tags) {
      missingFrontmatter += 1;
    }
    if (!it.owner) orphanOwners += 1;
  }
  return { statusCounts, missingFrontmatter, orphanOwners };
}

function mdTable(rows, headers) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const r of rows) {
    lines.push(`| ${r.join(' | ')} |`);
  }
  return lines.join('\n');
}

function render(index) {
  const items = index.items || [];
  const { statusCounts, missingFrontmatter, orphanOwners } = summarize(items);

  const statusRows = Object.entries(statusCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, String(v)]);

  const criticalPaths = [
    'docs/features/node-ui/',
    'docs/api/K1_FIRMWARE_API.md',
    'docs/analysis/webserver/',
    'Implementation.plans/',
    'codegen/',
  ];
  const critical = items.filter(it => criticalPaths.some(p => it.path.startsWith(p)));
  const criticalRows = critical.map(it => [
    it.title || path.basename(it.path),
    it.status || 'unknown',
    it.owner || '-',
    it.last_updated || '-',
    it.path,
  ]);

  const md = `---\n` +
`title: Documentation Dashboard\n` +
`status: approved\n` +
`version: v1.0\n` +
`owner: [Docs Maintainers]\n` +
`reviewers: [Engineering Leads]\n` +
`last_updated: ${new Date().toISOString().slice(0,10)}\n` +
`next_review_due: ${new Date(Date.now()+90*24*3600*1000).toISOString().slice(0,10)}\n` +
`tags: [dashboard, docs]\n` +
`related_docs: [docs/INDEX.md]\n` +
`---\n\n` +
`# Documentation Dashboard\n\n` +
`Generated from docs_index.json (${items.length} items).\n\n` +
`## Summary\n` +
mdTable(statusRows, ['Status', 'Count']) +
`\n\n- Missing frontmatter: ${missingFrontmatter}\n- Orphan owners: ${orphanOwners}\n\n` +
`## Critical Areas\n` +
mdTable(criticalRows, ['Title', 'Status', 'Owner', 'Last Updated', 'Path']) +
`\n\n` +
`## How to Update\n- Run: \`node tools/src/docs-inventory.js\` then \`node tools/src/docs-dashboard.js\` to refresh.\n`;

  return md;
}

function main() {
  const index = loadIndex();
  const md = render(index);
  fs.writeFileSync(OUTPUT_MD, md);
  console.log(`Wrote ${OUTPUT_MD}`);
}

main();

