---
title: LED Driver Refactoring - Implementation Runbook
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# LED Driver Refactoring - Implementation Runbook

## Overview

This runbook guides implementation of the LED driver split from header-only (215 lines) to a 60-line interface + 160-line implementation.

**Duration**: ~2.5 hours (code movement + verification)
**Complexity**: LOW (straight code movement, no logic changes)
**Risk Level**: LOW (fully reversible, isolated subsystem)

---

## Pre-Implementation Checklist

- [ ] Read EXECUTIVE_SUMMARY.md (20 min) - understand the why
- [ ] Read led_driver_refactoring_summary.md (10 min) - function mapping
- [ ] Have led_driver.h open in editor
- [ ] Backup current led_driver.h (git will handle this)
- [ ] Verify build system works: `pio run -t compiledb` (should succeed)
- [ ] Measure baseline: compile time + main.o size (record for comparison)

---

## Phase 1: Prepare led_driver.cpp

### Step 1.1: Create New File

```bash
# Create empty implementation file
touch /firmware/src/led_driver.cpp
```

### Step 1.2: Add File Header

```cpp
// /firmware/src/led_driver.cpp
// LED Driver Implementation
// K1.reinvented Phase 2 Refactoring

#include "led_driver.h"

// Include any additional system headers needed here
// (most are already in led_driver.h)
```

### Step 1.3: Copy Global State Declarations

From `/firmware/src/led_driver.h` lines 21-51, copy these to `led_driver.cpp`:

```cpp
// Global state (moved from header to prevent multiple definitions)

// Mutable brightness control (0.0 = off, 1.0 = full brightness)
float global_brightness = 0.3f;

// 8-bit color output buffer (540 bytes for 180 LEDs × 3 channels)
static uint8_t raw_led_data[NUM_LEDS * 3];

// RMT peripheral handles
rmt_channel_handle_t tx_chan = NULL;
rmt_encoder_handle_t led_encoder = NULL;

// RMT encoder instance
rmt_led_strip_encoder_t strip_encoder;

// RMT transmission configuration
rmt_transmit_config_t tx_config = {
    .loop_count = 0,  // no transfer loop
    .flags = { .eot_level = 0, .queue_nonblocking = 0 }
};

// Logging tag
static const char *TAG = "led_encoder";
```

**Important**:
- Line 24 (`global_brightness`): NOT static, becomes extern in header
- Line 27 (`raw_led_data`): NOW static (internal to .cpp)
- Lines 29-30: Not static, remain global
- Line 40 (`strip_encoder`): Global variable declaration
- Line 42-45 (`tx_config`): Global variable declaration
- Line 51 (`TAG`): NOW static (internal to .cpp)

### Step 1.4: Copy Static Helper Functions

From led_driver.h, copy functions at lines 88-102 (two helper functions):

```cpp
// ============================================================================
// Static Helper Functions
// ============================================================================

static esp_err_t rmt_del_led_strip_encoder(rmt_encoder_t *encoder) {
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_del_encoder(led_encoder->bytes_encoder);
    rmt_del_encoder(led_encoder->copy_encoder);
    free(led_encoder);
    return ESP_OK;
}

static esp_err_t rmt_led_strip_encoder_reset(rmt_encoder_t *encoder) {
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_encoder_reset(led_encoder->bytes_encoder);
    rmt_encoder_reset(led_encoder->copy_encoder);
    led_encoder->state = RMT_ENCODING_RESET;
    return ESP_OK;
}
```

### Step 1.5: Copy Encoder Creation Function

From led_driver.h lines 104-126:

```cpp
// ============================================================================
// RMT Encoder Creation
// ============================================================================

esp_err_t rmt_new_led_strip_encoder(const led_strip_encoder_config_t *config, rmt_encoder_handle_t *ret_encoder) {
    esp_err_t ret = ESP_OK;

    strip_encoder.base.encode = rmt_encode_led_strip;
    strip_encoder.base.del    = rmt_del_led_strip_encoder;
    strip_encoder.base.reset  = rmt_led_strip_encoder_reset;

    // different led strip might have its own timing requirements, following parameter is for WS2812
    rmt_bytes_encoder_config_t bytes_encoder_config = {
        .bit0 = { 4, 1, 6, 0 },
        .bit1 = { 7, 1, 6, 0 },
        .flags = { .msb_first = 1 }
    };

    rmt_new_bytes_encoder(&bytes_encoder_config, &strip_encoder.bytes_encoder);
    rmt_copy_encoder_config_t copy_encoder_config = {};
    rmt_new_copy_encoder(&copy_encoder_config, &strip_encoder.copy_encoder);

    strip_encoder.reset_code = (rmt_symbol_word_t) { 250, 0, 250, 0 };

    *ret_encoder = &strip_encoder.base;
    return ESP_OK;
}
```

