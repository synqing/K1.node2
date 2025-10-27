---
author: Claude Agent (Technical Architect)
date: 2025-10-27
status: published
intent: Layer 1 specification for graph traversal, dependency analysis, and performance estimation
---

# Layer 1: Graph Analysis Foundation - Technical Specification

## Overview

Layer 1 establishes the mathematical and algorithmic foundation for the entire system. It provides:
1. Core graph traversal algorithms (BFS, DFS, Dijkstra)
2. Static dependency analysis and visualization
3. Performance estimation models
4. Semantic validation framework

---

## 1. GRAPH TRAVERSAL ALGORITHMS

### 1.1 Unified Algorithm Architecture

**Design Pattern: Template-Based Implementation**

Rather than separate implementations, use a single parameterized structure with algorithm-specific behaviors:

```cpp
template<typename EdgeWeightT = void>
class UnifiedGraphTraversal {
  // Generic container for all algorithms
  using NodeID = size_t;
  using NodeSet = std::unordered_set<NodeID>;
  using EdgeList = std::vector<std::pair<NodeID, EdgeWeightT>>;

  struct GraphNode {
    NodeID id;
    EdgeList outgoing;
    EdgeList incoming;
    NodeSet visited;
  };

  // Dispatch to algorithm variants based on parameters
  enum class Algorithm { BFS, DFS, Dijkstra, Bellman_Ford };
  enum class GraphType { Directed, Undirected };

  std::unordered_map<NodeID, GraphNode> nodes;
  GraphType type;

public:
  // Universal traversal interface
  std::vector<NodeID> traverse(
    NodeID start,
    Algorithm algo,
    std::optional<std::function<bool(NodeID)>> visit_callback = std::nullopt
  );

  // Algorithm-specific optimizations
private:
  std::vector<NodeID> bfs_traversal(NodeID start);
  std::vector<NodeID> dfs_traversal(NodeID start);
  std::vector<NodeID> dijkstra_traversal(NodeID start);
  std::vector<NodeID> bellman_ford_traversal(NodeID start);
};
```

### 1.2 BFS Implementation (Unweighted Graphs)

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)
**Use Case**: Shortest path in unweighted graphs, level-order traversal

```cpp
template<typename EdgeWeightT>
std::vector<NodeID> UnifiedGraphTraversal<EdgeWeightT>::bfs_traversal(NodeID start) {
  std::vector<NodeID> result;
  std::queue<NodeID> frontier;
  NodeSet visited;

  frontier.push(start);
  visited.insert(start);

  while (!frontier.empty()) {
    NodeID current = frontier.front();
    frontier.pop();
    result.push_back(current);

    // Explore all neighbors
    for (const auto& [neighbor, weight] : nodes[current].outgoing) {
      if (visited.find(neighbor) == visited.end()) {
        visited.insert(neighbor);
        frontier.push(neighbor);
      }
    }
  }

  return result;
}
```

**Optimization**: Use `std::deque` instead of `std::queue` for cache locality

### 1.3 DFS Implementation (General-Purpose Traversal)

**Time Complexity**: O(V + E)
**Space Complexity**: O(V) (call stack)
**Use Case**: Cycle detection, topological sorting, connected components

```cpp
template<typename EdgeWeightT>
std::vector<NodeID> UnifiedGraphTraversal<EdgeWeightT>::dfs_traversal(NodeID start) {
  std::vector<NodeID> result;
  std::stack<NodeID> frontier;
  NodeSet visited;

  frontier.push(start);

  while (!frontier.empty()) {
    NodeID current = frontier.top();

    if (visited.find(current) == visited.end()) {
      visited.insert(current);
      result.push_back(current);
    } else {
      frontier.pop();
      continue;
    }

    // Add unvisited neighbors to stack
    bool added_any = false;
    for (const auto& [neighbor, weight] : nodes[current].outgoing) {
      if (visited.find(neighbor) == visited.end()) {
        frontier.push(neighbor);
        added_any = true;
      }
    }

    if (!added_any) {
      frontier.pop();
    }
  }

  return result;
}
```

**Optimization**: Iterative approach (stack-based) to avoid stack overflow on large graphs

### 1.4 Dijkstra's Algorithm (Weighted Shortest Path)

**Time Complexity**: O((V + E) log V) with binary heap
**Space Complexity**: O(V)
**Use Case**: Shortest path with positive weights, performance-critical routing

