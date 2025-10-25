# Audio Integration Implementation Templates

**Companion to:** AUDIO_INTEGRATION_ARCHITECTURE.md
**Purpose:** Ready-to-use code templates for Phase 1-4 implementation

---

## Template 1: sample_buffer.h/cpp

Circular ring buffer for audio samples with thread-safe access.

### firmware/src/audio/sample_buffer.h

```cpp
#ifndef SAMPLE_BUFFER_H
#define SAMPLE_BUFFER_H

#include <stdint.h>
#include <string.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/portmacro.h"

#define BUFFER_SIZE 4096        // 320 ms @ 12.8 kHz
#define BUFFER_MASK (BUFFER_SIZE - 1)

typedef struct {
    float samples[BUFFER_SIZE];
    volatile uint16_t write_idx;        // Updated by I2S task
    volatile uint32_t total_samples;    // Never decrements
} AudioBuffer;

extern AudioBuffer audio_buffer;

// Initialize buffer
void sample_buffer_init();

// Write samples (ISR/I2S task only - no lock needed)
void sample_buffer_write(float* chunk, uint16_t len);

// Read samples at offset from latest
void sample_buffer_read_at_offset(float* dest, uint16_t len, uint16_t offset);

// Get current write position
uint16_t sample_buffer_get_write_idx();

// Get total samples ever received (for diagnostics)
uint32_t sample_buffer_get_total();

#endif  // SAMPLE_BUFFER_H
```

### firmware/src/audio/sample_buffer.cpp

```cpp
#include "sample_buffer.h"

AudioBuffer audio_buffer = {0};

void sample_buffer_init() {
    memset(&audio_buffer.samples, 0, sizeof(audio_buffer.samples));
    audio_buffer.write_idx = 0;
    audio_buffer.total_samples = 0;
}

void sample_buffer_write(float* chunk, uint16_t len) {
    // Calculate wrap-around
    uint16_t end_idx = audio_buffer.write_idx + len;

    if (end_idx <= BUFFER_SIZE) {
        // No wrap
        memcpy(&audio_buffer.samples[audio_buffer.write_idx],
               chunk,
               len * sizeof(float));
    } else {
        // Wrap around
        uint16_t part1 = BUFFER_SIZE - audio_buffer.write_idx;
        uint16_t part2 = len - part1;

        memcpy(&audio_buffer.samples[audio_buffer.write_idx],
               chunk,
               part1 * sizeof(float));

        memcpy(&audio_buffer.samples[0],
               chunk + part1,
               part2 * sizeof(float));
    }

    audio_buffer.write_idx = (end_idx) & BUFFER_MASK;
    audio_buffer.total_samples += len;
}

void sample_buffer_read_at_offset(float* dest, uint16_t len, uint16_t offset) {
    // Read 'len' samples ending at (write_idx - offset)
    // offset=0 reads from the very latest sample
    // offset=64 reads from 64 samples ago

    uint16_t read_end = (audio_buffer.write_idx - offset) & BUFFER_MASK;
    uint16_t read_start = (read_end - len + BUFFER_SIZE) & BUFFER_MASK;

    if (read_start < read_end) {
        // No wrap
        memcpy(dest,
               &audio_buffer.samples[read_start],
               len * sizeof(float));
    } else {
        // Wrap around
        uint16_t part1 = BUFFER_SIZE - read_start;
        uint16_t part2 = len - part1;

        memcpy(dest,
               &audio_buffer.samples[read_start],
               part1 * sizeof(float));

        memcpy(dest + part1,
               &audio_buffer.samples[0],
               part2 * sizeof(float));
    }
}

uint16_t sample_buffer_get_write_idx() {
    return audio_buffer.write_idx;
}

uint32_t sample_buffer_get_total() {
    return audio_buffer.total_samples;
}
```

---

## Template 2: dsp_pipeline.h/cpp

Pre-processing: DC removal, windowing, RMS calculation.

### firmware/src/audio/dsp_pipeline.h

