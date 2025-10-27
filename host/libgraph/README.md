# K1 Layer-1 libgraph

A minimal, dependency-free C++ graph library with CSR storage and iterative algorithms:

- CSR graph representation (directed by default)
- BFS, DFS preorder (iterative)
- Dijkstra (non-negative weights)
- Topological sort (throws on cycles)
- Cycle detection (iterative color method)
- Layered DAG generator for scale sanity
- Summary helper for quick metadata

## Build & Test

```bash
cd host/libgraph
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
```

## Benchmark (sanity for scale)

```bash
./build/k1_graph_bench 200 500  # 200 layers × 500 width
```

Outputs CSR size summary and topo-sort timing. Adjust to fit your RAM.

## API Surface

- `k1::graph::CSR` — CSR graph (directed by default)
- `bfs(const CSR&, uint32_t src) -> std::vector<uint32_t>` — unweighted distances (`INF_U32` if unreachable)
- `dfs_preorder(const CSR&, uint32_t src) -> std::vector<uint32_t>` — iterative preorder
- `dijkstra(const CSR&, uint32_t src) -> std::vector<float>` — non-negative weights; defaults to 1
- `topo_sort(const CSR&) -> std::vector<uint32_t>` — throws on cycles
- `has_cycle(const CSR&) -> bool` — iterative color method
- `GraphBuilder` — build CSR from edges; optional weights
- `make_layered_dag(layers,width)` — synthetic DAG for scale tests
- `summary(const CSR&) -> std::string` — quick metadata string