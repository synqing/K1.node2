#include "k1/graph.hpp"
#include <algorithm>
#include <stack>
#include <sstream>

namespace k1::graph {

void CSR::validate() const {
    const auto N = num_vertices();
    if (offsets.size() != size_t(N + 1)) throw std::runtime_error("CSR: offsets length must be N+1");
    if (!offsets.empty() && offsets[0] != 0) throw std::runtime_error("CSR: offsets[0] must be 0");
    if (!edges.empty() && offsets.back() != edges.size()) throw std::runtime_error("CSR: offsets[N] must equal edges.size()");
    for (uint32_t u = 0; u < N; ++u) if (offsets[u] > offsets[u+1]) throw std::runtime_error("CSR: offsets must be non-decreasing");
    for (auto v : edges) if (v >= N) throw std::runtime_error("CSR: edge endpoint out of range");
    if (!weights.empty() && weights.size() != edges.size()) throw std::runtime_error("CSR: weights.size must match edges.size or be empty");
}

void GraphBuilder::add_edge(uint32_t u, uint32_t v, float w) {
    if (u >= N || v >= N) throw std::runtime_error("GraphBuilder: vertex id out of range");
    adj[u].emplace_back(v, w);
    if (!directed) adj[v].emplace_back(u, w);
}

CSR GraphBuilder::build_csr() const {
    CSR g; g.directed = directed; g.offsets.resize(N + 1, 0);
    size_t M = 0; for (uint32_t u = 0; u < N; ++u) M += adj[u].size();
    g.edges.resize(M); g.weights.resize(M);
    for (uint32_t u = 0; u < N; ++u) g.offsets[u+1] = g.offsets[u] + uint32_t(adj[u].size());
    for (uint32_t u = 0; u < N; ++u) {
        auto row = adj[u];
        std::sort(row.begin(), row.end(), [](auto& a, auto& b){ return a.first < b.first; });
        const auto start = g.offsets[u];
        for (size_t i = 0; i < row.size(); ++i) { g.edges[start + i] = row[i].first; g.weights[start + i] = row[i].second; }
    }
    g.validate(); return g;
}

std::vector<uint32_t> bfs(const CSR& g, uint32_t src) {
    g.validate(); const uint32_t N = g.num_vertices();
    if (src >= N) throw std::runtime_error("bfs: src out of range");
    std::vector<uint32_t> dist(N, INF_U32), q; q.reserve(N); size_t qh=0;
    dist[src]=0; q.push_back(src);
    while (qh<q.size()) {
        const uint32_t u = q[qh++], s = g.offsets[u], e = g.offsets[u+1];
        for (uint32_t i=s;i<e;i++){ const uint32_t v=g.edges[i]; if (dist[v]==INF_U32){ dist[v]=dist[u]+1; q.push_back(v);} }
    }
    return dist;
}

std::vector<uint32_t> dfs_preorder(const CSR& g, uint32_t src) {
    g.validate(); const uint32_t N = g.num_vertices();
    if (src >= N) throw std::runtime_error("dfs_preorder: src out of range");
    std::vector<uint8_t> seen(N,0); std::vector<uint32_t> order; order.reserve(N);
    std::vector<uint32_t> st; st.reserve(N); st.push_back(src);
    while(!st.empty()){ const uint32_t u=st.back(); st.pop_back(); if(seen[u]) continue; seen[u]=1; order.push_back(u);
        const uint32_t s=g.offsets[u], e=g.offsets[u+1]; for (int64_t i=int64_t(e)-1;i>=int64_t(s);--i) st.push_back(g.edges[size_t(i)]); }
    return order;
}

std::vector<float> dijkstra(const CSR& g, uint32_t src) {
    g.validate(); const uint32_t N=g.num_vertices(); if (src>=N) throw std::runtime_error("dijkstra: src out of range");
    using Item = std::pair<float,uint32_t>; auto cmp=[](const Item&a,const Item&b){return a.first>b.first;};
    std::priority_queue<Item,std::vector<Item>,decltype(cmp)> pq(cmp);
    std::vector<float> dist(N, INF_F32); std::vector<uint8_t> done(N,0); dist[src]=0.0f; pq.emplace(0.0f,src);
    while(!pq.empty()){ auto [du,u]=pq.top(); pq.pop(); if(done[u]) continue; done[u]=1;
        const uint32_t s=g.offsets[u], e=g.offsets[u+1];
        for(uint32_t i=s;i<e;i++){ const uint32_t v=g.edges[i]; const float w=g.has_weights()?g.weights[i]:1.0f; const float alt=du+w;
            if (alt<dist[v]){ dist[v]=alt; pq.emplace(alt,v);} } }
    return dist;
}

std::vector<uint32_t> topo_sort(const CSR& g) {
    g.validate(); const uint32_t N=g.num_vertices(); std::vector<uint32_t> indeg(N,0);
    for(uint32_t u=0;u<N;u++) for(uint32_t i=g.offsets[u]; i<g.offsets[u+1]; i++) indeg[g.edges[i]]++;
    std::vector<uint32_t> q; q.reserve(N); size_t qh=0; for(uint32_t i=0;i<N;i++) if(indeg[i]==0) q.push_back(i);
    std::vector<uint32_t> out; out.reserve(N);
    while(qh<q.size()){ const uint32_t u=q[qh++]; out.push_back(u);
        for(uint32_t i=g.offsets[u]; i<g.offsets[u+1]; i++){ const uint32_t v=g.edges[i]; if(--indeg[v]==0) q.push_back(v);} }
    if (out.size()!=N) throw std::runtime_error("topo_sort: cycle detected");
    return out;
}

bool has_cycle(const CSR& g) {
    g.validate(); const uint32_t N=g.num_vertices(); std::vector<uint8_t> color(N,0);
    std::vector<int32_t> st; st.reserve(N*2);
    auto push_children=[&](uint32_t u){ for(uint32_t i=g.offsets[u]; i<g.offsets[u+1]; i++) st.push_back(int32_t(g.edges[i])); };
    for(uint32_t s=0;s<N;s++){ if(color[s]) continue; st.clear(); st.push_back(int32_t(s));
        while(!st.empty()){ int32_t t=st.back(); st.pop_back();
            if(t<0){ color[uint32_t(~t)]=2; continue; }
            uint32_t u=uint32_t(t);
            if(color[u]==0){ color[u]=1; st.push_back(~int32_t(u)); push_children(u); }
            else if(color[u]==1){ return true; } } }
    return false;
}

CSR make_layered_dag(uint32_t layers, uint32_t width, bool directed) {
    if (layers==0 || width==0) return CSR{directed,{0},{},{}};
    const uint32_t N=layers*width; GraphBuilder gb(N, directed);
    auto id=[&](uint32_t L,uint32_t x){return L*width+x;};
    for(uint32_t L=0; L+1<layers; ++L) for(uint32_t u=0; u<width; ++u) for(uint32_t v=0; v<width; ++v) gb.add_edge(id(L,u), id(L+1,v), 1.0f);
    return gb.build_csr();
}

std::string summary(const CSR& g) {
    return std::string("CSR{ directed=") + (g.directed?"true":"false")
      + ", N=" + std::to_string(g.num_vertices())
      + ", M=" + std::to_string(g.num_edges())
      + ", weights=" + (g.has_weights()?"yes":"no") + " }";
}

} // namespace k1::graph