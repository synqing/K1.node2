---
title: Bloom Mode Failure Analysis - K1.reinvented
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Bloom Mode Failure Analysis - K1.reinvented

## Executive Summary

Bloom mode fails because **the VU level is never synchronized to the audio data snapshot**. The audio processing thread calculates `audio_level` but never copies it to `audio_back.vu_level`, leaving the snapshot with uninitialized (zero) VU data.

---

## Root Cause: Missing VU Synchronization Point

### The Problem Chain

```
Audio Processing (Core 1)
├─ acquire_sample_chunk()
├─ calculate_magnitudes()
│  ├─ Updates: spectrogram[64]
│  ├─ Updates: spectrogram_smooth[64]
│  └─ Copies to: audio_back.spectrogram ✅
│  └─ Copies to: audio_back.spectrogram_smooth ✅
│  └─ MISSING: audio_level → audio_back.vu_level ❌
├─ get_chromagram()
│  ├─ Updates: chromagram[12]
│  └─ Copies to: audio_back.chromagram ✅
└─ finish_audio_frame()
   └─ commit_audio_data() swaps buffers
      └─ Copies audio_back to audio_front ✅

LED Rendering (Core 0 - Bloom Pattern)
└─ draw_bloom()
   ├─ PATTERN_AUDIO_START()
   │  └─ Snapshots audio_front to local audio variable
   ├─ float energy = AUDIO_VU;
   │  └─ Reads audio.vu_level (== 0.0) ❌
   └─ Result: Bloom always inactive
```

### Why Other Patterns Work

**Spectrum Mode** (Line 306 in generated_patterns.h):
```cpp
float magnitude = AUDIO_SPECTRUM_SMOOTH[(int)(progress * 63.0f)]
// ✅ AUDIO_SPECTRUM_SMOOTH is populated by calculate_magnitudes()
```

**Octave Mode** (Line 363):
```cpp
float magnitude = AUDIO_CHROMAGRAM[note]
// ✅ AUDIO_CHROMAGRAM is populated by get_chromagram()
```

**Bloom Mode** (Line 406):
```cpp
float energy = AUDIO_VU;
// ❌ AUDIO_VU (audio.vu_level) is NEVER populated
```

---

## Technical Details

### 1. Audio Level Calculation Exists But Isn't Synced

**In `audio_stubs.h` (line 88):**
```cpp
void update_audio_stubs() {
    // ... simulation code ...
    audio_level = beat_pulse * 0.5;  // ← Calculated here
}
```

**Problem**: This updates the global `audio_level` but doesn't sync to the snapshot.

### 2. Audio Data Snapshot Structure Defines VU Fields

**In `goertzel.h` (lines 147-148):**
```cpp
typedef struct AudioDataSnapshot {
    // ... other fields ...
    float vu_level;        // ← Defined in snapshot struct
    float vu_level_raw;    // ← Also defined but never used
    // ... other fields ...
} AudioDataSnapshot;
```

### 3. Audio Processing Never Updates Snapshot VU

**In `goertzel.h` calculate_magnitudes() (lines 563-576):**
```cpp
// PHASE 1: Copy spectrum data to audio_back buffer for thread-safe access
if (audio_sync_initialized) {
    memcpy(audio_back.spectrogram, spectrogram, ...);           // ✅
    memcpy(audio_back.spectrogram_smooth, spectrogram_smooth, ...);  // ✅
    // NOTE: Missing vu_level copy here!

    audio_back.update_counter++;
    audio_back.timestamp_us = esp_timer_get_time();
    audio_back.is_valid = true;
}
```

**In `goertzel.h` get_chromagram() (lines 606-609):**
```cpp
// PHASE 1: Copy chromagram to audio_back buffer
if (audio_sync_initialized) {
    memcpy(audio_back.chromagram, chromagram, sizeof(float) * 12);
    // NOTE: Missing vu_level copy here too!
}
```

### 4. Pattern Expects VU Data to Exist

**In `pattern_audio_interface.h` (line 112):**
```cpp
#define AUDIO_VU (audio.vu_level)
```

