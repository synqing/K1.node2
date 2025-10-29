
// AUTO-GENERATED MULTI-PATTERN CODE - DO NOT EDIT
// Generated at: 2025-10-27T04:11:50.068Z
// Patterns: Bass Pulse, Spectrum Sweep, Audio Test - Beat and Spectrum Interpolate, Audio Test - Comprehensive, Audio Test - Spectrum Bin, Aurora, Aurora Spectrum, Beat-Locked Grid, Breathing Ambient, Departure, Departure-Spectrum, Emotiscope FFT, Emotiscope Octave, Emotiscope Spectrum, Energy Adaptive Pulse, Harmonic Resonance, Lava, Lava Beat, Multi-Band Cascade, Predictive Beat Flash, Spectral Mirror, Transient Particles, Twilight, Twilight Chroma

#pragma once

#include "pattern_registry.h"
#include "pattern_audio_interface.h"

extern CRGBF leds[NUM_LEDS];

// Pattern: Bass Pulse
// Global brightness pulsing with bass energy and beat gate
void draw_bass_pulse(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.47f, 0.12f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmax(0.0f, fmin(1.0f, ((
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                ) * fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity)))), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.00f, 1.00f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] * fmin(1.0f, audio.tempo_magnitude[0] * params.beat_sensitivity)), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // beat_reactive palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.50f), CRGBF(0.00f, 1.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 4;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] * fmin(1.0f, audio.tempo_magnitude[0] * params.beat_sensitivity)), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // audio_reactive_rainbow palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.00f, 1.00f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod((((AUDIO_SPECTRUM[3] + AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] + AUDIO_SPECTRUM[8]) / 6.0f) * AUDIO_VU), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // audio_reactive_blue palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.20f), CRGBF(0.39f, 0.20f, 0.78f), CRGBF(1.00f, 0.39f, 1.00f) };
    const int palette_size = 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(AUDIO_SPECTRUM[5], 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.03f, 0.01f, 0.00f), CRGBF(0.09f, 0.03f, 0.00f), CRGBF(0.29f, 0.15f, 0.02f), CRGBF(0.66f, 0.39f, 0.15f), CRGBF(0.84f, 0.66f, 0.47f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(0.53f, 1.00f, 0.54f), CRGBF(0.09f, 1.00f, 0.09f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.53f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f) };
    const int palette_size = 12;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + (sinf((time * params.speed) * 6.28318f) * 0.5f + 0.5f)) + (((AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] + AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] + AUDIO_SPECTRUM[8]) / 9.0f) * 0.5f)), 1.0f);
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

// Pattern: Beat-Locked Grid
// Tempo-synchronized grid pattern. Grid cells advance only on beat detection, eliminating floating sensation.
void draw_beat_locked_grid(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.20f), CRGBF(0.20f, 0.00f, 0.39f), CRGBF(0.39f, 0.00f, 0.59f), CRGBF(0.59f, 0.20f, 0.78f), CRGBF(0.78f, 0.39f, 1.00f), CRGBF(1.00f, 0.59f, 1.00f), CRGBF(1.00f, 0.78f, 0.78f), CRGBF(1.00f, 1.00f, 0.59f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, (fmod(((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * 4f), 1f) * fmod(((time * params.speed) * fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity)), 1f)) + (
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                )), 1.0f);
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

// Pattern: Breathing Ambient
// Gentle expansion and contraction based on audio energy. Center-outward fill on beats, releases during silence.
void draw_breathing_ambient(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.08f), CRGBF(0.08f, 0.04f, 0.16f), CRGBF(0.20f, 0.12f, 0.31f), CRGBF(0.39f, 0.27f, 0.55f), CRGBF(0.71f, 0.55f, 0.86f) };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmax(0.0f, fmin(1.0f, (fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * -1f) + 1f) * fmin(1.0f, ((sinf((time * params.speed) * 6.28318f) * 0.5f + 0.5f) * (AUDIO_VU * 0.7f)) + (fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity) * 0.3f))))), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
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

