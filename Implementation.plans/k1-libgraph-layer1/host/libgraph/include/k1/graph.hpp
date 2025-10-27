
#pragma once
#include <cstdint>
#include <vector>
#include <stdexcept>
#include <limits>
#include <queue>
#include <string>

namespace k1::graph {

constexpr uint32_t INF_U32 = std::numeric_limits<uint32_t>::max();
constexpr float    INF_F32 = std::numeric_limits<float>::infinity();

struct CSR {
    bool directed = true;
    std::vector<uint32_t> offsets;
    std::vector<uint32_t> edges;
    std::vector<float>    weights;

    [[nodiscard]] uint32_t num_vertices() const {
        if (offsets.empty()) return 0;
        return static_cast<uint32_t>(offsets.size() - 1);
    }
    [[nodiscard]] uint32_t num_edges() const {
        return static_cast<uint32_t>(edges.size());
    }
    void validate() const;
    [[nodiscard]] bool has_weights() const {
        return !weights.empty() && weights.size() == edges.size();
    }
};

struct GraphBuilder {
    bool directed = true;
    uint32_t N = 0;
    std::vector<std::vector<std::pair<uint32_t,float>>> adj;
    explicit GraphBuilder(uint32_t n=0, bool dir=true) : directed(dir), N(n), adj(n) {}
    void add_edge(uint32_t u, uint32_t v, float w = 1.0f);
    CSR  build_csr() const;
};

std::vector<uint32_t> bfs(const CSR& g, uint32_t src);
std::vector<uint32_t> dfs_preorder(const CSR& g, uint32_t src);
std::vector<float> dijkstra(const CSR& g, uint32_t src);
std::vector<uint32_t> topo_sort(const CSR& g);
bool has_cycle(const CSR& g);

CSR make_layered_dag(uint32_t layers, uint32_t width, bool directed = true);
std::string summary(const CSR& g);

} // namespace k1::graph
