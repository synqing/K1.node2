#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { program } from 'commander';
import Handlebars from 'handlebars';

// Node graph structure supporting multiple node types
export interface Node {
    id: string;
    type: 'gradient' | 'hsv_to_rgb' | 'output' | 'position_gradient' | 'palette_interpolate' | 'time' | 'sin' | 'add' | 'multiply' | 'constant' | 'clamp' | 'modulo' | 'scale'
        | 'spectrum_bin' | 'spectrum_interpolate' | 'spectrum_range' | 'audio_level' | 'beat' | 'tempo_magnitude' | 'chromagram';
    parameters?: Record<string, string | number>;
    inputs?: string[];
    description?: string;
}

export interface Wire {
    from: string;
    to: string;
    description?: string;
}

export interface Graph {
    name?: string;
    description?: string;
    nodes: Node[];
    wires: Wire[];
    palette?: string;
    palette_data?: Array<[number, number, number, number]>;
}

// C++ code template for single pattern
const effectTemplate = `
// AUTO-GENERATED CODE - DO NOT EDIT
// Generated at: {{timestamp}}
// Graph: {{graphName}}

#pragma once

extern CRGBF leds[NUM_LEDS];

void draw_generated_effect(float time) {
    {{#each steps}}
    {{{this}}}
    {{/each}}
}
`;

// C++ code template for multi-pattern registry
const multiPatternTemplate = `
// AUTO-GENERATED MULTI-PATTERN CODE - DO NOT EDIT
// Generated at: {{timestamp}}
// Patterns: {{#each patterns}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}

#pragma once

#include "pattern_registry.h"
#include "pattern_audio_interface.h"

extern CRGBF leds[NUM_LEDS];

{{#each patterns}}
// Pattern: {{name}}
// {{description}}
void draw_{{safe_id}}(float time, const PatternParameters& params) {
    {{#if is_audio_reactive}}
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    {{/if}}
    {{#each steps}}
    {{{this}}}
    {{/each}}
}

{{/each}}

// Pattern registry array
const PatternInfo g_pattern_registry[] = {
{{#each patterns}}
    { "{{name}}", "{{safe_id}}", "{{description}}", draw_{{safe_id}}, {{#if is_audio_reactive}}true{{else}}false{{/if}} }{{#unless @last}},{{/unless}}
{{/each}}
};

const uint8_t g_num_patterns = {{patterns.length}};
`;

function generatePaletteData(paletteData: Array<[number, number, number, number]> | undefined): string {
    if (!paletteData || paletteData.length === 0) {
        return '';
    }

    // Generate C++ array for palette keyframes
    const pairs = paletteData.map(([pos, r, g, b]) => {
        return `        ${pos}, ${r}, ${g}, ${b}`;
    }).join(',\n');

    return `
    // Palette keyframe data
    const uint8_t palette_keyframes[] = {
${pairs}
    };
    const uint8_t palette_size = ${paletteData.length};`;
}

function generatePaletteInterpolation(paletteData: Array<[number, number, number, number]> | undefined): string {
    if (!paletteData || paletteData.length === 0) {
        return `
        color_buffer[i].r = 0;
        color_buffer[i].g = 0;
        color_buffer[i].b = 0;`;
    }

    // Generate interpolation code
    return `
        uint8_t pos_255 = (uint8_t)(field_buffer[i] * 255.0f);

        // Find surrounding keyframes
        int idx = 0;
        for (int k = 0; k < ${paletteData.length - 1}; k++) {
            if (pos_255 >= ${paletteData[paletteData.length - 1][0]}) {
                idx = ${paletteData.length - 1} * 4;
                break;
            }
            if (pos_255 >= ${paletteData[0][0]} && pos_255 < ${paletteData[1][0]}) {
                // Linear interpolation between keyframes
                float t = (float)(pos_255 - ${paletteData[0][0]}) / (${paletteData[1][0]} - ${paletteData[0][0]});
                color_buffer[i].r = (${paletteData[0][1]}/255.0f) * (1.0f - t) + (${paletteData[1][1]}/255.0f) * t;
                color_buffer[i].g = (${paletteData[0][2]}/255.0f) * (1.0f - t) + (${paletteData[1][2]}/255.0f) * t;
                color_buffer[i].b = (${paletteData[0][3]}/255.0f) * (1.0f - t) + (${paletteData[1][3]}/255.0f) * t;
                break;
            }
        }`;
}

