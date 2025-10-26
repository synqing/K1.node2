# Pattern Audio API Reference

## Overview

The Pattern Audio Interface provides thread-safe access to real-time audio analysis data for LED pattern rendering. This API eliminates race conditions and provides stale data detection.

**Phase**: 2 of 4 (Pattern Interface)
**File**: `firmware/src/pattern_audio_interface.h`
**Status**: Implementation Complete

---

## Quick Start

```cpp
#include "pattern_audio_interface.h"

void draw_my_pattern(float time, const PatternParameters& params) {
    // 1. Initialize audio snapshot
    PATTERN_AUDIO_START();

    // 2. Check if data is fresh (optional but recommended)
    if (!AUDIO_IS_FRESH()) return;

    // 3. Access audio data using macros
    float bass = AUDIO_BASS();
    float treble = AUDIO_TREBLE();

    // 4. Use data to drive pattern
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(treble, 0, bass);
    }
}
```

---

## Core Macro: PATTERN_AUDIO_START()

### Description
Initializes thread-safe audio snapshot for the current pattern. Must be called before any `AUDIO_*` macro usage.

### Signature
```cpp
PATTERN_AUDIO_START()
```

### Creates Variables
| Variable | Type | Description |
|----------|------|-------------|
| `audio` | `AudioDataSnapshot` | Complete audio data snapshot |
| `audio_available` | `bool` | True if snapshot retrieved successfully |
| `audio_is_fresh` | `bool` | True if data changed since last frame |
| `audio_age_ms` | `uint32_t` | Milliseconds since last audio update |

### Example
```cpp
void draw_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Must be first line

    // Now you can use all AUDIO_* macros
    float spectrum_value = AUDIO_SPECTRUM[0];
}
```

### Thread Safety
- Safe to call from any FreeRTOS task
- Uses non-blocking mutex (1ms timeout)
- Pattern-local static prevents cross-pattern interference

### Performance
- ~10-20 microseconds for snapshot copy
- Negligible impact on 450 FPS rendering

---

## Audio Data Accessors

### Array Accessors

#### AUDIO_SPECTRUM
Access raw frequency spectrum data.

**Type**: `float[64]`
**Range**: 0.0 - 1.0 (auto-ranged)
**Update Rate**: 100 Hz

**Frequency Mapping**:
| Bin | Frequency | Musical Note | Description |
|-----|-----------|--------------|-------------|
| 0 | 55.0 Hz | A1 | Deep bass |
| 8 | 69.3 Hz | C#2 | Bass fundamentals |
| 16 | 87.3 Hz | F2 | Low mids |
| 32 | 155.6 Hz | D#3 | Mids |
| 48 | 277.2 Hz | C#4 | High mids |
| 63 | 622.3 Hz | D#5 | Treble |

**Example**:
```cpp
PATTERN_AUDIO_START();

// Access specific bin
float bass_bin = AUDIO_SPECTRUM[0];  // 55 Hz

// Iterate across spectrum
for (int i = 0; i < NUM_FREQS; i++) {
    float magnitude = AUDIO_SPECTRUM[i];
    // ... use magnitude ...
}

// Map LED position to spectrum
int bin = (led_index * NUM_FREQS) / NUM_LEDS;
float mag = AUDIO_SPECTRUM[bin];
```

---

#### AUDIO_SPECTRUM_SMOOTH
Access smoothed frequency spectrum (3-frame average).

**Type**: `float[64]`
**Range**: 0.0 - 1.0 (auto-ranged)
**Smoothing**: 8-frame moving average

**Use Cases**:
- Reduce flickering in visualizations
- Smoother color transitions
- Perceptually pleasing animations

**Example**:
```cpp
PATTERN_AUDIO_START();

// Smooth spectrum for gentle transitions
for (int i = 0; i < NUM_LEDS; i++) {
    int bin = (i * NUM_FREQS) / NUM_LEDS;
    float smooth_mag = AUDIO_SPECTRUM_SMOOTH[bin];

    leds[i] = hsv(bin * 5, 1.0, smooth_mag);
}
```

---

