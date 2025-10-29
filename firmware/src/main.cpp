#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <SPIFFS.h>
#include <driver/uart.h>

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

// ============================================================================
// UART DAISY CHAIN CONFIGURATION
// ============================================================================
#define UART_NUM UART_NUM_1
#define UART_TX_PIN 38  // GPIO 38 -> Secondary RX (GPIO 44)
#define UART_RX_PIN 37  // GPIO 37 <- Secondary TX (GPIO 43)
#define UART_BAUD 115200

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
// UART DAISY CHAIN - SYNCHRONIZE SECONDARY DEVICE (s3z)
// ============================================================================
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

    // Initialize UART for s3z daisy chain sync
    Serial.println("Initializing UART daisy chain sync...");
    init_uart_sync();

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

    // Initialize SPIFFS filesystem for serving static web assets
    // NOTE: Use begin(true) to format on fail - ensures SPIFFS is initialized
    // The uploadfs command will populate the files afterward
    Serial.println("Initializing SPIFFS...");
    if (!SPIFFS.begin(true)) {
        Serial.println("ERROR: SPIFFS initialization failed - web UI will not be available");
    } else {
        Serial.println("SPIFFS mounted successfully");
        // List SPIFFS contents for debugging
        File root = SPIFFS.open("/");
        File file = root.openNextFile();
        Serial.println("SPIFFS Contents:");
        int file_count = 0;
        while(file) {
            Serial.printf("  %s (%d bytes)\n", file.name(), file.size());
            file = root.openNextFile();
            file_count++;
        }
        if (file_count == 0) {
            Serial.println("  (SPIFFS is empty - run 'pio run --target uploadfs' to upload web files)");
        }
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

    // Initialize web server
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


    // Single-core mode: run audio pipeline inside main loop
    Serial.println("Single-core mode: audio runs in main loop");

    Serial.println("Ready!");
    Serial.println("Upload new effects with:");
    Serial.printf("  pio run -t upload --upload-port %s.local\n", ArduinoOTA.getHostname());
}

// ============================================================================
// MAIN LOOP - Runs on Core 0 @ 200+ FPS (pattern rendering only)
// ============================================================================
void loop() {
    wifi_monitor_loop();

    // Handle OTA updates (non-blocking check)
    ArduinoOTA.handle();

    // Handle web server (includes WebSocket cleanup)
    handle_webserver();

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
// All patterns are included from generated_patterns.h

static inline void run_audio_pipeline_once() {
    // Acquire and process audio in the same thread as rendering
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