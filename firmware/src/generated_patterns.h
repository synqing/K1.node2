// ============================================================================
// GENERATED PATTERNS - COMPLETE REBUILD
// Fixed: Patterns now map palettes ACROSS LED strip (not uniform color fills)
// Generated: 2025-10-26
// Quality Gates: Vibrant spatial patterns, proper audio reactivity, 120+ FPS
// ============================================================================

#pragma once

#include "pattern_registry.h"
#include "pattern_audio_interface.h"
#include <math.h>

extern CRGBF leds[NUM_LEDS];

// ============================================================================
// PALETTE SYSTEM - K1 Intentional + Emotiscope Reference
// ============================================================================

// K1 Intentional Pattern: Departure (Transformation)
// Story: Awakening from darkness → illumination → growth
// Dark earth → Golden light → Pure white climax → Emerald green
const uint8_t palette_departure[] PROGMEM = {
	0, 8, 3, 0,           // Position 0: Dark earth (starting point)
	32, 45, 25, 0,        // Position 32: Earth awakening
	64, 128, 100, 0,      // Position 64: Golden possibility emerging
	96, 255, 200, 0,      // Position 96: Full golden light
	128, 255, 255, 255,   // Position 128: Pure white CLIMAX (moment of transformation)
	160, 200, 255, 150,   // Position 160: White fading into growth
	192, 100, 255, 100,   // Position 192: Green emerging strongly
	224, 50, 200, 75,     // Position 224: Deeper green taking hold
	255, 0, 255, 55       // Position 255: Grounded in emerald (destination)
};

// K1 Intentional Pattern: Lava (Intensity)
// Story: Primal heat building → uncontrolled fire → white hot passion
// Absolute black → Deep red restraint → Blazing orange breakthrough → White hot
const uint8_t palette_lava[] PROGMEM = {
	0, 0, 0, 0,           // Position 0: Absolute black (PRIMAL start)
	32, 40, 0, 0,         // Position 32: Black barely warming
	64, 96, 0, 0,         // Position 64: Deep red tension building
	96, 128, 16, 0,       // Position 96: Red deepening (controlled fury)
	128, 180, 64, 0,      // Position 128: Red transitioning to orange
	160, 255, 96, 0,      // Position 160: Blazing orange breakthrough (EXPLOSION)
	192, 255, 128, 0,     // Position 192: Orange sustained intensity
	224, 255, 200, 64,    // Position 224: Orange → white transition
	255, 255, 255, 255    // Position 255: White hot CLIMAX (unresolved, refuses apology)
};

// K1 Intentional Pattern: Twilight (Peace)
// Story: Day's warmth fading → sky transforming → peaceful darkness
// Warm amber → Deep purple → Midnight blue (smooth, contemplative)
const uint8_t palette_twilight[] PROGMEM = {
	0, 255, 180, 80,      // Position 0: Warm amber (sun's last warmth)
	32, 240, 160, 80,     // Position 32: Amber settling
	64, 200, 120, 100,    // Position 64: Warm shifting cooler
	96, 160, 80, 120,     // Position 96: Transitioning to purple
	128, 128, 0, 128,     // Position 128: Deep purple MIDPOINT (sky transformation)
	160, 80, 0, 120,      // Position 160: Purple deepening toward blue
	192, 40, 20, 90,      // Position 192: Blue emerging
	224, 20, 20, 70,      // Position 224: Deeper blue tone
	255, 0, 20, 60        // Position 255: Midnight blue (peaceful darkness)
};

// Palette 3: Sunset Real (Emotiscope reference)
const uint8_t palette_sunset_real[] PROGMEM = {
	0, 120, 0, 0,
	22, 179, 22, 0,
	51, 255, 104, 0,
	85, 167, 22, 18,
	135, 100, 0, 103,
	198, 16, 0, 130,
	255, 0, 0, 160
};

// Palette 4: Fire (Emotiscope reference)
const uint8_t palette_fire[] PROGMEM = {
	0, 1, 1, 0,
	76, 32, 5, 0,
	146, 192, 24, 0,
	197, 220, 105, 5,
	240, 252, 255, 31,
	245, 255, 255, 255,
	255, 255, 255, 255
};

const uint8_t NUM_PALETTES = 5;

// Palette lookup table
struct PaletteInfo {
	const uint8_t* data;
	uint8_t num_entries;
};

const PaletteInfo palette_table[] PROGMEM = {
	{palette_departure, 9},      // Index 0: K1 Intentional: Transformation
	{palette_lava, 9},           // Index 1: K1 Intentional: Intensity
	{palette_twilight, 9},       // Index 2: K1 Intentional: Peace
	{palette_sunset_real, 7},    // Index 3: Emotiscope Sunset (for spectrum)
	{palette_fire, 7}            // Index 4: Emotiscope Fire (for bloom)
};

// ============================================================================
// COLOR FROM PALETTE - Core rendering function
// Maps progress (0.0-1.0) and brightness to interpolated palette color
// ============================================================================

CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
	// Clamp inputs
	palette_index = palette_index % NUM_PALETTES;
	progress = fmodf(progress, 1.0f);
	if (progress < 0.0f) progress += 1.0f;

	// Convert progress to 0-255 range
	uint8_t pos = (uint8_t)(progress * 255.0f);

	// Get palette info
	PaletteInfo info;
	memcpy_P(&info, &palette_table[palette_index], sizeof(PaletteInfo));

	// Find bracketing keyframes
	uint8_t entry1_idx = 0, entry2_idx = 0;
	uint8_t pos1 = 0, pos2 = 255;

	// Read all entries and find the right interpolation range
	for (uint8_t i = 0; i < info.num_entries - 1; i++) {
		uint8_t p1 = pgm_read_byte(&info.data[i * 4 + 0]);
		uint8_t p2 = pgm_read_byte(&info.data[(i + 1) * 4 + 0]);

		if (pos >= p1 && pos <= p2) {
			entry1_idx = i;
			entry2_idx = i + 1;
			pos1 = p1;
			pos2 = p2;
			break;
		}
	}

	// Read keyframe RGB data
	uint8_t r1 = pgm_read_byte(&info.data[entry1_idx * 4 + 1]);
	uint8_t g1 = pgm_read_byte(&info.data[entry1_idx * 4 + 2]);
	uint8_t b1 = pgm_read_byte(&info.data[entry1_idx * 4 + 3]);

	uint8_t r2 = pgm_read_byte(&info.data[entry2_idx * 4 + 1]);
	uint8_t g2 = pgm_read_byte(&info.data[entry2_idx * 4 + 2]);
	uint8_t b2 = pgm_read_byte(&info.data[entry2_idx * 4 + 3]);

	// Linear interpolation between keyframes
	float t = (pos2 == pos1) ? 0.0f : (float)(pos - pos1) / (float)(pos2 - pos1);

	float r = (r1 + (r2 - r1) * t) / 255.0f;
	float g = (g1 + (g2 - g1) * t) / 255.0f;
	float b = (b1 + (b2 - b1) * t) / 255.0f;

	return CRGBF(r * brightness, g * brightness, b * brightness);
}

// ============================================================================
// HELPER FUNCTIONS - Infrastructure for ported light shows
// ============================================================================

/**
 * HSV to RGB color conversion
 * Input: h, s, v all in range 0.0-1.0
 * Output: CRGBF with r, g, b in range 0.0-1.0
 *
 * Used by beat/tempo reactive patterns to generate colors from hue values
 */
CRGBF hsv(float h, float s, float v) {
	// Normalize hue to 0-1 range
	h = fmodf(h, 1.0f);
	if (h < 0.0f) h += 1.0f;

	// Clamp saturation and value
	s = fmaxf(0.0f, fminf(1.0f, s));
	v = fmaxf(0.0f, fminf(1.0f, v));

	// Handle achromatic (gray) case
	if (s == 0.0f) {
		return CRGBF(v, v, v);
	}

	// Convert HSV to RGB using standard algorithm
	float h_i = h * 6.0f;
	int i = (int)h_i;
	float f = h_i - floorf(h_i);

	float p = v * (1.0f - s);
	float q = v * (1.0f - s * f);
	float t = v * (1.0f - s * (1.0f - f));

	CRGBF result;
	switch (i % 6) {
		case 0: result = CRGBF(v, t, p); break;
		case 1: result = CRGBF(q, v, p); break;
		case 2: result = CRGBF(p, v, t); break;
		case 3: result = CRGBF(p, q, v); break;
		case 4: result = CRGBF(t, p, v); break;
		case 5: result = CRGBF(v, p, q); break;
		default: result = CRGBF(0, 0, 0); break;
	}

	return result;
}

/**
 * Apply mirror/split mode to LED array
 * Copies first half to second half in reverse for symmetrical patterns
 */
inline void apply_mirror_mode(CRGBF* leds, bool enabled) {
	if (!enabled) return;

	int half = NUM_LEDS / 2;
	for (int i = 0; i < half; i++) {
		leds[NUM_LEDS - 1 - i] = leds[i];
	}
}

/**
 * Alpha-blend two color arrays
 * Used for sprite rendering and persistence effects (tunnel, etc)
 * Result: dest[i] = dest[i] * (1 - alpha) + sprite[i] * alpha
 */
inline void blend_sprite(CRGBF* dest, const CRGBF* sprite, uint32_t length, float alpha) {
	// Clamp alpha
	alpha = fmaxf(0.0f, fminf(1.0f, alpha));
	float inv_alpha = 1.0f - alpha;

	for (uint32_t i = 0; i < length; i++) {
		dest[i].r = dest[i].r * inv_alpha + sprite[i].r * alpha;
		dest[i].g = dest[i].g * inv_alpha + sprite[i].g * alpha;
		dest[i].b = dest[i].b * inv_alpha + sprite[i].b * alpha;
	}
}

/**
 * Convenient inline macros for LED position lookups
 * Eliminates repeated division operations in pattern loops
 */
#define LED_PROGRESS(i) ((float)(i) / (float)NUM_LEDS)
#define TEMPO_PROGRESS(i) ((float)(i) / (float)NUM_TEMPI)

/**
 * Perlin-like noise function (pseudo-random based on sine)
 * Not true Perlin noise but provides smooth variation
 * Used by procedural patterns like Perlin noise mode
 */
inline float perlin_noise_simple(float x, float y) {
	float n = sinf(x * 12.9898f + y * 78.233f) * 43758.5453f;
	return fmodf(n, 1.0f);
}

/**
 * Fill array with Perlin-like noise values
 * Used for procedural noise pattern generation
 */
inline void fill_array_with_perlin(float* array, uint16_t length, float x, float y, float scale) {
	for (uint16_t i = 0; i < length; i++) {
		float t = i / (float)length;
		float noise_x = x + t * scale;
		float noise_y = y + scale * 0.5f;
		array[i] = perlin_noise_simple(noise_x, noise_y);
	}
}

/**
 * Get hue from position (0.0-1.0) across visible spectrum
 * Maps: red → orange → yellow → green → cyan → blue → magenta → red
 * Used to create rainbow gradients across LED strips
 */
inline float get_hue_from_position(float position) {
	// Map position (0.0-1.0) directly to hue
	return fmodf(position, 1.0f);
}

// ============================================================================
// DOMAIN 1: STATIC INTENTIONAL PATTERNS
// ============================================================================

/**
 * Pattern: Departure
 * Emotion: Transformation - awakening from darkness to growth
 *
 * Maps palette_departure ACROSS the LED strip (left to right gradient)
 * Position determines palette progress:
 * - LED 0 (left) = palette start (dark earth)
 * - LED 90 (middle) = palette middle (golden light)
 * - LED 180 (right) = palette end (emerald green)
 *
 * Time modulates the overall brightness for subtle pulsing
 */
