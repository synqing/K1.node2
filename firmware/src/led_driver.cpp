// /firmware/src/led_driver.cpp
// LED Driver Implementation - RMT-based WS2812B LED strip control
// K1.reinvented Phase 2 Refactoring

#include "led_driver.h"
#include <Arduino.h>
#include <cstring>

// ============================================================================
// GLOBAL STATE DEFINITIONS
// ============================================================================

// Mutable brightness control (0.0 = off, 1.0 = full brightness)
float global_brightness = 0.3f;  // Start at 30% to avoid retina damage

// 8-bit color output buffer (540 bytes for 180 LEDs × 3 channels)
// Must be accessible from inline transmit_leds() function in header
uint8_t raw_led_data[NUM_LEDS * 3];

// RMT peripheral handles
rmt_channel_handle_t tx_chan = NULL;
rmt_encoder_handle_t led_encoder = NULL;

// RMT encoder instance
rmt_led_strip_encoder_t strip_encoder;

// RMT transmission configuration
rmt_transmit_config_t tx_config = {
	.loop_count = 0,  // no transfer loop
	.flags = { .eot_level = 0, .queue_nonblocking = 0 }
};

// Logging tag
static const char *TAG = "led_encoder";

// ============================================================================
// STATIC HELPER FUNCTIONS
// ============================================================================

static esp_err_t rmt_del_led_strip_encoder(rmt_encoder_t *encoder) {
	rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
	rmt_del_encoder(led_encoder->bytes_encoder);
	rmt_del_encoder(led_encoder->copy_encoder);
	free(led_encoder);
	return ESP_OK;
}

static esp_err_t rmt_led_strip_encoder_reset(rmt_encoder_t *encoder) {
	rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
	rmt_encoder_reset(led_encoder->bytes_encoder);
	rmt_encoder_reset(led_encoder->copy_encoder);
	led_encoder->state = RMT_ENCODING_RESET;
	return ESP_OK;
}

// ============================================================================
// RMT ENCODER CREATION
// ============================================================================

esp_err_t rmt_new_led_strip_encoder(const led_strip_encoder_config_t *config, rmt_encoder_handle_t *ret_encoder) {
	esp_err_t ret = ESP_OK;

	strip_encoder.base.encode = rmt_encode_led_strip;
	strip_encoder.base.del    = rmt_del_led_strip_encoder;
	strip_encoder.base.reset  = rmt_led_strip_encoder_reset;

	// Different led strip might have its own timing requirements, following parameter is for WS2812
	rmt_bytes_encoder_config_t bytes_encoder_config = {
		.bit0 = { 4, 1, 6, 0 },
		.bit1 = { 7, 1, 6, 0 },
		.flags = { .msb_first = 1 }
	};

	rmt_new_bytes_encoder(&bytes_encoder_config, &strip_encoder.bytes_encoder);
	rmt_copy_encoder_config_t copy_encoder_config = {};
	rmt_new_copy_encoder(&copy_encoder_config, &strip_encoder.copy_encoder);

	strip_encoder.reset_code = (rmt_symbol_word_t) { 250, 0, 250, 0 };

	*ret_encoder = &strip_encoder.base;
	return ESP_OK;
}

// ============================================================================
// RMT DRIVER INITIALIZATION
// ============================================================================

void init_rmt_driver() {
	printf("init_rmt_driver\n");
	rmt_tx_channel_config_t tx_chan_config = {
		.gpio_num = (gpio_num_t)LED_DATA_PIN,	// GPIO number
		.clk_src = RMT_CLK_SRC_DEFAULT,	 // select source clock
		.resolution_hz = 10000000,		 // 10 MHz tick resolution, i.e., 1 tick = 0.1 µs
		.mem_block_symbols = 64,		 // memory block size, 64 * 4 = 256 Bytes
		.trans_queue_depth = 4,			 // set the number of transactions that can be pending in the background
		.intr_priority = 99,
		.flags = { .with_dma = 0 },
	};

	printf("rmt_new_tx_channel\n");
	ESP_ERROR_CHECK(rmt_new_tx_channel(&tx_chan_config, &tx_chan));

	ESP_LOGI(TAG, "Install led strip encoder");
	led_strip_encoder_config_t encoder_config = {
		.resolution = 10000000,
	};
	printf("rmt_new_led_strip_encoder\n");
	ESP_ERROR_CHECK(rmt_new_led_strip_encoder(&encoder_config, &led_encoder));

	printf("rmt_enable\n");
	ESP_ERROR_CHECK(rmt_enable(tx_chan));
}

// Note: quantize_color() is defined inline in led_driver.h (required for compiler inlining)
