#!/usr/bin/env node
/*
 Frontmatter auto-fixer and status normalizer.
 - Scans markdown files under docs/ and Implementation.plans/
 - Adds missing frontmatter with sensible defaults
 - Normalizes status to one of: draft, review, approved, deprecated, archived
 - Fills missing fields: title, version, owner, last_updated, tags
 - Preserves existing content/body; only updates the frontmatter block

 Usage:
   node tools/src/docs-frontmatter-fix.js --dry-run   # show proposed changes
   node tools/src/docs-frontmatter-fix.js --apply     # write changes
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const PLANS_DIR = path.join(ROOT, 'Implementation.plans');

const ALLOWED = new Set(['draft', 'review', 'approved', 'deprecated', 'archived']);
const MAP = new Map([
  ['in_progress', 'draft'],
  ['in-progress', 'draft'],
  ['wip', 'draft'],
  ['published', 'approved'],
  ['final', 'approved'],
  ['obsolete', 'deprecated'],
  ['outdated', 'deprecated'],
]);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    // Skip noisy or external directories
    if (entry === 'node_modules' || entry === '.git' || entry === 'build' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (e) {
      // Ignore entries that cannot be stat'ed (broken links or special files)
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (stat.isFile() && full.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = content.slice(0, end + 4); // include trailing ---\n
  const lines = block.split('\n').slice(1, -1); // between --- and ---
  const map = new Map();
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) map.set(m[1].trim(), m[2].trim());
  }
  return { block, map, endIndex: end + 4 };
}

function deriveTitle(filePath, body) {
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const name = path.basename(filePath, path.extname(filePath));
  return name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeStatus(val) {
  if (!val) return 'draft';
  const v = String(val).toLowerCase().trim();
  if (ALLOWED.has(v)) return v;
  if (MAP.has(v)) return MAP.get(v);
  return 'draft';
}

function defaultTags(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (rel.startsWith('docs/')) return '[docs]';
  return '[plan]';
}

function nextReviewDate() {
  const d = new Date(Date.now() + 90 * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildFrontmatter(existing, filePath, body) {
  const m = existing?.map || new Map();
  const title = m.get('title') || deriveTitle(filePath, body);
  const status = normalizeStatus(m.get('status'));
  const version = m.get('version') || 'v1.0';
  const owner = m.get('owner') || '[Docs Maintainers]';
  const reviewers = m.get('reviewers') || '[Engineering Leads]';
  const lastUpdated = m.get('last_updated') || today();
  const nextReview = m.get('next_review_due') || nextReviewDate();
  const tags = m.get('tags') || defaultTags(filePath);
  const related = m.get('related_docs') || '[]';

  const lines = [
    '---',
    `title: ${title}`,
    `status: ${status}`,
    `version: ${version}`,
    `owner: ${owner}`,
    `reviewers: ${reviewers}`,
    `last_updated: ${lastUpdated}`,
    `next_review_due: ${nextReview}`,
    `tags: ${tags}`,
    `related_docs: ${related}`,
    '---',
    '',
  ];
  return lines.join('\n');
}

function fixFile(filePath, apply) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fm = parseFrontmatter(content);
  const body = fm ? content.slice(fm.endIndex) : content;
  const newFm = buildFrontmatter(fm, filePath, body);
  const newContent = newFm + body.replace(/^\n+/, '');
  const changed = !fm || fm.block !== newFm;
  if (apply && changed) fs.writeFileSync(filePath, newContent);
  return { changed, filePath };
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply') && !dryRun;
  const files = [...walk(DOCS_DIR), ...walk(PLANS_DIR)];
  let changedCount = 0;
  for (const f of files) {
    const { changed } = fixFile(f, apply);
    if (changed) changedCount++;
  }
  console.log(`Frontmatter fix ${apply ? 'applied' : 'dry-run'}: ${changedCount} files affected out of ${files.length}`);
}

main();