```cpp
template<typename EdgeWeightT>
std::vector<NodeID> UnifiedGraphTraversal<EdgeWeightT>::dijkstra_traversal(NodeID start) {
  // Priority queue: (distance, node_id)
  using PQItem = std::pair<double, NodeID>;
  std::priority_queue<PQItem, std::vector<PQItem>, std::greater<PQItem>> pq;

  std::unordered_map<NodeID, double> distances;
  std::vector<NodeID> result;

  // Initialize all distances to infinity
  for (const auto& [id, node] : nodes) {
    distances[id] = std::numeric_limits<double>::max();
  }
  distances[start] = 0.0;
  pq.push({0.0, start});

  while (!pq.empty()) {
    auto [dist, current] = pq.top();
    pq.pop();

    // Skip if we've already found a better path
    if (dist > distances[current]) continue;

    result.push_back(current);

    // Explore neighbors
    for (const auto& [neighbor, weight] : nodes[current].outgoing) {
      double new_dist = distances[current] + static_cast<double>(weight);

      if (new_dist < distances[neighbor]) {
        distances[neighbor] = new_dist;
        pq.push({new_dist, neighbor});
      }
    }
  }

  return result;
}
```

**Optimization**: Use Fibonacci heap for theoretical O(E + V log V) but std::priority_queue sufficient in practice

### 1.5 Cycle Detection

**Algorithm**: DFS with color marking (white/gray/black)

```cpp
enum class NodeColor { White, Gray, Black };

bool has_cycle() const {
  std::unordered_map<NodeID, NodeColor> colors;

  // Initialize all nodes as white
  for (const auto& [id, _] : nodes) {
    colors[id] = NodeColor::White;
  }

  // Check each unvisited component
  for (const auto& [id, _] : nodes) {
    if (colors[id] == NodeColor::White && has_cycle_dfs(id, colors)) {
      return true;
    }
  }

  return false;
}

private:
  bool has_cycle_dfs(NodeID node, std::unordered_map<NodeID, NodeColor>& colors) const {
    colors[node] = NodeColor::Gray;

    for (const auto& [neighbor, _] : nodes.at(node).outgoing) {
      if (colors[neighbor] == NodeColor::Gray) {
        return true;  // Back edge found (cycle)
      }
      if (colors[neighbor] == NodeColor::White &&
          has_cycle_dfs(neighbor, colors)) {
        return true;
      }
    }

    colors[node] = NodeColor::Black;
    return false;
  }
```

### 1.6 Topological Sorting

**Use Case**: Dependency resolution, compilation order

```cpp
std::vector<NodeID> topological_sort() const {
  std::unordered_map<NodeID, NodeColor> colors;
  std::vector<NodeID> sorted_order;
  std::function<void(NodeID)> dfs_visit;

  dfs_visit = [&](NodeID node) {
    colors[node] = NodeColor::Gray;

    for (const auto& [neighbor, _] : nodes.at(node).outgoing) {
      if (colors[neighbor] == NodeColor::White) {
        dfs_visit(neighbor);
      }
    }

    colors[node] = NodeColor::Black;
    sorted_order.push_back(node);  // Add after all descendants
  };

  // Initialize colors
  for (const auto& [id, _] : nodes) {
    colors[id] = NodeColor::White;
  }

  // Process all nodes
  for (const auto& [id, _] : nodes) {
    if (colors[id] == NodeColor::White) {
      dfs_visit(id);
    }
  }

  // Reverse to get topological order
  std::reverse(sorted_order.begin(), sorted_order.end());
  return sorted_order;
}
```

---

## 2. DEPENDENCY ANALYSIS

### 2.1 Static Dependency Mapping

**Goal**: Build complete dependency graph from code analysis

```cpp
class DependencyAnalyzer {
  struct Dependency {
    std::string source;
    std::string target;
    std::string type;  // "include", "call", "reference", etc.
    int line_number;
    std::string source_file;
  };

  struct DependencyGraph {
    std::unordered_map<std::string, std::vector<Dependency>> forward;  // source → targets
    std::unordered_map<std::string, std::vector<Dependency>> reverse;  // target → sources
    std::vector<Dependency> all_dependencies;
  };

public:
  DependencyGraph analyze_codebase(const std::filesystem::path& root);

private:
  void scan_includes(const std::string& source_file, DependencyGraph& graph);
  void scan_function_calls(const std::string& source_file, DependencyGraph& graph);
  void scan_type_references(const std::string& source_file, DependencyGraph& graph);
};
```

### 2.2 Impact Analysis

**Goal**: Determine what changes when a component is modified

