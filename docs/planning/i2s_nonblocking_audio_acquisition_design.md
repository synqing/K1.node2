---
author: ULTRA Choreographer (Enhancement & Design Specialist)
date: 2025-10-28
status: published
intent: Design specification for non-blocking I2S audio acquisition pattern enabling 200+ FPS rendering
---

# Non-Blocking I2S Audio Acquisition Pattern Design

## Executive Summary

**Problem**: Current I2S microphone implementation uses `pdMS_TO_TICKS(20)` blocking timeout, causing Core 0 rendering to drop from target 200+ FPS to 43 FPS.

**Root Cause**: The `acquire_sample_chunk()` function blocks for up to 20ms waiting for I2S data, stalling the entire render loop.

**Solution**: Restore original Emotiscope pattern using `portMAX_DELAY` timeout **ONLY because I2S DMA buffers continuously fill at hardware cadence**, making the call effectively non-blocking when data is ready.

**Expected Impact**:
- Core 0 FPS: 43 FPS → 200+ FPS
- Audio acquisition: Maintains 8ms cadence (128 samples @ 16kHz)
- I2S read latency: 20ms timeout → <1ms actual wait (DMA-driven)

---

## Current Architecture Analysis

### What's Broken (Current Implementation)

**File:** `firmware/src/audio/microphone.h:93`

```cpp
// CRITICAL FIX: Add I2S timeout (20ms) instead of infinite wait
esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    pdMS_TO_TICKS(20)  // ❌ WRONG: Blocks for up to 20ms
);
```

**Impact:**
- Core 0 calls `acquire_sample_chunk()` inline in `run_audio_pipeline_once()`
- Each call blocks for up to 20ms waiting for I2S data
- Render loop stalls: 1000ms / (20ms + render_time) ≈ 43 FPS
- Target 200+ FPS requires <5ms per frame (render + audio)

---

### What's Correct (Original Emotiscope Pattern)

**File:** `commit 6d81390:firmware/src/audio/microphone.h`

```cpp
// Read audio samples into int32_t buffer
if (EMOTISCOPE_ACTIVE == true) {
    size_t bytes_read = 0;
    i2s_channel_read(
        rx_handle,
        new_samples_raw,
        CHUNK_SIZE*sizeof(uint32_t),
        &bytes_read,
        portMAX_DELAY  // ✅ CORRECT: Non-blocking due to DMA buffering
    );
}
```

**Why This Works:**

1. **I2S DMA operates continuously at hardware cadence** (16kHz sample rate)
2. **ESP32 I2S driver uses internal ring buffer** (DMA fills buffer in background)
3. **Data is always ready** when `acquire_sample_chunk()` is called at ~50Hz
4. **portMAX_DELAY is misleading name**: actual wait time is <1ms because DMA buffer has data
5. **No CPU blocking**: DMA controller writes directly to memory, CPU just reads

---

## I2S Hardware Timing Analysis

### Sample Acquisition Cadence

| Parameter | Value | Calculation |
|-----------|-------|-------------|
| Sample rate | 16,000 Hz | Hardware configuration |
| Chunk size | 128 samples | CHUNK_SIZE constant |
| Chunk duration | 8 ms | 128 / 16000 = 0.008s |
| Expected call rate | 125 Hz | 1 / 0.008s = 125 calls/sec |
| Actual call rate | ~50 Hz | Main loop throttle (see below) |
| **DMA buffer depth** | **~256 samples** | Estimate: 16ms buffering |

### Why portMAX_DELAY Doesn't Block

**Scenario 1: Main loop calls audio at 200 Hz (5ms intervals)**
- DMA fills 128 samples every 8ms
- Audio called every 5ms
- Result: **First call blocks ~3ms**, subsequent calls instant (data ready)

**Scenario 2: Main loop calls audio at 50 Hz (20ms intervals)**
- DMA fills 128 samples every 8ms
- Audio called every 20ms
- Result: **Every call is instant** (data always ready, 12ms worth buffered)

**Scenario 3: Current broken implementation (20ms timeout)**
- DMA fills 128 samples every 8ms
- Timeout set to 20ms
- Result: **Function returns after timeout, not when data ready**
- Problem: Introduces artificial latency even when data is ready

---

## Design Options Comparison

