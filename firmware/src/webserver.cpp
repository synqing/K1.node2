// Async web server implementation
// Provides REST API for runtime parameter control and pattern switching

#include "webserver.h"
#include "parameters.h"
#include "pattern_registry.h"
#include "audio/goertzel.h"  // For audio configuration (microphone gain)
#include "palettes.h"        // For palette metadata API
#include "wifi_monitor.h"    // For WiFi link options API
#include "connection_state.h" // For connection state reporting
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include "profiler.h"        // For performance metrics (FPS, micro-timings)
#include "cpu_monitor.h"     // For CPU usage monitoring
#include <AsyncWebSocket.h>  // For WebSocket real-time updates

// Forward declaration: Attach CORS headers to response
static void attach_cors_headers(AsyncWebServerResponse *response);

// Forward declaration: Create standardized error response
static AsyncWebServerResponse* create_error_response(AsyncWebServerRequest *request, int status_code, const char* error_code, const char* message = nullptr);

// Forward declaration: Apply partial parameter updates from JSON
static void apply_params_json(const JsonObjectConst& root);

// Forward declaration: WebSocket event handler
static void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);

// Global async web server on port 80
static AsyncWebServer server(80);

// Global WebSocket server at /ws endpoint
static AsyncWebSocket ws("/ws");

// Method-aware rate limiting
enum RouteMethod { ROUTE_GET = 0, ROUTE_POST = 1 };
struct RouteWindow { const char* path; RouteMethod method; uint32_t window_ms; uint32_t last_ms; };

// Route key constants (extend here for future endpoints)
static const char* ROUTE_PARAMS = "/api/params";
static const char* ROUTE_WIFI_LINK_OPTIONS = "/api/wifi/link-options";
static const char* ROUTE_SELECT = "/api/select";
static const char* ROUTE_AUDIO_CONFIG = "/api/audio-config";
static const char* ROUTE_RESET = "/api/reset";
static const char* ROUTE_METRICS = "/metrics";
static const char* ROUTE_PATTERNS = "/api/patterns";
static const char* ROUTE_PALETTES = "/api/palettes";
static const char* ROUTE_DEVICE_INFO = "/api/device/info";
static const char* ROUTE_TEST_CONNECTION = "/api/test-connection";
static const char* ROUTE_DEVICE_PERFORMANCE = "/api/device/performance";
static const char* ROUTE_CONFIG_BACKUP = "/api/config/backup";
static const char* ROUTE_CONFIG_RESTORE = "/api/config/restore";

// Per-route windows; GET requests are not rate limited by default
static RouteWindow control_windows[] = {
    {ROUTE_PARAMS, ROUTE_POST, 300, 0},
    {ROUTE_WIFI_LINK_OPTIONS, ROUTE_POST, 300, 0},
    {ROUTE_SELECT, ROUTE_POST, 200, 0},
    {ROUTE_AUDIO_CONFIG, ROUTE_POST, 300, 0},
    {ROUTE_RESET, ROUTE_POST, 1000, 0},
    {ROUTE_METRICS, ROUTE_GET, 200, 0},
    {ROUTE_PARAMS, ROUTE_GET, 150, 0},
    {ROUTE_AUDIO_CONFIG, ROUTE_GET, 500, 0},
    {ROUTE_WIFI_LINK_OPTIONS, ROUTE_GET, 500, 0},
    {ROUTE_PATTERNS, ROUTE_GET, 1000, 0},
    {ROUTE_PALETTES, ROUTE_GET, 2000, 0},
    {ROUTE_DEVICE_INFO, ROUTE_GET, 1000, 0},
    {ROUTE_TEST_CONNECTION, ROUTE_GET, 200, 0},
    {ROUTE_DEVICE_PERFORMANCE, ROUTE_GET, 500, 0},
    {ROUTE_CONFIG_BACKUP, ROUTE_GET, 2000, 0},
    {ROUTE_CONFIG_RESTORE, ROUTE_POST, 2000, 0},
};

static bool route_is_rate_limited(const char* path, RouteMethod method, uint32_t* out_window_ms = nullptr, uint32_t* out_next_allowed_ms = nullptr) {
    uint32_t now = millis();
    for (size_t i = 0; i < sizeof(control_windows)/sizeof(control_windows[0]); ++i) {
        RouteWindow& w = control_windows[i];
        if (strcmp(w.path, path) == 0 && w.method == method) {
            if (w.window_ms == 0) {
                if (out_window_ms) *out_window_ms = 0;
                if (out_next_allowed_ms) *out_next_allowed_ms = 0;
                return false;
            }
            if (w.last_ms != 0 && (now - w.last_ms) < w.window_ms) {
                if (out_window_ms) *out_window_ms = w.window_ms;
                uint32_t remaining = (w.last_ms + w.window_ms > now) ? (w.last_ms + w.window_ms - now) : 0;
                if (out_next_allowed_ms) *out_next_allowed_ms = remaining;
                return true;
            }
            // Not limited; update last_ms
            w.last_ms = now;
            if (out_window_ms) *out_window_ms = w.window_ms;
            if (out_next_allowed_ms) *out_next_allowed_ms = 0;
            return false;
        }
    }
    // Default: GET is unlimited; unknown POST routes treated as unlimited unless added
    if (method == ROUTE_GET) {
        if (out_window_ms) *out_window_ms = 0;
        if (out_next_allowed_ms) *out_next_allowed_ms = 0;
        return false;
    }
    if (out_window_ms) *out_window_ms = 0;
    if (out_next_allowed_ms) *out_next_allowed_ms = 0;
    return false;
}

// Helper: Build JSON response for current parameters
String build_params_json() {
    const PatternParameters& params = get_params();

    StaticJsonDocument<512> doc;
    // Global visual controls
    doc["brightness"] = params.brightness;
    doc["softness"] = params.softness;
    doc["color"] = params.color;
    doc["color_range"] = params.color_range;
    doc["saturation"] = params.saturation;
    doc["warmth"] = params.warmth;
    doc["background"] = params.background;
    // Pattern-specific
    doc["speed"] = params.speed;
    doc["palette_id"] = params.palette_id;

    String output;
    serializeJson(doc, output);
    return output;
}

