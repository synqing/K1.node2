#include "k1/graph.hpp"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace k1::graph;

static bool approx(float a, float b, float eps=1e-5f) { return std::fabs(a-b) < eps; }

int main() {
  std::cout << "[k1_libgraph] running tests...\n";

  // Build a simple DAG: 0->1->2, 0->3, 3->4
  {
    GraphBuilder gb; gb.directed = true;
    gb.add_edge(0,1); gb.add_edge(1,2); gb.add_edge(0,3); gb.add_edge(3,4);
    CSR g = gb.build(5);

    // Validate
    g.validate();

    // BFS from 0
    auto bd = bfs(g, 0);
    assert(bd.size() == 5);
    assert(bd[0] == 0);
    assert(bd[1] == 1);
    assert(bd[2] == 2);
    assert(bd[3] == 1);
    assert(bd[4] == 2);

    // DFS preorder from 0 (order may vary but must be reachable and start with 0)
    auto pre = dfs_preorder(g, 0);
    assert(!pre.empty() && pre.front() == 0);
    // All reachable nodes {0,1,2,3,4}
    std::vector<uint8_t> seen(5,0);
    for (auto v : pre) { assert(v < 5); seen[v]=1; }
    for (int v=0; v<5; ++v) assert(seen[v]==1);

    // Dijkstra with weights
    GraphBuilder gbw; gbw.directed = true;
    gbw.add_edge(0,1, 2.0f); gbw.add_edge(1,2, 0.5f); gbw.add_edge(0,3, 1.0f); gbw.add_edge(3,4, 1.0f);
    CSR gw = gbw.build(5);
    auto dd = dijkstra(gw, 0);
    assert(approx(dd[0], 0.0f));
    assert(approx(dd[1], 2.0f));
    assert(approx(dd[2], 2.5f));
    assert(approx(dd[3], 1.0f));
    assert(approx(dd[4], 2.0f));

    // Topo sort should succeed
    auto order = topo_sort(g);
    assert(order.size() == g.n);
    // Has cycle should be false
    assert(!has_cycle(g));
  }

  // Cycle graph: 0->1->2->0
  {
    GraphBuilder gb; gb.directed = true;
    gb.add_edge(0,1); gb.add_edge(1,2); gb.add_edge(2,0);
    CSR g = gb.build(3);
    assert(has_cycle(g));
    bool threw = false;
    try { (void)topo_sort(g); } catch (...) { threw = true; }
    assert(threw);
  }

  // Layered DAG generator sanity
  {
    auto g = make_layered_dag(3, 4); // 12 nodes, edges: 4*4 + 4*4 = 32
    assert(g.n == 12);
    assert(g.edges.size() == 32);
    std::cout << summary(g) << "\n";
    auto torder = topo_sort(g);
    assert(torder.size() == g.n);
    assert(!has_cycle(g));
  }

  std::cout << "[k1_libgraph] tests passed.\n";
  return 0;
}