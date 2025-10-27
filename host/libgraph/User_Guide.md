# K1 libgraph – Comprehensive User Guide

This guide provides a technically verbose walkthrough of `libgraph` — its architecture, API, algorithms, layered DAG generator, benchmarking tool, JSON metrics schema, CI integration, and usage patterns. It is intended for engineers integrating graph algorithms at Layer‑1 and for teams consuming the generated metrics in higher layers and dashboards.

## Overview

- Library: `k1_libgraph` (static) providing iterative, dependency‑free graph algorithms.
- Core representation: Compressed Sparse Row (CSR) for directed graphs.
- Algorithms: BFS, DFS (preorder), Dijkstra (non‑negative weights), Kahn’s topological sort, cycle detection (color method).
- Generator: Deterministic layered DAG builder for testing and benchmarking.
- Bench: `k1_graph_bench` executable to generate a layered DAG, run topo sort, and emit comprehensive JSON metrics.
- Build: CMake; tests via CTest; CI via GitHub Actions.

## Architecture

- CSR structure: `n` nodes; `offsets` size `n+1`; `edges` size `m`.
  - For node `u`, its outgoing neighbors are in `edges[offsets[u]..offsets[u+1]-1]`.
  - Memory‑local, cache‑friendly adjacency iteration; O(1) degree queries; O(deg(u)) neighbor traverse.
- GraphBuilder: convenience to construct CSR graphs.
- Iterative algorithms: avoid recursion to be stack‑safe and predictable on embedded/constrained targets.

## Public API Surface

Header: `host/libgraph/include/k1/graph.hpp`

- `struct CSR { uint32_t n; std::vector<uint32_t> offsets; std::vector<uint32_t> edges; }`
- `GraphBuilder` with `add_edge(u,v)` and `build(n)`
- Algorithms:
  - `std::vector<uint32_t> bfs(const CSR& g, uint32_t src)`
  - `std::vector<uint32_t> dfs_preorder(const CSR& g, uint32_t src)`
  - `std::vector<uint32_t> dijkstra(const CSR& g, uint32_t src, const std::vector<uint32_t>& weights)`
  - `std::vector<uint32_t> topo_sort(const CSR& g)`
  - `bool has_cycle(const CSR& g)`
- Generators & Utils:
  - `CSR make_layered_dag(uint32_t layers, uint32_t width)`
  - `std::string summary(const CSR& g)`

All algorithms are O(n+m) except Dijkstra which is O((n+m) log n) with a binary heap.

## Building and Testing

- Configure: `cmake -S host/libgraph -B host/libgraph/build -DCMAKE_BUILD_TYPE=Release`
- Build: `cmake --build host/libgraph/build -j`
- Tests: `ctest --test-dir host/libgraph/build --output-on-failure`

Targets:
- `k1_graph`: static library (`libk1_graph.a`)
- `k1_graph_tests`: unit tests
- `k1_graph_bench`: benchmark and metrics generator

## Layered DAG Generator

- Parameters: `layers` (L), `width` (W)
- Nodes: `n = L * W`; indexing is contiguous by layer: node `u` has layer `u / W`.
- Edges: fully bipartite between adjacent layers: for every `i` in `[0..L-2]`, edges connect all `W` nodes in layer `i` to all `W` nodes in layer `i+1`.
- Properties:
  - Directed acyclic; no intra‑layer edges; no layer skipping.
  - Out‑degree per node: `W` for layers `[0..L-2]`, otherwise 0 for last layer.
  - In‑degree per node: `W` for layers `[1..L-1]`, otherwise 0 for layer 0.
  - Longest path length: `L - 1`.

## Benchmark CLI

- Executable: `host/libgraph/build/k1_graph_bench`
- Usage: `k1_graph_bench [layers] [width] [--json-out path]`
  - Defaults: `layers=200`, `width=500`
  - Default JSON path (when `--json-out` is not provided): `./metrics/graph.metrics.json`
  - Ensures parent directories exist; overwrites existing file.

Actions:
- Generates layered DAG with given `layers` and `width`.
- Runs Kahn’s `topo_sort` and times it (milliseconds).
- Computes a comprehensive set of metrics and writes JSON to the output path.

Example:
```
./host/libgraph/build/k1_graph_bench 12 34 --json-out host/libgraph/build/metrics/graph.metrics.json
```

## JSON Metrics Schema

All fields are present for layered DAGs. Types shown as JSON types; numeric values may be integers or floats depending on calculation.