// Helper: Build JSON response for pattern list
String build_patterns_json() {
    DynamicJsonDocument doc(2048);
    JsonArray patterns = doc.createNestedArray("patterns");

    for (uint8_t i = 0; i < g_num_patterns; i++) {
        JsonObject pattern = patterns.createNestedObject();
        pattern["index"] = i;
        pattern["id"] = g_pattern_registry[i].id;
        pattern["name"] = g_pattern_registry[i].name;
        pattern["description"] = g_pattern_registry[i].description;
        pattern["is_audio_reactive"] = g_pattern_registry[i].is_audio_reactive;
    }

    doc["current_pattern"] = g_current_pattern_index;

    String output;
    serializeJson(doc, output);
    return output;
}

// Helper: Build JSON response for palette metadata
String build_palettes_json() {
    DynamicJsonDocument doc(4096);  // Larger buffer for palette data
    JsonArray palettes = doc.createNestedArray("palettes");

    for (uint8_t i = 0; i < NUM_PALETTES; i++) {
        JsonObject palette = palettes.createNestedObject();
        palette["id"] = i;
        palette["name"] = palette_names[i];
        
        // Add color preview - sample 5 colors across the palette
        JsonArray colors = palette.createNestedArray("colors");
        for (int j = 0; j < 5; j++) {
            float progress = j / 4.0f;  // 0.0, 0.25, 0.5, 0.75, 1.0
            CRGBF color = color_from_palette(i, progress, 1.0f);
            JsonObject colorObj = colors.createNestedObject();
            colorObj["r"] = (uint8_t)(color.r * 255);
            colorObj["g"] = (uint8_t)(color.g * 255);
            colorObj["b"] = (uint8_t)(color.b * 255);
        }
        
        // Add metadata
        PaletteInfo info;
        memcpy_P(&info, &palette_table[i], sizeof(PaletteInfo));
        palette["num_keyframes"] = info.num_entries;
    }

    doc["count"] = NUM_PALETTES;

    String output;
    serializeJson(doc, output);
    return output;
}