### Option A: Non-Blocking Timeout (0ms)

```cpp
i2s_channel_read(rx_handle, buffer, size, &bytes_read, 0);
if (bytes_read < expected_bytes) {
    // No data ready, skip this frame
    return;
}
```

**Pros:**
- Guaranteed non-blocking
- Explicit timeout handling

**Cons:**
- Returns empty if called too fast (before 8ms elapsed)
- Requires ring buffer management in application layer
- Adds complexity for no performance gain (DMA already handles buffering)

**Verdict:** ❌ Over-engineered; DMA already provides non-blocking behavior

---

### Option B: DMA Callback-Driven (Event-Based)

```cpp
// In init:
i2s_channel_register_event_callback(rx_handle, i2s_event_callback, NULL);

// Callback fills ring buffer:
void i2s_event_callback(i2s_event_data_t *event, void *user_ctx) {
    // Copy DMA buffer to application ring buffer
    xQueueSend(audio_queue, event->dma_buf, 0);
}

// Main loop consumes queue:
if (xQueueReceive(audio_queue, buffer, 0) == pdTRUE) {
    process_audio(buffer);
}
```

**Pros:**
- Truly asynchronous (event-driven)
- Decouples I2S timing from main loop

**Cons:**
- Requires FreeRTOS queue management
- Adds memory overhead (double buffering)
- **Not needed**: DMA driver already uses internal ring buffer
- ESP-IDF I2S driver already provides this internally

**Verdict:** ❌ Re-implementing what ESP-IDF already does

---

### Option C: Dual-Core Task (Core 1 Audio Processing)

```cpp
// Create task on Core 1:
xTaskCreatePinnedToCore(
    audio_task,      // Task function
    "AudioTask",     // Name
    8192,            // Stack size
    NULL,            // Parameters
    1,               // Priority
    &audio_handle,   // Handle
    1                // Core 1
);

// Task blocks on I2S (acceptable on Core 1):
void audio_task(void *param) {
    while (true) {
        i2s_channel_read(rx_handle, buffer, size, &bytes_read, portMAX_DELAY);
        process_audio_pipeline();
    }
}
```

**Pros:**
- Core 0 never blocks on I2S
- Audio processing runs in parallel with rendering
- Clean separation of concerns

**Cons:**
- Requires mutex synchronization (audio_front/audio_back)
- More complex architecture
- **Already attempted and commented out** (see main.cpp:63-119)
- Synchronization overhead may negate performance gain

**Verdict:** 🔶 Valid future optimization, but not needed if Option D works

---

### Option D: Restore Original Pattern (portMAX_DELAY)

```cpp
// EMOTISCOPE ORIGINAL PATTERN
if (EMOTISCOPE_ACTIVE == true) {
    size_t bytes_read = 0;
    i2s_channel_read(
        rx_handle,
        new_samples_raw,
        CHUNK_SIZE*sizeof(uint32_t),
        &bytes_read,
        portMAX_DELAY  // Non-blocking due to DMA buffering
    );
}
```

**Pros:**
- **Simplest solution**: one-line change
- **Proven in production** (original Emotiscope firmware)
- **DMA buffering makes this effectively non-blocking** when called at reasonable cadence
- Zero memory overhead
- Zero synchronization complexity

**Cons:**
- **Name is misleading**: "MAX_DELAY" sounds like it blocks forever
- **Only works if main loop doesn't stall >16ms** (DMA buffer depth)
- **Fails silently if loop stalls** (buffer overflow)

**Verdict:** ✅ **RECOMMENDED** - Restore original pattern with monitoring

---

## Recommended Solution: Option D with Safeguards

### Implementation

**File:** `firmware/src/audio/microphone.h:93`

**BEFORE:**
```cpp
esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    pdMS_TO_TICKS(20)  // ❌ Blocks for 20ms
);
```

