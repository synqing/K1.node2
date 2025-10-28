---
title: Light Show Pattern Audit: K1.reinvented vs Emotiscope
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Light Show Pattern Audit: K1.reinvented vs Emotiscope

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Comprehensive audit of all light show pattern implementations in K1.reinvented, comparing against Emotiscope 2.0 source code to identify architecture gaps and incorrect stub implementations.

---

## Executive Summary

**11 patterns total** - 3 require critical rewrites, 1 is correct, 7 are static/procedural (audio-independent)

### Status by Category

| Category | Patterns | Status | Action |
|----------|----------|--------|--------|
| **Audio-Reactive (Per-Tempo-Bin)** | Tempiscope, Beat_Tunnel | 🔴 BROKEN STUBS | REWRITE |
| **Audio-Reactive (State Machine)** | Pulse | ✅ CORRECT | None |
| **Audio-Reactive (VU/Spectrum)** | Spectrum, Octave, Bloom | ⚠️ PARTIAL | Review |
| **Static Intentional** | Departure, Lava, Twilight | ✅ CORRECT | None |
| **Procedural** | Perlin, Void_Trail | ✅ CORRECT | None |

---

## Pattern-by-Pattern Analysis

### Category 1: Per-Tempo-Bin Audio-Reactive Patterns

These patterns should iterate 64 tempo bins individually and render each based on its own magnitude and phase data.

#### 1.1: draw_tempiscope() - BROKEN STUB 🔴

**Current Implementation Location:** `firmware/src/generated_patterns.h:762-827`

**Current Behavior:**
```cpp
// Line 790: Reads GLOBAL tempo_confidence only
float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;

// Line 795-798: Generates SYNTHETIC phase per bin
for (uint16_t i = 0; i < NUM_TEMPI && i < NUM_LEDS; i++) {
    // Synthetic phase generation (WRONG - should use real phase data)
    float phase_sine = sinf(time * 6.28318f * (50.0f + i * 50.0f) / 1000.0f);
    float phase_factor = 1.0f - ((phase_sine + 1.0f) * 0.5f);

    // Line 801: Uses GLOBAL magnitude for all bins (WRONG)
    float magnitude = tempo_confidence * freshness_factor * phase_factor;
}
```

**Comments Indicating Stub Status:**
- Line 796: `"// (approximate - no tempo phase data yet)"`
- Line 800: `"// (approximate - use confidence for all bins)"`

**Problems:**
1. ❌ Uses global `AUDIO_TEMPO_CONFIDENCE` applied identically to all 64 bins
2. ❌ Generates synthetic phase instead of using real `AUDIO_TEMPO_PHASE(i)` per bin
3. ❌ Cannot distinguish beat strength per tempo bin
4. ❌ Cannot show individual tempo bin response (e.g., kick at 80 BPM vs hi-hat at 400 BPM)

**Emotiscope Reference:** `tempiscope.h` lines 1-20

```cpp
// EMOTISCOPE CORRECT IMPLEMENTATION
for(uint16_t i = 0; i < NUM_TEMPI; i++) {
    float mag = clip_float(tempi_smooth[i] * sine);  // ← Uses PER-BIN magnitude
    float sine = 1.0 - ((tempi[i].phase + PI) / (2.0*PI));  // ← Uses PER-BIN phase
    leds[i] = color;  // ← Maps tempo bin i to LED i directly
}
```

**Fix Required:**
- Replace global `tempo_confidence` with per-bin `AUDIO_TEMPO_MAGNITUDE(i)`
- Replace synthetic phase with real `AUDIO_TEMPO_PHASE(i)`
- Use mathematically correct phase-to-sine mapping: `sine = 1.0 - ((phase + PI) / (2.0*PI))`
- Render each tempo bin's strength directly

**Effort:** 20 minutes (straightforward iteration replacement)

---

#### 1.2: draw_beat_tunnel() - BROKEN STUB 🔴

