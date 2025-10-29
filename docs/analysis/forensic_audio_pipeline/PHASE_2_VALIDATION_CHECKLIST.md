---
title: Phase 2 Validation Checklist
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Phase 2 Validation Checklist

## Overview

This document provides comprehensive validation tests for the Pattern Audio Interface (Phase 2).

**Phase**: 2 of 4 (Pattern Interface)
**File**: `firmware/src/pattern_audio_interface.h`
**Created**: 2025-10-26

---

## Pre-Validation Setup

### Environment Requirements

- [ ] PlatformIO installed and configured
- [ ] ESP32-S3 development board available
- [ ] K1.reinvented firmware repository cloned
- [ ] Audio input source (music player, microphone)

### Build Environment Check

```bash
# Navigate to firmware directory
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/PRISM.k1

# Clean build
pio run --target clean

# Verify build system
pio run --target compiledb
```

**Expected**: Clean compile with no errors

---

## Validation Stage 1: Compilation Tests

### Test 1.1: Header File Compilation

**Objective**: Verify `pattern_audio_interface.h` compiles without errors.

**Procedure**:
1. Create test file: `firmware/src/test_audio_interface.cpp`
2. Add minimal test code:

```cpp
#include "pattern_audio_interface.h"

void test_compile() {
    // Should compile without errors
}
```

3. Build:
```bash
pio run -d firmware/PRISM.k1
```

**Expected Result**:
- [ ] No compilation errors
- [ ] No warnings related to pattern_audio_interface.h

**Acceptance Criteria**: Clean compilation

---

### Test 1.2: Macro Expansion Test

**Objective**: Verify all macros expand correctly.

**Test Code**:
```cpp
#include "pattern_audio_interface.h"

void test_macro_expansion() {
    PATTERN_AUDIO_START();

    // Test all accessors
    float spectrum_val = AUDIO_SPECTRUM[0];
    float smooth_val = AUDIO_SPECTRUM_SMOOTH[0];
    float chroma_val = AUDIO_CHROMAGRAM[0];
    float vu = AUDIO_VU;
    float vu_raw = AUDIO_VU_RAW;
    float novelty = AUDIO_NOVELTY;
    float tempo = AUDIO_TEMPO_CONFIDENCE;

    // Test query macros
    bool fresh = AUDIO_IS_FRESH();
    bool available = AUDIO_IS_AVAILABLE();
    uint32_t age = AUDIO_AGE_MS();
    bool stale = AUDIO_IS_STALE();

    // Test band macros
    float bass = AUDIO_BASS();
    float mids = AUDIO_MIDS();
    float treble = AUDIO_TREBLE();
}
```

**Expected Result**:
- [ ] All macros expand without errors
- [ ] No "undefined identifier" errors
- [ ] No type mismatch warnings

**Acceptance Criteria**: Compiles cleanly

---

### Test 1.3: Helper Function Compilation

**Objective**: Verify helper functions compile and link correctly.

**Test Code**:
```cpp
#include "pattern_audio_interface.h"

void test_helper_functions() {
    PATTERN_AUDIO_START();

    // Test get_audio_band_energy
    float bass = get_audio_band_energy(audio, 0, 8);
    float custom = get_audio_band_energy(audio, 10, 20);

    // Test edge cases
    float invalid1 = get_audio_band_energy(audio, -5, 10);   // Negative start
    float invalid2 = get_audio_band_energy(audio, 50, 100);  // Out of range
    float invalid3 = get_audio_band_energy(audio, 20, 10);   // Reversed range
}
```

**Expected Result**:
- [ ] Functions compile without errors
- [ ] No linker errors
- [ ] Edge cases handled gracefully

**Acceptance Criteria**: Clean compilation and linking

---

### Test 1.4: Include Guard Test

**Objective**: Verify header can be included multiple times.

**Test Code**:
```cpp
#include "pattern_audio_interface.h"
#include "pattern_audio_interface.h"  // Second inclusion
#include "pattern_audio_interface.h"  // Third inclusion

void test_include_guards() {
    PATTERN_AUDIO_START();
    float bass = AUDIO_BASS();
}
```

