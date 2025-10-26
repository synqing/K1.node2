---
author: Claude (SUPREME Analyst)
date: 2025-10-27
status: published
intent: Visual diagram showing tempo data flow from audio processing to LED rendering with bug location highlighted
---

# Tempo Data Flow Diagram

## Current (Broken) Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIO TASK (Core 1)                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ acquire_sample  │  ← Microphone I2S
                    │    _chunk()     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  calculate_     │
                    │ magnitudes()    │  → spectrogram[64] ✓
                    └────────┬────────┘     spectrogram_smooth[64] ✓
                             │
                             ├─────────────────────────────────────┐
                             │                                     │
                             ▼                                     ▼
                    ┌─────────────────┐                   ┌──────────────┐
                    │ audio_back      │                   │ novelty_curve│
                    │  .spectrogram[] │ ✓                 │    [1024]    │ ✓
                    │  .spectrogram_  │ ✓                 └──────┬───────┘
                    │   smooth[]      │                          │
                    │  .vu_level      │ ✓                        │
                    │                 │                          ▼
                    │  .tempo_        │ ⚠️ ZEROED         ┌──────────────┐
                    │   magnitude[]   │    (line 495)     │smooth_tempi_ │
                    │  .tempo_phase[] │ ⚠️ ZEROED         │   curve()    │
                    │                 │    (line 496)     └──────┬───────┘
                    └─────────────────┘                          │
                             │                                   ▼
                             │                          ┌────────────────┐
                             │                          │calculate_tempo_│
                             │                          │  magnitudes()  │
                             │                          └────────┬───────┘
                             │                                   │
                             │                                   ▼
                             │                          ┌────────────────┐
                             │                          │  tempi[64]     │
                             │                          │   .magnitude   │ ✓
                             │                          │   .phase       │ ✓
                             │                          │   .beat        │ ✓
                             │                          └────────┬───────┘
                             │                                   │
                             │                                   ▼
                             │                          ┌────────────────┐
                             │                          │ detect_beats() │
                             │                          └────────┬───────┘
                             │                                   │
                             │                                   ▼
                             │                          ┌────────────────┐
                             │                          │tempo_confidence│ ✓
                             │                          └────────┬───────┘
                             │                                   │
                             │                                   ▼
                             │                          ┌────────────────┐
                             │                          │ audio_back.    │
                             │                          │  tempo_        │ ✓
                             │◄─────────────────────────┤  confidence    │
                             │                          └────────────────┘
                             │
                             │  ⚠️ MISSING: Copy tempi[].magnitude → audio_back.tempo_magnitude[]
                             │  ⚠️ MISSING: Copy tempi[].phase → audio_back.tempo_phase[]
                             │
                             ▼
                    ┌─────────────────┐
                    │finish_audio_    │
                    │   frame()       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ commit_audio_   │  memcpy(audio_front, audio_back)
                    │    data()       │  ⚠️ Copies ZEROS for tempo arrays
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  audio_front    │
                    │   .spectrogram  │ ✓
                    │   .vu_level     │ ✓
                    │   .tempo_       │
                    │    confidence   │ ✓
                    │   .tempo_       │
                    │    magnitude[]  │ ✗ ALL ZEROS
                    │   .tempo_phase[]│ ✗ ALL ZEROS
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────┐
│                            │    PATTERN RENDERING (Core 0)          │
└────────────────────────────┼────────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │get_audio_       │
                    │  snapshot()     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Pattern's audio │  (local snapshot copy)
                    │  .tempo_        │
                    │   magnitude[]   │ ✗ ALL ZEROS
                    │  .tempo_phase[] │ ✗ ALL ZEROS
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ AUDIO_TEMPO_    │
                    │  MAGNITUDE(i)   │  → audio.tempo_magnitude[i]
                    └────────┬────────┘     → 0.0 ✗
                             │
                             ▼
                    ┌─────────────────┐
                    │ brightness =    │
                    │  magnitude *    │  → 0.0 * freshness * sine_factor
                    │  freshness *    │  → 0.0 ✗
                    │  sine_factor    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ brightness =    │
                    │  fmaxf(0.2,     │  → fmaxf(0.2, 0.0)
                    │  brightness)    │  → 0.2 (static dim floor)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ leds[i] =       │
                    │  color * 0.2 *  │  → Dim static gradient
                    │  params.        │     (no audio reactivity)
                    │  brightness     │
                    └─────────────────┘
```

---

## Fixed Data Flow (After Implementing Copy Loop)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIO TASK (Core 1)                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                        (same as above)
                              │
                              ▼
                    ┌─────────────────┐
                    │  tempi[64]      │
                    │   .magnitude    │ ✓ Valid 0.0-1.0
                    │   .phase        │ ✓ Valid -π to +π
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ detect_beats()  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────────────────────────┐
                    │ audio_back.tempo_confidence = ...       │ ✓
                    │                                          │
                    │ ✅ NEW: Copy loop (CRITICAL FIX)        │
                    │ for (i = 0; i < NUM_TEMPI; i++) {       │
                    │   audio_back.tempo_magnitude[i] =       │
                    │     tempi[i].magnitude;                 │
                    │   audio_back.tempo_phase[i] =           │
                    │     tempi[i].phase;                     │
                    │ }                                        │
                    └────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  audio_back     │
                    │   .tempo_       │
                    │    magnitude[]  │ ✓ Valid values copied
                    │   .tempo_phase[]│ ✓ Valid phases copied
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ commit_audio_   │  memcpy(audio_front, audio_back)
                    │    data()       │  ✓ Copies VALID data
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  audio_front    │
                    │   .tempo_       │
                    │    magnitude[]  │ ✓ Valid 0.0-1.0
                    │   .tempo_phase[]│ ✓ Valid -π to +π
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────┐
│                            │    PATTERN RENDERING (Core 0)          │
└────────────────────────────┼────────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Pattern's audio │
                    │  .tempo_        │
                    │   magnitude[]   │ ✓ Valid values
                    │  .tempo_phase[] │ ✓ Valid phases
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ AUDIO_TEMPO_    │
                    │  MAGNITUDE(i)   │  → audio.tempo_magnitude[i]
                    └────────┬────────┘     → 0.0-1.0 ✓
                             │
                             ▼
                    ┌─────────────────┐
                    │ brightness =    │
                    │  magnitude *    │  → Valid calculation
                    │  freshness *    │  → 0.0-1.0 ✓
                    │  sine_factor    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ leds[i] =       │
                    │  color *        │  → Audio-reactive animation
                    │  brightness *   │     (brightness modulates with beat)
                    │  params.        │
                    │  brightness     │
                    └─────────────────┘
```

