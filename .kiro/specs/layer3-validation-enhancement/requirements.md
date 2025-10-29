# Requirements Document

## Introduction

Extend the existing TypeScript validation layer in `codegen/src/advanced_validation.ts` to provide comprehensive build-time graph analysis, semantic validation, and code generation quality checks. This implements Option A from the Layer 3 Architectural Review, focusing on build-time analysis rather than runtime execution.

## Glossary

- **Graph_Analyzer**: Functions in advanced_validation.ts that perform static analysis of node graphs before code generation (analyzeGraphSemantics, etc.)
- **Semantic_Validator**: Functions in validation_tests.ts and advanced_validation.ts that validate graph logic, signal flow, and architectural compliance
- **Code_Validator**: Functions in advanced_validation.ts that analyze generated C++ code for correctness and performance (validateCodeGeneration, etc.)
- **Validation_Layer**: The complete build-time validation system in codegen/src/ (validation_tests.ts + advanced_validation.ts)
- **Center_Origin_Architecture**: K1 design principle requiring spatial patterns to originate from center coordinates
- **Build_Time_Analysis**: Static analysis performed during graph compilation, before firmware deployment
- **FPS_Target**: Minimum 100 FPS required, with 120 FPS as the performance goal for smooth LED animations
- **Static_Allocation**: Memory allocations known at compile time (palette arrays, constant buffers) that can be analyzed without runtime profiling

## Requirements

### Requirement 1

**User Story:** As a pattern developer, I want comprehensive graph validation during build time, so that I can catch errors before firmware deployment.

#### Acceptance Criteria

1. WHEN the Graph_Analyzer receives a node graph, THE Validation_Layer SHALL detect circular dependencies with 100% accuracy
2. WHEN the Graph_Analyzer validates wire connections, THE Validation_Layer SHALL identify all invalid node references
3. WHEN the Semantic_Validator checks center-origin compliance, THE Validation_Layer SHALL flag edge-to-edge gradient patterns
4. WHEN the Validation_Layer completes analysis, THE Validation_Layer SHALL provide actionable fix guidance for each violation
5. WHEN validation fails with critical issues, THE Validation_Layer SHALL prevent code generation

### Requirement 2

**User Story:** As a pattern developer, I want performance estimation during build time, so that I can optimize graphs before hardware testing.

#### Acceptance Criteria

1. WHEN the Graph_Analyzer estimates CPU cycles, THE Validation_Layer SHALL provide best-effort predictions validated against a baseline pattern suite
2. WHEN the Graph_Analyzer detects expensive operations, THE Validation_Layer SHALL warn about performance impact with operation counts
3. WHEN the Graph_Analyzer computes complexity scores, THE Validation_Layer SHALL flag graphs projected to drop below 100 FPS minimum requirement
4. WHEN the Graph_Analyzer analyzes memory usage, THE Validation_Layer SHALL estimate Static_Allocation sizes for palette arrays and constant buffers
5. WHEN performance issues are detected, THE Validation_Layer SHALL suggest specific optimizations with node-level guidance

### Requirement 3

**User Story:** As a pattern developer, I want generated code validation, so that I can ensure C++ output is correct and optimal.

#### Acceptance Criteria

1. WHEN the Code_Validator analyzes generated C++, THE Validation_Layer SHALL verify center-origin implementation patterns in code
2. WHEN the Code_Validator checks for undefined behavior, THE Validation_Layer SHALL detect missing bounds checks via static analysis
3. WHEN the Code_Validator measures code quality, THE Validation_Layer SHALL flag expensive operations in tight loops with operation counts
4. WHEN the Code_Validator validates output, THE Validation_Layer SHALL perform static analysis of generated C++ syntax and structure
5. WHEN code issues are found, THE Validation_Layer SHALL provide best-effort references including node ID and generated block location

### Requirement 4

**User Story:** As a pattern developer, I want audio chain validation, so that I can ensure audio-reactive patterns work correctly.

#### Acceptance Criteria

1. WHEN the Semantic_Validator checks audio nodes, THE Validation_Layer SHALL validate spectrum bin ranges (0-63)
2. WHEN the Semantic_Validator analyzes audio chains, THE Validation_Layer SHALL detect redundant audio processing
3. WHEN the Semantic_Validator validates signal flow, THE Validation_Layer SHALL identify unused audio node outputs
4. WHEN the Semantic_Validator checks beat nodes, THE Validation_Layer SHALL validate tempo_bin parameters
5. WHEN audio issues are detected, THE Validation_Layer SHALL suggest consolidation or optimization strategies

### Requirement 5

**User Story:** As a validation system developer, I want a baseline pattern suite for calibration, so that performance estimates can be validated against known reference patterns.

#### Acceptance Criteria

1. WHEN the Validation_Layer initializes, THE Validation_Layer SHALL define a baseline suite containing simple, medium, and complex reference patterns
2. WHEN the baseline suite is defined, THE Validation_Layer SHALL include patterns with known node counts (5-10 nodes simple, 15-25 nodes medium, 30+ nodes complex)
3. WHEN the baseline suite is defined, THE Validation_Layer SHALL include patterns with varying audio node usage (none, light, heavy)
4. WHEN performance estimates are calibrated, THE Validation_Layer SHALL use baseline patterns from codegen/compliant_patterns/ directory
5. WHEN baseline patterns are selected, THE Validation_Layer SHALL include at minimum: one position-only pattern, one audio-reactive pattern, and one complex multi-node pattern

### Requirement 6

**User Story:** As a build system maintainer, I want validation integrated into the compilation pipeline, so that invalid graphs are rejected automatically.

#### Acceptance Criteria

1. WHEN the codegen CLI compiles a graph, THE Validation_Layer SHALL run all validation checks before code generation
2. WHEN critical violations are found, THE Validation_Layer SHALL exit with non-zero status code
3. WHEN validation passes, THE Validation_Layer SHALL log performance estimates and warnings
4. WHEN the build system invokes codegen, THE Validation_Layer SHALL provide machine-readable JSON output
5. WHEN validation completes, THE Validation_Layer SHALL generate a comprehensive validation report
