---
title: Webserver Refactoring: Bottleneck Matrix
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Webserver Refactoring: Bottleneck Matrix

## Overview

This document prioritizes the identified issues in the webserver K1RequestHandler refactoring by severity and implementation effort. Used to guide remediation work planning.

---

## Priority Matrix: Severity vs Effort

```
             LOW EFFORT    MEDIUM EFFORT    HIGH EFFORT
HIGH SEVERITY    |[1] [2]      [3] [4]        [5]
MED SEVERITY     |[6]          [7] [8]        [9]
LOW SEVERITY     |[10]         [11]           [12]
```

---

## Critical Priority Bottlenecks

### BOTTLENECK 1: GET /api/wifi/link-options Not Refactored

**Severity**: 🔴 CRITICAL (9/10)
**Effort**: 🟢 TRIVIAL (1/10)
**Status**: INCOMPLETE IMPLEMENTATION
**Impact Score**: 9 × (10-1) = 81 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver.cpp:490-510`

**Problem Statement**:
GET /api/wifi/link-options endpoint remains as inline lambda handler instead of following the K1RequestHandler pattern established for all other 13 endpoints. Violates Phase 2 refactoring contract and architectural consistency.

**Current Implementation**:
```cpp
server.on(ROUTE_WIFI_LINK_OPTIONS, HTTP_GET, [](AsyncWebServerRequest *request) {
    uint32_t window_ms = 0, next_ms = 0;
    if (route_is_rate_limited(ROUTE_WIFI_LINK_OPTIONS, ROUTE_GET, &window_ms, &next_ms)) {
        // Rate limit response...
    }
    WifiLinkOptions opts;
    wifi_monitor_get_link_options(opts);
    // Manual JSON construction and response...
});
```

**Required Fix**:
1. Create `GetWifiLinkOptionsHandler : public K1RequestHandler` class
2. Move logic into `handle(RequestContext& ctx)` method
3. Register with `registerGetHandler(server, ROUTE_WIFI_LINK_OPTIONS, new GetWifiLinkOptionsHandler())`
4. Remove inline server.on() call at line 490

**Proposed Implementation** (15 minutes):
```cpp
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

// In init_webserver() at line 419 (replace inline handler):
registerGetHandler(server, ROUTE_WIFI_LINK_OPTIONS, new GetWifiLinkOptionsHandler());
```

**Benefits**:
- Restores architectural consistency (14/14 endpoints follow pattern)
- Automatic rate limiting enforcement
- Consistent error handling
- Unified response formatting

**Risks if Not Fixed**:
- Future changes to K1RequestHandler might not propagate to this endpoint
- Code maintainers confused by inconsistency
- WiFi endpoint missing from refactoring completeness metrics

---

### BOTTLENECK 2: Race Condition in Rate Limiter

**Severity**: 🔴 CRITICAL (10/10)
**Effort**: 🟡 MEDIUM (5/10)
**Status**: SECURITY VULNERABILITY
**Impact Score**: 10 × (10-5) = 50 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver_rate_limiter.h:72-121`

**Problem Statement**:
Rate limiter uses mutable global state (`control_windows[].last_ms`) without synchronization primitives. Concurrent requests to the same route can both read stale `last_ms` value and bypass rate limiting entirely.

**Vulnerable Code**:
```cpp
static RouteWindow control_windows[] = {
    {ROUTE_PARAMS, ROUTE_POST, 300, 0},     // last_ms = 0 (MUTABLE, GLOBAL)
    // ... 15 more routes ...
};

static bool route_is_rate_limited(const char* path, RouteMethod method, ...) {
    // ...
    if (w.last_ms != 0 && (now - w.last_ms) < w.window_ms) {
        return true;  // Rate limited
    }

    w.last_ms = now;  // ← WRITE WITHOUT LOCK (RACE CONDITION)
    return false;
}
```

