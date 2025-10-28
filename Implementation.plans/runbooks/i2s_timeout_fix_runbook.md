---
author: ULTRA Choreographer (Enhancement & Design Specialist)
date: 2025-10-28
status: published
intent: Step-by-step implementation guide for fixing I2S timeout to restore 200+ FPS rendering
---

# I2S Timeout Fix Implementation Runbook

## Objective

Fix I2S blocking timeout to restore Core 0 rendering from 43 FPS to 200+ FPS by changing timeout from `pdMS_TO_TICKS(20)` to `portMAX_DELAY`.

**Estimated Time:** 30 minutes (implementation) + 1 hour (testing)

---

## Prerequisites

- [ ] Read design document: `/docs/planning/i2s_nonblocking_audio_acquisition_design.md`
- [ ] Understand why portMAX_DELAY is non-blocking (DMA buffering)
- [ ] Baseline FPS measurement: should be ~43 FPS currently
- [ ] Build environment configured: PlatformIO + ESP32-S3

---

## Step 1: Measure Baseline Performance (5 minutes)

### 1.1 Build and Upload Current Firmware

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented
pio run -t upload --upload-port k1-reinvented.local
```

### 1.2 Measure FPS

Open serial monitor:
```bash
pio device monitor
```

Wait for FPS output:
```
[FPS] Core 0: 43.2 FPS
```

**Expected Baseline:** 40-45 FPS (confirms I2S blocking)

**Save this value** for before/after comparison.

---

## Step 2: Apply Code Changes (10 minutes)

### 2.1 Edit microphone.h

**File:** `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/audio/microphone.h`

**Find Line 93:**
```cpp
esp_err_t i2s_result = i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(20));
```

**Replace with:**
```cpp
// CRITICAL ARCHITECTURE NOTE:
// portMAX_DELAY is NOT blocking in this context because:
// 1. I2S DMA fills internal buffer continuously at 16kHz (hardware-driven)
// 2. Buffer depth ~256 samples (16ms worth of audio)
// 3. This function is called from main loop at ~50-200Hz
// 4. Data is ALWAYS ready when called (8ms chunk produced every 8ms, consumed every 20ms)
// 5. Actual wait time: <1ms (just DMA buffer copy to application memory)
//
// WARNING: If main loop stalls >16ms, DMA buffer overflows (data loss)
// Mitigation: Monitor FPS (should be 200+) and log I2S errors if overflow detected
//
// Previous timeout: pdMS_TO_TICKS(20) blocked for 20ms, limiting FPS to 43
// Fixed: portMAX_DELAY returns immediately when DMA data ready (<1ms actual wait)

