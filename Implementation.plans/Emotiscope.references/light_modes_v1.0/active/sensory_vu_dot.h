/*
Sensory Bridge Port: VU Dot Mode
================================
Audio level visualization with physics simulation.
A dot bounces based on the audio VU level, with velocity smoothing
and spring-physics for organic motion.

Ported from Sensory Bridge firmware with adaptations for Emotiscope's
palette-based color system and 180 LED architecture.
*/

static float dot_position = 0.5;
static float dot_velocity = 0.0;
static float max_level = 0.01;

void draw_sensory_vu_dot() {
	// Smooth the VU level
	float smoothing_mix = 0.1 + configuration.speed * 0.05;
	static float vu_smooth = 0.0;
	vu_smooth = (vu_level * smoothing_mix) + (vu_smooth * (1.0 - smoothing_mix));

	// Auto-ranging: track max level with gradual decay
	if (vu_smooth * 1.1 > max_level) {
		float distance = (vu_smooth * 1.1) - max_level;
		max_level += distance * 0.1;
	} else {
		max_level *= 0.9999;
		if (max_level < 0.0025) {
			max_level = 0.0025;
		}
	}

	float multiplier = 1.0 / max_level;
	float target_position = vu_smooth * multiplier;
	target_position = clip_float(target_position);

	// Physics: spring force toward target position
	float spring_force = (target_position - dot_position) * 0.2;
	dot_velocity += spring_force;
	dot_velocity *= 0.9;  // Damping

	// Apply velocity controlled by speed parameter
	float velocity_scale = 0.1 + configuration.speed * 0.9;
	dot_position += dot_velocity * velocity_scale;
	dot_position = clip_float(dot_position);

	// Brightness based on position
	float brightness = sqrtf(dot_position);

	// Clear display
	memset(leds, 0, sizeof(CRGBF) * NUM_LEDS);

	// Draw dot at computed position
	uint16_t center_led = (uint16_t)(dot_position * (NUM_LEDS >> 1));
	if (center_led >= (NUM_LEDS >> 1)) { center_led = (NUM_LEDS >> 1) - 1; }

	float gaussian_width = 3.0 + configuration.softness * 6.0;

	// Get color from palette at the dot position
	CRGBF dot_color = color_from_palette(
		configuration.current_palette,
		dot_position,
		brightness
	);

	// Draw Gaussian blob
	for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
		float distance = fabsf((float)i - (float)center_led);
		float gaussian = expf(-(distance * distance) / (2.0 * gaussian_width * gaussian_width));
		float contribution = gaussian * brightness;

		leds[i].r = dot_color.r * contribution;
		leds[i].g = dot_color.g * contribution;
		leds[i].b = dot_color.b * contribution;
	}

	// Apply split-mirror mode if enabled
	apply_split_mirror_mode(leds);
}
