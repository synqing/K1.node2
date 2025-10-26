---
author: Claude (SUPREME Analyst)
date: 2025-10-27
status: published
intent: Root cause analysis of tempo magnitude data loss - complete execution trace from audio processing to LED rendering
---

# Tempo Magnitude Data Loss - Root Cause Analysis

## Executive Summary

**CRITICAL BUG FOUND**: Tempo magnitude and phase data are **ZEROED OUT** in `goertzel.cpp:495-496` and **NEVER POPULATED** before buffer swap, resulting in patterns receiving arrays of zeros.

**Impact**: Tempiscope and Beat Tunnel patterns are completely non-functional because `AUDIO_TEMPO_MAGNITUDE(i)` and `AUDIO_TEMPO_PHASE(i)` return 0.0 for all bins.

**Root Cause**: Missing data synchronization between tempo processing (which populates `tempi[]` array) and audio snapshot (which should populate `audio_back.tempo_magnitude[]` array).

---

## Complete Execution Trace

### 1. Audio Processing Pipeline (Core 1 - Audio Task)

#### Step 1.1: Goertzel Frequency Analysis
**File**: `firmware/src/audio/goertzel.cpp:427-509`

```cpp
void calculate_magnitudes() {
    // Line 455-462: Calculate spectrogram from Goertzel filters
    for(uint16_t i = 0; i < NUM_FREQS; i++) {
        spectrogram_average[spectrogram_average_index][i] = spectrogram[i];

        spectrogram_smooth[i] = 0;
        for(uint16_t a = 0; a < NUM_SPECTROGRAM_AVERAGE_SAMPLES; a++) {
            spectrogram_smooth[i] += spectrogram_average[a][i];
        }
        spectrogram_smooth[i] /= float(NUM_SPECTROGRAM_AVERAGE_SAMPLES);
    }

    // Line 483-490: Copy spectrum to audio_back
    if (audio_sync_initialized) {
        memcpy(audio_back.spectrogram, spectrogram, sizeof(float) * NUM_FREQS);
        memcpy(audio_back.spectrogram_smooth, spectrogram_smooth, sizeof(float) * NUM_FREQS);
        audio_back.vu_level = vu_level_calculated;
        audio_back.vu_level_raw = vu_level_calculated * max_val_smooth;

        // Line 492-496: THE BUG - tempo data is zeroed but never populated
        // Comment says "tempo.h will populate these arrays" but it NEVER HAPPENS
        memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);  // ⚠️ ZEROS
        memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);      // ⚠️ ZEROS

        audio_back.update_counter++;
        audio_back.timestamp_us = esp_timer_get_time();
        audio_back.is_valid = true;
    }
}
```

**Result**: `audio_back.tempo_magnitude[]` = **all zeros** ✗
**Result**: `audio_back.tempo_phase[]` = **all zeros** ✗

---

#### Step 1.2: Tempo Detection Processing
**File**: `firmware/src/audio/tempo.cpp:185-219`

```cpp
void calculate_tempo_magnitudes(uint32_t block_index) {
    float max_val = 0.0;

    // Line 190-197: Calculate magnitudes for all tempo bins
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        float magnitude = calculate_magnitude_of_tempo(i);  // Calls Goertzel on novelty curve
        // Line 180: Stores full_scale magnitude in tempi[i].magnitude_full_scale

        if (magnitude > max_val) {
            max_val = magnitude;
        }
    }

    // Line 199-201: Auto-ranging
    if (max_val < 0.04) {
        max_val = 0.04;
    }
    float autoranger_scale = 1.0 / max_val;

    // Line 206-218: Normalize and store in tempi[] array
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        float scaled_magnitude = tempi[i].magnitude_full_scale * autoranger_scale;
        scaled_magnitude = clip_float(scaled_magnitude);  // Clamp to [0.0, 1.0]

        // Line 217: Apply cubic scaling for visualization
        tempi[i].magnitude = scaled_magnitude * scaled_magnitude * scaled_magnitude;
    }
}
```

