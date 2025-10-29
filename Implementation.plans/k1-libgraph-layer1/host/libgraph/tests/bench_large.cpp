
#include "k1/graph.hpp"
#include <chrono>
#include <iostream>
#include <sstream>
#include <iomanip>
using namespace k1::graph;

int main(int argc, char** argv) {
    uint32_t layers = 200;
    uint32_t width  = 500;
    if (argc >= 3) {
        std::istringstream(argv[1]) >> layers;
        std::istringstream(argv[2]) >> width;
    }
    auto g = make_layered_dag(layers, width, true);
    std::cout << "Graph: " << summary(g) << "\n";

    auto t0 = std::chrono::steady_clock::now();
    auto order = topo_sort(g);
    auto t1 = std::chrono::steady_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
    std::cout << "Topological sort time: " << ms << " ms\n";

    size_t bytes = g.offsets.size()*sizeof(uint32_t) + g.edges.size()*sizeof(uint32_t) + g.weights.size()*sizeof(float);
    double mb = static_cast<double>(bytes) / (1024.0*1024.0);
    std::cout << "Approx CSR memory: " << std::fixed << std::setprecision(2) << mb << " MB\n";
    (void)order;
    return 0;
}
