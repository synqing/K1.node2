---
title: Generated Patterns Reference
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Generated Patterns Reference

## Departure (Phase A)
- **Type:** Static gradient
- **Colors:** Dark earth → golden → white → emerald green
- **Nodes:** 3 (position, palette, output)
- **Generated Lines:** 34
- **Animation:** None
- **Description:** Journey of awakening and new beginnings

## Lava (Phase A)
- **Type:** Static gradient
- **Colors:** Black → deep red → bright orange → white
- **Nodes:** 3 (position, palette, output)
- **Generated Lines:** 34
- **Animation:** None
- **Description:** Heat and energy of molten flow

## Twilight (Phase A)
- **Type:** Static gradient
- **Colors:** Warm amber → deep purple → midnight blue
- **Nodes:** 3 (position, palette, output)
- **Generated Lines:** 34
- **Animation:** None
- **Description:** Transition from day to night

## Aurora (Phase B)
- **Type:** Animated gradient
- **Colors:** Dark earth → golden → white → emerald green (Departure palette)
- **Nodes:** 6 (position, time, sin, add, palette, output)
- **Generated Lines:** 34
- **Animation:** Smooth sinusoidal position oscillation (~6 second cycle)
- **Description:** Aurora - gradient scrolls with gentle wave motion
- **Generated Position Calculation:**
  ```cpp
  float position = fmod(fmin(1.0f, 
      (float(i) / float(NUM_LEDS - 1)) + 
      (sinf(time * 6.28318f) * 0.5f + 0.5f)
  ), 1.0f);
  ```

## Compilation

All patterns compile to identical file size and structure:

```
Generated C++ file: firmware/src/generated_effect.h
Lines of code: 34 per pattern
Memory overhead: ~150 bytes for palette data
Signature: void draw_generated_effect(float time)
```

## Quick Pattern Switching

To switch between patterns:

```bash
# Generate and upload Departure
node codegen/dist/index.js graphs/departure.json firmware/src/generated_effect.h
cd firmware && pio run -t upload --upload-port /dev/cu.usbmodem2101

# Generate and upload Aurora (animated)
node codegen/dist/index.js graphs/aurora.json firmware/src/generated_effect.h
cd firmware && pio run -t upload --upload-port /dev/cu.usbmodem2101
```

## Performance

All patterns maintain:
- ✅ 198+ FPS on ESP32-S3
- ✅ Single-core execution
- ✅ No stuttering or glitches
- ✅ Consistent color output

## Design Philosophy

Each pattern uses:
1. **Position node** - Maps LED index (0-180) to normalized position (0.0-1.0)
2. **Animation nodes** (optional) - Modify position over time
3. **Palette node** - Maps final position to beautiful colors
4. **Output node** - Write to LED array

No intermediate buffers, no temporary arrays, just pure mathematical expression flowing through the LED strip.
