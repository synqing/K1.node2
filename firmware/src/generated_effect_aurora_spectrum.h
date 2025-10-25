
// AUTO-GENERATED CODE - DO NOT EDIT
// Generated at: 2025-10-25T06:00:19.139Z
// Graph: Aurora Spectrum

#pragma once

extern CRGBF leds[NUM_LEDS];

void draw_generated_effect(float time) {
    
    // default palette - position to color interpolation
    const CRGBF palette_colors[] = { CRGBF(0.03f, 0.01f, 0.00f), CRGBF(0.09f, 0.03f, 0.00f), CRGBF(0.29f, 0.15f, 0.02f), CRGBF(0.66f, 0.39f, 0.15f), CRGBF(0.84f, 0.66f, 0.47f), CRGBF(1.00f, 1.00f, 1.00f), CRGBF(0.53f, 1.00f, 0.54f), CRGBF(0.09f, 1.00f, 0.09f), CRGBF(0.00f, 1.00f, 0.00f), CRGBF(0.00f, 0.53f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f), CRGBF(0.00f, 0.22f, 0.00f) };
    const int palette_size = 12;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f, fmin(1.0f, (float(i) / float(NUM_LEDS - 1)) + (sinf(time * 6.28318f) * 0.5f + 0.5f)) + (((spectrogram[0] + spectrogram[1] + spectrogram[2] + spectrogram[3] + spectrogram[4] + spectrogram[5] + spectrogram[6] + spectrogram[7] + spectrogram[8]) / 9.0f) * 0.5f)), 1.0f);
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
