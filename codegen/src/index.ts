#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
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

// C++ code template
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
            const paletteColors = graph.palette_data.map(([pos, r, g, b]) => {
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
            // Return the time parameter
            return 'time';

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
            return `fmax(${min}f, fmin(${max}f, ${inputCode}))`;
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
            return `spectrogram[${bin}]`;
        }

        case 'spectrum_interpolate': {
            // Map LED position across frequency spectrum
            const startBin = Number(node.parameters?.start_bin ?? 0);
            const endBin = Number(node.parameters?.end_bin ?? 63);
            if (startBin < 0 || startBin > 63 || endBin < 0 || endBin > 63) {
                throw new Error(`spectrum_interpolate: bins out of range (0-63)`);
            }
            // Calculate bin index based on LED position
            return `spectrogram[${startBin} + int((float(i) / float(NUM_LEDS - 1)) * ${endBin - startBin})]`;
        }

        case 'spectrum_range': {
            // Average frequency range (e.g., bass bins 3-8)
            const startBin = Number(node.parameters?.start_bin ?? 0);
            const endBin = Number(node.parameters?.end_bin ?? 10);
            if (startBin < 0 || startBin > 63 || endBin < 0 || endBin > 63 || startBin >= endBin) {
                throw new Error(`spectrum_range: invalid bin range [${startBin}, ${endBin}]`);
            }
            const numBins = endBin - startBin + 1;
            // Generate inline averaging code
            let sumCode = '';
            for (let b = startBin; b <= endBin; b++) {
                sumCode += (b > startBin ? ' + ' : '') + `spectrogram[${b}]`;
            }
            return `((${sumCode}) / ${numBins}.0f)`;
        }

        case 'audio_level': {
            // VU meter / overall volume (0-1)
            return `vu_level`;
        }

        case 'beat': {
            // Beat detection pulse (-1 to 1, normalized to 0-1)
            const tempoBin = Number(node.parameters?.tempo_bin ?? -1);
            if (tempoBin === -1) {
                // Auto-detect strongest tempo - need to generate more complex inline code
                // For simplicity, return a placeholder that uses first tempo bin
                return `(tempi[0].beat * 0.5f + 0.5f)`;
            } else {
                if (tempoBin < 0 || tempoBin > 63) {
                    throw new Error(`beat: tempo_bin ${tempoBin} out of range (0-63)`);
                }
                return `(tempi[${tempoBin}].beat * 0.5f + 0.5f)`;
            }
        }

        case 'tempo_magnitude': {
            // Tempo strength for specific BPM (0-1)
            const tempoBin = Number(node.parameters?.tempo_bin ?? 0);
            if (tempoBin < 0 || tempoBin > 63) {
                throw new Error(`tempo_magnitude: tempo_bin ${tempoBin} out of range (0-63)`);
            }
            return `tempi[${tempoBin}].magnitude`;
        }

        case 'chromagram': {
            // Pitch class energy (0-11, C-B)
            const pitch = Number(node.parameters?.pitch ?? 0);
            if (pitch < 0 || pitch > 11) {
                throw new Error(`chromagram: pitch ${pitch} out of range (0-11)`);
            }
            return `chromagram[${pitch}]`;
        }

        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}

function compileGraph(graph: Graph): string {
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

// CLI setup
program
    .version('0.1.0')
    .description('Compile node graphs to C++ for K1.reinvented')
    .argument('<input>', 'Input graph JSON file')
    .argument('<output>', 'Output C++ file')
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

program.parse();