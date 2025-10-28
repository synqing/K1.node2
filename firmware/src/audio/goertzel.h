// -----------------------------------------------------------------
//                                 _                  _       _
//                                | |                | |     | |
//    __ _    ___     ___   _ __  | |_   ____   ___  | |     | |__
//   / _` |  / _ \   / _ \ | '__| | __| |_  /  / _ \ | |     | '_ \
//  | (_| | | (_) | |  __/ | |    | |_   / /  |  __/ | |  _  | | | |
//   \__, |  \___/   \___| |_|     \__| /___|  \___| |_| (_) |_| |_|
//    __/ |
//   |___/
//
// Goertzel Algorithm - Frequency Domain Analysis via Constant-Q Transform
// https://en.wikipedia.org/wiki/Goertzel_algorithm
//
// Interface header: struct definitions, extern declarations, configuration

#ifndef GOERTZEL_H
#define GOERTZEL_H

#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <esp_timer.h>
#include <stdint.h>
#include <cstring>
#include <cmath>

// Profiling macro - simplified for now (just execute lambda)
#define profile_function(lambda, name) lambda()
#define ___() do {} while(0)

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Audio sample buffer
#define SAMPLE_RATE 16000
#define SAMPLE_HISTORY_LENGTH 4096

#define TWOPI   6.28318530
#define FOURPI 12.56637061
#define SIXPI  18.84955593

#define NOISE_CALIBRATION_FRAMES 512

// Frequency analysis configuration
#define NUM_FREQS 64

#define BOTTOM_NOTE 24	// THESE ARE IN QUARTER-STEPS, NOT HALF-STEPS! That's 24 notes to an octave
#define NOTE_STEP 2 // Use half-steps anyways

// Tempo detection configuration
#define NUM_TEMPI 64

// Goertzel processing
#define MAX_AUDIO_RECORDING_SAMPLES 1024

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Goertzel filter state for a single frequency bin
struct freq {
	float target_freq;
	uint16_t block_size;
	float window_step;
	float coeff;
	float magnitude;
	float magnitude_full_scale;
	float magnitude_last;
	float novelty;
};

// Tempo detection structure - represents a single tempo hypothesis
typedef struct {
	float magnitude;           // Current beat magnitude (normalized, auto-ranged 0.0-1.0)
	float magnitude_full_scale; // Full-scale magnitude before auto-ranging
	float magnitude_smooth;    // Smoothed beat magnitude
	float beat;                // Beat trigger (-1.0 to 1.0, sin(phase))
	float phase;               // Beat phase (radians, -π to π)
	float target_tempo_hz;     // Target tempo frequency (Hz)
	uint16_t block_size;
	float window_step;
	float coeff;
} tempo;

// Audio data snapshot for synchronization between cores
// Used in double-buffered audio processing
typedef struct {
	// Frequency spectrum data (64 bins covering ~50Hz to 6.4kHz)
	float spectrogram[NUM_FREQS];           // Raw frequency magnitudes (0.0-1.0)
	float spectrogram_smooth[NUM_FREQS];    // Smoothed spectrum (8-sample average)

	// Musical note energy (12 pitch classes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
	float chromagram[12];                   // Chroma energy distribution

	// Audio level tracking
	float vu_level;                         // Overall audio RMS level (0.0-1.0)
	float vu_level_raw;                     // Unfiltered VU level

	// Tempo/beat detection
	float novelty_curve;                    // Spectral flux (onset detection)
	float tempo_confidence;                 // Beat detection confidence (0.0-1.0)
	float tempo_magnitude[NUM_TEMPI];       // Tempo bin magnitudes (64 bins)
	float tempo_phase[NUM_TEMPI];           // Tempo bin phases (64 bins)

	// FFT data (reserved for future full-spectrum analysis)
	// Currently using Goertzel for musical note detection (more efficient)
	float fft_smooth[128];                  // Smoothed FFT bins (placeholder)

	// Metadata
	uint32_t update_counter;                // Increments with each audio frame
	uint32_t timestamp_us;                  // Microsecond timestamp (esp_timer)
	bool is_valid;                          // True if data has been written at least once
} AudioDataSnapshot;

// ============================================================================
// GLOBAL AUDIO DATA (DEFINITIONS)
// ============================================================================