#### AUDIO_CHROMAGRAM
Access musical pitch class energy (C, C#, D, ... B).

**Type**: `float[12]`
**Range**: 0.0 - 1.0 (auto-ranged)
**Notes**: 12 semitones (one octave)

**Note Mapping**:
| Index | Note | Use Case |
|-------|------|----------|
| 0 | C | Root note detection |
| 1 | C# | Sharp/flat detection |
| 2 | D | Second degree |
| ... | ... | ... |
| 11 | B | Leading tone |

**Example**:
```cpp
PATTERN_AUDIO_START();

// Show musical notes across LED strip
int leds_per_note = NUM_LEDS / 12;
for (int note = 0; note < 12; note++) {
    float energy = AUDIO_CHROMAGRAM[note];

    for (int i = 0; i < leds_per_note; i++) {
        int led_index = note * leds_per_note + i;
        leds[led_index] = hsv(note * 30, 1.0, energy);
    }
}
```

---

#### AUDIO_FFT
Access FFT frequency bins (alternative to Goertzel).

**Type**: `float[128]`
**Range**: 0.0 - 1.0 (auto-ranged)
**Resolution**: 128 bins (256-point FFT)

**Note**: Only available if FFT processing is enabled. Use `AUDIO_SPECTRUM` for standard patterns.

**Example**:
```cpp
PATTERN_AUDIO_START();

// High-resolution spectrum visualization
for (int i = 0; i < NUM_LEDS; i++) {
    int bin = (i * 128) / NUM_LEDS;
    float fft_mag = AUDIO_FFT[bin];

    leds[i] = CRGBF(fft_mag, fft_mag * 0.5, 0);
}
```

---

### Scalar Accessors

#### AUDIO_VU
Get overall audio level (volume unit meter).

**Type**: `float`
**Range**: 0.0 - 1.0 (auto-ranged peak)
**Update Rate**: 100 Hz

**Description**: Auto-ranged peak amplitude. Represents overall loudness/energy.

**Example**:
```cpp
PATTERN_AUDIO_START();

float volume = AUDIO_VU;

// Global brightness control
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = hsv(180, 1.0, volume);
}
```

---

#### AUDIO_VU_RAW
Get raw audio level (before auto-ranging).

**Type**: `float`
**Range**: 0.0 - varies (not normalized)

**Use Cases**:
- Custom auto-ranging algorithms
- Absolute level detection
- Calibration and debugging

**Example**:
```cpp
PATTERN_AUDIO_START();

float raw_level = AUDIO_VU_RAW;

// Custom threshold detection
if (raw_level > 0.5) {
    // Trigger special effect
}
```

---

#### AUDIO_NOVELTY
Get spectral novelty/onset detection.

**Type**: `float`
**Range**: 0.0 - 1.0
**Description**: Measures spectral change (onset detection)

**Use Cases**:
- Detect musical events (note onsets)
- Trigger effects on spectral changes
- Beat-like detection without tempo tracking

**Example**:
```cpp
PATTERN_AUDIO_START();

float novelty = AUDIO_NOVELTY;

// Flash on spectral changes
if (novelty > 0.7) {
    fill_solid(leds, NUM_LEDS, CRGBF(1, 1, 1));
} else {
    // ... normal pattern ...
}
```

---

#### AUDIO_TEMPO_CONFIDENCE
Get beat detection confidence.

**Type**: `float`
**Range**: 0.0 - 1.0
**Description**: Confidence in detected beat (0 = no beat, 1 = strong beat)

**Use Cases**:
- Beat-synchronized effects
- Pulse animations
- Rhythm-reactive brightness

**Example**:
```cpp
PATTERN_AUDIO_START();

float beat = AUDIO_TEMPO_CONFIDENCE;

// Pulse on beat
float brightness = beat * beat;  // Square for emphasis
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(brightness, brightness * 0.5, 0);
}
```

---

## Query Macros

### AUDIO_IS_FRESH()

**Returns**: `bool`
**Description**: True if audio data has updated since last pattern frame.

**Use Cases**:
- Skip redundant rendering (performance optimization)
- Trigger events only on new data
- Reduce CPU usage

**Example**:
```cpp
PATTERN_AUDIO_START();

if (!AUDIO_IS_FRESH()) {
    return;  // Skip this frame, reuse previous LED state
}

// Expensive rendering code only runs when audio updates
// ... pattern code ...
```

**Performance Impact**: Saves ~75% of pattern computation (450 FPS render vs 100 Hz audio)

---

### AUDIO_IS_AVAILABLE()

**Returns**: `bool`
**Description**: True if audio snapshot was retrieved successfully.

**Use Cases**:
- Fallback to non-audio mode
- Debug audio system
- Graceful degradation

**Example**:
```cpp
PATTERN_AUDIO_START();

if (!AUDIO_IS_AVAILABLE()) {
    // Fallback: Time-based animation
    float brightness = 0.5 + 0.5 * sinf(time);
    fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
    return;
}

// Normal audio-reactive pattern
float bass = AUDIO_BASS();
// ...
```

---

### AUDIO_AGE_MS()

**Returns**: `uint32_t`
**Description**: Age of audio data in milliseconds. Returns 9999 if unavailable.

**Expected Values**:
- **0-20ms**: Fresh data (1-2 audio frames)
- **20-50ms**: Acceptable latency
- **>50ms**: Stale (silence or audio lag)

**Example**:
```cpp
PATTERN_AUDIO_START();

uint32_t age = AUDIO_AGE_MS();

if (age < 20) {
    // Fresh data - full brightness
    brightness_multiplier = 1.0;
} else if (age < 50) {
    // Aging data - slight fade
    brightness_multiplier = 0.9;
} else {
    // Stale data - significant fade
    brightness_multiplier = 0.5;
}
```

---

### AUDIO_IS_STALE()

**Returns**: `bool`
**Description**: True if audio data is older than 50ms (>5 audio frames).

**Use Cases**:
- Detect silence
- Fade to default state
- Switch to non-audio mode

**Example**:
```cpp
PATTERN_AUDIO_START();

float bass = AUDIO_BASS();

if (AUDIO_IS_STALE()) {
    bass *= 0.95;  // Gradual fade on silence
}

for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(0, 0, bass);
}
```

---

## Helper Functions

### get_audio_band_energy()

Calculate average energy across a frequency range.

**Signature**:
```cpp
float get_audio_band_energy(const AudioDataSnapshot& audio,
                             int start_bin, int end_bin)
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `audio` | `const AudioDataSnapshot&` | Audio snapshot from PATTERN_AUDIO_START() |
| `start_bin` | `int` | Starting bin (0-63) |
| `end_bin` | `int` | Ending bin (0-63) |

**Returns**: `float` - Average energy (0.0-1.0)

**Safety**: Automatically clamps indices to valid range

**Example**:
```cpp
PATTERN_AUDIO_START();

// Custom frequency band
float low_mids = get_audio_band_energy(audio, 8, 16);  // 69-87 Hz

// Use in pattern
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(0, low_mids, 0);
}
```

---

## Frequency Band Macros

Predefined frequency bands for common audio-reactive patterns.

### AUDIO_BASS()

**Frequency**: 55-220 Hz (bins 0-8)
**Contains**: Kick drums, bass guitar, low synths
**Character**: Physical, body-felt frequencies

**Example**:
```cpp
PATTERN_AUDIO_START();

