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