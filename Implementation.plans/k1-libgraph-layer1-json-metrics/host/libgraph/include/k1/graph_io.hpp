
#pragma once
// Minimal JSON I/O for k1::graph without third-party libraries.
// Supports CSR JSON format:
//   {
//     "directed": true,
//     "offsets": [0, 2, 3, ...],
//     "edges":   [1, 4, 2, ...],
//     "weights": [1.0, 1.0, 0.5, ...]  // optional, same length as edges
//   }
//
// This is a focused parser: it does not implement general JSON.
// It only extracts the specific fields above, ignoring other keys.
// Numbers may be separated by commas/whitespace. Booleans are `true`/`false`.
#include "k1/graph.hpp"
#include <string>

namespace k1::graph::io {

// Load CSR from a JSON string (format described above). Throws on parse/validation errors.
CSR load_csr_from_json_string(const std::string& json);

// Load CSR from a JSON file path.
CSR load_csr_from_json_file(const std::string& path);

// Compute basic metrics for visualization/control-app dashboards.
struct Metrics {
    bool directed = true;
    uint32_t N = 0;
    uint32_t M = 0;
    uint32_t minOut = 0;
    uint32_t maxOut = 0;
    double   avgOut = 0.0;
    bool     isDag = true;
};

// Derive metrics from a CSR (does not modify graph).
Metrics compute_metrics(const CSR& g);

// Write metrics to a JSON file (pretty-printed).
bool save_graph_metrics_json(const Metrics& m, const std::string& path);

// Write a benchmark result JSON containing topo-sort timing and graph summary.
bool save_bench_topo_json(const CSR& g, long long topo_ms, const std::string& path, const std::string& source_desc);

} // namespace k1::graph::io
