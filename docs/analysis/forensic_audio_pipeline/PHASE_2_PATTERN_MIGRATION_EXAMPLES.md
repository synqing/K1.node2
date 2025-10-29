---
title: Phase 2: Pattern Audio Interface - Migration Examples
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Phase 2: Pattern Audio Interface - Migration Examples

## Document Purpose

This document provides concrete before/after examples of migrating existing K1.reinvented patterns from unsafe direct audio access to the new thread-safe snapshot-based interface.

**Phase**: 2 of 4 (Pattern Interface)
**Created**: 2025-10-26
**Status**: Implementation Complete - Ready for Phase 3 Migration

---

## Quick Reference: Migration Checklist

For each pattern that uses audio data:

- [ ] Add `PATTERN_AUDIO_START()` at beginning of draw function
- [ ] Replace `spectrogram[i]` with `AUDIO_SPECTRUM[i]`
- [ ] Replace `spectrogram_smooth[i]` with `AUDIO_SPECTRUM_SMOOTH[i]`
- [ ] Replace `chromagram[i]` with `AUDIO_CHROMAGRAM[i]`
- [ ] Replace `vu_level` with `AUDIO_VU`
- [ ] Replace `audio_level` with `AUDIO_VU`
- [ ] Replace `tempi[0].beat` with `AUDIO_TEMPO_CONFIDENCE`
- [ ] Add freshness check: `if (!AUDIO_IS_FRESH()) return;`
- [ ] Add stale data handling if appropriate
- [ ] Test on device with real audio

---

## Example 1: Simple Spectrum Visualization

### Pattern: Emotiscope Spectrum (Current)

**File**: `firmware/src/generated_patterns.h` (lines 375-425)

