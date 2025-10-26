// Emotiscope Spectrum Visualization - Fixed Implementation
// Maps frequency spectrum (bass→treble) across LED strip with proper audio reactivity
#pragma once

#include "led_driver.h"
#include "audio_stubs.h"
#include "parameters.h"

// Forward declaration
extern CRGBF leds[NUM_LEDS];
extern float spectrogram[64];
extern float spectrogram_smooth[64];

// Helper function: interpolate value from array of floats
inline float interpolate_spectrum(float position, const float* array, int array_size) {
    // Position is 0.0 to 1.0 across array
    float index_f = position * (array_size - 1);
    int index = int(index_f);
    float frac = index_f - index;

    if (index >= array_size - 1) {
        return array[array_size - 1];
    }

    return array[index] * (1.0f - frac) + array[index + 1] * frac;
}

// Helper function: convert hue (0-1) to RGB
inline CRGBF hsv_to_rgb(float h, float s, float v) {
    float r, g, b;
    int i = int(h * 6);
    float f = h * 6 - i;
    float p = v * (1 - s);
    float q = v * (1 - f * s);
    float t = v * (1 - (1 - f) * s);

    switch(i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return CRGBF(r, g, b);
}

// Emotiscope Mode: Spectrum visualization with proper frequency mapping
void draw_emotiscope_proper(float time, const PatternParameters& params) {
    // Map frequency spectrum across LED strip
    // Left side = bass frequencies (blue/purple)
    // Right side = treble frequencies (orange/red)

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED position to spectrum bin (0.0 to 1.0 across strip)
        float strip_position = float(i) / float(NUM_LEDS - 1);

        // Get magnitude from spectrum (interpolated for smooth response)
        float magnitude = interpolate_spectrum(strip_position, spectrogram_smooth, 64);

        // Apply frequency response adjustment
        if (strip_position < 0.33f) {
            // Bass region
            magnitude *= params.spectrum_low;
        } else if (strip_position < 0.66f) {
            // Mid region
            magnitude *= params.spectrum_mid;
        } else {
            // Treble region
            magnitude *= params.spectrum_high;
        }

        // Clip to valid range and apply sqrt curve for better visual response
        magnitude = fmin(1.0f, fmax(0.0f, magnitude));
        magnitude = sqrtf(magnitude);

        // Color mapping: bass=blue → mid=green → treble=red
        float hue;
        if (strip_position < 0.5f) {
            // Bass to mid: blue → cyan → green
            hue = 0.66f - (strip_position * 0.33f);  // 0.66 (blue) to 0.33 (green)
        } else {
            // Mid to treble: green → yellow → red
            hue = 0.33f - ((strip_position - 0.5f) * 0.66f);  // 0.33 (green) to 0.0 (red)
            if (hue < 0) hue += 1.0f;  // Wrap to red
        }

        // Saturation based on magnitude (more vivid when louder)
        float saturation = 0.7f + (magnitude * 0.3f);

        // Convert HSV to RGB
        leds[i] = hsv_to_rgb(hue, saturation, magnitude);

        // Apply brightness parameter
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}

// Emotiscope Mode: Center-origin spectrum (butterfly effect)
void draw_emotiscope_center(float time, const PatternParameters& params) {
    // Map frequency spectrum from center outward
    // Center = bass frequencies
    // Edges = treble frequencies

    for (int i = 0; i < NUM_LEDS; i++) {
        // Distance from center (0.0 at center, 1.0 at edges)
        float center_distance = fabsf(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH;
        center_distance = fmin(1.0f, center_distance);

        // Map distance to spectrum bin
        float magnitude = interpolate_spectrum(center_distance, spectrogram_smooth, 64);

        // Apply frequency response
        if (center_distance < 0.33f) {
            magnitude *= params.spectrum_low;
        } else if (center_distance < 0.66f) {
            magnitude *= params.spectrum_mid;
        } else {
            magnitude *= params.spectrum_high;
        }

        // Apply curve and clamp
        magnitude = fmin(1.0f, fmax(0.0f, magnitude));
        magnitude = sqrtf(magnitude);

        // Color: center (bass) = deep blue, edges (treble) = hot orange
        float hue = 0.66f - (center_distance * 0.55f);  // Blue to orange
        float saturation = 0.8f + (magnitude * 0.2f);

        leds[i] = hsv_to_rgb(hue, saturation, magnitude);

        // Apply brightness
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}

// Emotiscope Mode: Beat-reactive spectrum with pulse
void draw_emotiscope_beat(float time, const PatternParameters& params) {
    // Get beat intensity from first tempo bin
    float beat_intensity = tempi[0].beat;
    beat_intensity = fmin(1.0f, beat_intensity * params.beat_sensitivity);

    for (int i = 0; i < NUM_LEDS; i++) {
        float strip_position = float(i) / float(NUM_LEDS - 1);

        // Get spectrum magnitude
        float magnitude = interpolate_spectrum(strip_position, spectrogram_smooth, 64);

        // Modulate with beat (gate effect)
        magnitude *= (0.5f + 0.5f * beat_intensity);

        // Apply frequency response
        if (strip_position < 0.33f) {
            magnitude *= params.spectrum_low;
        } else if (strip_position < 0.66f) {
            magnitude *= params.spectrum_mid;
        } else {
            magnitude *= params.spectrum_high;
        }

        magnitude = fmin(1.0f, fmax(0.0f, magnitude));
        magnitude = sqrtf(magnitude);

        // Color shifts with beat
        float hue_shift = beat_intensity * 0.1f;
        float base_hue = (strip_position * 0.8f) + hue_shift;
        if (base_hue > 1.0f) base_hue -= 1.0f;

        float saturation = 0.6f + (beat_intensity * 0.4f);

        leds[i] = hsv_to_rgb(base_hue, saturation, magnitude);

        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}