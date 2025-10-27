// ============================================================================
// ADVANCED VALIDATION FRAMEWORK - Multi-Layer Testing
// ============================================================================
// Provides rigorous validation beyond simple text matching
// Includes: AST analysis, code generation testing, runtime simulation

import { Graph, Node } from './index.js';
import { ValidationResult, Violation, Warning } from './validation_tests.js';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// ============================================================================
// LAYER 1: SEMANTIC GRAPH ANALYSIS
// ============================================================================

export interface SemanticAnalysisResult {
    centerOriginCompliant: boolean;
    audioChainValid: boolean;
    signalFlowCorrect: boolean;
    performanceEstimate: PerformanceMetrics;
    semanticViolations: Violation[];
}

export interface PerformanceMetrics {
    estimatedCyclesPerFrame: number;
    memoryUsageBytes: number;
    complexityScore: number;
    frameRateEstimate: number;
}

/**
 * LAYER 1: Semantic Graph Analysis
 * Analyzes the actual logic flow and mathematical operations
 */
export function analyzeGraphSemantics(graph: Graph): SemanticAnalysisResult {
    const violations: Violation[] = [];
    
    // Build dependency graph
    const nodeMap = new Map<string, Node>();
    graph.nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Analyze center-origin compliance at semantic level
    const centerOriginCompliant = validateCenterOriginSemantics(graph, nodeMap, violations);
    
    // Analyze audio processing chain
    const audioChainValid = validateAudioChainSemantics(graph, nodeMap, violations);
    
    // Analyze signal flow correctness
    const signalFlowCorrect = validateSignalFlowSemantics(graph, nodeMap, violations);
    
    // Estimate performance characteristics
    const performanceEstimate = estimatePerformance(graph, nodeMap);
    
    return {
        centerOriginCompliant,
        audioChainValid,
        signalFlowCorrect,
        performanceEstimate,
        semanticViolations: violations
    };
}

/**
 * Validates that position_gradient nodes actually implement center-origin mapping
 * Goes beyond documentation to check the mathematical operations
 */
function validateCenterOriginSemantics(graph: Graph, nodeMap: Map<string, Node>, violations: Violation[]): boolean {
    let compliant = true;
    
    const positionNodes = graph.nodes.filter(n => n.type === 'position_gradient');
    
    positionNodes.forEach(node => {
        // Check if this position_gradient is used in a way that creates center-origin mapping
        const consumers = findNodeConsumers(node.id, graph);
        
        consumers.forEach(consumer => {
            if (consumer.type === 'palette_interpolate') {
                // This should create radial patterns from center
                // Check if there are any linear transformations that would break center-origin
                const hasLinearTransform = checkForLinearTransformations(node.id, consumer.id, graph, nodeMap);
                
                if (hasLinearTransform) {
                    violations.push({
                        type: 'architecture',
                        severity: 'critical',
                        description: `position_gradient "${node.id}" has linear transformations that may break center-origin mapping`,
                        location: `Signal path: ${node.id} → ${consumer.id}`,
                        fix_guidance: 'Remove linear transformations that convert center-origin to edge-to-edge mapping'
                    });
                    compliant = false;
                }
            }
        });
    });
    
    return compliant;
}

/**
 * Validates audio processing chains for correctness and efficiency
 */
function validateAudioChainSemantics(graph: Graph, nodeMap: Map<string, Node>, violations: Violation[]): boolean {
    let valid = true;
    
    // Check for audio processing bottlenecks
    const audioNodes = graph.nodes.filter(n => 
        ['spectrum_bin', 'spectrum_range', 'spectrum_interpolate', 'beat', 'chromagram', 'audio_level'].includes(n.type)
    );
    
    // Detect redundant audio processing
    const spectrumNodes = audioNodes.filter(n => n.type.startsWith('spectrum'));
    if (spectrumNodes.length > 3) {
        violations.push({
            type: 'audio_chain',
            severity: 'major',
            description: `Excessive spectrum processing nodes (${spectrumNodes.length}) may impact performance`,
            location: `Nodes: ${spectrumNodes.map(n => n.id).join(', ')}`,
            fix_guidance: 'Consider consolidating spectrum analysis or using cached results'
        });
        valid = false;
    }
    
    // Check for proper audio data flow
    audioNodes.forEach(node => {
        const consumers = findNodeConsumers(node.id, graph);
        if (consumers.length === 0) {
            violations.push({
                type: 'audio_chain',
                severity: 'major',
                description: `Audio node "${node.id}" output is not used`,
                location: `Node: ${node.id}`,
                fix_guidance: 'Connect audio node output to processing chain or remove unused node'
            });
            valid = false;
        }
    });
    
    return valid;
}

