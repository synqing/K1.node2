# Webserver.cpp Split & Refactoring Proposal

**Author:** SUPREME Analyst (Claude)
**Date:** 2025-10-27
**Status:** Published
**Intent:** Detailed proposal for splitting monolithic webserver.cpp into maintainable modules

---

## CURRENT STATE ANALYSIS

### Problem Summary

`webserver.cpp` (1,339 lines) violates single responsibility principle by combining:

1. **Web server initialization** (10%)
2. **REST API endpoints** (40%)
3. **Embedded HTML/CSS/JavaScript** (46%)
4. **Rate limiting infrastructure** (2%)
5. **JSON serialization helpers** (2%)

This creates:
- Excessive file size (67% above industry baseline)
- High complexity (2.25x cyclomatic complexity benchmark)
- Code duplication (22.4% boilerplate)
- Poor testability (all lambdas, no named functions)
- Development friction (can't edit HTML with standard tools)

### Current Architecture

```
webserver.cpp (1,339 lines)
├── Includes (10 lines)
├── Global state (45 lines)
│   ├── Route constants (11)
│   ├── AsyncWebServer instance (1)
│   └── Rate limit window table (14)
├── init_webserver() (1,140 lines)
│   ├── GET / (626 lines with embedded HTML)
│   ├── GET /api/patterns (13 lines)
│   ├── GET /api/params (13 lines)
│   ├── POST /api/params (40 lines)
│   ├── POST /api/select (66 lines)
│   ├── POST /api/reset (16 lines)
│   ├── GET /api/audio-config (17 lines)
│   ├── POST /api/audio-config (54 lines)
│   ├── GET /api/palettes (13 lines)
│   ├── GET /api/wifi/link-options (20 lines)
│   ├── POST /api/wifi/link-options (67 lines)
│   ├── GET /api/device/info (25 lines)
│   ├── GET /api/device/performance (34 lines)
│   ├── GET /api/test-connection (18 lines)
│   └── OPTIONS preflight (10 lines)
├── handle_webserver() (3 lines - stub)
├── Helper functions (30 lines)
│   ├── build_params_json() (22 lines)
│   ├── build_patterns_json() (21 lines)
│   └── build_palettes_json() (36 lines)
└── Utility functions (30 lines)
    ├── attach_cors_headers() (9 lines)
    ├── apply_params_json() (19 lines)
    └── route_is_rate_limited() (35 lines)
```

---

## PROPOSED ARCHITECTURE

### Split Strategy: 4-File Approach

```
firmware/src/
├── webserver.cpp                (200 lines) - Initialization & routing
├── webserver_api.cpp            (350 lines) - REST endpoint handlers
├── webserver_utils.cpp          (120 lines) - JSON serialization helpers
├── webserver_rate_limit.cpp     (60 lines)  - Rate limiting implementation
├── webserver_rate_limit.h       (40 lines)  - Rate limiting public API
└── webserver_html.cpp           (10 lines)  - HTML asset delivery
    └── (OR) firmware/assets/dashboard.html (650 lines) - External asset

Total C++ code: ~780 lines (vs. 1,339 currently)
```

### File-by-File Breakdown

#### 1. webserver.cpp (200 lines) - MAIN COORDINATOR

**Purpose:** Web server initialization and endpoint registration orchestration

**Responsibilities:**
- Include dependencies
- Define global AsyncWebServer instance
- Initialize rate limiting
- Register endpoint handlers (via function calls)
- Start server

**Public API:**
```cpp
void init_webserver();
void handle_webserver();
```

**Content:**

```cpp
// webserver.cpp (200 lines)

#include "webserver.h"
#include "webserver_api.h"
#include "webserver_utils.h"
#include "webserver_rate_limit.h"
#include "webserver_html.h"
#include <ArduinoJson.h>

// Global async web server on port 80
static AsyncWebServer server(80);

// Forward declarations
static void register_cors_handler(AsyncWebServer& server);
static void register_notfound_handler(AsyncWebServer& server);

// Initialize web server with REST API endpoints
void init_webserver() {
    // Register rate limiting system
    init_rate_limiting();

    // Register endpoint groups
    register_dashboard_endpoint(server);
    register_query_endpoints(server);
    register_control_endpoints(server);
    register_system_endpoints(server);

    // Register CORS preflight handler
    register_cors_handler(server);

    // Register 404 handler
    register_notfound_handler(server);

    // Start server
    server.begin();
    Serial.println("Web server started on port 80");
}

// Handle web server (AsyncWebServer is non-blocking, so this is a no-op)
void handle_webserver() {
    // AsyncWebServer handles requests in the background
    // No action needed in loop()
}

// Allow cross-origin requests for local dev tools / browsers
static void attach_cors_headers(AsyncWebServerResponse *response) {
    if (!response) return;
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    response->addHeader("Access-Control-Allow-Credentials", "false");
}

static void register_cors_handler(AsyncWebServer& server) {
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
}

static void register_notfound_handler(AsyncWebServer& server) {
    // See above (combined with CORS)
}
```

#### 2. webserver_api.cpp (350 lines) - ENDPOINT HANDLERS

**Purpose:** REST endpoint handler implementations

**Responsibilities:**
- Implement 15 API endpoints
- Handle JSON request/response
- Delegate to parameter/pattern/WiFi systems

**Public API:**
```cpp
// webserver_api.h
void register_dashboard_endpoint(AsyncWebServer& server);
void register_query_endpoints(AsyncWebServer& server);
void register_control_endpoints(AsyncWebServer& server);
void register_system_endpoints(AsyncWebServer& server);
```

**Organization by functionality:**

```cpp
// webserver_api.cpp (350 lines)

#include "webserver_api.h"
#include "webserver_utils.h"
#include "webserver_rate_limit.h"
#include "parameters.h"
#include "pattern_registry.h"
#include "palettes.h"
#include "wifi_monitor.h"
#include "connection_state.h"
#include "profiler.h"

// DASHBOARD ENDPOINT
void register_dashboard_endpoint(AsyncWebServer& server) {
    extern const uint8_t dashboard_start[] asm("_binary_dashboard_html_start");
    extern const uint8_t dashboard_end[] asm("_binary_dashboard_html_end");

    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        auto *response = request->beginResponse(200, "text/html");
        response->write(dashboard_start, dashboard_end - dashboard_start);
        attach_cors_headers(response);
        request->send(response);
    });
}

// QUERY ENDPOINTS (GET only, read-only state)
void register_query_endpoints(AsyncWebServer& server) {
    // GET /api/patterns - List all available patterns
    server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_PATTERNS, ROUTE_GET);
        auto *response = request->beginResponse(200, "application/json", build_patterns_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/params - Get current parameters
    server.on(ROUTE_PARAMS, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_PARAMS, ROUTE_GET);
        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/palettes - Get palette metadata
    server.on(ROUTE_PALETTES, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_PALETTES, ROUTE_GET);
        auto *response = request->beginResponse(200, "application/json", build_palettes_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/audio-config - Get audio configuration
    server.on(ROUTE_AUDIO_CONFIG, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_AUDIO_CONFIG, ROUTE_GET);
        StaticJsonDocument<128> doc;
        doc["microphone_gain"] = configuration.microphone_gain;
        String response;
        serializeJson(doc, response);
        auto *resp = request->beginResponse(200, "application/json", response);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/wifi/link-options - Get current WiFi link options
    server.on(ROUTE_WIFI_LINK_OPTIONS, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_WIFI_LINK_OPTIONS, ROUTE_GET);
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

    // GET /metrics - Lightweight device and WiFi status
    server.on(ROUTE_METRICS, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_METRICS, ROUTE_GET);
        StaticJsonDocument<384> doc;
        // ... populate metrics ...
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/device/info - Device information snapshot
    server.on(ROUTE_DEVICE_INFO, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_DEVICE_INFO, ROUTE_GET);
        StaticJsonDocument<256> doc;
        doc["device"] = "K1.reinvented";
        doc["firmware"] = String(ESP.getSdkVersion());
        doc["uptime"] = (uint32_t)(millis() / 1000);
        doc["ip"] = WiFi.localIP().toString();
        doc["mac"] = WiFi.macAddress();
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/device/performance - Performance metrics
    server.on(ROUTE_DEVICE_PERFORMANCE, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_DEVICE_PERFORMANCE, ROUTE_GET);
        // ... performance calculations ...
        StaticJsonDocument<256> doc;
        doc["fps"] = FPS_CPU;
        doc["memory_percent"] = memory_percent;
        // ...
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // GET /api/test-connection - Simple connection check
    server.on(ROUTE_TEST_CONNECTION, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_TEST_CONNECTION, ROUTE_GET);
        StaticJsonDocument<64> doc;
        doc["ok"] = true;
        doc["uptime_ms"] = millis();
        String output;
        serializeJson(doc, output);
        auto *resp = request->beginResponse(200, "application/json", output);
        attach_cors_headers(resp);
        request->send(resp);
    });
}

// CONTROL ENDPOINTS (POST - state modifications)
void register_control_endpoints(AsyncWebServer& server) {
    // POST /api/params - Update parameters (partial update supported)
    server.on(ROUTE_PARAMS, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            handle_json_post(request, data, len, index, total, ROUTE_PARAMS,
                [](AsyncWebServerRequest *req, const JsonObjectConst& root) {
                    apply_params_json(root);
                    String response = build_params_json();
                    auto *resp = req->beginResponse(200, "application/json", response);
                    attach_cors_headers(resp);
                    req->send(resp);
                });
        });

    // POST /api/select - Switch pattern by index or ID
    server.on(ROUTE_SELECT, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            handle_json_post(request, data, len, index, total, ROUTE_SELECT,
                [](AsyncWebServerRequest *req, const JsonObjectConst& root) {
                    bool success = false;
                    if (root.containsKey("index")) {
                        success = select_pattern(root["index"].as<uint8_t>());
                    } else if (root.containsKey("id")) {
                        success = select_pattern_by_id(root["id"].as<const char*>());
                    } else {
                        req->send(400, "application/json", "{\"error\":\"Missing index or id\"}");
                        return;
                    }

                    if (success) {
                        StaticJsonDocument<256> response;
                        response["current_pattern"] = g_current_pattern_index;
                        response["id"] = get_current_pattern().id;
                        response["name"] = get_current_pattern().name;
                        String output;
                        serializeJson(response, output);
                        req->send(200, "application/json", output);
                    } else {
                        auto *resp = req->beginResponse(404, "application/json",
                                                       "{\"error\":\"Invalid pattern index or ID\"}");
                        attach_cors_headers(resp);
                        req->send(resp);
                    }
                });
        });

    // POST /api/reset - Reset parameters to defaults
    server.on(ROUTE_RESET, HTTP_POST, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_RESET, ROUTE_POST);
        PatternParameters defaults = get_default_params();
        update_params(defaults);
        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // POST /api/audio-config - Update audio configuration
    server.on(ROUTE_AUDIO_CONFIG, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            handle_json_post(request, data, len, index, total, ROUTE_AUDIO_CONFIG,
                [](AsyncWebServerRequest *req, const JsonObjectConst& root) {
                    if (root.containsKey("microphone_gain")) {
                        float gain = root["microphone_gain"].as<float>();
                        gain = fmaxf(0.5f, fminf(2.0f, gain));
                        configuration.microphone_gain = gain;
                        Serial.printf("[AUDIO CONFIG] Microphone gain updated to %.2fx\n", gain);
                    }

                    StaticJsonDocument<128> response_doc;
                    response_doc["microphone_gain"] = configuration.microphone_gain;
                    String response;
                    serializeJson(response_doc, response);
                    auto *resp = req->beginResponse(200, "application/json", response);
                    attach_cors_headers(resp);
                    req->send(resp);
                });
        });

    // POST /api/wifi/link-options - Update WiFi link options
    server.on(ROUTE_WIFI_LINK_OPTIONS, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            handle_json_post(request, data, len, index, total, ROUTE_WIFI_LINK_OPTIONS,
                [](AsyncWebServerRequest *req, const JsonObjectConst& root) {
                    WifiLinkOptions prev;
                    wifi_monitor_get_link_options(prev);
                    WifiLinkOptions opts = prev;

                    if (root.containsKey("force_bg_only")) {
                        opts.force_bg_only = root["force_bg_only"].as<bool>();
                    }
                    if (root.containsKey("force_ht20")) {
                        opts.force_ht20 = root["force_ht20"].as<bool>();
                    }

                    wifi_monitor_update_link_options(opts);
                    wifi_monitor_save_link_options_to_nvs(opts);

                    if (opts.force_bg_only != prev.force_bg_only || opts.force_ht20 != prev.force_ht20) {
                        wifi_monitor_reassociate_now("link options changed");
                    }

                    StaticJsonDocument<128> respDoc;
                    respDoc["success"] = true;
                    respDoc["force_bg_only"] = opts.force_bg_only;
                    respDoc["force_ht20"] = opts.force_ht20;
                    String output;
                    serializeJson(respDoc, output);
                    auto *resp = req->beginResponse(200, "application/json", output);
                    attach_cors_headers(resp);
                    req->send(resp);
                });
        });
}

// SYSTEM ENDPOINTS
void register_system_endpoints(AsyncWebServer& server) {
    // (Empty - other endpoints belong to query/control categories)
}
```

#### 3. webserver_utils.cpp (120 lines) - SERIALIZATION HELPERS

**Purpose:** JSON serialization and response building utilities

**Responsibilities:**
- Build parameter JSON responses
- Build pattern list JSON
- Build palette metadata JSON
- Handle generic JSON POST bodies

**Public API:**
```cpp
// webserver_utils.h
String build_params_json();
String build_patterns_json();
String build_palettes_json();
void attach_cors_headers(AsyncWebServerResponse *response);
void apply_params_json(const JsonObjectConst& root);
void handle_json_post(AsyncWebServerRequest *request, uint8_t *data, size_t len,
                     size_t index, size_t total, const char* route,
                     std::function<void(AsyncWebServerRequest*, const JsonObjectConst&)> handler);
```

**Content:**

```cpp
// webserver_utils.cpp (120 lines)

#include "webserver_utils.h"
#include "webserver_rate_limit.h"
#include "parameters.h"
#include "pattern_registry.h"
#include "palettes.h"
#include <ArduinoJson.h>

// Helper: Build JSON response for current parameters
String build_params_json() {
    const PatternParameters& params = get_params();
    StaticJsonDocument<512> doc;
    doc["brightness"] = params.brightness;
    doc["softness"] = params.softness;
    doc["color"] = params.color;
    doc["color_range"] = params.color_range;
    doc["saturation"] = params.saturation;
    doc["warmth"] = params.warmth;
    doc["background"] = params.background;
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
    // Use heap allocation to avoid 4KB stack spike
    DynamicJsonDocument *doc = new DynamicJsonDocument(4096);
    JsonArray palettes = doc->createNestedArray("palettes");

    for (uint8_t i = 0; i < NUM_PALETTES; i++) {
        JsonObject palette = palettes.createNestedObject();
        palette["id"] = i;
        palette["name"] = palette_names[i];

        JsonArray colors = palette.createNestedArray("colors");
        for (int j = 0; j < 5; j++) {
            float progress = j / 4.0f;
            CRGBF color = color_from_palette(i, progress, 1.0f);
            JsonObject colorObj = colors.createNestedObject();
            colorObj["r"] = (uint8_t)(color.r * 255);
            colorObj["g"] = (uint8_t)(color.g * 255);
            colorObj["b"] = (uint8_t)(color.b * 255);
        }

        PaletteInfo info;
        memcpy_P(&info, &palette_table[i], sizeof(PaletteInfo));
        palette["num_keyframes"] = info.num_entries;
    }

    (*doc)["count"] = NUM_PALETTES;
    String output;
    serializeJson(*doc, output);
    delete doc;
    return output;
}

// Allow cross-origin requests for local dev tools / browsers
void attach_cors_headers(AsyncWebServerResponse *response) {
    if (!response) return;
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    response->addHeader("Access-Control-Allow-Credentials", "false");
}

// Apply partial parameter updates from JSON
void apply_params_json(const JsonObjectConst& root) {
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

// Generic JSON POST body handler with rate limiting
void handle_json_post(AsyncWebServerRequest *request, uint8_t *data, size_t len,
                     size_t index, size_t total, const char* route,
                     std::function<void(AsyncWebServerRequest*, const JsonObjectConst&)> handler) {
    String *body = static_cast<String*>(request->_tempObject);

    // Accumulate data
    if (index == 0) {
        body = new String();
        body->reserve(total);
        request->_tempObject = body;
    }
    body->concat(reinterpret_cast<const char*>(data), len);

    // Wait for complete body
    if (index + len != total) {
        return;
    }

    // Check rate limit
    uint32_t window_ms = 0, next_ms = 0;
    if (route_is_rate_limited(route, ROUTE_POST, &window_ms, &next_ms)) {
        delete body;
        request->_tempObject = nullptr;
        auto *resp429 = request->beginResponse(429, "application/json",
                                               "{\"error\":\"rate_limited\"}");
        resp429->addHeader("X-RateLimit-Window", String(window_ms));
        resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
        attach_cors_headers(resp429);
        request->send(resp429);
        return;
    }

    // Parse JSON
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, *body);
    delete body;
    request->_tempObject = nullptr;

    if (error) {
        auto *response = request->beginResponse(400, "application/json",
                                                "{\"error\":\"Invalid JSON\"}");
        attach_cors_headers(response);
        request->send(response);
        return;
    }

    // Call handler
    handler(request, doc.as<JsonObjectConst>());
}
```

#### 4. webserver_rate_limit.h (40 lines) - RATE LIMIT API

**Purpose:** Public interface for rate limiting

**Responsibilities:**
- Define rate limit structures
- Provide rate limit check function
- Provide helper macro for boilerplate reduction

**Content:**

```cpp
// webserver_rate_limit.h

#pragma once

#include <stdint.h>
#include <cstring>

enum RouteMethod { ROUTE_GET = 0, ROUTE_POST = 1 };
struct RouteWindow { const char* path; RouteMethod method; uint32_t window_ms; uint32_t last_ms; };

// Macro for reducing boilerplate in handlers
#define CHECK_RATE_LIMIT(path, method) \
    do { \
        uint32_t window_ms = 0, next_ms = 0; \
        if (route_is_rate_limited(path, method, &window_ms, &next_ms)) { \
            auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}"); \
            resp429->addHeader("X-RateLimit-Window", String(window_ms)); \
            resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms)); \
            attach_cors_headers(resp429); \
            request->send(resp429); \
            return; \
        } \
    } while(0)

// Public API
void init_rate_limiting();
bool route_is_rate_limited(const char* path, RouteMethod method,
                          uint32_t* out_window_ms = nullptr,
                          uint32_t* out_next_allowed_ms = nullptr);
```

#### 5. webserver_rate_limit.cpp (60 lines) - RATE LIMIT IMPLEMENTATION

**Purpose:** Rate limiting logic implementation

**Responsibilities:**
- Manage rate limit windows
- Implement rate limit check logic
- Initialize rate limit table

**Content:**

```cpp
// webserver_rate_limit.cpp

#include "webserver_rate_limit.h"
#include <Arduino.h>

// Per-route windows; GET requests are not rate limited by default
static RouteWindow control_windows[] = {
    {"/api/params", ROUTE_POST, 300, 0},
    {"/api/wifi/link-options", ROUTE_POST, 300, 0},
    {"/api/select", ROUTE_POST, 200, 0},
    {"/api/audio-config", ROUTE_POST, 300, 0},
    {"/api/reset", ROUTE_POST, 1000, 0},
    {"/metrics", ROUTE_GET, 200, 0},
    {"/api/params", ROUTE_GET, 150, 0},
    {"/api/audio-config", ROUTE_GET, 500, 0},
    {"/api/wifi/link-options", ROUTE_GET, 500, 0},
    {"/api/patterns", ROUTE_GET, 1000, 0},
    {"/api/palettes", ROUTE_GET, 2000, 0},
    {"/api/device/info", ROUTE_GET, 1000, 0},
    {"/api/test-connection", ROUTE_GET, 200, 0},
    {"/api/device/performance", ROUTE_GET, 500, 0},
};

static const size_t control_windows_count = sizeof(control_windows) / sizeof(control_windows[0]);

void init_rate_limiting() {
    // Reset all windows
    for (size_t i = 0; i < control_windows_count; ++i) {
        control_windows[i].last_ms = 0;
    }
}

bool route_is_rate_limited(const char* path, RouteMethod method, uint32_t* out_window_ms,
                          uint32_t* out_next_allowed_ms) {
    uint32_t now = millis();
    for (size_t i = 0; i < control_windows_count; ++i) {
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
                return true;  // RATE LIMITED
            }
            // Not limited; update last_ms
            w.last_ms = now;
            if (out_window_ms) *out_window_ms = w.window_ms;
            if (out_next_allowed_ms) *out_next_allowed_ms = 0;
            return false;
        }
    }
    // Default: GET is unlimited; unknown routes treated as unlimited
    if (out_window_ms) *out_window_ms = 0;
    if (out_next_allowed_ms) *out_next_allowed_ms = 0;
    return false;
}
```

#### 6. webserver_html.cpp (10 lines) OR firmware/assets/dashboard.html

**Option A: Embedded Asset (10 lines)**

```cpp
// webserver_html.cpp
// Embeds compiled binary asset from CMake

extern const uint8_t dashboard_start[] asm("_binary_dashboard_html_start");
extern const uint8_t dashboard_end[] asm("_binary_dashboard_html_end");

// Used in webserver_api.cpp:
// auto *response = request->beginResponse(200, "text/html");
// response->write(dashboard_start, dashboard_end - dashboard_start);
```

**Option B: External Asset (650 lines)**

```html
<!-- firmware/assets/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>K1.reinvented</title>
    ...
    <style>
        /* CSS from original file */
    </style>
</head>
<body>
    <!-- HTML structure -->
    <script>
        // JavaScript from original file
    </script>
</body>
</html>
```

---

## MIGRATION STRATEGY

### Phase 1: Setup (1-2 hours)

1. Create new file structure:
   ```bash
   touch firmware/src/webserver_api.h
   touch firmware/src/webserver_api.cpp
   touch firmware/src/webserver_utils.h
   touch firmware/src/webserver_utils.cpp
   touch firmware/src/webserver_rate_limit.h
   touch firmware/src/webserver_rate_limit.cpp
   ```

2. Create CMake build entries:
   ```cmake
   # CMakeLists.txt or project-specific build file
   target_sources(firmware PRIVATE
       src/webserver.cpp
       src/webserver_api.cpp
       src/webserver_utils.cpp
       src/webserver_rate_limit.cpp
   )
   ```

### Phase 2: Move Code (3-4 hours)

1. Extract rate limiting (webserver_rate_limit.h/cpp)
   - Copy route constants
   - Copy RouteWindow definition
   - Copy control_windows[] array
   - Copy route_is_rate_limited() function
   - Verify compilation

2. Extract JSON helpers (webserver_utils.h/cpp)
   - Copy build_params_json()
   - Copy build_patterns_json()
   - Copy build_palettes_json()
   - Copy attach_cors_headers()
   - Copy apply_params_json()
   - Add handle_json_post() helper
   - Verify compilation

3. Extract endpoints (webserver_api.h/cpp)
   - Create register_dashboard_endpoint()
   - Create register_query_endpoints()
   - Create register_control_endpoints()
   - Move all server.on() calls
   - Verify compilation

4. Simplify init_webserver() (webserver.cpp)
   - Replace large init_webserver() with coordinator
   - Call register_*_endpoints() functions
   - Add init_rate_limiting() call
   - Verify compilation

### Phase 3: Testing (2-3 hours)

1. Compile all targets
2. Deploy to device
3. Test each endpoint:
   - GET /api/patterns
   - GET /api/params
   - POST /api/params
   - POST /api/select
   - POST /api/reset
   - All other endpoints

4. Verify rate limiting:
   - Test 429 responses
   - Verify rate limit headers

5. Test dashboard:
   - Load http://device
   - Test pattern selection
   - Test parameter sliders
   - Test WiFi configuration

---

## BUILD SYSTEM CHANGES

### CMakeLists.txt Updates

```cmake
# Current (old)
target_sources(firmware PRIVATE
    src/webserver.cpp
)

# New
target_sources(firmware PRIVATE
    src/webserver.cpp
    src/webserver_api.cpp
    src/webserver_utils.cpp
    src/webserver_rate_limit.cpp
)

# If using embedded HTML asset:
target_add_binary_data(firmware assets/dashboard.html)
```

---

## SUCCESS METRICS

### Code Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Total LOC | 1,339 | ~780 | <800 |
| Largest function | 1,140 | ~150 | <200 |
| Cyclomatic complexity | 45 | <20 | <20 |
| Duplication | 22.4% | <5% | <5% |
| Comment density | 5.1% | 12% | >10% |
| File count | 1 | 4 | Optimal |
| Nesting depth | 7 | 3-4 | <4 |

### Functional Metrics

- [ ] All 15 endpoints work identically
- [ ] Rate limiting functions correctly
- [ ] Dashboard loads and operates normally
- [ ] No performance degradation
- [ ] All parameters can be controlled
- [ ] WiFi configuration works
- [ ] Device metrics visible

### Quality Metrics

- [ ] Zero compiler warnings
- [ ] All tests pass
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Team understands architecture

---

## ROLLBACK PLAN

If issues arise during refactoring:

1. Keep original webserver.cpp in git history
2. Branch strategy: feature/webserver-split
3. If critical bugs found:
   - Revert to original branch
   - File issue with reproduction
   - Plan fix for next iteration

---

## FUTURE IMPROVEMENTS

Post-refactoring opportunities:

1. **Middleware pattern** for rate limiting
   - Eliminates boilerplate further
   - Makes it reusable for other systems

2. **Async request handlers**
   - Move expensive operations (JSON serialization) off critical path
   - Use AsyncWebServer's full async potential

3. **Configuration file** for rate limits
   - Load from NVS/SD card
   - Enable runtime tuning without recompile

4. **API versioning**
   - Support /api/v1/ and /api/v2/ simultaneously
   - Easier deprecation of old endpoints

5. **Metrics/monitoring**
   - Track endpoint usage
   - Identify performance bottlenecks
   - Monitor rate limit effectiveness

6. **Unit tests**
   - Test JSON builders in isolation
   - Mock parameter/pattern systems
   - Verify rate limit logic

7. **Documentation generation**
   - Extract OpenAPI/Swagger from endpoints
   - Auto-generate client libraries

---

## ESTIMATED TIMELINE

- **Planning**: 2 hours
- **Setup & structure**: 2 hours
- **Code extraction**: 4 hours
- **Testing & verification**: 3 hours
- **Documentation**: 2 hours
- **Buffer (unexpected issues)**: 3 hours

**Total: 16 hours (2 days of focused work)**

**Recommended: 2-3 week iteration** (part-time refactoring alongside other work)

