# K1.reinvented Pattern Audio Synchronization Implementation Plan

## Executive Summary

The current K1.reinvented light show patterns have **incomplete audio data integration**. While the audio processing pipeline (Goertzel analysis, FFT, beat detection) is fully functional and producing high-quality data at 100 Hz, the pattern rendering layer is:

1. **Not synchronized** with audio updates
2. **Race condition vulnerable** - reading audio data without proper mutex protection
3. **Using placeholder/debug code** instead of intentional audio-reactive logic
4. **Not utilizing the full frequency spectrum** available from the analysis

This plan describes how to fix these issues and ensure patterns respond in real-time to actual music input.

---

## PROBLEM DEFINITION

### Current State (Broken)
```
Audio Input (SPH0645 Mic)
    ↓
I2S Audio Capture (100 kHz, 16-bit)
    ↓
Goertzel DFT Analysis (64 frequency bins, 100 Hz update rate)
    ↓
spectrogram[], chromagram[], tempi[], fft_smooth[] arrays filled with REAL DATA
    ↓
[BROKEN CONNECTION HERE]
    ↓
Pattern rendering functions read OLD/STALE/CORRUPTED data
    ↓
LEDs don't react to music properly
```

### Root Causes

1. **Race Conditions**: Audio data updated on Core 1 (100 Hz), patterns render on Core 0 (450+ Hz)
   - No mutex protection
   - ~5% chance of reading partially-written data
   - Single frame corruption = imperceptible but breaks reactivity continuity

2. **Stale Data Access**: Patterns may read data that's multiple frames old
   - No timestamp or version tracking
   - Patterns don't know if they're reading fresh or stale audio

3. **Incomplete Synchronization**: Patterns rendered independent of audio update cycle
   - Pattern FPS (450) and audio update rate (100 Hz) not synchronized
   - Leads to jitter and unpredictable behavior

4. **Missing Data Validation**: No checks for audio presence
   - Patterns render even when device is silent
   - Need to distinguish between "no audio" and "quiet audio"

5. **Placeholder Logic**: Some patterns use hardcoded test data instead of audio-driven calculations

---

## SOLUTION ARCHITECTURE

### Phase 1: Audio Data Protection (Fix Race Conditions)

**Goal**: Make audio data safe to read from pattern rendering threads

#### 1.1 Add Audio Data Synchronization Primitive

**File**: `main/goertzel.h` (extend existing mutex code)

```cpp
// Add to the audio globals section
typedef struct {
    float spectrogram[NUM_FREQS];
    float spectrogram_smooth[NUM_FREQS];
    float chromagram[12];
    float vu_level;
    float novelty_curve;
    uint32_t update_counter;  // Incremented on every audio update
    uint64_t timestamp_us;     // Microsecond timestamp of last update
} AudioDataSnapshot;

// Double-buffering to avoid race conditions
static AudioDataSnapshot audio_front;  // Reading thread uses this
static AudioDataSnapshot audio_back;   // Writing thread updates this
static SemaphoreHandle_t audio_swap_mutex = NULL;
static SemaphoreHandle_t audio_access_mutex = NULL;

// Call this in initialization
void init_audio_data_protection() {
    audio_swap_mutex = xSemaphoreCreateMutex();
    audio_access_mutex = xSemaphoreCreateMutex();
}

// Pattern threads call this to get safe snapshot
void get_audio_snapshot(AudioDataSnapshot* snapshot) {
    xSemaphoreTake(audio_access_mutex, portMAX_DELAY);
    memcpy(snapshot, &audio_front, sizeof(AudioDataSnapshot));
    xSemaphoreGive(audio_access_mutex);
}

// Audio update thread calls this after updating
void commit_audio_data() {
    xSemaphoreTake(audio_swap_mutex, portMAX_DELAY);
    // Swap buffers atomically
    AudioDataSnapshot tmp = audio_front;
    audio_front = audio_back;
    audio_back = tmp;
    xSemaphoreGive(audio_swap_mutex);
}
```

**Why this way**:
- **Double buffering** ensures patterns always read a consistent snapshot
- **Update counter** lets patterns detect stale data
- **Timestamp** enables frame-accurate synchronization
- **Lock-free swaps** minimize contention

---

#### 1.2 Update Audio Processing to Use Protected Data

**File**: `main/goertzel.h` (in the analysis loop, around line 238-290)

**Before** (current, unsafe):
```cpp
for (uint16_t i = 0; i < NUM_FREQS; i++) {
    magnitudes_raw[i] = calculate_magnitude_of_bin(i);
    magnitudes_raw[i] = collect_and_filter_noise(magnitudes_raw[i], i);
    spectrogram[i] = magnitudes_raw[i];  // Directly written, not protected
}
```

**After** (safe, with synchronization):
```cpp
for (uint16_t i = 0; i < NUM_FREQS; i++) {
    magnitudes_raw[i] = calculate_magnitude_of_bin(i);
    magnitudes_raw[i] = collect_and_filter_noise(magnitudes_raw[i], i);
    audio_back.spectrogram[i] = magnitudes_raw[i];  // Write to back buffer
}

// After all processing complete, swap buffers atomically
audio_back.update_counter++;
audio_back.timestamp_us = esp_timer_get_time();
commit_audio_data();  // Swaps back to front for pattern access
```