// Pattern: Emotiscope FFT
// CENTER-ORIGIN beat-modulated spectrum. Position radiates from center, beat pulse gates frequency energy. Darker center expands outward as beat intensifies.
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.50f, 0.00f, 1.00f), CRGBF(1.00f, 0.00f, 1.00f), CRGBF(1.00f, 0.50f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.50f), CRGBF(0.00f, 0.50f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + fmin(1.0f, AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] + (fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity) * 0.7f))), 1.0f);
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
// CENTER-ORIGIN chromatic visualization. Pitch classes radiate from center. Position gradient shows distance from center, chromagram provides pitch energy data for audio reactivity.
void draw_emotiscope_octave(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.59f, 0.00f), CRGBF(0.78f, 1.00f, 0.00f), CRGBF(0.39f, 1.00f, 0.39f), CRGBF(0.00f, 1.00f, 0.59f), CRGBF(0.39f, 0.39f, 1.00f), CRGBF(0.78f, 0.00f, 1.00f), CRGBF(1.00f, 0.00f, 0.78f), CRGBF(1.00f, 0.00f, 0.20f), CRGBF(0.78f, 0.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 11)]), 1.0f);
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
// CENTER-ORIGIN audio visualization: position gradient shows audio level magnitude. Darker center &#x3D; quieter, brighter edges &#x3D; louder. Real-time frequency analysis.
void draw_emotiscope_spectrum(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.00f), CRGBF(1.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 1.00f, 1.00f), CRGBF(0.00f, 0.00f, 1.00f), CRGBF(1.00f, 0.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + AUDIO_VU), 1.0f);
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

// Pattern: Energy Adaptive Pulse
// Pattern intensity dynamically scales with audio energy. Bright during intense sections, dims during quiet passages.
void draw_energy_adaptive_pulse(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.20f, 0.00f, 0.20f), CRGBF(0.39f, 0.20f, 0.39f), CRGBF(0.78f, 0.39f, 0.78f), CRGBF(1.00f, 0.78f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, fmin(1.0f, (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) + ((sinf((time * params.speed) * 6.28318f) * 0.5f + 0.5f) * (AUDIO_VU * AUDIO_VU))) + ((
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                ) * 0.3f)), 1.0f);
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

// Pattern: Harmonic Resonance
// Chromagram-based harmonic visualization. Musical pitch classes radiate from center in concentric rings.
void draw_harmonic_resonance(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.00f, 0.20f), CRGBF(1.00f, 0.20f, 0.00f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(0.78f, 0.78f, 0.00f), CRGBF(0.39f, 1.00f, 0.20f), CRGBF(0.00f, 0.78f, 0.39f), CRGBF(0.20f, 0.39f, 0.78f), CRGBF(0.39f, 0.00f, 1.00f), CRGBF(0.78f, 0.00f, 0.78f), CRGBF(1.00f, 0.00f, 0.39f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.78f, 0.20f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * fmin(1.0f, fmin(1.0f, AUDIO_CHROMAGRAM[0] + AUDIO_CHROMAGRAM[4]) + AUDIO_CHROMAGRAM[7])) + (fmin(1.0f, fmin(1.0f, AUDIO_CHROMAGRAM[0] + AUDIO_CHROMAGRAM[4]) + AUDIO_CHROMAGRAM[7]) * 0.5f)), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.07f, 0.00f, 0.00f), CRGBF(0.44f, 0.00f, 0.00f), CRGBF(0.56f, 0.01f, 0.00f), CRGBF(0.69f, 0.07f, 0.00f), CRGBF(0.84f, 0.17f, 0.01f), CRGBF(1.00f, 0.32f, 0.02f), CRGBF(1.00f, 0.45f, 0.02f), CRGBF(1.00f, 0.61f, 0.02f), CRGBF(1.00f, 0.80f, 0.02f), CRGBF(1.00f, 1.00f, 0.02f), CRGBF(1.00f, 1.00f, 0.28f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity)), 1.0f);
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

