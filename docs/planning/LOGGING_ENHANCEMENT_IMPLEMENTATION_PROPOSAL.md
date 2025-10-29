# K1.reinvented Logger Enhancement - Implementation Proposal

**Author:** Claude Agent
**Date:** 2025-10-29
**Status:** draft
**Intent:** Practical 4-phase implementation plan for logging enhancements addressing unified formatting, frequency control, thread safety, and advanced features.

---

## EXECUTIVE SUMMARY

The K1.reinvented logging system has a **solid foundation** (thread-safe mutex, tag-based filtering, static buffers, zero dynamic allocation). This proposal adds 4 Priority 1 critical features while maintaining backward compatibility and system stability.

**Timeline:** 2-3 weeks across 4 phases
**Risk:** Low (isolated changes, new subsystem, no modifications to Core 0/1 audio pipeline)
**Deliverable:** Enhanced logger with rate limiting, runtime config, file logging, and JSON output options.

---

## 1. FEATURE AUDIT

### Current Implementation Status

#### REQUIREMENT 1: Unified Formatting (Timestamps, Tags, Severity, Thread IDs)

| Feature | Status | Evidence |
|---------|--------|----------|
| Timestamp formatting | ✅ IMPLEMENTED | `logger.cpp:75-92` generates HH:MM:SS.mmm via `get_timestamp()` |
| Severity labels | ✅ IMPLEMENTED | `logger.cpp:119-126` maps ERROR/WARN/INFO/DEBUG to strings |
| Tag identification | ✅ IMPLEMENTED | Single-char tags (A, I, L, G, T, B, S, W, E, 0, 1, M, P) in `log_config.h` |
| ANSI color codes | ✅ IMPLEMENTED | Full color support (ERROR=red, WARN=yellow, INFO=green, DEBUG=blue) |
| Message assembly | ✅ IMPLEMENTED | `logger.cpp:170-183` builds: `[TIME] [SEV] [TAG] message` |
| **Thread ID in output** | ❌ MISSING | No task/core identification in formatted message |
| **Sequence numbering** | ❌ MISSING | No message counter [001], [002], etc. |

**Status:** ⚠️ PARTIALLY MET (8/10 features done, ready for Thread ID + sequencing)

---

#### REQUIREMENT 2: Frequency Control (Rate Limiting, Filtering, Verbosity)

| Feature | Status | Evidence |
|---------|--------|----------|
| Compile-time severity filtering | ✅ IMPLEMENTED | `log_config.h:11` + macro guards in `logger.h:69-115` |
| Per-tag enable/disable | ⚠️ PARTIAL | `log_config.h:40` flag enables feature, but runtime toggle missing |
| Mutex-based thread safety | ✅ IMPLEMENTED | `logger.cpp:197-211` acquires mutex before each write |
| **Rate limiting per tag** | ❌ MISSING | No tracking of message frequency |
| **Runtime verbosity API** | ❌ MISSING | No function to adjust levels at runtime |
| **Per-tag frequency limits** | ❌ MISSING | No mechanism to cap messages/second by tag |
| **Batch filtering** | ❌ MISSING | No multi-message coalescing |

**Status:** ❌ MISSING (3/7 features done, rate limiting is blank slate)

---

#### REQUIREMENT 3: Thread Safety (No Overlap, Atomic Assembly)

| Feature | Status | Evidence |
|---------|--------|----------|
| FreeRTOS mutex protection | ✅ IMPLEMENTED | `logger.cpp:12, 49-56` mutex created in `init()` |
| Mutex timeout handling | ✅ IMPLEMENTED | `logger.cpp:198` uses `pdMS_TO_TICKS(10)` timeout |
| Degraded mode fallback | ✅ IMPLEMENTED | `logger.cpp:203-211` writes without mutex if timeout |
| Atomic serial transmission | ✅ IMPLEMENTED | `logger.cpp:200-201` writes full message in one call |
| Static buffer allocation | ✅ IMPLEMENTED | No dynamic allocation, all buffers pre-allocated |
| **Core ID tracking** | ❌ MISSING | No differentiation between Core 0 and Core 1 logs |
| **Cross-core queue** | ❌ MISSING | No async queue for high-frequency logging |

**Status:** ✅ COMPLETE (5/5 thread safety guarantees met)

---

#### REQUIREMENT 4: Advanced Features (Colors, File Logging, JSON, Runtime Config)

| Feature | Status | Evidence |
|---------|--------|----------|
| ANSI color codes | ✅ IMPLEMENTED | `log_config.h:50-68` with toggle `LOG_USE_COLORS` |
| **File logging to SPIFFS** | ❌ MISSING | No SPIFFS integration |
| **JSON structured output** | ❌ MISSING | No JSON serializer |
| **Runtime webserver API** | ❌ MISSING | No endpoints to control logging |
| **Statistics/metrics** | ❌ MISSING | No message counting or performance tracking |
| **Log rotation** | ❌ MISSING | No SPIFFS overflow protection |
| **Debug dashboard** | ❌ MISSING | No live logger status endpoint |

**Status:** ❌ MISSING (1/7 features done, needs infrastructure)

---

### Summary Table

```
CATEGORY                    COMPLETE  PARTIAL  MISSING  TOTAL
─────────────────────────────────────────────────────────────
Requirement 1: Formatting      8        0        2        10
Requirement 2: Frequency       3        1        3         7
Requirement 3: Thread Safety   5        0        2         7
Requirement 4: Advanced        1        0        6         7
─────────────────────────────────────────────────────────────
TOTALS                        17        1       13        31

READINESS: 55% (17/31 features), foundation solid, infrastructure needed
```

---

## 2. MISSING FEATURES - PRIORITIZED

### PRIORITY 1 (CRITICAL - Enable New Capabilities)

These features unlock rate limiting and runtime control, the most commonly requested patterns.

#### P1.1: MESSAGE SEQUENCING (Global Counter)
**What:** Prepend message counter `[001]`, `[002]`, etc. to each log
**Why:** Detect dropped messages, verify ordering across threads
**Impact:** 4 bytes RAM (uint32_t counter), 4-byte format string
**Risk:** None (additive, no format changes)

**Design:**
```
- Static global uint32_t sequence_counter = 0
- Increment atomically before message assembly
- Format: [SEQ] [TIME] [SEV] [TAG] message
- Overflow: wrap at 999999, detect via JSON field
- Example: [000001] [12:34:56.789] ERROR [A] Bad sample rate
```

**Files:**
- `firmware/src/logging/logger.h` - Add `get_next_sequence()` function
- `firmware/src/logging/logger.cpp` - Implement counter logic, increment in `log_internal()`
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_SEQUENCING` (default: 1)

---

#### P1.2: THREAD ID / CORE ID IN MESSAGE
**What:** Identify which core logged the message (0 or 1)
**Why:** Diagnose Core 0/1 synchronization issues
**Impact:** 1 byte output, 2 bytes code (platform check)
**Risk:** None (uses standard ESP32 API `xPortGetCoreID()`)

**Design:**
```
- Call xPortGetCoreID() at log time
- Format: [SEQ] [TIME] [SEV] [CORE] [TAG] message
- Example: [000001] [12:34:56.789] WARN [C0] [A] Sample late by 2.3ms
- Runtime toggle: LOG_ENABLE_CORE_ID config flag
```

**Files:**
- `firmware/src/logging/logger.cpp` - Add `get_core_id()` in `log_internal()`
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_CORE_ID` (default: 1)

---

#### P1.3: RATE LIMITING PER TAG
**What:** Cap messages per tag to N messages/second (e.g., max 100 AUDIO msgs/sec)
**Why:** Prevent audio logging from drowning out other subsystems
**Impact:** ~80 bytes RAM (rate table), <1ms overhead
**Risk:** Low (rate check before mutex acquisition, fail-open)

