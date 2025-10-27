// ============================================================================
// K1.REINVENTED SECONDARY FIRMWARE - WAVESHARE ESP32-S3-ZERO
// ============================================================================
// Receives frame sync packets via UART from primary device
// Renders synchronized LED patterns on secondary LED strip
//
// Board: Waveshare ESP32-S3-Zero (ESP32-FH4R2)
// Specs: 4MB Flash, 2MB PSRAM
// UART: GPIO 43 (TX), GPIO 44 (RX)
// ============================================================================

#include <Arduino.h>
#include <driver/uart.h>
#include <FastLED.h>

#ifdef ENABLE_OTA
#include <WiFi.h>
#include <ArduinoOTA.h>
#endif

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================
#define NUM_LEDS 180
#define LED_DATA_PIN 5
#define STATUS_LED_PIN 21        // WS2812 status LED on GPIO 21
#define UART_NUM UART_NUM_1      // Use UART1 for sync packets (preserves USB CDC debug on UART0)
#define UART_RX_PIN 44
#define UART_TX_PIN 43
#define UART_BAUD 115200

// ============================================================================
// WiFi & OTA CONFIGURATION
// ============================================================================
#ifdef ENABLE_OTA
// WiFi credentials - same as primary K1.reinvented device (VX220-013F)
#define WIFI_SSID "VX220-013F"
#define WIFI_PASSWORD "3232AA90E0F24"
#define OTA_HOSTNAME "s3z-led-sync"
#define OTA_PORT 3232
#endif

// ============================================================================
// LED BUFFER AND STATE
// ============================================================================
CRGB leds[NUM_LEDS];
CRGB status_led;                 // Single WS2812 status LED
float global_brightness = 1.0f;

// Sync state from primary
volatile uint32_t sync_frame = 0;
volatile uint8_t sync_pattern = 0;
volatile float sync_brightness = 1.0f;
volatile bool sync_valid = false;
volatile uint32_t last_sync_ms = 0;
volatile uint32_t packets_received = 0;
volatile uint32_t packets_invalid = 0;

// Status LED state machine
enum StatusState {
    STATUS_BOOTING,      // Cyan: startup sequence
    STATUS_LISTENING,    // Blue: waiting for UART data
    STATUS_SYNCED,       // Green: receiving sync packets
    STATUS_ERROR,        // Red: checksum/sync error
    STATUS_TIMEOUT,      // Yellow: no sync for >1 second
};
volatile StatusState status_state = STATUS_BOOTING;
volatile uint32_t last_status_update_ms = 0;
volatile bool status_blink_state = false;  // For blinking animations


// ============================================================================
// LED STRIP INITIALIZATION (FastLED)
// ============================================================================
void init_fastled() {
    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, NUM_LEDS);
    FastLED.addLeds<WS2812B, STATUS_LED_PIN, GRB>(&status_led, 1);
    FastLED.setBrightness(255);
    FastLED.setMaxPowerInVoltsAndMilliamps(5, 2000);
}

void transmit_leds() {
    FastLED.show();
}

// ============================================================================
// STATUS LED CONTROL
// ============================================================================
void update_status_led() {
    uint32_t now_ms = millis();

    // Update status state based on sync and error conditions
    if (packets_invalid > 0) {
        // Error state: persist for 500ms, then return to previous state
        status_state = STATUS_ERROR;
        if (now_ms - last_status_update_ms > 500) {
            packets_invalid = 0;  // Clear error
            status_state = sync_valid ? STATUS_SYNCED : STATUS_LISTENING;
        }
    } else if (sync_valid) {
        status_state = STATUS_SYNCED;
    } else if (now_ms - last_sync_ms > 1000) {
        status_state = STATUS_TIMEOUT;
    } else {
        status_state = STATUS_LISTENING;
    }

    // Blink every 500ms for animations
    if (now_ms - last_status_update_ms > 500) {
        status_blink_state = !status_blink_state;
        last_status_update_ms = now_ms;
    }

    // Set LED color based on state
    switch (status_state) {
    case STATUS_BOOTING:
        // Cyan: fading in/out
        {
            float pulse = (sin(now_ms / 500.0f * 3.14159f) + 1.0f) / 2.0f;
            uint8_t brightness = (uint8_t)(pulse * 200);
            status_led = CRGB(0, brightness, brightness);
        }
        break;

    case STATUS_LISTENING:
        // Blue: slow pulse (waiting for UART)
        {
            float pulse = (sin(now_ms / 1500.0f * 3.14159f) + 1.0f) / 2.0f;
            uint8_t brightness = (uint8_t)(100 + pulse * 155);
            status_led = CRGB(0, 0, brightness);
        }
        break;

    case STATUS_SYNCED:
        // Green: solid or pulsing on frame received
        {
            // Pulse briefly when frame is received
            if (now_ms - last_sync_ms < 50) {
                status_led = CRGB(0, 255, 0);  // Full green on new frame
            } else {
                // Fade back to dim green
                float fade = (now_ms - last_sync_ms) / 200.0f;
                if (fade > 1.0f) fade = 1.0f;
                uint8_t brightness = (uint8_t)(255 * (1.0f - fade * 0.8f));
                status_led = CRGB(0, brightness, 0);
            }
        }
        break;

    case STATUS_ERROR:
        // Red: rapid blink on checksum error
        if (status_blink_state) {
            status_led = CRGB(255, 0, 0);
        } else {
            status_led = CRGB(64, 0, 0);  // Dim red
        }
        break;

    case STATUS_TIMEOUT:
        // Yellow/Orange: no sync for >1 second
        {
            float pulse = (sin(now_ms / 800.0f * 3.14159f) + 1.0f) / 2.0f;
            uint8_t brightness = (uint8_t)(100 + pulse * 155);
            status_led = CRGB(brightness, brightness / 2, 0);
        }
        break;
    }
}

