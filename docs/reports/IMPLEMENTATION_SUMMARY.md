---
title: K1.reinvented Light Show Port - Implementation Summary
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented Light Show Port - Implementation Summary

**Status**: Ready to Implement
**Scope**: Port 5 beat/tempo light shows from Emotiscope
**Timeline**: Phased implementation over 3-4 work sessions
**Performance**: Build for correctness, optimize later

---

## What We're Building

### Target Patterns (Tier Priority)

**Tier 1 - Beat Reactive Core** (Sessions 1-2)
1. **Pulse** ⭐ Beat-synchronized radial waves with Gaussian decay
2. **Tempiscope** ⭐ Tempo visualization showing beat phase per frequency bin
3. **Beat Tunnel** ⭐⭐ Tempo-driven tunnel effect with sprite persistence

**Tier 2 - Procedural/Sensory** (Sessions 2-3)
4. **Perlin** VU-energy driven procedural noise patterns
5. **Kaleidoscope** (bonus) Symmetric frequency visualization

### Key Features

✅ **Switchable Palettes**
- All 5 patterns can use any of the 5 available palettes
- Controlled via `params.palette_id` (0-4)
- Runtime switching without code recompilation

✅ **Full Parameter Support**
- speed, brightness, saturation, softness → existing params
- mirror_mode (split/mirror LED strip) → new boolean
- beat_sensitivity, wave_persistence → via custom_param_1/2/3
- Each pattern responds to parameter changes in real-time

✅ **Audio Reactivity**
- Pulse: Spawns waves on beat (tempo_confidence > threshold)
- Tempiscope: Shows tempo bins with beat phase modulation
- Beat Tunnel: Tunnel speed and coloring follow beat
- Perlin: Noise movement driven by VU energy

✅ **Thread Safe**
- Uses K1's superior snapshot architecture
- Zero race conditions (audio sync via mutex)
- Better than Emotiscope's global access

---

## Architecture Comparison

### Emotiscope Approach ❌
```cpp
// Direct global access (race condition risk)
void draw_pulse() {
    float beat = tempo_confidence;  // ← Global, can be mid-update
    float hue = chromagram[0];       // ← Global, can be mid-update
    // ...
}
```

### K1.reinvented Approach ✅
```cpp
// Thread-safe snapshot with mutex protection
void draw_pulse(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();  // Get immutable snapshot

    float beat = AUDIO_TEMPO_CONFIDENCE;  // ← From snapshot
    float hue = AUDIO_CHROMAGRAM[0];      // ← From snapshot
    // ... guaranteed consistent!
}
```

---

## Implementation Strategy

### Phase 0: Infrastructure (Today) - 1-2 hours

**Create helper functions in generated_patterns.h:**

```cpp
// 1. HSV to RGB color conversion
CRGBF hsv(float h, float s, float v) {
    // Input: h,s,v all 0.0-1.0
    // Output: CRGBF with r,g,b 0.0-1.0
    // Algorithm: Standard HSV→RGB conversion
}

// 2. Inline LED position lookup
#define LED_PROGRESS(i) ((float)(i) / NUM_LEDS)
#define TEMPO_PROGRESS(i) ((float)(i) / NUM_TEMPI)

// 3. Mirror/split mode for LED strip
void apply_mirror_mode(CRGBF* leds, bool enabled) {
    // Mirror first half to second half
}

// 4. Sprite blending for tunnel effects
void blend_sprite(CRGBF* dest, const CRGBF* sprite, uint32_t length, float alpha) {
    // Alpha blend two color arrays
}
```

**Modify goertzel.h audio sync:**
- Add tempo_magnitude[] and tempo_phase[] synchronization
- Similar to VU level sync we just did
- ~15 lines of code

### Phase 1: Pulse + Tempiscope (Session 1) - 3-4 hours

**Pulse Pattern:**
- Spawn concentric waves on beat detection
- Each wave: Gaussian falloff + exponential decay
- Color from dominant chromatic note
- Wave pool of 6 concurrent waves
- Additive blending for overlapping waves
- Implementation: ~100 lines

**Tempiscope Pattern:**
- Display tempo bin magnitudes
- Phase modulate with sine for beat emphasis
- Color gradient across tempo bins
- Implementation: ~40 lines

**Testing:**
- Compile check
- Visual render check
- Parameter control check
- Palette switching check

### Phase 2: Beat Tunnel + Perlin (Session 2) - 4-5 hours

**Beat Tunnel:**
- Tunnel effect with sprite persistence
- Tunnel image updated with beat data
- Sprite blending for motion blur
- Tempo-colored pixels placed in tunnel
- Mirror mode support
- Implementation: ~80 lines

**Perlin:**
- Perlin noise driving hue and luminance
- VU energy pushes noise momentum
- Animated with sine wave oscillation
- Color range across spectrum
- Implementation: ~100 lines

**Testing:**
- Compile all 4 patterns together
- Visual quality check
- FPS measurement (target: >150)

