/*
Sensory Bridge Port: GDFT Mode
==============================
Frequency spectrum display with musical note mapping.
Maps 64 frequency bins directly to the LED strip with full resolution,
giving a detailed frequency spectrum visualization.

Ported from Sensory Bridge firmware with adaptations for Emotiscope's
palette-based color system and 180 LED architecture.
*/

void draw_sensory_gdft() {
	// Calculate first 90 LEDs (apply_split_mirror_mode handles symmetric mirroring)
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];

		// Map LED position to frequency bin (0-64)
		float bin_position = progress * 64.0;
		uint16_t bin_low = (uint16_t)bin_position;
		uint16_t bin_high = (bin_low + 1 < 64) ? (bin_low + 1) : 63;
		float bin_fract = bin_position - bin_low;

		// Interpolate between adjacent frequency bins
		float bin_magnitude = (spectrogram_smooth[bin_low] * (1.0 - bin_fract) +
		                       spectrogram_smooth[bin_high] * bin_fract);

		// Clip to valid range
		bin_magnitude = clip_float(bin_magnitude);

		// Apply nonlinear scaling with speed parameter
		for (uint8_t s = 0; s < (uint8_t)configuration.speed + 1; s++) {
			bin_magnitude = (bin_magnitude * bin_magnitude) * 0.65 + (bin_magnitude * 0.35);
		}

		// Use palette for color mapping
		CRGBF color = color_from_palette(
			configuration.current_palette,
			progress,
			bin_magnitude
		);

		leds[i] = color;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}
