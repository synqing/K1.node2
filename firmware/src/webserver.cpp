// Async web server implementation
// Provides REST API for runtime parameter control and pattern switching

#include "webserver.h"
#include "parameters.h"
#include "pattern_registry.h"
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// Global async web server on port 80
static AsyncWebServer server(80);

// Forward declaration: Attach CORS headers to response
static void attach_cors_headers(AsyncWebServerResponse *response);

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

// Initialize web server with REST API endpoints
void init_webserver() {
    // GET /api/patterns - List all available patterns
    server.on("/api/patterns", HTTP_GET, [](AsyncWebServerRequest *request) {
        auto *response = request->beginResponse(200, "application/json", build_patterns_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/params - Get current parameters
    server.on("/api/params", HTTP_GET, [](AsyncWebServerRequest *request) {
        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // POST /api/params - Update parameters (partial update supported)
    server.on("/api/params", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
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

            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, *body);
            delete body;
            request->_tempObject = nullptr;

            if (error) {
                auto *response = request->beginResponse(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                attach_cors_headers(response);
                request->send(response);
                return;
            }

            PatternParameters new_params = get_params();

            // Global visual controls
            if (doc.containsKey("brightness")) new_params.brightness = doc["brightness"].as<float>();
            if (doc.containsKey("softness")) new_params.softness = doc["softness"].as<float>();
            if (doc.containsKey("color")) new_params.color = doc["color"].as<float>();
            if (doc.containsKey("color_range")) new_params.color_range = doc["color_range"].as<float>();
            if (doc.containsKey("saturation")) new_params.saturation = doc["saturation"].as<float>();
            if (doc.containsKey("warmth")) new_params.warmth = doc["warmth"].as<float>();
            if (doc.containsKey("background")) new_params.background = doc["background"].as<float>();
            // Pattern-specific
            if (doc.containsKey("speed")) new_params.speed = doc["speed"].as<float>();
            if (doc.containsKey("palette_id")) new_params.palette_id = doc["palette_id"].as<uint8_t>();

            // Validate and clamp parameters
            bool success = update_params_safe(new_params);
            // Then update directly (same as /reset endpoint which works correctly)
            update_params(new_params);

            // Always return 200 - parameters were applied (may be clamped, but still applied)
            StaticJsonDocument<512> response_doc;
            response_doc["success"] = true;
            response_doc["clamped"] = !success;  // true if any values were clamped

            const PatternParameters& params = get_params();
            response_doc["params"]["brightness"] = params.brightness;
            response_doc["params"]["softness"] = params.softness;
            response_doc["params"]["color"] = params.color;
            response_doc["params"]["color_range"] = params.color_range;
            response_doc["params"]["saturation"] = params.saturation;
            response_doc["params"]["warmth"] = params.warmth;
            response_doc["params"]["background"] = params.background;
            response_doc["params"]["speed"] = params.speed;
            response_doc["params"]["palette_id"] = params.palette_id;

            String output;
            serializeJson(response_doc, output);

            auto *response = request->beginResponse(200, "application/json", output);
            attach_cors_headers(response);
            request->send(response);
        });

    // POST /api/select - Switch pattern by index or ID
    server.on("/api/select", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
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
                auto *response = request->beginResponse(404, "application/json", "{\"error\":\"Invalid pattern index or ID\"}");
                attach_cors_headers(response);
                request->send(response);
            }
        });

    // POST /api/reset - Reset parameters to defaults
    server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest *request) {
        PatternParameters defaults = get_default_params();
        update_params(defaults);
        auto *response = request->beginResponse(200, "application/json", build_params_json());
        attach_cors_headers(response);
        request->send(response);
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
            padding: 40px 20px;
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
            margin-bottom: 80px;
        }
        .section-title {
            font-size: 12px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 30px;
            display: block;
        }
        .pattern-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .pattern-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .pattern-card:hover {
            border-color: rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.06);
        }
        .pattern-card.active {
            border-color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.08);
        }
        .pattern-name {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        .pattern-desc {
            font-size: 12px;
            color: #aaa;
            line-height: 1.5;
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
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .control-value {
            font-size: 13px;
            font-weight: 500;
            color: #fff;
            font-family: 'Monaco', monospace;
        }
        .slider {
            width: 100%;
            height: 2px;
            border-radius: 1px;
            background: rgba(255, 255, 255, 0.1);
            outline: none;
            -webkit-appearance: none;
            appearance: none;
            cursor: pointer;
        }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            transition: box-shadow 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.6);
        }
        .slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            transition: box-shadow 0.2s;
        }
        .slider::-moz-range-thumb:hover {
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.6);
        }
        .divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.05);
            margin: 60px 0;
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
                    <input type="range" class="slider" id="brightness" min="0" max="1" step="0.01" value="1.0" oninput="updateDisplay('brightness')">
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
            </div>
        </div>
    </div>

    <script>
        async function loadPatterns() {
            const res = await fetch('/api/patterns');
            const data = await res.json();
            const container = document.getElementById('patterns');

            container.innerHTML = data.patterns.map(p => {
                const active = p.index === data.current_pattern ? 'active' : '';
                return '<div class="pattern-card ' + active + '" onclick="selectPattern(' + p.index + ')">' +
                    '<div class="pattern-name">' + p.name + '</div>' +
                    '<div class="pattern-desc">' + (p.description || '') + '</div>' +
                    '</div>';
            }).join('');
        }

        async function loadParams() {
            const res = await fetch('/api/params');
            const params = await res.json();

            Object.keys(params).forEach(key => {
                const elem = document.getElementById(key);
                if (elem && elem.type === 'range') {
                    elem.value = params[key];
                    updateDisplay(key, true);
                }
            });
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
                if (!skipUpdate) {
                    updateParams();
                }
            }
        }

        async function updateParams() {
            const params = {
                brightness: parseFloat(document.getElementById('brightness').value),
                softness: parseFloat(document.getElementById('softness').value),
                color: parseFloat(document.getElementById('color').value),
                color_range: parseFloat(document.getElementById('color_range').value),
                saturation: parseFloat(document.getElementById('saturation').value),
                warmth: parseFloat(document.getElementById('warmth').value),
                background: parseFloat(document.getElementById('background').value),
                speed: parseFloat(document.getElementById('speed').value)
            };
            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
        }

        loadPatterns();
        loadParams();
    </script>
</body>
</html>
)HTML";
        auto *response = request->beginResponse(200, "text/html", html);
        attach_cors_headers(response);
        request->send(response);
    });

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