**Expected Result**:
- [ ] No "redefinition" errors
- [ ] No "multiple definition" linker errors
- [ ] Include guards work correctly

**Acceptance Criteria**: Clean compilation

---

## Validation Stage 2: Functionality Tests

### Test 2.1: PATTERN_AUDIO_START() Behavior

**Objective**: Verify macro creates expected variables.

**Test Code**:
```cpp
#include "pattern_audio_interface.h"
#include <Arduino.h>

void test_pattern_audio_start() {
    PATTERN_AUDIO_START();

    // Variables should exist in this scope
    Serial.printf("audio_available: %d\n", audio_available);
    Serial.printf("audio_is_fresh: %d\n", audio_is_fresh);
    Serial.printf("audio_age_ms: %u\n", audio_age_ms);

    // Audio snapshot should exist
    Serial.printf("audio.update_counter: %u\n", audio.update_counter);
    Serial.printf("audio.timestamp_us: %llu\n", audio.timestamp_us);
}
```

**Expected Result**:
- [ ] All variables exist in scope
- [ ] No compilation errors
- [ ] Serial output shows reasonable values

**Acceptance Criteria**: Variables created and accessible

---

### Test 2.2: Freshness Detection Test

**Objective**: Verify static tracking of update counter works.

**Test Code**:
```cpp
void test_freshness_detection() {
    // First call
    PATTERN_AUDIO_START();
    bool first_fresh = AUDIO_IS_FRESH();
    Serial.printf("First call - fresh: %d\n", first_fresh);

    // Second call (same frame, no audio update)
    PATTERN_AUDIO_START();
    bool second_fresh = AUDIO_IS_FRESH();
    Serial.printf("Second call - fresh: %d\n", second_fresh);

    // Delay for audio update
    delay(20);  // Wait for new audio frame

    // Third call (should be fresh again)
    PATTERN_AUDIO_START();
    bool third_fresh = AUDIO_IS_FRESH();
    Serial.printf("Third call - fresh: %d\n", third_fresh);
}
```

**Expected Result**:
- [ ] First call: fresh = true (initial state)
- [ ] Second call: fresh = false (same update_counter)
- [ ] Third call: fresh = true (new audio data)

**Acceptance Criteria**: Freshness tracking works correctly

---

### Test 2.3: Array Accessor Bounds Test

**Objective**: Verify array accessors don't crash on valid indices.

**Test Code**:
```cpp
void test_array_bounds() {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_AVAILABLE()) {
        Serial.println("Audio not available - skipping test");
        return;
    }

    // Test spectrum bounds
    for (int i = 0; i < NUM_FREQS; i++) {
        float val = AUDIO_SPECTRUM[i];
        if (val < 0.0 || val > 1.5) {  // Allow slight overshoot
            Serial.printf("WARNING: spectrum[%d] = %f (out of range)\n", i, val);
        }
    }

    // Test chromagram bounds
    for (int i = 0; i < 12; i++) {
        float val = AUDIO_CHROMAGRAM[i];
        if (val < 0.0 || val > 1.5) {
            Serial.printf("WARNING: chromagram[%d] = %f (out of range)\n", i, val);
        }
    }

    Serial.println("Array bounds test complete");
}
```

**Expected Result**:
- [ ] No crashes or exceptions
- [ ] All values in reasonable range (0.0-1.0)
- [ ] No memory access violations

**Acceptance Criteria**: Safe array access

---

### Test 2.4: Helper Function Validation

**Objective**: Verify `get_audio_band_energy()` returns correct values.

**Test Code**:
```cpp
void test_band_energy() {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_AVAILABLE()) {
        Serial.println("Audio not available");
        return;
    }

    // Test predefined bands
    float bass = AUDIO_BASS();
    float mids = AUDIO_MIDS();
    float treble = AUDIO_TREBLE();

    Serial.printf("BASS: %f\n", bass);
    Serial.printf("MIDS: %f\n", mids);
    Serial.printf("TREBLE: %f\n", treble);

    // Test custom band
    float custom = get_audio_band_energy(audio, 10, 20);
    Serial.printf("Custom (10-20): %f\n", custom);

    // Test edge cases (should not crash)
    float edge1 = get_audio_band_energy(audio, -10, 5);   // Negative start
    float edge2 = get_audio_band_energy(audio, 50, 100);  // Out of range end
    float edge3 = get_audio_band_energy(audio, 30, 20);   // Reversed range

    Serial.printf("Edge case 1: %f\n", edge1);
    Serial.printf("Edge case 2: %f\n", edge2);
    Serial.printf("Edge case 3: %f\n", edge3);
}
```

