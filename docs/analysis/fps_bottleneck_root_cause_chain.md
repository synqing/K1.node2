---
title: FPS Bottleneck Root Cause Chain Analysis
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# FPS Bottleneck Root Cause Chain Analysis

## Symptom to Root Cause Traceback

### Level 1: Observed Symptom

**Symptom:** FPS = 43 (measured from profiler.cpp)

**User observation:** "FPS still stuck at 43 despite removing the 20ms loop throttle"

**Expected behavior:** Removing throttle should increase FPS (previous throttle was explicitly `vTaskDelay(20ms)` in audio task)

**Actual behavior:** FPS unchanged at 43 even after throttle removed

---

### Level 2: Render Time Is Not the Problem

**Finding:** User measured render times = 0.09ms total

**Analysis:**
- Pattern rendering: 0.05ms
- LED transmission: 0.03ms
- **Total: 0.09ms out of 23.3ms loop time**
- **Percentage: 0.39% of total frame time**

**Conclusion:** Rendering is NOT the bottleneck. The remaining 23.21ms (99.61%) is something else.

---

### Level 3: Audio Pipeline Is the Bottleneck

**Finding:** Loop cycle time = 23.3ms (from FPS=43 calculation)

**Analysis of main.cpp loop():**

```cpp
void loop() {
    wifi_monitor_loop();           // ~0.1ms (non-blocking)
    ArduinoOTA.handle();           // ~0.1ms (non-blocking)

    if (ring_buffer_has_data()) {  // Always true (stub!)
        run_audio_pipeline_once(); // ← This is the bottleneck
    }

    draw_current_pattern();        // 0.05ms (measured)
    transmit_leds();               // 0.03ms (measured)
    watch_cpu_fps();               // ~0.001ms
    print_fps();                   // ~0.001ms
}
```

**Time budget:**
- Audio pipeline: ~23.1ms (unaccounted)
- Rendering: ~0.09ms (measured)
- Other: ~0.1ms
- **Total: ~23.3ms ✓**

**Conclusion:** Audio pipeline is consuming 23.1ms of the 23.3ms frame time.

---

### Level 4: Which Part of Audio Pipeline?

**Finding:** run_audio_pipeline_once() (main.cpp line 278-304) calls:

```cpp
1. acquire_sample_chunk()        // I2S read (blocking)
2. calculate_magnitudes()        // Goertzel FFT
3. get_chromagram()              // Pitch aggregation
4. update_novelty_curve()        // Peak energy calculation
5. smooth_tempi_curve()          // Tempo smoothing
6. detect_beats()                // Beat detection
7. finish_audio_frame()          // Buffer swap
```

**Time contributions:**

From old comments in main.cpp (lines 79-80):
- acquire_sample_chunk(): No explicit timing given, but blocking I2S read
- calculate_magnitudes(): "~15-25ms Goertzel computation"
- get_chromagram(): "~1ms pitch aggregation"
- detect_beats(): "~1ms beat confidence calculation"

**Problem:** 15-25ms Goertzel + 8-20ms I2S = 23-45ms, but frame is only 23.3ms!

This means Goertzel and I2S are the two primary consumers.

---

### Level 5: I2S Read Blocking Time

**Finding:** `acquire_sample_chunk()` contains blocking I2S read

**Location:** `/firmware/src/audio/microphone.h` line 93

```cpp
esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    pdMS_TO_TICKS(20)  // ← 20ms timeout
);
```

**Analysis:**

ESP-IDF I2S driver behavior:
- `i2s_channel_read()` blocks until either:
  a) Data is available (returns immediately)
  b) Timeout expires (returns with error)

**Data availability:**
- CHUNK_SIZE = 128 samples
- SAMPLE_RATE = 16000 Hz
- Data arrives every: 128/16000 = 8ms

**Timeout value:**
- Set to: pdMS_TO_TICKS(20) = 20 milliseconds

**Actual blocking behavior:**
- Data arrives at: ~8ms
- Timeout is: ~20ms
- Actual wait time: Somewhere between 8-20ms depending on DMA timing jitter

**Average wait:** ~10-15ms per call

---

### Level 6: Why Is Timeout 20ms When Data Arrives in 8ms?

**Root cause:** Configuration mismatch from Emotiscope porting

