---
title: Tempo Data Synchronization Issue - Root Cause Analysis
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Tempo Data Synchronization Issue - Root Cause Analysis

**Author:** Claude (SUPREME Analyst)
**Date:** 2025-10-27
**Status:** Critical Bug Identified
**Intent:** Document the complete data flow gap preventing tempo_magnitude and tempo_phase from reaching patterns

---

## Executive Summary

**CRITICAL BUG FOUND:** Tempo magnitude and phase data is being calculated correctly but **never copied to the AudioDataSnapshot** that patterns read from. The data flow has a missing synchronization step between tempo.cpp computation and the audio_back buffer.

**Impact:** All tempo-reactive patterns calling `AUDIO_TEMPO_MAGNITUDE(bin)` or `AUDIO_TEMPO_PHASE(bin)` receive **zeros** instead of actual beat data.

**Root Cause:** Lines 495-496 in `goertzel.cpp` explicitly zero out the tempo arrays with `memset()`, and there is no code anywhere that copies `tempi[].magnitude` and `tempi[].phase` to `audio_back.tempo_magnitude[]` and `audio_back.tempo_phase[]`.

---

## Data Flow Analysis (Line-by-Line Trace)

### Phase 1: Tempo Calculation (✅ Working)

**File:** `firmware/src/audio/tempo.cpp`

#### calculate_magnitude_of_tempo() - Lines 132-183

```cpp
float calculate_magnitude_of_tempo(uint16_t tempo_bin) {
    // Line 140-151: Goertzel filter over novelty curve
    // Line 159-161: Extract magnitude and phase from Goertzel state
    float real = (q1 - q2 * cosine);
    float imag = (q2 * sine);

    // Line 164-171: Calculate and store phase in tempi[] array
    tempi[tempo_bin].phase = (unwrap_phase(atan2(imag, real)) + (PI * BEAT_SHIFT_PERCENT));

    // Line 174-176: Calculate magnitude
    float magnitude_squared = (q1 * q1) + (q2 * q2) - q1 * q2 * tempi[tempo_bin].coeff;
    float magnitude = sqrt(magnitude_squared);
    float normalized_magnitude = magnitude / (block_size / 2.0);

    // Line 180: Store magnitude in tempi[] array
    tempi[tempo_bin].magnitude_full_scale = normalized_magnitude;

    return normalized_magnitude;
}
```

**Status:** ✅ **Data is being computed and stored in `tempi[64]` global array**

---

#### calculate_tempo_magnitudes() - Lines 185-219

```cpp
void calculate_tempo_magnitudes(uint32_t block_index) {
    float max_val = 0.0;

    // Lines 190-197: First pass - calculate all magnitudes and find max
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        float magnitude = calculate_magnitude_of_tempo(i);
        // tempi[i].magnitude_full_scale and tempi[i].phase are now set

        if (magnitude > max_val) {
            max_val = magnitude;
        }
    }

    // Lines 206-218: Second pass - normalize and store in tempi[].magnitude
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        float scaled_magnitude = tempi[i].magnitude_full_scale * autoranger_scale;
        // ...bounds checking...

        // Line 217: Store normalized magnitude
        tempi[i].magnitude = scaled_magnitude * scaled_magnitude * scaled_magnitude;
    }
}
```

**Status:** ✅ **Auto-ranged magnitudes stored in `tempi[i].magnitude` (0.0-1.0 range)**

---

#### detect_beats() - Lines 269-301

```cpp
void detect_beats() {
    for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
        float tempi_magnitude = tempi[tempo_bin].magnitude;  // ✅ Reading from tempi[] array

        // Line 278: Smooth magnitude
        tempi_smooth[tempo_bin] = tempi_smooth[tempo_bin] * 0.92 + (tempi_magnitude) * 0.08;

        // Lines 282-287: Advance beat phase
        if (tempi[tempo_bin].phase > PI) {
            tempi[tempo_bin].phase -= (2 * PI);
        }
        else if (tempi[tempo_bin].phase < -PI) {
            tempi[tempo_bin].phase += (2 * PI);
        }

        // Line 290: Calculate beat value from phase
        tempi[tempo_bin].beat = sin(tempi[tempo_bin].phase);
    }

    // Lines 294-300: Calculate tempo_confidence
    tempo_confidence = max_contribution;
}
```

