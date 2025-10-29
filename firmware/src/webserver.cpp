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
#include "webserver_rate_limiter.h"        // Per-route rate limiting
#include "webserver_response_builders.h"  // JSON response building utilities
#include "webserver_request_handler.h"    // Request handler base class and context
#include "webserver_param_validator.h"    // Parameter validation utilities
#include <SPIFFS.h>                       // For serving static web files
#include "logging/logger.h"               // Centralized logging

// Forward declaration: WebSocket event handler
static void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);

// Global async web server on port 80
static AsyncWebServer server(80);

// Global WebSocket server at /ws endpoint
static AsyncWebSocket ws("/ws");

// ============================================================================
// REQUEST HANDLERS - Phase 2B Refactoring
// ============================================================================

// GET /api/patterns - List all available patterns
class GetPatternsHandler : public K1RequestHandler {
public:
    GetPatternsHandler() : K1RequestHandler(ROUTE_PATTERNS, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        ctx.sendJson(200, build_patterns_json());
    }
};

// GET /api/params - Get current parameters
class GetParamsHandler : public K1RequestHandler {
public:
    GetParamsHandler() : K1RequestHandler(ROUTE_PARAMS, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        ctx.sendJson(200, build_params_json());
    }
};

// GET /api/palettes - List all available palettes
class GetPalettesHandler : public K1RequestHandler {
public:
    GetPalettesHandler() : K1RequestHandler(ROUTE_PALETTES, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        ctx.sendJson(200, build_palettes_json());
    }
};

// GET /api/device/info - Device information snapshot
class GetDeviceInfoHandler : public K1RequestHandler {
public:
    GetDeviceInfoHandler() : K1RequestHandler(ROUTE_DEVICE_INFO, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
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
        ctx.sendJson(200, output);
    }
};

// GET /api/device/performance - Performance metrics (FPS, timings, heap)
class GetDevicePerformanceHandler : public K1RequestHandler {
public:
    GetDevicePerformanceHandler() : K1RequestHandler(ROUTE_DEVICE_PERFORMANCE, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;
        float avg_render_us = (float)ACCUM_RENDER_US / frames;
        float avg_quantize_us = (float)ACCUM_QUANTIZE_US / frames;
        float avg_rmt_wait_us = (float)ACCUM_RMT_WAIT_US / frames;
        float avg_rmt_tx_us = (float)ACCUM_RMT_TRANSMIT_US / frames;
        float frame_time_us = avg_render_us + avg_quantize_us + avg_rmt_wait_us + avg_rmt_tx_us;

        uint32_t heap_free = ESP.getFreeHeap();
        uint32_t heap_total = ESP.getHeapSize();
        float memory_percent = ((float)(heap_total - heap_free) / (float)heap_total) * 100.0f;

        // Ensure CPU monitor has a fresh sample before reporting
        // (safe to call; it internally handles timing windows)
        cpu_monitor.update();
        float cpu_percent = cpu_monitor.getAverageCPUUsage();

        StaticJsonDocument<512> doc;
        doc["fps"] = FPS_CPU;
        doc["frame_time_us"] = frame_time_us;
        doc["cpu_percent"] = cpu_percent;
        doc["memory_percent"] = memory_percent;
        doc["memory_free_kb"] = heap_free / 1024;
        doc["memory_total_kb"] = heap_total / 1024;

        // Include FPS history samples (length 16)
        JsonArray fps_history = doc.createNestedArray("fps_history");
        for (int i = 0; i < 16; ++i) {
            fps_history.add(FPS_CPU_SAMPLES[i]);
        }

        String output;
        serializeJson(doc, output);
        ctx.sendJson(200, output);
    }
};

// GET /api/test-connection - Simple connection check
class GetTestConnectionHandler : public K1RequestHandler {
public:
    GetTestConnectionHandler() : K1RequestHandler(ROUTE_TEST_CONNECTION, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        StaticJsonDocument<64> doc;
        doc["status"] = "ok";
        doc["timestamp"] = millis();
        String output;
        serializeJson(doc, output);
        ctx.sendJson(200, output);
    }
};

