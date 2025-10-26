// -----------------------------------------------------------------
//   _                                            _
//  | |                                          | |
//  | |_    ___   _ __ ___    _ __     ___       | |__
//  | __|  / _ \ | '_ ` _ \  | '_ \   / _ \      | '_ \
//  | |_  |  __/ | | | | | | | |_) | | (_) |  _  | | | |
//   \__|  \___| |_| |_| |_| | .__/   \___/  (_) |_| |_|
//                           | |
//                           |_|
//
// Tempo Detection Implementation
// Beat detection and tempo hypothesis tracking

#include "tempo.h"
#include "goertzel.h"
#include <cmath>
#include <Arduino.h>

// ============================================================================
// GLOBAL DATA DEFINITIONS (Tempo-specific)
// ============================================================================

// Tempo tracking state
float tempi_bpm_values_hz[NUM_TEMPI];
float tempo_confidence = 0.0f;
float MAX_TEMPO_RANGE = 1.0f;

// Tempo tracking curves
float novelty_curve[NOVELTY_HISTORY_LENGTH];
float novelty_curve_normalized[NOVELTY_HISTORY_LENGTH];
float vu_curve[NOVELTY_HISTORY_LENGTH];
float tempi_power_sum = 0.0f;

// Silence detection
bool silence_detected = true;
float silence_level = 1.0f;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

float unwrap_phase(float phase) {
	while (phase > M_PI) {
		phase -= 2 * M_PI;
	}
	while (phase < -M_PI) {
		phase += 2 * M_PI;
	}
	return phase;
}

// ============================================================================
// PUBLIC API IMPLEMENTATIONS
// ============================================================================

uint16_t find_closest_tempo_bin(float target_bpm) {
	float target_bpm_hz = target_bpm / 60.0;

	float smallest_difference = 10000000.0;
	uint16_t smallest_difference_index = 0;

	for (uint16_t i = 0; i < NUM_TEMPI; i++) {
		float difference = fabs(target_bpm_hz - tempi_bpm_values_hz[i]);
		if (difference < smallest_difference) {
			smallest_difference = difference;
			smallest_difference_index = i;
		}
	}

	return smallest_difference_index;
}

void init_tempo_goertzel_constants() {
	// Initialize tempo center frequencies (BPM range 32-192)
	for (uint16_t i = 0; i < NUM_TEMPI; i++) {
		float progress = float(i) / NUM_TEMPI;
		float tempi_range = TEMPO_HIGH - TEMPO_LOW;
		float tempo = tempi_range * progress + TEMPO_LOW;

		tempi_bpm_values_hz[i] = tempo / 60.0;  // Convert BPM to Hz
	}

	// Initialize Goertzel filter coefficients for each tempo bin
	for (uint16_t i = 0; i < NUM_TEMPI; i++) {
		tempi[i].target_tempo_hz = tempi_bpm_values_hz[i];

		// Find distance to neighboring tempo bins for block size calculation
		float neighbor_left;
		float neighbor_right;

		if (i == 0) {
			neighbor_left = tempi_bpm_values_hz[i];
			neighbor_right = tempi_bpm_values_hz[i + 1];
		}
		else if (i == NUM_TEMPI - 1) {
			neighbor_left = tempi_bpm_values_hz[i - 1];
			neighbor_right = tempi_bpm_values_hz[i];
		}
		else {
			neighbor_left = tempi_bpm_values_hz[i - 1];
			neighbor_right = tempi_bpm_values_hz[i + 1];
		}

		float neighbor_left_distance_hz = fabs(neighbor_left - tempi[i].target_tempo_hz);
		float neighbor_right_distance_hz = fabs(neighbor_right - tempi[i].target_tempo_hz);
		float max_distance_hz = 0;

		if (neighbor_left_distance_hz > max_distance_hz) {
			max_distance_hz = neighbor_left_distance_hz;
		}
		if (neighbor_right_distance_hz > max_distance_hz) {
			max_distance_hz = neighbor_right_distance_hz;
		}

		// Block size determines frequency resolution
		tempi[i].block_size = NOVELTY_LOG_HZ / (max_distance_hz * 0.5);

		if (tempi[i].block_size > NOVELTY_HISTORY_LENGTH) {
			tempi[i].block_size = NOVELTY_HISTORY_LENGTH;
		}

		// Initialize Goertzel filter coefficients
		float k = (int)(0.5 + ((tempi[i].block_size * tempi[i].target_tempo_hz) / NOVELTY_LOG_HZ));
		float w = (2.0 * PI * k) / tempi[i].block_size;
		float cosine = cos(w);
		tempi[i].coeff = 2.0 * cosine;

		tempi[i].window_step = 4096.0 / tempi[i].block_size;
	}
}

