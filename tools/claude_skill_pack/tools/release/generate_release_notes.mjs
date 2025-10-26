import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const artifactsRoot = path.join(repoRoot, 'artifacts');

function getNewestArtifactDir() {
  const dirs = fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .reverse();
  return dirs[0] ? path.join(artifactsRoot, dirs[0]) : null;
}

function safeReadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return null; }
}

function tail(file, lines = 40) {
  try {
    const txt = fs.readFileSync(file, 'utf-8').trim().split('\n');
    return txt.slice(-lines).join('\n');
  } catch { return ''; }
}

const artDir = getNewestArtifactDir();
if (!artDir) {
  console.error('No artifact directory found in artifacts/');
  process.exit(1);
}

const meta = safeReadJSON(path.join(artDir, 'metadata.json')) || {};
const report = safeReadJSON(path.join(artDir, 'playwright-report.json'));
const patterns = safeReadJSON(path.join(artDir, 'patterns.json'));
const params = safeReadJSON(path.join(artDir, 'params.json'));
const buildLogTail = tail(path.join(artDir, 'build.log'));

const pass = report?.suites?.reduce((acc, s) => acc + s.specs.filter(sp => sp.ok).length, 0) ?? 0;
const fail = report?.suites?.reduce((acc, s) => acc + s.specs.filter(sp => !sp.ok).length, 0) ?? 0;

const md = `# K1 Release Notes

**Timestamp:** ${meta.timestamp ?? 'unknown'}  
**Device IP:** ${meta.device_ip ?? 'unknown'}  
**Pattern:** ${meta.pattern ?? 'unknown'}  
**OTA Method:** ${meta.ota_method ?? 'unknown'}

## Summary
- API/UI Tests: **${pass} passed**, **${fail} failed**
- Artifacts: \`${artDir}\`

## Patterns
\`\`\`json
${JSON.stringify(patterns ?? {}, null, 2)}
\`\`\`

## Current Params
\`\`\`json
${JSON.stringify(params ?? {}, null, 2)}
\`\`\`

## Build Log (tail)
\`\`\`
${buildLogTail}
\`\`\`
`;

fs.writeFileSync(path.join(artDir, 'RELEASE_NOTES.md'), md);
fs.writeFileSync(path.join(repoRoot, 'LATEST_RELEASE_NOTES.md'), md);
console.log('Wrote release notes to:', path.join(artDir, 'RELEASE_NOTES.md'));