// Frequency analysis arrays
extern float spectrogram[NUM_FREQS];              // Raw frequency spectrum
extern float spectrogram_smooth[NUM_FREQS];      // Smoothed spectrum
extern float chromagram[12];                      // 12-pitch-class energy

// Audio level
extern float audio_level;                        // Overall RMS level (0.0-1.0)

// Tempo/beat detection
extern tempo tempi[NUM_TEMPI];                   // Tempo bin detectors
extern float tempi_smooth[NUM_TEMPI];            // Smoothed tempo bins

// Sample history buffer
extern float sample_history[SAMPLE_HISTORY_LENGTH];

// Goertzel state
extern freq frequencies_musical[NUM_FREQS];
extern float window_lookup[4096];
extern uint16_t max_goertzel_block_size;
extern volatile bool magnitudes_locked;

// Audio processing state
extern uint32_t noise_calibration_active_frames_remaining;
extern float noise_spectrum[64];

typedef struct {
	float vu_floor;
	float microphone_gain;    // 0.5 - 2.0x (0.5 = -6dB, 1.0 = 0dB, 2.0 = +6dB)
} AudioConfiguration;

extern AudioConfiguration configuration;
extern bool EMOTISCOPE_ACTIVE;
extern bool audio_recording_live;
extern int audio_recording_index;
extern int16_t audio_debug_recording[MAX_AUDIO_RECORDING_SAMPLES];

// Spectrogram averaging
#define NUM_SPECTROGRAM_AVERAGE_SAMPLES 8
extern float spectrogram_average[NUM_SPECTROGRAM_AVERAGE_SAMPLES][NUM_FREQS];
extern uint8_t spectrogram_average_index;

// Double-buffering for thread-safe audio sync
extern AudioDataSnapshot audio_front;
extern AudioDataSnapshot audio_back;
extern SemaphoreHandle_t audio_swap_mutex;
extern SemaphoreHandle_t audio_read_mutex;

// ============================================================================
// PUBLIC API - INITIALIZATION & PROCESSING
// ============================================================================

// Initialize audio globals with test data (called in setup())
void init_audio_stubs();

// Initialize Goertzel DFT constants for musical note detection
void init_goertzel_constants_musical();

// Initialize window function lookup table for Goertzel smoothing
void init_window_lookup();

// Initialize audio data synchronization (double-buffering)
void init_audio_data_sync();

// ============================================================================
// PUBLIC API - AUDIO PROCESSING (called by audio task on Core 1)
// ============================================================================

// Acquire sample chunk from microphone I2S buffer
// Blocks on portMAX_DELAY until next chunk is ready (synchronization via I2S DMA)
void acquire_sample_chunk();

// Calculate frequency magnitudes using Goertzel algorithm
void calculate_magnitudes();

// Extract 12-pitch-class chromagram from spectrogram
void get_chromagram();

// Commit audio frame and swap buffers (Core 1 → Core 0)
void finish_audio_frame();

// Start noise floor calibration
void start_noise_calibration();

// ============================================================================
// PUBLIC API - AUDIO DATA ACCESS (thread-safe, called from pattern rendering)
// ============================================================================

// Get snapshot of current audio data (non-blocking)
bool get_audio_snapshot(AudioDataSnapshot* snapshot);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Inline helper: clip float to [0.0, 1.0]
inline float clip_float(float val) {
	return fmax(0.0f, fmin(1.0f, val));
}

// Inline stubs for Emotiscope-specific functions (no-op in K1)
// Note: broadcast is not inlined here to avoid Serial dependency
void broadcast(const char* msg);  // Defined in goertzel.cpp
inline void save_config() {}
inline void save_noise_spectrum() {}
inline void save_audio_debug_recording() {}

// Inline stub for ESP-DSP function
inline void dsps_mulc_f32(float* src, float* dest, int length, float multiplier, int stride_src, int stride_dest) {
	for (int i = 0; i < length; i++) {
		dest[i * stride_dest] = src[i * stride_src] * multiplier;
	}
}

// Inline utility: array shift
inline void shift_and_copy_arrays(float* dest, int dest_len, float* src, int src_len) {
	memmove(dest, dest + src_len, (dest_len - src_len) * sizeof(float));
	memcpy(dest + (dest_len - src_len), src, src_len * sizeof(float));
}

#endif  // GOERTZEL_H
