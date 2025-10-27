cmake_minimum_required(VERSION 3.15)
project(Layer3_DSP_Desktop VERSION 1.0.0 LANGUAGES CXX)

# C++17 required for std::optional, std::filesystem
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang|AppleClang")
    add_compile_options(-Wall -Wextra -Wpedantic -O3 -march=native)
endif()

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)

# Test executable
add_executable(test_dsp_and_timing
    tests/test_dsp_and_timing.cpp
)

# Link libraries (math library for sqrt, sin, cos, etc.)
if(UNIX AND NOT APPLE)
    target_link_libraries(test_dsp_and_timing m pthread)
elseif(APPLE)
    target_link_libraries(test_dsp_and_timing m)
endif()

# Enable testing
enable_testing()
add_test(NAME DSP_Tests COMMAND test_dsp_and_timing)

# Install targets
install(TARGETS test_dsp_and_timing DESTINATION bin)
install(DIRECTORY include/ DESTINATION include/layer3_dsp)

# Print configuration
message(STATUS "Layer 3 DSP Desktop Build Configuration:")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Platform: ${CMAKE_SYSTEM_NAME} ${CMAKE_SYSTEM_PROCESSOR}")
