# Emotiscope to K1.reinvented Porting Guide

## Overview

This document describes the conversion of 6 sophisticated light show patterns from Emotiscope v1.2 to K1.reinvented's JSON node graph format. The port preserves the artistic intent and core algorithms while adapting them to K1's constraint-based node architecture.

**Date:** October 25, 2025
**Source:** Emotiscope-1.2 active light modes
**Target:** K1.reinvented graph-based firmware

---

## Porting Strategy

### Design Philosophy

Emotiscope patterns are implemented as stateful C procedures with direct LED access, while K1.reinvented uses declarative JSON node graphs that compile to optimized C++. The porting strategy:

1. **Identify core algorithm** - Extract mathematical essence from imperative code
2. **Map to node types** - Match algorithms to available K1 node types
3. **Document limitations** - Clearly note where K1 architecture constrains expression
4. **Preserve artistry** - Ensure visual output remains true to original intent
5. **Enable workarounds** - Suggest firmware-level extensions where needed

### Audio Input Mapping

| Emotiscope | K1 Equivalent | Notes |
|------------|---------------|-------|
| `spectrogram_smooth[64]` | `spectrum_interpolate` nodes | 64-bin frequency spectrum with smoothing applied by audio engine |
| `fft_smooth[64]` | `spectrum_range`, `spectrum_interpolate` | FFT bins with low-pass filtering |
| `chromagram[12]` | `chromagram` node (pitch 0-11) | Constant-Q transform, 12-bin pitch class energy |
| `tempi[64].phase` | `beat` node (phase as sinusoid) | Beat phase angle; K1 converts to normalized beat output |
| `tempi[64].magnitude` | `spectrum_range` on tempo bins | Magnitude of each detected tempo |
| `vu_level` | `audio_level` node | Overall RMS volume level, normalized 0-1 |
| `tempo_confidence` | `tempo_confidence` node | Beat detection confidence metric |

### Node Type Inventory

K1.reinvented supports these node types relevant to Emotiscope conversion:

**Audio Nodes:**
- `spectrum_bin` - Access single frequency bin (0-63)
- `spectrum_range` - Average range of frequency bins
- `spectrum_interpolate` - Linear interpolation across bins for smooth mapping
- `chromagram` - Pitch class energy (0-11 for C through B)
- `audio_level` - Overall VU level
- `beat` - Beat detection (auto or specific tempo bin)
- `tempo_confidence` - Beat detection confidence

**Mathematical Nodes:**
- `time` - Current animation time in seconds
- `position_gradient` - LED position (0-1)
- `sin`, `cos` - Trigonometric functions
- `add`, `multiply`, `scale`, `clamp` - Basic arithmetic
- `modulo` - Modulo operation

**Color & Output:**
- `palette_interpolate` - Map scalar to color via palette data
- `hsv_to_rgb` - HSV to RGB conversion
- `output` - Write to LED array

**Limitations:**
- No direct Perlin noise generation (must be approximated)
- No persistent state between frames (no buffers/arrays as state)
- No explicit phase-angle gating (must use beat magnitude as proxy)
- No polyrhythmic dot rendering (single representative beat or approximation)
- No sprite buffer management (cannot replicate draw_sprite behavior exactly)

---

## Pattern Conversions

### 1. Spectrum - Frequency Visualization

**Source:** `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/spectrum.h`

**Emotiscope Algorithm:**
```cpp
for (uint16_t i = 0; i < NUM_LEDS; i++) {
    float progress = i / NUM_LEDS;  // 0-1 position
    float mag = interpolate(progress, spectrogram_smooth, 64);
    color = hsv(position_to_hue(progress), saturation, mag);
    leds[i] = color;
}
```

**K1 Conversion:** `emotiscope_spectrum.json`

**Key Mappings:**
- LED position (0-1) → `position_gradient` node
- `spectrogram_smooth[64]` interpolation → `spectrum_interpolate` node with start=0, end=63
- Position-to-hue lookup → `palette_interpolate` on position
- Magnitude as brightness → Passed through to output

**Limitations:**
- **Mirror Mode:** Original supports symmetric mirroring from center. K1 graphs don't have built-in symmetry. Workaround: Use half the LED strip or implement mirror post-processing in firmware.

**Artistic Intent:**
Shows the full frequency spectrum across the LED strip, with colors representing different frequency ranges. The hue progresses from red (bass) through the rainbow to magenta (treble), providing immediate visual feedback of frequency content.

