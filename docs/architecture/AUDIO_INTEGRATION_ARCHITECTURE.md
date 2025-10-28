---
title: Emotiscope Audio Integration Architecture Plan
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Emotiscope Audio Integration Architecture Plan
## K1.reinvented Real Audio Processing Integration

**Document Version:** 1.0
**Date:** 2025-10-25
**Target Platform:** ESP32-S3 DevKit with SPH0645 MEMS Microphone

---

## Executive Summary

This document describes the architecture for integrating real audio processing (via SPH0645 MEMS microphone) into K1.reinvented, replacing the current audio stubs (`audio_stubs.h`) with actual Emotiscope signal processing. The plan provides a phased integration strategy that maintains backward compatibility while progressively introducing live audio reactivity.

**Current State:**
- Audio input: Simulated via `audio_stubs.h` (~20 Hz update rate)
- Processing: None (stubs only generate synthetic data)
- Microphone support: I2S driver partially implemented in `firmware/src/audio/microphone.h`
- DSP algorithms: Goertzel spectral analysis + tempo detection (tempo.h, goertzel.h)

**Target State:**
- Audio input: Real I2S microphone data (12.8 kHz sample rate)
- Processing: FFT-based spectrum analysis + Goertzel beat detection
- Latency: <50 ms from audio capture → LED update
- CPU allocation: Core 0 for audio, Core 1 for rendering
- Libraries: ESP-DSP v1.4.0+ for vector operations

---

## Architecture Overview

### System Block Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ ESP32-S3 Dual Core Architecture                                 │
├──────────────────────────┬──────────────────────────────────────┤
│ CORE 0: Audio Processing │ CORE 1: LED Rendering               │
├──────────────────────────┼──────────────────────────────────────┤
│                          │                                      │
│  ┌──────────────────┐    │  ┌──────────────────┐               │
│  │ I2S RX Task      │    │  │ Main Loop Task   │               │
│  │ (I2S ISR)        │    │  │ @ ~60 FPS        │               │
│  │ 12.8 kHz         │    │  │                  │               │
│  └────────┬─────────┘    │  │ Reads audio      │               │
│           │              │  │ globals (atomic) │               │
│  ┌────────v─────────┐    │  │ Renders pattern  │               │
│  │ Circular Buffer  │    │  │ Updates LEDs     │               │
│  │ 4096 samples     │    │  └──────────────────┘               │
│  │ (4 core, 2 roles)│    │                                      │
│  └────────┬─────────┘    │                                      │
│           │              │                                      │
│  ┌────────v─────────┐    │                                      │
│  │ Analysis Tasks   │    │                                      │
│  │ (50 Hz novelty)  │    │                                      │
│  │                  │    │                                      │
│  ├─ Goertzel FFT   │    │                                      │
│  ├─ Beat Detection │    │                                      │
│  ├─ Chromagram    │    │                                      │
│  └────────┬─────────┘    │                                      │
│           │              │                                      │
│  ┌────────v─────────┐    │  ┌──────────────────┐               │
│  │ Shared Globals   │    │  │ Read-Only Access │               │
│  │ (atomic updates) │───────>│ spectrogram[64]  │               │
│  │                  │    │  │ tempi[64]        │               │
│  │ spectrogram[]    │    │  │ chromagram[12]   │               │
│  │ tempi[]          │    │  │ audio_level      │               │
│  │ chromagram[]     │    │  └──────────────────┘               │
│  │ audio_level      │    │                                      │
│  └──────────────────┘    │                                      │
│                          │                                      │
└──────────────────────────┴──────────────────────────────────────┘
         ↑                              ↑
         │                              │
    SPH0645 I2S Input            RMT → WS2812B LEDs
    (BCLK, WS, SD)             (GPIO 15, ~400 Kbps)
```

### Task Allocation Strategy

| Task | Core | Priority | Frequency | Max Duration |
|------|------|----------|-----------|--------------|
| I2S RX ISR | 0 | ISR | 12.8 kHz | <100 µs |
| Goertzel analysis | 0 | High | 50 Hz | ~5 ms |
| Novelty/Tempo | 0 | High | 50 Hz | ~3 ms |
| Main loop (LED render) | 1 | High | 60 Hz | ~8 ms |
| Web server async | 1 | Low | Event-driven | ~2 ms |
| OTA updates | 1 | Low | Event-driven | N/A |

---

## Detailed Component Design

### 1. I2S Microphone Interface

#### Current Implementation Status

**File:** `firmware/src/audio/microphone.h` (partially implemented)

**Existing Code:**
```cpp
#define I2S_LRCLK_PIN 12  // LRCL (Left/Right Clock)
#define I2S_BCLK_PIN  14  // BCLK (Bit Clock)
#define I2S_DIN_PIN   13  // DOUT (Data Out)

#define CHUNK_SIZE 64
#define SAMPLE_RATE 12800
#define SAMPLE_HISTORY_LENGTH 4096

