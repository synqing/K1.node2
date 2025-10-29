export const artifactsBase = (import.meta as any).env?.VITE_ARTIFACT_BASE || '/artifacts';

export async function fetchJson<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`${artifactsBase}/${file}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}