**Race Condition Scenario**:
```
Timeline T0=0ms:
  - Core 0: Read w.last_ms = 100
  - Core 1: Read w.last_ms = 100 (SAME VALUE)

Timeline T1=100ms:
  - Core 0: Calculate (100 - 100) = 0 < 300? YES → return true (rate limited)
  - Core 1: Calculate (100 - 100) = 0 < 300? YES → return true (rate limited)

Timeline T2=200ms (should be allowed):
  - Core 0: First request fails (rate limited), doesn't update w.last_ms
  - Core 1: Concurrent request to same route
  - Core 1: Read w.last_ms = 100 (STALE)
  - Core 1: Calculate (200 - 100) = 100 < 300? YES → return true
  - Core 1: Request rejected (CORRECT)

Timeline T3=500ms (both should fail, but might both pass):
  - Core 0: Read w.last_ms = 100
  - Core 1: Read w.last_ms = 100
  - Core 0: Calculate (500 - 100) = 400 < 300? NO → returns false, WRITES w.last_ms = 500
  - Core 1: Calculate (500 - 100) = 400 < 300? NO → ALSO returns false, BOTH ALLOWED ← BUG
```

**Required Fix Option 1: Using ESP32 Spinlock (Recommended)**:
```cpp
static portMUX_TYPE rate_limit_mutex = portMUX_INITIALIZER_UNLOCKED;

static bool route_is_rate_limited(const char* path, RouteMethod method, ...) {
    uint32_t now = millis();

    portENTER_CRITICAL(&rate_limit_mutex);
    {
        for (size_t i = 0; i < sizeof(control_windows)/sizeof(control_windows[0]); ++i) {
            RouteWindow& w = control_windows[i];
            if (strcmp(w.path, path) == 0 && w.method == method) {
                if (w.window_ms == 0) {
                    portEXIT_CRITICAL(&rate_limit_mutex);
                    return false;
                }

                if (w.last_ms != 0 && (now - w.last_ms) < w.window_ms) {
                    uint32_t remaining = (w.last_ms + w.window_ms > now) ?
                        (w.last_ms + w.window_ms - now) : 0;
                    if (out_window_ms) *out_window_ms = w.window_ms;
                    if (out_next_allowed_ms) *out_next_allowed_ms = remaining;
                    portEXIT_CRITICAL(&rate_limit_mutex);
                    return true;  // Rate limited
                }

                w.last_ms = now;  // ← PROTECTED BY MUTEX
                if (out_window_ms) *out_window_ms = w.window_ms;
                if (out_next_allowed_ms) *out_next_allowed_ms = 0;
                portEXIT_CRITICAL(&rate_limit_mutex);
                return false;  // Allowed
            }
        }
    }
    portEXIT_CRITICAL(&rate_limit_mutex);

    // Not found - default behavior
    if (method == ROUTE_GET) {
        return false;  // GET unlimited
    }
    return false;  // Unknown POST unlimited
}
```

**Required Fix Option 2: Using Atomic Operations (Simpler)**:
```cpp
#include <atomic>

struct RouteWindow {
    const char* path;
    RouteMethod method;
    uint32_t window_ms;
    std::atomic<uint32_t> last_ms;  // ← ATOMIC INSTEAD OF PLAIN uint32_t
};

static bool route_is_rate_limited(const char* path, RouteMethod method, ...) {
    uint32_t now = millis();

    for (size_t i = 0; i < sizeof(control_windows)/sizeof(control_windows[0]); ++i) {
        RouteWindow& w = control_windows[i];
        if (strcmp(w.path, path) == 0 && w.method == method) {
            uint32_t last = w.last_ms.load(std::memory_order_relaxed);

            if (w.window_ms == 0) {
                return false;
            }

            if (last != 0 && (now - last) < w.window_ms) {
                return true;  // Rate limited
            }

            w.last_ms.store(now, std::memory_order_relaxed);  // ← ATOMIC WRITE
            return false;  // Allowed
        }
    }

    return false;  // Default: unlimited
}
```

**Effort Estimate**: 30-45 minutes
- Test Option 1 (spinlock): 45 minutes (more portable, safer)
- Test Option 2 (atomic): 30 minutes (simpler, modern C++)

**Verification**:
```cpp
// Add to test suite:
void test_concurrent_rate_limit() {
    // Simulate concurrent requests
    // Both should not pass simultaneously
}
```

**Risks if Not Fixed**:
- Malicious client can DOS endpoints by making concurrent requests
- Rate limiting completely ineffective under load
- Security vulnerability in production

---