// Initialize web server with REST API endpoints
void init_webserver() {
    // GET /api/patterns - List all available patterns
    server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_PATTERNS, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = create_error_response(request, 429, "rate_limited", "Too many requests");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp429);
            return;
        }
        auto *response = request->beginResponse(200, "application/json", build_patterns_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/params - Get current parameters
    server.on(ROUTE_PARAMS, HTTP_GET, [](AsyncWebServerRequest *request) {
        // Per-route rate limiting with debug headers (GET)
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_PARAMS, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = create_error_response(request, 429, "rate_limited", "Too many requests");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp429);
            return;
        }

        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/palettes - List all available palettes
    server.on(ROUTE_PALETTES, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_PALETTES, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = create_error_response(request, 429, "rate_limited", "Too many requests");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp429);
            return;
        }
        auto *response = request->beginResponse(200, "application/json", build_palettes_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/device/info - Device information snapshot
    server.on(ROUTE_DEVICE_INFO, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_DEVICE_INFO, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = create_error_response(request, 429, "rate_limited", "Too many requests");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp429);
            return;
        }

        StaticJsonDocument<256> doc;
        doc["device"] = "K1.reinvented";
        #ifdef ESP_ARDUINO_VERSION
        doc["firmware"] = String(ESP.getSdkVersion());
        #else
        doc["firmware"] = "Unknown";
        #endif
        doc["uptime"] = (uint32_t)(millis() / 1000);
        doc["ip"] = WiFi.localIP().toString();
        doc["mac"] = WiFi.macAddress();
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // POST /api/params - Update parameters (partial update supported)
    server.on(ROUTE_PARAMS, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            String *body = static_cast<String*>(request->_tempObject);
            if (index == 0) {
                body = new String();
                body->reserve(total);
                request->_tempObject = body;
            }
            body->concat(reinterpret_cast<const char*>(data), len);

            if (index + len != total) {
                return;  // Wait for more data
            }

            // Per-route rate limiting with debug headers
            uint32_t window_ms = 0, next_ms = 0;
            if (route_is_rate_limited(ROUTE_PARAMS, ROUTE_POST, &window_ms, &next_ms)) {
                delete body;
                request->_tempObject = nullptr;
                auto *response = create_error_response(request, 429, "rate_limited", "Too many requests");
                response->addHeader("X-RateLimit-Window", String(window_ms));
                response->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
                request->send(response);
                return;
            }
            
            String *bodyStr = static_cast<String*>(request->_tempObject);
            StaticJsonDocument<1024> doc;
            DeserializationError error = deserializeJson(doc, *bodyStr);
            delete bodyStr;
            request->_tempObject = nullptr;

            if (error) {
                auto *response = create_error_response(request, 400, "invalid_json", "Request body contains invalid JSON");
                request->send(response);
                return;
            }

            // Apply partial parameter updates
            apply_params_json(doc.as<JsonObjectConst>());

            // Respond with updated params
            String response = build_params_json();
            auto *resp = request->beginResponse(200, "application/json", response);
            attach_cors_headers(resp);
            request->send(resp);
        });

    // POST /api/select - Switch pattern by index or ID
    server.on(ROUTE_SELECT, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            String *body = static_cast<String*>(request->_tempObject);
            if (index == 0) {
                body = new String();
                body->reserve(total);
                request->_tempObject = body;
            }
            body->concat(reinterpret_cast<const char*>(data), len);

            if (index + len != total) {
                return;  // Wait for more data
            }

            // Per-route rate limiting with debug headers
            uint32_t window_ms = 0, next_ms = 0;
            if (route_is_rate_limited(ROUTE_SELECT, ROUTE_POST, &window_ms, &next_ms)) {
                delete body;
                request->_tempObject = nullptr;
                auto *response = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
                response->addHeader("X-RateLimit-Window", String(window_ms));
                response->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, *body);
            delete body;
            request->_tempObject = nullptr;

            if (error) {
                auto *response = request->beginResponse(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            bool success = false;

            if (doc.containsKey("index")) {
                uint8_t pattern_index = doc["index"].as<uint8_t>();
                success = select_pattern(pattern_index);
            } else if (doc.containsKey("id")) {
                const char* pattern_id = doc["id"].as<const char*>();
                success = select_pattern_by_id(pattern_id);
            } else {
                request->send(400, "application/json", "{\"error\":\"Missing index or id\"}");
                return;
            }

            if (success) {
                StaticJsonDocument<256> response;
                response["current_pattern"] = g_current_pattern_index;
                response["id"] = get_current_pattern().id;
                response["name"] = get_current_pattern().name;

                String output;
                serializeJson(response, output);
                request->send(200, "application/json", output);
            } else {
                auto *response = create_error_response(request, 404, "pattern_not_found", "Invalid pattern index or ID");
                request->send(response);
            }
        });

    // POST /api/reset - Reset parameters to defaults
    server.on(ROUTE_RESET, HTTP_POST, [](AsyncWebServerRequest *request) {
        // Per-route rate limiting with debug headers
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_RESET, ROUTE_POST, &window_ms, &next_ms)) {
            auto *rl = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            rl->addHeader("X-RateLimit-Window", String(window_ms));
            rl->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(rl);
            request->send(rl);
            return;
        }
        PatternParameters defaults = get_default_params();
        update_params(defaults);
        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/audio-config - Get audio configuration (microphone gain)
    server.on(ROUTE_AUDIO_CONFIG, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_AUDIO_CONFIG, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(resp429);
            request->send(resp429);
            return;
        }
        StaticJsonDocument<128> doc;
        doc["microphone_gain"] = configuration.microphone_gain;
        String response;
        serializeJson(doc, response);
        auto *resp = request->beginResponse(200, "application/json", response);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // POST /api/audio-config - Update audio configuration
    server.on(ROUTE_AUDIO_CONFIG, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            String *body = static_cast<String*>(request->_tempObject);
            if (index == 0) {
                body = new String();
                body->reserve(total);
                request->_tempObject = body;
            }
            body->concat(reinterpret_cast<const char*>(data), len);

            if (index + len != total) {
                return;  // Wait for more data
            }

            // Per-route rate limiting with debug headers
            uint32_t window_ms = 0, next_ms = 0;
            if (route_is_rate_limited(ROUTE_AUDIO_CONFIG, ROUTE_POST, &window_ms, &next_ms)) {
                delete body;
                request->_tempObject = nullptr;
                auto *response = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
                response->addHeader("X-RateLimit-Window", String(window_ms));
                response->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            StaticJsonDocument<128> doc;
            DeserializationError error = deserializeJson(doc, *body);
            delete body;
            request->_tempObject = nullptr;

            if (error) {
                auto *response = request->beginResponse(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            // Update microphone gain if provided (range: 0.5 - 2.0)
            if (doc.containsKey("microphone_gain")) {
                float gain = doc["microphone_gain"].as<float>();
                // Clamp to safe range
                gain = fmaxf(0.5f, fminf(2.0f, gain));
                configuration.microphone_gain = gain;
                Serial.printf("[AUDIO CONFIG] Microphone gain updated to %.2fx\n", gain);
            }

            StaticJsonDocument<128> response_doc;
            response_doc["microphone_gain"] = configuration.microphone_gain;
            String response;
            serializeJson(response_doc, response);
            auto *resp = request->beginResponse(200, "application/json", response);
            attach_cors_headers(resp);
            request->send(resp);
        });

    // OPTIONS preflight for CORS
    server.onNotFound([](AsyncWebServerRequest *request) {
        if (request->method() == HTTP_OPTIONS) {
            auto *response = request->beginResponse(204);
            attach_cors_headers(response);
            request->send(response);
            return;
        }
        auto *response = request->beginResponse(404, "application/json", "{\"error\":\"Not found\"}");
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/wifi/link-options - Get current WiFi link options
    server.on(ROUTE_WIFI_LINK_OPTIONS, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_WIFI_LINK_OPTIONS, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(resp429);
            request->send(resp429);
            return;
        }
        WifiLinkOptions opts;
        wifi_monitor_get_link_options(opts);
        StaticJsonDocument<128> doc;
        doc["force_bg_only"] = opts.force_bg_only;
        doc["force_ht20"] = opts.force_ht20;
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // POST /api/wifi/link-options - Update WiFi link options (persist to NVS)
    server.on(ROUTE_WIFI_LINK_OPTIONS, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            String *body = static_cast<String*>(request->_tempObject);
            if (index == 0) {
                body = new String();
                body->reserve(total);
                request->_tempObject = body;
            }
            body->concat(reinterpret_cast<const char*>(data), len);

            if (index + len != total) {
                return;  // Wait for more data
            }

            // Per-route rate limiting with debug headers
            uint32_t window_ms = 0, next_ms = 0;
            if (route_is_rate_limited(ROUTE_WIFI_LINK_OPTIONS, ROUTE_POST, &window_ms, &next_ms)) {
                delete body;
                request->_tempObject = nullptr;
                auto *response = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
                response->addHeader("X-RateLimit-Window", String(window_ms));
                response->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, *body);
            delete body;
            request->_tempObject = nullptr;

            if (error) {
                auto *response = request->beginResponse(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            WifiLinkOptions prev;
            wifi_monitor_get_link_options(prev);
            WifiLinkOptions opts = prev;
            if (doc.containsKey("force_bg_only")) {
                opts.force_bg_only = doc["force_bg_only"].as<bool>();
            }
            if (doc.containsKey("force_ht20")) {
                opts.force_ht20 = doc["force_ht20"].as<bool>();
            }

            // Apply immediately and persist
            wifi_monitor_update_link_options(opts);
            wifi_monitor_save_link_options_to_nvs(opts);

            // If options changed, trigger a reassociation to apply fully
            if (opts.force_bg_only != prev.force_bg_only || opts.force_ht20 != prev.force_ht20) {
                wifi_monitor_reassociate_now("link options changed");
            }

            StaticJsonDocument<128> respDoc;
            respDoc["success"] = true;
            respDoc["force_bg_only"] = opts.force_bg_only;
            respDoc["force_ht20"] = opts.force_ht20;
            String output;
            serializeJson(respDoc, output);
            auto *resp = request->beginResponse(200, "application/json", output);
            attach_cors_headers(resp);
            request->send(resp);
        });

    // GET / - Serve web dashboard (premium instrument interface)
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        const char* html = R"HTML(
<!DOCTYPE html>
<html>
<head>
    <title>K1.reinvented</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            margin-bottom: 60px;
        }
        .logo {
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 8px;
            text-transform: uppercase;
            margin-bottom: 12px;
            color: #fff;
        }
        .tagline {
            font-size: 13px;
            letter-spacing: 2px;
            color: #888;
            text-transform: uppercase;
        }
        .patterns-section {
            margin-bottom: 60px;
        }
        .section-title {
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 20px;
            display: block;
        }
        .pattern-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 40px;
        }
        .pattern-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            border-radius: 4px;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .pattern-card:hover {
            border-color: rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.06);
            transform: translateY(-2px);
        }
        .pattern-card.active {
            border-color: #ffd700;
            background: rgba(255, 215, 0, 0.15);
            box-shadow: 0 0 16px rgba(255, 215, 0, 0.4),
                        inset 0 0 8px rgba(255, 215, 0, 0.1);
        }
        .pattern-card.active::before {
            content: '●';
            position: absolute;
            top: 4px;
            right: 4px;
            color: #ffd700;
            font-size: 10px;
            text-shadow: 0 0 4px rgba(255, 215, 0, 0.8);
        }
        .pattern-name {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
            line-height: 1.2;
        }
        .pattern-desc {
            font-size: 10px;
            color: #999;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .controls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
        }
        .control-group {
            display: flex;
            flex-direction: column;
        }
        .control-label {
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .control-value {
            font-size: 12px;
            font-weight: 600;
            color: #ffd700;
            font-family: 'Monaco', monospace;
            text-align: center;
            margin-top: 8px;
            padding: 8px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 4px;
            border: 1px solid rgba(255, 215, 0, 0.2);
        }

        @media (max-width: 768px) {
            .pattern-grid {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 10px;
            }

            .controls-grid {
                grid-template-columns: 1fr;
            }

            body {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">K1.reinvented</div>
            <div class="tagline">Light as a Statement</div>
        </header>

        <div class="patterns-section">
            <span class="section-title">Patterns</span>
            <div class="pattern-grid" id="patterns"></div>
        </div>

        <div class="divider"></div>

        <div>
            <span class="section-title">Controls</span>
            <div class="controls-grid">
                <div class="control-group">
                    <label class="control-label">
                        <span>Brightness</span>
                        <span class="control-value" id="brightness-val">1.00</span>
                    </label>
                    <input type="range" class="slider" id="brightness" min="0" max="1" step="0.01" value="1.0" oninput="updateDisplay('brightness')" onchange="updateDisplay('brightness')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Softness</span>
                        <span class="control-value" id="softness-val">0.25</span>
                    </label>
                    <input type="range" class="slider" id="softness" min="0" max="1" step="0.01" value="0.25" oninput="updateDisplay('softness')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Color</span>
                        <span class="control-value" id="color-val">0.33</span>
                    </label>
                    <input type="range" class="slider" id="color" min="0" max="1" step="0.01" value="0.33" oninput="updateDisplay('color')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Color Range</span>
                        <span class="control-value" id="color_range-val">0.00</span>
                    </label>
                    <input type="range" class="slider" id="color_range" min="0" max="1" step="0.01" value="0.0" oninput="updateDisplay('color_range')">
                <div id="color-mode" class="mode-indicator" role="status" aria-live="polite" title="Color Range ≤ 0.5: HSV mode. Color Range > 0.5: Palette mode." data-mode="hsv">HSV Mode</div>
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Saturation</span>
                        <span class="control-value" id="saturation-val">0.75</span>
                    </label>
                    <input type="range" class="slider" id="saturation" min="0" max="1" step="0.01" value="0.75" oninput="updateDisplay('saturation')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Warmth</span>
                        <span class="control-value" id="warmth-val">0.00</span>
                    </label>
                    <input type="range" class="slider" id="warmth" min="0" max="1" step="0.01" value="0.0" oninput="updateDisplay('warmth')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Background</span>
                        <span class="control-value" id="background-val">0.25</span>
                    </label>
                    <input type="range" class="slider" id="background" min="0" max="1" step="0.01" value="0.25" oninput="updateDisplay('background')">
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Speed</span>
                        <span class="control-value" id="speed-val">0.50</span>
                    </label>
                    <input type="range" class="slider" id="speed" min="0" max="1" step="0.01" value="0.5" oninput="updateDisplay('speed')">
                </div>

                <hr style="margin: 16px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">

                <div class="control-label" style="font-weight: 600; margin-bottom: 12px; opacity: 0.7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Audio Settings
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Microphone Gain</span>
                        <span class="control-value" id="microphone-gain-val">1.00x</span>
                    </label>
                    <input type="range" class="slider" id="microphone-gain" min="0.5" max="2" step="0.05" value="1.0" oninput="updateMicrophoneGain()">
                    <div style="font-size: 10px; color: #999; margin-top: 4px; text-align: center;">-6dB &nbsp; 0dB &nbsp; +6dB</div>
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Palette</span>
                        <span class="loading-indicator" id="palette-loading" style="display: none; font-size: 10px; color: #999;">Loading...</span>
                    </label>
                    <select id="palette-select" onchange="updatePalette()" disabled>
                        <option value="">Loading palettes...</option>
                    </select>
                    <div id="palette-name">Loading...</div>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <div>
            <span class="section-title">WiFi Link Options</span>
            <div class="controls-grid">
                <div class="control-group">
                    <label class="control-label">
                        <span>Force 802.11b/g (disable 11n)</span>
                        <span class="control-value" id="bg-only-val">—</span>
                    </label>
                    <div class="toggle-group">
                        <input type="checkbox" id="bg-only" onchange="updateWifiLinkOptions()" />
                        <span class="toggle-label">BG-Only</span>
                    </div>
                </div>

                <div class="control-group">
                    <label class="control-label">
                        <span>Force HT20 bandwidth (20 MHz)</span>
                        <span class="control-value" id="ht20-val">—</span>
                    </label>
                    <div class="toggle-group">
                        <input type="checkbox" id="ht20" onchange="updateWifiLinkOptions()" />
                        <span class="toggle-label">HT20</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function loadPatterns() {
            try {
                const res = await fetch('/api/patterns');
                if (!res.ok) {
                    console.error('[K1] Failed to fetch patterns:', res.status);
                    return;
                }
                const data = await res.json();
                const container = document.getElementById('patterns');

                container.innerHTML = data.patterns.map(p => {
                    const active = p.index === data.current_pattern ? 'active' : '';
                    return '<div class="pattern-card ' + active + '" onclick="selectPattern(' + p.index + ')">' +
                        '<div class="pattern-name">' + p.name + '</div>' +
                        '<div class="pattern-desc">' + (p.description || '') + '</div>' +
                        '</div>';
                }).join('');
                console.log('[K1] Patterns loaded, current:', data.current_pattern);
            } catch (err) {
                console.error('[K1] Error loading patterns:', err);
            }
        }

        async function loadParams() {
            try {
                const res = await fetch('/api/params');
                if (!res.ok) {
                    console.error('[K1] Failed to fetch params:', res.status);
                    return;
                }
                const params = await res.json();

                // Update all slider elements with device parameters
                Object.keys(params).forEach(key => {
                    const elem = document.getElementById(key);
                    if (elem && elem.type === 'range') {
                        // Set slider to actual device value
                        elem.value = params[key];
                        // Update display without triggering update back to device
                        updateDisplay(key, true);
                    }
                });

                // Update color mode indicator based on current color_range
                if (typeof params.color_range === 'number') {
                    updateColorModeIndicator(params.color_range);
                }

                console.log('[K1] Parameters loaded from device:', params);
            } catch (err) {
                console.error('[K1] Error loading parameters:', err);
            }
        }

        async function selectPattern(index) {
            await fetch('/api/select', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({index})
            });
            loadPatterns();
        }

        function updateDisplay(id, skipUpdate) {
            const elem = document.getElementById(id);
            const val = document.getElementById(id + '-val');
            if (elem && val) {
                val.textContent = parseFloat(elem.value).toFixed(2);
                if (id === 'color_range') {
                    updateColorModeIndicator(parseFloat(elem.value));
                }
                if (!skipUpdate) {
                    if (id === 'brightness') {
                        scheduleBrightnessUpdate();
                    } else {
                        updateParams();
                    }
                }
            }
        }

        // Debounce brightness changes to avoid flooding device with updates
        let brightnessDebounceTimer = null;
        const BRIGHTNESS_DEBOUNCE_MS = 150;
        function scheduleBrightnessUpdate() {
            if (brightnessDebounceTimer) {
                clearTimeout(brightnessDebounceTimer);
            }
            brightnessDebounceTimer = setTimeout(() => {
                updateParams();
                brightnessDebounceTimer = null;
            }, BRIGHTNESS_DEBOUNCE_MS);
        }

        async function updateParams() {
            const paletteSelect = document.getElementById('palette-select');
            const params = {
                brightness: parseFloat(document.getElementById('brightness').value),
                softness: parseFloat(document.getElementById('softness').value),
                color: parseFloat(document.getElementById('color').value),
                color_range: parseFloat(document.getElementById('color_range').value),
                saturation: parseFloat(document.getElementById('saturation').value),
                warmth: parseFloat(document.getElementById('warmth').value),
                background: parseFloat(document.getElementById('background').value),
                speed: parseFloat(document.getElementById('speed').value),
                palette_id: parseInt(paletteSelect.value)
            };
            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
        }

        async function loadAudioConfig() {
            try {
                const res = await fetch('/api/audio-config');
                if (!res.ok) {
                    console.error('[K1] Failed to fetch audio config:', res.status);
                    return;
                }
                const config = await res.json();

                const gainElem = document.getElementById('microphone-gain');
                const gainVal = document.getElementById('microphone-gain-val');

                if (gainElem && config.microphone_gain) {
                    gainElem.value = config.microphone_gain;
                    gainVal.textContent = config.microphone_gain.toFixed(2) + 'x';
                }
                console.log('[K1] Audio config loaded:', config);
            } catch (err) {
                console.error('[K1] Error loading audio config:', err);
            }
        }

        async function updateMicrophoneGain() {
            const gainElem = document.getElementById('microphone-gain');
            const gainVal = document.getElementById('microphone-gain-val');

            const gain = parseFloat(gainElem.value);
            gainVal.textContent = gain.toFixed(2) + 'x';

            await fetch('/api/audio-config', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ microphone_gain: gain })
            });
        }

        // Palette cache and API management
        let paletteCache = null;
        let paletteLoadPromise = null;

        async function loadPalettes() {
            if (paletteCache) {
                return paletteCache;
            }

            if (paletteLoadPromise) {
                return paletteLoadPromise;
            }

            paletteLoadPromise = (async () => {
                try {
                    const loadingIndicator = document.getElementById('palette-loading');
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'inline';
                    }

                    const res = await fetch('/api/palettes');
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }

                    const data = await res.json();
                    paletteCache = data;
                    console.log('[K1] Loaded', data.count, 'palettes from API');
                    return data;
                } catch (err) {
                    console.error('[K1] Failed to load palettes:', err);
                    // Fallback to basic palette names
                    paletteCache = {
                        palettes: Array.from({length: 33}, (_, i) => ({
                            id: i,
                            name: `Palette ${i}`,
                            colors: []
                        })),
                        count: 33
                    };
                    return paletteCache;
                } finally {
                    const loadingIndicator = document.getElementById('palette-loading');
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    paletteLoadPromise = null;
                }
            })();

            return paletteLoadPromise;
        }

        async function initPalettes() {
            try {
                // Load palette metadata from API
                const paletteData = await loadPalettes();
                const paletteSelect = document.getElementById('palette-select');
                const paletteName = document.getElementById('palette-name');

                // Clear existing options
                paletteSelect.innerHTML = '';
                paletteSelect.disabled = false;

                // Populate dropdown with API data
                paletteData.palettes.forEach(palette => {
                    const option = document.createElement('option');
                    option.value = palette.id;
                    option.textContent = palette.name;
                    
                    // Add color preview as title attribute
                    if (palette.colors && palette.colors.length > 0) {
                        const colorPreview = palette.colors.map(c => 
                            `rgb(${c.r},${c.g},${c.b})`
                        ).join(', ');
                        option.title = `Colors: ${colorPreview}`;
                    }
                    
                    paletteSelect.appendChild(option);
                });

                // Get current parameters and set selection
                const paramsRes = await fetch('/api/params');
                if (paramsRes.ok) {
                    const params = await paramsRes.json();
                    if (params.palette_id !== undefined) {
                        paletteSelect.value = params.palette_id;
                        const selectedPalette = paletteData.palettes.find(p => p.id === params.palette_id);
                        paletteName.textContent = selectedPalette ? selectedPalette.name : 'Unknown';
                    }
                    console.log('[K1] Palette initialized:', params.palette_id);
                } else {
                    console.error('[K1] Failed to fetch current params');
                    paletteName.textContent = paletteData.palettes[0]?.name || 'Unknown';
                }
            } catch (err) {
                console.error('[K1] Error initializing palettes:', err);
                const paletteSelect = document.getElementById('palette-select');
                const paletteName = document.getElementById('palette-name');
                
                paletteSelect.innerHTML = '<option value="0">Error loading palettes</option>';
                paletteSelect.disabled = true;
                paletteName.textContent = 'Error';
            }
        }

        async function updatePalette() {
            const paletteSelect = document.getElementById('palette-select');
            const paletteName = document.getElementById('palette-name');

            const paletteId = parseInt(paletteSelect.value);
            if (paletteName && paletteCache) {
                const palette = paletteCache.palettes.find(p => p.id === paletteId);
                paletteName.textContent = palette ? palette.name : 'Unknown';
            }

            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ palette_id: paletteId })
            });
        }

        // WiFi link option API helpers
        async function loadWifiLinkOptions() {
            try {
                const res = await fetch('/api/wifi/link-options');
                if (!res.ok) return;
                const data = await res.json();
                const bg = !!data.force_bg_only;
                const ht = !!data.force_ht20;
                document.getElementById('bg-only').checked = bg;
                document.getElementById('ht20').checked = ht;
                document.getElementById('bg-only-val').textContent = bg ? 'ON' : 'OFF';
                document.getElementById('ht20-val').textContent = ht ? 'ON' : 'OFF';
                console.log('[K1] WiFi link options loaded:', data);
            } catch (e) {
                console.error('[K1] Failed to load WiFi link options', e);
            }
        }

        async function updateWifiLinkOptions() {
            const bg = document.getElementById('bg-only').checked;
            const ht = document.getElementById('ht20').checked;
            document.getElementById('bg-only-val').textContent = bg ? 'ON' : 'OFF';
            document.getElementById('ht20-val').textContent = ht ? 'ON' : 'OFF';
            try {
                await fetch('/api/wifi/link-options', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ force_bg_only: bg, force_ht20: ht })
                });
                console.log('[K1] WiFi link options updated:', {bg, ht});
            } catch (e) {
                console.error('[K1] Failed to update WiFi link options', e);
            }
        }

        function updateColorModeIndicator(rangeValue) {
            const modeElem = document.getElementById('color-mode');
            if (!modeElem) return;
            const mode = rangeValue <= 0.5 ? 'HSV Mode' : 'Palette Mode';
            modeElem.textContent = mode;
            modeElem.dataset.mode = rangeValue <= 0.5 ? 'hsv' : 'palette';
        }

        // Load all UI state from device on page load (wait for all to complete)
        (async () => {
            await loadPatterns();
            await loadParams();
            await loadAudioConfig();
            await initPalettes();
            await loadWifiLinkOptions();
        })();
    </script>