float bass = AUDIO_BASS();

// Bass-reactive blue pulse
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(0, 0, bass);
}
```

---

### AUDIO_MIDS()

**Frequency**: 440-880 Hz (bins 16-32)
**Contains**: Vocals, guitars, snare drums
**Character**: Musical fundamentals, melody

**Example**:
```cpp
PATTERN_AUDIO_START();

float mids = AUDIO_MIDS();

// Mids-reactive green
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(0, mids, 0);
}
```

---

### AUDIO_TREBLE()

**Frequency**: 1.76-6.4 kHz (bins 48-63)
**Contains**: Cymbals, hi-hats, high harmonics
**Character**: Brightness, air, presence

**Example**:
```cpp
PATTERN_AUDIO_START();

float treble = AUDIO_TREBLE();

// Treble-reactive red
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(treble, 0, 0);
}
```

---

### Multi-Band Example

```cpp
PATTERN_AUDIO_START();

if (!AUDIO_IS_FRESH()) return;

float bass = AUDIO_BASS();
float mids = AUDIO_MIDS();
float treble = AUDIO_TREBLE();

// Fade on silence
if (AUDIO_IS_STALE()) {
    bass *= 0.95;
    mids *= 0.95;
    treble *= 0.95;
}

// RGB = Treble/Mids/Bass
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(treble, mids, bass);
}
```

---

## Common Patterns

### Pattern 1: Basic Spectrum Visualizer

```cpp
void draw_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) return;

    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED to spectrum bin
        int bin = (i * NUM_FREQS) / NUM_LEDS;
        float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];

        // Rainbow hue based on position
        float hue = (float)i / NUM_LEDS;

        leds[i] = hsv(hue * 360, 1.0, magnitude);
    }
}
```

---

### Pattern 2: Beat-Reactive Pulse

```cpp
void draw_beat_pulse(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) return;

    float beat = AUDIO_TEMPO_CONFIDENCE;
    float brightness = beat * beat;  // Square for emphasis

    if (AUDIO_IS_STALE()) {
        brightness = 0.0;  // Off on silence
    }

    fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
}
```

---

### Pattern 3: Frequency Bands RGB

```cpp
void draw_rgb_bands(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) return;

    float bass = AUDIO_BASS();
    float mids = AUDIO_MIDS();
    float treble = AUDIO_TREBLE();

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(treble, mids, bass);
    }
}
```

---

### Pattern 4: Musical Notes (Chromagram)

```cpp
void draw_musical_notes(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) return;

    int leds_per_note = NUM_LEDS / 12;

    for (int note = 0; note < 12; note++) {
        float energy = AUDIO_CHROMAGRAM[note];

        if (AUDIO_IS_STALE()) {
            energy *= 0.9;
        }

        // Hue represents note (0=C, 1=C#, ... 11=B)
        float hue = note * 30.0;  // 30 degrees per semitone

        for (int i = 0; i < leds_per_note; i++) {
            int led_index = note * leds_per_note + i;
            if (led_index < NUM_LEDS) {
                leds[led_index] = hsv(hue, 1.0, energy);
            }
        }
    }
}
```

---

### Pattern 5: Center-Origin Spectrum

```cpp
void draw_center_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) return;

    for (int i = 0; i < NUM_LEDS; i++) {
        // Distance from center
        float distance = fabs((float)i - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH;

        // Map to spectrum bin
        int bin = (int)(distance * NUM_FREQS);
        if (bin >= NUM_FREQS) bin = NUM_FREQS - 1;

        float magnitude = AUDIO_SPECTRUM[bin];

        if (AUDIO_IS_STALE()) {
            magnitude *= 0.95;
        }

        leds[i] = hsv(distance * 360, 1.0, magnitude);
    }
}
```

---

### Pattern 6: With Fallback Behavior

```cpp
void draw_with_fallback(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    // Fallback if no audio
    if (!AUDIO_IS_AVAILABLE()) {
        // Time-based animation
        float brightness = 0.5 + 0.5 * sinf(time * 2.0);
        fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness * 0.5, 0));
        return;
    }

    // Skip if no new data
    if (!AUDIO_IS_FRESH()) return;

    // Normal audio-reactive pattern
    float bass = AUDIO_BASS();
    float treble = AUDIO_TREBLE();

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(treble, 0, bass);
    }
}
```

---

## Performance Guidelines

### Optimization Tips

1. **Always check freshness**:
   ```cpp
   if (!AUDIO_IS_FRESH()) return;  // Saves ~75% CPU
   ```

2. **Cache calculated values**:
   ```cpp
   // GOOD: Calculate once
   float bass = AUDIO_BASS();
   for (int i = 0; i < NUM_LEDS; i++) {
       leds[i] = CRGBF(0, 0, bass);
   }

   // BAD: Calculate every iteration
   for (int i = 0; i < NUM_LEDS; i++) {
       leds[i] = CRGBF(0, 0, AUDIO_BASS());  // Wasteful
   }
   ```

3. **Use helper functions**:
   ```cpp
   // GOOD: Use helper
   float bass = AUDIO_BASS();

   // BAD: Manual summing
   float bass = 0;
   for (int i = 0; i < 8; i++) bass += AUDIO_SPECTRUM[i];
   bass /= 8.0;
   ```

4. **Prefer smoothed data**:
   ```cpp
   // Smoother visuals
   float mag = AUDIO_SPECTRUM_SMOOTH[bin];

   // vs raw (more flickery)
   float mag = AUDIO_SPECTRUM[bin];
   ```

---

## Debugging

### Check Audio Availability

```cpp
PATTERN_AUDIO_START();