**Status:** ✅ **All 64 tempo bins have valid magnitude and phase data in `tempi[]` array**

---

### Phase 2: Main Loop Integration (✅ Working)

**File:** `firmware/src/main.cpp`

#### audio_task() - Lines 29-75

```cpp
void audio_task(void* param) {
    while (true) {
        acquire_sample_chunk();        // ✅ I2S microphone data
        calculate_magnitudes();        // ✅ Spectrogram computed
        get_chromagram();              // ✅ Chromagram computed

        // Lines 44-56: Beat detection pipeline
        float peak_energy = 0.0f;
        for (int i = 0; i < NUM_FREQS; i++) {
            peak_energy = fmaxf(peak_energy, audio_back.spectrogram[i]);
        }

        update_novelty_curve(peak_energy);  // ✅ Novelty curve updated
        smooth_tempi_curve();               // ✅ Calls calculate_tempo_magnitudes()
        detect_beats();                     // ✅ Calls detect_beats(), updates tempi[]

        // Line 61: Sync tempo_confidence (ONLY tempo_confidence!)
        extern float tempo_confidence;
        audio_back.tempo_confidence = tempo_confidence;  // ✅ ONE scalar copied

        // Line 64: Commit audio frame
        finish_audio_frame();  // ❌ This is where tempo arrays SHOULD be copied

        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
```

**Status:** ✅ **Tempo computation pipeline runs successfully**
**Problem:** Only `tempo_confidence` scalar is copied to `audio_back`, but the 64-element arrays are **NOT** copied

---

### Phase 3: Snapshot Synchronization (❌ BROKEN)

**File:** `firmware/src/audio/goertzel.cpp`

#### calculate_magnitudes() - Lines 495-496

```cpp
// PHASE 2: Tempo data sync for beat/tempo reactive patterns
// tempo.h will populate these arrays after calculating tempi[] and tempi_smooth[]
// For now, zero the arrays - patterns fall back to AUDIO_TEMPO_CONFIDENCE if needed
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);  // ❌ ZEROS!
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);      // ❌ ZEROS!
```

**Status:** ❌ **CRITICAL BUG: Arrays are explicitly zeroed and never populated**

**Comment Analysis:**
- "tempo.h will populate these arrays" — **FALSE**: No such code exists
- "For now, zero the arrays" — **PERMANENT**: This is the production code path
- "patterns fall back to AUDIO_TEMPO_CONFIDENCE" — **INCOMPLETE**: Patterns need per-bin data

---

#### finish_audio_frame() - Line 545-552

```cpp
void finish_audio_frame() {
    if (!audio_sync_initialized) {
        return;
    }

    // Commit the back buffer to the front buffer (atomic swap)
    commit_audio_data();  // ❌ Copies audio_back (with zeros) to audio_front
}
```

**Status:** ❌ **Copies zeroed arrays to front buffer — patterns see zeros**

---

#### commit_audio_data() - Lines 146-187

```cpp
void commit_audio_data() {
    if (xSemaphoreTake(audio_swap_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        if (xSemaphoreTake(audio_read_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            // Line 156: Atomic swap - copies entire struct
            memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot));

            // ❌ audio_back.tempo_magnitude[0..63] = all zeros
            // ❌ audio_back.tempo_phase[0..63] = all zeros
            // ✅ audio_back.tempo_confidence = valid value (from main.cpp:61)

            audio_front.is_valid = true;

            xSemaphoreGive(audio_read_mutex);
            xSemaphoreGive(audio_swap_mutex);
            return;
        }
    }
}
```

**Status:** ❌ **Copies valid struct, but tempo arrays contain zeros**