**Current Implementation Location:** `firmware/src/generated_patterns.h:855-967`

**Current Behavior:**
```cpp
// Line 912: Reads GLOBAL tempo_confidence only
float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;

// Line 920-927: Iterates LED positions, not tempo bins
for (uint16_t i = 0; i < (NUM_LEDS >> 1); i++) {
    // Line 924: Uses LED position for hue (WRONG)
    float hue = fmodf(led_pos + time * 0.3f * params.speed, 1.0f);

    // Line 927: Uses GLOBAL magnitude with synthetic sine (WRONG)
    float brightness = tempo_confidence * (0.3f + 0.7f * sinf(time * 6.28318f + i * 0.1f));
}
```

**Problems:**
1. ❌ Uses global `AUDIO_TEMPO_CONFIDENCE` for all LEDs
2. ❌ Generates brightness via synthetic sine instead of real tempo phase
3. ❌ Cannot show individual tempo bin response
4. ❌ Missing phase window condition for proper beat synchronization

**Emotiscope Reference:** `beat_tunnel.h` lines 1-49

```cpp
// EMOTISCOPE CORRECT IMPLEMENTATION
for(uint16_t i = 0; i < NUM_TEMPI; i++) {
    float phase = 1.0 - ((tempi[i].phase + PI) / (2.0*PI));  // ← Uses PER-BIN phase

    // Phase window: only render when phase near 0.65 (beat window)
    if(fabs(phase - 0.65) < 0.02) {  // ← CRITICAL: Phase window condition
        mag = clip_float(tempi_smooth[i]);  // ← Uses PER-BIN magnitude
        // Render only when beat hits
    }
}
```

**Fix Required:**
- Replace global `tempo_confidence` with per-bin `AUDIO_TEMPO_MAGNITUDE(i)`
- Replace synthetic sine with real `AUDIO_TEMPO_PHASE(i)`
- Implement phase window condition: only render when beat phase near 0.65
- Map tempo bin directly to LED position

**Effort:** 20 minutes (iteration + phase condition)

---

#### 1.3: draw_pulse() - CORRECT ✅

**Current Implementation Location:** `firmware/src/generated_patterns.h:629-733`

**Status:** CORRECT - No changes needed

**Why It Works:**
- Uses state machine approach (pulse_waves array)
- Doesn't need per-tempo-bin data (spawns on beat event, persists visually)
- Line 658: Uses `sqrtf(AUDIO_TEMPO_CONFIDENCE)` for proper amplitude scaling
- Renders Gaussian bell curves with exponential decay

**Architecture:**
```cpp
// State machine: waves persist and decay over time
struct PulseWave {
    float position;      // 0.0-1.5 (travels across LED strip)
    float speed;         // Velocity
    float hue;           // Color
    float brightness;    // sqrt(tempo_confidence)  ← Correct!
    uint32_t age;        // Frame counter for decay
    bool active;         // Is this wave still visible?
};

// Render: iterate active waves, draw Gaussian bell curves
for (uint16_t w = 0; w < MAX_PULSE_WAVES; w++) {
    if (!pulse_waves[w].active) continue;

    // Gaussian: exp(-(distance²) / (2σ²))
    float gaussian = expf(-(distance * distance) / (2.0f * wave_width * wave_width));

    // Combine brightness with decay
    float intensity = pulse_waves[w].brightness * gaussian * decay;
}
```

**No Action Required** - This pattern correctly uses the tempo_confidence signal.

---

### Category 2: Audio-Reactive (Spectrum/VU-Based)

#### 2.1: draw_spectrum() - Review Needed ⚠️

**Current Implementation Location:** `firmware/src/generated_patterns.h:~450-550`

**Architecture:** Maps frequency spectrogram across LED strip

**Status:** Appears correct (uses `AUDIO_SPECTROGRAM[i]` per-frequency data)

**Recommendation:** No changes needed if using per-frequency data properly

---