---

## File Locations for Data Flow

| Stage | File | Line(s) | Status |
|-------|------|---------|--------|
| Goertzel frequency analysis | `firmware/src/audio/goertzel.cpp` | 427-509 | ✓ Working |
| Zero tempo arrays (BUG) | `firmware/src/audio/goertzel.cpp` | 495-496 | ✗ Zeros data |
| Tempo magnitude calculation | `firmware/src/audio/tempo.cpp` | 185-219 | ✓ Working |
| Beat detection | `firmware/src/audio/tempo.cpp` | 269-301 | ✓ Working |
| Sync tempo_confidence | `firmware/src/main.cpp` | 61 | ✓ Working |
| **MISSING: Sync arrays** | `firmware/src/main.cpp` | **After line 61** | **✗ Missing** |
| Buffer swap | `firmware/src/audio/goertzel.cpp` | 146-166 | ✓ Working |
| Snapshot acquisition | `firmware/src/audio/goertzel.cpp` | 116-139 | ✓ Working |
| Macro expansion | `firmware/src/pattern_audio_interface.h` | 305 | ✓ Working |
| Tempiscope brightness | `firmware/src/generated_patterns.h` | 653-664 | ✗ Gets zeros |
| Beat Tunnel phase window | `firmware/src/generated_patterns.h` | 778-792 | ✗ Gets zeros |

---

## Memory Layout

```
AudioDataSnapshot Structure (sizeof = ~2KB per buffer)
┌─────────────────────────────────────────────────┐
│ spectrogram[64]           256 bytes  ✓ Working  │
│ spectrogram_smooth[64]    256 bytes  ✓ Working  │
│ chromagram[12]             48 bytes  ✓ Working  │
│ vu_level                    4 bytes  ✓ Working  │
│ vu_level_raw                4 bytes  ✓ Working  │
│ novelty_curve               4 bytes  ✓ Working  │
│ tempo_confidence            4 bytes  ✓ Working  │
│ tempo_magnitude[64]       256 bytes  ✗ ZEROS    │ ← BUG HERE
│ tempo_phase[64]           256 bytes  ✗ ZEROS    │ ← BUG HERE
│ fft_smooth[128]           512 bytes  (unused)   │
│ update_counter              4 bytes  ✓ Working  │
│ timestamp_us                8 bytes  ✓ Working  │
│ is_valid                    1 byte   ✓ Working  │
└─────────────────────────────────────────────────┘

Total per snapshot: ~1.4 KB
Double-buffered (audio_front + audio_back): ~2.8 KB
```

---

## Copy Operation Performance Impact

**Current**: Copy 128 floats (64 magnitude + 64 phase) = 512 bytes
**Time**: ~5-10μs on ESP32-S3 @ 240MHz (memcpy or loop)
**Impact**: Negligible (< 0.05% of 10ms frame time)

**Alternative**: Use memcpy for bulk copy:
```cpp
// After detect_beats() in main.cpp:61
memcpy(audio_back.tempo_magnitude, tempi, sizeof(float) * NUM_TEMPI);
```
**Warning**: This requires `tempi[]` array elements to have `magnitude` as first field (layout-dependent)

**Recommended**: Use explicit loop for clarity and maintainability:
```cpp
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    audio_back.tempo_magnitude[i] = tempi[i].magnitude;
    audio_back.tempo_phase[i] = tempi[i].phase;
}
```

---

## Validation Checklist

After implementing the fix, verify:

- [ ] `audio_back.tempo_magnitude[i]` contains non-zero values (add Serial.printf)
- [ ] `audio_front.tempo_magnitude[i]` matches `audio_back` after swap
- [ ] Pattern's `audio.tempo_magnitude[i]` matches `audio_front`
- [ ] `AUDIO_TEMPO_MAGNITUDE(i)` returns values in 0.0-1.0 range
- [ ] `AUDIO_TEMPO_PHASE(i)` returns values in -π to +π range
- [ ] Tempiscope shows dynamic brightness changes during music playback
- [ ] Beat Tunnel shows synchronized "tunnel" flashes at beat phase windows
- [ ] Performance impact < 1% (measure with profiler)

---

## References

- Root cause analysis: `docs/analysis/tempo_magnitude_data_loss_root_cause.md`
- Macro definitions: `firmware/src/pattern_audio_interface.h:305-353`
- Tempo struct: `firmware/src/audio/goertzel.h:72-83`
- Tempo calculation: `firmware/src/audio/tempo.cpp:185-219`
- Bug location: `firmware/src/audio/goertzel.cpp:495-496`
- Fix location: `firmware/src/main.cpp:61` (after `audio_back.tempo_confidence = ...`)