---

### Phase 4: Pattern Access (❌ Reads Zeros)

**File:** `firmware/src/pattern_audio_interface.h`

#### Macro Definitions - Lines 305-336

```cpp
#define AUDIO_TEMPO_MAGNITUDE(bin)  (audio.tempo_magnitude[(bin)])  // ❌ Returns 0.0
#define AUDIO_TEMPO_PHASE(bin)      (audio.tempo_phase[(bin)])      // ❌ Returns 0.0
```

**Status:** ❌ **Macros work correctly but read from zeroed arrays**

---

## Data Structure Reference

### AudioDataSnapshot (goertzel.h lines 87-113)

```cpp
typedef struct {
    float spectrogram[NUM_FREQS];           // ✅ Populated correctly
    float spectrogram_smooth[NUM_FREQS];    // ✅ Populated correctly
    float chromagram[12];                   // ✅ Populated correctly
    float vu_level;                         // ✅ Populated correctly
    float vu_level_raw;                     // ✅ Populated correctly
    float novelty_curve;                    // ✅ Populated correctly
    float tempo_confidence;                 // ✅ Populated (main.cpp:61)

    float tempo_magnitude[NUM_TEMPI];       // ❌ ZEROED (goertzel.cpp:495)
    float tempo_phase[NUM_TEMPI];           // ❌ ZEROED (goertzel.cpp:496)

    float fft_smooth[128];                  // ⚠️ Not implemented yet
    uint32_t update_counter;                // ✅ Populated correctly
    uint32_t timestamp_us;                  // ✅ Populated correctly
    bool is_valid;                          // ✅ Populated correctly
} AudioDataSnapshot;
```

---

### tempo struct (goertzel.h lines 73-83)

```cpp
typedef struct {
    float magnitude;                        // ✅ Normalized 0.0-1.0 (tempo.cpp:217)
    float magnitude_full_scale;             // ✅ Full-scale value (tempo.cpp:180)
    float magnitude_smooth;                 // ⚠️ Unused
    float beat;                             // ✅ sin(phase) (tempo.cpp:290)
    float phase;                            // ✅ Radians -π to π (tempo.cpp:164)
    float target_tempo_hz;                  // ✅ Initialized (tempo.cpp:85)
    uint16_t block_size;                    // ✅ Initialized (tempo.cpp:116)
    float window_step;                      // ✅ Initialized (tempo.cpp:128)
    float coeff;                            // ✅ Initialized (tempo.cpp:126)
} tempo;
```

**Global Array:**
```cpp
extern tempo tempi[NUM_TEMPI];  // ✅ Contains valid data, but NEVER synchronized
```

---

## Missing Synchronization Code

**What SHOULD happen after line 61 in main.cpp:**

```cpp
// BEFORE finish_audio_frame(), copy tempo arrays:
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
```

**OR, remove memset() in goertzel.cpp:495-496 and add sync in tempo.cpp:**

```cpp
// In calculate_tempo_magnitudes() after line 218:
if (audio_sync_initialized) {
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = tempi[i].magnitude;
        audio_back.tempo_phase[i] = tempi[i].phase;
    }
}
```

---

## Evidence of Correct Computation

### 1. Phase Values Are Computed (tempo.cpp:164)
```cpp
tempi[tempo_bin].phase = (unwrap_phase(atan2(imag, real)) + (PI * BEAT_SHIFT_PERCENT));
```
- ✅ Uses `atan2()` for correct quadrant determination
- ✅ Unwraps phase to [-π, π] range
- ✅ Applies beat shift offset
- ✅ Stored in `tempi[tempo_bin].phase`

### 2. Magnitude Values Are Auto-Ranged (tempo.cpp:208-217)
```cpp
float scaled_magnitude = tempi[i].magnitude_full_scale * autoranger_scale;
if (scaled_magnitude < 0.0) scaled_magnitude = 0.0;
if (scaled_magnitude > 1.0) scaled_magnitude = 1.0;
tempi[i].magnitude = scaled_magnitude * scaled_magnitude * scaled_magnitude;  // Cubic scaling
```
- ✅ Auto-ranging ensures max bin = 1.0
- ✅ Cubic scaling for better visualization
- ✅ Clamped to [0.0, 1.0] range
- ✅ Stored in `tempi[i].magnitude`

