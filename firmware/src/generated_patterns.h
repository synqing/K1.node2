
// AUTO-GENERATED MULTI-PATTERN CODE - DO NOT EDIT
// Generated at: 2025-10-25T10:05:39.927Z
// Patterns: Bass Pulse, Spectrum Sweep, Audio Test - Beat and Spectrum Interpolate, Audio Test - Comprehensive, Audio Test - Spectrum Bin, Aurora, Aurora Spectrum, Departure, Departure-Spectrum, Emotiscope Beat Tunnel, Emotiscope FFT, Emotiscope Metronome, Emotiscope Octave, Emotiscope Perlin, Emotiscope Spectrum, Lava, Lava Beat, Twilight, Twilight Chroma

#pragma once

#include "pattern_registry.h"

extern CRGBF leds[NUM_LEDS];

// Pattern: Bass Pulse
// Global brightness pulsing with bass energy and beat gate
void draw_bass_pulse(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.47f, 0.12f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmax(0.0f, fmin(1.0f, ((
                    fmin(1.0f, fmax(0.0f, (
                        spectrogram[0] + spectrogram[1] + spectrogram[2] + spectrogram[3] +
                        spectrogram[4] + spectrogram[5] + spectrogram[6] + spectrogram[7] +
                        spectrogram[8] + spectrogram[9] + spectrogram[10] + spectrogram[11] +
                        spectrogram[12] + spectrogram[13] + spectrogram[14] + spectrogram[15] +
                        spectrogram[16] + spectrogram[17] + spectrogram[18] + spectrogram[19] +
                        spectrogram[20]
                    ) / 21.0f)) * params.spectrum_low
                ) * fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity)))), 1.0f);
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
    }
}

// Pattern: Spectrum Sweep
// Map LED positions across spectrum with beat-modulated intensity
void draw_spectrum_sweep(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.00f, 1.00f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((spectrogram[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] * fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity)), 1.0f);
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
    }
}

// Pattern: Audio Test - Beat and Spectrum Interpolate
// Test beat detection and spectrum interpolate across LED strip
void draw_audio_test_beat_and_spectrum_interpolate(float time, const PatternParameters& params) {
    
    // beat_reactive palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.50f), CRGBF(0.00f, 1.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 4;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((spectrogram[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] * fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity)), 1.0f);
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
    }
}

// Pattern: Audio Test - Comprehensive
// Test multiple audio node types: spectrum_range (bass average) and audio_level
void draw_audio_test_comprehensive(float time, const PatternParameters& params) {
    
    // audio_reactive_rainbow palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.00f, 1.00f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((((spectrogram[3] + spectrogram[4] + spectrogram[5] + spectrogram[6] + spectrogram[7] + spectrogram[8]) / 6.0f) * audio_level), 1.0f);
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
    }
}

// Pattern: Audio Test - Spectrum Bin
// Simple test pattern using spectrum_bin (bass frequency) to control brightness
void draw_audio_test_spectrum_bin(float time, const PatternParameters& params) {
    
    // audio_reactive_blue palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.20f), CRGBF(0.39f, 0.20f, 0.78f), CRGBF(1.00f, 0.39f, 1.00f) };
    const int palette_size = 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(spectrogram[5], 1.0f);
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
    }
}

// Pattern: Aurora
// Animated aurora effect - position scrolls with gentle sinusoidal motion. Uses Departure palette for beautiful earth-to-emerald transition.
void draw_aurora(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.03f, 0.01f, 0.00f), CRGBF(0.09f, 0.03f, 0.00f), CRGBF(0.29f, 0.15f, 0.02f), CRGBF(0.66f, 0.39f, 0.15f), CRGBF(0.84f, 0.66f, 0.47f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(0.53f, 1.00f, 0.54f), CRGBF(0.09f, 1.00f, 0.09f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.53f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f) };
    const int palette_size = 12;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + (sinf((time * params.speed) * 6.28318f) * 0.5f + 0.5f)), 1.0f);
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
    }
}

