---
title: Parameter Flow Trace - palette_id Investigation
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Parameter Flow Trace: palette_id from API → LED Rendering

## Executive Summary

**CRITICAL BUG FOUND**: Parameter validation in `parameters.cpp` uses `NUM_PALETTES = 8`, but the actual palette system supports 33 palettes (`palettes.h` defines `NUM_PALETTES = 33`). This causes all palette_id values ≥ 8 to be rejected and reset to 0.

**SECONDARY ISSUE**: Three static intentional patterns (Departure, Lava, Twilight) use hardcoded palette indices (0, 1, 2) instead of `params.palette_id`, making them unresponsive to palette selection.

---

## Complete Parameter Flow (Step-by-Step)

### Step 1: UI Sends Palette Selection

**Location**: Web dashboard JavaScript (embedded in `webserver.cpp:869-881`)

```javascript
async function updatePalette() {
    const paletteSelect = document.getElementById('palette-select');
    const paletteId = parseInt(paletteSelect.value);  // User selects 0-32

    await fetch('/api/params', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ palette_id: paletteId })  // ✓ Sends integer 0-32
    });
}
```

**Status**: ✓ CORRECT - UI sends valid palette_id (0-32)

---

### Step 2: API Receives JSON

**Location**: `firmware/src/webserver.cpp:76-144` (POST /api/params handler)

```cpp
// Line 115: Extract palette_id from JSON
if (doc.containsKey("palette_id"))
    new_params.palette_id = doc["palette_id"].as<uint8_t>();  // ✓ Correctly parsed

// Line 118: Validate and clamp parameters
bool success = update_params_safe(new_params);  // → Goes to parameters.cpp
```

**Status**: ✓ CORRECT - API parses palette_id correctly

---

### Step 3: Parameter Validation (THE BUG)

**Location**: `firmware/src/parameters.cpp:37-41`

```cpp
// Line 7: WRONG VALUE - should be 33, not 8
#define NUM_PALETTES 8  // ❌ BUG: Only allows 0-7, but 33 palettes exist!

// Line 37-41: Validation rejects palette_id >= 8
if (params.palette_id >= NUM_PALETTES) {
    params.palette_id = 0;  // ❌ Resets to 0 if value is 8-32
    clamped = true;
}
```

**Status**: ❌ **CRITICAL BUG**
**Impact**: Any palette_id ≥ 8 is rejected and reset to 0 (Sunset Real)

**Evidence**: User reports selecting palette 5 (Analogous 1) had no effect. If they selected palette 8+, it would be silently reset to 0.

---

### Step 4: Parameter Storage (Double-Buffer System)

**Location**: `firmware/src/parameters.h:52-64`

```cpp
// Line 55-56: Double-buffered storage (prevents torn reads on dual-core ESP32)
static PatternParameters g_params_buffers[2];
static std::atomic<uint8_t> g_active_buffer{0};

// Line 60-64: Thread-safe update (Core 0 web handler writes)
inline void update_params(const PatternParameters& new_params) {
    uint8_t inactive = 1 - g_active_buffer.load(std::memory_order_acquire);
    g_params_buffers[inactive] = new_params;  // Write to inactive buffer
    g_active_buffer.store(inactive, std::memory_order_release);  // Atomic swap
}
```

**Status**: ✓ CORRECT - Thread-safe double buffering works as intended

---

### Step 5: Pattern Execution (Main Loop)

**Location**: `firmware/src/main.cpp:210-214`

```cpp
// Line 211: Get current parameters (thread-safe read from active buffer)
const PatternParameters& params = get_params();

// Line 214: Draw current pattern with parameters
draw_current_pattern(time, params);
```

**Function Expansion**: `pattern_registry.h:63-66`
```cpp
inline void draw_current_pattern(float time, const PatternParameters& params) {
    PatternFunction draw_fn = g_pattern_registry[g_current_pattern_index].draw_fn;
    draw_fn(time, params);  // ✓ Passes params.palette_id to pattern
}
```

**Status**: ✓ CORRECT - Parameters are retrieved and passed to pattern functions

---

### Step 6: Pattern Uses palette_id (MIXED RESULTS)

#### Case A: Audio-Reactive Patterns (✓ CORRECT)

**Example**: Spectrum (`generated_patterns.h:262-301`)

```cpp
void draw_spectrum(float time, const PatternParameters& params) {
    // Line 267: Uses params.palette_id correctly
    CRGBF ambient_color = color_from_palette(params.palette_id, 0.5f, params.background * 0.3f);

    // Line 287: Uses params.palette_id for color mapping
    CRGBF color = color_from_palette(params.palette_id, progress, magnitude);
}
```

**Status**: ✓ CORRECT - Respects user palette selection

---

#### Case B: Static Intentional Patterns (❌ HARDCODED)

**Example 1**: Departure (`generated_patterns.h:151-166`)

