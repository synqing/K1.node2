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
#include "webserver_rate_limiter.h"       // Per-route rate limiting
#include "webserver_response_builders.h"  // JSON response building utilities
#include <SPIFFS.h>                       // For serving static web files

// Forward declaration: WebSocket event handler
static void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);

// Global async web server on port 80
static AsyncWebServer server(80);

// Global WebSocket server at /ws endpoint
static AsyncWebSocket ws("/ws");



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

    // GET / - Serve web dashboard from SPIFFS
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(SPIFFS, "/index.html", "text/html");
    });

    // GET /css/* - Serve CSS stylesheets
    server.on("/css/*", HTTP_GET, [](AsyncWebServerRequest *request) {
        String path = request->url();
        request->send(SPIFFS, path, "text/css");
    });

    // GET /js/* - Serve JavaScript files
    server.on("/js/*", HTTP_GET, [](AsyncWebServerRequest *request) {
        String path = request->url();
        request->send(SPIFFS, path, "application/javascript");
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
