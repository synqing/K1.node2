# K1 Layer-1 Graph Library (host/libgraph)

C++17 library with:
- CSR graph representation
- BFS / DFS(preorder) / Dijkstra
- Topological sort + cycle detection
- Layered DAG generator for scale
- **JSON loader** + **graph.metrics.json** emitter
- Bench that emits **bench.topo.json**

## Build & test
```bash
cd host/libgraph
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
Bench usage
bash
Copy code
# Generate layered DAG and write JSON artifacts
./build/k1_graph_bench --layers 200 --width 500 \
  --out ../../tools/artifacts/bench.topo.json \
  --metrics ../../tools/artifacts/graph.metrics.json

# Or load your own CSR JSON
./build/k1_graph_bench --json /path/to/graph.json \
  --out ../../tools/artifacts/bench.topo.json \
  --metrics ../../tools/artifacts/graph.metrics.json
```