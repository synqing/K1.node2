
# K1 Layer‑1 Graph Library (host/libgraph)

C++17 library providing:
- CSR graph representation
- BFS / DFS(preorder) / Dijkstra
- Topological sort + cycle detection
- Layered DAG generator for large-scale validation
- Tests (no third-party deps) and a topo benchmark

## Build
```bash
cd host/libgraph
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build
```

## Bench
```bash
./build/k1_graph_bench 200 500
```


## JSON I/O (optional)
The library includes a tiny JSON loader for CSR graphs—no third-party deps.

**CSR JSON format**
```json
{
  "directed": true,
  "offsets": [0,2,3,3],
  "edges":   [1,2,2],
  "weights": [1.0,1.0,0.5] // optional
}
```

**Load & run bench with JSON input**
```bash
# from host/libgraph/build after building
./k1_graph_bench --json /path/to/graph.json --out bench.topo.json --metrics graph.metrics.json
# Outputs two machine-readable files the control app can consume:
#  - bench.topo.json
#  - graph.metrics.json
```
