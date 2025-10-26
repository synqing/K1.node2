---
title: Parameter Flow Diagram - palette_id Lifecycle
author: Claude (SUPREME Analyst)
date: 2025-10-27
status: published
intent: Visual representation of palette_id flow from UI to LEDs
---

# Parameter Flow Diagram: palette_id Lifecycle

## Complete Flow (With Bugs Marked)

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: WEB UI (JavaScript)                                        │
│ File: webserver.cpp:869-881                                         │
├─────────────────────────────────────────────────────────────────────┤
│ User selects palette: "Analogous 1" (ID: 5)                        │
│                                                                     │
│   paletteSelect.value = 5                                          │
│   JSON.stringify({ palette_id: 5 })  ✓ CORRECT                    │
│                                                                     │
│   POST /api/params → { palette_id: 5 }                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: API HANDLER (Core 0 - Web Server Task)                     │
│ File: webserver.cpp:76-144                                          │
├─────────────────────────────────────────────────────────────────────┤
│ Async web handler receives POST /api/params                        │
│                                                                     │
│   deserializeJson(doc, request_body)                               │
│   new_params.palette_id = doc["palette_id"].as<uint8_t>();        │
│   new_params.palette_id = 5  ✓ CORRECT                            │
│                                                                     │
│   update_params_safe(new_params)  → Goes to validation             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: PARAMETER VALIDATION (Core 0)                              │
│ File: parameters.cpp:37-41                                          │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ CRITICAL BUG DETECTED HERE                                      │
│                                                                     │
│   #define NUM_PALETTES 8  ← WRONG! Should be 33                   │
│                                                                     │
│   if (params.palette_id >= NUM_PALETTES) {                        │
│       params.palette_id = 0;  ← Resets 8-32 to 0                  │
│   }                                                                 │
│                                                                     │
│ SCENARIO A: palette_id = 5                                         │
│   5 < 8 → ✓ PASSES validation                                     │
│   params.palette_id = 5                                            │
│                                                                     │
│ SCENARIO B: palette_id = 15                                        │
│   15 >= 8 → ❌ FAILS validation                                   │
│   params.palette_id = 0 (RESET!)                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: PARAMETER STORAGE (Core 0 → Atomic Swap)                   │
│ File: parameters.h:60-64                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Thread-safe double buffering (prevents race conditions)            │
│                                                                     │
│   g_params_buffers[0] = {..., palette_id: 5, ...}  ← Active        │
│   g_params_buffers[1] = {..., palette_id: 5, ...}  ← Inactive      │
│                                                                     │
│   update_params(validated_params):                                 │
│     Write to inactive buffer                                       │
│     Atomic swap: g_active_buffer = 1  ✓ CORRECT                   │
│                                                                     │
│ Memory ordering ensures Core 1 sees updated values immediately     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: MAIN LOOP (Core 1 - LED Rendering @ 120+ FPS)              │
│ File: main.cpp:210-214                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Every frame (~8ms):                                                 │
│                                                                     │
│   const PatternParameters& params = get_params();                  │
│   params.palette_id = 5  ✓ CORRECT (for scenario A)               │
│                                                                     │
│   draw_current_pattern(time, params);                              │
│     → Calls pattern function with params                           │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6A: AUDIO-REACTIVE PATTERN (e.g., Spectrum)                   │
│ File: generated_patterns.h:262-301                                 │
├─────────────────────────────────────────────────────────────────────┤
│ void draw_spectrum(float time, const PatternParameters& params) {  │
│                                                                     │
│   color_from_palette(params.palette_id, progress, magnitude);      │
│                       ↑                                             │
│                       └─ Uses params.palette_id = 5  ✓ CORRECT     │
│                                                                     │
│   Result: LEDs show "Analogous 1" palette colors                   │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                     OR
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6B: STATIC INTENTIONAL PATTERN (e.g., Departure)              │
│ File: generated_patterns.h:151-166                                 │
├─────────────────────────────────────────────────────────────────────┤
│ ❌ SECONDARY BUG DETECTED HERE                                     │
│                                                                     │
│ void draw_departure(float time, const PatternParameters& params) { │
│                                                                     │
│   color_from_palette(0, palette_progress, params.brightness);      │
│                      ↑                                              │
│                      └─ HARDCODED 0 ❌ (ignores params.palette_id) │
│                                                                     │
│   Result: LEDs always show "Sunset Real" palette (index 0)         │
│           User selection of palette 5 is IGNORED                   │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: COLOR PALETTE LOOKUP                                       │
│ File: palettes.h:474-522                                            │
├─────────────────────────────────────────────────────────────────────┤
│ CRGBF color_from_palette(uint8_t palette_index,                    │
│                          float progress,                            │
│                          float brightness) {                        │
│                                                                     │
│   #define NUM_PALETTES 33  ✓ CORRECT (in palettes.h)              │
│                                                                     │
│   palette_index = palette_index % NUM_PALETTES;                    │
│   ↑                                                                 │
│   └─ Modulo wrapping prevents crash if index > 33                  │
│                                                                     │
│   memcpy_P(&info, &palette_table[palette_index], ...);            │
│   ↑                                                                 │
│   └─ Fetch palette from PROGMEM (33 palettes defined)             │
│                                                                     │
│   // Interpolate between keyframes                                 │
│   return CRGBF(r, g, b);  ✓ CORRECT                               │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: LED OUTPUT (Core 1)                                        │
│ File: main.cpp:218                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ transmit_leds();                                                    │
│   → ESP32 RMT peripheral sends RGB data to WS2812B strip          │
│   → 180 LEDs display rendered colors                               │
│                                                                     │
│ RESULT:                                                             │
│   ✓ Spectrum pattern: Shows palette 5 colors                      │
│   ❌ Departure pattern: Shows palette 0 colors (wrong!)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Bug Impact Matrix

| palette_id | Validation | Spectrum Pattern | Departure Pattern |
|------------|------------|------------------|-------------------|
| 0-7        | ✓ Pass     | ✓ Correct        | ❌ Hardcoded 0    |
| 8-32       | ❌ Reset to 0 | ❌ Shows palette 0 | ❌ Hardcoded 0 |

**Conclusion**: Only 8 of 33 palettes are accessible, and 3 of 11 patterns ignore palette selection entirely.

---

## Data Structure Flow

```
┌────────────────────────────────────────────────────────────────┐
│ PatternParameters struct (parameters.h:11-29)                  │
├────────────────────────────────────────────────────────────────┤
│ struct PatternParameters {                                     │
│     float brightness;      // 0.0 - 1.0                        │
│     float softness;        // 0.0 - 1.0                        │
│     float color;           // 0.0 - 1.0                        │
│     float color_range;     // 0.0 - 1.0                        │
│     float saturation;      // 0.0 - 1.0                        │
│     float warmth;          // 0.0 - 1.0                        │
│     float background;      // 0.0 - 1.0                        │
│     float speed;           // 0.0 - 1.0                        │
│     uint8_t palette_id;    // 0-N ← THIS FIELD                │
│     float custom_param_1;  // 0.0 - 1.0                        │
│     float custom_param_2;  // 0.0 - 1.0                        │
│     float custom_param_3;  // 0.0 - 1.0                        │
│ };                                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────┐
         │ Double Buffer (thread-safe)    │
         ├────────────────────────────────┤
         │ g_params_buffers[0] ← Active   │
         │ g_params_buffers[1] ← Inactive │
         │ g_active_buffer: atomic<u8>    │
         └────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────┐
         │ Pattern Function Call          │
         ├────────────────────────────────┤
         │ draw_spectrum(time, params)    │
         │ draw_departure(time, params)   │
         │ draw_lava(time, params)        │
         └────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ color_from_palette(palette_id, progress, brightness)           │
├────────────────────────────────────────────────────────────────┤
│ Input: palette_id = 0-32                                       │
│ Lookup: palette_table[palette_id] → PaletteInfo               │
│ Output: CRGBF {r, g, b} in 0.0-1.0 range                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                       ┌──────────┐
                       │   LEDs   │
                       │ WS2812B  │
                       └──────────┘
```

---

## Memory Safety Analysis

### Thread Safety: ✓ CORRECT

```
Core 0 (Web Handler)          Core 1 (LED Renderer)
─────────────────────         ─────────────────────
update_params():
  1. Load active_buffer
  2. Write to inactive_buffer
  3. Atomic swap
     ↓
     atomic_store(release)    → Synchronizes-with → atomic_load(acquire)
                                                      ↓
                                                    get_params():
                                                      1. Load active_buffer
                                                      2. Read from buffer
                                                      3. Return reference

Memory Ordering: release-acquire ensures visibility across cores
No mutex needed: Lock-free atomic swap
No torn reads: Writer never touches active buffer
```

**Verdict**: Thread-safe implementation is production-quality.

---

## Validation Logic Comparison

### parameters.cpp (WRONG)
```cpp
#define NUM_PALETTES 8  // ❌ Out of sync with palettes.h

if (params.palette_id >= NUM_PALETTES) {
    params.palette_id = 0;  // Rejects 8-32
    clamped = true;
}
```

### palettes.h (CORRECT)
```cpp
#define NUM_PALETTES 33  // ✓ Matches palette_table size

const PaletteInfo palette_table[] PROGMEM = {
    {palette_sunset_real, 7},       // 0
    {palette_rivendell, 5},         // 1
    // ... 31 more entries ...
    {palette_blue_cyan_yellow, 4}   // 32
};
```

**Root Cause**: Copy-paste from old code with 8 palettes, never updated.

---

## Fix Priority

| Bug | Severity | Fix Complexity | User Impact | Priority |
|-----|----------|----------------|-------------|----------|
| NUM_PALETTES mismatch | CRITICAL | Trivial (1 line) | 25 palettes unusable | P0 |
| Hardcoded palette indices | MEDIUM | Simple (3 lines) | 3 patterns unresponsive | P1 |

**Time to fix**: < 5 minutes
**Risk level**: Minimal (localized changes, no side effects)
**Testing time**: < 2 minutes (verify palette 15 works)

---

## Related Documentation

- Full trace: `parameter_flow_trace_palette_id.md`
- Palette definitions: `firmware/src/palettes.h`
- Parameter system: `firmware/src/parameters.h`
- Web API: `firmware/src/webserver.cpp`