```cpp
#ifndef DSP_PIPELINE_H
#define DSP_PIPELINE_H

#include <stdint.h>
#include <math.h>
#include "esp_dsp.h"

#define DSP_CHUNK_SIZE 64
#define DSP_WINDOW_SIZE 4096

// Pre-computed Hann window (4096 samples)
extern const float dsp_window_hann[DSP_WINDOW_SIZE];

// Process audio chunk: DC removal, windowing, level tracking
void dsp_preprocess_chunk(float* samples, uint16_t len);

// Compute RMS level of audio chunk
float dsp_compute_rms(const float* samples, uint16_t len);

// Apply Hann window to buffer in-place
void dsp_apply_window(float* samples, uint16_t len, float* window_table);

// DC blocking filter (single-pole highpass)
void dsp_dc_blocker(float* samples, uint16_t len);

#endif  // DSP_PIPELINE_H
```

### firmware/src/audio/dsp_pipeline.cpp

```cpp
#include "dsp_pipeline.h"

// Pre-computed Hann window (256-point for efficiency)
// For longer windows, compute on-the-fly
const float dsp_window_hann[DSP_WINDOW_SIZE] = {
    // Hann window: w[n] = 0.5 - 0.5 * cos(2*pi*n/N-1)
    // Pre-compute at initialization (see init function)
};

static float dc_offset_state = 0.0f;
static const float DC_FILTER_ALPHA = 0.995f;  // Pole position (0.9-0.999)

void dsp_dc_blocker(float* samples, uint16_t len) {
    // Single-pole highpass filter: y[n] = x[n] - x[n-1] + alpha*y[n-1]
    for (uint16_t i = 0; i < len; i++) {
        float prev_state = dc_offset_state;
        dc_offset_state = DC_FILTER_ALPHA * (prev_state + samples[i] - (i == 0 ? 0 : samples[i-1]));
        samples[i] = samples[i] - dc_offset_state;
    }
}

void dsp_apply_window(float* samples, uint16_t len, float* window_table) {
    // Apply pre-computed window to samples
    // Scale window indices based on actual length
    for (uint16_t i = 0; i < len; i++) {
        uint16_t window_idx = (i * DSP_WINDOW_SIZE) / len;
        samples[i] *= window_table[window_idx];
    }
}

float dsp_compute_rms(const float* samples, uint16_t len) {
    // RMS = sqrt(sum(x^2) / N)
    float sum = 0.0f;

    // Use DSP library if available
    // Otherwise compute with loop
    for (uint16_t i = 0; i < len; i++) {
        sum += samples[i] * samples[i];
    }

    return sqrtf(sum / (float)len);
}

void dsp_preprocess_chunk(float* samples, uint16_t len) {
    // 1. DC offset removal
    dsp_dc_blocker(samples, len);

    // 2. Normalize to prevent clipping
    float rms = dsp_compute_rms(samples, len);
    if (rms > 0.0001f) {
        float norm_factor = 1.0f / sqrtf(2.0f) / rms;  // Normalize to -0.7, +0.7
        dsps_mulc_f32(samples, samples, len, norm_factor, 1, 1);
    }
}

void dsp_pipeline_init() {
    // Pre-compute Hann window at startup
    for (uint16_t i = 0; i < DSP_WINDOW_SIZE; i++) {
        float progress = (float)i / (DSP_WINDOW_SIZE - 1);
        const_cast<float*>(dsp_window_hann)[i] = 0.5f - 0.5f * cosf(2.0f * M_PI * progress);
    }
}
```

---

## Template 3: i2s_manager.h/cpp

Complete I2S initialization and task management.

### firmware/src/audio/i2s_manager.h

```cpp
#ifndef I2S_MANAGER_H
#define I2S_MANAGER_H

#include <stdint.h>
#include "esp_err.h"

// I2S Configuration
#define I2S_NUM             I2S_NUM_0
#define I2S_BCLK_PIN        14
#define I2S_WS_PIN          12
#define I2S_DIN_PIN         13
#define I2S_SAMPLE_RATE     12800
#define I2S_CHUNK_SIZE      64
#define I2S_BITS_PER_SAMPLE 32

// Initialize I2S peripheral
esp_err_t i2s_manager_init();

// Shutdown I2S
void i2s_manager_deinit();

// Get I2S channel handle
void* i2s_manager_get_handle();

// Check if I2S is running
bool i2s_manager_is_active();

// Diagnostic: print I2S status
void i2s_manager_print_status();

#endif  // I2S_MANAGER_H
```

### firmware/src/audio/i2s_manager.cpp

