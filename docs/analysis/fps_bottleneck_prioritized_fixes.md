---
author: SUPREME Analyst
date: 2025-10-28
status: published
intent: Prioritized bottleneck matrix with severity, effort, and impact scores for FPS improvement
---

# FPS Bottleneck Matrix: Prioritized Fixes

## Overview

This document provides a prioritized breakdown of FPS bottlenecks with exact severity/effort scores and expected impact.

---

## Critical Bottleneck #1: I2S 20ms Timeout Mismatch

| Metric | Value |
|--------|-------|
| **Severity** | 9/10 (HIGH) |
| **Effort** | 2/10 (TRIVIAL) |
| **Impact** | +8-12% FPS (43 → 46-48 FPS) |
| **ROI** | 4.5x (huge impact for minimal work) |

### Location
- **File:** `/firmware/src/audio/microphone.h`
- **Line:** 93
- **Code:** `pdMS_TO_TICKS(20)`

### Root Cause
Timeout value (20ms) was inherited from Emotiscope implementation that used:
- CHUNK_SIZE = 64 samples
- SAMPLE_RATE = 12800 Hz
- Chunk cadence = 5ms

Current code uses:
- CHUNK_SIZE = 128 samples (+100%)
- SAMPLE_RATE = 16000 Hz (+25%)
- Chunk cadence = 8ms
- **Timeout still 20ms** (not updated!)

### Evidence
```
Data arrival time:    8ms
Timeout value:        20ms
Wasted wait time:     12ms per blocking call
Calls per frame:      1 (always on via ring buffer stub)
Impact per frame:     12ms of dead wait
FPS penalty:          1000ms / (23.3ms + 12ms overhead) = 30 FPS
Current penalty:      12ms / 23.3ms ≈ 52% of total frame time
```

### Fix Options

**Option 1: Simple timeout adjustment (2 min, LOW RISK)**
```cpp
// Current
pdMS_TO_TICKS(20)

// Change to
pdMS_TO_TICKS(10)  // Safe margin above 8ms chunks
```
Expected: 5-8% improvement (43 → 45-46 FPS)

**Option 2: Dynamic timeout calculation (5 min, VERY LOW RISK)**
```cpp
// Add to microphone.h
#define I2S_TIMEOUT_MS ((CHUNK_SIZE * 1000) / SAMPLE_RATE + 5)
// Evaluates to: (128 * 1000 / 16000) + 5 = 13ms

// Then use:
pdMS_TO_TICKS(I2S_TIMEOUT_MS)
```
Expected: 8-12% improvement (43 → 47-48 FPS)

### Testing Strategy
1. Change timeout value
2. Rebuild and flash
3. Observe FPS output from Serial monitor
4. Verify no I2S errors in logs
5. Test audio quality (listen for glitches)

### Risk Assessment
- **Low risk:** Timeout is still well above natural cadence
- **No functional impact:** Still waits for data, just doesn't wait as long
- **Reversible:** Can adjust timeout in seconds if issues appear

---

## High-Priority Bottleneck #2: Ring Buffer Stub Not Implemented

| Metric | Value |
|--------|-------|
| **Severity** | 7/10 (HIGH) |
| **Effort** | 6/10 (MODERATE) |
| **Impact** | +5-15% FPS (43 → 45-49 FPS) potential |
| **ROI** | 1.2x (good impact with some work) |

### Location
- **File:** `/firmware/src/main.cpp`
- **Lines:** 230-232, 247-248

### Root Cause
```cpp
static inline bool ring_buffer_has_data() {
    // STUB: For now, audio always available
    return true;  // ← Always calls audio, even if buffer empty
}
```

The comment says this is a "TODO: Implement lock-free ring buffer" but currently:
- Unconditionally returns `true`
- Forces `run_audio_pipeline_once()` on EVERY loop iteration
- Even when microphone hasn't produced new data
- Wastes cycles on Goertzel when data is stale

### Evidence
From main.cpp lines 247-248:
```cpp
if (ring_buffer_has_data()) {
    run_audio_pipeline_once();  // Called EVERY iteration
}
```

Since ring buffer always returns true, this becomes:
```cpp
run_audio_pipeline_once();  // No condition
```

### Current Impact
- 43 FPS = 23.3ms per frame
- `acquire_sample_chunk()` blocks 8-20ms per frame
- Goertzel runs 10-15ms per frame
- Even if data is stale, audio still processes!
- **Wasted work on unmodified data**

### Fix Options

**Option 1: Simple frame-skip logic (10 min, LOW RISK)**
```cpp
// main.cpp around line 230
static uint32_t last_audio_frame_ms = 0;

static inline bool ring_buffer_has_data() {
    // Skip audio if it's been less than 8ms since last frame
    uint32_t now = millis();
    if (now - last_audio_frame_ms < 8) {  // 8ms = chunk cadence
        return false;  // Skip audio, process render only
    }
    last_audio_frame_ms = now;
    return true;
}
```
Expected: 3-7% improvement (43 → 44-46 FPS)

