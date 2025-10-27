#include "k1/graph_io.hpp"
#include <fstream>
#include <sstream>
#include <cctype>
#include <cstring>
#include <random>
#include <cmath>

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

static std::vector<uint32_t> load_uint_array_file(const std::string& path) {
    std::ifstream ifs(path);
    if (!ifs) return {};
    std::ostringstream oss; oss << ifs.rdbuf();
    std::string s = oss.str();
    trim_inplace(s);
    // Strip surrounding brackets if present
    if (!s.empty() && s.front()=='[' && s.back()==']') {
        s = s.substr(1, s.size()-2);
    }
    try {
        return parse_numeric_array<uint32_t>(s);
    } catch (...) {
        return {};
    }
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
        // Determine normalization scheme
        std::string scheme = opts.betweenness_norm_scheme;
        if (scheme.empty()) scheme = "none";
        if (opts.betweenness_normalize && scheme == "none") scheme = "directed"; // backward compat
        m.betweenness_normalization_scheme = scheme;
        m.betweenness_normalized = (scheme != "none");
        m.betweenness_randomized = opts.use_random_sampling;
        m.betweenness_seed = opts.use_random_sampling ? opts.betweenness_seed : 0u;

        // Build source pool based on domain
        std::vector<uint32_t> pool; pool.reserve(m.N);
        if (m.betweenness_domain == "layer0") {
            auto indeg = compute_indeg(g);
            for (uint32_t i=0;i<m.N;i++) if (indeg[i]==0) pool.push_back(i);
        } else if (m.betweenness_domain.rfind("layer:", 0) == 0 && opts.layer_width > 0) {
            // explicit layer index selection when layered DAG hints provided
            uint32_t L = 0; try {
                L = static_cast<uint32_t>(std::stoul(m.betweenness_domain.substr(6)));
            } catch (...) { L = 0; }
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W > 0 && C > 0 && (L < C)) {
                const uint32_t start = L * W;
                const uint32_t end = std::min<uint32_t>(start + W, N);
                for (uint32_t i=start; i<end; ++i) pool.push_back(i);
            }
            if (pool.empty()) {
                // fallback: all nodes
                for (uint32_t i=0;i<m.N;i++) pool.push_back(i);
            }
        } else if (m.betweenness_domain.rfind("layers:", 0) == 0 && opts.layer_width > 0) {
            // range of layers L1-L2 inclusive
            const std::string spec = m.betweenness_domain.substr(7);
            // Optional step suffix: ... :step:k
            size_t stepPos = spec.find(":step:");
            std::string rangeSpec = spec;
            uint32_t step = 1;
            if (stepPos != std::string::npos) {
                rangeSpec = spec.substr(0, stepPos);
                try { step = static_cast<uint32_t>(std::stoul(spec.substr(stepPos+6))); } catch (...) { step = 1; }
                if (step == 0) step = 1;
            }
            size_t dash = rangeSpec.find('-');
            uint32_t L1=0, L2=0;
            if (dash != std::string::npos) {
                try { L1 = static_cast<uint32_t>(std::stoul(rangeSpec.substr(0, dash))); } catch (...) { L1 = 0; }
                try { L2 = static_cast<uint32_t>(std::stoul(rangeSpec.substr(dash+1))); } catch (...) { L2 = L1; }
            } else {
                try { L1 = static_cast<uint32_t>(std::stoul(rangeSpec)); L2 = L1; } catch (...) { L1 = 0; L2 = 0; }
            }
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                if (L1 > L2) std::swap(L1, L2);
                L1 = std::min(L1, C-1); L2 = std::min(L2, C-1);
                for (uint32_t L=L1; L<=L2; L+=step) {
                    const uint32_t start = L * W;
                    const uint32_t end   = std::min<uint32_t>(start + W, N);
                    for (uint32_t i=start; i<end; ++i) pool.push_back(i);
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if ((m.betweenness_domain == "even" || m.betweenness_domain == "odd") && opts.layer_width > 0) {
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                const bool want_even = (m.betweenness_domain == "even");
                for (uint32_t i=0;i<N;i++) {
                    uint32_t layer = i / W;
                    if ((layer % 2 == 0) == want_even) pool.push_back(i);
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if (m.betweenness_domain == "middle" && opts.layer_width > 0) {
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                if (C % 2 == 1) {
                    uint32_t L = C / 2;
                    uint32_t start = L * W;
                    uint32_t end = std::min<uint32_t>(start + W, N);
                    for (uint32_t i=start; i<end; ++i) pool.push_back(i);
                } else {
                    uint32_t L1 = C/2 - 1, L2 = C/2;
                    for (uint32_t L : {L1, L2}) {
                        uint32_t start = L * W;
                        uint32_t end = std::min<uint32_t>(start + W, N);
                        for (uint32_t i=start; i<end; ++i) pool.push_back(i);
                    }
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if (m.betweenness_domain.rfind("quantile:", 0) == 0 && opts.layer_width > 0) {
            // Select layers by quantile range of layer indices, with optional stride: quantile:q1-q2[:step:k]
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                const std::string full = m.betweenness_domain.substr(9);
                size_t stepPos = full.find(":step:");
                std::string spec = full;
                uint32_t step = 1;
                if (stepPos != std::string::npos) {
                    spec = full.substr(0, stepPos);
                    try { step = static_cast<uint32_t>(std::stoul(full.substr(stepPos+6))); } catch (...) { step = 1; }
                    if (step == 0) step = 1;
                }
                size_t dash = spec.find('-');
                double q1 = 0.0, q2 = 1.0;
                if (dash != std::string::npos) {
                    try { q1 = std::stod(spec.substr(0, dash)); } catch (...) { q1 = 0.0; }
                    try { q2 = std::stod(spec.substr(dash+1)); } catch (...) { q2 = 1.0; }
                } else {
                    try { q1 = std::stod(spec); q2 = q1; } catch (...) { q1 = 0.0; q2 = 0.0; }
                }
                if (q1 > q2) std::swap(q1, q2);
                // clamp to [0,1]
                q1 = std::max(0.0, std::min(1.0, q1));
                q2 = std::max(0.0, std::min(1.0, q2));
                uint32_t L1 = (uint32_t)std::floor(q1 * double(C));
                uint32_t L2 = (uint32_t)std::floor(q2 * double(C));
                if (L1 > L2) std::swap(L1, L2);
                if (L1 >= C) L1 = C-1;
                if (L2 >= C) L2 = C-1;
                for (uint32_t L=L1; L<=L2; L+=step) {
                    const uint32_t start = L * W;
                    const uint32_t end   = std::min<uint32_t>(start + W, N);
                    for (uint32_t i=start; i<end; ++i) pool.push_back(i);
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if (m.betweenness_domain.rfind("layer_quantile:", 0) == 0 && opts.layer_width > 0) {
            // Select layers whose metric falls in a quantile band: layer_quantile:<width|outdeg|indeg>:<q1-q2>
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                const std::string spec = m.betweenness_domain.substr(15); // after 'layer_quantile:'
                size_t colon = spec.find(':');
                std::string metric = spec.substr(0, colon == std::string::npos ? spec.size() : colon);
                std::string qspec = (colon == std::string::npos) ? std::string("0-1") : spec.substr(colon+1);
                // parse q1-q2
                size_t dash = qspec.find('-');
                double q1 = 0.0, q2 = 1.0;
                if (dash != std::string::npos) {
                    try { q1 = std::stod(qspec.substr(0, dash)); } catch (...) { q1 = 0.0; }
                    try { q2 = std::stod(qspec.substr(dash+1)); } catch (...) { q2 = 1.0; }
                } else {
                    try { q1 = std::stod(qspec); q2 = q1; } catch (...) { q1 = 0.0; q2 = 0.0; }
                }
                if (q1 > q2) std::swap(q1, q2);
                q1 = std::max(0.0, std::min(1.0, q1));
                q2 = std::max(0.0, std::min(1.0, q2));
                // build per-layer metric values
                std::vector<double> vals(C, 0.0);
                if (metric == "width") {
                    for (uint32_t L=0; L<C; ++L) {
                        uint32_t start = L * W;
                        uint32_t end   = std::min<uint32_t>(start + W, N);
                        vals[L] = double(end - start);
                    }
                } else if (metric == "outdeg") {
                    for (uint32_t L=0; L<C; ++L) {
                        uint32_t start = L * W;
                        uint32_t end   = std::min<uint32_t>(start + W, N);
                        double sum = 0.0; uint32_t cnt = (end>start)?(end-start):0;
                        for (uint32_t i=start; i<end; ++i) sum += double(g.offsets[i+1] - g.offsets[i]);
                        vals[L] = (cnt>0)? (sum / double(cnt)) : 0.0;
                    }
                } else if (metric == "outdeg_median") {
                    for (uint32_t L=0; L<C; ++L) {
                        uint32_t start = L * W;
                        uint32_t end   = std::min<uint32_t>(start + W, N);
                        std::vector<double> d; d.reserve(end>start? (end-start):0);
                        for (uint32_t i=start; i<end; ++i) d.push_back(double(g.offsets[i+1] - g.offsets[i]));
                        std::sort(d.begin(), d.end());
                        size_t n = d.size();
                        double med = 0.0;
                        if (n==0) med = 0.0;
                        else if (n%2==1) med = d[n/2];
                        else med = 0.5 * (d[n/2 - 1] + d[n/2]);
                        vals[L] = med;
                    }
                } else if (metric == "indeg") {
                    auto indeg = compute_indeg(g);
                    for (uint32_t L=0; L<C; ++L) {
                        uint32_t start = L * W;
                        uint32_t end   = std::min<uint32_t>(start + W, N);
                        double sum = 0.0; uint32_t cnt = (end>start)?(end-start):0;
                        for (uint32_t i=start; i<end; ++i) sum += double(indeg[i]);
                        vals[L] = (cnt>0)? (sum / double(cnt)) : 0.0;
                    }
                } else if (metric == "indeg_median") {
                    auto indeg = compute_indeg(g);
                    for (uint32_t L=0; L<C; ++L) {
                        uint32_t start = L * W;
                        uint32_t end   = std::min<uint32_t>(start + W, N);
                        std::vector<double> d; d.reserve(end>start? (end-start):0);
                        for (uint32_t i=start; i<end; ++i) d.push_back(double(indeg[i]));
                        std::sort(d.begin(), d.end());
                        size_t n = d.size();
                        double med = 0.0;
                        if (n==0) med = 0.0;
                        else if (n%2==1) med = d[n/2];
                        else med = 0.5 * (d[n/2 - 1] + d[n/2]);
                        vals[L] = med;
                    }
                } else {
                    // unknown metric; fallback to all
                    for (uint32_t i=0;i<m.N;i++) pool.push_back(i);
                }
                if (pool.empty()) {
                    // compute quantile thresholds over vals
                    std::vector<double> sorted = vals; std::sort(sorted.begin(), sorted.end());
                    uint32_t idx1 = (uint32_t)std::floor(q1 * double(C));
                    uint32_t idx2 = (uint32_t)std::floor(q2 * double(C));
                    if (idx1 >= C) idx1 = (C?C-1:0);
                    if (idx2 >= C) idx2 = (C?C-1:0);
                    double t1 = sorted[std::min(idx1, C?C-1:0)];
                    double t2 = sorted[std::min(idx2, C?C-1:0)];
                    if (t1 > t2) std::swap(t1, t2);
                    for (uint32_t L=0; L<C; ++L) {
                        if (vals[L] >= t1 && vals[L] <= t2) {
                            uint32_t start = L * W;
                            uint32_t end   = std::min<uint32_t>(start + W, N);
                            for (uint32_t i=start; i<end; ++i) pool.push_back(i);
                        }
                    }
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if (m.betweenness_domain.rfind("layer_rank:", 0) == 0 && opts.layer_width > 0) {
            // Select top/bottom-k layers by metric: layer_rank:<metric>:<top|bottom>:<k>
            const uint32_t W = opts.layer_width;
            const uint32_t C = opts.layer_count;
            const uint32_t N = m.N;
            if (W>0 && C>0) {
                const std::string spec = m.betweenness_domain.substr(11); // after 'layer_rank:'
                // metric:action:k
                std::vector<std::string> parts; size_t pos=0, next=0; while (next != std::string::npos) { next = spec.find(':', pos); parts.push_back(spec.substr(pos, next==std::string::npos? spec.size()-pos : next-pos)); pos = (next==std::string::npos? spec.size() : next+1); }
                std::string metric = parts.size()>0? parts[0] : std::string("outdeg");
                std::string action = parts.size()>1? parts[1] : std::string("top");
                uint32_t k = 1; if (parts.size()>2) { try { k = static_cast<uint32_t>(std::stoul(parts[2])); } catch (...) { k = 1; } }
                if (k == 0) k = 1; if (k > C) k = C;
                // build per-layer metric values
                std::vector<double> vals(C, 0.0);
                if (metric == "width") {
                    for (uint32_t L=0; L<C; ++L) { uint32_t start = L * W; uint32_t end = std::min<uint32_t>(start + W, N); vals[L] = double(end - start); }
                } else if (metric == "outdeg") {
                    for (uint32_t L=0; L<C; ++L) { uint32_t start = L * W; uint32_t end = std::min<uint32_t>(start + W, N); double sum=0.0; uint32_t cnt=(end>start)?(end-start):0; for(uint32_t i=start;i<end;++i) sum += double(g.offsets[i+1]-g.offsets[i]); vals[L] = (cnt>0)?(sum/double(cnt)):0.0; }
                } else if (metric == "outdeg_median") {
                    for (uint32_t L=0; L<C; ++L) { uint32_t start=L*W; uint32_t end=std::min<uint32_t>(start+W,N); std::vector<double> d; d.reserve(end>start? (end-start):0); for(uint32_t i=start;i<end;++i) d.push_back(double(g.offsets[i+1]-g.offsets[i])); std::sort(d.begin(), d.end()); size_t n=d.size(); vals[L] = (n==0)?0.0: (n%2? d[n/2] : 0.5*(d[n/2-1]+d[n/2])); }
                } else if (metric == "indeg") {
                    auto indeg = compute_indeg(g);
                    for (uint32_t L=0; L<C; ++L) { uint32_t start=L*W; uint32_t end=std::min<uint32_t>(start+W,N); double sum=0.0; uint32_t cnt=(end>start)?(end-start):0; for(uint32_t i=start;i<end;++i) sum += double(indeg[i]); vals[L] = (cnt>0)?(sum/double(cnt)):0.0; }
                } else if (metric == "indeg_median") {
                    auto indeg = compute_indeg(g);
                    for (uint32_t L=0; L<C; ++L) { uint32_t start=L*W; uint32_t end=std::min<uint32_t>(start+W,N); std::vector<double> d; d.reserve(end>start? (end-start):0); for(uint32_t i=start;i<end;++i) d.push_back(double(indeg[i])); std::sort(d.begin(), d.end()); size_t n=d.size(); vals[L] = (n==0)?0.0: (n%2? d[n/2] : 0.5*(d[n/2-1]+d[n/2])); }
                } else {
                    // unknown metric -> fallback to all
                    for (uint32_t i=0;i<m.N;i++) pool.push_back(i);
                }
                if (pool.empty()) {
                    // create indexed pairs for sorting
                    std::vector<std::pair<uint32_t,double>> layerVals; layerVals.reserve(C);
                    for (uint32_t L=0; L<C; ++L) layerVals.emplace_back(L, vals[L]);
                    if (action == "top") {
                        std::stable_sort(layerVals.begin(), layerVals.end(), [](auto&a, auto&b){ return a.second > b.second; });
                    } else {
                        std::stable_sort(layerVals.begin(), layerVals.end(), [](auto&a, auto&b){ return a.second < b.second; });
                    }
                    for (uint32_t i=0; i<k && i<layerVals.size(); ++i) {
                        uint32_t L = layerVals[i].first;
                        uint32_t start = L * W; uint32_t end = std::min<uint32_t>(start + W, N);
                        for (uint32_t u=start; u<end; ++u) pool.push_back(u);
                    }
                }
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
        } else if (m.betweenness_domain.rfind("custom:", 0) == 0) {
            // Domain defined by explicit node list loaded from a JSON file path
            const std::string path = m.betweenness_domain.substr(7);
            auto nodes = load_uint_array_file(path);
            if (!nodes.empty()) {
                for (auto v : nodes) if (v < m.N) pool.push_back(v);
            }
            if (pool.empty()) { for (uint32_t i=0;i<m.N;i++) pool.push_back(i); }
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
        // Normalize per scheme
        if (scheme == "directed" && m.N>2) {
            const double denom = double(m.N-1) * double(m.N-2);
            if (denom > 0) for (auto &v : CB) v /= denom;
        } else if (scheme == "max") {
            double maxv = 0.0; for (auto v : CB) if (v > maxv) maxv = v;
            if (maxv > 0.0) for (auto &v : CB) v /= maxv;
        } else if (scheme == "domain_avg") {
            // Normalize by average score over selected domain pool
            double sumv = 0.0; size_t cnt = 0;
            // If pool was empty, normalize by global average
            if (!pool.empty()) {
                for (auto idx : pool) { sumv += CB[idx]; ++cnt; }
            } else {
                for (uint32_t i=0;i<m.N;i++) { sumv += CB[i]; ++cnt; }
            }
            const double avgv = (cnt>0) ? (sumv / double(cnt)) : 0.0;
            if (avgv > 0.0) for (auto &v : CB) v /= avgv;
        } else if (scheme == "layer_max" && opts.layer_width > 0) {
            // Normalize by per-layer maximum score
            const uint32_t W = opts.layer_width;
            const uint32_t N = m.N;
            if (W > 0) {
                uint32_t C = (W>0)? (N / W) : 0;
                std::vector<double> lmax(C, 0.0);
                for (uint32_t i=0;i<N;i++) {
                    uint32_t L = (W>0)? (i / W) : 0;
                    if (CB[i] > lmax[L]) lmax[L] = CB[i];
                }
                for (uint32_t i=0;i<N;i++) {
                    uint32_t L = (W>0)? (i / W) : 0;
                    double denom = lmax[L]; if (denom > 0.0) CB[i] /= denom;
                }
            }
        } else if (scheme == "zscore") {
            // Standardize scores: (v - mean) / stddev
            double sum=0.0, sumsq=0.0; size_t n = CB.size();
            for (double v : CB) { sum += v; sumsq += v*v; }
            double mean = (n>0)? (sum / double(n)) : 0.0;
            double var = (n>1)? ((sumsq / double(n)) - mean*mean) : 0.0;
            double sd = (var>0.0)? std::sqrt(var) : 0.0;
            if (sd > 0.0) {
                for (auto &v : CB) v = (v - mean) / sd;
            } else {
                // If zero variance, set all to 0
                for (auto &v : CB) v = 0.0;
            }
        } else if (scheme == "domain_minmax") {
            // Min-max normalize using min/max over the selected domain pool
            double minv = std::numeric_limits<double>::infinity();
            double maxv = -std::numeric_limits<double>::infinity();
            if (!pool.empty()) {
                for (auto idx : pool) { double v = CB[idx]; if (v < minv) minv = v; if (v > maxv) maxv = v; }
            } else {
                for (double v : CB) { if (v < minv) minv = v; if (v > maxv) maxv = v; }
            }
            const double denom = maxv - minv;
            if (std::isfinite(minv) && std::isfinite(maxv) && denom > 0.0) {
                for (auto &v : CB) v = (v - minv) / denom;
            } else {
                for (auto &v : CB) v = 0.0;
            }
        } else if (scheme == "minmax_layer" && opts.layer_width > 0) {
            // Per-layer min-max normalization, mapping each layer's scores to [0,1]
            const uint32_t W = opts.layer_width;
            const uint32_t N = m.N;
            if (W > 0) {
                uint32_t C = (W>0)? (N / W) : 0;
                std::vector<double> lmin(C, std::numeric_limits<double>::infinity());
                std::vector<double> lmax(C, -std::numeric_limits<double>::infinity());
                for (uint32_t i=0;i<N;i++) {
                    uint32_t L = (W>0)? (i / W) : 0;
                    if (CB[i] < lmin[L]) lmin[L] = CB[i];
                    if (CB[i] > lmax[L]) lmax[L] = CB[i];
                }
                for (uint32_t i=0;i<N;i++) {
                    uint32_t L = (W>0)? (i / W) : 0;
                    double denom = lmax[L] - lmin[L];
                    if (std::isfinite(lmin[L]) && std::isfinite(lmax[L]) && denom > 0.0) CB[i] = (CB[i] - lmin[L]) / denom;
                    else CB[i] = 0.0;
                }
            }
        } else if (scheme == "robust_zscore") {
            // Robust standardization using median and MAD (scaled by 1.4826)
            std::vector<double> sorted = CB; std::sort(sorted.begin(), sorted.end());
            size_t n = sorted.size();
            double median = 0.0;
            if (n == 0) { /* leave zeros */ }
            else if (n % 2 == 1) { median = sorted[n/2]; }
            else { median = 0.5 * (sorted[n/2 - 1] + sorted[n/2]); }
            std::vector<double> dev; dev.reserve(n);
            for (double v : CB) dev.push_back(std::abs(v - median));
            std::sort(dev.begin(), dev.end());
            double mad = 0.0;
            if (n == 0) { mad = 0.0; }
            else if (n % 2 == 1) { mad = dev[n/2]; }
            else { mad = 0.5 * (dev[n/2 - 1] + dev[n/2]); }
            const double scale = 1.4826 * mad;
            if (scale > 0.0) {
                for (auto &v : CB) v = (v - median) / scale;
            } else {
                for (auto &v : CB) v = 0.0;
            }
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
          << ",\n  \"betweenness_normalization_scheme\": \"" << m.betweenness_normalization_scheme << "\""
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
