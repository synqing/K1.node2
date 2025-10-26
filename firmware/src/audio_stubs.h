// Minimal audio stubs for K1.reinvented
// Provides audio-reactive globals without full Emotiscope integration
// Allows audio-reactive patterns to compile while we integrate proper audio

#ifndef AUDIO_STUBS_H
#define AUDIO_STUBS_H

#define NUM_FREQS 64
#define NUM_TEMPI 64

// Audio-reactive globals that patterns reference
// IMPORTANT: These are declared extern here and defined in audio/goertzel.h
// to avoid duplicate definition errors
extern float spectrogram[NUM_FREQS];              // Frequency spectrum (64 bins)
extern float spectrogram_smooth[NUM_FREQS];      // Smoothed spectrum
extern float chromagram[12];                      // 12-pitch-class energy

// Tempo detection structure - must match definition used in audio/tempo.h
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

extern tempo tempi[NUM_TEMPI];  // Beat detection for 64 tempo bins (defined in tempo.h)
extern float tempi_smooth[NUM_TEMPI];

// Audio level tracker
extern float audio_level;                           // Overall audio RMS level

// Initialize audio stubs to default state
void init_audio_stubs() {
    // Fill with soft test data to demonstrate audio reactivity
    for (int i = 0; i < NUM_FREQS; i++) {
        spectrogram[i] = 0.1 + 0.05 * sinf(i * 0.2);
        spectrogram_smooth[i] = spectrogram[i];
    }

    for (int i = 0; i < NUM_TEMPI; i++) {
        tempi[i].beat = 0.5 * sinf(i * 0.05);
        tempi[i].magnitude = 0.5;
    }

    for (int i = 0; i < 12; i++) {
        chromagram[i] = 0.1 * sinf(i * 0.3);
    }

    audio_level = 0.3;
}

// Simulate audio reactivity for demonstration
void update_audio_stubs() {
    static uint32_t last_update = 0;
    uint32_t now = millis();

    if (now - last_update < 50) return;  // Update ~20x per second
    last_update = now;

    float t = now / 1000.0f;

    // Simulate beat pulse
    float beat_pulse = 0.5 + 0.5 * sinf(t * 2 * PI * 1.2);  // ~72 BPM

    // Simulate frequency content
    for (int i = 0; i < NUM_FREQS; i++) {
        float freq_sim = 0.2 + 0.3 * sinf(t * 2 * PI * 0.5 + i * 0.1);
        freq_sim *= beat_pulse;
        spectrogram[i] = 0.1 + freq_sim;
        spectrogram_smooth[i] = 0.1 + 0.9 * spectrogram_smooth[i] + 0.1 * spectrogram[i];
    }

    // Simulate beat detection
    for (int i = 0; i < NUM_TEMPI; i++) {
        tempi[i].beat = beat_pulse * (1.0 - float(i) / NUM_TEMPI);
        tempi[i].magnitude = beat_pulse;
    }

    // Simulate chromagram (musical notes)
    for (int i = 0; i < 12; i++) {
        chromagram[i] = 0.2 + 0.3 * sinf(t + i * PI / 6.0) * beat_pulse;
    }

    audio_level = beat_pulse * 0.5;
}

// Debug: Print audio state every 500ms
void print_audio_debug() {
    static uint32_t last_print = 0;
    uint32_t now = millis();

    if (now - last_print < 500) return;  // Print every 500ms
    last_print = now;

    Serial.print("[AUDIO] beat_pulse=");
    Serial.print(tempi[0].beat, 3);
    Serial.print(" audio_level=");
    Serial.print(audio_level, 3);
    Serial.print(" spec[0]=");
    Serial.print(spectrogram[0], 3);
    Serial.print(" spec[32]=");
    Serial.print(spectrogram[32], 3);
    Serial.print(" chroma[0]=");
    Serial.print(chromagram[0], 3);
    Serial.println();
}

#endif  // AUDIO_STUBS_H