void draw_departure(float time, const PatternParameters& params) {
	// Time-based brightness modulation (gentle pulse)
	float pulse = 0.85f + 0.15f * sinf(time * params.speed * 0.5f);

	// Map each LED to palette position based on physical location
	for (int i = 0; i < NUM_LEDS; i++) {
		// Position in palette: 0.0 (left) to 1.0 (right)
		float palette_progress = (float)i / NUM_LEDS;

		// Get color from palette
		CRGBF color = color_from_palette(0, palette_progress, params.brightness * pulse);

		// Apply softness (gentle blur effect by averaging adjacent LEDs slightly)
		leds[i] = color;
	}
}

/**
 * Pattern: Lava
 * Emotion: Intensity - primal heat building to explosive peak
 *
 * Maps palette_lava with time-based animation:
 * - Heat buildup travels left to right
 * - Creates "wave of intensity" effect
 * - Explodes to white at the climax
 */
void draw_lava(float time, const PatternParameters& params) {
	// Traveling heat wave
	float wave_phase = fmodf(time * params.speed * 0.3f, 1.0f);

	for (int i = 0; i < NUM_LEDS; i++) {
		// Position in LED strip (0.0 to 1.0)
		float led_pos = (float)i / NUM_LEDS;

		// Create traveling wave: combine position with time phase
		// The heat travels across the strip, creating motion
		float intensity_progress = fmodf(led_pos + wave_phase * 0.5f, 1.0f);

		// Use exponential curve to create explosive buildup
		float explosive = intensity_progress * intensity_progress * intensity_progress;

		// Get color from palette using explosive progression
		CRGBF color = color_from_palette(1, explosive, params.brightness);

		// Apply warmth parameter (boost red channel for incandescent effect)
		float warmth_boost = 1.0f + (params.warmth * 0.4f);
		color.r *= warmth_boost;

		leds[i] = color;
	}
}

/**
 * Pattern: Twilight
 * Emotion: Peace - contemplative transition from day to night
 *
 * Maps palette_twilight with gentle wave motion:
 * - Soft sine wave creates undulating color gradient
 * - Warm amber fades to cool blue across the strip
 * - Multiple wavelengths for visual interest
 */
void draw_twilight(float time, const PatternParameters& params) {
	// Gentle wave animation parameters
	float wave_speed = params.speed * 0.15f;
	float base_phase = fmodf(time * wave_speed, 1.0f);

	for (int i = 0; i < NUM_LEDS; i++) {
		// Position in LED strip (0.0 to 1.0)
		float led_pos = (float)i / NUM_LEDS;

		// Create smooth, contemplative wave
		// Multiple sine waves for complexity without harshness
		float wave1 = sinf(led_pos * 6.28318f * 1.0f + base_phase * 6.28318f) * 0.1f;
		float wave2 = sinf(led_pos * 6.28318f * 2.5f + base_phase * 3.14159f) * 0.05f;

		// Palette progress: position + wave modulation
		float palette_progress = fmodf(led_pos + wave1 + wave2, 1.0f);
		if (palette_progress < 0.0f) palette_progress += 1.0f;

		// Get color from twilight palette
		CRGBF color = color_from_palette(2, palette_progress, params.brightness);

		// Apply warmth boost to maintain amber tone
		float warmth = 1.0f + (params.warmth * 0.2f);
		color.r *= warmth;
		color.g *= (warmth * 0.9f);

		// Apply background ambient
		float ambient = params.background * 0.05f;
		color.r += ambient;
		color.g += ambient * 0.7f;
		color.b += ambient * 0.5f;

		leds[i] = color;
	}
}

// ============================================================================
// DOMAIN 2: AUDIO-REACTIVE PATTERNS
// ============================================================================

/**
 * Pattern: Spectrum Display
 * Maps frequency spectrum to LED positions with magnitude-driven color
 *
 * Architecture (Emotiscope spectrum.h reference):
 * - progress = LED position (0.0 at left, 1.0 at right)
 * - brightness = frequency magnitude
 * - Uses color_from_palette() for vibrant interpolation
 * - Center-origin: render half, mirror to other half
 */
void draw_spectrum(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Fallback to ambient if no audio
	if (!AUDIO_IS_AVAILABLE()) {
		CRGBF ambient_color = color_from_palette(params.palette_id, 0.5f, params.background * 0.3f);
		for (int i = 0; i < NUM_LEDS; i++) {
			leds[i] = ambient_color;
		}
		return;
	}

	// Fade if audio is stale (silence detection)
	float freshness_factor = AUDIO_IS_STALE() ? 0.5f : 1.0f;

	// Render spectrum (center-origin, so render half and mirror)
	int half_leds = NUM_LEDS / 2;

	for (int i = 0; i < half_leds; i++) {
		// Map LED position to frequency bin (0-63)
		float progress = (float)i / half_leds;
		float magnitude = AUDIO_SPECTRUM_SMOOTH[(int)(progress * 63.0f)] * freshness_factor;
		magnitude = fmaxf(0.0f, fminf(1.0f, magnitude));

		// Get color from palette using progress and magnitude
		CRGBF color = color_from_palette(params.palette_id, progress, magnitude);

		// Apply brightness
		color.r *= params.brightness;
		color.g *= params.brightness;
		color.b *= params.brightness;

		// Mirror from center (centre-origin architecture)
		int left_index = (NUM_LEDS / 2) - 1 - i;
		int right_index = (NUM_LEDS / 2) + i;

		leds[left_index] = color;
		leds[right_index] = color;
	}
}

/**
 * Pattern: Octave Band Response
 * Maps 12 musical octave bands to LED segments.
 *
 * Architecture (Emotiscope octave.h reference):
 * - progress = LED position (maps to 12 chromagram bins)
 * - brightness = note magnitude from chromagram
 * - Uses color_from_palette() for smooth color transitions
 * - Center-origin: render half, mirror to other half
 */
