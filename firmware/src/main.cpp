#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

#include "types.h"
#include "led_driver.h"
#include "profiler.h"
#include "audio_stubs.h"  // Audio-reactive globals (demo stubs) - MUST come before generated_patterns.h
#include "audio/goertzel.h"  // PHASE 1: Audio data synchronization
#include "audio/microphone.h"  // REAL SPH0645 I2S MICROPHONE INPUT
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
    // - Buffer synchronization (mutexes)

    while (true) {
        // Process audio chunk
        acquire_sample_chunk();        // Blocks on I2S if needed (acceptable here)
        calculate_magnitudes();        // ~15-25ms Goertzel computation
        get_chromagram();              // ~1ms pitch aggregation
        finish_audio_frame();          // ~0-5ms buffer swap

        // Debug output (optional)
        // print_audio_debug();  // Comment out to reduce serial traffic

        // Sleep to maintain ~100 Hz audio processing rate
        // Actual rate: 64 samples / 12800 Hz = 5ms per chunk
        // But Goertzel takes 15-25ms, so effective rate is 20-25 Hz
        // Still good enough for audio reactivity
        vTaskDelay(pdMS_TO_TICKS(10));
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