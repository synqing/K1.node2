// Runtime pattern parameters with thread-safe double buffering
// Prevents race conditions between web handler (Core 0) and LED loop (Core 1)

#pragma once
#include <Arduino.h>
#include <atomic>

// Runtime parameters for pattern control (11 fields)
// All patterns receive this struct and extract relevant fields
struct PatternParameters {
    float speed;               // 0.1 - 10.0 (animation speed multiplier)
    float brightness;          // 0.0 - 1.0 (global brightness)
    uint8_t palette_id;        // 0-7 (discrete palette selection)
    float palette_shift;       // 0.0 - 1.0 (palette rotation)
    float beat_sensitivity;    // 0.0 - 2.0 (audio beat response)
    float spectrum_low;        // 0.0 - 1.0 (bass response, bins 0-8)
    float spectrum_mid;        // 0.0 - 1.0 (mid response, bins 16-32)
    float spectrum_high;       // 0.0 - 1.0 (treble response, bins 48-63)
    float custom_param_1;      // 0.0 - 1.0 (pattern-specific)
    float custom_param_2;      // 0.0 - 1.0 (pattern-specific)
    float custom_param_3;      // 0.0 - 1.0 (pattern-specific)
};

// Default parameter values
inline PatternParameters get_default_params() {
    PatternParameters params;
    params.speed = 1.0f;
    params.brightness = 0.3f;
    params.palette_id = 0;
    params.palette_shift = 0.0f;
    params.beat_sensitivity = 1.0f;
    params.spectrum_low = 0.5f;
    params.spectrum_mid = 0.5f;
    params.spectrum_high = 0.5f;
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