```cpp
void draw_departure(float time, const PatternParameters& params) {
    // Line 161: HARDCODED palette index 0
    CRGBF color = color_from_palette(0, palette_progress, params.brightness * pulse);
    //                               ↑ Should be params.palette_id
}
```

**Example 2**: Lava (`generated_patterns.h:177-201`)

```cpp
void draw_lava(float time, const PatternParameters& params) {
    // Line 193: HARDCODED palette index 1
    CRGBF color = color_from_palette(1, explosive, params.brightness);
    //                               ↑ Should be params.palette_id
}
```

**Example 3**: Twilight (`generated_patterns.h:212-246`)

```cpp
void draw_twilight(float time, const PatternParameters& params) {
    // Line 231: HARDCODED palette index 2
    CRGBF color = color_from_palette(2, palette_progress, params.brightness);
    //                               ↑ Should be params.palette_id
}
```

**Status**: ❌ **SECONDARY BUG**
**Impact**: These three patterns ignore user palette selection

---

### Step 7: Color Palette Lookup

**Location**: `firmware/src/palettes.h:474-522`

```cpp
CRGBF color_from_palette(uint8_t palette_index, float progress, float brightness) {
    // Line 476: Modulo wrapping (prevents crash if index > 33)
    palette_index = palette_index % NUM_PALETTES;  // NUM_PALETTES = 33 in palettes.h

    // Line 485: Fetch palette from PROGMEM table
    PaletteInfo info;
    memcpy_P(&info, &palette_table[palette_index], sizeof(PaletteInfo));

    // Line 492-503: Find bracketing keyframes for interpolation
    // Line 505-530: Linear interpolation between keyframes
    // Returns CRGBF with r,g,b in 0.0-1.0 range
}
```

**Palette Table**: `palettes.h:434-471`
```cpp
#define NUM_PALETTES 33  // ✓ CORRECT: 33 palettes defined

const PaletteInfo palette_table[] PROGMEM = {
    {palette_sunset_real, 7},        // 0
    {palette_rivendell, 5},          // 1
    {palette_ocean_breeze_036, 4},   // 2
    {palette_rgi_15, 9},             // 3
    {palette_retro2, 2},             // 4
    {palette_analogous_1, 5},        // 5 ← User tried to select this
    // ... 28 more palettes up to index 32
};
```

**Status**: ✓ CORRECT - Palette system supports 33 palettes

---

### Step 8: LED Output

**Location**: `firmware/src/main.cpp:218`

```cpp
// Line 218: Transmit LED buffer to WS2812B strip via ESP32 RMT peripheral
transmit_leds();  // ✓ Final step: LEDs display rendered colors
```

**Status**: ✓ CORRECT - LED transmission works

---

## Root Cause Analysis

### Bug 1: Incorrect NUM_PALETTES in parameters.cpp

**Location**: `firmware/src/parameters.cpp:7`

```cpp
#define NUM_PALETTES 8  // ❌ WRONG: Should be 33
```

**Why it exists**:
- `parameters.cpp` was likely written before palette system was expanded from 8 to 33 palettes
- When `palettes.h` was updated to 33 palettes, `parameters.cpp` was not updated
- No compiler error because they're in different translation units

**Impact**:
- Palette IDs 8-32 are rejected during validation
- User selection of palettes 8-32 is silently reset to 0
- No visual feedback in UI (response always returns success)

---

### Bug 2: Hardcoded Palette Indices in Static Patterns

**Locations**:
- `generated_patterns.h:161` - Departure uses palette 0
- `generated_patterns.h:193` - Lava uses palette 1
- `generated_patterns.h:231` - Twilight uses palette 2

**Why it exists**:
- These patterns were designed with specific "signature" palettes
- Departure → palette_departure (index 11)
- Lava → palette_lava (index 23)
- Twilight → intentionally uses Ocean Breeze 036 (index 2)
- Code generation hardcoded the palette association