**Result**: `tempi[i].magnitude` = **valid normalized values (0.0-1.0)** ✓
**Result**: `tempi[i].phase` = **valid phase angles (-π to +π)** ✓
**BUT**: These values are stored in the **local `tempi[]` array**, NOT in `audio_back`!

---

#### Step 1.3: Beat Detection
**File**: `firmware/src/audio/tempo.cpp:269-301`

```cpp
void detect_beats() {
    tempi_power_sum = 0.00000001;

    // Line 273-291: Calculate beat confidence from tempo magnitudes
    for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
        float tempi_magnitude = tempi[tempo_bin].magnitude;  // Read from tempi[]

        // Smooth magnitude
        tempi_smooth[tempo_bin] = tempi_smooth[tempo_bin] * 0.92 + tempi_magnitude * 0.08;
        tempi_power_sum += tempi_smooth[tempo_bin];

        // Calculate beat signal from phase
        tempi[tempo_bin].beat = sin(tempi[tempo_bin].phase);
    }

    // Line 294-300: Calculate confidence
    float max_contribution = 0.000001;
    for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
        float contribution = tempi_smooth[tempo_bin] / tempi_power_sum;
        max_contribution = fmax(contribution, max_contribution);
    }

    tempo_confidence = max_contribution;
}
```

**Result**: `tempo_confidence` = **valid confidence value (0.0-1.0)** ✓
**Result**: `tempi[i].magnitude` = **still valid in local array** ✓
**BUT**: `audio_back.tempo_magnitude[]` = **still all zeros!** ✗

---

#### Step 1.4: Main Audio Task Loop
**File**: `firmware/src/main.cpp:40-64`

```cpp
void audio_task(void* param) {
    while (true) {
        acquire_sample_chunk();        // I2S microphone input
        calculate_magnitudes();        // Goertzel → spectrogram + ZEROS tempo arrays
        get_chromagram();              // Pitch aggregation

        // Beat detection pipeline
        float peak_energy = 0.0f;
        for (int i = 0; i < NUM_FREQS; i++) {
            peak_energy = fmaxf(peak_energy, audio_back.spectrogram[i]);
        }
        update_novelty_curve(peak_energy);

        smooth_tempi_curve();          // Populates tempi[] array (local)
        detect_beats();                // Calculates tempo_confidence

        // Line 60-61: Sync tempo_confidence (only scalar, NOT arrays!)
        extern float tempo_confidence;
        audio_back.tempo_confidence = tempo_confidence;  // ✓ This works

        // ⚠️ MISSING: Copy tempi[].magnitude → audio_back.tempo_magnitude[]
        // ⚠️ MISSING: Copy tempi[].phase → audio_back.tempo_phase[]

        finish_audio_frame();          // Swap buffers → audio_front = audio_back
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
```

**Result**: `audio_back.tempo_confidence` = **valid** ✓
**Result**: `audio_back.tempo_magnitude[]` = **still zeros!** ✗
**Result**: `audio_back.tempo_phase[]` = **still zeros!** ✗

---

#### Step 1.5: Buffer Swap
**File**: `firmware/src/audio/goertzel.cpp:146-166`

```cpp
void commit_audio_data() {
    if (!audio_sync_initialized) return;

    if (xSemaphoreTake(audio_swap_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            // Line 156: Atomic copy - propagates the ZEROS to front buffer
            memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot));

            audio_front.is_valid = true;

            xSemaphoreGive(audio_read_mutex);
            xSemaphoreGive(audio_swap_mutex);
            return;
        }
    }
}
```

**Result**: `audio_front.tempo_magnitude[]` = **zeros copied from audio_back** ✗
**Result**: `audio_front.tempo_phase[]` = **zeros copied from audio_back** ✗

---

### 2. Pattern Rendering Pipeline (Core 0 - Main Task)

#### Step 2.1: Pattern Audio Snapshot Acquisition
**File**: `firmware/src/pattern_audio_interface.h:171-186`

```cpp
#define PATTERN_AUDIO_START() \
    static AudioDataSnapshot audio; \
    static bool audio_available = false; \
    static uint32_t last_audio_update = 0; \
    uint32_t current_time = millis(); \
    if (current_time - last_audio_update > 100) { \
        audio_available = get_audio_snapshot(&audio); \
        last_audio_update = current_time; \
    }
```

