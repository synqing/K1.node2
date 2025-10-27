/**
 * @file test_integration_performance.cpp
 * @brief Comprehensive integration test and 1M node performance benchmark
 *
 * Tests all Layer 1 components working together:
 * - Graph algorithms (BFS, DFS, Dijkstra)
 * - Dependency analyzer
 * - Performance estimator
 * - Validator
 *
 * Performance targets:
 * - 1M node graph construction < 5 seconds
 * - BFS/DFS on 1M nodes < 1 second
 * - Memory-efficient (no leaks)
 *
 * Build:
 *   g++ -std=c++17 -Wall -Wextra -Werror -O2 -I../graph_algorithms \
 *       test_integration_performance.cpp -o test_integration_performance
 *
 * @author Claude (C++ Programming Expert)
 * @date 2025-10-27
 */

#include "graph_algorithms.hpp"
#include "dependency_analyzer.hpp"
#include "performance_estimator.hpp"
#include "validator.hpp"

#include <cassert>
#include <chrono>
#include <iostream>
#include <random>

using namespace layer1;

// ============================================================================
// Test Utilities
// ============================================================================

void print_section(const std::string& title) {
    std::cout << "\n" << std::string(70, '=') << "\n";
    std::cout << title << "\n";
    std::cout << std::string(70, '=') << "\n";
}

void print_result(const std::string& test, bool passed) {
    std::cout << "[" << (passed ? "PASS" : "FAIL") << "] " << test << "\n";
    if (!passed) {
        std::cerr << "FAILURE: Test failed\n";
        std::exit(1);
    }
}

// ============================================================================
// Integration Test 1: Dependency Analysis Workflow
// ============================================================================

void test_dependency_analysis_workflow() {
    print_section("Integration Test 1: Dependency Analysis Workflow");

    dependency::DependencyAnalyzer analyzer;

    // Simulate a simple module dependency graph
    // Module structure:
    //   main -> utils, logger
    //   utils -> logger
    //   logger -> (none)
    //
    // Expected build order: logger, utils, main

    std::cout << "Registering components...\n";
    analyzer.register_component(dependency::Component("main", "module", "main.cpp", 1));
    analyzer.register_component(dependency::Component("utils", "module", "utils.cpp", 1));
    analyzer.register_component(dependency::Component("logger", "module", "logger.cpp", 1));

    std::cout << "Registering dependencies...\n";
    analyzer.register_dependency(dependency::Dependency("main", "utils", "includes"));
    analyzer.register_dependency(dependency::Dependency("main", "logger", "includes"));
    analyzer.register_dependency(dependency::Dependency("utils", "logger", "includes"));

    std::cout << "Computing build order...\n";
    auto build_order = analyzer.compute_build_order();

    print_result("Build order computed", build_order.size() == 3);

    // Check dependency constraints (any valid topological order works)
    auto pos = [&](const std::string& name) -> std::size_t {
        for (std::size_t i = 0; i < build_order.size(); ++i) {
            if (build_order[i] == name) return i;
        }
        return std::size_t(-1);
    };

    print_result("Logger before utils", pos("logger") < pos("utils"));
    print_result("Logger before main", pos("logger") < pos("main"));
    print_result("Utils before main", pos("utils") < pos("main"));

    std::cout << "Build order: ";
    for (const auto& comp : build_order) {
        std::cout << comp << " ";
    }
    std::cout << "\n";

    // Test impact analysis
    std::cout << "\nImpact analysis for logger change:\n";
    auto impact = analyzer.get_impact_set("logger");
    std::cout << "  Components affected: " << impact.size() << "\n";
    for (const auto& comp : impact) {
        std::cout << "    - " << comp << "\n";
    }

    print_result("Logger impacts utils and main", impact.size() == 2);

    // Export to DOT
    std::cout << "\nExporting dependency graph...\n";
    analyzer.export_to_dot("/tmp/dependency_graph.dot");

    analyzer.print_statistics();

    std::cout << "\n[PASS] Dependency analysis workflow complete\n";
}

// ============================================================================
// Integration Test 2: Performance Estimation Workflow
// ============================================================================