### BOTTLENECK 3: Unbounded Body Buffer Accumulation

**Severity**: 🔴 CRITICAL (9/10)
**Effort**: 🟢 TRIVIAL (2/10)
**Status**: DENIAL OF SERVICE VULNERABILITY
**Impact Score**: 9 × (10-2) = 72 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver_request_handler.h:175-192`

**Problem Statement**:
K1PostBodyHandler accumulates request body without validating total size. HTTP client can claim 100MB body size, causing ESP32 to allocate and exhaust memory before JSON parsing even begins.

**Vulnerable Code**:
```cpp
void operator()(AsyncWebServerRequest* request, uint8_t* data, size_t len,
                size_t index, size_t total) {
    String *body = static_cast<String*>(request->_tempObject);

    if (index == 0) {
        body = new String();
        body->reserve(total);  // ← NO SIZE VALIDATION
        request->_tempObject = body;
    }

    body->concat(reinterpret_cast<const char*>(data), len);

    if (index + len != total) {
        return;
    }

    handler->handleWithRateLimit(request);  // ← PROCEEDS WITH UNLIMITED BODY
}
```

**Attack Vector**:
```bash
curl -X POST http://k1/api/params \
     -H "Content-Length: 104857600" \
     -d '{"brightness": 1.0}'
```
- Content-Length claims 100MB
- `body->reserve(100000000)` called
- Allocates 100MB on heap (or fails)
- ESP32 crashes with out-of-memory error

**Required Fix**:
```cpp
static const size_t MAX_BODY_SIZE = 2048;  // 2KB limit

void operator()(AsyncWebServerRequest* request, uint8_t* data, size_t len,
                size_t index, size_t total) {

    // Validate total size before allocating
    if (total > MAX_BODY_SIZE) {
        // Body too large - invoke handler which will return error
        handler->handleWithRateLimit(request);
        return;  // Handler will send 400 error
    }

    String *body = static_cast<String*>(request->_tempObject);

    if (index == 0) {
        body = new String();
        body->reserve(total);
        request->_tempObject = body;
    }

    body->concat(reinterpret_cast<const char*>(data), len);

    if (index + len != total) {
        return;
    }

    handler->handleWithRateLimit(request);
}
```

**Alternative: Soft Limit with Warning**:
```cpp
static const size_t MAX_BODY_SIZE = 2048;
static const size_t WARN_BODY_SIZE = 1024;

if (total > WARN_BODY_SIZE) {
    Serial.printf("WARN: Large body: %d bytes for %s\n", total, request->url().c_str());
}

if (total > MAX_BODY_SIZE) {
    // Reject immediately
    auto *resp = request->beginResponse(413, "application/json",
        "{\"error\":\"payload_too_large\"}");
    attach_cors_headers(resp);
    request->send(resp);
    return;
}
```

**Effort Estimate**: 10-15 minutes

**Verification**:
```bash
# Test with oversized body
curl -X POST http://k1/api/params \
     -H "Content-Length: 10000000" \
     -d '{"brightness": 1.0}' \
     -w "%{http_code}\n"
# Expected: 413 Payload Too Large (or 400 Invalid JSON)
```

**Risks if Not Fixed**:
- Denial of service: Send large Content-Length header, crash ESP32
- Malicious actor can disable device remotely
- Production stability risk

---

## Major Priority Bottlenecks

### BOTTLENECK 4: Type Coercion in JSON Field Access

**Severity**: 🟠 MAJOR (7/10)
**Effort**: 🟡 MEDIUM (4/10)
**Status**: SILENT FAILURE
**Impact Score**: 7 × (10-4) = 42 points

**Affected Endpoints**:
- POST /api/select (line 158)
- POST /api/audio-config (line 207)
- POST /api/wifi/link-options (line 242-245)

**Problem Statement**:
ArduinoJson's `as<T>()` method returns default value (0) on type mismatch instead of raising error. Client sends wrong type, handler silently uses default behavior.

**Example Scenario**:
```json
POST /api/select
{
  "index": "not_a_number"
}
```

**Current Behavior**:
```cpp
uint8_t pattern_index = json["index"].as<uint8_t>();  // Returns 0, no error
success = select_pattern(pattern_index);  // Silently selects pattern 0
```

**User Experience**:
- Client sends bad request
- Receives success response (200 OK)
- Pattern 0 selected unexpectedly
- Client confused by silent failure

**Required Fix**:
```cpp
// Check type before casting
if (!json.containsKey("index") && !json.containsKey("id")) {
    ctx.sendError(400, "missing_field", "Missing index or id");
    return;
}

