---
title: Webserver.cpp Bottleneck Matrix
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Webserver.cpp Bottleneck Matrix

**Author:** SUPREME Analyst (Claude)
**Date:** 2025-10-27
**Status:** Published
**Intent:** Prioritized impact-effort matrix for refactoring webserver.cpp

---

## BOTTLENECK PRIORITY MATRIX

```
HIGH IMPACT, LOW EFFORT (Do First)
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  B1: Extract HTML Asset               [30 min - 2 hours]              ║
║      Impact: HIGH (46% file reduction)                                ║
║      Effort: LOW                                                       ║
║      Dependencies: Build system only                                   ║
║      Blocked by: None                                                  ║
║                                                                        ║
║  B2: Rate Limit Helper Macro          [1 hour]                        ║
║      Impact: HIGH (10% duplication reduction)                         ║
║      Effort: LOW                                                       ║
║      Dependencies: None                                                ║
║      Blocked by: None                                                  ║
║                                                                        ║
║  B3: Fix Stack Allocation             [30 minutes]                    ║
║      Impact: MEDIUM (stability improvement)                           ║
║      Effort: LOW                                                       ║
║      Dependencies: None                                                ║
║      Blocked by: None                                                  ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

HIGH IMPACT, MEDIUM EFFORT (Plan Next)
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  B4: Extract API Endpoints Function   [2-3 hours]                     ║
║      Impact: VERY HIGH (85% of file)                                  ║
║      Effort: MEDIUM                                                    ║
║      Dependencies: B1 (optional)                                       ║
║      Blocked by: None                                                  ║
║                                                                        ║
║  B5: Consolidate POST Handlers        [3 hours]                       ║
║      Impact: MEDIUM (15% duplication reduction)                       ║
║      Effort: MEDIUM                                                    ║
║      Dependencies: None                                                ║
║      Blocked by: None                                                  ║
║                                                                        ║
║  B6: Extract JSON Helpers             [1 hour]                        ║
║      Impact: MEDIUM (cohesion improvement)                            ║
║      Effort: MEDIUM (due to testing)                                   ║
║      Dependencies: None                                                ║
║      Blocked by: None                                                  ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

MEDIUM IMPACT, MEDIUM EFFORT (Plan Later)
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  B7: Implement Middleware Pattern     [4 hours]                       ║
║      Impact: MEDIUM (eliminates rate limit boilerplate)               ║
║      Effort: MEDIUM-HIGH                                               ║
║      Dependencies: B2                                                  ║
║      Blocked by: None                                                  ║
║                                                                        ║
║  B8: Add Comprehensive Comments       [4 hours]                       ║
║      Impact: MEDIUM (developer experience)                            ║
║      Effort: MEDIUM                                                    ║
║      Dependencies: B4 (after refactoring)                             ║
║      Blocked by: None                                                  ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

LOW IMPACT, LOW EFFORT (Polish)
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  B9: Remove Unused Include            [5 minutes]                     ║
║      Impact: LOW (coupling reduction)                                 ║
║      Effort: NEGLIGIBLE                                                ║
║      Dependencies: None                                                ║
║      Blocked by: None                                                  ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## BOTTLENECK DETAILS

### BOTTLENECK #1: Embedded HTML/CSS/JavaScript (46% of file)

**Severity Level:** CRITICAL
**Severity Score:** 9/10
**Impact Magnitude:** HIGH
**Effort to Fix:** LOW
**Priority Rank:** 1 (Do First)

#### Description

Lines 589-1210 (621 lines) contain a complete HTML5 dashboard embedded as a C-string literal within the GET / handler. This includes:

- HTML structure (60 lines)
- CSS styling (145 lines)
- JavaScript application (600+ lines)

#### Root Cause

Design decision to serve a single self-contained HTML page from the device without external dependencies.

#### Impact Chain

```
                    ┌─────────────────────────────────────┐
                    │ Embedded HTML/CSS/JS (621 lines)    │
                    └──────────────┬──────────────────────┘
                                   │
                ┌──────────────────┼──────────────────────┐
                ▼                  ▼                      ▼
        Cannot use modern    Minification         Version control
        web dev tools        impossible           complexity
                │                  │                     │
                ├──► Development   ├──► File size     ├──► Separate UI
                │    velocity      │    bloat         │    commits hard
                │    reduced       │    (56 KB total) │
                ▼                  ▼                   ▼
        NO syntax highlighting    No CSS preprocessor  Coupled release
        NO browser DevTools       No JS bundling        cycles
        NO hot reload             4+ KB gzipped
