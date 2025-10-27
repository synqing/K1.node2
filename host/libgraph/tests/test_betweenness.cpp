#include "k1/graph_io.hpp"
#include <iostream>
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

    if (g_failures) std::cerr << "FAILURES: " << g_failures << "\n";
    else std::cout << "Betweenness test passed.\n";
    return g_failures ? 1 : 0;
}