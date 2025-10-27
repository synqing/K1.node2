/*
Sensory Bridge Port: Chromagram Dots Mode
==========================================
Displays discrete pitch class indicators as dots positioned along the LED strip.
Each of the 12 musical notes is represented by a dot whose brightness corresponds
to that note's magnitude in the chromagram.

Ported from Sensory Bridge firmware with adaptations for Emotiscope's
palette-based color system and 180 LED architecture.
*/

void draw_sensory_chromagram_dots() {
	// Clear display
	memset(leds, 0, sizeof(CRGBF) * NUM_LEDS);

	// Render each of the 12 notes as a dot
	for (uint8_t note = 0; note < 12; note++) {
		float magnitude = chromagram[note];
		magnitude = clip_float(magnitude);
		magnitude = magnitude * magnitude;  // Square for better contrast

		// Position of this note (distributed across the LED strip)
		float note_position = (float)note / 12.0 + 1.0 / 24.0;

		// Use palette to get color
		CRGBF palette_color = color_from_palette(
			configuration.current_palette,
			note_position,
			1.0
		);

		// Calculate center LED position for this note (in half-strip coordinates)
		uint16_t center_led = (uint16_t)(note_position * (NUM_LEDS >> 1));
		if (center_led >= (NUM_LEDS >> 1)) { center_led = (NUM_LEDS >> 1) - 1; }

		// Draw dot with Gaussian distribution
		float gaussian_width = 2.0 + configuration.softness * 4.0;

		for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
			float distance = fabsf((float)i - (float)center_led);
			float gaussian = expf(-(distance * distance) / (2.0 * gaussian_width * gaussian_width));
			float contribution = gaussian * magnitude;

			if (contribution > 0.01) {
				leds[i].r = clip_float(leds[i].r + palette_color.r * contribution);
				leds[i].g = clip_float(leds[i].g + palette_color.g * contribution);
				leds[i].b = clip_float(leds[i].b + palette_color.b * contribution);
			}
		}
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}