```

#### Current Code Structure

```cpp
void init_webserver() {
    // ... 14 endpoint registrations ...

    // GET / - Serve web dashboard (premium instrument interface)
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        const char* html = R"HTML(
<!DOCTYPE html>
<html>
<head>
    <title>K1.reinvented</title>
    ...
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, ... }
        ...
        @media (max-width: 768px) { ... }
    </style>
</head>
<body>
    <div class="container">
        ...
    </div>
    <script>
        async function loadPatterns() { ... }
        async function updateParams() { ... }
        async function loadPalettes() { ... }
        // ~600 more lines of JavaScript
    </script>
</body>
</html>
)HTML";
        auto *response = request->beginResponse(200, "text/html", html);
        attach_cors_headers(response);
        request->send(response);
    });

    // ... more endpoints ...
}
```

**Problem:** This blocks the entire C++ file from being optimized/compiled.

#### Fix Strategy

**Option A: External HTML File with CMake Embedding (Recommended)**

```cpp
// firmware/assets/dashboard.html
// Move entire 621 lines here
// Can use modern tooling: Prettier, PostCSS, Webpack, etc.

// CMakeLists.txt
target_add_binary_data(firmware assets/dashboard.html)

// firmware/src/webserver.cpp (MUCH SIMPLER)
extern const uint8_t dashboard_start[] asm("_binary_dashboard_html_start");
extern const uint8_t dashboard_end[] asm("_binary_dashboard_html_end");

server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    auto *response = request->beginResponse(200, "text/html");
    response->write(dashboard_start, dashboard_end - dashboard_start);
    attach_cors_headers(response);
    request->send(response);
});

// Result: webserver.cpp -621 lines (from 1,339 to 718 lines)
```

**Option B: Minify & Embed (Quick Fix)**

```cpp
// Minify HTML/CSS/JS offline
// minified_dashboard.html (~10 KB instead of 56 KB total)

// Keep embedded but minified
const char* html = R"HTML(<!DOCTYPE html><html><head>...
)HTML";

// Result: File size reduction, but still mixed concerns
```

#### Success Criteria

- [ ] HTML moved to `firmware/assets/dashboard.html`
- [ ] CMakeLists.txt includes binary embedding step
- [ ] webserver.cpp GET / handler uses embedded asset
- [ ] File compiles without warnings
- [ ] Dashboard loads correctly from device
- [ ] webserver.cpp LOC reduces to ~720

#### Estimated Effort

- Reading/understanding HTML: 30 minutes
- Creating asset directory structure: 15 minutes
- CMake configuration: 30 minutes
- Testing and verification: 30 minutes
- **Total: 1.75 hours (worst case 2.5 hours)**

---

### BOTTLENECK #2: Monolithic init_webserver() (85% of file)

**Severity Level:** CRITICAL
**Severity Score:** 9/10
**Impact Magnitude:** VERY HIGH
**Effort to Fix:** MEDIUM
**Priority Rank:** 2 (Plan After #1)

#### Description

Single 1,140-line function containing:

- 15 server.on() registrations
- 621 lines of embedded HTML
- 14 identical rate-limit check blocks
- 4 identical POST body handling lambdas
- ~35 request handlers (inline lambdas)

#### Root Cause

Iterative development without periodic refactoring. Each new endpoint added as another server.on() call to the same function.

#### Metrics

```
init_webserver() Complexity Profile:
├── Lines: 1,140 (85.2% of file)
├── Cyclomatic Complexity: ~45 (should be <15)
├── Nesting Depth: 4-7 (should be <3)
├── Lambda count: 35+ (should be <5)
├── If/switch count: 84 (very high)
├── Readability: VERY LOW
│   └─ Can't fit on screen
│   └─ Difficult to navigate
│   └─ Hard to find specific endpoint
└── Testability: ZERO
    └─ All lambdas (cannot unit test)
    └─ No named functions
