import fs from 'node:fs';
import path from 'node:path';

export function ensureArtifactsDir(): string {
  const p = process.env.K1_ARTIFACTS || path.resolve(process.cwd(), 'playwright-artifacts');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}

export function artifactPath(fileName: string): string {
  const d = ensureArtifactsDir();
  return path.join(d, fileName);
}