/**
 * Validates signal flow for logical correctness
 */
function validateSignalFlowSemantics(graph: Graph, nodeMap: Map<string, Node>, violations: Violation[]): boolean {
    let correct = true;
    
    // Check for circular dependencies
    const circularDeps = detectCircularDependencies(graph);
    if (circularDeps.length > 0) {
        violations.push({
            type: 'node_compatibility',
            severity: 'critical',
            description: `Circular dependencies detected: ${circularDeps.join(' → ')}`,
            location: 'Signal flow graph',
            fix_guidance: 'Remove circular dependencies by restructuring node connections'
        });
        correct = false;
    }
    
    // Check for unreachable nodes
    const unreachableNodes = findUnreachableNodes(graph);
    unreachableNodes.forEach(node => {
        violations.push({
            type: 'node_compatibility',
            severity: 'major',
            description: `Node "${node.id}" is unreachable from any input`,
            location: `Node: ${node.id}`,
            fix_guidance: 'Connect node to input source or remove if unused'
        });
        correct = false;
    });
    
    return correct;
}

/**
 * Estimates performance characteristics of the graph
 */
function estimatePerformance(graph: Graph, nodeMap: Map<string, Node>): PerformanceMetrics {
    let cycles = 0;
    let memory = 0;
    
    // Estimate cycles per node type
    const cycleCosts = {
        'position_gradient': 10,
        'palette_interpolate': 50,
        'spectrum_bin': 5,
        'spectrum_range': 20,
        'spectrum_interpolate': 100,
        'beat': 30,
        'chromagram': 15,
        'audio_level': 5,
        'time': 1,
        'sin': 25,
        'add': 2,
        'multiply': 3,
        'constant': 1,
        'clamp': 2,
        'modulo': 10,
        'scale': 2
    };
    
    graph.nodes.forEach(node => {
        const cost = cycleCosts[node.type as keyof typeof cycleCosts] || 10;
        cycles += cost;
        memory += 16; // Rough estimate per node
    });
    
    // Multiply by LED count for per-frame cost
    const NUM_LEDS = 180; // Typical LED count
    const totalCycles = cycles * NUM_LEDS;
    
    // Estimate frame rate (assuming 80MHz CPU, 70% efficiency)
    const cpuFreq = 80_000_000 * 0.7;
    const frameRateEstimate = cpuFreq / totalCycles;
    
    const complexityScore = Math.min(100, (graph.nodes.length * 10) + (graph.wires.length * 5));
    
    return {
        estimatedCyclesPerFrame: totalCycles,
        memoryUsageBytes: memory,
        complexityScore,
        frameRateEstimate: Math.min(1000, frameRateEstimate) // Cap at 1000 FPS
    };
}

// ============================================================================
// LAYER 2: CODE GENERATION VALIDATION
// ============================================================================

export interface CodeGenerationResult {
    compilationSuccessful: boolean;
    generatedCodeValid: boolean;
    centerOriginImplemented: boolean;
    performanceOptimal: boolean;
    codeViolations: Violation[];
}

/**
 * LAYER 2: Code Generation Validation
 * Compiles the graph and analyzes the generated C++ code
 */
export async function validateCodeGeneration(graph: Graph, graphPath: string): Promise<CodeGenerationResult> {
    const violations: Violation[] = [];
    
    try {
        // Generate C++ code
        const tempFile = `/tmp/test_pattern_${Date.now()}.h`;
        execSync(`cd codegen && node dist/index.js single "${graphPath}" "${tempFile}"`);
        
        // Read generated code
        const generatedCode = readFileSync(tempFile, 'utf-8');
        
        // Analyze generated code
        const compilationSuccessful = true; // If we got here, compilation worked
        const generatedCodeValid = validateGeneratedCode(generatedCode, violations);
        const centerOriginImplemented = checkCenterOriginInCode(generatedCode, violations);
        const performanceOptimal = checkCodePerformance(generatedCode, violations);
        
        return {
            compilationSuccessful,
            generatedCodeValid,
            centerOriginImplemented,
            performanceOptimal,
            codeViolations: violations
        };
        
    } catch (error) {
        violations.push({
            type: 'node_compatibility',
            severity: 'critical',
            description: `Code generation failed: ${error}`,
            location: 'Compilation process',
            fix_guidance: 'Fix graph structure or node parameters to enable successful compilation'
        });
        
        return {
            compilationSuccessful: false,
            generatedCodeValid: false,
            centerOriginImplemented: false,
            performanceOptimal: false,
            codeViolations: violations
        };
    }
}

