#pragma once

#include <Arduino.h>
#include <driver/rmt_tx.h>
#include <driver/rmt_encoder.h>
#include <esp_check.h>
#include <esp_log.h>
#include "types.h"
#include "profiler.h"
#include "parameters.h"  // Access get_params() for dithering flag
#include "logging/logger.h"

#define LED_DATA_PIN ( 5 )

// It won't void any kind of stupid warranty, but things will *definitely* break at this point if you change this number.
#define NUM_LEDS ( 180 )

// CENTER-ORIGIN ARCHITECTURE (Mandatory for all patterns)
// All effects MUST radiate from center point, never edge-to-edge
// NO rainbows, NO linear gradients - only radial/symmetric effects
#define STRIP_CENTER_POINT ( 89 )   // Physical LED at center (180/2 - 1)
#define STRIP_HALF_LENGTH ( 90 )    // Distance from center to each edge
#define STRIP_LENGTH ( 180 )        // Total span (must equal NUM_LEDS)

// 32-bit color input
extern CRGBF leds[NUM_LEDS];

// Global brightness control (0.0 = off, 1.0 = full brightness)
// Implementation in led_driver.cpp
extern float global_brightness;

// RMT peripheral handles
extern rmt_channel_handle_t tx_chan;
extern rmt_encoder_handle_t led_encoder;

typedef struct {
    rmt_encoder_t base;
    rmt_encoder_t *bytes_encoder;
    rmt_encoder_t *copy_encoder;
    int state;
    rmt_symbol_word_t reset_code;
} rmt_led_strip_encoder_t;

typedef struct {
    uint32_t resolution; /*!< Encoder resolution, in Hz */
} led_strip_encoder_config_t;

// Global RMT encoder instance and transmission config
// Implementation in led_driver.cpp
extern rmt_led_strip_encoder_t strip_encoder;
extern rmt_transmit_config_t tx_config;

// 8-bit color output buffer (accessible from inline transmit_leds)
// Implementation in led_driver.cpp
extern uint8_t raw_led_data[NUM_LEDS * 3];

IRAM_ATTR static size_t rmt_encode_led_strip(rmt_encoder_t *encoder, rmt_channel_handle_t channel, const void *primary_data, size_t data_size, rmt_encode_state_t *ret_state){
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_encoder_handle_t bytes_encoder = led_encoder->bytes_encoder;
    rmt_encoder_handle_t copy_encoder = led_encoder->copy_encoder;
    rmt_encode_state_t session_state = RMT_ENCODING_RESET;
    rmt_encode_state_t state = RMT_ENCODING_RESET;
    size_t encoded_symbols = 0;
    switch (led_encoder->state) {
    case 0: // send RGB data
        encoded_symbols += bytes_encoder->encode(bytes_encoder, channel, primary_data, data_size, &session_state);
        if (session_state & RMT_ENCODING_COMPLETE) {
            led_encoder->state = 1; // switch to next state when current encoding session finished
        }
        if (session_state & RMT_ENCODING_MEM_FULL) {
            state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_MEM_FULL);
            goto out; // yield if there's no free space for encoding artifacts
        }
    // fall-through
    case 1: // send reset code
        encoded_symbols += copy_encoder->encode(copy_encoder, channel, &led_encoder->reset_code,
                                                sizeof(led_encoder->reset_code), &session_state);
        if (session_state & RMT_ENCODING_COMPLETE) {
            led_encoder->state = RMT_ENCODING_RESET; // back to the initial encoding session
			state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_COMPLETE);
        }
        if (session_state & RMT_ENCODING_MEM_FULL) {
			state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_MEM_FULL);
            goto out; // yield if there's no free space for encoding artifacts
        }
    }
out:
    *ret_state = state;
    return encoded_symbols;
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

// Initialize RMT peripheral for LED transmission
// Implementation in led_driver.cpp
void init_rmt_driver();

// Quantize floating-point colors to 8-bit with optional dithering
// INLINE FUNCTION: definition must be in header for compiler inlining
inline void quantize_color(bool temporal_dithering) {
	uint32_t t0 = micros();
	if (temporal_dithering == true) {
		const float dither_table[4] = {0.25, 0.50, 0.75, 1.00};
		static uint8_t dither_step = 0;
		dither_step++;

		float decimal_r; float decimal_g; float decimal_b;
		uint8_t whole_r; uint8_t whole_g; uint8_t whole_b;
		float   fract_r; float   fract_g; float   fract_b;

		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			// RED channel
			decimal_r = leds[i].r * global_brightness * 254;
			whole_r = decimal_r;
			fract_r = decimal_r - whole_r;
			raw_led_data[3*i+1] = whole_r + (fract_r >= dither_table[(dither_step) % 4]);

			// GREEN channel
			decimal_g = leds[i].g * global_brightness * 254;
			whole_g = decimal_g;
			fract_g = decimal_g - whole_g;
			raw_led_data[3*i+0] = whole_g + (fract_g >= dither_table[(dither_step) % 4]);

			// BLUE channel
			decimal_b = leds[i].b * global_brightness * 254;
			whole_b = decimal_b;
			fract_b = decimal_b - whole_b;
			raw_led_data[3*i+2] = whole_b + (fract_b >= dither_table[(dither_step) % 4]);
		}
	}
	else {
		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			raw_led_data[3*i+1] = (uint8_t)(leds[i].r * global_brightness * 255);
			raw_led_data[3*i+0] = (uint8_t)(leds[i].g * global_brightness * 255);
			raw_led_data[3*i+2] = (uint8_t)(leds[i].b * global_brightness * 255);
		}
	}
	ACCUM_QUANTIZE_US += (micros() - t0);
}

// IRAM_ATTR function must be in header for memory placement
// Made static to ensure internal linkage (each TU gets its own copy)
IRAM_ATTR static inline void transmit_leds() {
	// Wait here if previous frame transmission has not yet completed
	// Use 10ms timeout for RMT completion
	// If TX takes longer than 10ms, something is wrong (normal is <1ms)
	uint32_t t_wait0 = micros();
	esp_err_t wait_result = rmt_tx_wait_all_done(tx_chan, pdMS_TO_TICKS(10));
	ACCUM_RMT_WAIT_US += (micros() - t_wait0);
	if (wait_result != ESP_OK) {
		// RMT transmission timeout - not critical, just continue
		LOG_WARN(TAG_LED, "RMT transmission timeout");
	}

	// Clear the 8-bit buffer
	memset(raw_led_data, 0, NUM_LEDS*3);

	// Quantize the floating point color to 8-bit with dithering
	//
	// This allows the 8-bit LEDs to emulate the look of a higher bit-depth using persistence of vision tricks
	// The contents of the floating point CRGBF "leds" array are downsampled into alternating ways hundreds of
	// times per second to increase the effective bit depth
	bool temporal_dithering = (get_params().dithering >= 0.5f);
	quantize_color(temporal_dithering);

	// Transmit to LEDs
	uint32_t t_tx0 = micros();
	rmt_transmit(tx_chan, led_encoder, raw_led_data, NUM_LEDS*3, &tx_config);
	ACCUM_RMT_TRANSMIT_US += (micros() - t_tx0);
}