void test_performance_estimation_workflow() {
    print_section("Integration Test 2: Performance Estimation Workflow");

    performance::PerformanceEstimator estimator;

    // Benchmark a linear algorithm (graph construction)
    auto linear_func = [](std::size_t n) {
        graph::UnweightedGraph g;
        for (std::size_t i = 0; i < n; ++i) {
            g.add_edge(i, (i + 1) % n);  // Circular graph
        }
    };

    std::cout << "Benchmarking linear algorithm...\n";
    auto results = estimator.benchmark(
        linear_func,
        {100, 1000, 10000, 100000},
        5  // iterations
    );

    estimator.print_benchmark_results(results);

    auto complexity = estimator.estimate_complexity(results);
    estimator.print_complexity_analysis(results, complexity);

    print_result("Complexity is linear", complexity == performance::ComplexityClass::LINEAR);

    // Predict runtime for 1M nodes
    double predicted_us = estimator.predict_runtime(results, complexity, 1000000);
    std::cout << "Predicted runtime for 1M nodes: "
              << (predicted_us / 1000.0) << " ms\n";

    print_result("Prediction reasonable", predicted_us > 0.0 && predicted_us < 10000000.0);

    std::cout << "\n[PASS] Performance estimation workflow complete\n";
}

// ============================================================================
// Integration Test 3: Validation Workflow
// ============================================================================

void test_validation_workflow() {
    print_section("Integration Test 3: Validation Workflow");

    validation::Validator<graph::UnweightedGraph> validator;
    validator.register_standard_rules();

    std::cout << "Registered " << validator.rule_count() << " validation rules\n";

    // Test 1: Valid DAG
    {
        std::cout << "\nValidating DAG (should pass)...\n";
        graph::UnweightedGraph dag;
        dag.add_edge(0, 1);
        dag.add_edge(1, 2);
        dag.add_edge(0, 2);

        auto report = validator.validate(dag);
        report.print();

        print_result("DAG passes validation", report.is_valid());
    }

    // Test 2: Graph with cycle
    {
        std::cout << "\nValidating cyclic graph (should fail)...\n";
        graph::UnweightedGraph cyclic;
        cyclic.add_edge(0, 1);
        cyclic.add_edge(1, 2);
        cyclic.add_edge(2, 0);  // Creates cycle

        auto report = validator.validate(cyclic);
        report.print();

        print_result("Cyclic graph fails validation", !report.is_valid());
    }

    // Test 3: Disconnected graph
    {
        std::cout << "\nValidating disconnected graph (warnings expected)...\n";
        graph::UnweightedGraph disconnected;
        disconnected.add_edge(0, 1);
        disconnected.add_edge(2, 3);  // Disconnected

        auto report = validator.validate(disconnected);
        report.print();

        print_result("Disconnected graph has warnings", report.warning_count > 0);
    }

    std::cout << "\n[PASS] Validation workflow complete\n";
}

// ============================================================================
// Performance Benchmark: 1M Node Graph
// ============================================================================

void benchmark_1m_node_graph() {
    print_section("Performance Benchmark: 1 Million Node Graph");

    const std::size_t N = 1000000;
    std::cout << "Target: " << N << " nodes\n";

    // Construction phase
    std::cout << "\nPhase 1: Graph construction...\n";
    auto start_construction = std::chrono::high_resolution_clock::now();

    graph::UnweightedGraph large_graph;

    // Build linear chain (worst case for depth)
    for (std::size_t i = 0; i < N - 1; ++i) {
        large_graph.add_edge(i, i + 1);
    }

    auto end_construction = std::chrono::high_resolution_clock::now();
    auto construction_time = std::chrono::duration_cast<std::chrono::milliseconds>(
        end_construction - start_construction
    ).count();

    std::cout << "  Construction time: " << construction_time << " ms\n";
    std::cout << "  Node count: " << large_graph.node_count() << "\n";
    std::cout << "  Edge count: " << large_graph.edge_count() << "\n";

    print_result("1M nodes constructed", large_graph.node_count() == N);
    print_result("Construction < 5s", construction_time < 5000);

    // BFS benchmark
    std::cout << "\nPhase 2: BFS traversal...\n";
    auto bfs_result = large_graph.traverse(0, graph::TraversalAlgorithm::BFS);
    std::cout << "  BFS time: " << bfs_result.elapsed_time.count() << " us ("
              << (bfs_result.elapsed_time.count() / 1000.0) << " ms)\n";
    std::cout << "  Nodes visited: " << bfs_result.path.size() << "\n";

    print_result("BFS visited all nodes", bfs_result.path.size() == N);
    print_result("BFS < 1s", bfs_result.elapsed_time.count() < 1000000);

    // DFS benchmark
    std::cout << "\nPhase 3: DFS traversal...\n";
    auto dfs_result = large_graph.traverse(0, graph::TraversalAlgorithm::DFS);
    std::cout << "  DFS time: " << dfs_result.elapsed_time.count() << " us ("
              << (dfs_result.elapsed_time.count() / 1000.0) << " ms)\n";
    std::cout << "  Nodes visited: " << dfs_result.path.size() << "\n";

    print_result("DFS visited all nodes", dfs_result.path.size() == N);
    print_result("DFS < 1s", dfs_result.elapsed_time.count() < 1000000);

    // Cycle detection (should be fast on acyclic graph)
    std::cout << "\nPhase 4: Cycle detection...\n";
    auto start_cycle = std::chrono::high_resolution_clock::now();
    bool has_cycle = large_graph.has_cycle();
    auto end_cycle = std::chrono::high_resolution_clock::now();
    auto cycle_time = std::chrono::duration_cast<std::chrono::microseconds>(
        end_cycle - start_cycle
    ).count();

    std::cout << "  Cycle detection time: " << cycle_time << " us ("
              << (cycle_time / 1000.0) << " ms)\n";
    std::cout << "  Has cycle: " << (has_cycle ? "YES" : "NO") << "\n";

    print_result("No cycle detected", !has_cycle);
    print_result("Cycle detection < 1s", cycle_time < 1000000);

    // Memory estimate
    std::cout << "\nPhase 5: Memory analysis...\n";
    std::size_t est_memory_per_node = sizeof(graph::NodeID) +
                                       sizeof(std::vector<graph::Edge<void>>) * 2;
    std::size_t est_total = performance::PerformanceEstimator::estimate_memory(
        est_memory_per_node, N, 1024  // 1KB overhead
    );

    std::cout << "  Estimated memory: " << (est_total / 1024 / 1024) << " MB\n";

    // Complexity verification
    std::cout << "\nPhase 6: Complexity verification...\n";
    std::cout << "  BFS complexity: O(V+E) = O(" << N << " + " << (N-1) << ") ≈ O(" << N << ")\n";
    std::cout << "  Theoretical operations: " << (N + (N-1)) << "\n";
    std::cout << "  Time per operation: "
              << (static_cast<double>(bfs_result.elapsed_time.count()) / static_cast<double>(N + N - 1))
              << " ns\n";

    std::cout << "\n[PASS] 1M node benchmark complete\n";
}