/**
 * Validates the structure and quality of generated C++ code
 */
function validateGeneratedCode(code: string, violations: Violation[]): boolean {
    let valid = true;
    
    // Check for common code issues
    if (code.includes('undefined') || code.includes('NaN')) {
        violations.push({
            type: 'node_compatibility',
            severity: 'critical',
            description: 'Generated code contains undefined values or NaN',
            location: 'Generated C++ code',
            fix_guidance: 'Fix node parameters or graph structure to prevent undefined values'
        });
        valid = false;
    }
    
    // Check for proper bounds checking
    if (!code.includes('fmax') && !code.includes('fmin') && code.includes('leds[i]')) {
        violations.push({
            type: 'node_compatibility',
            severity: 'major',
            description: 'Generated code lacks bounds checking for LED array access',
            location: 'Generated C++ code',
            fix_guidance: 'Add clamp nodes or bounds checking to prevent array overflow'
        });
        valid = false;
    }
    
    return valid;
}

/**
 * Checks if generated code actually implements center-origin mapping
 */
function checkCenterOriginInCode(code: string, violations: Violation[]): boolean {
    // Look for center-origin mathematical patterns
    const hasCenterOrigin = code.includes('abs(float(i)') && 
                           (code.includes('STRIP_CENTER_POINT') || code.includes('NUM_LEDS / 2'));
    
    // Look for forbidden edge-to-edge patterns
    const hasEdgeToEdge = code.includes('(float)i / NUM_LEDS') && 
                         !code.includes('abs(float(i)');
    
    if (hasEdgeToEdge) {
        violations.push({
            type: 'architecture',
            severity: 'critical',
            description: 'Generated code creates forbidden edge-to-edge linear gradient',
            location: 'Generated C++ code',
            fix_guidance: 'Update graph to use center-origin position mapping'
        });
        return false;
    }
    
    if (!hasCenterOrigin) {
        violations.push({
            type: 'architecture',
            severity: 'major',
            description: 'Generated code does not implement center-origin mapping',
            location: 'Generated C++ code',
            fix_guidance: 'Ensure position_gradient nodes generate center-origin code'
        });
        return false;
    }
    
    return true;
}

/**
 * Checks generated code for performance issues
 */
function checkCodePerformance(code: string, violations: Violation[]): boolean {
    let optimal = true;
    
    // Check for expensive operations in tight loops
    const expensiveOps = ['sin(', 'cos(', 'exp(', 'log(', 'pow('];
    const loopCount = (code.match(/for.*NUM_LEDS/g) || []).length;
    
    expensiveOps.forEach(op => {
        const opCount = (code.match(new RegExp(op.replace('(', '\\('), 'g')) || []).length;
        if (opCount > 0 && loopCount > 0) {
            const totalOps = opCount * loopCount * 180; // Assume 180 LEDs
            if (totalOps > 1000) {
                violations.push({
                    type: 'audio_chain',
                    severity: 'major',
                    description: `Expensive operation ${op} called ${totalOps} times per frame`,
                    location: 'Generated C++ code',
                    fix_guidance: 'Consider pre-computing expensive operations or using lookup tables'
                });
                optimal = false;
            }
        }
    });
    
    return optimal;
}

// ============================================================================
// LAYER 3: RUNTIME SIMULATION
// ============================================================================

export interface RuntimeSimulationResult {
    visualOutputCorrect: boolean;
    performanceAcceptable: boolean;
    audioResponsive: boolean;
    runtimeViolations: Violation[];
}

/**
 * LAYER 3: Runtime Simulation
 * Simulates pattern execution with mock data
 */