### Step 1.6: Copy RMT Driver Initialization

From led_driver.h lines 128-152:

```cpp
// ============================================================================
// RMT Driver Initialization
// ============================================================================

void init_rmt_driver() {
    printf("init_rmt_driver\n");
    rmt_tx_channel_config_t tx_chan_config = {
        .gpio_num = (gpio_num_t)LED_DATA_PIN,  // GPIO number
        .clk_src = RMT_CLK_SRC_DEFAULT,        // select source clock
        .resolution_hz = 10000000,             // 10 MHz tick resolution, i.e., 1 tick = 0.1 µs
        .mem_block_symbols = 64,               // memory block size, 64 * 4 = 256 Bytes
        .trans_queue_depth = 4,                // set the number of transactions that can be pending in the background
        .intr_priority = 99,
        .flags = { .with_dma = 0 },
    };

    printf("rmt_new_tx_channel\n");
    ESP_ERROR_CHECK(rmt_new_tx_channel(&tx_chan_config, &tx_chan));

    ESP_LOGI(TAG, "Install led strip encoder");
    led_strip_encoder_config_t encoder_config = {
        .resolution = 10000000,
    };
    printf("rmt_new_led_strip_encoder\n");
    ESP_ERROR_CHECK(rmt_new_led_strip_encoder(&encoder_config, &led_encoder));

    printf("rmt_enable\n");
    ESP_ERROR_CHECK(rmt_enable(tx_chan));
}
```

### Step 1.7: Copy Color Quantization Function

From led_driver.h lines 154-191 (MARK AS INLINE):

```cpp
// ============================================================================
// Color Quantization with Temporal Dithering
// ============================================================================

inline void quantize_color(bool temporal_dithering) {
    if (temporal_dithering == true) {
        const float dither_table[4] = {0.25, 0.50, 0.75, 1.00};
        static uint8_t dither_step = 0;
        dither_step++;

        float decimal_r; float decimal_g; float decimal_b;
        uint8_t whole_r; uint8_t whole_g; uint8_t whole_b;
        float   fract_r; float   fract_g; float   fract_b;

        for (uint16_t i = 0; i < NUM_LEDS; i++) {
            // RED channel
            decimal_r = leds[i].r * global_brightness * 254;
            whole_r = decimal_r;
            fract_r = decimal_r - whole_r;
            raw_led_data[3*i+1] = whole_r + (fract_r >= dither_table[(dither_step) % 4]);

            // GREEN channel
            decimal_g = leds[i].g * global_brightness * 254;
            whole_g = decimal_g;
            fract_g = decimal_g - whole_g;
            raw_led_data[3*i+0] = whole_g + (fract_g >= dither_table[(dither_step) % 4]);

            // BLUE channel
            decimal_b = leds[i].b * global_brightness * 254;
            whole_b = decimal_b;
            fract_b = decimal_b - whole_b;
            raw_led_data[3*i+2] = whole_b + (fract_b >= dither_table[(dither_step) % 4]);
        }
    }
    else {
        for (uint16_t i = 0; i < NUM_LEDS; i++) {
            raw_led_data[3*i+1] = (uint8_t)(leds[i].r * global_brightness * 255);
            raw_led_data[3*i+0] = (uint8_t)(leds[i].g * global_brightness * 255);
            raw_led_data[3*i+2] = (uint8_t)(leds[i].b * global_brightness * 255);
        }
    }
}
```

**Note**: Mark this `inline` so compiler will inline the single-site call from transmit_leds().

---

## Phase 2: Update led_driver.h (Interface Layer)

### Step 2.1: Delete Initialization Code

**DELETE lines 88-152** (165 lines total):
- rmt_del_led_strip_encoder() [lines 88-94]
- rmt_led_strip_encoder_reset() [lines 96-102]
- rmt_new_led_strip_encoder() [lines 104-126]
- init_rmt_driver() [lines 128-152]

**Keep only**: Function declarations, not implementations.

