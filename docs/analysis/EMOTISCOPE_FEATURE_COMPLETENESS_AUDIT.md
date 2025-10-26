# Emotiscope → K1.reinvented Feature Completeness Audit

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Cross-reference original emotiscope implementation with K1.reinvented to identify missing/incomplete features critical for audio-reactive visualizations

---

## Executive Summary

**3 CRITICAL GAPS IDENTIFIED** - All from original Emotiscope implementation:

1. ❌ **AUDIO_FFT (256-bin FFT)** - Emotiscope has full FFT, K1 has placeholder
2. ❌ **AUDIO_NOVELTY History** - Emotiscope exposes novelty curve history, K1 exposes only instantaneous value
3. ❌ **tempo_magnitude/tempo_phase Population** - Emotiscope populates and uses these, K1 has bug preventing population

---

## Feature-by-Feature Comparison

### 1. AUDIO_FFT Implementation

**Emotiscope Status** ✅ **FULLY IMPLEMENTED**

| Aspect | Details |
|--------|---------|
| Type | 256-bin FFT using ESP-DSP library (dsps_fft4r_fc32) |
| Data Structure | `fft_smooth[1 + NUM_FFT_AVERAGE_SAMPLES][FFT_SIZE>>1]` (5 slots) |
| Window | Hann window (dsps_wind_hann_f32) |
| Processing | Complex FFT → magnitude squared → sqrt + auto-scale |
| Averaging | 4-sample moving average |
| Low-Shelf Filter | 5th-order biquad LPF at 0.25 normalized frequency |
| Auto-Ranging | Peak-detector with 0.99 fallback + clipping |
| Output Range | 0.0-1.0 (clipped) |
| Performance | ~1500µs per frame (profiled in fft.h:104) |
| Memory | ~5 KB for FFT buffers + 1 KB for averaging |

**Source:** `/Users/spectrasynq/Downloads/VP_SOT/refs/SB/ES References/Emotiscope-2.0 3/main/fft.h`

---

**K1.reinvented Status** ❌ **PLACEHOLDER ONLY**

| Aspect | Details |
|--------|---------|
| Type | Reserved (fft_smooth[128] in AudioDataSnapshot, never populated) |
| Implementation | Returns zeros (line 106 of goertzel.h: `float fft_smooth[128];`) |
| Used By | No code references these values |

**Source:** `firmware/src/audio/goertzel.h:106`

---

**Impact Assessment**

**Without FFT:**
- ❌ Fine-grained frequency analysis impossible (64 Goertzel bins not enough for some effects)
- ❌ Real-time spectrogram visualizations degraded
- ❌ Cannot detect harmonic relationships easily
- ❌ FFT-based onset detection not possible (currently using simplified novelty flux)

**With FFT (256 bins):**
- ✅ 8× frequency resolution (6.4 kHz / 256 = 25 Hz bins vs. 100 Hz Goertzel bins)
- ✅ Harmonic analysis, chord detection, timbre
- ✅ Spectrogram waterfall effects
- ✅ Better onset detection
- ✅ Sub-band isolation (isolate kick, snare, vocals in frequency domain)

**Recommendation:** IMPLEMENT (Emotiscope 2.0 required it for visual quality)

---

### 2. AUDIO_NOVELTY History & VU Smoothing

**Emotiscope Status** ✅ **FULLY IMPLEMENTED WITH HISTORY**

| Aspect | Details |
|--------|---------|
| **Novelty Curve** | `novelty_curve[NOVELTY_HISTORY_LENGTH]` (complete history) |
| **Normalized** | `novelty_curve_normalized[NOVELTY_HISTORY_LENGTH]` (auto-scaled version) |
| **Update Rate** | NOVELTY_LOG_HZ (~100 Hz) |
| **History Length** | NOVELTY_HISTORY_LENGTH (typically 512-2048 samples = 5-20 second buffer) |
| **VU History** | `vu_log[NUM_VU_LOG_SAMPLES]` (20 samples × 250ms = 5 second log) |
| **VU Smooth** | `vu_smooth[NUM_VU_SMOOTH_SAMPLES]` (4 samples × ~10ms = real-time smoothing) |
| **Usage** | `log_novelty()` shifts history left, decays by 0.999 per sample |
| **Access** | Full history available to patterns via `novelty_curve[]` array |

