/*
Emotiscope Light Show Mode
Real-time audio-reactive spectrum visualization with musical responsiveness
Maps frequency spectrum across the LED strip with dynamic hue, saturation, and brightness
*/

void draw_emotiscope() {
	start_profile(__COUNTER__, __func__);

	// Emotiscope design philosophy:
	// - Full frequency spectrum mapped across all LEDs
	// - Each LED represents a frequency bin (0=bass, NUM_LEDS=treble)
	// - Brightness = magnitude of that frequency
	// - Hue = position across spectrum (cool→warm)
	// - Smooth response to musical changes

	for (uint16_t i = 0; i < NUM_LEDS; i++) {
		// Map LED position to frequency spectrum
		float progress = num_leds_float_lookup[i];

		// Interpolate magnitude across spectrogram for smooth response
		float mag = clip_float(interpolate(progress, spectrogram_smooth, NUM_FREQS));

		// Apply some response curve for visual effect
		// sqrt makes quiet frequencies more visible, peaks more pronounced
		mag = sqrt(mag);

		// Get hue from position (cool blues on left/bass to warm oranges on right/treble)
		float hue = get_color_range_hue(progress);

		// Saturation: full on active frequencies, slightly desaturated on quiet
		float saturation = 0.8 + (mag * 0.2);  // 0.8-1.0 range
		saturation = clip_float(saturation);

		// Brightness directly from audio magnitude
		float brightness = mag;

		// Convert HSV to RGB
		CRGBF color = hsv(hue, saturation, brightness);

		leds[i] = color;
	}

	end_profile();
}
