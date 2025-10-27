
#include "k1/graph_io.hpp"
#include <fstream>
#include <sstream>
#include <cctype>
#include <cstring>

namespace k1::graph::io {

/* ---------- Tiny helpers ---------- */

static inline void trim_inplace(std::string& s) {
    size_t i = 0, j = s.size();
    while (i < j && std::isspace((unsigned char)s[i])) ++i;
    while (j > i && std::isspace((unsigned char)s[j-1])) --j;
    s.assign(s.substr(i, j - i));
}

// Find the value region for a key and return the substring inside the nearest matching brackets [ ... ].
static std::string extract_array_region(const std::string& json, const std::string& quoted_key) {
    const size_t kpos = json.find(quoted_key);
    if (kpos == std::string::npos) return {};
    size_t pos = json.find('[', kpos + quoted_key.size());
    if (pos == std::string::npos) return {};
    size_t depth = 0;
    size_t start = pos + 1;
    for (size_t i = pos; i < json.size(); ++i) {
        char c = json[i];
        if (c == '[') depth++;
        else if (c == ']') {
            depth--;
            if (depth == 0) {
                size_t end = i;
                return json.substr(start, end - start);
            }
        }
    }
    return {};
}

static bool extract_bool(const std::string& json, const std::string& quoted_key, bool* out) {
    const size_t kpos = json.find(quoted_key);
    if (kpos == std::string::npos) return false;
    size_t pos = json.find(':', kpos + quoted_key.size());
    if (pos == std::string::npos) return false;
    // scan forward to t/f
    for (size_t i = pos+1; i < json.size(); ++i) {
        char c = json[i];
        if (std::isspace((unsigned char)c) || c==',') continue;
        if (json.compare(i, 4, "true") == 0) { *out = true; return true; }
        if (json.compare(i, 5, "false") == 0) { *out = false; return true; }
        break;
    }
    return false;
}

template <typename T>
static std::vector<T> parse_numeric_array(const std::string& contents) {
    std::vector<T> out;
    const char* s = contents.c_str();
    const char* end = s + contents.size();
    while (s < end) {
        while (s < end && (std::isspace((unsigned char)*s) || *s==',')) ++s;
        if (s >= end) break;
        // token start
        const char* t0 = s;
        // allowed chars for numbers
        while (s < end) {
            char c = *s;
            if (std::isdigit((unsigned char)c) || c=='+' || c=='-' || c=='.' || c=='e' || c=='E') { ++s; }
            else break;
        }
        std::string tok(t0, s);
        trim_inplace(tok);
        if (!tok.empty()) {
            if constexpr (std::is_same<T, uint32_t>::value) {
                char* pend = nullptr;
                unsigned long v = std::strtoul(tok.c_str(), &pend, 10);
                if (pend == tok.c_str()) throw std::runtime_error("parse_numeric_array<uint32_t>: invalid token: " + tok);
                out.push_back(static_cast<uint32_t>(v));
            } else { // float
                char* pend = nullptr;
                double v = std::strtod(tok.c_str(), &pend);
                if (pend == tok.c_str()) throw std::runtime_error("parse_numeric_array<float>: invalid token: " + tok);
                out.push_back(static_cast<float>(v));
            }
        }
        // consume separators
        while (s < end && (std::isspace((unsigned char)*s) || *s==',')) ++s;
    }
    return out;
}

/* ---------- Public API ---------- */

CSR load_csr_from_json_string(const std::string& json) {
    CSR g;
    bool directed = true;
    if (extract_bool(json, "\"directed\"", &directed)) {
        g.directed = directed;
    }
    // arrays
    const std::string offs_region = extract_array_region(json, "\"offsets\"");
    const std::string edges_region = extract_array_region(json, "\"edges\"");
    if (offs_region.empty() || edges_region.empty()) {
        throw std::runtime_error("load_csr_from_json_string: missing \"offsets\" or \"edges\"");
    }
    g.offsets = parse_numeric_array<uint32_t>(offs_region);
    g.edges   = parse_numeric_array<uint32_t>(edges_region);

    const std::string weights_region = extract_array_region(json, "\"weights\"");
    if (!weights_region.empty()) {
        g.weights = parse_numeric_array<float>(weights_region);
    }
    g.validate();
    return g;
}

CSR load_csr_from_json_file(const std::string& path) {
    std::ifstream ifs(path);
    if (!ifs) throw std::runtime_error("load_csr_from_json_file: cannot open: " + path);
    std::ostringstream oss; oss << ifs.rdbuf();
    return load_csr_from_json_string(oss.str());
}

Metrics compute_metrics(const CSR& g) {
    Metrics m{};
    m.directed = g.directed;
    m.N = g.num_vertices();
    m.M = g.num_edges();
    if (m.N == 0) {
        m.minOut = m.maxOut = 0;
        m.avgOut = 0.0;
        m.isDag = true;
        return m;
    }
    uint64_t sum = 0;
    uint32_t minDeg = std::numeric_limits<uint32_t>::max();
    uint32_t maxDeg = 0;
    for (uint32_t u = 0; u < m.N; ++u) {
        const uint32_t deg = g.offsets[u+1] - g.offsets[u];
        sum += deg;
        if (deg < minDeg) minDeg = deg;
        if (deg > maxDeg) maxDeg = deg;
    }
    m.minOut = (minDeg == std::numeric_limits<uint32_t>::max()) ? 0u : minDeg;
    m.maxOut = maxDeg;
    m.avgOut = static_cast<double>(sum) / static_cast<double>(m.N);
    try {
        (void)topo_sort(g);
        m.isDag = true;
    } catch(...) {
        m.isDag = false;
    }
    return m;
}

static bool write_file(const std::string& path, const std::string& body) {
    std::ofstream ofs(path);
    if (!ofs) return false;
    ofs << body;
    return true;
}

bool save_graph_metrics_json(const Metrics& m, const std::string& path) {
    std::ostringstream oss;
    oss << "{\n"
        << "  \"directed\": " << (m.directed ? "true" : "false") << ",\n"
        << "  \"N\": " << m.N << ",\n"
        << "  \"M\": " << m.M << ",\n"
        << "  \"outdegree\": { \"min\": " << m.minOut << ", \"max\": " << m.maxOut << ", \"avg\": " << m.avgOut << " },\n"
        << "  \"isDag\": " << (m.isDag ? "true" : "false") << "\n"
        << "}\n";
    return write_file(path, oss.str());
}

bool save_bench_topo_json(const CSR& g, long long topo_ms, const std::string& path, const std::string& source_desc) {
    std::ostringstream oss;
    oss << "{\n"
        << "  \"graph\": { \"directed\": " << (g.directed ? "true" : "false")
        << ", \"N\": " << g.num_vertices()
        << ", \"M\": " << g.num_edges() << " },\n"
        << "  \"topo_sort_ms\": " << topo_ms << ",\n"
        << "  \"source\": " << "\"" << source_desc << "\"\n"
        << "}\n";
    return write_file(path, oss.str());
}

} // namespace k1::graph::io
