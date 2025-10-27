void draw_octave() {
	// Calculate first 40 LEDs (apply_split_mirror_mode handles mirroring)
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];
		float mag = clip_float(interpolate(progress, chromagram, 12));
		CRGBF color = color_from_palette(
			configuration.current_palette,
			progress,
			mag
		);

		leds[i] = color;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}