// ============================================================================
// UART INITIALIZATION
// ============================================================================
void init_uart_receiver() {
    // Don't call Serial.end() - we need USB CDC (UART0) for debug output
    // We're using UART1 for sync packets, so UART0 remains available for Serial

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
    uart_set_pin(UART_NUM, UART_TX_PIN, UART_RX_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    uart_driver_install(UART_NUM, 256, 0, 0, NULL, 0);
}

// ============================================================================
// WiFi & OTA INITIALIZATION
// ============================================================================
#ifdef ENABLE_OTA
void init_wifi_ota() {
    // Only initialize if credentials are provided
    if (strlen(WIFI_SSID) == 0 || strlen(WIFI_PASSWORD) == 0) {
        Serial.println("WiFi/OTA: Credentials not configured, skipping...");
        return;
    }

    Serial.print("WiFi: Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint32_t start_time = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start_time) < 10000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("WiFi: Connected! IP: ");
        Serial.println(WiFi.localIP());

        // Setup OTA
        ArduinoOTA.setHostname(OTA_HOSTNAME);
        ArduinoOTA.setPort(OTA_PORT);

        ArduinoOTA.onStart([]() {
            Serial.println("OTA: Update starting...");
        });

        ArduinoOTA.onEnd([]() {
            Serial.println("OTA: Update complete!");
        });

        ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
            Serial.printf("OTA Progress: %u/%u bytes\r\n", progress, total);
        });

        ArduinoOTA.onError([](ota_error_t error) {
            Serial.printf("OTA Error[%u]: ", error);
            if (error == OTA_AUTH_ERROR) {
                Serial.println("Auth Failed");
            } else if (error == OTA_BEGIN_ERROR) {
                Serial.println("Begin Failed");
            } else if (error == OTA_CONNECT_ERROR) {
                Serial.println("Connect Failed");
            } else if (error == OTA_RECEIVE_ERROR) {
                Serial.println("Receive Failed");
            } else if (error == OTA_END_ERROR) {
                Serial.println("End Failed");
            }
        });

        ArduinoOTA.begin();
        Serial.println("OTA: Ready for firmware updates!");
    } else {
        Serial.println();
        Serial.println("WiFi: Connection failed, OTA unavailable");
    }
}
#endif

// ============================================================================
// SYNC PACKET PARSING
// ============================================================================
// Packet format (6 bytes):
// [0] = 0xAA (sync byte)
// [1] = Frame HI
// [2] = Frame LO
// [3] = Pattern ID
// [4] = Brightness (0-255)
// [5] = Checksum (XOR of bytes 0-4)

bool parse_sync_packet(const uint8_t* packet) {
    if (packet[0] != 0xAA) {
        packets_invalid++;
        return false;
    }

    uint8_t checksum = packet[0];
    for (int i = 1; i < 5; i++) {
        checksum ^= packet[i];
    }

    if (checksum != packet[5]) {
        packets_invalid++;
        return false;
    }

    sync_frame = ((uint32_t)packet[1] << 8) | packet[2];
    sync_pattern = packet[3];
    sync_brightness = packet[4] / 255.0f;
    sync_valid = true;
    last_sync_ms = millis();
    packets_received++;

    return true;
}

// ============================================================================
// UART RECEIVE TASK (Core 1)
// ============================================================================
void uart_receive_task(void* param) {
    uint8_t packet[6];
    uint8_t packet_pos = 0;

    while (true) {
        int len = uart_read_bytes(UART_NUM, packet + packet_pos, 1, 100 / portTICK_PERIOD_MS);

        if (len > 0) {
            if (packet_pos == 0 && packet[0] != 0xAA) {
                continue;
            }

            packet_pos++;

            if (packet_pos >= 6) {
                parse_sync_packet(packet);
                packet_pos = 0;
            }
        } else {
            // Check for timeout
            if (sync_valid && (millis() - last_sync_ms > 1000)) {
                sync_valid = false;
            }
        }
    }
}