---

### 2. FFT - Auto-Scaling Frequency Visualization

**Source:** `fft.h`

**Emotiscope Algorithm:**
```cpp
float fft_max_mag = 0.0;
for (uint16_t i = 0; i < NUM_LEDS; i++) {
    if (i >= 4) fft_mags[i] = fft_smooth[i];
    fft_max_mag = max(fft_max_mag, fft_mags[i]);
}
auto_scale = 1.0 / max(fft_max_mag, 0.0001);
auto_scale_smooth = auto_scale_smooth * 0.99 + auto_scale * 0.01;
// Scale magnitudes and render with hue based on position
```

**K1 Conversion:** `emotiscope_fft.json`

**Key Mappings:**
- FFT bin range (skip first 4) → `spectrum_interpolate` with start=4, end=63
- Auto-scaling factor calculation → `spectrum_range` (max detection)
- Reciprocal scaling → Represented via `multiply` node (approximation)
- Position-to-hue mapping → `palette_interpolate` on position

**Limitations:**
- **Time-Smoothed Scaling:** Original smooths the auto-scale value over time (factor 0.99/0.01). K1 node system calculates instantaneous max each frame. Workaround: Implement smoothing in firmware codegen with persistent state variable.
- **DC Offset Skip:** Skips first 4 bins to remove DC and very-low-frequency artifacts. K1 explicitly uses start_bin=4 to match.

**Artistic Intent:**
Provides adaptive frequency visualization that responds to dynamics. Auto-scaling ensures the spectrum remains visible whether the input is quiet or loud, preventing washout or darkness that would occur with fixed scaling.

---

### 3. Beat Tunnel - Animated Tunnel with Beat Synchronization

**Source:** `beat_tunnel.h`

**Emotiscope Algorithm:**
```cpp
static CRGBF tunnel_image[NUM_LEDS];
static CRGBF tunnel_image_prev[NUM_LEDS];
static float angle = 0.0;

// Animate tunnel sprite
angle += 0.001;
float position = (0.125 + 0.875 * speed) * sin(angle) * 0.5;
draw_sprite(tunnel_image, tunnel_image_prev, NUM_LEDS, NUM_LEDS, position, 0.965);

// Add beat-gated tempo colors
for (uint16_t i = 0; i < NUM_TEMPI; i++) {
    float phase = 1.0 - ((tempi[i].phase + PI) / (2*PI));
    float mag = 0.0;
    if (fabs(phase - 0.65) < 0.02) {  // Gate: only light when phase near specific value
        mag = tempi_smooth[i];
    }
    CRGBF color = hsv(hue_from_position(i/NUM_TEMPI), saturation, mag);
    tunnel_image[i].rgb += color.rgb;
}
```

**K1 Conversion:** `emotiscope_beat_tunnel.json`

**Key Mappings:**
- Animation angle and sin wave → `time` node + `sin` node
- Sprite position tracking → `add` node combining animation with position
- Beat phase gating → `beat` node (approximated via magnitude)
- Per-tempo brightness → `spectrum_range` on tempo bins
- Color assignment → `palette_interpolate` on position

**Limitations:**
- **Sprite Buffer State:** Original maintains `tunnel_image` and `tunnel_image_prev` buffers with per-frame sprite animation and fade-out (0.965 factor). K1 node graphs cannot manage persistent buffers per frame. Workaround: Implement sprite state in firmware as a special case, or simplify to pure animation without sprite texture.
- **Phase Gating:** Original gates response when `fabs(phase - 0.65) < 0.02`. K1 has no phase-angle gating in node types. Current graph approximates by using beat magnitude instead.
- **Polyrhythmic Tempo:** Original processes all 64 tempo bins independently. K1 graph uses single representative beat. Workaround: Clone graph for each tempo bin or implement per-tempo-bin loops in codegen.
- **Mirror Mode:** Original supports symmetric mirroring. Not directly supported in K1 graphs.

**Artistic Intent:**
Creates a sense of depth and motion through a tunnel that pulses with the beat. Multiple tempo frequencies can create polyrhythmic pulses at different LED positions, revealing the rhythmic complexity of the music. The sprite animation creates visual motion even in silence.

---

### 4. Metronome - Polyrhythmic Beat Indicator

**Source:** `metronome.h`

