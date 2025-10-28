---
title: Audio Synchronization Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Audio Synchronization Guide
## K1.reinvented - Thread-Safe Audio-Reactive Pattern Development

**Last Updated**: 2025-10-26
**Status**: 🚧 **DRAFT** - Awaiting Phase 1-3 Implementation
**Audience**: Firmware developers, pattern creators

---

## Overview

This guide explains how to safely access audio data in K1.reinvented LED patterns. The audio processing pipeline runs on a separate core (Core 1 at 100 Hz) while patterns render on Core 0 (450+ FPS), requiring careful synchronization to avoid race conditions.

---

## Quick Start

### For Pattern Developers

**DO THIS** (Safe, thread-safe access):
```cpp
void draw_my_pattern(float time, const PatternParameters& params) {
    // 1. Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    // 2. Check if data is fresh (optional but recommended)
    if (!AUDIO_IS_FRESH()) {
        return;  // Skip frame if audio hasn't updated
    }

    // 3. Use AUDIO_* macros to access data
    float bass_energy = AUDIO_BASS();           // Bass region (55-220 Hz)
    float magnitude = AUDIO_SPECTRUM[32];       // Specific bin
    float beat = AUDIO_VU;                      // Overall level

    // 4. Render LEDs using audio data
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(bass_energy, 0, beat);
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**DON'T DO THIS** (Unsafe, race conditions):
```cpp
void draw_my_pattern(float time, const PatternParameters& params) {
    // ❌ WRONG: Direct access to global arrays
    float bass = spectrogram[0];      // RACE CONDITION!
    float beat = tempi[0].beat;       // RACE CONDITION!

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(bass, 0, beat);
    }
}
```

---

## Audio Data Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE 1 (Audio Thread)                    │
│                        100 Hz Update                        │
├─────────────────────────────────────────────────────────────┤
│  SPH0645 Microphone (I2S, 44.1 kHz PDM)                     │
│         ↓                                                   │
│  Goertzel DFT (64 frequency bins)                           │
│         ↓                                                   │
│  Audio Processing (beat, chromagram, FFT)                   │
│         ↓                                                   │
│  UPDATE audio_back buffer                                   │
│         ↓                                                   │
│  commit_audio_data() → ATOMIC SWAP                          │
└─────────────────────────────────────────────────────────────┘
                           ↓ (Thread-safe)
┌─────────────────────────────────────────────────────────────┐
│                   CORE 0 (Render Thread)                    │
│                      450+ FPS Rendering                     │
├─────────────────────────────────────────────────────────────┤
│  PATTERN_AUDIO_START()                                      │
│         ↓                                                   │
│  get_audio_snapshot(&audio) → READ audio_front             │
│         ↓                                                   │
│  Access via AUDIO_* macros                                  │
│         ↓                                                   │
│  Render LEDs (no race conditions!)                          │
└─────────────────────────────────────────────────────────────┘
```

### Double-Buffering Strategy

**Problem**: Two threads accessing same memory = race conditions

**Solution**: Double-buffering with atomic swaps

```
Audio Thread (Core 1):          Pattern Thread (Core 0):

  Write to audio_back ──┐         ┌── Read from audio_front
                         │         │
                         ▼         ▼
                    ┌─────────────────┐
                    │  MUTEX GUARD    │
                    │  Atomic Swap    │
                    └─────────────────┘
                         │         │
  Continue writing ──┘   └── Continue reading
```

**Key Insight**: Writers never block readers, readers never block writers (except during brief swap)

---

## Audio Data Structures

### AudioDataSnapshot

Complete audio state snapshot (captured atomically):

```cpp
typedef struct {
    // Frequency analysis
    float spectrogram[64];           // 64 bins (55 Hz - 6.4 kHz)
    float spectrogram_smooth[64];    // 3-frame smoothed version
    float chromagram[12];             // 12 musical note classes (C-B)

    // Amplitude
    float vu_level;                   // Peak amplitude (0.0-1.0)
    float vu_level_raw;               // Unprocessed peak

    // Tempo/Beat
    float tempo_confidence;           // Beat detection confidence
    float tempo_magnitude[96];        // Tempo energy bins
    float tempo_phase[96];            // Beat phase

    // FFT alternative
    float fft_smooth[128];            // 128 FFT bins

    // Metadata
    uint32_t update_counter;          // Increments each update
    uint64_t timestamp_us;            // Microsecond timestamp
    bool is_valid;                    // True if data fresh
} AudioDataSnapshot;
```