```cpp
class ImpactAnalyzer {
  std::unordered_set<std::string> compute_impact(
    const DependencyGraph& graph,
    const std::vector<std::string>& modified_components
  ) {
    std::unordered_set<std::string> impacted;
    std::queue<std::string> frontier;

    // Start with directly impacted components
    for (const auto& component : modified_components) {
      for (const auto& dep : graph.forward[component]) {
        if (impacted.find(dep.target) == impacted.end()) {
          impacted.insert(dep.target);
          frontier.push(dep.target);
        }
      }
    }

    // BFS to find transitive impacts
    while (!frontier.empty()) {
      std::string current = frontier.front();
      frontier.pop();

      for (const auto& dep : graph.forward[current]) {
        if (impacted.find(dep.target) == impacted.end()) {
          impacted.insert(dep.target);
          frontier.push(dep.target);
        }
      }
    }

    return impacted;
  }
};
```

### 2.3 Visualization Format (DOT/GraphViz)

```cpp
std::string export_to_graphviz(const DependencyGraph& graph) {
  std::stringstream ss;
  ss << "digraph Dependencies {\n";
  ss << "  rankdir=LR;\n";
  ss << "  node [shape=box];\n";

  for (const auto& dep : graph.all_dependencies) {
    ss << "  \"" << dep.source << "\" -> \"" << dep.target << "\""
       << " [label=\"" << dep.type << "\", line=\"" << dep.line_number << "\"];\n";
  }

  ss << "}\n";
  return ss.str();
}
```

---

## 3. PERFORMANCE ESTIMATION

### 3.1 Asymptotic Complexity Model

**Goal**: Predict runtime behavior from code structure

```cpp
struct ComplexityEstimate {
  std::string complexity_class;      // O(1), O(n), O(n log n), O(n²), etc.
  std::string best_case;
  std::string average_case;
  std::string worst_case;
  int estimated_operations;
  double estimated_time_ns;
};

class PerformanceEstimator {
  ComplexityEstimate estimate_function(
    const AST::FunctionNode& func,
    const CodeAnalysisContext& context
  ) {
    // Analyze loop nesting, recursion depth, data structure operations
    int loop_depth = analyze_loop_nesting(func);
    int recursive_calls = count_recursive_calls(func);
    size_t data_size = estimate_data_size(func);

    // Map to complexity class
    std::string complexity = compute_complexity_class(loop_depth, recursive_calls);

    // Estimate operations count
    int ops = estimate_operations(func);

    // Predict time (calibrated with baseline benchmarks)
    double time_ns = estimate_nanoseconds(ops, complexity);

    return { complexity, "", "", "", ops, time_ns };
  }
};
```

### 3.2 Resource Utilization Metrics

**Goals**: CPU, memory, I/O prediction

```cpp
struct ResourceProfile {
  struct CPUEstimate {
    float cpu_utilization;      // 0-1 per core
    int estimated_instructions;
    float cycles_per_instruction;
    float cache_miss_rate;
  };

  struct MemoryEstimate {
    size_t peak_memory_bytes;
    size_t allocation_count;
    float cache_hit_rate_l1;
    float cache_hit_rate_l3;
  };

  struct IOEstimate {
    size_t bytes_read;
    size_t bytes_written;
    int io_operations;
    float io_wait_time_ms;
  };

  CPUEstimate cpu;
  MemoryEstimate memory;
  IOEstimate io;
};

ResourceProfile estimate_resources(const AST::FunctionNode& func) {
  // Analyze heap allocations, cache access patterns, I/O calls
  return analyze_resource_patterns(func);
}
```

### 3.3 Benchmarking Framework

**Goal**: Validate estimates against actual measurements

```cpp
class BenchmarkValidator {
  struct BenchmarkResult {
    std::string function_name;
    ComplexityEstimate predicted;
    struct {
      double actual_time_ns;
      int actual_operations;
      float cpu_utilization;
      size_t peak_memory;
    } measured;
    float accuracy_percentage;
  };

  std::vector<BenchmarkResult> validate_estimates(
    const std::vector<std::string>& functions_to_benchmark
  ) {
    std::vector<BenchmarkResult> results;

    for (const auto& func_name : functions_to_benchmark) {
      auto estimated = estimator.estimate_function(func_name);
      auto measured = run_microbenchmark(func_name);

      float accuracy = compute_accuracy(estimated, measured);
      results.push_back({ func_name, estimated, measured, accuracy });
    }

    return results;
  }

private:
  struct MeasuredResult {
    double actual_time_ns;
    int actual_operations;
    float cpu_utilization;
    size_t peak_memory;
  };

  MeasuredResult run_microbenchmark(const std::string& func_name);
};
```

