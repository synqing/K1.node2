#include "k1/graph.hpp"
#include <iostream>
#include <chrono>
#include <filesystem>
#include <fstream>

using namespace k1::graph;

int main(int argc, char** argv) {
  uint32_t layers = 200;
  uint32_t width = 500;
  std::filesystem::path jsonOut;

  // Parse args: [layers] [width] [--json-out path]
  for (int i = 1; i < argc; ++i) {
    std::string arg = argv[i];
    if (arg == "--json-out" && i + 1 < argc) {
      jsonOut = argv[++i];
    } else if (layers == 200) {
      // first positional: layers
      try { layers = static_cast<uint32_t>(std::stoul(arg)); }
      catch (...) { /* ignore malformed, keep default */ }
    } else if (width == 500) {
      // second positional: width
      try { width = static_cast<uint32_t>(std::stoul(arg)); }
      catch (...) { /* ignore malformed, keep default */ }
    }
  }

  std::cout << "[bench] generating layered DAG: layers=" << layers << ", width=" << width << "\n";
  auto g = make_layered_dag(layers, width);
  std::cout << summary(g) << "\n";

  auto t0 = std::chrono::steady_clock::now();
  auto order = topo_sort(g);
  auto t1 = std::chrono::steady_clock::now();
  (void)order;
  auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
  std::cout << "[bench] topo_sort ms=" << ms << "\n";

  // Write JSON metrics (default path if not provided)
  if (jsonOut.empty()) {
    jsonOut = std::filesystem::path("./metrics/graph.metrics.json");
  }
  try {
    auto parent = jsonOut.parent_path();
    if (!parent.empty()) {
      std::filesystem::create_directories(parent);
    }
    std::ofstream ofs(jsonOut);
    ofs << "{\n";
    ofs << "  \"nodes\": " << g.n << ",\n";
    ofs << "  \"edges\": " << g.edges.size() << ",\n";
    ofs << "  \"layers\": " << layers << ",\n";
    ofs << "  \"width\": " << width << ",\n";
    ofs << "  \"topo_time_ms\": " << ms << "\n";
    ofs << "}\n";
    ofs.close();
    std::cout << "[bench] wrote metrics JSON to: " << jsonOut.string() << "\n";
  } catch (const std::exception &e) {
    std::cerr << "[bench] failed to write JSON metrics: " << e.what() << "\n";
    return 1;
  }

  return 0;
}