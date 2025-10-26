#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

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

// Configuration (hardcoded for Phase A simplicity)
#define WIFI_SSID "VX220-013F"
#define WIFI_PASS "3232AA90E0F24"
// NUM_LEDS and LED_DATA_PIN are defined in led_driver.h

// Global LED buffer
CRGBF leds[NUM_LEDS];

// ============================================================================
// AUDIO TASK - Runs on Core 1 @ ~100 Hz (audio processing only)
// ============================================================================
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

// ============================================================================
// SETUP - Initialize hardware, create tasks
// ============================================================================
void setup() {
    Serial.begin(2000000);
    Serial.println("\n\n=== K1.reinvented Starting ===");

    // Initialize LED driver
    Serial.println("Initializing LED driver...");
    init_rmt_driver();

    // Initialize WiFi
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(100);
        Serial.print(".");
    }
    Serial.println();
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());

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
    ArduinoOTA.begin();

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

    // Initialize web server
    Serial.println("Initializing web server...");
    init_webserver();
    Serial.printf("  Control UI: http://%s.local/\n", ArduinoOTA.getHostname());

    // ========================================================================
    // CREATE AUDIO TASK ON CORE 1
    // ========================================================================
    // This task runs independently:
    // - Core 1: Audio processing (100 Hz nominal, 20-25 Hz actual)
    // - Core 0: Pattern rendering (this loop, 200+ FPS target)
    //
    // Memory: 8 KB stack (typical usage 6-7 KB based on Goertzel complexity)
    // Priority: 10 (high, but lower than WiFi stack priority 24)
    // ========================================================================

    BaseType_t audio_task_result = xTaskCreatePinnedToCore(
        audio_task,                    // Function to run
        "K1_Audio",                    // Task name (for debugging)
        8192,                          // Stack size in bytes (8 KB)
        NULL,                          // Task parameter (unused)
        10,                            // Priority (0=lowest, 25=highest for application tasks)
        NULL,                          // Task handle (we don't need it)
        1                              // Core 1 (app runs on Core 1 in Arduino)
    );

    if (audio_task_result != pdPASS) {
        Serial.println("ERROR: Failed to create audio task!");
        // Fall back to single-threaded operation
    } else {
        Serial.println("Audio task created successfully on Core 1");
    }

    Serial.println("Ready!");
    Serial.println("Upload new effects with:");
    Serial.printf("  pio run -t upload --upload-port %s.local\n", ArduinoOTA.getHostname());
}

// ============================================================================
// MAIN LOOP - Runs on Core 0 @ 200+ FPS (pattern rendering only)
// ============================================================================
void loop() {
    // Handle OTA updates (non-blocking check)
    ArduinoOTA.handle();

    // Track time for animation
    static uint32_t start_time = millis();
    float time = (millis() - start_time) / 1000.0f;

    // Get current parameters (thread-safe read from active buffer)
    const PatternParameters& params = get_params();

    // Draw current pattern (reads audio_front updated by Core 1 audio task)
    draw_current_pattern(time, params);

    // Transmit to LEDs via RMT (with timeout instead of portMAX_DELAY)
    // Modified transmit_leds() should use pdMS_TO_TICKS(10) timeout
    transmit_leds();

    // Track FPS
    watch_cpu_fps();
    print_fps();
}
// All patterns are included from generated_patterns.h