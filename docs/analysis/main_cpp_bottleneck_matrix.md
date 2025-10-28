---
title: Bottleneck Priority Matrix: main.cpp Clutter
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Bottleneck Priority Matrix: main.cpp Clutter

## Overview

This document provides **severity and effort estimates** for each clutter item, enabling engineers to prioritize cleanup work. Scores range 1-10 (1=trivial, 10=severe/massive).

---

## Bottleneck Ranking (by Impact × Effort)

### CRITICAL PRIORITY (Impact=10, Must Fix First)

#### BOTTLENECK_1: audio_task() Dead Code

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 10/10 | Dead code creates architectural confusion; developers maintain two audio pipelines by mistake |
| **Impact on Performance** | 0/10 | Not executed at runtime, no performance impact |
| **Impact on Clarity** | 9/10 | Leaves design intent ambiguous (is this dual-core or single-core?) |
| **Impact on Maintenance** | 8/10 | Forces maintainers to update both `audio_task()` and `run_audio_pipeline_once()` if audio logic changes |
| **Effort to Remove** | 1/10 | Simple deletion of 57 lines + verify test files don't break |
| **Risk of Breakage** | 2/10 | Only test files use it; easily updated |
| **Overall Priority Score** | **10 × 1 = 10** | CRITICAL: Remove immediately |

**Recommendation:** Delete lines 63-119 (audio_task function) and verify no test files depend on it.

**Related:** BOTTLENECK_2 (design ambiguity comments)

---

#### BOTTLENECK_2: Design Ambiguity Comments (Core 1 Task Not Created)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 8/10 | Code suggests dual-core design but never implements Core 1 task creation |
| **Impact on Performance** | 1/10 | Comments don't affect runtime |
| **Impact on Clarity** | 9/10 | Developers reading this will assume Core 1 task exists when it doesn't |
| **Impact on Maintenance** | 7/10 | Makes future optimization decisions harder; developers might try to move audio to Core 1 without understanding single-core refactor |
| **Effort to Remove** | 2/10 | Replace misleading comments with explanation of why single-core was chosen |
| **Risk of Breakage** | 0/10 | Comments only |
| **Overall Priority Score** | **8 × 2 = 16** | HIGH: Fix comments to reflect actual architecture |

**Recommendation:** Replace lines 220-233 with:
```cpp
// ========================================================================
// AUDIO PIPELINE RUNS IN MAIN LOOP (SINGLE-CORE MODE)
// ========================================================================
// Architecture choice: Single-core audio processing (inline in Core 0 loop)
// Rationale: I2S microphone blocking calls would starve Core 0 rendering
//           in dual-core mode; single-core simplifies synchronization.
// Cadence: ~50 Hz (20ms interval timer) to minimize render FPS impact
// ========================================================================
```

---

### HIGH PRIORITY (Impact=8-9, Fix Before Feature Work)

#### BOTTLENECK_3: SPIFFS Enumeration Loop at Startup

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 7/10 | Blocks startup for 100-500ms; non-essential for Core 0 rendering |
| **Impact on Performance** | 6/10 | Adds 100-500ms to boot time; no impact during rendering once booted |
| **Impact on Clarity** | 5/10 | Code is clear but logically incorrect place (should be lazy-loaded) |
| **Impact on Maintenance** | 3/10 | Low maintenance burden once deployed |
| **Effort to Remove** | 4/10 | Move to background task or lazy-load on first web request |
| **Risk of Breakage** | 3/10 | Low: web server just won't serve files until mount completes |
| **Overall Priority Score** | **7 × 4 = 28** | HIGH: Defer after first render to reduce boot latency |

**Recommendation:** Move SPIFFS.begin() to background task or defer until first web request.

**Current Lines:** 164-185 (22 lines)

**Impact:** Reduces startup latency by ~200-300ms on cold boot.

---

#### BOTTLENECK_4: WiFi Monitor Initialization

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 6/10 | Adds ~20-30ms startup latency; can't avoid if WiFi needed |
| **Impact on Performance** | 5/10 | 20-30ms startup block; no impact during rendering |
| **Impact on Clarity** | 6/10 | Initialization chain is complex; code is hard to follow |
| **Impact on Maintenance** | 4/10 | Mostly stable, rarely changed |
| **Effort to Remove** | 5/10 | Could defer to background task after first render |
| **Risk of Breakage** | 4/10 | Medium: WiFi won't connect if deferred too long |
| **Overall Priority Score** | **6 × 5 = 30** | HIGH: Can defer after first render if timing is critical |