// ============================================================================
// PATTERN RENDERING - SIMPLE BREATHING TEST PATTERN
// ============================================================================
void render_breathing_pattern() {
    static uint32_t start_ms = millis();
    float elapsed_sec = (millis() - start_ms) / 1000.0f;

    // Breathing pattern: sin wave from 0 to 1
    float brightness_mod = (sin(elapsed_sec * 2.0f * 3.14159f) + 1.0f) / 2.0f;

    for (int i = 0; i < NUM_LEDS; i++) {
        uint8_t hue = (i * 256 / NUM_LEDS + (uint8_t)(elapsed_sec * 50)) & 0xFF;
        CHSV hsv(hue, 255, (uint8_t)(brightness_mod * 255 * sync_brightness));
        leds[i] = hsv;
    }
}

void render_spinning_pattern() {
    static uint32_t start_ms = millis();
    float elapsed_sec = (millis() - start_ms) / 1000.0f;

    int center = NUM_LEDS / 2;
    float rotation = fmod(elapsed_sec * 50.0f, (float)NUM_LEDS);

    for (int i = 0; i < NUM_LEDS; i++) {
        float dist = fabsf(i - center);
        float brightness = 255.0f * (1.0f - (dist / (float)(NUM_LEDS / 2)));

        if (brightness < 0) brightness = 0;

        int pattern_pos = (int)rotation;
        if (i == (center + pattern_pos) % NUM_LEDS) {
            leds[i] = CRGB(0, 255, 0);
        } else if (i == (center + pattern_pos + 1) % NUM_LEDS) {
            leds[i] = CRGB(0, 100, 0);
        } else {
            leds[i] = CRGB(0, 0, 0);
        }
    }

    leds[center] = CRGB(255, 255, 255);
}

void render_sync_indicator() {
    // Solid color indicating sync status
    if (sync_valid) {
        // Green: synced
        fill_solid(leds, NUM_LEDS, CRGB(0, 255, 0));
    } else {
        // Red: no sync
        fill_solid(leds, NUM_LEDS, CRGB(255, 0, 0));
    }

    // Pulse brightness based on frame counter
    static uint32_t last_frame = 0;
    if (sync_frame != last_frame) {
        FastLED.setBrightness((uint8_t)(sync_brightness * 255));
        last_frame = sync_frame;
    }
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
    // Initialize USB CDC serial debug output (115200 baud)
    Serial.begin(115200);
    delay(500);  // Wait for USB CDC to be ready

    Serial.println("\n\n============================================");
    Serial.println("K1.REINVENTED S3Z SECONDARY FIRMWARE BOOT");
    Serial.println("============================================");
    Serial.println("Board: Waveshare ESP32-S3-Zero");
    Serial.println("Flash: 4MB | PSRAM: 2MB");
    Serial.println("Status: Initializing...");

    // Initialize LED strip
    init_fastled();

    // Initialize UART receiver
    init_uart_receiver();
    Serial.println("✓ UART1 receiver initialized (GPIO 44 RX, GPIO 43 TX)");

    // Create UART receive task on Core 1
    xTaskCreatePinnedToCore(
        uart_receive_task,
        "UART Receive",
        2048,
        NULL,
        15,
        NULL,
        1
    );

    // Initialize WiFi and OTA (if enabled and configured)
    #ifdef ENABLE_OTA
    init_wifi_ota();
    #endif

    // Wait for initialization
    delay(1000);

    Serial.println("============================================");
    Serial.println("✓ S3Z FIRMWARE READY");
    Serial.println("Waiting for sync packets from primary...");
    Serial.println("============================================\n");
}

// ============================================================================
// MAIN LOOP (Core 0)
// ============================================================================
void loop() {
    // Apply brightness
    FastLED.setBrightness((uint8_t)(sync_brightness * 255));

    // Update status LED (visual feedback of UART/sync status)
    update_status_led();

    // Render pattern based on sync pattern ID
    if (!sync_valid) {
        // No sync: render red indicator
        render_sync_indicator();
    } else {
        // Synced: render patterns based on pattern ID
        switch (sync_pattern % 3) {
        case 0:
            render_breathing_pattern();
            break;
        case 1:
            render_spinning_pattern();
            break;
        case 2:
            render_sync_indicator();
            break;
        default:
            fill_solid(leds, NUM_LEDS, CRGB(0, 0, 0));
        }
    }

    // Send to LEDs (includes status LED)
    transmit_leds();

    // Handle OTA updates if enabled
    #ifdef ENABLE_OTA
    ArduinoOTA.handle();
    #endif

    // Small delay to avoid CPU hogging
    delay(10);  // ~100 FPS
}
