# Pattern Design Philosophy - K1.reinvented

**Reference:** Emotiscope 2.0 proven architecture
**Date:** 2025-10-26

---

## Core Principles

### 1. Emotional Intent First

Every pattern tells a story or evokes a specific feeling. Design decisions flow from emotional intent, not technical convenience.

**Examples:**

- **Departure:** Transformation, hope, awakening
  - *Why 3 phases?* Mirrors natural transformation (struggle → breakthrough → settling)
  - *Why slow start?* Awakening is gradual, not instantaneous
  - *Why rapid middle?* Breakthrough is intense and fast
  - *Why slow end?* Growth settles into stability

- **Lava:** Intensity, power, primal energy
  - *Why pure colors?* Fire is elemental, not mixed
  - *Why exponential buildup?* Heat accumulates non-linearly
  - *Why warmth boost?* Incandescence is red-dominant

- **Twilight:** Peace, contemplation, transition
  - *Why wave motion?* Natural world flows, doesn't jump
  - *Why amber → violet?* Sunset color progression
  - *Why slow speed?* Contemplation takes time

---

### 2. Sophisticated Rendering

**Placeholder vs. Intentional:**

| Aspect | Placeholder | Intentional |
|--------|-------------|-------------|
| Keyframes | 3-4 colors | 8-12 colors |
| Pacing | Linear blend | Non-linear easing |
| Transitions | Abrupt | Smooth, blended |
| Parameters | Ignored | Fully integrated |
| Motion | Static | Spatial variation |

**Why more keyframes?**
- 3-4 keyframes: Mechanical, obvious transitions
- 8-12 keyframes: Natural, organic progressions
- Human eye detects abrupt changes; smooth progressions feel intentional

**Why non-linear pacing?**
- Linear: Constant speed (boring, predictable)
- Quadratic: Slow start or end (awakening, settling)
- Cubic: Explosive buildup (intensity, drama)
- Sinusoidal: Wave-like motion (natural, organic)

---

### 3. Parameter Integration

**Every parameter should meaningfully affect output.**

**Global Parameters:**
- **brightness:** Intensity (0.0 = off, 1.0 = full)
- **softness:** Frame blending strength (creates phosphor decay feel)
- **color:** Hue selection for palettes
- **color_range:** Palette spread/variation
- **saturation:** Color intensity (0.0 = grayscale, 1.0 = pure)
- **warmth:** Incandescent filter (boosts red, reduces blue)
- **background:** Ambient light level
- **speed:** Animation rate multiplier

**How to use:**

```cpp
// Brightness: scale final output
leds[i].r *= params.brightness;

// Softness: blend between frames (not shown, happens in main loop)
// Uses apply_frame_blending() in led_driver.h

// Warmth: incandescent filter
float warmth_boost = 1.0f + (params.warmth * 0.5f);
leds[i].r *= warmth_boost;
leds[i].b *= (1.0f - params.warmth * 0.3f);

// Speed: time multiplier
float phase = fmodf(time * params.speed * 0.3f, 1.0f);

// Color: hue selection
float hue = params.color + offset;
CRGBF color = hsv(hue, params.saturation, magnitude);
```

---

### 4. Audio Reactivity

**Thread-Safe Access:**

```cpp
PATTERN_AUDIO_START();  // Get snapshot

if (!AUDIO_IS_FRESH()) return;  // Skip if no new data

float bass = AUDIO_BASS();
float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];

if (AUDIO_IS_STALE()) {
    brightness *= 0.9f;  // Fade on silence
}
```

**Smoothed vs. Raw Data:**
- Use `AUDIO_SPECTRUM_SMOOTH` (not raw) for stable visualization
- Smoothing prevents flickering on noise
- Raw data for transient detection (if needed)

**Silence Handling:**
- Detect: `AUDIO_IS_STALE()` (>50ms old)
- Respond: Fade brightness, fall back to ambient
- Never freeze: Always render something

---

### 5. Centre-Origin Architecture

**Mandatory for all K1 patterns.**

**Why?**
- K1 is a center-radiating device (not edge-to-edge)
- All effects must respect this physical design
- Symmetric rendering looks intentional, not accidental

**How:**