**Recommendation:** Keep in setup() for now; consider background task if boot latency becomes critical.

**Current Lines:** 132-142 (main.cpp) + deep chain in wifi_monitor.cpp

---

#### BOTTLENECK_5: OTA Handler Registration

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 5/10 | Adds ~10-15ms startup; only useful after WiFi connects |
| **Impact on Performance** | 3/10 | 10-15ms startup block; no impact during rendering |
| **Impact on Clarity** | 6/10 | 9 lambda functions make code look heavy |
| **Impact on Maintenance** | 2/10 | Rarely changed |
| **Effort to Remove** | 3/10 | Move to handle_wifi_connected() callback (async) |
| **Risk of Breakage** | 1/10 | Very low; OTA just won't work until WiFi connected (expected) |
| **Overall Priority Score** | **5 × 3 = 15** | MEDIUM: Can move to handle_wifi_connected() to defer |

**Recommendation:** Move lines 144-162 to handle_wifi_connected() to defer OTA init until WiFi connected.

**Current Lines:** 144-162 (19 lines in setup), +1 line in handle_wifi_connected

**Impact:** Reduces startup latency by ~15ms.

---

### MEDIUM PRIORITY (Impact=5-7, Optimize Before Deployment)

#### BOTTLENECK_6: Pattern Registry Initialization

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 6/10 | Large init cost if many patterns; not essential for first render |
| **Impact on Performance** | 6/10 | 50-100ms startup latency (depends on pattern count) |
| **Impact on Clarity** | 3/10 | Code is clear |
| **Impact on Maintenance** | 2/10 | Stable initialization code |
| **Effort to Remove** | 6/10 | Would require lazy loading patterns from flash; more complex |
| **Risk of Breakage** | 5/10 | Pattern switching would fail if not pre-loaded; could lazy-load on first use |
| **Overall Priority Score** | **6 × 6 = 36** | MEDIUM-HIGH: Keep for now; optimize later with lazy loading |

**Recommendation:** Measure pattern loading time; if >50ms, consider lazy loading on first pattern switch.

**Current Lines:** 208-216 (9 lines in main.cpp)

---

#### BOTTLENECK_7: CPU Monitor Initialization & 10Hz Polling

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 5/10 | Telemetry-only; not essential for core pipeline |
| **Impact on Performance** | 4/10 | ~5-10ms per 1000ms update; negligible during normal operation |
| **Impact on Clarity** | 3/10 | Code is clear |
| **Impact on Maintenance** | 2/10 | Mostly stable |
| **Effort to Remove** | 4/10 | Add conditional `#define ENABLE_TELEMETRY` flag; simple refactor |
| **Risk of Breakage** | 1/10 | Low; telemetry is optional |
| **Overall Priority Score** | **5 × 4 = 20** | MEDIUM: Make optional with compile flag |

**Recommendation:** Wrap cpu_monitor.init() and cpu_monitor.update() with `#ifdef ENABLE_TELEMETRY`.

**Current Lines:** 46-47 (init), 265 (update call in main loop)

**Impact:** Saves ~5-10ms per second when disabled; cleaner architecture.

---

#### BOTTLENECK_8: WebSocket Broadcast Loop (10Hz, 50-100KB JSON if clients connected)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 6/10 | Heavy JSON serialization every 100ms; only useful if clients connected |
| **Impact on Performance** | 7/10 | 20-50ms per broadcast; but only 10x per second = 2-5% loop CPU if clients connected |
| **Impact on Clarity** | 4/10 | Code is clear |
| **Impact on Maintenance** | 2/10 | Stable |
| **Effort to Remove** | 3/10 | Add conditional check or background task |
| **Risk of Breakage** | 1/10 | Low; web UI just won't get real-time updates |
| **Overall Priority Score** | **6 × 3 = 18** | MEDIUM: Make conditional on connected clients (already has check on line 609) |

**Recommendation:** Ensure broadcast_realtime_data() early-exits if no WebSocket clients connected (already implemented).

**Current Lines:** 260-268 (call site), 608-653 (implementation)

**Impact:** Already optimized; broadcasts only when clients connected.

---