**Impact**:
- These three patterns ignore `params.palette_id`
- User cannot change palette for these patterns
- Creates inconsistent behavior (other patterns respond, these don't)

---

## Verification Questions Answered

### Q1: Are PatternParameters being populated correctly?
✓ **YES** - Parameters are correctly parsed from JSON and stored in double buffer

### Q2: Is params.palette_id set to the value sent by UI?
❌ **NO** - Values ≥ 8 are rejected and reset to 0 by validation logic

### Q3: When palette changes, do LEDs reflect the change?
**MIXED**:
- ✓ YES for audio-reactive patterns (Spectrum, Octave, Bloom, Pulse, Tempiscope)
- ❌ NO for static patterns (Departure, Lava, Twilight) - they use hardcoded indices
- ❌ ONLY IF palette_id < 8 due to validation bug

### Q4: Is there a render frame delay or buffering?
✓ **NO** - Double buffer system updates atomically, no delay

### Q5: Do all patterns use params.palette_id?
❌ **NO** - Three patterns (Departure, Lava, Twilight) use hardcoded palette indices

### Q6: Is there palette_id validation rejecting values?
✓ **YES** - Values ≥ 8 are rejected due to incorrect NUM_PALETTES definition

### Q7: What's the lifecycle?
```
API receives → validation (BUG HERE) → double buffer storage →
pattern execution → color_from_palette (SOME PATTERNS SKIP params.palette_id) → LED output
```

---

## File References (Exact Locations)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `webserver.cpp` | 869-881 | UI palette selection JavaScript | ✓ Correct |
| `webserver.cpp` | 115 | API parses palette_id from JSON | ✓ Correct |
| `parameters.cpp` | 7 | **NUM_PALETTES definition** | ❌ **BUG: Should be 33** |
| `parameters.cpp` | 37-41 | Palette ID validation | ❌ Rejects 8-32 |
| `parameters.h` | 55-64 | Double-buffer storage | ✓ Correct |
| `main.cpp` | 211-214 | Parameter retrieval and pattern call | ✓ Correct |
| `pattern_registry.h` | 63-66 | Pattern function dispatch | ✓ Correct |
| `generated_patterns.h` | 161 | Departure pattern | ❌ Hardcoded palette 0 |
| `generated_patterns.h` | 193 | Lava pattern | ❌ Hardcoded palette 1 |
| `generated_patterns.h` | 231 | Twilight pattern | ❌ Hardcoded palette 2 |
| `generated_patterns.h` | 267, 287 | Spectrum pattern | ✓ Uses params.palette_id |
| `generated_patterns.h` | 321, 344 | Octave pattern | ✓ Uses params.palette_id |
| `generated_patterns.h` | 377, 413 | Bloom pattern | ✓ Uses params.palette_id |
| `palettes.h` | 389 | NUM_PALETTES definition | ✓ Correct (33) |
| `palettes.h` | 474-522 | color_from_palette function | ✓ Correct |

---

## Recommended Fixes

### Fix 1: Update NUM_PALETTES in parameters.cpp

**File**: `firmware/src/parameters.cpp`

**Line 7**: Change from:
```cpp
#define NUM_PALETTES 8
```
To:
```cpp
#define NUM_PALETTES 33  // Must match palettes.h
```

**Alternative (better)**: Remove local definition and include from palettes.h:
```cpp
#include "palettes.h"  // Use NUM_PALETTES from palettes.h (single source of truth)
```

---

### Fix 2: Update Static Patterns to Use params.palette_id

**File**: `firmware/src/generated_patterns.h`

**Option A** (Allow palette switching):
```cpp
// Line 161: Departure
CRGBF color = color_from_palette(params.palette_id, palette_progress, params.brightness * pulse);

// Line 193: Lava
CRGBF color = color_from_palette(params.palette_id, explosive, params.brightness);

// Line 231: Twilight
CRGBF color = color_from_palette(params.palette_id, palette_progress, params.brightness);
```

**Option B** (Preserve signature palettes but allow override):
```cpp
// Use palette_id if non-zero, else use signature palette
uint8_t palette = (params.palette_id > 0) ? params.palette_id : SIGNATURE_PALETTE_INDEX;
CRGBF color = color_from_palette(palette, ...);
```

---

## Testing Checklist

After applying fixes, verify:

- [ ] Select palette 5 (Analogous 1) → Spectrum pattern shows blue-to-red gradient
- [ ] Select palette 8 (Ocean Breeze 068) → Spectrum pattern shows ocean colors
- [ ] Select palette 32 (Blue Cyan Yellow) → Spectrum pattern shows cyan/yellow gradient
- [ ] Select Departure pattern → Changing palette affects colors
- [ ] Select Lava pattern → Changing palette affects colors
- [ ] Select Twilight pattern → Changing palette affects colors
- [ ] GET /api/params returns palette_id matching what was sent
- [ ] POST palette_id=15 → GET returns palette_id=15 (not reset to 0)

---

## Impact Assessment

**Severity**: HIGH (core feature completely broken for 25 of 33 palettes)

**User Experience**:
- Users selecting palettes 8-32: "Why doesn't the palette change?"
- Users on Departure/Lava/Twilight patterns: "Why doesn't the palette change?"
- No error message in UI (silent failure)
- Inconsistent behavior across patterns

**Fix Complexity**: TRIVIAL (1-line change for Bug 1, 3 lines for Bug 2)

**Risk**: VERY LOW (changes are in validation and palette lookup, well-isolated)

---

## Related Issues

This investigation also revealed:
- ✓ Double-buffer parameter system works correctly (no race conditions)
- ✓ Thread-safe parameter updates between Core 0 (web) and Core 1 (LED rendering)
- ✓ Palette interpolation system works correctly (33 palettes functional)
- ✓ Most patterns correctly use params.palette_id

**No other parameter flow issues found.**