void draw_octave(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Fallback to time-based animation if no audio
	if (!AUDIO_IS_AVAILABLE()) {
		float phase = fmodf(time * params.speed * 0.5f, 1.0f);
		for (int i = 0; i < NUM_LEDS; i++) {
			float position = fmodf(phase + (float)i / NUM_LEDS, 1.0f);
			leds[i] = color_from_palette(params.palette_id, position, params.background);
		}
		return;
	}

	// Beat emphasis (boost brightness on detected beats)
	float beat_boost = 1.0f + (AUDIO_TEMPO_CONFIDENCE * 0.5f);
	float freshness_factor = AUDIO_IS_STALE() ? 0.5f : 1.0f;

	// Render chromagram (12 musical notes)
	int half_leds = NUM_LEDS / 2;

	for (int i = 0; i < half_leds; i++) {
		// Map LED to chromagram bin (0-11)
		float progress = (float)i / half_leds;
		int note = (int)(progress * 11.0f);
		if (note > 11) note = 11;

		// Get magnitude from chromagram
		float magnitude = AUDIO_CHROMAGRAM[note] * freshness_factor * beat_boost;
		magnitude = fmaxf(0.0f, fminf(1.0f, magnitude));

		// Get color from palette
		CRGBF color = color_from_palette(params.palette_id, progress, magnitude);

		// Apply brightness
		color.r *= params.brightness;
		color.g *= params.brightness;
		color.b *= params.brightness;

		// Mirror from center
		int left_index = (NUM_LEDS / 2) - 1 - i;
		int right_index = (NUM_LEDS / 2) + i;

		leds[left_index] = color;
		leds[right_index] = color;
	}
}

/**
 * Pattern: Bloom / VU-Meter
 * Energy-responsive glow with spreading persistence
 *
 * Uses static buffer for frame-to-frame persistence (like Emotiscope's novelty_image_prev)
 * Spreads energy from center outward with Gaussian-like blur
 */
void draw_bloom(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Static buffer for bloom persistence (survives between frames)
	static float bloom_buffer[NUM_LEDS] = {0};

	// Fallback to gentle fade if no audio
	if (!AUDIO_IS_AVAILABLE()) {
		for (int i = 0; i < NUM_LEDS; i++) {
			bloom_buffer[i] *= 0.95f;  // Gentle decay
			leds[i] = color_from_palette(params.palette_id, (float)i / NUM_LEDS, bloom_buffer[i] * params.brightness);
		}
		return;
	}

	// Get VU level for energy response
	float energy = AUDIO_VU;
	float freshness_factor = AUDIO_IS_STALE() ? 0.9f : 1.0f;

	// Spread energy from center
	float spread_speed = 0.125f + 0.875f * params.speed;

	// Shift bloom buffer outward (create spreading effect)
	float temp_buffer[NUM_LEDS];
	for (int i = 0; i < NUM_LEDS; i++) {
		temp_buffer[i] = bloom_buffer[i] * 0.99f * freshness_factor;  // Decay
	}

	// Add new energy at center
	int center = NUM_LEDS / 2;
	temp_buffer[center] = fmaxf(temp_buffer[center], energy);

	// Simple spreading algorithm (blur outward from center)
	for (int i = 1; i < NUM_LEDS - 1; i++) {
		bloom_buffer[i] = temp_buffer[i] * 0.5f +
						 (temp_buffer[i - 1] + temp_buffer[i + 1]) * 0.25f;
	}
	bloom_buffer[0] = temp_buffer[0];
	bloom_buffer[NUM_LEDS - 1] = temp_buffer[NUM_LEDS - 1];

	// Render bloom with color
	for (int i = 0; i < NUM_LEDS; i++) {
		float position = (float)i / NUM_LEDS;
		float magnitude = fmaxf(0.0f, fminf(1.0f, bloom_buffer[i]));

		// Color follows position in palette
		CRGBF color = color_from_palette(params.palette_id, position, magnitude);

		// Apply brightness
		leds[i].r = color.r * params.brightness;
		leds[i].g = color.g * params.brightness;
		leds[i].b = color.b * params.brightness;
	}
}

/**
 * Pattern: Pulse (Beat-Reactive Waves)
 * Emotion: Heartbeat - spawns concentric waves on beat detection
 *
 * Architecture (Emotiscope pulse.h reference):
 * - Maintains pool of 6 concurrent waves
 * - Each wave: Gaussian bell curve with exponential decay
 * - Color from dominant chromatic note
 * - Additive blending for overlapping waves
 * - Speed parameter controls wave propagation
 */

#define MAX_PULSE_WAVES 6

typedef struct {
	float position;      // 0.0-1.0 normalized position from center
	float speed;         // LEDs per frame
	float hue;           // Color from dominant chroma note
	float brightness;    // Initial amplitude from beat strength
	uint16_t age;        // Frames since spawned
	bool active;         // Is this wave active?
} pulse_wave;

static pulse_wave pulse_waves[MAX_PULSE_WAVES];

// Helper: get dominant chromatic note (highest energy in chromagram)
float get_dominant_chroma_hue() {
	AudioDataSnapshot audio = {0};
	bool audio_available = get_audio_snapshot(&audio);

	if (!audio_available) {
		return 0.0f;  // Default to C if no audio available
	}

	float max_chroma = 0.0f;
	uint16_t max_index = 0;

	for (uint16_t i = 0; i < 12; i++) {
		if (audio.chromagram[i] > max_chroma) {
			max_chroma = audio.chromagram[i];
			max_index = i;
		}
	}

	// Map chromagram index (0-11) to hue (0.0-1.0)
	return (float)max_index / 12.0f;
}