// Pattern: Multi-Band Cascade
// 64-bin spectrum split into 8 octave bands. Each band controls LED section with waterfall effect from center.
void draw_multi_band_cascade(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.20f, 0.00f, 0.20f), CRGBF(0.39f, 0.00f, 0.39f), CRGBF(0.59f, 0.20f, 0.78f), CRGBF(0.78f, 0.39f, 1.00f), CRGBF(1.00f, 0.59f, 1.00f), CRGBF(1.00f, 0.78f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 9;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)]) + (
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                )), 1.0f);
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

// Pattern: Predictive Beat Flash
// Zero-latency beat flash using tempo confidence prediction. Instant white flash on beat detection with exponential decay.
void draw_predictive_beat_flash(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.39f, 0.00f, 0.39f), CRGBF(1.00f, 0.00f, 1.00f), CRGBF(1.00f, 0.39f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 6;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * 0.3f) + ((fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity) * fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity)) * fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity))), 1.0f);
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

// Pattern: Spectral Mirror
// Symmetrical spectrum display mirrored from center. Bass at center, treble radiates to edges with perfect bilateral symmetry.
void draw_spectral_mirror(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.39f, 0.00f, 0.00f), CRGBF(0.78f, 0.20f, 0.00f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.78f, 0.00f), CRGBF(0.78f, 1.00f, 0.39f), CRGBF(0.39f, 0.78f, 1.00f), CRGBF(0.20f, 0.39f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * AUDIO_SPECTRUM[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)]) + ((
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                ) * 0.5f)), 1.0f);
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

