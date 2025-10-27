// Audio and Essential Node Types for K1.reinvented
// These enable audio-reactive patterns and essential operations

import { Node, Graph } from './index';

/**
 * Generate code for essential mathematical nodes
 */
export function generateEssentialNodeCode(node: Node, graph: Graph): string {
    switch(node.type) {
        case 'constant': {
            const value = Number(node.parameters?.value ?? 1.0);
            return `
    // Node: ${node.id} (constant = ${value})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = ${value}f;
    }`;
        }

        case 'multiply': {
            // Assumes inputs are in field_buffer and temp_buffer
            return `
    // Node: ${node.id} (multiply)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = field_buffer[i] * temp_buffer[i];
    }`;
        }

        case 'add': {
            // Assumes inputs are in field_buffer and temp_buffer
            return `
    // Node: ${node.id} (add)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = field_buffer[i] + temp_buffer[i];
    }`;
        }

        case 'clamp': {
            const min = Number(node.parameters?.min ?? 0.0);
            const max = Number(node.parameters?.max ?? 1.0);
            return `
    // Node: ${node.id} (clamp [${min}, ${max}])
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = fmax(${min}f, fmin(${max}f, field_buffer[i]));
    }`;
        }

        case 'modulo': {
            const divisor = Number(node.parameters?.divisor ?? 1.0);
            return `
    // Node: ${node.id} (modulo ${divisor})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = fmod(field_buffer[i], ${divisor}f);
    }`;
        }

        case 'scale': {
            const factor = Number(node.parameters?.factor ?? 1.0);
            return `
    // Node: ${node.id} (scale by ${factor})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = field_buffer[i] * ${factor}f;
    }`;
        }

        default:
            return '';  // Not an essential node
    }
}

/**
 * Generate code for audio-reactive nodes
 */
