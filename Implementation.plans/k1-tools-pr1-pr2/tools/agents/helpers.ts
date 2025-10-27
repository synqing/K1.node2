
import * as fs from 'fs/promises';
import * as path from 'path';

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeJSON(p: string, obj: any) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(obj, null, 2), 'utf8');
}

export async function readJSON<T=any>(p: string): Promise<T> {
  const s = await fs.readFile(p, 'utf8');
  return JSON.parse(s) as T;
}

export function resolveInputPath(argPath: string | undefined, fallbackRel: string): string {
  if (argPath && argPath.trim().length > 0) return path.resolve(argPath);
  return path.resolve(new URL('.', import.meta.url).pathname, '..', 'samples', fallbackRel);
}
