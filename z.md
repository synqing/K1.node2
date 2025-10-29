
# --- src/graph.cpp ---
cat > "$SRCDIR/graph.cpp" <<'EOF'
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
EOF

# --- include/k1/graph_io.hpp ---
cat > "$INCDIR/graph_io.hpp" <<'EOF'
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
EOF

# --- src/graph_io.cpp ---
cat > "$SRCDIR/graph_io.cpp" <<'EOF'
#include "k1/graph_io.hpp"
#include <fstream>
#include <sstream>
#include <cctype>
#include <cstring>

namespace k1::graph::io {

static inline void trim_inplace(std::string& s) {
    size_t i=0, j=s.size();
    while(i<j && std::isspace((unsigned char)s[i])) ++i;
    while(j>i && std::isspace((unsigned char)s[j-1])) --j;
    s.assign(s.substr(i, j-i));
}

static std::string extract_array_region(const std::string& json, const std::string& quoted_key) {
    const size_t kpos = json.find(quoted_key);
    if (kpos == std::string::npos) return {};
    size_t pos = json.find('[', kpos + quoted_key.size());
    if (pos == std::string::npos) return {};
    size_t depth = 0; size_t start = pos + 1;
    for (size_t i = pos; i < json.size(); ++i) {
        char c = json[i];
        if (c == '[') depth++;
        else if (c == ']') { depth--; if (depth == 0) return json.substr(start, i - start); }
    }
    return {};
}

static bool extract_bool(const std::string& json, const std::string& quoted_key, bool* out) {
    const size_t kpos = json.find(quoted_key);
    if (kpos == std::string::npos) return false;
    size_t pos = json.find(':', kpos + quoted_key.size());
    if (pos == std::string::npos) return false;
    for (size_t i = pos+1; i < json.size(); ++i) {
        char c = json[i];
        if (std::isspace((unsigned char)c) || c==',') continue;
        if (json.compare(i,4,"true")==0)  { *out = true;  return true; }
        if (json.compare(i,5,"false")==0) { *out = false; return true; }
        break;
    }
    return false;
}

template <typename T>
static std::vector<T> parse_numeric_array(const std::string& s) {
    std::vector<T> out; const char* p=s.c_str(); const char* end=p+s.size();
    while (p<end) {
        while (p<end && (std::isspace((unsigned char)*p) || *p==',')) ++p;
        if (p>=end) break;
        const char* t0=p;
        while (p<end) { char c=*p;
            if (std::isdigit((unsigned char)c) || c=='+'||c=='-'||c=='.'||c=='e'||c=='E') ++p; else break; }
        std::string tok(t0, p); trim_inplace(tok);
        if (!tok.empty()) {
            if constexpr (std::is_same<T,uint32_t>::value) {
                char* q=nullptr; unsigned long v=strtoul(tok.c_str(), &q, 10);
                if (q==tok.c_str()) throw std::runtime_error("invalid uint token: "+tok);
                out.push_back(uint32_t(v));
            } else {
                char* q=nullptr; double v=strtod(tok.c_str(), &q);
                if (q==tok.c_str()) throw std::runtime_error("invalid float token: "+tok);
                out.push_back(float(v));
            }
        }
        while (p<end && (std::isspace((unsigned char)*p) || *p==',')) ++p;
    }
    return out;
}

CSR load_csr_from_json_string(const std::string& json) {
    CSR g; bool directed=true; if (extract_bool(json, "\"directed\"", &directed)) g.directed = directed;
    const std::string offs = extract_array_region(json, "\"offsets\"");
    const std::string edgs = extract_array_region(json, "\"edges\"");
    if (offs.empty() || edgs.empty()) throw std::runtime_error("missing offsets/edges arrays");
    g.offsets = parse_numeric_array<uint32_t>(offs);
    g.edges   = parse_numeric_array<uint32_t>(edgs);
    const std::string w = extract_array_region(json, "\"weights\"");
    if (!w.empty()) g.weights = parse_numeric_array<float>(w);
    g.validate(); return g;
}

CSR load_csr_from_json_file(const std::string& path) {
    std::ifstream ifs(path);
    if (!ifs) throw std::runtime_error("cannot open: " + path);
    std::ostringstream oss; oss << ifs.rdbuf();
    return load_csr_from_json_string(oss.str());
}

Metrics compute_metrics(const CSR& g) {
    Metrics m{}; m.directed=g.directed; m.N=g.num_vertices(); m.M=g.num_edges();
    if (m.N==0){ m.minOut=m.maxOut=0; m.avgOut=0.0; m.isDag=true; return m; }
    uint64_t sum=0; uint32_t minD=std::numeric_limits<uint32_t>::max(), maxD=0;
    for (uint32_t u=0; u<m.N; ++u) {
        const uint32_t d = g.offsets[u+1] - g.offsets[u];
        sum+=d; if (d<minD) minD=d; if (d>maxD) maxD=d;
    }
    m.minOut = (minD==std::numeric_limits<uint32_t>::max())?0u:minD;
    m.maxOut = maxD; m.avgOut = double(sum)/double(m.N);
    try { (void)topo_sort(g); m.isDag=true; } catch(...) { m.isDag=false; }
    return m;
}

static bool write_file(const std::string& path, const std::string& body){
    std::ofstream ofs(path); if(!ofs) return false; ofs << body; return true;
}

bool save_graph_metrics_json(const Metrics& m, const std::string& path) {
    std::ostringstream o;
    o << "{\n"
      << "  \"directed\": " << (m.directed?"true":"false") << ",\n"
      << "  \"N\": " << m.N << ",\n"
      << "  \"M\": " << m.M << ",\n"
      << "  \"outdegree\": { \"min\": " << m.minOut << ", \"max\": " << m.maxOut << ", \"avg\": " << m.avgOut << " },\n"
      << "  \"isDag\": " << (m.isDag?"true":"false") << "\n"
      << "}\n";
    return write_file(path, o.str());
}

bool save_bench_topo_json(const CSR& g, long long topo_ms, const std::string& path, const std::string& source_desc) {
    std::ostringstream o;
    o << "{\n"
      << "  \"graph\": { \"directed\": " << (g.directed?"true":"false") << ", \"N\": " << g.num_vertices() << ", \"M\": " << g.num_edges() << " },\n"
      << "  \"topo_sort_ms\": " << topo_ms << ",\n"
      << "  \"source\": " << "\"" << source_desc << "\"\n"
      << "}\n";
    return write_file(path, o.str());
}

} // namespace k1::graph::io
EOF

