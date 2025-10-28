#!/usr/bin/env node
/*
 Simple frontmatter validator for Markdown docs.
 - Scans docs/ and Implementation.plans/ for .md files
 - Skips templates and ADR-template
 - Validates presence of required YAML frontmatter fields
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REQUIRED_FIELDS = ['title', 'status', 'version', 'owner', 'last_updated', 'tags'];
const VALID_STATUS = new Set(['draft', 'review', 'approved', 'deprecated', 'archived']);
const SKIP_DIRS = [
  path.join('docs', 'templates'),
  path.join('docs', 'adr', 'ADR-template.md'),
];
const SKIP_CONTAINS = ['node_modules', '.git', 'build', 'dist'];

function isMarkdown(filePath) {
  return filePath.endsWith('.md');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    // Skip paths that include noisy directories like node_modules
    if (SKIP_CONTAINS.some(seg => rel.includes(seg))) continue;
    if (entry.isDirectory()) {
      // Skip templates folder
      if (SKIP_DIRS.some(skip => rel.startsWith(skip))) continue;
      out.push(...walk(full));
    } else if (entry.isFile() && isMarkdown(full)) {
      // Skip ADR template file explicitly
      if (SKIP_DIRS.includes(rel)) continue;
      out.push(full);
    }
  }
  return out;
}

function extractFrontmatter(content) {
  // Frontmatter block between leading --- and next ---
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function hasField(fm, field) {
  const re = new RegExp(`^${field}:`, 'm');
  return re.test(fm);
}

function getFieldValue(fm, field) {
  const re = new RegExp(`^${field}:\s*(.+)$`, 'm');
  const m = fm.match(re);
  if (!m) return null;
  return m[1].trim();
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fm = extractFrontmatter(content);
  const rel = path.relative(ROOT, filePath);
  const errors = [];

  if (!fm) {
    errors.push(`${rel}: missing frontmatter block (---).`);
    return errors;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!hasField(fm, field)) {
      errors.push(`${rel}: missing field '${field}'.`);
    }
  }

  const status = getFieldValue(fm, 'status');
  if (status && !VALID_STATUS.has(status)) {
    errors.push(`${rel}: invalid status '${status}' (expected one of ${Array.from(VALID_STATUS).join(', ')}).`);
  }

  const title = getFieldValue(fm, 'title');
  if (title && title.length < 3) {
    errors.push(`${rel}: title too short.`);
  }

  return errors;
}

function main() {
  const targets = [path.join(ROOT, 'docs'), path.join(ROOT, 'Implementation.plans')];
  let files = [];
  for (const d of targets) {
    if (fs.existsSync(d)) files.push(...walk(d));
  }
  let failures = 0;
  const allErrors = [];
  for (const f of files) {
    const errs = validateFile(f);
    if (errs.length) {
      failures += 1;
      allErrors.push(...errs);
    }
  }
  if (allErrors.length) {
    console.error('Documentation frontmatter validation failed:');
    for (const e of allErrors) console.error(' -', e);
    process.exitCode = 1;
  } else {
    console.log(`Documentation frontmatter validation passed. Checked ${files.length} files.`);
  }
}

main();
