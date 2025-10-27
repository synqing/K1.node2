#include <vector>
#include <cstdint>
// sample generated code placeholder
struct Node { uint16_t kind; std::vector<int> edges; };
int main() {
  std::vector<Node> g(4);
  g[0].edges = {1,2};
  g[1].edges = {3};
  g[2].edges = {3};
  return 0;
}