// Pattern: Aurora Spectrum
// Time-based aurora animation enhanced with bass frequency modulation. Combines sinusoidal motion with low-frequency audio reactivity.
void draw_aurora_spectrum(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.03f, 0.01f, 0.00f), CRGBF(0.09f, 0.03f, 0.00f), CRGBF(0.29f, 0.15f, 0.02f), CRGBF(0.66f, 0.39f, 0.15f), CRGBF(0.84f, 0.66f, 0.47f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(0.53f, 1.00f, 0.54f), CRGBF(0.09f, 1.00f, 0.09f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.53f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f) };
    const int palette_size = 12;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + (sinf((time * params.speed) * 6.28318f) * 0.5f + 0.5f)) + (((spectrogram[0] + spectrogram[1] + spectrogram[2] + spectrogram[3] + spectrogram[4] + spectrogram[5] + spectrogram[6] + spectrogram[7] + spectrogram[8]) / 9.0f) * 0.5f)), 1.0f);
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
    }
}

// Pattern: Departure
// Journey from darkness to light to growth. Dark earth → golden light → pure white → emerald green. Represents awakening and new beginnings.
void draw_departure(float time, const PatternParameters& params) {
    
    // departure palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.03f, 0.01f, 0.00f), CRGBF(0.09f, 0.03f, 0.00f), CRGBF(0.29f, 0.15f, 0.02f), CRGBF(0.66f, 0.39f, 0.15f), CRGBF(0.84f, 0.66f, 0.47f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(0.53f, 1.00f, 0.54f), CRGBF(0.09f, 1.00f, 0.09f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.53f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f) };
    const int palette_size = 12;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Departure-Spectrum
// Departure pattern flowing across the frequency spectrum in real-time
void draw_departure_spectrum(float time, const PatternParameters& params) {
    
    // departure palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.10f, 0.22f, 0.43f), CRGBF(0.12f, 0.35f, 0.51f), CRGBF(0.14f, 0.51f, 0.55f), CRGBF(0.24f, 0.63f, 0.51f), CRGBF(0.47f, 0.71f, 0.39f), CRGBF(0.71f, 0.63f, 0.27f), CRGBF(0.86f, 0.47f, 0.16f), CRGBF(0.94f, 0.31f, 0.08f), CRGBF(0.90f, 0.20f, 0.08f) };
    const int palette_size = 9;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH);
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
    }
}

// Pattern: Emotiscope Beat Tunnel
// Animated tunnel effect with beat-phase gating. Creates a tunnel of light that responds when the beat phase aligns with specific positions. Includes sprite animation and momentum-based scrolling.
void draw_emotiscope_beat_tunnel(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.08f, 0.00f, 0.16f), CRGBF(0.39f, 0.08f, 0.31f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.78f, 0.20f), CRGBF(0.78f, 1.00f, 0.39f), CRGBF(0.39f, 0.39f, 1.00f) };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Emotiscope FFT
// Full FFT visualization with automatic dynamic range scaling. Adapts brightness to incoming signal strength for consistent visual response across different input levels.
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.39f, 0.20f, 0.00f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.78f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.39f, 1.00f, 0.39f), CRGBF(0.00f, 0.78f, 1.00f), CRGBF(0.39f, 0.39f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Emotiscope Metronome
// Beat indicator pattern that pulses with detected tempo. Each tempo bin gets a dot that moves with beat phase, scaled by tempo magnitude. Creates polyrhythmic visual feedback for detected beat frequencies.
void draw_emotiscope_metronome(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.39f, 0.39f, 1.00f), CRGBF(0.00f, 1.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Emotiscope Octave
// Harmonic pitch highlighting using chromagram visualization. Maps the 12 pitch classes (C through B) across the LED strip, showing which notes are present in the audio. Mirror mode folds the octave symmetrically from center.
void draw_emotiscope_octave(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.59f, 0.00f), CRGBF(0.78f, 1.00f, 0.00f), CRGBF(0.39f, 1.00f, 0.39f), CRGBF(0.00f, 1.00f, 0.59f), CRGBF(0.39f, 0.39f, 1.00f), CRGBF(0.78f, 0.00f, 1.00f), CRGBF(1.00f, 0.00f, 0.78f), CRGBF(1.00f, 0.00f, 0.20f), CRGBF(0.78f, 0.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Emotiscope Perlin
// Smooth organic noise-based animation using Perlin noise for both hue and luminosity. Creates flowing, natural-looking patterns with momentum-based motion that responds to audio intensity.
void draw_emotiscope_perlin(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.08f, 0.02f, 0.31f), CRGBF(0.39f, 0.12f, 0.59f), CRGBF(0.59f, 0.31f, 0.78f), CRGBF(0.78f, 0.59f, 1.00f), CRGBF(0.59f, 0.78f, 0.59f), CRGBF(0.39f, 0.78f, 0.39f), CRGBF(0.20f, 0.59f, 0.78f), CRGBF(0.00f, 0.20f, 0.39f) };
    const int palette_size = 9;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Emotiscope Spectrum
// Frequency spectrum visualization mapped across LED strip. Maps 64 frequency bins across LED positions with optional mirror mode. Dynamically colored based on frequency position.
void draw_emotiscope_spectrum(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 1.00f), CRGBF(0.00f, 0.00f, 1.00f), CRGBF(1.00f, 0.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH), 1.0f);
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
    }
}

