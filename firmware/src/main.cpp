#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPIFFS.h>

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
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());

    ArduinoOTA.begin();

    if (!network_services_started) {
        Serial.println("Initializing web server...");
        init_webserver();
        
        Serial.println("Initializing CPU monitor...");
        cpu_monitor.init();
        
        network_services_started = true;
    }

    Serial.printf("  Control UI: http://%s.local/\n", ArduinoOTA.getHostname());
}

void handle_wifi_disconnected() {
    connection_logf("WARN", "WiFi disconnected callback");
    Serial.println("WiFi connection lost, attempting recovery...");
}

// ============================================================================
// AUDIO TASK - COMMENTED OUT (unused dual-core remnant)
// ============================================================================
// This function was designed for Core 1 execution but xTaskCreatePinnedToCore()
// was never called. Audio pipeline now runs in main loop with ring buffer.
// Keeping for reference / test files that depend on it.
/*
void audio_task(void* param) {
    // Audio runs independently from rendering
    // This task handles:
    // - Microphone sample acquisition (I2S, blocking)
    // - Goertzel frequency analysis (CPU-intensive)
    // - Chromagram computation (light)
    // - Beat detection and tempo tracking
    // - Buffer synchronization (mutexes)

    while (true) {
        // Process audio chunk
        acquire_sample_chunk();        // Blocks on I2S if needed (acceptable here)
        calculate_magnitudes();        // ~15-25ms Goertzel computation
        get_chromagram();              // ~1ms pitch aggregation

        // BEAT DETECTION PIPELINE (NEW - FIX FOR TEMPO_CONFIDENCE)
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

        // CRITICAL FIX: SYNC TEMPO MAGNITUDE AND PHASE ARRAYS
        // Copy per-tempo-bin magnitude and phase data from tempo calculation to audio snapshot
        // This enables Tempiscope and Beat_Tunnel patterns to access individual tempo bin data
        extern tempo tempi[NUM_TEMPI];  // From tempo.cpp (64 tempo hypotheses)
        for (uint16_t i = 0; i < NUM_TEMPI; i++) {
            audio_back.tempo_magnitude[i] = tempi[i].magnitude;  // 0.0-1.0 per bin
            audio_back.tempo_phase[i] = tempi[i].phase;          // -π to +π per bin
        }

        // Buffer synchronization
        finish_audio_frame();          // ~0-5ms buffer swap

        // Debug output (optional)
        // print_audio_debug();  // Comment out to reduce serial traffic

        // CRITICAL FIX: Reduce artificial throttle
        // Changed from 10ms to 1ms to increase audio processing rate
        // Before: 20-25 Hz audio (35-55ms latency)
        // After: 40-50 Hz audio (25-45ms latency)
        // 1ms yield prevents CPU starvation while allowing faster audio updates
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}
*/

