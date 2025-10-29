
#include "k1/graph.hpp"
#include <iostream>
#include <vector>
#include <cmath>
using namespace k1::graph;

static int g_failures = 0;
#define CHECK(cond) do { if(!(cond)) { std::cerr << "CHECK failed: " #cond " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } } while(0)
#define CHECK_EQ(a,b) CHECK((a)==(b))

int main() {
    GraphBuilder gb(4, true);
    gb.add_edge(0,1); gb.add_edge(0,2);
    gb.add_edge(1,2); gb.add_edge(1,3);
    gb.add_edge(2,3);
    gb.add_edge(3,1);
    CSR g = gb.build_csr();

    auto d = bfs(g, 0);
    CHECK_EQ(d[0], 0u);
    CHECK_EQ(d[1], 1u);
    CHECK_EQ(d[2], 1u);
    CHECK_EQ(d[3], 2u);

    auto pre = dfs_preorder(g, 0);
    CHECK_EQ(pre.front(), 0u);
    CHECK(pre.size() >= 1);

    auto dj = dijkstra(g, 0);
    CHECK(std::abs(dj[3] - 2.0f) < 1e-6f);

    CHECK(has_cycle(g));

    auto dag = make_layered_dag(3, 2, true);
    CHECK(!has_cycle(dag));
    auto topo = topo_sort(dag);
    CHECK_EQ(topo.size(), dag.num_vertices());
    std::vector<uint32_t> pos(dag.num_vertices(), 0);
    for (uint32_t i = 0; i < topo.size(); ++i) pos[topo[i]] = i;
    for (uint32_t u = 0; u < dag.num_vertices(); ++u) {
        for (uint32_t i = dag.offsets[u]; i < dag.offsets[u+1]; ++i) {
            uint32_t v = dag.edges[i];
            CHECK(pos[u] < pos[v]);
        }
    }

    if (g_failures) {
        std::cerr << "FAILURES: " << g_failures << "\n";
        return 1;
    }
    std::cout << "All tests passed.\n";
    return 0;
}
