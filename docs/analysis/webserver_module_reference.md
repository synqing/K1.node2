---
title: webserver.cpp Module Reference & Line Mapping
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# webserver.cpp Module Reference & Line Mapping

**Quick lookup guide for locating code sections and understanding module dependencies.**

---

## Module Locations (Quick Index)

```
LINE RANGES:
┌─────────────────────────────────────────────────────────────┐
│  1-16     │ Copyright & file header                          │
├─────────────────────────────────────────────────────────────┤
│  17-34    │ FORWARD DECLARATIONS (4 static functions)        │
│           │  - attach_cors_headers (line 18)                 │
│           │  - create_error_response (line 21)               │
│           │  - apply_params_json (line 24)                   │
│           │  - onWebSocketEvent (line 27)                    │
├─────────────────────────────────────────────────────────────┤
│  29-34    │ GLOBAL INSTANCES (2 static objects)              │
│           │  - AsyncWebServer server(80) (line 30)           │
│           │  - AsyncWebSocket ws("/ws") (line 33)            │
├─────────────────────────────────────────────────────────────┤
│ MODULE 2: RATE LIMITING SYSTEM                              │
│  35-106   │ Rate limiting engine (72 lines)                  │
│  36-37    │  - enum RouteMethod                              │
│  38-39    │  - struct RouteWindow                            │
│  40-52    │  - route constants (ROUTE_PARAMS, etc.)          │
│  55-72    │  - control_windows[] configuration               │
│  74-106   │  - route_is_rate_limited() function              │
├─────────────────────────────────────────────────────────────┤
│ MODULE 3: JSON BUILDERS (Response Serialization)             │
│ 108-183   │ JSON builder functions (76 lines)                │
│ 109-128   │  - build_params_json()                           │
│ 131-149   │  - build_patterns_json()                         │
│ 152-183   │  - build_palettes_json()                         │
├─────────────────────────────────────────────────────────────┤
│ MODULE 1: INITIALIZATION & ENDPOINT REGISTRATION             │
│ 188-1476  │ init_webserver() function (HUGE: 1,290 lines)    │
│           │                                                   │
│ SUBMODULES WITHIN init_webserver():                          │
│                                                               │
│ MODULE 7: STATUS ENDPOINTS (Read-Only)                       │
│ 190-202   │  GET /api/patterns                               │
│ 205-219   │  GET /api/params                                 │
│ 222-234   │  GET /api/palettes                               │
│ 237-262   │  GET /api/device/info                            │
│                                                               │
│ MODULE 8: CONTROL ENDPOINTS (Mutable)                        │
│ 265-311   │  POST /api/params (body handler)                 │
│ 313-379   │  POST /api/select (body handler)                 │
│ 382-398   │  POST /api/reset                                 │
│ 401-418   │  GET /api/audio-config                           │
│ 420-476   │  POST /api/audio-config (body handler)           │
│ 478-489   │  OPTIONS preflight & 404 handler                 │
│ 492-512   │  GET /api/wifi/link-options                      │
│ 514-582   │  POST /api/wifi/link-options (body handler)      │
│                                                               │
│ MODULE 9: WEB UI DASHBOARD (HTML/CSS/JS - EMBEDDED)          │
│ 585-1207  │  GET / - Serve embedded SPA (622 lines!!)        │
│ 586-878   │   HTML structure (293 lines)                     │
│ 592-737   │   CSS styling (146 lines, inline)                │
│ 879-1203  │   JavaScript functions (325 lines)               │
│  880-901  │    loadPatterns()                                │
│  903-932  │    loadParams()                                  │
│  934-941  │    selectPattern()                               │
│  943-959  │    updateDisplay()                               │
│  961-972  │    scheduleBrightnessUpdate()                    │
│  974-992  │    updateParams()                                │
│  994-1014 │    loadAudioConfig()                             │
│ 1016-1028 │    updateMicrophoneGain()                        │
│ 1030-1081 │    loadPalettes()                                │
│ 1083-1134 │    initPalettes()                                │
│ 1136-1151 │    updatePalette()                               │
│ 1153-1186 │    loadWifiLinkOptions()                         │
│ 1171-1186 │    updateWifiLinkOptions()                       │
│ 1188-1194 │    updateColorModeIndicator()                    │
│ 1197-1203 │    Page load initialization (IIFE)               │
│                                                               │
│ 1213-1297 │ MORE STATUS ENDPOINTS (duplicate info handlers)  │
│ 1213-1239 │  GET /api/device-info (DUPLICATE)                │
│ 1242-1276 │  GET /api/device/performance                     │
│ 1279-1297 │  GET /api/test-connection                        │
│                                                               │
│ 1300-1353 │ CONFIG BACKUP ENDPOINT                           │
│ 1300-1353 │  GET /api/config/backup                          │
│                                                               │
│ 1355-1448 │ CONFIG RESTORE ENDPOINT (body handler)           │
│ 1355-1448 │  POST /api/config/restore                        │
│                                                               │
│ 1450-1452 │ WEBSOCKET SETUP                                  │
│ 1450-1452 │  ws.onEvent() & server.addHandler()              │
│                                                               │
│ 1454-1470 │ mDNS SERVICE ADVERTISEMENT                       │
│ 1454-1470 │  MDNS.begin() and service registration           │
│                                                               │
│ 1472-1476 │ SERVER START                                     │
│ 1472-1476 │  server.begin() & console output                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ MODULE HANDLER: MAIN LOOP                                    │
│ 1479-1489 │ handle_webserver() function (11 lines)           │
│           │  WebSocket client cleanup every 30s              │
├─────────────────────────────────────────────────────────────┤
│ MODULE 6: WEBSOCKET REAL-TIME UPDATES                        │
│ 1491-1538 │ onWebSocketEvent() handler (48 lines)            │
│ 1494-1507 │  WS_EVT_CONNECT case                             │
│ 1509-1511 │  WS_EVT_DISCONNECT case                          │
│ 1513-1531 │  WS_EVT_DATA case                                │
│ 1534-1536 │  WS_EVT_PONG/ERROR cases                         │
│                                                               │
│ 1541-1574 │ broadcast_realtime_data() (34 lines)             │
│           │  Build JSON from multiple sources                │
│           │  Broadcast to all connected clients              │
├─────────────────────────────────────────────────────────────┤
│ MODULE 4: ERROR RESPONSE UTILITIES                           │
│ 1577-1583 │ attach_cors_headers() function (7 lines)         │
│                                                               │
│ 1586-1601 │ create_error_response() function (16 lines)      │
├─────────────────────────────────────────────────────────────┤
│ MODULE 5: PARAMETER UPDATE LOGIC                             │
│ 1604-1621 │ apply_params_json() function (18 lines)          │
└─────────────────────────────────────────────────────────────┘

TOTAL: 1,621 lines
```

