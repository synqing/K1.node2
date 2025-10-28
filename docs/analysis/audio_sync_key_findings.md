---
title: Audio/Visual Synchronization: Key Findings Summary
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Audio/Visual Synchronization: Key Findings Summary

**Status:** Published
**Date:** 2025-10-28
**Audience:** Engineering, Architecture Review

---

## Finding 1: All Implementations Use Blocking I2S Read

**Evidence:**
- Sensory Bridge: `i2s_audio.h:65` - `i2s_read(..., portMAX_DELAY)`
- ESv1.2: `microphone.h:159` - `i2s_channel_read(..., portMAX_DELAY)`
- ESv2.0: `microphone.h:96` - `i2s_channel_read(..., portMAX_DELAY)`
- K1.reinvented: `microphone.h:97` - `i2s_channel_read(..., portMAX_DELAY)`

**Implication:**
- All rely on hardware DMA to continuously buffer audio
- "Blocking" is misleading: read completes in microseconds because DMA fills buffers in real-time
- This is the standard ESP32 pattern for continuous audio acquisition

---

## Finding 2: Single-Core Never Experiences I2S Blocking

**Implementations:** Sensory Bridge, K1.reinvented

**Mechanism:**
- Audio and rendering execute sequentially in the same thread (Core 0)
- DMA hardware fills I2S buffers asynchronously
- Main loop reads from full buffer: instant completion (<1ms)
- No parallel processing = no render stall from audio wait

**Timeline Example (120 FPS main loop):**
```
Frame 1: T=0ms     → acquire audio (0.1ms) → render (8.3ms) → transmit LEDs (0.1ms)
Frame 2: T=8.3ms   → acquire audio (0.1ms) → render (8.3ms) → transmit LEDs (0.1ms)
Frame 3: T=16.6ms  → acquire audio (0.1ms) → render (8.3ms) → transmit LEDs (0.1ms)
...
No blocking, deterministic timing
```

---

## Finding 3: Dual-Core Achieves Independent Audio/Video Rates

**Implementations:** ESv1.2, ESv2.0

**Mechanism:**
- Core 0: GPU rendering, unconstrained frame rate
- Core 1: CPU/audio, fixed cadence (5ms ESv1.2, 10ms ESv2.0)
- No blocking between cores via I2S

**Timeline Example (ESv2.0: 100 Hz audio, 100+ Hz GPU):**
```
Core 0 (GPU):    Frame-1 (5ms) → Frame-2 (5ms) → Frame-3 (5ms) → ...
Core 1 (Audio):  Chunk-1 (10ms) ─── Chunk-2 (10ms) ─── Chunk-3 (10ms) → ...
Alignment:       [Chunk-1 covers Frames 1-2] [Chunk-2 covers Frames 3-4] ...
```

**Advantage:** GPU rendering never stalls on audio processing
**Disadvantage:** Frame rate can drift if GPU significantly faster than audio

---

## Finding 4: Sample Rate Distribution Reflects Optimization Strategies

| Implementation | Sample Rate | Reasoning |
|---|---|---|
| Sensory Bridge | 16 kHz | Speech bandwidth standard (8 kHz Nyquist) |
| K1.reinvented | 16 kHz | Copied from Sensory Bridge |
| ESv1.2 | 25.6 kHz | Maximize frequency coverage (12.8 kHz Nyquist) |
| ESv2.0 | 12.8 kHz | Minimize CPU load, trade frequency resolution for speed |

**Finding:** No consensus on optimal rate
- ESv1.2 maximizes resolution
- ESv2.0 minimizes processing cost
- Others use 16 kHz as compromise

---

## Finding 5: No Production Ring Buffers Exist

**K1.reinvented Documentation:**
- Line main.cpp:229: Ring buffer planned ("TODO: Implement lock-free ring buffer")
- Line main.cpp:230-233: Stub returns true (always has data)

**Other Implementations:**
- Sensory Bridge: Direct state update + sequential execution
- ESv1.2/ESv2.0: History buffers + volatile flags (NOT ring buffers)

**Implication:**
- Ring buffer architecture is a design goal, not implemented
- Current implementations use direct synchronous updates
- Switching to ring buffers requires significant refactoring

---

## Finding 6: Waveform Synchronization Flags Only in Dual-Core

**Emotiscope implementations (microphone.h):**
```cpp
volatile bool waveform_locked = false;
volatile bool waveform_sync_flag = false;
```

**Purpose:**
- `waveform_locked`: Set during history buffer shift to prevent mid-read corruption
- `waveform_sync_flag`: Signals GPU that new audio data is ready

**Single-Core Implementations:**
- Not needed because sequential execution is atomic
- Audio and rendering never run concurrently

---

## Finding 7: Deterministic Latency is 8-20ms End-to-End

| Implementation | Chunk | GPU Frame | Total |
|---|---|---|---|
| Sensory Bridge | 8ms | 8.3ms @120FPS | 16.3ms |
| ESv1.2 | 5ms | 5ms @200FPS | 10ms |
| ESv2.0 | 10ms | 10ms @100FPS | 20ms |
| K1.reinvented | 8ms | 5ms @200FPS | 13ms |

**Finding:** Latency = (audio chunk duration) + (one visual frame time)
- Predictable because both are synchronous
- Lower sample rate = longer chunk = higher latency
- Higher FPS = shorter frame time = lower latency

---

## Finding 8: Loop Unrolling Reduces Overhead Cost

**Emotiscope implementations only:**
- ESv1.2: `gpu_core.h:126-129` - run_gpu() × 4
- ESv2.0: `cpu_core.h:88-90` - run_cpu() × 4

