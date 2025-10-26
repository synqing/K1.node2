---
author: Claude (SUPREME Analyst)
date: 2025-10-27
status: published
intent: Step-by-step implementation guide for fixing tempo magnitude/phase data loss bug
---

# Tempo Magnitude Fix - Implementation Guide

## Quick Summary

**Bug**: Tempo magnitude and phase arrays are zeroed in `goertzel.cpp:495-496` but never populated, causing patterns to receive zeros.

**Fix**: Add copy loop in `main.cpp` after `detect_beats()` to synchronize `tempi[]` array data into `audio_back` snapshot.

**Impact**: Enables Tempiscope and Beat Tunnel patterns to display audio-reactive animations.

---

## Implementation Steps

### Step 1: Add Copy Loop to main.cpp

**File**: `firmware/src/main.cpp`
**Location**: After line 61 (after `audio_back.tempo_confidence = tempo_confidence;`)

**Current code**:
```cpp
// Line 58-61 (current)
// SYNC TEMPO CONFIDENCE TO AUDIO SNAPSHOT (NEW - FIX)
// Copy calculated tempo_confidence to audio_back so patterns can access it
extern float tempo_confidence;  // From tempo.cpp
audio_back.tempo_confidence = tempo_confidence;

// Buffer synchronization
finish_audio_frame();          // ~0-5ms buffer swap
```

**New code**:
```cpp
// Line 58-61 (keep as-is)
// SYNC TEMPO CONFIDENCE TO AUDIO SNAPSHOT (NEW - FIX)
// Copy calculated tempo_confidence to audio_back so patterns can access it
extern float tempo_confidence;  // From tempo.cpp
audio_back.tempo_confidence = tempo_confidence;

// SYNC TEMPO MAGNITUDE AND PHASE ARRAYS (CRITICAL FIX FOR TEMPISCOPE/BEAT_TUNNEL)
// Copy per-bin tempo data from tempi[] array to audio_back for pattern access
// This enables AUDIO_TEMPO_MAGNITUDE(i) and AUDIO_TEMPO_PHASE(i) macros to work
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;  // Normalized 0.0-1.0
    audio_back.tempo_phase[i] = tempi[i].phase;          // Radians -π to +π
}

// Buffer synchronization
finish_audio_frame();          // ~0-5ms buffer swap
```

**Line count**: Add 8 lines (2 comment lines + 5 code lines + 1 blank line)

---

### Step 2: Remove Zeroing Code from goertzel.cpp (Optional Cleanup)

**File**: `firmware/src/audio/goertzel.cpp`
**Location**: Lines 492-496

**Current code**:
```cpp
// PHASE 2: Tempo data sync for beat/tempo reactive patterns
// tempo.h will populate these arrays after calculating tempi[] and tempi_smooth[]
// For now, zero the arrays - patterns fall back to AUDIO_TEMPO_CONFIDENCE if needed
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```

**New code** (optional - can leave as-is since copy loop will overwrite):
```cpp
// PHASE 2: Tempo data sync for beat/tempo reactive patterns
// These arrays are populated in main.cpp after detect_beats() is called
// (Initialization to zero here is redundant but harmless)
memset(audio_back.tempo_magnitude, 0, sizeof(float) * NUM_TEMPI);
memset(audio_back.tempo_phase, 0, sizeof(float) * NUM_TEMPI);
```

**Rationale**: Leaving the memset calls is harmless and provides a clean initial state. The copy loop in `main.cpp` will overwrite these zeros with valid data before the buffer swap.

---

### Step 3: Add Diagnostic Logging (Optional - For Verification)

**File**: `firmware/src/main.cpp`
**Location**: After the copy loop (before `finish_audio_frame()`)

**Add** (optional, for testing):
```cpp
// DIAGNOSTIC: Verify tempo data is being synced (remove after verification)
static uint32_t last_tempo_debug = 0;
uint32_t now = millis();
if (now - last_tempo_debug > 1000) {
    last_tempo_debug = now;
    Serial.printf("[TEMPO SYNC] Bin 0: mag=%.3f phase=%.3f | Bin 32: mag=%.3f phase=%.3f | Confidence=%.2f\n",
        audio_back.tempo_magnitude[0], audio_back.tempo_phase[0],
        audio_back.tempo_magnitude[32], audio_back.tempo_phase[32],
        audio_back.tempo_confidence);
}
```

