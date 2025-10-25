
// AUTO-GENERATED CODE - DO NOT EDIT
// Generated at: 2025-10-25T06:00:00.091Z
// Graph: Twilight Chroma

#pragma once

extern CRGBF leds[NUM_LEDS];

void draw_generated_effect(float time) {
    
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
    }
}