// Pattern: Lava
// Primal intensity and transformation. Black → deep red → bright orange → white hot. Represents passion, heat, and raw energy.
void draw_lava(float time, const PatternParameters& params) {
    
    // lava palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.07f, 0.00f, 0.00f), CRGBF(0.44f, 0.00f, 0.00f), CRGBF(0.56f, 0.01f, 0.00f), CRGBF(0.69f, 0.07f, 0.00f), CRGBF(0.84f, 0.17f, 0.01f), CRGBF(1.00f, 0.32f, 0.02f), CRGBF(1.00f, 0.45f, 0.02f), CRGBF(1.00f, 0.61f, 0.02f), CRGBF(1.00f, 0.80f, 0.02f), CRGBF(1.00f, 1.00f, 0.02f), CRGBF(1.00f, 1.00f, 0.28f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH);
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
    }
}

// Pattern: Lava Beat
// Position gradient pulsing with music beat. Shows rhythm-reactive intensity using Lava palette.
void draw_lava_beat(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.07f, 0.00f, 0.00f), CRGBF(0.44f, 0.00f, 0.00f), CRGBF(0.56f, 0.01f, 0.00f), CRGBF(0.69f, 0.07f, 0.00f), CRGBF(0.84f, 0.17f, 0.01f), CRGBF(1.00f, 0.32f, 0.02f), CRGBF(1.00f, 0.45f, 0.02f), CRGBF(1.00f, 0.61f, 0.02f), CRGBF(1.00f, 0.80f, 0.02f), CRGBF(1.00f, 1.00f, 0.02f), CRGBF(1.00f, 1.00f, 0.28f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity)), 1.0f);
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
    }
}

// Pattern: Twilight
// The peaceful transition from day to night. Warm amber → deep purple → midnight blue. Represents contemplation, transition, and quiet beauty.
void draw_twilight(float time, const PatternParameters& params) {
    
    // twilight palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(1.00f, 0.65f, 0.00f), CRGBF(0.94f, 0.50f, 0.00f), CRGBF(0.86f, 0.31f, 0.08f), CRGBF(0.71f, 0.24f, 0.47f), CRGBF(0.39f, 0.16f, 0.71f), CRGBF(0.12f, 0.08f, 0.55f), CRGBF(0.04f, 0.06f, 0.31f) };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH);
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
    }
}

// Pattern: Twilight Chroma
// Chromagram-based pitch visualization - LED groups respond to musical note energy (C through B). Repeats 12-note pattern across LED strip.
void draw_twilight_chroma(float time, const PatternParameters& params) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(1.00f, 0.65f, 0.00f), CRGBF(0.94f, 0.50f, 0.00f), CRGBF(0.86f, 0.31f, 0.08f), CRGBF(0.71f, 0.24f, 0.47f), CRGBF(0.39f, 0.16f, 0.71f), CRGBF(0.12f, 0.08f, 0.55f), CRGBF(0.04f, 0.06f, 0.31f) };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(chromagram[0], 1.0f);
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
    }
}