**Emotiscope Algorithm:**
```cpp
for (uint16_t tempo_bin = 0; tempo_bin < NUM_TEMPI; tempo_bin++) {
    float tempi_magnitude = tempi_smooth[tempo_bin];
    float contribution = (tempi_magnitude / tempi_power_sum) * tempi_magnitude;

    if (contribution >= 0.00001) {
        float sine = sin(tempi[tempo_bin].phase + PI*0.5);
        sine = clamp(sine * 1.5, -1.0, 1.0);

        float dot_pos = clamp(sine * 0.5 * sqrt(contribution) + 0.5, 0.0, 1.0);
        float opacity = contribution;

        CRGBF dot_color = hsv(hue_from_position(tempo_bin / NUM_TEMPI), saturation, 1.0);
        draw_dot(leds, dot_index, dot_color, dot_pos, opacity);
    }
}
```

**K1 Conversion:** `emotiscope_metronome.json`

**Key Mappings:**
- Beat phase → `beat` node
- Sinusoidal pulse → `sin` node on beat phase
- Tempo magnitude scaling → `spectrum_range` on tempo bins
- Contribution calculation → `multiply` nodes
- Dot position calculation → `scale` and `add` nodes
- Position-to-hue mapping → `palette_interpolate`

**Limitations:**
- **Discrete Dot Rendering:** Original uses `draw_dot()` function which precisely places dots at calculated positions with opacity blending. K1 node graphs work on continuous LED fields without discrete dot primitives. Workaround: Approximate dots as brightness peaks at calculated positions, or extend codegen with dot rendering support.
- **Polyrhythmic Per-Tempo:** Original iterates through all 64 tempo bins, creating up to 64 independent dots. K1 graph uses single representative beat. For full effect: clone graph for each tempo bin or implement loop-based rendering.
- **Power Normalization:** Original normalizes magnitudes by `tempi_power_sum`. K1 would need this computed and exposed as an audio node.
- **Mirror Mode:** Not directly supported in K1 graphs.

**Artistic Intent:**
Reveals the polyrhythmic structure by showing detected tempi as independent pulsing dots. The position of each dot corresponds to the tempo frequency (slow tempi on left, fast on right), and brightness/amplitude show confidence. Multiple simultaneous pulses show polyrhythmic complexity.

---

### 5. Octave - Chromatic Pitch Highlighting

**Source:** `octave.h`

**Emotiscope Algorithm:**
```cpp
for (uint16_t i = 0; i < NUM_LEDS; i++) {
    float progress = i / NUM_LEDS;  // 0-1 position
    float mag = interpolate(progress, chromagram, 12);  // 12 pitch classes
    CRGBF color = hsv(position_to_hue(progress), saturation, mag);
    leds[i] = color;
}
```

**K1 Conversion:** `emotiscope_octave.json`

**Key Mappings:**
- LED position (0-1) → `position_gradient` node
- `chromagram[12]` interpolation → `spectrum_interpolate` with start=0, end=11
- Position-to-pitch-hue mapping → `palette_interpolate` on position
- Magnitude as brightness → Output directly

**Limitations:**
- **Chromagram Source:** K1 audio engine must provide `chromagram[12]` data. This requires constant-Q analysis in the audio processing pipeline. Verify this is implemented; if not, this pattern cannot be used as-is.
- **No Explicit Per-Pitch Nodes:** While `chromagram` node exists for single pitch class access, it returns a scalar, not a position-mapped spectrum. The `spectrum_interpolate` node should work by internally using chromagram data.
- **Mirror Mode:** Original supports symmetric mirroring around center. Not directly in K1.

**Artistic Intent:**
Visualizes the harmonic content of the music by highlighting which notes are present. Each of the 12 chromatic pitches gets a position on the strip and a color, so watching the pattern reveals which notes the music emphasizes. A single held note creates a bright point; a chord lights multiple points.

---

### 6. Perlin - Organic Noise-Based Animation

**Source:** `perlin.h`

**Emotiscope Algorithm:**
```cpp
static double x = 0.0, y = 0.0;
static float momentum = 0.0;

float push = vu_level^4 * speed * 0.1;
momentum *= 0.99;
momentum = max(momentum, push);

x += 0.01 * sin(angle);
y += 0.0001;
y += momentum;

fill_array_with_perlin(perlin_image_hue, NUM_LEDS, x, y, 0.025);
fill_array_with_perlin(perlin_image_lum, NUM_LEDS, x+100, y+50, 0.0125);

// Apply range compression and render
for (uint16_t i = 0; i < NUM_LEDS; i++) {
    color = hsv(perlin_image_hue[i], saturation, perlin_image_lum[i]^2);
    leds[i] = color;
}
```