void init_i2s_microphone() { ... }
void acquire_sample_chunk() { ... }
```

**Current Issues:**
1. Placeholder `EMOTISCOPE_ACTIVE` flag checks (line 86)
2. References to undefined globals (vu_max, audio_recording_live, etc.)
3. Uses deprecated profile_function() wrapper
4. No task scheduling - blocking call pattern

#### Recommended I2S Configuration

**PIN MAPPING (ESP32-S3 → SPH0645):**

| Signal | ESP32-S3 Pin | Function | Notes |
|--------|-------------|----------|-------|
| BCLK | GPIO 14 | Bit Clock | Input clock from ESP |
| WS (LRCLK) | GPIO 12 | Word Select | Alternates L/R channel |
| SD (DOUT) | GPIO 13 | Serial Data | Audio data stream |
| SEL | GND | Channel Select | Tie to GND for left channel |
| GND | GND | Ground | |
| VCC | 3.3V | Power | |

**I2S Configuration Constants:**
```cpp
#define I2S_NUM              I2S_NUM_0         // Use I2S peripheral 0
#define I2S_MCLK_PIN         I2S_GPIO_UNUSED   // MCLK not required for SPH0645
#define I2S_BCLK_PIN         14
#define I2S_WS_PIN          12
#define I2S_DIN_PIN         13
#define I2S_DOUT_PIN        I2S_GPIO_UNUSED   // Input only

#define I2S_SAMPLE_RATE     12800             // Hz
#define I2S_CHUNK_SIZE      64                // 5 ms @ 12.8 kHz
#define I2S_BIT_WIDTH       32                // Hardware delivers 32-bit aligned
#define I2S_CHANNEL_MODE    I2S_CHANNEL_MONO  // Single microphone
#define SAMPLE_HISTORY_LEN  4096              // 320 ms @ 12.8 kHz
```

**I2S Timing Characteristics:**
- Bit clock frequency: 12.8 kHz × 32 bits = 409.6 kHz
- Sample duration: 1/12,800 = 78.125 µs
- Chunk acquisition time: 64 samples / 12.8 kHz = 5 ms
- Full buffer (4096 samples): 320 ms

#### I2S Initialization Function

```cpp
// Phase 1: Add to firmware/src/audio/microphone.h
#include "driver/i2s_std.h"
#include "esp_dsp.h"

i2s_chan_handle_t i2s_rx_handle = NULL;

esp_err_t init_i2s_microphone() {
    // I2S channel configuration
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_AUTO, I2S_ROLE_MASTER);
    chan_cfg.auto_clear = true;
    chan_cfg.recv_buf_size = I2S_CHUNK_SIZE * 4; // 256 bytes

    // Create RX channel only
    ESP_RETURN_ON_ERROR(i2s_new_channel(&chan_cfg, NULL, &i2s_rx_handle), __func__);

    // Standard I2S mode configuration for SPH0645
    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(I2S_SAMPLE_RATE * 32),
        .slot_cfg = {
            .data_bit_width = I2S_DATA_BIT_WIDTH_32BIT,
            .slot_bit_width = I2S_SLOT_BIT_WIDTH_32BIT,
            .slot_mode = I2S_SLOT_MODE_STEREO,      // Receive stereo for flexibility
            .slot_mask = I2S_STD_SLOT_RIGHT,        // Use RIGHT channel (SEL grounded)
            .ws_width = I2S_SLOT_BIT_WIDTH_32BIT,
            .ws_pol = true,                         // WS active high
            .bit_shift = false,
            .left_align = true,
            .big_endian = false,
            .bit_order_lsb = false,
        },
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = (gpio_num_t)I2S_BCLK_PIN,
            .ws = (gpio_num_t)I2S_WS_PIN,
            .dout = I2S_GPIO_UNUSED,
            .din = (gpio_num_t)I2S_DIN_PIN,
        },
    };

    // Initialize and enable the channel
    ESP_RETURN_ON_ERROR(i2s_channel_init_std_mode(i2s_rx_handle, &std_cfg), __func__);
    ESP_RETURN_ON_ERROR(i2s_channel_enable(i2s_rx_handle), __func__);

    return ESP_OK;
}
```

### 2. Audio Sample Acquisition (Core 0)

#### Circular Buffer Management

**Design:**
- Ring buffer: 4096 samples (320 ms @ 12.8 kHz)
- Read pointer: Updated by ISR/I2S task
- Write pointer(s): Advanced by analysis tasks
- Alignment: 64-sample chunks for DSP operations

**Implementation Structure:**

```cpp
// firmware/src/audio/sample_buffer.h
#define BUFFER_SIZE 4096

typedef struct {
    float samples[BUFFER_SIZE];
    volatile uint16_t write_idx;    // ISR writes here
    volatile uint16_t read_idx;     // Analysis reads here
    volatile uint32_t total_samples; // Never decrements
} AudioBuffer;

AudioBuffer audio_buffer = {0};