esp_err_t i2s_result = i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, portMAX_DELAY);
```

### 2.2 Improve Error Logging (Lines 94-101)

**Find:**
```cpp
if (i2s_result != ESP_OK) {
    // I2S timeout/error - fill with silence and log diagnostic
    memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);
    static uint32_t i2s_error_count = 0;
    if (++i2s_error_count % 10 == 1) {  // Log every 10th error
        Serial.printf("[I2S] WARNING: Timeout/error (code %d, count %u)\n", i2s_result, i2s_error_count);
    }
}
```

**Replace with:**
```cpp
// Validate I2S read success and bytes received
if (i2s_result != ESP_OK || bytes_read != CHUNK_SIZE*sizeof(uint32_t)) {
    // DMA buffer overflow or hardware error - fill with silence to prevent downstream corruption
    memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);

    static uint32_t i2s_error_count = 0;
    static uint32_t last_error_log_ms = 0;
    i2s_error_count++;

    // Rate-limited logging: max once per second to avoid serial spam
    uint32_t now_ms = millis();
    if (now_ms - last_error_log_ms >= 1000) {
        Serial.printf(
            "[I2S] ERROR: DMA overflow or HW fault in last 1s\n"
            "  Result code: %d (ESP_OK=%d, ESP_ERR_TIMEOUT=%d)\n"
            "  Bytes read: %u (expected %u)\n"
            "  Error count: %u\n"
            "  → Main loop may be stalling >16ms (DMA buffer overflow)\n",
            i2s_result,
            ESP_OK,
            ESP_ERR_TIMEOUT,
            bytes_read,
            CHUNK_SIZE*sizeof(uint32_t),
            i2s_error_count
        );
        i2s_error_count = 0;  // Reset counter after logging
        last_error_log_ms = now_ms;
    }
}
```

---

## Step 3: Add Main Loop Stall Detector (Optional, 5 minutes)

**File:** `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/main.cpp`

**Find loop() function (line 238):**
```cpp
void loop() {
    // Core 0 main loop: pure pattern rendering without blocking

    wifi_monitor_loop();  // Non-blocking WiFi status check (will move to Core 1)
    ArduinoOTA.handle();  // Non-blocking OTA polling (will move to Core 1)
```

**Add stall detector at top:**
```cpp
void loop() {
    // DIAGNOSTIC: Detect main loop stalls that could overflow I2S DMA buffer
    static uint32_t last_loop_us = 0;
    uint32_t now_us = micros();
    if (last_loop_us > 0) {  // Skip first iteration
        uint32_t loop_time_us = now_us - last_loop_us;

        // I2S DMA buffer depth ~16ms; warn if loop takes >10ms
        if (loop_time_us > 10000) {
            Serial.printf("[WARNING] Main loop stall: %u ms (I2S DMA may overflow if >16ms)\n", loop_time_us / 1000);
        }
    }
    last_loop_us = now_us;

    // Core 0 main loop: pure pattern rendering without blocking

    wifi_monitor_loop();  // Non-blocking WiFi status check (will move to Core 1)
    ArduinoOTA.handle();  // Non-blocking OTA polling (will move to Core 1)
```

---

## Step 4: Build and Deploy (5 minutes)

### 4.1 Build Firmware

```bash
pio run
```

**Expected:** Clean build with 0 errors, 0 warnings

**If build fails:**
- Verify syntax of added comments
- Check for missing semicolons
- Verify `portMAX_DELAY` constant is available (should be from FreeRTOS)

### 4.2 Upload to Device

```bash
pio run -t upload --upload-port k1-reinvented.local
```

**Expected:** Successful upload over WiFi/OTA

**If upload fails:**
- Check device is on network: `ping k1-reinvented.local`
- Try serial upload: `pio run -t upload`
- Check firewall settings

---

## Step 5: Verify FPS Recovery (10 minutes)

### 5.1 Open Serial Monitor

```bash
pio device monitor
```

### 5.2 Wait for FPS Output

Look for:
```
[FPS] Core 0: 212.8 FPS
```

**Expected:** 200+ FPS (5x improvement from baseline)

**If FPS is still low (<100 FPS):**
- Check for I2S error messages (DMA overflow)
- Check for main loop stall warnings (>10ms)
- Verify `portMAX_DELAY` was actually changed (rebuild clean)

### 5.3 Monitor for Errors

Run for 5 minutes and check for:

**Good (Expected):**
```
[FPS] Core 0: 205.3 FPS
[FPS] Core 0: 208.1 FPS
[FPS] Core 0: 201.7 FPS
```

**Bad (Unexpected):**
```
[I2S] ERROR: DMA overflow or HW fault in last 1s
  Error count: 47
  → Main loop may be stalling >16ms
```

If you see DMA overflow errors, **STOP** and investigate:
- Is main loop stalling? (check stall detector output)
- Is WiFi causing delays? (try disabling WiFi temporarily)
- Is OTA causing delays? (try disabling OTA temporarily)

---

## Step 6: Performance Testing (30 minutes)

### 6.1 FPS Stability Test (10 minutes)

Let firmware run for 10 minutes and collect FPS samples:

```bash
pio device monitor | grep "FPS" > fps_log.txt
```

**Expected:**
- Minimum FPS: >180 FPS
- Average FPS: 200-220 FPS
- Maximum FPS: <250 FPS
- Standard deviation: <10 FPS

**Analysis:**
```bash
# Count FPS samples
grep "FPS" fps_log.txt | wc -l

# Show min/max
grep "FPS" fps_log.txt | sort -n | head -5    # Lowest 5
grep "FPS" fps_log.txt | sort -n | tail -5    # Highest 5
```

### 6.2 Audio Quality Test (10 minutes)

Play music or speak near microphone and verify:

- [ ] LED patterns react to audio (audio pipeline working)
- [ ] Beat detection works (tempo patterns respond)
- [ ] No audio dropouts (silence gaps)
- [ ] No crackling or distortion
- [ ] Patterns sync smoothly with audio

**If audio broken:**
- Check I2S error rate (should be 0)
- Verify EMOTISCOPE_ACTIVE flag is true
- Check audio buffer swap (finish_audio_frame)

### 6.3 I2S Error Rate Test (10 minutes)

Monitor for I2S errors over 10 minutes:

```bash
pio device monitor | grep "I2S ERROR"
```

**Expected:** 0 errors over 10 minutes

**If errors occur:**
- Check main loop stall detector (>10ms warnings)
- Profile slow functions (Goertzel, pattern render)
- Consider increasing DMA buffer depth (requires ESP-IDF config)

---

## Step 7: Validation Checklist

### Functional Tests

- [ ] FPS ≥200 (measured via serial monitor)
- [ ] Audio reactive patterns work (visual confirmation)
- [ ] Beat detection works (tempo patterns respond)
- [ ] No I2S errors (0 errors over 10 minutes)
- [ ] No main loop stalls >10ms (no warnings)

### Performance Tests

- [ ] Minimum FPS >180 over 10 minutes
- [ ] Average FPS 200-220 over 10 minutes
- [ ] No audio dropouts (continuous audio)
- [ ] Pattern render smooth (no stuttering)

### Code Quality

- [ ] Build succeeds with 0 warnings
- [ ] Inline comments explain portMAX_DELAY rationale
- [ ] Error logging is rate-limited (max 1/second)
- [ ] Stall detector added (optional but recommended)

---

## Rollback Plan (If Fix Fails)

If FPS doesn't improve or audio breaks:

### 1. Revert to Previous Timeout

**File:** `firmware/src/audio/microphone.h:93`

```cpp
esp_err_t i2s_result = i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(20));
```

### 2. Try 1ms Timeout (Fallback Pattern)

```cpp
esp_err_t i2s_result = i2s_channel_read(rx_handle, new_samples_raw, CHUNK_SIZE*sizeof(uint32_t), &bytes_read, pdMS_TO_TICKS(1));
```

**Expected:** FPS should still improve to ~150-180 FPS

### 3. Escalate to SUPREME Analyst

If neither fix works:
- Capture serial logs (full boot + 5 minutes of operation)
- Measure I2S read time (add micros() timestamps)
- Profile main loop (identify slow functions)
- Create analysis report: `/docs/analysis/i2s_timeout_failure_analysis.md`

---

## Success Criteria

| Metric | Baseline | Target | Measured | Pass/Fail |
|--------|----------|--------|----------|-----------|
| Core 0 FPS | 43 FPS | 200+ FPS | _______ FPS | ⬜ |
| I2S error rate | Unknown | 0/min | _______ errors/10min | ⬜ |
| Main loop stalls | Unknown | 0/min | _______ stalls/10min | ⬜ |
| Audio quality | OK | OK | ⬜ Working ⬜ Broken | ⬜ |
| Build warnings | 0 | 0 | _______ warnings | ⬜ |

**Overall:** ⬜ PASS ⬜ FAIL ⬜ CONDITIONAL

---

## Troubleshooting Guide

### Problem: FPS Still Low (<100 FPS)

**Possible Causes:**
1. `portMAX_DELAY` change didn't take effect (rebuild clean)
2. Other blocking calls in main loop (profile with micros())
3. Pattern render is too slow (profile draw_current_pattern)

**Debug Steps:**
```cpp
// Add timing to acquire_sample_chunk():
uint32_t t0 = micros();
esp_err_t i2s_result = i2s_channel_read(...);
uint32_t t1 = micros();
Serial.printf("[I2S] Read time: %u us\n", t1 - t0);
```

**Expected:** <1000 us (1ms)
**If >5000 us:** portMAX_DELAY is blocking; investigate DMA config

---

### Problem: I2S Errors (DMA Overflow)

**Symptoms:**
```
[I2S] ERROR: DMA overflow or HW fault
```

**Possible Causes:**
1. Main loop stalling >16ms
2. WiFi/OTA causing long delays
3. Pattern render too slow

**Debug Steps:**
1. Check stall detector output (should show >10ms warnings)
2. Temporarily disable WiFi and OTA
3. Profile slow functions in main loop

**Fix:**
- Optimize slow functions (reduce to <5ms)
- Increase DMA buffer depth (ESP-IDF config)
- Move WiFi/OTA to Core 1 task (future optimization)

---

### Problem: Audio Broken (No Reaction)

**Symptoms:**
- Patterns don't react to audio
- audio_front.audio_max_bass always 0

**Possible Causes:**
1. I2S read failing (check error rate)
2. Microphone not connected (hardware issue)
3. Audio pipeline not running

**Debug Steps:**
1. Check I2S error rate (should be 0)
2. Print raw sample values (should be non-zero when audio present)
3. Check EMOTISCOPE_ACTIVE flag (should be true)

**Fix:**
```cpp
// In acquire_sample_chunk(), add debug output:
if (EMOTISCOPE_ACTIVE) {
    Serial.printf("[AUDIO] Sample 0: %d, Sample 64: %d\n", new_samples_raw[0], new_samples_raw[64]);
}
```

**Expected:** Non-zero values when audio present

---

## Post-Deployment Monitoring (24 hours)

### Metrics to Track

1. **FPS Stability**
   - Log min/max/avg FPS every hour
   - Alert if FPS drops below 150

2. **I2S Error Rate**
   - Log error count every hour
   - Alert if >10 errors/hour

3. **Main Loop Stalls**
   - Log stall count every hour
   - Alert if >5 stalls/hour

### Automated Health Check Script

```cpp
// Add to main.cpp loop():
void log_health_metrics() {
    static uint32_t last_health_log_ms = 0;
    uint32_t now_ms = millis();

    if (now_ms - last_health_log_ms >= 3600000) {  // Every hour
        Serial.printf(
            "[HEALTH] Uptime: %u hours\n"
            "  FPS last hour: min=%.1f avg=%.1f max=%.1f\n"
            "  I2S errors: %u\n"
            "  Loop stalls: %u\n",
            now_ms / 3600000,
            fps_min, fps_avg, fps_max,
            i2s_error_count,
            stall_count
        );

        // Reset counters
        fps_min = 999.0f;
        fps_max = 0.0f;
        i2s_error_count = 0;
        stall_count = 0;
        last_health_log_ms = now_ms;
    }
}
```

---

## Related Documents

- **Design Spec:** `/docs/planning/i2s_nonblocking_audio_acquisition_design.md`
- **Forensic Analysis:** `/docs/analysis/MAIN_CPP_FORENSIC_ANALYSIS_README.md`
- **Bottleneck Matrix:** `/docs/analysis/main_cpp_bottleneck_matrix.md`
- **Root Cause Analysis:** `/docs/analysis/main_cpp_root_causes.md`

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-10-28 | ULTRA Choreographer | Initial runbook created |

---

**Runbook Status:** Published
**Next Steps:** Execute implementation and validation
**Owner:** Embedded Firmware Engineer (Tier 2)
**Review:** Code Reviewer & Quality Validator (Tier 3)