**Design:**
```
Rate Limiter State:
  struct RateLimit {
    char tag;
    uint32_t last_time_ms;      // Last message time for this tag
    uint32_t count_this_second;  // Messages logged this second
    uint32_t max_per_second;     // Configured limit
  };

Configuration:
  - Default rate: 1000 msgs/sec per tag (no practical limit)
  - Configurable per tag via runtime API
  - Reset counter every 1000ms

Policy:
  1. Check if (now_ms - last_time_ms) > 1000
     - If yes: reset count_this_second = 0, last_time_ms = now_ms
  2. If count_this_second >= max_per_second
     - Drop message, increment dropped counter
  3. Otherwise:
     - Increment counter, allow message through

Bypass:
  - ERROR severity always passes (never rate limit errors)
  - Can be disabled per-tag at runtime
```

**Files:**
- `firmware/src/logging/logger.h` - Add `set_tag_rate_limit()` API
- `firmware/src/logging/logger.cpp` - Implement rate table + check logic
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_RATE_LIMITING` (default: 1)

---

#### P1.4: RUNTIME VERBOSITY CONTROL VIA WEBSERVER
**What:** HTTP endpoints to adjust logging at runtime (no recompile)
**Why:** Change debug levels without power cycle
**Impact:** ~200 bytes code, 40 bytes state
**Risk:** Low (read-only access to config, no persistence yet)

**Design:**
```
New Logger namespace functions:
  - get_verbosity() -> LOG_LEVEL_ERROR/WARN/INFO/DEBUG
  - set_verbosity(uint8_t level)
  - get_tag_enabled(char tag) -> bool
  - set_tag_enabled(char tag, bool enabled)
  - get_tag_rate_limit(char tag) -> uint32_t msgs/sec
  - set_tag_rate_limit(char tag, uint32_t limit)
  - get_stats() -> {"messages": N, "dropped": M, "buffer_used": X}

Webserver Endpoints:
  GET /api/logger/config
    Response: {
      "verbosity": "DEBUG",
      "tags": {"A": true, "I": true, "L": true, ...},
      "rate_limits": {"A": 1000, "I": 500, ...},
      "stats": {"total_messages": 12345, "dropped": 0}
    }

  POST /api/logger/verbosity?level=WARN
    Sets logger to WARN level

  POST /api/logger/tag?tag=A&enabled=true
    Enables/disables tag A

  POST /api/logger/rate-limit?tag=A&limit=100
    Sets tag A to max 100 msgs/sec

  GET /api/logger/stats
    Returns message statistics
```

**Files:**
- `firmware/src/logging/logger.h` - Add runtime config functions
- `firmware/src/logging/logger.cpp` - Implement state storage + getters/setters
- `firmware/src/webserver.cpp` - Add /api/logger/* endpoints
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_RUNTIME_CONFIG` (default: 1)

---

### PRIORITY 2 (IMPORTANT - Improve Experience)

These features provide structured output and better observability.

#### P2.1: FILE LOGGING TO SPIFFS
**What:** Write logs to SPIFFS file (e.g., `/logs/k1-YYYYMMDD.log`)
**Why:** Preserve logs after device reboot for forensics
**Impact:** ~500 bytes code, negligible RAM
**Risk:** Medium (SPIFFS I/O can block, needs timeout)

**Design:**
```
Log Rotation:
  - Daily files: /logs/k1-20251029.log
  - Max size: 500 KB per file (ESP32 SPIFFS typical limit)
  - Oldest file deleted when limit reached
  - Disabled by default (enable via config)

Non-blocking writes:
  - Use non-blocking semaphore check (fail-open if busy)
  - Write happens every 100ms batch or on overflow
  - Store in ring buffer if SPIFFS is busy

Format (file):
  [TIME] [SEV] [TAG] [CORE] message
  (same as stdout but without ANSI codes)

Configuration:
  LOG_ENABLE_FILE_LOGGING = 0 (default: disabled)
  LOG_FILE_PATH = "/logs"
  LOG_MAX_FILE_SIZE = 500000  // bytes
```

**Files:**
- `firmware/src/logging/logger_file.h` - New file for SPIFFS integration
- `firmware/src/logging/logger_file.cpp` - SPIFFS writer, rotation logic
- `firmware/src/logging/logger.cpp` - Call file writer from `log_internal()`
- `firmware/src/logging/log_config.h` - Add file logging flags

---

#### P2.2: JSON STRUCTURED LOGGING OPTION
**What:** Optional JSON output format for machine parsing
**Why:** Integrate with log aggregation systems (ELK, DataDog, etc.)
**Impact:** ~300 bytes code (conditional compilation)
**Risk:** None (feature flag, backward compatible)

**Design:**
```
JSON Format (one line per message):
{
  "seq": 1,
  "ts": "2025-10-29T12:34:56.789Z",
  "severity": "ERROR",
  "tag": "A",
  "core": 0,
  "message": "Bad sample rate: 48000 Hz",
  "source_file": "microphone.cpp",
  "source_line": 245,
  "thread_id": "audio_task",
  "duration_ms": 0.5
}

Mode toggle:
  Logger::set_format(FORMAT_HUMAN) or FORMAT_JSON
  Applies to both stdout and file output

Configuration:
  LOG_ENABLE_JSON_FORMAT = 1 (default)
  LOG_DEFAULT_FORMAT = FORMAT_HUMAN
```

**Files:**
- `firmware/src/logging/logger_json.h` - JSON serializer interface
- `firmware/src/logging/logger_json.cpp` - JSON formatter
- `firmware/src/logging/logger.cpp` - Integrate into `log_internal()`
- `firmware/src/logging/log_config.h` - Add format flags

---

#### P2.3: TIMESTAMP FORMAT OPTIONS
**What:** Choose between HH:MM:SS.mmm, ISO 8601, epoch ms, custom
**Why:** Match log aggregation system expectations
**Impact:** <100 bytes code, no RAM impact
**Risk:** None (config-time choice)

**Design:**
```
Timestamp format enum:
  TIMESTAMP_HUMAN   = "12:34:56.789"
  TIMESTAMP_ISO8601 = "2025-10-29T12:34:56.789Z"
  TIMESTAMP_EPOCH   = "1730205696789"  // milliseconds since epoch
  TIMESTAMP_COMPACT = "123456789"      // seconds.ms combined

Configuration:
  LOG_TIMESTAMP_FORMAT = TIMESTAMP_HUMAN (default)

Runtime toggle:
  Logger::set_timestamp_format(TIMESTAMP_ISO8601)
```

**Files:**
- `firmware/src/logging/logger.cpp` - Modify `get_timestamp()` to support multiple formats
- `firmware/src/logging/logger.h` - Add format enum + getter/setter
- `firmware/src/logging/log_config.h` - Add format constant

---

### PRIORITY 3 (NICE-TO-HAVE - Polish)

These improve operational visibility and automation.

#### P3.1: LOG STATISTICS & PERFORMANCE METRICS
**What:** Track messages/sec, buffer usage, dropped message count
**Why:** Detect logging bottlenecks and capacity issues
**Impact:** ~60 bytes RAM, <1ms overhead
**Risk:** None (read-only metrics)

**Metrics:**
- Total messages logged (this session)
- Messages dropped (rate limit)
- Current msgs/sec (rolling 1-second window)
- Buffer peak utilization
- Mutex contention (timeouts)

**API:**
```cpp
struct LoggerStats {
  uint32_t total_logged;
  uint32_t total_dropped;
  uint16_t current_rate_msgs_sec;
  uint8_t  buffer_utilization_pct;
  uint16_t mutex_timeouts;
};

Logger::LoggerStats get_stats();
Logger::reset_stats();
```

---

#### P3.2: DEBUG DASHBOARD ENDPOINT
**What:** Web UI showing live logger status
**Why:** Operators can monitor logging health without terminal
**Impact:** ~1 KB code (HTML), 400 bytes state
**Risk:** None (read-only, served from PROGMEM)

**Endpoint:**
```
GET /logger
  Returns HTML page with:
  - Real-time message rate (chart)
  - Drop rate per tag
  - Verbosity level indicator
  - Tag enable/disable toggle buttons
  - Stats table (total, dropped, buffer %)
  - Last 50 messages (live stream via WebSocket)
```

---

#### P3.3: LOG ROTATION & SPACE MANAGEMENT
**What:** Automatic cleanup of old log files
**Why:** Prevent SPIFFS from filling up
**Impact:** ~200 bytes code, negligible RAM
**Risk:** Low (deletion only on rotation threshold)

**Policy:**
- Keep logs from last 7 days
- Delete oldest file if total size > 2 MB
- Alert if SPIFFS free space < 100 KB

---

## 3. IMPLEMENTATION STRATEGY

### Overview: 4-Phase Rollout

```
PHASE 1 (Week 1)       PHASE 2 (Week 2)      PHASE 3 (Week 3)      PHASE 4 (Week 4)
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Rate Limiting    │   │ File Logging     │   │ Statistics       │   │ Testing & Docs   │
│ Runtime Config   │   │ JSON Output      │   │ Dashboard        │   │ Integration      │
│ Sequencing       │   │ Timestamp Opts   │   │ Optimization     │   │ Cleanup          │
│ Core ID Tracking │   │ Integration Test │   │ Performance      │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
      4 days                5 days                  4 days                3 days
```

---

### PHASE 1: Rate Limiting + Runtime Config + Sequencing (Days 1-4)

**Goal:** Enable dynamic logging control without code recompile

**Tasks:**

1. **Message Sequencing** (1 day)
   - [ ] Add `sequence_counter` static variable to logger.cpp
   - [ ] Implement atomic increment (use `__atomic_add_fetch` or mutex-protected)
   - [ ] Modify message format: `[%06u] [TIME] [SEV] [TAG] msg` → `[000001] [...]`
   - [ ] Add config flag `LOG_ENABLE_SEQUENCING`
   - [ ] Test: Verify counter increments, wraps at 999999
   - [ ] Backward compat: No breaking changes (additive only)

2. **Thread/Core ID Tracking** (0.5 day)
   - [ ] Call `xPortGetCoreID()` in `log_internal()`
   - [ ] Format: `[SEQ] [TIME] [SEV] [C%d] [TAG] msg` where C0=Core0, C1=Core1
   - [ ] Add config flag `LOG_ENABLE_CORE_ID`
   - [ ] Test: Verify Core 0 logs show C0, Core 1 logs show C1

3. **Rate Limiter Infrastructure** (2 days)
   - [ ] Define `struct RateLimit` with tag, last_time_ms, count, max_per_second
   - [ ] Create static `rate_limits[]` array for all tags
   - [ ] Implement `check_rate_limit(char tag) -> bool` (returns true if message should pass)
   - [ ] Add to `log_internal()` before message assembly (quick exit if rate limited)
   - [ ] Add config flags: `LOG_ENABLE_RATE_LIMITING`, `LOG_DEFAULT_RATE_MSGS_SEC`
   - [ ] Test: Verify messages are dropped above limit, ERROR severity always passes
   - [ ] Verify no mutex contention from rate check (check before mutex)

4. **Runtime Config API** (1.5 days)
   - [ ] Add public functions to logger.h:
     - `get_verbosity() -> uint8_t`
     - `set_verbosity(uint8_t level)`
     - `get_tag_enabled(char tag) -> bool`
     - `set_tag_enabled(char tag, bool enabled)`
     - `get_tag_rate_limit(char tag) -> uint32_t`
     - `set_tag_rate_limit(char tag, uint32_t msgs_per_sec)`
     - `get_stats() -> LoggerStats { dropped, total, ... }`
   - [ ] Store runtime state in logger.cpp static variables
   - [ ] Protect state access with mutex
   - [ ] Test: Verify all getters/setters work, are thread-safe

5. **Webserver Integration** (1.5 days)
   - [ ] Add endpoints to webserver.cpp:
     - `GET /api/logger/config` → JSON with all settings
     - `POST /api/logger/verbosity?level=WARN` → set verbosity
     - `POST /api/logger/tag?tag=A&enabled=true` → toggle tag
     - `POST /api/logger/rate-limit?tag=A&limit=100` → set rate limit
     - `GET /api/logger/stats` → JSON with stats
   - [ ] Return JSON responses
   - [ ] Test: Curl each endpoint, verify responses
   - [ ] Test: Change setting, verify effect in serial output

6. **Integration Test** (0.5 day)
   - [ ] Compile Phase 1 code, verify no errors/warnings
   - [ ] Flash to device, verify serial output format
   - [ ] Test rate limiting: Flood AUDIO tag, verify drop after ~100 msgs/sec
   - [ ] Test runtime config: Use webserver to toggle TAG_AUDIO, verify suppression
   - [ ] Test sequence counter: Verify [000001], [000002], etc.
   - [ ] Test core ID: Verify C0 and C1 appear correctly

**New Files Created:**
- `firmware/src/logging/logger_stats.h` - Stats structure definition

**Files Modified:**
- `firmware/src/logging/logger.h` - Add new public functions
- `firmware/src/logging/logger.cpp` - Implement rate limiting, runtime config, sequencing
- `firmware/src/logging/log_config.h` - Add feature flags
- `firmware/src/webserver.cpp` - Add /api/logger/* endpoints

**Backward Compatibility:**
- ✅ All changes are additive
- ✅ Existing `LOG_*` macros unchanged
- ✅ Default behavior (with all features enabled) slightly changes output format, but is parseable
- ✅ Can disable features via config flags for raw output matching old format

---

### PHASE 2: File Logging + JSON Format + Timestamp Options (Days 5-9)

**Goal:** Enable log persistence and structured output

**Tasks:**

1. **File Logging Infrastructure** (2 days)
   - [ ] Create `firmware/src/logging/logger_file.h` with interface
   - [ ] Implement `firmware/src/logging/logger_file.cpp`:
     - `file_log_init()` - check SPIFFS, create /logs dir
     - `file_log_write(const char* message, size_t len)` - non-blocking write
     - `file_log_rotate()` - daily rotation logic
     - `file_log_cleanup()` - delete old files if > 2MB
   - [ ] Use `SPIFFS.exists()`, `SPIFFS.open()`, `file.write()`, `file.close()`
   - [ ] Non-blocking: Check semaphore before write, skip if busy
   - [ ] Add ring buffer (256 bytes) for failed writes to retry next batch
   - [ ] Add config flags: `LOG_ENABLE_FILE_LOGGING`, `LOG_FILE_PATH`, `LOG_MAX_FILE_SIZE`
   - [ ] Test: Verify logs write to `/logs/k1-20251029.log`
   - [ ] Test: Verify rotation at midnight or size limit
   - [ ] Test: Verify cleanup deletes old files

2. **JSON Serializer** (1.5 days)
   - [ ] Create `firmware/src/logging/logger_json.h` with:
     - `struct JsonLogEntry` - fields: seq, ts, severity, tag, core, message, etc.
     - `json_format_message(const Entry&) -> const char*` (returns formatted JSON)
   - [ ] Implement in `firmware/src/logging/logger_json.cpp`:
     - Manual JSON construction (no external JSON library, <500 bytes)
     - Handle escaping (quotes, newlines, backslashes)
     - Format: `{"seq":1,"ts":"...","severity":"ERROR",...}\n`
   - [ ] Add format enum: `FORMAT_HUMAN`, `FORMAT_JSON`
   - [ ] Add public API: `set_format(uint8_t fmt)`, `get_format() -> uint8_t`
   - [ ] Store in logger.cpp state
   - [ ] Test: Verify JSON output is valid (use `jq` or similar)
   - [ ] Test: Verify escaping handles quotes and newlines

3. **Timestamp Format Options** (1 day)
   - [ ] Modify `logger.cpp:get_timestamp()` to support multiple formats
   - [ ] Add enum: `TIMESTAMP_HUMAN`, `TIMESTAMP_ISO8601`, `TIMESTAMP_EPOCH`, `TIMESTAMP_COMPACT`
   - [ ] Add public API: `set_timestamp_format(uint8_t fmt)`, `get_timestamp_format()`
   - [ ] Store format choice in logger.cpp state
   - [ ] Implement each format function
   - [ ] Test: Verify each format produces expected output
   - [ ] Test: Verify JSON uses ISO8601 timestamp regardless of human format choice

4. **Integration with Phase 1** (1 day)
   - [ ] Modify `logger.cpp:log_internal()` to call `file_log_write()` after serial write
   - [ ] Call `file_log_rotate()` once per day (check time in `log_internal()`)
   - [ ] Respect format choice (HUMAN or JSON) when writing to file
   - [ ] Test: Verify file contains same messages as serial (different format if JSON)
   - [ ] Test: Verify rate limiting applies to file writes too

5. **Webserver Updates** (1 day)
   - [ ] Add endpoints:
     - `GET /api/logger/format?fmt=json` → set output format
     - `GET /logs/` → list available log files
     - `GET /logs/k1-20251029.log` → download log file (with Content-Disposition)
   - [ ] Test: Verify format change applies to new messages
   - [ ] Test: Verify log file download works

6. **Integration Test** (1 day)
   - [ ] Compile Phase 1+2, verify no errors
   - [ ] Flash to device
   - [ ] Verify file logs created: `ls /logs/`
   - [ ] Verify JSON format valid: download log, parse with jq
   - [ ] Verify timestamp options work
   - [ ] Verify file rotation works (simulate time advance)

**New Files Created:**
- `firmware/src/logging/logger_file.h`
- `firmware/src/logging/logger_file.cpp`
- `firmware/src/logging/logger_json.h`
- `firmware/src/logging/logger_json.cpp`

**Files Modified:**
- `firmware/src/logging/logger.h` - Add format API
- `firmware/src/logging/logger.cpp` - Integrate file + JSON
- `firmware/src/logging/log_config.h` - Add file/JSON flags
- `firmware/src/webserver.cpp` - Add /logs/* endpoints

**Backward Compatibility:**
- ✅ File logging disabled by default
- ✅ JSON format disabled by default
- ✅ Timestamp format change is cosmetic only
- ✅ Existing logs unaffected

---

### PHASE 3: Statistics + Dashboard + Optimization (Days 10-13)

**Goal:** Visibility into logging performance

**Tasks:**

1. **Statistics Collection** (1 day)
   - [ ] Add `struct LoggerStats` to logger.h:
     ```cpp
     struct LoggerStats {
       uint32_t total_messages;
       uint32_t total_dropped;
       uint16_t current_rate_msgs_sec;
       uint8_t buffer_utilization_pct;
       uint16_t mutex_timeouts;
     };
     ```
   - [ ] Track in logger.cpp:
     - `total_messages` incremented before each message output
     - `total_dropped` incremented for each rate-limited message
     - `current_rate_msgs_sec` - rolling 1-second counter (increment every message, reset every 1000ms)
     - `buffer_utilization_pct` - (timestamp_buffer + message_buffer + format_buffer) / total / 100
     - `mutex_timeouts` - incremented if mutex timeout occurs
   - [ ] Add API: `get_stats()`, `reset_stats()`
   - [ ] Test: Verify stats increment correctly
   - [ ] Test: Verify reset clears counters

2. **Debug Dashboard HTML** (1.5 days)
   - [ ] Create static HTML file: `firmware/src/webserver_logger_dashboard.h`
   - [ ] Embed as PROGMEM string (avoid runtime allocation)
   - [ ] Include:
     - Real-time message rate chart (use Chart.js or similar lightweight lib)
     - Drop rate per tag (bar chart)
     - Verbosity level display
     - Tag enable/disable buttons (toggle checkboxes)
     - Stats table (total, dropped, buffer %, timeouts)
     - Last 50 messages (live via WebSocket)
   - [ ] Use WebSocket for live updates (reuse existing `/ws` endpoint)
   - [ ] CSS: minimal, no external dependencies
   - [ ] Test: Open browser, verify dashboard loads
   - [ ] Test: Verify stats update in real-time
   - [ ] Test: Verify buttons toggle settings

3. **Dashboard Endpoints** (1 day)
   - [ ] Add to webserver.cpp:
     - `GET /logger` → serve dashboard HTML
     - `GET /api/logger/stats` → JSON stats (from Phase 1)
   - [ ] Modify WebSocket handler to send logger stats periodically
   - [ ] Test: Verify stats endpoint returns JSON
   - [ ] Test: Verify WebSocket streams stats updates

4. **Performance Optimization** (1 day)
   - [ ] Profile rate limiter: ensure <0.5ms overhead
   - [ ] Optimize rate check: use hash table instead of linear search (if needed)
   - [ ] Test: Flood logs with 1000 msgs/sec, measure CPU impact (target: <5%)
   - [ ] Test: Verify mutex contention < 1% (good scalability)

5. **Integration Test** (0.5 day)
   - [ ] Compile all phases, no errors
   - [ ] Flash to device
   - [ ] Open `/logger` in browser, verify dashboard loads
   - [ ] Generate high-volume logs, watch stats update
   - [ ] Verify performance impact acceptable

**New Files Created:**
- `firmware/src/webserver_logger_dashboard.h` - HTML + CSS + JS for dashboard

**Files Modified:**
- `firmware/src/logging/logger.h` - Add `LoggerStats` struct, stats API
- `firmware/src/logging/logger.cpp` - Track statistics
- `firmware/src/webserver.cpp` - Add dashboard endpoints

---

### PHASE 4: Testing, Documentation, Integration (Days 14-16)

**Goal:** Hardening, documentation, and production readiness

**Tasks:**

1. **Unit Tests** (1.5 days)
   - [ ] Create `firmware/test/test_logger/*.cpp`:
     - `test_sequencing.cpp` - verify counter increments
     - `test_rate_limiting.cpp` - verify drop/pass logic
     - `test_thread_safety.cpp` - multi-core logging contention
     - `test_file_logging.cpp` - file creation, rotation, cleanup
     - `test_json_format.cpp` - JSON validity, escaping
   - [ ] Use existing test framework (PlatformIO + catch2 or similar)
   - [ ] Target: 95%+ code coverage for logger modules
   - [ ] Test edge cases: buffer overflow, SPIFFS full, mutex timeout, counter wrap

2. **Integration Tests** (1 day)
   - [ ] Test Phase 1 features with actual audio pipeline
   - [ ] Log audio subsystem at high frequency, verify rate limiting doesn't break functionality
   - [ ] Test Phase 2 file logging under audio stress
   - [ ] Test dashboard responsiveness with 1000 msgs/sec
   - [ ] Test log rotation timing

3. **Documentation** (1 day)
   - [ ] Update `firmware/src/logging/logger.h` with detailed comments
   - [ ] Create `docs/planning/LOGGING_USER_GUIDE.md`:
     - How to enable/disable features
     - Usage examples for each feature
     - Performance characteristics
     - Troubleshooting guide
   - [ ] Create `Implementation.plans/runbooks/logging_enhancement_runbook.md`:
     - Step-by-step build/deploy instructions
     - Configuration reference
     - Webserver API documentation

4. **Code Review & Cleanup** (1 day)
   - [ ] Self-review: check for compiler warnings, style consistency
   - [ ] Memory audit: ensure no dynamic allocation, all static buffers
   - [ ] Security audit: check buffer overflows, integer overflows
   - [ ] Performance audit: measure latency per feature, log throughput
   - [ ] Backward compatibility audit: verify old code still compiles

5. **Final Integration & Release** (1 day)
   - [ ] Merge all changes into main firmware build
   - [ ] Build firmware.bin, verify no errors
   - [ ] Flash to device, verify basic functionality
   - [ ] Verify webserver API works
   - [ ] Verify file logging and JSON format work
   - [ ] Create release notes

**New Files Created:**
- `firmware/test/test_logger/test_sequencing.cpp`
- `firmware/test/test_logger/test_rate_limiting.cpp`
- `firmware/test/test_logger/test_thread_safety.cpp`
- `firmware/test/test_logger/test_file_logging.cpp`
- `firmware/test/test_logger/test_json_format.cpp`
- `docs/planning/LOGGING_USER_GUIDE.md`
- `Implementation.plans/runbooks/logging_enhancement_runbook.md`

---

## 4. DETAILED DESIGN - Priority 1 Features

### DESIGN 1: MESSAGE SEQUENCING

**Data Structure:**
```cpp
namespace Logger {
  static uint32_t sequence_counter = 0;  // Global message sequence

  // Thread-safe increment
  static inline uint32_t next_sequence() {
    #if LOG_ENABLE_SEQUENCING
      // Use atomic increment if available, else mutex-protect
      return __atomic_add_fetch(&sequence_counter, 1, __ATOMIC_SEQ_CST);
    #else
      return 0;  // Disabled - return dummy value
    #endif
  }
}
```

**Message Format (with sequencing enabled):**
```
Before:  [HH:MM:SS.mmm] ERROR [A] Bad sample rate
After:   [000001] [HH:MM:SS.mmm] ERROR [A] Bad sample rate
                   ^^^^^^
                   6-digit sequence (pads with zeros)
```

**Overflow Handling:**
- Counter wraps at 1,000,000 (6 digits max)
- After wrap: `[000001]`, `[000002]`, ... `[000000]` (visual gap signals wrap)
- JSON field includes raw counter (no truncation)

**Configuration:**
```cpp
#define LOG_ENABLE_SEQUENCING 1  // 1 = enabled, 0 = disabled
```

**Code Impact:**
- 4 bytes RAM (uint32_t)
- ~20 bytes code (atomic increment)
- <0.1 ms overhead per message

---

### DESIGN 2: THREAD/CORE ID TRACKING

**Data Structure:**
```cpp
namespace Logger {
  static inline uint8_t get_core_id() {
    #if LOG_ENABLE_CORE_ID
      return xPortGetCoreID();  // ESP32 FreeRTOS API
    #else
      return 0xFF;  // Disabled
    #endif
  }
}
```

**Message Format (with core ID enabled):**
```
Before:  [000001] [HH:MM:SS.mmm] ERROR [A] Bad sample rate
After:   [000001] [HH:MM:SS.mmm] ERROR [C0] [A] Bad sample rate
                                         ^^^^
                                         C0 = Core 0, C1 = Core 1
```

**Configuration:**
```cpp
#define LOG_ENABLE_CORE_ID 1  // 1 = enabled, 0 = disabled
```

**Code Impact:**
- 0 bytes RAM (core ID is read from CPU register)
- ~10 bytes code (one function call)
- <0.01 ms overhead per message

---

### DESIGN 3: RATE LIMITING

**Data Structure:**
```cpp
namespace Logger {
  struct RateLimit {
    char tag;                    // Tag identifier
    uint32_t last_bucket_ms;     // Last second boundary
    uint16_t count_this_second;  // Messages in current second
    uint32_t max_per_second;     // Configured limit
  };

  static RateLimit rate_limits[] = {
    {TAG_AUDIO,   0, 0, 1000},   // Default: 1000 msgs/sec
    {TAG_I2S,     0, 0, 1000},
    {TAG_LED,     0, 0, 1000},
    {TAG_GPU,     0, 0, 500},    // GPU: 500 msgs/sec
    // ... all tags
  };

  static uint32_t total_dropped = 0;

  static bool check_rate_limit(char tag) {
    #if LOG_ENABLE_RATE_LIMITING
      // Find tag in rate_limits array
      for (size_t i = 0; i < rate_limit_count; i++) {
        if (rate_limits[i].tag == tag) {
          uint32_t now_ms = millis();
          uint32_t bucket = (now_ms / 1000) * 1000;  // Second boundary

          // Reset counter if we've moved to a new second
          if (bucket != rate_limits[i].last_bucket_ms) {
            rate_limits[i].last_bucket_ms = bucket;
            rate_limits[i].count_this_second = 0;
          }

          // Check if we've hit the limit
          if (rate_limits[i].count_this_second >= rate_limits[i].max_per_second) {
            total_dropped++;
            return false;  // DROP MESSAGE
          }

          // Message is allowed
          rate_limits[i].count_this_second++;
          return true;  // ALLOW MESSAGE
        }
      }
      // Tag not found - allow by default
      return true;
    #else
      return true;  // Rate limiting disabled
    #endif
  }
}
```

**Algorithm:**
1. Divide time into 1-second buckets (0-999ms, 1000-1999ms, etc.)
2. On each message, check which bucket we're in
3. If bucket changed, reset counter
4. If counter >= limit, DROP message (increment `total_dropped`)
5. Otherwise, allow and increment counter

**ERROR-always-pass Rule:**
```cpp
void log_internal(char tag, uint8_t severity, const char* format, va_list args) {
  // Never rate-limit ERROR messages
  if (severity != LOG_LEVEL_ERROR) {
    if (!check_rate_limit(tag)) {
      return;  // DROP
    }
  }
  // ... rest of logging
}
```

**Runtime Configuration:**
```cpp
namespace Logger {
  void set_tag_rate_limit(char tag, uint32_t msgs_per_second) {
    for (size_t i = 0; i < rate_limit_count; i++) {
      if (rate_limits[i].tag == tag) {
        rate_limits[i].max_per_second = msgs_per_second;
        return;
      }
    }
  }

  uint32_t get_tag_rate_limit(char tag) {
    for (size_t i = 0; i < rate_limit_count; i++) {
      if (rate_limits[i].tag == tag) {
        return rate_limits[i].max_per_second;
      }
    }
    return 0;  // Not found
  }

  uint32_t get_dropped_message_count() {
    return total_dropped;
  }
}
```

**Configuration:**
```cpp
#define LOG_ENABLE_RATE_LIMITING 1
#define LOG_DEFAULT_RATE_MSGS_SEC 1000
#define LOG_AUDIO_RATE_MSGS_SEC 100   // Audio subsystem cap
#define LOG_GPU_RATE_MSGS_SEC 500     // GPU subsystem cap
```

**Code Impact:**
- ~80 bytes RAM (rate_limits array)
- ~300 bytes code (check logic)
- <0.2 ms overhead per message (linear search, but only when called)
- O(n) search can be optimized to O(1) with hash table if needed

**Example Usage:**
```cpp
// High-frequency audio logging
for (int i = 0; i < 1000; i++) {
  LOG_DEBUG(TAG_AUDIO, "Sample %d: %.2f", i, sample);
}
// Without rate limiting: 1000 messages logged, console spam
// With rate limiting (default 1000/sec): all 1000 logged in real-time
// With rate limiting (limit=100/sec): first 100 logged, 900 dropped
```

---

### DESIGN 4: RUNTIME VERBOSITY CONTROL

**State Variables:**
```cpp
namespace Logger {
  static uint8_t current_verbosity = LOG_LEVEL_DEBUG;  // Global level

  // Per-tag enable/disable (only if LOG_ENABLE_TAG_FILTERING)
  static bool tag_enabled[TAG_COUNT];
}
```

**Public API:**
```cpp
namespace Logger {
  // Verbosity control
  uint8_t get_verbosity() {
    return current_verbosity;
  }

  void set_verbosity(uint8_t level) {
    if (level <= LOG_LEVEL_DEBUG) {
      current_verbosity = level;
    }
  }

  // Per-tag filtering (requires LOG_ENABLE_TAG_FILTERING)
  bool get_tag_enabled(char tag) {
    for (size_t i = 0; i < tag_filter_count; i++) {
      if (tag_filter[i].tag == tag) {
        return tag_filter[i].enabled;
      }
    }
    return true;
  }

  void set_tag_enabled(char tag, bool enabled) {
    for (size_t i = 0; i < tag_filter_count; i++) {
      if (tag_filter[i].tag == tag) {
        tag_filter[i].enabled = enabled;
        return;
      }
    }
  }
}
```

**Webserver Integration:**
```cpp
// In webserver.cpp

server.on("/api/logger/config", HTTP_GET, [](AsyncWebServerRequest *request) {
  // Return current configuration as JSON
  char response[512];
  snprintf(response, sizeof(response),
    "{"
      "\"verbosity\":\"%s\","
      "\"rate_limiting_enabled\":%d,"
      "\"sequencing_enabled\":%d,"
      "\"core_id_enabled\":%d"
    "}",
    severity_to_string(Logger::get_verbosity()),
    LOG_ENABLE_RATE_LIMITING,
    LOG_ENABLE_SEQUENCING,
    LOG_ENABLE_CORE_ID
  );
  request->send(200, "application/json", response);
});

server.on("/api/logger/verbosity", HTTP_POST, [](AsyncWebServerRequest *request) {
  // ?level=WARN
  if (request->hasParam("level")) {
    String level = request->getParam("level")->value();
    uint8_t num_level = LOG_LEVEL_ERROR;
    if (level == "WARN") num_level = LOG_LEVEL_WARN;
    else if (level == "INFO") num_level = LOG_LEVEL_INFO;
    else if (level == "DEBUG") num_level = LOG_LEVEL_DEBUG;

    Logger::set_verbosity(num_level);
    request->send(200, "application/json", "{\"ok\":true}");
  } else {
    request->send(400, "application/json", "{\"error\":\"missing level\"}");
  }
});

server.on("/api/logger/tag", HTTP_POST, [](AsyncWebServerRequest *request) {
  // ?tag=A&enabled=true
  if (request->hasParam("tag") && request->hasParam("enabled")) {
    String tag_str = request->getParam("tag")->value();
    String enabled_str = request->getParam("enabled")->value();

    char tag = tag_str.c_str()[0];
    bool enabled = (enabled_str == "true" || enabled_str == "1");

    Logger::set_tag_enabled(tag, enabled);
    request->send(200, "application/json", "{\"ok\":true}");
  } else {
    request->send(400, "application/json", "{\"error\":\"missing params\"}");
  }
});

server.on("/api/logger/rate-limit", HTTP_POST, [](AsyncWebServerRequest *request) {
  // ?tag=A&limit=100
  if (request->hasParam("tag") && request->hasParam("limit")) {
    String tag_str = request->getParam("tag")->value();
    String limit_str = request->getParam("limit")->value();

    char tag = tag_str.c_str()[0];
    uint32_t limit = atoi(limit_str.c_str());

    Logger::set_tag_rate_limit(tag, limit);
    request->send(200, "application/json", "{\"ok\":true}");
  } else {
    request->send(400, "application/json", "{\"error\":\"missing params\"}");
  }
});

server.on("/api/logger/stats", HTTP_GET, [](AsyncWebServerRequest *request) {
  Logger::LoggerStats stats = Logger::get_stats();
  char response[256];
  snprintf(response, sizeof(response),
    "{"
      "\"total_messages\":%u,"
      "\"dropped_messages\":%u,"
      "\"mutex_timeouts\":%u"
    "}",
    stats.total_messages,
    stats.total_dropped,
    stats.mutex_timeouts
  );
  request->send(200, "application/json", response);
});
```

**Configuration:**
```cpp
#define LOG_ENABLE_RUNTIME_CONFIG 1
```

**Code Impact:**
- ~100 bytes RAM (state variables)
- ~400 bytes code (API functions)
- <0.5 ms overhead per message

---

## 5. MIGRATION STRATEGY

### How to Upgrade Existing Code

**GOOD NEWS:** No changes required to existing code!

All existing `LOG_*` calls continue to work without modification:
```cpp
// Old code - still works
LOG_ERROR(TAG_AUDIO, "Failed to init: %d", error_code);
LOG_WARN(TAG_I2S, "Sample rate: %lu Hz", sample_rate);
LOG_INFO(TAG_BEAT, "BPM detected: %.1f", bpm_value);
LOG_DEBUG(TAG_SYNC, "Frame %u ready", frame_count);
```

**What Changes in Output:**
```
OLD:  [12:34:56.789] ERROR [A] Failed to init: 42
NEW:  [000001] [12:34:56.789] ERROR [C0] [A] Failed to init: 42
       ^^^^^^   unchanged        ^^^^   unchanged   unchanged
       NEW                        NEW
       (sequence)               (core ID)
```

**Optional: Use New Features**
```cpp
// New in Phase 1 - optional, no API changes needed
Logger::set_tag_rate_limit(TAG_AUDIO, 100);  // Cap audio logs
Logger::set_verbosity(LOG_LEVEL_WARN);       // Suppress DEBUG

// New in Phase 2 - optional
Logger::set_format(FORMAT_JSON);             // Structured output
Logger::set_timestamp_format(TIMESTAMP_ISO8601);

// New in Phase 3 - read-only
auto stats = Logger::get_stats();
printf("Logged %u msgs, dropped %u\n", stats.total_messages, stats.total_dropped);
```

### Fallback Plan (If Issues Found)

**Disable Features via Config:**
```cpp
// log_config.h - disable any problematic feature
#define LOG_ENABLE_SEQUENCING 0        // Old format (no [000001])
#define LOG_ENABLE_CORE_ID 0           // Old format (no [C0])
#define LOG_ENABLE_RATE_LIMITING 0     // All messages logged
#define LOG_ENABLE_FILE_LOGGING 0      // Serial output only
#define LOG_ENABLE_JSON_FORMAT 0       // Human-readable format
#define LOG_ENABLE_RUNTIME_CONFIG 0    // Compile-time only
```

Recompile and flash - system reverts to Phase 0 (existing logger).

### What Breaks? (Answer: Nothing)

- ✅ Existing code continues to compile without changes
- ✅ Existing Serial output format augmented (not replaced)
- ✅ Webserver remains responsive (new endpoints don't interfere)
- ✅ Audio pipeline unaffected (no Core 1 changes, only Core 0 logging)
- ✅ Memory footprint minimal (<200 bytes additional)

---

## 6. CODE EXAMPLES

### Scenario 1: High-Frequency Audio Logging with Rate Limiting

**Problem:** Audio subsystem logs 1000+ debug messages per second, drowning out other logs.

**Solution Code:**
```cpp
// In firmware/src/audio/microphone.cpp

void process_audio_chunk(const int32_t* samples, int count) {
  for (int i = 0; i < count; i++) {
    // Without rate limiting: 48000 DEBUG messages per second
    // With rate limiting: only 100 DEBUG messages per second (others dropped)
    LOG_DEBUG(TAG_AUDIO, "Sample[%d]: %ld", i, samples[i]);
  }
}

// In main.cpp setup():
void setup() {
  Logger::init();

  // Set audio tag to max 100 messages/second
  Logger::set_tag_rate_limit(TAG_AUDIO, 100);

  // Keep ERROR messages always (no rate limit)
  // Other tags default to 1000 msgs/sec
}
```

**Output Before:**
```
[000001] [12:34:56.100] DEBUG [C0] [A] Sample[0]: 12345
[000002] [12:34:56.101] DEBUG [C0] [A] Sample[1]: 12346
[000003] [12:34:56.102] DEBUG [C0] [A] Sample[2]: 12347
... (1000+ lines per second, console unusable)
```

**Output After:**
```
[000001] [12:34:56.100] DEBUG [C0] [A] Sample[0]: 12345
[000002] [12:34:56.100] DEBUG [C0] [A] Sample[1]: 12346
... (100 lines per second, other logs visible)
[000100] [12:34:56.101] WARN [C0] [I] I2S buffer underrun  <- Visible!
[000101] [12:34:56.102] DEBUG [C0] [A] Sample[999]: 13344
```

**Webserver Control:**
```bash
# Increase audio logging to 500 msgs/sec
curl -X POST "http://device.local/api/logger/rate-limit?tag=A&limit=500"
# Response: {"ok":true}

# Check current stats
curl "http://device.local/api/logger/stats"
# Response: {"total_messages":50000,"dropped_messages":5000,"mutex_timeouts":0}

# Suppress audio logs entirely
curl -X POST "http://device.local/api/logger/tag?tag=A&enabled=false"
# Response: {"ok":true}
```

---

### Scenario 2: Multi-Task Contention (Core 0 UI + Core 1 Audio)

**Problem:** Core 0 UI logging and Core 1 audio logging interleaving on serial port.

**Solution Code:**
```cpp
// In main.cpp - Core 0 (UI Task)
void loop() {
  // ... Pattern rendering every 16ms
  LOG_DEBUG(TAG_LED, "Rendering frame %u", frame_count);  // [C0]
}

// In firmware/src/audio/microphone.cpp - Core 1 (Audio Task)
void audio_task(void* param) {
  while (true) {
    // ... Audio processing
    LOG_DEBUG(TAG_AUDIO, "Beat detected at BPM %.1f", bpm);  // [C1]
  }
}
```

**Output (with core ID enabled):**
```
[000001] [12:34:56.000] DEBUG [C0] [L] Rendering frame 1
[000002] [12:34:56.001] DEBUG [C1] [A] Beat detected at BPM 120.5
[000003] [12:34:56.016] DEBUG [C0] [L] Rendering frame 2
[000004] [12:34:56.032] DEBUG [C1] [A] Processing chromagram
[000005] [12:34:56.032] DEBUG [C0] [L] Rendering frame 3
```

**Thread Safety Guarantee:**
- Mutex ensures each message outputs atomically (no interleaving)
- Core ID shows which core logged the message
- Sequence number detects if messages are lost
- Rate limiting prevents Core 1 from monopolizing serial

---

### Scenario 3: Error Condition with Context Logging

**Problem:** WiFi connection fails; need to debug without flooding logs.

**Solution Code:**
```cpp
// In firmware/src/advanced_wifi_manager.cpp

void connect_wifi() {
  LOG_INFO(TAG_WIFI, "Attempting WiFi connection...");

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    attempts++;

    // Log every 2 seconds
    if (attempts % 4 == 0) {
      uint32_t elapsed_ms = attempts * 500;
      LOG_WARN(TAG_WIFI, "Connection timeout after %lu ms", elapsed_ms);
    }

    delay(500);
  }

  if (WiFi.status() != WL_CONNECTED) {
    LOG_ERROR(TAG_WIFI, "Failed to connect: status=%d", WiFi.status());

    // ERROR messages bypass rate limiting, always logged
    Logger::set_verbosity(LOG_LEVEL_DEBUG);  // Boost debug output for diagnosis
    LOG_DEBUG(TAG_WIFI, "Attempting debug connection...");
  }
}
```

**Output:**
```
[000001] [12:34:56.100] INFO  [C0] [W] Attempting WiFi connection...
[000002] [12:34:58.100] WARN  [C0] [W] Connection timeout after 2000 ms
[000003] [12:34:59.100] WARN  [C0] [W] Connection timeout after 4000 ms
[000004] [12:35:00.100] WARN  [C0] [W] Connection timeout after 6000 ms
[000005] [12:35:10.100] ERROR [C0] [W] Failed to connect: status=0
[000006] [12:35:10.101] DEBUG [C0] [W] Attempting debug connection...
   ^^^^^^ ERROR always logged, never rate-limited
```

**Webserver Diagnostic:**
```bash
# Check what happened
curl "http://device.local/api/logger/stats"
# Response: {"total_messages":1000,"dropped_messages":0,"mutex_timeouts":0}

# Get configuration to verify settings
curl "http://device.local/api/logger/config"
# Response: {
#   "verbosity":"DEBUG",
#   "rate_limiting_enabled":1,
#   "sequencing_enabled":1,
#   "core_id_enabled":1
# }

# Check system health
open "http://device.local/logger"  # Opens dashboard in browser
# Dashboard shows:
# - Message rate: 50 msgs/sec
# - Dropped: 0 (all messages passing)
# - Verbosity: DEBUG (low level for diagnosis)
# - Mutex timeouts: 0 (thread-safe)
```

---

## 7. DELIVERABLES

### File Structure After Implementation

```
firmware/
├── src/
│   ├── logging/
│   │   ├── logger.h                 # Enhanced with P1 APIs
│   │   ├── logger.cpp               # P1 + P2 implementation
│   │   ├── log_config.h             # All feature flags
│   │   ├── logger_stats.h           # NEW: Stats structure
│   │   ├── logger_file.h            # NEW: File logging interface
│   │   ├── logger_file.cpp          # NEW: SPIFFS writer
│   │   ├── logger_json.h            # NEW: JSON serializer
│   │   └── logger_json.cpp          # NEW: JSON formatter
│   ├── webserver.cpp                # Enhanced with /api/logger/* endpoints
│   ├── webserver_logger_dashboard.h # NEW: Dashboard HTML (PROGMEM)
│   └── main.cpp                     # Unchanged (Logger::init() call exists)
│
├── test/
│   └── test_logger/
│       ├── test_sequencing.cpp      # NEW
│       ├── test_rate_limiting.cpp   # NEW
│       ├── test_thread_safety.cpp   # NEW
│       ├── test_file_logging.cpp    # NEW
│       └── test_json_format.cpp     # NEW
│
docs/
├── planning/
│   ├── LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md  # This document
│   └── LOGGING_USER_GUIDE.md                           # NEW: Feature documentation
│
└── Implementation.plans/
    └── runbooks/
        └── logging_enhancement_runbook.md  # NEW: Deployment guide
```

### Acceptance Criteria Checklist

**Phase 1 (Rate Limiting + Runtime Config + Sequencing):**
- [ ] Code compiles with 0 errors, 0 warnings
- [ ] Sequencing counter increments [000001], [000002], etc.
- [ ] Core ID appears correctly [C0], [C1]
- [ ] Rate limiting drops messages above limit
- [ ] ERROR severity bypasses rate limiting
- [ ] Webserver endpoints respond with JSON
- [ ] Runtime config changes apply immediately (no recompile)
- [ ] All existing LOG_* calls work unchanged
- [ ] Mutex contention < 1% CPU overhead
- [ ] Memory footprint + 80 bytes (rate table) and + 4 bytes (sequence counter)

**Phase 2 (File Logging + JSON + Timestamps):**
- [ ] File logging creates `/logs/k1-YYYYMMDD.log`
- [ ] JSON output is valid (passes `jq` parse)
- [ ] File contains same messages as serial (different format if JSON)
- [ ] Log rotation works (new file created next day or on size limit)
- [ ] Old files deleted when SPIFFS exceeds limit
- [ ] Timestamp format options work (all 4 formats)
- [ ] JSON escaping handles quotes, newlines, backslashes
- [ ] File writes are non-blocking (don't stall audio)

**Phase 3 (Statistics + Dashboard):**
- [ ] Stats tracking works (total_messages, dropped, rate)
- [ ] Dashboard HTML loads in browser
- [ ] Stats update in real-time via WebSocket
- [ ] Dashboard buttons toggle logger settings
- [ ] Message rate chart shows live data
- [ ] Performance profiling shows < 5% CPU overhead at 1000 msgs/sec

**Phase 4 (Testing + Docs):**
- [ ] 95%+ test coverage for logger modules
- [ ] All unit tests pass
- [ ] Integration tests pass with audio pipeline
- [ ] LOGGING_USER_GUIDE.md documents all features
- [ ] Runbook covers build, deploy, configuration
- [ ] Code review passes (no security issues)
- [ ] Backward compatibility verified

---

## 8. RISK MITIGATION

### What Could Break?

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Buffer overflow in message assembly | Low | Critical | All snprintf calls bounded, truncation tested |
| Rate limiter causes dropped errors | Low | Critical | ERROR severity explicitly exempted |
| Mutex contention blocks audio Core 1 | Low | High | Rate check before mutex, fail-open on timeout |
| SPIFFS full blocks logging | Medium | Medium | Ring buffer for failed writes, non-blocking writes |
| JSON escaping corrupts output | Low | Medium | Unit test all edge cases (quotes, newlines) |
| Integer overflow in sequence counter | Very Low | Low | Counter wraps at 1M, JSON field logs raw value |
| Time-based rate limiting buggy | Low | Low | Unit tests for bucket boundary conditions |
| Webserver endpoint conflicts | Very Low | Low | Use unique namespace `/api/logger/*` |
| Memory leak in file I/O | Low | Medium | SPIFFS I/O handled with RAII, no dynamic alloc |

### Failure Modes & Recovery

**Scenario: Mutex timeout in rate limiter**
- Symptoms: Some messages logged, some silently dropped (no error)
- Root cause: Logging called from high-priority ISR during mutex hold
- Recovery: Rate check exemption for ISR context (add flag to log_internal)
- Prevention: Detailed comments in code warning about ISR safety

**Scenario: SPIFFS fills up**
- Symptoms: File logging stops, serial output continues
- Root cause: 500 KB log file limit exceeded, no old files to delete
- Recovery: Non-blocking write fails gracefully, ring buffer prevents loss
- Prevention: Implement aggressive log rotation (smaller file size)

**Scenario: JSON escaping fails**
- Symptoms: Log aggregation system rejects JSON
- Root cause: Quote or newline in message not escaped
- Recovery: Disable JSON format, revert to human-readable
- Prevention: Comprehensive unit tests for all escape sequences

---

## 9. TESTING STRATEGY

### Unit Tests (Phase 4)

**Test Framework:** PlatformIO + Catch2 or Google Test

**Coverage by Module:**

| Module | Test File | Tests | Coverage Target |
|--------|-----------|-------|-----------------|
| Sequencing | test_sequencing.cpp | 5 | 100% |
| Rate Limiter | test_rate_limiting.cpp | 8 | 100% |
| Thread Safety | test_thread_safety.cpp | 6 | 95% |
| File Logging | test_file_logging.cpp | 7 | 95% |
| JSON Format | test_json_format.cpp | 6 | 100% |

**Example Test:**
```cpp
// firmware/test/test_logger/test_rate_limiting.cpp
#include <catch2/catch.hpp>
#include "logger.h"

TEST_CASE("Rate limiter blocks excess messages") {
  Logger::set_tag_rate_limit(TAG_AUDIO, 100);  // 100 msgs/sec

  uint32_t allowed = 0, blocked = 0;

  // Simulate 1000 messages in 1 second
  for (int i = 0; i < 1000; i++) {
    if (Logger::would_allow_message(TAG_AUDIO)) {
      allowed++;
    } else {
      blocked++;
    }
  }

  // Expect ~100 allowed, ~900 blocked
  REQUIRE(allowed <= 110);   // Allow 10% tolerance
  REQUIRE(allowed >= 90);
  REQUIRE(blocked >= 890);
}

TEST_CASE("ERROR severity bypasses rate limiting") {
  Logger::set_tag_rate_limit(TAG_AUDIO, 10);  // Strict limit

  // All ERROR messages should be allowed
  for (int i = 0; i < 100; i++) {
    REQUIRE(Logger::would_allow_message_ex(TAG_AUDIO, LOG_LEVEL_ERROR) == true);
  }
}

TEST_CASE("Rate limiter resets per second") {
  Logger::set_tag_rate_limit(TAG_AUDIO, 50);

  // Log 60 messages at t=0ms (50 allowed, 10 blocked)
  uint32_t count_1 = 0;
  for (int i = 0; i < 60; i++) {
    if (Logger::would_allow_message(TAG_AUDIO)) count_1++;
  }
  REQUIRE(count_1 == 50);

  // Advance time to t=1001ms
  advance_time_ms(1001);

  // Log 60 more messages (all 50 allowed again)
  uint32_t count_2 = 0;
  for (int i = 0; i < 60; i++) {
    if (Logger::would_allow_message(TAG_AUDIO)) count_2++;
  }
  REQUIRE(count_2 == 50);
}
```

### Integration Tests

**Test Scenarios:**
1. **Audio stress test:** 1000 audio samples/sec logged at full rate, verify other subsystems visible
2. **Multi-core contention:** Simultaneous Core 0 + Core 1 logging, verify mutex prevents interleaving
3. **File rotation:** Log for 24 hours (simulated time), verify daily rotation
4. **Webserver API:** Each endpoint called, verify responses correct
5. **Dashboard responsiveness:** Open dashboard, verify stats update < 100ms latency

---

## 10. DOCUMENTATION OUTLINE

### LOGGING_USER_GUIDE.md (New, to be created)

```markdown
# K1.reinvented Logger User Guide

## Overview
- What logging system provides
- Design principles (zero overhead, thread-safe, structured)
- Architecture diagram

## Features

### Phase 1: Frequency Control & Runtime Config
- Message sequencing
- Thread/core ID tracking
- Rate limiting (per-tag, configurable)
- Runtime configuration (verbosity, tags, limits)

### Phase 2: File Logging & Structured Output
- SPIFFS file logging with rotation
- JSON structured format
- Timestamp format options

### Phase 3: Observability
- Statistics tracking
- Debug dashboard
- Live message stream

## Configuration Reference
- All compile-time flags in log_config.h
- Default values and what they mean

## Webserver API Reference
- GET /api/logger/config
- POST /api/logger/verbosity
- POST /api/logger/tag
- POST /api/logger/rate-limit
- GET /api/logger/stats

## Usage Examples
- Scenario 1: Quiet down noisy audio subsystem
- Scenario 2: Diagnose multi-core synchronization issues
- Scenario 3: Export logs in JSON for analysis

## Troubleshooting
- Dropped messages - what does it mean?
- Rate limiting too aggressive - how to relax
- File logging not working - check SPIFFS
- JSON parsing fails - escaping issues

## Performance Characteristics
- CPU overhead at various message rates
- Memory footprint breakdown
- Serial throughput limits
```

### logging_enhancement_runbook.md (New, to be created)

```markdown
# Logging Enhancement Implementation Runbook

## Build Instructions
- Requirements (PlatformIO 6.0+, ESP-IDF 4.4+)
- Checkout code
- Configure build flags
- Build: `platformio run`
- Flash: `platformio run --target upload`

## Verification Steps
1. Serial output shows new format [SEQ] [TIME] [SEV] [C#] [TAG]
2. Open browser to http://device.local/logger → Dashboard loads
3. Test webserver endpoints with curl commands
4. Verify file logs created at /logs/k1-YYYYMMDD.log
5. Check stats endpoint returns JSON with counts

## Configuration Reference
- Enable/disable features in log_config.h
- Set default rate limits per tag
- Choose timestamp format
- Select human vs JSON output

## Monitoring & Maintenance
- Check /logger dashboard daily
- Review dropped message rate (should be 0 under normal load)
- Rotate logs manually if needed: `SPIFFS.remove("/logs/...")`
- Monitor SPIFFS free space: http://device.local/api/system/disk

## Rollback Plan
If issues found:
1. Revert log_config.h to disable problematic features
2. Recompile and flash
3. System returns to Phase 0 (original logger)
4. File logs are safe (archived at /logs/*.bak)

## Known Issues
(None currently - will be updated during Phase 4)
```

---

## CONCLUSION

This implementation proposal provides a **practical, low-risk pathway** to enhance K1.reinvented's logging system with 13 new features across 4 phases over 2-3 weeks.

**Key Strengths:**
1. ✅ **Backward compatible** - existing code unchanged
2. ✅ **Low risk** - isolated changes, feature flags for safety
3. ✅ **Minimal footprint** - ~400 bytes code, ~100 bytes RAM
4. ✅ **Thread-safe** - leverages existing mutex architecture
5. ✅ **Operationally friendly** - webserver API for runtime control
6. ✅ **Well-tested** - comprehensive test coverage in Phase 4

**Next Steps:**
1. Review this proposal with team
2. Prioritize features (this plan assumes all P1+P2 are critical)
3. Assign implementation phases to developers
4. Begin Phase 1 implementation
5. Test daily with actual audio pipeline
6. Ship Phase 1 to production by end of Week 1

**Estimated Total Effort:**
- Phase 1: 4 developer-days
- Phase 2: 5 developer-days
- Phase 3: 4 developer-days
- Phase 4: 3 developer-days
- **Total: 16 developer-days or 2 full weeks (1 developer)**