### 3. Beat Detection Uses Tempo Data (tempo.cpp:275-290)
```cpp
float tempi_magnitude = tempi[tempo_bin].magnitude;  // ✅ Reading valid data
tempi_smooth[tempo_bin] = tempi_smooth[tempo_bin] * 0.92 + (tempi_magnitude) * 0.08;
tempi[tempo_bin].beat = sin(tempi[tempo_bin].phase);  // ✅ Using valid phase
```
- ✅ Smoothing uses `tempi[].magnitude` (would fail if data was invalid)
- ✅ Beat calculation uses `tempi[].phase` (would produce garbage if zero)
- ✅ Confidence calculation relies on magnitude distribution

---

## Thread Synchronization Analysis

### Core 1 (Audio Task) - Lines 29-75 in main.cpp

```
acquire_sample_chunk()        [12800 Hz → 64 samples = 5ms]
calculate_magnitudes()        [15-25ms Goertzel computation]
  ├─ updates audio_back.spectrogram[64]          ✅
  ├─ updates audio_back.spectrogram_smooth[64]   ✅
  └─ ZEROS audio_back.tempo_magnitude[64]        ❌ Line 495
     ZEROS audio_back.tempo_phase[64]            ❌ Line 496
get_chromagram()              [1ms]
  └─ updates audio_back.chromagram[12]           ✅
update_novelty_curve()        [<1ms]
smooth_tempi_curve()          [2-5ms]
  └─ updates tempi[64].magnitude                 ✅ (NOT synced)
     updates tempi[64].phase                     ✅ (NOT synced)
detect_beats()                [1ms]
  └─ updates tempo_confidence                    ✅
audio_back.tempo_confidence = tempo_confidence   ✅ Line 61
finish_audio_frame()          [0-5ms]
  └─ commit_audio_data()
     └─ memcpy(&audio_front, &audio_back, ...)  ❌ Copies zeros
```

**Total Time:** ~25-35ms per frame (28-35 Hz actual rate)

---

### Core 0 (Pattern Rendering) - Lines 192-213 in main.cpp

```
draw_current_pattern(time, params)
  └─ PATTERN_AUDIO_START()
     └─ get_audio_snapshot(&audio)
        └─ memcpy(&audio, &audio_front, ...)    ❌ Receives zeros
           AUDIO_TEMPO_MAGNITUDE(bin)            ❌ Returns 0.0
           AUDIO_TEMPO_PHASE(bin)                ❌ Returns 0.0
transmit_leds()
```

**Pattern reads valid spectrogram, chromagram, VU, tempo_confidence, but ZERO tempo arrays.**

---

## Initialization Analysis

### Tempo Array Initialization (tempo.cpp:73-130)

```cpp
void init_tempo_goertzel_constants() {
    // Lines 75-81: Initialize tempo center frequencies (32-192 BPM)
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        float progress = float(i) / NUM_TEMPI;
        float tempi_range = TEMPO_HIGH - TEMPO_LOW;
        float tempo = tempi_range * progress + TEMPO_LOW;
        tempi_bpm_values_hz[i] = tempo / 60.0;  // BPM to Hz
    }

    // Lines 84-129: Initialize Goertzel filter coefficients
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        tempi[i].target_tempo_hz = tempi_bpm_values_hz[i];
        // ...calculate block size, Goertzel coeff, window_step...
    }
}
```

**Status:** ✅ **Initialization is correct and complete**

**Note:** `tempi[].magnitude` and `tempi[].phase` are **NOT** initialized to zero — they start with garbage values, but are correctly populated on first frame.

---

## AudioDataSnapshot Initialization (goertzel.cpp:136-144)

