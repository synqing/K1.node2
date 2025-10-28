---
title: Emotiscope-2.0: ROOT CAUSE ANALYSIS
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Emotiscope-2.0: ROOT CAUSE ANALYSIS
## Visual Response Anomalies & HMI Side Effects

**Analysis Date**: 2025-01-23
**Status**: CRITICAL FINDINGS DOCUMENTED
**Investigator**: FastLED Specialist Agent + Code Review

---

## EXECUTIVE SUMMARY

You've identified **4 interconnected system design issues**:

1. **Unwanted "background" layer always active on startup** (0.25 intensity default)
2. **Keyboard keys triggering involuntary mode changes**
3. **Palette/color changes triggering "random" background colors**
4. **Two-layer visual system (primary + background) causing perception of "secondary motion"**

**ROOT CAUSE**: The system loads **default configuration values** that were designed for a finished UI experience, but are inappropriate for a firmware development phase. The background layer is **not a bug**—it's a **design choice** that's currently exposed.

---

## ISSUE #1: "RANDOM" BACKGROUND COLORS ON STARTUP

### The Actual Problem
On power-on, users see a cyan/rainbow "background glow" that wasn't explicitly requested.

### Root Cause
**File**: `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/configuration.h:58`

```cpp
// Default loaded on every boot:
configuration.background = preferences.getFloat("background", 0.25);
```

**Translation**: "Load background intensity from NVS flash. If not found (first boot), default to 0.25 (25% brightness)"

### Why This Happens

**Step-by-step**:

1. **Power-on** → Configuration loads with `background = 0.25`
2. **GPU core runs** (gpu_core.h:59):
   ```cpp
   apply_background(configuration.background);  // 0.25 = always on
   ```
3. **apply_background()** (leds.h:~659-700) generates a **gradient across all LEDs** using:
   - Current palette (default: Sunset Real)
   - Spatial position (0.0-1.0 left-to-right)
   - **No audio data** (pure position-based)
4. **Result**: A static colorful "floor" gets added on top of the effect

### Why It Looks "Random"
- When you change palettes, the background changes to match → looks like it appeared randomly
- When you change modes, the background + new effect combines → looks chaotic
- The background is **additive** (added to effect output), not layered over it

**File Reference**: `gpu_core.h:59` and `leds.h:659-700`

---

## ISSUE #2: KEYBOARD KEYS TRIGGERING UNINTENDED MODE CHANGES

### The Problem
- **UP key** (described as "Auto Colour Shift toggle") is also changing modes
- **LEFT key** (described as "Audio Debug On/off") is also changing modes

### Root Cause: NO ARROW KEYS ARE IMPLEMENTED

**Critical Finding**: There are **NO UP, DOWN, LEFT, RIGHT arrow keys** in the Emotiscope-2.0 firmware.

**File**: `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/system.h:61-63`

```cpp
else if(c == 27) {
    // ESC key - ignore escape sequences
    return;  // Arrow keys come as ESC sequences and are discarded
}
```

**Arrow Key Fact**: When you press arrow keys on a typical terminal, they arrive as:
- `ESC [ A` (UP)
- `ESC [ B` (DOWN)
- `ESC [ C` (RIGHT)
- `ESC [ D` (LEFT)

The firmware **ignores ESC (27) entirely**, so arrow keys never reach the handler.

### What YOU Probably Did

You might be using:
- **`a` key** instead of UP (Auto Color Cycle toggle) - This **doesn't** change modes
- **`d` key** instead of LEFT (Audio Debug toggle) - This **doesn't** change mode either

**So the mode changes you're seeing are from other keys.**

### Actual Key Bindings That Change Modes

**File**: `system.h:66-84`

| Key | Action | Side Effect |
|-----|--------|-------------|
| `[` | Previous Mode | Changes `configuration.current_mode` |
| `]` | Next Mode | Changes `configuration.current_mode` |
| `n` | Next Mode (forced transition) | Changes `configuration.current_mode` + enables transition |