- Topology & Params
  - `nodes` (number): total nodes, `layers * width`
  - `edges` (number): total edges, `(layers-1) * width * width`
  - `layers` (number): input layers
  - `width` (number): input layer width
  - `topo_time_ms` (number): duration for topological sort in milliseconds
  - `topo_valid` (boolean): topo order respects edge directions
  - `has_cycle` (boolean): cycle detection — should be `false` for DAGs

- Degree Statistics
  - `edges_per_node` (number): `edges / nodes`
  - `avg_out_degree` (number)
  - `avg_in_degree` (number)
  - `min_out_degree` (number)
  - `max_out_degree` (number)
  - `min_in_degree` (number)
  - `max_in_degree` (number)
  - `stddev_out_degree` (number): standard deviation over out‑degrees
  - `stddev_in_degree` (number): standard deviation over in‑degrees
  - `num_sources` (number): nodes with in‑degree 0
  - `num_sinks` (number): nodes with out‑degree 0

- Connectivity & Distribution
  - `density` (number): `edges / ((layers-1) * width^2)`; equals 1 for fully bipartite layered DAG
  - `edges_by_layer_pair` (array[number]): edges between each adjacent layer pair
  - `layer_out_degree_avg` (array[number]): per‑layer average out‑degree
  - `layer_in_degree_avg` (array[number]): per‑layer average in‑degree

- Path Depth Metrics
  - `dag_longest_path_len` (number): longest path length via DP on topo order
  - `depth_histogram` (array[number]): counts by longest‑path distance (critical depth)
  - `shortest_depth_histogram` (array[number]): counts by shortest‑path distance from layer 0
  - `unreachable_count` (number): nodes not reachable from layer 0 (should be 0 for layered DAG)

- Reachability
  - `reachable_counts_from_layer0_by_layer` (array[number]): forward reachability counts per layer from sources
  - `reachable_counts_to_sinks_by_layer` (array[number]): reverse reachability counts per layer to sinks
  - `reachable_ratio_from_layer0_by_layer` (array[number]): counts normalized by `nodes_per_layer`
  - `reachable_ratio_to_sinks_by_layer` (array[number]): counts normalized by `nodes_per_layer`

- Closeness‑Style Distances
  - `avg_shortest_distance_from_sources` (number): over all reachable nodes
  - `avg_shortest_distance_to_sinks` (number): over all nodes with path to sinks
  - `avg_shortest_distance_from_sources_by_layer` (array[number])
  - `avg_shortest_distance_to_sinks_by_layer` (array[number])

- Degree Centrality Approximations
  - `layer_out_degree_centrality_avg` (array[number]): per‑layer normalized (`out_degree / width`)
  - `layer_in_degree_centrality_avg` (array[number]): per‑layer normalized (`in_degree / width`)
  - `global_out_degree_centrality_avg` (number): node‑weighted average over layers
  - `global_in_degree_centrality_avg` (number): node‑weighted average over layers

## Using the Library

### Constructing Graphs with GraphBuilder
```cpp
#include "k1/graph.hpp"
using namespace k1::graph;

GraphBuilder gb;
gb.add_edge(0, 1);
gb.add_edge(1, 2);
gb.add_edge(0, 2);
CSR g = gb.build(3); // n = 3
```

### BFS / DFS Preorder
```cpp
auto bfs_order = bfs(g, /*src=*/0);
auto dfs_order = dfs_preorder(g, /*src=*/0);
```

### Dijkstra (non‑negative weights)
```cpp
// weights must have size = g.edges.size()
std::vector<uint32_t> weights(g.edges.size(), 1); // unit weights
auto dist = dijkstra(g, /*src=*/0, weights);
```

### Topological Sort / Cycle Detection
```cpp
auto topo = topo_sort(g);
bool cyclic = has_cycle(g);
```

### Generate a Layered DAG
```cpp
CSR dag = make_layered_dag(/*layers=*/12, /*width=*/34);
```

## Benchmark and Metrics Workflow

1. Build the bench target.
2. Run with desired parameters; choose output path or rely on default.
3. Consume `graph.metrics.json` in CI or tooling.

Example end‑to‑end:
```
cmake -S host/libgraph -B host/libgraph/build -DCMAKE_BUILD_TYPE=Release
cmake --build host/libgraph/build -j
./host/libgraph/build/k1_graph_bench 12 34 --json-out host/libgraph/build/metrics/graph.metrics.json
cat host/libgraph/build/metrics/graph.metrics.json
```

## CI Integration

