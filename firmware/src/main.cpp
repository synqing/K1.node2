#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPIFFS.h>
// Prefer real ESP-IDF UART header; fall back to editor-only stubs if unavailable
#if __has_include(<driver/uart.h>)
#  include <driver/uart.h>
#else
#  include <stddef.h>
#  include <stdint.h>
   typedef int esp_err_t;
   typedef int uart_port_t;
#  ifndef ESP_OK
#    define ESP_OK 0
#  endif
#  ifndef UART_NUM_1
#    define UART_NUM_1 1
#  endif
#  ifndef UART_PIN_NO_CHANGE
#    define UART_PIN_NO_CHANGE (-1)
#  endif
   typedef struct { int dummy; } uart_config_t;
   // Minimal prototypes referenced in gated UART sync code
   esp_err_t uart_driver_install(uart_port_t, int, int, int, void*, int);
   esp_err_t uart_param_config(uart_port_t, const uart_config_t*);
   esp_err_t uart_set_pin(uart_port_t, int, int, int, int);
   int uart_write_bytes(uart_port_t, const char*, size_t);
#endif

// Skip main setup/loop during unit tests (tests provide their own)
#ifndef UNIT_TEST

#include "types.h"
#include "led_driver.h"
#include "profiler.h"
#include "audio/goertzel.h"  // Audio system globals, struct definitions, initialization, DFT computation
#include "audio/tempo.h"     // Beat detection and tempo tracking pipeline
#include "audio/microphone.h"  // REAL SPH0645 I2S MICROPHONE INPUT
#include "palettes.h"
#include "easing_functions.h"
#include "parameters.h"
#include "pattern_registry.h"
#include "generated_patterns.h"
#include "webserver.h"
#include "cpu_monitor.h"
#include "connection_state.h"
#include "wifi_monitor.h"
#include "logging/logger.h"
#include "beat_events.h"
#include "diagnostics.h"
#include "led_driver.h"   // Declare init_rmt_driver()
#include "audio/tempo.h"  // For tempo_confidence, tempi_power_sum
#include "audio/goertzel.h" // For spectrogram[]

// Configuration (hardcoded for Phase A simplicity)
// Updated per user request
// SSID: VX220-013F
// Password: 3232AA90E0F24
#define WIFI_SSID "VX220-013F"
#define WIFI_PASS "3232AA90E0F24"
#define BEAT_EVENTS_DIAG 0
// NUM_LEDS and LED_DATA_PIN are defined in led_driver.h

// ============================================================================
// UART DAISY CHAIN CONFIGURATION
// ============================================================================
#define UART_NUM UART_NUM_1
#define UART_TX_PIN 38  // GPIO 38 -> Secondary RX (GPIO 44)
#define UART_RX_PIN 37  // GPIO 37 <- Secondary TX (GPIO 43)
#define UART_BAUD 115200

// Global LED buffer
CRGBF leds[NUM_LEDS];

// Global beat event rate limiter (shared across audio paths)
static uint32_t g_last_beat_event_ms = 0;

// Forward declaration for single-core audio pipeline helper
static inline void run_audio_pipeline_once();

static bool network_services_started = false;

void handle_wifi_connected() {
    connection_logf("INFO", "WiFi connected callback fired");
    LOG_INFO(TAG_WIFI, "Connected! IP: %s", WiFi.localIP().toString().c_str());

    ArduinoOTA.begin();

    if (!network_services_started) {
        LOG_INFO(TAG_WEB, "Initializing web server...");
        init_webserver();

        LOG_INFO(TAG_CORE0, "Initializing CPU monitor...");
        cpu_monitor.init();

        network_services_started = true;
    }

    LOG_INFO(TAG_WEB, "Control UI: http://%s.local", ArduinoOTA.getHostname());
}

void handle_wifi_disconnected() {
    connection_logf("WARN", "WiFi disconnected callback");
    LOG_WARN(TAG_WIFI, "WiFi connection lost, attempting recovery...");
}