```cpp
int half_leds = NUM_LEDS / 2;

for (int i = 0; i < half_leds; i++) {
    // Calculate effect for this position
    CRGBF color = calculate_color(i);

    // Mirror to both sides
    int left_index = (NUM_LEDS / 2) - 1 - i;
    int right_index = (NUM_LEDS / 2) + i;

    leds[left_index] = color;
    leds[right_index] = color;
}
```

**Never do:**
- Edge-to-edge rainbows (violates center-origin)
- Asymmetric effects (breaks visual balance)
- Linear gradients (looks lazy)

---

### 6. Performance Targets

**Goals:**
- **Target:** 120 FPS
- **Minimum:** 100 FPS
- **Typical:** 110-130 FPS

**Optimization:**

```cpp
// GOOD: Simple math, loop-friendly
for (int i = 0; i < NUM_LEDS; i++) {
    float t = (float)i / NUM_LEDS;
    leds[i] = hsv(t, 1.0f, 1.0f);
}

// BAD: Heavy math, slow
for (int i = 0; i < NUM_LEDS; i++) {
    float t = pow(sin(i * 0.1), 3.0);  // Expensive!
    leds[i] = hsv(t, 1.0f, 1.0f);
}

// BETTER: Pre-calculate expensive ops
static float lut[NUM_LEDS];
static bool first_run = true;
if (first_run) {
    for (int i = 0; i < NUM_LEDS; i++) {
        lut[i] = pow(sin(i * 0.1), 3.0);
    }
    first_run = false;
}

for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = hsv(lut[i], 1.0f, 1.0f);
}
```

**Profile hot paths:**
- Measure: Use profiler.h macros
- Optimize: Focus on inner loops
- Validate: Check FPS counter

---

## Palette Design

### Color Theory

**Emotionally-driven palettes:**

1. **Transformation (Departure):**
   - Dark earth → warm clay → golden dawn → brilliant white → light green → emerald
   - Journey from darkness to growth
   - Non-linear spacing (rapid middle, slow ends)

2. **Intensity (Lava):**
   - Black → ember → crimson → red → orange → yellow → white
   - Pure elemental colors (no mixing)
   - Exponential spacing (explosive buildup)

3. **Contemplation (Twilight):**
   - Warm amber → sunset rose → soft violet → deep purple → twilight blue → midnight
   - Gentle, flowing progression
   - Even spacing (peaceful, steady)

**Keyframe Spacing:**

```cpp
// Linear (boring)
{0.00, 0.25, 0.50, 0.75, 1.00}

// Bunched at start (slow awakening)
{0.00, 0.05, 0.15, 0.50, 1.00}

// Bunched at end (explosive climax)
{0.00, 0.50, 0.85, 0.95, 1.00}

// Custom (non-linear mapping via easing function)
float eased = phase * phase * phase;  // Cubic
```

---

## Easing Functions

### Why Easing Matters

Linear motion feels mechanical. Easing creates natural, organic feel.

**Types:**

```cpp
// Linear (boring)
float t = phase;

// Quadratic ease-in (slow start)
float t = phase * phase;

// Quadratic ease-out (slow end)
float t = 1.0f - (1.0f - phase) * (1.0f - phase);

// Cubic ease-in (very slow start)
float t = phase * phase * phase;

// Cubic ease-out (very slow end)
float t = 1.0f - (1.0f - phase) * (1.0f - phase) * (1.0f - phase);

// Sinusoidal (smooth, wave-like)
float t = (sinf(phase * 6.28318f) + 1.0f) * 0.5f;
```

**When to use:**

- **Quadratic:** Gentle acceleration/deceleration (awakening, settling)
- **Cubic:** Dramatic acceleration/deceleration (buildup, climax)
- **Sinusoidal:** Wave-like motion (organic, natural)
- **Linear:** Never (unless intentionally mechanical)

---

## Emotiscope Reference Patterns

### What We Learned

**spectrum.h:**
- Simple, effective frequency mapping
- Color-coded by band (intuitive)
- Interpolated for smooth display

**bloom.h:**
- VU-driven energy response
- Spreading/blur effect
- Persistence via static buffer
- Speed parameter controls spread

**octave.h:**
- Musical chromagram (12 notes)
- Beat emphasis for dynamics
- Per-note color coding

**perlin.h:**
- Dual-layer noise (hue + luminance)
- Momentum-based animation
- Smooth, organic motion

**beat_tunnel.h:**
- Phase-synchronized effects
- Tempo-driven animation
- Sprite-based rendering