// POST /api/params - Update parameters (partial update supported)
class PostParamsHandler : public K1RequestHandler {
public:
    PostParamsHandler() : K1RequestHandler(ROUTE_PARAMS, ROUTE_POST) {}
    void handle(RequestContext& ctx) override {
        if (!ctx.hasJson()) {
            ctx.sendError(400, "invalid_json", "Request body contains invalid JSON");
            return;
        }

        // Apply partial parameter updates
        apply_params_json(ctx.getJson());

        // Respond with updated params
        ctx.sendJson(200, build_params_json());
    }
};

// POST /api/select - Switch pattern by index or ID
class PostSelectHandler : public K1RequestHandler {
public:
    PostSelectHandler() : K1RequestHandler(ROUTE_SELECT, ROUTE_POST) {}
    void handle(RequestContext& ctx) override {
        if (!ctx.hasJson()) {
            ctx.sendError(400, "invalid_json", "Request body contains invalid JSON");
            return;
        }

        bool success = false;
        JsonObjectConst json = ctx.getJson();

        if (json.containsKey("index")) {
            uint8_t pattern_index = json["index"].as<uint8_t>();
            success = select_pattern(pattern_index);
        } else if (json.containsKey("id")) {
            const char* pattern_id = json["id"].as<const char*>();
            success = select_pattern_by_id(pattern_id);
        } else {
            ctx.sendError(400, "missing_field", "Missing index or id");
            return;
        }

        if (success) {
            StaticJsonDocument<256> response;
            response["current_pattern"] = g_current_pattern_index;
            response["id"] = get_current_pattern().id;
            response["name"] = get_current_pattern().name;

            String output;
            serializeJson(response, output);
            ctx.sendJson(200, output);
        } else {
            ctx.sendError(404, "pattern_not_found", "Invalid pattern index or ID");
        }
    }
};

// POST /api/reset - Reset parameters to defaults
class PostResetHandler : public K1RequestHandler {
public:
    PostResetHandler() : K1RequestHandler(ROUTE_RESET, ROUTE_POST) {}
    void handle(RequestContext& ctx) override {
        PatternParameters defaults = get_default_params();
        update_params(defaults);
        ctx.sendJson(200, build_params_json());
    }
};

// POST /api/audio-config - Update audio configuration
class PostAudioConfigHandler : public K1RequestHandler {
public:
    PostAudioConfigHandler() : K1RequestHandler(ROUTE_AUDIO_CONFIG, ROUTE_POST) {}
    void handle(RequestContext& ctx) override {
        if (!ctx.hasJson()) {
            ctx.sendError(400, "invalid_json", "Request body contains invalid JSON");
            return;
        }

        // Update microphone gain if provided (range: 0.5 - 2.0)
        JsonObjectConst json = ctx.getJson();
        if (json.containsKey("microphone_gain")) {
            float gain = json["microphone_gain"].as<float>();
            ValidationResult result = validate_microphone_gain(gain);
            if (result.valid) {
                configuration.microphone_gain = result.value;
                LOG_INFO(TAG_AUDIO, "Microphone gain updated to %.2fx", result.value);
            } else {
                ctx.sendError(400, "invalid_value", result.error_message);
                return;
            }
        }

        StaticJsonDocument<128> response_doc;
        response_doc["microphone_gain"] = configuration.microphone_gain;
        String response;
        serializeJson(response_doc, response);
        ctx.sendJson(200, response);
    }
};