</body>
</html>
)HTML";
        auto *response = request->beginResponse(200, "text/html", html);
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/device-info - Device information snapshot
    server.on(ROUTE_DEVICE_INFO, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_DEVICE_INFO, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(resp429);
            request->send(resp429);
            return;
        }
        StaticJsonDocument<256> doc;
        doc["device"] = "K1.reinvented";
        #ifdef ESP_ARDUINO_VERSION
        doc["firmware"] = String(ESP.getSdkVersion());
        #else
        doc["firmware"] = "Unknown";
        #endif
        doc["uptime"] = (uint32_t)(millis() / 1000);
        doc["ip"] = WiFi.localIP().toString();
        doc["mac"] = WiFi.macAddress();
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/device/performance - Performance metrics (FPS, timings, heap)
    server.on(ROUTE_DEVICE_PERFORMANCE, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_DEVICE_PERFORMANCE, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(resp429);
            request->send(resp429);
            return;
        }

        float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;
        float avg_render_us = (float)ACCUM_RENDER_US / frames;
        float avg_quantize_us = (float)ACCUM_QUANTIZE_US / frames;
        float avg_rmt_wait_us = (float)ACCUM_RMT_WAIT_US / frames;
        float avg_rmt_tx_us = (float)ACCUM_RMT_TRANSMIT_US / frames;
        float frame_time_us = avg_render_us + avg_quantize_us + avg_rmt_wait_us + avg_rmt_tx_us;

        uint32_t heap_free = ESP.getFreeHeap();
        uint32_t heap_total = ESP.getHeapSize();
        float memory_percent = ((float)(heap_total - heap_free) / (float)heap_total) * 100.0f;

        StaticJsonDocument<256> doc;
        doc["fps"] = FPS_CPU;
        doc["frame_time_us"] = frame_time_us;
        doc["cpu_percent"] = 0; // TODO: Implement CPU usage calculation
        doc["memory_percent"] = memory_percent;
        doc["memory_free_kb"] = heap_free / 1024;

        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/test-connection - Simple connection check
    server.on(ROUTE_TEST_CONNECTION, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_TEST_CONNECTION, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
            resp429->addHeader("X-RateLimit-Window", String(window_ms));
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            attach_cors_headers(resp429);
            request->send(resp429);
            return;
        }
        StaticJsonDocument<64> doc;
        doc["ok"] = true;
        doc["uptime_ms"] = millis();
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/config/backup - Export current configuration as JSON
    server.on(ROUTE_CONFIG_BACKUP, HTTP_GET, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_CONFIG_BACKUP, ROUTE_GET, &window_ms, &next_ms)) {
            auto *resp = create_error_response(request, 429, "rate_limited");
            resp->addHeader("X-RateLimit-Window", String(window_ms));
            resp->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp);
            return;
        }

        // Create comprehensive configuration backup
        StaticJsonDocument<1024> doc;
        doc["version"] = "1.0";
        doc["device"] = "K1.reinvented";
        doc["timestamp"] = millis();
        doc["uptime_seconds"] = millis() / 1000;

        // Current parameters
        const PatternParameters& params = get_params();
        JsonObject parameters = doc.createNestedObject("parameters");
        parameters["brightness"] = params.brightness;
        parameters["softness"] = params.softness;
        parameters["color"] = params.color;
        parameters["color_range"] = params.color_range;
        parameters["saturation"] = params.saturation;
        parameters["warmth"] = params.warmth;
        parameters["background"] = params.background;
        parameters["speed"] = params.speed;
        parameters["palette_id"] = params.palette_id;
        parameters["custom_param_1"] = params.custom_param_1;
        parameters["custom_param_2"] = params.custom_param_2;
        parameters["custom_param_3"] = params.custom_param_3;

        // Current pattern selection
        doc["current_pattern"] = g_current_pattern_index;

        // Device information
        JsonObject device_info = doc.createNestedObject("device_info");
        device_info["ip"] = WiFi.localIP().toString();
        device_info["mac"] = WiFi.macAddress();
        #ifdef ESP_ARDUINO_VERSION
        device_info["firmware"] = String(ESP.getSdkVersion());
        #else
        device_info["firmware"] = "Unknown";
        #endif

        String output;
        serializeJson(doc, output);
        
        auto *resp = request->beginResponse(200, "application/json", output);
        resp->addHeader("Content-Disposition", "attachment; filename=\"k1-config-backup.json\"");
        attach_cors_headers(resp);
        request->send(resp);
    });

    // POST /api/config/restore - Import configuration from JSON
    server.on(ROUTE_CONFIG_RESTORE, HTTP_POST, [](AsyncWebServerRequest *request) {
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_CONFIG_RESTORE, ROUTE_POST, &window_ms, &next_ms)) {
            auto *resp = create_error_response(request, 429, "rate_limited");
            resp->addHeader("X-RateLimit-Window", String(window_ms));
            resp->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
            request->send(resp);
            return;
        }

        // This will be handled by the body handler below
        auto *resp = create_error_response(request, 400, "missing_body", "Configuration data required in request body");
        request->send(resp);
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        // Handle POST body for configuration restore
        if (index == 0) {
            // First chunk - validate content type
            if (!request->hasHeader("Content-Type") || 
                request->getHeader("Content-Type")->value().indexOf("application/json") == -1) {
                auto *resp = create_error_response(request, 400, "invalid_content_type", "Content-Type must be application/json");
                request->send(resp);
                return;
            }
        }

        if (index + len == total) {
            // Last chunk - process complete JSON
            StaticJsonDocument<1024> doc;
            DeserializationError error = deserializeJson(doc, data, len);
            
            if (error) {
                auto *resp = create_error_response(request, 400, "invalid_json", "Failed to parse configuration JSON");
                request->send(resp);
                return;
            }

            // Validate backup format
            if (!doc.containsKey("version") || !doc.containsKey("parameters")) {
                auto *resp = create_error_response(request, 400, "invalid_backup_format", "Missing required fields: version, parameters");
                request->send(resp);
                return;
            }

            // Extract and validate parameters
            JsonObject params_obj = doc["parameters"];
            PatternParameters new_params;
            
            // Load parameters with defaults for missing values
            new_params.brightness = params_obj["brightness"] | 1.0f;
            new_params.softness = params_obj["softness"] | 0.25f;
            new_params.color = params_obj["color"] | 0.33f;
            new_params.color_range = params_obj["color_range"] | 0.0f;
            new_params.saturation = params_obj["saturation"] | 0.75f;
            new_params.warmth = params_obj["warmth"] | 0.0f;
            new_params.background = params_obj["background"] | 0.25f;
            new_params.speed = params_obj["speed"] | 0.5f;
            new_params.palette_id = params_obj["palette_id"] | 0;
            new_params.custom_param_1 = params_obj["custom_param_1"] | 0.5f;
            new_params.custom_param_2 = params_obj["custom_param_2"] | 0.5f;
            new_params.custom_param_3 = params_obj["custom_param_3"] | 0.5f;

            // Validate and apply parameters
            bool params_valid = update_params_safe(new_params);
            
            // Restore pattern selection if provided and valid
             bool pattern_restored = false;
             if (doc.containsKey("current_pattern")) {
                 int pattern_index = doc["current_pattern"];
                 if (pattern_index >= 0 && pattern_index < g_num_patterns) {
                     g_current_pattern_index = pattern_index;
                     pattern_restored = true;
                 }
             }

            // Build response
            StaticJsonDocument<256> response_doc;
            response_doc["success"] = true;
            response_doc["parameters_restored"] = params_valid;
            response_doc["pattern_restored"] = pattern_restored;
            response_doc["timestamp"] = millis();
            
            if (!params_valid) {
                response_doc["warning"] = "Some parameters were clamped to valid ranges";
            }

            String output;
            serializeJson(response_doc, output);
            
            auto *resp = request->beginResponse(200, "application/json", output);
            attach_cors_headers(resp);
            request->send(resp);
        }
    });

    // Initialize WebSocket server
    ws.onEvent(onWebSocketEvent);
    server.addHandler(&ws);

    // Initialize mDNS for device discovery
    if (MDNS.begin("k1-reinvented")) {
        Serial.println("mDNS responder started: k1-reinvented.local");
        
        // Add service advertisement for HTTP server
        MDNS.addService("http", "tcp", 80);
        MDNS.addServiceTxt("http", "tcp", "device", "K1.reinvented");
        MDNS.addServiceTxt("http", "tcp", "version", "2.0");
        MDNS.addServiceTxt("http", "tcp", "api", "/api");
        
        // Add service advertisement for WebSocket
        MDNS.addService("ws", "tcp", 80);
        MDNS.addServiceTxt("ws", "tcp", "path", "/ws");
        MDNS.addServiceTxt("ws", "tcp", "protocol", "K1RealtimeData");
    } else {
        Serial.println("Error starting mDNS responder");
    }

    // Start server
    server.begin();
    Serial.println("Web server started on port 80");
    Serial.println("WebSocket server available at /ws");
}

