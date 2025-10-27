#!/usr/bin/env bash
set -euo pipefail

# install_libgraph.sh
# Paste-and-run installer aligned with z.md to build host/libgraph,
# run tests, and emit bench/metrics artifacts for the UI.

ROOT="$(pwd)"
LIBROOT="$ROOT/host/libgraph"
BUILDDIR="$LIBROOT/build"
ARTIFACTS_DIR="$ROOT/tools/artifacts"

echo "[libgraph] Ensuring artifacts directory: $ARTIFACTS_DIR"
mkdir -p "$ARTIFACTS_DIR"

if [[ ! -f "$LIBROOT/CMakeLists.txt" ]]; then
  echo "[libgraph] ERROR: $LIBROOT/CMakeLists.txt not found. Please use the content in z.md to create host/libgraph first."
  exit 1
fi

echo "[libgraph] Configure (Release)"
cmake -S "$LIBROOT" -B "$BUILDDIR" -DCMAKE_BUILD_TYPE=Release

echo "[libgraph] Build"
cmake --build "$BUILDDIR" -j

echo "[libgraph] Test"
ctest --test-dir "$BUILDDIR" --output-on-failure

echo "[libgraph] Bench (emitting bench.topo.json and graph.metrics.json)"
BENCH_BIN="$BUILDDIR/k1_graph_bench"
if [[ ! -x "$BENCH_BIN" ]]; then
  echo "[libgraph] ERROR: bench executable not found at $BENCH_BIN"
  exit 2
fi

"$BENCH_BIN" --layers 200 --width 500 \
  --out "$ARTIFACTS_DIR/bench.topo.json" \
  --metrics "$ARTIFACTS_DIR/graph.metrics.json"

echo "[libgraph] Done. Artifacts:"
echo "  - $ARTIFACTS_DIR/bench.topo.json"
echo "  - $ARTIFACTS_DIR/graph.metrics.json"