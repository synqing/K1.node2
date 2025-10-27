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

## Betweenness Quick‑Start

Run the bench with sampling, domains, and normalization:

```bash
# Middle band of layers with stride and robust normalization
./build/k1_graph_bench 60 500 \
  --betweenness-samples 32 \
  --betweenness-domain quantile:0.25-0.75:step:2 \
  --betweenness-normalize-scheme robust_zscore \
  --betweenness-top-k 6 \
  --json-out metrics/graph.metrics.json

# Top 2 layers by out-degree; map scores to [0,1]
./build/k1_graph_bench 60 500 \
  --betweenness-domain layer_rank:outdeg:top:2 \
  --betweenness-normalize-scheme domain_minmax \
  --betweenness-top-k 6 \
  --json-out metrics/graph.metrics.json

# Lowest quantile of median in-degree with z-score
./build/k1_graph_bench 60 500 \
  --betweenness-domain layer_quantile:indeg_median:0.0-0.25 \
  --betweenness-normalize-scheme zscore \
  --json-out metrics/graph.metrics.json
```

Supported `--betweenness-domain` selectors:

- `all`, `layer0`, `layer:<L>`, `layers:<L1-L2>`, `even`, `odd`, `layers:<L1-L2>:step:<k>`, `middle`, `custom:<path>`
- `quantile:<q1-q2>`, `quantile:<q1-q2>:step:<k>`
- `layer_quantile:<width|outdeg|indeg|outdeg_median|indeg_median>:<q1-q2>`
- `layer_rank:<metric>:<top|bottom>:<k>`

Supported `--betweenness-normalize-scheme`:

- `none`, `directed`, `max`, `domain_avg`, `layer_max`, `zscore`, `domain_minmax`, `minmax_layer`, `robust_zscore`

Note: Layer‑dependent selectors and schemes require a layered DAG (i.e., `layers` and `width`). The bench emits warnings if such selectors are used without layer hints.