if (json.containsKey("index")) {
    if (!json["index"].is<uint8_t>()) {
        ctx.sendError(400, "invalid_type", "index must be integer");
        return;
    }
    uint8_t pattern_index = json["index"].as<uint8_t>();
    success = select_pattern(pattern_index);
} else if (json.containsKey("id")) {
    if (!json["id"].is<const char*>()) {
        ctx.sendError(400, "invalid_type", "id must be string");
        return;
    }
    const char* pattern_id = json["id"].as<const char*>();
    success = select_pattern_by_id(pattern_id);
}
```

**Apply to All Handlers** (locations):
- PostSelectHandler (line 157-162): check index is uint8_t, id is string
- PostAudioConfigHandler (line 206-207): check microphone_gain is float
- PostWifiLinkOptionsHandler (line 242-245): check force_bg_only is bool, force_ht20 is bool

**Effort Estimate**: 45-60 minutes (5-10 minutes per handler × 6 handlers)

**Risks if Not Fixed**:
- Silent failures confuse users
- Incorrect device state without user knowledge
- Difficult to debug (no error message)

---

### BOTTLENECK 5: Global State Access Without Synchronization

**Severity**: 🟠 MAJOR (7/10)
**Effort**: 🟡 MEDIUM (6/10)
**Status**: DATA CORRUPTION RISK
**Impact Score**: 7 × (10-6) = 28 points

**Affected Globals**:
- `g_current_pattern_index` (read in line 170, 309; written in line 377)
- Profiler globals: `FRAMES_COUNTED`, `ACCUM_RENDER_US`, etc. (read in line 88-92)

**Problem Statement**:
WebServer accesses global state modified by main pattern rendering loop without synchronization. If multicore is enabled, concurrent access could cause data corruption.

**Read Scenario** (GetDevicePerformanceHandler, line 88-92):
```cpp
float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;
float avg_render_us = (float)ACCUM_RENDER_US / frames;  // CONCURRENT READ
```

**Write Scenario** (in main rendering loop, not shown):
```cpp
// Somewhere in pattern.cpp or similar:
FRAMES_COUNTED++;
ACCUM_RENDER_US += calculated_us;  // CONCURRENT WRITE
```

**Potential Data Corruption**:
```
Core 0 (Webserver):           Core 1 (Rendering):
READ FRAMES_COUNTED = 100
                               WRITE FRAMES_COUNTED = 101
READ ACCUM_RENDER_US = 50000
                               WRITE ACCUM_RENDER_US = 51000
CALCULATE: 50000 / 100 = 500   [correct]

Alternative bad ordering:
READ FRAMES_COUNTED = 100      [but about to change]
                               WRITE FRAMES_COUNTED = 101
                               WRITE ACCUM_RENDER_US = 51000
READ ACCUM_RENDER_US = 50000   [stale, just changed]
CALCULATE: 50000 / 101 = 495   [incorrect averaging]
```

**Required Fix Option 1: Volatile Keyword (Minimal)**:
```cpp
extern volatile uint32_t FRAMES_COUNTED;
extern volatile uint32_t ACCUM_RENDER_US;
```
- Tells compiler not to optimize away reads
- Minimal overhead
- Works if single-core or if writes are atomic

**Required Fix Option 2: Atomic Operations (Safer)**:
```cpp
#include <atomic>

extern std::atomic<uint32_t> FRAMES_COUNTED;
extern std::atomic<uint32_t> ACCUM_RENDER_US;

// In reader (GetDevicePerformanceHandler):
uint32_t frames = FRAMES_COUNTED.load(std::memory_order_relaxed);
uint32_t render_us = ACCUM_RENDER_US.load(std::memory_order_relaxed);
```

**Required Fix Option 3: Snapshot with Lock (Most Robust)**:
```cpp
static portMUX_TYPE perf_mutex = portMUX_INITIALIZER_UNLOCKED;