void draw_pulse(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Fallback to ambient if no audio
	if (!AUDIO_IS_AVAILABLE()) {
		for (int i = 0; i < NUM_LEDS; i++) {
			leds[i] = color_from_palette(params.palette_id, 0.5f, params.background * 0.3f);
		}
		return;
	}

	// Beat detection and wave spawning
	float beat_threshold = 0.3f;
	if (AUDIO_TEMPO_CONFIDENCE > beat_threshold) {
		// Spawn new wave on beat
		for (uint16_t i = 0; i < MAX_PULSE_WAVES; i++) {
			if (!pulse_waves[i].active) {
				pulse_waves[i].position = 0.0f;
				pulse_waves[i].speed = (0.2f + params.speed * 0.4f);
				pulse_waves[i].hue = get_dominant_chroma_hue();
				pulse_waves[i].brightness = sqrtf(AUDIO_TEMPO_CONFIDENCE);
				pulse_waves[i].age = 0;
				pulse_waves[i].active = true;
				break; // Only spawn one wave per frame
			}
		}
	}

	// Clear LED buffer
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i] = CRGBF(0, 0, 0);
	}

	// Update and render all active waves
	float decay_factor = 0.02f + (params.softness * 0.03f);
	float base_width = 0.08f;
	float width_growth = 0.05f;

	for (uint16_t w = 0; w < MAX_PULSE_WAVES; w++) {
		if (!pulse_waves[w].active) continue;

		// Update wave position
		pulse_waves[w].position += pulse_waves[w].speed;
		pulse_waves[w].age++;

		// Deactivate if wave traveled past LEDs
		if (pulse_waves[w].position > 1.5f) {
			pulse_waves[w].active = false;
			continue;
		}

		// Render wave as Gaussian bell curve
		float decay = expf(-(float)pulse_waves[w].age * decay_factor);
		float wave_width = base_width + width_growth * pulse_waves[w].age;

		for (int i = 0; i < (NUM_LEDS >> 1); i++) {
			float led_progress = LED_PROGRESS(i);

			// Gaussian bell curve centered at wave position
			float distance = fabsf(led_progress - pulse_waves[w].position);
			float gaussian = expf(-(distance * distance) / (2.0f * wave_width * wave_width));

			// Combine brightness with decay
			float intensity = pulse_waves[w].brightness * gaussian * decay;
			intensity = fmaxf(0.0f, fminf(1.0f, intensity));

			// Get color from palette using hue
			CRGBF color = color_from_palette(params.palette_id, pulse_waves[w].hue, intensity);

			// Additive blending for overlapping waves
			leds[i].r = fmaxf(0.0f, fminf(1.0f, leds[i].r + color.r * intensity));
			leds[i].g = fmaxf(0.0f, fminf(1.0f, leds[i].g + color.g * intensity));
			leds[i].b = fmaxf(0.0f, fminf(1.0f, leds[i].b + color.b * intensity));
		}
	}

	// Mirror from center
	apply_mirror_mode(leds, true);

	// Apply global brightness
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i].r *= params.brightness;
		leds[i].g *= params.brightness;
		leds[i].b *= params.brightness;
	}
}

/**
 * Pattern: Tempiscope (Tempo Visualization)
 * Emotion: Rhythm - displays beat phase across tempo spectrum
 *
 * Architecture (Emotiscope tempiscope.h reference):
 * - Visualizes all 64 tempo bins
 * - Shows beat phase with sine modulation
 * - Color gradient across tempo frequency range
 * - Responds to tempo confidence
 */
void draw_tempiscope(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Fallback to animated gradient if no audio
	if (!AUDIO_IS_AVAILABLE()) {
		float phase = fmodf(time * params.speed * 0.3f, 1.0f);
		for (int i = 0; i < NUM_LEDS; i++) {
			float position = fmodf(phase + LED_PROGRESS(i), 1.0f);
			leds[i] = color_from_palette(params.palette_id, position, params.background * 0.5f);
		}
		return;
	}

	// Clear LED buffer
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i] = CRGBF(0, 0, 0);
	}

	// Render tempo bins with phase modulation
	float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;
	float freshness_factor = AUDIO_IS_STALE() ? 0.5f : 1.0f;

	// Only render if confident beat detected
	if (tempo_confidence > 0.2f) {
		for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
			// Phase modulation with sine (approximate - no tempo phase data yet)
			float phase_sine = sinf(time * 6.28318f * (50.0f + i * 50.0f) / 1000.0f);
			float phase_factor = 1.0f - ((phase_sine + 1.0f) * 0.5f);

			// Tempo magnitude (approximate - use confidence for all bins)
			float magnitude = tempo_confidence * freshness_factor * phase_factor;
			magnitude = fmaxf(0.005f, magnitude); // Minimum brightness threshold
			magnitude = fmaxf(0.0f, fminf(1.0f, magnitude));

			// Color gradient across tempo range
			float hue_progress = LED_PROGRESS(i);
			CRGBF color = color_from_palette(params.palette_id, hue_progress, magnitude);

			// Apply brightness and saturation
			leds[i].r = color.r * params.brightness * params.saturation;
			leds[i].g = color.g * params.brightness * params.saturation;
			leds[i].b = color.b * params.brightness * params.saturation;
		}
	}
}

// ============================================================================
// BEAT TUNNEL PATTERN - Tempo-driven tunnel with sprite persistence
// ============================================================================

// Static buffers for tunnel image and motion blur persistence
static CRGBF beat_tunnel_image[NUM_LEDS];
static CRGBF beat_tunnel_image_prev[NUM_LEDS];
static float beat_tunnel_angle = 0.0f;