float calculate_magnitude_of_tempo(uint16_t tempo_bin) {
	uint16_t block_size = tempi[tempo_bin].block_size;

	float q1 = 0;
	float q2 = 0;

	float window_pos = 0.0;

	// Apply Goertzel filter to novelty curve with windowing
	for (uint16_t i = 0; i < block_size; i++) {
		float sample_novelty = novelty_curve_normalized[((NOVELTY_HISTORY_LENGTH - 1) - block_size) + i];
		float sample_vu = vu_curve[((NOVELTY_HISTORY_LENGTH - 1) - block_size) + i];
		float sample = (sample_novelty + sample_vu) / 2.0;

		float q0 = tempi[tempo_bin].coeff * q1 - q2 + (sample_novelty * window_lookup[uint32_t(window_pos)]);
		q2 = q1;
		q1 = q0;

		window_pos += (tempi[tempo_bin].window_step);
	}

	// Compute cosine and sine for this tempo bin
	float k = (int)(0.5 + ((tempi[tempo_bin].block_size * tempi[tempo_bin].target_tempo_hz) / NOVELTY_LOG_HZ));
	float w = (2.0 * PI * k) / tempi[tempo_bin].block_size;
	float cosine = cos(w);
	float sine = sin(w);

	// Extract magnitude and phase from Goertzel state
	float real = (q1 - q2 * cosine);
	float imag = (q2 * sine);

	// Calculate and unwrap phase
	tempi[tempo_bin].phase = (unwrap_phase(atan2(imag, real)) + (PI * BEAT_SHIFT_PERCENT));

	if (tempi[tempo_bin].phase > PI) {
		tempi[tempo_bin].phase -= (2 * PI);
	}
	else if (tempi[tempo_bin].phase < -PI) {
		tempi[tempo_bin].phase += (2 * PI);
	}

	// Calculate magnitude
	float magnitude_squared = (q1 * q1) + (q2 * q2) - q1 * q2 * tempi[tempo_bin].coeff;
	float magnitude = sqrt(magnitude_squared);
	float normalized_magnitude = magnitude / (block_size / 2.0);

	// CRITICAL FIX: Store full-scale magnitude in struct (was missing!)
	// This field is needed by calculate_tempo_magnitudes() for auto-ranging
	tempi[tempo_bin].magnitude_full_scale = normalized_magnitude;

	return normalized_magnitude;
}

void calculate_tempo_magnitudes(uint32_t block_index) {
	// Calculate all tempo bin magnitudes with auto-ranging
	float max_val = 0.0;

	// First pass: calculate all magnitudes and find max
	for (uint16_t i = 0; i < NUM_TEMPI; i++) {
		float magnitude = calculate_magnitude_of_tempo(i);
		// Now tempi[i].magnitude_full_scale has been set in calculate_magnitude_of_tempo()

		if (magnitude > max_val) {
			max_val = magnitude;
		}
	}

	if (max_val < 0.04) {
		max_val = 0.04;
	}

	float autoranger_scale = 1.0 / max_val;

	// Second pass: normalize and store magnitudes
	for (uint16_t i = 0; i < NUM_TEMPI; i++) {
		// CRITICAL FIX: Use magnitude_full_scale (which was just computed) not old magnitude
		float scaled_magnitude = tempi[i].magnitude_full_scale * autoranger_scale;
		if (scaled_magnitude < 0.0) {
			scaled_magnitude = 0.0;
		}
		if (scaled_magnitude > 1.0) {
			scaled_magnitude = 1.0;
		}

		// Apply cubic scaling for better visualization
		tempi[i].magnitude = scaled_magnitude * scaled_magnitude * scaled_magnitude;
	}
}

void normalize_novelty_curve() {
	static float max_val = 0.00001;
	static float max_val_smooth = 0.1;

	max_val *= 0.99;

	for (uint16_t i = 0; i < NOVELTY_HISTORY_LENGTH; i++) {
		max_val = fmax(max_val, novelty_curve[i]);
	}

	max_val_smooth = fmax(0.1f, max_val_smooth * 0.99f + max_val * 0.01f);

	float auto_scale = 1.0 / max_val_smooth;

	// Normalize novelty curve using DSP function
	dsps_mulc_f32(novelty_curve, novelty_curve_normalized, NOVELTY_HISTORY_LENGTH, auto_scale, 1, 1);
}

void smooth_tempi_curve() {
	// Normalize novelty curve for processing
	normalize_novelty_curve();

	// Calculate tempo magnitudes for all bins
	static uint16_t calc_bin = 0;
	uint16_t max_bin = (NUM_TEMPI - 1) * MAX_TEMPO_RANGE;

	// Calculate 2 bins per frame for performance
	if (calc_bin + 1 < NUM_TEMPI) {
		calculate_tempo_magnitudes(calc_bin);
		calculate_tempo_magnitudes(calc_bin + 1);
		calc_bin += 2;
	}

	if (calc_bin >= max_bin) {
		calc_bin = 0;
	}
}

void update_novelty_curve(float novelty_value) {
	// Shift novelty curve history and add new value
	shift_and_copy_arrays(novelty_curve, NOVELTY_HISTORY_LENGTH, novelty_curve, 1);
	novelty_curve[NOVELTY_HISTORY_LENGTH - 1] = novelty_value;

	// Shift VU curve history
	shift_and_copy_arrays(vu_curve, NOVELTY_HISTORY_LENGTH, vu_curve, 1);
	vu_curve[NOVELTY_HISTORY_LENGTH - 1] = audio_level;  // Use current audio level
}

void detect_beats() {
	tempi_power_sum = 0.00000001;

	// Smooth tempo magnitudes and calculate power sum
	for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
		// Load the magnitude
		float tempi_magnitude = tempi[tempo_bin].magnitude;

		// Smooth it with exponential moving average
		tempi_smooth[tempo_bin] = tempi_smooth[tempo_bin] * 0.92 + (tempi_magnitude) * 0.08;
		tempi_power_sum += tempi_smooth[tempo_bin];

		// Advance beat phase
		if (tempi[tempo_bin].phase > PI) {
			tempi[tempo_bin].phase -= (2 * PI);
		}
		else if (tempi[tempo_bin].phase < -PI) {
			tempi[tempo_bin].phase += (2 * PI);
		}

		// Calculate beat value from phase
		tempi[tempo_bin].beat = sin(tempi[tempo_bin].phase);
	}

	// Calculate beat detection confidence
	float max_contribution = 0.000001;
	for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
		float contribution = tempi_smooth[tempo_bin] / tempi_power_sum;
		max_contribution = fmax(contribution, max_contribution);
	}

	tempo_confidence = max_contribution;
}