---

## Dependency Map (What Calls What)

```
init_webserver() [1,290 lines total]
│
├─ setup_endpoints()
│  │
│  ├─ Rate Limiting Layer
│  │  └─ route_is_rate_limited() [lines 74-106]
│  │     └─ control_windows[] [lines 55-72]
│  │
│  ├─ Status Endpoints (Read-Only)
│  │  ├─ build_params_json() [lines 109-128]
│  │  │  └─ get_params() [from parameters.h]
│  │  │
│  │  ├─ build_patterns_json() [lines 131-149]
│  │  │  └─ g_pattern_registry [from pattern_registry.h]
│  │  │  └─ g_current_pattern_index [from pattern_registry.h]
│  │  │
│  │  ├─ build_palettes_json() [lines 152-183]
│  │  │  └─ palette_names [from palettes.h]
│  │  │  └─ palette_table [from palettes.h]
│  │  │  └─ color_from_palette() [from palettes.h]
│  │  │
│  │  └─ Device Info
│  │     ├─ WiFi.localIP() [Arduino]
│  │     ├─ WiFi.macAddress() [Arduino]
│  │     └─ ESP.getSdkVersion() [Arduino]
│  │
│  ├─ Control Endpoints (Mutable)
│  │  ├─ POST /api/params → apply_params_json() [lines 1604-1621]
│  │  │  └─ update_params_safe() [from parameters.h]
│  │  │
│  │  ├─ POST /api/select → select_pattern() [from pattern_registry.h]
│  │  │  └─ get_current_pattern() [from pattern_registry.h]
│  │  │
│  │  ├─ POST /api/reset → get_default_params() [from parameters.h]
│  │  │  └─ update_params() [from parameters.h]
│  │  │
│  │  ├─ POST /api/audio-config → configuration.microphone_gain [global]
│  │  │
│  │  ├─ POST /api/wifi/link-options → wifi_monitor_* functions
│  │  │  ├─ wifi_monitor_get_link_options()
│  │  │  ├─ wifi_monitor_update_link_options()
│  │  │  ├─ wifi_monitor_save_link_options_to_nvs()
│  │  │  └─ wifi_monitor_reassociate_now()
│  │  │
│  │  └─ POST /api/config/restore → update_params_safe()
│  │
│  ├─ CORS & Error Handling
│  │  ├─ attach_cors_headers() [lines 1577-1583]
│  │  └─ create_error_response() [lines 1586-1601]
│  │
│  ├─ WebSocket Handler
│  │  ├─ onWebSocketEvent() [lines 1491-1538]
│  │  └─ broadcast_realtime_data() [lines 1541-1574]
│  │     ├─ FPS_CPU [from profiler.h]
│  │     ├─ cpu_monitor.getAverageCPUUsage() [from cpu_monitor.h]
│  │     ├─ ESP.getFreeHeap() [Arduino]
│  │     ├─ ESP.getHeapSize() [Arduino]
│  │     └─ get_params() [from parameters.h]
│  │
│  ├─ mDNS Service Advertisement
│  │  ├─ MDNS.begin() [ESPmDNS]
│  │  ├─ MDNS.addService()
│  │  └─ MDNS.addServiceTxt()
│  │
│  └─ Server Start
│     └─ server.begin() [AsyncWebServer]
│
└─ handle_webserver() [11 lines]
   └─ ws.cleanupClients() [AsyncWebSocket]

broadcast_realtime_data() [34 lines]
├─ ws.count()
├─ ws.textAll()
└─ Telemetry collection (above)
```