// Pattern: Transient Particles
// Onset detection triggers particle explosions from center. Fast attack, exponential decay based on audio envelope.
void draw_transient_particles(float time, const PatternParameters& params) {
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(1.00f, 0.39f, 0.00f), CRGBF(1.00f, 0.59f, 0.20f), CRGBF(1.00f, 0.78f, 0.39f), CRGBF(1.00f, 1.00f, 0.59f), CRGBF(1.00f, 1.00f, 0.78f), CRGBF(1.00f, 1.00f, 0.90f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmax(0.0f, fmin(1.0f, (fmin(1.0f, ((abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) * -1f) + 1f) * ((fmin(1.0f, AUDIO_TEMPO_CONFIDENCE * params.beat_sensitivity) * (
                    fmin(1.0f, fmax(0.0f, (
                        AUDIO_SPECTRUM[0] + AUDIO_SPECTRUM[1] + AUDIO_SPECTRUM[2] + AUDIO_SPECTRUM[3] +
                        AUDIO_SPECTRUM[4] + AUDIO_SPECTRUM[5] + AUDIO_SPECTRUM[6] + AUDIO_SPECTRUM[7] +
                        AUDIO_SPECTRUM[8] + AUDIO_SPECTRUM[9] + AUDIO_SPECTRUM[10] + AUDIO_SPECTRUM[11] +
                        AUDIO_SPECTRUM[12] + AUDIO_SPECTRUM[13] + AUDIO_SPECTRUM[14] + AUDIO_SPECTRUM[15] +
                        AUDIO_SPECTRUM[16] + AUDIO_SPECTRUM[17] + AUDIO_SPECTRUM[18] + AUDIO_SPECTRUM[19] +
                        AUDIO_SPECTRUM[20]
                    ) / 21.0f)) * params.spectrum_low
                )) * 2f)))), 1.0f);
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
    // Thread-safe audio snapshot acquisition
    PATTERN_AUDIO_START();

    // Early exit if audio data is stale (no new updates since last frame)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame to avoid redundant rendering
    }

    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(1.00f, 0.65f, 0.00f), CRGBF(0.94f, 0.50f, 0.00f), CRGBF(0.86f, 0.31f, 0.08f), CRGBF(0.71f, 0.24f, 0.47f), CRGBF(0.39f, 0.16f, 0.71f), CRGBF(0.12f, 0.08f, 0.55f), CRGBF(0.04f, 0.06f, 0.31f) };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(AUDIO_CHROMAGRAM[0], 1.0f);
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
    { "Beat-Locked Grid", "beat_locked_grid", "Tempo-synchronized grid pattern. Grid cells advance only on beat detection, eliminating floating sensation.", draw_beat_locked_grid, true },
    { "Breathing Ambient", "breathing_ambient", "Gentle expansion and contraction based on audio energy. Center-outward fill on beats, releases during silence.", draw_breathing_ambient, true },
    { "Departure", "departure", "Journey from darkness to light to growth. Dark earth → golden light → pure white → emerald green. Represents awakening and new beginnings.", draw_departure, false },
    { "Departure-Spectrum", "departure_spectrum", "Departure pattern flowing across the frequency spectrum in real-time", draw_departure_spectrum, true },
    { "Emotiscope FFT", "emotiscope_fft", "CENTER-ORIGIN beat-modulated spectrum. Position radiates from center, beat pulse gates frequency energy. Darker center expands outward as beat intensifies.", draw_emotiscope_fft, true },
    { "Emotiscope Octave", "emotiscope_octave", "CENTER-ORIGIN chromatic visualization. Pitch classes radiate from center. Position gradient shows distance from center, chromagram provides pitch energy data for audio reactivity.", draw_emotiscope_octave, true },
    { "Emotiscope Spectrum", "emotiscope_spectrum", "CENTER-ORIGIN audio visualization: position gradient shows audio level magnitude. Darker center &#x3D; quieter, brighter edges &#x3D; louder. Real-time frequency analysis.", draw_emotiscope_spectrum, true },
    { "Energy Adaptive Pulse", "energy_adaptive_pulse", "Pattern intensity dynamically scales with audio energy. Bright during intense sections, dims during quiet passages.", draw_energy_adaptive_pulse, true },
    { "Harmonic Resonance", "harmonic_resonance", "Chromagram-based harmonic visualization. Musical pitch classes radiate from center in concentric rings.", draw_harmonic_resonance, true },
    { "Lava", "lava", "Primal intensity and transformation. Black → deep red → bright orange → white hot. Represents passion, heat, and raw energy.", draw_lava, false },
    { "Lava Beat", "lava_beat", "Position gradient pulsing with music beat. Shows rhythm-reactive intensity using Lava palette.", draw_lava_beat, true },
    { "Multi-Band Cascade", "multi_band_cascade", "64-bin spectrum split into 8 octave bands. Each band controls LED section with waterfall effect from center.", draw_multi_band_cascade, true },
    { "Predictive Beat Flash", "predictive_beat_flash", "Zero-latency beat flash using tempo confidence prediction. Instant white flash on beat detection with exponential decay.", draw_predictive_beat_flash, true },
    { "Spectral Mirror", "spectral_mirror", "Symmetrical spectrum display mirrored from center. Bass at center, treble radiates to edges with perfect bilateral symmetry.", draw_spectral_mirror, true },
    { "Transient Particles", "transient_particles", "Onset detection triggers particle explosions from center. Fast attack, exponential decay based on audio envelope.", draw_transient_particles, true },
    { "Twilight", "twilight", "The peaceful transition from day to night. Warm amber → deep purple → midnight blue. Represents contemplation, transition, and quiet beauty.", draw_twilight, false },
    { "Twilight Chroma", "twilight_chroma", "Chromagram-based pitch visualization - LED groups respond to musical note energy (C through B). Repeats 12-note pattern across LED strip.", draw_twilight_chroma, true }
};

const uint8_t g_num_patterns = 24;