#### 2.2: draw_octave() - Review Needed ⚠️

**Current Implementation Location:** `firmware/src/generated_patterns.h:~550-650`

**Architecture:** Groups frequencies into octave bands

**Status:** Appears correct (uses octave binning)

**Recommendation:** No changes needed

---

#### 2.3: draw_bloom() - Review Needed ⚠️

**Current Implementation Location:** `firmware/src/generated_patterns.h`

**Architecture:** Frequency-triggered bloom effects

**Status:** Verify uses correct frequency data, not global VU level

**Recommendation:** No changes needed if using per-frequency data

---

### Category 3: Static Intentional Patterns

#### 3.1: draw_departure() - CORRECT ✅
- Static gradient with time-based pulse modulation
- No audio dependency
- No action needed

#### 3.2: draw_lava() - CORRECT ✅
- Static gradient with time-based animation
- No audio dependency
- No action needed

#### 3.3: draw_twilight() - CORRECT ✅
- Static gradient with smooth transitions
- No audio dependency
- No action needed

---

### Category 4: Procedural Patterns

#### 4.1: draw_perlin() - CORRECT ✅
- Procedural Perlin-like noise with time-based animation
- No audio dependency required
- No action needed

#### 4.2: draw_void_trail() - CORRECT ✅
- Procedural trail pattern with persistence
- Optional audio (volume modulation only)
- No action needed

---

## Critical Issues Summary

### Issue #1: Tempiscope Uses Global Confidence Instead of Per-Bin Magnitude

**Impact:** Medium-High
- Pattern cannot show different beat strengths across tempo spectrum
- User sees uniform brightness across all LEDs regardless of which tempo is strongest
- Defeats the purpose of 64-bin tempo analysis

**Evidence:**
- Line 790: `float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;` (GLOBAL)
- Line 801: `float magnitude = tempo_confidence * ...;` (applied to all bins identically)

**Fix Impact:** HIGH - Enables proper rhythm visualization

---

### Issue #2: Tempiscope Uses Synthetic Phase Instead of Real Tempo Phase

**Impact:** Medium
- Pattern cannot show beat phase accurately
- Synthetic phase is decoupled from actual beat timing
- Visual feedback doesn't sync perfectly with music

**Evidence:**
- Line 797: `float phase_sine = sinf(time * 6.28318f * (50.0f + i * 50.0f) / 1000.0f);` (SYNTHETIC)
- Should be: `float phase = AUDIO_TEMPO_PHASE(i);` (REAL)

**Fix Impact:** MEDIUM - Enables precise beat synchronization

---

### Issue #3: Beat_Tunnel Uses Global Confidence Instead of Per-Bin

**Impact:** Medium-High
- Pattern cannot show tempo bin phase synchronization
- User sees generic pulsing unrelated to actual beat bins
- Defeats "tunnel" metaphor of moving through beat space

**Evidence:**
- Line 912: `float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;` (GLOBAL)
- Line 927: Uses global with synthetic sine, not real tempo data

**Fix Impact:** HIGH - Enables proper beat tunnel visualization

---

### Issue #4: Beat_Tunnel Missing Phase Window Condition

**Impact:** Medium
- Pattern renders continuously instead of on beat hits
- Emotiscope only renders when phase is "near beat" (0.65 ± 0.02)
- Visual timing feels disconnected from music

**Evidence:**
- Emotiscope line 21: `if(fabs(phase - 0.65) < 0.02)` - conditional rendering
- K1 line 919: `if (tempo_confidence > beat_threshold)` - always renders if threshold met

**Fix Impact:** MEDIUM - Enables beat-synchronized rendering

---

## Data Structure Status

### AudioDataSnapshot (goertzel.h:87-113)

**Fields Available (FIXED THIS SESSION):**
- ✅ `float tempo_magnitude[NUM_TEMPI]` - NOW POPULATED (was allocated but unused)
- ✅ `float tempo_phase[NUM_TEMPI]` - NOW POPULATED (was allocated but unused)
- ✅ `float tempo_confidence` - Global beat confidence

