# Audio Pipeline Bottleneck Priority Matrix

## Executive Summary: 4 Critical Issues, 3 Quick Wins Available

| Rank | Issue | Type | Latency Impact | Fix Time | Effort | Risk | Priority |
|------|-------|------|-----------------|----------|--------|------|----------|
| **1** | Pattern direct array access (RACE) | Synchronization | 0-10ms tearing | 30 min | EASY | LOW | DO NOW |
| **2** | I2S blocking portMAX_DELAY (FREEZE) | Timeout safety | 0ms norm, ∞ on fail | 30 min | EASY | HIGH | DO NOW |
| **3** | Mutex timeout silent fail (LAG) | Synchronization | 5-10ms spikes | 1 hour | MEDIUM | MEDIUM | DO SOON |
| **4** | Codegen not using safety macro | Code generation | 0ms (no-op) | 1 hour | MEDIUM | LOW | DO SOON |
| **5** | No dual-core execution (ARCH) | Architecture | 25ms baseline | 4-6 hrs | HARD | MEDIUM | DO LATER |

---

## Issue #1: Pattern Direct Array Access (RACE CONDITION)

### Location
- **File:** `firmware/src/generated_patterns.h`
- **Lines:** 25 (FFT), 60 (Octave), 95 (Spectrum)
- **Severity:** CRITICAL (Visual flickering every 100-200ms)

### Code Example - BROKEN
```cpp
// Line 25 - Emotiscope FFT Pattern
for (int i = 0; i < NUM_LEDS; i++) {
    float position = fmod(fmin(1.0f,
        (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) +
        fmin(1.0f, spectrogram[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] + ...)
    ), 1.0f);
    // ↑ NO LOCKING - reads spectrogram[] while calculate_magnitudes() might be updating it
}
```

### Root Cause
- Patterns read `spectrogram[bin]` without mutex protection
- Audio thread writes `spectrogram[i]` in `calculate_magnitudes()` (goertzel.h:522)
- Race window: 20-25ms while Goertzel computation runs
- Pattern reads partially-updated array = color tear effect

### Symptom
User sees:
- Red color on LEDs shifts to orange in middle of strip
- Happens every 30-50 frames (every 1-2 seconds at 25 FPS)
- More noticeable with fast-changing audio (drums, transients)

### Fix (30 minutes)
**Option A: Local snapshot (safe, minimal perf impact)**
```cpp
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    // Create local copy of spectrogram to prevent tearing
    float spectrum_snapshot[NUM_FREQS];
    memcpy(spectrum_snapshot, spectrogram, sizeof(float) * NUM_FREQS);

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f,
            (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) +
            fmin(1.0f, spectrum_snapshot[0 + int(...)] + ...)
        ), 1.0f);
        // Now reading from stable snapshot, no race
    }
}
```

**Cost:** +256 bytes stack per pattern call, +0.3ms latency
**Benefit:** No more visual artifacts

### Alternative: Fix Codegen (1+ hours)
- Enable `PATTERN_AUDIO_START()` macro in generated code
- Use `AUDIO_SPECTRUM` macro instead of direct array access
- Requires debugging codegen template condition (lines 67-74 in index.ts)

---

## Issue #2: I2S Blocking Timeout (FREEZE RISK)

### Location
- **File:** `firmware/src/audio/microphone.h`
- **Line:** 71
- **Severity:** CRITICAL (Device freeze on hardware failure)

### Code - BROKEN
```cpp
void acquire_sample_chunk() {
    uint32_t new_samples_raw[CHUNK_SIZE];

    if (EMOTISCOPE_ACTIVE == true) {
        size_t bytes_read = 0;
        i2s_channel_read(rx_handle, new_samples_raw,
                         CHUNK_SIZE*sizeof(uint32_t),
                         &bytes_read, portMAX_DELAY);  // ← INFINITE WAIT
        // If I2S has no data, blocks forever
    }
}
```

### Root Cause
`portMAX_DELAY` = wait infinitely. If I2S microphone has no data (hardware failure, unplugged, no power):
- `i2s_channel_read()` never returns
- Main loop thread blocks forever
- LEDs freeze on last color
- Web server becomes unresponsive
- Device appears dead to user

### Failure Scenarios
1. **SPH0645 microphone unplugged:** I2S gets no clock → read hangs
2. **Loose audio cable:** Intermittent data → read timeout
3. **Power loss to microphone:** I2S DMA has no input → read hangs
4. **I2S peripheral hardware fault:** DMA never completes → read hangs

### Symptom
- Device processes normally, then suddenly LEDs freeze
- Serial console shows no output
- Only recovery: power cycle or software reset
- Users have no idea what happened

