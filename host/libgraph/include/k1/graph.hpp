#pragma once

#include <cstdint>
#include <vector>
#include <string>
#include <stdexcept>
#include <limits>

namespace k1 {
namespace graph {

static constexpr uint32_t INF_U32 = std::numeric_limits<uint32_t>::max();

struct CSR {
  uint32_t n{0};
  std::vector<uint32_t> offsets;   // size n+1
  std::vector<uint32_t> edges;     // adjacency concatenation
  std::vector<float> weights;      // optional, parallel to edges
  bool directed{true};

  void validate() const {
    if (offsets.size() != static_cast<size_t>(n) + 1) {
      throw std::invalid_argument("CSR: offsets size must be n+1");
    }
    if (offsets.front() != 0) {
      throw std::invalid_argument("CSR: offsets[0] must be 0");
    }
    if (offsets.back() != edges.size()) {
      throw std::invalid_argument("CSR: offsets[n] must equal edges.size()");
    }
    for (size_t i = 1; i < offsets.size(); ++i) {
      if (offsets[i] < offsets[i-1]) {
        throw std::invalid_argument("CSR: offsets must be non-decreasing");
      }
    }
    for (auto v : edges) {
      if (v >= n) throw std::invalid_argument("CSR: edge endpoint out of range");
    }
    if (!weights.empty() && weights.size() != edges.size()) {
      throw std::invalid_argument("CSR: weights.size() must match edges.size() when provided");
    }
  }

  // helper to iterate neighbors of u: [offsets[u], offsets[u+1])
  inline std::pair<uint32_t,uint32_t> neighbors(uint32_t u) const {
    return { offsets[u], offsets[u+1] };
  }
};

struct Edge { uint32_t u; uint32_t v; float w; };

struct GraphBuilder {
  bool directed{true};
  std::vector<Edge> edges;

  void add_edge(uint32_t u, uint32_t v, float w = 1.0f) {
    edges.push_back({u,v,w});
    if (!directed) edges.push_back({v,u,w});
  }

  CSR build(uint32_t n) const {
    CSR g; g.n = n; g.directed = directed;
    g.offsets.assign(n+1, 0);
    // count degrees
    for (const auto &e : edges) {
      if (e.u >= n || e.v >= n) throw std::invalid_argument("GraphBuilder: vertex out of range");
      g.offsets[e.u+1]++;
    }
    // prefix sum
    for (uint32_t i = 1; i <= n; ++i) g.offsets[i] += g.offsets[i-1];
    g.edges.assign(g.offsets.back(), 0);
    g.weights.assign(g.offsets.back(), 1.0f);
    std::vector<uint32_t> cursor = g.offsets;
    for (const auto &e : edges) {
      uint32_t idx = cursor[e.u]++;
      g.edges[idx] = e.v;
      g.weights[idx] = e.w;
    }
    g.validate();
    return g;
  }
};

// Algorithms
std::vector<uint32_t> bfs(const CSR &g, uint32_t src);
std::vector<uint32_t> dfs_preorder(const CSR &g, uint32_t src);
std::vector<float> dijkstra(const CSR &g, uint32_t src);
std::vector<uint32_t> topo_sort(const CSR &g);
bool has_cycle(const CSR &g);

// Generator
CSR make_layered_dag(uint32_t layers, uint32_t width);

// Summary helper
std::string summary(const CSR &g);

} // namespace graph
} // namespace k1