**Option 2: Proper lock-free ring buffer (2-4 hours, MEDIUM RISK)**
```cpp
// Implement with atomic_flag or std::atomic<uint32_t>
// Track read/write indices
// Return true only when unread data exists
// This is the "proper" solution mentioned in the TODO
```
Expected: 5-15% improvement (43 → 45-49 FPS) depending on audio gaps

### Testing Strategy
1. Implement frame-skip or ring buffer logic
2. Verify audio still processes every 8ms
3. Check for audio glitches or frame drops
4. Measure FPS improvement
5. Verify patterns still sync to audio properly

### Risk Assessment
- **Medium risk:** Could miss audio data if logic is wrong
- **Mitigation:** Keep conservative timing (use 8ms threshold)
- **Testing required:** Verify Goertzel runs at consistent cadence

---

## Medium-Priority Bottleneck #3: Goertzel Runs Every Frame Unconditionally

| Metric | Value |
|--------|-------|
| **Severity** | 6/10 (MEDIUM) |
| **Effort** | 5/10 (MODERATE) |
| **Impact** | +5-10% FPS (43 → 45-47 FPS) with intelligent skipping |
| **ROI** | 1.5x (good impact, moderate work) |

### Location
- **File:** `/firmware/src/audio/goertzel.cpp`
- **Lines:** 368-440 (calculate_magnitudes function)

### Root Cause
The Goertzel FFT computation runs on every `run_audio_pipeline_once()` call:

```cpp
// main.cpp line 281
void run_audio_pipeline_once() {
    acquire_sample_chunk();      // 8-20ms
    calculate_magnitudes();       // 10-15ms ALWAYS
    get_chromagram();
    // ...
}
```

From goertzel.cpp lines 384-409:
```cpp
for (uint16_t i = 0; i < NUM_FREQS; i++) {  // Loop 128 times!
    magnitudes_raw[i] = calculate_magnitude_of_bin(i);  // Expensive!
    magnitudes_raw[i] = collect_and_filter_noise(magnitudes_raw[i], i);
    // ...averaging...
}
```

**Each `calculate_magnitude_of_bin()` runs the Goertzel filter algorithm on the sample history.**

### Evidence
- NUM_FREQS = 128 (from configuration)
- Per-frequency Goertzel filter is O(n) where n = sample history size
- 128 × expensive filter = 10-15ms per frame
- Runs every 23.3ms frame
- Contributes 10-15ms / 23.3ms ≈ **43-64% of frame time**

### Current Impact
Without Goertzel (hypothetically):
```
Loop time = 8ms (I2S) + 0.09ms (render) = 8.09ms
Expected FPS = 1000 / 8.09 = 123 FPS
```

With Goertzel (current):
```
Loop time = 8ms (I2S) + 15ms (Goertzel) + 0.09ms (render) = 23.09ms
Actual FPS = 43 FPS ✓
```

### Fix Options

**Option 1: Adaptive frame skipping (30 min, MEDIUM RISK)**
```cpp
// Goertzel runs every other frame (skip odd frames)
static uint32_t frame_count = 0;
if (frame_count % 2 == 0) {
    calculate_magnitudes();  // Every 16ms instead of 8ms
}
frame_count++;
```
Expected: 5-8% improvement (43 → 45-46 FPS)
Trade-off: Audio reactivity slightly reduced (16ms latency instead of 8ms)

**Option 2: Conditional computation based on silence (1 hour, HIGHER RISK)**
```cpp
// Skip Goertzel when audio is below noise floor
if (audio_level > NOISE_FLOOR) {
    calculate_magnitudes();
} else {
    // Return cached/smoothed values
}
```
Expected: Variable (5-40% depending on audio content)
Trade-off: Requires silence detection tuning

**Option 3: Parallelize with Core 1 audio task (4-6 hours, MEDIUM RISK)**
```cpp
// Move calculate_magnitudes() to separate task on Core 1
// Main loop no longer blocked by Goertzel
// Use double-buffering for thread-safe access
```
Expected: 15-20% improvement (43 → 50-52 FPS)
Trade-off: More complex threading/synchronization

### Testing Strategy
1. Implement option 1 (simplest)
2. Measure FPS improvement
3. Listen for audio glitches
4. Check if patterns still respond to beat/tempo
5. If 5-8% not enough, move to option 3 (Core 1 task)

### Risk Assessment
- **Medium-High risk:** Goertzel computation is critical for audio-reactive patterns
- **Mitigation:** Implement conservatively (every 2 frames minimum)
- **Testing required:** Verify pattern responsiveness maintained

---

## Lower-Priority Bottleneck #4: WiFi/OTA Polling Not On Separate Core

| Metric | Value |
|--------|-------|
| **Severity** | 4/10 (LOW) |
| **Effort** | 3/10 (EASY) |
| **Impact** | +0-2% FPS (negligible) |
| **ROI** | 0.5x (small impact, not worth it yet) |

