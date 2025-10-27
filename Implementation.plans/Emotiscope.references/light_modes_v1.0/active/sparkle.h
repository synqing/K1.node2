/*
-------------------------------------------------------------
   ____                  _      _  _
  / ___| _ __   __ _   | | __ | || |  ___
  \___ \| '_ \ / _` |  | |/ / | || | / _ \
   ___) | |_) | (_| |  |   <  |__   |  __/
  |____/| .__/ \__,_|  |_|\_\    |_| \___|
        |_|

High-frequency reactive sparkles - particles spawn on transients
-------------------------------------------------------------
*/

#define MAX_SPARKLES 32
#define SPARKLE_DECAY 0.85
#define SPARKLE_THRESHOLD 0.3

typedef struct {
	uint16_t position;   // LED index
	float brightness;    // Current brightness
	bool active;         // Is this sparkle active?
} sparkle;

sparkle sparkles[MAX_SPARKLES];

void draw_sparkle() {
	profile_function([&]() {
		// Clear LED buffer
		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			leds[i] = BLACK;
		}

		// Decay existing sparkles
		for (uint16_t i = 0; i < MAX_SPARKLES; i++) {
			if (sparkles[i].active) {
				sparkles[i].brightness *= SPARKLE_DECAY;
				if (sparkles[i].brightness < 0.01) {
					sparkles[i].active = false;
				}
			}
		}

		// Spawn new sparkles on high-frequency novelty
		// Use frequency bins 48-63 (high frequencies) for sparkle triggers
		for (uint16_t freq_bin = 48; freq_bin < 64; freq_bin++) {
			if (spectrogram[freq_bin] > SPARKLE_THRESHOLD) {
				// Find an inactive sparkle slot
				for (uint16_t i = 0; i < MAX_SPARKLES; i++) {
					if (!sparkles[i].active) {
						// Map frequency bin to LED position with jitter
						float norm_freq = float(freq_bin) / 64.0;
						uint16_t base_pos = ((uint16_t)(norm_freq * NUM_LEDS)) >> 1; // Use only first half
						base_pos = clip_int(base_pos, 0, (NUM_LEDS >> 1) - 1);

						sparkles[i].position = base_pos;
						sparkles[i].brightness = clip_float(spectrogram[freq_bin]);
						sparkles[i].active = true;
						break;
					}
				}
			}
		}

		// Render all active sparkles
		for (uint16_t i = 0; i < MAX_SPARKLES; i++) {
			if (sparkles[i].active) {
				uint16_t pos = sparkles[i].position;

				// Get color from palette
				float hue = float(pos) / (NUM_LEDS >> 1);
				CRGBF color = color_from_palette(
					configuration.current_palette,
					hue,
					sparkles[i].brightness
				);

				// Add sparkle with additive blending
				leds[pos].r = clip_float(leds[pos].r + color.r * sparkles[i].brightness);
				leds[pos].g = clip_float(leds[pos].g + color.g * sparkles[i].brightness);
				leds[pos].b = clip_float(leds[pos].b + color.b * sparkles[i].brightness);

				// Optional: bloom effect - add glow to neighbors
				if (pos > 0) {
					float neighbor_brightness = sparkles[i].brightness * 0.3;
					leds[pos - 1].r = clip_float(leds[pos - 1].r + color.r * neighbor_brightness);
					leds[pos - 1].g = clip_float(leds[pos - 1].g + color.g * neighbor_brightness);
					leds[pos - 1].b = clip_float(leds[pos - 1].b + color.b * neighbor_brightness);
				}

				if (pos < (NUM_LEDS >> 1) - 1) {
					float neighbor_brightness = sparkles[i].brightness * 0.3;
					leds[pos + 1].r = clip_float(leds[pos + 1].r + color.r * neighbor_brightness);
					leds[pos + 1].g = clip_float(leds[pos + 1].g + color.g * neighbor_brightness);
					leds[pos + 1].b = clip_float(leds[pos + 1].b + color.b * neighbor_brightness);
				}
			}
		}

		// Apply split-mirror mode if enabled
		apply_split_mirror_mode(leds);
	}, __func__);
}