```cpp
#include "i2s_manager.h"
#include "sample_buffer.h"
#include "dsp_pipeline.h"
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "I2S_MGR";
static i2s_chan_handle_t rx_handle = NULL;
static TaskHandle_t i2s_task_handle = NULL;
static bool i2s_active = false;

// Task that reads I2S chunks and feeds to circular buffer
static void i2s_acquisition_task(void* param) {
    uint32_t bytes_read = 0;
    uint32_t raw_samples[I2S_CHUNK_SIZE];
    float processed_samples[I2S_CHUNK_SIZE];

    const float scale_factor = 1.0f / 131072.0f;  // 18-bit max value

    while (i2s_active) {
        // Read from I2S peripheral
        esp_err_t ret = i2s_channel_read(rx_handle,
                                          raw_samples,
                                          I2S_CHUNK_SIZE * sizeof(uint32_t),
                                          &bytes_read,
                                          portMAX_DELAY);

        if (ret == ESP_OK && bytes_read > 0) {
            int samples_read = bytes_read / sizeof(uint32_t);

            // Convert raw 32-bit aligned samples to float
            for (int i = 0; i < samples_read; i++) {
                // Extract 18-bit signed value (bits 17-0)
                int32_t raw = (int32_t)raw_samples[i];
                int32_t value = (raw >> 14) & 0x3FFFF;  // 18-bit mask

                // Apply DC offset calibration (empirically derived)
                value += 7000;

                // Clip to valid range
                value = (value > 131072) ? 131072 : (value < -131072) ? -131072 : value;
                value -= 360;  // Empirical offset

                // Convert to float [-1.0, 1.0]
                processed_samples[i] = (float)value * scale_factor;
            }

            // Pre-process: DC removal, normalization
            dsp_preprocess_chunk(processed_samples, samples_read);

            // Add to circular buffer
            sample_buffer_write(processed_samples, samples_read);
        } else {
            ESP_LOGW(TAG, "I2S read error: %s", esp_err_to_name(ret));
            vTaskDelay(10 / portTICK_PERIOD_MS);
        }
    }

    vTaskDelete(NULL);
}

esp_err_t i2s_manager_init() {
    ESP_LOGI(TAG, "Initializing I2S...");

    // Initialize sample buffer
    sample_buffer_init();

    // Initialize DSP pipeline (computes window tables)
    dsp_pipeline_init();

    // Get default I2S channel configuration
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_AUTO, I2S_ROLE_MASTER);
    chan_cfg.auto_clear = true;

    // Create RX channel
    ESP_RETURN_ON_ERROR(i2s_new_channel(&chan_cfg, NULL, &rx_handle), TAG);
    ESP_LOGI(TAG, "I2S channel created");

    // Standard mode configuration for SPH0645
    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(I2S_SAMPLE_RATE * I2S_BITS_PER_SAMPLE),
        .slot_cfg = {
            .data_bit_width = I2S_DATA_BIT_WIDTH_32BIT,
            .slot_bit_width = I2S_SLOT_BIT_WIDTH_32BIT,
            .slot_mode = I2S_SLOT_MODE_STEREO,  // Hardware delivers stereo
            .slot_mask = I2S_STD_SLOT_RIGHT,    // Use RIGHT channel (SEL=GND)
            .ws_width = I2S_SLOT_BIT_WIDTH_32BIT,
            .ws_pol = true,
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

    // Initialize I2S standard mode
    ESP_RETURN_ON_ERROR(i2s_channel_init_std_mode(rx_handle, &std_cfg), TAG);
    ESP_LOGI(TAG, "I2S standard mode configured");

    // Enable the channel
    ESP_RETURN_ON_ERROR(i2s_channel_enable(rx_handle), TAG);
    ESP_LOGI(TAG, "I2S channel enabled");

    i2s_active = true;

    // Create I2S acquisition task on Core 0
    BaseType_t ret = xTaskCreatePinnedToCore(
        i2s_acquisition_task,
        "i2s_acq",
        2048,                           // Stack size
        NULL,                           // Parameter
        configMAX_PRIORITIES - 2,       // Priority
        &i2s_task_handle,
        0                               // Core 0
    );

    if (ret != pdPASS) {
        ESP_LOGE(TAG, "Failed to create I2S task");
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "I2S acquisition task created");

    return ESP_OK;
}

void i2s_manager_deinit() {
    if (!i2s_active) return;

    i2s_active = false;

    // Wait for task to complete
    if (i2s_task_handle) {
        vTaskDelay(100 / portTICK_PERIOD_MS);
    }

    // Disable and delete I2S channel
    if (rx_handle) {
        i2s_channel_disable(rx_handle);
        i2s_del_channel(rx_handle);
        rx_handle = NULL;
    }

    ESP_LOGI(TAG, "I2S shutdown complete");
}

void* i2s_manager_get_handle() {
    return (void*)rx_handle;
}

bool i2s_manager_is_active() {
    return i2s_active && (sample_buffer_get_total() > 0);
}

void i2s_manager_print_status() {
    ESP_LOGI(TAG, "I2S Status:");
    ESP_LOGI(TAG, "  Active: %s", i2s_active ? "YES" : "NO");
    ESP_LOGI(TAG, "  Buffer write idx: %d / %d", sample_buffer_get_write_idx(), 4096);
    ESP_LOGI(TAG, "  Total samples: %lu", sample_buffer_get_total());
    ESP_LOGI(TAG, "  Sample rate: %d Hz", I2S_SAMPLE_RATE);
    ESP_LOGI(TAG, "  Chunk size: %d samples", I2S_CHUNK_SIZE);
}
```

