#pragma once
#include "k1/graph.hpp"
#include <string>

namespace k1::graph::io {

// Load CSR from JSON (focused parser; expects keys: directed, offsets, edges, weights?).
CSR load_csr_from_json_string(const std::string& json);
CSR load_csr_from_json_file(const std::string& path);

// Options to control metrics computation (betweenness sampling domain and normalization).
struct MetricsOptions {
    uint32_t betweenness_samples = 0;     // 0 disables betweenness
    std::string betweenness_domain = "all"; // "all" or "layer0"
    uint32_t betweenness_top_k = 0;       // 0 => include all
    bool betweenness_normalize = false;   // normalize scores into [0,1]
    bool use_random_sampling = false;     // choose random sources
    uint32_t betweenness_seed = 0;        // valid when use_random_sampling=true
};

// Metrics for dashboards/control UI.
struct Metrics {
    bool directed = true;
    uint32_t N = 0;
    uint32_t M = 0;
    uint32_t minOut = 0;
    uint32_t maxOut = 0;
    double   avgOut = 0.0;
    bool     isDag = true;

    // Betweenness summary (optional; present when betweenness_samples>0)
    uint32_t betweenness_sample_count = 0;
    std::string betweenness_domain;
    uint32_t betweenness_top_k = 0;
    bool betweenness_normalized = false;
    bool betweenness_randomized = false;
    uint32_t betweenness_seed = 0; // valid if randomized
    long long betweenness_ms = 0; // wall-clock time to compute betweenness
    std::vector<std::pair<uint32_t,double>> betweenness_top_nodes; // sorted desc by score
};

Metrics compute_metrics(const CSR& g);
Metrics compute_metrics(const CSR& g, const MetricsOptions& opts);
bool    save_graph_metrics_json(const Metrics& m, const std::string& path);
bool    save_bench_topo_json(const CSR& g, long long topo_ms, const std::string& path, const std::string& source_desc);

} // namespace k1::graph::io
