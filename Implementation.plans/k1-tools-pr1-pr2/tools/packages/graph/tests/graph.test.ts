
import { describe, it, expect } from 'vitest';
import { graphFromJSON, bfs, dfs, dijkstra, topoSort, hasCycle } from '../src/index';

describe('@k1/graph', () => {
  const gjson = {
    directed: true,
    offsets: [0,2,4,6,6],
    edges:   [1,2, 2,3, 3,1],
    // graph: 0->1,0->2, 1->2,1->3, 2->3, 3->1
    // This graph has a cycle: 1 -> 3 -> 1
    weights: [1,1, 1,1, 1,1]
  };
  it('bfs works', () => {
    const g = graphFromJSON(gjson);
    const dist = bfs(g, 0);
    // expect reachability to 3 within two steps
    expect(dist[3]).toBe(2);
  });

  it('dfs returns a preorder from src', () => {
    const g = graphFromJSON(gjson);
    const order = dfs(g, 0);
    expect(order[0]).toBe(0);
    expect(order.length).toBeGreaterThan(1);
  });

  it('dijkstra handles unit weights', () => {
    const g = graphFromJSON(gjson);
    const d = dijkstra(g, 0);
    expect(d[3]).toBe(2);
  });

  it('hasCycle detects a cycle', () => {
    const g = graphFromJSON(gjson);
    expect(hasCycle(g)).toBe(true);
  });

  it('topoSort throws on cycle', () => {
    const g = graphFromJSON(gjson);
    expect(() => topoSort(g)).toThrow();
  });

  it('topoSort works on DAG', () => {
    const dag = {
      directed: true,
      offsets: [0,1,2,2],
      edges:   [1,2],
    };
    const g = graphFromJSON(dag);
    const order = topoSort(g);
    expect(order.length).toBe(3);
  });
});