### LOW PRIORITY (Impact=1-4, Nice-to-Have)

#### BOTTLENECK_9: WiFi Monitor Loop Polling (Every Iteration)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 3/10 | Runs every iteration but mostly non-blocking (early exit if no state change) |
| **Impact on Performance** | 2/10 | ~0-2ms most iterations; negligible |
| **Impact on Clarity** | 4/10 | State machine logic is clear |
| **Impact on Maintenance** | 2/10 | Stable |
| **Effort to Remove** | 6/10 | Would require background FreeRTOS task; significant refactor |
| **Risk of Breakage** | 4/10 | Medium: WiFi state changes might be delayed if run less frequently |
| **Overall Priority Score** | **3 × 6 = 18** | LOW: Keep as-is for now |

**Recommendation:** Keep wifi_monitor_loop() in main loop; it's already optimized with early exit.

**Current Lines:** 243 (call in main loop)

---

#### BOTTLENECK_10: OTA Handler Polling (Every Iteration)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 2/10 | Non-blocking, exits immediately if no OTA activity |
| **Impact on Performance** | 1/10 | ~0-1us per iteration; negligible |
| **Impact on Clarity** | 2/10 | Code is clear |
| **Impact on Maintenance** | 1/10 | Very stable |
| **Effort to Remove** | 7/10 | Would require background task |
| **Risk of Breakage** | 2/10 | Very low; OTA functionality maintained |
| **Overall Priority Score** | **2 × 7 = 14** | LOW: Keep as-is |

**Recommendation:** Leave ArduinoOTA.handle() in main loop; cost is negligible.

**Current Lines:** 246

---

#### BOTTLENECK_11: Web Server Handler Loop (Every Iteration)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 2/10 | Non-blocking; only does cleanup every 30 seconds |
| **Impact on Performance** | 1/10 | ~0-1ms most iterations; ~2-5ms every 30 seconds |
| **Impact on Clarity** | 2/10 | Code is clear |
| **Impact on Maintenance** | 1/10 | Stable |
| **Effort to Remove** | 6/10 | Would require background task |
| **Risk of Breakage** | 1/10 | Very low; cleanup still happens |
| **Overall Priority Score** | **2 × 6 = 12** | LOW: Keep as-is |

**Recommendation:** Leave handle_webserver() in main loop; AsyncWebServer is non-blocking.

**Current Lines:** 249

---

#### BOTTLENECK_12: FPS Profiling & Serial Output

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Severity** | 3/10 | Debug-only telemetry; not essential |
| **Impact on Performance** | 2/10 | ~1-5ms every 1000ms (0.1-0.5% overhead) |
| **Impact on Clarity** | 2/10 | Code is clear |
| **Impact on Maintenance** | 1/10 | Stable |
| **Effort to Remove** | 2/10 | Add `#ifdef DEBUG_PROFILING` flag |
| **Risk of Breakage** | 1/10 | Very low; telemetry is optional |
| **Overall Priority Score** | **3 × 2 = 6** | LOW: Make optional with compile flag |

**Recommendation:** Wrap watch_cpu_fps() and print_fps() with `#ifdef DEBUG_PROFILING`.

**Current Lines:** 285, 292-293

**Impact:** Saves ~1-5ms per second when disabled; negligible impact.

---

## Consolidated Priority Ranking

| Rank | Bottleneck | Type | Priority | Score | Effort | Recommended Action |
|------|-----------|------|----------|-------|--------|-------------------|
| 1 | audio_task() dead code | Dead Code | CRITICAL | 10/10 | 1/10 | **Delete immediately** (lines 63-119) |
| 2 | Design ambiguity comments | Clarity | CRITICAL | 8/10 | 2/10 | **Fix comments** (lines 220-233) |
| 3 | SPIFFS enumeration loop | Init Bloat | HIGH | 7/10 | 4/10 | **Defer to background** (lines 164-185) |
| 4 | WiFi initialization | Init Bloat | HIGH | 6/10 | 5/10 | Keep for now (can optimize later) |
| 5 | OTA registration | Init Bloat | HIGH | 5/10 | 3/10 | **Move to handle_wifi_connected()** (lines 144-162) |
| 6 | Pattern registry init | Init Bloat | MEDIUM | 6/10 | 6/10 | Measure; optimize later if needed |
| 7 | CPU monitor polling | Telemetry | MEDIUM | 5/10 | 4/10 | **Add compile flag** |
| 8 | WebSocket broadcast | Telemetry | MEDIUM | 6/10 | 3/10 | Already optimized (check every iteration) |
| 9 | WiFi monitor loop | State Machine | LOW | 3/10 | 6/10 | Keep as-is |
| 10 | OTA polling | Polling | LOW | 2/10 | 7/10 | Keep as-is |
| 11 | Web server handler | Polling | LOW | 2/10 | 6/10 | Keep as-is |
| 12 | FPS profiling | Telemetry | LOW | 3/10 | 2/10 | **Add compile flag** |

