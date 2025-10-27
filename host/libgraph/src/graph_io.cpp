#include "k1/graph_io.hpp"
#include <fstream>
#include <sstream>
#include <cctype>
#include <cstring>
#include <random>

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
    return compute_metrics(g, MetricsOptions{});
}

static std::vector<uint32_t> compute_indeg(const CSR& g) {
    const uint32_t N=g.num_vertices(); std::vector<uint32_t> indeg(N,0);
    for(uint32_t u=0;u<N;u++) for(uint32_t i=g.offsets[u]; i<g.offsets[u+1]; i++) indeg[g.edges[i]]++;
    return indeg;
}

// Brandes betweenness centrality for directed, unweighted graphs; returns CB over all nodes.
static std::vector<double> brandes_betweenness(const CSR& g, const std::vector<uint32_t>& sources) {
    const uint32_t N=g.num_vertices();
    std::vector<double> CB(N, 0.0);
    std::vector<uint32_t> dist(N), sigma(N);
    std::vector<double> delta(N);
    std::vector<std::vector<uint32_t>> P(N);
    std::vector<uint32_t> Q; Q.reserve(N);
    std::vector<uint32_t> S; S.reserve(N);
    for (uint32_t s : sources) {
        // init
        for(uint32_t i=0;i<N;i++){ P[i].clear(); dist[i]=std::numeric_limits<uint32_t>::max(); sigma[i]=0; delta[i]=0.0; }
        dist[s]=0; sigma[s]=1; Q.clear(); S.clear(); Q.push_back(s);
        size_t qh=0;
        while (qh<Q.size()) {
            uint32_t v=Q[qh++]; S.push_back(v);
            const uint32_t beg=g.offsets[v], end=g.offsets[v+1];
            for(uint32_t ei=beg; ei<end; ++ei){ uint32_t w=g.edges[ei];
                if (dist[w]==std::numeric_limits<uint32_t>::max()) { dist[w]=dist[v]+1; Q.push_back(w); }
                if (dist[w]==dist[v]+1) { sigma[w]+=sigma[v]; P[w].push_back(v); }
            }
        }
        // accumulation
        while (!S.empty()) {
            uint32_t w=S.back(); S.pop_back();
            for (uint32_t v : P[w]) { if (sigma[w]>0) delta[v] += (double(sigma[v]) / double(sigma[w])) * (1.0 + delta[w]); }
            if (w!=s) CB[w] += delta[w];
        }
    }
    return CB;
}

Metrics compute_metrics(const CSR& g, const MetricsOptions& opts) {
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

    // Betweenness sampling if requested
    if (opts.betweenness_samples > 0 && m.N > 1) {
        auto t0 = std::chrono::steady_clock::now();
        m.betweenness_sample_count = opts.betweenness_samples;
        m.betweenness_domain = opts.betweenness_domain.empty()?std::string("all"):opts.betweenness_domain;
        m.betweenness_top_k = opts.betweenness_top_k;
        m.betweenness_normalized = opts.betweenness_normalize;
        m.betweenness_randomized = opts.use_random_sampling;
        m.betweenness_seed = opts.use_random_sampling ? opts.betweenness_seed : 0u;

        // Build source pool based on domain
        std::vector<uint32_t> pool; pool.reserve(m.N);
        if (m.betweenness_domain == "layer0") {
            auto indeg = compute_indeg(g);
            for (uint32_t i=0;i<m.N;i++) if (indeg[i]==0) pool.push_back(i);
        } else {
            for (uint32_t i=0;i<m.N;i++) pool.push_back(i);
        }
        if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }

        // Choose sources
        std::vector<uint32_t> sources; sources.reserve(opts.betweenness_samples);
        if (opts.use_random_sampling) {
            std::mt19937 rng(opts.betweenness_seed);
            std::uniform_int_distribution<uint32_t> dist(0, uint32_t(pool.size()-1));
            for (uint32_t i=0;i<opts.betweenness_samples;i++) sources.push_back(pool[dist(rng)]);
        } else {
            // deterministic: round-robin through pool
            for (uint32_t i=0;i<opts.betweenness_samples;i++) sources.push_back(pool[i % pool.size()]);
        }

        // Compute betweenness
        auto CB = brandes_betweenness(g, sources);
        // Average across sources
        const double sample_div = double(opts.betweenness_samples);
        for (auto &v : CB) v /= sample_div;
        // Normalize to [0,1] if requested (directed graph normalization)
        if (opts.betweenness_normalize && m.N>2) {
            const double denom = double(m.N-1) * double(m.N-2);
            if (denom > 0) for (auto &v : CB) v /= denom;
        }
        // Collect top-k
        std::vector<std::pair<uint32_t,double>> pairs; pairs.reserve(m.N);
        for (uint32_t i=0;i<m.N;i++) pairs.emplace_back(i, CB[i]);
        std::stable_sort(pairs.begin(), pairs.end(), [](auto&a,auto&b){ return a.second>b.second; });
        if (m.betweenness_top_k == 0 || m.betweenness_top_k >= pairs.size()) m.betweenness_top_nodes = pairs;
        else m.betweenness_top_nodes.assign(pairs.begin(), pairs.begin() + m.betweenness_top_k);
        auto t1 = std::chrono::steady_clock::now();
        m.betweenness_ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
    }
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
      << "  \"isDag\": " << (m.isDag?"true":"false")
    ;
    if (m.betweenness_sample_count > 0) {
        o << ",\n  \"betweenness_sample_count\": " << m.betweenness_sample_count
          << ",\n  \"betweenness_domain\": \"" << m.betweenness_domain << "\""
          << ",\n  \"betweenness_top_k\": " << m.betweenness_top_k
          << ",\n  \"betweenness_normalized\": " << (m.betweenness_normalized?"true":"false")
          << ",\n  \"betweenness_sampling\": \"" << (m.betweenness_randomized?"random":"deterministic") << "\""
          << ",\n  \"betweenness_ms\": " << m.betweenness_ms;
        if (m.betweenness_randomized) {
            o << ",\n  \"betweenness_seed\": " << m.betweenness_seed;
        }
        // top nodes array
        o << ",\n  \"betweenness_top_nodes\": [";
        for (size_t i=0;i<m.betweenness_top_nodes.size(); ++i) {
            const auto &p = m.betweenness_top_nodes[i];
            o << "{\"node\": " << p.first << ", \"score\": " << p.second << "}";
            if (i+1<m.betweenness_top_nodes.size()) o << ", ";
        }
        o << "]";
    }
    o << "\n}\n";
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