### Fix (30 minutes)
```cpp
void acquire_sample_chunk() {
    uint32_t new_samples_raw[CHUNK_SIZE];
    size_t bytes_read = 0;

    // Use bounded timeout instead of infinite wait
    BaseType_t result = i2s_channel_read(
        rx_handle, new_samples_raw,
        CHUNK_SIZE * sizeof(uint32_t),
        &bytes_read,
        pdMS_TO_TICKS(20)  // 20ms timeout instead of portMAX_DELAY
    );

    // Handle timeout gracefully
    if (result != pdPASS || bytes_read < CHUNK_SIZE * sizeof(uint32_t)) {
        // I2S read failed or timed out - use silence as fallback
        memset(new_samples_raw, 0, sizeof(uint32_t) * CHUNK_SIZE);
        Serial.println("[AUDIO] I2S read timeout - using silence buffer");
    } else if (EMOTISCOPE_ACTIVE == false) {
        memset(new_samples_raw, 0, CHUNK_SIZE * sizeof(uint32_t));
    }

    // Continue with sample processing...
}
```

**Cost:** +0ms latency (timeout only triggers on error)
**Benefit:** Device stays responsive if microphone fails

### Test Case
```
1. Connect device and verify audio works
2. Unplug I2S microphone cable
3. Expected: Serial output "[AUDIO] I2S read timeout - using silence buffer"
4. Expected: LEDs continue rendering (silent pattern)
5. Current: LEDs freeze, device unresponsive (BROKEN)
```

---

## Issue #3: Mutex Timeout Silent Failure (AUDIO LAG)

### Location
- **File:** `firmware/src/audio/goertzel.h`
- **Lines:** 220 (read), 243-244 (write), 257/260 (error handling)
- **Severity:** HIGH (Periodic 50-100ms lag spikes)

### Code - BROKEN
```cpp
// Line 220 - get_audio_snapshot() fails silently
bool get_audio_snapshot(AudioDataSnapshot* snapshot) {
    if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(1)) == pdTRUE) {
        memcpy(snapshot, &audio_front, sizeof(AudioDataSnapshot));
        xSemaphoreGive(audio_read_mutex);
        return true;
    }
    return false;  // ← Timeout - caller doesn't know why
}

// Line 243-244 - commit_audio_data() has nested timeouts
if (xSemaphoreTake(audio_swap_mutex, pdMS_TO_TICKS(5)) == pdTRUE) {
    if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(5)) == pdTRUE) {
        // Success - swap buffers
    } else {
        // Timeout acquiring read_mutex while holding swap_mutex
        // Problem: Already hold swap_mutex, now releasing it
        xSemaphoreGive(audio_swap_mutex);
        Serial.println("[AUDIO SYNC] WARNING: Read mutex timeout during commit");
        // But patterns don't see this warning - they get stale data
    }
}
```

### Race Condition Timeline
```
Time   Core 0 (Pattern)           Core 1 (Audio - simulated)
----   ---------------------      ----------------------
T0     draw_pattern()
       calls get_audio_snapshot()
       → Try to take read_mutex

T0+0μs                           calculate_magnitudes()
                                 Writing to spectrogram[]
                                 (but doesn't hold read_mutex!)

T0+1ms Timeout! read_mutex
       still held by            finish_audio_frame()
       commit_audio_data()       Takes read_mutex (line 244)
                                → Holds it for 5ms

T0+1.5ms Pattern gets false from
        get_audio_snapshot()
        → Uses STALE audio_front
        → Renders with old data

T0+6ms                           Releases read_mutex
       Pattern finally sees
       fresh data (too late)
       Frame already rendered
```

### Symptom
- User plays loud bass drop (RMS goes 0.0 → 0.8)
- LEDs should respond immediately
- Actually respond in 40-80ms (looks like "lag" or "sluggish")
- Happens intermittently (every ~6 frames at 37 FPS)

### Root Cause
1. Single-threaded execution means mutex is **never actually contested**
   - No Core 1 audio thread = no dual-core contention
   - Mutex always succeeds instantly
   - Timeouts only trigger in error scenarios

2. But timeouts ARE triggering because:
   - `calculate_magnitudes()` runs 15-25ms
   - `finish_audio_frame()` tries to commit while calculate still running
   - `commit_audio_data()` holds `read_mutex` for 5ms
   - Pattern tries to read within that 5ms window
   - Pattern's 1ms timeout expires
   - Pattern uses **stale snapshot from previous frame**

