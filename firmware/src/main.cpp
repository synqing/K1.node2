#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPIFFS.h>

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

// Configuration (hardcoded for Phase A simplicity)
#define WIFI_SSID "VX220-013F"
#define WIFI_PASS "3232AA90E0F24"
// NUM_LEDS and LED_DATA_PIN are defined in led_driver.h

// Global LED buffer
CRGBF leds[NUM_LEDS];

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
// AUDIO TASK - CORE 1 AUDIO PROCESSING (ACTIVATED)
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
        // Process audio chunk (I2S blocking isolated to Core 1)
        acquire_sample_chunk();        // Blocks on I2S if needed (acceptable here)
        calculate_magnitudes();        // ~15-25ms Goertzel computation
        get_chromagram();              // ~1ms pitch aggregation

        // BEAT DETECTION PIPELINE
        // Calculate spectral novelty as peak energy in current frame
        float peak_energy = 0.0f;
        for (int i = 0; i < NUM_FREQS; i++) {
            peak_energy = fmaxf(peak_energy, audio_back.spectrogram[i]);
        }

        // Update novelty curve with spectral peak
        update_novelty_curve(peak_energy);

        // Smooth tempo magnitudes and detect beats
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

        // Lock-free buffer synchronization with Core 0
        finish_audio_frame();          // ~0-5ms buffer swap

        // Yield to prevent CPU starvation
        // 1ms yield allows 40-50 Hz audio processing rate
        vTaskDelay(pdMS_TO_TICKS(1));
    }
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

    wifi_monitor_loop();  // WiFi status monitoring
    ArduinoOTA.handle();  // OTA update handling
    
    // Optional: CPU monitoring and telemetry
    // Can be re-enabled with #define ENABLE_TELEMETRY
    // cpu_monitor.update();
    // broadcast_realtime_data();
    
    // Small delay to prevent tight loop
    delay(10);
}

#endif  // UNIT_TEST

// All patterns are included from generated_patterns.h
// Audio processing now handled by dedicated audio_task on Core 1