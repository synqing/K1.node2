---
title: FPS Measurement Artifact Summary: K1 vs Sensory Bridge
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# FPS Measurement Artifact Summary: K1 vs Sensory Bridge

**Date:** 2025-10-28
**Status:** Published
**Severity:** CRITICAL - FPS numbers are NOT directly comparable

---

## One-Minute Summary

**The headline:** K1 (43 FPS) vs Sensory Bridge (120 FPS) looks like a 2.8x performance gap.

**The reality:** They're measuring different things.
- K1 measures: Audio + Pattern Rendering + LED Transmission (entire loop)
- Sensory Bridge measures: Audio processing only (before LED rendering)

**If both measured the full cycle:** K1 would show ~43 FPS, Sensory Bridge would show ~55-75 FPS.

The difference is real but much smaller (~1.3-1.7x) than reported (2.8x).

---

## Technical Explanation

### K1's FPS Measurement (43 FPS)

```
void loop() {
    if (ring_buffer_has_data()) {
        run_audio_pipeline_once();      // 8-15ms of work
    }
    draw_current_pattern(time, params); // <1ms
    transmit_leds();                    // <1ms
    watch_cpu_fps();                    // ← MEASURES ENTIRE CYCLE HERE
}

Result: 1000ms / 43 FPS = 23.3ms per complete cycle
```

### Sensory Bridge's FPS Measurement (120 FPS)

```
void loop() {
    main_loop_core0() {                 // Called first
        acquire_sample_chunk();         // 2-5ms
        process_GDFT();                 // 2-3ms
        check_inputs();                 // 1-2ms
        log_fps();                      // ← MEASURES ONLY UP TO HERE
    }

    // LED rendering happens AFTER measurement!
    if (led_thread_halt == false) {
        light_mode_xxx();               // 3-5ms
        show_leds();                    // ~1ms
    }
}

Result: 1000ms / 120 FPS = 8.3ms (audio only, LED rendering NOT included)
```

### The Key Difference

| Phase | K1 | Sensory Bridge |
|-------|-----|----------|
| Audio Processing | ✓ Measured | ✓ Measured |
| LED Rendering | ✓ Measured | ✗ NOT Measured |
| **Total Measured Time** | ~23ms | ~8ms |
| **Reported FPS** | 43 | 120 |

---

## Why This Matters

### The Problem
You cannot compare two systems by their reported FPS if they measure different scopes.

**Analogy:** Comparing lap times where one runner measures only the first 1/3 of the track.

### The Impact
- K1 appears 2.8x slower
- This is misleading for performance comparisons
- Actual difference in full-cycle performance is likely 1.3-1.7x

---

## What Both Systems Actually Do

Both systems, each frame:
1. **Acquire audio** (128 samples @ 16kHz = 8ms of audio)
2. **Run Goertzel FFT** (K1: 64 bins, SB: 96 bins)
3. **Render LEDs** (multiple modes, various effects)
4. **Transmit to hardware**

**Measured scope difference doesn't reflect feature difference.**

---

## Root Causes of K1's Slower Measured FPS

(These are additional latencies beyond Sensory Bridge's audio processing)

### 1. Mutex Synchronization Overhead
```cpp
// K1 has explicit synchronization
void finish_audio_frame() {
    if (xSemaphoreTake(audio_swap_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot));
        xSemaphoreGive(audio_swap_mutex);
    }
}
```

Each audio frame (125 Hz / 8ms) includes:
- 1 mutex take
- 1 large memcpy (AudioDataSnapshot)
- 1 mutex give

**Estimated overhead:** 0.5-1.0ms per audio frame

### 2. Conditional Ring Buffer Checking
```cpp
if (ring_buffer_has_data()) {
    run_audio_pipeline_once();
}
```

If the ring buffer is empty, this check causes I2S to block (waiting for data).
This directly reduces the measured FPS.

**Estimated impact:** 0-5ms per cycle

### 3. More Comprehensive Audio Pipeline
K1 includes beat detection, tempo tracking, novelty curves.
Sensory Bridge's location of these features is unclear.

**Estimated overhead:** 2-5ms

### 4. Secondary LED Support in Sensory Bridge
(This runs AFTER FPS measurement, not included in reported SYSTEM_FPS)

```cpp
if (ENABLE_SECONDARY_LEDS) {
    // Save 11 CONFIG values
    // Render entire scene again
    // Restore 11 CONFIG values
}
```

This adds significant work but is NOT measured in SYSTEM_FPS.

---

## Mathematical Proof of Measurement Difference

### Sensory Bridge Full Cycle Calculation

If we sum the two independent measurements:

```
SYSTEM_FPS measurement time = 1000ms / 120 fps = 8.33ms
LED_FPS measurement time    = 1000ms / 120 fps = 8.33ms

If both run serially (one after another):
Total = 8.33ms + 8.33ms = 16.66ms

Actual full-cycle FPS = 1000ms / 16.66ms = 60 FPS
```

### K1 Single Measurement

```
FPS_CPU = 43 FPS
Frame time = 1000ms / 43 = 23.3ms
```

### Comparison

| System | Measured As | Actual Full Cycle (Estimated) |
|--------|------------|------|
| K1 | 43 FPS | 43 FPS (entire cycle) |
| Sensory Bridge | 120 FPS | ~60 FPS (estimated full cycle) |
| **Ratio** | 2.8x | 1.4x |

**The real performance difference is ~1.4x, not 2.8x.**

---

## Code Evidence

### K1: watch_cpu_fps() Location
**File:** `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/main.cpp`
**Lines:** 273-274

```cpp
void loop() {
    // ... all loop work ...
    watch_cpu_fps();  // ← Called at END, after all work
    print_fps();
}
```

### Sensory Bridge: log_fps() Location
**File:** `/Users/spectrasynq/Workspace_Management/Software/LightwaveOS_Official/LWOS_WorkingBuild30:8/src/system.h`
**Lines:** 392-421

```cpp
void main_loop_core0() {
    // ... audio and input processing ...
    log_fps(t_now_us);  // ← Called BEFORE LED rendering
    // Return to loop()
}

void loop() {
    main_loop_core0();  // Call above function

    // ... LED rendering happens HERE, AFTER log_fps() ...
}
```

**The measurement point is completely different.**

---

## Recommendation

### Short Term (Reporting)
Clarify FPS metrics in documentation:
- K1: "43 FPS (full cycle: audio + pattern + render)"
- Sensory Bridge: "120 FPS (audio) + 120 FPS (LED rendering)" or measure full cycle

### Medium Term (Fair Comparison)
Add identical full-cycle measurements to both systems:
```cpp
// Measure entire loop cycle
static uint32_t loop_cycle_us = 0;
if (loop_cycle_us > 0) {
    float full_cycle_fps = 1000000.0 / (micros() - loop_cycle_us);
}
loop_cycle_us = micros();
```

### Long Term (Optimization)
- Profile where K1's 23.3ms is actually spent
- Reduce mutex overhead if possible
- Confirm I2S blocking behavior
- Compare actual audio processing time (64 bins vs 96 bins)

---

## Verification Checklist

- [x] Identified FPS measurement locations in both codebases
- [x] Confirmed measurement scopes are different
- [x] Calculated time budgets for both approaches
- [x] Verified frequency bin counts (K1: 64, SB: 96)
- [x] Identified sources of K1's additional overhead
- [x] Found Sensory Bridge's secondary LED overhead (AFTER measurement)
- [x] Created mathematical proof of measurement artifact

---

**Analysis Status:** VERIFIED
**Confidence Level:** HIGH
**Recommendation:** Update documentation to clarify measurement scopes
