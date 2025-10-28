---
title: Tempo Data Flow - Visual Reference
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Tempo Data Flow - Visual Reference

**Author:** Claude (SUPREME Analyst)
**Date:** 2025-10-27
**Status:** Bug Documentation
**Intent:** Visual data flow showing where tempo synchronization breaks

---

## Complete Data Flow (Working vs Broken Paths)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 1: Tempo Calculation (tempo.cpp)                       ┃
┃ Status: ✅ WORKING CORRECTLY                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    calculate_magnitude_of_tempo(tempo_bin)
    ├─ Goertzel DFT over novelty_curve_normalized[512]
    ├─ real = (q1 - q2 * cosine)
    ├─ imag = (q2 * sine)
    ├─ phase = atan2(imag, real) + offset
    ├─ magnitude = sqrt(q1² + q2² - q1*q2*coeff) / (block_size/2)
    │
    └─ ✅ tempi[tempo_bin].phase = phase           (line 164)
       ✅ tempi[tempo_bin].magnitude_full_scale = magnitude  (line 180)

    calculate_tempo_magnitudes(block_index)
    └─ For all 64 bins:
       ├─ max_val = find_max(all magnitudes)
       ├─ autoranger_scale = 1.0 / max_val
       └─ ✅ tempi[i].magnitude = (magnitude * autoranger)³  (line 217)

    detect_beats()
    └─ For all 64 bins:
       ├─ ✅ tempi_smooth[i] = smooth(tempi[i].magnitude)
       ├─ ✅ Advance tempi[i].phase (wrap to ±π)
       └─ ✅ tempi[i].beat = sin(tempi[i].phase)

                         ↓
            ✅ tempi[64] array populated
            ✅ magnitude range: 0.0-1.0
            ✅ phase range: -π to +π
                         ↓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 2A: Spectrogram Sync (goertzel.cpp)                    ┃
┃ Status: ✅ WORKING CORRECTLY                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    calculate_magnitudes()  [goertzel.cpp:446-509]
    └─ Inside profile_function block:
       ├─ ✅ memcpy(audio_back.spectrogram, spectrogram, 64*4)
       ├─ ✅ memcpy(audio_back.spectrogram_smooth, spectrogram_smooth, 64*4)
       ├─ ✅ audio_back.vu_level = vu_level_calculated * max_val_smooth
       └─ ❌ memset(audio_back.tempo_magnitude, 0, 64*4)  LINE 495
          ❌ memset(audio_back.tempo_phase, 0, 64*4)      LINE 496

                         ↓
        ❌ audio_back.tempo_magnitude[64] = all zeros
        ❌ audio_back.tempo_phase[64] = all zeros
                         ↓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 2B: Chromagram Sync (goertzel.cpp)                     ┃
┃ Status: ✅ WORKING CORRECTLY                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    get_chromagram()  [goertzel.cpp:518-538]
    └─ ✅ memcpy(audio_back.chromagram, chromagram, 12*4)

                         ↓
        ✅ audio_back.chromagram[12] populated
                         ↓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 2C: Tempo Confidence Sync (main.cpp)                   ┃
┃ Status: ⚠️ PARTIAL (only scalar, not arrays)                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    audio_task()  [main.cpp:61]
    └─ ✅ audio_back.tempo_confidence = tempo_confidence

    ❌ MISSING: No code to copy tempi[64] arrays!
    ❌ MISSING: for (i=0; i<64; i++) {
    ❌             audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    ❌             audio_back.tempo_phase[i] = tempi[i].phase;
    ❌           }

                         ↓
        ✅ audio_back.tempo_confidence = valid
        ❌ audio_back.tempo_magnitude[64] = still zeros
        ❌ audio_back.tempo_phase[64] = still zeros
                         ↓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 3: Buffer Commit (goertzel.cpp)                        ┃
┃ Status: ✅ WORKING (but commits zeros)                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    finish_audio_frame()  [goertzel.cpp:545-552]
    └─ commit_audio_data()
       └─ Acquire mutexes
          └─ ✅ memcpy(&audio_front, &audio_back, sizeof(AudioDataSnapshot))
             ├─ ✅ audio_front.spectrogram[64] ← valid data
             ├─ ✅ audio_front.chromagram[12] ← valid data
             ├─ ✅ audio_front.tempo_confidence ← valid scalar
             ├─ ❌ audio_front.tempo_magnitude[64] ← zeros
             └─ ❌ audio_front.tempo_phase[64] ← zeros

                         ↓
        ❌ Front buffer has zeros in tempo arrays
                         ↓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STAGE 4: Pattern Access (pattern_audio_interface.h)          ┃
