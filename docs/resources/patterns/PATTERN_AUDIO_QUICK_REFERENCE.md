---
title: Pattern Audio Interface - Quick Reference Card
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Pattern Audio Interface - Quick Reference Card

## One-Page Cheat Sheet for Pattern Developers

---

## Basic Usage Template

```cpp
#include "pattern_audio_interface.h"

void draw_my_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();              // Always first!

    if (!AUDIO_IS_FRESH()) return;      // Skip if no new data (optional)

    float bass = AUDIO_BASS();          // Get audio data
    float treble = AUDIO_TREBLE();

    if (AUDIO_IS_STALE()) {             // Handle silence
        bass *= 0.95f;
        treble *= 0.95f;
    }

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(treble, 0, bass);
    }
}
```

---

## Essential Macros

### Initialization
```cpp
PATTERN_AUDIO_START()           // Must be first line - creates 'audio' snapshot
```

### Query Macros
```cpp
AUDIO_IS_FRESH()                // true if data changed this frame
AUDIO_IS_AVAILABLE()            // true if audio system working
AUDIO_AGE_MS()                  // milliseconds since last update
AUDIO_IS_STALE()                // true if age > 50ms (silence)
```

### Frequency Bands
```cpp
AUDIO_BASS()                    // 55-220 Hz (bins 0-8)
AUDIO_MIDS()                    // 440-880 Hz (bins 16-32)
AUDIO_TREBLE()                  // 1.76-6.4 kHz (bins 48-63)
```

### Scalar Values
```cpp
AUDIO_VU                        // Overall volume (0.0-1.0)
AUDIO_TEMPO_CONFIDENCE          // Beat strength (0.0-1.0)
AUDIO_NOVELTY                   // Spectral change (0.0-1.0)
```

### Array Access
```cpp
AUDIO_SPECTRUM[i]               // Raw spectrum bin (0-63)
AUDIO_SPECTRUM_SMOOTH[i]        // Smoothed spectrum bin (0-63)
AUDIO_CHROMAGRAM[i]             // Musical note energy (0-11)
```

---

## Common Patterns

### Pattern 1: Simple Spectrum
```cpp
PATTERN_AUDIO_START();
if (!AUDIO_IS_FRESH()) return;

for (int i = 0; i < NUM_LEDS; i++) {
    int bin = (i * 64) / NUM_LEDS;
    float mag = AUDIO_SPECTRUM_SMOOTH[bin];
    leds[i] = hsv(i * 5, 1.0, mag);
}
```

### Pattern 2: Beat Pulse
```cpp
PATTERN_AUDIO_START();
float beat = AUDIO_TEMPO_CONFIDENCE;
float brightness = beat * beat;
fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
```

### Pattern 3: RGB Bands
```cpp
PATTERN_AUDIO_START();
if (!AUDIO_IS_FRESH()) return;

for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(AUDIO_TREBLE(), AUDIO_MIDS(), AUDIO_BASS());
}
```

### Pattern 4: With Fallback
```cpp
PATTERN_AUDIO_START();

if (!AUDIO_IS_AVAILABLE()) {
    // Time-based fallback
    float brightness = 0.5 + 0.5 * sinf(time);
    fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
    return;
}

float bass = AUDIO_BASS();
// ... normal pattern ...
```

---

## Frequency Reference

| Bin | Frequency | Note | Type |
|-----|-----------|------|------|
| 0-8 | 55-220 Hz | A1-C#2 | BASS |
| 16-32 | 87-311 Hz | F2-D#4 | MIDS |
| 48-63 | 277-622 Hz | C#4-D#5 | TREBLE |

---

## Migration Checklist

- [ ] Add `PATTERN_AUDIO_START()` at top of function
- [ ] Replace `spectrogram[i]` → `AUDIO_SPECTRUM[i]`
- [ ] Replace `spectrogram_smooth[i]` → `AUDIO_SPECTRUM_SMOOTH[i]`
- [ ] Replace `chromagram[i]` → `AUDIO_CHROMAGRAM[i]`
- [ ] Replace `audio_level` → `AUDIO_VU`
- [ ] Replace `vu_level` → `AUDIO_VU`
- [ ] Replace `tempi[0].beat` → `AUDIO_TEMPO_CONFIDENCE`
- [ ] Add `if (!AUDIO_IS_FRESH()) return;` (optional)
- [ ] Add stale data handling (optional)

