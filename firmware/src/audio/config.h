// Audio system configuration and missing definitions
// Bridges from ported Emotiscope code to K1.reinvented

#ifndef AUDIO_CONFIG_H
#define AUDIO_CONFIG_H

// Frequency analysis configuration
#define NUM_FREQS 64
#define NUM_AVERAGE_SAMPLES 8

// Forward declare globals that are defined in goertzel.h and tempo.h
extern float spectrogram[NUM_FREQS];
extern float spectrogram_smooth[NUM_FREQS];
extern float chromagram[12];
extern tempo tempi[NUM_TEMPI];
extern float tempi_smooth[NUM_TEMPI];

// Placeholder for functions that reference Emotiscope-specific systems
// (broadcast, save_config, etc.) that don't exist in K1.reinvented

void broadcast(const char* message) {
    // Log instead of broadcast
    Serial.printf("Audio: %s\n", message);
}

void save_config() {
    // No-op for now - K1 uses generated effects, not persistent config
}

void save_noise_spectrum() {
    // No-op for now
}

#endif  // AUDIO_CONFIG_H
