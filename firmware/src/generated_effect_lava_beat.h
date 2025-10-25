
// AUTO-GENERATED CODE - DO NOT EDIT
// Generated at: 2025-10-25T05:59:58.669Z
// Graph: Lava Beat

#pragma once

extern CRGBF leds[NUM_LEDS];

void draw_generated_effect(float time) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.00f, 0.00f, 0.00f), CRGBF(0.07f, 0.00f, 0.00f), CRGBF(0.44f, 0.00f, 0.00f), CRGBF(0.56f, 0.01f, 0.00f), CRGBF(0.69f, 0.07f, 0.00f), CRGBF(0.84f, 0.17f, 0.01f), CRGBF(1.00f, 0.32f, 0.02f), CRGBF(1.00f, 0.45f, 0.02f), CRGBF(1.00f, 0.61f, 0.02f), CRGBF(1.00f, 0.80f, 0.02f), CRGBF(1.00f, 1.00f, 0.02f), CRGBF(1.00f, 1.00f, 0.28f), CRGBF(1.00f, 1.00f, 1.00f) };
    const int palette_size = 13;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(((float(i) / float(NUM_LEDS - 1)) * (tempi[0].beat * 0.5f + 0.5f)), 1.0f);
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
