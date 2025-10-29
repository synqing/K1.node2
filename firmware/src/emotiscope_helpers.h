// ============================================================================
// EMOTISCOPE HELPER FUNCTIONS - Ported from original Emotiscope
// ============================================================================
// These functions enable proper Analog, Metronome, and Hype pattern rendering
// by providing the missing draw_dot() and color mapping functionality
// ============================================================================

#pragma once

#include "types.h"
#include <math.h>
#include "audio/goertzel.h"  // For clip_float()
#include "led_driver.h"      // For NUM_LEDS (must be after types.h)

// Constants from original Emotiscope
#define NUM_RESERVED_DOTS 8

/**
 * Draw a colored dot at a specific position with opacity blending
 * This is the core function missing from K1 that breaks Analog/Metronome/Hype
 * 
 * @param leds - LED array to draw into
 * @param dot_index - Dot slot index (0-7 for reserved dots)
 * @param color - Color of the dot
 * @param position - Position along strip (0.0 = left, 1.0 = right)
 * @param opacity - Brightness/opacity (0.0 = invisible, 1.0 = full)
 */
void draw_dot(CRGBF* leds, uint16_t dot_index, CRGBF color, float position, float opacity);

/**
 * Map a value (0.0-1.0) to a hue across the visible spectrum
 * This replaces Emotiscope's get_color_range_hue() function
 * 
 * @param progress - Input value (0.0-1.0)
 * @return Hue value (0.0-1.0) for HSV color space
 */
float get_color_range_hue(float progress);

/**
 * HSV to RGB conversion optimized for LED strips
 * Enhanced version of the basic hsv() function in generated_patterns.h
 * 
 * @param h - Hue (0.0-1.0)
 * @param s - Saturation (0.0-1.0) 
 * @param v - Value/brightness (0.0-1.0)
 * @return CRGBF color
 */
CRGBF hsv_enhanced(float h, float s, float v);

/**
 * Clamp float value to 0.0-1.0 range
 * Note: Also defined in goertzel.h
 * Using #ifndef to avoid duplicate definition errors
 */
#ifndef CLIP_FLOAT_DEFINED
#define CLIP_FLOAT_DEFINED
inline float clip_float(float value) {
    return fmaxf(0.0f, fminf(1.0f, value));
}
#endif