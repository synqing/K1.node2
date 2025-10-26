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
    doc["speed"] = params.speed;
    doc["brightness"] = params.brightness;
    doc["palette_id"] = params.palette_id;
    doc["palette_shift"] = params.palette_shift;
    doc["beat_sensitivity"] = params.beat_sensitivity;
    doc["spectrum_low"] = params.spectrum_low;
    doc["spectrum_mid"] = params.spectrum_mid;
    doc["spectrum_high"] = params.spectrum_high;

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

            if (doc.containsKey("speed")) new_params.speed = doc["speed"].as<float>();
            if (doc.containsKey("brightness")) new_params.brightness = doc["brightness"].as<float>();
            if (doc.containsKey("palette_id")) new_params.palette_id = doc["palette_id"].as<uint8_t>();
            if (doc.containsKey("palette_shift")) new_params.palette_shift = doc["palette_shift"].as<float>();
            if (doc.containsKey("beat_sensitivity")) new_params.beat_sensitivity = doc["beat_sensitivity"].as<float>();
            if (doc.containsKey("spectrum_low")) new_params.spectrum_low = doc["spectrum_low"].as<float>();
            if (doc.containsKey("spectrum_mid")) new_params.spectrum_mid = doc["spectrum_mid"].as<float>();
            if (doc.containsKey("spectrum_high")) new_params.spectrum_high = doc["spectrum_high"].as<float>();

            // Validate and clamp parameters
            bool success = update_params_safe(new_params);
            // Then update directly (same as /reset endpoint which works correctly)
            update_params(new_params);

            // Always return 200 - parameters were applied (may be clamped, but still applied)
            StaticJsonDocument<512> response_doc;
            response_doc["success"] = true;
            response_doc["clamped"] = !success;  // true if any values were clamped

            const PatternParameters& params = get_params();
            response_doc["params"]["speed"] = params.speed;
            response_doc["params"]["brightness"] = params.brightness;
            response_doc["params"]["palette_id"] = params.palette_id;
            response_doc["params"]["palette_shift"] = params.palette_shift;
            response_doc["params"]["beat_sensitivity"] = params.beat_sensitivity;
            response_doc["params"]["spectrum_low"] = params.spectrum_low;
            response_doc["params"]["spectrum_mid"] = params.spectrum_mid;
            response_doc["params"]["spectrum_high"] = params.spectrum_high;

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

    // GET / - Serve web dashboard (simple HTML UI)
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        const char* html = R"HTML(
<!DOCTYPE html>
<html>
<head>
    <title>K1.reinvented - Audio Reactivity Testing</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; background: #1a1a1a; color: #fff; }
        h1 { text-align: center; color: #ff6b35; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #aaa; margin-bottom: 30px; font-size: 0.9em; }
        .section { background: #2a2a2a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .param-group { margin-bottom: 15px; }
        label { display: block; margin: 8px 0 4px; font-weight: 500; }
        input[type="range"] { width: 100%; height: 6px; }
        button { background: #ff6b35; color: #fff; border: none; padding: 10px 20px; margin: 5px 5px 5px 0; cursor: pointer; border-radius: 4px; font-size: 0.95em; }
        button:hover { background: #ff8555; }
        .pattern-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .pattern-btn { text-align: left; padding: 15px; background: #3a3a3a; border: 2px solid #555; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
        .pattern-btn:hover { border-color: #ff6b35; }
        .pattern-btn.active { border-color: #ff6b35; background: #4a4a4a; }
        .pattern-btn strong { display: block; color: #ff6b35; margin-bottom: 5px; }
        .pattern-btn small { color: #aaa; }
        .value-display { display: inline-block; min-width: 45px; text-align: right; color: #ffa500; font-weight: bold; }
        h2 { color: #ff6b35; margin-top: 0; font-size: 1.1em; border-bottom: 2px solid #ff6b35; padding-bottom: 8px; }
        .audio-status { background: #3a3a3a; padding: 15px; border-radius: 4px; margin-top: 15px; font-family: monospace; font-size: 0.9em; }
        .audio-status div { margin: 5px 0; }
        .info-box { background: #3a3a3a; padding: 15px; border-left: 3px solid #ff6b35; margin-bottom: 20px; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>K1.reinvented</h1>
    <div class="subtitle">Audio Reactivity Validation Testing</div>

    <div class="info-box">
        <strong>Testing Mode:</strong> Only audio-reactive patterns are shown. Serial console shows real-time audio data (beat, spectrum, chromagram). Check /api/params for current values.
    </div>

    <div class="section">
        <h2>Audio-Reactive Patterns</h2>
        <div class="pattern-list" id="patterns"></div>
    </div>

    <div class="section">
        <h2>Beat Sensitivity</h2>
        <div class="param-group">
            <label>Sensitivity: <span class="value-display" id="beat-val">1.0</span></label>
            <input type="range" id="beat_sensitivity" min="0" max="2" step="0.1" value="1.0" oninput="updateBeatDisplay(this.value)">
        </div>
        <button onclick="updateParams()">Apply</button>
    </div>

    <div class="section">
        <h2>Brightness</h2>
        <div class="param-group">
            <label>Brightness: <span class="value-display" id="brightness-val">0.3</span></label>
            <input type="range" id="brightness" min="0" max="1" step="0.01" value="0.3" oninput="updateBrightnessDisplay(this.value)">
        </div>
        <button onclick="updateParams()">Apply</button>
    </div>

    <div class="section">
        <h2>Frequency Response</h2>
        <div class="param-group">
            <label>Bass (Low): <span class="value-display" id="low-val">0.5</span></label>
            <input type="range" id="spectrum_low" min="0" max="1" step="0.05" value="0.5" oninput="updateLowDisplay(this.value)">
        </div>
        <div class="param-group">
            <label>Mids: <span class="value-display" id="mid-val">0.5</span></label>
            <input type="range" id="spectrum_mid" min="0" max="1" step="0.05" value="0.5" oninput="updateMidDisplay(this.value)">
        </div>
        <div class="param-group">
            <label>Treble (High): <span class="value-display" id="high-val">0.5</span></label>
            <input type="range" id="spectrum_high" min="0" max="1" step="0.05" value="0.5" oninput="updateHighDisplay(this.value)">
        </div>
        <button onclick="updateParams()">Apply</button>
    </div>

    <script>
        async function loadPatterns() {
            const res = await fetch('/api/patterns');
            const data = await res.json();

            const container = document.getElementById('patterns');
            const audioReactivePatterns = data.patterns.filter(p => p.is_audio_reactive);

            container.innerHTML = audioReactivePatterns.map(p => {
                const active = p.index === data.current_pattern ? 'active' : '';
                return '<button class="pattern-btn ' + active + '" onclick="selectPattern(' + p.index + ')">' +
                    '<strong>' + p.name + '</strong>' +
                    '<small>' + p.description + '</small>' +
                    '</button>';
            }).join('');
        }

        async function loadParams() {
            const res = await fetch('/api/params');
            const params = await res.json();

            document.getElementById('beat_sensitivity').value = params.beat_sensitivity;
            document.getElementById('beat-val').textContent = params.beat_sensitivity.toFixed(1);
            document.getElementById('brightness').value = params.brightness;
            document.getElementById('brightness-val').textContent = params.brightness.toFixed(2);
            document.getElementById('spectrum_low').value = params.spectrum_low;
            document.getElementById('low-val').textContent = params.spectrum_low.toFixed(2);
            document.getElementById('spectrum_mid').value = params.spectrum_mid;
            document.getElementById('mid-val').textContent = params.spectrum_mid.toFixed(2);
            document.getElementById('spectrum_high').value = params.spectrum_high;
            document.getElementById('high-val').textContent = params.spectrum_high.toFixed(2);
        }

        async function selectPattern(index) {
            await fetch('/api/select', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({index})
            });
            loadPatterns();
        }

        async function updateParams() {
            const params = {
                beat_sensitivity: parseFloat(document.getElementById('beat_sensitivity').value),
                brightness: parseFloat(document.getElementById('brightness').value),
                spectrum_low: parseFloat(document.getElementById('spectrum_low').value),
                spectrum_mid: parseFloat(document.getElementById('spectrum_mid').value),
                spectrum_high: parseFloat(document.getElementById('spectrum_high').value)
            };
            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
            loadParams();
        }

        function updateBeatDisplay(val) {
            document.getElementById('beat-val').textContent = parseFloat(val).toFixed(1);
        }

        function updateBrightnessDisplay(val) {
            document.getElementById('brightness-val').textContent = parseFloat(val).toFixed(2);
        }

        function updateLowDisplay(val) {
            document.getElementById('low-val').textContent = parseFloat(val).toFixed(2);
        }

        function updateMidDisplay(val) {
            document.getElementById('mid-val').textContent = parseFloat(val).toFixed(2);
        }

        function updateHighDisplay(val) {
            document.getElementById('high-val').textContent = parseFloat(val).toFixed(2);
        }

        // Load on startup
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