**Expected Result**:
- [ ] Bass/mids/treble return valid values (0.0-1.0)
- [ ] Edge cases don't crash
- [ ] Edge cases return 0.0 (invalid input)

**Acceptance Criteria**: Helper function works correctly

---

### Test 2.5: Age Calculation Test

**Objective**: Verify audio age calculation is accurate.

**Test Code**:
```cpp
void test_age_calculation() {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_AVAILABLE()) {
        Serial.println("Audio not available");
        return;
    }

    uint32_t age1 = AUDIO_AGE_MS();
    Serial.printf("Age at T+0ms: %u ms\n", age1);

    delay(10);

    PATTERN_AUDIO_START();
    uint32_t age2 = AUDIO_AGE_MS();
    Serial.printf("Age at T+10ms: %u ms\n", age2);

    delay(50);

    PATTERN_AUDIO_START();
    uint32_t age3 = AUDIO_AGE_MS();
    Serial.printf("Age at T+60ms: %u ms\n", age3);

    // Check staleness
    bool stale = AUDIO_IS_STALE();
    Serial.printf("Is stale (>50ms): %d\n", stale);
}
```

**Expected Result**:
- [ ] Age increases with time
- [ ] Age calculation reasonably accurate (±5ms)
- [ ] Staleness flag triggers at >50ms

**Acceptance Criteria**: Age calculation works

---

## Validation Stage 3: Integration Tests

### Test 3.1: Simple Pattern Test

**Objective**: Verify interface works in a real pattern.

**Test Pattern**:
```cpp
#include "pattern_audio_interface.h"

void draw_test_spectrum(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();

    if (!AUDIO_IS_FRESH()) {
        return;
    }

    for (int i = 0; i < NUM_LEDS; i++) {
        int bin = (i * NUM_FREQS) / NUM_LEDS;
        float magnitude = AUDIO_SPECTRUM_SMOOTH[bin];

        if (AUDIO_IS_STALE()) {
            magnitude *= 0.95;
        }

        leds[i] = CRGBF(magnitude, magnitude, magnitude);
    }
}
```

**Validation Steps**:
1. Add pattern to `generated_patterns.h`
2. Compile firmware
3. Flash to device
4. Load pattern via web interface
5. Play music near microphone

**Expected Result**:
- [ ] Pattern compiles without errors
- [ ] Pattern loads on device
- [ ] LEDs respond to audio
- [ ] No crashes or glitches

**Acceptance Criteria**: Pattern works correctly with real audio

---

### Test 3.2: Multi-Pattern Test

**Objective**: Verify multiple patterns can use interface simultaneously.

**Test Patterns**:
```cpp
void draw_test_bass(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    if (!AUDIO_IS_FRESH()) return;

    float bass = AUDIO_BASS();
    fill_solid(leds, NUM_LEDS, CRGBF(0, 0, bass));
}

void draw_test_treble(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    if (!AUDIO_IS_FRESH()) return;

    float treble = AUDIO_TREBLE();
    fill_solid(leds, NUM_LEDS, CRGBF(treble, 0, 0));
}

void draw_test_combined(float time, const PatternParameters& params) {
    PATTERN_AUDIO_START();
    if (!AUDIO_IS_FRESH()) return;

    float bass = AUDIO_BASS();
    float treble = AUDIO_TREBLE();
    fill_solid(leds, NUM_LEDS, CRGBF(treble, 0, bass));
}
```

**Validation Steps**:
1. Add all three patterns
2. Rapidly switch between patterns
3. Verify each pattern works independently

**Expected Result**:
- [ ] All patterns compile
- [ ] Pattern switching works smoothly
- [ ] No cross-pattern interference
- [ ] Static variables track per-pattern state

