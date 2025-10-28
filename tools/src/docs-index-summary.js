#!/usr/bin/env node
/*
 Insert or update a compact status summary table at the top of docs/INDEX.md
 using counts from docs/docs_index.json. Non-blocking and idempotent.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_JSON = path.join(ROOT, 'docs', 'docs_index.json');
const INDEX_MD = path.join(ROOT, 'docs', 'INDEX.md');

function loadIndex() {
  if (!fs.existsSync(INDEX_JSON)) {
    throw new Error('docs/docs_index.json not found. Run: node tools/src/docs-inventory.js');
  }
  return JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
}

function summarize(items) {
  const counts = {};
  for (const it of items) {
    const st = it.status || 'unknown';
    counts[st] = (counts[st] || 0) + 1;
  }
  const order = ['approved', 'review', 'draft', 'deprecated', 'archived', 'unknown'];
  const rows = order
    .filter(k => counts[k] != null)
    .map(k => [k, String(counts[k])]);
  if (rows.length === 0) {
    for (const [k, v] of Object.entries(counts)) rows.push([k, String(v)]);
  }
  return rows;
}

function mdTable(rows) {
  const lines = [];
  lines.push('| Status | Count |');
  lines.push('| --- | --- |');
  for (const r of rows) lines.push(`| ${r[0]} | ${r[1]} |`);
  return lines.join('\n');
}

function injectSummary(content, tableMd, topLinksMd) {
  const headerIdx = content.indexOf('\n# K1 Project Documentation Index');
  const insertAfter = headerIdx >= 0 ? content.indexOf('\n', headerIdx + 1) : 0;
  const breadcrumbs = `> [Dashboard](Dashboard.md) / [Tags](tags/index.md) / [Index](INDEX.md)`;
  const summaryBlock = `\n\n${breadcrumbs}\n\n## Status Summary\n\n${tableMd}\n\n## Top Links\n\n${topLinksMd}\n`;

  if (content.includes('\n## Status Summary\n')) {
    // Replace existing summary section until next heading or end
    const start = content.indexOf('\n## Status Summary\n');
    let end = content.indexOf('\n## ', start + 1);
    if (end === -1) end = content.length;
    return content.slice(0, start) + summaryBlock + content.slice(end);
  }

  // Insert after H1 or at start if not found
  if (insertAfter > 0) {
    return content.slice(0, insertAfter) + summaryBlock + content.slice(insertAfter);
  }
  return summaryBlock + content;
}

function main() {
  const index = loadIndex();
  const items = index.items || [];
  const rows = summarize(items);
  const tableMd = mdTable(rows);
  // Build Top Links list: last 5 updated across repo
  const parsed = items.map(it => ({
    ...it,
    _date: it.last_updated && /^\d{4}-\d{2}-\d{2}$/.test(it.last_updated) ? new Date(it.last_updated) : null,
  }));
  const top5 = parsed
    .sort((a, b) => (b._date?.getTime() || 0) - (a._date?.getTime() || 0))
    .slice(0, 5);
  const topLinksMd = top5
    .map(it => {
      const label = it.title || (it.path ? it.path.split('/').pop() : 'Untitled');
      const relPath = it.path
        ? path.relative(path.dirname(INDEX_MD), path.join(ROOT, it.path))
        : null;
      const link = relPath ? `[${label}](${relPath})` : label;
      return `- ${link} [status: ${it.status || 'unknown'}] [owner: ${it.owner || '-'}]`;
    })
    .join('\n') || '- No recent documents found.';
  const content = fs.readFileSync(INDEX_MD, 'utf8');
  const out = injectSummary(content, tableMd, topLinksMd);
  fs.writeFileSync(INDEX_MD, out);
  console.log('Updated docs/INDEX.md with compact status summary and Top Links (clickable).');
}

main();