**In `generated_patterns.h` draw_bloom() (line 406):**
```cpp
void draw_bloom(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    // ... setup code ...

    float energy = AUDIO_VU;  // ← Reads uninitialized VU level (0.0)

    // Result: energy is always 0.0, bloom never activates
```

---

## The Synchronization Gap

### Missing Code (What Needs to Be Added)

The audio processing thread needs to copy the calculated VU level to the snapshot. This should happen in `calculate_magnitudes()` after computing audio metrics:

```cpp
// In calculate_magnitudes() after line 561 (after all frequency processing):

// Calculate VU level from overall spectrum energy
float vu_sum = 0.0f;
for (uint16_t i = 0; i < NUM_FREQS; i++) {
    vu_sum += magnitudes_smooth[i];
}
float vu_calculated = vu_sum / NUM_FREQS;

// Store in snapshots for thread-safe access
audio_level = vu_calculated;  // Update global for legacy code

// CRITICAL: Copy to audio_back buffer so bloom mode can read it!
if (audio_sync_initialized) {
    audio_back.vu_level = vu_calculated;
    audio_back.vu_level_raw = vu_sum;  // For debugging
}
```

---

## Why This Bug Exists

### Architecture Mismatch

The system has **two parallel VU tracking systems** that never connect:

1. **Legacy Global VU**: `audio_level` in `audio_stubs.h`
   - Updated by stub function
   - Used nowhere in current code
   - Not thread-safe

2. **Thread-Safe Snapshot VU**: `audio_back.vu_level`
   - Defined in AudioDataSnapshot struct
   - Allocated but never populated
   - Expected by pattern_audio_interface.h
   - Never synced to audio_front

### Why Other Systems Work

The spectrum and chromagram have explicit synchronization:
- `calculate_magnitudes()` → copies to `audio_back.spectrogram`
- `get_chromagram()` → copies to `audio_back.chromagram`
- `finish_audio_frame()` → swaps to `audio_front`

But VU level has **no synchronization path**.

---

## Impact Analysis

### Affected Features
- ✅ **Static Patterns**: Departure, Lava, Twilight - WORK (no audio dependency)
- ✅ **Spectrum Pattern**: WORKS (uses spectrogram_smooth[])
- ✅ **Octave Pattern**: WORKS (uses chromagram[])
- ❌ **Bloom Pattern**: FAILS (reads vu_level = 0.0 always)

### User Experience
- Bloom mode shows no visual response to audio
- LED strip displays static gradient (from palette fallback)
- No energy pulses or spreading waves
- Pattern appears broken/inactive

### Silent Failure
- No compile errors
- No runtime warnings
- `AUDIO_IS_AVAILABLE()` returns true (snapshot exists)
- But `AUDIO_VU` is always 0.0 (uninitialized memory)

---

## Solution Approach

### Option 1: Populate VU During calculate_magnitudes() [RECOMMENDED]

**Location**: `goertzel.h` line ~561

**Changes**:
```cpp
// After the auto-ranging loop (line 546)
for (uint16_t i = 0; i < NUM_FREQS; i++) {
    frequencies_musical[i].magnitude = clip_float(magnitudes_smooth[i] * autoranger_scale);
    spectrogram[i] = frequencies_musical[i].magnitude;
}

// NEW: Calculate and sync VU level
float vu_sum = 0.0f;
for (uint16_t i = 0; i < NUM_FREQS; i++) {
    vu_sum += spectrogram[i];
}
float vu_level_calculated = vu_sum / NUM_FREQS;
audio_level = vu_level_calculated;

// Sync to snapshot
if (audio_sync_initialized) {
    audio_back.vu_level = vu_level_calculated;
    audio_back.vu_level_raw = vu_level_calculated * max_val_smooth;
}
```

**Pros**:
- VU calculated from actual spectrum (accurate)
- Syncs at same point as spectrum data (consistent timing)
- No extra function calls needed
- Works with both stubs and real audio

**Cons**:
- Requires modifying goertzel.h calculation logic