┃ Status: ❌ READS ZEROS                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

    PATTERN_AUDIO_START()
    └─ get_audio_snapshot(&audio)
       └─ ✅ memcpy(&audio, &audio_front, sizeof(AudioDataSnapshot))
          ├─ ✅ audio.spectrogram[64] ← valid data
          ├─ ✅ audio.chromagram[12] ← valid data
          ├─ ✅ audio.tempo_confidence ← valid scalar
          ├─ ❌ audio.tempo_magnitude[64] ← zeros
          └─ ❌ audio.tempo_phase[64] ← zeros

    Pattern code calls:
    ├─ float mag = AUDIO_TEMPO_MAGNITUDE(32)    → ❌ 0.0
    └─ float phase = AUDIO_TEMPO_PHASE(32)      → ❌ 0.0

                         ↓
        ❌ Pattern sees zeros, cannot react to beat data
```

---

## Side-by-Side Comparison

### ✅ Spectrogram Data Flow (Working)

```
spectrogram[64]                 (global array)
    ↓ [calculate_magnitudes()]
audio_back.spectrogram[64]      (back buffer)
    ↓ [commit_audio_data()]
audio_front.spectrogram[64]     (front buffer)
    ↓ [get_audio_snapshot()]
audio.spectrogram[64]           (pattern snapshot)
    ↓ [AUDIO_SPECTRUM[bin]]
Pattern receives valid data ✅
```

### ❌ Tempo Data Flow (Broken)

```
tempi[64].magnitude             (global array)
    ↓ [❌ NO SYNC CODE!]
audio_back.tempo_magnitude[64]  (back buffer) ← memset to zero!
    ↓ [commit_audio_data()]
audio_front.tempo_magnitude[64] (front buffer) ← zeros copied
    ↓ [get_audio_snapshot()]
audio.tempo_magnitude[64]       (pattern snapshot) ← zeros copied
    ↓ [AUDIO_TEMPO_MAGNITUDE(bin)]
Pattern receives zeros ❌
```

---

## Fix Insertion Point

```
main.cpp audio_task() line 61:

    detect_beats();                     ← ✅ Populates tempi[64] arrays

    audio_back.tempo_confidence = tempo_confidence;  ← ✅ Scalar sync

    // 🔧 INSERT FIX HERE (3 lines):
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = tempi[i].magnitude;
        audio_back.tempo_phase[i] = tempi[i].phase;
    }

    finish_audio_frame();               ← ✅ Commits valid data
```

---

## Memory Layout Verification

### AudioDataSnapshot Structure Size

```c
typedef struct {
    float spectrogram[64];              // 256 bytes
    float spectrogram_smooth[64];       // 256 bytes
    float chromagram[12];               // 48 bytes
    float vu_level;                     // 4 bytes
    float vu_level_raw;                 // 4 bytes
    float novelty_curve;                // 4 bytes
    float tempo_confidence;             // 4 bytes
    float tempo_magnitude[NUM_TEMPI];   // 256 bytes ← ❌ ZEROED
    float tempo_phase[NUM_TEMPI];       // 256 bytes ← ❌ ZEROED
    float fft_smooth[128];              // 512 bytes (unused)
    uint32_t update_counter;            // 4 bytes
    uint32_t timestamp_us;              // 4 bytes
    bool is_valid;                      // 1 byte
} AudioDataSnapshot;