# --- tests/test_main.cpp ---
cat > "$TESTDIR/test_main.cpp" <<'EOF'
#include "k1/graph.hpp"
#include <iostream>
#include <cmath>
using namespace k1::graph;

static int g_failures = 0;
#define CHECK(c) do{ if(!(c)){ std::cerr<<"CHECK failed: " #c " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } }while(0)
#define CHECK_EQ(a,b) CHECK((a)==(b))

int main(){
    GraphBuilder gb(4, true);
    gb.add_edge(0,1); gb.add_edge(0,2);
    gb.add_edge(1,2); gb.add_edge(1,3);
    gb.add_edge(2,3);
    gb.add_edge(3,1); // cycle 1<->3
    CSR g = gb.build_csr();

    auto d = bfs(g, 0);
    CHECK_EQ(d[0], 0u); CHECK_EQ(d[1], 1u); CHECK_EQ(d[2], 1u); CHECK_EQ(d[3], 2u);

    auto pre = dfs_preorder(g, 0);
    CHECK_EQ(pre.front(), 0u); CHECK(pre.size()>=1);

    auto dj = dijkstra(g, 0);
    CHECK(std::abs(dj[3]-2.0f) < 1e-6f);

    CHECK(has_cycle(g));

    auto dag = make_layered_dag(3,2,true);
    CHECK(!has_cycle(dag));
    auto topo = topo_sort(dag);
    CHECK_EQ(topo.size(), dag.num_vertices());
    std::vector<uint32_t> pos(dag.num_vertices(),0);
    for (uint32_t i=0;i<topo.size();++i) pos[topo[i]]=i;
    for (uint32_t u=0; u<dag.num_vertices(); ++u)
      for (uint32_t i=dag.offsets[u]; i<dag.offsets[u+1]; ++i)
        CHECK(pos[u] < pos[dag.edges[i]]);

    if (g_failures) std::cerr << "FAILURES: " << g_failures << "\n";
    else std::cout << "All tests passed.\n";
    return g_failures ? 1 : 0;
}
EOF