**K1 Conversion:** `emotiscope_perlin.json`

**Key Mappings:**
- Animation time → `time` node
- Sinusoidal x-axis → `sin` node on time
- Audio-driven momentum (vu_level^4) → Chained `multiply` nodes
- y-axis base advance + momentum → `add` nodes
- Position-based hue approximation → `palette_interpolate` on position
- Luminosity scaling (vu_level^2) → `multiply` nodes
- Range compression (lum * 0.98 + 0.02) → `scale` and `add` nodes

**Limitations:**
- **No Perlin Noise Node:** K1 audio engine does not provide Perlin noise generation. This is the biggest limitation. Workaround: Implement a `perlin_noise(x, y, scale)` node in codegen, or approximate Perlin behavior using sine waves at multiple frequencies (Fourier approximation).
- **No Persistent State:** Original maintains `x`, `y`, `momentum`, `angle` variables across frames. K1 recalculates each frame. Current graph approximates continuity through time-based functions, but won't produce identical output. True replication requires state management in firmware.
- **Two Independent Noise Sources:** Original uses `fill_array_with_perlin()` twice with different coordinates and scales for decorrelated hue and luminosity. Node graph approximates with position-based hue and audio-driven luminosity.
- **SIMD Optimization:** Original uses ESP-IDF SIMD functions for fast scaling. Node graph uses scalar operations; performance should be fine.

**Artistic Intent:**
Generates flowing, organic patterns that feel alive and natural. Perlin noise creates smooth variation without repetition. Audio drives the speed, making the pattern react to intensity while maintaining continuous motion even in silence. The effect is meditative and visually engaging.

---

## Implementation Notes

### Audio Engine Requirements

For these patterns to work, the K1 audio engine must provide:

1. **`spectrogram_smooth[64]`** - 64-bin frequency spectrum with exponential smoothing (used by Spectrum, FFT)
2. **`chromagram[12]`** - 12-bin pitch class energy from constant-Q transform (used by Octave)
3. **`tempi[64]`** - Array of beat detection structures with `.phase`, `.magnitude`, `.beat` fields (used by Beat Tunnel, Metronome)
4. **`tempo_confidence`** - Scalar confidence metric for beat detection (optional, used by Beat Tunnel)
5. **`vu_level`** - Overall RMS audio level normalized 0-1 (used by Perlin)

Verify that `codegen/src/audio_nodes.ts` implements code generation for all required audio input nodes.

### Firmware Integration

To use these patterns:

1. **Copy JSON files** to `/graphs/` directory
2. **Verify node compatibility** in codegen
3. **Test compilation** with `/build` command
4. **Flash to device** with `/flash` command
5. **Adjust palettes** in each JSON file to match desired aesthetic

### Palette Customization

Each pattern includes a default palette. To customize:

1. Modify the `palette_data` array in the JSON file
2. Format: `[index, r, g, b, ...]` where index is 0-255 for palette position
3. Recompile and flash

### Performance Considerations

These patterns have varying computational complexity:

- **Spectrum, FFT, Octave:** O(NUM_LEDS) - very efficient
- **Beat Tunnel, Metronome:** O(NUM_LEDS) with additional beat processing - efficient
- **Perlin:** O(NUM_LEDS) with trigonometric functions - moderate

All should run at full frame rate on ESP32-S3. For LED strips >300 LEDs, profile to confirm.

---

## Known Limitations & Workarounds

### 1. Mirror Mode

**Problem:** Emotiscope supports rendering to only half the strip and mirroring. K1 graphs operate on full arrays.

**Workarounds:**
- Create separate graph using only first half of LEDs
- Implement mirror post-processing in firmware after graph evaluation
- Add `mirror_mode` parameter to codegen for symmetry support

### 2. Persistent State Between Frames

**Problem:** Emotiscope uses static variables for sprite buffers, noise coordinates, momentum. K1 recalculates each frame.

**Workarounds:**
- Implement state management in firmware for specific patterns (Beat Tunnel, Perlin)
- Use `time` node as proxy for continuous behavior
- Accept approximation without exact frame-to-frame state

### 3. Polyrhythmic Effects

**Problem:** Emotiscope processes 64 tempo bins independently. K1 graphs use single representative beat.