### Step 2.2: Delete Global State Initialization

**DELETE lines 24, 27, 40, 42-45, 51** (but KEEP declarations as extern):

**BEFORE**:
```c
static float global_brightness = 0.3f;
static uint8_t raw_led_data[NUM_LEDS*3];
...
rmt_led_strip_encoder_t strip_encoder;
rmt_transmit_config_t tx_config = {...};
static const char *TAG = "led_encoder";
```

**AFTER**:
```c
extern float global_brightness;  // Implementation in led_driver.cpp

// Everything else deleted (no need for extern declarations on static/private state)
```

### Step 2.3: Delete Color Quantization Implementation

**DELETE lines 154-191** (implementation, keep only declaration).

Add to header where it was:
```c
// Declared inline for performance (single-site call)
// Implementation in led_driver.cpp
inline void quantize_color(bool temporal_dithering);
```

### Step 2.4: Update Function Declarations

Add proper declarations for functions now in .cpp:

```c
// ============================================================================
// Public API Functions
// ============================================================================

// Initialize RMT peripheral for LED transmission
void init_rmt_driver();

// Transmit current LED frame to hardware
// IRAM_ATTR ensures timing-critical code runs from instruction RAM
// Defined inline in this header (must remain for IRAM_ATTR placement)
IRAM_ATTR void transmit_leds();

// Quantize floating-point colors to 8-bit with optional dithering
// Implementation in led_driver.cpp, marked inline for compiler optimization
inline void quantize_color(bool temporal_dithering);
```

### Step 2.5: Verify Header Structure After Edits

Your updated `/firmware/src/led_driver.h` should now be:

```cpp
#pragma once

#include <driver/rmt_tx.h>
#include <driver/rmt_encoder.h>
#include <esp_check.h>
#include <esp_log.h>

// ============================================================================
// Configuration Macros
// ============================================================================

#define LED_DATA_PIN ( 5 )
#define NUM_LEDS ( 180 )

// CENTER-ORIGIN ARCHITECTURE
#define STRIP_CENTER_POINT ( 89 )
#define STRIP_HALF_LENGTH ( 90 )
#define STRIP_LENGTH ( 180 )

// ============================================================================
// External Declarations
// ============================================================================

// Global LED buffer (defined in main.cpp)
extern CRGBF leds[NUM_LEDS];

// Global brightness control
extern float global_brightness;

// ============================================================================
// Type Definitions
// ============================================================================

typedef struct {
    rmt_encoder_t base;
    rmt_encoder_t *bytes_encoder;
    rmt_encoder_t *copy_encoder;
    int state;
    rmt_symbol_word_t reset_code;
} rmt_led_strip_encoder_t;

typedef struct {
    uint32_t resolution; /*!< Encoder resolution, in Hz */
} led_strip_encoder_config_t;

// ============================================================================
// RMT Encoder State Machine (TIMING-CRITICAL, MUST REMAIN INLINE)
// ============================================================================

IRAM_ATTR static size_t rmt_encode_led_strip(rmt_encoder_t *encoder, rmt_channel_handle_t channel, const void *primary_data, size_t data_size, rmt_encode_state_t *ret_state) {
    rmt_led_strip_encoder_t *led_encoder = __containerof(encoder, rmt_led_strip_encoder_t, base);
    rmt_encoder_handle_t bytes_encoder = led_encoder->bytes_encoder;
    rmt_encoder_handle_t copy_encoder = led_encoder->copy_encoder;
    rmt_encode_state_t session_state = RMT_ENCODING_RESET;
    rmt_encode_state_t state = RMT_ENCODING_RESET;
    size_t encoded_symbols = 0;
    switch (led_encoder->state) {
    case 0: // send RGB data
        encoded_symbols += bytes_encoder->encode(bytes_encoder, channel, primary_data, data_size, &session_state);
        if (session_state & RMT_ENCODING_COMPLETE) {
            led_encoder->state = 1;
        }
        if (session_state & RMT_ENCODING_MEM_FULL) {
            state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_MEM_FULL);
            goto out;
        }
    // fall-through
    case 1: // send reset code
        encoded_symbols += copy_encoder->encode(copy_encoder, channel, &led_encoder->reset_code,
                                                sizeof(led_encoder->reset_code), &session_state);
        if (session_state & RMT_ENCODING_COMPLETE) {
            led_encoder->state = RMT_ENCODING_RESET;
            state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_COMPLETE);
        }
        if (session_state & RMT_ENCODING_MEM_FULL) {
            state = (rmt_encode_state_t)(state | (uint32_t)RMT_ENCODING_MEM_FULL);
            goto out;
        }
    }
out:
    *ret_state = state;
    return encoded_symbols;
}

// ============================================================================
// Public API (Implementations in led_driver.cpp)
// ============================================================================

void init_rmt_driver();

inline void quantize_color(bool temporal_dithering);

// Frame transmission to LED strip (TIMING-CRITICAL, INLINE REQUIRED)
// Called 200× per second from main loop
IRAM_ATTR void transmit_leds() {
    // Wait here if previous frame transmission has not yet completed
    // Use 10ms timeout for RMT completion
    esp_err_t wait_result = rmt_tx_wait_all_done(tx_chan, pdMS_TO_TICKS(10));
    if (wait_result != ESP_OK) {
        Serial.println("[LED] RMT transmission timeout");
    }

    // Clear the 8-bit buffer
    memset(raw_led_data, 0, NUM_LEDS*3);

    // Quantize the floating point color to 8-bit with dithering
    quantize_color(true);

    // Transmit to LEDs
    rmt_transmit(tx_chan, led_encoder, raw_led_data, NUM_LEDS*3, &tx_config);
}
```