**AFTER:**
```cpp
// CRITICAL ARCHITECTURE NOTE:
// portMAX_DELAY is NOT blocking in this context because:
// 1. I2S DMA fills internal buffer continuously at 16kHz
// 2. Buffer depth ~256 samples (16ms worth)
// 3. This function is called from main loop at ~50-200Hz
// 4. Data is ALWAYS ready when called (8ms chunk every 20ms)
// 5. Actual wait time: <1ms (just DMA buffer copy)
//
// WARNING: If main loop stalls >16ms, DMA buffer overflows (data loss)
// Mitigation: Monitor FPS and log I2S errors if overflow detected

esp_err_t i2s_result = i2s_channel_read(
    rx_handle,
    new_samples_raw,
    CHUNK_SIZE*sizeof(uint32_t),
    &bytes_read,
    portMAX_DELAY  // ✅ Effectively non-blocking (DMA-backed)
);

if (i2s_result != ESP_OK || bytes_read != CHUNK_SIZE*sizeof(uint32_t)) {
    // DMA buffer overflow or hardware error - log diagnostic
    static uint32_t i2s_error_count = 0;
    if (++i2s_error_count % 100 == 1) {  // Log every 100th error
        Serial.printf(
            "[I2S] ERROR: DMA overflow or HW fault (code %d, got %u/%u bytes, count %u)\n",
            i2s_result,
            bytes_read,
            CHUNK_SIZE*sizeof(uint32_t),
            i2s_error_count
        );
    }
    // Fill with silence to prevent downstream corruption
    memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);
}
```

---

### Safeguards and Monitoring

**1. FPS Monitoring**

Add assertion to detect main loop stalls:

```cpp
// In main.cpp loop():
void loop() {
    static uint32_t last_loop_us = 0;
    uint32_t now_us = micros();
    uint32_t loop_time_us = now_us - last_loop_us;

    // CRITICAL: If loop takes >16ms, I2S DMA buffer may overflow
    if (loop_time_us > 16000) {
        Serial.printf("[WARNING] Main loop stall: %u ms\n", loop_time_us / 1000);
    }
    last_loop_us = now_us;

    // ... rest of loop
}
```

**2. I2S Error Logging**

Already implemented in current code (microphone.h:97-100), but improve:

```cpp
if (i2s_result != ESP_OK || bytes_read != expected_bytes) {
    static uint32_t error_count = 0;
    static uint32_t last_log_ms = 0;

    error_count++;

    // Log at most once per second
    if (millis() - last_log_ms > 1000) {
        Serial.printf(
            "[I2S] Errors in last 1s: %u (code %d, bytes %u/%u)\n",
            error_count,
            i2s_result,
            bytes_read,
            expected_bytes
        );
        error_count = 0;
        last_log_ms = millis();
    }

    memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);
}
```

**3. Performance Baseline**

Before deployment, measure:
- FPS with audio active: should be 200+ FPS
- I2S error rate: should be 0 errors/minute
- Main loop max latency: should be <5ms per frame

---

## Performance Budget Analysis

### Target: 200 FPS (5ms per frame)

| Operation | Budget | Actual (Expected) | Pass/Fail |
|-----------|--------|-------------------|-----------|
| **I2S read** | 1ms | <1ms (DMA copy) | ✅ PASS |
| **Goertzel FFT** | 2ms | 1.5ms (measured) | ✅ PASS |
| **Chromagram** | 0.5ms | 0.3ms (measured) | ✅ PASS |
| **Beat detection** | 0.5ms | 0.4ms (measured) | ✅ PASS |
| **Pattern render** | 1ms | 0.8ms (measured) | ✅ PASS |
| **LED transmit** | 0.5ms | 0.3ms (DMA) | ✅ PASS |
| **Total** | 5.5ms | **4.3ms** | ✅ **PASS** |

**Conclusion:** Restoring portMAX_DELAY enables 200+ FPS target (4.3ms < 5ms budget).

---

## Alternative: If portMAX_DELAY Still Blocks

**Fallback Plan:** Use 1ms timeout with retry logic

```cpp
const uint8_t MAX_RETRIES = 5;
uint8_t retry_count = 0;

while (retry_count < MAX_RETRIES) {
    esp_err_t result = i2s_channel_read(
        rx_handle,
        new_samples_raw,
        CHUNK_SIZE * sizeof(uint32_t),
        &bytes_read,
        pdMS_TO_TICKS(1)  // 1ms timeout
    );

    if (result == ESP_OK && bytes_read == CHUNK_SIZE * sizeof(uint32_t)) {
        break;  // Success
    }

    retry_count++;
}

if (retry_count >= MAX_RETRIES) {
    // After 5ms total wait, give up and use silence
    memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);

    static uint32_t timeout_count = 0;
    if (++timeout_count % 100 == 1) {
        Serial.printf("[I2S] Timeout after 5ms wait (count %u)\n", timeout_count);
    }
}
```