---

## Code Smell & Duplication Analysis

### Critical: POST Body Accumulation (5x duplicated)

**Identical code appears in:**
1. `POST /api/params` (lines 266-277)
2. `POST /api/select` (lines 315-326)
3. `POST /api/audio-config` (lines 422-433)
4. `POST /api/wifi/link-options` (lines 517-527)
5. `POST /api/config/restore` (lines 1371-1380)

**Total duplicate lines: ~55 lines**

```cpp
// This pattern repeats 5 times:
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
// ... cleanup & handler logic ...
delete body;
request->_tempObject = nullptr;
```

**Extract to:** `ChunkedBodyAccumulator` class

---

### High: Rate Limiting Check Pattern (13x duplicated)

**Identical code appears in ALL endpoints:**
```cpp
uint32_t window_ms = 0, next_ms = 0;
if (route_is_rate_limited(path, method, &window_ms, &next_ms)) {
    auto *resp = create_error_response(request, 429, "rate_limited");
    resp->addHeader("X-RateLimit-Window", String(window_ms));
    resp->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
    request->send(resp);
    return;
}
```

**Total duplicate lines: ~65 lines (across 13 endpoints)**

**Extract to:** Standardized endpoint handler wrapper

---

### Medium: Device Info Endpoint (1x exact duplicate)

**GET /api/device/info appears TWICE:**
1. Lines 237-262 (in init_webserver, part of initial endpoint setup)
2. Lines 1213-1239 (later in init_webserver, exact copy!)

**Problem:** Same endpoint handler registered twice  
**Fix:** Remove one, consolidate