---

## Template 4: Updated main.cpp

Integration point for I2S and Core 0/1 split.

### firmware/src/main.cpp (modified sections)

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

#include "types.h"
#include "led_driver.h"
#include "profiler.h"

// Audio subsystem includes
#ifdef USE_REAL_AUDIO
#include "audio/i2s_manager.h"
#include "audio/sample_buffer.h"
#include "audio/config.h"
#else
#include "audio_stubs.h"
#endif

#include "parameters.h"
#include "pattern_registry.h"
#include "generated_patterns.h"
#include "webserver.h"

// ... WiFi config ...

// Global LED buffer
CRGBF leds[NUM_LEDS];

// ============================================================
// CORE 0: Audio Processing Task
// ============================================================

#ifdef USE_REAL_AUDIO

static void audio_analysis_task(void* param) {
    // Initialize audio subsystem constants
    init_tempo_goertzel_constants();
    init_goertzel_constants_musical();

    uint32_t last_log = millis();

    while (1) {
        // Update periodically (tied to novelty update rate)
        vTaskDelay(10 / portTICK_PERIOD_MS);

        if (i2s_manager_is_active()) {
            // Update tempo and spectral analysis (tempo.h functions)
            update_novelty();
            update_tempo();

            // Periodically log status
            if (millis() - last_log > 5000) {
                Serial.printf("[AUDIO] Buffer: %d, Samples: %lu, Tempi max: %.3f\n",
                              sample_buffer_get_write_idx(),
                              sample_buffer_get_total(),
                              tempi[NUM_TEMPI/2].magnitude);
                last_log = millis();
            }
        }
    }
}

#endif  // USE_REAL_AUDIO

// ============================================================
// SETUP (runs on Core 1)
// ============================================================

