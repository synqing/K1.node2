// ============================================================================
// EMOTISCOPE HELPER FUNCTIONS - Implementation
// ============================================================================

#include "emotiscope_helpers.h"
#include "audio/goertzel.h"  // For clip_float() and NUM_LEDS

extern CRGBF leds[NUM_LEDS];

/**
 * Draw a colored dot at a specific position with opacity blending
 * 
 * This function implements the core Emotiscope dot rendering system:
 * 1. Maps position (0.0-1.0) to LED index with subpixel precision
 * 2. Applies Gaussian blur for smooth dot appearance
 * 3. Blends with existing LED colors using opacity
 * 
 * The dot_index parameter is kept for compatibility but not used in K1
 * since we render directly to the LED array.
 */
void draw_dot(CRGBF* leds, uint16_t dot_index, CRGBF color, float position, float opacity) {
    // Clamp inputs
    position = clip_float(position);
    opacity = clip_float(opacity);
    
    if (opacity < 0.01f) return; // Skip invisible dots
    
    // Map position to LED index with subpixel precision
    float led_position = position * (NUM_LEDS - 1);
    int center_led = (int)roundf(led_position);
    
    // Gaussian blur parameters for smooth dot appearance
    float dot_width = 2.5f; // Standard deviation in LEDs
    float max_distance = 3.0f * dot_width; // 3-sigma cutoff
    
    // Apply color and opacity to affected LEDs
    for (int i = 0; i < NUM_LEDS; i++) {
        float distance = fabsf(i - led_position);
        
        if (distance <= max_distance) {
            // Gaussian falloff
            float gaussian = expf(-(distance * distance) / (2.0f * dot_width * dot_width));
            float blend_factor = gaussian * opacity;
            
            // Alpha blend with existing LED color
            leds[i].r = leds[i].r * (1.0f - blend_factor) + color.r * blend_factor;
            leds[i].g = leds[i].g * (1.0f - blend_factor) + color.g * blend_factor;
            leds[i].b = leds[i].b * (1.0f - blend_factor) + color.b * blend_factor;
        }
    }
}

/**
 * Map a value (0.0-1.0) to a hue across the visible spectrum
 * 
 * This implements Emotiscope's color mapping:
 * 0.0 → Red (bass/low frequencies)
 * 0.5 → Green (mids)  
 * 1.0 → Blue (treble/high frequencies)
 */
float get_color_range_hue(float progress) {
    progress = clip_float(progress);
    
    // Map to hue spectrum: red → orange → yellow → green → cyan → blue
    // This creates the classic "heat map" visualization
    return progress * 0.66f; // 0.66 = 240°/360° (stops at blue, doesn't wrap to red)
}

/**
 * Enhanced HSV to RGB conversion
 * 
 * Optimized for LED strips with better color accuracy than basic hsv()
 */
CRGBF hsv_enhanced(float h, float s, float v) {
    // Normalize and clamp inputs
    h = fmodf(h, 1.0f);
    if (h < 0.0f) h += 1.0f;
    s = clip_float(s);
    v = clip_float(v);
    
    // Handle grayscale case
    if (s < 0.001f) {
        return CRGBF(v, v, v);
    }
    
    // Convert HSV to RGB using standard algorithm
    float h_sector = h * 6.0f;
    int sector = (int)h_sector;
    float f = h_sector - sector;
    
    float p = v * (1.0f - s);
    float q = v * (1.0f - s * f);
    float t = v * (1.0f - s * (1.0f - f));
    
    switch (sector % 6) {
        case 0: return CRGBF(v, t, p); // Red to Yellow
        case 1: return CRGBF(q, v, p); // Yellow to Green
        case 2: return CRGBF(p, v, t); // Green to Cyan
        case 3: return CRGBF(p, q, v); // Cyan to Blue
        case 4: return CRGBF(t, p, v); // Blue to Magenta
        case 5: return CRGBF(v, p, q); // Magenta to Red
        default: return CRGBF(0.0f, 0.0f, 0.0f);
    }
}