```cpp
void init_audio_data_sync() {
    // Create mutexes
    audio_swap_mutex = xSemaphoreCreateMutex();
    audio_read_mutex = xSemaphoreCreateMutex();

    // Zero out buffers
    memset(&audio_front, 0, sizeof(AudioDataSnapshot));
    memset(&audio_back, 0, sizeof(AudioDataSnapshot));

    audio_sync_initialized = true;
}
```

**Status:** ✅ **Buffers initialized to zero (correct for startup)**

**Problem:** After first frame, `audio_back.tempo_magnitude/phase` are **re-zeroed** every frame (line 495-496), so they never contain non-zero values.

---

## Numerical Range Verification

### Expected Tempo Magnitude Range

**Based on tempo.cpp:208-217:**
```
scaled_magnitude = tempi[i].magnitude_full_scale * autoranger_scale;
// Clamped to [0.0, 1.0]
tempi[i].magnitude = scaled_magnitude^3;  // Cubic scaling
```

**Expected values during music playback:**
- **Silence:** magnitude ≈ 0.0-0.05 (all bins)
- **Weak beat:** magnitude ≈ 0.1-0.3 (strongest bin)
- **Strong beat:** magnitude ≈ 0.5-1.0 (strongest bin)
- **Multiple bins active (polyrhythm):** Multiple bins 0.3-0.7

**Actual values patterns receive:** **0.0** (all bins, always)

---

### Expected Tempo Phase Range

**Based on tempo.cpp:164-171:**
```
tempi[tempo_bin].phase = unwrap_phase(atan2(imag, real)) + offset;
// Wrapped to [-π, π]
```

**Expected values during music playback:**
- **Phase range:** -3.14159 to +3.14159 radians
- **Phase progression:** Advances by `2π * tempo_hz / frame_rate` per frame
- **Phase wrapping:** Jumps from +π to -π at beat boundary
- **sin(phase) range:** -1.0 to +1.0 (beat signal)

**Actual values patterns receive:** **0.0** (all bins, always)

---

## Race Condition Analysis

### Is there a thread synchronization issue?

**NO.** The mutexes work correctly. The issue is that the data is **never written** in the first place.

**Mutex acquisition order (deadlock-safe):**
1. Core 1 audio task acquires `audio_swap_mutex` → writes `audio_back` → commits via `commit_audio_data()`
2. `commit_audio_data()` acquires both `audio_swap_mutex` and `audio_read_mutex` → copies `audio_back` to `audio_front`
3. Core 0 pattern task calls `get_audio_snapshot()` → acquires `audio_read_mutex` → copies `audio_front` to local snapshot

**Proof of correct synchronization:**
- Spectrogram data reaches patterns ✅
- Chromagram data reaches patterns ✅
- VU level reaches patterns ✅
- tempo_confidence reaches patterns ✅

**Only tempo arrays fail because they are zeroed before commit.**

---

## Verification Tests

### Test 1: Check if tempi[] array contains valid data

**Add to main.cpp audio_task() after line 56:**
```cpp
// DEBUG: Print tempo data before sync
static uint32_t debug_counter = 0;
if (++debug_counter % 100 == 0) {  // Print every 100 frames (every ~3 seconds)
    Serial.printf("[TEMPO DEBUG] tempi[32].magnitude = %.4f, phase = %.4f\n",
                  tempi[32].magnitude, tempi[32].phase);
}
```

**Expected result if data is valid:**
- Magnitude: 0.0-1.0 (varies with music)
- Phase: -3.14 to +3.14 (rotates continuously)

---

### Test 2: Check if audio_back contains zeros

**Add to main.cpp audio_task() after line 61:**
```cpp
// DEBUG: Print audio_back tempo data before commit
static uint32_t debug_counter2 = 0;
if (++debug_counter2 % 100 == 0) {
    Serial.printf("[AUDIO_BACK DEBUG] audio_back.tempo_magnitude[32] = %.4f, phase = %.4f\n",
                  audio_back.tempo_magnitude[32], audio_back.tempo_phase[32]);
}
```

