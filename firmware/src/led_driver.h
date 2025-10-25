#include <driver/rmt_tx.h>
#include <driver/rmt_encoder.h>
#include <esp_check.h>
#include <esp_log.h>

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
static float global_brightness = 0.3f;  // Start at 30% to avoid retina damage

// 8-bit color output
static uint8_t raw_led_data[NUM_LEDS*3];

rmt_channel_handle_t tx_chan = NULL;
rmt_encoder_handle_t led_encoder = NULL;

typedef struct {
    rmt_encoder_t base;
    rmt_encoder_t *bytes_encoder;
    rmt_encoder_t *copy_encoder;
    int state;
    rmt_symbol_word_t reset_code;
} rmt_led_strip_encoder_t;

rmt_led_strip_encoder_t strip_encoder;

rmt_transmit_config_t tx_config = {
	.loop_count = 0,  // no transfer loop
	.flags = { .eot_level = 0, .queue_nonblocking = 0 }
};

typedef struct {
    uint32_t resolution; /*!< Encoder resolution, in Hz */
} led_strip_encoder_config_t;

static const char *TAG = "led_encoder";

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

static esp_err_t rmt_del_led_strip_encoder(rmt_encoder_t *encoder){
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_del_encoder(led_encoder->bytes_encoder);
    rmt_del_encoder(led_encoder->copy_encoder);
    free(led_encoder);
    return ESP_OK;
}

static esp_err_t rmt_led_strip_encoder_reset(rmt_encoder_t *encoder){
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_encoder_reset(led_encoder->bytes_encoder);
    rmt_encoder_reset(led_encoder->copy_encoder);
    led_encoder->state = RMT_ENCODING_RESET;
    return ESP_OK;
}

esp_err_t rmt_new_led_strip_encoder(const led_strip_encoder_config_t *config, rmt_encoder_handle_t *ret_encoder){
    esp_err_t ret = ESP_OK;

	strip_encoder.base.encode = rmt_encode_led_strip;
    strip_encoder.base.del    = rmt_del_led_strip_encoder;
    strip_encoder.base.reset  = rmt_led_strip_encoder_reset;

    // different led strip might have its own timing requirements, following parameter is for WS2812
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

void quantize_color(bool temporal_dithering) {
	if(temporal_dithering == true){
		const float dither_table[4] = {0.25, 0.50, 0.75, 1.00};
		static uint8_t dither_step = 0;
		dither_step++;

		float decimal_r; float decimal_g; float decimal_b;
		uint8_t whole_r; uint8_t whole_g; uint8_t whole_b;
		float   fract_r; float   fract_g; float   fract_b;

		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			// RED #####################################################
			decimal_r = leds[i].r * global_brightness * 254;
			whole_r = decimal_r;
			fract_r = decimal_r - whole_r;
			raw_led_data[3*i+1] = whole_r + (fract_r >= dither_table[(dither_step) % 4]);
			
			// GREEN #####################################################
			decimal_g = leds[i].g * global_brightness * 254;
			whole_g = decimal_g;
			fract_g = decimal_g - whole_g;
			raw_led_data[3*i+0] = whole_g + (fract_g >= dither_table[(dither_step) % 4]);

			// BLUE #####################################################
			decimal_b = leds[i].b * global_brightness * 254;
			whole_b = decimal_b;
			fract_b = decimal_b - whole_b;
			raw_led_data[3*i+2] = whole_b + (fract_b >= dither_table[(dither_step) % 4]);
		}
	}
	else{
		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			raw_led_data[3*i+1] = (uint8_t)(leds[i].r * global_brightness * 255);
			raw_led_data[3*i+0] = (uint8_t)(leds[i].g * global_brightness * 255);
			raw_led_data[3*i+2] = (uint8_t)(leds[i].b * global_brightness * 255);
		}
	}
}

IRAM_ATTR void transmit_leds() {
	// Wait here if previous frame transmission has not yet completed
	rmt_tx_wait_all_done(tx_chan, portMAX_DELAY);

	// Clear the 8-bit buffer
	memset(raw_led_data, 0, NUM_LEDS*3);

	// Quantize the floating point color to 8-bit with dithering
	//
	// This allows the 8-bit LEDs to emulate the look of a higher bit-depth using persistence of vision tricks
	// The contents of the floating point CRGBF "leds" array are downsampled into alternating ways hundreds of
	// times per second to increase the effective bit depth
	quantize_color(true);

	// Transmit to LEDs
	rmt_transmit(tx_chan, led_encoder, raw_led_data, NUM_LEDS*3, &tx_config);
}