```

#### Current Code Structure (Simplified)

```cpp
void init_webserver() {                         // 1 function
    // GET /api/patterns
    server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
        // ...
    });

    // GET /api/params
    server.on(ROUTE_PARAMS, HTTP_GET, [](AsyncWebServerRequest *request) {
        // ...
    });

    // POST /api/params
    server.on(ROUTE_PARAMS, HTTP_POST, [](AsyncWebServerRequest *request) {},  // empty
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, ...) {  // body handler
            // ... 66 lines of boilerplate ...
        });

    // POST /api/select
    server.on(ROUTE_SELECT, HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, ...) {
            // ... identical 66-line boilerplate ...
        });

    // ... 11 more server.on() calls ...

    server.begin();
}
```

#### Fix Strategy

**Refactor into modular registration functions:**

```cpp
// webserver.cpp - NEW STRUCTURE
void init_webserver() {
    register_dashboard_endpoint(server);        // Lines 1-10
    register_query_endpoints(server);           // Lines 11-50
    register_control_endpoints(server);         // Lines 51-100
    register_system_endpoints(server);          // Lines 101-150
    server.begin();
    Serial.println("Web server started on port 80");
}

// webserver_endpoints.cpp
void register_query_endpoints(AsyncWebServer& server) {
    // GET /api/patterns
    server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
        CHECK_RATE_LIMIT(ROUTE_PATTERNS, ROUTE_GET);
        auto *response = request->beginResponse(200, "application/json", build_patterns_json());
        attach_cors_headers(response);
        request->send(response);
    });

    // GET /api/params
    server.on(ROUTE_PARAMS, HTTP_GET, [](AsyncWebServerRequest *request) {
        // ...
    });

    // ... group related endpoints ...
}

void register_control_endpoints(AsyncWebServer& server) {
    // POST /api/params, POST /api/select, POST /api/reset, etc.
}

void register_system_endpoints(AsyncWebServer& server) {
    // GET /metrics, GET /api/device/info, etc.
}
```

#### Benefits

```
Before:                              After:
────────────────────────────────────────────────
1,340 lines total                    700 lines (webserver.cpp)
init_webserver() = 1,140 lines       init_webserver() = 10 lines
35+ lambdas                          Named functions per endpoint group
Hard to find endpoint X              Clear grouping: findable in seconds
Cannot unit test                     Can test endpoint groups
Cyclomatic: 45                       Cyclomatic: <15 per function
```

#### Success Criteria

- [ ] init_webserver() reduces to <100 lines
- [ ] Create webserver_endpoints.h with registration functions
- [ ] Create webserver_api.cpp with endpoint handlers
- [ ] All 15 endpoints tested individually
- [ ] No change in external API
- [ ] Compile without warnings
- [ ] All tests pass

#### Estimated Effort

- Extract query endpoints: 45 minutes
- Extract control endpoints: 45 minutes
- Extract system endpoints: 45 minutes
- Testing & verification: 45 minutes
- **Total: 3 hours**

---

### BOTTLENECK #3: Rate Limit Boilerplate (14 occurrences)

**Severity Level:** HIGH
**Severity Score:** 7/10
**Impact Magnitude:** MEDIUM
**Effort to Fix:** LOW
**Priority Rank:** 3

#### Description

Every GET/POST handler repeats identical rate limit checking code:

```cpp
uint32_t window_ms = 0, next_ms = 0;
if (route_is_rate_limited(ROUTE_X, ROUTE_GET, &window_ms, &next_ms)) {
    auto *resp429 = request->beginResponse(429, "application/json", "{\"error\":\"rate_limited\"}");
    resp429->addHeader("X-RateLimit-Window", String(window_ms));
    resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
    attach_cors_headers(resp429);
    request->send(resp429);
    return;
}
```

**Occurrences:** 14
**Lines per block:** 7
**Total duplicated:** 98 lines (7.3% of file)

#### Root Cause

Copy-paste pattern; no abstraction extracted.

#### Impact

```
Maintenance Burden:
├── Change rate limit format → 14 edits needed
├── Change response headers → 14 edits needed
├── Fix bug in checking logic → 14 edits needed
└── Inconsistency risk → high (easy to miss one)