// Handle web server (AsyncWebServer is non-blocking, so this is a no-op)
void handle_webserver() {
    // AsyncWebServer handles requests in the background
    // No action needed in loop()
    
    // Clean up disconnected WebSocket clients periodically
    static uint32_t last_cleanup = 0;
    if (millis() - last_cleanup > 30000) { // Every 30 seconds
        ws.cleanupClients();
        last_cleanup = millis();
    }
}

// WebSocket event handler for real-time updates
static void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
    switch (type) {
        case WS_EVT_CONNECT:
            Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
            // Send initial state to new client
            {
                StaticJsonDocument<512> doc;
                doc["type"] = "welcome";
                doc["client_id"] = client->id();
                doc["timestamp"] = millis();
                
                String message;
                serializeJson(doc, message);
                client->text(message);
            }
            break;
            
        case WS_EVT_DISCONNECT:
            Serial.printf("WebSocket client #%u disconnected\n", client->id());
            break;
            
        case WS_EVT_DATA:
            {
                AwsFrameInfo *info = (AwsFrameInfo*)arg;
                if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
                    // Handle incoming WebSocket message (for future bidirectional communication)
                    data[len] = 0; // Null terminate
                    Serial.printf("WebSocket message from client #%u: %s\n", client->id(), (char*)data);
                    
                    // Echo back for now (can be extended for commands)
                    StaticJsonDocument<256> response;
                    response["type"] = "echo";
                    response["message"] = (char*)data;
                    response["timestamp"] = millis();
                    
                    String responseStr;
                    serializeJson(response, responseStr);
                    client->text(responseStr);
                }
            }
            break;
            
        case WS_EVT_PONG:
        case WS_EVT_ERROR:
            break;
    }
}

