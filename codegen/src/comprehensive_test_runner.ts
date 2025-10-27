#!/usr/bin/env node

// ============================================================================
// COMPREHENSIVE TEST RUNNER - Multi-Layer Validation
// ============================================================================
// Provides rigorous validation with multiple layers of testing
// Layer 1: Semantic graph analysis
// Layer 2: Code generation validation  
// Layer 3: Runtime simulation testing

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { program } from 'commander';
import { Graph } from './index.js';
import { validateGraph, generateValidationReport } from './validation_tests.js';
import { runComprehensiveValidation, ComprehensiveValidationResult } from './advanced_validation.js';

interface ComprehensiveTestSummary {
    totalFiles: number;
    highConfidenceFiles: number;
    mediumConfidenceFiles: number;
    lowConfidenceFiles: number;
    failedFiles: number;
    averageConfidence: number;
    totalCriticalIssues: number;
    totalMajorIssues: number;
    totalMinorIssues: number;
    results: Array<{
        filename: string;
        confidence: number;
        result: ComprehensiveValidationResult;
        basicValidation: any;
    }>;
}

/**
 * Run comprehensive validation on all files in directory
 */
async function runComprehensiveTests(dirPath: string): Promise<ComprehensiveTestSummary> {
    const files = readdirSync(dirPath)
        .filter(f => f.endsWith('.json'))
        .sort();

    if (files.length === 0) {
        throw new Error(`No JSON files found in ${dirPath}`);
    }

    console.log(`🔬 Running comprehensive validation on ${files.length} files from ${dirPath}\n`);

    const summary: ComprehensiveTestSummary = {
        totalFiles: files.length,
        highConfidenceFiles: 0,
        mediumConfidenceFiles: 0,
        lowConfidenceFiles: 0,
        failedFiles: 0,
        averageConfidence: 0,
        totalCriticalIssues: 0,
        totalMajorIssues: 0,
        totalMinorIssues: 0,
        results: []
    };

    let totalConfidence = 0;

    for (const file of files) {
        const filePath = join(dirPath, file);
        console.log(`\n📋 Testing: ${file}`);

        try {
            // Load and parse graph
            const json = readFileSync(filePath, 'utf-8');
            const graph = JSON.parse(json) as Graph;

            // Run basic validation first
            console.log(`  Layer 0: Basic validation...`);
            const basicValidation = validateGraph(graph);

            // Run comprehensive validation
            console.log(`  Layer 1: Semantic analysis...`);
            console.log(`  Layer 2: Code generation...`);
            console.log(`  Layer 3: Runtime simulation...`);
            
            const comprehensiveResult = await runComprehensiveValidation(graph, filePath);

            // Categorize by confidence
            const confidence = comprehensiveResult.overallConfidence;
            if (confidence >= 80) {
                summary.highConfidenceFiles++;
                console.log(`  ✅ HIGH CONFIDENCE (${confidence}%)`);
            } else if (confidence >= 60) {
                summary.mediumConfidenceFiles++;
                console.log(`  ⚠️  MEDIUM CONFIDENCE (${confidence}%)`);
            } else if (confidence >= 40) {
                summary.lowConfidenceFiles++;
                console.log(`  🔶 LOW CONFIDENCE (${confidence}%)`);
            } else {
                summary.failedFiles++;
                console.log(`  ❌ FAILED (${confidence}%)`);
            }

            // Update summary statistics
            totalConfidence += confidence;
            summary.totalCriticalIssues += comprehensiveResult.criticalIssues;
            summary.totalMajorIssues += comprehensiveResult.majorIssues;
            summary.totalMinorIssues += comprehensiveResult.minorIssues;

            // Store result
            summary.results.push({
                filename: file,
                confidence,
                result: comprehensiveResult,
                basicValidation
            });

        } catch (error) {
            console.log(`  💥 ERROR: ${error}`);
            summary.failedFiles++;
            
            // Create error result
            summary.results.push({
                filename: file,
                confidence: 0,
                result: {
                    layer1: {
                        centerOriginCompliant: false,
                        audioChainValid: false,
                        signalFlowCorrect: false,
                        performanceEstimate: { estimatedCyclesPerFrame: 0, memoryUsageBytes: 0, complexityScore: 0, frameRateEstimate: 0 },
                        semanticViolations: [{
                            type: 'node_compatibility',
                            severity: 'critical',
                            description: `Failed to analyze: ${error}`,
                            location: 'File parsing',
                            fix_guidance: 'Check JSON syntax and graph structure'
                        }]
                    },
                    layer2: {
                        compilationSuccessful: false,
                        generatedCodeValid: false,
                        centerOriginImplemented: false,
                        performanceOptimal: false,
                        codeViolations: []
                    },
                    layer3: {
                        visualOutputCorrect: false,
                        performanceAcceptable: false,
                        audioResponsive: false,
                        runtimeViolations: []
                    },
                    overallConfidence: 0,
                    criticalIssues: 1,
                    majorIssues: 0,
                    minorIssues: 0
                },
                basicValidation: {
                    passed: false,
                    violations: [],
                    warnings: []
                }
            });
            summary.totalCriticalIssues++;
        }
    }

    summary.averageConfidence = totalConfidence / files.length;
    return summary;
}

