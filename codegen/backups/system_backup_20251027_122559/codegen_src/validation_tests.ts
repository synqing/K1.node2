// ============================================================================
// NODE GRAPH VALIDATION TEST SUITE
// ============================================================================
// Comprehensive validation tests for node graph compliance with K1 architecture
// Prevents architectural violations and ensures safe pattern integration

import { Graph, Node } from './index.js';

export interface ValidationResult {
    passed: boolean;
    violations: Violation[];
    warnings: Warning[];
}

export interface Violation {
    type: 'architecture' | 'audio_chain' | 'node_compatibility' | 'palette_format';
    severity: 'critical' | 'major' | 'minor';
    description: string;
    location: string;
    fix_guidance: string;
}

export interface Warning {
    type: 'performance' | 'style' | 'documentation';
    description: string;
    location: string;
    recommendation: string;
}

// ============================================================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================================================

/**
 * Test: No gradient nodes allowed (prevents forbidden edge-to-edge rainbows)
 * CRITICAL: gradient nodes create linear gradients that violate center-origin architecture
 */
export function testNoGradientNodes(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const gradientNodes = graph.nodes.filter(n => n.type === 'gradient');
    
    gradientNodes.forEach(node => {
        violations.push({
            type: 'architecture',
            severity: 'critical',
            description: `Gradient node "${node.id}" creates forbidden edge-to-edge rainbow gradients`,
            location: `Node: ${node.id}`,
            fix_guidance: 'Replace with position_gradient + palette_interpolate for center-origin radial effects'
        });
    });
    
    return violations;
}

/**
 * Test: position_gradient nodes must implement center-origin mapping
 * MAJOR: Ensures all spatial patterns originate from center coordinates
 */
export function testCenterOriginCompliance(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const positionNodes = graph.nodes.filter(n => n.type === 'position_gradient');
    
    positionNodes.forEach(node => {
        const description = node.description || '';
        const hasCenterOriginDoc = description.toLowerCase().includes('center-origin') || 
                                  description.toLowerCase().includes('center') ||
                                  description.toLowerCase().includes('distance from center');
        
        if (!hasCenterOriginDoc) {
            violations.push({
                type: 'architecture',
                severity: 'major',
                description: `position_gradient node "${node.id}" missing center-origin documentation`,
                location: `Node: ${node.id}`,
                fix_guidance: 'Add description indicating center-origin mapping (0.0 at center → 1.0 at edges)'
            });
        }
    });
    
    return violations;
}

/**
 * Test: Warn on hsv_to_rgb nodes (legacy rainbow converter)
 * WARNING: These are typically used with gradient to create rainbows
 */
export function testHsvToRgbWarning(graph: Graph): Warning[] {
    const warnings: Warning[] = [];
    
    const hsvNodes = graph.nodes.filter(n => n.type === 'hsv_to_rgb');
    
    hsvNodes.forEach(node => {
        warnings.push({
            type: 'style',
            description: `hsv_to_rgb node "${node.id}" is legacy rainbow converter`,
            location: `Node: ${node.id}`,
            recommendation: 'Ensure this is not creating edge-to-edge rainbow gradients. Prefer palette_interpolate with center-origin position_gradient'
        });
    });
    
    return warnings;
}

// ============================================================================
// AUDIO CHAIN VALIDATION TESTS
// ============================================================================

/**
 * Test: spectrum_bin parameters in valid range (0-63)
 * CRITICAL: Out-of-range parameters cause runtime errors
 */
export function testSpectrumBinRange(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const spectrumNodes = graph.nodes.filter(n => n.type === 'spectrum_bin');
    
    spectrumNodes.forEach(node => {
        const bin = node.parameters?.bin;
        if (typeof bin === 'number' && (bin < 0 || bin > 63)) {
            violations.push({
                type: 'audio_chain',
                severity: 'critical',
                description: `spectrum_bin node "${node.id}" has bin ${bin} out of range (0-63)`,
                location: `Node: ${node.id}, parameter: bin`,
                fix_guidance: `Set bin parameter to value between 0-63. Current value: ${bin}`
            });
        }
    });
    
    return violations;
}

/**
 * Test: spectrum_range parameters validation
 * MAJOR: Validates start_bin/end_bin ranges or band parameters
 */
