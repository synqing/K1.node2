void draw_neutral() {
	// Calculate first 40 LEDs (apply_split_mirror_mode handles mirroring)
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];
		CRGBF color = hsv(
			get_color_range_hue(progress),
			configuration.saturation,
			1.0
		);

		leds[i] = color;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}