void setup() {
    Serial.begin(2000000);
    delay(500);
    Serial.println("\n\n=== K1.reinvented Starting ===");

    // Initialize LED driver
    Serial.println("Initializing LED driver...");
    init_rmt_driver();

    // Initialize WiFi
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    int wifi_attempts = 0;
    while (WiFi.status() != WL_CONNECTED && wifi_attempts < 20) {
        delay(100);
        Serial.print(".");
        wifi_attempts++;
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("Connected! IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("WiFi connection failed (continuing offline)");
    }

    // Initialize OTA
    ArduinoOTA.setHostname("k1-reinvented");
    ArduinoOTA.begin();

    // Initialize audio subsystem
#ifdef USE_REAL_AUDIO
    Serial.println("Initializing real audio (I2S)...");
    if (i2s_manager_init() != ESP_OK) {
        Serial.println("ERROR: I2S initialization failed!");
        // Could fallback to stubs here
    }

    // Create audio analysis task on Core 0
    Serial.println("Creating audio analysis task on Core 0...");
    xTaskCreatePinnedToCore(
        audio_analysis_task,
        "audio_analysis",
        4096,                       // Stack
        NULL,
        configMAX_PRIORITIES - 2,   // High priority
        NULL,
        0                           // Core 0
    );
#else
    Serial.println("Initializing audio stubs...");
    init_audio_stubs();
#endif

    // Initialize parameter system
    Serial.println("Initializing parameters...");
    init_params();

    // Initialize pattern registry
    Serial.println("Initializing pattern registry...");
    init_pattern_registry();
    Serial.printf("  Loaded %d patterns\n", g_num_patterns);
    Serial.printf("  Starting pattern: %s\n", get_current_pattern().name);

    // Initialize web server
    Serial.println("Initializing web server...");
    init_webserver();

    Serial.println("Ready!");
}

// ============================================================
// MAIN LOOP (runs on Core 1 @ ~60 FPS)
// ============================================================

void loop() {
    // Handle OTA updates
    ArduinoOTA.handle();

    // Update audio stubs if not using real audio
#ifndef USE_REAL_AUDIO
    update_audio_stubs();
#endif

    // Track time for animation
    static uint32_t start_time = millis();
    float time = (millis() - start_time) / 1000.0f;

    // Get current parameters (thread-safe read)
    const PatternParameters& params = get_params();

    // Draw current pattern with runtime parameters
    draw_current_pattern(time, params);

    // Transmit to LEDs via RMT
    transmit_leds();

    // Track FPS
    watch_cpu_fps();
    print_fps();
}
```

---

## Template 5: audio_state.h

Shared state structure for inter-core communication.

### firmware/src/audio/audio_state.h

```cpp
#ifndef AUDIO_STATE_H
#define AUDIO_STATE_H

#include <stdint.h>
#include <string.h>
#include "audio_stubs.h"  // For NUM_FREQS, NUM_TEMPI, chromagram size

typedef struct {
    // Spectrum analysis (Core 0 updates, Core 1 reads)
    float spectrogram[NUM_FREQS];
    float spectrogram_smooth[NUM_FREQS];

    // Beat detection (Core 0 updates, Core 1 reads)
    struct tempo tempi[NUM_TEMPI];
    float tempi_smooth[NUM_TEMPI];
    float tempo_confidence;

    // Pitch class energy (Core 0 updates, Core 1 reads)
    float chromagram[12];

    // Overall level (Core 0 updates, Core 1 reads)
    float audio_level;

    // Synchronization counter
    volatile uint32_t update_counter;
} AudioState;

// Global shared state
extern volatile AudioState g_audio_state;

// Atomically read full audio state (Core 1)
inline void audio_state_read(AudioState* dest) {
    do {
        dest->update_counter = g_audio_state.update_counter;

        // Copy all data
        memcpy((void*)&dest->spectrogram,
               (void*)&g_audio_state.spectrogram,
               sizeof(AudioState) - sizeof(uint32_t));
    } while (dest->update_counter != g_audio_state.update_counter);
}

// Atomically update full audio state (Core 0)
inline void audio_state_write(const AudioState* src) {
    memcpy((void*)&g_audio_state.spectrogram,
           (void*)&src->spectrogram,
           sizeof(AudioState) - sizeof(uint32_t));

    // Increment counter to signal update
    g_audio_state.update_counter++;
}

#endif  // AUDIO_STATE_H
```

---

## Template 6: integration_test.cpp

Diagnostic sketch to verify audio pipeline.

### firmware/src/integration_test.cpp (optional, for testing)

```cpp
// Integration test: compile with main.cpp to verify audio pipeline
// Uncomment #define TEST_MODE in main.cpp

#ifdef TEST_MODE

#include "audio/i2s_manager.h"
#include "audio/sample_buffer.h"
#include "audio/config.h"

void test_i2s_acquisition() {
    Serial.println("\n=== I2S ACQUISITION TEST ===");

    uint32_t start = millis();
    uint32_t last_idx = 0;

    for (int i = 0; i < 10; i++) {
        vTaskDelay(100 / portTICK_PERIOD_MS);

        uint16_t current_idx = sample_buffer_get_write_idx();
        uint32_t total = sample_buffer_get_total();

        Serial.printf("  Iter %d: idx=%d, total=%lu, delta=%d samples\n",
                      i, current_idx, total, current_idx - last_idx);

        last_idx = current_idx;
    }

    float elapsed_sec = (millis() - start) / 1000.0f;
    uint32_t expected_samples = (uint32_t)(12800 * elapsed_sec);  // 12.8 kHz

    Serial.printf("Elapsed: %.2f sec, Expected: %lu samples, Got: %lu\n",
                  elapsed_sec, expected_samples, sample_buffer_get_total());

    if (sample_buffer_get_total() > expected_samples * 0.9f) {
        Serial.println("PASS: I2S acquisition working");
    } else {
        Serial.println("FAIL: I2S acquisition not meeting sample rate");
    }
}

void test_spectrum() {
    Serial.println("\n=== SPECTRUM TEST ===");

    for (int i = 0; i < 3; i++) {
        vTaskDelay(500 / portTICK_PERIOD_MS);

        Serial.print("  Spectrum[0-7]: ");
        for (int j = 0; j < 8; j++) {
            Serial.printf("%.3f ", spectrogram[j]);
        }
        Serial.println();
    }

    Serial.println("PASS: Spectrum data available");
}

void test_beat() {
    Serial.println("\n=== BEAT DETECTION TEST ===");

    uint16_t beat_bin = find_closest_tempo_bin(120.0f);  // 120 BPM
    Serial.printf("120 BPM tempo bin: %d\n", beat_bin);

    for (int i = 0; i < 3; i++) {
        vTaskDelay(500 / portTICK_PERIOD_MS);

        Serial.printf("  Bin %d: mag=%.3f, beat=%.3f, phase=%.3f, confidence=%.3f\n",
                      beat_bin,
                      tempi[beat_bin].magnitude,
                      tempi[beat_bin].beat,
                      tempi[beat_bin].phase,
                      tempo_confidence);
    }

    Serial.println("PASS: Beat detection working");
}

void run_integration_tests() {
    vTaskDelay(2000 / portTICK_PERIOD_MS);  // Wait for audio to initialize

    if (!i2s_manager_is_active()) {
        Serial.println("ERROR: I2S not active!");
        return;
    }

    test_i2s_acquisition();
    test_spectrum();
    test_beat();

    Serial.println("\n=== ALL TESTS COMPLETE ===\n");
}

#endif  // TEST_MODE
```

---

## Build Configuration Examples

### platformio.ini - Complete Configuration

```ini
[platformio]
default_envs = esp32-s3-devkitc-1-audio

; Testing environment (audio stubs, no microphone required)
[env:esp32-s3-devkitc-1-stubs]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
upload_speed = 2000000
monitor_speed = 2000000

build_flags =
    -Os
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DCORE_DEBUG_LEVEL=1
    ; NOTE: No -DUSE_REAL_AUDIO (uses stubs)

lib_deps =
    ArduinoOTA
    https://github.com/me-no-dev/ESPAsyncWebServer.git
    https://github.com/me-no-dev/AsyncTCP.git
    bblanchon/ArduinoJson@^6.21.4

; Production environment (real audio, requires SPH0645 microphone)
[env:esp32-s3-devkitc-1-audio]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
upload_speed = 2000000
monitor_speed = 2000000

build_flags =
    -Os
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DCORE_DEBUG_LEVEL=1
    -DUSE_REAL_AUDIO  ; Enable real I2S audio

lib_deps =
    ArduinoOTA
    https://github.com/me-no-dev/ESPAsyncWebServer.git
    https://github.com/me-no-dev/AsyncTCP.git
    bblanchon/ArduinoJson@^6.21.4
    espressif/esp-dsp@^1.4.0  ; Vector DSP operations

board_build.partitions = partitions.csv
```

---

## Compilation & Testing Checklist

### Build Commands

```bash
# Build with audio stubs (no hardware required)
pio run -e esp32-s3-devkitc-1-stubs

# Build with real audio (requires SPH0645)
pio run -e esp32-s3-devkitc-1-audio

# Upload (OTA)
pio run -e esp32-s3-devkitc-1-audio --upload-port k1-reinvented.local

# Monitor serial output
pio device monitor -p /dev/ttyUSB0 -b 2000000
```

### Expected Serial Output (Phase 1)

```
=== K1.reinvented Starting ===
Initializing LED driver...
Connecting to WiFi...
Connected! IP: 192.168.1.100
Initializing real audio (I2S)...
I2S(I,I2S_NUM_0): DMA Rx channel created
I2S channel created
I2S standard mode configured
I2S channel enabled
I2S acquisition task created
Creating audio analysis task on Core 0...
Initializing parameters...
Initializing pattern registry...
  Loaded 5 patterns
  Starting pattern: test_beat_spectrum
Initializing web server...
Ready!

[AUDIO] Buffer: 256, Samples: 1280, Tempi max: 0.234
[AUDIO] Buffer: 512, Samples: 3840, Tempi max: 0.421
[AUDIO] Buffer: 768, Samples: 6400, Tempi max: 0.512
```

---

**Next Step:** Start with sample_buffer.h/cpp implementation
**Estimated Time:** 30 minutes per template file