**File**: `firmware/src/audio/goertzel.cpp:116-139`

```cpp
bool get_audio_snapshot(AudioDataSnapshot* snapshot) {
    if (!audio_sync_initialized || snapshot == NULL) return false;

    if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        // Line 125: Copy front buffer (which contains zeros)
        memcpy(snapshot, &audio_front, sizeof(AudioDataSnapshot));
        xSemaphoreGive(audio_read_mutex);
        return true;
    }
    return false;
}
```

**Result**: Pattern's `audio` snapshot receives:
- `audio.tempo_magnitude[]` = **all zeros** ✗
- `audio.tempo_phase[]` = **all zeros** ✗
- `audio.tempo_confidence` = **valid** ✓

---

#### Step 2.2: Tempiscope Pattern Rendering
**File**: `firmware/src/generated_patterns.h:620-687`

```cpp
void draw_tempiscope(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Gets audio snapshot

    // Line 633: Check if audio available
    if (!AUDIO_IS_AVAILABLE()) {
        // Fallback animation (works fine)
        return;
    }

    // Line 643-645: Clear LEDs
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(0.0f, 0.0f, 0.0f);
    }

    // Line 651-664: Render tempo bins
    for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
        // Line 653: MACRO EXPANSION
        float magnitude = AUDIO_TEMPO_MAGNITUDE(i);
        // → audio.tempo_magnitude[i]
        // → **0.0**  ⚠️ ZERO!

        float phase = AUDIO_TEMPO_PHASE(i);
        // → audio.tempo_phase[i]
        // → **0.0**  ⚠️ ZERO!

        // Line 658: Phase calculation
        float sine_factor = 1.0f - ((phase + M_PI) / (2.0f * M_PI));
        // → 1.0 - ((0.0 + 3.14159) / 6.28318)
        // → 1.0 - 0.5 = **0.5** (constant, doesn't change)

        // Line 662: Brightness calculation
        float brightness = magnitude * freshness_factor * sine_factor;
        // → **0.0** * 1.0 * 0.5 = **0.0**  ⚠️ ZERO BRIGHTNESS!

        // Line 663: Minimum threshold
        brightness = fmaxf(0.2f, brightness);
        // → fmaxf(0.2, 0.0) = **0.2** (static floor)

        // Line 676-680: Color calculation
        color = color_from_palette(palette_id, hue_progress, brightness);
        // → brightness input = 0.2 (constant), color is dim but static

        // Line 683-685: Apply params.brightness * params.saturation
        leds[i].r = color.r * params.brightness * params.saturation;
        // If params.brightness or saturation are low, this can go to zero
    }
}
```

**Result**:
- Every LED gets `magnitude = 0.0` → `brightness = 0.0` → clamped to 0.2
- Pattern shows **static dim gradient** instead of audio-reactive animation
- No beat synchronization because phase is always 0.0

---

#### Step 2.3: Beat Tunnel Pattern Rendering
**File**: `firmware/src/generated_patterns.h:715-827`

```cpp
void draw_beat_tunnel(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Gets audio snapshot

    // Line 728-730: Clear frame buffer
    for (int i = 0; i < NUM_LEDS; i++) {
        beat_tunnel_image[i] = CRGBF(0.0f, 0.0f, 0.0f);
    }

    // Line 744: Audio availability check
    if (!AUDIO_IS_AVAILABLE()) {
        // Fallback animation (works fine)
    } else {
        // Line 776-818: Audio-reactive rendering
        for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
            // Line 778: MACRO EXPANSION
            float magnitude = AUDIO_TEMPO_MAGNITUDE(i);
            // → audio.tempo_magnitude[i]
            // → **0.0**  ⚠️ ZERO!

            float phase = AUDIO_TEMPO_PHASE(i);
            // → audio.tempo_phase[i]
            // → **0.0**  ⚠️ ZERO!

            // Line 783: Phase normalization
            float phase_normalized = (phase + M_PI) / (2.0f * M_PI);
            // → (0.0 + 3.14159) / 6.28318
            // → **0.5** (constant)

            // Line 788-790: Phase window check
            const float phase_window_center = 0.65f;
            const float phase_window_width = 0.02f;
            float phase_distance = fabsf(phase_normalized - phase_window_center);
            // → fabsf(0.5 - 0.65)
            // → **0.15**

            // Line 792: Window condition
            if (phase_distance < phase_window_width) {
                // → 0.15 < 0.02  ⚠️ FALSE!
                // This block NEVER EXECUTES because phase is stuck at 0.5
                // No LEDs are rendered!
            }
        }
    }
}
```