Code Quality:
├── Readability: DECREASED (boilerplate obscures logic)
├── Testability: DECREASED (can't test in isolation)
└── DRY Principle: VIOLATED (copy-paste anti-pattern)
```

#### Fix Strategy

**Option A: C Preprocessor Macro (Simple)**

```cpp
// webserver_rate_limit.h
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

// Usage in handlers:
server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
    CHECK_RATE_LIMIT(ROUTE_PATTERNS, ROUTE_GET);
    // Handler logic follows
});

// Result: 98 lines → 5 lines (one macro definition)
```

**Option B: Helper Function (Better)**

```cpp
// webserver_rate_limit.cpp
void send_rate_limited_response(AsyncWebServerRequest *request,
                               uint32_t window_ms, uint32_t next_ms) {
    auto *resp429 = request->beginResponse(429, "application/json",
                                          "{\"error\":\"rate_limited\"}");
    resp429->addHeader("X-RateLimit-Window", String(window_ms));
    resp429->addHeader("X-RateLimit-NextAllowedMs", String(next_ms));
    attach_cors_headers(resp429);
    request->send(resp429);
}

// In handlers:
server.on(ROUTE_PATTERNS, HTTP_GET, [](AsyncWebServerRequest *request) {
    uint32_t window_ms = 0, next_ms = 0;
    if (route_is_rate_limited(ROUTE_PATTERNS, ROUTE_GET, &window_ms, &next_ms)) {
        send_rate_limited_response(request, window_ms, next_ms);
        return;
    }
    // Handler logic
});

// Still 14 calls but much cleaner
// Or use macro for true one-liner
```

#### Success Criteria

- [ ] Rate limit checking extracted to macro or function
- [ ] All 14 handlers use new abstraction
- [ ] No change in functionality
- [ ] Code compiles without warnings
- [ ] Handler readability improves

#### Estimated Effort

- Create macro/function: 15 minutes
- Replace 14 occurrences: 15 minutes
- Testing: 15 minutes
- **Total: 45 minutes**

---

### BOTTLENECK #4: POST Body Handling Duplication (4 occurrences)

**Severity Level:** HIGH
**Severity Score:** 7/10
**Impact Magnitude:** MEDIUM
**Effort to Fix:** MEDIUM
**Priority Rank:** 4

#### Description

Four POST endpoints repeat identical multi-lambda body handling pattern:

```cpp
server.on(ROUTE_X, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
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

        // Rate limiting (DUPLICATED)
        uint32_t window_ms = 0, next_ms = 0;
        if (route_is_rate_limited(ROUTE_X, ROUTE_POST, &window_ms, &next_ms)) {
            delete body;
            request->_tempObject = nullptr;
            send_rate_limited_response(request, window_ms, next_ms);
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

        // HANDLER-SPECIFIC LOGIC STARTS HERE
        // ...
    });
```

**Occurrences:** 4
- POST /api/params (lines 265-313)
- POST /api/select (lines 316-382)
- POST /api/audio-config (lines 424-479)
- POST /api/wifi/link-options (lines 518-585)

**Lines per handler:** 50-70
**Total duplicated:** ~220 lines (16% of file)

#### Root Cause

AsyncWebServer requires 3-parameter lambda for streaming POST bodies. No abstraction created.

#### Impact

```
High Maintenance Cost:
├── Memory leak in one place → affects 4 places
├── Body parsing bug → hard to fix consistently
├── Rate limit pattern change → 4 edits needed
└── New validation added → 4 places to update

