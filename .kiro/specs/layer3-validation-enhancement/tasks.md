# Implementation Plan

## Overview
Implement Option A: Extend the existing TypeScript validation layer in `codegen/src/advanced_validation.ts` and `codegen/src/validation_tests.ts` to provide comprehensive build-time graph analysis, semantic validation, and code generation quality checks.

## Tasks

- [ ] 1. Enhance Graph Structure Validation
  - Add circular dependency detection using DFS algorithm
  - Add wire connection validation to ensure all referenced nodes exist
  - Integrate new validations into existing `validateGraph()` function
  - _Requirements: 1.1, 1.2_

- [ ] 1.1 Implement circular dependency detection
  - Write `testCircularDependencies()` function using DFS with recursion stack
  - Track visited nodes and detect back edges
  - Generate violation with full cycle path for debugging
  - _Requirements: 1.1_

- [ ] 1.2 Implement wire connection validation
  - Write `testWireConnections()` function to validate all wire endpoints
  - Check that `wire.from` and `wire.to` reference existing node IDs
  - Generate violations for dangling wires
  - _Requirements: 1.2_

- [ ] 2. Complete Semantic Analysis Implementation
  - Finish `validateCenterOriginSemantics()` stub in advanced_validation.ts
  - Finish `validateAudioChainSemantics()` stub in advanced_validation.ts
  - Finish `validateSignalFlowSemantics()` stub in advanced_validation.ts
  - _Requirements: 1.3, 4.1, 4.2, 4.3_

- [ ] 2.1 Complete center-origin semantic validation
  - Implement position_gradient documentation checking
  - Detect linear transformations that break center-origin mapping
  - Add violation generation with actionable fix guidance
  - _Requirements: 1.3_

- [ ] 2.2 Complete audio chain semantic validation
  - Detect redundant audio processing (>3 spectrum nodes)
  - Identify unused audio node outputs
  - Validate audio node parameter ranges
  - _Requirements: 4.1, 4.2_

- [ ] 2.3 Complete signal flow semantic validation
  - Implement unreachable node detection
  - Validate that all nodes contribute to output
  - Check for proper node input/output connections
  - _Requirements: 1.2, 4.3_

- [ ] 3. Implement Performance Estimation System
  - Define baseline pattern suite with known performance characteristics
  - Implement CPU cycle estimation with per-node costs
  - Implement memory usage estimation for static allocations
  - Add FPS target validation (100 FPS minimum)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.1 Define baseline pattern suite
  - Document baseline patterns (departure, lava, twilight)
  - Define expected node counts and complexity levels
  - Add baseline pattern metadata to advanced_validation.ts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.2 Implement cycle estimation
  - Define NODE_CYCLE_COSTS map with per-node-type costs
  - Calculate total cycles per frame (cycles × NUM_LEDS)
  - Estimate FPS based on ESP32-S3 @ 240MHz with 70% efficiency
  - _Requirements: 2.1_

- [ ] 3.3 Implement memory estimation
  - Calculate static allocation sizes for palette arrays
  - Estimate per-node memory overhead
  - Track constant buffer sizes
  - _Requirements: 2.4_

- [ ] 3.4 Add performance warnings
  - Flag graphs projected to drop below 100 FPS
  - Warn about expensive operations (sin, cos, exp, log, pow)
  - Suggest optimizations for performance issues
  - _Requirements: 2.2, 2.3, 2.5_

- [ ] 4. Implement Code Quality Analysis
  - Complete `validateCodeGeneration()` function
  - Implement center-origin pattern detection in generated C++
  - Implement bounds checking verification
  - Implement expensive operation detection in tight loops
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 4.1 Implement center-origin code validation
  - Detect center-origin patterns (abs(float(i), STRIP_CENTER_POINT)
  - Detect forbidden edge-to-edge patterns ((float)i / NUM_LEDS)
  - Generate violations with node-level location hints
  - _Requirements: 3.1_

- [ ] 4.2 Implement bounds checking validation
  - Detect missing fmax/fmin calls for array access
  - Check for proper LED array bounds checking
  - Validate palette interpolation bounds
  - _Requirements: 3.2_

- [ ] 4.3 Implement expensive operation detection
  - Count expensive operations (sin, cos, exp, log, pow) in loops
  - Calculate total operations per frame (ops × loops × LEDs)
  - Generate warnings when threshold exceeded (>1000 ops/frame)
  - _Requirements: 3.3_

- [ ] 5. Integrate Validation into Build Pipeline
  - Modify codegen/src/index.ts to call validation before code generation
  - Add --validate-only CLI flag for validation without code generation
  - Add --json-output flag for machine-readable validation results
  - Implement exit code handling (0 = success, 1 = critical failure)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5.1 Add validation hooks to CLI
  - Import validation functions in index.ts
  - Call validateGraph() before compileGraph()
  - Call analyzeGraphSemantics() for performance estimates
  - Call validateCodeGeneration() after code generation
  - _Requirements: 6.1_

- [ ] 5.2 Implement CLI flags
  - Add --validate-only flag to skip code generation
  - Add --json-output <file> flag for JSON report
  - Update CLI help text with new options
  - _Requirements: 6.4_

- [ ] 5.3 Implement exit code handling
  - Exit with code 1 on critical violations
  - Exit with code 0 on success or warnings only
  - Log validation summary before exit
  - _Requirements: 6.2_

- [ ] 5.4 Implement validation reporting
  - Generate console validation report with colors/icons
  - Generate JSON validation report for CI/CD
  - Include performance estimates in reports
  - _Requirements: 6.3, 6.5_

- [ ]* 6. Write Unit Tests
  - Write tests for circular dependency detection
  - Write tests for semantic analysis functions
  - Write tests for performance estimation accuracy
  - Write tests for code quality analysis
  - _Requirements: All_

- [ ]* 6.1 Write graph structure tests
  - Test circular dependency detection with various cycle patterns
  - Test wire validation with valid and invalid connections
  - Test node type compatibility checking
  - _Requirements: 1.1, 1.2_

- [ ]* 6.2 Write semantic analysis tests
  - Test center-origin compliance detection
  - Test audio chain validation with various node counts
  - Test signal flow correctness validation
  - _Requirements: 1.3, 4.1, 4.2, 4.3_

- [ ]* 6.3 Write performance estimation tests
  - Test cycle estimation against baseline patterns
  - Test memory estimation for various graph sizes
  - Test FPS prediction accuracy
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 6.4 Write code quality tests
  - Test center-origin pattern detection in generated code
  - Test bounds checking detection
  - Test expensive operation counting
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Integration Testing and Validation
  - Test with existing compliant patterns (departure, lava, twilight)
  - Test with intentionally invalid patterns (cycles, forbidden nodes)
  - Verify build pipeline integration
  - Validate JSON output format
  - _Requirements: All_

- [ ] 7.1 Test with valid patterns
  - Run validation on all compliant_patterns/*.json files
  - Verify all patterns pass validation
  - Check performance estimates are reasonable
  - _Requirements: All_

- [ ] 7.2 Create and test invalid patterns
  - Create test pattern with circular dependency
  - Create test pattern with forbidden gradient node
  - Create test pattern with invalid audio parameters
  - Verify validation catches all issues
  - _Requirements: 1.1, 1.2, 4.1_

- [ ] 7.3 Test build pipeline integration
  - Run full build with validation enabled
  - Test --validate-only flag
  - Test --json-output flag
  - Verify exit codes work correctly
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