// Thread-safe write (ISR only)
void buffer_write_samples(float* chunk, int len) {
    // Lock not needed - single ISR writer
    uint16_t end_idx = audio_buffer.write_idx + len;

    if (end_idx <= BUFFER_SIZE) {
        memcpy(&audio_buffer.samples[audio_buffer.write_idx], chunk, len * sizeof(float));
    } else {
        // Wrap around
        int part1 = BUFFER_SIZE - audio_buffer.write_idx;
        memcpy(&audio_buffer.samples[audio_buffer.write_idx], chunk, part1 * sizeof(float));
        memcpy(&audio_buffer.samples[0], chunk + part1, (len - part1) * sizeof(float));
    }

    audio_buffer.write_idx = (end_idx) & (BUFFER_SIZE - 1); // Wrap with mask
    audio_buffer.total_samples += len;
}

// Read for analysis
void buffer_read_samples(float* dest, int len, uint16_t offset_from_latest) {
    uint16_t read_idx = (audio_buffer.write_idx - offset_from_latest) & (BUFFER_SIZE - 1);

    // Implement circular read with proper wrapping...
}
```

#### DSP Pipeline (Core 0)

```cpp
// firmware/src/audio/dsp_pipeline.h

void process_audio_chunk(float* samples, int len) {
    // 1. DC offset removal (highpass filter)
    dsps_dc_blocker_f32(samples, samples, len, 0.995f, NULL);

    // 2. Apply Hann window for spectral analysis prep
    for (int i = 0; i < len; i++) {
        float progress = (float)i / len;
        float window = 0.5f - 0.5f * cosf(2.0f * PI * progress);
        samples[i] *= window;
    }

    // 3. Add to circular history for Goertzel analysis
    buffer_write_samples(samples, len);

    // 4. Goertzel DFT computation (on schedule, not per-chunk)
    // Called by tempo.h functions at 50 Hz
}
```

### 3. Spectral Analysis (Goertzel FFT)

#### Current Implementation

**File:** `firmware/src/audio/goertzel.h` (lines 1-100)

**Algorithm:**
- Computes 64 musical frequency bins (55 Hz - 7040 Hz)
- Uses sliding Goertzel algorithm (IIR-based DFT)
- Processes novelty curve at 50 Hz (20 ms updates)
- Provides smooth spectrogram via temporal averaging

**Key Functions:**
```cpp
void init_goertzel_constants_musical()    // Initialize frequency bins
void calculate_tempi_magnitudes()         // Compute tempo detection
void normalize_novelty_curve()            // Auto-level adjustment
float calculate_magnitude_of_tempo()      // Single tempo bin analysis
```

**Critical Parameters:**
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| NUM_FREQS | 64 | Sufficient musical resolution |
| SAMPLE_RATE | 12800 Hz | Nyquist covers DC to 6400 Hz |
| Block size (adaptive) | 256-4096 | Depends on frequency bandwidth |
| Window function | Lookup table (4096 entries) | Pre-computed Hamming window |
| Smoothing factor (sigma) | 0.8 | Balance responsiveness vs noise |

#### Spectrum Smoothing (Moving Average)

```cpp
// firmware/src/audio/spectrum_smooth.h

#define SPECTRO_SMOOTH_SAMPLES 8

void smooth_spectrogram() {
    // Rolling average: keep last 8 spectrogram snapshots
    static float history[SPECTRO_SMOOTH_SAMPLES][NUM_FREQS] = {0};
    static uint8_t history_idx = 0;

    // Copy current to history
    memcpy(history[history_idx], spectrogram, NUM_FREQS * sizeof(float));
    history_idx = (history_idx + 1) % SPECTRO_SMOOTH_SAMPLES;

    // Compute moving average
    for (int i = 0; i < NUM_FREQS; i++) {
        float sum = 0.0f;
        for (int j = 0; j < SPECTRO_SMOOTH_SAMPLES; j++) {
            sum += history[j][i];
        }
        spectrogram_smooth[i] = sum / SPECTRO_SMOOTH_SAMPLES;
    }
}
```

### 4. Beat Detection (Tempo Analysis)

#### Current Implementation

**File:** `firmware/src/audio/tempo.h` (lines 275-429)

**Algorithm:**
- Goertzel applied to novelty curve (not raw audio)
- 64 tempo bins: 32-192 BPM (1.28 Hz resolution)
- Phase tracking for beat-sync animation
- Confidence scoring via magnitude normalization

**Key Functions:**
```cpp
void init_tempo_goertzel_constants()  // Setup 64 tempo bins
void update_novelty()                  // Log spectral novelty (50 Hz)
void update_tempo()                    // Compute tempo magnitudes
void update_tempi_phase()              // Track beat phase for sync
float calculate_magnitude_of_tempo()   // Single bin analysis
```

**Processing Pipeline:**
1. Every audio chunk: Add samples to circular buffer
2. Every 20 ms (50 Hz):
   - Compute novelty = sum of spectral energy increases
   - Log novelty to novelty_curve[] history
   - Apply Goertzel to novelty curve for beat detection
3. Compute phase for each tempo bin (beat sync)
4. Update globals (tempi[64], tempo_confidence)

#### Beat Phase Tracking

```cpp
// firmware/src/audio/beat_phase.h

