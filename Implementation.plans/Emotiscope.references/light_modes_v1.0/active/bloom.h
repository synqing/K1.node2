float novelty_image_prev[NUM_LEDS] = { 0.0 };

void draw_bloom() {
	float novelty_image[NUM_LEDS] = { 0.0 };

	float spread_speed = 0.125 + 0.875*configuration.speed;
	draw_sprite(novelty_image, novelty_image_prev, NUM_LEDS, NUM_LEDS, spread_speed, 0.99);

	novelty_image[0] = (vu_level);
	novelty_image[0] = min( 1.0f, novelty_image[0] );

	// Calculate first 40 LEDs (apply_split_mirror_mode handles mirroring)
	for(uint16_t i = 0; i < (NUM_LEDS >> 1); i++){
		float progress = num_leds_float_lookup[i];
		float novelty_pixel = clip_float(novelty_image[i]*2.0);
		CRGBF color = color_from_palette(
			configuration.current_palette,
			progress,
			novelty_pixel
		);
		leds[i] = color;
	}

	memcpy(novelty_image_prev, novelty_image, sizeof(float)*NUM_LEDS);

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}