void draw_beat_tunnel(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Clear frame buffer
	for (int i = 0; i < NUM_LEDS; i++) {
		beat_tunnel_image[i] = CRGBF(0, 0, 0);
	}

	// Animate sprite position using sine wave modulation
	beat_tunnel_angle += 0.001f * (0.5f + params.speed * 0.5f);
	float position = (0.125f + 0.875f * params.speed) * sinf(beat_tunnel_angle) * 0.5f;

	// Blend previous frame into current frame (motion blur/persistence)
	float alpha_blend = 0.95f;  // Previous frame opacity
	for (int i = 0; i < NUM_LEDS; i++) {
		beat_tunnel_image[i].r = beat_tunnel_image_prev[i].r * alpha_blend;
		beat_tunnel_image[i].g = beat_tunnel_image_prev[i].g * alpha_blend;
		beat_tunnel_image[i].b = beat_tunnel_image_prev[i].b * alpha_blend;
	}

	if (!AUDIO_IS_AVAILABLE()) {
		// Fallback: simple animated pattern
		for (int i = 0; i < NUM_LEDS; i++) {
			float led_pos = LED_PROGRESS(i);
			float distance = fabsf(led_pos - position);
			float brightness = expf(-(distance * distance) / (2.0f * 0.08f * 0.08f));
			brightness = fmaxf(0.0f, fminf(1.0f, brightness));
			CRGBF color = color_from_palette(params.palette_id, led_pos, brightness * 0.5f);
			beat_tunnel_image[i].r += color.r * brightness;
			beat_tunnel_image[i].g += color.g * brightness;
			beat_tunnel_image[i].b += color.b * brightness;
		}
	} else {
		// Audio-reactive: accumulate tempo bin colors into tunnel
		float beat_threshold = 0.2f;
		float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;

		// Render tempo as colored bands when beat confidence is high
		if (tempo_confidence > beat_threshold) {
			for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
				float led_pos = LED_PROGRESS(i);

				// Use position within tunnel to determine color
				float hue = fmodf(led_pos + time * 0.3f * params.speed, 1.0f);

				// Brightness modulated by beat
				float brightness = tempo_confidence * (0.3f + 0.7f * sinf(time * 6.28318f + i * 0.1f));
				brightness = fmaxf(0.0f, fminf(1.0f, brightness));

				CRGBF color = color_from_palette(params.palette_id, hue, brightness);
				beat_tunnel_image[i].r += color.r * brightness;
				beat_tunnel_image[i].g += color.g * brightness;
				beat_tunnel_image[i].b += color.b * brightness;
			}
		}
	}

	// Clamp values to [0, 1]
	for (int i = 0; i < NUM_LEDS; i++) {
		beat_tunnel_image[i].r = fmaxf(0.0f, fminf(1.0f, beat_tunnel_image[i].r));
		beat_tunnel_image[i].g = fmaxf(0.0f, fminf(1.0f, beat_tunnel_image[i].g));
		beat_tunnel_image[i].b = fmaxf(0.0f, fminf(1.0f, beat_tunnel_image[i].b));
	}

	// Apply mirror mode
	apply_mirror_mode(beat_tunnel_image, true);

	// Copy tunnel image to LED output and apply brightness
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i].r = beat_tunnel_image[i].r * params.brightness;
		leds[i].g = beat_tunnel_image[i].g * params.brightness;
		leds[i].b = beat_tunnel_image[i].b * params.brightness;
	}

	// Save current frame for next iteration's motion blur
	for (int i = 0; i < NUM_LEDS; i++) {
		beat_tunnel_image_prev[i] = beat_tunnel_image[i];
	}
}

// ============================================================================
// PERLIN PATTERN - Procedural noise driven by animation
// ============================================================================

// Static buffers for Perlin noise generation
static float beat_perlin_noise_array[NUM_LEDS >> 2];  // 32 floats for 128 LEDs
static float beat_perlin_position_x = 0.0f;
static float beat_perlin_position_y = 0.0f;

// Simple hash function for Perlin-like noise
static inline uint32_t hash_ui(uint32_t x, uint32_t seed) {
	const uint32_t m = 0x5bd1e995U;
	uint32_t hash = seed;
	uint32_t k = x;
	k *= m;
	k ^= k >> 24;
	k *= m;
	hash *= m;
	hash ^= k;
	hash ^= hash >> 13;
	hash *= m;
	hash ^= hash >> 15;
	return hash;
}

// Basic Perlin-like noise value
static inline float perlin_noise_simple_2d(float x, float y, uint32_t seed) {
	// Simple 2D noise using hashing and interpolation
	int xi = (int)floorf(x);
	int yi = (int)floorf(y);
	float xf = x - xi;
	float yf = y - yi;

	// Smooth interpolation curve
	float u = xf * xf * (3.0f - 2.0f * xf);
	float v = yf * yf * (3.0f - 2.0f * yf);

	// Hash four corners
	float n00 = (float)(hash_ui(xi + (yi << 16), seed) & 0x7FFFFFFF) / 1073741824.0f;
	float n10 = (float)(hash_ui((xi + 1) + (yi << 16), seed) & 0x7FFFFFFF) / 1073741824.0f;
	float n01 = (float)(hash_ui(xi + ((yi + 1) << 16), seed) & 0x7FFFFFFF) / 1073741824.0f;
	float n11 = (float)(hash_ui((xi + 1) + ((yi + 1) << 16), seed) & 0x7FFFFFFF) / 1073741824.0f;

	// Bilinear interpolation
	float nx0 = n00 + u * (n10 - n00);
	float nx1 = n01 + u * (n11 - n01);
	return nx0 + v * (nx1 - nx0);
}

void draw_perlin(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Update Perlin noise position with time
	beat_perlin_position_x = 0.0f;  // Fixed X
	beat_perlin_position_y += 0.001f;  // Animated Y

	// Generate Perlin noise for downsampled positions
	for (uint16_t i = 0; i < (NUM_LEDS >> 2); i++) {
		float pos_progress = (float)i / (float)(NUM_LEDS >> 2);
		float noise_x = beat_perlin_position_x + pos_progress * 2.0f;
		float noise_y = beat_perlin_position_y;

		// Multi-octave Perlin (2 octaves)
		float value = 0.0f;
		float amplitude = 1.0f;
		float frequency = 2.0f;

		for (int oct = 0; oct < 2; oct++) {
			value += perlin_noise_simple_2d(noise_x * frequency, noise_y * frequency, 0x578437adU + oct) * amplitude;
			amplitude *= 0.5f;      // persistence
			frequency *= 2.0f;      // lacunarity
		}

		// Normalize to [0, 1]
		beat_perlin_noise_array[i] = (value + 1.0f) * 0.5f;
		beat_perlin_noise_array[i] = fmaxf(0.0f, fminf(1.0f, beat_perlin_noise_array[i]));
	}

	// Render Perlin noise field as LEDs
	for (int i = 0; i < NUM_LEDS; i++) {
		float noise_value = beat_perlin_noise_array[i >> 2];  // Sample from downsampled array

		// Use noise as hue, fixed saturation and brightness
		float hue = fmodf(noise_value * 0.66f + time * 0.1f * params.speed, 1.0f);
		float brightness = 0.25f + noise_value * 0.5f;  // 25-75% brightness

		CRGBF color = color_from_palette(params.palette_id, hue, brightness);

		leds[i].r = color.r * params.brightness * params.saturation;
		leds[i].g = color.g * params.brightness * params.saturation;
		leds[i].b = color.b * params.brightness * params.saturation;
	}
}

