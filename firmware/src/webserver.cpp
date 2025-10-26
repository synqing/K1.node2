// Async web server implementation
// Provides REST API for runtime parameter control and pattern switching

#include "webserver.h"
#include "parameters.h"
#include "pattern_registry.h"
#include "audio/goertzel.h"  // For audio configuration (microphone gain)
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

    // GET /api/audio-config - Get audio configuration (microphone gain)
    server.on("/api/audio-config", HTTP_GET, [](AsyncWebServerRequest *request) {
        StaticJsonDocument<128> doc;
        doc["microphone_gain"] = configuration.microphone_gain;
        String response;
        serializeJson(doc, response);
        auto *resp = request->beginResponse(200, "application/json", response);
        attach_cors_headers(resp);
        request->send(resp);
    });

    // POST /api/audio-config - Update audio configuration
    server.on("/api/audio-config", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
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
            min-width: 35px;
            text-align: right;
        }
        .slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: linear-gradient(to right,
                rgba(255, 255, 255, 0.05),
                rgba(255, 255, 255, 0.15),
                rgba(255, 255, 255, 0.05)
            );
            outline: none;
            -webkit-appearance: none;
            appearance: none;
            cursor: pointer;
            margin-bottom: 8px;
            transition: background 0.2s;
        }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fff 0%, #e8e8e8 100%);
            cursor: grab;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.4),
                        inset 0 1px 2px rgba(255, 255, 255, 0.8);
            transition: all 0.2s;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .slider::-webkit-slider-thumb:hover {
            width: 20px;
            height: 20px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6),
                        inset 0 1px 2px rgba(255, 255, 255, 0.8),
                        0 0 8px rgba(255, 215, 0, 0.3);
        }
        .slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            box-shadow: 0 0 24px rgba(255, 215, 0, 0.6),
                        inset 0 1px 2px rgba(255, 255, 255, 0.9);
        }
        .slider::-moz-range-track {
            background: transparent;
            border: none;
        }
        .slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fff 0%, #e8e8e8 100%);
            cursor: grab;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.4),
                        inset 0 1px 2px rgba(255, 255, 255, 0.8);
            transition: all 0.2s;
        }
        .slider::-moz-range-thumb:hover {
            width: 20px;
            height: 20px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6),
                        inset 0 1px 2px rgba(255, 255, 255, 0.8),
                        0 0 8px rgba(255, 215, 0, 0.3);
        }
        .slider::-moz-range-thumb:active {
            cursor: grabbing;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        }
        .slider:focus {
            outline: 2px solid rgba(255, 215, 0, 0.5);
            outline-offset: 2px;
        }
        .divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.05);
            margin: 40px 0;
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

        async function loadAudioConfig() {
            const res = await fetch('/api/audio-config');
            const config = await res.json();

            const gainElem = document.getElementById('microphone-gain');
            const gainVal = document.getElementById('microphone-gain-val');

            if (gainElem && config.microphone_gain) {
                gainElem.value = config.microphone_gain;
                gainVal.textContent = config.microphone_gain.toFixed(2) + 'x';
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

        loadPatterns();
        loadParams();
        loadAudioConfig();
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