// Broadcast real-time data to all connected WebSocket clients
void broadcast_realtime_data() {
    if (ws.count() == 0) return; // No clients connected
    
    StaticJsonDocument<1024> doc;
    doc["type"] = "realtime";
    doc["timestamp"] = millis();
    
    // Performance data
    JsonObject performance = doc.createNestedObject("performance");
    performance["fps"] = FPS_CPU;
    
    // Calculate frame time from accumulated timings
    float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;
    uint32_t total_frame_time_us = (ACCUM_RENDER_US + ACCUM_QUANTIZE_US + 
                                   ACCUM_RMT_WAIT_US + ACCUM_RMT_TRANSMIT_US) / frames;
    performance["frame_time_us"] = total_frame_time_us;
    performance["cpu_percent"] = cpu_monitor.getAverageCPUUsage();
    
    // Memory statistics
    performance["memory_percent"] = (float)(ESP.getHeapSize() - ESP.getFreeHeap()) / ESP.getHeapSize() * 100.0f;
    performance["memory_free_kb"] = ESP.getFreeHeap() / 1024;
    
    // Current parameters (subset for real-time updates)
    const PatternParameters& params = get_params();
    JsonObject parameters = doc.createNestedObject("parameters");
    parameters["brightness"] = params.brightness;
    parameters["speed"] = params.speed;
    parameters["saturation"] = params.saturation;
    parameters["palette_id"] = params.palette_id;
    
    String message;
    serializeJson(doc, message);
    ws.textAll(message);
}