// Current code in tempo.h lines 402-403:
tempi[tempo_bin].beat = sin(tempi[tempo_bin].phase);

// Phase updates at rendering frequency (~60 Hz) for smooth animation
void sync_beat_phase(uint16_t tempo_bin, float delta) {
    tempi[tempo_bin].phase += (tempi[tempo_bin].phase_radians_per_reference_frame * delta);

    // Wrap phase to [-π, π]
    if (tempi[tempo_bin].phase > PI) {
        tempi[tempo_bin].phase -= 2 * PI;
        tempi[tempo_bin].phase_inverted = !tempi[tempo_bin].phase_inverted;
    }
}
```

### 5. Chromagram (Pitch Class Energy)

#### Mapping Frequency Bins to Pitch Classes

```cpp
// firmware/src/audio/chromagram.h

void compute_chromagram() {
    // Map 64 musical frequencies to 12 pitch classes (semitones)
    // chromagram[0] = C, [1] = C#, ... [11] = B

    memset(chromagram, 0, 12 * sizeof(float));

    for (int i = 0; i < NUM_FREQS; i++) {
        float freq_hz = full_spectrum_frequencies[i];  // From goertzel.h

        // Convert Hz to MIDI note number
        float midi_note = 12.0f * logf(freq_hz / 440.0f) / logf(2.0f) + 69.0f;

        // Extract pitch class (0-11)
        int pitch_class = ((int)midi_note) % 12;

        // Add energy with fractional octave interpolation
        float fractional_octave = midi_note - (int)midi_note;
        chromagram[pitch_class] += spectrogram_smooth[i] * (1.0f - fabs(fractional_octave));
    }

    // Normalize
    float max_chroma = 0.0f;
    for (int i = 0; i < 12; i++) {
        max_chroma = max(max_chroma, chromagram[i]);
    }
    if (max_chroma > 0.0f) {
        for (int i = 0; i < 12; i++) {
            chromagram[i] /= max_chroma;
        }
    }
}
```

---

## Integration Strategy

### Phase 1: Foundation (Replace Stubs)

**Goal:** Enable real I2S input while maintaining backward compatibility

**Files to Create:**
1. `firmware/src/audio/i2s_manager.cpp/h` - I2S initialization + chunk acquisition
2. `firmware/src/audio/sample_buffer.cpp/h` - Circular buffer implementation
3. `firmware/src/audio/dsp_pipeline.cpp/h` - Preprocessing (DC removal, windowing)

**Files to Modify:**
1. `firmware/src/audio_stubs.h` → Conditional compilation flag
   ```cpp
   #ifndef USE_REAL_AUDIO
   // Keep existing stubs for testing/fallback
   #endif
   ```

2. `firmware/src/main.cpp` - Add I2S initialization
   ```cpp
   #ifdef USE_REAL_AUDIO
   init_i2s_microphone();
   #else
   init_audio_stubs();
   #endif
   ```

3. `firmware/platformio.ini` - Add ESP-DSP dependency
   ```ini
   lib_deps =
       espressif/esp-dsp@^1.4.0
   ```

**Verification:**
```bash
# Verify I2S ISR fires and buffers accumulate
Serial.printf("Buffer level: %d / %d samples\n",
              audio_buffer.write_idx, BUFFER_SIZE);
