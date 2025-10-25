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
    doc["custom_param_1"] = params.custom_param_1;
    doc["custom_param_2"] = params.custom_param_2;
    doc["custom_param_3"] = params.custom_param_3;

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
            if (doc.containsKey("custom_param_1")) new_params.custom_param_1 = doc["custom_param_1"].as<float>();
            if (doc.containsKey("custom_param_2")) new_params.custom_param_2 = doc["custom_param_2"].as<float>();
            if (doc.containsKey("custom_param_3")) new_params.custom_param_3 = doc["custom_param_3"].as<float>();

            bool success = update_params_safe(new_params);

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
            response_doc["params"]["custom_param_1"] = params.custom_param_1;
            response_doc["params"]["custom_param_2"] = params.custom_param_2;
            response_doc["params"]["custom_param_3"] = params.custom_param_3;

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
    <title>K1.reinvented Control</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; background: #1a1a1a; color: #fff; }
        h1 { text-align: center; color: #ff6b35; }
        h2 { color: #ff6b35; margin-top: 20px; margin-bottom: 15px; font-size: 1.2em; border-bottom: 2px solid #ff6b35; padding-bottom: 8px; }
        .section { background: #2a2a2a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .subsection { margin-bottom: 25px; }
        .param-group { margin-bottom: 15px; }
        label { display: block; margin: 8px 0 4px; font-weight: 500; }
        input[type="range"] { width: 100%; height: 6px; }
        input[type="number"] { width: 100%; padding: 8px; background: #3a3a3a; border: 1px solid #555; color: #fff; border-radius: 4px; }
        button { background: #ff6b35; color: #fff; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; border-radius: 4px; font-size: 0.95em; }
        button:hover { background: #ff8555; }
        button.reset-btn { background: #666; }
        button.reset-btn:hover { background: #888; }
        .pattern-list { display: grid; gap: 10px; }
        .pattern-btn { text-align: left; padding: 15px; background: #3a3a3a; border: 2px solid #555; }
        .pattern-btn.active { border-color: #ff6b35; background: #4a4a4a; }
        .value-display { display: inline-block; min-width: 50px; text-align: right; color: #ffa500; font-weight: bold; }
        .spectrum-indicator { display: inline-flex; gap: 4px; margin-left: 10px; vertical-align: middle; }
        .spectrum-bar { width: 12px; height: 12px; border-radius: 2px; }
        .spectrum-low { background: #ff4444; }
        .spectrum-mid { background: #ffaa44; }
        .spectrum-high { background: #44aaff; }
        .button-group { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }
    </style>
</head>
<body>
    <h1>K1.reinvented</h1>

    <div class="section">
        <h2>Patterns</h2>
        <div class="pattern-list" id="patterns"></div>
    </div>

    <div class="section">
        <h2>Animation Control</h2>
        <div class="subsection">
            <div class="param-group">
                <label>Speed: <span class="value-display" id="speed-val">1.0</span></label>
                <input type="range" id="speed" min="0.1" max="10" step="0.1" value="1.0">
            </div>
            <div class="param-group">
                <label>Brightness: <span class="value-display" id="brightness-val">0.3</span></label>
                <input type="range" id="brightness" min="0" max="1" step="0.01" value="0.3">
            </div>
            <div class="param-group">
                <label>Palette ID: <span class="value-display" id="palette-val">0</span></label>
                <input type="number" id="palette_id" min="0" max="7" value="0">
            </div>
            <div class="param-group">
                <label>Palette Shift: <span class="value-display" id="shift-val">0.0</span></label>
                <input type="range" id="palette_shift" min="0" max="1" step="0.01" value="0">
            </div>
        </div>

        <h2>Audio Reactivity</h2>
        <div class="subsection">
            <div class="param-group">
                <label>Beat Sensitivity: <span class="value-display" id="beat-val">1.0</span></label>
                <input type="range" id="beat_sensitivity" min="0" max="2" step="0.1" value="1.0">
            </div>
            <div class="param-group">
                <label>Spectrum Response <span class="spectrum-indicator"><span class="spectrum-bar spectrum-low" title="Bass"></span><span class="spectrum-bar spectrum-mid" title="Mid"></span><span class="spectrum-bar spectrum-high" title="Treble"></span></span></label>
                <label style="margin-top: 10px;">Bass (Low): <span class="value-display" id="spectrum-low-val">0.5</span></label>
                <input type="range" id="spectrum_low" min="0" max="1" step="0.05" value="0.5">
                <label style="margin-top: 8px;">Mid: <span class="value-display" id="spectrum-mid-val">0.5</span></label>
                <input type="range" id="spectrum_mid" min="0" max="1" step="0.05" value="0.5">
                <label style="margin-top: 8px;">Treble (High): <span class="value-display" id="spectrum-high-val">0.5</span></label>
                <input type="range" id="spectrum_high" min="0" max="1" step="0.05" value="0.5">
            </div>
        </div>

        <h2>Customization</h2>
        <div class="subsection">
            <div class="param-group">
                <label>Custom Parameter 1: <span class="value-display" id="custom-1-val">0.5</span></label>
                <input type="range" id="custom_param_1" min="0" max="1" step="0.01" value="0.5">
            </div>
            <div class="param-group">
                <label>Custom Parameter 2: <span class="value-display" id="custom-2-val">0.5</span></label>
                <input type="range" id="custom_param_2" min="0" max="1" step="0.01" value="0.5">
            </div>
            <div class="param-group">
                <label>Custom Parameter 3: <span class="value-display" id="custom-3-val">0.5</span></label>
                <input type="range" id="custom_param_3" min="0" max="1" step="0.01" value="0.5">
            </div>
        </div>

        <div class="button-group">
            <button onclick="updateParams()">Apply Parameters</button>
            <button class="reset-btn" onclick="resetParams()">Reset to Defaults</button>
        </div>
    </div>

    <script>
        let currentPattern = 0;

        async function loadPatterns() {
            const res = await fetch('/api/patterns');
            const data = await res.json();
            currentPattern = data.current_pattern;

            const container = document.getElementById('patterns');
            container.innerHTML = data.patterns.map(p => {
                const active = p.index === currentPattern ? 'active' : '';
                return '<button class="pattern-btn ' + active + '" onclick="selectPattern(' + p.index + ')">' +
                    '<strong>' + p.name + '</strong><br>' +
                    '<small>' + p.description + '</small>' +
                    '</button>';
            }).join('');
        }

        async function loadParams() {
            const res = await fetch('/api/params');
            const params = await res.json();

            // Animation Control
            document.getElementById('speed').value = params.speed;
            document.getElementById('speed-val').textContent = params.speed.toFixed(1);
            document.getElementById('brightness').value = params.brightness;
            document.getElementById('brightness-val').textContent = params.brightness.toFixed(2);
            document.getElementById('palette_id').value = params.palette_id;
            document.getElementById('palette-val').textContent = params.palette_id;
            document.getElementById('palette_shift').value = params.palette_shift;
            document.getElementById('shift-val').textContent = params.palette_shift.toFixed(2);

            // Audio Reactivity
            document.getElementById('beat_sensitivity').value = params.beat_sensitivity;
            document.getElementById('beat-val').textContent = params.beat_sensitivity.toFixed(1);
            document.getElementById('spectrum_low').value = params.spectrum_low;
            document.getElementById('spectrum-low-val').textContent = params.spectrum_low.toFixed(2);
            document.getElementById('spectrum_mid').value = params.spectrum_mid;
            document.getElementById('spectrum-mid-val').textContent = params.spectrum_mid.toFixed(2);
            document.getElementById('spectrum_high').value = params.spectrum_high;
            document.getElementById('spectrum-high-val').textContent = params.spectrum_high.toFixed(2);

            // Customization
            document.getElementById('custom_param_1').value = params.custom_param_1;
            document.getElementById('custom-1-val').textContent = params.custom_param_1.toFixed(2);
            document.getElementById('custom_param_2').value = params.custom_param_2;
            document.getElementById('custom-2-val').textContent = params.custom_param_2.toFixed(2);
            document.getElementById('custom_param_3').value = params.custom_param_3;
            document.getElementById('custom-3-val').textContent = params.custom_param_3.toFixed(2);
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
                speed: parseFloat(document.getElementById('speed').value),
                brightness: parseFloat(document.getElementById('brightness').value),
                palette_id: parseInt(document.getElementById('palette_id').value),
                palette_shift: parseFloat(document.getElementById('palette_shift').value),
                beat_sensitivity: parseFloat(document.getElementById('beat_sensitivity').value),
                spectrum_low: parseFloat(document.getElementById('spectrum_low').value),
                spectrum_mid: parseFloat(document.getElementById('spectrum_mid').value),
                spectrum_high: parseFloat(document.getElementById('spectrum_high').value),
                custom_param_1: parseFloat(document.getElementById('custom_param_1').value),
                custom_param_2: parseFloat(document.getElementById('custom_param_2').value),
                custom_param_3: parseFloat(document.getElementById('custom_param_3').value)
            };
            const res = await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
            if (!res.ok) {
                console.log('Note: Some parameters may have been clamped to valid ranges');
            }
            loadParams();
        }

        async function resetParams() {
            await fetch('/api/reset', {method: 'POST'});
            loadParams();
        }

        // Update value displays on slider/input change
        document.getElementById('speed').oninput = (e) => document.getElementById('speed-val').textContent = parseFloat(e.target.value).toFixed(1);
        document.getElementById('brightness').oninput = (e) => document.getElementById('brightness-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('palette_id').oninput = (e) => document.getElementById('palette-val').textContent = e.target.value;
        document.getElementById('palette_shift').oninput = (e) => document.getElementById('shift-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('beat_sensitivity').oninput = (e) => document.getElementById('beat-val').textContent = parseFloat(e.target.value).toFixed(1);
        document.getElementById('spectrum_low').oninput = (e) => document.getElementById('spectrum-low-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('spectrum_mid').oninput = (e) => document.getElementById('spectrum-mid-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('spectrum_high').oninput = (e) => document.getElementById('spectrum-high-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('custom_param_1').oninput = (e) => document.getElementById('custom-1-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('custom_param_2').oninput = (e) => document.getElementById('custom-2-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('custom_param_3').oninput = (e) => document.getElementById('custom-3-val').textContent = parseFloat(e.target.value).toFixed(2);

        // Load initial state
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
