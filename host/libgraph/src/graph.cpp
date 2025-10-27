#include "k1/graph.hpp"
#include <queue>
#include <stack>
#include <algorithm>
#include <sstream>

namespace k1 { namespace graph {

std::vector<uint32_t> bfs(const CSR &g, uint32_t src) {
  g.validate();
  if (src >= g.n) throw std::invalid_argument("bfs: src out of range");
  std::vector<uint32_t> dist(g.n, INF_U32);
  std::queue<uint32_t> q;
  dist[src] = 0; q.push(src);
  while (!q.empty()) {
    uint32_t u = q.front(); q.pop();
    auto [beg,end] = g.neighbors(u);
    for (uint32_t i = beg; i < end; ++i) {
      uint32_t v = g.edges[i];
      if (dist[v] == INF_U32) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist;
}

std::vector<uint32_t> dfs_preorder(const CSR &g, uint32_t src) {
  g.validate();
  if (src >= g.n) throw std::invalid_argument("dfs_preorder: src out of range");
  std::vector<uint8_t> seen(g.n, 0);
  std::vector<uint32_t> order;
  std::stack<uint32_t> st;
  st.push(src);
  while (!st.empty()) {
    uint32_t u = st.top(); st.pop();
    if (seen[u]) continue;
    seen[u] = 1;
    order.push_back(u);
    auto [beg,end] = g.neighbors(u);
    // push neighbors in reverse for stable-ish ordering
    for (uint32_t i = end; i > beg; --i) {
      st.push(g.edges[i-1]);
    }
  }
  return order;
}

std::vector<float> dijkstra(const CSR &g, uint32_t src) {
  g.validate();
  if (src >= g.n) throw std::invalid_argument("dijkstra: src out of range");
  struct Node { uint32_t v; float d; };
  struct Cmp { bool operator()(const Node &a, const Node &b) const { return a.d > b.d; } };
  std::priority_queue<Node, std::vector<Node>, Cmp> pq;
  std::vector<float> dist(g.n, std::numeric_limits<float>::infinity());
  dist[src] = 0.0f; pq.push({src, 0.0f});
  while (!pq.empty()) {
    Node cur = pq.top(); pq.pop();
    if (cur.d != dist[cur.v]) continue;
    auto [beg,end] = g.neighbors(cur.v);
    for (uint32_t i = beg; i < end; ++i) {
      uint32_t v = g.edges[i]; float w = g.weights.empty() ? 1.0f : g.weights[i];
      if (w < 0.0f) throw std::invalid_argument("dijkstra: negative weight encountered");
      float nd = cur.d + w;
      if (nd < dist[v]) { dist[v] = nd; pq.push({v, nd}); }
    }
  }
  return dist;
}

std::vector<uint32_t> topo_sort(const CSR &g) {
  g.validate();
  // Kahn's algorithm
  std::vector<uint32_t> indeg(g.n, 0);
  for (uint32_t u = 0; u < g.n; ++u) {
    auto [beg,end] = g.neighbors(u);
    for (uint32_t i = beg; i < end; ++i) indeg[g.edges[i]]++;
  }
  std::queue<uint32_t> q;
  for (uint32_t v = 0; v < g.n; ++v) if (indeg[v] == 0) q.push(v);
  std::vector<uint32_t> order; order.reserve(g.n);
  while (!q.empty()) {
    uint32_t u = q.front(); q.pop();
    order.push_back(u);
    auto [beg,end] = g.neighbors(u);
    for (uint32_t i = beg; i < end; ++i) {
      uint32_t v = g.edges[i];
      if (--indeg[v] == 0) q.push(v);
    }
  }
  if (order.size() != g.n) throw std::runtime_error("topo_sort: cycle detected");
  return order;
}

bool has_cycle(const CSR &g) {
  g.validate();
  // Iterative color method: 0=white,1=gray,2=black
  std::vector<uint8_t> color(g.n, 0);
  std::vector<uint32_t> it(g.n, 0);
  std::stack<uint32_t> st;
  for (uint32_t start = 0; start < g.n; ++start) {
    if (color[start]) continue;
    st.push(start);
    while (!st.empty()) {
      uint32_t u = st.top();
      if (color[u] == 0) {
        color[u] = 1;
        it[u] = g.offsets[u];
      }
      auto end = g.offsets[u+1];
      if (it[u] == end) {
        color[u] = 2; st.pop(); continue;
      }
      uint32_t v = g.edges[it[u]++];
      if (color[v] == 1) return true;      // back edge
      if (color[v] == 0) st.push(v);
    }
  }
  return false;
}

CSR make_layered_dag(uint32_t layers, uint32_t width) {
  if (layers == 0 || width == 0) throw std::invalid_argument("make_layered_dag: layers/width must be > 0");
  uint32_t n = layers * width;
  GraphBuilder gb; gb.directed = true;
  auto idx = [width](uint32_t L, uint32_t i){ return L*width + i; };
  for (uint32_t L = 0; L + 1 < layers; ++L) {
    for (uint32_t i = 0; i < width; ++i) {
      for (uint32_t j = 0; j < width; ++j) {
        gb.add_edge(idx(L,i), idx(L+1,j), 1.0f);
      }
    }
  }
  return gb.build(n);
}

std::string summary(const CSR &g) {
  std::ostringstream os;
  os << "CSR(n=" << g.n
     << ", edges=" << g.edges.size()
     << ", directed=" << (g.directed ? "true" : "false")
     << ")";
  return os.str();
}

} } // namespace k1::graph