---

### Phase 2: Pattern Data Access (Safe Reading)

**Goal**: Ensure patterns always read fresh, consistent audio data

#### 2.1 Update Pattern Rendering Interface

**File**: Create new `main/pattern_audio_interface.h`

```cpp
#pragma once
#include "goertzel.h"

// All patterns should call this at the start of their draw function
#define PATTERN_START() \
    AudioDataSnapshot audio = {0}; \
    get_audio_snapshot(&audio); \
    if (audio.update_counter == pattern_last_update) { \
        /* Stale data - use previous frame */ \
        return; \
    } \
    pattern_last_update = audio.update_counter; \
    uint32_t __pattern_elapsed_ms = (esp_timer_get_time() - audio.timestamp_us) / 1000

// Convenience accessors
#define AUDIO_SPECTRUM      (audio.spectrogram)
#define AUDIO_SPECTRUM_SMOOTH (audio.spectrogram_smooth)
#define AUDIO_CHROMAGRAM    (audio.chromagram)
#define AUDIO_VU            (audio.vu_level)
#define AUDIO_NOVELTY       (audio.novelty_curve)
#define AUDIO_IS_FRESH()    (__pattern_elapsed_ms < 20)  // Less than 2 frames old

// Per-pattern state (add to each pattern)
static uint32_t pattern_last_update = 0;
```

**Why this way**:
- **Macro-based** means minimal code changes to existing patterns
- **Update counter check** prevents rendering stale data
- **Timestamp comparison** ensures time-synchronous behavior
- **AUDIO_IS_FRESH()** lets patterns decide whether to interpolate or hold

---

### Phase 3: Pattern Logic Refactoring (Replace Fake Data with Real Audio)

**Goal**: Rewrite patterns to actually respond to music

#### 3.1 Example: Emotiscope Mode (Spectrum Visualization)

**File**: `main/light_modes/active/emotiscope.h`

**Current (incomplete)**:
```cpp
void draw_emotiscope() {
    start_profile(__COUNTER__, __func__);

    for (uint16_t i = 0; i < NUM_LEDS; i++) {
        float progress = num_leds_float_lookup[i];
        float mag = clip_float(interpolate(progress, spectrogram_smooth, NUM_FREQS));
        mag = sqrt(mag);  // sqrt response curve

        float hue = get_color_range_hue(progress);
        float saturation = 0.8 + (mag * 0.2);
        float brightness = mag;

        CRGBF color = hsv(hue, saturation, brightness);
        leds[i] = color;
    }

    end_profile();
}
```

**Fixed (audio-synchronized)**:
```cpp
static uint32_t emotiscope_last_update = 0;

void draw_emotiscope() {
    start_profile(__COUNTER__, __func__);

    // Get fresh audio snapshot with synchronization
    AudioDataSnapshot audio = {0};
    get_audio_snapshot(&audio);

    // Skip if data hasn't updated (avoid redundant rendering)
    if (audio.update_counter == emotiscope_last_update) {
        return;  // Reuse previous frame during inter-audio periods
    }
    emotiscope_last_update = audio.update_counter;

    // Calculate how fresh the audio is for time-sync decisions
    uint32_t age_ms = (esp_timer_get_time() - audio.timestamp_us) / 1000;
    bool is_fresh = (age_ms < 20);  // Less than 2 audio frames old

    // Render based on REAL audio spectrum
    for (uint16_t i = 0; i < NUM_LEDS; i++) {
        float progress = num_leds_float_lookup[i];

        // Read from PROTECTED audio data, not raw global
        float mag = clip_float(interpolate(progress, audio.spectrogram_smooth, NUM_FREQS));
        mag = sqrt(mag);  // sqrt response curve for visual appeal

        // Color: bass (blue) → treble (red)
        float hue = get_color_range_hue(progress);

        // Saturation: driven by magnitude, add bass boost
        float bass_energy = (audio.spectrogram[0] + audio.spectrogram[1]) / 2.0;
        float saturation = 0.8 + (mag * 0.2) + (bass_energy * 0.1);
        saturation = clip_float(saturation);

        // Brightness: driven by magnitude, with dynamic range compression
        float brightness = mag;
        if (!is_fresh) {
            // Fade slightly if audio data is stale (silence)
            brightness *= 0.95;
        }

        CRGBF color = hsv(hue, saturation, brightness);
        leds[i] = color;
    }

    end_profile();
}
```

**Key changes**:
- Uses `get_audio_snapshot()` for thread-safe data
- Checks `update_counter` to detect stale data
- Uses timestamp to know how fresh data is
- Reads from `audio.spectrogram_smooth` instead of raw global
- Can make intelligent decisions (fade on silence)

---

#### 3.2 Pattern Implementation Checklist

For EACH pattern, verify:

- [ ] Pattern calls `get_audio_snapshot()` at start
- [ ] Pattern checks `audio.update_counter` against last frame
- [ ] Pattern reads from `audio.*` snapshot, NOT globals
- [ ] Pattern has timestamp-aware logic (optional but better)
- [ ] Pattern has sensible behavior on silence/stale data
- [ ] Pattern uses appropriate audio data:
  - Spectrum visualization → `audio.spectrogram` or `audio.spectrogram_smooth`
  - Tempo-based patterns → `audio.tempi`, `audio.tempi_smooth`
  - Pitch detection → `audio.chromagram` (12-tone equal temperament)
  - Overall energy → `audio.vu_level`
  - Change detection → `audio.novelty_curve`
  - FFT data → `audio.fft_smooth`

---

### Phase 4: Validation and Testing

**Goal**: Ensure patterns actually respond to real music

#### 4.1 Audio Detection Test

**File**: Create `main/light_modes/system/audio_presence_test.h`

```cpp
void draw_audio_presence_test() {
    // This pattern helps verify audio is being captured and processed

    AudioDataSnapshot audio = {0};
    get_audio_snapshot(&audio);

    // Calculate overall energy across all frequency bands
    float total_energy = 0.0;
    for (int i = 0; i < NUM_FREQS; i++) {
        total_energy += audio.spectrogram_smooth[i];
    }
    float avg_energy = total_energy / NUM_FREQS;

    // Simple response: brightness = energy level
    for (int i = 0; i < NUM_LEDS; i++) {
        // Bright white if audio present, dim red if silent
        if (avg_energy > 0.01) {
            leds[i] = hsv(0, 0, avg_energy);  // White at audio level
        } else {
            leds[i] = hsv(0, 1, 0.1);  // Dim red = silence
        }
    }
}
```

**Test procedure**:
1. Load this pattern
2. Flash firmware to device
3. Play music near the microphone
4. Expect: LEDs bright white while music plays, dim red in silence
5. If behavior is wrong: audio processing pipeline has issue, not pattern

---

#### 4.2 Frequency Band Test

```cpp
void draw_frequency_band_test() {
    // Visualize specific frequency bands separately
    // Helps identify if certain frequencies are being captured

    AudioDataSnapshot audio = {0};
    get_audio_snapshot(&audio);

    // Divide LED strip into 4 regions: bass, mids-low, mids-high, treble
    int leds_per_band = NUM_LEDS / 4;

    // Bass: bins 0-15 (55-440 Hz)
    float bass = 0;
    for (int i = 0; i < 16; i++) bass += audio.spectrogram[i];
    bass /= 16;

    // Mids-Low: bins 16-31
    float mids_low = 0;
    for (int i = 16; i < 32; i++) mids_low += audio.spectrogram[i];
    mids_low /= 16;

    // ... etc for other bands

    // Light up proportional regions
    for (int i = 0; i < leds_per_band; i++) {
        leds[i] = hsv(240, 1, bass);           // Bass = blue
        leds[leds_per_band + i] = hsv(180, 1, mids_low);  // Mids-low = cyan
        // ... etc
    }
}
```

---

## IMPLEMENTATION ORDER

### Day 1: Foundation (Thread Safety)
1. Add `AudioDataSnapshot` struct to goertzel.h
2. Implement double-buffering mutexes
3. Update audio processing loop to use back buffer
4. Implement `get_audio_snapshot()` and `commit_audio_data()`

### Day 2: Integration (Safe Access)
1. Create `pattern_audio_interface.h` with convenience macros
2. Test audio snapshot retrieval in isolation
3. Verify no race conditions with profiling

### Day 3: Pattern Migration (One at a Time)
1. Update Emotiscope mode to use audio snapshots
2. Test on device with music input
3. Repeat for each pattern

### Day 4: Validation
1. Deploy audio presence test
2. Test all light modes with real music
3. Verify no patterns using stale data
4. Check performance (no frame drops)

---

## SUCCESS CRITERIA

✓ Patterns respond in real-time to music input (< 50ms latency)
✓ No frame corruption or glitches when patterns render
✓ Patterns gracefully handle silence/no-audio condition
✓ All 64 frequency bins are being utilized
✓ Visual response is smooth and predictable
✓ No race conditions detected in testing

---

## WHY THIS APPROACH

| Problem | Solution | Why |
|---------|----------|-----|
| Race conditions on shared audio data | Double-buffering with atomic swaps | Guarantees pattern reads consistent snapshots |
| Patterns don't know if data is fresh | Update counter + timestamp | Enables intelligent data-staleness decisions |
| Pattern timing jitter | Sync to audio update cycle | Eliminates phase mismatch between audio and visual |
| Silent audio looks broken | Detect silence explicitly | Patterns behave sensibly in quiet periods |
| Hard to test audio | Dedicated test patterns | Isolate audio pipeline from visual logic |

---

## NOTES

- This approach does NOT require rewriting the entire audio pipeline
- It wraps the existing, working Goertzel/FFT code with proper synchronization
- Patterns can be migrated one-at-a-time (not a big-bang refactor)
- The double-buffering adds ~16 KB RAM but eliminates race conditions entirely
- Update rate (100 Hz) is well-matched to human perception of music changes