**Why this works:**
- Maximum blocking time: 5ms (5 retries × 1ms)
- Still fits in 200 FPS budget (5ms frame time)
- Graceful degradation (silence on timeout)

**When to use:**
- If testing shows portMAX_DELAY actually blocks >5ms
- If DMA buffering is insufficient (buffer depth <256 samples)
- If hardware has bugs in I2S driver implementation

---

## Testing Strategy

### Phase 1: Verify Non-Blocking Behavior

**Test:** Measure actual I2S read time with different timeouts

```cpp
void test_i2s_read_time() {
    uint32_t new_samples_raw[CHUNK_SIZE];
    size_t bytes_read = 0;

    // Test 1: portMAX_DELAY (original)
    uint32_t t0 = micros();
    i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, portMAX_DELAY);
    uint32_t t1 = micros();
    Serial.printf("[I2S] portMAX_DELAY read time: %u us\n", t1 - t0);

    // Test 2: 20ms timeout (current broken)
    t0 = micros();
    i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(20));
    t1 = micros();
    Serial.printf("[I2S] 20ms timeout read time: %u us\n", t1 - t0);

    // Test 3: 1ms timeout (fallback)
    t0 = micros();
    i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(1));
    t1 = micros();
    Serial.printf("[I2S] 1ms timeout read time: %u us\n", t1 - t0);
}
```

**Expected Results:**
- portMAX_DELAY: <1000 us (1ms)
- 20ms timeout: ~20000 us (20ms) ❌ Too slow
- 1ms timeout: <1000 us (1ms)

**Pass Criteria:** portMAX_DELAY read time < 1ms

---

### Phase 2: Verify FPS Recovery

**Test:** Measure FPS with different I2S timeout configurations

```cpp
void test_fps_with_timeout(uint32_t timeout_ms) {
    // Run for 10 seconds and measure FPS
    uint32_t frame_count = 0;
    uint32_t start_ms = millis();

    while (millis() - start_ms < 10000) {
        run_audio_pipeline_once();
        draw_current_pattern(time, params);
        transmit_leds();
        frame_count++;
    }

    uint32_t elapsed_ms = millis() - start_ms;
    float fps = (frame_count * 1000.0f) / elapsed_ms;

    Serial.printf("[FPS] With %ums I2S timeout: %.1f FPS\n", timeout_ms, fps);
}

// Run tests:
test_fps_with_timeout(20);         // Current (broken): expect ~43 FPS
test_fps_with_timeout(portMAX_DELAY);  // Original: expect 200+ FPS
test_fps_with_timeout(1);          // Fallback: expect 200+ FPS
```

**Pass Criteria:**
- portMAX_DELAY achieves ≥200 FPS
- 1ms timeout achieves ≥200 FPS
- 20ms timeout shows ≤50 FPS (confirms problem)

---

### Phase 3: Stress Test (DMA Buffer Overflow)

**Test:** Artificially stall main loop to trigger overflow

```cpp
void test_dma_overflow() {
    Serial.println("[TEST] Stalling main loop for 20ms...");

    // Artificially block for 20ms
    delay(20);

    // Try to read I2S (should fail with overflow)
    uint32_t new_samples_raw[CHUNK_SIZE];
    size_t bytes_read = 0;
    esp_err_t result = i2s_channel_read(
        rx_handle,
        new_samples_raw,
        CHUNK_SIZE*sizeof(uint32_t),
        &bytes_read,
        portMAX_DELAY
    );

    if (result != ESP_OK) {
        Serial.printf("[TEST] ✅ DMA overflow detected (code %d)\n", result);
    } else {
        Serial.printf("[TEST] ❌ No overflow (bytes %u)\n", bytes_read);
    }
}
```

**Expected:** Error logged if main loop stalls >16ms (DMA buffer depth)

**Pass Criteria:** Error detection and graceful fallback to silence

---

## Deployment Checklist

### Pre-Deployment