**Result**:
- Every tempo bin has `phase_normalized = 0.5` (constant)
- Phase distance from window center (0.65) is 0.15
- Window width is only 0.02, so condition **NEVER TRUE**
- Pattern renders **NOTHING** (black LEDs) in audio-reactive mode

---

## Data Flow Summary

### What SHOULD Happen:
```
Microphone → Goertzel → spectrogram[]
             ↓
         novelty_curve[]
             ↓
    Goertzel on novelty → tempi[].magnitude, tempi[].phase
             ↓
    Copy to audio_back → audio_back.tempo_magnitude[], audio_back.tempo_phase[]
             ↓
         Buffer Swap
             ↓
         audio_front
             ↓
      Pattern Snapshot
             ↓
    AUDIO_TEMPO_MAGNITUDE(i) → valid values → LED colors
```

### What ACTUALLY Happens:
```
Microphone → Goertzel → spectrogram[] ✓
             ↓
         novelty_curve[] ✓
             ↓
    Goertzel on novelty → tempi[].magnitude ✓, tempi[].phase ✓
             ↓
    ⚠️ MISSING COPY STEP ⚠️
             ↓
    audio_back.tempo_magnitude[] = 0.0 (zeroed in goertzel.cpp:495)
    audio_back.tempo_phase[] = 0.0 (zeroed in goertzel.cpp:496)
             ↓
         Buffer Swap (zeros propagated)
             ↓
    audio_front.tempo_magnitude[] = 0.0
    audio_front.tempo_phase[] = 0.0
             ↓
      Pattern Snapshot
             ↓
    AUDIO_TEMPO_MAGNITUDE(i) → **0.0** → no brightness/animation
```

---

## Validation of Root Cause

### Evidence 1: Zero Values in Diagnostic Logs
```
[TEMPISCOPE] audio_available=1, tempo_confidence=0.45, brightness=1.0, speed=1.0
```
- `audio_available=1` means snapshot was acquired ✓
- `tempo_confidence=0.45` means beat detection is working ✓
- But patterns show no animation → tempo magnitude/phase must be zero

### Evidence 2: Macro Definition
**File**: `firmware/src/pattern_audio_interface.h:305`
```cpp
#define AUDIO_TEMPO_MAGNITUDE(bin)  (audio.tempo_magnitude[(bin)])
```
- Directly indexes into snapshot array
- No validation, no fallback
- If array is zero, macro returns zero

### Evidence 3: Zeroing Code
**File**: `firmware/src/audio/goertzel.cpp:495-496`
```cpp
// PHASE 2: Tempo data sync for beat/tempo reactive patterns
// tempo.h will populate these arrays after calculating tempi[] and tempi_smooth[]
// For now, zero the arrays - patterns fall back to AUDIO_TEMPO_CONFIDENCE if needed
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```
- Comment says "tempo.h will populate these arrays" but **it never happens**
- Comment says "for now" suggesting placeholder code
- This is **incomplete implementation**

### Evidence 4: Missing Synchronization
**Search**: `audio_back.tempo_magnitude[` in entire codebase
**Result**: Only found in `goertzel.cpp:495` (the memset line)
**No writes found!**

---

## Impact Analysis

### Severity: **CRITICAL** (P0)
- Completely blocks audio-reactive functionality for Tempiscope and Beat Tunnel patterns
- Patterns render static/black output instead of synchronized animations
- User experience: "patterns don't respond to music"

