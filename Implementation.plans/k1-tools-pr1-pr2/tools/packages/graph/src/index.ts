
/**
 * @package @k1/graph
 * Core graph algorithms over a CSR (Compressed Sparse Row) representation.
 * CSR is space-efficient and friendly for large graphs (1M+ nodes).
 *
 * Graph:
 *  directed: boolean
 *  offsets: Uint32Array (length N+1) - row pointer for each node u
 *  edges:   Uint32Array (length M)   - adjacency list entries
 *  weights: Float32Array (optional)  - edge weights for Dijkstra; defaults to 1
 *
 * All algorithms are iterative to avoid call-stack blowups for giant graphs.
 */
export type NodeId = number;
export type Weight = number;

export interface Graph {
  directed: boolean;
  offsets: Uint32Array;
  edges: Uint32Array;
  weights?: Float32Array;
}

/** Helper to create typed arrays from plain JSON arrays */
export function graphFromJSON(obj: any): Graph {
  if (!obj || typeof obj.directed !== "boolean" || !obj.offsets || !obj.edges) {
    throw new Error("Invalid graph JSON");
  }
  const g: Graph = {
    directed: !!obj.directed,
    offsets: new Uint32Array(obj.offsets),
    edges: new Uint32Array(obj.edges),
    weights: obj.weights ? new Float32Array(obj.weights) : undefined
  };
  return g;
}

/**
 * BFS (Breadth-First Search). Returns an array of distances in edges from src.
 * Unreachable nodes have distance UINT32_MAX.
 */
export function bfs(g: Graph, src: NodeId): Uint32Array {
  const N = g.offsets.length - 1;
  const dist = new Uint32Array(N);
  dist.fill(0xFFFFFFFF); // sentinel for "unreached"
  const q = new Uint32Array(N);
  let qh = 0, qt = 0;

  dist[src] = 0;
  q[qt++] = src;

  while (qh < qt) {
    const u = q[qh++];
    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = start; i < end; i++) {
      const v = g.edges[i];
      if (dist[v] === 0xFFFFFFFF) {
        dist[v] = dist[u] + 1;
        q[qt++] = v;
      }
    }
  }
  return dist;
}

/**
 * DFS (Depth-First Search) - returns a discovery order (preorder).
 * Iterative using an explicit stack (LIFO).
 */
export function dfs(g: Graph, src: NodeId): Uint32Array {
  const N = g.offsets.length - 1;
  const order = new Uint32Array(N);
  order.fill(0xFFFFFFFF);
  const seen = new Uint8Array(N);
  const stack: number[] = [src];
  let idx = 0;

  while (stack.length) {
    const u = stack.pop()!;
    if (seen[u]) continue;
    seen[u] = 1;
    order[idx++] = u;

    // push neighbors in reverse to mimic recursive DFS order
    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = end - 1; i >= start; i--) {
      stack.push(g.edges[i]);
    }
  }
  // Compact the result (trim trailing 0xFFFFFFFF)
  return order.slice(0, idx);
}

/**
 * Dijkstra's algorithm for non-negative weights. If weights are missing, treat all edges as weight 1.
 * Returns Float32Array of distances (Infinity for unreachable).
 */
export function dijkstra(g: Graph, src: NodeId): Float32Array {
  const N = g.offsets.length - 1;
  const dist = new Float32Array(N);
  const visited = new Uint8Array(N);
  for (let i = 0; i < N; i++) dist[i] = Infinity;
  dist[src] = 0;

  // Simple binary-heap replacement: a thin priority queue using a pair of arrays
  // For 1M+ nodes, a proper binary heap/fib heap could be substituted later.
  // This is adequate for prototype with O((N+M) log N) behavior.
  const heapIdx: number[] = [src];
  const heapKey: number[] = [0];
  function swap(i: number, j: number) {
    [heapIdx[i], heapIdx[j]] = [heapIdx[j], heapIdx[i]];
    [heapKey[i], heapKey[j]] = [heapKey[j], heapKey[i]];
  }
  function heappush(v: number, key: number) {
    heapIdx.push(v); heapKey.push(key);
    let i = heapIdx.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapKey[p] <= heapKey[i]) break;
      swap(i, p); i = p;
    }
  }
  function heappop(): number | undefined {
    const n = heapIdx.length;
    if (n === 0) return undefined;
    const v = heapIdx[0];
    const k = heapKey[0];
    if (n === 1) { heapIdx.pop(); heapKey.pop(); return v; }
    heapIdx[0] = heapIdx[n - 1];
    heapKey[0] = heapKey[n - 1];
    heapIdx.pop(); heapKey.pop();
    let i = 0;
    while (true) {
      let l = i * 2 + 1, r = l + 1, m = i;
      if (l < heapIdx.length && heapKey[l] < heapKey[m]) m = l;
      if (r < heapIdx.length && heapKey[r] < heapKey[m]) m = r;
      if (m === i) break;
      swap(i, m); i = m;
    }
    return v;
  }
  function decreaseKey(v: number, newKey: number) {
    // naive: push duplicate with better key; visited[] guards correctness
    heappush(v, newKey);
  }

  const w = g.weights;
  while (heapIdx.length) {
    const u = heappop();
    if (u === undefined) break;
    if (visited[u]) continue;
    visited[u] = 1;

    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = start; i < end; i++) {
      const v = g.edges[i];
      const cost = w ? w[i] : 1;
      const alt = dist[u] + cost;
      if (alt < dist[v]) {
        dist[v] = alt;
        decreaseKey(v, alt);
      }
    }
  }
  return dist;
}

/**
 * Kahn's algorithm for Topological Sorting.
 * Throws an Error when a cycle exists.
 */
export function topoSort(g: Graph): Uint32Array {
  const N = g.offsets.length - 1;
  const indeg = new Uint32Array(N);
  for (let u = 0; u < N; u++) {
    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = start; i < end; i++) indeg[g.edges[i]]++;
  }
  const q = new Uint32Array(N);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (indeg[i] === 0) q[qt++] = i;

  const out = new Uint32Array(N);
  let k = 0;
  while (qh < qt) {
    const u = q[qh++];
    out[k++] = u;
    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = start; i < end; i++) {
      const v = g.edges[i];
      indeg[v]--;
      if (indeg[v] === 0) q[qt++] = v;
    }
  }
  if (k !== N) {
    throw new Error("Cycle detected; topological order impossible");
  }
  return out;
}

/** Returns true if a directed cycle exists (coloring method). */
export function hasCycle(g: Graph): boolean {
  const N = g.offsets.length - 1;
  const color = new Uint8Array(N); // 0=white,1=gray,2=black
  const stack: number[] = [];

  function pushChildren(u: number) {
    const start = g.offsets[u];
    const end = g.offsets[u + 1];
    for (let i = end - 1; i >= start; i--) stack.push(g.edges[i]);
  }

  for (let s = 0; s < N; s++) {
    if (color[s] !== 0) continue;
    stack.push(s);
    while (stack.length) {
      const u = stack.pop()!;
      if (color[u] === 0) {
        color[u] = 1; // gray
        stack.push(~u); // marker for post-visit
        pushChildren(u);
      } else if (u < 0) {
        const x = ~u;
        color[x] = 2; // black
      } else if (color[u] === 1) {
        // found a back-edge
        return true;
      }
    }
  }
  return false;
}
