#!/bin/bash

# ============================================================================
# ISOLATED TESTING ENVIRONMENT FOR NODE GRAPH VALIDATION
# ============================================================================
# Creates sandbox environment for safe pattern testing and validation
# Prevents contamination of main system during remediation process

set -e  # Exit on any error

# Configuration
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_ENV_DIR="${WORKSPACE_ROOT}/codegen/test_environment"
BACKUP_DIR="${WORKSPACE_ROOT}/codegen/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# ENVIRONMENT SETUP FUNCTIONS
# ============================================================================

setup_test_environment() {
    log_info "Setting up isolated testing environment..."
    
    # Create test environment directory structure
    mkdir -p "${TEST_ENV_DIR}"
    mkdir -p "${TEST_ENV_DIR}/graphs"
    mkdir -p "${TEST_ENV_DIR}/generated"
    mkdir -p "${TEST_ENV_DIR}/reports"
    mkdir -p "${BACKUP_DIR}"
    
    # Copy current codegen system to test environment
    cp -r "${WORKSPACE_ROOT}/codegen/src" "${TEST_ENV_DIR}/"
    cp -r "${WORKSPACE_ROOT}/codegen/dist" "${TEST_ENV_DIR}/"
    cp "${WORKSPACE_ROOT}/codegen/package.json" "${TEST_ENV_DIR}/"
    cp "${WORKSPACE_ROOT}/codegen/tsconfig.json" "${TEST_ENV_DIR}/"
    
    log_success "Test environment created at: ${TEST_ENV_DIR}"
}

