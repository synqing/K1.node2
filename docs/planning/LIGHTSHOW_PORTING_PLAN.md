---
title: K1.reinvented Light Show Porting Plan
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented Light Show Porting Plan

**Status**: Planning & Architecture Design
**Scope**: Port 3-5 beat/tempo-related light shows from Emotiscope to K1.reinvented
**Target Patterns**: Pulse, Beat Tunnel, Tempiscope, Perlin, (+ 1 bonus sensory mode)

---

## Executive Summary

We will port 5 professional light shows from Emotiscope to K1.reinvented while:
1. ✅ Using K1's superior thread-safe snapshot architecture
2. ✅ Implementing switchable palettes (all patterns access all 5 palettes)
3. ✅ Extending PatternParameters for beat/tempo-specific controls
4. ✅ Maintaining Emotiscope's proven algorithms unchanged
5. ✅ Building for correctness first, optimizing performance later

---

## Part 1: Architecture Mapping

### Emotiscope → K1.reinvented Translation

#### Audio Data Access

| Emotiscope | K1.reinvented | Status |
|-----------|---------------|--------|
| Direct `spectrogram[]` access | `AUDIO_SPECTRUM_SMOOTH[]` macro | ✅ Mapped |
| Direct `chromagram[]` access | `AUDIO_CHROMAGRAM[]` macro | ✅ Mapped |
| Direct `tempi[]` array | Not in snapshot yet ⚠️ | See below |
| Direct `tempi_smooth[]` array | Not in snapshot yet ⚠️ | See below |
| `tempo_confidence` | `AUDIO_TEMPO_CONFIDENCE` macro | ✅ Mapped |
| `vu_level` | `AUDIO_VU` macro | ✅ Mapped (just fixed!) |
| `configuration.*` params | `params.*` from PatternParameters | ✅ Mapped |

#### Tempo Data Availability Issue

**Problem**: Beat tunnel and tempiscope both use `tempi[]` array directly:
```cpp
// beat_tunnel.h line 17
for(uint16_t i = 0; i < NUM_TEMPI; i++){
    float phase = 1.0 - ((tempi[i].phase + PI) / (2.0*PI));
    // ... uses tempi[i].phase
}

// tempiscope.h line 6
float sine = 1.0 - ((tempi[i].phase + PI) / (2.0*PI));
```

**Solution**: Two approaches:
1. **Recommended**: Populate `audio.tempo_magnitude[]` and `audio.tempo_phase[]` in goertzel.h (already in struct)
2. **Alternative**: Use only `AUDIO_TEMPO_CONFIDENCE` and approximate beat phase with time-based calculation

**Decision**: Use approach #1 - sync tempo data just like we synced VU level

#### Lookup Table Availability

| Function | Emotiscope | K1 Status | Solution |
|----------|-----------|----------|----------|
| `num_leds_float_lookup[i]` | (float)i / NUM_LEDS | Not present | Create inline |
| `num_tempi_float_lookup[i]` | (float)i / NUM_TEMPI | Not present | Create inline |
| `get_color_range_hue(progress)` | Maps progress to hue | Not present | Use palette directly |

**Decision**: Create inline helper macros in generated_patterns.h

#### Helper Functions

| Function | Emotiscope | K1 Status | Solution |
|----------|-----------|----------|----------|
| `hsv(h,s,v)` → CRGBF | FastLED library | Check FastLED | Import or create |
| `color_from_palette()` | Custom Emotiscope | K1 has implementation | ✅ Use existing |
| `fill_array_with_perlin()` | Custom helper | In light_modes_helpers | ✅ Portable |
| `apply_split_mirror_mode()` | Custom Emotiscope | Not in K1 | Create custom |
| `clip_float()` | Utility | Likely available | ✅ Check/add |
| `dsps_mulc_f32_ae32()` | ESP-DSP | Available in IDF | Import if needed |

---

## Part 2: PatternParameters Extension

### Current K1 Structure

