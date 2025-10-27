#include "k1/graph.hpp"
#include "k1/graph_io.hpp"
#include <chrono>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <string>
#include <vector>
using namespace k1::graph;

static std::string arg_or(const std::vector<std::string>& args, const std::string& key, const std::string& def) {
    for (size_t i=0;i+1<args.size();++i) if (args[i]==key) return args[i+1];
    return def;
}
static bool has_flag(const std::vector<std::string>& args, const std::string& key) {
    for (auto& a: args) if (a==key) return true;
    return false;
}

int main(int argc, char** argv) {
    std::vector<std::string> args; for (int i=1;i<argc;i++) args.emplace_back(argv[i]);
    uint32_t layers=200, width=500;
    std::string jsonPath = arg_or(args, "--json", "");
    std::string outBench = arg_or(args, "--out", "bench.topo.json");
    std::string outMetrics = arg_or(args, "--metrics", "graph.metrics.json");
    // Betweenness controls
    uint32_t betw_samples = 0;
    uint32_t betw_top_k = 0;
    bool betw_normalize = false;
    std::string betw_norm_scheme = arg_or(args, "--betweenness-normalize-scheme", "");
    std::string betw_domain = arg_or(args, "--betweenness-domain", "all");
    bool betw_random = false; uint32_t betw_seed = 0;
    if (has_flag(args, "--betweenness-samples")) { std::istringstream(arg_or(args, "--betweenness-samples", "0")) >> betw_samples; }
    if (has_flag(args, "--betweenness-top-k"))   { std::istringstream(arg_or(args, "--betweenness-top-k", "0")) >> betw_top_k; }
    betw_normalize = has_flag(args, "--betweenness-normalize");
    if (has_flag(args, "--betweenness-seed")) { std::istringstream(arg_or(args, "--betweenness-seed", "0")) >> betw_seed; betw_random=true; }

    CSR g;
    std::string sourceDesc;
    bool generated = false;
    if (!jsonPath.empty()) {
        try { g = k1::graph::io::load_csr_from_json_file(jsonPath); }
        catch (const std::exception& e){ std::cerr << "Failed to load JSON graph: " << e.what() << "\n"; return 3; }
        sourceDesc = std::string("json:")+jsonPath;
    } else {
        if (has_flag(args,"--layers")) { std::istringstream(arg_or(args,"--layers","200")) >> layers; }
        if (has_flag(args,"--width"))  { std::istringstream(arg_or(args,"--width","500"))  >> width; }
        g = make_layered_dag(layers, width, true);
        generated = true;
        std::ostringstream ss; ss << "generated:layers=" << layers << ",width=" << width; sourceDesc = ss.str();
    }

    std::cout << "Graph: " << summary(g) << "\n";

    auto t0 = std::chrono::steady_clock::now();
    try { auto order = topo_sort(g); (void)order; }
    catch (const std::exception& e){ std::cerr << "Topo failed: " << e.what() << "\n"; return 2; }
    auto t1 = std::chrono::steady_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1-t0).count();
    std::cout << "Topological sort time: " << ms << " ms\n";

    if (!k1::graph::io::save_bench_topo_json(g, ms, outBench, sourceDesc)) std::cerr << "Warning: could not write " << outBench << "\n";
    k1::graph::io::MetricsOptions opts{};
    opts.betweenness_samples = betw_samples;
    opts.betweenness_top_k = betw_top_k;
    opts.betweenness_domain = betw_domain;
    opts.betweenness_normalize = betw_normalize;
    opts.betweenness_norm_scheme = betw_norm_scheme;
    opts.use_random_sampling = betw_random;
    opts.betweenness_seed = betw_seed;
    if (generated) { opts.layer_width = width; opts.layer_count = layers; }
    // Back-compat: if normalize flag is set and no scheme provided, use directed
    if (opts.betweenness_normalize && opts.betweenness_norm_scheme.empty()) opts.betweenness_norm_scheme = "directed";
    // Warn if an explicit layer is requested but we don't have layer hints
    auto needs_layer_hints = [&](const std::string& d){
        return (d.rfind("layer:",0)==0) || (d.rfind("layers:",0)==0) || (d.rfind("quantile:",0)==0) || (d.rfind("layer_quantile:",0)==0) || (d.rfind("layer_rank:",0)==0) || d=="even" || d=="odd" || d=="layer0" || d=="middle";
    };
    if (needs_layer_hints(betw_domain) && !generated) {
        std::cerr << "Note: --betweenness-domain '" << betw_domain << "' assumes layered indexing; falling back to 'all' pool.\n";
    }
    auto metrics = k1::graph::io::compute_metrics(g, opts);
    if (!k1::graph::io::save_graph_metrics_json(metrics, outMetrics)) std::cerr << "Warning: could not write " << outMetrics << "\n";
    if (metrics.betweenness_sample_count > 0) {
        std::cout << "Betweenness time: " << metrics.betweenness_ms << " ms\n";
    }

    const size_t bytes = g.offsets.size()*sizeof(uint32_t) + g.edges.size()*sizeof(uint32_t) + g.weights.size()*sizeof(float);
    const double mb = double(bytes) / (1024.0*1024.0);
    std::cout << "Approx CSR memory: " << std::fixed << std::setprecision(2) << mb << " MB\n";
    return 0;
}