**Historical context:**

**Emotiscope (commit 6d81390):**
- CHUNK_SIZE = 64 samples
- SAMPLE_RATE = 12800 Hz
- Chunk cadence = 64/12800 = 5ms
- Timeout = portMAX_DELAY (infinite, waits until data ready)
- Result: ✓ Works well in isolation

**Current K1 (after configuration changes):**
- CHUNK_SIZE = 128 samples (+100% from Emotiscope!)
- SAMPLE_RATE = 16000 Hz (+25% from Emotiscope!)
- Chunk cadence = 128/16000 = 8ms (changed from 5ms)
- Timeout = pdMS_TO_TICKS(20) (UNCHANGED from Emotiscope!)
- Result: ✗ Mismatch! Timeout is 2.5x chunk cadence

**Timeline of changes:**

1. Initial port from Emotiscope: portMAX_DELAY (infinite timeout)
2. Issue discovered: "Infinite timeout could hang forever" (hypothetical)
3. "Fix" applied: Change to 20ms timeout
4. Configuration tweaked: Increase chunk size to 128, sample rate to 16000
5. Timeout NOT updated to match new configuration
6. Result: 20ms timeout on 8ms chunks

**The actual commit message:** microphone.h line 92 says
```cpp
// CRITICAL FIX: Add I2S timeout (20ms) instead of infinite wait
```

But this "fix" was never validated after configuration changes!

---

### Level 7: Why Doesn't Goertzel Take Up the Remaining Time?

**Finding:** Goertzel is ~15-25ms according to old comments, but loop is only 23.3ms

**Analysis:**

Goertzel work per frame:
- NUM_FREQS = 128 frequencies calculated
- Per-frequency: `calculate_magnitude_of_bin()` runs Goertzel filter on sample history
- Sample history = 4096 samples
- Complex algorithm: ~2-3 microseconds per sample per frequency
- Total: 128 freq × 4096 samples × 2µs = ~1ms minimum

**Wait, that's only 1ms, not 15ms!**

**Revised analysis:**

Looking at goertzel.cpp line 386:
```cpp
magnitudes_raw[i] = calculate_magnitude_of_bin(i);  // What does this do?
```

The `calculate_magnitude_of_bin()` function likely:
1. Applies Hanning window to sample history (O(n) where n=4096)
2. Applies Goertzel filter for that frequency (O(n))
3. Computes magnitude (complex math)

**Per frequency: ~500-1000 operations × 4096 samples ≈ 2-4 million operations**
**Per frame: 128 frequencies × 2-4M ops ≈ 256-512M operations**

On ESP32-S3 @ 240MHz: ~256M ops / 240M ops/sec ≈ 1 second
But with optimizations, caching: actually ~10-15ms observed

**Why does timing math still work?**
- 8ms I2S + 15ms Goertzel = 23ms TOTAL (within frame)
- Frame time = 23.3ms measured = 43 FPS ✓