if (!AUDIO_IS_AVAILABLE()) {
    Serial.println("Audio not available - mutex timeout or not initialized");
}
```

### Monitor Data Age

```cpp
PATTERN_AUDIO_START();

uint32_t age = AUDIO_AGE_MS();
if (age > 100) {
    Serial.printf("Warning: Audio data is stale (%u ms old)\n", age);
}
```

### Log Update Counter

```cpp
PATTERN_AUDIO_START();

static uint32_t last_counter = 0;
if (audio.update_counter != last_counter) {
    Serial.printf("Audio updated: counter=%u, age=%u ms\n",
                  audio.update_counter, AUDIO_AGE_MS());
    last_counter = audio.update_counter;
}
```

### Validate Data Ranges

```cpp
PATTERN_AUDIO_START();

for (int i = 0; i < NUM_FREQS; i++) {
    float mag = AUDIO_SPECTRUM[i];
    if (mag < 0.0 || mag > 1.0) {
        Serial.printf("Warning: bin %d out of range: %f\n", i, mag);
    }
}
```

---

## Thread Safety Guarantees

### Safe Operations
- Calling `PATTERN_AUDIO_START()` from any task
- Reading any `AUDIO_*` accessor within pattern scope
- Multiple patterns calling `PATTERN_AUDIO_START()` simultaneously
- Pattern-local static variables (freshness tracking)

### Unsafe Operations (Don't Do This)
- Accessing `audio` variable outside pattern function
- Modifying audio snapshot data
- Storing pointers to audio arrays
- Bypassing interface and accessing globals directly

---

## Error Handling

### Mutex Timeout
If `get_audio_snapshot()` times out (rare):
- `AUDIO_IS_AVAILABLE()` returns false
- Pattern can use cached previous data or fallback
- No crash or undefined behavior

### Uninitialized Audio System
If Phase 1 not implemented:
- `AUDIO_IS_AVAILABLE()` returns false
- All `AUDIO_*` accessors return 0.0
- Patterns degrade gracefully

### Invalid Array Indices
`get_audio_band_energy()` automatically clamps indices:
```cpp
// Safe even with invalid inputs
float energy = get_audio_band_energy(audio, -10, 100);  // Clamped to 0-63
```

---

## API Summary Table

| Macro/Function | Returns | Description |
|----------------|---------|-------------|
| `PATTERN_AUDIO_START()` | void | Initialize audio snapshot |
| `AUDIO_SPECTRUM[i]` | float | Raw spectrum bin |
| `AUDIO_SPECTRUM_SMOOTH[i]` | float | Smoothed spectrum bin |
| `AUDIO_CHROMAGRAM[i]` | float | Musical note energy |
| `AUDIO_FFT[i]` | float | FFT bin (if enabled) |
| `AUDIO_VU` | float | Auto-ranged volume |
| `AUDIO_VU_RAW` | float | Raw volume |
| `AUDIO_NOVELTY` | float | Spectral change |
| `AUDIO_TEMPO_CONFIDENCE` | float | Beat confidence |
| `AUDIO_IS_FRESH()` | bool | Data updated this frame |
| `AUDIO_IS_AVAILABLE()` | bool | Snapshot retrieved |
| `AUDIO_AGE_MS()` | uint32_t | Data age in ms |
| `AUDIO_IS_STALE()` | bool | Data >50ms old |
| `AUDIO_BASS()` | float | 55-220 Hz average |
| `AUDIO_MIDS()` | float | 440-880 Hz average |
| `AUDIO_TREBLE()` | float | 1.76-6.4 kHz average |
| `get_audio_band_energy()` | float | Custom band average |

---

## Related Documentation

- **Implementation Plan**: `IMPLEMENTATION_PLAN_AUDIO_SYNC.md`
- **Migration Examples**: `PHASE_2_PATTERN_MIGRATION_EXAMPLES.md`
- **Audio Architecture**: `Implementation.plans/RESEARCH_AND_PLANNING/AUDIO_ARCHITECTURE_QUICK_REFERENCE.md`

---

## Document Status

**Phase**: 2 (Pattern Interface)
**Status**: Complete
**Last Updated**: 2025-10-26
**Ready For**: Phase 3 (Pattern Migration)