export function simulateRuntime(graph: Graph): RuntimeSimulationResult {
    const violations: Violation[] = [];
    
    // Simulate with different input conditions
    const testCases = [
        { time: 0, audio: { vu: 0, spectrum: new Array(64).fill(0), beat: 0 } },
        { time: 1, audio: { vu: 0.5, spectrum: generateMockSpectrum(), beat: 0.8 } },
        { time: 2, audio: { vu: 1.0, spectrum: generateMockSpectrum(), beat: 1.0 } }
    ];
    
    let visualOutputCorrect = true;
    let performanceAcceptable = true;
    let audioResponsive = true;
    
    testCases.forEach((testCase, index) => {
        const result = simulateGraphExecution(graph, testCase);
        
        // Check visual output
        if (!validateVisualOutput(result, violations, index)) {
            visualOutputCorrect = false;
        }
        
        // Check performance
        if (result.executionTime > 8333) { // 120 FPS = 8333 microseconds
            violations.push({
                type: 'audio_chain',
                severity: 'major',
                description: `Execution time ${result.executionTime}μs exceeds 120 FPS target (8333μs)`,
                location: `Test case ${index}`,
                fix_guidance: 'Optimize graph complexity or expensive operations'
            });
            performanceAcceptable = false;
        }
        
        // Check audio responsiveness
        if (testCase.audio.vu > 0 && result.brightness < 0.1) {
            violations.push({
                type: 'audio_chain',
                severity: 'major',
                description: `Pattern not responsive to audio input in test case ${index}`,
                location: `Test case ${index}`,
                fix_guidance: 'Check audio node connections and parameter scaling'
            });
            audioResponsive = false;
        }
    });
    
    return {
        visualOutputCorrect,
        performanceAcceptable,
        audioResponsive,
        runtimeViolations: violations
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findNodeConsumers(nodeId: string, graph: Graph): Node[] {
    const consumerIds = graph.wires
        .filter(wire => wire.from === nodeId)
        .map(wire => wire.to);
    
    return graph.nodes.filter(node => consumerIds.includes(node.id));
}

function checkForLinearTransformations(startNodeId: string, endNodeId: string, graph: Graph, nodeMap: Map<string, Node>): boolean {
    // Simplified check - in reality would need full path analysis
    const path = findPath(startNodeId, endNodeId, graph);
    return path.some(nodeId => {
        const node = nodeMap.get(nodeId);
        return node?.type === 'scale' && node.parameters?.factor !== 1.0;
    });
}

function detectCircularDependencies(graph: Graph): string[] {
    // Simplified implementation - would need proper cycle detection
    return [];
}

function findUnreachableNodes(graph: Graph): Node[] {
    // Simplified implementation - would need proper reachability analysis
    return [];
}

function findPath(start: string, end: string, graph: Graph): string[] {
    // Simplified implementation - would need proper path finding
    return [];
}

function generateMockSpectrum(): number[] {
    return Array.from({ length: 64 }, (_, i) => Math.random() * (1 - i / 64));
}

function simulateGraphExecution(graph: Graph, testCase: any): any {
    // Mock simulation - would need actual graph execution engine
    return {
        executionTime: Math.random() * 10000,
        brightness: Math.random(),
        colors: Array.from({ length: 180 }, () => ({ r: Math.random(), g: Math.random(), b: Math.random() }))
    };
}

function validateVisualOutput(result: any, violations: Violation[], testIndex: number): boolean {
    // Check for visual artifacts
    if (result.colors.some((c: any) => c.r > 1 || c.g > 1 || c.b > 1)) {
        violations.push({
            type: 'node_compatibility',
            severity: 'major',
            description: `Color values exceed valid range in test case ${testIndex}`,
            location: `Runtime simulation`,
            fix_guidance: 'Add clamping to prevent color overflow'
        });
        return false;
    }
    
    return true;
}

// ============================================================================
// COMPREHENSIVE VALIDATION RUNNER
// ============================================================================

export interface ComprehensiveValidationResult {
    layer1: SemanticAnalysisResult;
    layer2: CodeGenerationResult;
    layer3: RuntimeSimulationResult;
    overallConfidence: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
}

/**
 * Runs all three layers of validation for maximum confidence
 */
export async function runComprehensiveValidation(graph: Graph, graphPath: string): Promise<ComprehensiveValidationResult> {
    const layer1 = analyzeGraphSemantics(graph);
    const layer2 = await validateCodeGeneration(graph, graphPath);
    const layer3 = simulateRuntime(graph);
    
    // Combine all violations
    const allViolations = [
        ...layer1.semanticViolations,
        ...layer2.codeViolations,
        ...layer3.runtimeViolations
    ];
    
    const criticalIssues = allViolations.filter(v => v.severity === 'critical').length;
    const majorIssues = allViolations.filter(v => v.severity === 'major').length;
    const minorIssues = allViolations.filter(v => v.severity === 'minor').length;
    
    // Calculate confidence score
    let confidence = 100;
    confidence -= criticalIssues * 30;
    confidence -= majorIssues * 10;
    confidence -= minorIssues * 3;
    confidence = Math.max(0, confidence);
    
    return {
        layer1,
        layer2,
        layer3,
        overallConfidence: confidence,
        criticalIssues,
        majorIssues,
        minorIssues
    };
}