**Expected result (current buggy code):**
- Magnitude: 0.0000 (always zero)
- Phase: 0.0000 (always zero)

---

### Test 3: Check if patterns receive zeros

**Add to any pattern (e.g., generated_patterns.h bloom_light_show()):**
```cpp
// DEBUG: Print pattern-side tempo data
static uint32_t debug_counter3 = 0;
if (++debug_counter3 % 100 == 0) {
    float mag = AUDIO_TEMPO_MAGNITUDE(32);
    float phase = AUDIO_TEMPO_PHASE(32);
    Serial.printf("[PATTERN DEBUG] AUDIO_TEMPO_MAGNITUDE(32) = %.4f, phase = %.4f\n",
                  mag, phase);
}
```

**Expected result (current buggy code):**
- Magnitude: 0.0000 (always zero)
- Phase: 0.0000 (always zero)

---

## Fix Implementation Options

### Option 1: Sync in main.cpp (Recommended)

**Location:** `firmware/src/main.cpp:62` (after tempo_confidence sync)

**Add:**
```cpp
// SYNC TEMPO ARRAYS to audio_back (after detect_beats() completes)
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
```

**Pros:**
- Minimal change (3 lines)
- Co-located with tempo_confidence sync (line 61)
- Clear ownership (audio task owns sync)
- No extern declarations needed (tempi[] already accessible)

**Cons:**
- Requires `extern tempo tempi[NUM_TEMPI];` declaration (add to audio/tempo.h)

---

### Option 2: Sync in tempo.cpp

**Location:** `firmware/src/audio/tempo.cpp:219` (after calculate_tempo_magnitudes())

**Replace calculate_tempo_magnitudes() with:**
```cpp
void calculate_tempo_magnitudes(uint32_t block_index) {
    // ...existing magnitude calculation...

    // NEW: Sync to audio_back if initialized
    extern bool audio_sync_initialized;
    extern AudioDataSnapshot audio_back;

    if (audio_sync_initialized) {
        for (uint16_t i = 0; i < NUM_TEMPI; i++) {
            audio_back.tempo_magnitude[i] = tempi[i].magnitude;
            audio_back.tempo_phase[i] = tempi[i].phase;
        }
    }
}
```

**Pros:**
- Encapsulates sync logic in tempo module
- Automatic sync after every calculation

**Cons:**
- Requires extern declarations for audio_back (breaks encapsulation)
- Sync happens 2 times per frame (lines 249-250) — redundant
- Tighter coupling between tempo.cpp and goertzel.cpp

---

### Option 3: Remove memset() and sync in goertzel.cpp

**Location:** `firmware/src/audio/goertzel.cpp:495-496`

**Remove these lines:**
```cpp
// DELETE THESE:
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```

**Add after line 503 (inside calculate_magnitudes() profiler block):**
```cpp
// SYNC TEMPO ARRAYS (called after tempo detection in main.cpp)
extern tempo tempi[NUM_TEMPI];
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
```

**Pros:**
- Co-located with other audio_back syncs (spectrogram, chromagram)

**Cons:**
- Sync happens BEFORE tempo detection runs (wrong order)
- Would need to move sync to after finish_audio_frame() call (awkward)

---

## Recommended Fix (Option 1 with Details)

### Step 1: Declare tempi[] as extern in tempo.h

**File:** `firmware/src/audio/tempo.h`
**Location:** After line 40 (global data section)

**Add:**
```cpp
// Tempo bin state (populated by calculate_tempo_magnitudes() and detect_beats())
extern tempo tempi[NUM_TEMPI];
```

---

### Step 2: Sync arrays in main.cpp audio_task()

**File:** `firmware/src/main.cpp`
**Location:** Replace lines 58-64