**Expected output** (during music playback):
```
[TEMPO SYNC] Bin 0: mag=0.123 phase=-1.234 | Bin 32: mag=0.456 phase=0.567 | Confidence=0.45
```

**Remove** this diagnostic code after verifying non-zero values appear during music playback.

---

### Step 4: Update Pattern Diagnostic Logs (Optional - For Debugging)

**File**: `firmware/src/generated_patterns.h`
**Location**: Tempiscope diagnostic log (line ~628)

**Current**:
```cpp
Serial.printf("[TEMPISCOPE] audio_available=%d, tempo_confidence=%.2f, brightness=%.2f, speed=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE, params.brightness, params.speed);
```

**Enhanced** (optional):
```cpp
Serial.printf("[TEMPISCOPE] audio_available=%d, tempo_conf=%.2f, mag[0]=%.3f, phase[0]=%.3f, brightness=%.2f\n",
    (int)audio_available, AUDIO_TEMPO_CONFIDENCE,
    AUDIO_TEMPO_MAGNITUDE(0), AUDIO_TEMPO_PHASE(0), params.brightness);
```

**Expected output after fix**:
```
[TEMPISCOPE] audio_available=1, tempo_conf=0.45, mag[0]=0.123, phase[0]=-1.234, brightness=1.0
```

---

## Validation Procedure

### Pre-Fix Behavior
1. Load Tempiscope or Beat Tunnel pattern
2. Play music with strong beats
3. **Observe**: LEDs show static dim gradient OR black screen
4. **Serial output**: `mag[0]=0.000, phase[0]=0.000` (all zeros)

### Post-Fix Behavior
1. Load Tempiscope or Beat Tunnel pattern
2. Play music with strong beats
3. **Observe**: LEDs show dynamic brightness changes synchronized to beat
4. **Serial output**: `mag[0]=0.123, phase[0]=-1.234` (non-zero, changing values)

### Specific Pattern Tests

#### Test 1: Tempiscope
- **Expected**: Each LED brightness should pulse/modulate based on its tempo bin
- **Validation**: Visually confirm LEDs are not static - brightness should vary with beat
- **Metric**: Peak LED brightness should reach > 0.8 during strong beats (vs. 0.2 static floor)

#### Test 2: Beat Tunnel
- **Expected**: "Tunnel" flashes should appear when phase is within beat window (0.65 ± 0.02)
- **Validation**: Visually confirm flashes occur synchronized with beat
- **Metric**: Flash rate should match dominant tempo (e.g., 120 BPM = 2 flashes/second)

#### Test 3: Silent Input
- **Expected**: LEDs should dim/fade when music stops
- **Validation**: Verify patterns don't show static output during silence
- **Metric**: Average brightness should drop below 0.3 within 2 seconds of silence

---

## Performance Impact Analysis

### CPU Time
**Added operations**: 128 float writes (64 magnitude + 64 phase)
**Estimated time**: 5-10μs @ 240MHz
**Frame time budget**: 10ms per audio frame
**Impact**: < 0.1% of frame time (negligible)

### Memory Impact
**No additional memory allocation** - uses existing `audio_back` buffer
**No stack impact** - loop uses only iterator variable

### Thread Safety
**No mutex required** - copy occurs before `finish_audio_frame()` buffer swap
**No race conditions** - `tempi[]` is only written by audio task on Core 1

---

## Rollback Plan

If unexpected issues occur:

1. **Comment out the copy loop** in `main.cpp`:
```cpp
// SYNC TEMPO MAGNITUDE AND PHASE ARRAYS (DISABLED - ROLLBACK)
/*
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
*/
```

2. **Revert to fallback mode** - patterns will use `AUDIO_TEMPO_CONFIDENCE` instead
3. **No data corruption risk** - arrays are zeroed in `goertzel.cpp`, so patterns receive valid (zero) data

---

## Future Enhancements (Optional)

### Enhancement 1: Smoothing
Add temporal smoothing to reduce jitter:
```cpp
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    // Exponential moving average (α = 0.8)
    audio_back.tempo_magnitude[i] = 0.8f * audio_back.tempo_magnitude[i] +
                                    0.2f * tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;  // Phase should not be smoothed
}
```

### Enhancement 2: Downsampling
If performance becomes an issue, reduce update rate:
```cpp
static uint8_t tempo_sync_counter = 0;
if (++tempo_sync_counter >= 2) {  // Update every 2 frames (50Hz → 25Hz)
    tempo_sync_counter = 0;
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = tempi[i].magnitude;
        audio_back.tempo_phase[i] = tempi[i].phase;
    }
}
```

