
cmake_minimum_required(VERSION 3.16)
project(k1_graph LANGUAGES CXX)

option(K1_GRAPH_BUILD_TESTS "Build k1_graph tests" ON)
option(K1_GRAPH_BUILD_BENCH "Build k1_graph bench tools" ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(k1_graph STATIC
    src/graph.cpp
    src/graph_io.cpp
)
target_include_directories(k1_graph PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_features(k1_graph PUBLIC cxx_std_17)
if (MSVC)
  target_compile_options(k1_graph PRIVATE /W4 /permissive-)
else()
  target_compile_options(k1_graph PRIVATE -Wall -Wextra -Wpedantic -Wconversion)
endif()

if(K1_GRAPH_BUILD_TESTS)
  enable_testing()
  add_executable(k1_graph_tests
      tests/test_main.cpp
      tests/test_json_loader.cpp
  )
  target_link_libraries(k1_graph_tests PRIVATE k1_graph)
  add_test(NAME k1_graph_tests COMMAND k1_graph_tests)
endif()

if(K1_GRAPH_BUILD_BENCH)
  add_executable(k1_graph_bench
      tests/bench_large.cpp
  )
  target_link_libraries(k1_graph_bench PRIVATE k1_graph)
endif()