### What We Applied to K1

1. **Palette-driven design** (not hard-coded colors)
2. **Non-linear easing** (not linear blends)
3. **Parameter integration** (all controls affect output)
4. **Audio smoothing** (stable, not jittery)
5. **Persistence buffers** (temporal effects)
6. **Silence handling** (graceful degradation)

---

## Anti-Patterns (What NOT to Do)

### 1. Placeholder Patterns

```cpp
// BAD: Placeholder (solid color)
void draw_spectrum(...) {
    CRGBF color = {0.5, 0.5, 0.5};
    for (int i = 0; i < NUM_LEDS; i++) {
        leds[i] = color;
    }
}

// GOOD: Real implementation
void draw_spectrum(...) {
    PATTERN_AUDIO_START();
    for (int i = 0; i < NUM_LEDS; i++) {
        float magnitude = AUDIO_SPECTRUM_SMOOTH[i];
        leds[i] = hsv(i * 0.01, 1.0, magnitude);
    }
}
```

### 2. Linear Blending

```cpp
// BAD: Linear (boring)
float t = phase;
CRGBF color = mix_color(palette[0], palette[1], t);

// GOOD: Eased (natural)
float t = phase * phase;  // Quadratic ease-in
CRGBF color = mix_color(palette[0], palette[1], t);
```

### 3. Ignoring Parameters

```cpp
// BAD: Ignores params
void draw_pattern(...) {
    leds[0] = {1.0, 0.0, 0.0};  // Always red
}

// GOOD: Uses params
void draw_pattern(...) {
    float hue = params.color;
    leds[0] = hsv(hue, params.saturation, params.brightness);
}
```

### 4. Edge-to-Edge Effects

```cpp
// BAD: Violates centre-origin
for (int i = 0; i < NUM_LEDS; i++) {
    float hue = (float)i / NUM_LEDS;  // Rainbow
    leds[i] = hsv(hue, 1.0, 1.0);
}

// GOOD: Centre-origin
int half = NUM_LEDS / 2;
for (int i = 0; i < half; i++) {
    CRGBF color = calculate_color(i);
    leds[half - 1 - i] = color;  // Left
    leds[half + i] = color;      // Right
}
```

### 5. Unsafe Audio Access

```cpp
// BAD: Direct global access (race condition)
float magnitude = spectrogram[bin];  // UNSAFE!

// GOOD: Snapshot-based access
PATTERN_AUDIO_START();
float magnitude = AUDIO_SPECTRUM[bin];  // Safe
```

---

## Quality Checklist

Before committing a pattern:

- [ ] **Emotional intent documented** (WHY does this pattern exist?)
- [ ] **8-12 keyframes** (not 3-4)
- [ ] **Non-linear easing** (not linear blends)
- [ ] **All parameters integrated** (brightness, softness, speed, etc.)
- [ ] **Centre-origin rendering** (no edge-to-edge)
- [ ] **Audio safety** (PATTERN_AUDIO_START macro)
- [ ] **Silence handling** (AUDIO_IS_STALE check)
- [ ] **Performance** (120 FPS target, 100 FPS minimum)
- [ ] **Memory budget** (no heap allocation)
- [ ] **Compiles clean** (0 errors, 0 warnings)

---

## Future Evolution

**Next Patterns to Add:**

1. **Perlin Noise** (smooth organic motion)
2. **Pulse** (beat-synchronized flash)
3. **Kaleidoscope** (symmetric geometric patterns)
4. **Tempiscope** (tempo-driven effects)
5. **Sparkle** (random twinkling)

**Next Features:**

1. **Discrete palettes** (palette_id parameter)
2. **Transition engine** (cross-fade between patterns)
3. **Beat sync** (tempo detection integration)
4. **Full FFT** (128-bin visualization)
5. **Custom easing library** (reusable functions)

---

## Conclusion

**Pattern design is emotional storytelling through light.**

Every choice (keyframes, easing, colors, parameters) should serve the emotional intent. Technical excellence enables the story, but the story is what matters.

Emotiscope taught us: sophistication comes from intention, not complexity. 8-12 carefully chosen keyframes with proper easing beats 100 random colors any day.

K1's patterns now reflect this philosophy: intentional, sophisticated, emotionally resonant.

---

**Reference:** Emotiscope 2.0
**Date:** 2025-10-26
**Agent:** ULTRA Choreographer