// Pattern registry array
const PatternInfo g_pattern_registry[] = {
    { "Bass Pulse", "bass_pulse", "Global brightness pulsing with bass energy and beat gate", draw_bass_pulse, true },
    { "Spectrum Sweep", "spectrum_sweep", "Map LED positions across spectrum with beat-modulated intensity", draw_spectrum_sweep, true },
    { "Audio Test - Beat and Spectrum Interpolate", "audio_test_beat_and_spectrum_interpolate", "Test beat detection and spectrum interpolate across LED strip", draw_audio_test_beat_and_spectrum_interpolate, true },
    { "Audio Test - Comprehensive", "audio_test_comprehensive", "Test multiple audio node types: spectrum_range (bass average) and audio_level", draw_audio_test_comprehensive, true },
    { "Audio Test - Spectrum Bin", "audio_test_spectrum_bin", "Simple test pattern using spectrum_bin (bass frequency) to control brightness", draw_audio_test_spectrum_bin, true },
    { "Aurora", "aurora", "Animated aurora effect - position scrolls with gentle sinusoidal motion. Uses Departure palette for beautiful earth-to-emerald transition.", draw_aurora, false },
    { "Aurora Spectrum", "aurora_spectrum", "Time-based aurora animation enhanced with bass frequency modulation. Combines sinusoidal motion with low-frequency audio reactivity.", draw_aurora_spectrum, true },
    { "Departure", "departure", "Journey from darkness to light to growth. Dark earth → golden light → pure white → emerald green. Represents awakening and new beginnings.", draw_departure, false },
    { "Departure-Spectrum", "departure_spectrum", "Departure pattern flowing across the frequency spectrum in real-time", draw_departure_spectrum, true },
    { "Emotiscope Beat Tunnel", "emotiscope_beat_tunnel", "Animated tunnel effect with beat-phase gating. Creates a tunnel of light that responds when the beat phase aligns with specific positions. Includes sprite animation and momentum-based scrolling.", draw_emotiscope_beat_tunnel, true },
    { "Emotiscope FFT", "emotiscope_fft", "Full FFT visualization with automatic dynamic range scaling. Adapts brightness to incoming signal strength for consistent visual response across different input levels.", draw_emotiscope_fft, true },
    { "Emotiscope Metronome", "emotiscope_metronome", "Beat indicator pattern that pulses with detected tempo. Each tempo bin gets a dot that moves with beat phase, scaled by tempo magnitude. Creates polyrhythmic visual feedback for detected beat frequencies.", draw_emotiscope_metronome, true },
    { "Emotiscope Octave", "emotiscope_octave", "Harmonic pitch highlighting using chromagram visualization. Maps the 12 pitch classes (C through B) across the LED strip, showing which notes are present in the audio. Mirror mode folds the octave symmetrically from center.", draw_emotiscope_octave, true },
    { "Emotiscope Perlin", "emotiscope_perlin", "Smooth organic noise-based animation using Perlin noise for both hue and luminosity. Creates flowing, natural-looking patterns with momentum-based motion that responds to audio intensity.", draw_emotiscope_perlin, true },
    { "Emotiscope Spectrum", "emotiscope_spectrum", "Frequency spectrum visualization mapped across LED strip. Maps 64 frequency bins across LED positions with optional mirror mode. Dynamically colored based on frequency position.", draw_emotiscope_spectrum, true },
    { "Lava", "lava", "Primal intensity and transformation. Black → deep red → bright orange → white hot. Represents passion, heat, and raw energy.", draw_lava, false },
    { "Lava Beat", "lava_beat", "Position gradient pulsing with music beat. Shows rhythm-reactive intensity using Lava palette.", draw_lava_beat, true },
    { "Twilight", "twilight", "The peaceful transition from day to night. Warm amber → deep purple → midnight blue. Represents contemplation, transition, and quiet beauty.", draw_twilight, false },
    { "Twilight Chroma", "twilight_chroma", "Chromagram-based pitch visualization - LED groups respond to musical note energy (C through B). Repeats 12-note pattern across LED strip.", draw_twilight_chroma, true }
};

const uint8_t g_num_patterns = 19;