---

## Effort & Risk Summary

### Quick Wins (Effort ≤ 2, Risk ≤ 2)

1. **Delete audio_task() function** (lines 63-119)
   - Effort: 1/10 (just delete)
   - Risk: 2/10 (verify tests)
   - Impact: High clarity gain
   - **Timeline: 15 minutes**

2. **Fix design comments** (lines 220-233)
   - Effort: 2/10 (replace with explanation)
   - Risk: 0/10 (comments only)
   - Impact: Medium clarity gain
   - **Timeline: 10 minutes**

### Medium Effort (Effort 3-5, Risk 1-3)

3. **Move OTA initialization** (lines 144-162 to handle_wifi_connected)
   - Effort: 3/10 (refactor callbacks)
   - Risk: 1/10 (OTA just waits for WiFi)
   - Impact: 15ms faster startup
   - **Timeline: 30 minutes**

4. **Add TELEMETRY compile flag**
   - Effort: 4/10 (wrap multiple code sections)
   - Risk: 1/10 (telemetry is optional)
   - Impact: Cleaner architecture
   - **Timeline: 1 hour**

### High Effort (Effort 6+)

5. **Defer SPIFFS to background** (lines 164-185)
   - Effort: 4-6/10 (new background task)
   - Risk: 3/10 (web server needs files)
   - Impact: 200-300ms faster startup
   - **Timeline: 2-3 hours**

6. **Pattern registry lazy loading**
   - Effort: 6/10 (refactor pattern loading)
   - Risk: 5/10 (pattern switching must work)
   - Impact: 50-100ms faster startup (if many patterns)
   - **Timeline: 4-6 hours**

---

## Recommended Implementation Order

### Phase 1: Immediate Cleanup (1 hour)
1. Delete audio_task() function
2. Fix design comments
3. Verify tests pass

**Impact:** High clarity, zero performance impact

### Phase 2: Early Optimizations (2-3 hours)
1. Move OTA initialization to handle_wifi_connected()
2. Add TELEMETRY compile flag
3. Add DEBUG_PROFILING compile flag

**Impact:** 15ms faster startup, cleaner code

### Phase 3: Deferred Initialization (2-3 hours, if needed)
1. Move SPIFFS to background task (if boot latency critical)
2. Measure pattern loading time
3. Implement lazy loading (if needed)

**Impact:** 200-300ms faster startup (biggest impact)

---

## Files Affected by Each Bottleneck

| Bottleneck | Files | Lines | Type |
|-----------|-------|-------|------|
| audio_task() | main.cpp, test files | 63-119 | Delete |
| Design comments | main.cpp | 220-233 | Rewrite |
| SPIFFS enumeration | main.cpp | 164-185 | Refactor |
| WiFi init | main.cpp, wifi_monitor.cpp | 132-142, 241-298 | Keep/Defer |
| OTA registration | main.cpp | 144-162, 40 | Move |
| Pattern registry | main.cpp, pattern_registry.cpp | 208-216, (deep) | Keep/Optimize |
| CPU monitor | main.cpp, cpu_monitor.cpp | 46-47, 265, (all) | Add flag |
| WebSocket broadcast | main.cpp, webserver.cpp | 260-268, 608-653 | Verify |
| WiFi monitor loop | main.cpp, wifi_monitor.cpp | 243, 300-320 | Keep |
| OTA polling | main.cpp | 246 | Keep |
| Web server handler | main.cpp, webserver.cpp | 249, 546-556 | Keep |
| FPS profiling | main.cpp, profiler.cpp | 285, 292-293, (all) | Add flag |

---

**Matrix Complete**
**Date:** 2025-10-28
**Ready for:** Engineering prioritization and implementation planning