// Allow cross-origin requests for local dev tools / browsers
static void attach_cors_headers(AsyncWebServerResponse *response) {
    if (!response) return;
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    response->addHeader("Access-Control-Allow-Credentials", "false");
}

// Create standardized error response with consistent format
static AsyncWebServerResponse* create_error_response(AsyncWebServerRequest *request, int status_code, const char* error_code, const char* message) {
    StaticJsonDocument<256> doc;
    doc["error"] = error_code;
    if (message) {
        doc["message"] = message;
    }
    doc["timestamp"] = millis();
    doc["status"] = status_code;
    
    String output;
    serializeJson(doc, output);
    
    auto *response = request->beginResponse(status_code, "application/json", output);
    attach_cors_headers(response);
    return response;
}

// Apply partial parameter updates from JSON
static void apply_params_json(const JsonObjectConst& root) {
    PatternParameters updated = get_params();

    if (root.containsKey("brightness")) updated.brightness = root["brightness"].as<float>();
    if (root.containsKey("softness")) updated.softness = root["softness"].as<float>();
    if (root.containsKey("color")) updated.color = root["color"].as<float>();
    if (root.containsKey("color_range")) updated.color_range = root["color_range"].as<float>();
    if (root.containsKey("saturation")) updated.saturation = root["saturation"].as<float>();
    if (root.containsKey("warmth")) updated.warmth = root["warmth"].as<float>();
    if (root.containsKey("background")) updated.background = root["background"].as<float>();
    if (root.containsKey("speed")) updated.speed = root["speed"].as<float>();
    if (root.containsKey("palette_id")) updated.palette_id = root["palette_id"].as<uint8_t>();
    if (root.containsKey("custom_param_1")) updated.custom_param_1 = root["custom_param_1"].as<float>();
    if (root.containsKey("custom_param_2")) updated.custom_param_2 = root["custom_param_2"].as<float>();
    if (root.containsKey("custom_param_3")) updated.custom_param_3 = root["custom_param_3"].as<float>();

    update_params_safe(updated);
}
