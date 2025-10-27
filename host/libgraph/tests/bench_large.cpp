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

    CSR g;
    std::string sourceDesc;
    if (!jsonPath.empty()) {
        try { g = k1::graph::io::load_csr_from_json_file(jsonPath); }
        catch (const std::exception& e){ std::cerr << "Failed to load JSON graph: " << e.what() << "\n"; return 3; }
        sourceDesc = std::string("json:")+jsonPath;
    } else {
        if (has_flag(args,"--layers")) { std::istringstream(arg_or(args,"--layers","200")) >> layers; }
        if (has_flag(args,"--width"))  { std::istringstream(arg_or(args,"--width","500"))  >> width; }
        g = make_layered_dag(layers, width, true);
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
    auto metrics = k1::graph::io::compute_metrics(g);
    if (!k1::graph::io::save_graph_metrics_json(metrics, outMetrics)) std::cerr << "Warning: could not write " << outMetrics << "\n";

    const size_t bytes = g.offsets.size()*sizeof(uint32_t) + g.edges.size()*sizeof(uint32_t) + g.weights.size()*sizeof(float);
    const double mb = double(bytes) / (1024.0*1024.0);
    std::cout << "Approx CSR memory: " << std::fixed << std::setprecision(2) << mb << " MB\n";
    return 0;
}