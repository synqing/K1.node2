#!/usr/bin/env node
// ============================================================================
// AUTOMATED NODE GRAPH VALIDATION TEST RUNNER
// ============================================================================
// Runs validation tests on all graph files and generates compliance reports
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { program } from 'commander';
import { validateGraph, generateValidationReport } from './validation_tests.js';
/**
 * Load and validate all JSON graph files from a directory
 */
function validateGraphDirectory(dirPath) {
    const files = readdirSync(dirPath)
        .filter(f => f.endsWith('.json'))
        .sort();
    if (files.length === 0) {
        throw new Error(`No JSON files found in ${dirPath}`);
    }
    console.log(`🔍 Validating ${files.length} graph files from ${dirPath}\n`);
    const summary = {
        totalFiles: files.length,
        passedFiles: 0,
        failedFiles: 0,
        criticalViolations: 0,
        majorViolations: 0,
        minorViolations: 0,
        warnings: 0,
        results: []
    };
    files.forEach(file => {
        const filePath = join(dirPath, file);
        console.log(`Validating: ${file}`);
        try {
            // Load and parse graph
            const json = readFileSync(filePath, 'utf-8');
            const graph = JSON.parse(json);
            // Run validation tests
            const result = validateGraph(graph);
            // Update summary statistics
            if (result.passed) {
                summary.passedFiles++;
                console.log(`  ✅ PASSED`);
            }
            else {
                summary.failedFiles++;
                console.log(`  ❌ FAILED (${result.violations.length} violations)`);
            }
            // Count violations by severity
            result.violations.forEach(violation => {
                switch (violation.severity) {
                    case 'critical':
                        summary.criticalViolations++;
                        break;
                    case 'major':
                        summary.majorViolations++;
                        break;
                    case 'minor':
                        summary.minorViolations++;
                        break;
                }
            });
            summary.warnings += result.warnings.length;
            // Store result
            summary.results.push({
                filename: file,
                passed: result.passed,
                result
            });
        }
        catch (error) {
            console.log(`  💥 ERROR: ${error}`);
            summary.failedFiles++;
            // Create error result
            summary.results.push({
                filename: file,
                passed: false,
                result: {
                    passed: false,
                    violations: [{
                            type: 'node_compatibility',
                            severity: 'critical',
                            description: `Failed to parse or validate: ${error}`,
                            location: 'File parsing',
                            fix_guidance: 'Check JSON syntax and graph structure'
                        }],
                    warnings: []
                }
            });
            summary.criticalViolations++;
        }
    });
    return summary;
}
/**
 * Generate comprehensive validation report
 */
function generateComprehensiveReport(summary) {
    let report = `# NODE GRAPH VALIDATION REPORT\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Total Files:** ${summary.totalFiles}\n`;
    report += `- **Passed:** ${summary.passedFiles} (${Math.round(summary.passedFiles / summary.totalFiles * 100)}%)\n`;
    report += `- **Failed:** ${summary.failedFiles} (${Math.round(summary.failedFiles / summary.totalFiles * 100)}%)\n\n`;
    report += `### Violation Breakdown\n`;
    report += `- **🚨 Critical:** ${summary.criticalViolations} (block integration)\n`;
    report += `- **⚠️ Major:** ${summary.majorViolations} (require fixes)\n`;
    report += `- **⚡ Minor:** ${summary.minorViolations} (correctable)\n`;
    report += `- **💡 Warnings:** ${summary.warnings} (recommendations)\n\n`;
    // Compliance Categories
    const compliant = summary.results.filter(r => r.passed);
    const criticalViolations = summary.results.filter(r => r.result.violations.some(v => v.severity === 'critical'));
    const majorViolations = summary.results.filter(r => !r.passed && !r.result.violations.some(v => v.severity === 'critical'));
    report += `## Compliance Categories\n\n`;
    if (compliant.length > 0) {
        report += `### ✅ COMPLIANT (${compliant.length} files)\n`;
        report += `Ready for immediate integration:\n`;
        compliant.forEach(r => {
            report += `- ${r.filename}\n`;
        });
        report += `\n`;
    }
    if (criticalViolations.length > 0) {
        report += `### 🚨 CRITICAL VIOLATIONS (${criticalViolations.length} files)\n`;
        report += `Block integration until complete redesign:\n`;
        criticalViolations.forEach(r => {
            report += `- ${r.filename}\n`;
        });
        report += `\n`;
    }
    if (majorViolations.length > 0) {
        report += `### ⚠️ MAJOR VIOLATIONS (${majorViolations.length} files)\n`;
        report += `Require fixes before integration:\n`;
        majorViolations.forEach(r => {
            report += `- ${r.filename}\n`;
        });
        report += `\n`;
    }
    // Detailed Results
    report += `## Detailed Results\n\n`;
    summary.results.forEach(result => {
        report += generateValidationReport(result.filename, result.result);
    });
    return report;
}
/**
 * CLI setup
 */
program
    .version('1.0.0')
    .description('Validate node graph files for K1.reinvented compliance');
program
    .command('validate <input_dir>')
    .description('Validate all graph files in directory')
    .option('-o, --output <file>', 'Output report file (optional)')
    .action((inputDir, options) => {
    try {
        console.log(`🚀 Starting validation of ${inputDir}\n`);
        // Run validation tests
        const summary = validateGraphDirectory(resolve(inputDir));
        // Generate report
        const report = generateComprehensiveReport(summary);
        // Output report
        if (options.output) {
            writeFileSync(resolve(options.output), report);
            console.log(`\n📄 Report saved to: ${options.output}`);
        }
        else {
            console.log('\n' + report);
        }
        // Print summary
        console.log(`\n🎯 VALIDATION COMPLETE`);
        console.log(`✅ Passed: ${summary.passedFiles}/${summary.totalFiles}`);
        console.log(`❌ Failed: ${summary.failedFiles}/${summary.totalFiles}`);
        console.log(`🚨 Critical: ${summary.criticalViolations}`);
        console.log(`⚠️ Major: ${summary.majorViolations}`);
        console.log(`⚡ Minor: ${summary.minorViolations}`);
        // Exit with appropriate code
        process.exit(summary.failedFiles > 0 ? 1 : 0);
    }
    catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
});
// Default behavior
program
    .argument('[input_dir]', 'Input directory containing graph files')
    .action((inputDir) => {
    if (!inputDir) {
        program.help();
        return;
    }
    // Delegate to validate command
    try {
        const summary = validateGraphDirectory(resolve(inputDir));
        const report = generateComprehensiveReport(summary);
        console.log('\n' + report);
        process.exit(summary.failedFiles > 0 ? 1 : 0);
    }
    catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
});
program.parse();