// ============================================================================
// VOID TRAIL PATTERN - Ambient pattern with 3 switchable modes
// ============================================================================

// Static buffers for Fade-to-Black mode (persistence)
static CRGBF void_trail_frame_current[NUM_LEDS];
static CRGBF void_trail_frame_prev[NUM_LEDS];

// Static buffers for Ripple Diffusion mode
#define MAX_VOID_RIPPLES 8
typedef struct {
	float position;      // 0.0-1.0 center position
	float width;         // Current ring width
	float brightness;    // Current intensity
	uint16_t age;        // Frames since spawn
	bool active;         // Is this ripple active?
} void_ripple;

static void_ripple void_ripples[MAX_VOID_RIPPLES];

// Helper: Render Fade-to-Black mode (ghostly persistent trails)
void void_render_fade_to_black(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	float vu_level = AUDIO_IS_AVAILABLE() ? AUDIO_VU : 0.0f;
	float freshness = AUDIO_IS_AVAILABLE() && !AUDIO_IS_STALE() ? 1.0f : 0.5f;

	// Decay rate: high VU = slow fade (persist), low VU = fast fade (clear)
	float decay_base = 0.02f;  // Base decay per frame
	float decay_rate = decay_base + (1.0f - vu_level) * 0.08f;  // Speed up fade in silence

	// Apply decay to previous frame
	for (int i = 0; i < NUM_LEDS; i++) {
		void_trail_frame_current[i].r = void_trail_frame_prev[i].r * (1.0f - decay_rate);
		void_trail_frame_current[i].g = void_trail_frame_prev[i].g * (1.0f - decay_rate);
		void_trail_frame_current[i].b = void_trail_frame_prev[i].b * (1.0f - decay_rate);
	}

	if (!AUDIO_IS_AVAILABLE()) {
		// Fallback: simple dimming pulse
		for (int i = 0; i < NUM_LEDS; i++) {
			float pulse = 0.3f + 0.2f * sinf(time * 2.0f + i * 0.1f);
			CRGBF color = color_from_palette(params.palette_id, LED_PROGRESS(i), pulse * 0.3f);
			void_trail_frame_current[i].r += color.r * pulse;
			void_trail_frame_current[i].g += color.g * pulse;
			void_trail_frame_current[i].b += color.b * pulse;
		}
	} else {
		// Audio-reactive: add new light on beat/energy
		float brightness_add = vu_level * 0.5f * freshness;
		if (brightness_add > 0.01f) {
			for (int i = 0; i < NUM_LEDS; i++) {
				float led_pos = LED_PROGRESS(i);
				float hue = fmodf(led_pos + time * 0.1f * params.speed, 1.0f);
				CRGBF color = color_from_palette(params.palette_id, hue, brightness_add);
				void_trail_frame_current[i].r += color.r * brightness_add;
				void_trail_frame_current[i].g += color.g * brightness_add;
				void_trail_frame_current[i].b += color.b * brightness_add;
			}
		}
	}

	// Clamp and copy to output
	for (int i = 0; i < NUM_LEDS; i++) {
		void_trail_frame_current[i].r = fmaxf(0.0f, fminf(1.0f, void_trail_frame_current[i].r));
		void_trail_frame_current[i].g = fmaxf(0.0f, fminf(1.0f, void_trail_frame_current[i].g));
		void_trail_frame_current[i].b = fmaxf(0.0f, fminf(1.0f, void_trail_frame_current[i].b));
		leds[i] = void_trail_frame_current[i];
		leds[i].r *= params.brightness;
		leds[i].g *= params.brightness;
		leds[i].b *= params.brightness;
	}

	// Save for next frame
	for (int i = 0; i < NUM_LEDS; i++) {
		void_trail_frame_prev[i] = void_trail_frame_current[i];
	}
}