struct PerfSnapshot {
    uint32_t frames;
    uint32_t render_us;
    // ... other metrics
};

PerfSnapshot take_perf_snapshot() {
    portENTER_CRITICAL(&perf_mutex);
    PerfSnapshot snap = {
        FRAMES_COUNTED,
        ACCUM_RENDER_US,
        // ...
    };
    portEXIT_CRITICAL(&perf_mutex);
    return snap;
}

// In handler:
PerfSnapshot snap = take_perf_snapshot();
float avg_render_us = (float)snap.render_us / (float)snap.frames;
```

**Effort Estimate**: 60-90 minutes
- Evaluate current multicore usage (10 min)
- Choose synchronization strategy (10 min)
- Implement and test (40-60 min)

**Risks if Not Fixed**:
- Intermittent data corruption
- Performance metrics report incorrect values
- Hard to debug (race condition, intermittent)

---

### BOTTLENECK 6: Palette JSON Size Limit Not Validated

**Severity**: 🟠 MAJOR (6/10)
**Effort**: 🟡 MEDIUM (4/10)
**Status**: SILENT DATA LOSS
**Impact Score**: 6 × (10-4) = 36 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver_response_builders.h:129-160`

**Problem Statement**:
GET /api/palettes uses `DynamicJsonDocument<4096>` to build palette list. If NUM_PALETTES > 25, serialized JSON exceeds 4KB and DynamicJsonDocument silently drops data.

**Current Code**:
```cpp
static String build_palettes_json() {
    DynamicJsonDocument doc(4096);  // 4KB limit
    JsonArray palettes = doc.createNestedArray("palettes");

    for (uint8_t i = 0; i < NUM_PALETTES; i++) {
        JsonObject palette = palettes.createNestedObject();
        palette["id"] = i;
        palette["name"] = palette_names[i];

        // Add 5 color samples
        JsonArray colors = palette.createNestedArray("colors");
        for (int j = 0; j < 5; j++) {
            float progress = j / 4.0f;
            CRGBF color = color_from_palette(i, progress, 1.0f);
            JsonObject colorObj = colors.createNestedObject();
            colorObj["r"] = (uint8_t)(color.r * 255);
            colorObj["g"] = (uint8_t)(color.g * 255);
            colorObj["b"] = (uint8_t)(color.b * 255);
        }

        // Add metadata
        palette["num_keyframes"] = info.num_entries;
    }

    doc["count"] = NUM_PALETTES;

    String output;
    serializeJson(doc, output);  // ← SILENT TRUNCATION IF >4KB
    return output;
}
```

**Size Estimation**:
```
Per palette:
  - id (2 bytes)
  - name (~20 bytes typical)
  - 5 colors × 12 bytes = 60 bytes
  - num_keyframes (3 bytes)
  - JSON overhead (~50 bytes)
  = ~150 bytes per palette

With 25 palettes: 25 × 150 = 3750 bytes < 4096 (OK)
With 30 palettes: 30 × 150 = 4500 bytes > 4096 (FAILS)
```

**Detection Issue**:
DynamicJsonDocument doesn't report overflow. Client receives truncated array:
```json
{
  "palettes": [ /* only 25 palettes instead of 30 */ ],
  "count": 30  // ← Says count=30 but only 25 in array (contradictory!)
}
```

**Required Fix Option 1: Increase Buffer**:
```cpp
DynamicJsonDocument doc(8192);  // 8KB (if 50+ palettes planned)
```

**Required Fix Option 2: Validate with Assertion**:
```cpp
String output;
serializeJson(doc, output);

// Assert capacity not exceeded
if (output.length() > 4000) {
    Serial.printf("ERROR: Palette JSON size %d exceeds buffer 4096\n", output.length());
    // Return error response instead
    return "{}";  // Fallback
}

return output;
```

**Required Fix Option 3: Dynamic Buffer Size**:
```cpp
DynamicJsonDocument doc(NUM_PALETTES * 200);  // 200 bytes per palette buffer
// ... build document ...
String output;
serializeJson(doc, output);

if (!doc.capacity()) {
    Serial.println("ERROR: Palette document out of capacity");
    return "{}";
}

return output;
```

**Effort Estimate**: 15-30 minutes