### Affected Code:
1. `firmware/src/audio/goertzel.cpp:495-496` - Zeros arrays, never populates
2. `firmware/src/main.cpp:40-64` - Missing copy loop after `detect_beats()`
3. All patterns using `AUDIO_TEMPO_MAGNITUDE()` or `AUDIO_TEMPO_PHASE()` macros

### Workaround:
None. Patterns cannot access tempo data without the missing synchronization.

---

## Proposed Fix (High-Level)

**Location**: `firmware/src/main.cpp:61` (after `audio_back.tempo_confidence = tempo_confidence;`)

**Add**:
```cpp
// Sync per-bin tempo magnitude and phase arrays (CRITICAL FIX)
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;  // Normalized, auto-ranged
    audio_back.tempo_phase[i] = tempi[i].phase;          // Radians, -π to +π
}
```

**Rationale**:
- After `detect_beats()`, `tempi[]` array is fully populated with valid data
- This copies local `tempi[]` data into shared snapshot buffer
- Subsequent `finish_audio_frame()` call propagates data to `audio_front`
- Patterns receive valid magnitude/phase values via macros

**Expected Result**:
- `AUDIO_TEMPO_MAGNITUDE(i)` returns valid 0.0-1.0 values
- `AUDIO_TEMPO_PHASE(i)` returns valid -π to +π radians
- Tempiscope shows animated brightness modulation per tempo bin
- Beat Tunnel shows synchronized "tunnel" effect at beat phase windows

---

## Additional Notes

### Pattern Parameter Interference (Secondary Issue)
**File**: `firmware/src/generated_patterns.h:683-685`
```cpp
leds[i].r = color.r * params.brightness * params.saturation;
leds[i].g = color.g * params.brightness * params.saturation;
leds[i].b = color.b * params.brightness * params.saturation;
```

- Pattern applies `params.brightness` and `params.saturation` multiplicatively
- If user sets `brightness = 0.2`, output is `color * 0.2 * saturation`
- This can **hide** audio reactivity if parameters are low
- **Recommendation**: Verify parameter defaults are high (brightness ≥ 0.8, saturation ≥ 0.9)

### Minimum Brightness Threshold (Design Question)
**File**: `firmware/src/generated_patterns.h:663`
```cpp
brightness = fmaxf(0.2f, brightness); // Raise minimum threshold for visibility
```

- This ensures LEDs never go fully dark (minimum 20% brightness)
- **Side effect**: Masks silence detection (no visual difference between 0.0 and 0.2)
- **Recommendation**: Consider lowering threshold to 0.05 or removing entirely after fix

---

## Traceability

**Related Files**:
- `firmware/src/pattern_audio_interface.h:305-353` (Macro definitions)
- `firmware/src/audio/goertzel.h:72-83` (tempo struct definition)
- `firmware/src/audio/goertzel.cpp:495-496` (Bug location - zeroing)
- `firmware/src/audio/tempo.cpp:185-219` (Magnitude calculation)
- `firmware/src/main.cpp:40-64` (Missing synchronization)
- `firmware/src/generated_patterns.h:620-687` (Tempiscope pattern)
- `firmware/src/generated_patterns.h:715-827` (Beat Tunnel pattern)

**Related ADRs**:
- None yet (should create ADR for tempo data synchronization strategy)

**Test Strategy**:
1. Add copy loop to `main.cpp:61`
2. Verify `audio_back.tempo_magnitude[]` contains non-zero values (add Serial.printf)
3. Verify patterns show dynamic brightness/phase changes during music playback
4. Measure performance impact of additional 128-float copy (64 magnitude + 64 phase)
5. Validate Beat Tunnel tunnel effect appears at correct phase windows

---

## Conclusion

The root cause is **incomplete implementation** of the tempo data synchronization pipeline. The local `tempi[]` array is correctly populated with magnitude and phase values, but these values are never copied to the shared `audio_back` snapshot buffer before the buffer swap occurs. Patterns receive arrays of zeros, resulting in static/black output instead of audio-reactive animations.

The fix is straightforward: add a copy loop after `detect_beats()` in `main.cpp` to synchronize `tempi[].magnitude` and `tempi[].phase` into `audio_back.tempo_magnitude[]` and `audio_back.tempo_phase[]` before calling `finish_audio_frame()`.