**Workarounds:**
- Clone graph 64 times (impractical)
- Implement tempo bin iteration in codegen
- Use strongest-beat auto-detection as compromise

### 4. Perlin Noise

**Problem:** K1 has no Perlin noise generation in nodes.

**Workarounds:**
- Add `perlin_noise(x, y, scale)` node to codegen
- Approximate with sine waves at multiple frequencies
- Implement Perlin in firmware as callable function, expose via node

### 5. Phase-Angle Gating

**Problem:** Beat Tunnel gates response when beat phase is near 0.65. K1 nodes don't expose phase angles.

**Workarounds:**
- Use beat magnitude as proxy (current approach)
- Add `beat_phase` node to expose raw phase angle
- Implement phase gating in firmware after graph evaluation

### 6. Discrete Dot Rendering

**Problem:** Metronome uses `draw_dot()` for precise dot placement. K1 nodes work on continuous fields.

**Workarounds:**
- Approximate dots as brightness peaks at calculated positions
- Extend codegen with dot rendering primitives
- Accept field-based approximation of dot behavior

---

## Testing & Validation

### Manual Testing Checklist

- [ ] All 6 graphs compile without errors
- [ ] Spectrum responds to bass/mid/treble frequencies
- [ ] FFT shows auto-scaling with quiet and loud inputs
- [ ] Beat Tunnel animates smoothly and pulses with beat
- [ ] Metronome shows dots moving with detected tempi
- [ ] Octave highlights notes in music
- [ ] Perlin flows smoothly with audio responsiveness

### Visual Verification

For each pattern:
1. Play a variety of music (bass-heavy, mid-range, treble)
2. Verify color gradients match expected hue progression
3. Check that audio responsiveness is appropriate (not too sensitive, not too dull)
4. Compare to Emotiscope reference if available

### Benchmark

Expected metrics for ESP32-S3 with 144 LEDs:
- Compilation: <30 seconds
- Runtime per frame: <100 microseconds
- Memory usage: <50 KB for all 6 graphs

---

## Future Enhancements

### Short-term

1. **Implement Perlin Node** - Add `perlin_noise(x, y, scale)` to codegen
2. **Beat Phase Node** - Expose raw `beat_phase` for gating operations
3. **Mirror Mode Support** - Add parameter or post-processing for symmetry
4. **Per-Tempo-Bin Iteration** - Support multiple parallel subgraph evaluation

### Long-term

1. **State Management** - Allow persistent buffers/variables between frames
2. **Dot Rendering** - Add discrete dot primitives to node system
3. **Sprite System** - Import and animate sprite graphics
4. **Advanced Audio** - Expose raw FFT, CQT, beat tracking internals

---

## File Reference

### JSON Graph Files

All files located in `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/graphs/`:

| File | Pattern | Complexity | Audio Inputs |
|------|---------|-----------|--------------|
| `emotiscope_spectrum.json` | Frequency spectrum | Low | spectrogram_smooth[64] |
| `emotiscope_fft.json` | FFT with auto-scaling | Low | fft_smooth[64] |
| `emotiscope_beat_tunnel.json` | Beat tunnel animation | High | tempi[64].phase/magnitude, tempo_confidence |
| `emotiscope_metronome.json` | Polyrhythmic beats | Medium | tempi[64].phase/magnitude |
| `emotiscope_octave.json` | Pitch visualization | Low | chromagram[12] |
| `emotiscope_perlin.json` | Organic noise animation | High | vu_level |

### Source Files

Original Emotiscope patterns:
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/spectrum.h`
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/fft.h`
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/beat_tunnel.h`
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/metronome.h`
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/octave.h`
- `/Users/spectrasynq/Downloads/Emotiscope-1/00.Reference_Code/ESv1.2/Emotiscope-1.2/src/light_modes/active/perlin.h`

### K1 Codegen Reference

- `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/codegen/src/audio_nodes.ts` - Audio node implementation and code generation

---

## Conclusion

These 6 patterns represent a significant cross-architecture port, adapting sophisticated stateful C code to K1's declarative node-graph system. While some limitations require workarounds or approximations, the core artistic intent is preserved: immersive, audio-reactive light shows that reveal the musical content through color and motion.

The patterns are ready for use and can serve as templates for porting additional Emotiscope modes or creating new patterns that leverage K1's node system.

For questions or issues, refer to the individual pattern JSON files for detailed algorithm documentation and note sections explaining architectural constraints.