**Source:** `tempo.h:25-26`, `vu.h:4-8`, `tempo.h:261-267`

---

**K1.reinvented Status** ⚠️ **INCOMPLETE - Only Instantaneous Value**

| Aspect | Details |
|--------|---------|
| **Novelty Curve** | Allocated but `novelty_curve[]` never synced to AudioDataSnapshot |
| **Exposed to Patterns** | Only `novelty_curve` (single float) in AudioDataSnapshot:99 |
| **VU History** | Allocated (`vu_curve[]` in tempo.cpp:31) but never synced |
| **Pattern Access** | Patterns can only see current novelty, not history |

**Source:** `firmware/src/audio/goertzel.h:99` (only single value), `firmware/src/audio/tempo.cpp:31` (allocated but unused)

---

**Impact Assessment**

**Without Novelty History:**
- ❌ Cannot detect trends (is novelty rising or falling?)
- ❌ Cannot detect attack envelope (onset shape)
- ❌ Limited for impact-sync effects (drum hits)
- ❌ Cannot implement decay-following visualizations
- ❌ Pattern effects must use raw audio instead of processed novelty

**With Novelty History (512 samples, 5 second buffer):**
- ✅ Detect onsets vs. sustained notes
- ✅ Measure spectral flux direction (rising/falling)
- ✅ Envelope-following filters in patterns (attack, decay, release)
- ✅ "Flowing" effects that respond to change, not just magnitude
- ✅ Impact detection (peak finding in history)
- ✅ Prediction (extrapolate trend for smooth transitions)

**Example Pattern Code:**
```cpp
// Detect impact (rapid novelty increase)
float novelty_now = AUDIO_NOVELTY;
float novelty_prev = AUDIO_NOVELTY_HISTORY[NOVELTY_HISTORY_LENGTH-2];
float novelty_delta = novelty_now - novelty_prev;
if (novelty_delta > 0.5) { // Impact detected
    // Trigger effect
}
```

**Recommendation:** IMPLEMENT (Essential for captivating effects per user requirement)

---

### 3. tempo_magnitude & tempo_phase Population

**Emotiscope Status** ✅ **FULLY IMPLEMENTED & USED**

| Aspect | Details |
|--------|---------|
| **tempo.magnitude** | Float, updated every frame in `calculate_magnitude_of_tempo()` |
| **tempo.magnitude_full_scale** | Full-scale version before auto-ranging |
| **tempo.phase** | Phase angle for beat synchronization |
| **Storage** | Arrays in AudioDataSnapshot for pattern access |
| **Population** | `calculate_magnitude_of_tempo()` stores into `tempi[i].magnitude_full_scale` |
| **Update Cycle** | 2 bins/frame (64 bins = 32 frame update cycle) |
| **Usage** | Direct field access in patterns: `tempi[bin].magnitude`, `tempi[bin].phase` |

**Source:** `tempo.h:212`, `tempo.h:244-256`

---

**K1.reinvented Status** 🔴 **BROKEN - Not Populated, Contains Bug**

| Issue | Details |
|-------|---------|
| **Bug Location** | tempo.cpp:181-212 (`calculate_tempo_magnitudes()`) |
| **Problem 1** | Line 186: `calculate_magnitude_of_tempo(i)` RETURNS magnitude but does NOT store in `tempi[i].magnitude` |
| **Problem 2** | Line 201: Tries to use `tempi[i].magnitude` but it's never set! Contains random/old value |
| **Problem 3** | `tempo_magnitude[]` and `tempo_phase[]` in AudioDataSnapshot (lines 101-102) allocated but never populated |
| **Missing** | No `magnitude_full_scale` field in K1's tempo struct (emotiscope has it, goertzel.h doesn't) |
| **Effect** | Patterns cannot access individual tempo bin magnitudes or phases |

**Source:** `firmware/src/audio/tempo.cpp:200-201` (bug), `firmware/src/audio/goertzel.h:101-102` (allocated but unused)

---

**Code Analysis: The Bug**