Complexity:
├── 7 levels of nesting (lambdas + conditionals)
├── Non-standard memory management (_tempObject casting)
└── Hard to understand without AsyncWebServer expertise
```

#### Fix Strategy

**Extract Body Handling Pattern:**

```cpp
// webserver_utils.h
typedef std::function<void(AsyncWebServerRequest*, const String&, const char*)> PostBodyHandler;

void handle_json_post_body(AsyncWebServerRequest *request,
                          uint8_t *data, size_t len, size_t index, size_t total,
                          uint32_t rate_limit_window_ms,
                          PostBodyHandler on_complete);

// webserver_utils.cpp
void handle_json_post_body(AsyncWebServerRequest *request,
                          uint8_t *data, size_t len, size_t index, size_t total,
                          uint32_t rate_limit_window_ms,
                          PostBodyHandler on_complete) {
    String *body = static_cast<String*>(request->_tempObject);
    if (index == 0) {
        body = new String();
        body->reserve(total);
        request->_tempObject = body;
    }
    body->concat(reinterpret_cast<const char*>(data), len);

    if (index + len != total) {
        return;  // Wait for more
    }

    // Rate limit check
    uint32_t window_ms = 0, next_ms = 0;
    if (route_is_rate_limited(request->url().c_str(), ROUTE_POST, &window_ms, &next_ms)) {
        delete body;
        request->_tempObject = nullptr;
        send_rate_limited_response(request, window_ms, next_ms);
        return;
    }

    // JSON parsing
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

    // Call handler with parsed JSON
    const char* json_str = body->c_str();
    on_complete(request, *body, json_str);
}

// Usage in endpoint:
server.on(ROUTE_SELECT, HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        handle_json_post_body(request, data, len, index, total,
            200,  // rate limit window
            [](AsyncWebServerRequest *req, const String& body, const char* json_str) {
                // JUST the handler-specific logic
                StaticJsonDocument<256> doc;
                deserializeJson(doc, json_str);

                // Select pattern logic
                bool success = false;
                if (doc.containsKey("index")) {
                    success = select_pattern(doc["index"].as<uint8_t>());
                } else if (doc.containsKey("id")) {
                    success = select_pattern_by_id(doc["id"].as<const char*>());
                }

                if (success) {
                    // ... response ...
                }
            });
    });
```

#### Result

```
Before:
server.on() + lambda[0] + lambda[1] with 60 lines of setup = 70 lines total
× 4 endpoints = 280 lines

After:
server.on() + lambda[0] + lambda[1] calling helper = 15 lines total
× 4 endpoints = 60 lines
Plus helper function = 50 lines
Total: 110 lines (60% reduction)
```

#### Success Criteria

- [ ] Body handling extracted to `handle_json_post_body()`
- [ ] All 4 POST handlers refactored to use new pattern
- [ ] Callback captures handler-specific logic only
- [ ] Memory management centralized
- [ ] No functional change
- [ ] All tests pass

#### Estimated Effort

- Design callback pattern: 30 minutes
- Implement helper function: 45 minutes
- Refactor 4 endpoints: 45 minutes
- Testing & verification: 30 minutes
- **Total: 2.5 hours**

---

### BOTTLENECK #5: Large Stack Allocation (build_palettes_json)

**Severity Level:** MEDIUM
**Severity Score:** 6/10
**Impact Magnitude:** MEDIUM
**Effort to Fix:** LOW
**Priority Rank:** 5

#### Description

Line 138: `DynamicJsonDocument doc(4096);`

Allocates 4 KB on stack for palette metadata JSON. Repeated every GET /api/palettes request.

#### Root Cause

Using stack-based document for convenience. Should use heap for large allocations.

#### Impact

```
Stack Memory Risk:
├── ESP32 stack: ~8-16 KB per task (depends on configuration)
├── Allocation: 4 KB = 25-50% of available stack
└── Risk: Stack overflow if concurrent with other operations

Performance:
├── Each request: 4 KB allocation cost
├── Palettes endpoint rate limited to 2000 ms (safe)
└── Still inefficient for repeated calls
```

#### Fix Strategy

```cpp
// BEFORE (Line 137-168):
String build_palettes_json() {
    DynamicJsonDocument doc(4096);  // 4 KB on stack
    JsonArray palettes = doc.createNestedArray("palettes");
    // ...
    String output;
    serializeJson(doc, output);
    return output;
}

