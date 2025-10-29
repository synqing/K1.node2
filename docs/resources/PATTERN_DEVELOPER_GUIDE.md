---
title: Pattern Developer Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Pattern Developer Guide
## K1.reinvented - Creating Audio-Reactive LED Patterns

**Last Updated**: 2025-10-26
**Difficulty**: Intermediate
**Prerequisites**: C++ basics, understanding of audio concepts

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Pattern Structure](#pattern-structure)
3. [Audio Access](#audio-access)
4. [Step-by-Step Example](#step-by-step-example)
5. [Audio Node Reference](#audio-node-reference)
6. [Best Practices](#best-practices)
7. [Testing & Debugging](#testing--debugging)
8. [Advanced Techniques](#advanced-techniques)

---

## Quick Start

### Your First Audio-Reactive Pattern

Create a simple bass-reactive pulse in 5 minutes:

```cpp
// File: firmware/src/my_pattern.h

#pragma once
#include "led_driver.h"
#include "pattern_audio_interface.h"
#include "parameters.h"

extern CRGBF leds[NUM_LEDS];

void draw_my_bass_pulse(float time, const PatternParameters& params) {
    // 1. Get audio snapshot (required for audio patterns)
    PATTERN_AUDIO_START();

    // 2. Get bass energy (convenience macro)
    float bass = AUDIO_BASS();  // 55-220 Hz range

    // 3. Apply sensitivity parameter
    bass = fmin(1.0f, bass * params.beat_sensitivity);

    // 4. Create pulsing color
    CRGBF color = CRGBF(bass, bass * 0.3f, 0);  // Orange

    // 5. Apply to all LEDs
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = color;
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

**To register**:
1. Include in `main.cpp`: `#include "my_pattern.h"`
2. Add to pattern registry array
3. Recompile and flash

---

## Pattern Structure

### Anatomy of a Pattern Function

Every pattern follows this structure:

```cpp
void draw_pattern_name(float time, const PatternParameters& params) {
    // ╔══════════════════════════════════════════════════════════╗
    // ║  SECTION 1: Audio Snapshot (if audio-reactive)          ║
    // ╚══════════════════════════════════════════════════════════╝
    PATTERN_AUDIO_START();  // Thread-safe audio data access

    // ╔══════════════════════════════════════════════════════════╗
    // ║  SECTION 2: Freshness Check (optional but recommended)  ║
    // ╚══════════════════════════════════════════════════════════╝
    if (!AUDIO_IS_FRESH()) {
        return;  // Skip if audio hasn't updated (save CPU)
    }

    // ╔══════════════════════════════════════════════════════════╗
    // ║  SECTION 3: Calculate Audio-Driven Values               ║
    // ╚══════════════════════════════════════════════════════════╝
    float bass = AUDIO_BASS();
    float energy = AUDIO_VU;
    // ... extract what you need from audio

    // ╔══════════════════════════════════════════════════════════╗
    // ║  SECTION 4: Apply Time-Based Animation (optional)       ║
    // ╚══════════════════════════════════════════════════════════╝
    float scroll = fmodf(time * params.speed, 1.0f);

    // ╔══════════════════════════════════════════════════════════╗
    // ║  SECTION 5: Render LEDs                                 ║
    // ╚══════════════════════════════════════════════════════════╝
    for (int i = 0; i < NUM_LEDS; i++) {
        float position = float(i) / float(NUM_LEDS - 1);

        // Combine audio + position + time
        float value = (position + scroll) * bass;
        CRGBF color = calculate_color(value);

        leds[i] = color;
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

### Function Signature

```cpp
void draw_<pattern_name>(
    float time,                      // Seconds since startup
    const PatternParameters& params  // Runtime parameters
)
```

**Parameters**:
- `time`: Animation time in seconds (monotonically increasing)
- `params`: Runtime adjustable parameters (brightness, speed, audio sensitivity)

**Returns**: `void` (modifies global `leds[]` array directly)

---

## Audio Access

### The PATTERN_AUDIO_START() Macro

**MUST BE FIRST LINE** in any audio-reactive pattern.

**What it provides**:
```cpp
PATTERN_AUDIO_START();

// Now available:
AudioDataSnapshot audio;          // Snapshot of audio state
bool audio_available;             // True if data retrieved
bool audio_is_fresh;              // True if updated this frame
uint32_t audio_age_ms;            // Age in milliseconds
```

**Thread Safety**: Creates a local snapshot (no race conditions)

**Performance**: ~0.5ms copy time (negligible)

---

### Audio Data Macros

After `PATTERN_AUDIO_START()`, use these:

#### Frequency Spectrum
```cpp
AUDIO_SPECTRUM[i]         // Raw spectrum bin (0-63)
AUDIO_SPECTRUM_SMOOTH[i]  // Smoothed (3-frame average)
AUDIO_CHROMAGRAM[i]       // Musical note energy (0-11)
```

#### Amplitude
```cpp
AUDIO_VU         // Overall level (0.0-1.0, auto-ranged)
AUDIO_VU_RAW     // Raw level (before normalization)
```

#### Convenience Bands
```cpp
AUDIO_BASS()     // 55-220 Hz (bins 0-8)
AUDIO_MIDS()     // 440-880 Hz (bins 16-32)
AUDIO_TREBLE()   // 1.76-6.4 kHz (bins 48-63)
```

#### Data Quality
```cpp
AUDIO_IS_FRESH()       // True if new data this frame
AUDIO_IS_AVAILABLE()   // True if snapshot succeeded
AUDIO_AGE_MS()         // Milliseconds since update
AUDIO_IS_STALE()       // True if >50ms old
```

---

## Step-by-Step Example

Let's create a full-spectrum visualizer from scratch.

### Step 1: Create File

Create `firmware/src/patterns/my_spectrum.h`:

```cpp
#pragma once
#include "led_driver.h"
#include "pattern_audio_interface.h"
#include "parameters.h"

extern CRGBF leds[NUM_LEDS];
```

### Step 2: Define Pattern Function

```cpp
void draw_my_spectrum(float time, const PatternParameters& params) {
    // Get audio data
    PATTERN_AUDIO_START();

    // Skip if no update
    if (!AUDIO_IS_FRESH()) return;

    // TODO: Implement visualization
}
```

### Step 3: Map Frequencies to LEDs

```cpp
    for (int i = 0; i < NUM_LEDS; i++) {
        // Map LED position to frequency spectrum
        float position = float(i) / float(NUM_LEDS - 1);  // 0.0 to 1.0

        // Get spectrum bin for this position
        int bin = int(position * 63);  // Map to 0-63

        // Get magnitude (use smoothed for less jitter)
        float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];
```

### Step 4: Apply Frequency Response

Different frequency ranges need different gain:

```cpp
        // Bass (left) needs boost, treble (right) needs reduction
        if (position < 0.33f) {
            magnitude *= params.spectrum_low;   // Bass boost
        } else if (position < 0.66f) {
            magnitude *= params.spectrum_mid;   // Mids neutral
        } else {
            magnitude *= params.spectrum_high;  // Treble adjust
        }
```

### Step 5: Apply Perceptual Curve

Human perception is non-linear:

```cpp
        // Clamp to valid range
        magnitude = fmin(1.0f, fmax(0.0f, magnitude));

        // Square root curve for better visual response
        magnitude = sqrtf(magnitude);
```

### Step 6: Calculate Color

Map position to hue (rainbow):

```cpp
        // Rainbow: bass=blue, mid=green, treble=red
        float hue = position;  // 0.0-1.0

        // Convert HSV to RGB
        CRGBF color = hsv_to_rgb(hue, 1.0f, magnitude);
```

### Step 7: Apply Brightness

Always respect user's brightness setting:

```cpp
        leds[i] = color;
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

### Step 8: Register Pattern

In `firmware/src/pattern_registry.cpp`:

```cpp
#include "patterns/my_spectrum.h"

const PatternInfo g_pattern_registry[] = {
    // ... existing patterns ...
    { "My Spectrum", "my_spectrum", "Full-spectrum visualizer",
      draw_my_spectrum, true },  // true = audio-reactive
};
```

### Step 9: Build and Test

```bash
cd firmware
pio run -t upload
```

---

## Audio Node Reference

### Frequency Analysis Nodes

#### spectrum_bin
**Purpose**: Single frequency bin access
**Range**: Bins 0-63 (55 Hz - 6.4 kHz)

```cpp
// Get specific bin
float bass_kick = AUDIO_SPECTRUM[3];   // ~110 Hz
float snare = AUDIO_SPECTRUM[20];      // ~550 Hz
float hi_hat = AUDIO_SPECTRUM[55];     // ~3.5 kHz
```

**Frequency Map**:
| Bin | Frequency | Musical Context |
|-----|-----------|-----------------|
| 0 | 55 Hz | Sub-bass |
| 8 | 220 Hz | Bass guitar |
| 20 | 550 Hz | Snare, vocals |
| 32 | 880 Hz | High vocals |
| 50 | 2.5 kHz | Cymbals |
| 63 | 6.4 kHz | Air, brilliance |

---

#### spectrum_range
**Purpose**: Average multiple bins
**Use**: Broader frequency bands

```cpp
// Manual range calculation
float bass_avg = 0.0f;
for (int i = 0; i < 21; i++) {  // Bins 0-20
    bass_avg += AUDIO_SPECTRUM[i];
}
bass_avg /= 21.0f;

// Or use convenience macro
float bass = AUDIO_BASS();  // Same as above
```

---

#### spectrum_interpolate
**Purpose**: Smooth frequency access
**Use**: Spectrum visualization

```cpp
// Get interpolated value between bins
float position = 0.5f;  // Middle of spectrum
int bin_low = int(position * 63);
int bin_high = bin_low + 1;
float frac = (position * 63) - bin_low;

float magnitude = AUDIO_SPECTRUM[bin_low] * (1.0f - frac) +
                  AUDIO_SPECTRUM[bin_high] * frac;
```

---

### Amplitude Nodes

#### audio_level
**Purpose**: Overall volume level
**Range**: 0.0 (silence) to 1.0 (loud)

```cpp
float volume = AUDIO_VU;

// Use for global effects
for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CRGBF(volume, volume, volume);  // White brightness
}
```

---

### Chromatic Nodes

#### chromagram
**Purpose**: Musical note detection
**Range**: 12 bins (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)

```cpp
// Detect which note is prominent
int dominant_note = 0;
float max_energy = 0.0f;
for (int i = 0; i < 12; i++) {
    if (AUDIO_CHROMAGRAM[i] > max_energy) {
        max_energy = AUDIO_CHROMAGRAM[i];
        dominant_note = i;
    }
}

// Map note to color
const char* note_names[] = {"C", "C#", "D", "D#", "E", "F",
                             "F#", "G", "G#", "A", "A#", "B"};
Serial.printf("Dominant note: %s (%.2f)\n",
             note_names[dominant_note], max_energy);
```

---

## Best Practices

### 1. Always Use Perceptual Curves

Human perception is logarithmic, not linear:

```cpp
// ❌ Bad: Linear magnitude (looks dim)
float brightness = magnitude;

// ✅ Good: Square root curve
float brightness = sqrtf(magnitude);

// ✅ Alternative: Power curve (adjustable)
float brightness = powf(magnitude, 0.5f);  // Same as sqrt
float brightness = powf(magnitude, 0.4f);  // More aggressive
```

---

### 2. Respect Runtime Parameters

Users should be able to adjust:

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    float bass = AUDIO_BASS();

    // ✅ Apply sensitivity parameter
    bass *= params.beat_sensitivity;

    // ✅ Apply speed to animation
    float scroll = time * params.speed;

    // ✅ Always apply brightness
    leds[i].r *= params.brightness;
    leds[i].g *= params.brightness;
    leds[i].b *= params.brightness;
}
```

---

### 3. Handle Silence Gracefully

Don't flash randomly when music stops:

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    static float last_energy = 0.0f;

    if (AUDIO_IS_FRESH() && AUDIO_VU > 0.01f) {
        // Update with new audio
        last_energy = AUDIO_VU;
    } else {
        // Fade during silence
        last_energy *= 0.95f;
    }

    // Render using faded energy
    float brightness = last_energy;
    // ...
}
```

---

### 4. Optimize for Performance

Patterns run 450+ times per second:

```cpp
// ✅ Good: Cache expensive calculations
static float hue_offset = 0.0f;
if (AUDIO_IS_FRESH()) {
    hue_offset = AUDIO_VU * 0.1f;  // Only when needed
}

// ❌ Bad: Recalculate every frame
for (int i = 0; i < NUM_LEDS; i++) {
    float hue = sinf(time * 3.14159f);  // Slow trigonometry in loop!
}

// ✅ Good: Precalculate outside loop
float hue_base = sinf(time * 3.14159f);
for (int i = 0; i < NUM_LEDS; i++) {
    float hue = hue_base + (float(i) / NUM_LEDS);
}
```

---

### 5. Use Smoothed Data

Reduce jitter:

```cpp
// ❌ Jittery: Raw spectrum
float magnitude = AUDIO_SPECTRUM[bin];

// ✅ Smooth: 3-frame average
float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];
```

---

### 6. Clamp Values

Always prevent overflow:

```cpp
// ❌ Risk: Can exceed 1.0
float brightness = magnitude * params.beat_sensitivity;

// ✅ Safe: Clamped to valid range
float brightness = fmin(1.0f, magnitude * params.beat_sensitivity);
```

---

## Testing & Debugging

### Debug Audio Data

Print audio state to serial:

```cpp
void draw_debug(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    static uint32_t last_print = 0;
    if (millis() - last_print > 100) {  // Print every 100ms
        Serial.printf("Fresh: %d | Age: %u ms | VU: %.3f | Bass: %.3f\n",
                     AUDIO_IS_FRESH(),
                     AUDIO_AGE_MS(),
                     AUDIO_VU,
                     AUDIO_BASS());

        last_print = millis();
    }

    // Simple visualization
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(AUDIO_VU, 0, 0);
    }
}
```

---

### Visualize Frequency Bins

See what each bin contains:

```cpp
void draw_bin_debugger(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    // Show first 64 bins (one per LED if 64 LEDs)
    for (int i = 0; i < min(NUM_LEDS, 64); i++) {
        float mag = AUDIO_SPECTRUM[i];
        mag = sqrtf(fmin(1.0f, mag));

        leds[i] = CRGBF(mag, mag, mag);  // White = magnitude
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Performance Profiling

Measure render time:

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    uint32_t start = micros();

    PATTERN_AUDIO_START();

    // ... pattern code ...

    uint32_t elapsed = micros() - start;

    static uint32_t max_time = 0;
    if (elapsed > max_time) {
        max_time = elapsed;
        Serial.printf("⚠️ Pattern render time: %u us (max: %u us)\n",
                     elapsed, max_time);
    }

    // Target: <8000 us (8ms)
    if (elapsed > 8000) {
        Serial.println("❌ Pattern too slow!");
    }
}
```

---

## Advanced Techniques

### Technique 1: Beat-Synchronized Animation

Trigger events on beats:

```cpp
void draw_beat_sync(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    static float last_beat = 0.0f;
    static uint32_t beat_counter = 0;

    float current_beat = AUDIO_VU;

    // Detect beat onset (rising edge)
    if (current_beat > 0.5f && last_beat <= 0.5f) {
        beat_counter++;  // Increment on beat
    }
    last_beat = current_beat;

    // Change color every 4 beats
    float hue = float(beat_counter % 4) * 0.25f;

    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = hsv_to_rgb(hue, 1.0f, current_beat);
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Technique 2: Center-Origin Spectrum

Butterfly/mirror effect:

```cpp
void draw_center_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    for (int i = 0; i < NUM_LEDS; i++) {
        // Distance from center (0.0 at center, 1.0 at edges)
        float distance = fabsf(float(i) - STRIP_CENTER_POINT) / STRIP_HALF_LENGTH;
        distance = fmin(1.0f, distance);

        // Map distance to spectrum
        int bin = int(distance * 63);
        float magnitude = sqrtf(AUDIO_SPECTRUM_SMOOTH[bin]);

        // Color by distance
        float hue = distance * 0.7f;  // Blue (center) to red (edges)

        leds[i] = hsv_to_rgb(hue, 1.0f, magnitude);
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

### Technique 3: Multi-Layer Blending

Combine multiple audio features:

```cpp
void draw_layered(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    float bass = AUDIO_BASS();
    float mids = AUDIO_MIDS();
    float treble = AUDIO_TREBLE();

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = float(i) / float(NUM_LEDS - 1);

        // Layer 1: Bass (background)
        CRGBF layer1 = CRGBF(0, 0, bass * 0.5f);

        // Layer 2: Mids (midground)
        float mid_mask = (position < 0.5f) ? position * 2.0f : (1.0f - position) * 2.0f;
        CRGBF layer2 = CRGBF(0, mids * mid_mask, 0);

        // Layer 3: Treble (foreground)
        float treble_mask = (position > 0.7f) ? (position - 0.7f) / 0.3f : 0.0f;
        CRGBF layer3 = CRGBF(treble * treble_mask, 0, 0);

        // Blend layers (additive)
        leds[i].r = layer1.r + layer2.r + layer3.r;
        leds[i].g = layer1.g + layer2.g + layer3.g;
        leds[i].b = layer1.b + layer2.b + layer3.b;

        // Clamp and apply brightness
        leds[i].r = fmin(1.0f, leds[i].r) * params.brightness;
        leds[i].g = fmin(1.0f, leds[i].g) * params.brightness;
        leds[i].b = fmin(1.0f, leds[i].b) * params.brightness;
    }
}
```

---

### Technique 4: Scrolling Spectrum

Spectrum moves across strip:

```cpp
void draw_scrolling_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    float scroll_offset = fmodf(time * params.speed * 0.1f, 1.0f);

    for (int i = 0; i < NUM_LEDS; i++) {
        float position = float(i) / float(NUM_LEDS - 1);

        // Add scroll offset and wrap
        float spectrum_position = fmodf(position + scroll_offset, 1.0f);

        int bin = int(spectrum_position * 63);
        float magnitude = sqrtf(AUDIO_SPECTRUM_SMOOTH[bin]);

        float hue = spectrum_position;
        leds[i] = hsv_to_rgb(hue, 1.0f, magnitude);
        leds[i].r *= params.brightness;
        leds[i].g *= params.brightness;
        leds[i].b *= params.brightness;
    }
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting PATTERN_AUDIO_START()
```cpp
// ❌ Will crash or show garbage
void draw_pattern(float time, const PatternParameters& params) {
    float bass = AUDIO_BASS();  // ERROR: No snapshot!
}

// ✅ Correct
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    float bass = AUDIO_BASS();  // OK
}
```

---

### Pitfall 2: Not Applying Brightness
```cpp
// ❌ Ignores user brightness setting
leds[i] = CRGBF(1.0f, 0, 0);

// ✅ Respects brightness
leds[i] = CRGBF(1.0f, 0, 0);
leds[i].r *= params.brightness;
leds[i].g *= params.brightness;
leds[i].b *= params.brightness;
```

---

### Pitfall 3: Direct Global Access
```cpp
// ❌ Race condition!
float mag = spectrogram[10];

// ✅ Thread-safe
PATTERN_AUDIO_START();
float mag = AUDIO_SPECTRUM[10];
```

---

## Checklist for New Patterns

Before submitting:

- [ ] Calls `PATTERN_AUDIO_START()` at beginning
- [ ] Uses `AUDIO_*` macros (never direct globals)
- [ ] Applies `params.brightness` to all LEDs
- [ ] Clamps values to [0.0, 1.0] range
- [ ] Handles silence gracefully (no random flashing)
- [ ] Uses perceptual curves (sqrt, pow) for magnitudes
- [ ] Render time <8ms (check with profiler)
- [ ] Tested with multiple music genres
- [ ] Documented in pattern registry
- [ ] No memory leaks or static buffer overflows

---

## Further Resources

- **Audio Synchronization Guide**: Thread-safety details
- **Audio Node Reference**: Complete API documentation
- **Example Patterns**: `firmware/src/generated_patterns.h`
- **Phase 4 Validation Report**: Testing methodology

---

**Happy Pattern Creating!**

If you create something awesome, consider contributing back to the project.

**Last Updated**: 2025-10-26
**Author**: Claude Code
**Version**: 1.0.0-draft