```cpp
// emotiscope (CORRECT):
float normalized_magnitude = magnitude / (block_size / 2.0);
tempi[tempo_bin].magnitude_full_scale = normalized_magnitude;  // ← STORES VALUE
// ... later ...
float scaled_magnitude = (tempi[i].magnitude_full_scale * autoranger_scale);

// K1.reinvented (BROKEN):
float normalized_magnitude = magnitude / (block_size / 2.0);
return normalized_magnitude;  // ← RETURNS but doesn't STORE!
// ... later ...
float scaled_magnitude = tempi[i].magnitude * autoranger_scale;  // ← USES UNSET VALUE
```

---

**Impact Assessment**

**Without tempo_magnitude/tempo_phase:**
- ❌ Patterns cannot distinguish beat strength per tempo bin
- ❌ Cannot synchronize multiple effects to different tempi simultaneously
- ❌ Cannot do "tempo confidence per bin" (currently only global confidence)
- ❌ Cannot create tempo-specific visualizations (kick at 80 BPM gets different effect than hi-hat at 400 BPM)
- ❌ Audio snapshot fields allocated but useless (memory waste)

**With tempo_magnitude/tempo_phase:**
- ✅ Individual beat tracking per tempo bin
- ✅ Multi-tempo visualizations (swing effects with offset tempi)
- ✅ Confidence-weighted beat effects
- ✅ Phase-locked synthesis (lock effects to beat phase)
- ✅ Polyrhythmic effects (beat at bin N with different color than bin M)

**Example Pattern Code:**
```cpp
PATTERN_AUDIO_START();
// Find strongest tempo bin
int strongest_bin = 0;
for (int i = 1; i < NUM_TEMPI; i++) {
    if (AUDIO_TEMPO_MAGNITUDE[i] > AUDIO_TEMPO_MAGNITUDE[strongest_bin]) {
        strongest_bin = i;
    }
}
// Sync effect to strongest beat
float beat_phase = AUDIO_TEMPO_PHASE[strongest_bin];
float brightness = sin(beat_phase) * 0.5 + 0.5;  // 0.0-1.0 with beat sync
```

**Recommendation:** IMPLEMENT (Critical for advanced audio-reactive effects)

---

## Implementation Checklist

### ✅ Task 1: Fix tempo_magnitude Population (CRITICAL - IMMEDIATE)

**Files to Modify:** `firmware/src/audio/tempo.cpp`

**Changes:**
1. Add `magnitude_full_scale` to tempo struct (goertzel.h:73-82)
2. Store magnitude in `calculate_magnitude_of_tempo()` (line 178, before return)
3. Populate `audio_back.tempo_magnitude[]` and `audio_back.tempo_phase[]` in snapshot (main.cpp)

**Estimated Effort:** 30 minutes

---

### ✅ Task 2: Enhance AUDIO_NOVELTY History (HIGH - THIS WEEK)

**Files to Modify:** `firmware/src/audio/goertzel.h`, `firmware/src/pattern_audio_interface.h`, `firmware/src/main.cpp`

**Changes:**
1. Add novelty history to AudioDataSnapshot
2. Add VU smoothing history to AudioDataSnapshot
3. Create macros for history access (AUDIO_NOVELTY_HISTORY[idx], AUDIO_VU_SMOOTH[idx])
4. Update snapshot population in audio task

**Estimated Effort:** 2 hours (includes history buffer management)

---

### ⏰ Task 3: Implement Full FFT (MEDIUM - NEXT SPRINT)

**Files to Modify:** `firmware/src/audio/fft.h/.cpp` (new files), `firmware/src/audio/goertzel.cpp`, `firmware/src/main.cpp`

**Changes:**
1. Create `fft.h/.cpp` with 256-bin FFT implementation
2. Use ESP-DSP library (dsps_fft4r_fc32, already available in ESP-IDF)
3. Implement Hann windowing, averaging, auto-ranging
4. Populate `audio_back.fft_smooth[]` in audio task
5. Create AUDIO_FFT macro in pattern interface

**Estimated Effort:** 4-6 hours (complex DSP)

**Prerequisite:** FFT implementation expertise + understanding of ESP-DSP library

---

## Data Structure Corrections Needed