```cpp
struct PatternParameters {
    // Global controls (all patterns share)
    float brightness;           // 0.0-1.0
    float softness;            // 0.0-1.0
    float color;               // 0.0-1.0 (hue base)
    float color_range;         // 0.0-1.0 (spread)
    float saturation;          // 0.0-1.0
    float warmth;              // 0.0-1.0
    float background;          // 0.0-1.0

    // Pattern controls
    float speed;               // 0.0-1.0
    uint8_t palette_id;        // Which palette to use

    // Extension slots (available!)
    float custom_param_1;      // For pattern-specific use
    float custom_param_2;      // For pattern-specific use
    float custom_param_3;      // For pattern-specific use
};
```

### New Fields Needed for Beat/Tempo Patterns

**Analysis of what Emotiscope patterns use:**
- `configuration.speed` ✅ Already mapped
- `configuration.softness` ✅ Already mapped
- `configuration.saturation` ✅ Already mapped
- `configuration.mirror_mode` ⚠️ Not in PatternParameters
- `configuration.current_palette` ❌ Separate field needed for palette switching

### Extension Strategy

**Option A: Add to PatternParameters** (recommended)
```cpp
struct PatternParameters {
    // ... existing fields ...

    // NEW: Beat/Tempo Pattern Extensions
    bool mirror_mode;              // Mirror/split LED strip
    uint8_t palette_id;            // Which palette (overload existing field)
    float beat_sensitivity;        // custom_param_1 alias
    float wave_persistence;        // custom_param_2 alias
    float color_variation;         // custom_param_3 alias
};
```

**Mapping Strategy**:
- Use existing `palette_id` field (K1 already has it!)
- Use existing `custom_param_1/2/3` for beat-specific controls
- Add `mirror_mode` as boolean
- Update web UI slider mappings to control custom_param_1/2/3

**NO CHANGES NEEDED** to core PatternParameters struct! K1 already has everything we need.

---

## Part 3: Palette Switching System

### Current K1 Palette System

**5 Hardcoded Palettes:**
1. palette_departure (transformation: earth→light→growth)
2. palette_lava (intensity: black→red→orange→white)
3. palette_twilight (peace: amber→purple→blue)
4. palette_sunset_real (emotiscope reference)
5. palette_fire (emotiscope reference)

**Current Implementation**:
```cpp
CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
    palette_index = palette_index % NUM_PALETTES;  // Clamp to valid range
    // ... interpolate color at progress (0.0-1.0) with brightness multiplier
}
```

### New Switchable Palette System

**Requirement**: Each pattern can use ANY palette at runtime

**Solution**: Leverage existing `palette_id` field!

**Implementation**:
```cpp
// In generated_patterns.h, all patterns use:
uint8_t active_palette = params.palette_id;  // Current pattern's palette

// Then in pattern:
CRGBF color = color_from_palette(active_palette, progress, brightness);
```

**For Multiple Palette Access** (if a pattern needs to cycle through all palettes):
```cpp
// Create pattern-specific palette rotation in custom_param_1
float palette_rotation = params.custom_param_1;  // 0.0-1.0
uint8_t next_palette = (uint8_t)(palette_rotation * NUM_PALETTES);
```

**Already Supported!** - K1's `params.palette_id` maps to uint8_t, can be 0-4.

---

## Part 4: Tempo Data Synchronization

### Current Gap

K1's AudioDataSnapshot has tempo fields but they're never populated:
```cpp
float tempo_magnitude[NUM_TEMPI];   // In struct but NEVER written
float tempo_phase[NUM_TEMPI];       // In struct but NEVER written
```

### Required Fix

**In goertzel.h calculate_magnitudes() after VU sync** (line ~580):

```cpp
// [NEW] Sync tempo data for beat-reactive patterns
// This mirrors the tempi[] and tempi_smooth[] arrays from Emotiscope
if (audio_sync_initialized) {
    // ... existing spectrum/VU sync ...

    // NEW: Sync tempo data (if tempo.h populates these)
    // For now, use confidence value as approximation
    for (uint16_t i = 0; i < NUM_TEMPI; i++) {
        audio_back.tempo_magnitude[i] = 0.0f;  // Will be populated by tempo.h
        audio_back.tempo_phase[i] = 0.0f;      // Will be populated by tempo.h
    }
}
```