**Acceptance Criteria**: Multiple patterns coexist safely

---

### Test 3.3: Performance Test

**Objective**: Verify interface has minimal performance impact.

**Test Setup**:
1. Measure FPS before adding interface
2. Add interface to existing pattern
3. Measure FPS after

**Test Code**:
```cpp
// Add to main loop
static uint32_t last_fps_report = 0;
static uint32_t frame_count = 0;

frame_count++;

if (millis() - last_fps_report > 1000) {
    float fps = frame_count / 1.0;
    Serial.printf("FPS: %.1f\n", fps);

    frame_count = 0;
    last_fps_report = millis();
}
```

**Expected Result**:
- [ ] FPS degradation < 5% (negligible)
- [ ] Target FPS: >= 100 (ideal 120)
- [ ] No frame drops or stuttering

**Acceptance Criteria**: Performance impact minimal

---

### Test 3.4: Memory Usage Test

**Objective**: Verify interface doesn't cause memory leaks.

**Test Code**:
```cpp
void test_memory_usage() {
    uint32_t free_heap_start = ESP.getFreeHeap();
    Serial.printf("Free heap at start: %u bytes\n", free_heap_start);

    // Call interface 1000 times
    for (int i = 0; i < 1000; i++) {
        PATTERN_AUDIO_START();
        float bass = AUDIO_BASS();
        (void)bass;  // Prevent optimization
    }

    uint32_t free_heap_end = ESP.getFreeHeap();
    Serial.printf("Free heap at end: %u bytes\n", free_heap_end);

    int32_t delta = (int32_t)free_heap_end - (int32_t)free_heap_start;
    Serial.printf("Heap delta: %d bytes\n", delta);

    if (abs(delta) > 100) {
        Serial.println("WARNING: Possible memory leak");
    }
}
```

**Expected Result**:
- [ ] Heap usage stable (delta < 100 bytes)
- [ ] No memory leaks
- [ ] Free heap > 200 KB (acceptable overhead)

**Acceptance Criteria**: No memory leaks

---

## Validation Stage 4: Edge Case Tests

### Test 4.1: Silence Detection Test

**Objective**: Verify pattern handles silence gracefully.

**Test Procedure**:
1. Play music (LEDs should respond)
2. Stop music abruptly
3. Wait 5 seconds
4. Observe LED behavior

**Expected Result**:
- [ ] LEDs fade gradually on silence
- [ ] AUDIO_IS_STALE() returns true after >50ms
- [ ] No crashes or freezes
- [ ] Pattern degrades gracefully

**Acceptance Criteria**: Silence handled gracefully

---

### Test 4.2: Very Loud Audio Test

**Objective**: Verify pattern handles very loud audio.

**Test Procedure**:
1. Play music at maximum volume
2. Monitor LED behavior
3. Check for clipping or saturation

**Expected Result**:
- [ ] No crashes or exceptions
- [ ] Auto-ranging handles loud audio
- [ ] Values don't exceed 1.0 (clamping works)
- [ ] Visual response is smooth

**Acceptance Criteria**: Loud audio handled correctly

---

### Test 4.3: Rapid Pattern Switching Test

**Objective**: Verify no race conditions during pattern changes.

**Test Procedure**:
1. Rapidly switch between patterns (every 100ms)
2. Continue for 30 seconds
3. Monitor for crashes or glitches

**Expected Result**:
- [ ] No crashes
- [ ] No memory corruption
- [ ] Static variables tracked per-pattern
- [ ] Smooth transitions

**Acceptance Criteria**: Pattern switching safe

---

### Test 4.4: Long Runtime Test

**Objective**: Verify stability over extended operation.

**Test Procedure**:
1. Flash firmware with test pattern
2. Run continuously for 30 minutes
3. Monitor serial output for errors

**Expected Result**:
- [ ] No crashes or resets
- [ ] FPS remains stable
- [ ] Memory usage stable
- [ ] Audio reactivity remains accurate

**Acceptance Criteria**: Stable for 30+ minutes

---

## Validation Stage 5: Documentation Tests

### Test 5.1: Example Code Compilation

**Objective**: Verify all example code in documentation compiles.