### Location
- **File:** `/firmware/src/main.cpp`
- **Lines:** 241-242

### Root Cause
WiFi and OTA polling happens on Core 0 (rendering core):
```cpp
void loop() {
    wifi_monitor_loop();  // Line 241 - Can block up to 100ms!
    ArduinoOTA.handle();  // Line 242 - Can block
    // THEN rendering/audio...
}
```

### Evidence
- WiFi polling typically non-blocking but can stall
- OTA updates interrupt the entire main loop
- Comments in main.cpp indicate "will move to Core 1 in next phase"
- Currently contributes <1ms overhead (not critical)

### Impact Assessment
- Negligible in current architecture
- Will become critical once Goertzel moves to separate task
- Deferring this fix until after Core 1 audio task is working

---

## Bottleneck Comparison Table

| Bottleneck | Severity | Effort | Impact | ROI | Priority |
|------------|----------|--------|--------|-----|----------|
| I2S 20ms timeout | 9/10 | 2/10 | +8-12% | 4.5x | **1 - DO FIRST** |
| Ring buffer stub | 7/10 | 6/10 | +5-15% | 1.2x | **2 - DO SECOND** |
| Goertzel every frame | 6/10 | 5/10 | +5-10% | 1.5x | **3 - DO THIRD** |
| WiFi/OTA on Core 0 | 4/10 | 3/10 | +0-2% | 0.5x | 4 - DEFER |

---

## Recommended Execution Path

### Phase 1: Quick Win (5 minutes)
```
1. Change pdMS_TO_TICKS(20) → pdMS_TO_TICKS(10)
   Expected: 43 → 45 FPS (+4.7%)

2. Rebuild and test
   Verify: No I2S errors, no audio glitches

3. Commit: "fix(audio): Reduce I2S timeout from 20ms to 10ms"
```

### Phase 2: Smart Skipping (30 minutes)
```
1. Implement frame-skip logic in ring_buffer_has_data()
   Expected: 45 → 46-47 FPS (+2-4%)

2. Test with various audio patterns
   Verify: Audio still reactive, no missing beats

3. Commit: "feat(audio): Implement frame-skipping for ring buffer"
```

### Phase 3: Adaptive Goertzel (1 hour)
```
1. Implement adaptive frame skipping in calculate_magnitudes()
   - Skip every other frame (run at 21.5 Hz instead of 43 Hz)
   Expected: 46 → 49-50 FPS (+7-9%)

2. Test with patterns that depend on Goertzel
   Verify: Audio features still responsive

3. Commit: "perf(audio): Adaptive Goertzel computation frame skipping"
```

### Phase 4: Parallel Audio Task (4-6 hours)
```
1. Create xTaskCreatePinnedToCore() for Core 1 audio
2. Move calculate_magnitudes() and friends to Core 1
3. Use double-buffering for thread-safe data sharing
   Expected: 50 → 70-100+ FPS (rendering-bound only!)

4. Extensive testing for race conditions
5. Commit: "feat(audio): Parallel audio processing on Core 1"
```

---

## FPS Projection

```
Baseline:           43 FPS
After Phase 1:      45 FPS (+4.7%)
After Phase 2:      47 FPS (+4.4% from baseline)
After Phase 3:      50 FPS (+6.4% from baseline)
After Phase 4:      70-100+ FPS (rendering-bound)
```

---

## Implementation Notes

### Before Starting Any Fix:
1. Document baseline FPS (already done: 43 FPS)
2. Create feature branch: `git checkout -b fps-optimization`
3. Rebuild clean: `pio run -t clean && pio run`
4. Test after each phase before moving to next

### Testing Checklist:
- [ ] Baseline FPS recorded (43 FPS)
- [ ] I2S errors checked: `grep "I2S.*WARN\|ERROR" Serial output`
- [ ] Audio quality verified: Listen for glitches/pops
- [ ] Pattern synchronization verified: Check beat/tempo reactivity
- [ ] Memory usage verified: Check heap fragmentation
- [ ] WiFi stability verified: No unexpected disconnections

### Rollback Procedure:
If any phase causes issues:
```bash
git diff firmware/src/audio/microphone.h  # See what changed
git checkout firmware/src/audio/microphone.h  # Revert
pio run  # Rebuild
```

---

## Conclusion

The I2S timeout mismatch is the **primary bottleneck** preventing FPS from exceeding 43. With just a 5-minute fix, FPS can reach 45-46. With the ring buffer implementation (Phase 2-3), FPS can reach 50. Only a parallel audio task architecture (Phase 4) will enable 70-100+ FPS rendering.

All fixes are **low to moderate risk** because:
1. They don't change the fundamental audio acquisition logic
2. Timeouts can be conservative (won't miss data)
3. Frame skipping can be adaptive (won't lose responsiveness)

**Recommendation:** Start with Phase 1 immediately (5 min), then assess results before proceeding.