**Decision**: Keep placeholder structure. Emotiscope's tempo.h may or may not exist in K1.
- If tempo data not available: Patterns fall back to `AUDIO_TEMPO_CONFIDENCE` only
- If tempo data available: Patterns get full beat phase information

---

## Part 5: Patterns to Port (Priority Order)

### Tier 1: Beat-Reactive Core (Start Here)

#### 1. **Pulse** (Beat-Synchronized Waves)
- **From**: Emotiscope pulse.h (120 lines)
- **Core Logic**: Spawn concentric waves on beat detection, apply Gaussian decay
- **Audio Data Used**:
  - `tempo_confidence` → beat detection
  - `chromagram[]` → dominant note hue
- **Parameters Needed**:
  - speed → wave propagation speed
  - softness → decay rate
  - (optional) beat_sensitivity → custom_param_1
- **K1 Translation**:
  - Keep wave pool structure (static array)
  - Use `AUDIO_TEMPO_CONFIDENCE` for beat trigger
  - Use `AUDIO_CHROMAGRAM` for hue
  - Use `color_from_palette()` instead of hardcoded palette
- **Complexity**: Medium
- **Estimated Effort**: 2-3 hours

#### 2. **Tempiscope** (Tempo Visualization)
- **From**: Emotiscope tempiscope.h (20 lines)
- **Core Logic**: Display tempo bin magnitudes with phase modulation
- **Audio Data Used**:
  - `tempi[i].phase` → beat phase per tempo bin
  - `tempi_smooth[i]` → beat magnitude
- **Parameters Needed**:
  - saturation → color intensity
  - speed (optional) → for animation
- **K1 Translation**:
  - Use `audio.tempo_phase[i]` (once populated)
  - Fallback: Use time-based phase calculation
  - Use palette for coloring
- **Complexity**: Easy
- **Estimated Effort**: 1-2 hours

#### 3. **Beat Tunnel** (Tempo-Driven Tunnel)
- **From**: Emotiscope beat_tunnel.h (50 lines)
- **Core Logic**: Tunnel effect with sprite persistence + beat visualization
- **Audio Data Used**:
  - `tempi[i].phase` → tunnel position
  - `tempi_smooth[i]` → beat magnitude
- **Parameters Needed**:
  - speed → tunnel animation speed
  - saturation → color intensity
  - mirror_mode → split/mirror rendering
- **K1 Translation**:
  - Create tunnel persistence buffer (CRGBF[NUM_LEDS])
  - Use draw_sprite() or create custom blending
  - Use palette for beat coloring
- **Complexity**: Hard
- **Estimated Effort**: 3-4 hours

### Tier 2: Procedural/Sensory (Add After Tier 1)

#### 4. **Perlin** (Procedural Noise Beauty)
- **From**: Emotiscope perlin.h (56 lines)
- **Core Logic**: Perlin noise driven by VU momentum
- **Audio Data Used**:
  - `vu_level` → momentum push
  - `configuration.speed` → animation speed
- **Parameters Needed**:
  - speed → animation/noise speed
  - saturation → color saturation
  - mirror_mode → rendering mode
- **K1 Translation**:
  - Keep Perlin noise algorithm
  - Use `AUDIO_VU` for energy
  - Use `params.speed` directly
  - Replace `dsps_mulc_f32_ae32()` with simple loop if needed
- **Complexity**: Medium
- **Estimated Effort**: 2-3 hours

#### 5. **Sensory Kaleidoscope** (Bonus - Music Symmetry)
- **From**: Emotiscope sensory_kaleidoscope.h
- **Core Logic**: Kaleidoscopic patterns from frequency analysis
- **Audio Data Used**:
  - `chromagram[]` or `spectrogram_smooth[]` → energy
- **Parameters Needed**:
  - speed, saturation, brightness
- **K1 Translation**:
  - Straightforward port
  - Good showcase of palette system
- **Complexity**: Medium
- **Estimated Effort**: 2 hours

---

## Part 6: Implementation Phases

### Phase 0: Infrastructure (Today)
- [ ] Verify tempo data fields in AudioDataSnapshot
- [ ] Decide: Sync tempo data or use confidence-only fallback
- [ ] Create helper macros for lookups
- [ ] Create hsv() function or import from FastLED
- [ ] Create mirror_mode implementation