```

### Phase 2: Spectral Analysis (Activate Goertzel)

**Goal:** Enable frequency domain processing

**Files to Activate:**
1. `firmware/src/audio/goertzel.h` - Already exists, verify dependencies
2. `firmware/src/audio/spectrum_smooth.h` - NEW: Moving average filter

**Integration Steps:**

1. Verify all missing dependencies in goertzel.h:
   ```cpp
   // Add to firmware/src/types.h or audio/config.h
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
   ```

2. Add missing globals in firmware/src/main.cpp:
   ```cpp
   float noise_spectrum[NUM_FREQS] = {0};
   float vu_max = 0.0f;
   uint32_t t_now_us = 0;
   bool EMOTISCOPE_ACTIVE = true;
   ```

3. Create analysis task on Core 0:
   ```cpp
   void audio_analysis_task(void* param) {
       while (1) {
           // Execute every 20ms (50 Hz)
           vTaskDelay(20 / portTICK_PERIOD_MS);

           if (EMOTISCOPE_ACTIVE) {
               normalize_novelty_curve();
               calculate_tempi_magnitudes();
               update_tempo();
           }
       }
   }

   // In setup():
   xTaskCreatePinnedToCore(
       audio_analysis_task, "audio_analysis",
       4096, NULL, 5, NULL, 0  // Core 0
   );
   ```

**Verification:**
```cpp
Serial.printf("Spectrum: ");
for (int i = 0; i < 8; i++) {
    Serial.printf("%.2f ", spectrogram[i]);
}
Serial.println();
```

### Phase 3: Beat Detection (Activate Tempo)

**Goal:** Enable beat-synchronized rendering

**Files to Activate:**
1. `firmware/src/audio/tempo.h` - Already exists
2. Beat phase sync in main loop

**Integration Steps:**

1. Verify tempo initialization in setup():
   ```cpp
   init_tempo_goertzel_constants();
   ```

2. Add beat phase update to main loop (Core 1):
   ```cpp
   void loop() {
       // ... existing LED render code ...

       // Update beat phase based on elapsed time
       static uint32_t last_phase_update = millis();
       uint32_t now = millis();
       float delta = (now - last_phase_update) / 1000.0f;
       last_phase_update = now;

       update_tempi_phase(delta);
   }
   ```

3. Patterns use `tempi[tempo_bin].beat` for sync:
   ```cpp
   // In generated effect code:
   uint16_t beat_bin = find_closest_tempo_bin(120.0f);  // 120 BPM
   float beat_envelope = max(0.0f, tempi[beat_bin].beat); // 0.0 - 1.0
   ```

**Verification:**
```cpp
Serial.printf("Tempo 120BPM bin %d: mag=%.2f beat=%.2f\n",
              beat_bin, tempi[beat_bin].magnitude, tempi[beat_bin].beat);
```

### Phase 4: Chromagram & Advanced Features

**Goal:** Enable pitch-class energy analysis

**Files to Create:**
1. `firmware/src/audio/chromagram.cpp/h` - Pitch class mapping

**Integration:** See section 3.5 above

---

## Core Allocation & Synchronization

### Core 0: Audio Processing

**Purpose:** I2S sampling and spectral analysis
**Scheduling:** Interrupt-driven + periodic tasks

```cpp
// Core 0 workload timeline
Time  Event                           Duration  Priority
────────────────────────────────────────────────────────
0ms   I2S ISR (16 samples)             50 µs     ISR
5ms   Goertzel chunk processing        2 ms      High
20ms  Novelty curve update             3 ms      High
20ms  Tempo magnitude calculation      5 ms      High
```

**Task Configuration:**
```cpp
xTaskCreatePinnedToCore(
    i2s_acquisition_task,      // Manages I2S chunks
    "i2s_acq",
    2048,                       // Stack: small, mostly I2S driver
    NULL,
    configMAX_PRIORITIES - 2,   // High priority (just below ISR)
    NULL,
    0                           // Core 0
);

xTaskCreatePinnedToCore(
    audio_analysis_task,        // Goertzel + Tempo
    "audio_analysis",
    4096,                       // Stack: larger for FFT buffers
    NULL,
    configMAX_PRIORITIES - 3,   // High priority
    NULL,
    0                           // Core 0
);
```

### Core 1: LED Rendering

**Purpose:** Pattern animation and LED transmission
**Scheduling:** Main loop @ ~60 FPS

```cpp
void loop() {  // Runs on Core 1
    // Non-blocking:
    // 1. Read audio globals (atomic)
    // 2. Compute pattern
    // 3. Transmit to LEDs
    // 4. Handle web requests (async)
    // 5. OTA updates (async)
}
```

### Inter-Core Synchronization

**Shared Global Structure:**

```cpp
// firmware/src/audio/audio_state.h

typedef struct {
    // Spectrum analysis
    volatile float spectrogram[NUM_FREQS];
    volatile float spectrogram_smooth[NUM_FREQS];

    // Beat detection
    volatile struct tempo tempi[NUM_TEMPI];
    volatile float tempi_smooth[NUM_TEMPI];

    // Pitch class energy
    volatile float chromagram[12];

    // Overall level
    volatile float audio_level;

    // Synchronization
    volatile uint32_t update_counter;  // Incremented by Core 0
    volatile uint32_t last_read;       // Tracked by Core 1
} AudioState;

volatile AudioState g_audio_state = {0};

// Atomic read helper
void read_audio_state(AudioState* dest) {
    do {
        dest->update_counter = g_audio_state.update_counter;
        memcpy((void*)&dest->spectrogram,
               (void*)&g_audio_state.spectrogram,
               sizeof(AudioState) - sizeof(uint32_t) * 2);
    } while (dest->update_counter != g_audio_state.update_counter);
}
```

**Update Pattern (Core 0):**
```cpp
void update_audio_globals() {
    // Atomically update all spectral data
    memcpy((void*)g_audio_state.spectrogram,
           (void*)spectrogram,
           NUM_FREQS * sizeof(float));
    memcpy((void*)g_audio_state.tempi,
           (void*)tempi,
           NUM_TEMPI * sizeof(struct tempo));
    // ... other fields ...

    g_audio_state.update_counter++;  // Signal update complete
}
```

---

## Library Dependencies & Versions

### Required Libraries

| Library | Source | Version | Purpose |
|---------|--------|---------|---------|
| esp-idf (driver/i2s_std.h) | Espressif | 5.0+ | I2S hardware control |
| esp-dsp | espressif/esp-dsp | ^1.4.0 | Vector DSP operations |
| Arduino | Arduino | 2.x | Serial, millis(), etc. |

### PlatformIO Configuration

```ini
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino

lib_deps =
    ; Existing
    ArduinoOTA
    https://github.com/me-no-dev/ESPAsyncWebServer.git
    https://github.com/me-no-dev/AsyncTCP.git
    bblanchon/ArduinoJson@^6.21.4

    ; NEW for audio
    espressif/esp-dsp@^1.4.0

build_flags =
    -Os
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DCORE_DEBUG_LEVEL=1
    -DUSE_REAL_AUDIO  ; Enable real audio (comment for stubs)
```

### ESP-DSP Function Reference

Key functions used in audio pipeline:

```cpp
// Vector operations
dsps_mulc_f32()        // Multiply vector by scalar: y = a * x
dsps_add_f32()         // Add two vectors: z = x + y
dsps_dc_blocker_f32()  // DC offset removal (1-pole highpass)
dsps_fft_f32()         // FFT computation (if using instead of Goertzel)
dsps_power_f32()       // Compute power: p = x^2

// These are used internally by existing code:
// - tempo.h line 271: dsps_mulc_f32(novelty_curve, ...)
// - goertzel.h: Implicit DSP math (cos, sin, sqrt via libc math)
```

---

## Update Rate Analysis

### Sampling & Processing Timeline

**I2S Sampling:**
- Sample rate: 12,800 Hz
- ISR frequency: 16 samples = 1.25 ms per interrupt
- Chunk size: 64 samples = 5 ms per acquisition task execution

**Novelty Curve Update:**
- Target: 50 Hz (20 ms interval)
- Current code in tempo.h line 347:
  ```cpp
  const float update_interval_hz = NOVELTY_LOG_HZ;  // 50 Hz
  const uint32_t update_interval_us = 1000000 / update_interval_hz;  // 20 ms
  ```

**Tempo Magnitude Update:**
- Progressive calculation: 2 bins every 20 ms
- Full cycle (64 bins): 640 ms
- Purpose: Distribute computational load across Core 0

**LED Rendering:**
- Target: 60 FPS = 16.67 ms per frame
- Audio globals read: atomic copy (~0.5 ms)

### Latency Analysis

```
Timeline from audio capture to LED update:
─────────────────────────────────────────────────────────────────

Worst-case input latency (Core 0):
  I2S captures sample
  +1.25 ms (wait for ISR)
  └─→ Chunk buffer accumulates
  +20 ms (max wait for 50 Hz analysis task)
  └─→ Novelty computed
  +20 ms (max wait for Tempo update)
  └─→ Tempi magnitudes updated
  ────────────────────
  ~41 ms to audio globals updated

Rendering pipeline (Core 1):
  New frame starts
  +0.5 ms (atomic read of audio globals)
  +5 ms (pattern computation)
  +3 ms (RMT LED transmission)
  ────────────────────
  ~8.5 ms to visual update