**Before:**
```cpp
        // SYNC TEMPO CONFIDENCE TO AUDIO SNAPSHOT (NEW - FIX)
        // Copy calculated tempo_confidence to audio_back so patterns can access it
        extern float tempo_confidence;  // From tempo.cpp
        audio_back.tempo_confidence = tempo_confidence;

        // Buffer synchronization
        finish_audio_frame();          // ~0-5ms buffer swap
```

**After:**
```cpp
        // SYNC TEMPO DATA TO AUDIO SNAPSHOT
        // Copy tempo_confidence, tempo_magnitude[], and tempo_phase[] to audio_back
        extern float tempo_confidence;  // From tempo.cpp
        extern tempo tempi[NUM_TEMPI];  // From tempo.cpp

        audio_back.tempo_confidence = tempo_confidence;

        // Copy all 64 tempo bin magnitudes and phases
        for (uint16_t i = 0; i < NUM_TEMPI; i++) {
            audio_back.tempo_magnitude[i] = tempi[i].magnitude;
            audio_back.tempo_phase[i] = tempi[i].phase;
        }

        // Buffer synchronization
        finish_audio_frame();          // ~0-5ms buffer swap
```

---

### Step 3: Remove memset() in goertzel.cpp

**File:** `firmware/src/audio/goertzel.cpp`
**Location:** Lines 492-496

**Before:**
```cpp
			// PHASE 2: Tempo data sync for beat/tempo reactive patterns
			// tempo.h will populate these arrays after calculating tempi[] and tempi_smooth[]
			// For now, zero the arrays - patterns fall back to AUDIO_TEMPO_CONFIDENCE if needed
			memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
			memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```

**After:**
```cpp
			// PHASE 2: Tempo data sync for beat/tempo reactive patterns
			// Synced by main.cpp audio_task() after detect_beats() completes
			// (No memset needed — data is populated before finish_audio_frame())
```

---

### Performance Impact

**Additional computation per frame:**
- Loop: 64 iterations
- Operations per iteration: 2 array writes
- Total: 128 float writes ≈ **512 bytes of memory writes**

**Estimated time:** ~10-20 microseconds (negligible compared to 25-35ms audio processing)

**Memory:** No additional memory required (arrays already allocated in AudioDataSnapshot)

---

## Validation Steps

### After applying fix:

1. **Compile and upload firmware**
2. **Add debug output to pattern:**
   ```cpp
   // In any tempo-reactive pattern
   float mag = AUDIO_TEMPO_MAGNITUDE(32);
   float phase = AUDIO_TEMPO_PHASE(32);
   Serial.printf("[TEMPO] mag=%.4f phase=%.4f\n", mag, phase);
   ```
3. **Play music and observe Serial output**
4. **Expected results:**
   - Magnitude: 0.0-1.0 (varies with beat strength)
   - Phase: -3.14 to +3.14 (rotates continuously)
   - Both should change with music (not stuck at zero)

5. **Visual validation:**
   - Test bloom_light_show pattern (uses tempo data)
   - Should see per-bin tempo visualization (not all zeros)
   - Beat pulses should be visible and synchronized to music

---

## Related Files

### Files Modified (Minimal Fix)
- `firmware/src/audio/tempo.h` (add extern declaration)
- `firmware/src/main.cpp` (add tempo array sync loop)
- `firmware/src/audio/goertzel.cpp` (remove memset, update comment)

### Files NOT Modified (Already Correct)
- `firmware/src/audio/tempo.cpp` (computation is correct)
- `firmware/src/audio/goertzel.h` (struct definition is correct)
- `firmware/src/pattern_audio_interface.h` (macros are correct)
- `firmware/src/generated_patterns.h` (pattern code is correct)

---

## Conclusion

**Root Cause:** Missing data synchronization between `tempi[]` global array (computed correctly) and `audio_back.tempo_magnitude/phase[]` (zeroed and never updated).

**Impact:** All tempo-reactive patterns receive zeros instead of beat data.

**Fix Complexity:** Minimal (3-line loop + 1 extern declaration + comment update)

**Fix Location:** `firmware/src/main.cpp:62` (audio_task after detect_beats)

