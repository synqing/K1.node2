void draw_spectrum() {
	// Calculate first 40 LEDs (apply_split_mirror_mode handles mirroring)
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];
		float mag = (clip_float(interpolate(progress, spectrogram_smooth, NUM_FREQS)));
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