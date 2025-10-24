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
        case 'audio_bass': {
            // Average bins 0-4 for bass frequencies (55-110Hz)
            return `
    // Node: ${node.id} (audio_bass)
    // Bass frequencies: 55-110Hz (bins 0-4)
    {
        float bass = 0.0f;
        for (int j = 0; j < 5; j++) {
            bass += spectrogram[j];
        }
        bass /= 5.0f;
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = bass;
        }
    }`;
        }

        case 'audio_mid': {
            // Average bins 20-24 for mid frequencies (~800Hz-1.2kHz)
            return `
    // Node: ${node.id} (audio_mid)
    // Mid frequencies: ~800Hz-1.2kHz (bins 20-24)
    {
        float mid = 0.0f;
        for (int j = 20; j < 25; j++) {
            mid += spectrogram[j];
        }
        mid /= 5.0f;
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = mid;
        }
    }`;
        }

        case 'audio_treble': {
            // Average bins 40-44 for treble frequencies (~3.2kHz-5kHz)
            return `
    // Node: ${node.id} (audio_treble)
    // Treble frequencies: ~3.2kHz-5kHz (bins 40-44)
    {
        float treble = 0.0f;
        for (int j = 40; j < 45; j++) {
            treble += spectrogram[j];
        }
        treble /= 5.0f;
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = treble;
        }
    }`;
        }

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
            // Access specific frequency bin
            const bin = Number(node.parameters?.bin ?? 0);
            if (bin < 0 || bin > 63) {
                throw new Error(`spectrum_bin: bin ${bin} out of range (0-63)`);
            }
            return `
    // Node: ${node.id} (spectrum_bin ${bin})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = spectrogram[${bin}];
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
    | 'audio_bass'
    | 'audio_mid'
    | 'audio_treble'
    | 'audio_level'
    | 'beat'
    | 'spectrum_bin'
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
        'audio_bass', 'audio_mid', 'audio_treble', 'audio_level',
        'beat', 'spectrum_bin', 'chromagram', 'tempo_confidence'
    ];
    return validTypes.includes(type as ExtendedNodeType);
}