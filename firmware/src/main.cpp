#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>

#include "types.h"
#include "led_driver.h"
#include "profiler.h"
#include "audio_stubs.h"  // Audio-reactive globals (demo stubs) - MUST come before generated_patterns.h
#include "parameters.h"
#include "pattern_registry.h"
#include "generated_patterns.h"
#include "webserver.h"

// Configuration (hardcoded for Phase A simplicity)
#define WIFI_SSID "OPTUS_738CC0N"
#define WIFI_PASS "parrs45432vw"
// NUM_LEDS and LED_DATA_PIN are defined in led_driver.h

// Global LED buffer
CRGBF leds[NUM_LEDS];

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

    Serial.println("Ready!");
    Serial.println("Upload new effects with:");
    Serial.printf("  pio run -t upload --upload-port %s.local\n", ArduinoOTA.getHostname());
}

void loop() {
    // Handle OTA updates
    ArduinoOTA.handle();

    // Update audio-reactive globals (demo stubs for now)
    update_audio_stubs();

    // Track time for animation
    static uint32_t start_time = millis();
    float time = (millis() - start_time) / 1000.0f;

    // Get current parameters (thread-safe read from active buffer)
    const PatternParameters& params = get_params();

    // Draw current pattern with runtime parameters
    draw_current_pattern(time, params);

    // Transmit to LEDs via RMT
    transmit_leds();

    // Track FPS
    watch_cpu_fps();
    print_fps();
}
// All patterns are included from generated_patterns.h