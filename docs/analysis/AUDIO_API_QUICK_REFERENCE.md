# K1.reinvented Audio API Quick Reference

**For Pattern Developers**

---

## Core Macro: PATTERN_AUDIO_START()

Every pattern using audio **MUST** call this first:

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    // Initialize thread-safe audio snapshot
    PATTERN_AUDIO_START();
    
    // Now you can use AUDIO_* macros
    if (!AUDIO_IS_AVAILABLE()) return;
    
    // Access audio data...
}
```

**Creates automatically:**
- `audio` - Local AudioDataSnapshot (thread-safe copy)
- `audio_available` - bool (true if snapshot acquired)
- `audio_is_fresh` - bool (true if data changed this frame)
- `audio_age_ms` - uint32_t (milliseconds since last update)

---

## Data Access Macros

### Frequency Spectrum (64 bins, ~50 Hz to 6.4 kHz)

```cpp
AUDIO_SPECTRUM[bin]        // Raw spectrum (0.0-1.0)
AUDIO_SPECTRUM_SMOOTH[bin] // 8-sample moving average

// Convenience bands:
AUDIO_BASS()               // Bins 0-8 (55-220 Hz)
AUDIO_MIDS()               // Bins 16-32 (440-880 Hz)
AUDIO_TREBLE()             // Bins 48-63 (1.76-6.4 kHz)

// Custom range helper:
get_audio_band_energy(audio, start_bin, end_bin)  // Average of range
```

### Pitch Classes (12 bins, musical notes C through B)

```cpp
AUDIO_CHROMAGRAM[0]        // C
AUDIO_CHROMAGRAM[1]        // C#
AUDIO_CHROMAGRAM[2]        // D
// ... up to AUDIO_CHROMAGRAM[11] = B
```

### Audio Levels (0.0-1.0, auto-ranged)

```cpp
AUDIO_VU                   // Overall RMS level
AUDIO_VU_RAW              // Unnormalized level
```

### Beat & Tempo

```cpp
AUDIO_TEMPO_CONFIDENCE    // Beat confidence (0.0-1.0)
                          // 0 = no beat detected
                          // 1 = strong beat

// For direct access (advanced):
// tempi[0..63].beat      // sin(phase) for each tempo bin (-1 to 1)
// tempi[0..63].magnitude // Strength of tempo hypothesis (0-1)
```

### Spectral Change (Onset Detection)

```cpp
AUDIO_NOVELTY              // Peak energy in current frame (0.0-1.0)
                           // Indicates sudden sound/onset
```

### Reserved (Future Use)

```cpp
AUDIO_FFT[0..127]          // NOT IMPLEMENTED - returns zeros
```

---

## Query Macros

```cpp
if (AUDIO_IS_AVAILABLE())     // Snapshot retrieved successfully
if (AUDIO_IS_FRESH())         // Data changed since last frame
if (AUDIO_IS_STALE())         // Age > 50ms (no recent updates)

uint32_t age = AUDIO_AGE_MS(); // Milliseconds since last update
```

---

## Common Pattern Examples

### Spectrum Analyzer

```cpp
void draw_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    if (!AUDIO_IS_FRESH()) return;  // Optimization
    
    for (int i = 0; i < NUM_LEDS; i++) {
        int bin = (i * 64) / NUM_LEDS;  // Map LED to spectrum bin
        float brightness = AUDIO_SPECTRUM[bin];
        leds[i] = CRGBF(brightness, brightness, brightness);
    }
}
```

### Bass-Reactive Pulse

```cpp
void draw_bass_pulse(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    
    float bass = AUDIO_BASS();
    
    // Fade on silence
    if (AUDIO_IS_STALE()) {
        bass *= 0.95f;
    }
    
    float brightness = bass * bass;  // Square for punchiness
    fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness/2, 0));
}
```

### Beat-Synchronized Flash

```cpp
void draw_beat_flash(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    
    float tempo = AUDIO_TEMPO_CONFIDENCE;
    
    if (tempo > 0.3f) {
        // Strong beat detected
        float brightness = tempo * tempo;  // Quadratic for emphasis
        fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
    } else {
        // No beat
        fill_solid(leds, NUM_LEDS, CRGBF(0.05f, 0.05f, 0.05f));
    }
}
```

### Multi-Band Visualizer

```cpp
void draw_3band(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    
    float bass = AUDIO_BASS();
    float mids = AUDIO_MIDS();
    float treble = AUDIO_TREBLE();
    
    int third = NUM_LEDS / 3;
    
    // Bass = Red
    for (int i = 0; i < third; i++) {
        leds[i] = CRGBF(bass, 0, 0);
    }
    
    // Mids = Green
    for (int i = third; i < 2*third; i++) {
        leds[i] = CRGBF(0, mids, 0);
    }
    
    // Treble = Blue
    for (int i = 2*third; i < NUM_LEDS; i++) {
        leds[i] = CRGBF(0, 0, treble);
    }
}
```

### Fallback for No Audio

```cpp
void draw_pattern(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    
    if (!AUDIO_IS_AVAILABLE()) {
        // No audio available - fall back to time-based animation
        float brightness = 0.5f * sinf(time);
        fill_solid(leds, NUM_LEDS, CRGBF(brightness, brightness, brightness));
        return;
    }
    
    // Audio-reactive code here...
}
```

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Audio Update Rate | ~20-25 FPS |
| Pattern Render Rate | ~60 FPS (independent) |
| Data Freshness | Typically 0-20ms |
| Stale Threshold | 50ms (silence detection) |
| Snapshot Latency | <1ms |
| Frequency Bins | 64 (musical notes) |
| Tempo Bins | 64 (32-192 BPM) |
| Pitch Classes | 12 (C through B) |

---

## Important Notes

1. **Always call PATTERN_AUDIO_START()** before using AUDIO_* macros
2. **Check AUDIO_IS_FRESH()** if you want to skip redundant rendering
3. **Handle AUDIO_IS_STALE()** for graceful silence fading
4. **Bin indices are always safe** (0-63 for spectrum, 0-11 for chromagram)
5. **All values auto-range** (0.0-1.0) for dynamic response
6. **No blocking operations** - safe to call from any task
7. **Thread-safe by design** - snapshot is immutable during pattern execution

---

## Data Range Reference

| Metric | Min | Max | Notes |
|--------|-----|-----|-------|
| AUDIO_SPECTRUM[x] | 0.0 | 1.0 | Auto-ranged |
| AUDIO_VU | 0.0 | 1.0 | Auto-ranged |
| AUDIO_TEMPO_CONFIDENCE | 0.0 | 1.0 | 0 = no beat |
| AUDIO_NOVELTY | 0.0 | 1.0 | Spectral peak |
| tempi[].beat | -1.0 | 1.0 | sin(phase) |
| AUDIO_AGE_MS | 0 | 9999 | Milliseconds |

---

## Line Number References

**Public API Definition:**
- `pattern_audio_interface.h:70-80` - PATTERN_AUDIO_START() macro
- `pattern_audio_interface.h:99-115` - Data accessor macros
- `pattern_audio_interface.h:135-190` - Query macros
- `pattern_audio_interface.h:217-235` - get_audio_band_energy() function
- `pattern_audio_interface.h:271-273` - Convenience band macros

**Data Structure:**
- `audio/goertzel.h:86-112` - AudioDataSnapshot definition

**Implementation:**
- `audio/goertzel.cpp:462-478` - VU level calculation
- `audio/tempo.cpp:262-294` - Beat detection & tempo_confidence
- `main.cpp:27-73` - Audio processing pipeline

---

**Last Updated:** 2025-10-27  
**Status:** VERIFIED & TESTED