// ============================================================================
// UART DAISY CHAIN - SYNCHRONIZE SECONDARY DEVICE (s3z)
// ============================================================================
#if ENABLE_UART_SYNC
void init_uart_sync() {
    uart_config_t uart_config = {
        .baud_rate = UART_BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .rx_flow_ctrl_thresh = 0,
        .source_clk = UART_SCLK_DEFAULT,
    };

    uart_param_config(UART_NUM, &uart_config);
    uart_set_pin(UART_NUM, UART_TX_PIN, UART_RX_PIN,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    uart_driver_install(UART_NUM, 256, 0, 0, NULL, 0);

    Serial.println("UART1 initialized for s3z daisy chain sync");
}
#endif

#if ENABLE_UART_SYNC
void send_uart_sync_frame() {
    static uint32_t last_frame = 0;
    static uint32_t packets_sent = 0;
    uint32_t current_frame = FRAMES_COUNTED;

    // Only send if frame number changed
    if (current_frame == last_frame) {
        return;
    }

    // Build 6-byte packet
    // [0xAA] [FRAME_HI] [FRAME_LO] [PATTERN_ID] [BRIGHTNESS] [CHECKSUM]
    uint8_t packet[6];
    packet[0] = 0xAA;                              // Sync byte
    packet[1] = (current_frame >> 8) & 0xFF;      // Frame HI
    packet[2] = current_frame & 0xFF;             // Frame LO
    packet[3] = g_current_pattern_index;          // Pattern ID (extern from pattern_registry.h)
    packet[4] = (uint8_t)(get_params().brightness * 255);  // Brightness

    // Compute XOR checksum
    uint8_t checksum = packet[0];
    for (int i = 1; i < 5; i++) {
        checksum ^= packet[i];
    }
    packet[5] = checksum;

    // Send via UART1
    int bytes_written = uart_write_bytes(UART_NUM, (const char*)packet, 6);
    packets_sent++;

    // Debug output every 200 packets (~4.7 seconds at 42 FPS)
    if (packets_sent % 200 == 0) {
        Serial.printf("UART: Sent %lu packets (frame %lu, last write %d bytes)\n",
            packets_sent, current_frame, bytes_written);
    }

    last_frame = current_frame;
}
#else
// No-op when UART sync is disabled
static inline void send_uart_sync_frame() {}
#endif

// ============================================================================
// AUDIO TASK - Runs on Core 1 @ ~100 Hz (audio processing only)
// ============================================================================
// This function runs on Core 1 and handles all audio processing
// - Microphone sample acquisition (I2S, blocking - isolated to Core 1)
// - Goertzel frequency analysis (CPU-intensive)
// - Chromagram computation (pitch class analysis)
// - Beat detection and tempo tracking
// - Lock-free buffer synchronization with Core 0
void audio_task(void* param) {
    LOG_INFO(TAG_CORE1, "AUDIO_TASK Starting on Core 1");
    
    while (true) {
        // If audio reactivity is disabled, invalidate snapshot and idle
        if (!EMOTISCOPE_ACTIVE) {
            memset(audio_back.spectrogram, 0, sizeof(float) * NUM_FREQS);
            memset(audio_back.spectrogram_smooth, 0, sizeof(float) * NUM_FREQS);
            memset(audio_back.chromagram, 0, sizeof(float) * 12);
            audio_back.vu_level = 0.0f;
            audio_back.vu_level_raw = 0.0f;
            memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
            memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
            audio_back.tempo_confidence = 0.0f;
            audio_back.is_valid = false;
            audio_back.timestamp_us = micros();
            commit_audio_data();
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }

        // Process audio chunk (I2S blocking isolated to Core 1)
        acquire_sample_chunk();        // Blocks on I2S if needed (acceptable here)
        calculate_magnitudes();        // ~15-25ms Goertzel computation
        get_chromagram();              // ~1ms pitch aggregation

        // BEAT DETECTION PIPELINE
        // Calculate spectral novelty as peak energy in current frame
        // Use live spectrogram (just computed) instead of stale audio_back buffer
        float peak_energy = 0.0f;
        for (int i = 0; i < NUM_FREQS; i++) {
            peak_energy = fmaxf(peak_energy, spectrogram[i]);
        }

        // Update novelty curve with spectral peak
        update_novelty_curve(peak_energy);

        // Smooth tempo magnitudes and detect beats
        beat_events_probe_start();      // Start latency probe for audio→event
        smooth_tempi_curve();           // ~2-5ms tempo magnitude calculation
        detect_beats();                 // ~1ms beat confidence calculation

        // SYNC TEMPO CONFIDENCE TO AUDIO SNAPSHOT
        // Copy calculated tempo_confidence to audio_back so patterns can access it
        extern float tempo_confidence;  // From tempo.cpp
        audio_back.tempo_confidence = tempo_confidence;

        // SYNC TEMPO MAGNITUDE AND PHASE ARRAYS
        // Copy per-tempo-bin magnitude and phase data from tempo calculation to audio snapshot
        // This enables Tempiscope and Beat_Tunnel patterns to access individual tempo bin data
        extern tempo tempi[NUM_TEMPI];  // From tempo.cpp (64 tempo hypotheses)
        for (uint16_t i = 0; i < NUM_TEMPI; i++) {
            audio_back.tempo_magnitude[i] = tempi[i].magnitude;  // 0.0-1.0 per bin
            audio_back.tempo_phase[i] = tempi[i].phase;          // -π to +π per bin
        }

        // Beat event stub: push to ring buffer when confidence passes threshold
        {
            uint32_t now_ms = millis();
            extern float tempo_confidence;  // From tempo.cpp
            // TEMP diagnostic: lower threshold and widen spacing to validate end-to-end chain
            const float threshold = 0.10f;   // temporarily lowered to validate chain
            const uint32_t min_spacing_ms = 150; // allow more frequent events
            if (tempo_confidence > threshold && (now_ms - g_last_beat_event_ms) >= min_spacing_ms) {
                uint32_t ts_us = (uint32_t)esp_timer_get_time();
                uint16_t conf_u16 = (uint16_t)(fminf(tempo_confidence, 1.0f) * 65535.0f);
                bool ok = beat_events_push(ts_us, conf_u16);
                if (!ok) {
                    LOG_WARN(TAG_AUDIO, "Beat event buffer overwrite (capacity reached)");
                }
                g_last_beat_event_ms = now_ms;
            }
            // Always end probe; latency printing is internally rate-limited and disabled by default
            beat_events_probe_end("audio_step");
            // Runtime-gated diagnostics; interval controlled via /api/diag
            static uint32_t last_diag_ms = 0;
            if (diag_is_enabled()) {
                uint32_t interval = diag_get_interval_ms();
                if ((now_ms - last_diag_ms) >= interval) {
                    Serial.printf("[diag] tempo_conf=%.3f power_sum=%.5f\n", tempo_confidence, tempi_power_sum);
                    last_diag_ms = now_ms;
                }
            }
        }

        // Lock-free buffer synchronization with Core 0
        finish_audio_frame();          // ~0-5ms buffer swap

        // Yield to prevent CPU starvation
        // 1ms yield allows 40-50 Hz audio processing rate
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

// ============================================================================
// SINGLE-SHOT AUDIO PIPELINE (used by Core 1 main loop cadence)
// ============================================================================
static inline void run_audio_pipeline_once() {
    // If audio reactivity is disabled, invalidate snapshot and return
    if (!EMOTISCOPE_ACTIVE) {
        memset(audio_back.spectrogram, 0, sizeof(float) * NUM_FREQS);
        memset(audio_back.spectrogram_smooth, 0, sizeof(float) * NUM_FREQS);
        memset(audio_back.chromagram, 0, sizeof(float) * 12);
        audio_back.vu_level = 0.0f;
        audio_back.vu_level_raw = 0.0f;
        memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
        memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
        audio_back.tempo_confidence = 0.0f;
        audio_back.is_valid = false;
        audio_back.timestamp_us = micros();
        commit_audio_data();
        return;
    }

    // Process audio chunk (I2S blocking isolated to Core 1)
    acquire_sample_chunk();        // Blocks on I2S if needed (acceptable here)
    calculate_magnitudes();        // ~15-25ms Goertzel computation
    get_chromagram();              // ~1ms pitch aggregation

    // BEAT DETECTION PIPELINE
    float peak_energy = 0.0f;
    for (int i = 0; i < NUM_FREQS; i++) {
        peak_energy = fmaxf(peak_energy, audio_back.spectrogram[i]);
    }

    update_novelty_curve(peak_energy);
    beat_events_probe_start();     // Start latency probe for audio→event
    smooth_tempi_curve();          // ~2-5ms tempo magnitude calculation
    detect_beats();                // ~1ms beat confidence calculation

    // SYNC TEMPO CONFIDENCE TO AUDIO SNAPSHOT
    extern float tempo_confidence;  // From tempo.cpp
    audio_back.tempo_confidence = tempo_confidence;

    // SYNC TEMPO MAGNITUDE AND PHASE ARRAYS
    extern tempo tempi[NUM_TEMPI];  // From tempo.cpp (64 tempo hypotheses)
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = tempi[i].magnitude;
        audio_back.tempo_phase[i] = tempi[i].phase;
    }

    // Beat event stub: push to ring buffer when confidence high
    {
        uint32_t now_ms = millis();
        extern float tempo_confidence;  // From tempo.cpp
        if (tempo_confidence > 0.60f && (now_ms - g_last_beat_event_ms) >= 100) {
            uint32_t ts_us = (uint32_t)esp_timer_get_time();
            uint16_t conf_u16 = (uint16_t)(fminf(tempo_confidence, 1.0f) * 65535.0f);
            bool ok = beat_events_push(ts_us, conf_u16);
            beat_events_probe_end("audio_to_event");
            if (!ok) {
                LOG_WARN(TAG_AUDIO, "Beat event buffer overwrite (capacity reached)");
            }
            g_last_beat_event_ms = now_ms;
        }
    }

    // Lock-free buffer synchronization with Core 0
    finish_audio_frame();
}

// ============================================================================
// GPU TASK - CORE 0 VISUAL RENDERING (NEW)
// ============================================================================
// This function runs on Core 0 and handles all visual rendering
// - Pattern rendering at 100+ FPS
// - LED transmission via RMT
// - FPS tracking and diagnostics
// - Never waits for audio (reads latest available data)
void loop_gpu(void* param) {
    LOG_INFO(TAG_CORE0, "GPU_TASK Starting on Core 0");
    
    static uint32_t start_time = millis();
    
    for (;;) {
        // Track time for animation
        float time = (millis() - start_time) / 1000.0f;

        // Get current parameters (thread-safe read from active buffer)
        const PatternParameters& params = get_params();

        // BRIGHTNESS BINDING: Synchronize global_brightness with params.brightness
        extern float global_brightness;
        global_brightness = params.brightness;

        // Draw current pattern with audio-reactive data (lock-free read from audio_front)
        draw_current_pattern(time, params);

        // Transmit to LEDs via RMT (non-blocking DMA)
        transmit_leds();

        // FPS tracking (minimal overhead)
        watch_cpu_fps();
        print_fps();
        
        // Small yield to prevent watchdog issues
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

// ============================================================================
// SETUP - Initialize hardware, create tasks
// ============================================================================
void setup() {
    Serial.begin(2000000);
    LOG_INFO(TAG_CORE0, "=== K1.reinvented Starting ===");

    // Initialize LED driver
    LOG_INFO(TAG_LED, "Initializing LED driver...");
    init_rmt_driver();

    // Initialize UART for s3z daisy chain sync (gated)
#if ENABLE_UART_SYNC
    Serial.println("Initializing UART daisy chain sync...");
    init_uart_sync();
#endif

    // Configure WiFi link options (defaults retain current stable behavior)
    WifiLinkOptions wifi_opts;
    wifi_opts.force_bg_only = true; // default if NVS missing
    wifi_opts.force_ht20 = true;    // default if NVS missing
    wifi_monitor_load_link_options_from_nvs(wifi_opts);
    wifi_monitor_set_link_options(wifi_opts);

    // Initialize WiFi monitor/state machine
    wifi_monitor_on_connect(handle_wifi_connected);
    wifi_monitor_on_disconnect(handle_wifi_disconnected);
    wifi_monitor_init(WIFI_SSID, WIFI_PASS);

    // Initialize OTA
    ArduinoOTA.setHostname("k1-reinvented");
    ArduinoOTA.onStart([]() {
        LOG_INFO(TAG_CORE0, "OTA Update starting...");
    });
    ArduinoOTA.onEnd([]() {
        LOG_INFO(TAG_CORE0, "OTA Update complete!");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        LOG_DEBUG(TAG_CORE0, "Progress: %u%%", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        const char* error_msg = "Unknown";
        switch (error) {
            case OTA_AUTH_ERROR:    error_msg = "Auth Failed"; break;
            case OTA_BEGIN_ERROR:   error_msg = "Begin Failed"; break;
            case OTA_CONNECT_ERROR: error_msg = "Connect Failed"; break;
            case OTA_RECEIVE_ERROR: error_msg = "Receive Failed"; break;
            case OTA_END_ERROR:     error_msg = "End Failed"; break;
        }
        LOG_ERROR(TAG_CORE0, "OTA Error[%u]: %s", error, error_msg);
    });

    // SPIFFS enumeration REMOVED - was blocking startup 100-500ms
    // Initialize SPIFFS silently and defer enumeration to background task
    LOG_INFO(TAG_CORE0, "Initializing SPIFFS...");
    if (!SPIFFS.begin(true)) {
        LOG_ERROR(TAG_CORE0, "SPIFFS initialization failed - web UI will not be available");
    } else {
        LOG_INFO(TAG_CORE0, "SPIFFS mounted successfully");
        // Lazy enumeration removed; can be added to status endpoint if needed
    }

    // Initialize audio stubs (demo audio-reactive globals)
    LOG_INFO(TAG_AUDIO, "Initializing audio-reactive stubs...");
    init_audio_stubs();

    // Initialize SPH0645 microphone I2S input
    LOG_INFO(TAG_I2S, "Initializing SPH0645 microphone...");
    init_i2s_microphone();

    // PHASE 1: Initialize audio data synchronization (double-buffering)
    LOG_INFO(TAG_SYNC, "Initializing audio data sync...");
    init_audio_data_sync();

    // Initialize Goertzel DFT constants and window function
    LOG_INFO(TAG_AUDIO, "Initializing Goertzel DFT...");
    init_window_lookup();
    init_goertzel_constants_musical();

    // Initialize tempo detection (beat detection pipeline)
    LOG_INFO(TAG_TEMPO, "Initializing tempo detection...");
    init_tempo_goertzel_constants();

    // Initialize beat event ring buffer and latency probes
    // Capacity 53 ≈ 10s history at ~5.3 beats/sec (p99 combined)
    beat_events_init(53);
    // Tone down latency probe logging: print at most every 5 seconds
    beat_events_set_probe_interval_ms(5000);

    // Initialize parameter system
    LOG_INFO(TAG_CORE0, "Initializing parameters...");
    init_params();

    // Initialize pattern registry
    LOG_INFO(TAG_CORE0, "Initializing pattern registry...");
    init_pattern_registry();
    LOG_INFO(TAG_CORE0, "Loaded %d patterns", g_num_patterns);
    LOG_INFO(TAG_CORE0, "Starting pattern: %s", get_current_pattern().name);

    // ========================================================================
    // DUAL-CORE ARCHITECTURE ACTIVATION
    // ========================================================================
    // Core 0: GPU rendering task (100+ FPS, never blocks)
    // Core 1: Audio processing + network (main loop, can block on I2S)
    // Synchronization: Lock-free double buffer with sequence counters
    // ========================================================================
    LOG_INFO(TAG_CORE0, "Activating dual-core architecture...");

    // Task handles for monitoring
    TaskHandle_t gpu_task_handle = NULL;
    TaskHandle_t audio_task_handle = NULL;

    // Create GPU rendering task on Core 0
    // INCREASED STACK: 12KB -> 16KB (4,288 bytes margin was insufficient)
    BaseType_t gpu_result = xTaskCreatePinnedToCore(
        loop_gpu,           // Task function
        "loop_gpu",         // Task name
        16384,              // Stack size (16KB for LED rendering + pattern complexity)
        NULL,               // Parameters
        1,                  // Priority (same as audio - no preemption preference)
        &gpu_task_handle,   // Task handle for monitoring
        0                   // Pin to Core 0
    );

    // Create audio processing task on Core 1
    // INCREASED STACK: 8KB -> 12KB (1,692 bytes margin was dangerously low)
    BaseType_t audio_result = xTaskCreatePinnedToCore(
        audio_task,         // Task function
        "audio_task",       // Task name
        12288,              // Stack size (12KB for Goertzel + I2S + tempo detection)
        NULL,               // Parameters
        1,                  // Priority (same as GPU)
        &audio_task_handle, // Task handle for monitoring
        1                   // Pin to Core 1
    );

    // Validate task creation (CRITICAL: Must not fail)
    if (gpu_result != pdPASS || gpu_task_handle == NULL) {
        LOG_ERROR(TAG_GPU, "FATAL ERROR: GPU task creation failed!");
        LOG_ERROR(TAG_CORE0, "System cannot continue. Rebooting...");
        delay(5000);
        esp_restart();
    }

    if (audio_result != pdPASS || audio_task_handle == NULL) {
        LOG_ERROR(TAG_AUDIO, "FATAL ERROR: Audio task creation failed!");
        LOG_ERROR(TAG_CORE0, "System cannot continue. Rebooting...");
        delay(5000);
        esp_restart();
    }

    LOG_INFO(TAG_CORE0, "Dual-core tasks created successfully:");
    LOG_INFO(TAG_GPU, "Core 0: GPU rendering (100+ FPS target)");
    LOG_DEBUG(TAG_GPU, "Stack: 16KB (was 12KB, increased for safety)");
    LOG_INFO(TAG_AUDIO, "Core 1: Audio processing + network");
    LOG_DEBUG(TAG_AUDIO, "Stack: 12KB (was 8KB, increased for safety)");
    LOG_DEBUG(TAG_SYNC, "Synchronization: Lock-free with sequence counters + memory barriers");
    LOG_INFO(TAG_CORE0, "Ready!");
    LOG_INFO(TAG_CORE0, "Upload new effects with:");
    LOG_INFO(TAG_CORE0, "pio run -t upload --upload-port %s.local", ArduinoOTA.getHostname());
}

// ============================================================================
// MAIN LOOP - Runs on Core 1 (Network + System Management)
// ============================================================================
void loop() {
    // Core 1 main loop: Network services and system management
    // Audio processing now handled by dedicated audio_task on Core 1
    // Visual rendering now handled by dedicated loop_gpu on Core 0

    // Handle OTA updates (non-blocking check)
    ArduinoOTA.handle();

    // Handle web server (includes WebSocket cleanup)
    handle_webserver();

    // Advance WiFi state machine so callbacks fire and reconnection logic runs
    wifi_monitor_loop();

    // Run audio processing at fixed cadence to avoid throttling render FPS
    static uint32_t last_audio_ms = 0;
    const uint32_t audio_interval_ms = 20; // ~50 Hz audio processing
    uint32_t now_ms = millis();
    if ((now_ms - last_audio_ms) >= audio_interval_ms) {
        run_audio_pipeline_once();
        last_audio_ms = now_ms;
    }

    // Broadcast real-time data to WebSocket clients at 10 Hz
    static uint32_t last_broadcast_ms = 0;
    const uint32_t broadcast_interval_ms = 100; // 10 Hz broadcast rate
    if ((now_ms - last_broadcast_ms) >= broadcast_interval_ms) {
        // Update CPU monitor before broadcasting
        cpu_monitor.update();
        broadcast_realtime_data();
        last_broadcast_ms = now_ms;
    }

    // Drain beat event ring buffer and forward over Serial (USB)
    // Limit per-loop drain to avoid starving other services
    for (int drained = 0; drained < 20 && beat_events_count() > 0; ++drained) {
        BeatEvent ev;
        if (beat_events_pop(&ev)) {
            Serial.printf("BEAT_EVENT ts_us=%lu conf=%u\n", (unsigned long)ev.timestamp_us, (unsigned)ev.confidence);
        } else {
            break;
        }
    }

    // Track time for animation
    static uint32_t start_time = millis();
    float time = (millis() - start_time) / 1000.0f;

    // Get current parameters (thread-safe read from active buffer)
    const PatternParameters& params = get_params();

    // BRIGHTNESS BINDING: Synchronize global_brightness with params.brightness
    // This ensures UI brightness slider changes are reflected in LED output
    extern float global_brightness;  // From led_driver.cpp
    global_brightness = params.brightness;

    // Draw current pattern (reads audio_front updated by Core 1 audio task)
    uint32_t t_render0 = micros();
    draw_current_pattern(time, params);
    ACCUM_RENDER_US += (micros() - t_render0);

    // Transmit to LEDs via RMT (with timeout instead of portMAX_DELAY)
    // Modified transmit_leds() should use pdMS_TO_TICKS(10) timeout
    transmit_leds();

    // Send sync packet to s3z secondary device
    send_uart_sync_frame();

    // Track FPS
    watch_cpu_fps();
    print_fps();
}

#endif  // UNIT_TEST

// All patterns are included from generated_patterns.h
// Audio processing now handled by dedicated audio_task on Core 1
// Gate UART daisy-chain sync behind a feature flag
#ifndef ENABLE_UART_SYNC
#define ENABLE_UART_SYNC 0
#endif