### Phase 3: Polish & Bonus (Session 3) - 2-3 hours

**Port Optional 5th Pattern:**
- Sensory Kaleidoscope or similar
- Tests palette system thoroughly
- Good showcase pattern

**Final Validation:**
- All 5 patterns compile
- All respond to audio correctly
- All work with all 5 palettes
- Parameter changes work
- Mirror modes work
- FPS target met (>150 for complex)

---

## What We DON'T Need to Change

✅ **Parameter System**
- `params.palette_id` already supports palette switching
- `custom_param_1/2/3` available for pattern-specific controls
- No changes needed!

✅ **Audio Macro Interface**
- `AUDIO_TEMPO_CONFIDENCE` available (global beat confidence)
- `AUDIO_CHROMAGRAM` available (12-note pitch data)
- `AUDIO_VU` available (overall energy level)
- `AUDIO_SPECTRUM_SMOOTH` available (64-frequency bins)
- Fallbacks handled in pattern_audio_interface.h

✅ **Color System**
- `color_from_palette()` already works perfectly
- We'll add `hsv()` for patterns that need it
- Both approaches coexist fine

✅ **Thread Safety**
- PATTERN_AUDIO_START() macro handles mutex protection
- Double-buffering already implemented
- No race conditions possible

---

## What We DO Need to Add

1. **Helper Functions** (60 lines in generated_patterns.h)
   - hsv() - HSV to RGB conversion
   - apply_mirror_mode() - LED array mirroring
   - blend_sprite() - Alpha blending

2. **Tempo Data Sync** (15 lines in goertzel.h)
   - Copy tempo_magnitude[] to audio_back
   - Copy tempo_phase[] to audio_back
   - Fallback: Use tempo_confidence only

3. **5 Pattern Functions** (~400 lines total in generated_patterns.h)
   - draw_pulse() - ~100 lines
   - draw_tempiscope() - ~40 lines
   - draw_beat_tunnel() - ~80 lines
   - draw_perlin() - ~100 lines
   - draw_kaleidoscope() - ~80 lines (bonus)

4. **Pattern Registry Entries** (5 new entries in pattern_registry[])
   - One entry per new pattern
   - Metadata (name, description, requires_audio=true)

---

## File Changes Summary

| File | Changes | Lines | Effort |
|------|---------|-------|--------|
| `src/audio/goertzel.h` | Add tempo sync | +15 | 30 min |
| `src/generated_patterns.h` | Add 5 patterns + helpers | +500 | 8 hours |
| `src/pattern_registry.h` | Add 5 entries | +15 | 15 min |
| **Total** | **New light shows** | **~530** | **~9 hours** |

---

## Risk Assessment

### Low Risk ✅
- All patterns compile independently
- K1's snapshot architecture handles synchronization
- Emotiscope algorithms are proven
- Helper functions are straightforward

### Medium Risk ⚠️
- FPS impact unknown (will measure)
- Tempo phase data may not sync (fallback exists)
- Mirror mode not tested in K1 (easy to add)

### Mitigation
- Build incrementally, test after each pattern
- Fallback behaviors defined upfront
- Performance optimization planned for Phase 4
- Comprehensive testing on hardware

---

## Success Criteria

### Phase 0 (Infrastructure)
- [ ] hsv(), apply_mirror_mode(), blend_sprite() compiled
- [ ] Tempo data syncing to audio_back
- [ ] All helpers verified working

### Phase 1 (Pulse + Tempiscope)
- [ ] Both patterns compile
- [ ] Both render visually
- [ ] Both respond to audio
- [ ] All 5 palettes work
- [ ] FPS >= 200

### Phase 2 (Beat Tunnel + Perlin)
- [ ] Both patterns compile
- [ ] Both render correctly
- [ ] Both respond to audio
- [ ] All 5 palettes work
- [ ] FPS >= 150

### Phase 3 (Bonus + Validation)
- [ ] All 5 patterns available
- [ ] Comprehensive testing complete
- [ ] Documentation written
- [ ] Ready for production

---

## Expected Outcomes

### User-Facing
- 5 new professional light shows available
- Each works with all 5 palettes (switchable)
- Real-time parameter control
- Impressive visual feedback to music/speech
- Beat/tempo synchronized effects

### Technical
- Cleaner code than Emotiscope (K1 architecture)
- Thread-safe audio access
- Modular pattern system
- Easy to add more patterns later
- Foundation for 5+ additional patterns

### Performance
- Target: >150 FPS for complex patterns
- Simple patterns: >200 FPS
- No audio latency
- Responsive parameter updates

---

## Next Steps

Ready to proceed with **Phase 0 Infrastructure Setup**?

1. Create helper functions (hsv, mirror_mode, blend_sprite)
2. Add tempo data synchronization to goertzel.h
3. Verify compilation
4. Then: Implement Pulse + Tempiscope (Phase 1)

**Estimated time for Phase 0**: 1-2 hours
**Ready to start**: YES ✅

Let me know when you want to begin Phase 0!