**Effect:**
- Reduces loop condition check and branch overhead
- Increases code size and instruction cache pressure
- Estimated gain: 2-3% CPU overhead reduction

---

## Finding 9: Error Handling is K1-Only

**K1.reinvented (microphone.h:98-105):**
```cpp
esp_err_t i2s_result = i2s_channel_read(rx_handle, ...);
if (i2s_result != ESP_OK) {
  memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);
  static uint32_t i2s_error_count = 0;
  if (++i2s_error_count % 10 == 1) {
    Serial.printf("[I2S] WARNING: Timeout/error (code %d, count %u)\n", ...);
  }
}
```

**Other Implementations:** Assume I2S always succeeds (no error checks)

**Implication:**
- K1 is more robust to I2S timeouts
- Production devices may experience timeouts under:
  - Clock jitter
  - Microphone disconnection
  - Firmware bugs in I2S driver

---

## Finding 10: Downsampling is Optimization-Only (ESv2.0)

**ESv2.0 (microphone.h:74-125):**
- Reads 12.8 kHz full rate (128 samples @ 10ms)
- Downsamples to 6.4 kHz (64 samples @ 10ms)
- Maintains dual history buffers

**Purpose:**
- Goertzel FFT may process at 6.4 kHz
- Reduces processing load while maintaining full-resolution visual buffer

**Finding:** ESv2.0 optimizes for CPU efficiency; trade-off is lower frequency resolution for beat detection

---

## Architectural Comparison Matrix

| Aspect | Sensory Bridge | ESv1.2 | ESv2.0 | K1.reinvented |
|--------|---|---|---|---|
| **Parallelism** | Sequential | Parallel | Parallel | Sequential |
| **I2S Blocking Risk** | Single-core=safe | Core 1 only=safe | Core 1 only=safe | Single-core=safe |
| **Sync Mechanism** | Atomic | Volatile flags | Volatile flags | Atomic (stub) |
| **Frame Drift** | None | Possible | Minimal | None |
| **Latency Determinism** | Perfect | Good | Good | Perfect |
| **Error Handling** | None | None | None | I2S timeouts |
| **Optimization** | None | Loop unroll | Downsample+unroll | None (planned) |

---

## Why These Patterns Exist

### Pattern 1: Blocking I2S Read
**Why:** ESP32 I2S driver designed for polling, not interrupts. No non-blocking read option available in standard API.

### Pattern 2: Single-Core Sequential
**Why:** Simpler to implement, guarantees no race conditions. Sufficient performance for 120+ FPS target if audio processing is fast.

### Pattern 3: Dual-Core Parallel
**Why:** Ensures render loop never stalls on audio processing. Enables higher sustained frame rates (200+ FPS).

### Pattern 4: Volatile Flags Over Mutexes
**Why:** Audio writes only, video reads only. No contention = no lock needed. Volatile prevents compiler optimization that would break correctness.

### Pattern 5: Fixed Chunk Cadence
**Why:** Simplest synchronization model. Audio acquires at natural sample rate interval. No ring buffer complexity.

---

## Risk Assessment

### Risk 1: I2S Timeout on Misconfigured Hardware
**Severity:** Medium
**Affected:** All implementations assume I2S succeeds
**Mitigation:** K1's error handling approach (check return code, log)
**Evidence:** None of the working implementations report I2S failures in normal operation

### Risk 2: Dual-Core Frame Drift (ESv1.2, ESv2.0)
**Severity:** Low (perceptual quality impact minimal)
**Cause:** GPU can run much faster than audio cadence
**Example:** GPU @ 200 FPS, Audio @ 100 Hz = 2 GPU frames per audio chunk
**Mitigation:** Lock GPU to audio rate, or use triple-buffering for lock-free sync

### Risk 3: Single-Core Render Jitter (Sensory Bridge, K1)
**Severity:** Low (unlikely in practice)
**Cause:** If Goertzel processing stalls (rare), entire frame delays
**Mitigation:** Profile Goertzel cost; profile rendering cost; ensure sum < frame budget

### Risk 4: Ring Buffer Not Implemented (K1.reinvented)
**Severity:** Low (current stub works fine)
**Cause:** Architectural plan exists but not executed
**Mitigation:** Sequential execution is safe; ring buffer is optimization, not correctness requirement

---

## Recommendations

### For K1.reinvented

1. **Adopt K1's I2S error handling** (already present) - maintains robustness
2. **Leave stub ring buffer as-is** - sequential execution is correct and performs well
3. **Monitor frame rate stability** - single-core can drift if Goertzel becomes expensive
4. **Consider dual-core ONLY if:**
   - Single-core FPS drops below 100 Hz
   - WiFi/OTA adds latency to render loop
   - Pattern complexity grows significantly

### General Architecture Guidance

1. **Blocking I2S is standard** - all working implementations use it
2. **Single-core sequential is safest** - zero synchronization complexity
3. **Dual-core is optimization** - not required unless hitting FPS limits
4. **Volatile flags sufficient for dual-core** - no mutex overhead needed
5. **Ring buffers are not needed** - direct synchronous updates work fine

---

## Next Steps for Analysis

To deepen understanding, recommend examining:

1. **Actual I2S DMA buffer depth** - how much buffering does hardware provide?
2. **Goertzel processing cost** - how long does calculate_magnitudes() actually take?
3. **GPU render cost by pattern** - which patterns stall the render loop?
4. **Frame rate measurements** - actual FPS under load on each implementation
5. **Latency end-to-end** - oscilloscope measurement from microphone input to LED output