/**
 * Generate comprehensive validation report
 */
function generateComprehensiveReport(summary: ComprehensiveTestSummary): string {
    let report = `# COMPREHENSIVE VALIDATION REPORT\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Validation Layers:** 4 (Basic + Semantic + Code + Runtime)\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Total Files:** ${summary.totalFiles}\n`;
    report += `- **Average Confidence:** ${summary.averageConfidence.toFixed(1)}%\n`;
    report += `- **High Confidence (≥80%):** ${summary.highConfidenceFiles} files\n`;
    report += `- **Medium Confidence (60-79%):** ${summary.mediumConfidenceFiles} files\n`;
    report += `- **Low Confidence (40-59%):** ${summary.lowConfidenceFiles} files\n`;
    report += `- **Failed (<40%):** ${summary.failedFiles} files\n\n`;

    // Issue Summary
    report += `### Issue Breakdown\n`;
    report += `- **🚨 Critical Issues:** ${summary.totalCriticalIssues} (compilation/runtime failures)\n`;
    report += `- **⚠️ Major Issues:** ${summary.totalMajorIssues} (architectural/performance problems)\n`;
    report += `- **⚡ Minor Issues:** ${summary.totalMinorIssues} (optimization opportunities)\n\n`;

    // Confidence Categories
    if (summary.highConfidenceFiles > 0) {
        report += `## ✅ HIGH CONFIDENCE FILES (${summary.highConfidenceFiles})\n`;
        report += `Ready for production deployment:\n`;
        summary.results
            .filter(r => r.confidence >= 80)
            .sort((a, b) => b.confidence - a.confidence)
            .forEach(r => {
                report += `- **${r.filename}** (${r.confidence}% confidence)\n`;
                report += `  - Semantic: ${r.result.layer1.centerOriginCompliant ? '✅' : '❌'} Center-origin, ${r.result.layer1.audioChainValid ? '✅' : '❌'} Audio chain\n`;
                report += `  - Code Gen: ${r.result.layer2.compilationSuccessful ? '✅' : '❌'} Compilation, ${r.result.layer2.centerOriginImplemented ? '✅' : '❌'} Implementation\n`;
                report += `  - Runtime: ${r.result.layer3.performanceAcceptable ? '✅' : '❌'} Performance (${r.result.layer1.performanceEstimate.frameRateEstimate.toFixed(0)} FPS)\n`;
            });
        report += `\n`;
    }

    if (summary.mediumConfidenceFiles > 0) {
        report += `## ⚠️ MEDIUM CONFIDENCE FILES (${summary.mediumConfidenceFiles})\n`;
        report += `Require fixes before deployment:\n`;
        summary.results
            .filter(r => r.confidence >= 60 && r.confidence < 80)
            .sort((a, b) => b.confidence - a.confidence)
            .forEach(r => {
                report += `- **${r.filename}** (${r.confidence}% confidence)\n`;
                report += `  - Issues: ${r.result.criticalIssues} critical, ${r.result.majorIssues} major, ${r.result.minorIssues} minor\n`;
            });
        report += `\n`;
    }

    if (summary.lowConfidenceFiles > 0) {
        report += `## 🔶 LOW CONFIDENCE FILES (${summary.lowConfidenceFiles})\n`;
        report += `Require significant remediation:\n`;
        summary.results
            .filter(r => r.confidence >= 40 && r.confidence < 60)
            .forEach(r => {
                report += `- **${r.filename}** (${r.confidence}% confidence)\n`;
            });
        report += `\n`;
    }

    if (summary.failedFiles > 0) {
        report += `## ❌ FAILED FILES (${summary.failedFiles})\n`;
        report += `Require complete redesign:\n`;
        summary.results
            .filter(r => r.confidence < 40)
            .forEach(r => {
                report += `- **${r.filename}** (${r.confidence}% confidence)\n`;
            });
        report += `\n`;
    }

    // Detailed Analysis
    report += `## Detailed Analysis\n\n`;
    
    summary.results.forEach(result => {
        report += `### ${result.filename}\n`;
        report += `**Confidence Score:** ${result.confidence}%\n\n`;
        
        // Layer 1: Semantic Analysis
        report += `**Layer 1 - Semantic Analysis:**\n`;
        report += `- Center-origin compliant: ${result.result.layer1.centerOriginCompliant ? '✅' : '❌'}\n`;
        report += `- Audio chain valid: ${result.result.layer1.audioChainValid ? '✅' : '❌'}\n`;
        report += `- Signal flow correct: ${result.result.layer1.signalFlowCorrect ? '✅' : '❌'}\n`;
        report += `- Performance estimate: ${result.result.layer1.performanceEstimate.frameRateEstimate.toFixed(0)} FPS\n`;
        report += `- Complexity score: ${result.result.layer1.performanceEstimate.complexityScore}/100\n\n`;
        
        // Layer 2: Code Generation
        report += `**Layer 2 - Code Generation:**\n`;
        report += `- Compilation successful: ${result.result.layer2.compilationSuccessful ? '✅' : '❌'}\n`;
        report += `- Generated code valid: ${result.result.layer2.generatedCodeValid ? '✅' : '❌'}\n`;
        report += `- Center-origin implemented: ${result.result.layer2.centerOriginImplemented ? '✅' : '❌'}\n`;
        report += `- Performance optimal: ${result.result.layer2.performanceOptimal ? '✅' : '❌'}\n\n`;
        
        // Layer 3: Runtime Simulation
        report += `**Layer 3 - Runtime Simulation:**\n`;
        report += `- Visual output correct: ${result.result.layer3.visualOutputCorrect ? '✅' : '❌'}\n`;
        report += `- Performance acceptable: ${result.result.layer3.performanceAcceptable ? '✅' : '❌'}\n`;
        report += `- Audio responsive: ${result.result.layer3.audioResponsive ? '✅' : '❌'}\n\n`;
        
        // Issues
        if (result.result.criticalIssues + result.result.majorIssues + result.result.minorIssues > 0) {
            report += `**Issues Found:**\n`;
            
            // Combine all violations
            const allViolations = [
                ...result.result.layer1.semanticViolations,
                ...result.result.layer2.codeViolations,
                ...result.result.layer3.runtimeViolations
            ];
            
            allViolations.forEach((violation, index) => {
                const icon = violation.severity === 'critical' ? '🚨' : 
                            violation.severity === 'major' ? '⚠️' : '⚡';
                report += `${index + 1}. ${icon} ${violation.severity.toUpperCase()}: ${violation.description}\n`;
                report += `   Location: ${violation.location}\n`;
                report += `   Fix: ${violation.fix_guidance}\n\n`;
            });
        }
        
        report += `---\n\n`;
    });

    return report;
}