// POST /api/wifi/link-options - Update WiFi link options (persist to NVS)
class PostWifiLinkOptionsHandler : public K1RequestHandler {
public:
    PostWifiLinkOptionsHandler() : K1RequestHandler(ROUTE_WIFI_LINK_OPTIONS, ROUTE_POST) {}
    void handle(RequestContext& ctx) override {
        if (!ctx.hasJson()) {
            ctx.sendError(400, "invalid_json", "Request body contains invalid JSON");
            return;
        }

        WifiLinkOptions prev;
        wifi_monitor_get_link_options(prev);
        WifiLinkOptions opts = prev;

        JsonObjectConst json = ctx.getJson();
        if (json.containsKey("force_bg_only")) {
            opts.force_bg_only = json["force_bg_only"].as<bool>();
        }
        if (json.containsKey("force_ht20")) {
            opts.force_ht20 = json["force_ht20"].as<bool>();
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
        ctx.sendJson(200, output);
    }
};

// GET /api/audio-config - Get audio configuration (microphone gain)
class GetAudioConfigHandler : public K1RequestHandler {
public:
    GetAudioConfigHandler() : K1RequestHandler(ROUTE_AUDIO_CONFIG, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        StaticJsonDocument<128> doc;
        doc["microphone_gain"] = configuration.microphone_gain;
        String response;
        serializeJson(doc, response);
        ctx.sendJson(200, response);
    }
};

// GET /api/config/backup - Export current configuration as JSON
class GetConfigBackupHandler : public K1RequestHandler {
public:
    GetConfigBackupHandler() : K1RequestHandler(ROUTE_CONFIG_BACKUP, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
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

        // Send with attachment header for downloading as file
        ctx.sendJsonWithHeaders(200, output, "Content-Disposition", "attachment; filename=\"k1-config-backup.json\"");
    }
};

// GET /api/wifi/link-options - Get current WiFi link options
class GetWifiLinkOptionsHandler : public K1RequestHandler {
public:
    GetWifiLinkOptionsHandler() : K1RequestHandler(ROUTE_WIFI_LINK_OPTIONS, ROUTE_GET) {}
    void handle(RequestContext& ctx) override {
        WifiLinkOptions opts;
        wifi_monitor_get_link_options(opts);
        StaticJsonDocument<128> doc;
        doc["force_bg_only"] = opts.force_bg_only;
        doc["force_ht20"] = opts.force_ht20;
        String output;
        serializeJson(doc, output);
        ctx.sendJson(200, output);
    }
};

// POST /api/config/restore - Import configuration from JSON
class PostConfigRestoreHandler : public K1RequestHandler {
public:
    PostConfigRestoreHandler() : K1RequestHandler(ROUTE_CONFIG_RESTORE, ROUTE_POST) {}

