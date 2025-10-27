#pragma once
#include "k1/graph.hpp"
#include <string>

namespace k1::graph::io {

// Load CSR from JSON (focused parser; expects keys: directed, offsets, edges, weights?).
CSR load_csr_from_json_string(const std::string& json);
CSR load_csr_from_json_file(const std::string& path);

// Metrics for dashboards/control UI.
struct Metrics {
    bool directed = true;
    uint32_t N = 0;
    uint32_t M = 0;
    uint32_t minOut = 0;
    uint32_t maxOut = 0;
    double   avgOut = 0.0;
    bool     isDag = true;
};

Metrics compute_metrics(const CSR& g);
bool    save_graph_metrics_json(const Metrics& m, const std::string& path);
bool    save_bench_topo_json(const CSR& g, long long topo_ms, const std::string& path, const std::string& source_desc);

} // namespace k1::graph::io