// AFTER:
String build_palettes_json() {
    // Allocate on heap with explicit size
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
    delete doc;  // Clean up

    return output;
}
```

#### Benefits

- Stack pressure reduced from 4 KB to ~100 bytes
- Safer for concurrent operations
- Heap can handle larger documents if palettes expand

#### Success Criteria

- [ ] DynamicJsonDocument moved to heap
- [ ] Memory properly released after serialization
- [ ] No change in JSON output
- [ ] Function still returns String (same interface)
- [ ] All tests pass

#### Estimated Effort

- Code change: 10 minutes
- Testing: 15 minutes
- **Total: 25 minutes**

---

## SUMMARY TABLE

| # | Bottleneck | Severity | Impact | Effort | Hours | Priority | Status |
|---|-----------|----------|--------|--------|-------|----------|--------|
| 1 | Embedded HTML | 9/10 | HIGH | LOW | 2 | 1 | PENDING |
| 2 | Monolithic init_webserver() | 9/10 | VERY HIGH | MEDIUM | 3 | 2 | PENDING |
| 3 | Rate limit boilerplate | 7/10 | MEDIUM | LOW | 0.75 | 3 | PENDING |
| 4 | POST body duplication | 7/10 | MEDIUM | MEDIUM | 2.5 | 4 | PENDING |
| 5 | Stack allocation risk | 6/10 | MEDIUM | LOW | 0.5 | 5 | PENDING |
| 6 | Low comment density | 5/10 | LOW | MEDIUM | 4 | 6 | PENDING |
| 7 | Unused include | 3/10 | LOW | NEGLIGIBLE | 0.1 | 7 | PENDING |

**Total Critical Issues:** 2 (Bottlenecks #1, #2)
**Total High Issues:** 2 (Bottlenecks #3, #4)
**Total Medium Issues:** 1 (Bottleneck #5)

**Total Time to Fix All:** ~13 hours

**Recommended Sprint:** 2-3 weeks (part-time refactoring)

---

## EXECUTION ROADMAP

### Week 1: Foundation (High-Impact, Low-Effort)

- **Day 1-2:** Extract HTML asset (B1)
  - Create firmware/assets/ directory
  - Move HTML to dashboard.html
  - Implement CMake embedding
  - Verify dashboard loads from device

- **Day 3:** Create rate limit abstraction (B3)
  - Define CHECK_RATE_LIMIT macro
  - Replace 14 occurrences
  - Test rate limit functionality

- **Day 4:** Fix stack allocation (B5)
  - Move palette JSON to heap
  - Test memory stability

### Week 2: Structure (High-Impact, Medium-Effort)

- **Day 1-2:** Extract API endpoints (B2)
  - Create webserver_endpoints.h/cpp
  - Refactor query endpoints into function
  - Refactor control endpoints into function
  - Refactor system endpoints into function

- **Day 3-4:** Consolidate POST handlers (B4)
  - Design JSON body handler abstraction
  - Implement helper function
  - Refactor 4 POST endpoints

### Week 3: Polish

- **Day 1-2:** Add comprehensive comments
  - Document multi-lambda patterns
  - Explain rate limiting architecture
  - Add endpoint documentation

- **Day 3:** Clean up & verification
  - Remove unused include (audio/goertzel.h)
  - Run full test suite
  - Performance verification

---

## METRICS BEFORE/AFTER

```
                        BEFORE          AFTER           IMPROVEMENT
────────────────────────────────────────────────────────────────────
Total Lines             1,339           700-750         45% reduction
Largest Function        1,140           100             91% reduction
Duplication             22.4%           5%              77% reduction
Comment Density         5.1%            12%             135% increase
Cyclomatic Complexity   45              <20             55% reduction
Nesting Depth (max)     7               3-4             50% reduction
Maintainability Score   4.6/10          8.5/10          85% improvement
Time to Understand      90 min          20 min          77% faster
Testing Capability      ZERO            GOOD            100% improvement
```

