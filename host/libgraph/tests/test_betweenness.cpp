#include "k1/graph_io.hpp"
#include <iostream>
#include <fstream>
using namespace k1::graph;

static int g_failures = 0;
#define CHECK(c) do{ if(!(c)){ std::cerr<<"CHECK failed: " #c " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } }while(0)
#define CHECK_EQ(a,b) CHECK((a)==(b))

int main(){
    // Small layered DAG: 3 layers, width 2 => N=6
    auto dag = make_layered_dag(3,2,true);
    k1::graph::io::MetricsOptions opts{};
    opts.betweenness_samples = 4;
    opts.betweenness_top_k = 3;
    opts.betweenness_domain = "layer0";
    opts.betweenness_normalize = true;
    opts.use_random_sampling = true;
    opts.betweenness_seed = 1234;
    // Provide layer hints for domains requiring explicit indexing
    opts.layer_width = 2; opts.layer_count = 3;

    auto m = k1::graph::io::compute_metrics(dag, opts);
    CHECK_EQ(m.N, dag.num_vertices());
    CHECK(m.betweenness_sample_count == 4);
    CHECK(m.betweenness_domain == std::string("layer0"));
    CHECK(m.betweenness_top_k == 3);
    CHECK(m.betweenness_normalized == true);
    CHECK(m.betweenness_randomized == true);
    CHECK(m.betweenness_seed == 1234u);
    CHECK(m.betweenness_ms >= 0);
    CHECK(m.betweenness_top_nodes.size() == 3);
    // Ensure scores are within [0,1] when normalized
    for (auto &p : m.betweenness_top_nodes) { CHECK(p.second >= 0.0 && p.second <= 1.0); }

    // Even layer domain with domain_avg normalization
    k1::graph::io::MetricsOptions opts2{};
    opts2.betweenness_samples = 3;
    opts2.betweenness_top_k = 2;
    opts2.betweenness_domain = "even";
    opts2.betweenness_normalize = true;
    opts2.betweenness_norm_scheme = "domain_avg";
    opts2.use_random_sampling = false;
    opts2.layer_width = 2; opts2.layer_count = 3;
    auto m2 = k1::graph::io::compute_metrics(dag, opts2);
    CHECK(m2.betweenness_sample_count == 3);
    CHECK(m2.betweenness_domain == std::string("even"));
    CHECK(m2.betweenness_top_k == 2);
    CHECK(m2.betweenness_normalized == true);
    CHECK(m2.betweenness_normalization_scheme == std::string("domain_avg"));
    CHECK(m2.betweenness_ms >= 0);
    CHECK(m2.betweenness_top_nodes.size() == 2);
    // Scores should be positive when normalized by domain average
    for (auto &p : m2.betweenness_top_nodes) { CHECK(p.second >= 0.0); }

    // Layer range domain: layers:1-2
    k1::graph::io::MetricsOptions opts3{};
    opts3.betweenness_samples = 4;
    opts3.betweenness_top_k = 4;
    opts3.betweenness_domain = "layers:1-2";
    opts3.use_random_sampling = true;
    opts3.betweenness_seed = 9;
    opts3.layer_width = 2; opts3.layer_count = 3;
    auto m3 = k1::graph::io::compute_metrics(dag, opts3);
    CHECK(m3.betweenness_sample_count == 4);
    CHECK(m3.betweenness_domain == std::string("layers:1-2"));
    CHECK(m3.betweenness_randomized == true);
    CHECK(m3.betweenness_seed == 9u);
    CHECK(m3.betweenness_ms >= 0);
    CHECK(m3.betweenness_top_nodes.size() == 6 || m3.betweenness_top_nodes.size() == 4);

    // Step range domain: layers:0-2:step:2
    k1::graph::io::MetricsOptions opts4{};
    opts4.betweenness_samples = 3;
    opts4.betweenness_top_k = 3;
    opts4.betweenness_domain = "layers:0-2:step:2";
    opts4.use_random_sampling = false;
    opts4.layer_width = 2; opts4.layer_count = 3;
    auto m4 = k1::graph::io::compute_metrics(dag, opts4);
    CHECK(m4.betweenness_domain == std::string("layers:0-2:step:2"));
    CHECK(m4.betweenness_sample_count == 3);
    CHECK(m4.betweenness_top_nodes.size() >= 3);

    // Middle domain with per-layer max normalization
    k1::graph::io::MetricsOptions opts5{};
    opts5.betweenness_samples = 2;
    opts5.betweenness_top_k = 2;
    opts5.betweenness_domain = "middle";
    opts5.betweenness_normalize = true;
    opts5.betweenness_norm_scheme = "layer_max";
    opts5.use_random_sampling = true;
    opts5.betweenness_seed = 5;
    opts5.layer_width = 2; opts5.layer_count = 3;
    auto m5 = k1::graph::io::compute_metrics(dag, opts5);
    CHECK(m5.betweenness_domain == std::string("middle"));
    CHECK(m5.betweenness_normalized == true);
    CHECK(m5.betweenness_normalization_scheme == std::string("layer_max"));
    for (auto &p : m5.betweenness_top_nodes) { CHECK(p.second >= 0.0 && p.second <= 1.0); }

    // Custom-set domain via JSON list
    {
        const char* path = "./custom_nodes.json";
        std::ofstream ofs(path); ofs << "[0, 3, 4]"; ofs.close();
        k1::graph::io::MetricsOptions opts6{};
        opts6.betweenness_samples = 3;
        opts6.betweenness_top_k = 3;
        opts6.betweenness_domain = std::string("custom:") + path;
        opts6.use_random_sampling = false;
        auto m6 = k1::graph::io::compute_metrics(dag, opts6);
        CHECK(m6.betweenness_domain.find("custom:") == 0);
        CHECK(m6.betweenness_sample_count == 3);
        CHECK(m6.betweenness_top_nodes.size() >= 3);
    }

    // Quantile range domain with domain_minmax normalization
    {
        k1::graph::io::MetricsOptions opts7{};
        opts7.betweenness_samples = 4;
        opts7.betweenness_top_k = 3;
        opts7.betweenness_domain = "quantile:0.34-0.67"; // selects layers 1..2 for 3 layers
        opts7.betweenness_normalize = true;
        opts7.betweenness_norm_scheme = "domain_minmax";
        opts7.use_random_sampling = true;
        opts7.betweenness_seed = 77;
        opts7.layer_width = 2; opts7.layer_count = 3;
        auto m7 = k1::graph::io::compute_metrics(dag, opts7);
        CHECK(m7.betweenness_domain == std::string("quantile:0.34-0.67"));
        CHECK(m7.betweenness_normalized == true);
        CHECK(m7.betweenness_normalization_scheme == std::string("domain_minmax"));
        for (auto &p : m7.betweenness_top_nodes) { CHECK(p.second >= 0.0 && p.second <= 1.0); }
    }

    // Quantile with stride and minmax_layer normalization
    {
        k1::graph::io::MetricsOptions opts8{};
        opts8.betweenness_samples = 4;
        opts8.betweenness_top_k = 3;
        opts8.betweenness_domain = "quantile:0.0-1.0:step:2"; // select layers 0 and 2
        opts8.betweenness_normalize = true;
        opts8.betweenness_norm_scheme = "minmax_layer";
        opts8.use_random_sampling = false;
        opts8.layer_width = 2; opts8.layer_count = 3;
        auto m8 = k1::graph::io::compute_metrics(dag, opts8);
        CHECK(m8.betweenness_domain == std::string("quantile:0.0-1.0:step:2"));
        CHECK(m8.betweenness_normalized == true);
        CHECK(m8.betweenness_normalization_scheme == std::string("minmax_layer"));
        for (auto &p : m8.betweenness_top_nodes) { CHECK(p.second >= 0.0 && p.second <= 1.0); }
    }

    // Layer quantile by out-degree and robust_zscore normalization
    {
        k1::graph::io::MetricsOptions opts9{};
        opts9.betweenness_samples = 4;
        opts9.betweenness_top_k = 3;
        opts9.betweenness_domain = "layer_quantile:outdeg:0.0-0.0"; // selects layer with lowest avg outdeg (last layer)
        opts9.betweenness_normalize = true;
        opts9.betweenness_norm_scheme = "robust_zscore";
        opts9.use_random_sampling = true;
        opts9.betweenness_seed = 99;
        opts9.layer_width = 2; opts9.layer_count = 3;
        auto m9 = k1::graph::io::compute_metrics(dag, opts9);
        CHECK(m9.betweenness_domain == std::string("layer_quantile:outdeg:0.0-0.0"));
        CHECK(m9.betweenness_normalized == true);
        CHECK(m9.betweenness_normalization_scheme == std::string("robust_zscore"));
        for (auto &p : m9.betweenness_top_nodes) { CHECK(std::isfinite(p.second)); }
    }

    // Layer quantile by indeg median, zscore normalization
    {
        k1::graph::io::MetricsOptions opts10{};
        opts10.betweenness_samples = 4;
        opts10.betweenness_top_k = 3;
        opts10.betweenness_domain = "layer_quantile:indeg_median:0.0-0.0"; // selects layer with lowest indeg (layer 0)
        opts10.betweenness_normalize = true;
        opts10.betweenness_norm_scheme = "zscore";
        opts10.use_random_sampling = false;
        opts10.layer_width = 2; opts10.layer_count = 3;
        auto m10 = k1::graph::io::compute_metrics(dag, opts10);
        CHECK(m10.betweenness_domain == std::string("layer_quantile:indeg_median:0.0-0.0"));
        CHECK(m10.betweenness_normalized == true);
        CHECK(m10.betweenness_normalization_scheme == std::string("zscore"));
        for (auto &p : m10.betweenness_top_nodes) { CHECK(std::isfinite(p.second)); }
    }

    // Layer rank top-k by outdeg
    {
        k1::graph::io::MetricsOptions opts11{};
        opts11.betweenness_samples = 4;
        opts11.betweenness_top_k = 3;
        opts11.betweenness_domain = "layer_rank:outdeg:top:1"; // top layer by avg outdeg
        opts11.betweenness_normalize = true;
        opts11.betweenness_norm_scheme = "domain_minmax";
        opts11.use_random_sampling = false;
        opts11.layer_width = 2; opts11.layer_count = 3;
        auto m11 = k1::graph::io::compute_metrics(dag, opts11);
        CHECK(m11.betweenness_domain == std::string("layer_rank:outdeg:top:1"));
        CHECK(m11.betweenness_normalized == true);
        CHECK(m11.betweenness_normalization_scheme == std::string("domain_minmax"));
        for (auto &p : m11.betweenness_top_nodes) { CHECK(p.second >= 0.0 && p.second <= 1.0); }
    }

    if (g_failures) std::cerr << "FAILURES: " << g_failures << "\n";
    else std::cout << "Betweenness test passed.\n";
    return g_failures ? 1 : 0;
}