Total E2E latency: ~50 ms (comfortable for beat sync)
```

**Latency Improvement Opportunities:**
1. Increase novelty update rate to 100 Hz (optional)
2. Pre-compute window function (already done: window_lookup[4096])
3. Use DSP accelerators for vector ops (esp-dsp already does this)

---

## Development & Testing Roadmap

### Pre-Integration Checklist

- [ ] **Audio Hardware**
  - [ ] SPH0645 microphone wired to GPIO 12, 13, 14
  - [ ] 3.3V power and GND connected
  - [ ] Decoupling capacitor (0.1µF) across VCC-GND
  - [ ] No pull-ups on I2S lines (internal to ESP32)

- [ ] **Software Setup**
  - [ ] ESP-IDF 5.0+ installed
  - [ ] PlatformIO updated with esp-dsp library
  - [ ] `-DUSE_REAL_AUDIO` flag added to build_flags
  - [ ] Audio subsystem files in place:
    - `firmware/src/audio/microphone.h`
    - `firmware/src/audio/goertzel.h`
    - `firmware/src/audio/tempo.h`
    - `firmware/src/audio/config.h`

- [ ] **Compilation**
  - [ ] All ESP-DSP functions available
  - [ ] No undefined references to Emotiscope-specific symbols
  - [ ] Firmware binary under 1.5 MB

### Phase Testing Plan

**Phase 1 (I2S Input):**
```cpp
// Add to main.cpp setup()
Serial.println("Testing I2S input...");
for (int i = 0; i < 10; i++) {
    Serial.printf("Buffer: write_idx=%d, samples=%d\n",
                  audio_buffer.write_idx, audio_buffer.total_samples);
    delay(100);
}
```

**Phase 2 (Spectral Analysis):**
```cpp
// Add to main.cpp loop()
static uint32_t last_log = millis();
if (millis() - last_log > 1000) {
    Serial.print("Spectrum: ");
    for (int i = 0; i < 8; i++) {
        Serial.printf("%.2f ", spectrogram[i * 8]);
    }
    Serial.println();
    last_log = millis();
}
```

**Phase 3 (Beat Detection):**
```cpp
// Add to main.cpp loop()
static uint32_t last_beat_log = millis();
if (millis() - last_beat_log > 500) {
    uint16_t beat_bin = find_closest_tempo_bin(120.0f);
    Serial.printf("120 BPM (bin %d): mag=%.3f beat=%.3f phase=%.3f\n",
                  beat_bin, tempi[beat_bin].magnitude,
                  tempi[beat_bin].beat, tempi[beat_bin].phase);
    last_beat_log = millis();
}
```

### Performance Profiling

**Core 0 Utilization:**
```cpp
// firmware/src/audio/profiler.h
void profile_audio_cycle() {
    uint32_t start = esp_timer_get_time();

    // ... audio processing ...

    uint32_t end = esp_timer_get_time();
    float cpu_percent = (end - start) / 20000.0f * 100.0f;  // 20 ms window

    if (cpu_percent > 80.0f) {
        Serial.printf("WARNING: Core 0 @ %.1f%% CPU\n", cpu_percent);
    }
}
```

**Memory Usage:**
```cpp
Serial.printf("Free heap: %d bytes\n", esp_get_free_heap_size());
Serial.printf("Minimum free: %d bytes\n", esp_get_minimum_free_heap_size());
```

---

## Fallback & Rollback Strategy

### Conditional Compilation

```cpp
// firmware/platformio.ini
[env:esp32-s3-devkitc-1-stubs]
; Use audio stubs (no I2S required for testing patterns)
extends = esp32-s3-devkitc-1
build_flags = ${esp32-s3-devkitc-1.build_flags}
    ; Do NOT add -DUSE_REAL_AUDIO

[env:esp32-s3-devkitc-1]
; Use real audio (requires SPH0645 microphone)
build_flags = ${common.build_flags}
    -DUSE_REAL_AUDIO
```

### Runtime Disable

```cpp
// firmware/src/main.cpp
bool audio_enabled = true;  // Can be controlled via web API

// In loop():
if (audio_enabled) {
    update_real_audio();
} else {
    update_audio_stubs();  // Fallback
}
```

### Debugging Checks

```cpp
// firmware/src/audio/health_check.h

void check_audio_health() {
    static uint32_t last_update = g_audio_state.update_counter;

    if (g_audio_state.update_counter == last_update) {
        Serial.println("WARNING: Audio pipeline stalled");
        // Consider fallback to stubs
    }
    last_update = g_audio_state.update_counter;
}

// In loop():
if (millis() % 5000 == 0) check_audio_health();
```

---

## Hardware Limitations & Constraints

### ESP32-S3 Specifications

| Spec | Value | Impact |
|------|-------|--------|
| CPU Cores | 2 @ 240 MHz | Sufficient for dual-task architecture |
| RAM | 512 KB | Circular buffer (16 KB) fits comfortably |
| I2S Peripherals | 2 | I2S0 + I2S1 available (use I2S0 for audio) |
| GPIO | 45 | Pins 12, 13, 14 reserved for I2S |
| RMT Channels | 4 | Use Channel 0 for LED output (GPIO 15) |

### SPH0645 Specifications

| Spec | Value | Impact |
|------|-------|--------|
| Sample Rate | 8-24 kHz | Use 12.8 kHz for balance |
| Bit Depth | 18-bit | Delivered as 32-bit aligned |
| Frequency Response | 50 Hz - 20 kHz | Covers musical range |
| Current Draw | <5 mA | Negligible w/ 3.3V supply |
| Noise Floor | ~60 dB SPL | Sufficient for beat detection |

### Power Budget

```
Component             Current    Voltage    Power
─────────────────────────────────────────────────
ESP32-S3 (idle)       ~5 mA      3.3V       16.5 mW
  + CPU (processing) ~50 mA      3.3V      165 mW
  + WiFi (active)    ~80 mA      3.3V      264 mW
