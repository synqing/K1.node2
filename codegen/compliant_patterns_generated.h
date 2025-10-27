
// AUTO-GENERATED MULTI-PATTERN CODE - DO NOT EDIT
// Generated at: 2025-10-27T04:13:55.516Z
// Patterns: Departure, Lava, Twilight

#pragma once

#include "pattern_registry.h"
#include "pattern_audio_interface.h"

extern CRGBF leds[NUM_LEDS];

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


// Pattern registry array
const PatternInfo g_pattern_registry[] = {
    { "Departure", "departure", "Journey from darkness to light to growth. Dark earth → golden light → pure white → emerald green. Represents awakening and new beginnings.", draw_departure, false },
    { "Lava", "lava", "Primal intensity and transformation. Black → deep red → bright orange → white hot. Represents passion, heat, and raw energy.", draw_lava, false },
    { "Twilight", "twilight", "The peaceful transition from day to night. Warm amber → deep purple → midnight blue. Represents contemplation, transition, and quiet beauty.", draw_twilight, false }
};

const uint8_t g_num_patterns = 3;