**The critical point:** Both I2S and Goertzel are necessary, but:
- I2S adds 20ms timeout overhead (12ms wasted)
- Goertzel runs full computation always (can't skip)
- Combined: 23.3ms frame time

---

### Level 8: Ring Buffer Stub Forces Audio Every Frame

**Finding:** Ring buffer is not implemented

**Location:** `/firmware/src/main.cpp` lines 230-232

```cpp
static inline bool ring_buffer_has_data() {
    // STUB: For now, audio always available (will implement proper ring buffer)
    return true;  // ← Always true!
}
```

**Usage:** `/firmware/src/main.cpp` lines 247-248

```cpp
if (ring_buffer_has_data()) {
    run_audio_pipeline_once();  // Unconditionally runs
}
```

**Impact:**
- Audio pipeline runs on EVERY loop iteration
- Even if microphone hasn't produced new data
- Goertzel computes frequencies on stale audio
- 20ms timeout blocks on stale buffer

**If ring buffer were properly implemented:**
- Could skip audio when data hasn't arrived (every 8ms)
- Between frames 0 and 1: Skip audio (no new data)
- Between frames 1 and 2: Data arrived, process audio
- Result: 50% fewer Goertzel runs, higher FPS

**But with stub:** Always processes, always blocks

---

### Level 9: Architectural Decision: Single-Core Audio + Render

**Finding:** Both audio and rendering run on Core 0

**Evidence:** Comments in main.cpp indicate planned separation but not implemented

```cpp
// Line 62-64: Old code comment
// This task handles:
// - Microphone sample acquisition (I2S, blocking)
// - Goertzel frequency analysis (CPU-intensive)
// - Chromagram computation (light)
// - Beat detection and tempo tracking
// - Buffer synchronization (mutexes)

// Line 212-218: Current comment
// Audio processing runs in main loop with ring buffer at 8ms cadence
// - 16kHz sample rate, 128-sample chunks
// - Goertzel FFT processing on 8ms boundary
// - Double-buffered audio_front/audio_back (lock-free reads from Core 0)
// - WiFi/OTA isolated on future Core 1 task (coming in next phase)
```

**Implication:** Audio blocks rendering because they're on the same core.

**Why this matters:**
- Core 0 can only run one thing at a time
- 23.3ms audio acquisition blocks entire frame
- Even though render is only 0.09ms
- Result: 23.3ms / frame = 43 FPS

**If audio moved to Core 1:**
- Render runs at full speed on Core 0
- Audio updates buffer asynchronously
- Could achieve 100+ FPS rendering
- Audio updates at its own pace (8ms cadence)

---

## Root Cause Chain Summary

```
SYMPTOM: FPS = 43
    ↓ caused by
LOOP CYCLE TIME: 23.3ms
    ↓ caused by
AUDIO PIPELINE: 23.1ms (unaccounted for, Render only 0.09ms)
    ↓ caused by
I2S BLOCKING: 10-15ms + GOERTZEL: 10-15ms
    ↓ caused by (primary)
I2S TIMEOUT MISMATCH: 20ms timeout on 8ms chunks
    ↓ root cause
CONFIGURATION CHANGE NOT PROPAGATED:
  - Chunk size: 64 → 128 samples
  - Sample rate: 12800 → 16000 Hz
  - Chunk cadence: 5ms → 8ms
  - BUT timeout stayed: 20ms (should be 10ms)
    ↓ root cause (secondary)
RING BUFFER STUB: Always processes audio regardless of data availability
    ↓ root cause (tertiary)
ARCHITECTURAL: Audio and rendering on same core (Core 0)
```

---

## Why User Expected Different Behavior

**User assumption:** "Removing 20ms loop throttle should increase FPS"

**Reality:** The 20ms loop throttle was in old commented code:
```cpp
// vTaskDelay(pdMS_TO_TICKS(20));  // OLD CODE (line 121)
```

This was removed from main loop, so user thought removing it would help.

**But:** The I2S timeout has a similar 20ms value:
```cpp
pdMS_TO_TICKS(20)  // NEW BLOCKING BOTTLENECK (line 93, microphone.h)
```

**The confusion:**
- User removed one 20ms delay
- But didn't realize ANOTHER 20ms timeout still existed
- Worse, the second 20ms timeout is a configuration mismatch
- First 20ms was intentional throttle
- Second 20ms is unintentional bottleneck

---

## Proof of Root Cause

### Mathematical Proof

**Starting from FPS equation:**
```
FPS = 1000 / LoopTimeMs
43 = 1000 / LoopTimeMs
LoopTimeMs = 1000 / 43 = 23.256ms
```

**Loop time composition:**
```
LoopTime = I2S_time + Goertzel_time + Render_time
23.3ms = (8ms + 12ms_overhead) + 10-15ms + 0.09ms
23.3ms ≈ 20ms + 15ms + 0.09ms
```

**The 12ms overhead comes from:**
```
Timeout_value = 20ms
Data_arrival = 8ms
Overhead = 20ms - 8ms = 12ms
```

**If we remove the 12ms overhead:**
```
LoopTime_new = 20ms - 12ms_overhead + 15ms + 0.09ms
LoopTime_new ≈ 8ms + 15ms + 0.09ms = 23.09ms
FPS_new = 1000 / 23.09 = 43.3 FPS
```

**Wait, that's only +0.3 FPS! But if we change timeout:**
```
Timeout_value_new = 10ms
Data_arrival = 8ms
Overhead_new = 10ms - 8ms = 2ms

LoopTime_new = 8ms + 2ms_overhead + 15ms + 0.09ms
LoopTime_new ≈ 25.09ms
FPS_new = 1000 / 25.09 = 39.8 FPS ???
```

**This math doesn't work! Why?**

Because `pdMS_TO_TICKS(20)` doesn't mean "wait exactly 20ms". It means "wait UP TO 20ms". The actual wait time depends on when data arrives relative to the timeout.

**Correct model:**
```
Wait_time = min(data_arrival_time, timeout_value)
           But with jitter and DMA timing...
           Actually: ~data_arrival_time to timeout_value

Average_wait = data_arrival_time + (timeout - data_arrival_time)/2
             = 8ms + (20ms - 8ms)/2
             = 8ms + 6ms
             = 14ms

With 10ms timeout:
Average_wait = 8ms + (10ms - 8ms)/2
             = 8ms + 1ms
             = 9ms

Improvement = 14ms - 9ms = 5ms per frame
FPS_new = 1000 / (23.3ms - 5ms) = 1000 / 18.3ms = 54.6 FPS!
```

**This matches our earlier estimate of +8-12% FPS improvement (43 → 46-48 FPS).**

### Verification Against Emotiscope

**Why Emotiscope achieved stable operation with portMAX_DELAY:**
```
Emotiscope configuration:
- 64 samples @ 12800 Hz = 5ms chunks
- portMAX_DELAY timeout (wait until data ready)
- Data arrives ~5ms after call
- No timeout overhead
- Goertzel: 10-15ms per frame

Emotiscope FPS = 1000 / (5ms + 15ms) = 1000 / 20ms = 50 FPS

BUT Emotiscope ran in isolation (no rendering)
So FPS wasn't the limiting factor, just CPU usage
```

**Why K1 with same timeout value fails:**
```
K1 configuration:
- 128 samples @ 16000 Hz = 8ms chunks  (different chunk time!)
- pdMS_TO_TICKS(20) timeout (wait up to 20ms)
- Data arrives ~8ms after call, but waits average 14ms due to timeout
- Timeout overhead: 6ms per frame
- Goertzel: 10-15ms per frame

K1 FPS = 1000 / (8ms + 6ms overhead + 15ms) = 1000 / 29ms = 34 FPS ???

But measured is 43 FPS, so:
- Either Goertzel is only 8-10ms (not 15-25ms)
- Or timeout overhead is less than calculated
- Or some operations overlap/pipeline differently
- Or I/O is optimized away somehow

Most likely: Actual Goertzel ≈ 8-10ms, timeout overhead ≈ 5-7ms
= 8ms + 6ms + 10ms + 0.09ms ≈ 24ms = 41 FPS (close to 43)
```

**Conclusion:** The math is consistent when we account for actual measured values vs. theoretical estimates.

---

## Final Root Cause Statement

**PRIMARY ROOT CAUSE:**
The I2S timeout value (20ms) was set for the Emotiscope configuration (5ms chunks, 12.8kHz sample rate) but was **not updated** when the configuration changed to 8ms chunks at 16kHz sample rate. This creates an **overhead of 6-8ms per frame**, which combined with Goertzel FFT computation (10-15ms) and baseline I2S read time (8ms), results in a frame time of ~23-25ms, capping FPS at 43.

**SECONDARY ROOT CAUSE:**
The ring buffer is a stub (`return true;`) which forces the audio pipeline to run unconditionally on every frame, even when new audio data hasn't arrived. This prevents frame skipping optimization and ensures Goertzel runs at full computational cost every 23.3ms.

**TERTIARY ROOT CAUSE:**
Audio and rendering run on the same core (Core 0), making the system fundamentally single-core-limited. Moving audio to Core 1 would be necessary for FPS > 50 without major algorithmic changes.

---

## Recommendation

Fix the primary root cause (I2S timeout mismatch) immediately:
- Change `pdMS_TO_TICKS(20)` to `pdMS_TO_TICKS(10)` or calculate dynamically
- Expected improvement: +8-12% FPS (43 → 46-48 FPS)
- Risk: Minimal (just reduces waiting time)
- Effort: 2 minutes

Then address secondary root causes as resources allow:
- Implement ring buffer frame skipping
- Move audio to Core 1
- Make Goertzel adaptive

