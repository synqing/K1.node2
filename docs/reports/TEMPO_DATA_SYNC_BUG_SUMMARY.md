# Tempo Data Synchronization Bug - Executive Summary

**Status:** CRITICAL BUG IDENTIFIED
**Date:** 2025-10-27
**Severity:** HIGH (affects all tempo-reactive patterns)

---

## Problem Statement

Tempo magnitude and phase data **is being calculated correctly** but **never reaches patterns**. All calls to `AUDIO_TEMPO_MAGNITUDE(bin)` and `AUDIO_TEMPO_PHASE(bin)` return **0.0** instead of actual beat data.

---

## Root Cause (3 Lines)

1. **Line 495-496 in goertzel.cpp:** Arrays are explicitly zeroed with `memset()`
2. **Missing sync in main.cpp:** No code copies `tempi[].magnitude` and `tempi[].phase` to `audio_back` arrays
3. **Line 551 in goertzel.cpp:** `finish_audio_frame()` commits the zeroed arrays to patterns

---

## Evidence

### ✅ Tempo Calculation Works
- **tempo.cpp:164:** `tempi[tempo_bin].phase` is computed from Goertzel atan2()
- **tempo.cpp:180:** `tempi[tempo_bin].magnitude_full_scale` is computed from Goertzel magnitude
- **tempo.cpp:217:** `tempi[i].magnitude` is auto-ranged and stored (0.0-1.0)
- **tempo.cpp:290:** `tempi[tempo_bin].beat = sin(phase)` uses valid phase data

### ❌ Sync to AudioDataSnapshot Broken
- **goertzel.cpp:495-496:** Arrays are zeroed EVERY frame
- **main.cpp:61:** Only `tempo_confidence` scalar is synced (not arrays)
- **No code exists** that copies `tempi[64]` arrays to `audio_back.tempo_magnitude[64]` and `audio_back.tempo_phase[64]`

### ❌ Patterns Receive Zeros
- **goertzel.cpp:551:** `finish_audio_frame()` commits zeroed arrays via `memcpy()`
- **pattern_audio_interface.h:305-336:** Macros correctly read from `audio.tempo_magnitude[]` and `audio.tempo_phase[]`, but arrays contain zeros

---

## Minimal Fix (3 Lines + 1 Declaration)

### Step 1: Add extern declaration to tempo.h
```cpp
// After line 40 in firmware/src/audio/tempo.h
extern tempo tempi[NUM_TEMPI];
```

### Step 2: Sync arrays in main.cpp after line 61
```cpp
// In firmware/src/main.cpp audio_task(), replace lines 58-64:
extern float tempo_confidence;
extern tempo tempi[NUM_TEMPI];

audio_back.tempo_confidence = tempo_confidence;

// NEW: Sync tempo arrays (3 lines)
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}

finish_audio_frame();
```

### Step 3: Remove memset() in goertzel.cpp lines 495-496
```cpp
// DELETE these lines (or replace with comment explaining sync is in main.cpp)
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```

---

## Validation

### Quick Test (Add to any pattern):
```cpp
float mag = AUDIO_TEMPO_MAGNITUDE(32);
float phase = AUDIO_TEMPO_PHASE(32);
Serial.printf("[TEMPO] mag=%.4f phase=%.4f\n", mag, phase);
```

### Expected Results BEFORE Fix:
- Magnitude: 0.0000 (always zero)
- Phase: 0.0000 (always zero)

### Expected Results AFTER Fix:
- Magnitude: 0.0-1.0 (varies with music beat strength)
- Phase: -3.14 to +3.14 (rotates continuously with beat)
- Both values change with music (not stuck at zero)

---

## Performance Impact

- **Additional CPU:** ~10-20 microseconds per frame (64 array writes)
- **Memory:** 0 bytes (arrays already allocated)
- **Impact:** Negligible (0.05% of 25-35ms audio processing time)

---

## Files to Modify

1. `firmware/src/audio/tempo.h` — Add extern declaration
2. `firmware/src/main.cpp` — Add sync loop after tempo_confidence
3. `firmware/src/audio/goertzel.cpp` — Remove memset() or update comment

---

## Why This Bug Exists

**Comment in goertzel.cpp:492-494 says:**
```
// tempo.h will populate these arrays after calculating tempi[] and tempi_smooth[]
// For now, zero the arrays - patterns fall back to AUDIO_TEMPO_CONFIDENCE if needed
```

**Reality:**
- No such population code was ever written
- "For now" became permanent production code
- Patterns cannot "fall back" to tempo_confidence because they need per-bin data

---

## Related Patterns Affected

All patterns using tempo bin data:
- `bloom_light_show` (uses AUDIO_TEMPO_MAGNITUDE for per-bin visualization)
- `beat_tunnel` (uses AUDIO_TEMPO_PHASE for beat synchronization)
- Any future patterns using tempo macros

These patterns currently see zeros and cannot react to beat data.

---

## See Full Analysis

Detailed technical analysis with line-by-line traces:
`/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/analysis/TEMPO_DATA_SYNCHRONIZATION_ISSUE.md`