**Risks if Not Fixed**:
- If palette count increases, clients get truncated list
- Client shows incomplete palette selection menu
- Hard to debug (silently truncated, no error message)

---

## Moderate Priority Bottlenecks

### BOTTLENECK 7: Handler Memory Lifecycle Not Documented

**Severity**: 🟡 MODERATE (5/10)
**Effort**: 🟢 TRIVIAL (1/10)
**Status**: CODE MAINTENANCE RISK
**Impact Score**: 5 × (10-1) = 45 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver.cpp:403-420`

**Problem Statement**:
Handler instances created with `new` but never deleted. Future developer might assume leak and add cleanup, crashing server.

**Current Code**:
```cpp
registerGetHandler(server, ROUTE_PATTERNS, new GetPatternsHandler());  // Line 403
// ... 13 more handlers ...
registerGetHandler(server, ROUTE_CONFIG_BACKUP, new GetConfigBackupHandler());  // Line 420
// No deletion ever occurs
```

**Required Fix**:
```cpp
// Register GET handlers (with built-in rate limiting)
// NOTE: Handlers are intentionally never deleted. They are captured by AsyncWebServer
// lambda closures and must live for the entire server lifetime.
registerGetHandler(server, ROUTE_PATTERNS, new GetPatternsHandler());
registerGetHandler(server, ROUTE_PARAMS, new GetParamsHandler());
// ... etc ...
```

**Effort Estimate**: 5-10 minutes (add comments)

**Risks if Not Fixed**:
- Future refactoring might accidentally add delete calls
- Causes crashes when handlers are deallocated but still referenced

---

### BOTTLENECK 8: Unsynchronized Reads from Profiler Globals

**Severity**: 🟡 MODERATE (5/10)
**Effort**: 🟡 MEDIUM (6/10)
**Status**: STALE DATA RISK
**Impact Score**: 5 × (10-6) = 20 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver.cpp:84-110`

**Problem Statement**:
GetDevicePerformanceHandler reads profiler globals without synchronization. Might read partially-updated state if rendering loop writes concurrently.

**Example**:
```cpp
void handle(RequestContext& ctx) override {
    float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;  // READ 1
    float avg_render_us = (float)ACCUM_RENDER_US / frames;  // READ 2
    float avg_quantize_us = (float)ACCUM_QUANTIZE_US / frames;  // READ 3
    // ... all reads unsynchronized ...
}
```

**Mitigation** (if not fully fixing BOTTLENECK 5):
```cpp
// Accept eventual consistency - metrics are approximate anyway
// Add comment explaining this is acceptable
//
// NOTE: Profiler globals are read without synchronization.
// This is acceptable because:
// 1. Metrics are informational only (not critical)
// 2. Small time window for inconsistency (microseconds)
// 3. Rendering loop updates infrequently (vs continuous reads)
```

**Effort Estimate**: 0 minutes if accepting eventual consistency
                   60 minutes if fully synchronizing (see BOTTLENECK 5)

---

## Minor Priority Bottlenecks

### BOTTLENECK 9: Timing Attack on Rate Limit Boundaries

**Severity**: 🟢 MINOR (2/10)
**Effort**: 🟢 TRIVIAL (1/10)
**Status**: OFF-BY-ONE IN TIMING
**Impact Score**: 2 × (10-1) = 18 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver_rate_limiter.h:93-105`

**Problem Statement**:
Rate limit window boundaries are inclusive on both ends. Request at exactly T=window_ms is allowed.

```cpp
if (w.last_ms != 0 && (now - w.last_ms) < w.window_ms) {
    return true;  // Rate limited
}
```

For window_ms=300:
- Request at T=0ms: allowed (last_ms=0)
- Request at T=300ms: (300-0)=300 < 300? NO → allowed
- Request at T=299ms: (299-0)=299 < 300? YES → limited
- Request at T=301ms: (301-0)=301 < 300? NO → allowed

Window is [0ms, 300ms) but actually allows [0ms, 300ms] (inclusive).

**Impact**: Negligible - off-by-one millisecond, practically unnoticeable.

**Fix** (if desired):
```cpp
if (w.last_ms != 0 && (now - w.last_ms) <= w.window_ms) {  // Change < to <=
    return true;  // Rate limited
}
```

**Effort Estimate**: 2-5 minutes

**Risks if Not Fixed**: None (practical impact unmeasurable)

---

### BOTTLENECK 10: GET Rate Limits Too Strict for Dashboard

**Severity**: 🟢 MINOR (3/10)
**Effort**: 🟢 TRIVIAL (2/10)
**Status**: UX DEGRADATION
**Impact Score**: 3 × (10-2) = 24 points

**Affected Component**:
- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/webserver_rate_limiter.h:41-58`