# --- tests/test_json_loader.cpp ---
cat > "$TESTDIR/test_json_loader.cpp" <<'EOF'
#include "k1/graph_io.hpp"
#include <iostream>
using namespace k1::graph;

static int g_failures = 0;
#define CHECK(c) do{ if(!(c)){ std::cerr<<"CHECK failed: " #c " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } }while(0)
#define CHECK_EQ(a,b) CHECK((a)==(b))

int main(){
    const std::string j = R"JSON({
      "directed": true,
      "offsets": [0,2,3,3],
      "edges":   [1,2,2],
      "weights": [1.0,1.0,0.5]
    })JSON";
    auto g = k1::graph::io::load_csr_from_json_string(j);
    CHECK(g.directed); CHECK_EQ(g.num_vertices(), 3u); CHECK_EQ(g.num_edges(), 3u);
    auto d = bfs(g, 0); CHECK_EQ(d[2], 1u);
    auto m = k1::graph::io::compute_metrics(g);
    CHECK(m.N==3 && m.M==3 && m.isDag==true);
    return g_failures ? 1 : 0;
}
EOF

# --- tests/bench_large.cpp ---
cat > "$TESTDIR/bench_large.cpp" <<'EOF'
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
EOF

# --- README.md ---
cat > "$LIBROOT/README.md" <<'EOF'
# K1 Layer-1 Graph Library (host/libgraph)

C++17 library with:
- CSR graph representation
- BFS / DFS(preorder) / Dijkstra
- Topological sort + cycle detection
- Layered DAG generator for scale
- **JSON loader** + **graph.metrics.json** emitter
- Bench that emits **bench.topo.json**

## Build & test
```bash
cd host/libgraph
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
Bench usage
bash
Copy code
# Generate layered DAG and write JSON artifacts
./build/k1_graph_bench --layers 200 --width 500 \
  --out ../../tools/artifacts/bench.topo.json \
  --metrics ../../tools/artifacts/graph.metrics.json

# Or load your own CSR JSON
./build/k1_graph_bench --json /path/to/graph.json \
  --out ../../tools/artifacts/bench.topo.json \
  --metrics ../../tools/artifacts/graph.metrics.json
EOF

--- .github/workflows/host-libgraph.yml ---
cat > "$WFDIR/host-libgraph.yml" <<'EOF'
name: host-libgraph
on:
push:
branches: [ main, master ]
pull_request:
branches: [ main, master ]

jobs:
build-test:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
- name: Configure
working-directory: host/libgraph
run: cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
- name: Build
working-directory: host/libgraph
run: cmake --build build -j
- name: Test
working-directory: host/libgraph
run: ctest --test-dir build --output-on-failure
EOF

echo "✓ host/libgraph created. Build with: cmake -S host/libgraph -B host/libgraph/build -DCMAKE_BUILD_TYPE=Release && cmake --build host/libgraph/build -j && ctest --test-dir host/libgraph/build"

bash
Copy code

### Verify fast
```bash
# from repo root
bash ./install_libgraph.sh   # <- paste the script into this file first
cd host/libgraph
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure

# smoke bench (creates JSON artifacts your UI can read)
./build/k1_graph_bench --layers 200 --width 500 \
  --out ../../tools/artifacts/bench.topo.json \
  --metrics ../../tools/artifacts/graph.metrics.json