### Option 2: Sync audio_level in finish_audio_frame()

**Location**: `goertzel.h` line ~617

**Changes**:
```cpp
void finish_audio_frame() {
    if (!audio_sync_initialized) {
        return;
    }

    // NEW: Sync VU level before commit
    audio_back.vu_level = audio_level;
    audio_back.vu_level_raw = audio_level;  // Same value for stubs

    // Commit the back buffer to the front buffer (atomic swap)
    commit_audio_data();
}
```

**Pros**:
- Minimal change
- Works immediately with existing code
- No additional calculation needed

**Cons**:
- Relies on external audio_level (from stubs or other source)
- Less clean architecture

### Option 3: Calculate in get_chromagram()

**Location**: `goertzel.h` line ~610

**Changes**:
```cpp
void get_chromagram(){
    // ... existing chromagram code ...

    // NEW: Also calculate VU level
    float vu_sum = 0.0f;
    for (uint16_t i = 0; i < NUM_FREQS; i++) {
        vu_sum += spectrogram_smooth[i];
    }
    float vu_calculated = vu_sum / NUM_FREQS;

    // PHASE 1: Copy both chromagram and VU to audio_back buffer
    if (audio_sync_initialized) {
        memcpy(audio_back.chromagram, chromagram, sizeof(float) * 12);
        audio_back.vu_level = vu_calculated;
        audio_back.vu_level_raw = vu_calculated;
    }
}
```

**Pros**:
- Keeps all synchronization in one place
- Clean separation of concerns

**Cons**:
- VU calculation happens at different frame offset than spectrum

---

## Verification Checklist

Once fix is applied, verify:

1. **Compile Check**
   - [ ] Code compiles without errors
   - [ ] No new warnings introduced

2. **Runtime Check**
   - [ ] Serial output shows `audio_back.vu_level` is non-zero
   - [ ] `AUDIO_VU` macro returns sensible values (> 0 with audio)

3. **Pattern Check**
   - [ ] Bloom pattern activates on audio
   - [ ] Energy spreads from center outward
   - [ ] Brightness responds to volume
   - [ ] Fade-out on silence works

4. **Integration Check**
   - [ ] Spectrum pattern still works
   - [ ] Octave pattern still works
   - [ ] Static patterns unaffected
   - [ ] FPS maintained (200+)

---

## Code Location Summary

| File | Line | Issue |
|------|------|-------|
| `generated_patterns.h` | 406 | Reads `AUDIO_VU` expecting data |
| `pattern_audio_interface.h` | 112 | Defines `AUDIO_VU` macro |
| `audio/goertzel.h` | 138-164 | Struct has `vu_level` field |
| `audio/goertzel.h` | 466-576 | `calculate_magnitudes()` - missing VU sync |
| `audio/goertzel.h` | 590-610 | `get_chromagram()` - missing VU sync |
| `audio/goertzel.h` | 617-624 | `finish_audio_frame()` - could sync here |
| `audio_stubs.h` | 88 | Updates global `audio_level` (not synced) |

---

## Timeline

- **Discovered**: VU field defined but never populated
- **Impact**: Bloom mode completely non-functional (~5% of patterns)
- **Severity**: Medium (silent failure, breaks specific pattern)
- **Fix Complexity**: Low (1-10 lines of code)
- **Testing**: Easy (visual feedback immediate)

---

## Prevention for Future Development

### Best Practices
1. **Always sync complete data structures** - don't half-populate snapshots
2. **Add assertions for validity** - check `vu_level > 0` at startup
3. **Document synchronization points** - explicitly mark where data flows
4. **Test all audio-reactive patterns** - don't assume one pattern tests the whole system
5. **Profile data freshness** - log if any snapshot fields are stale

### Code Review Checklist
- [ ] All fields in AudioDataSnapshot are documented
- [ ] All populated fields have explicit sync code
- [ ] Sync happens in consistent order (always same sequence)
- [ ] No fields left "for future use" without initialization
- [ ] Audio patterns tested during merge