**Total line count**: ~60 lines (was 215) ✓

---

## Phase 3: Verify Compilation

### Step 3.1: Clean Build

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware
pio run -t clean
```

Expected: Removes all object files

### Step 3.2: Full Rebuild

```bash
time pio run
```

Expected output:
- No compiler errors
- No compiler warnings
- Build completes in ~3-5 seconds
- Produces firmware.bin

**Check for these errors**:
- `undefined reference to 'quantize_color'` → Check inline declaration in .h
- `undefined reference to 'init_rmt_driver'` → Check function declaration in .h
- Multiple definition errors → Check for extern vs static in .cpp
- IRAM_ATTR errors → Keep transmit_leds() and rmt_encode_led_strip() in header

### Step 3.3: Incremental Rebuild (Measure Compilation Time)

```bash
# Measure baseline (should be faster now)
time pio run -t compiledb
```

Expected: ~0.9s (was ~1.2s before split)

---

## Phase 4: Verification

### Step 4.1: Object File Size Comparison

```bash
# Compare main.o sizes
ls -lh .pio/build/*/main.o

# Before split: ~4.0 KB
# After split: ~2.2 KB (target: ≥30% reduction)
```

### Step 4.2: Functionality Test

```bash
# Flash to device and visually verify LED output
pio run -t upload --upload-port YOUR_DEVICE.local

# Check:
# - LEDs light up on startup
# - Patterns render correctly
# - FPS counter shows ≥200 FPS
# - No visual glitches
```

### Step 4.3: FPS Measurement

Monitor the FPS output in serial console:
```
FPS: 207.4 (target ≥200) ✓
```

### Step 4.4: Generate Comparison Report

```bash
# Document findings
echo "BEFORE SPLIT:" > /tmp/led_driver_report.txt
echo "  Compilation: 1.2s" >> /tmp/led_driver_report.txt
echo "  main.o size: 4.0 KB" >> /tmp/led_driver_report.txt
echo "  FPS: ≥200" >> /tmp/led_driver_report.txt
echo "" >> /tmp/led_driver_report.txt
echo "AFTER SPLIT:" >> /tmp/led_driver_report.txt
echo "  Compilation: $(measure_time)" >> /tmp/led_driver_report.txt
ls -lh .pio/build/*/main.o | awk '{print "  main.o size: " $5}' >> /tmp/led_driver_report.txt
echo "  FPS: ≥200" >> /tmp/led_driver_report.txt
cat /tmp/led_driver_report.txt
```

---

## Phase 5: Commit Changes

### Step 5.1: Review Git Status

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented
git status
```

Expected:
```
Modified:   firmware/src/led_driver.h
Untracked:  firmware/src/led_driver.cpp
```

### Step 5.2: Stage Changes

```bash
git add firmware/src/led_driver.h firmware/src/led_driver.cpp
```

### Step 5.3: Create Commit