function generateNodeCode(node: Node, graph: Graph): string {
    switch(node.type) {
        case 'position_gradient':
            // CENTER-ORIGIN: Returns distance from center (0.0 at center → 1.0 at edges)
            // FORBIDS edge-to-edge linear gradients (rainbows)
            return '(abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH)';

        case 'palette_interpolate': {
            const palette = node.parameters?.palette as string || 'default';
            if (!graph.palette_data || graph.palette_data.length === 0) {
                throw new Error(`palette_interpolate node requires palette_data in graph`);
            }

            // Determine position source - either from input or default to center-origin
            let positionExpr = '(abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH)';  // CENTER-ORIGIN
            if (node.inputs && node.inputs.length > 0) {
                const inputNodeId = node.inputs[0];
                const inputNode = graph.nodes.find(n => n.id === inputNodeId);
                if (inputNode) {
                    const inputCode = generateNodeCode(inputNode, graph);
                    positionExpr = `fmod(${inputCode}, 1.0f)`;  // Wrap to 0-1 range
                }
            }

            // Generate palette data as C++ array
            // Support both array format [pos, r, g, b] and object format {position, r, g, b}
            const paletteColors = graph.palette_data.map((entry: any) => {
                let r, g, b;
                if (Array.isArray(entry)) {
                    // Array format: [pos, r, g, b]
                    [, r, g, b] = entry;
                } else {
                    // Object format: {position, r, g, b}
                    r = entry.r;
                    g = entry.g;
                    b = entry.b;
                }
                return `CRGBF(${(r/255).toFixed(2)}f, ${(g/255).toFixed(2)}f, ${(b/255).toFixed(2)}f)`;
            }).join(', ');

            // Generate inline interpolation code
            return `
    // ${palette} palette - position to color interpolation
    const CRGBF palette_colors[] = { ${paletteColors} };
    const int palette_size = ${graph.palette_data.length};

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = ${positionExpr};
        int palette_index = int(position * (palette_size - 1));
        float interpolation_factor = (position * (palette_size - 1)) - palette_index;

        // Clamp to valid range
        if (palette_index >= palette_size - 1) {
            leds[i] = palette_colors[palette_size - 1];
        } else {
            const CRGBF& color1 = palette_colors[palette_index];
            const CRGBF& color2 = palette_colors[palette_index + 1];

            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }

        // Apply runtime parameters: brightness multiplier
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }`;
        }

        case 'gradient':
            const start = Number(node.parameters?.start_hue ?? 0.0);
            const end = Number(node.parameters?.end_hue ?? 1.0);
            const range = end - start;
            return `
    // Node: ${node.id} (gradient)
    for (int i = 0; i < NUM_LEDS; i++) {
        float t = (float)i / (NUM_LEDS - 1);
        field_buffer[i] = ${start}f + (${range}f) * t;
    }`;

        case 'hsv_to_rgb':
            const brightness = node.parameters?.brightness ?? 1.0;
            return `
    // Node: ${node.id} (hsv_to_rgb)
    for (int i = 0; i < NUM_LEDS; i++) {
        float h = field_buffer[i];
        float s = 1.0f;
        float v = ${brightness}f;

        // HSV to RGB conversion
        float c = v * s;
        float x = c * (1.0f - fabs(fmod(h * 6.0f, 2.0f) - 1.0f));
        float m = v - c;

        float r, g, b;
        int h_i = (int)(h * 6.0f) % 6;

        switch(h_i) {
            case 0: r = c; g = x; b = 0; break;
            case 1: r = x; g = c; b = 0; break;
            case 2: r = 0; g = c; b = x; break;
            case 3: r = 0; g = x; b = c; break;
            case 4: r = x; g = 0; b = c; break;
            case 5: r = c; g = 0; b = x; break;
            default: r = 0; g = 0; b = 0; break;
        }

        color_buffer[i].r = r + m;
        color_buffer[i].g = g + m;
        color_buffer[i].b = b + m;
    }`;

        case 'output':
            // Output node is handled implicitly - palette_interpolate writes directly to leds[i]
            return '';

        case 'time':
            // Return time scaled by speed parameter
            return '(time * params.speed)';

        case 'sin': {
            // sin(input * 2*pi) normalized to 0-1 range
            if (!node.inputs || node.inputs.length === 0) {
                throw new Error(`sin node requires an input`);
            }
            const inputNodeId = node.inputs[0];
            const inputNode = graph.nodes.find(n => n.id === inputNodeId);
            if (!inputNode) throw new Error(`sin input node not found: ${inputNodeId}`);

            const inputCode = generateNodeCode(inputNode, graph);
            return `(sinf(${inputCode} * 6.28318f) * 0.5f + 0.5f)`;
        }

        case 'add': {
            // Add two inputs together, clamp to 0-1
            if (!node.inputs || node.inputs.length < 2) {
                throw new Error(`add node requires two inputs`);
            }
            const input1NodeId = node.inputs[0];
            const input2NodeId = node.inputs[1];
            const input1Node = graph.nodes.find(n => n.id === input1NodeId);
            const input2Node = graph.nodes.find(n => n.id === input2NodeId);
            if (!input1Node || !input2Node) {
                throw new Error(`add input nodes not found`);
            }

            const input1Code = generateNodeCode(input1Node, graph);
            const input2Code = generateNodeCode(input2Node, graph);
            return `fmin(1.0f, ${input1Code} + ${input2Code})`;
        }

        case 'multiply': {
            // Multiply two inputs together
            if (!node.inputs || node.inputs.length < 2) {
                throw new Error(`multiply node requires two inputs`);
            }
            const input1NodeId = node.inputs[0];
            const input2NodeId = node.inputs[1];
            const input1Node = graph.nodes.find(n => n.id === input1NodeId);
            const input2Node = graph.nodes.find(n => n.id === input2NodeId);
            if (!input1Node || !input2Node) {
                throw new Error(`multiply input nodes not found`);
            }

            const input1Code = generateNodeCode(input1Node, graph);
            const input2Code = generateNodeCode(input2Node, graph);
            return `(${input1Code} * ${input2Code})`;
        }

        case 'constant': {
            // Returns a constant value as an inline expression
            const value = Number(node.parameters?.value ?? 1.0);
            return `${value}f`;
        }

        case 'clamp': {
            // Clamps input to [min, max] range
            if (!node.inputs || node.inputs.length === 0) {
                throw new Error(`clamp node requires an input`);
            }
            const min = Number(node.parameters?.min ?? 0.0);
            const max = Number(node.parameters?.max ?? 1.0);
            const inputNodeId = node.inputs[0];
            const inputNode = graph.nodes.find(n => n.id === inputNodeId);
            if (!inputNode) throw new Error(`clamp input node not found: ${inputNodeId}`);

            const inputCode = generateNodeCode(inputNode, graph);
            return `fmax(${min.toFixed(1)}f, fmin(${max.toFixed(1)}f, ${inputCode}))`;
        }

        case 'modulo': {
            // Modulo operation on input
            if (!node.inputs || node.inputs.length === 0) {
                throw new Error(`modulo node requires an input`);
            }
            const divisor = Number(node.parameters?.divisor ?? 1.0);
            const inputNodeId = node.inputs[0];
            const inputNode = graph.nodes.find(n => n.id === inputNodeId);
            if (!inputNode) throw new Error(`modulo input node not found: ${inputNodeId}`);

            const inputCode = generateNodeCode(inputNode, graph);
            return `fmod(${inputCode}, ${divisor}f)`;
        }

        case 'scale': {
            // Scales input by a factor
            if (!node.inputs || node.inputs.length === 0) {
                throw new Error(`scale node requires an input`);
            }
            const factor = Number(node.parameters?.factor ?? 1.0);
            const inputNodeId = node.inputs[0];
            const inputNode = graph.nodes.find(n => n.id === inputNodeId);
            if (!inputNode) throw new Error(`scale input node not found: ${inputNodeId}`);

            const inputCode = generateNodeCode(inputNode, graph);
            return `(${inputCode} * ${factor}f)`;
        }

        // Audio-reactive nodes
        case 'spectrum_bin': {
            // Access specific frequency bin (0-63)
            const bin = Number(node.parameters?.bin ?? 0);
            if (bin < 0 || bin > 63) {
                throw new Error(`spectrum_bin: bin ${bin} out of range (0-63)`);
            }
            return `AUDIO_SPECTRUM[${bin}]`;
        }

        case 'spectrum_interpolate': {
            // Map LED position across frequency spectrum
            const startBin = Number(node.parameters?.start_bin ?? 0);
            const endBin = Number(node.parameters?.end_bin ?? 63);
            if (startBin < 0 || startBin > 63 || endBin < 0 || endBin > 63) {
                throw new Error(`spectrum_interpolate: bins out of range (0-63)`);
            }
            // Calculate bin index based on LED position
            return `AUDIO_SPECTRUM[${startBin} + int((float(i) / float(NUM_LEDS - 1)) * ${endBin - startBin})]`;
        }

        case 'spectrum_range': {
            // Average frequency range with runtime parameter support
            // Check if node specifies which spectrum band (low/mid/high) to use
            const band = (node.parameters?.band as string) || 'custom';

            if (band === 'low') {
                // Bass: bins 0-20 (~0-175Hz), controlled by params.spectrum_low
                return `(
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                )`;
            } else if (band === 'mid') {
                // Midrange: bins 20-42 (~175-366Hz), controlled by params.spectrum_mid
                return `(
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[20] + AUDIO_SPECTRUM[21] + AUDIO_SPECTRUM[22] + AUDIO_SPECTRUM[23] +
                        AUDIO_SPECTRUM[24] + AUDIO_SPECTRUM[25] + AUDIO_SPECTRUM[26] + AUDIO_SPECTRUM[27] +
                        AUDIO_SPECTRUM[28] + AUDIO_SPECTRUM[29] + AUDIO_SPECTRUM[30] + AUDIO_SPECTRUM[31] +
                        AUDIO_SPECTRUM[32] + AUDIO_SPECTRUM[33] + AUDIO_SPECTRUM[34] + AUDIO_SPECTRUM[35] +
                        AUDIO_SPECTRUM[36] + AUDIO_SPECTRUM[37] + AUDIO_SPECTRUM[38] + AUDIO_SPECTRUM[39] +
                        AUDIO_SPECTRUM[40] + AUDIO_SPECTRUM[41] + AUDIO_SPECTRUM[42]
                    ) / 23.0f)) * params.spectrum_mid
                )`;
            } else if (band === 'high') {
                // Treble: bins 42-63 (~366Hz+), controlled by params.spectrum_high
                return `(
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[42] + AUDIO_SPECTRUM[43] + AUDIO_SPECTRUM[44] + AUDIO_SPECTRUM[45] +
                        AUDIO_SPECTRUM[46] + AUDIO_SPECTRUM[47] + AUDIO_SPECTRUM[48] + AUDIO_SPECTRUM[49] +
                        AUDIO_SPECTRUM[50] + AUDIO_SPECTRUM[51] + AUDIO_SPECTRUM[52] + AUDIO_SPECTRUM[53] +
                        AUDIO_SPECTRUM[54] + AUDIO_SPECTRUM[55] + AUDIO_SPECTRUM[56] + AUDIO_SPECTRUM[57] +
                        AUDIO_SPECTRUM[58] + AUDIO_SPECTRUM[59] + AUDIO_SPECTRUM[60] + AUDIO_SPECTRUM[61] +
                        AUDIO_SPECTRUM[62] + AUDIO_SPECTRUM[63]
                    ) / 22.0f)) * params.spectrum_high
                )`;
            } else {
                // Custom hardcoded range (backward compatibility for graphs without band parameter)
                const startBin = Number(node.parameters?.start_bin ?? 0);
                const endBin = Number(node.parameters?.end_bin ?? 10);
                if (startBin < 0 || startBin > 63 || endBin < 0 || endBin > 63 || startBin >= endBin) {
                    throw new Error(`spectrum_range: invalid bin range [${startBin}, ${endBin}]`);
                }
                const numBins = endBin - startBin + 1;
                let sumCode = '';
                for (let b = startBin; b <= endBin; b++) {
                    sumCode += (b > startBin ? ' + ' : '') + `AUDIO_SPECTRUM[${b}]`;
                }
                return `((${sumCode}) / ${numBins}.0f)`;
            }
        }

        case 'audio_level': {
            // VU meter / overall volume (0-1)
            return `AUDIO_VU`;
        }

        case 'beat': {
            // Beat detection pulse (-1 to 1, normalized to 0-1) with sensitivity control
            const tempoBin = Number(node.parameters?.tempo_bin ?? -1);
            if (tempoBin === -1) {
                // Auto-detect strongest tempo with beat_sensitivity multiplier
                // Note: AUDIO_TEMPO_CONFIDENCE provides overall beat confidence
                return `fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity)`;
            } else {
                if (tempoBin < 0 || tempoBin > 63) {
                    throw new Error(`beat: tempo_bin ${tempoBin} out of range (0-63)`);
                }
                // Use tempo magnitude array for specific bin
                return `fmin(1.0f, audio.tempo_magnitude[${tempoBin}] * params.beat_sensitivity)`;
            }
        }

        case 'tempo_magnitude': {
            // Tempo strength for specific BPM (0-1)
            const tempoBin = Number(node.parameters?.tempo_bin ?? 0);
            if (tempoBin < 0 || tempoBin > 63) {
                throw new Error(`tempo_magnitude: tempo_bin ${tempoBin} out of range (0-63)`);
            }
            return `audio.tempo_magnitude[${tempoBin}]`;
        }

        case 'chromagram': {
            // Pitch class energy (0-11, C-B)
            const pitch = Number(node.parameters?.pitch ?? 0);
            if (pitch < 0 || pitch > 11) {
                throw new Error(`chromagram: pitch ${pitch} out of range (0-11)`);
            }
            return `AUDIO_CHROMAGRAM[${pitch}]`;
        }

        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}

// Validate graph for center-origin architecture compliance
// Prevents architectural violations that bypass center-origin coordinate system
function validateCenterOriginCompliance(graph: Graph): void {
    for (const node of graph.nodes) {
        // RULE 1: Forbid gradient node (legacy linear gradient)
        // This creates edge-to-edge rainbow effects (forbidden)
        if (node.type === 'gradient') {
            throw new Error(
                `Center-origin violation: Node "${node.id}" uses forbidden gradient type.\n` +
                `Linear gradients create edge-to-edge rainbows (NO RAINBOWS EVER).\n` +
                `Use position_gradient + palette_interpolate for center-origin radial effects.`
            );
        }

        // RULE 2: Warn on hsv_to_rgb (legacy rainbow converter)
        // This is typically used with gradient to create rainbows
        if (node.type === 'hsv_to_rgb') {
            console.warn(
                `Warning: Node "${node.id}" uses hsv_to_rgb (legacy rainbow converter).\n` +
                `Ensure this is not creating edge-to-edge rainbow gradients.\n` +
                `Prefer palette_interpolate with center-origin position_gradient.`
            );
        }
    }
}

// Generate URL-safe ID from pattern name
// "Lava Beat" -> "lava_beat"
function generateSafeId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// Detect if pattern uses audio-reactive nodes
function isAudioReactive(graph: Graph): boolean {
    const audioNodeTypes = [
        'spectrum_bin', 'spectrum_interpolate', 'spectrum_range',
        'audio_level', 'beat', 'tempo_magnitude', 'chromagram'
    ];
    return graph.nodes.some(node => audioNodeTypes.includes(node.type));
}

function compileGraph(graph: Graph): string {
    // Validate center-origin architecture compliance
    validateCenterOriginCompliance(graph);

    // Topological sort: generators first, output last
    const orderedNodes = [...graph.nodes].sort((a, b) => {
        // Input/generator nodes first (position_gradient, gradient, constant)
        const aIsGenerator = a.type === 'position_gradient' || a.type === 'gradient' || a.type === 'constant';
        const bIsGenerator = b.type === 'position_gradient' || b.type === 'gradient' || b.type === 'constant';
        if (aIsGenerator && !bIsGenerator) return -1;
        if (!aIsGenerator && bIsGenerator) return 1;

        // Output last
        if (a.type === 'output') return 1;
        if (b.type === 'output') return -1;

        return 0;
    });

    // Generate code only for nodes with side effects (palette_interpolate writes to LEDs)
    // Other nodes (time, sin, add, multiply, constant, clamp, modulo, scale) are inlined into their consumers
    const steps = orderedNodes
        .filter(node => node.type === 'palette_interpolate')
        .map(node => generateNodeCode(node, graph));

    // Compile template
    const template = Handlebars.compile(effectTemplate);
    return template({
        timestamp: new Date().toISOString(),
        graphName: graph.name || 'Generated Effect',
        steps
    });
}

// Compile multiple graphs into a single pattern registry file
function compileMultiPattern(graphs: Graph[]): string {
    // Prepare pattern data
    const patterns = graphs.map(graph => {
        try {
            const audioReactive = isAudioReactive(graph);
            console.log(`  Compiling: ${graph.name} (audio_reactive: ${audioReactive})`);

            // Validate center-origin compliance
            validateCenterOriginCompliance(graph);

            // Generate code steps
            const orderedNodes = [...graph.nodes].sort((a, b) => {
                const aIsGenerator = a.type === 'position_gradient' || a.type === 'gradient' || a.type === 'constant';
                const bIsGenerator = b.type === 'position_gradient' || b.type === 'gradient' || b.type === 'constant';
                if (aIsGenerator && !bIsGenerator) return -1;
                if (!aIsGenerator && bIsGenerator) return 1;
                if (a.type === 'output') return 1;
                if (b.type === 'output') return -1;
                return 0;
            });

            const steps = orderedNodes
                .filter(node => node.type === 'palette_interpolate')
                .map(node => generateNodeCode(node, graph));

            return {
                name: graph.name || 'Unnamed Pattern',
                description: graph.description || 'No description',
                safe_id: generateSafeId(graph.name || 'unnamed'),
                is_audio_reactive: isAudioReactive(graph),
                steps
            };
        } catch (error) {
            console.error(`  ERROR compiling "${graph.name}": ${error}`);
            throw error;
        }
    });

    // Compile template
    const template = Handlebars.compile(multiPatternTemplate);
    const cppCode = template({
        timestamp: new Date().toISOString(),
        patterns
    });

    // VALIDATION: Verify audio-reactive patterns include PATTERN_AUDIO_START macro
    const audioReactivePatterns = patterns.filter(p => p.is_audio_reactive);
    const audioStartCount = (cppCode.match(/PATTERN_AUDIO_START\(\)/g) || []).length;

    console.log(`\nValidation:`);
    console.log(`  Audio-reactive patterns: ${audioReactivePatterns.length}`);
    console.log(`  PATTERN_AUDIO_START() calls: ${audioStartCount}`);

    if (audioReactivePatterns.length > 0 && audioStartCount === 0) {
        throw new Error(
            'CRITICAL ERROR: Audio-reactive patterns detected but PATTERN_AUDIO_START macro missing!\n' +
            `  ${audioReactivePatterns.length} patterns need thread-safe audio access but template failed to generate it.`
        );
    }

    if (audioReactivePatterns.length !== audioStartCount) {
        console.warn(
            `⚠️  WARNING: Macro count mismatch!\n` +
            `  Expected: ${audioReactivePatterns.length} PATTERN_AUDIO_START calls\n` +
            `  Generated: ${audioStartCount} calls`
        );
    }

    return cppCode;
}

// Load all JSON graph files from a directory
function loadGraphsFromDirectory(dirPath: string): Graph[] {
    const files = readdirSync(dirPath)
        .filter(f => f.endsWith('.json'))
        .sort();  // Alphabetical order for deterministic registry

    if (files.length === 0) {
        throw new Error(`No JSON files found in ${dirPath}`);
    }

    return files.map(file => {
        const filePath = join(dirPath, file);
        const json = readFileSync(filePath, 'utf-8');
        const graph = JSON.parse(json) as Graph;
        console.log(`  Loaded: ${file} (${graph.name || 'Unnamed'})`);
        return graph;
    });
}

// CLI setup
program
    .version('0.1.0')
    .description('Compile node graphs to C++ for K1.reinvented');

// Single pattern compilation (original mode)
program
    .command('single <input> <output>')
    .description('Compile single graph to C++ (original mode)')
    .action((input: string, output: string) => {
        try {
            console.log(`Compiling ${input} -> ${output}`);

            // Read and parse graph
            const graphJson = readFileSync(resolve(input), 'utf-8');
            const graph = JSON.parse(graphJson) as Graph;

            // Compile to C++
            const cppCode = compileGraph(graph);

            // Write output
            writeFileSync(resolve(output), cppCode);

            console.log(`✓ Generated ${output}`);
            console.log(`  ${graph.nodes.length} nodes compiled`);
            console.log(`  ${cppCode.split('\n').length} lines of C++ generated`);
        } catch (error) {
            console.error('Compilation failed:', error);
            process.exit(1);
        }
    });

// Multi-pattern compilation (new mode)
program
    .command('multi <input_dir> <output>')
    .description('Compile all graphs in directory to multi-pattern registry')
    .action((inputDir: string, output: string) => {
        try {
            console.log(`Compiling multi-pattern from ${inputDir} -> ${output}`);

            // Load all graphs from directory
            const graphs = loadGraphsFromDirectory(resolve(inputDir));

            // Compile to multi-pattern C++
            const cppCode = compileMultiPattern(graphs);

            // Write output
            writeFileSync(resolve(output), cppCode);

            console.log(`✓ Generated ${output}`);
            console.log(`  ${graphs.length} patterns compiled`);
            console.log(`  ${cppCode.split('\n').length} lines of C++ generated`);
        } catch (error) {
            console.error('Multi-pattern compilation failed:', error);
            process.exit(1);
        }
    });

// Default behavior (backward compatibility)
program
    .argument('[input]', 'Input graph JSON file or directory')
    .argument('[output]', 'Output C++ file')
    .action((input?: string, output?: string) => {
        // If no arguments, show help
        if (!input || !output) {
            program.help();
            return;
        }

        // Delegate to single command for backward compatibility
        try {
            console.log(`Compiling ${input} -> ${output}`);
            const graphJson = readFileSync(resolve(input), 'utf-8');
            const graph = JSON.parse(graphJson) as Graph;
            const cppCode = compileGraph(graph);
            writeFileSync(resolve(output), cppCode);
            console.log(`✓ Generated ${output}`);
        } catch (error) {
            console.error('Compilation failed:', error);
            process.exit(1);
        }
    });

program.parse();