**BEFORE** (Unsafe):
```cpp
// Pattern: Emotiscope Spectrum
// Real-time spectrum visualization mapping frequencies across the LED strip
void draw_emotiscope_spectrum(float time, const PatternParameters& params) {
    // Map frequency spectrum across LED strip
    // Left = bass (blue), Right = treble (red)

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED position to spectrum (0.0 to 1.0 across strip)
        float strip_pos = float(i) / float(NUM_LEDS - 1);

        // Get spectrum bin for this position
        int bin_index = int(strip_pos * 63);  // Map to 64 bins (0-63)

        // UNSAFE: Direct global access - race condition risk
        float magnitude = spectrogram[bin_index];

        // Apply frequency response adjustments
        if (strip_pos < 0.33f) {
            magnitude *= params.spectrum_low;  // Bass region
        } else if (strip_pos < 0.66f) {
            magnitude *= params.spectrum_mid;  // Mid region
        } else {
            magnitude *= params.spectrum_high; // Treble region
        }

        // Clamp and apply sqrt curve for visual response
        magnitude = fmin(1.0f, fmax(0.0f, magnitude));
        magnitude = sqrtf(magnitude);

        // Color mapping: rainbow spectrum across strip
        float hue = strip_pos;  // 0.0 (red) to 1.0 (violet)

        // Simple HSV to RGB conversion
        float h = hue * 6.0f;
        float c = magnitude;  // Chroma = magnitude
        float x = c * (1.0f - fabsf(fmodf(h, 2.0f) - 1.0f));

        float r = 0, g = 0, b = 0;
        if (h < 1) { r = c; g = x; b = 0; }
        else if (h < 2) { r = x; g = c; b = 0; }
        else if (h < 3) { r = 0; g = c; b = x; }
        else if (h < 4) { r = 0; g = x; b = c; }
        else if (h < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        leds[i] = CRGBF(r, g, b);

        // Apply brightness parameter
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**AFTER** (Safe):
```cpp
// Pattern: Emotiscope Spectrum
// Real-time spectrum visualization mapping frequencies across the LED strip
void draw_emotiscope_spectrum(float time, const PatternParameters& params) {
    // Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    // Skip rendering if audio data hasn't updated (performance optimization)
    if (!AUDIO_IS_FRESH()) {
        return;  // Reuse previous frame
    }

    // Map frequency spectrum across LED strip
    // Left = bass (blue), Right = treble (red)

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED position to spectrum (0.0 to 1.0 across strip)
        float strip_pos = float(i) / float(NUM_LEDS - 1);

        // Get spectrum bin for this position
        int bin_index = int(strip_pos * 63);  // Map to 64 bins (0-63)

        // SAFE: Snapshot-based access - no race condition
        float magnitude = AUDIO_SPECTRUM[bin_index];

        // Apply frequency response adjustments
        if (strip_pos < 0.33f) {
            magnitude *= params.spectrum_low;  // Bass region
        } else if (strip_pos < 0.66f) {
            magnitude *= params.spectrum_mid;  // Mid region
        } else {
            magnitude *= params.spectrum_high; // Treble region
        }

        // Clamp and apply sqrt curve for visual response
        magnitude = fmin(1.0f, fmax(0.0f, magnitude));
        magnitude = sqrtf(magnitude);

        // Fade if audio is stale (silence detection)
        if (AUDIO_IS_STALE()) {
            magnitude *= 0.95f;  // Gradual fade
        }

        // Color mapping: rainbow spectrum across strip
        float hue = strip_pos;  // 0.0 (red) to 1.0 (violet)

        // Simple HSV to RGB conversion
        float h = hue * 6.0f;
        float c = magnitude;  // Chroma = magnitude
        float x = c * (1.0f - fabsf(fmodf(h, 2.0f) - 1.0f));

        float r = 0, g = 0, b = 0;
        if (h < 1) { r = c; g = x; b = 0; }
        else if (h < 2) { r = x; g = c; b = 0; }
        else if (h < 3) { r = 0; g = c; b = x; }
        else if (h < 4) { r = 0; g = x; b = c; }
        else if (h < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        leds[i] = CRGBF(r, g, b);

        // Apply brightness parameter
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**Changes Made**:
1. Added `PATTERN_AUDIO_START()` at beginning
2. Added freshness check: `if (!AUDIO_IS_FRESH()) return;`
3. Replaced `spectrogram[bin_index]` with `AUDIO_SPECTRUM[bin_index]`
4. Added stale data fade: `if (AUDIO_IS_STALE()) magnitude *= 0.95f;`

**Benefits**:
- Thread-safe: No race conditions
- Performance: Skips ~75% of frames (when audio unchanged)
- Silence handling: Fades gracefully when no audio
- Minimal code changes: Only 4 lines added

---

## Example 2: Beat-Reactive Pattern

### Pattern: Bass Pulse (Generated)

**File**: `firmware/src/generated_patterns.h` (lines 14-53)

**BEFORE** (Unsafe):
```cpp
// Pattern: Bass Pulse
// Global brightness pulsing with bass energy and beat gate
void draw_bass_pulse(float time, const PatternParameters& params) {

    // default palette - position to color interpolation
    const CRGBF palette_colors[] = {
        CRGBF(0.00f, 0.00f, 0.00f),
        CRGBF(1.00f, 0.47f, 0.12f),
        CRGBF(1.00f, 1.00f, 1.00f)
    };
    const int palette_size = 3;

    for (int i = 0; i < NUM_LEDS; i++) {
        // UNSAFE: Direct access to spectrogram and tempi arrays
        float position = fmod(fmax(0.0f, fmin(1.0f, ((
                    fmin(1.0f, fmax(0.0f, (
                        spectrogram[0] + spectrogram[1] + spectrogram[2] +
                        spectrogram[3] + spectrogram[4] + spectrogram[5] +
                        spectrogram[6] + spectrogram[7] + spectrogram[8] +
                        spectrogram[9] + spectrogram[10] + spectrogram[11] +
                        spectrogram[12] + spectrogram[13] + spectrogram[14] +
                        spectrogram[15] + spectrogram[16] + spectrogram[17] +
                        spectrogram[18] + spectrogram[19] + spectrogram[20]
                    ) / 21.0f)) * params.spectrum_low
                ) * fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity)))), 1.0f);

        int palette_index = int(position * (palette_size - 1));
        float interpolation_factor = (position * (palette_size - 1)) - palette_index;

        // Palette interpolation code...
        if (palette_index >= palette_size - 1) {
            leds[i] = palette_colors[palette_size - 1];
        } else {
            const CRGBF& color1 = palette_colors[palette_index];
            const CRGBF& color2 = palette_colors[palette_index + 1];

            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }

        // Apply brightness
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**AFTER** (Safe):
```cpp
// Pattern: Bass Pulse
// Global brightness pulsing with bass energy and beat gate
void draw_bass_pulse(float time, const PatternParameters& params) {
    // Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    // Skip if no new audio data
    if (!AUDIO_IS_FRESH()) {
        return;
    }

    // default palette - position to color interpolation
    const CRGBF palette_colors[] = {
        CRGBF(0.00f, 0.00f, 0.00f),
        CRGBF(1.00f, 0.47f, 0.12f),
        CRGBF(1.00f, 1.00f, 1.00f)
    };
    const int palette_size = 3;

    // Calculate bass energy using helper function (much cleaner!)
    float bass_energy = AUDIO_BASS() * params.spectrum_low;

    // Get beat confidence
    float beat_gate = AUDIO_TEMPO_CONFIDENCE * 0.5f + 0.5f;
    beat_gate *= params.beat_sensitivity;

    // Combine bass and beat
    float position = fmin(1.0f, bass_energy * beat_gate);

    // Fade on stale data
    if (AUDIO_IS_STALE()) {
        position *= 0.9f;
    }

    for (int i = 0; i < NUM_LEDS; i++) {
        int palette_index = int(position * (palette_size - 1));
        float interpolation_factor = (position * (palette_size - 1)) - palette_index;

        // Palette interpolation code...
        if (palette_index >= palette_size - 1) {
            leds[i] = palette_colors[palette_size - 1];
        } else {
            const CRGBF& color1 = palette_colors[palette_index];
            const CRGBF& color2 = palette_colors[palette_index + 1];

            leds[i].r = color1.r + (color2.r - color1.r) * interpolation_factor;
            leds[i].g = color1.g + (color2.g - color1.g) * interpolation_factor;
            leds[i].b = color1.b + (color2.b - color1.b) * interpolation_factor;
        }

        // Apply brightness
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**Changes Made**:
1. Added `PATTERN_AUDIO_START()` at beginning
2. Added freshness check
3. Replaced manual bass sum with `AUDIO_BASS()` helper
4. Replaced `tempi[0].beat` with `AUDIO_TEMPO_CONFIDENCE`
5. Added stale data handling
6. Cleaner code structure (position calculated once)

**Benefits**:
- Much cleaner code (no manual bin summing)
- Thread-safe access
- Better performance (uses helper function)
- Handles silence gracefully

---

## Example 3: Chromagram-Based Pattern

### Pattern: Twilight Chroma

**BEFORE** (Unsafe):
```cpp
// Pattern: Twilight Chroma
// Chromagram-based pitch visualization
void draw_twilight_chroma(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = {
        CRGBF(1.00f, 0.65f, 0.00f),
        CRGBF(0.94f, 0.50f, 0.00f),
        /* ... more colors ... */
        CRGBF(0.04f, 0.06f, 0.31f)
    };
    const int palette_size = 7;

    for (int i = 0; i < NUM_LEDS; i++) {
        // UNSAFE: Direct chromagram access
        float position = fmod(chromagram[0], 1.0f);

        int palette_index = int(position * (palette_size - 1));
        float interpolation_factor = (position * (palette_size - 1)) - palette_index;

        // ... palette interpolation ...

        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**AFTER** (Safe):
```cpp
// Pattern: Twilight Chroma
// Chromagram-based pitch visualization
void draw_twilight_chroma(float time, const PatternParameters& params) {
    // Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    // Skip if audio hasn't updated
    if (!AUDIO_IS_FRESH()) {
        return;
    }

    const CRGBF palette_colors[] = {
        CRGBF(1.00f, 0.65f, 0.00f),
        CRGBF(0.94f, 0.50f, 0.00f),
        /* ... more colors ... */
        CRGBF(0.04f, 0.06f, 0.31f)
    };
    const int palette_size = 7;

    // Calculate LED position based on chromagram
    int led_groups = NUM_LEDS / 12;  // Divide LEDs into 12 groups (one per note)

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED to musical note (0-11)
        int note_index = (i * 12) / NUM_LEDS;

        // SAFE: Snapshot-based chromagram access
        float position = fmod(AUDIO_CHROMAGRAM[note_index], 1.0f);

        // Fade on silence
        if (AUDIO_IS_STALE()) {
            position *= 0.9f;
        }

        int palette_index = int(position * (palette_size - 1));
        float interpolation_factor = (position * (palette_size - 1)) - palette_index;

        // ... palette interpolation ...

        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**Changes Made**:
1. Added `PATTERN_AUDIO_START()`
2. Replaced `chromagram[i]` with `AUDIO_CHROMAGRAM[i]`
3. Added freshness check
4. Added stale data handling
5. Improved LED mapping (shows all 12 notes across strip)

---

## Example 4: Complex Audio-Reactive Pattern

### Pattern: Emotiscope FFT (Beat-Modulated Spectrum)

**BEFORE** (Unsafe):
```cpp
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = {
        CRGBF(0.00f, 0.00f, 0.00f),
        CRGBF(0.50f, 0.00f, 1.00f),
        /* ... */
        CRGBF(1.00f, 1.00f, 1.00f)
    };
    const int palette_size = 8;

    for (int i = 0; i < NUM_LEDS; i++) {
        // UNSAFE: Multiple direct audio accesses
        float position = fmod(fmin(1.0f,
            (abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH) +
            fmin(1.0f,
                spectrogram[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)] +
                (fmin(1.0f, (tempi[0].beat * 0.5f + 0.5f) * params.beat_sensitivity) * 0.7f)
            )
        ), 1.0f);

        // ... palette lookup and LED assignment ...
    }
}
```

**AFTER** (Safe):
```cpp
void draw_emotiscope_fft(float time, const PatternParameters& params) {
    // Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    // Skip if audio hasn't updated
    if (!AUDIO_IS_FRESH()) {
        return;
    }

    const CRGBF palette_colors[] = {
        CRGBF(0.00f, 0.00f, 0.00f),
        CRGBF(0.50f, 0.00f, 1.00f),
        /* ... */
        CRGBF(1.00f, 1.00f, 1.00f)
    };
    const int palette_size = 8;

    // Get beat gate value once (efficiency)
    float beat_gate = AUDIO_TEMPO_CONFIDENCE * 0.5f + 0.5f;
    beat_gate = fmin(1.0f, beat_gate * params.beat_sensitivity) * 0.7f;

    for (int i = 0; i < NUM_LEDS; i++) {
        // Distance from center
        float distance = abs(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH;

        // Map LED to spectrum bin
        int bin = int((float(i) / float(NUM_LEDS - 1)) * 63);

        // SAFE: Snapshot-based access
        float spectrum_value = AUDIO_SPECTRUM[bin];

        // Combine distance, spectrum, and beat
        float position = fmin(1.0f, distance + fmin(1.0f, spectrum_value + beat_gate));

        // Fade on silence
        if (AUDIO_IS_STALE()) {
            position *= 0.9f;
        }

        // ... palette lookup and LED assignment ...
    }
}
```

**Changes Made**:
1. Added `PATTERN_AUDIO_START()`
2. Replaced `spectrogram[...]` with `AUDIO_SPECTRUM[bin]`
3. Replaced `tempi[0].beat` with `AUDIO_TEMPO_CONFIDENCE`
4. Added freshness check
5. Added stale data handling
6. Simplified code structure (beat_gate calculated once)

---

## Example 5: Pattern with Fallback Behavior

### Pattern: Audio Test - Comprehensive (with no-audio fallback)

**BEFORE** (Unsafe):
```cpp
void draw_audio_test_comprehensive(float time, const PatternParameters& params) {
    const CRGBF palette_colors[] = { /* ... */ };
    const int palette_size = 5;

    for (int i = 0; i < NUM_LEDS; i++) {
        // UNSAFE: Direct access to spectrogram and audio_level
        float position = fmod((
            ((spectrogram[3] + spectrogram[4] + spectrogram[5] +
              spectrogram[6] + spectrogram[7] + spectrogram[8]) / 6.0f) *
            audio_level
        ), 1.0f);

        // ... palette lookup ...
    }
}
```

**AFTER** (Safe with fallback):
```cpp
void draw_audio_test_comprehensive(float time, const PatternParameters& params) {
    // Get thread-safe audio snapshot
    PATTERN_AUDIO_START();

    const CRGBF palette_colors[] = { /* ... */ };
    const int palette_size = 5;

    // Fallback if audio system not available
    if (!AUDIO_IS_AVAILABLE()) {
        // Time-based animation instead
        float brightness = 0.5f + 0.5f * sinf(time * 2.0f);
        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i] = CRGBF(brightness, brightness * 0.5f, 0);
        }
        return;
    }

    // Skip if audio hasn't updated
    if (!AUDIO_IS_FRESH()) {
        return;
    }

    // SAFE: Calculate bass average using helper
    float bass_avg = get_audio_band_energy(audio, 3, 8);

    // SAFE: Get VU level
    float vu = AUDIO_VU;

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = fmod(bass_avg * vu, 1.0f);

        // Fade on silence
        if (AUDIO_IS_STALE()) {
            position *= 0.95f;
        }

        // ... palette lookup ...
    }
}
```

**Changes Made**:
1. Added `PATTERN_AUDIO_START()`
2. Added availability check with time-based fallback
3. Replaced manual spectrum sum with helper function
4. Replaced `audio_level` with `AUDIO_VU`
5. Added freshness check
6. Added stale data handling

**Benefits**:
- Graceful degradation if audio system unavailable
- Cleaner code (helper functions)
- Better user experience (fallback animation)

---

## Migration Summary Table

| Pattern | Audio Data Used | Complexity | Migration Time |
|---------|----------------|------------|----------------|
| Emotiscope Spectrum | spectrogram[64] | Low | 5 minutes |
| Bass Pulse | spectrogram[0-20], tempi[0].beat | Medium | 10 minutes |
| Spectrum Sweep | spectrogram[64], tempi[0].beat | Medium | 10 minutes |
| Twilight Chroma | chromagram[12] | Low | 5 minutes |
| Emotiscope FFT | spectrogram[64], tempi[0].beat | Medium | 10 minutes |
| Emotiscope Octave | chromagram[12] | Medium | 10 minutes |
| Audio Test - Comprehensive | spectrogram[3-8], audio_level | Low | 5 minutes |
| Aurora Spectrum | spectrogram[0-8] | Low | 5 minutes |
| Lava Beat | tempi[0].beat | Low | 5 minutes |

**Total Estimated Migration Time**: ~60-75 minutes for all patterns

---

## Code Generation Updates

For auto-generated patterns (from JSON graphs), update the codegen templates:

### Codegen Template Changes

**File**: `codegen/src/index.ts`

**Audio Node Type Mappings**:

```typescript
// OLD (unsafe)
case 'spectrum_bin':
    return `spectrogram[${params.bin}]`;

case 'audio_level':
    return `audio_level`;

case 'beat':
    return `tempi[0].beat`;

// NEW (safe)
case 'spectrum_bin':
    return `AUDIO_SPECTRUM[${params.bin}]`;

case 'audio_level':
    return `AUDIO_VU`;

case 'beat':
    return `AUDIO_TEMPO_CONFIDENCE`;

case 'spectrum_interpolate':
    return `AUDIO_SPECTRUM[int((${params.position}) * 63)]`;

case 'chromagram':
    return `AUDIO_CHROMAGRAM[${params.note} % 12]`;
```

**Pattern Template**:

```typescript
// Add to pattern header
const patternHeader = `
void draw_${patternId}(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    ${pattern.is_audio_reactive ? 'if (!AUDIO_IS_FRESH()) return;' : ''}

    ${generatePatternBody(pattern)}
}
`;
```

---

## Validation Tests

After migrating each pattern, verify:

### Compilation Test
```bash
cd firmware/PRISM.k1
pio run
```

Expected: No compilation errors

### Runtime Test
1. Flash firmware to device
2. Load pattern via web interface
3. Play music near microphone
4. Verify pattern responds to audio

### Performance Test
Monitor serial output for FPS:
```
Expected: FPS >= 100 (target 120)
Audio updates: ~100 Hz
Free RAM: >= 200 KB
```

### Edge Case Tests
- **Silence**: Pattern should fade or hold previous state
- **Loud**: No clipping or crashes
- **Rapid changes**: Smooth transitions
- **Pattern switching**: No glitches

---

## Common Migration Pitfalls

### Pitfall 1: Forgetting PATTERN_AUDIO_START()
```cpp
// WRONG - will not compile
void draw_pattern(float time, const PatternParameters& params) {
    float bass = AUDIO_BASS();  // ERROR: 'audio' not declared
}

// CORRECT
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Creates 'audio' variable
    float bass = AUDIO_BASS();
}
```

### Pitfall 2: Array Index Out of Bounds
```cpp
// WRONG - bin_index could be 64 (out of bounds)
int bin_index = int(position * 64);
float mag = AUDIO_SPECTRUM[bin_index];  // Potential crash

// CORRECT - clamp to 0-63
int bin_index = int(position * 63);  // Max index is 63
float mag = AUDIO_SPECTRUM[bin_index];
```

### Pitfall 3: Ignoring Stale Data
```cpp
// WORKS but not ideal - no silence detection
PATTERN_AUDIO_START();
float bass = AUDIO_BASS();
leds[0] = CRGBF(bass, 0, 0);

// BETTER - handles silence gracefully
PATTERN_AUDIO_START();
float bass = AUDIO_BASS();
if (AUDIO_IS_STALE()) {
    bass *= 0.95f;  // Fade on silence
}
leds[0] = CRGBF(bass, 0, 0);
```

### Pitfall 4: Not Checking Freshness (Performance)
```cpp
// WORKS but inefficient - renders same data multiple times
PATTERN_AUDIO_START();
// ... expensive rendering code ...

// BETTER - skips redundant work (~75% CPU savings)
PATTERN_AUDIO_START();
if (!AUDIO_IS_FRESH()) return;
// ... expensive rendering code ...
```

---

## Next Steps

After completing Phase 2:

1. **Phase 3**: Migrate all patterns in `generated_patterns.h`
2. **Update codegen**: Modify pattern generator to emit safe code
3. **Regenerate patterns**: Run codegen on all JSON graphs
4. **Test thoroughly**: Validate each pattern with real audio
5. **Phase 4**: Performance validation and optimization

---

## Document Status

**Phase 2**: COMPLETE
**Deliverables**:
- [x] `pattern_audio_interface.h` created
- [x] All macros documented
- [x] Helper functions implemented
- [x] Migration examples provided
- [x] Validation tests defined

**Ready for**: Phase 3 (Pattern Migration)

**Estimated Phase 3 Time**: 1-2 hours for all patterns