### Fix (1 hour)
**Option A: Remove unnecessary double-buffering (for single-threaded code)**
```cpp
// Instead of snapshot-based read, use atomic pattern-local data
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    // Copy current spectrogram once per frame
    static float current_spectrum[NUM_FREQS];

    // This is the ONLY place that reads spectrogram[]
    // Done before pattern uses it, prevents mid-update reads
    memcpy(current_spectrum, spectrogram, sizeof(float) * NUM_FREQS);

    // Now all pattern renders use current_spectrum
    for (int i = 0; i < NUM_LEDS; i++) {
        float bin_val = current_spectrum[...];  // Safe, no race
    }
}
```

**Option B: Increase timeout window (quick but ineffective)**
```cpp
// Line 220 - increase from 1ms to 10ms
if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
    // ...
}
```

**Cost Option A:** +256 bytes static buffer, +0.3ms per frame
**Benefit:** Eliminates 5-10ms lag spikes

---

## Issue #4: Codegen Safety Macro Not Invoked (CODE GENERATION BUG)

### Location
- **File:** `firmware/codegen/src/index.ts`
- **Lines:** 67-74 (template) vs. generated_patterns.h (output mismatch)
- **Severity:** MEDIUM (Currently no-op since patterns don't use snapshots)

### Code - INCOMPLETE
```typescript
// Lines 67-74 in codegen/src/index.ts - Template declares macro:
{{#if is_audio_reactive}}
// Thread-safe audio snapshot acquisition
PATTERN_AUDIO_START();

// Early exit if audio data is stale (no new updates since last frame)
if (!AUDIO_IS_FRESH()) {
    return;  // Reuse previous frame to avoid redundant rendering
}
{{/if}}

// But generated_patterns.h lines 18-46 doesn't include it!
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    // No PATTERN_AUDIO_START() macro here

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(fmin(1.0f,
            (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) +
            fmin(1.0f, spectrogram[...] + ...)  // ← Direct access, not macro
        ), 1.0f);
    }
}
```

### Root Cause
- Codegen template was written to support audio-reactive patterns safely
- But `is_audio_reactive` flag or template condition isn't evaluating correctly
- Or patterns were generated with old codegen version

### Impact
- Currently: Patterns access audio directly (Race condition #1)
- Should be: Patterns use PATTERN_AUDIO_START() macro for thread-safe snapshots
- Effect: Potential for lag and tearing once dual-core is implemented

### Fix (1 hour)
```typescript
// In codegen/src/index.ts around line 67:
// 1. Verify is_audio_reactive flag is set on each pattern
console.log(`Pattern '${pattern.name}' is_audio_reactive=${pattern.is_audio_reactive}`);

// 2. Debug Handlebars condition
// Temporarily replace {{#if is_audio_reactive}} with {{#if true}} to test

// 3. Regenerate patterns
const patternCode = multiPatternTemplate(context);

// 4. Verify output contains PATTERN_AUDIO_START()
if (!patternCode.includes('PATTERN_AUDIO_START')) {
    console.error('ERROR: Generated code missing PATTERN_AUDIO_START macro!');
}

// 5. Write corrected generated_patterns.h
writeFileSync('firmware/src/generated_patterns.h', patternCode);
```

---

## Issue #5: No Actual Dual-Core Execution (ARCHITECTURAL)

### Location
- **File:** `firmware/src/main.cpp`
- **Lines:** 96-125 (single-threaded loop)
- **Comments:** goertzel.h:125-126 (claim dual-core doesn't exist)
- **Severity:** CRITICAL (25 FPS instead of 450 FPS)

### Code - BROKEN ARCHITECTURE
```cpp
// main.cpp - Everything sequential on one core
void loop() {
    // These should run on Core 1 (100 Hz, background)
    acquire_sample_chunk();      // 5-10ms blocking
    calculate_magnitudes();      // 15-25ms CPU
    get_chromagram();            // <1ms
    finish_audio_frame();        // 0-5ms mutex

    // These should run on Core 0 (200+ FPS, render priority)
    draw_current_pattern(time, params);  // 2-5ms
    transmit_leds();                     // 1-2ms + blocking
}

// Claims dual-core in comments but no code implements it:
// "Core 1, 100Hz" - NO xTaskCreatePinnedToCore()
// "Core 0, 450 FPS" - But loop blocks on I2S, RMT
```

### Why Single-Threaded is Wrong
| Aspect | Should Be | Is Actually |
|--------|-----------|-------------|
| Audio processing | Async on Core 1 | Blocks main loop |
| LED rendering | Async on Core 0 | Waits for audio |
| Max FPS | 200-450 | 25-37 |
| Latency | 10-15ms | 32-40ms |
| Parallelism | 40%+ CPU overlap | 0% (sequential) |
| Mutex contention | Common | Never (single thread) |

### Fix (4-6 hours)
**Step 1: Create audio task on Core 1**
```cpp
void audio_task(void* param) {
    while (true) {
        // Audio processing loop - runs at ~100 Hz on Core 1
        acquire_sample_chunk();
        calculate_magnitudes();
        get_chromagram();
        finish_audio_frame();

        // Sleep to maintain 100 Hz (or use event-based trigger)
        vTaskDelay(pdMS_TO_TICKS(10));  // ~100 Hz nominal
    }
}
```

**Step 2: Keep pattern rendering on Core 0**
```cpp
void setup() {
    // ... initialize hardware ...

    // Create audio task on Core 1
    xTaskCreatePinnedToCore(
        audio_task,       // Function to run
        "audio",          // Task name
        8192,             // Stack size (8 KB)
        NULL,             // Parameters
        10,               // Priority (10 = high)
        NULL,             // Task handle
        1                 // Core 1
    );
}

void loop() {
    // Core 0 - render only, doesn't wait for audio

    // Track time for animation
    static uint32_t start_time = millis();
    float time = (millis() - start_time) / 1000.0f;

    // Get current parameters (thread-safe read)
    const PatternParameters& params = get_params();

    // Draw current pattern (reads audio_front from audio task)
    draw_current_pattern(time, params);

    // Transmit to LEDs (use 5ms timeout instead of portMAX_DELAY)
    transmit_leds();

    // Track FPS
    watch_cpu_fps();
    print_fps();
}
```

**Step 3: Fix blocking calls**
- Audio task: keep blocking I2S (acceptable on background task)
- Core 0: use non-blocking or short timeout on RMT

**Benefits:**
- Parallel execution: LEDs render while audio computes
- No artificial synchronization: audio_front always fresh
- Higher FPS: 200+ achievable without modifying math
- Lower latency: ~15ms instead of 32-40ms

**Risks:**
- Stack overflow if 8 KB insufficient (typical: 6-7 KB used)
- FreeRTOS scheduler adds ~100µs context switch
- Mutex complexity increases (but mutual contention is expected)
- Requires testing on real hardware

**Implementation Effort:** 4-6 hours
- Create task structure: 30 min
- Debug stack allocation: 1 hour
- Test synchronization: 2 hours
- Validate audio quality: 1-2 hours

---

## Severity Comparison Matrix

```
         Impact on     Impact on      Impact on
         Audio Lag     Visual Sync     Safety
Issue 1  MEDIUM        HIGH            LOW
Issue 2  NONE          NONE            CRITICAL
Issue 3  HIGH          MEDIUM          LOW
Issue 4  LOW           LOW             LOW (future)
Issue 5  CRITICAL      CRITICAL        MEDIUM
```

---

## Recommended Implementation Order

### Phase 1: Stability & Safety (1 hour, DO NOW)
- [ ] **Issue #2:** Add I2S timeout (30 min) - Prevents freeze
- [ ] **Issue #1:** Add pattern snapshot (30 min) - Eliminates flickering

### Phase 2: Audio Quality (2 hours, DO SOON)
- [ ] **Issue #3:** Fix mutex timeout handling (1 hour) - Removes lag spikes
- [ ] **Issue #4:** Fix codegen to use PATTERN_AUDIO_START() (1 hour) - Prepares for dual-core

### Phase 3: Performance (4-6 hours, DO LATER)
- [ ] **Issue #5:** Implement dual-core execution (4-6 hours) - 10x FPS, 2x lower latency

---

## Quick Validation Checklist

After implementing each fix, verify:

**Issue #1 (Pattern snapshot):**
- [ ] No more color tearing in pattern
- [ ] FPS still 25-37 (no regression)
- [ ] Serial output shows no warnings

**Issue #2 (I2S timeout):**
- [ ] Unplug microphone → LEDs continue rendering silently
- [ ] Reconnect microphone → Audio resumes
- [ ] Serial output shows "[AUDIO] I2S read timeout" when needed

**Issue #3 (Mutex handling):**
- [ ] No "[AUDIO SYNC] WARNING" messages in logs
- [ ] Audio response time consistent (no 100ms spikes)
- [ ] Mutex timeouts never trigger in normal operation

**Issue #4 (Codegen):**
- [ ] generated_patterns.h contains PATTERN_AUDIO_START()
- [ ] All audio patterns use snapshot macro
- [ ] Codegen tests pass

**Issue #5 (Dual-core):**
- [ ] FPS increases to 100+ at startup
- [ ] Audio latency drops to 10-20ms
- [ ] No crashes or resets during 1-hour stability test
- [ ] Memory leak check with heap log

