
// AUTO-GENERATED CODE - DO NOT EDIT
// Generated at: 2025-10-24T20:20:03.357Z
// Graph: Audio Test - Spectrum Bin

#pragma once

extern CRGBF leds[NUM_LEDS];

void draw_generated_effect(float time) {
    
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
    }
}
