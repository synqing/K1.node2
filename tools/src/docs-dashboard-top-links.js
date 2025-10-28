#!/usr/bin/env node
/*
 Insert or update a "Top Links (Global)" section near the top of docs/Dashboard.md
 using the last 5 updated documents from docs/docs_index.json. Non-blocking and idempotent.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_JSON = path.join(ROOT, 'docs', 'docs_index.json');
const DASHBOARD_MD = path.join(ROOT, 'docs', 'Dashboard.md');

function loadIndex() {
  if (!fs.existsSync(INDEX_JSON)) {
    throw new Error('docs/docs_index.json not found. Run: node tools/src/docs-inventory.js');
  }
  return JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
}

function buildTopLinks(items) {
  const parsed = items.map(it => ({
    ...it,
    _date: it.last_updated && /^\d{4}-\d{2}-\d{2}$/.test(it.last_updated) ? new Date(it.last_updated) : null,
  }));
  const top5 = parsed
    .sort((a, b) => (b._date?.getTime() || 0) - (a._date?.getTime() || 0))
    .slice(0, 5);
  const listMd = top5
    .map(it => `- ${it.title || (it.path ? it.path.split('/').pop() : 'Untitled')} — \`${it.path}\` [status: ${it.status || 'unknown'}] [owner: ${it.owner || '-'}]`)
    .join('\n') || '- No recent documents found.';
  return listMd;
}

function injectTopLinks(content, listMd) {
  const headerIdx = content.indexOf('\n# Documentation Dashboard');
  const insertAfter = headerIdx >= 0 ? content.indexOf('\n', headerIdx + 1) : 0;
  const block = `\n\n## Top Links (Global)\n\n${listMd}\n`;

  if (content.includes('\n## Top Links (Global)\n')) {
    const start = content.indexOf('\n## Top Links (Global)\n');
    let end = content.indexOf('\n## ', start + 1);
    if (end === -1) end = content.length;
    return content.slice(0, start) + block + content.slice(end);
  }

  if (insertAfter > 0) {
    return content.slice(0, insertAfter) + block + content.slice(insertAfter);
  }
  return block + content;
}

function main() {
  if (!fs.existsSync(DASHBOARD_MD)) {
    throw new Error('docs/Dashboard.md not found. Run: node tools/src/docs-dashboard.js first.');
  }
  const index = loadIndex();
  const items = index.items || [];
  const listMd = buildTopLinks(items);
  const content = fs.readFileSync(DASHBOARD_MD, 'utf8');
  const out = injectTopLinks(content, listMd);
  fs.writeFileSync(DASHBOARD_MD, out);
  console.log('Updated docs/Dashboard.md with Top Links (Global).');
}

main();

