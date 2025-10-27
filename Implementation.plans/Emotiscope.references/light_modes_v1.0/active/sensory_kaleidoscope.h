/*
Sensory Bridge Port: Kaleidoscope Mode
======================================
Perlin noise-based patterns affected by frequency bands.
Uses inoise16 (Perlin noise) from FastLED to generate organic, flowing patterns
that respond to audio in three frequency regions: low, mid, high.

Ported from Sensory Bridge firmware with adaptations for Emotiscope's
palette-based color system and 180 LED architecture.
*/

static float pos_r = 0.0;
static float pos_g = 0.0;
static float pos_b = 0.0;

static float brightness_low = 0.0;
static float brightness_mid = 0.0;
static float brightness_high = 0.0;

void draw_sensory_kaleidoscope() {
	// Accumulate energy from different frequency regions
	float sum_low = 0.0;
	float sum_mid = 0.0;
	float sum_high = 0.0;

	// Low frequencies: first 20 bins
	for (uint8_t i = 0; i < 20 && i < 64; i++) {
		float bin = spectrogram_smooth[i];
		bin = bin * 0.5 + (bin * bin) * 0.5;
		sum_low += bin;

		if (bin > brightness_low) {
			float dist = bin - brightness_low;
			brightness_low += dist * 0.1;
		}
	}

	// Mid frequencies: bins 20-39
	for (uint8_t i = 20; i < 40 && i < 64; i++) {
		float bin = spectrogram_smooth[i];
		bin = bin * 0.5 + (bin * bin) * 0.5;
		sum_mid += bin;

		if (bin > brightness_mid) {
			float dist = bin - brightness_mid;
			brightness_mid += dist * 0.1;
		}
	}

	// High frequencies: bins 40-59
	for (uint8_t i = 40; i < 60 && i < 64; i++) {
		float bin = spectrogram_smooth[i];
		bin = bin * 0.5 + (bin * bin) * 0.5;
		sum_high += bin;

		if (bin > brightness_high) {
			float dist = bin - brightness_high;
			brightness_high += dist * 0.1;
		}
	}

	// Decay brightness levels
	brightness_low *= 0.99;
	brightness_mid *= 0.99;
	brightness_high *= 0.99;

	// Calculate shift speeds based on audio energy
	float shift_speed = (100.0 + 500.0 * configuration.speed);
	float shift_r = shift_speed * sum_low;
	float shift_g = shift_speed * sum_mid;
	float shift_b = shift_speed * sum_high;

	// Update positions
	pos_r += shift_r;
	pos_g += shift_g;
	pos_b += shift_b;

	// Render Perlin noise pattern
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];

		// Use position as a seed for noise
		uint32_t i_shifted = i + 18;
		uint32_t i_scaled = (i_shifted * i_shifted * i_shifted);

		// Generate noise values for R, G, B channels
		uint16_t noise_r = inoise16(i_scaled * 0.5 + (uint32_t)pos_r);
		uint16_t noise_g = inoise16(i_scaled * 1.0 + (uint32_t)pos_g);
		uint16_t noise_b = inoise16(i_scaled * 1.5 + (uint32_t)pos_b);

		float r_val = noise_r / 65536.0;
		float g_val = noise_g / 65536.0;
		float b_val = noise_b / 65536.0;

		// Clip to valid range
		r_val = clip_float(r_val);
		g_val = clip_float(g_val);
		b_val = clip_float(b_val);

		// Apply nonlinear contrast enhancement
		for (uint8_t s = 0; s < (uint8_t)configuration.speed + 1; s++) {
			r_val = r_val * r_val;
			g_val = g_val * g_val;
			b_val = b_val * b_val;
		}

		// Progressive fade toward ends
		float fade_progress = progress;
		if (progress > 0.5) {
			fade_progress = 1.0 - progress;
		}
		fade_progress = fade_progress * fade_progress * 4.0;  // Sharper fade
		fade_progress = clip_float(fade_progress);

		r_val *= fade_progress * brightness_low;
		g_val *= fade_progress * brightness_mid;
		b_val *= fade_progress * brightness_high;

		// Create color from RGB values
		CRGBF col;
		col.r = r_val;
		col.g = g_val;
		col.b = b_val;

		leds[i] = col;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}