**Macros Available (ADDED THIS SESSION):**
```cpp
#define AUDIO_TEMPO_MAGNITUDE(bin)  (audio.tempo_magnitude[(bin)])
#define AUDIO_TEMPO_PHASE(bin)      (audio.tempo_phase[(bin)])
#define AUDIO_TEMPO_BEAT(bin)       (sinf(AUDIO_TEMPO_PHASE(bin)))
```

**Status:** ✅ ALL DATA AVAILABLE FOR PROPER PATTERN IMPLEMENTATION

---

## Implementation Plan

### Phase 1: Rewrite Tempiscope Pattern (CRITICAL)

**Files to Modify:**
- `firmware/src/generated_patterns.h` lines 762-827

**Changes:**
1. Replace line 790: Use per-bin magnitude instead of global
   ```cpp
   // Remove: float tempo_confidence = AUDIO_TEMPO_CONFIDENCE;
   // Add: for each bin i: float magnitude = AUDIO_TEMPO_MAGNITUDE(i);
   ```

2. Replace line 797: Use real phase instead of synthetic
   ```cpp
   // Remove: float phase_sine = sinf(time * 6.28318f * (50.0f + i * 50.0f) / 1000.0f);
   // Add: float phase = AUDIO_TEMPO_PHASE(i);
   ```

3. Line 798: Use mathematically correct phase-to-sine mapping
   ```cpp
   float sine = 1.0f - ((phase + PI) / (2.0f * PI));
   ```

4. Line 801: Use per-bin magnitude
   ```cpp
   float magnitude = AUDIO_TEMPO_MAGNITUDE(i) * freshness_factor * sine;
   ```

**Estimated Effort:** 20 minutes

**Compilation Expected:** 0 errors, 0 warnings (no struct changes)

---

### Phase 2: Rewrite Beat_Tunnel Pattern (CRITICAL)

**Files to Modify:**
- `firmware/src/generated_patterns.h` lines 855-967

**Changes:**
1. Replace line 912: Use per-bin magnitude iteration instead of global
2. Replace line 920-927: Iterate tempo bins, not LED positions
3. Add phase window condition: `if(fabs(phase - 0.65) < 0.02)`
4. Use real tempo phase instead of synthetic sine

**Estimated Effort:** 25 minutes

**Compilation Expected:** 0 errors, 0 warnings

---

### Phase 3: Verification

1. **Compile:** `pio run -e k1` expecting 0 errors/warnings
2. **Test:** Device with music playing
   - Tempiscope: Show different brightness per tempo bin
   - Beat_Tunnel: Show beat hits synchronized to music

---

## Emotiscope Reference Code Locations

**Tempiscope Reference:** `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/tempiscope.h` lines 1-20

**Beat_Tunnel Reference:** `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/beat_tunnel.h` lines 1-49

**Pulse Reference:** `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/pulse.h` lines 1-120

---

## Risk Assessment

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Compilation failure | VERY LOW | Only float math changes, no struct changes |
| Unexpected behavior | LOW | Using existing macros, proven emotiscope logic |
| Performance impact | VERY LOW | Same iteration count, simpler math |
| Over-brightness | LOW | Use same normalization as pulse pattern |

---

## Success Criteria

- ✅ Tempiscope renders each tempo bin with individual brightness
- ✅ Beat_Tunnel shows phase-synchronized beat hits
- ✅ Both patterns respond differently to different tempo bins
- ✅ Compilation produces 0 errors/warnings
- ✅ Patterns remain 120+ FPS
- ✅ No regressions in other patterns

---

## Next Steps

1. **Start:** Rewrite draw_tempiscope() (Phase 1)
2. **Then:** Rewrite draw_beat_tunnel() (Phase 2)
3. **Verify:** Compile and test on device
4. **Document:** Create implementation report