---

## Performance Tips

1. **Always check freshness**: `if (!AUDIO_IS_FRESH()) return;`
   - Saves ~75% CPU
2. **Cache band values**: Don't call `AUDIO_BASS()` in loop
3. **Use smoothed data**: `AUDIO_SPECTRUM_SMOOTH` for less flicker
4. **Handle stale data**: Fade on silence for better UX

---

## Common Mistakes

### ❌ Wrong: Missing PATTERN_AUDIO_START()
```cpp
void draw_pattern() {
    float bass = AUDIO_BASS();  // ERROR: 'audio' undefined
}
```

### ✓ Correct: Call macro first
```cpp
void draw_pattern() {
    PATTERN_AUDIO_START();      // Creates 'audio' variable
    float bass = AUDIO_BASS();
}
```

### ❌ Wrong: Out of bounds
```cpp
int bin = position * 64;        // Can be 64 (out of bounds!)
float mag = AUDIO_SPECTRUM[bin];
```

### ✓ Correct: Clamp to valid range
```cpp
int bin = position * 63;        // Max 63 (last valid index)
float mag = AUDIO_SPECTRUM[bin];
```

### ❌ Wrong: Inefficient
```cpp
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(AUDIO_BASS(), 0, 0);  // Recalculates every iteration!
}
```

### ✓ Correct: Cache value
```cpp
float bass = AUDIO_BASS();      // Calculate once
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(bass, 0, 0);
}
```

---

## Debug Helpers

### Check availability
```cpp
if (!AUDIO_IS_AVAILABLE()) {
    Serial.println("Audio not available!");
}
```

### Monitor age
```cpp
Serial.printf("Audio age: %u ms\n", AUDIO_AGE_MS());
```

### Validate range
```cpp
for (int i = 0; i < 64; i++) {
    float mag = AUDIO_SPECTRUM[i];
    if (mag < 0 || mag > 1.0) {
        Serial.printf("Bin %d out of range: %f\n", i, mag);
    }
}
```

---

## Advanced Helper Function

```cpp
// Custom frequency band
float get_audio_band_energy(const AudioDataSnapshot& audio,
                             int start_bin, int end_bin);

// Example: Low-mids (220-440 Hz)
float low_mids = get_audio_band_energy(audio, 24, 40);
```

---

## Full API Summary

| Category | Count | Examples |
|----------|-------|----------|
| Primary Macro | 1 | `PATTERN_AUDIO_START()` |
| Array Accessors | 4 | `AUDIO_SPECTRUM[i]` |
| Scalar Accessors | 4 | `AUDIO_VU` |
| Query Macros | 4 | `AUDIO_IS_FRESH()` |
| Band Macros | 3 | `AUDIO_BASS()` |
| Helper Functions | 1 | `get_audio_band_energy()` |
| **Total** | **17** | |

---

## Documentation Files

1. **pattern_audio_interface.h** - Header with inline docs
2. **PATTERN_AUDIO_API_REFERENCE.md** - Complete API reference (25 pages)
3. **PHASE_2_PATTERN_MIGRATION_EXAMPLES.md** - Before/after examples (20 pages)
4. **PHASE_2_VALIDATION_CHECKLIST.md** - Testing procedures (18 pages)
5. **PHASE_2_IMPLEMENTATION_SUMMARY.md** - Phase 2 summary (17 pages)

---

## Need Help?

- **API Reference**: See `PATTERN_AUDIO_API_REFERENCE.md`
- **Migration Guide**: See `PHASE_2_PATTERN_MIGRATION_EXAMPLES.md`
- **Testing**: See `PHASE_2_VALIDATION_CHECKLIST.md`
- **Inline Help**: Check comments in `pattern_audio_interface.h`

---

**Last Updated**: 2025-10-26
**Phase**: 2 of 4 (Pattern Interface)
**Status**: Complete
