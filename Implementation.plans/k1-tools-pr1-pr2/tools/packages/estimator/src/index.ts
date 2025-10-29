
/**
 * @package @k1/estimator
 * Lightweight performance estimation based on per-node cost coefficients.
 * This is a host-side analytical model; validate with micro-benchmarks later.
 */
import type { Graph } from "../../graph/src/index";

export interface NodeCost { ops: number; memReads: number; memWrites: number; ioCalls: number; }
export interface CostModel { [nodeKind: string]: NodeCost; }
export interface Estimate { totalOps: number; ms: number; cpuPct: number; memKB: number; ioCalls: number; }

// Default conversion constants (tunable later via calibration)
const OPS_PER_MS = 2_000_000; // 2M ops/ms ~ 2 GOPS rough on host-scale; adjust later
const BYTES_PER_KB = 1024;

export function estimateRuntime(g: Graph, kinds: Uint16Array, model: CostModel): Estimate {
  const N = g.offsets.length - 1;
  if (kinds.length !== N) throw new Error("kinds length must match node count");
  let totalOps = 0;
  let memReads = 0;
  let memWrites = 0;
  let ioCalls = 0;

  for (let u = 0; u < N; u++) {
    const kindIdx = kinds[u];
    const key = String(kindIdx);
    const c = model[key] ?? { ops: 100, memReads: 16, memWrites: 8, ioCalls: 0 };
    totalOps += c.ops;
    memReads += c.memReads;
    memWrites += c.memWrites;
    ioCalls += c.ioCalls;
  }
  const ms = totalOps / OPS_PER_MS;
  const memKB = (memReads + memWrites) / BYTES_PER_KB;
  const cpuPct = Math.min(100, (ms / 16.667) * 100); // relative to 60 FPS frame budget
  return { totalOps, ms, cpuPct, memKB, ioCalls };
}

export function calibrate(samples: Array<{nodeKind:string, us:number}>): CostModel {
  // Simple average-based calibration: ops ~= OPS_PER_MS * (us/1000)
  const groups: Record<string, {sum: number; n: number}> = {};
  for (const s of samples) {
    if (!groups[s.nodeKind]) groups[s.nodeKind] = {sum: 0, n: 0};
    groups[s.nodeKind].sum += s.us;
    groups[s.nodeKind].n += 1;
  }
  const model: CostModel = {};
  for (const [k, v] of Object.entries(groups)) {
    const usAvg = v.sum / v.n;
    const ms = usAvg / 1000;
    model[k] = {
      ops: Math.max(1, Math.round(OPS_PER_MS * ms)),
      memReads: 16,
      memWrites: 8,
      ioCalls: 0
    };
  }
  return model;
}