export function testSpectrumRangeParameters(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const spectrumRangeNodes = graph.nodes.filter(n => n.type === 'spectrum_range');
    
    spectrumRangeNodes.forEach(node => {
        const params = node.parameters || {};
        
        // Check for preferred band parameter
        if (params.band) {
            const validBands = ['low', 'mid', 'high'];
            if (!validBands.includes(params.band as string)) {
                violations.push({
                    type: 'audio_chain',
                    severity: 'major',
                    description: `spectrum_range node "${node.id}" has invalid band parameter "${params.band}"`,
                    location: `Node: ${node.id}, parameter: band`,
                    fix_guidance: 'Use band parameter: "low", "mid", or "high" for runtime control'
                });
            }
        } else if (params.start_bin !== undefined || params.end_bin !== undefined) {
            // Legacy hardcoded parameters - warn about deprecation
            const startBin = params.start_bin as number;
            const endBin = params.end_bin as number;
            
            if (startBin < 0 || startBin > 63 || endBin < 0 || endBin > 63 || startBin >= endBin) {
                violations.push({
                    type: 'audio_chain',
                    severity: 'major',
                    description: `spectrum_range node "${node.id}" has invalid bin range [${startBin}, ${endBin}]`,
                    location: `Node: ${node.id}, parameters: start_bin, end_bin`,
                    fix_guidance: 'Use valid bin range (0-63) or prefer band parameter for runtime control'
                });
            }
        }
    });
    
    return violations;
}

/**
 * Test: beat nodes have valid tempo_bin parameters
 * MAJOR: Validates tempo_bin parameters and recommends auto-detection
 */
export function testBeatNodeParameters(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const beatNodes = graph.nodes.filter(n => n.type === 'beat');
    
    beatNodes.forEach(node => {
        const tempoBin = node.parameters?.tempo_bin;
        
        if (typeof tempoBin === 'number') {
            if (tempoBin !== -1 && (tempoBin < 0 || tempoBin > 63)) {
                violations.push({
                    type: 'audio_chain',
                    severity: 'major',
                    description: `beat node "${node.id}" has invalid tempo_bin ${tempoBin}`,
                    location: `Node: ${node.id}, parameter: tempo_bin`,
                    fix_guidance: 'Use tempo_bin: -1 for auto-detection or valid range 0-63'
                });
            } else if (tempoBin >= 0) {
                // Recommend auto-detection for better performance
                violations.push({
                    type: 'audio_chain',
                    severity: 'minor',
                    description: `beat node "${node.id}" uses hardcoded tempo_bin ${tempoBin}`,
                    location: `Node: ${node.id}, parameter: tempo_bin`,
                    fix_guidance: 'Consider using tempo_bin: -1 for auto-detection of strongest beat'
                });
            }
        }
    });
    
    return violations;
}

/**
 * Test: chromagram parameters in valid range (0-11)
 * CRITICAL: Out-of-range parameters cause runtime errors
 */
export function testChromagramParameters(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const chromaNodes = graph.nodes.filter(n => n.type === 'chromagram');
    
    chromaNodes.forEach(node => {
        const pitch = node.parameters?.pitch;
        if (typeof pitch === 'number' && (pitch < 0 || pitch > 11)) {
            violations.push({
                type: 'audio_chain',
                severity: 'critical',
                description: `chromagram node "${node.id}" has pitch ${pitch} out of range (0-11)`,
                location: `Node: ${node.id}, parameter: pitch`,
                fix_guidance: `Set pitch parameter to value between 0-11 (C-B). Current value: ${pitch}`
            });
        }
    });
    
    return violations;
}

// ============================================================================
// PALETTE FORMAT VALIDATION TESTS
// ============================================================================

/**
 * Test: palette_data uses array format [pos, r, g, b]
 * CRITICAL: Object format is incompatible with current system
 */
export function testPaletteArrayFormat(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    if (graph.palette_data) {
        graph.palette_data.forEach((entry, index) => {
            if (!Array.isArray(entry)) {
                violations.push({
                    type: 'palette_format',
                    severity: 'critical',
                    description: `Palette entry ${index} uses object format instead of required array format`,
                    location: `palette_data[${index}]`,
                    fix_guidance: 'Convert to array format: [position, r, g, b] where position is 0-255, colors are 0-255'
                });
            } else if (entry.length !== 4) {
                violations.push({
                    type: 'palette_format',
                    severity: 'critical',
                    description: `Palette entry ${index} has ${entry.length} values, expected 4 [pos, r, g, b]`,
                    location: `palette_data[${index}]`,
                    fix_guidance: 'Ensure each palette entry has exactly 4 values: [position, r, g, b]'
                });
            }
        });
    }
    
    return violations;
}

// ============================================================================
// NODE COMPATIBILITY TESTS
// ============================================================================

/**
 * Test: All node types are supported in current codegen system
 * CRITICAL: Unsupported node types cause compilation failures
 */
