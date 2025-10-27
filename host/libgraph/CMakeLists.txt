cmake_minimum_required(VERSION 3.15)
project(k1_libgraph LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Library
add_library(k1_graph STATIC
  src/graph.cpp
)
target_include_directories(k1_graph PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Tests
add_executable(k1_graph_tests
  tests/test_main.cpp
)
target_link_libraries(k1_graph_tests PRIVATE k1_graph)

enable_testing()
add_test(NAME k1_graph_tests COMMAND k1_graph_tests)

# Benchmark
add_executable(k1_graph_bench
  tests/bench_large.cpp
)
target_link_libraries(k1_graph_bench PRIVATE k1_graph)