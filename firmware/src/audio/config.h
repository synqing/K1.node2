// Audio system configuration and missing definitions
// Bridges from ported Emotiscope code to K1.reinvented
// Consolidation of audio globals, struct definitions, and initialization

#ifndef AUDIO_CONFIG_H
#define AUDIO_CONFIG_H

// Frequency analysis configuration
#define NUM_FREQS 64

// Tempo detection configuration (from audio/tempo.h)
#define NUM_TEMPI 64

// Tempo detection structure - represents a single tempo hypothesis
typedef struct {
    float magnitude;           // Current beat magnitude
    float magnitude_smooth;    // Smoothed beat magnitude
    float beat;                // Beat trigger (0.0 - 1.0)
    float phase;               // Beat phase
    float target_tempo_hz;     // Target tempo frequency
    uint16_t block_size;
    float window_step;
    float coeff;
} tempo;

// Audio-reactive globals that patterns reference
// IMPORTANT: These are declared extern here and defined in audio/goertzel.h and audio/tempo.h
// to avoid duplicate definition errors
extern float spectrogram[NUM_FREQS];
extern float spectrogram_smooth[NUM_FREQS];
extern float chromagram[12];
extern tempo tempi[NUM_TEMPI];
extern float tempi_smooth[NUM_TEMPI];

// Audio level tracker
extern float audio_level;

// Initialize audio globals to default state
// Called during setup() before real audio processing starts
// Provides reasonable test data for patterns before microphone activates
inline void init_audio_stubs() {
    // Fill spectrum with soft test data to demonstrate audio reactivity
    for (int i = 0; i < NUM_FREQS; i++) {
        spectrogram[i] = 0.1 + 0.05 * sinf(i * 0.2);
        spectrogram_smooth[i] = spectrogram[i];
    }

    // Fill tempo detectors with test data
    for (int i = 0; i < NUM_TEMPI; i++) {
        tempi[i].beat = 0.5 * sinf(i * 0.05);
        tempi[i].magnitude = 0.5;
    }

    // Fill chromagram (12 musical notes) with test data
    for (int i = 0; i < 12; i++) {
        chromagram[i] = 0.1 * sinf(i * 0.3);
    }

    audio_level = 0.3;
}

#endif  // AUDIO_CONFIG_H