---

## 4. SEMANTIC VALIDATION

### 4.1 Type Checking System

```cpp
class TypeValidator {
  struct TypeError {
    std::string message;
    std::string location;  // file:line:col
    std::string suggestion;
  };

  std::vector<TypeError> validate_types(const AST::ProgramNode& program) {
    std::vector<TypeError> errors;
    std::unordered_map<std::string, AST::Type> symbol_table;

    // First pass: collect type definitions
    collect_type_definitions(program, symbol_table);

    // Second pass: validate type usage
    validate_type_usage(program, symbol_table, errors);

    return errors;
  }

private:
  void validate_type_usage(
    const AST::Node& node,
    const std::unordered_map<std::string, AST::Type>& symbol_table,
    std::vector<TypeError>& errors
  ) {
    // Recursive traversal with type checking
    if (auto* call = dynamic_cast<const AST::FunctionCall*>(&node)) {
      validate_function_arguments(*call, symbol_table, errors);
    }
    // ... more validation rules
  }
};
```

### 4.2 Constraint Validation

```cpp
class ConstraintValidator {
  struct Constraint {
    std::string name;
    std::function<bool(const AST::Node&)> predicate;
    std::string violation_message;
  };

  std::vector<Constraint> graph_constraints = {
    {
      "no_cycles",
      [](const AST::Node& n) { /* check acyclic */ return true; },
      "Graph contains cycles"
    },
    {
      "all_nodes_reachable",
      [](const AST::Node& n) { /* check connectivity */ return true; },
      "Some nodes are unreachable from root"
    },
    {
      "valid_edge_weights",
      [](const AST::Node& n) { /* check weights > 0 */ return true; },
      "Edge weight must be positive"
    }
  };

  std::vector<std::string> validate(const DependencyGraph& graph) {
    std::vector<std::string> violations;

    for (const auto& constraint : graph_constraints) {
      if (!constraint.predicate(graph)) {
        violations.push_back(constraint.violation_message);
      }
    }

    return violations;
  }
};
```

### 4.3 Rule-Based Validation Engine

```cpp
class ValidationRuleEngine {
  struct Rule {
    std::string id;
    std::string description;
    std::function<std::vector<std::string>(const AST::Node&)> check;
  };

  std::vector<Rule> rules = {
    {
      "no_dead_code",
      "Warn about unreachable code",
      [](const AST::Node& n) { /* analyze reachability */ return {}; }
    },
    {
      "no_unused_variables",
      "Warn about unused variables",
      [](const AST::Node& n) { /* track variable usage */ return {}; }
    },
    {
      "no_stack_overflow",
      "Detect unbounded recursion",
      [](const AST::Node& n) { /* analyze recursion depth */ return {}; }
    }
  };

  std::vector<std::string> run_all_validations(const AST::ProgramNode& program) {
    std::vector<std::string> all_issues;

    for (const auto& rule : rules) {
      auto issues = rule.check(program);
      all_issues.insert(all_issues.end(), issues.begin(), issues.end());
    }

    return all_issues;
  }
};
```

---

## 5. SUCCESS CRITERIA FOR LAYER 1

✅ **Algorithm Performance**
- BFS: O(V + E) verified by benchmarks
- DFS: O(V + E) with <1% measurement overhead
- Dijkstra: O((V + E) log V) matches theoretical bounds
- Support graphs with 1M+ nodes without performance degradation

✅ **Dependency Analysis**
- Static mapping captures 100% of direct dependencies
- Impact analysis correctly identifies transitive impacts
- Visualization renders graphs with 10K+ nodes in <5 seconds

✅ **Performance Estimation**
- Complexity predictions within 20% of measured values
- Resource estimates (CPU, memory, I/O) accurate to 30%
- Benchmarking framework <1% measurement overhead

✅ **Semantic Validation**
- Type checking catches 95%+ of type errors
- Constraint validation catches graph property violations
- Rule engine detects common patterns (dead code, unused vars, etc.)

---

## 6. IMPLEMENTATION PRIORITIES

**Phase 1 (Week 1-2)**: Core graph algorithms + cycle detection
**Phase 2 (Week 3-4)**: Dependency analysis + visualization
**Phase 3 (Week 5-6)**: Performance estimation + benchmarking
**Phase 4 (Week 7-8)**: Semantic validation framework

---

**Status**: Published ✅
**Next Layer**: Layer 2 (C++ Code Analysis)