---

### Medium: Response Error Handling Pattern

**Similar error handling in:**
- POST /api/params (line 298)
- POST /api/select (line 346)
- POST /api/audio-config (line 453)
- POST /api/wifi/link-options (line 547)
- POST /api/config/restore (line 1386)

**Pattern:** Identical JSON parse error handling, different response formats

---

## Import Analysis (Unused Dependencies)

**Line 7:** `#include "audio/goertzel.h"`
- Status: **UNUSED**
- Comment mentions "For audio configuration (microphone gain)" but no goertzel functions called
- Safe to remove

**Line 10:** `#include "connection_state.h"`
- Status: **UNUSED**
- No symbols from this file are referenced anywhere
- Safe to remove

---

## External Dependencies

| Library | Purpose | Used In |
|---------|---------|---------|
| `#include <ArduinoJson.h>` | JSON serialization | All JSON response builders, POST handlers |
| `#include <ESPmDNS.h>` | mDNS service discovery | init_webserver() line 1455 |
| `#include <AsyncWebSocket.h>` | WebSocket server | WebSocket handler (Module 6) |
| `#include "parameters.h"` | Parameter system | JSON builders, POST handlers, telemetry |
| `#include "pattern_registry.h"` | Pattern list | Pattern endpoint, pattern selection |
| `#include "palettes.h"` | Color palettes | Palette endpoint |
| `#include "wifi_monitor.h"` | WiFi options API | WiFi link options endpoint |
| `#include "connection_state.h"` | (UNUSED) | — |
| `#include "audio/goertzel.h"` | (UNUSED) | — |
| `#include "profiler.h"` | Performance metrics | Telemetry, performance endpoint |
| `#include "cpu_monitor.h"` | CPU usage | Telemetry endpoint |

---

## Function Call Graph (Heavy Hitters)

```
route_is_rate_limited()  [13 call sites] ★★★★★
├─ GET /api/patterns (line 192)
├─ GET /api/params (line 208)
├─ GET /api/palettes (line 224)
├─ GET /api/device/info (line 239)
├─ GET /api/audio-config (line 403)
├─ POST /api/params (line 281)
├─ POST /api/select (line 330)
├─ POST /api/audio-config (line 437)
├─ POST /api/wifi/link-options (line 531)
├─ GET /api/device/performance (line 1244)
├─ GET /api/test-connection (line 1281)
├─ GET /api/config/backup (line 1302)
└─ POST /api/config/restore (line 1358)

build_params_json()      [2 call sites] ★★
├─ GET /api/params (line 216)
└─ POST /api/params response (line 307)

build_patterns_json()    [1 call site] ★
└─ GET /api/patterns (line 199)

build_palettes_json()    [1 call site] ★
└─ GET /api/palettes (line 231)

create_error_response()  [7 call sites] ★★★
├─ GET /api/patterns (line 193)
├─ GET /api/params (line 209)
├─ GET /api/palettes (line 225)
├─ GET /api/device/info (line 240)
├─ POST /api/params (line 298)
├─ POST /api/select (line 376)
└─ Multiple others...

attach_cors_headers()    [15+ call sites] ★★★★★
├─ Used in every endpoint response
├─ Used in error responses
└─ Used in HTML response (line 1209)

apply_params_json()      [1 call site] ★
└─ POST /api/params (line 304)

broadcast_realtime_data() [Not called in init_webserver]
└─ Must be called from main loop() function
```

---

## Configuration & Constants

**Rate Limit Rules (lines 55-72):**
```cpp
{ROUTE_PARAMS, ROUTE_POST, 300, 0},          // 300ms between param updates
{ROUTE_SELECT, ROUTE_POST, 200, 0},          // 200ms between pattern switches
{ROUTE_AUDIO_CONFIG, ROUTE_POST, 300, 0},    // 300ms for audio config
{ROUTE_RESET, ROUTE_POST, 1000, 0},          // 1s for reset (cautious)
{ROUTE_METRICS, ROUTE_GET, 200, 0},          // 200ms for metrics
{ROUTE_PARAMS, ROUTE_GET, 150, 0},           // 150ms for param reads
{ROUTE_PALETTES, ROUTE_GET, 2000, 0},        // 2s for palette load
// ... more rules ...
```