**Test Procedure**:
1. Extract each example from `PATTERN_AUDIO_API_REFERENCE.md`
2. Compile each example
3. Verify clean compilation

**Examples to Test**:
- [ ] Quick Start example
- [ ] Pattern 1: Basic Spectrum Visualizer
- [ ] Pattern 2: Beat-Reactive Pulse
- [ ] Pattern 3: Frequency Bands RGB
- [ ] Pattern 4: Musical Notes (Chromagram)
- [ ] Pattern 5: Center-Origin Spectrum
- [ ] Pattern 6: With Fallback Behavior

**Expected Result**: All examples compile without errors

**Acceptance Criteria**: Documentation examples are accurate

---

### Test 5.2: Migration Example Validation

**Objective**: Verify migration examples are correct.

**Test Procedure**:
1. Test "BEFORE" code (should work but be unsafe)
2. Test "AFTER" code (should work and be safe)
3. Compare functionality (should be identical)

**Expected Result**:
- [ ] BEFORE code compiles (legacy compatibility)
- [ ] AFTER code compiles (new interface)
- [ ] Both produce same visual output
- [ ] AFTER code is thread-safe

**Acceptance Criteria**: Migration examples accurate

---

## Final Validation Summary

### Checklist Completion

**Stage 1: Compilation Tests**
- [ ] Header compilation
- [ ] Macro expansion
- [ ] Helper functions
- [ ] Include guards

**Stage 2: Functionality Tests**
- [ ] PATTERN_AUDIO_START() behavior
- [ ] Freshness detection
- [ ] Array accessor bounds
- [ ] Helper function validation
- [ ] Age calculation

**Stage 3: Integration Tests**
- [ ] Simple pattern test
- [ ] Multi-pattern test
- [ ] Performance test
- [ ] Memory usage test

**Stage 4: Edge Case Tests**
- [ ] Silence detection
- [ ] Very loud audio
- [ ] Rapid pattern switching
- [ ] Long runtime test

**Stage 5: Documentation Tests**
- [ ] Example code compilation
- [ ] Migration example validation

### Success Criteria Summary

**Must Pass**:
- All compilation tests (100%)
- All functionality tests (100%)
- Performance FPS >= 100
- Memory stable (no leaks)
- Thread-safe (no race conditions)

**Should Pass**:
- Edge case tests (80%+)
- Documentation examples (100%)
- Long runtime test (30+ min)

### Performance Targets

| Metric | Target | Measured | Pass/Fail |
|--------|--------|----------|-----------|
| FPS | >= 100 | ___ | ___ |
| Audio update rate | ~100 Hz | ___ | ___ |
| Free RAM | >= 200 KB | ___ | ___ |
| Snapshot copy time | < 50 μs | ___ | ___ |
| Memory leak | 0 bytes | ___ | ___ |

---

## Validation Report Template

```
PHASE 2 VALIDATION REPORT
Date: _______________
Tester: _______________

COMPILATION TESTS: [ ] Pass [ ] Fail
  - Details: _______________

FUNCTIONALITY TESTS: [ ] Pass [ ] Fail
  - Details: _______________

INTEGRATION TESTS: [ ] Pass [ ] Fail
  - FPS: _______
  - RAM: _______

EDGE CASE TESTS: [ ] Pass [ ] Fail
  - Issues: _______________

DOCUMENTATION TESTS: [ ] Pass [ ] Fail
  - Issues: _______________

OVERALL STATUS: [ ] PASS [ ] FAIL

NOTES:
_______________
_______________
_______________

SIGN-OFF: _______________
```

---

## Next Steps

Upon successful validation:
1. Mark Phase 2 as COMPLETE
2. Begin Phase 3 (Pattern Migration)
3. Update `IMPLEMENTATION_PLAN_AUDIO_SYNC.md`
4. Create git commit with Phase 2 deliverables

Upon failure:
1. Document specific failures
2. Fix issues in `pattern_audio_interface.h`
3. Re-run validation tests
4. Iterate until all tests pass

---

## Document Status

**Phase**: 2 (Pattern Interface)
**Status**: Ready for Validation
**Last Updated**: 2025-10-26
**Validated**: [ ] Yes [ ] No