### Phase 1: Pulse + Tempiscope (Easiest)
- [ ] Port Pulse pattern (2-3 hrs)
- [ ] Port Tempiscope pattern (1-2 hrs)
- [ ] Test both compile + visual output
- [ ] Commit: "feat: Add Pulse and Tempiscope beat patterns"

### Phase 2: Beat Tunnel + Perlin (Medium)
- [ ] Port Beat Tunnel pattern (3-4 hrs)
- [ ] Port Perlin pattern (2-3 hrs)
- [ ] Test compilation
- [ ] Benchmark FPS impact
- [ ] Commit: "feat: Add Beat Tunnel and Perlin light shows"

### Phase 3: Bonus Sensory Mode (Nice-to-Have)
- [ ] Port one sensory mode (2 hrs)
- [ ] Polish and optimize

### Phase 4: Validation & Documentation
- [ ] Test all patterns on hardware
- [ ] Verify audio reactivity
- [ ] Measure FPS performance
- [ ] Document architectural mappings
- [ ] Create user guide for palette switching

---

## Part 7: Detailed Translation Template

### Pattern Template for K1.reinvented

```cpp
/**
 * Pattern: [NAME]
 * Description: [What it does]
 * Source: Emotiscope [source_file].h
 *
 * Audio Inputs: [list of audio macros used]
 * Parameters: [list of PatternParameters used]
 * External State: [static buffers, persistent data]
 */

// ============================================================================
// EXTERNAL STATE (persistence between frames)
// ============================================================================
static float [buffer_name][NUM_LEDS] = {0};  // Persistence buffer

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// [Any pattern-specific helpers, inlined]

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
void draw_[pattern_name](float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Get thread-safe audio snapshot

    // Fallback to non-audio mode if no data
    if (!AUDIO_IS_AVAILABLE()) {
        // [Graceful degradation: show ambient or time-based animation]
        return;
    }

    // [Pattern implementation using AUDIO_* macros and params]

    // Example:
    // float energy = AUDIO_VU;
    // float progress = (float)i / NUM_LEDS;
    // CRGBF color = color_from_palette(params.palette_id, progress, energy);
    // leds[i] = color;
}
```

---

## Part 8: Required Infrastructure Additions

### New Helper Functions Needed

```cpp
// color/hsv.h or in generated_patterns.h

// Convert HSV to RGB (returns CRGBF)
CRGBF hsv(float h, float s, float v) {
    // FastLED hsv2rgb implementation adapted for CRGBF
    // Input: h,s,v all 0.0-1.0
    // Output: CRGBF with r,g,b 0.0-1.0
}

// Inline lookup helper
#define LED_PROGRESS(i) ((float)(i) / NUM_LEDS)
#define TEMPO_PROGRESS(i) ((float)(i) / NUM_TEMPI)

// Apply mirror/split mode to LED array
void apply_mirror_mode(CRGBF* leds, bool mirror_enabled) {
    if (!mirror_enabled) return;

    int half = NUM_LEDS / 2;
    for (int i = 0; i < half; i++) {
        leds[NUM_LEDS - 1 - i] = leds[i];
    }
}

// Sprite blending for tunnel effect
void blend_sprite(CRGBF* dest, const CRGBF* sprite, uint32_t length, float alpha) {
    for (uint32_t i = 0; i < length; i++) {
        dest[i].r = dest[i].r * (1.0f - alpha) + sprite[i].r * alpha;
        dest[i].g = dest[i].g * (1.0f - alpha) + sprite[i].g * alpha;
        dest[i].b = dest[i].b * (1.0f - alpha) + sprite[i].b * alpha;
    }
}
```

### Modifications to Existing Files

**goertzel.h** (Audio synchronization):
- [ ] Sync tempo_magnitude[] and tempo_phase[] to audio_back
- [ ] Estimate: 10-15 lines

**generated_patterns.h** (New patterns):
- [ ] Add Pulse pattern function (80-100 lines)
- [ ] Add Tempiscope pattern function (30-40 lines)
- [ ] Add Beat Tunnel pattern function (60-80 lines)
- [ ] Add Perlin pattern function (70-100 lines)
- [ ] Add helper functions (40-60 lines)
- [ ] Update pattern registry to include new patterns (4 entries)
- [ ] Total: ~400-500 new lines

