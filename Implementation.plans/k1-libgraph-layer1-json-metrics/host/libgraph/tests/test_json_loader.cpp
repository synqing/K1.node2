
#include "k1/graph_io.hpp"
#include <iostream>
#include <string>
using namespace k1::graph;

static int g_failures = 0;
#define CHECK(cond) do { if(!(cond)) { std::cerr << "CHECK failed: " #cond " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } } while(0)
#define CHECK_EQ(a,b) CHECK((a)==(b))

int main() {
    const std::string json = R"JSON(
    {
      "directed": true,
      "offsets": [0,2,3,3],
      "edges":   [1,2,2],
      "weights": [1.0,1.0,0.5]
    }
    )JSON";
    auto g = k1::graph::io::load_csr_from_json_string(json);
    CHECK(g.directed);
    CHECK_EQ(g.num_vertices(), 3u);
    CHECK_EQ(g.num_edges(), 3u);
    auto d = bfs(g, 0);
    CHECK_EQ(d[2], 1u); // 0->2 via offsets row [0,2)
    auto m = k1::graph::io::compute_metrics(g);
    CHECK(m.N == 3 && m.M == 3);
    // In this example, edges: 0->[1,2], 1->[2], 2->[] : it's a DAG
    CHECK(m.isDag == true);
    if (g_failures) {
        std::cerr << "FAILURES: " << g_failures << "\n";
        return 1;
    }
    return 0;
}