Total: 1609 bytes per buffer
Double-buffered: 3218 bytes total (audio_front + audio_back)
```

**Problem:** 512 bytes (256 + 256) of tempo data are being zeroed every frame.

---

## Affected Patterns

### bloom_light_show (generated_patterns.h:651-654)

```cpp
for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
    float magnitude = AUDIO_TEMPO_MAGNITUDE(i);  // ❌ Returns 0.0
    float phase = AUDIO_TEMPO_PHASE(i);          // ❌ Returns 0.0

    // Pattern expects phase ∈ [-π, π] and magnitude ∈ [0.0, 1.0]
    // Currently receives 0.0 for both, so all LEDs are dark/uniform
}
```

**Visual Impact:** Pattern should show per-bin tempo visualization, but instead shows flat response (all LEDs same color/brightness).

---

### beat_tunnel (generated_patterns.h:776-779)

```cpp
for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
    float magnitude = AUDIO_TEMPO_MAGNITUDE(i);  // ❌ Returns 0.0
    float phase = AUDIO_TEMPO_PHASE(i);          // ❌ Returns 0.0

    // Pattern expects phase for beat synchronization
    // Currently no beat sync occurs (phase = 0.0 constant)
}
```

**Visual Impact:** Pattern should pulse/tunnel synchronized to beat phase, but instead shows static animation (no beat response).

---

## Numerical Ranges

### Expected During Music Playback

```
WORKING DATA (validated):
├─ AUDIO_SPECTRUM[bin]       : 0.0-1.0 ✅ (varies with frequency content)
├─ AUDIO_CHROMAGRAM[bin]     : 0.0-1.0 ✅ (varies with musical key)
├─ AUDIO_VU                  : 0.0-1.0 ✅ (overall volume)
└─ AUDIO_TEMPO_CONFIDENCE    : 0.0-1.0 ✅ (beat detection confidence)

BROKEN DATA (currently):
├─ AUDIO_TEMPO_MAGNITUDE(bin): 0.0    ❌ (should be 0.0-1.0)
└─ AUDIO_TEMPO_PHASE(bin)    : 0.0    ❌ (should be -3.14 to +3.14)
```

### Expected After Fix

```
FIXED DATA:
├─ AUDIO_TEMPO_MAGNITUDE(bin): 0.0-1.0 ✅
│   ├─ Silence         : ~0.0-0.05 (all bins)
│   ├─ Weak beat       : 0.1-0.3 (strongest bin)
│   ├─ Strong beat     : 0.5-1.0 (strongest bin)
│   └─ Polyrhythm      : Multiple bins 0.3-0.7
│
└─ AUDIO_TEMPO_PHASE(bin)    : -3.14 to +3.14 radians ✅
    ├─ Rotates continuously with tempo frequency
    ├─ Wraps at ±π (phase discontinuity)
    └─ sin(phase) gives beat pulse -1.0 to +1.0
```

---

## Performance Cost of Fix

```
Current (broken):
├─ memset(tempo_magnitude, 0, 256 bytes)  [goertzel.cpp:495]
├─ memset(tempo_phase, 0, 256 bytes)      [goertzel.cpp:496]
└─ Total: 512 bytes zeroed per frame

Proposed (fixed):
├─ Remove memset() (saves 512 byte writes)
├─ for loop: 64 iterations × 2 array writes = 128 writes
└─ Total: 512 bytes written per frame (same!)

Net performance change: ±0% (same number of memory writes)
```

**Conclusion:** Fix has ZERO performance impact (replaces memset with loop of same size).

---

## Verification Commands

### Debug Print in Audio Task (main.cpp after line 61)
```cpp
static uint32_t debug_counter = 0;
if (++debug_counter % 100 == 0) {
    Serial.printf("[AUDIO] tempi[32]: mag=%.4f phase=%.4f\n",
                  tempi[32].magnitude, tempi[32].phase);
}
```

**Expected output BEFORE fix:**
```
[AUDIO] tempi[32]: mag=0.3452 phase=-1.2345  ← Valid data in tempi[] array
```

### Debug Print in Pattern (generated_patterns.h bloom_light_show())
```cpp
static uint32_t debug_counter = 0;
if (++debug_counter % 100 == 0) {
    float mag = AUDIO_TEMPO_MAGNITUDE(32);
    float phase = AUDIO_TEMPO_PHASE(32);
    Serial.printf("[PATTERN] AUDIO_TEMPO(32): mag=%.4f phase=%.4f\n", mag, phase);
}
```

**Expected output BEFORE fix:**
```
[PATTERN] AUDIO_TEMPO(32): mag=0.0000 phase=0.0000  ← Zeros reach pattern
```

**Expected output AFTER fix:**
```
[PATTERN] AUDIO_TEMPO(32): mag=0.3452 phase=-1.2345  ← Valid data reaches pattern
```

---

## Conclusion

**Bug Location:** Missing synchronization between `tempi[64]` global array and `audio_back.tempo_magnitude/phase[64]` buffer.

**Fix Location:** `firmware/src/main.cpp:62` (insert 3-line loop)

**Fix Complexity:** Minimal (3 lines + 1 extern declaration)

**Fix Validation:** Add debug prints and observe non-zero values in patterns.

**Performance:** Zero impact (same number of memory writes).

---

**End of Visual Reference**