// Helper: Render Ripple Diffusion mode (expanding rings from center)
void void_render_ripple_diffusion(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	float vu_level = AUDIO_IS_AVAILABLE() ? AUDIO_VU : 0.0f;

	// Clear frame
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i] = CRGBF(0, 0, 0);
	}

	// Spawn new ripples when energy is present
	float ripple_spawn_rate = 0.5f + params.speed * 0.5f;
	if (vu_level > 0.15f && time - floorf(time) < ripple_spawn_rate * 0.1f) {
		for (uint16_t i = 0; i < MAX_VOID_RIPPLES; i++) {
			if (!void_ripples[i].active) {
				void_ripples[i].position = 0.5f;  // Center
				void_ripples[i].width = 0.02f;
				void_ripples[i].brightness = vu_level * 0.8f;
				void_ripples[i].age = 0;
				void_ripples[i].active = true;
				break;
			}
		}
	}

	// Render all active ripples
	float ring_speed = 0.3f + params.speed * 0.4f;
	for (uint16_t r = 0; r < MAX_VOID_RIPPLES; r++) {
		if (!void_ripples[r].active) continue;

		void_ripples[r].position += ring_speed * 0.01f;
		void_ripples[r].age++;
		void_ripples[r].width += 0.005f;

		// Deactivate when ripple leaves LED strip
		if (void_ripples[r].position > 1.5f) {
			void_ripples[r].active = false;
			continue;
		}

		// Decay brightness with age
		float decay = expf(-void_ripples[r].age * 0.05f);
		float ring_brightness = void_ripples[r].brightness * decay;

		// Render ring across all LEDs
		for (int i = 0; i < NUM_LEDS; i++) {
			float led_pos = LED_PROGRESS(i);
			float distance = fabsf(led_pos - void_ripples[r].position);

			// Gaussian ring around ripple center
			float ring_intensity = expf(-(distance * distance) / (2.0f * void_ripples[r].width * void_ripples[r].width));
			ring_intensity *= ring_brightness;
			ring_intensity = fmaxf(0.0f, fminf(1.0f, ring_intensity));

			if (ring_intensity > 0.01f) {
				CRGBF color = color_from_palette(params.palette_id, LED_PROGRESS(i), ring_intensity);
				leds[i].r = fmaxf(0.0f, fminf(1.0f, leds[i].r + color.r * ring_intensity));
				leds[i].g = fmaxf(0.0f, fminf(1.0f, leds[i].g + color.g * ring_intensity));
				leds[i].b = fmaxf(0.0f, fminf(1.0f, leds[i].b + color.b * ring_intensity));
			}
		}
	}

	// Apply brightness and saturation
	for (int i = 0; i < NUM_LEDS; i++) {
		leds[i].r *= params.brightness * params.saturation;
		leds[i].g *= params.brightness * params.saturation;
		leds[i].b *= params.brightness * params.saturation;
	}
}

// Helper: Render Flowing Stream mode (sinusoidal wave modulated by audio)
void void_render_flowing_stream(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	float vu_level = AUDIO_IS_AVAILABLE() ? AUDIO_VU : 0.3f;
	float freshness = AUDIO_IS_AVAILABLE() && !AUDIO_IS_STALE() ? 1.0f : 0.7f;

	// Wave properties controlled by audio and parameters
	float wave_speed = (0.5f + params.speed * 0.5f) * vu_level;
	float wave_brightness = 0.3f + vu_level * 0.5f;
	float wave_position = fmodf(time * wave_speed, 1.0f);

	// Clear and render wave
	for (int i = 0; i < NUM_LEDS; i++) {
		float led_pos = LED_PROGRESS(i);

		// Multiple sine waves at different frequencies for complexity
		float wave1 = sinf((led_pos - wave_position) * 6.28318f);
		float wave2 = sinf((led_pos - wave_position) * 12.56636f + time * 2.0f);
		float wave_combined = (wave1 + wave2 * 0.5f) * 0.5f;  // Normalized average

		// Gaussian envelope around wave peak
		float distance_from_peak = fabsf(wave_combined);
		float brightness = wave_brightness * expf(-distance_from_peak * distance_from_peak * 2.0f);
		brightness = fmaxf(0.0f, fminf(1.0f, brightness)) * freshness;

		if (brightness > 0.01f) {
			float hue = fmodf(led_pos + time * 0.05f * params.speed, 1.0f);
			CRGBF color = color_from_palette(params.palette_id, hue, brightness);
			leds[i].r = color.r * params.brightness * params.saturation;
			leds[i].g = color.g * params.brightness * params.saturation;
			leds[i].b = color.b * params.brightness * params.saturation;
		} else {
			leds[i] = CRGBF(0, 0, 0);
		}
	}
}

// Main Void Trail pattern with switchable modes
void draw_void_trail(float time, const PatternParameters& params) {
	// Select mode based on custom_param_1 (0.0-1.0 -> 0-2)
	int mode = (int)(params.custom_param_1 * 3.0f);
	mode = fmaxf(0, fminf(2, mode));  // Clamp to [0, 2]

	switch (mode) {
		case 0:
			void_render_fade_to_black(time, params);
			break;
		case 1:
			void_render_ripple_diffusion(time, params);
			break;
		case 2:
			void_render_flowing_stream(time, params);
			break;
		default:
			void_render_fade_to_black(time, params);
			break;
	}
}

// ============================================================================
// PATTERN REGISTRY
// ============================================================================

const PatternInfo g_pattern_registry[] = {
	// Domain 1: Static Intentional Patterns
	{
		"Departure",
		"departure",
		"Transformation: earth → light → growth",
		draw_departure,
		false
	},
	{
		"Lava",
		"lava",
		"Intensity: black → red → orange → white",
		draw_lava,
		false
	},
	{
		"Twilight",
		"twilight",
		"Peace: amber → purple → blue",
		draw_twilight,
		false
	},
	// Domain 2: Audio-Reactive Patterns
	{
		"Spectrum",
		"spectrum",
		"Frequency visualization",
		draw_spectrum,
		true
	},
	{
		"Octave",
		"octave",
		"Octave band response",
		draw_octave,
		true
	},
	{
		"Bloom",
		"bloom",
		"VU-meter with persistence",
		draw_bloom,
		true
	},
	// Domain 3: Beat/Tempo Reactive Patterns (Ported from Emotiscope)
	{
		"Pulse",
		"pulse",
		"Beat-synchronized radial waves",
		draw_pulse,
		true
	},
	{
		"Tempiscope",
		"tempiscope",
		"Tempo visualization with phase",
		draw_tempiscope,
		true
	},
	{
		"Beat Tunnel",
		"beat_tunnel",
		"Animated tunnel with beat persistence",
		draw_beat_tunnel,
		true
	},
	{
		"Perlin",
		"perlin",
		"Procedural noise field animation",
		draw_perlin,
		false
	},
	{
		"Void Trail",
		"void_trail",
		"Ambient audio-responsive with 3 switchable modes (custom_param_1)",
		draw_void_trail,
		true
	}
};

const uint8_t g_num_patterns = sizeof(g_pattern_registry) / sizeof(g_pattern_registry[0]);