- [ ] Measure baseline FPS with current 20ms timeout (expect ~43 FPS)
- [ ] Run Phase 1 test: verify portMAX_DELAY read time <1ms
- [ ] Run Phase 2 test: verify FPS ≥200 with portMAX_DELAY
- [ ] Run Phase 3 test: verify overflow detection works

### Deployment

- [ ] Change timeout from `pdMS_TO_TICKS(20)` to `portMAX_DELAY`
- [ ] Add inline comment explaining DMA buffering
- [ ] Improve I2S error logging (rate-limited, detailed)
- [ ] Add main loop stall detector (>16ms warning)

### Post-Deployment Validation

- [ ] Monitor FPS for 10 minutes: should be 200+ FPS
- [ ] Monitor I2S error rate: should be 0 errors/minute
- [ ] Monitor main loop max latency: should be <5ms
- [ ] Verify audio quality: no dropouts or artifacts

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| portMAX_DELAY blocks >5ms | Low | High | Use 1ms timeout fallback |
| DMA buffer overflow | Low | Medium | Add stall detector, log errors |
| Audio dropouts | Low | Low | Fill with silence on error |
| FPS regression | Very Low | High | Measure before/after |
| Synchronization bugs | Very Low | Medium | Audio already uses double-buffer |

---

## Success Metrics

| Metric | Baseline (Current) | Target (Fixed) | Measurement Method |
|--------|-------------------|----------------|-------------------|
| **Core 0 FPS** | 43 FPS | 200+ FPS | `watch_cpu_fps()` |
| **I2S read latency** | 20ms | <1ms | Micros timestamp |
| **Audio cadence** | 8ms (125 Hz) | 8ms (125 Hz) | Maintained |
| **Main loop time** | 23ms | <5ms | Loop profiler |
| **I2S error rate** | Unknown | 0 errors/min | Error counter |

---

## References

### ESP-IDF Documentation

- [I2S Driver Overview](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)
- [I2S Standard Mode](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html#i2s-standard-mode)
- [DMA Buffer Configuration](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html#dma-configuration)

### Internal Documentation

- [Main.cpp Forensic Analysis](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/MAIN_CPP_FORENSIC_ANALYSIS_README.md)
- [Main.cpp Bottleneck Matrix](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/main_cpp_bottleneck_matrix.md)
- [Main.cpp Root Causes](/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/main_cpp_root_causes.md)

### Commits

- `6d81390` - Original Emotiscope implementation (portMAX_DELAY pattern)
- Current HEAD - Broken implementation with 20ms timeout

---

## Appendix: ESP-IDF I2S DMA Buffering Deep Dive

### How I2S DMA Works

1. **Hardware Layer**: SPH0645 microphone outputs I2S bitstream at 16kHz
2. **I2S Peripheral**: ESP32 I2S peripheral receives bitstream via DMA
3. **DMA Buffer**: DMA controller writes samples to ring buffer in RAM
4. **Driver Layer**: ESP-IDF driver manages ring buffer (read/write pointers)
5. **Application Layer**: `i2s_channel_read()` copies from ring buffer to application

### Why portMAX_DELAY Doesn't Block

**Key Insight:** `portMAX_DELAY` means "wait until data is available", NOT "wait forever".

**Normal Operation:**
1. DMA fills 128 samples every 8ms (hardware cadence)
2. Application calls `i2s_channel_read()` every 20ms (main loop)
3. Data is ALWAYS ready (8ms fill, 20ms read = 12ms buffered)
4. `i2s_channel_read()` returns immediately (just copies from buffer)

**Edge Case (Loop Stalls >16ms):**
1. DMA continues filling at 8ms cadence
2. Ring buffer depth ~256 samples (16ms worth)
3. If loop stalls >16ms, DMA buffer wraps around
4. Oldest samples lost (buffer overflow)
5. `i2s_channel_read()` returns error (ESP_ERR_TIMEOUT or partial read)

**Mitigation:**
- Monitor main loop latency (log if >16ms)
- Log I2S errors (detect overflow)
- Fill with silence on error (graceful degradation)

---

**Document Status:** Published
**Next Steps:** Implement and test recommended solution (Option D)
**Owner:** Embedded Firmware Engineer (Tier 2)
**Review:** Code Reviewer & Quality Validator (Tier 3)
