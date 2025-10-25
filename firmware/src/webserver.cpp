// Async web server implementation
// Provides REST API for runtime parameter control and pattern switching

#include "webserver.h"
#include "parameters.h"
#include "pattern_registry.h"
#include <ArduinoJson.h>

// Global async web server on port 80
static AsyncWebServer server(80);

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
        request->send(200, "application/json", build_patterns_json());
    });

    // GET /api/params - Get current parameters
    server.on("/api/params", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", build_params_json());
    });

    // POST /api/params - Update parameters (partial update supported)
    server.on("/api/params", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            // Parse JSON body
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, data, len);

            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }

            // Get current parameters
            PatternParameters new_params = get_params();

            // Apply partial updates
            if (doc.containsKey("speed")) new_params.speed = doc["speed"];
            if (doc.containsKey("brightness")) new_params.brightness = doc["brightness"];
            if (doc.containsKey("palette_id")) new_params.palette_id = doc["palette_id"];
            if (doc.containsKey("palette_shift")) new_params.palette_shift = doc["palette_shift"];
            if (doc.containsKey("beat_sensitivity")) new_params.beat_sensitivity = doc["beat_sensitivity"];
            if (doc.containsKey("spectrum_low")) new_params.spectrum_low = doc["spectrum_low"];
            if (doc.containsKey("spectrum_mid")) new_params.spectrum_mid = doc["spectrum_mid"];
            if (doc.containsKey("spectrum_high")) new_params.spectrum_high = doc["spectrum_high"];
            if (doc.containsKey("custom_param_1")) new_params.custom_param_1 = doc["custom_param_1"];
            if (doc.containsKey("custom_param_2")) new_params.custom_param_2 = doc["custom_param_2"];
            if (doc.containsKey("custom_param_3")) new_params.custom_param_3 = doc["custom_param_3"];

            // Validate and update (uses double buffering + bounds checking)
            bool success = update_params_safe(new_params);

            if (success) {
                request->send(200, "application/json", build_params_json());
            } else {
                request->send(400, "application/json",
                    "{\"error\":\"Parameter validation failed (values clamped)\",\"params\":" + build_params_json() + "}");
            }
        });

    // POST /api/pattern - Switch pattern by index or ID
    server.on("/api/pattern", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            // Parse JSON body
            StaticJsonDocument<256> doc;
            DeserializationError error = deserializeJson(doc, data, len);

            if (error) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }

            bool success = false;

            // Try to switch by index
            if (doc.containsKey("index")) {
                uint8_t pattern_index = doc["index"];
                success = select_pattern(pattern_index);
            }
            // Try to switch by ID
            else if (doc.containsKey("id")) {
                const char* pattern_id = doc["id"];
                success = select_pattern_by_id(pattern_id);
            }

            if (success) {
                StaticJsonDocument<256> response;
                response["current_pattern"] = g_current_pattern_index;
                response["name"] = get_current_pattern().name;

                String output;
                serializeJson(response, output);
                request->send(200, "application/json", output);
            } else {
                request->send(400, "application/json", "{\"error\":\"Invalid pattern index or ID\"}");
            }
        });

    // POST /api/reset - Reset parameters to defaults
    server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest *request) {
        PatternParameters defaults = get_default_params();
        update_params(defaults);
        request->send(200, "application/json", build_params_json());
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
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #1a1a1a; color: #fff; }
        h1 { text-align: center; color: #ff6b35; }
        .section { background: #2a2a2a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        label { display: block; margin: 10px 0 5px; }
        input[type="range"] { width: 100%; }
        input[type="number"] { width: 100%; padding: 8px; background: #3a3a3a; border: 1px solid #555; color: #fff; border-radius: 4px; }
        button { background: #ff6b35; color: #fff; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; border-radius: 4px; }
        button:hover { background: #ff8555; }
        .pattern-list { display: grid; gap: 10px; }
        .pattern-btn { text-align: left; padding: 15px; background: #3a3a3a; border: 2px solid #555; }
        .pattern-btn.active { border-color: #ff6b35; background: #4a4a4a; }
        .value-display { display: inline-block; min-width: 60px; text-align: right; color: #ff6b35; }
    </style>
</head>
<body>
    <h1>K1.reinvented</h1>

    <div class="section">
        <h2>Patterns</h2>
        <div class="pattern-list" id="patterns"></div>
    </div>

    <div class="section">
        <h2>Parameters</h2>
        <label>Speed: <span class="value-display" id="speed-val">1.0</span></label>
        <input type="range" id="speed" min="0.1" max="10" step="0.1" value="1.0">

        <label>Brightness: <span class="value-display" id="brightness-val">0.3</span></label>
        <input type="range" id="brightness" min="0" max="1" step="0.01" value="0.3">

        <label>Palette ID: <span class="value-display" id="palette-val">0</span></label>
        <input type="number" id="palette_id" min="0" max="7" value="0">

        <label>Palette Shift: <span class="value-display" id="shift-val">0.0</span></label>
        <input type="range" id="palette_shift" min="0" max="1" step="0.01" value="0">

        <label>Beat Sensitivity: <span class="value-display" id="beat-val">1.0</span></label>
        <input type="range" id="beat_sensitivity" min="0" max="2" step="0.1" value="1.0">

        <button onclick="updateParams()">Apply Parameters</button>
        <button onclick="resetParams()">Reset to Defaults</button>
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

            document.getElementById('speed').value = params.speed;
            document.getElementById('speed-val').textContent = params.speed.toFixed(1);
            document.getElementById('brightness').value = params.brightness;
            document.getElementById('brightness-val').textContent = params.brightness.toFixed(2);
            document.getElementById('palette_id').value = params.palette_id;
            document.getElementById('palette-val').textContent = params.palette_id;
            document.getElementById('palette_shift').value = params.palette_shift;
            document.getElementById('shift-val').textContent = params.palette_shift.toFixed(2);
            document.getElementById('beat_sensitivity').value = params.beat_sensitivity;
            document.getElementById('beat-val').textContent = params.beat_sensitivity.toFixed(1);
        }

        async function selectPattern(index) {
            await fetch('/api/pattern', {
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
                beat_sensitivity: parseFloat(document.getElementById('beat_sensitivity').value)
            };
            await fetch('/api/params', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(params)
            });
        }

        async function resetParams() {
            await fetch('/api/reset', {method: 'POST'});
            loadParams();
        }

        // Update value displays on slider change
        document.getElementById('speed').oninput = (e) => document.getElementById('speed-val').textContent = parseFloat(e.target.value).toFixed(1);
        document.getElementById('brightness').oninput = (e) => document.getElementById('brightness-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('palette_id').oninput = (e) => document.getElementById('palette-val').textContent = e.target.value;
        document.getElementById('palette_shift').oninput = (e) => document.getElementById('shift-val').textContent = parseFloat(e.target.value).toFixed(2);
        document.getElementById('beat_sensitivity').oninput = (e) => document.getElementById('beat-val').textContent = parseFloat(e.target.value).toFixed(1);

        // Load initial state
        loadPatterns();
        loadParams();
    </script>
</body>
</html>
)HTML";
        request->send(200, "text/html", html);
    });

    // 404 handler
    server.onNotFound([](AsyncWebServerRequest *request) {
        request->send(404, "application/json", "{\"error\":\"Not found\"}");
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