**parameters.h** (Optional):
- [ ] Add bool mirror_mode field (optional, can use custom_param)
- [ ] Or leverage existing custom_param_1/2/3 (no change needed!)

---

## Part 9: Testing Strategy

### Compilation Testing
```bash
cd K1.reinvented/firmware
pio run  # Should compile without errors
```

### Visual Testing (On Device)
1. Flash firmware to ESP32-S3
2. Connect to http://k1-reinvented.local
3. For each pattern:
   - [ ] Pattern renders without artifacts
   - [ ] Responds to audio input
   - [ ] All 5 palettes selectable and work
   - [ ] Parameters (speed, saturation, etc.) affect output
   - [ ] Mirror mode toggles correctly

### Performance Testing
```
Target: 200+ FPS
Measure: Monitor serial output for FPS counter
If <200 FPS: Log pattern name for optimization phase
```

### Audio Reactivity Verification
- [ ] Play music or speak near microphone
- [ ] Pulse: Waves spawn on beat
- [ ] Tempiscope: Tempo bins light up with beat phase
- [ ] Beat Tunnel: Tunnel animates with tempo
- [ ] Perlin: Noise moves with audio energy

---

## Part 10: Known Limitations & Fallbacks

### Limitation 1: Tempo Phase Data
- **Emotiscope uses**: `tempi[i].phase` for beat phase per tempo bin
- **K1 has**: `AUDIO_TEMPO_CONFIDENCE` (global confidence only)
- **Fallback**: Use time-based phase calculation: `sin(time * 2π * frequency)`
- **Impact**: Tempiscope and Beat Tunnel may not sync perfectly to tempo beats
- **Mitigation**: Can populate tempo phase if tempo.h gets synced to K1

### Limitation 2: Advanced SIMD
- **Emotiscope uses**: `dsps_mulc_f32_ae32()` (ESP-DSP SIMD multiply-accumulate)
- **K1 Fallback**: Standard C++ loop
- **Impact**: Minimal (SIMD doesn't dominate Perlin processing time)

### Limitation 3: Sprite Rendering
- **Emotiscope uses**: Custom `draw_sprite()` with CRGBF arrays
- **K1 has**: No sprite system
- **Solution**: Implement custom `blend_sprite()` function
- **Impact**: Beat Tunnel will work but with custom implementation

---

## Part 11: Success Criteria

### MVP Success (Minimum Viable Product)

- [x] Plan complete and reviewed
- [ ] Infrastructure helpers created (hsv, mirror_mode, etc.)
- [ ] Pulse pattern compiles and renders
- [ ] Tempiscope pattern compiles and renders
- [ ] Both patterns respond to audio
- [ ] All 5 palettes work with both patterns
- [ ] FPS >= 200
- [ ] No visual artifacts

### Full Success (All 5 Patterns)

- [ ] All Tier 1 + Tier 2 patterns compiled
- [ ] All patterns render correctly
- [ ] All patterns respond to audio
- [ ] All patterns use all 5 palettes
- [ ] FPS >= 150 (acceptable for complex patterns)
- [ ] Parameters control patterns as expected
- [ ] Mirror/split modes work
- [ ] Comprehensive testing on hardware complete

---

## Appendix A: References

**Emotiscope Source Files**:
- `/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/pulse.h` (120 lines)
- `/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/beat_tunnel.h` (50 lines)
- `/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/tempiscope.h` (20 lines)
- `/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes/active/perlin.h` (56 lines)

**K1.reinvented Files**:
- `/Workspace_Management/Software/K1.reinvented/firmware/src/generated_patterns.h` (Main pattern file)
- `/Workspace_Management/Software/K1.reinvented/firmware/src/parameters.h` (Parameter system)
- `/Workspace_Management/Software/K1.reinvented/firmware/src/audio/goertzel.h` (Audio sync)
- `/Workspace_Management/Software/K1.reinvented/firmware/src/pattern_audio_interface.h` (Audio macros)

---

**Plan Status**: ✅ COMPLETE - Ready for implementation
**Next Step**: Proceed to Phase 0 infrastructure setup

