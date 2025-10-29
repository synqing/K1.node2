// Runtime pattern parameters with thread-safe double buffering
// Prevents race conditions between web handler (Core 0) and LED loop (Core 1)

#pragma once
#include <Arduino.h>
#include <atomic>

// Runtime parameters for pattern control
// Derived from Emotiscope's proven control set, adapted for K1's centre-origin architecture
// All patterns receive this struct and extract relevant fields
struct PatternParameters {
    // Global visual controls (affect all patterns)
    float brightness;          // 0.0 - 1.0 (global brightness)
    float softness;            // 0.0 - 1.0 (frame blending/decay strength)
    float color;               // 0.0 - 1.0 (hue for palette selection)
    float color_range;         // 0.0 - 1.0 (palette spread/saturation)
    float saturation;          // 0.0 - 1.0 (color intensity)
    float warmth;              // 0.0 - 1.0 (incandescent filter amount)
    float background;          // 0.0 - 1.0 (ambient background level)
    float dithering;           // 0.0 - 1.0 (temporal dithering enable: 0=off, 1=on)

    // Pattern-specific controls
    float speed;               // 0.0 - 1.0 (animation speed multiplier)
    uint8_t palette_id;        // 0-N (discrete palette selection, if used)

    // Pattern-extension parameters (for future use)
    float custom_param_1;      // 0.0 - 1.0 (pattern-specific control)
    float custom_param_2;      // 0.0 - 1.0 (pattern-specific control)
    float custom_param_3;      // 0.0 - 1.0 (pattern-specific control)
};

// Default parameter values (from Emotiscope reference)
inline PatternParameters get_default_params() {
    PatternParameters params;
    // Global visual controls
    params.brightness = 1.0f;      // Emotiscope: DEFAULT_BRIGHTNESS = 1.0
    params.softness = 0.25f;       // Emotiscope: softness default = 0.25
    params.color = 0.33f;          // Emotiscope: color default = 0.33
    params.color_range = 0.0f;     // Emotiscope: color_range default = 0.0
    params.saturation = 0.75f;     // Emotiscope: saturation default = 0.75
    params.warmth = 0.0f;          // Emotiscope: warmth default = 0.0
    params.background = 0.25f;     // Emotiscope: DEFAULT_BACKGROUND = 0.25 (production mode)
    params.dithering = 1.0f;       // Temporal dithering enabled by default
    // Pattern-specific
    params.speed = 0.5f;           // Emotiscope: speed default = 0.5
    params.palette_id = 0;         // Will be set per-pattern
    // Extensions (available for pattern-specific use)
    params.custom_param_1 = 0.5f;
    params.custom_param_2 = 0.5f;
    params.custom_param_3 = 0.5f;
    return params;
}

// Double-buffered parameter storage (prevents torn reads)
// Web handler writes to inactive buffer, then atomically swaps
// LED loop always reads from active buffer
static PatternParameters g_params_buffers[2];
static std::atomic<uint8_t> g_active_buffer{0};

// Thread-safe parameter update (call from web handler on Core 0)
// Uses release-acquire memory ordering for cache coherency
inline void update_params(const PatternParameters& new_params) {
    uint8_t inactive = 1 - g_active_buffer.load(std::memory_order_acquire);
    g_params_buffers[inactive] = new_params;  // Write to inactive buffer
    g_active_buffer.store(inactive, std::memory_order_release);  // Atomic swap
}

// Thread-safe parameter read (call from LED loop on Core 1)
inline const PatternParameters& get_params() {
    uint8_t active = g_active_buffer.load(std::memory_order_acquire);
    return g_params_buffers[active];
}

// Initialize parameter system (call once in setup())
inline void init_params() {
    PatternParameters defaults = get_default_params();
    g_params_buffers[0] = defaults;
    g_params_buffers[1] = defaults;
    g_active_buffer.store(0, std::memory_order_release);
}

// Validate and update parameters (defined in parameters.cpp)
bool update_params_safe(const PatternParameters& new_params);