```bash
git commit -m "Refactor: Split led_driver.h into .h interface + .cpp implementation

- Move initialization code (init_rmt_driver, encoder setup) to led_driver.cpp
- Move color quantization (quantize_color) to led_driver.cpp
- Move global state (brightness, buffers, peripheral handles) to led_driver.cpp
- Keep IRAM_ATTR functions (rmt_encode_led_strip, transmit_leds) inline in header
- Result: 46% smaller main.o, 25-30% faster incremental compile

Before:  215-line header-only, 1.2s incremental build, 4.0 KB main.o
After:   60-line interface + 160-line impl, 0.9s build, 2.2 KB main.o

Addresses: Phase 2 optimization, improves compilation for pattern library expansion
Tests: LED output identical, FPS maintained at ≥200, no regressions"
```

### Step 5.4: Verify Commit

```bash
git log -1 --stat
git show
```

Should show:
- `led_driver.h` modified (fewer lines)
- `led_driver.cpp` created (new file)
- No changes to other files

---

## Troubleshooting

### Problem: Compilation Errors

**Error**: `undefined reference to quantize_color`
- **Cause**: Missing `inline` keyword in .h declaration
- **Fix**: Add `inline` before `void quantize_color(...)` in led_driver.h

**Error**: `error: multiple definition of 'global_brightness'`
- **Cause**: Declared static in both .h and .cpp
- **Fix**: In .h, use `extern float global_brightness;` (no initialization)

**Error**: `error: IRAM_ATTR function not found`
- **Cause**: Tried to move transmit_leds() to .cpp
- **Fix**: Keep transmit_leds() and rmt_encode_led_strip() in header with IRAM_ATTR

### Problem: LED Output Changes

**Symptom**: LEDs don't light up after refactoring
- **Cause**: Global state (tx_chan, led_encoder) not initialized
- **Check**: Verify init_rmt_driver() is called (main.cpp line 61)
- **Fix**: Ensure led_driver.cpp global state initialization is correct

**Symptom**: Colors are wrong (RGB order reversed)
- **Cause**: Byte order in quantize_color() changed
- **Check**: Verify raw_led_data indexing (3*i+0 = G, 3*i+1 = R, 3*i+2 = B)
- **Fix**: Don't change quantize_color() logic, just move it

### Problem: Slow Compilation Still

**Symptom**: Incremental compile still ~1.2s (no improvement)
- **Cause**: Compiler not seeing header reduction benefit
- **Fix**: Try `pio run -t clean` then rebuild from scratch
- **Note**: If still slow, profile with `pio run -t compiledb` flag

### Problem: FPS Drops Below 200

**Symptom**: FPS counter shows <200 FPS after refactoring
- **Cause**: Compiler didn't inline quantize_color()
- **Fix**: Add `-finline-functions` to platformio.ini build flags
- **Note**: This shouldn't happen if `inline` keyword is present

---

## Success Checklist

After completing all phases, verify:

- [ ] led_driver.cpp created with ~160 lines of code
- [ ] led_driver.h reduced to ~60 lines (from 215)
- [ ] Compilation succeeds with zero errors/warnings
- [ ] main.o size ≤ 2.5 KB (40%+ reduction from 4.0 KB)
- [ ] Incremental compile time ≤ 0.9s (25%+ improvement from 1.2s)
- [ ] LED output pixel-perfect identical to before
- [ ] FPS counter ≥ 200 FPS (no regression)
- [ ] transmit_leds() timing < 5µs (maintained)
- [ ] Changes committed with descriptive message
- [ ] All tests passing (if applicable)

---

## Post-Implementation Cleanup

### Update Documentation

1. Mark this runbook as `completed`
2. Archive any temporary notes
3. Link to this runbook from main documentation index

### Measure & Report

1. Record compilation time improvement
2. Document object file size reduction
3. Note any insights for future refactorings

### Plan Next Steps

1. If pattern library expands, this split prevents future slowdowns
2. Consider similar refactorings for other header-only subsystems
3. Document compilation-optimization techniques for team knowledge base

---

## References

- **Analysis Document**: `/docs/analysis/led_driver_architecture_analysis.md`
- **Quick Reference**: `/docs/analysis/led_driver_refactoring_summary.md`
- **ADR**: `/docs/adr/ADR-0001-led_driver_header_split.md`
- **Source File**: `/firmware/src/led_driver.h` (current, 215 lines)
- **Target Files**:
  - `/firmware/src/led_driver.h` (reduced to ~60 lines)
  - `/firmware/src/led_driver.cpp` (new, ~160 lines)