- Workflow: `.github/workflows/host-libgraph.yml`
- Steps:
  - Configure & build the library and tests.
  - Run CTest.
  - Run benchmark with `--json-out host/libgraph/build/metrics/graph.metrics.json`.
  - Upload artifact `libgraph-metrics` containing the JSON.

Use CI artifacts to compare runs across commits, track regressions, and visualize topology characteristics.

## Performance Characteristics

- CSR adjacency iteration is sequential; cache behavior is favorable on modern CPUs.
- Algorithms are iterative; avoid recursion depth issues.
- Complexity:
  - BFS/DFS/Topo/Cycle: O(n + m)
  - Dijkstra: O((n + m) log n)
  - Metrics passes: multiple O(n + m) scans (degree aggregation, reachability, path DP).
- Memory:
  - CSR: `offsets` (~n), `edges` (~m), optional working vectors of size ~n and ~m.

## Interpretation Guide

- Depth (`dag_longest_path_len`, `depth_histogram`): critical path and parallelism limits.
- Shortest depth & closeness: minimum hop accessibility; centrality of layers relative to sources/sinks.
- Degree stats: branching/aggregation; imbalance detection via min/max and stddev.
- Reachability ratios: normalized connectivity quality per layer.
- Density and edges_by_layer_pair: saturation or sparsity signals.
- Validation flags: sanity checks — `has_cycle=false` and `topo_valid=true` expected.

## Extensibility

- Additional metrics:
  - Betweenness approximation via sampling (source–target pairs on shortest paths).
  - Path count DP per node/layer (number of distinct paths to/from sources/sinks).
  - Per‑node centrality exports (gated by CLI args to manage output size).
- Generator variants:
  - Random sparsification per layer pair.
  - Skip‑layer edges; weighted edges.

## Known Limitations

- Dijkstra assumes non‑negative weights.
- Layered DAG generator is fully bipartite between adjacent layers; density is 1 by design unless modified.
- Metrics make assumptions about layered indexing (`u / width` → layer). For arbitrary graphs, adapt metrics accordingly.

## Troubleshooting

- Empty metrics file: ensure the output directory exists or let the bench create it.
- `topo_valid=false` or `has_cycle=true` on layered DAG: indicates generator or mutation bug.
- Unexpected zeros in ratios: check reachability seeds (layer 0 for forward, last layer for reverse).

## Frequently Asked Questions

- Can I use these algorithms for undirected graphs?
  - Yes, represent undirected edges as two directed edges.
- How do I attach weights?
  - Dijkstra takes a `weights` vector aligned to `edges`.
- How do I handle large graphs?
  - Prefer Release builds; be mindful of memory; algorithms scale linearly.

## References

- CSR representation – classic adjacency layout for sparse graphs.
- Kahn’s algorithm – topological sorting via in‑degree queue.
- Iterative color method – cycle detection in directed graphs.

---

For support and evolution requests (new metrics, generators, or output schemas), open an issue or extend `bench_large.cpp` with guarded CLI options to manage compute and output size.
### Betweenness Controls

Betweenness centrality is approximated by sampling source nodes and running an unweighted shortest-path based accumulation (Brandes). The following flags control the computation:

- `--betweenness-samples <N>`: number of sampled sources; enables betweenness when `N > 0`.
- `--betweenness-domain <all|layer0>`: source sampling domain.
  - `all`: sample from all nodes.
  - `layer0`: sample only nodes with indegree 0 (sources in layered DAGs).
- `--betweenness-top-k <N>`: trim the output list to top `N` nodes by score; `0` includes all.
- `--betweenness-normalize`: normalize scores into `[0,1]` using directed normalization `(N-1)*(N-2)`.
- `--betweenness-seed <int>`: enable reproducible randomized sampling of sources; omit for deterministic round-robin.

Example:
```
./host/libgraph/build/k1_graph_bench --layers 12 --width 34 \
  --betweenness-samples 16 --betweenness-domain layer0 --betweenness-top-k 5 \
  --betweenness-normalize --betweenness-seed 42 \
  --metrics ./metrics/graph.metrics.json --out ./metrics/bench.topo.json
```

### JSON Fields (Betweenness)

When betweenness is enabled, the metrics JSON includes:
- `betweenness_sample_count` (number)
- `betweenness_domain` (`"all"|"layer0"`)
- `betweenness_top_k` (number)
- `betweenness_normalized` (boolean)
- `betweenness_sampling` (`"random"|"deterministic"`)
- `betweenness_seed` (number; present only when randomized)
- `betweenness_ms` (number; milliseconds to compute betweenness)
- `betweenness_top_nodes` (array of `{node, score}` objects, sorted by `score` desc)