SPH0645 (active)      <5 mA      3.3V       16.5 mW
WS2812B (60 LEDs)    ~2 A        5V        10 W
─────────────────────────────────────────────────
TOTAL SYSTEM         ~100 mA    @ 3.3V + ~2A @ 5V
```

---

## File Organization

### Current State
```
firmware/
├── src/
│   ├── audio_stubs.h             ← Audio simulation (86 lines)
│   ├── main.cpp                  ← Boot/main loop (110 lines)
│   ├── audio/
│   │   ├── config.h              ← Type forward-declares
│   │   ├── microphone.h           ← I2S driver (partially complete)
│   │   ├── goertzel.h            ← Spectral analysis (400+ lines)
│   │   ├── tempo.h               ← Beat detection (430+ lines)
│   │   ├── DEPENDENCIES.md       ← Missing symbols doc
│   │   └── PORT_COMPLETION_REPORT.md
│   ├── generated_patterns.h      ← Effect code
│   ├── led_driver.h
│   ├── parameters.h/cpp
│   ├── pattern_registry.h/cpp
│   └── webserver.h/cpp
│
├── platformio.ini                ← Build config
└── partitions.csv
```

### Post-Integration Target
```
firmware/
├── src/
│   ├── audio_stubs.h             ← Keep for fallback (conditional)
│   ├── main.cpp                  ← Modified for dual-core
│   ├── audio/
│   │   ├── config.h              ← Expanded with type definitions
│   │   ├── microphone.h           ← Completed I2S driver
│   │   ├── sample_buffer.h/cpp    ← NEW: Circular buffer
│   │   ├── dsp_pipeline.h/cpp     ← NEW: Pre-processing
│   │   ├── i2s_manager.h/cpp      ← NEW: Task management
│   │   ├── chromagram.h/cpp       ← NEW: Pitch analysis
│   │   ├── audio_state.h          ← NEW: Shared state
│   │   ├── health_check.h         ← NEW: Diagnostics
│   │   ├── goertzel.h             ← Spectral analysis (verified)
│   │   └── tempo.h                ← Beat detection (verified)
│   ├── generated_patterns.h      ← Effect code (unchanged)
│   ├── led_driver.h              ← LED output (unchanged)
│   ├── parameters.h/cpp          ← Parameter system (unchanged)
│   ├── pattern_registry.h/cpp    ← Pattern registry (unchanged)
│   └── webserver.h/cpp           ← REST API (unchanged)
│
├── platformio.ini                ← Updated dependencies
└── partitions.csv
```

---

## Success Criteria

**Phase 1 (I2S):**
- [ ] I2S ISR fires at 12.8 kHz without drops
- [ ] Circular buffer fills smoothly
- [ ] No memory corruption or heap fragmentation
- [ ] Serial output confirms sample acquisition

**Phase 2 (Spectral):**
- [ ] Goertzel computes 64 bins without errors
- [ ] Spectrogram updates 50 times per second
- [ ] Spectrum responds to clapping/speech
- [ ] No CPU stalls or watchdog triggers

**Phase 3 (Beat):**
- [ ] Tempo detection identifies 60-180 BPM range
- [ ] Beat phase drifts < 5% per beat cycle
- [ ] Visual animation syncs to audio beat
- [ ] LED patterns respond to music (verified by eye)

**Phase 4 (Chromagram):**
- [ ] 12 pitch classes compute correctly
- [ ] Recognizes major/minor chords
- [ ] Pitch-aware color mapping works

**Performance:**
- [ ] Core 0 CPU usage < 70%
- [ ] Core 1 maintains 60 FPS rendering
- [ ] E2E latency: audio → LED < 50 ms
- [ ] Wifi/OTA still responsive
- [ ] No reboots over 1-hour run

---

## Migration Checklist

**Before Starting:**
- [ ] Read this entire document
- [ ] Hardware setup complete (SPH0645 wired correctly)
- [ ] Backup current firmware
- [ ] Understand FreeRTOS task creation
- [ ] Understand ESP32 memory organization

**Implementation Order:**
1. [ ] Create sample_buffer.h/cpp
2. [ ] Create dsp_pipeline.h/cpp
3. [ ] Complete microphone.h → i2s_manager.h/cpp
4. [ ] Update main.cpp for Core 0/1 split
5. [ ] Verify compilation
6. [ ] Test Phase 1 (I2S only)
7. [ ] Activate goertzel.h + tempo.h
8. [ ] Test Phase 2 (Spectral)
9. [ ] Test Phase 3 (Beat sync)
10. [ ] Create chromagram.h/cpp
11. [ ] Test Phase 4 (Pitch analysis)
12. [ ] Performance profiling & optimization
13. [ ] Integration testing with patterns
14. [ ] Update documentation & commit

---

## References & Links

### Emotiscope Ported Code
- `firmware/src/audio/goertzel.h` - Spectral analysis
- `firmware/src/audio/tempo.h` - Beat detection
- `firmware/src/audio/microphone.h` - I2S acquisition (partial)

### ESP-IDF Documentation
- I2S Standard Mode: https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html
- ESP-DSP Library: https://github.com/espressif/esp-dsp

### References
- Goertzel Algorithm: https://en.wikipedia.org/wiki/Goertzel_algorithm
- SPH0645 Datasheet: Knowles Acoustics
- ESP32-S3 Datasheet: Espressif

### Related K1 Documentation
- `../resources/README_Claude_Skills.md` - Pattern development workflow
- `Implementation.plans/` - Architecture planning docs

---

**Document Status:** FINAL - Ready for Phase 1 Implementation
**Next Step:** Begin with sample_buffer.h/cpp creation
**Estimated Duration:** 2-3 weeks (phased approach with testing)
