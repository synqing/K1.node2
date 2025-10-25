// Parameter validation and bounds checking
// Prevents crashes from NaN/Inf/overflow in web API inputs

#include "parameters.h"

// Number of available palettes (must match pattern_registry palettes)
#define NUM_PALETTES 8

// Validate and clamp parameters to safe ranges
// Returns true if any parameter was clamped (indicates invalid input)
bool validate_and_clamp(PatternParameters& params) {
    bool clamped = false;

    // Speed: 0.1 - 10.0 (reject NaN/Inf)
    if (isnan(params.speed) || isinf(params.speed) ||
        params.speed < 0.1f || params.speed > 10.0f) {
        params.speed = constrain(params.speed, 0.1f, 10.0f);
        if (isnan(params.speed) || isinf(params.speed)) {
            params.speed = 1.0f;  // Reset to default if still invalid
        }
        clamped = true;
    }

    // Brightness: 0.0 - 1.0 (reject NaN/Inf)
    if (isnan(params.brightness) || isinf(params.brightness) ||
        params.brightness < 0.0f || params.brightness > 1.0f) {
        params.brightness = constrain(params.brightness, 0.0f, 1.0f);
        if (isnan(params.brightness) || isinf(params.brightness)) {
            params.brightness = 0.3f;  // Reset to default
        }
        clamped = true;
    }

    // Palette ID: 0-7 discrete (prevent buffer overflow)
    if (params.palette_id >= NUM_PALETTES) {
        params.palette_id = 0;
        clamped = true;
    }

    // Palette shift: 0.0 - 1.0 (reject NaN/Inf)
    if (isnan(params.palette_shift) || isinf(params.palette_shift) ||
        params.palette_shift < 0.0f || params.palette_shift > 1.0f) {
        params.palette_shift = constrain(params.palette_shift, 0.0f, 1.0f);
        if (isnan(params.palette_shift) || isinf(params.palette_shift)) {
            params.palette_shift = 0.0f;
        }
        clamped = true;
    }

    // Beat sensitivity: 0.0 - 2.0 (reject NaN/Inf)
    if (isnan(params.beat_sensitivity) || isinf(params.beat_sensitivity) ||
        params.beat_sensitivity < 0.0f || params.beat_sensitivity > 2.0f) {
        params.beat_sensitivity = constrain(params.beat_sensitivity, 0.0f, 2.0f);
        if (isnan(params.beat_sensitivity) || isinf(params.beat_sensitivity)) {
            params.beat_sensitivity = 1.0f;
        }
        clamped = true;
    }

    // Spectrum low/mid/high: 0.0 - 1.0 (reject NaN/Inf)
    auto validate_spectrum = [&](float& value, float default_val) {
        if (isnan(value) || isinf(value) || value < 0.0f || value > 1.0f) {
            value = constrain(value, 0.0f, 1.0f);
            if (isnan(value) || isinf(value)) {
                value = default_val;
            }
            clamped = true;
        }
    };

    validate_spectrum(params.spectrum_low, 0.5f);
    validate_spectrum(params.spectrum_mid, 0.5f);
    validate_spectrum(params.spectrum_high, 0.5f);

    // Custom params: 0.0 - 1.0 (reject NaN/Inf)
    validate_spectrum(params.custom_param_1, 0.5f);
    validate_spectrum(params.custom_param_2, 0.5f);
    validate_spectrum(params.custom_param_3, 0.5f);

    return clamped;
}

// Safe parameter update with validation
// Returns true on success, false if validation failed
bool update_params_safe(const PatternParameters& new_params) {
    PatternParameters validated = new_params;
    bool clamped = validate_and_clamp(validated);

    update_params(validated);  // Always update (with clamped values if needed)

    return !clamped;  // Return false if we had to clamp anything
}
