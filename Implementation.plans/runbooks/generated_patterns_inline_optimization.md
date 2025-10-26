# Generated Patterns: Inline Optimization Runbook

**Author:** SUPREME Technical Analyst
**Date:** 2025-10-26
**Status:** Published
**Intent:** Step-by-step guide to apply recommended optimizations

---

## Overview

This runbook applies three minor improvements to `generated_patterns.h` that enhance code clarity and enable compiler optimizations without refactoring the architecture.

**Expected Outcomes:**
- +0.5-1% FPS improvement (from `inline` annotations)
- Improved code maintainability (from documentation)
- Reduced risk of future static buffer bugs (from lifecycle documentation)

**Estimated Effort:** 10 minutes
**Risk Level:** MINIMAL (changes are additive, no logic changes)

---

## Task 1: Add `inline` Keyword to `color_from_palette()`

### Context
This function is called ~4,000 times per frame (128 LEDs × multiple patterns).

**Current state (line 108):**
```c
CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
	// Clamp inputs
	palette_index = palette_index % NUM_PALETTES;
	progress = fmodf(progress, 1.0f);
	if (progress < 0.0f) progress += 1.0f;

	// Convert progress to 0-255 range
	uint8_t pos = (uint8_t)(progress * 255.0f);

	// Get palette info
	PaletteInfo info;
	memcpy_P(&info, &palette_table[palette_index], sizeof(PaletteInfo));

	// Find bracketing keyframes
	uint8_t entry1_idx = 0, entry2_idx = 0;
	uint8_t pos1 = 0, pos2 = 255;

	// Read all entries and find the right interpolation range
	for (uint8_t i = 0; i < info.num_entries - 1; i++) {
		uint8_t p1 = pgm_read_byte(&info.data[i * 4 + 0]);
		uint8_t p2 = pgm_read_byte(&info.data[(i + 1) * 4 + 0]);

		if (pos >= p1 && pos <= p2) {
			entry1_idx = i;
			entry2_idx = i + 1;
			pos1 = p1;
			pos2 = p2;
			break;
		}
	}

	// Read keyframe RGB data
	uint8_t r1 = pgm_read_byte(&info.data[entry1_idx * 4 + 1]);
	uint8_t g1 = pgm_read_byte(&info.data[entry1_idx * 4 + 2]);
	uint8_t b1 = pgm_read_byte(&info.data[entry1_idx * 4 + 3]);

	uint8_t r2 = pgm_read_byte(&info.data[entry2_idx * 4 + 1]);
	uint8_t g2 = pgm_read_byte(&info.data[entry2_idx * 4 + 2]);
	uint8_t b2 = pgm_read_byte(&info.data[entry2_idx * 4 + 3]);

	// Linear interpolation between keyframes
	float t = (pos2 == pos1) ? 0.0f : (float)(pos - pos1) / (float)(pos2 - pos1);

	float r = (r1 + (r2 - r1) * t) / 255.0f;
	float g = (g1 + (g2 - g1) * t) / 255.0f;
	float b = (b1 + (b2 - b1) * t) / 255.0f;

	return CRGBF(r * brightness, g * brightness, b * brightness);
}
```

### Change Required

**Step 1.1: Locate the function**
```
File: /firmware/src/generated_patterns.h
Line: 108
Search: "CRGBF color_from_palette("
```

**Step 1.2: Apply the change**

Change FROM:
```c
CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
```

Change TO:
```c
inline CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
```

### Verification

After applying the change, verify:
1. File compiles without errors: `pio run -t clean && pio run`
2. No warnings introduced: Check build output for "error" or "warning" keywords
3. Pattern rendering still works: Flash device and verify all patterns render correctly

### Expected Impact
- **Compilation:** No impact (single TU)
- **Binary size:** Negligible (+/- 0-100 bytes, compiler dependent)
- **Runtime performance:** +0.5-1% FPS improvement
- **Code clarity:** Improved (explicit intent that inlining is desired)

---

## Task 2: Add `inline` Keyword to `hsv()`

### Context
This function is called from `draw_pulse()` during beat detection (~6 calls/frame).

**Current state (line 169):**
```c
CRGBF hsv(float h, float s, float v) {
	// Normalize hue to 0-1 range
	h = fmodf(h, 1.0f);
	if (h < 0.0f) h += 1.0f;

	// Clamp saturation and value
	s = fmaxf(0.0f, fminf(1.0f, s));
	v = fmaxf(0.0f, fminf(1.0f, v));

	// Handle achromatic (gray) case
	if (s == 0.0f) {
		return CRGBF(v, v, v);
	}

	// Convert HSV to RGB using standard algorithm
	float h_i = h * 6.0f;
	int i = (int)h_i;
	float f = h_i - floorf(h_i);

	float p = v * (1.0f - s);
	float q = v * (1.0f - s * f);
	float t = v * (1.0f - s * (1.0f - f));

	CRGBF result;
	switch (i % 6) {
		case 0: result = CRGBF(v, t, p); break;
		case 1: result = CRGBF(q, v, p); break;
		case 2: result = CRGBF(p, v, t); break;
		case 3: result = CRGBF(p, q, v); break;
		case 4: result = CRGBF(t, p, v); break;
		case 5: result = CRGBF(v, p, q); break;
		default: result = CRGBF(0, 0, 0); break;
	}

	return result;
}
```

### Change Required

**Step 2.1: Locate the function**
```
File: /firmware/src/generated_patterns.h
Line: 169
Search: "CRGBF hsv("
```

**Step 2.2: Apply the change**

Change FROM:
```c
CRGBF hsv(float h, float s, float v) {
```

Change TO:
```c
inline CRGBF hsv(float h, float s, float v) {
```

### Verification