backup_current_system() {
    log_info "Creating backup of current system..."
    
    # Create timestamped backup
    BACKUP_PATH="${BACKUP_DIR}/system_backup_${TIMESTAMP}"
    mkdir -p "${BACKUP_PATH}"
    
    # Backup critical files
    cp "${WORKSPACE_ROOT}/firmware/src/generated_patterns.h" "${BACKUP_PATH}/"
    cp -r "${WORKSPACE_ROOT}/codegen/src" "${BACKUP_PATH}/codegen_src"
    
    # Create backup manifest
    cat > "${BACKUP_PATH}/backup_manifest.txt" << EOF
Backup Created: $(date)
Backup Path: ${BACKUP_PATH}
Files Backed Up:
- firmware/src/generated_patterns.h
- codegen/src/ (complete directory)

Restore Command:
./test_environment.sh restore ${TIMESTAMP}
EOF
    
    log_success "Backup created: ${BACKUP_PATH}"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_graphs() {
    local graph_dir="$1"
    local output_report="$2"
    
    log_info "Running validation tests on graphs in: ${graph_dir}"
    
    cd "${TEST_ENV_DIR}"
    
    # Ensure dependencies are available
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install --silent
    fi
    
    # Build test suite
    log_info "Building validation test suite..."
    npm run build --silent
    
    # Run validation tests
    log_info "Executing validation tests..."
    node dist/test_runner.js validate "${graph_dir}" -o "${output_report}"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "All graphs passed validation"
    else
        log_warning "Some graphs failed validation (see report for details)"
    fi
    
    return $exit_code
}

compile_graphs() {
    local graph_dir="$1"
    local output_file="$2"
    
    log_info "Compiling graphs to C++ code..."
    
    cd "${TEST_ENV_DIR}"
    
    # Compile graphs using multi-pattern mode
    node dist/index.js multi "${graph_dir}" "${output_file}"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Graphs compiled successfully: ${output_file}"
    else
        log_error "Graph compilation failed"
    fi
    
    return $exit_code
}

performance_benchmark() {
    local generated_file="$1"
    
    log_info "Running performance benchmarks..."
    
    # Create simple benchmark test
    cat > "${TEST_ENV_DIR}/benchmark_test.cpp" << 'EOF'
#include <chrono>
#include <iostream>
#include <vector>

// Mock definitions for testing
#define NUM_LEDS 180
struct CRGBF { float r, g, b; };
CRGBF leds[NUM_LEDS];

struct PatternParameters {
    float brightness = 1.0f;
    float speed = 1.0f;
    float saturation = 1.0f;
    float warmth = 0.5f;
    float background = 0.1f;
    int palette_id = 0;
    float custom_param_1 = 0.0f;
};

// Include generated patterns
#include "generated_patterns_test.h"

int main() {
    PatternParameters params;
    const int iterations = 1000;
    
    auto start = std::chrono::high_resolution_clock::now();
    
    for (int i = 0; i < iterations; i++) {
        float time = i * 0.016f; // 60 FPS
        
        // Test each pattern (would need to be customized per generated file)
        // This is a template - actual implementation depends on generated patterns
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    double avg_frame_time = duration.count() / (double)iterations;
    double fps = 1000000.0 / avg_frame_time;
    
    std::cout << "Performance Benchmark Results:" << std::endl;
    std::cout << "Average frame time: " << avg_frame_time << " μs" << std::endl;
    std::cout << "Estimated FPS: " << fps << std::endl;
    std::cout << "Target: 120+ FPS (8333 μs max)" << std::endl;
    
    if (fps >= 120.0) {
        std::cout << "✅ PASSED: Performance meets target" << std::endl;
        return 0;
    } else {
        std::cout << "❌ FAILED: Performance below target" << std::endl;
        return 1;
    }
}
EOF
    
    log_info "Performance benchmark template created"
    log_warning "Manual performance testing required with actual hardware"
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

restore_backup() {
    local backup_timestamp="$1"
    
    if [ -z "$backup_timestamp" ]; then
        log_error "Backup timestamp required for restore"
        echo "Available backups:"
        ls -la "${BACKUP_DIR}" | grep "system_backup_"
        return 1
    fi
    
    local backup_path="${BACKUP_DIR}/system_backup_${backup_timestamp}"
    
    if [ ! -d "$backup_path" ]; then
        log_error "Backup not found: ${backup_path}"
        return 1
    fi
    
    log_warning "Restoring system from backup: ${backup_timestamp}"
    read -p "Are you sure? This will overwrite current files. (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Restore files
        cp "${backup_path}/generated_patterns.h" "${WORKSPACE_ROOT}/firmware/src/"
        cp -r "${backup_path}/codegen_src/"* "${WORKSPACE_ROOT}/codegen/src/"
        
        log_success "System restored from backup: ${backup_timestamp}"
    else
        log_info "Restore cancelled"
    fi
}

# ============================================================================
# MAIN COMMAND INTERFACE
# ============================================================================

show_help() {
    cat << EOF
Node Graph Testing Environment

USAGE:
    ./test_environment.sh <command> [options]

COMMANDS:
    setup                   - Create isolated testing environment
    backup                  - Backup current system state
    validate <graph_dir>    - Validate all graphs in directory
    compile <graph_dir>     - Compile graphs to C++ code
    benchmark <cpp_file>    - Run performance benchmarks
    restore <timestamp>     - Restore from backup
    clean                   - Clean test environment
    help                    - Show this help

EXAMPLES:
    ./test_environment.sh setup
    ./test_environment.sh backup
    ./test_environment.sh validate ../Implementation.plans/Graphs/
    ./test_environment.sh compile compliant_graphs/ test_patterns.h
    ./test_environment.sh restore 20251027_041500

ENVIRONMENT:
    Test Environment: ${TEST_ENV_DIR}
    Backup Directory: ${BACKUP_DIR}
EOF
}

# Main command dispatcher
case "${1:-help}" in
    setup)
        setup_test_environment
        ;;
    backup)
        backup_current_system
        ;;
    validate)
        if [ -z "$2" ]; then
            log_error "Graph directory required"
            echo "Usage: $0 validate <graph_directory>"
            exit 1
        fi
        setup_test_environment
        validate_graphs "$2" "${TEST_ENV_DIR}/reports/validation_report_${TIMESTAMP}.md"
        ;;
    compile)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Graph directory and output file required"
            echo "Usage: $0 compile <graph_directory> <output_file>"
            exit 1
        fi
        setup_test_environment
        compile_graphs "$2" "${TEST_ENV_DIR}/generated/$3"
        ;;
    benchmark)
        if [ -z "$2" ]; then
            log_error "Generated C++ file required"
            echo "Usage: $0 benchmark <generated_cpp_file>"
            exit 1
        fi
        performance_benchmark "$2"
        ;;
    restore)
        restore_backup "$2"
        ;;
    clean)
        log_info "Cleaning test environment..."
        rm -rf "${TEST_ENV_DIR}"
        log_success "Test environment cleaned"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac