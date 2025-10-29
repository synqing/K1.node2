# Logging Enhancement - Quick Reference Guide

**Status:** Implementation plan (Phase 1 starting)
**Last Updated:** 2025-10-29

This is a condensed version of the full proposal. See `docs/planning/LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md` for complete details.

---

## TL;DR - What's Being Built?

**4 new logging features over 4 weeks:**

| Phase | Feature | Benefit | Effort |
|-------|---------|---------|--------|
| P1 (Week 1) | Rate limiting + runtime config | Control log flood without rebooting | 4 days |
| P2 (Week 2) | File logging + JSON format | Persist logs, machine-parse output | 5 days |
| P3 (Week 3) | Stats + debug dashboard | Observe logging health | 4 days |
| P4 (Week 4) | Tests + docs + integration | Production ready | 3 days |

**Goal:** Solve "audio logging drowns out other subsystems" without breaking existing code.

---

## Phase 1: What Needs to Be Built (Days 1-4)

### Feature 1: Message Sequencing
**What:** Add counter `[000001]`, `[000002]`, etc. to each message
**Why:** Detect dropped/reordered messages
**Code:** 4 bytes RAM, ~20 bytes code

```cpp
// Example output:
[000001] [12:34:56.789] ERROR [A] Bad sample rate
[000002] [12:34:57.100] DEBUG [A] Processing frame
```

**Files to modify:**
- `firmware/src/logging/logger.cpp` - Add `sequence_counter` global
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_SEQUENCING = 1`

---

### Feature 2: Thread/Core ID Tracking
**What:** Show which core logged `[C0]` or `[C1]`
**Why:** Diagnose Core 0/1 synchronization issues
**Code:** 0 bytes RAM, ~10 bytes code

```cpp
// Example output:
[000001] [12:34:56.789] ERROR [C0] [A] Bad sample rate  // Core 0
[000002] [12:34:57.100] DEBUG [C1] [A] Processing frame // Core 1
```

**Files to modify:**
- `firmware/src/logging/logger.cpp` - Call `xPortGetCoreID()`
- `firmware/src/logging/log_config.h` - Add `LOG_ENABLE_CORE_ID = 1`

---

### Feature 3: Rate Limiting Per Tag
**What:** Cap messages to N msgs/sec per tag (e.g., TAG_AUDIO = 100 msgs/sec)
**Why:** Prevent audio logging from drowning out other subsystems
**Code:** ~80 bytes RAM, ~300 bytes code

```cpp
// Setup in main():
Logger::set_tag_rate_limit(TAG_AUDIO, 100);  // Audio: max 100/sec
// TAG_I2S, TAG_WIFI, etc. default to 1000/sec

// Behavior:
for (int i = 0; i < 1000; i++) {
  LOG_DEBUG(TAG_AUDIO, "Sample %d", i);  // First 100 logged, 900 dropped
}

// Rule: ERROR severity ALWAYS passes (never rate-limited)
LOG_ERROR(TAG_AUDIO, "Critical error");  // Always logged, even if at limit
```

**Algorithm:**
1. Divide time into 1-second buckets
2. Track message count per tag per bucket
3. Drop messages above limit
4. Reset counter each second

**Files to modify:**
- `firmware/src/logging/logger.cpp` - Implement rate table + check
- `firmware/src/logging/logger.h` - Add API: `set_tag_rate_limit()`, etc.
- `firmware/src/logging/log_config.h` - Add flags

---

### Feature 4: Runtime Verbosity Control
**What:** Change logging level via webserver (no recompile/reboot)
**Why:** Diagnose issues without power cycling device
**Code:** ~100 bytes RAM, ~400 bytes code

```cpp
// Public API:
Logger::set_verbosity(LOG_LEVEL_WARN);       // Change from DEBUG to WARN
Logger::set_tag_enabled(TAG_AUDIO, false);   // Disable audio logs
Logger::get_tag_rate_limit(TAG_AUDIO);       // Query current limit

// Webserver endpoints:
POST /api/logger/verbosity?level=WARN        // Set level
POST /api/logger/tag?tag=A&enabled=false     // Disable tag
POST /api/logger/rate-limit?tag=A&limit=50   // Set rate limit
GET  /api/logger/stats                       // Get message counts
GET  /api/logger/config                      // Get all settings (JSON)
```

**Files to modify:**
- `firmware/src/logging/logger.cpp` - Store runtime state
- `firmware/src/logging/logger.h` - Public functions
- `firmware/src/webserver.cpp` - Add `/api/logger/*` endpoints

---

## Phase 1 Implementation Checklist

```
SEQUENCING:
  [ ] Add static uint32_t sequence_counter = 0;
  [ ] Increment atomically in log_internal()
  [ ] Format: [%06u] (6-digit, padded with zeros)
  [ ] Add LOG_ENABLE_SEQUENCING config flag
  [ ] Test: Counter increments, wraps at 999999

CORE ID:
  [ ] Call xPortGetCoreID() in log_internal()
  [ ] Format output: [C0] or [C1]
  [ ] Add LOG_ENABLE_CORE_ID config flag
  [ ] Test: Core 0 logs show C0, Core 1 show C1

RATE LIMITING:
  [ ] Define RateLimit struct (tag, last_time_ms, count, max_per_sec)
  [ ] Create static rate_limits[] array
  [ ] Implement check_rate_limit(tag) function
  [ ] Call check BEFORE mutex acquisition (quick exit)
  [ ] Handle ERROR severity: always pass (never rate-limit)
  [ ] Add set_tag_rate_limit(tag, limit) function
  [ ] Add LOG_ENABLE_RATE_LIMITING flag
  [ ] Test: Verify drop/allow logic, ERROR always passes

RUNTIME CONFIG:
  [ ] Add get/set functions for verbosity
  [ ] Add get/set functions for tag enable/disable
  [ ] Add get/set functions for rate limits
  [ ] Store state in logger.cpp (static variables)
  [ ] Protect with mutex (or just read, writes OK if atomic)
  [ ] Add get_stats() function (returns total, dropped, etc.)
  [ ] Test: Verify all getters/setters work

WEBSERVER:
  [ ] Add /api/logger/config endpoint (GET)
  [ ] Add /api/logger/verbosity endpoint (POST)
  [ ] Add /api/logger/tag endpoint (POST)
  [ ] Add /api/logger/rate-limit endpoint (POST)
  [ ] Add /api/logger/stats endpoint (GET)
  [ ] Return JSON responses
  [ ] Test: Curl each endpoint

INTEGRATION:
  [ ] Compile with no errors/warnings
  [ ] Flash to device
  [ ] Verify serial output shows new format
  [ ] Test rate limiting: flood a tag, verify drop after limit
  [ ] Test runtime config: change verbosity via webserver
  [ ] Test sequence counter: verify [000001], [000002], etc.
  [ ] Test core ID: verify C0/C1 appear correctly
```

---

## Phase 1 Message Format

**Before Enhancement:**
```
[12:34:56.789] ERROR [A] Failed to init: 42
```

**After Enhancement (all features enabled):**
```
[000001] [12:34:56.789] ERROR [C0] [A] Failed to init: 42
└─────┘  └─────────────┘ └────┘ └──┘ └┘ └──────────────────┘
  SEQ        TIME          SEV   CORE TAG      MESSAGE
```

**Feature Flags (log_config.h):**
```cpp
#define LOG_ENABLE_SEQUENCING 1        // Add [000001] prefix
#define LOG_ENABLE_CORE_ID 1           // Add [C0]/[C1] core indicator
#define LOG_ENABLE_RATE_LIMITING 1     // Enable rate limiter
#define LOG_ENABLE_RUNTIME_CONFIG 1    // Enable webserver API
```

**Disable any feature (for debugging):**
```cpp
#define LOG_ENABLE_SEQUENCING 0        // Revert to old format
#define LOG_ENABLE_CORE_ID 0
#define LOG_ENABLE_RATE_LIMITING 0
```

---

## Phase 2 & 3 (Quick Overview)

### Phase 2: File Logging + JSON Format + Timestamps (Days 5-9)
- Write logs to SPIFFS: `/logs/k1-20251029.log`
- JSON structured format: `{"seq":1,"ts":"...","msg":"..."}`
- Timestamp options: HH:MM:SS, ISO-8601, epoch ms
- Webserver endpoints to download logs
- ~1 KB new code, <100 bytes RAM

### Phase 3: Statistics + Dashboard (Days 10-13)
- Track message rates, dropped counts, buffer usage
- Web UI dashboard at `/logger`
- Real-time stats via WebSocket
- ~1.5 KB new code, 60 bytes RAM

### Phase 4: Testing + Docs (Days 14-16)
- Unit tests for each module (target 95%+ coverage)
- Integration tests with audio pipeline
- User guide and deployment runbook
- Code review and cleanup

---

## Common Questions

### Q: Will this break existing code?
**A:** No. All existing `LOG_*` macros work unchanged. The output format is augmented but stays parseable.

### Q: How do I disable a feature if it causes issues?
**A:** Edit `log_config.h` and set the flag to 0. Recompile and flash. No code changes needed.

### Q: What if rate limiting drops an important message?
**A:** ERROR severity always passes (never rate-limited). WARN/INFO/DEBUG are rate-limited.

### Q: How do I know if messages are being dropped?
**A:** Check `/api/logger/stats` endpoint or the `/logger` dashboard. Shows `dropped_messages` count.

### Q: Can I change rate limit without rebooting?
**A:** Yes! Use webserver: `POST /api/logger/rate-limit?tag=A&limit=50`

### Q: Will rate limiting block the audio pipeline?
**A:** No. Rate limiting check happens before mutex (instant, <0.1ms). If at limit, message is dropped (doesn't go to queue).

### Q: What's the memory overhead?
**A:** ~100-200 bytes RAM total (rate table, counters, state). All static, no dynamic allocation.

---

## Testing Checklist

### Phase 1 (After Implementation)
```
BASIC FUNCTIONALITY:
  [ ] Serial output shows new message format
  [ ] Sequence counter increments
  [ ] Core ID shows correctly (C0 or C1)
  [ ] Compilation: 0 errors, 0 warnings
  [ ] Memory impact < 200 bytes

RATE LIMITING:
  [ ] Flood a tag (1000 msgs), verify drop after limit
  [ ] ERROR messages always pass (not rate-limited)
  [ ] Different tags have independent counters
  [ ] Counter resets each second

RUNTIME CONFIG:
  [ ] set_verbosity() changes level immediately
  [ ] set_tag_enabled() toggles tags
  [ ] set_tag_rate_limit() changes limits
  [ ] Webserver endpoints respond with valid JSON

WEBSERVER API:
  [ ] GET /api/logger/config → returns all settings
  [ ] POST /api/logger/verbosity?level=WARN → works
  [ ] POST /api/logger/tag?tag=A&enabled=false → works
  [ ] POST /api/logger/rate-limit?tag=A&limit=100 → works
  [ ] GET /api/logger/stats → returns counts

INTEGRATION:
  [ ] No performance degradation (measure audio FPS)
  [ ] Mutex contention minimal (<1% CPU)
  [ ] Serial output quality unaffected
```

### Phase 2 & 3
See full proposal for detailed test scenarios.

---

## File Change Summary

### Phase 1 Files (Modified)
```
firmware/src/logging/logger.h       → Add new public functions
firmware/src/logging/logger.cpp     → Implement P1 features
firmware/src/logging/log_config.h   → Add feature flags
firmware/src/webserver.cpp          → Add /api/logger/* endpoints
```

### Phase 1 Files (New)
```
firmware/src/logging/logger_stats.h → LoggerStats struct
```

### Phase 2 Files (New)
```
firmware/src/logging/logger_file.h
firmware/src/logging/logger_file.cpp
firmware/src/logging/logger_json.h
firmware/src/logging/logger_json.cpp
firmware/src/webserver_logger_dashboard.h  → HTML/CSS/JS
```

### Phase 3 Files (New/Modified)
```
firmware/src/webserver.cpp          → Dashboard endpoints
firmware/src/logging/logger.cpp     → Stats tracking
```

### Phase 4 Files (New)
```
firmware/test/test_logger/test_*.cpp         → Unit tests
docs/planning/LOGGING_USER_GUIDE.md
Implementation.plans/runbooks/logging_*.md
```

---

## Key Design Decisions

| Decision | Rationale | Fallback |
|----------|-----------|----------|
| Rate limit ERROR always passes | Errors must never be suppressed | Override at runtime (webserver) |
| Rate check before mutex | Minimize mutex contention | Fail-open (allow message if mutex busy) |
| Static buffers only | No dynamic allocation → no heap fragmentation | Buffer overflow: truncate message (acceptable) |
| Feature flags at compile time | Zero overhead if disabled | Can be toggled at runtime (config API) |
| Webserver API (no persistence) | Simpler, no NVS wear | Settings reset on reboot (acceptable) |
| SPIFFS non-blocking writes | Audio pipeline priority | Ring buffer for failed writes |
| Sequence counter (not per-tag) | Simpler, detects global reordering | Use JSON field for context if needed |

---

## Known Limitations (v1)

1. **Settings don't persist:** Verbosity/limits reset on reboot (Phase 2+ could add NVS)
2. **No log aggregation:** JSON format ready, but no cloud integration yet
3. **Timestamp is millis() based:** Rolls over every ~49 days (acceptable for embedded)
4. **SPIFFS I/O blocking:** Non-blocking writes with fallback (see design)
5. **No remote log streaming:** Dashboard shows last 50 msgs only (could add WebSocket later)

---

## Success Metrics

**Performance:**
- [ ] Logging overhead < 5% CPU at 1000 msgs/sec
- [ ] Mutex contention < 1%
- [ ] Message latency < 1 ms

**Functionality:**
- [ ] All 4 P1 features working
- [ ] 95%+ backward compatible
- [ ] 0 functional regressions

**Reliability:**
- [ ] No crashes under high-frequency logging
- [ ] No message corruption
- [ ] Rate limit doesn't drop errors
- [ ] Thread safety guaranteed

---

## Timeline

```
Week 1 (Phase 1):   Rate limiting + runtime config
  Mon: Sequencing + Core ID
  Tue: Rate limiter infrastructure
  Wed: Runtime config API + webserver endpoints
  Thu: Integration testing, deployment

Week 2 (Phase 2):   File logging + JSON + timestamps
  Mon: File logging infrastructure
  Tue: JSON serializer
  Wed: Timestamp options + webserver updates
  Thu: Integration testing

Week 3 (Phase 3):   Statistics + dashboard
  Mon: Statistics collection
  Tue: Dashboard HTML/CSS/JS
  Wed: Dashboard endpoints + WebSocket
  Thu: Performance optimization + testing

Week 4 (Phase 4):   Testing + documentation
  Mon: Unit tests (95% coverage)
  Tue: Integration tests
  Wed: Documentation + runbooks
  Thu: Code review, cleanup, release
```

---

## Resources

**Full proposal:** `/docs/planning/LOGGING_ENHANCEMENT_IMPLEMENTATION_PROPOSAL.md`
**Code examples:** Proposal section 6 (3 realistic scenarios)
**API reference:** Proposal section 4 (detailed designs)
**Testing strategy:** Proposal section 9

---

## Getting Help

- **Design questions?** See proposal section 3-4 (detailed designs)
- **Code examples?** See proposal section 6
- **Test approach?** See proposal section 9
- **File structure?** See proposal section 7
- **Risk analysis?** See proposal section 8

---

## Approval & Sign-Off

This document requires review/approval from:
- [ ] @spectrasynq (maintainer)
- [ ] @[firmware-lead] (technical review)
- [ ] @[QA-lead] (test strategy)

Once approved, implementation can begin with Phase 1.