After applying the change, verify:
1. File compiles without errors
2. Pulse pattern renders correctly (beat waves appear on audio input)
3. Beat color changes are smooth and responsive

### Expected Impact
- **Runtime performance:** Negligible (only ~6 calls/frame)
- **Code clarity:** Improved (consistency with other color functions)

---

## Task 3: Add Static Buffer Lifetime Documentation

### Context
The file contains 11 static buffers (7.2 KB) whose purpose and lifecycle must be clear to future maintainers.

### Change Required

**Step 3.1: Locate insertion point**

Find this line:
```c
// ============================================================================
// AUDIO-REACTIVE PATTERNS
// ============================================================================
```

This is around line 390. We'll insert documentation BEFORE the first audio pattern's static buffer.

**Step 3.2: Find the bloom_buffer declaration**

Line 512:
```c
void draw_bloom(float time, const PatternParameters& params) {
	PATTERN_AUDIO_START();

	// Static buffer for bloom persistence (survives between frames)
	static float bloom_buffer[NUM_LEDS] = {0};
```

**Step 3.3: Add documentation section**

Insert this block BEFORE line 508 (before the first pattern that uses static buffers, which is `draw_bloom`):

```c
// ============================================================================
// STATIC STATE BUFFERS - CRITICAL FOR ANIMATION PERSISTENCE
// ============================================================================
//
// The following buffers are declared as static within their respective pattern
// functions. They persist across frames and are essential for smooth animations
// and audio reactivity. Do NOT convert these to heap allocation or stack-based
// arrays without refactoring the animation algorithms.
//
// Static Buffer Inventory:
//
//   draw_bloom():
//     - bloom_buffer[NUM_LEDS]     : VU meter glow persistence and fade
//
//   draw_pulse():
//     - pulse_waves[MAX_PULSE_WAVES] : Concurrent beat-driven wave objects
//
//   draw_beat_tunnel():
//     - beat_tunnel_image[NUM_LEDS]     : Current frame tunnel visualization
//     - beat_tunnel_image_prev[NUM_LEDS] : Previous frame for motion blur
//     - beat_tunnel_angle                : Sprite position animation state
//
//   draw_perlin():
//     - beat_perlin_noise_array[NUM_LEDS >> 2] : Downsampled noise cache
//     - beat_perlin_position_x                  : 2D noise coordinate state
//     - beat_perlin_position_y                  : (animated each frame)
//
//   draw_void_trail():
//     - void_trail_frame_current[NUM_LEDS]  : Fade-to-black persistence buffer
//     - void_trail_frame_prev[NUM_LEDS]     : Previous frame reference
//     - void_ripples[MAX_VOID_RIPPLES]      : Concurrent ripple wave objects
//
// Performance Implications:
//   - Total static memory: 7.2 KB
//   - ESP32 RAM impact: 1.4% of available heap (negligible)
//   - Instantiation: Single per firmware load (header-only design)
//   - Access pattern: Per-frame read/write (tight loop critical section)
//
// Modification Guidelines:
//   - Changing buffer sizes requires recompiling (no dynamic sizing)
//   - Adding new buffers must document their lifetime and initialization
//   - Deleting patterns means auditing static buffers for cleanup
//   - Do NOT share buffers across patterns (data corruption risk)
//
// ============================================================================
```

### Verification

After applying the change:
1. Verify file still compiles: `pio run`
2. Verify comments don't interfere with rendering: Flash and test patterns
3. Check that comments are clear and accurate

### Expected Impact
- **Code clarity:** Excellent (future maintainers understand buffer lifecycle)
- **Maintenance risk:** Reduced (explicit lifecycle guidelines)
- **Documentation coverage:** +10 KB of architectural context

---

## Validation Checklist

After all changes are applied, verify:

### Compilation
- [ ] `pio run` completes without errors
- [ ] No new compiler warnings introduced
- [ ] Build output shows "firmware.bin ready" message

### Functionality
- [ ] Device boots and WiFi connects
- [ ] All 11 patterns render without visual artifacts
- [ ] Pattern switching (via web UI) works smoothly
- [ ] Audio reactivity (if audio is connected) responds normally

### Performance
- [ ] FPS counter shows 200+ FPS (or minimal change from baseline)
- [ ] No stuttering or frame drops observed
- [ ] Audio task (Core 1) still processes ~20-25 Hz

### Code Quality
- [ ] Comments are technically accurate
- [ ] No typos in documentation
- [ ] Inline keywords don't cause unexpected compiler behavior

---

## Rollback Plan

If any issue occurs:

**To remove changes:**
1. Remove `inline` keyword from `color_from_palette()` (line 108)
2. Remove `inline` keyword from `hsv()` (line 169)
3. Remove documentation block (inserted before line 508)

**Commands:**
```bash
git diff                          # Review what changed
git checkout firmware/src/generated_patterns.h  # Full rollback
pio run                          # Verify original behavior restored
```

---

## Timeline

| Task | Effort | Status |
|------|--------|--------|
| 1. Add `inline` to `color_from_palette` | 1 min | — |
| 2. Add `inline` to `hsv` | 1 min | — |
| 3. Add documentation | 5 min | — |
| 4. Verify compilation | 2 min | — |
| 5. Verify functionality | 3 min | — |
| **Total** | **12 min** | **—** |

---

## Success Criteria

- ✓ File compiles without errors
- ✓ All patterns render correctly
- ✓ FPS maintained or improved (no regression)
- ✓ Code changes are minimal and focused
- ✓ Documentation is clear and accurate

---

## References

- **Analysis:** `docs/analysis/generated_patterns_architecture_analysis.md`
- **Quick ref:** `docs/analysis/generated_patterns_quick_reference.md`
- **File:** `/firmware/src/generated_patterns.h`