// CLI setup
program
    .version('1.0.0')
    .description('Comprehensive multi-layer validation for node graphs');

program
    .command('comprehensive <input_dir>')
    .description('Run comprehensive validation on all graphs in directory')
    .option('-o, --output <file>', 'Output report file (optional)')
    .action(async (inputDir: string, options: { output?: string }) => {
        try {
            console.log(`🚀 Starting comprehensive validation of ${inputDir}\n`);

            // Run comprehensive validation
            const summary = await runComprehensiveTests(resolve(inputDir));

            // Generate report
            const report = generateComprehensiveReport(summary);

            // Output report
            if (options.output) {
                writeFileSync(resolve(options.output), report);
                console.log(`\n📄 Report saved to: ${options.output}`);
            } else {
                console.log('\n' + report);
            }

            // Print summary
            console.log(`\n🎯 COMPREHENSIVE VALIDATION COMPLETE`);
            console.log(`📊 Average Confidence: ${summary.averageConfidence.toFixed(1)}%`);
            console.log(`✅ High Confidence: ${summary.highConfidenceFiles}/${summary.totalFiles}`);
            console.log(`⚠️  Medium Confidence: ${summary.mediumConfidenceFiles}/${summary.totalFiles}`);
            console.log(`🔶 Low Confidence: ${summary.lowConfidenceFiles}/${summary.totalFiles}`);
            console.log(`❌ Failed: ${summary.failedFiles}/${summary.totalFiles}`);
            console.log(`🚨 Critical Issues: ${summary.totalCriticalIssues}`);
            console.log(`⚠️ Major Issues: ${summary.totalMajorIssues}`);
            console.log(`⚡ Minor Issues: ${summary.totalMinorIssues}`);

            // Exit with appropriate code
            const overallSuccess = summary.averageConfidence >= 70 && summary.totalCriticalIssues === 0;
            process.exit(overallSuccess ? 0 : 1);

        } catch (error) {
            console.error('❌ Comprehensive validation failed:', error);
            process.exit(1);
        }
    });

program.parse();