### Update Rates

| Component | Rate | Period | Thread |
|-----------|------|--------|--------|
| Audio Processing | 100 Hz | 10.0 ms | Core 1 |
| Pattern Rendering | 450 Hz | 2.2 ms | Core 0 |
| Buffer Swap | 100 Hz | 10.0 ms | Core 1 |
| LED Transmission | 450 Hz | 2.2 ms | Core 0 |

**Important**: ~4.5 pattern frames per audio update (patterns may read same data multiple times)

---

## Pattern Audio Interface

### PATTERN_AUDIO_START() Macro

**Must be first line** in any audio-reactive pattern:

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // ← REQUIRED!

    // Now you can use AUDIO_* macros safely
    float bass = AUDIO_BASS();
    // ...
}
```

**What it does**:
1. Declares local `AudioDataSnapshot audio` variable
2. Calls `get_audio_snapshot(&audio)` to get thread-safe copy
3. Sets up freshness tracking variables
4. Calculates data age

**Expands to**:
```cpp
AudioDataSnapshot audio = {0};
bool audio_available = get_audio_snapshot(&audio);
static uint32_t pattern_last_update = 0;
bool audio_is_fresh = (audio_available &&
                       audio.update_counter != pattern_last_update);
pattern_last_update = audio.update_counter;
uint32_t audio_age_ms = audio_available ?
    ((esp_timer_get_time() - audio.timestamp_us) / 1000) : 9999;
```

---

### Audio Accessor Macros

After calling `PATTERN_AUDIO_START()`, use these macros:

#### Frequency Data
```cpp
AUDIO_SPECTRUM[i]         // Raw spectrum bin i (0-63)
AUDIO_SPECTRUM_SMOOTH[i]  // Smoothed spectrum bin i
AUDIO_CHROMAGRAM[i]       // Musical note class i (0-11, C-B)
AUDIO_FFT[i]              // FFT bin i (0-127)
```

#### Amplitude Data
```cpp
AUDIO_VU              // Peak amplitude (0.0-1.0, auto-ranged)
AUDIO_VU_RAW          // Raw peak (before auto-ranging)
AUDIO_NOVELTY         // Spectral change detection
```

#### Tempo/Beat Data
```cpp
AUDIO_TEMPO_CONFIDENCE    // Beat detection confidence
// Note: tempi array access via audio.tempo_magnitude[i]
```

#### Frequency Bands (Convenience)
```cpp
AUDIO_BASS()      // 55-220 Hz (bins 0-8)
AUDIO_MIDS()      // 440-880 Hz (bins 16-32)
AUDIO_TREBLE()    // 1.76-6.4 kHz (bins 48-63)
```

#### Data Quality Queries
```cpp
AUDIO_IS_FRESH()      // True if data updated since last frame
AUDIO_IS_AVAILABLE()  // True if snapshot retrieved successfully
AUDIO_AGE_MS()        // Age of data in milliseconds
AUDIO_IS_STALE()      // True if data >50ms old (5+ audio frames)
```

---

## Common Patterns

### Pattern 1: Full Spectrum Visualization

Maps frequency spectrum across LED strip:

```cpp
void draw_spectrum_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED position to spectrum (0.0-1.0)
        float position = float(i) / float(NUM_LEDS - 1);

        // Get spectrum bin for this position
        int bin = int(position * 63);
        float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];

        // Apply frequency response adjustments
        if (position < 0.33f) {
            magnitude *= params.spectrum_low;   // Bass boost
        } else if (position < 0.66f) {
            magnitude *= params.spectrum_mid;   // Mid control
        } else {
            magnitude *= params.spectrum_high;  // Treble boost
        }

        // Visual response curve
        magnitude = sqrtf(fmin(1.0f, fmax(0.0f, magnitude)));

        // Color = rainbow across strip
        float hue = position;
        leds[i] = hsv_to_rgb(hue, 1.0f, magnitude);

        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Pattern 2: Beat-Reactive Pulse

Global brightness pulses with beat:

```cpp
void draw_beat_pulse(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    // Get bass energy (bins 0-20)
    float bass = 0.0f;
    for (int i = 0; i < 21; i++) {
        bass += AUDIO_SPECTRUM[i];
    }
    bass /= 21.0f;

    // Apply beat sensitivity parameter
    bass = fmin(1.0f, bass * params.beat_sensitivity);

    // Fill all LEDs with same color (global pulse)
    CRGBF color = CRGBF(bass, bass * 0.5f, 0);  // Orange pulse

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = color;
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Pattern 3: Stale Data Handling

Gracefully handle silence:

```cpp
void draw_with_fade(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    // Only update if audio is fresh
    static float last_energy = 0.0f;
    if (AUDIO_IS_FRESH()) {
        last_energy = AUDIO_VU;
    } else {
        // Fade out if no fresh data
        last_energy *= 0.95f;
    }

    // Render using (possibly faded) energy
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(last_energy, 0, 0);
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Pattern 4: Frequency Band Isolation

Separate bass, mids, treble:

```cpp
void draw_frequency_bands(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    float bass = AUDIO_BASS();       // 55-220 Hz
    float mids = AUDIO_MIDS();       // 440-880 Hz
    float treble = AUDIO_TREBLE();   // 1.76-6.4 kHz

    int leds_per_band = NUM_LEDS / 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        CRGBF color;
        if (i < leds_per_band) {
            color = CRGBF(0, 0, bass);      // Blue = bass
        } else if (i < 2 * leds_per_band) {
            color = CRGBF(0, mids, 0);      // Green = mids
        } else {
            color = CRGBF(treble, 0, 0);    // Red = treble
        }

        leds[i] = color;
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

## Troubleshooting

### Issue: Pattern not responding to audio

**Symptoms**: LEDs render but don't react to music

**Checklist**:
1. ✅ Did you call `PATTERN_AUDIO_START()` at beginning?
2. ✅ Are you using `AUDIO_*` macros (not direct globals)?
3. ✅ Is audio processing initialized in `main.cpp` setup?
4. ✅ Check serial output: "Audio data synchronization initialized"
5. ✅ Verify microphone is connected and working

**Debug**:
```cpp
void draw_debug(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    Serial.printf("Audio available: %d | Fresh: %d | Age: %u ms\n",
                 AUDIO_IS_AVAILABLE(),
                 AUDIO_IS_FRESH(),
                 AUDIO_AGE_MS());

    Serial.printf("Bass: %.3f | VU: %.3f | Counter: %u\n",
                 AUDIO_BASS(),
                 AUDIO_VU,
                 audio.update_counter);
}
```

---

### Issue: Jerky or delayed audio response

**Symptoms**: LEDs lag behind audio, or jump suddenly

**Possible Causes**:
1. **Stale data detection too aggressive**: Increase staleness threshold
2. **Rendering too slow**: Pattern taking >10ms to render
3. **Mutex contention**: Check for deadlocks (should be rare)

**Solutions**:
```cpp
// Adjust staleness threshold
#define AUDIO_IS_STALE()  (audio_age_ms > 100)  // Was 50ms

// Profile render time
uint32_t start = micros();
// ... render code ...
uint32_t elapsed = micros() - start;
if (elapsed > 8000) {  // >8ms warning
    Serial.printf("⚠️ Pattern slow: %u us\n", elapsed);
}
```

---

### Issue: Random glitches or flashes

**Symptoms**: Occasional single-frame flickers

**Likely Cause**: Race condition (Phase 1-3 not implemented!)

**Check**:
1. Verify `AudioDataSnapshot` structure exists
2. Confirm double-buffering is active
3. Run race condition detector (see Phase 4 validation)

**If Phases 1-3 not implemented**:
- Glitches are expected (~5% chance per frame)
- Implement thread-safe access as soon as possible

---

### Issue: Pattern shows no activity during silence

**Expected Behavior**: This is CORRECT!

If you want activity during silence:
```cpp
void draw_with_idle(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    float energy = AUDIO_VU;

    // Provide idle animation if silent
    if (energy < 0.01f) {
        energy = 0.3f * (sinf(time * 2.0f) * 0.5f + 0.5f);
    }

    // ... render using energy ...
}
```

---

## Performance Considerations

### Memory Usage

Each `PATTERN_AUDIO_START()` creates a local snapshot:
- Size: ~2 KB (AudioDataSnapshot struct)
- Lifetime: Stack-allocated (freed when function returns)
- Cost: <1ms copy time (negligible)

**Best Practice**: Call once per pattern, reuse throughout function

**Avoid**:
```cpp
// ❌ DON'T: Multiple snapshots wasteful
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Snapshot 1
    // ...
    PATTERN_AUDIO_START();  // Snapshot 2 (unnecessary!)
}
```

---

### CPU Impact

**Audio Processing** (Core 1):
- Goertzel DFT: ~3-5ms per frame
- Buffer swap: <0.1ms
- **Total**: ~5ms of 10ms budget (50% utilization)

**Pattern Rendering** (Core 0):
- Snapshot copy: ~0.5ms
- Pattern logic: Variable (target <8ms)
- LED transmission: ~1ms
- **Total**: Target <10ms to avoid audio frame skip

---

### Optimization Tips

1. **Skip unnecessary frames**:
```cpp
if (!AUDIO_IS_FRESH()) return;  // Reuse previous frame
```

2. **Cache expensive calculations**:
```cpp
static float last_bass = 0.0f;
if (AUDIO_IS_FRESH()) {
    last_bass = AUDIO_BASS();  // Only recalculate when new
}
```

3. **Use smoothed data**:
```cpp
// Prefer AUDIO_SPECTRUM_SMOOTH (already averaged)
// over AUDIO_SPECTRUM (raw, noisy)
```

4. **Limit bin access**:
```cpp
// Access only bins you need
float bass = AUDIO_SPECTRUM[0];  // Just one bin