**Problem Statement**:
Read-only GET endpoints are rate limited:
- GET /api/patterns: 1000ms window (prevents rapid querying)
- GET /api/device/performance: 500ms window (prevents real-time dashboard)

These should either be unlimited or have very high windows (5000ms+).

**Current Configuration**:
```cpp
{ROUTE_PATTERNS, ROUTE_GET, 1000, 0},        // ← Too strict
{ROUTE_DEVICE_PERFORMANCE, ROUTE_GET, 500, 0},  // ← Prevents dashboard
```

**Impact**: Dashboard refreshing every 500-1000ms looks sluggish. WebSocket provides real-time alternative, but HTTP clients are rate-limited unnecessarily.

**Required Fix**:
```cpp
{ROUTE_PATTERNS, ROUTE_GET, 0, 0},             // Unlimited (info endpoint)
{ROUTE_DEVICE_PERFORMANCE, ROUTE_GET, 0, 0},  // Unlimited (metrics endpoint)
// Keep POST limits strict
{ROUTE_PARAMS, ROUTE_POST, 300, 0},
{ROUTE_SELECT, ROUTE_POST, 200, 0},
// ... etc ...
```

**Rationale**: GET = information retrieval (read-only, cacheable)
                POST = state modification (requires protection)

**Effort Estimate**: 5 minutes

**Risks if Not Fixed**:
- Dashboard feels unresponsive
- Users frustrated by 500-1000ms latency between updates

---

## Summary: Prioritized Remediation Roadmap

### Phase 1: Critical Security Fixes (2-3 hours)
1. **BOTTLENECK 1**: Refactor GET /api/wifi/link-options (15 min)
2. **BOTTLENECK 2**: Add mutex to rate limiter (45 min)
3. **BOTTLENECK 3**: Add max body size validation (15 min)

**Subtotal**: ~75 minutes

### Phase 2: Major Stability Improvements (2-3 hours)
4. **BOTTLENECK 4**: Add JSON type validation (60 min)
5. **BOTTLENECK 5**: Synchronize global state access (90 min)
6. **BOTTLENECK 6**: Validate palette JSON size (20 min)

**Subtotal**: ~170 minutes

### Phase 3: Code Quality Enhancements (1-2 hours)
7. **BOTTLENECK 7**: Document handler lifecycle (10 min)
8. **BOTTLENECK 8**: Evaluate/mitigate stale reads (Optional: 60 min)
9. **BOTTLENECK 9**: Fix rate limit timing (5 min)
10. **BOTTLENECK 10**: Adjust GET rate limits (5 min)

**Subtotal**: ~80 minutes (optional +60 min)

**Total Estimated Effort**: 3.5-5 hours for full remediation

**Minimum Critical Path**: 2 hours (Bottlenecks 1-3 only)

---

## Risk Mitigation by Bottleneck

| ID | Risk Level | Mitigation | Owner | Timeline |
|----|-----------|-----------|-------|----------|
| 1 | CRITICAL | Refactor to class | Code Review | Week 1 |
| 2 | CRITICAL | Add mutex | Testing | Week 1 |
| 3 | CRITICAL | Size validation | Testing | Week 1 |
| 4 | MAJOR | Type checks | Code Review | Week 2 |
| 5 | MAJOR | Atomic/locks | Testing | Week 2 |
| 6 | MAJOR | Buffer assert | Code Review | Week 2 |
| 7 | MODERATE | Documentation | Dev Docs | Week 1 |
| 8 | MODERATE | Evaluate | Testing | Week 2 |
| 9 | MINOR | Timing fix | Low Priority | Week 3 |
| 10 | MINOR | Remove limits | UX | Week 3 |