// ============================================================================
// SETUP - Initialize hardware, create tasks
// ============================================================================
void setup() {
    Serial.begin(2000000);
    Serial.println("\n\n=== K1.reinvented Starting ===");

    // Initialize LED driver
    Serial.println("Initializing LED driver...");
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
        Serial.println("OTA Update starting...");
    });
    ArduinoOTA.onEnd([]() {
        Serial.println("\nOTA Update complete!");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

    // SPIFFS enumeration REMOVED - was blocking startup 100-500ms
    // Initialize SPIFFS silently and defer enumeration to background task
    Serial.println("Initializing SPIFFS...");
    if (!SPIFFS.begin(true)) {
        Serial.println("ERROR: SPIFFS initialization failed - web UI will not be available");
    } else {
        Serial.println("SPIFFS mounted successfully");
        // Lazy enumeration removed; can be added to status endpoint if needed
    }

    // Initialize audio stubs (demo audio-reactive globals)
    Serial.println("Initializing audio-reactive stubs...");
    init_audio_stubs();

    // Initialize SPH0645 microphone I2S input
    Serial.println("Initializing SPH0645 microphone...");
    init_i2s_microphone();

    // PHASE 1: Initialize audio data synchronization (double-buffering)
    Serial.println("Initializing audio data sync...");
    init_audio_data_sync();

    // Initialize Goertzel DFT constants and window function
    Serial.println("Initializing Goertzel DFT...");
    init_window_lookup();
    init_goertzel_constants_musical();

    // Initialize tempo detection (beat detection pipeline)
    Serial.println("Initializing tempo detection...");
    init_tempo_goertzel_constants();

    // Initialize parameter system
    Serial.println("Initializing parameters...");
    init_params();

    // Initialize pattern registry
    Serial.println("Initializing pattern registry...");
    init_pattern_registry();
    Serial.printf("  Loaded %d patterns\n", g_num_patterns);
    Serial.printf("  Starting pattern: %s\n", get_current_pattern().name);

    // ========================================================================
    // AUDIO PIPELINE CONFIGURATION
    // ========================================================================
    // Audio processing runs in main loop with ring buffer at 8ms cadence
    // - 16kHz sample rate, 128-sample chunks
    // - Goertzel FFT processing on 8ms boundary
    // - Double-buffered audio_front/audio_back (lock-free reads from Core 0)
    // - WiFi/OTA isolated on future Core 1 task (coming in next phase)
    // ========================================================================
    Serial.println("Audio pipeline: ring buffer mode (16kHz, 128-chunk, 8ms cadence)");

    Serial.println("Ready!");
    Serial.println("Upload new effects with:");
    Serial.printf("  pio run -t upload --upload-port %s.local\n", ArduinoOTA.getHostname());
}

// ============================================================================
// MAIN LOOP - Runs on Core 0 @ 200+ FPS (pattern rendering only)
// ============================================================================
void loop() {
    // Core 0 main loop: pure pattern rendering without blocking

    wifi_monitor_loop();  // Non-blocking WiFi status check (will move to Core 1)
    ArduinoOTA.handle();  // Non-blocking OTA polling (will move to Core 1)

    // ========================================================================
    // AUDIO PROCESSING: Synchronized to I2S DMA cadence
    // ========================================================================
    // I2S configuration (16kHz, 128-chunk) naturally produces chunks every 8ms
    // acquire_sample_chunk() blocks on portMAX_DELAY until next chunk ready
    // This is the synchronization mechanism - no explicit timing needed
    // DMA continuously buffers, so the block is brief (~<1ms typical)
    // AP and VP decoupled: AP produces chunks at 125 Hz, VP reads latest available
    // ========================================================================
    run_audio_pipeline_once();

    // CLUTTER REMOVED: Telemetry broadcast at 10Hz (add flag later if needed)
    // Removed: cpu_monitor.update(), broadcast_realtime_data()
    // Can be re-enabled with #define ENABLE_TELEMETRY

    // Track time for animation
    static uint32_t start_time = millis();
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
}
// All patterns are included from generated_patterns.h

static inline void run_audio_pipeline_once() {
    // Acquire and process audio chunk
    // portMAX_DELAY in acquire_sample_chunk() blocks until I2S data ready
    // This synchronization happens naturally via DMA, no explicit timing needed
    acquire_sample_chunk();
    calculate_magnitudes();
    get_chromagram();

    // Beat detection pipeline
    float peak_energy = 0.0f;
    for (int i = 0; i < NUM_FREQS; i++) {
        peak_energy = fmaxf(peak_energy, audio_back.spectrogram[i]);
    }
    update_novelty_curve(peak_energy);
    smooth_tempi_curve();
    detect_beats();

    // Sync tempo confidence and per-bin data to snapshot
    extern float tempo_confidence;
    audio_back.tempo_confidence = tempo_confidence;
    extern tempo tempi[NUM_TEMPI];
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = tempi[i].magnitude;
        audio_back.tempo_phase[i] = tempi[i].phase;
    }

    // Commit audio frame
    finish_audio_frame();
}