**Hypothesis**: You might be pressing `[` or `]` accidentally, or another terminal software is mapping keys differently.

---

## ISSUE #3: PALETTE CHANGES TRIGGER "BACKGROUND" COLORS

### The Problem
Switching color palettes causes unexpected color changes beyond the main effect.

### Root Cause
The **background layer uses the same palette as the main effect**.

**File**: `leds.h:659-700` (apply_background function)

```cpp
// Background generates colors from SAME palette
CRGBF background_color = color_from_palette(
    configuration.current_palette,  // ← Same palette as effect!
    progress,                        // spatial position (0-1)
    1.0                              // full brightness
);

// Then scales it down and adds to effect
scale_CRGBF_array_by_constant(leds_temp, background_level, NUM_LEDS);
add_CRGBF_arrays(leds, leds_temp, NUM_LEDS);  // ← ADDITIVE blend
```

**Result**: When you change palettes with `background = 0.25` active, you get:
- Old effect colors
- Old background gradient
- New palette
- New background gradient (from new palette)
- All combined additively

This creates the illusion of "random colors appearing."

---

## ISSUE #4: PRIMARY MOTION + SECONDARY "BACKGROUND" LAYER

### The Perception
"There's a responsive foreground effect, but also a dimmer background layer that responds differently."

### The Reality
**These are two separate, intentional layers:**

1. **Primary Effect** (responsive to audio):
   - draw_spectrum(), draw_analog(), etc.
   - Maps audio frequency/magnitude to LED brightness
   - Changes with every audio sample

2. **Background Layer** (static position-based):
   - apply_background() adds a spatial gradient
   - Based on physical LED position, not audio
   - Intensity controlled by `configuration.background` (default 0.25)

**File**: `gpu_core.h:47-59` (exact order)

```cpp
47    clear_display();
48    light_modes[configuration.current_mode].draw();      // ← Primary effect
51-54 transition_engine.update(leds);                      // ← Transitions
59    apply_background(configuration.background);          // ← Background layer added
```

The background is **additive**, not layered. This is why:
- Effect colors + background colors = brighter overall
- Background appears as a "floor" or "wash"
- Different effects + same background = different perception

---

## WHY THIS DESIGN EXISTS

Looking at the defaults, this was built for a **finished UI experience**:

```cpp
// Default values (configuration.h)
background = 0.25          // "Always have ambient light"
mirror_mode = true         // "Symmetric visualization"
screensaver = true         // "Show screensaver when idle"
brightness = 1.0           // "Maximum brightness"
auto_color_cycle = false   // "Don't auto-shift unless user enables"
```

These are **finished product defaults**, not **development firmware defaults**.

---

## SUMMARY TABLE

| Issue | Root Cause | Design Intent | Current Behavior |
|-------|-----------|---|---|
| Background colors on startup | `background = 0.25` default | Aesthetic baseline for finished product | Unwanted on development phase |
| Palette change triggers colors | Background uses same palette | Unified color scheme | Looks chaotic during development |
| "Primary + secondary" visual | Two-layer rendering | Rich visual depth | Confusing during testing |
| Arrow keys don't work | ESC sequences ignored | Prevent corrupt key handling | Can't use arrow keys at all |

---

## NEXT STEPS (For Remediation)

These issues can be fixed with **4 strategic changes**:

1. **Disable background on startup** (set default to 0.0)
2. **Add arrow key support** (optional, if desired)
3. **Create dev/production config** profiles
4. **Document the two-layer system** clearly

Details in companion document: `REMEDIATION_PLAN.md`

---

**Files Analyzed**:
- `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/system.h` (HMI handlers)
- `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/gpu_core.h` (rendering pipeline)
- `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/leds.h` (background layer)
- `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/configuration.h` (defaults)
- `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/light_modes.h` (effect system)