### Enhancement 3: Selective Copy
If only a subset of bins is needed:
```cpp
// Only copy bins 16-48 (mid-range tempos ~60-140 BPM)
for (uint16_t i = 16; i < 48; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
```

---

## Testing Checklist

- [ ] Compile succeeds with no errors/warnings
- [ ] Tempiscope shows dynamic brightness during music playback
- [ ] Beat Tunnel shows synchronized flashes during music playback
- [ ] Diagnostic logs show non-zero magnitude/phase values
- [ ] Patterns fade to dim/black during silence
- [ ] No memory leaks (check heap usage with `esp_get_free_heap_size()`)
- [ ] No performance regression (measure frame time with profiler)
- [ ] No visual artifacts (flickering, incorrect colors, etc.)
- [ ] Works with various music genres (EDM, rock, classical, etc.)
- [ ] Parameter adjustments (brightness, speed) still work correctly

---

## Code References

**Files modified**:
- `firmware/src/main.cpp` (add copy loop after line 61)

**Files unchanged but related**:
- `firmware/src/audio/goertzel.cpp` (contains memset that zeros arrays)
- `firmware/src/audio/tempo.cpp` (calculates tempi[] values)
- `firmware/src/pattern_audio_interface.h` (defines macros)
- `firmware/src/generated_patterns.h` (uses macros in patterns)

**Dependencies**:
- `NUM_TEMPI` constant (defined in `goertzel.h`, value = 64)
- `tempi[]` array (defined in `goertzel.cpp`, extern in `tempo.h`)
- `audio_back` snapshot (defined in `goertzel.cpp`)

---

## Expected Results Summary

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| `AUDIO_TEMPO_MAGNITUDE(0)` | 0.0 (always) | 0.0-1.0 (varies) |
| `AUDIO_TEMPO_PHASE(0)` | 0.0 (always) | -π to +π (varies) |
| Tempiscope brightness | 0.2 (static) | 0.0-1.0 (dynamic) |
| Beat Tunnel flash rate | 0 Hz (no flashes) | 1-3 Hz (sync to beat) |
| Visual beat sync | No | Yes |
| Pattern responsiveness | Static/black | Audio-reactive |

---

## Questions & Troubleshooting

### Q: Why not copy in `calculate_magnitudes()` instead of `main.cpp`?
**A**: `calculate_magnitudes()` is called before `smooth_tempi_curve()` and `detect_beats()`, so `tempi[]` array is not yet populated with final values. The copy must occur **after** all tempo processing is complete.

### Q: Why not use memcpy instead of a loop?
**A**: The `tempi[]` array is an array of structs (`tempo` type), not a flat array of floats. We need to extract the `.magnitude` and `.phase` fields from each struct element. A memcpy would copy the entire struct (including unused fields) and would require careful alignment/offset management.

### Q: What if performance degrades?
**A**: The 128-float copy takes < 10μs, which is < 0.1% of the 10ms frame budget. If profiling shows a bottleneck, consider downsampling (update every 2-3 frames) or reducing the number of bins copied.

### Q: Can this cause buffer overflow?
**A**: No. `NUM_TEMPI = 64` is defined at compile time, and both `tempi[]` and `audio_back.tempo_magnitude[]` are allocated with this size. The loop bounds are validated at compile time.

### Q: What if patterns still show no animation after fix?
**A**: Check:
1. Diagnostic logs show non-zero magnitude values
2. Pattern parameter `brightness` is high (≥ 0.8)
3. Pattern parameter `saturation` is high (≥ 0.9)
4. Music input has strong beats (test with EDM or rock music)
5. Microphone gain is adequate (adjust via `configuration.microphone_gain`)

---

## Related Documentation

- Root cause analysis: `docs/analysis/tempo_magnitude_data_loss_root_cause.md`
- Data flow diagram: `docs/analysis/tempo_data_flow_diagram.md`
- Architecture overview: `docs/architecture/audio_pipeline_architecture.md` (TBD)
- Testing standards: `docs/resources/testing_standards.md`

---

## Sign-Off

**Implementation ready**: Yes
**Review required**: Yes (verify no side effects, confirm performance)
**Testing required**: Yes (validate Tempiscope/Beat Tunnel functionality)
**Risk level**: Low (isolated change, easy rollback)
**Estimated effort**: 15 minutes (code) + 30 minutes (testing)