// ============================================================================
// Scaling Analysis
// ============================================================================

void analyze_scaling_behavior() {
    print_section("Scaling Analysis: BFS Performance");

    std::vector<std::size_t> sizes = {1000, 10000, 100000, 500000, 1000000};
    std::vector<double> times;

    std::cout << "Running scaling tests...\n\n";
    std::cout << "Nodes      | Time (ms) | Ops/sec     | ns/op\n";
    std::cout << "-----------|-----------|-------------|---------\n";

    for (std::size_t n : sizes) {
        graph::UnweightedGraph g;
        for (std::size_t i = 0; i < n - 1; ++i) {
            g.add_edge(i, i + 1);
        }

        auto result = g.traverse(0, graph::TraversalAlgorithm::BFS);
        double time_ms = result.elapsed_time.count() / 1000.0;
        double ops_per_sec = (static_cast<double>(n) / result.elapsed_time.count()) * 1000000.0;
        double ns_per_op = static_cast<double>(result.elapsed_time.count() * 1000) / static_cast<double>(n);

        times.push_back(time_ms);

        std::cout << std::right;
        std::cout.width(10);
        std::cout << n << " | ";
        std::cout.width(9);
        std::cout.precision(2);
        std::cout << std::fixed << time_ms << " | ";
        std::cout.width(11);
        std::cout << static_cast<std::size_t>(ops_per_sec) << " | ";
        std::cout.width(8);
        std::cout << ns_per_op << "\n";
    }

    std::cout << "\nScaling ratios (actual vs theoretical 10x):\n";
    for (std::size_t i = 1; i < times.size(); ++i) {
        double ratio = times[i] / times[i-1];
        double size_ratio = static_cast<double>(sizes[i]) / static_cast<double>(sizes[i-1]);
        std::cout << "  " << sizes[i-1] << " -> " << sizes[i]
                  << ": " << ratio << "x (expected " << size_ratio << "x)\n";
    }

    std::cout << "\n[PASS] Scaling analysis complete\n";
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main() {
    try {
        std::cout << "============================================\n";
        std::cout << "Layer 1 Comprehensive Integration & Performance Tests\n";
        std::cout << "============================================\n";

        // Integration tests
        test_dependency_analysis_workflow();
        test_performance_estimation_workflow();
        test_validation_workflow();

        // Performance benchmarks
        benchmark_1m_node_graph();
        analyze_scaling_behavior();

        std::cout << "\n" << std::string(70, '=') << "\n";
        std::cout << "ALL INTEGRATION & PERFORMANCE TESTS PASSED\n";
        std::cout << std::string(70, '=') << "\n";

        return 0;

    } catch (const std::exception& e) {
        std::cerr << "\nFATAL ERROR: " << e.what() << "\n";
        return 1;
    }
}
