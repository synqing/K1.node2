/*
Sensory Bridge Port: Chromagram Gradient Mode
===============================================
Displays a 12-note pitch class visualization with smooth color gradient.
Each of the 12 musical notes gets mapped to a position on the LED strip
with brightness derived from the chromagram magnitude.

Ported from Sensory Bridge firmware with adaptations for Emotiscope's
palette-based color system and 180 LED architecture.
*/

void draw_sensory_chromagram_gradient() {
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float progress = num_leds_float_lookup[i];

		// Interpolate between 12-note chromagram values
		float note_magnitude = interpolate(progress, chromagram, 12) * 0.9 + 0.1;
		note_magnitude = clip_float(note_magnitude);

		// Apply nonlinear scaling (contrast enhancement)
		for (uint8_t s = 0; s < (uint8_t)configuration.speed + 1; s++) {
			note_magnitude = (note_magnitude * note_magnitude) * 0.65 + (note_magnitude * 0.35);
		}

		// Square brightness for more contrast
		float brightness = note_magnitude * note_magnitude;

		// Use palette for color mapping
		CRGBF color = color_from_palette(
			configuration.current_palette,
			progress,
			brightness
		);

		leds[i] = color;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}
