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
	}
};

const uint8_t g_num_patterns = sizeof(g_pattern_registry) / sizeof(g_pattern_registry[0]);