**Route Paths (lines 40-52):**
```cpp
static const char* ROUTE_PARAMS = "/api/params";
static const char* ROUTE_WIFI_LINK_OPTIONS = "/api/wifi/link-options";
static const char* ROUTE_SELECT = "/api/select";
// ... etc ...
```

**Key constants in UI:**
- `BRIGHTNESS_DEBOUNCE_MS = 150` (line 963) — Throttle brightness updates
- Palette cache & lazy-load promise (lines 1031-1032)
- Default values hardcoded in UI (lines 759-834)

---

## Risk Map: What to Extract & When

```
EXTRACTION SEQUENCE (Recommended Order):

1. [CRITICAL] Web UI (lines 585-1207)
   Risk: LOW
   Dependencies: None (pure web)
   Effort: 2-3 hours
   Benefit: HUGE (38% of file)
   
2. [HIGH] ChunkedBodyAccumulator (5 dupes, ~55 lines)
   Risk: MEDIUM
   Dependencies: AsyncWebServer
   Effort: 3-4 hours
   Benefit: HIGH (DRY principle)
   
3. [MEDIUM] Rate Limiter Class (lines 35-106)
   Risk: LOW
   Dependencies: None
   Effort: 1-2 hours
   Benefit: MEDIUM (reusable)
   
4. [MEDIUM] JSON Builders Module (lines 108-183)
   Risk: LOW
   Dependencies: External data (params, patterns, palettes)
   Effort: 2-3 hours
   Benefit: MEDIUM (unit testable)
   
5. [LOW] HTTP Response Utils (lines 1577-1601)
   Risk: LOW
   Dependencies: AsyncWebServer
   Effort: 1 hour
   Benefit: LOW (small file)
   
6. [OPTIONAL] Endpoint Base Class
   Risk: HIGH
   Dependencies: AsyncWebServer
   Effort: 6-8 hours
   Benefit: MEDIUM (refactoring)
```

---

## Quick Copy/Paste Reference

### To extract Rate Limiter, copy lines:
35-106

### To extract JSON Builders, copy lines:
108-183

### To extract HTTP Utils, copy lines:
1577-1601

### To extract Parameter Logic, copy lines:
1604-1621

### To extract WebSocket Handler, copy lines:
1491-1538, 1541-1574

### To extract Web UI, copy lines:
585-1207

---

## Suggested File Structure After Refactoring

```
firmware/src/
├── webserver.h (unchanged)
├── webserver.cpp (refactored, ~900 lines)
│   └── Contains: init_webserver(), handle_webserver()
│   └── Calls extracted modules for implementation
│
├── webserver_rate_limiter.h/cpp (NEW: 72 lines)
│   └── RateLimiter class, configuration
│
├── webserver_response_builders.h (NEW: 80 lines)
│   └── build_params_json(), build_patterns_json(), build_palettes_json()
│
├── async_request_handler.h (NEW: 50 lines)
│   └── ChunkedBodyAccumulator class (eliminates 5 dupes)
│
├── http_response_utils.h (NEW: 30 lines)
│   └── create_error_response(), attach_cors_headers()
│
├── parameter_validation.h (NEW: 30 lines)
│   └── apply_params_json() refactored
│
├── realtime_telemetry.h (NEW: 40 lines)
│   └── broadcast_realtime_data() refactored, telemetry builders
│
└── (OPTIONAL) rest_endpoint.h (NEW: 80 lines)
    └── RestEndpoint base class for standardization

firmware/data/ui/
├── index.html (NEW: 293 lines)
├── css/
│   └── style.css (NEW: 146 lines)
└── js/
    └── app.js (NEW: 325 lines)
```

**Total reduction:** 1,621 lines → ~900 + helper modules = cleaner, more testable