export function generateAudioNodeCode(node: Node, graph: Graph): string {
    switch(node.type) {

        case 'audio_level': {
            // VU meter level (already normalized 0-1)
            return `
    // Node: ${node.id} (audio_level - VU meter)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = vu_level;  // Already normalized 0-1
    }`;
        }

        case 'beat': {
            const tempo_bin = Number(node.parameters?.tempo_bin ?? -1);

            if (tempo_bin === -1) {
                // Auto-detect strongest tempo
                return `
    // Node: ${node.id} (beat - auto-detect strongest tempo)
    {
        // Find strongest tempo
        int strongest = 0;
        float max_mag = 0.0f;
        for (int t = 0; t < NUM_TEMPI; t++) {
            if (tempi[t].magnitude > max_mag) {
                max_mag = tempi[t].magnitude;
                strongest = t;
            }
        }
        // Use beat from strongest tempo (normalized to 0-1)
        float beat_value = tempi[strongest].beat * 0.5f + 0.5f;
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = beat_value;
        }
    }`;
            } else {
                // Use specific tempo bin
                return `
    // Node: ${node.id} (beat - tempo bin ${tempo_bin})
    {
        float beat_value = tempi[${tempo_bin}].beat * 0.5f + 0.5f;
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = beat_value;
        }
    }`;
            }
        }

        case 'spectrum_bin': {
            // Access specific frequency bin (0-63)
            const bin = Number(node.parameters?.bin ?? 0);
            if (!Number.isFinite(bin) || bin < 0 || bin > 63) {
                throw new Error(`spectrum_bin: bin ${bin} out of range (0-63)`);
            }
            return `
    // Node: ${node.id} (spectrum_bin ${bin})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = spectrogram[${bin}];
    }`;
        }

        case 'spectrum_range': {
            // Average inclusive range of bins [start_bin, end_bin]
            const start = Number(node.parameters?.start_bin ?? 0);
            const end = Number(node.parameters?.end_bin ?? 10);
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                throw new Error('spectrum_range: start_bin/end_bin must be finite numbers');
            }
            const s = Math.max(0, Math.min(63, Math.floor(start)));
            const e = Math.max(0, Math.min(63, Math.floor(end)));
            const lo = Math.min(s, e);
            const hi = Math.max(s, e);
            const count = hi - lo + 1;
            return `
    // Node: ${node.id} (spectrum_range bins ${lo}-${hi})
    float sum = 0.0f;
    for (int b = ${lo}; b <= ${hi}; b++) { sum += spectrogram[b]; }
    float avg = sum / ${count}.0f;
    for (int i = 0; i < NUM_LEDS; i++) { field_buffer[i] = avg; }`;
        }

        case 'spectrum_interpolate': {
            // Map LED position across [start_bin, end_bin], linear interpolate between neighboring bins
            const startBin = Number(node.parameters?.start_bin ?? 0);
            const endBin = Number(node.parameters?.end_bin ?? 63);
            if (!Number.isFinite(startBin) || !Number.isFinite(endBin)) {
                throw new Error('spectrum_interpolate: start_bin/end_bin must be finite numbers');
            }
            const s = Math.max(0, Math.min(63, Math.floor(startBin)));
            const e = Math.max(0, Math.min(63, Math.floor(endBin)));
            const span = Math.max(1, Math.abs(e - s));
            return `
    // Node: ${node.id} (spectrum_interpolate ${s}-${e})
    for (int i = 0; i < NUM_LEDS; i++) {
        float progress = (NUM_LEDS <= 1) ? 0.0f : (float)i / (float)(NUM_LEDS - 1);
        float binf = ${s}.0f + progress * ${span}.0f * (${e} >= ${s} ? 1.0f : -1.0f);
        int bin_low = (int)binf;
        int bin_high = bin_low + ((${e} >= ${s}) ? 1 : -1);
        bin_low = max(0, min(63, bin_low));
        bin_high = max(0, min(63, bin_high));
        float frac = fabsf(binf - (float)bin_low);
        field_buffer[i] = spectrogram[bin_low] * (1.0f - frac) + spectrogram[bin_high] * frac;
    }`;
        }

        case 'chromagram': {
            // Access pitch class (0-11 for C through B)
            const pitch = Number(node.parameters?.pitch ?? 0);
            if (pitch < 0 || pitch > 11) {
                throw new Error(`chromagram: pitch ${pitch} out of range (0-11)`);
            }
            return `
    // Node: ${node.id} (chromagram pitch ${pitch})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = chromagram[${pitch}];
    }`;
        }

        case 'tempo_confidence': {
            // How confident the beat detection is (0-1)
            return `
    // Node: ${node.id} (tempo_confidence)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = tempo_confidence;
    }`;
        }

        default:
            return '';  // Not an audio node
    }
}

/**
 * Extended node type list for TypeScript
 */
export type ExtendedNodeType =
    // Original nodes
    | 'gradient'
    | 'hsv_to_rgb'
    | 'output'
    | 'position_gradient'
    | 'palette_interpolate'
    // Essential nodes
    | 'constant'
    | 'multiply'
    | 'add'
    | 'clamp'
    | 'modulo'
    | 'scale'
    // Audio nodes
    | 'spectrum_bin'
    | 'spectrum_range'
    | 'spectrum_interpolate'
    | 'audio_level'
    | 'beat'
    | 'chromagram'
    | 'tempo_confidence';

/**
 * Check if a node type is valid
 */
export function isValidNodeType(type: string): boolean {
    const validTypes: ExtendedNodeType[] = [
        // Original
        'gradient', 'hsv_to_rgb', 'output', 'position_gradient', 'palette_interpolate',
        // Essential
        'constant', 'multiply', 'add', 'clamp', 'modulo', 'scale',
        // Audio
        'spectrum_bin', 'spectrum_range', 'spectrum_interpolate', 'audio_level',
        'beat', 'chromagram', 'tempo_confidence'
    ];
    return validTypes.includes(type as ExtendedNodeType);
}
