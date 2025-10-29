
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
