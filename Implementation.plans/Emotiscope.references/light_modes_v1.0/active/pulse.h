/*
-------------------------------------------------------------
  ____            _                      _   _
 |  _ \          | |                    | | | |
 | |_) |  _   _  | |  ___    ___        | |_| |__
 |  __/  | | | | | | / __|  / _ \       | __| '_ \
 | |     | |_| | | | \__ \ |  __/    _  | |_| | | |
 |_|      \__,_| |_| |___/  \___|   (_)  \__|_| |_|

Beat-reactive radial wave effect - spawns concentric waves from center on beat
-------------------------------------------------------------
*/

#define MAX_PULSE_WAVES 6

typedef struct {
	float position;      // 0.0-1.0 normalized position from center
	float speed;         // LEDs per frame (controlled by speed slider)
	float hue;           // Color from dominant chroma note
	float brightness;    // Initial amplitude from beat strength
	uint16_t age;        // Frames since spawned (for decay)
	bool active;         // Is this wave slot active?
} pulse_wave;

pulse_wave pulse_waves[MAX_PULSE_WAVES];

// Helper function to map chromagram to HSV hue (dominant musical note)
float get_dominant_chroma() {
	float max_chroma = 0.0;
	uint16_t max_index = 0;

	for (uint16_t i = 0; i < 12; i++) {
		if (chromagram[i] > max_chroma) {
			max_chroma = chromagram[i];
			max_index = i;
		}
	}

	// Map chromagram index (0-11) to hue (0.0-1.0)
	return float(max_index) / 12.0;
}

void draw_pulse() {
	profile_function([&]() {
		// Use standard configuration parameters instead of mode-specific ones
		float spread_speed = 0.125 + 0.875 * configuration.speed;
		float rate_scale = 1.0f;  // Pulse generation rate (1.0 = normal)
		float beat_threshold = 0.3f;  // Tempo confidence threshold to spawn pulse
		uint16_t max_waves = MAX_PULSE_WAVES;  // Maximum concurrent waves

		// Spawn new wave on beat detection
		if (tempo_confidence > beat_threshold) {
			for (uint16_t i = 0; i < max_waves; i++) {
				if (!pulse_waves[i].active) {
					pulse_waves[i].position = 0.0;
					pulse_waves[i].speed = (0.2f + spread_speed * 0.4f) * rate_scale;
					pulse_waves[i].hue = get_dominant_chroma();
					pulse_waves[i].brightness = sqrt(tempo_confidence);
					pulse_waves[i].age = 0;
					pulse_waves[i].active = true;
					break; // Only spawn one wave per frame
				}
			}
		}

		// Clear LED buffer
		for (uint16_t i = 0; i < NUM_LEDS; i++) {
			leds[i] = BLACK;
		}

		// Update and render all active waves
		for (uint16_t w = 0; w < MAX_PULSE_WAVES; w++) {
			if (!pulse_waves[w].active) continue;

			// Update wave position
			pulse_waves[w].position += pulse_waves[w].speed;
			pulse_waves[w].age++;

			// Deactivate if wave has traveled past all LEDs
			if (pulse_waves[w].position > 1.5) {
				pulse_waves[w].active = false;
				continue;
			}

			// Render wave as gaussian bell curve
			float decay_factor = 0.02f + (configuration.softness * 0.03f);  // Wave decay rate
			float base_width = 0.08f;  // Initial wave width
			float width_growth = 0.05f;  // How much wave expands per frame
			float decay = exp(-pulse_waves[w].age * decay_factor); // Exponential decay
			float wave_width = base_width + width_growth * pulse_waves[w].age; // Widening wave front

			for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
				float progress = num_leds_float_lookup[i];

				// Gaussian bell curve centered at wave position
				float distance = fabs(progress - pulse_waves[w].position);
				float gaussian = exp(-(distance * distance) / (2.0 * wave_width * wave_width));

				// Combine brightness with decay
				float intensity = pulse_waves[w].brightness * gaussian * decay;
				intensity = clip_float(intensity);

				// Get color from palette using hue and intensity
				CRGBF color = color_from_palette(
					configuration.current_palette,
					pulse_waves[w].hue,
					intensity
				);

				// Additive blending to preserve overlapping waves
				leds[i].r = clip_float(leds[i].r + color.r * intensity);
				leds[i].g = clip_float(leds[i].g + color.g * intensity);
				leds[i].b = clip_float(leds[i].b + color.b * intensity);
			}
		}

		// Apply split-mirror mode if enabled
		apply_split_mirror_mode(leds);
	}, __func__);
}
