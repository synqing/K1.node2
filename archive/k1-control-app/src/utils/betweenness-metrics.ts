export interface BetweennessMetrics {
  betweenness_domain?: string;
  betweenness_normalization_scheme?: string;
  betweenness_top_k?: number;
  betweenness_top_nodes?: { node: number; score: number }[];
  betweenness_sample_count?: number;
  betweenness_normalized?: boolean;
  // Optional topology hints
  layers?: number;
  width?: number;
}

const DEFAULT_PATH = '/metrics/graph.metrics.json';

export async function loadBetweennessMetrics(path: string = DEFAULT_PATH): Promise<BetweennessMetrics | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const metrics = json as BetweennessMetrics;

    // Try to augment with topology hints from bench.topo.json
    const topoPath = path.replace('graph.metrics.json', 'bench.topo.json');
    try {
      const topoRes = await fetch(topoPath, { cache: 'no-store' });
      if (topoRes.ok) {
        const topo = await topoRes.json();
        // Prefer explicit fields if present
        if (typeof topo.layers === 'number') metrics.layers = topo.layers;
        if (typeof topo.width === 'number') metrics.width = topo.width;
        // Fallback: parse from topo.source like "generated:layers=10,width=6"
        if ((!metrics.layers || !metrics.width) && typeof topo.source === 'string') {
          const m = topo.source.match(/layers=(\d+),width=(\d+)/);
          if (m) {
            const L = Number(m[1]);
            const W = Number(m[2]);
            if (!Number.isNaN(L)) metrics.layers = L;
            if (!Number.isNaN(W)) metrics.width = W;
          }
        }
      }
    } catch {}

    return metrics;
  } catch (e) {
    return null;
  }
}

export async function parseBetweennessMetricsFile(file: File): Promise<BetweennessMetrics | null> {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    return json as BetweennessMetrics;
  } catch {
    return null;
  }
}