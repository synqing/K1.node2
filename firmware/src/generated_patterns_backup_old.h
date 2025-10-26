// AUTO-GENERATED MULTI-PATTERN CODE - DO NOT EDIT
// Generated at: 2025-10-26T00:00:00.000Z
// Patterns: Departure, Lava, Twilight (core patterns)
// Note: Audio-reactive patterns being rebuilt as part of visualization pipeline redesign

#pragma once

#include "pattern_registry.h"

extern CRGBF leds[NUM_LEDS];

// ============================================================================
// STATIC INTENTIONAL PATTERNS (Domain 1)
// ============================================================================

// Pattern: Departure - The palette of transformation
// Dark earth → golden light → pure white → emerald green
void draw_departure(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = {
        CRGBF(0.20f, 0.13f, 0.08f),  // Dark earth
        CRGBF(0.95f, 0.65f, 0.15f),  // Golden light
        CRGBF(1.00f, 1.00f, 0.95f),  // Pure white
        CRGBF(0.15f, 0.55f, 0.25f)   // Emerald green
    };
    const int palette_size = 4;

    // Time-driven progression through palette
    float position = fmod(time * params.speed * 0.5f, 1.0f);
    int palette_index = int(position * (palette_size - 1));
    float interpolation_factor = (position * (palette_size - 1)) - palette_index;

    // Blend between current and next color
    if (palette_index >= palette_size - 1) {
        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = palette_colors[palette_size - 1];
        }
    } else {
        const CRGBF& color1 = palette_colors[palette_index];
        const CRGBF& color2 = palette_colors[palette_index + 1];

        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }
    }

    // Apply brightness and softness
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].r *= params.brightness * (1.0f - params.softness * 0.5f);
        leds[i].g *= params.brightness * (1.0f - params.softness * 0.5f);
        leds[i].b *= params.brightness * (1.0f - params.softness * 0.5f);
    }
}

// Pattern: Lava - Intensity without apology
// Black → deep red → blazing orange → white hot
void draw_lava(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = {
        CRGBF(0.00f, 0.00f, 0.00f),  // Black
        CRGBF(0.80f, 0.00f, 0.00f),  // Deep red
        CRGBF(1.00f, 0.40f, 0.00f),  // Blazing orange
        CRGBF(1.00f, 1.00f, 0.90f)   // White hot
    };
    const int palette_size = 4;

    // Time-driven intensity progression
    float position = fmod(time * params.speed * 0.6f, 1.0f);
    int palette_index = int(position * (palette_size - 1));
    float interpolation_factor = (position * (palette_size - 1)) - palette_index;

    // Blend between colors
    if (palette_index >= palette_size - 1) {
        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = palette_colors[palette_size - 1];
        }
    } else {
        const CRGBF& color1 = palette_colors[palette_index];
        const CRGBF& color2 = palette_colors[palette_index + 1];

        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }
    }

    // Apply brightness
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}

// Pattern: Twilight - The space between day and night
// Warm amber → deep purple → midnight blue
void draw_twilight(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = {
        CRGBF(1.00f, 0.75f, 0.35f),  // Warm amber
        CRGBF(0.60f, 0.30f, 0.70f),  // Deep purple
        CRGBF(0.15f, 0.25f, 0.55f)   // Midnight blue
    };
    const int palette_size = 3;

    // Time-driven contemplative progression
    float position = fmod(time * params.speed * 0.4f, 1.0f);
    int palette_index = int(position * (palette_size - 1));
    float interpolation_factor = (position * (palette_size - 1)) - palette_index;

    // Blend between colors
    if (palette_index >= palette_size - 1) {
        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = palette_colors[palette_size - 1];
        }
    } else {
        const CRGBF& color1 = palette_colors[palette_index];
        const CRGBF& color2 = palette_colors[palette_index + 1];

        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }
    }

    // Apply brightness and warmth (amber incandescent filter)
    for (int i = 0; i < NUM_LEDS; i++) {
        // Warmth parameter adds amber tint: increase red, keep green/blue
        float warmth_factor = 1.0f + (params.warmth * 0.3f);
        leds[i].r *= params.brightness * warmth_factor;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness * (1.0f - params.warmth * 0.2f);
    }
}

// ============================================================================
// AUDIO-REACTIVE PATTERNS PLACEHOLDER (Domain 2)
// Being rebuilt as part of visualization pipeline redesign
// ============================================================================

void draw_spectrum(float time, const PatternParameters& params) {
    // Placeholder: solid color using background parameter
    CRGBF bg_color = CRGBF(params.background, params.background * 0.5f, params.background * 0.3f);
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = bg_color;
    }
}

void draw_octave(float time, const PatternParameters& params) {
    // Placeholder: solid color using color parameter
    CRGBF fg_color = CRGBF(params.color, params.saturation * params.color, params.saturation * params.color * 0.5f);
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = fg_color;
    }
}

void draw_fft(float time, const PatternParameters& params) {
    // Placeholder: solid color gradient
    CRGBF mix_color = CRGBF(params.color_range, params.saturation, params.background);
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = mix_color;
    }
}

// ============================================================================
// PATTERN REGISTRY (for runtime pattern switching)
// ============================================================================

const PatternInfo g_pattern_registry[] = {
    // Domain 1: Static Intentional Patterns
    {
        "Departure",
        "departure",
        "The palette of transformation: dark earth → golden light → white → emerald",
        draw_departure,
        false  // Not audio-reactive
    },
    {
        "Lava",
        "lava",
        "Intensity without apology: black → deep red → orange → white hot",
        draw_lava,
        false  // Not audio-reactive
    },
    {
        "Twilight",
        "twilight",
        "The space between: warm amber → purple → midnight blue",
        draw_twilight,
        false  // Not audio-reactive
    },
    // Domain 2: Audio-Reactive Patterns (Placeholders during rebuild)
    {
        "Spectrum",
        "spectrum",
        "Frequency visualization (placeholder, under rebuild)",
        draw_spectrum,
        true  // Audio-reactive
    },
    {
        "Octave",
        "octave",
        "Octave band response (placeholder, under rebuild)",
        draw_octave,
        true  // Audio-reactive
    },
    {
        "FFT",
        "fft",
        "Full FFT display (placeholder, under rebuild)",
        draw_fft,
        true  // Audio-reactive
    }
};

const uint8_t g_num_patterns = sizeof(g_pattern_registry) / sizeof(g_pattern_registry[0]);