// vs.
for (int i = 0; i < 64; i++) {  // All bins (slower)
    sum += AUDIO_SPECTRUM[i];
}
```

---

## Best Practices

### DO

✅ Always call `PATTERN_AUDIO_START()` first
✅ Use `AUDIO_*` macros for all data access
✅ Check `AUDIO_IS_FRESH()` to skip redundant work
✅ Handle silence gracefully (fade or idle animation)
✅ Apply perceptual curves (`sqrtf`, `powf`) to magnitudes
✅ Use `params` for runtime adjustability
✅ Keep render time <8ms

### DON'T

❌ Access global audio arrays directly (`spectrogram[i]`)
❌ Call `PATTERN_AUDIO_START()` multiple times
❌ Ignore stale data (check freshness)
❌ Use raw magnitude without curves (looks bad)
❌ Hardcode audio sensitivity (use `params.beat_sensitivity`)
❌ Block or delay rendering (no `delay()` calls)

---

## Reference

### Audio Frequency Bins

| Bin Range | Frequency Range | Musical Context |
|-----------|----------------|-----------------|
| 0-8 | 55-220 Hz | Bass, kick drum |
| 9-15 | 233-415 Hz | Low mids, bass guitar |
| 16-31 | 440-880 Hz | Mids, vocals, guitar |
| 32-47 | 932-1.66 kHz | High mids, cymbals |
| 48-63 | 1.76-6.4 kHz | Treble, hi-hats, air |

### Chromagram Notes

| Index | Note | Frequency (A440) |
|-------|------|------------------|
| 0 | C | 261.63 Hz |
| 1 | C# | 277.18 Hz |
| 2 | D | 293.66 Hz |
| 3 | D# | 311.13 Hz |
| 4 | E | 329.63 Hz |
| 5 | F | 349.23 Hz |
| 6 | F# | 369.99 Hz |
| 7 | G | 392.00 Hz |
| 8 | G# | 415.30 Hz |
| 9 | A | 440.00 Hz |
| 10 | A# | 466.16 Hz |
| 11 | B | 493.88 Hz |

---

## Further Reading

- `IMPLEMENTATION_PLAN_AUDIO_SYNC.md` - Full implementation details
- `PATTERN_DEVELOPER_GUIDE.md` - Creating new patterns
- `firmware/src/audio/goertzel.h` - Audio processing implementation
- `firmware/src/pattern_audio_interface.h` - Interface definitions

---

**Status**: 🚧 **DRAFT** - This guide describes the PLANNED architecture.
**Implementation**: Phases 1-3 must be completed before this interface is available.
**Timeline**: 4-7 days from start of Phase 1

**Last Updated**: 2025-10-26
**Author**: Claude Code
**Version**: 1.0.0-draft