export function testNodeTypeCompatibility(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    const supportedNodeTypes = [
        // Original nodes
        'position_gradient', 'palette_interpolate', 'output',
        // Mathematical nodes
        'time', 'sin', 'add', 'multiply', 'constant', 'clamp', 'modulo', 'scale',
        // Audio nodes
        'spectrum_bin', 'spectrum_interpolate', 'spectrum_range', 'audio_level', 
        'beat', 'tempo_magnitude', 'chromagram',
        // Legacy nodes (with warnings)
        'gradient', 'hsv_to_rgb'
    ];
    
    graph.nodes.forEach(node => {
        if (!supportedNodeTypes.includes(node.type)) {
            violations.push({
                type: 'node_compatibility',
                severity: 'critical',
                description: `Node "${node.id}" uses unsupported type "${node.type}"`,
                location: `Node: ${node.id}`,
                fix_guidance: `Replace with supported node type. Supported types: ${supportedNodeTypes.join(', ')}`
            });
        }
    });
    
    return violations;
}

/**
 * Test: Signal chains are properly connected
 * MAJOR: Identifies broken or incomplete signal chains
 */
export function testSignalChainConnections(graph: Graph): Violation[] {
    const violations: Violation[] = [];
    
    // Build connection map
    const connections = new Map<string, string[]>();
    graph.wires.forEach(wire => {
        if (!connections.has(wire.from)) {
            connections.set(wire.from, []);
        }
        connections.get(wire.from)!.push(wire.to);
    });
    
    // Check for nodes with inputs but no connections
    graph.nodes.forEach(node => {
        if (node.inputs && node.inputs.length > 0) {
            node.inputs.forEach(inputId => {
                const inputNode = graph.nodes.find(n => n.id === inputId);
                if (!inputNode) {
                    violations.push({
                        type: 'node_compatibility',
                        severity: 'major',
                        description: `Node "${node.id}" references non-existent input node "${inputId}"`,
                        location: `Node: ${node.id}, inputs array`,
                        fix_guidance: `Ensure input node "${inputId}" exists or remove from inputs array`
                    });
                }
            });
        }
    });
    
    return violations;
}

// ============================================================================
// COMPREHENSIVE VALIDATION RUNNER
// ============================================================================

/**
 * Run all validation tests on a graph
 * Returns comprehensive validation result with all violations and warnings
 */
export function validateGraph(graph: Graph): ValidationResult {
    const violations: Violation[] = [];
    const warnings: Warning[] = [];
    
    // Architecture compliance tests
    violations.push(...testNoGradientNodes(graph));
    violations.push(...testCenterOriginCompliance(graph));
    warnings.push(...testHsvToRgbWarning(graph));
    
    // Audio chain validation tests
    violations.push(...testSpectrumBinRange(graph));
    violations.push(...testSpectrumRangeParameters(graph));
    violations.push(...testBeatNodeParameters(graph));
    violations.push(...testChromagramParameters(graph));
    
    // Palette format validation tests
    violations.push(...testPaletteArrayFormat(graph));
    
    // Node compatibility tests
    violations.push(...testNodeTypeCompatibility(graph));
    violations.push(...testSignalChainConnections(graph));
    
    // Determine if validation passed (no critical or major violations)
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const majorViolations = violations.filter(v => v.severity === 'major');
    const passed = criticalViolations.length === 0 && majorViolations.length === 0;
    
    return {
        passed,
        violations,
        warnings
    };
}

/**
 * Generate validation report as formatted string
 * Useful for logging and debugging validation results
 */
export function generateValidationReport(filename: string, result: ValidationResult): string {
    let report = `\n=== VALIDATION REPORT: ${filename} ===\n`;
    report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `Violations: ${result.violations.length}\n`;
    report += `Warnings: ${result.warnings.length}\n\n`;
    
    if (result.violations.length > 0) {
        report += `VIOLATIONS:\n`;
        result.violations.forEach((violation, index) => {
            const icon = violation.severity === 'critical' ? '🚨' : 
                        violation.severity === 'major' ? '⚠️' : '⚡';
            report += `${index + 1}. ${icon} ${violation.severity.toUpperCase()}: ${violation.description}\n`;
            report += `   Location: ${violation.location}\n`;
            report += `   Fix: ${violation.fix_guidance}\n\n`;
        });
    }
    
    if (result.warnings.length > 0) {
        report += `WARNINGS:\n`;
        result.warnings.forEach((warning, index) => {
            report += `${index + 1}. ⚠️ ${warning.description}\n`;
            report += `   Location: ${warning.location}\n`;
            report += `   Recommendation: ${warning.recommendation}\n\n`;
        });
    }
    
    return report;
}