    void handle(RequestContext& ctx) override {
        if (!ctx.hasJson()) {
            ctx.sendError(400, "invalid_json", "Failed to parse configuration JSON");
            return;
        }

        JsonObjectConst doc = ctx.getJson();

        // Validate backup format
        if (!doc.containsKey("version") || !doc.containsKey("parameters")) {
            ctx.sendError(400, "invalid_backup_format", "Missing required fields: version, parameters");
            return;
        }

        // Extract and validate parameters
        JsonObjectConst params_obj = doc["parameters"];
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
        ctx.sendJson(200, output);
    }
};

// ============================================================================
// Handler Memory Management Note
//
// All handlers (14 instances) are allocated with `new` and intentionally never freed.
// This is acceptable because:
// 1. Handlers are singletons (one instance per endpoint, live for device lifetime)
// 2. Total memory: 336 bytes (0.004% of 8MB heap) - negligible
// 3. Device never shuts down handlers - only power cycle resets memory
// 4. Alternative (static allocation) would require changes to registration pattern
//
// If dynamic handler registration is added in future, implement handler_registry
// to track and delete handlers on deregistration.
// ============================================================================
// Initialize web server with REST API endpoints
void init_webserver() {
    // Register GET handlers (with built-in rate limiting)
    registerGetHandler(server, ROUTE_PATTERNS, new GetPatternsHandler());
    registerGetHandler(server, ROUTE_PARAMS, new GetParamsHandler());
    registerGetHandler(server, ROUTE_PALETTES, new GetPalettesHandler());
    registerGetHandler(server, ROUTE_DEVICE_INFO, new GetDeviceInfoHandler());
    registerGetHandler(server, ROUTE_DEVICE_PERFORMANCE, new GetDevicePerformanceHandler());
    registerGetHandler(server, ROUTE_TEST_CONNECTION, new GetTestConnectionHandler());

    // Register POST handlers (with built-in rate limiting and JSON parsing)
    registerPostHandler(server, ROUTE_PARAMS, new PostParamsHandler());
    registerPostHandler(server, ROUTE_SELECT, new PostSelectHandler());
    registerPostHandler(server, ROUTE_RESET, new PostResetHandler());
    registerPostHandler(server, ROUTE_AUDIO_CONFIG, new PostAudioConfigHandler());
    registerPostHandler(server, ROUTE_WIFI_LINK_OPTIONS, new PostWifiLinkOptionsHandler());
    registerPostHandler(server, ROUTE_CONFIG_RESTORE, new PostConfigRestoreHandler());

    // Register remaining GET handlers
    registerGetHandler(server, ROUTE_AUDIO_CONFIG, new GetAudioConfigHandler());
    registerGetHandler(server, ROUTE_CONFIG_BACKUP, new GetConfigBackupHandler());
    registerGetHandler(server, ROUTE_WIFI_LINK_OPTIONS, new GetWifiLinkOptionsHandler());

    // GET / - Serve minimal inline HTML dashboard (SPIFFS fallback for Phase 1)
    // Note: Full UI moved to SPIFFS but served inline here until SPIFFS mounting is resolved
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        String html = R"(<!DOCTYPE html>
<html>
<head>
    <title>K1.reinvented</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #ffd700; }
        .status { background: #222; padding: 10px; border-radius: 5px; margin: 20px 0; }
        .api-test { background: #1a3a3a; padding: 10px; margin: 10px 0; border-left: 3px solid #ffd700; }
        a { color: #ffd700; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .card { background: #1a1a1a; padding: 12px; border-radius: 8px; margin: 16px 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .metric { font-size: 14px; color: #ccc; }
        .value { font-size: 24px; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 K1.reinvented</h1>
        <p>Light as a Statement</p>

        <div class="status">
            <h2>Status: ✅ Online</h2>
            <p>Web server is running and accepting connections.</p>
            <p>All REST APIs are operational for pattern control and configuration.</p>
        </div>

        <div class="card">
            <h2>Performance</h2>
            <div class="grid">
                <div>
                    <div class="metric">CPU</div>
                    <div class="value"><span id="cpuPercent">—</span>%</div>
                </div>
                <div>
                    <div class="metric">FPS</div>
                    <div class="value"><span id="fps">—</span></div>
                </div>
                <div>
                    <div class="metric">Memory</div>
                    <div class="value"><span id="memoryPercent">—</span>% (<span id="freeKb">—</span> KB free)</div>
                </div>
            </div>
            <small id="perfSource" style="color:#888">Source: detecting…</small>
        </div>

        <h2>Available APIs</h2>
        <div class="api-test">
            <strong>GET /api/patterns</strong> - List all available patterns<br>
            <a href="/api/patterns" target="_blank">Test</a>
        </div>
        <div class="api-test">
            <strong>GET /api/params</strong> - Get current parameters<br>
            <a href="/api/params" target="_blank">Test</a>
        </div>
        <div class="api-test">
            <strong>GET /api/palettes</strong> - List available color palettes<br>
            <a href="/api/palettes" target="_blank">Test</a>
        </div>

        <h2>Next Steps</h2>
        <p>Full web UI with pattern grid and controls available at:</p>
        <code>/ui/index.html</code> (when SPIFFS mounting is fully resolved)

        <p><small>Phase 1: Webserver refactoring complete. Moving to Phase 2: Request handler modularization.</small></p>
    </div>
    <script>
    (function(){
      const els = {
        cpu: document.getElementById('cpuPercent'),
        fps: document.getElementById('fps'),
        memPct: document.getElementById('memoryPercent'),
        freeKb: document.getElementById('freeKb'),
        src: document.getElementById('perfSource'),
      };

      function setValue(el, val, suffix='') {
        if (!el) return;
        if (val === undefined || val === null || Number.isNaN(val)) {
          el.textContent = '—';
        } else {
          const num = typeof val === 'number' ? val.toFixed(1) : val;
          el.textContent = num + (suffix || '');
        }
      }

      function applyPerf(perf) {
        if (!perf) return;
        setValue(els.cpu, perf.cpu_percent);
        setValue(els.fps, perf.fps);
        setValue(els.memPct, perf.memory_percent);
        setValue(els.freeKb, perf.memory_free_kb, '');
      }

      // WebSocket first, REST fallback
      let ws;
      try {
        ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
        ws.onopen = function(){ if (els.src) els.src.textContent = 'Source: WebSocket'; };
        ws.onmessage = function(evt){
          try {
            const msg = JSON.parse(evt.data);
            if (msg && msg.type === 'realtime' && msg.performance) {
              applyPerf(msg.performance);
            }
          } catch (e) {}
        };
        ws.onerror = function(){ startRestFallback(); };
        ws.onclose = function(){ startRestFallback(); };
      } catch(e) { startRestFallback(); }

      let restTimer;
      function startRestFallback(){
        if (els.src) els.src.textContent = 'Source: REST';
        if (restTimer) return;
        restTimer = setInterval(async function(){
          try {
            const res = await fetch('/api/device/performance');
            const json = await res.json();
            applyPerf(json);
          } catch(e) { /* ignore */ }
        }, 2000);
      }
    })();
    </script>
</body>
</html>)";
        request->send(200, "text/html", html);
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

    // Static file serving is configured below with serveStatic()

    // Initialize WebSocket server
    ws.onEvent(onWebSocketEvent);
    server.addHandler(&ws);

    // Initialize mDNS for device discovery
    if (MDNS.begin("k1-reinvented")) {
        LOG_INFO(TAG_WEB, "mDNS responder started: k1-reinvented.local");

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
        LOG_ERROR(TAG_WEB, "Error starting mDNS responder");
    }

    // Start server
    server.begin();
    LOG_INFO(TAG_WEB, "Web server started on port 80");
    LOG_INFO(TAG_WEB, "WebSocket server available at /ws");
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
            LOG_DEBUG(TAG_WEB, "WebSocket client #%u connected from %s", client->id(), client->remoteIP().toString().c_str());
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
            LOG_DEBUG(TAG_WEB, "WebSocket client #%u disconnected", client->id());
            break;
            
        case WS_EVT_DATA:
            {
                AwsFrameInfo *info = (AwsFrameInfo*)arg;
                if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
                    // Handle incoming WebSocket message (for future bidirectional communication)
                    data[len] = 0; // Null terminate
                    LOG_DEBUG(TAG_WEB, "WebSocket message from client #%u: %s", client->id(), (char*)data);
                    
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

    // Lightweight rate limiting based on current WiFi link options
    // - Default interval: 100ms
    // - If forced b/g-only or HT20 (narrow bandwidth), relax to 200ms
    static uint32_t last_broadcast_ms = 0;
    WifiLinkOptions opts;
    wifi_monitor_get_link_options(opts);
    const uint32_t interval_ms = (opts.force_bg_only || opts.force_ht20) ? 200u : 100u;
    uint32_t now = millis();
    if (now - last_broadcast_ms < interval_ms) {
        return;
    }
    last_broadcast_ms = now;
    
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
    
    // Current parameters (full set for real-time updates)
    const PatternParameters& params = get_params();
    JsonObject parameters = doc.createNestedObject("parameters");
    parameters["brightness"] = params.brightness;
    parameters["softness"] = params.softness;
    parameters["color"] = params.color;
    parameters["color_range"] = params.color_range;
    parameters["saturation"] = params.saturation;
    parameters["warmth"] = params.warmth;
    parameters["background"] = params.background;
    parameters["dithering"] = params.dithering;
    parameters["speed"] = params.speed;
    parameters["palette_id"] = params.palette_id;
    parameters["custom_param_1"] = params.custom_param_1;
    parameters["custom_param_2"] = params.custom_param_2;
    parameters["custom_param_3"] = params.custom_param_3;

    // Current pattern selection for UI sync
    doc["current_pattern"] = g_current_pattern_index;
    
    String message;
    serializeJson(doc, message);
    ws.textAll(message);
}