### AudioDataSnapshot (goertzel.h:86-112)

**Current (Incomplete):**
```cpp
typedef struct {
    // ...
    float novelty_curve;                    // ← SINGLE VALUE ONLY
    float tempo_confidence;
    float tempo_magnitude[NUM_TEMPI];       // ← ALLOCATED BUT NEVER POPULATED
    float tempo_phase[NUM_TEMPI];           // ← ALLOCATED BUT NEVER POPULATED
    float fft_smooth[128];                  // ← PLACEHOLDER
    // ...
} AudioDataSnapshot;
```

**Needed (Complete):**
```cpp
typedef struct {
    // ...
    // Novelty & VU history for trend detection
    float novelty_curve[NOVELTY_HISTORY_SNAPSHOT];  // Last N novelty values
    float vu_smooth_history[NUM_VU_SMOOTH_SAMPLES]; // Last N smoothed VU levels

    float tempo_confidence;
    float tempo_magnitude[NUM_TEMPI];       // NOW POPULATED!
    float tempo_phase[NUM_TEMPI];           // NOW POPULATED!
    float fft_smooth[128];                  // NOW POPULATED (with real FFT data)
    // ...
} AudioDataSnapshot;
```

---

## Pattern Interface Additions Needed

### New Macros in pattern_audio_interface.h

**For Novelty History:**
```cpp
#define AUDIO_NOVELTY_HISTORY(idx)     (audio.novelty_curve[idx])
#define AUDIO_VU_SMOOTH(idx)            (audio.vu_smooth_history[idx])
#define AUDIO_NOVELTY_DELTA             (audio.novelty_curve[NOVELTY_SNAPSHOT_LENGTH-1] - audio.novelty_curve[NOVELTY_SNAPSHOT_LENGTH-2])
#define AUDIO_IS_IMPACT()               (AUDIO_NOVELTY_DELTA > 0.5f)  // Example threshold
```

**For Tempo Details:**
```cpp
#define AUDIO_TEMPO_MAGNITUDE(bin)      (audio.tempo_magnitude[bin])
#define AUDIO_TEMPO_PHASE(bin)          (audio.tempo_phase[bin])
#define AUDIO_TEMPO_BEAT(bin)           (sin(AUDIO_TEMPO_PHASE(bin)))  // Phase-derived beat
```

**For FFT:**
```cpp
#define AUDIO_FFT(bin)                  (audio.fft_smooth[bin])  // 128-bin FFT data
#define AUDIO_FFT_BARK(bark_idx)        // Helper to convert Hz to Bark scale (perceptual)
```

---

## Memory Impact Analysis

### Task 1 (tempo_magnitude fix): 0 bytes additional
- Reuses already-allocated array space
- Fixes population bug

### Task 2 (novelty history): ~1-2 KB additional
- Novelty history snapshot: ~512 bytes (128 samples × 4 bytes)
- VU smooth history: ~16 bytes (4 samples × 4 bytes)
- Total: ~528 bytes per buffer × 2 (front+back) = 1 KB

### Task 3 (FFT): ~2 KB additional
- FFT input: 256 floats = 1 KB
- FFT output/averaging: already in fft_smooth[128] = 512 bytes
- Total: ~1.5 KB

**Total Additional Memory:** ~2.5 KB (acceptable within RAM budget)

---

## Recommendation & Priority

| Task | Priority | Effort | Impact | Blocker? |
|------|----------|--------|--------|----------|
| Fix tempo_magnitude bug | 🔴 CRITICAL | 30 min | High | YES - patterns cannot access tempo data |
| Add novelty history | 🟡 HIGH | 2 hours | High | NO - workaround exists (trend detection) |
| Implement FFT | 🟡 HIGH | 4-6 hours | Medium | NO - optional feature for polish |

---

## Summary

All three features were standard in original Emotiscope 2.0. Their absence in K1 represents gaps in the audio-reactive visualization capabilities. The tempo_magnitude bug is the most critical (prevents pattern access to tempo bin data), followed by novelty history (essential for expressive visualizations), followed by FFT (optional but highly desirable for advanced effects).

**Status: READY FOR IMPLEMENTATION**