**Verification:** Add debug prints and observe non-zero tempo data in patterns.

---

## Appendix: Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CORE 1: Audio Task (main.cpp:29-75)                            │
├─────────────────────────────────────────────────────────────────┤
│ acquire_sample_chunk()                                          │
│   └─ sample_history[4096] ← I2S microphone                     │
│                                                                 │
│ calculate_magnitudes()                                          │
│   ├─ Goertzel DFT → spectrogram[64]                            │
│   ├─ Smooth → spectrogram_smooth[64]                           │
│   └─ Sync to audio_back.spectrogram[64]                  ✅    │
│      BUT ALSO: memset(audio_back.tempo_magnitude, 0, ...) ❌    │
│                memset(audio_back.tempo_phase, 0, ...)     ❌    │
│                                                                 │
│ get_chromagram()                                                │
│   └─ Sync to audio_back.chromagram[12]                   ✅    │
│                                                                 │
│ update_novelty_curve(peak_energy)                              │
│   └─ novelty_curve[512] updated                          ✅    │
│                                                                 │
│ smooth_tempi_curve()                                            │
│   └─ calculate_tempo_magnitudes(bin)                           │
│      └─ calculate_magnitude_of_tempo(i) [for each i]           │
│         ├─ Goertzel over novelty curve                         │
│         ├─ tempi[i].phase ← atan2(imag, real)            ✅    │
│         └─ tempi[i].magnitude_full_scale ← magnitude     ✅    │
│      └─ Auto-range all bins                                    │
│         └─ tempi[i].magnitude ← scaled^3                  ✅    │
│                                                                 │
│ detect_beats()                                                  │
│   ├─ Smooth tempi_smooth[64]                             ✅    │
│   ├─ Advance tempi[i].phase (phase wrapping)             ✅    │
│   ├─ tempi[i].beat ← sin(phase)                          ✅    │
│   └─ Calculate tempo_confidence                          ✅    │
│                                                                 │
│ audio_back.tempo_confidence ← tempo_confidence           ✅    │
│                                                                 │
│ ❌ MISSING: Copy tempi[i].magnitude → audio_back.tempo_magnitude[i]
│ ❌ MISSING: Copy tempi[i].phase → audio_back.tempo_phase[i]    │
│                                                                 │
│ finish_audio_frame()                                            │
│   └─ commit_audio_data()                                       │
│      └─ memcpy(audio_front, audio_back, ...)                   │
│         └─ audio_front.tempo_magnitude[64] = all zeros   ❌    │
│            audio_front.tempo_phase[64] = all zeros       ❌    │
└─────────────────────────────────────────────────────────────────┘

                              ↓ memcpy()

┌─────────────────────────────────────────────────────────────────┐
│ CORE 0: Pattern Rendering (main.cpp:192-213)                   │
├─────────────────────────────────────────────────────────────────┤
│ draw_current_pattern(time, params)                              │
│   └─ PATTERN_AUDIO_START()                                     │
│      └─ get_audio_snapshot(&audio)                             │
│         └─ memcpy(audio, audio_front, ...)                     │
│            ├─ audio.spectrogram[64] ← valid data         ✅    │
│            ├─ audio.chromagram[12] ← valid data          ✅    │
│            ├─ audio.tempo_confidence ← valid scalar      ✅    │
│            ├─ audio.tempo_magnitude[64] ← zeros          ❌    │
│            └─ audio.tempo_phase[64] ← zeros              ❌    │
│                                                                 │
│ Pattern calls:                                                  │
│   float mag = AUDIO_TEMPO_MAGNITUDE(32);  // Returns 0.0  ❌    │
│   float phase = AUDIO_TEMPO_PHASE(32);    // Returns 0.0  ❌    │
└─────────────────────────────────────────────────────────────────┘
```

**Legend:**
- ✅ Working correctly
- ❌ Broken (returns zeros)
- ⚠️ Not implemented yet

---

**End of Analysis**
