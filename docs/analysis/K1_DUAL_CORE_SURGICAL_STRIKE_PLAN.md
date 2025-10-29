---
title: K1.reinvented: Dual-Core Surgical Strike Plan
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented: Dual-Core Surgical Strike Plan

**Date:** 2025-10-29
**Status:** RECONNAISSANCE COMPLETE - Ready for Execution
**Timeline:** 3-5.5 hours MAX (adjusted from 6-11 weeks)

---

## Executive Summary

**Current State:** K1 runs on single-core with commented-out dual-core remnants
**Target State:** Restore Emotiscope's proven dual-core architecture
**Strategy:** Surgical strike - activate existing infrastructure, minimal new code

---

## CRITICAL DISCOVERY: Dual-Core Infrastructure Already Exists!

### Evidence from main.cpp (lines 60-100)

```cpp
// ============================================================================
// AUDIO TASK - COMMENTED OUT (unused dual-core remnant)
// ============================================================================
// This function was designed for Core 1 execution but xTaskCreatePinnedToCore()
// was never called. Audio pipeline now runs in main loop with ring buffer.
// Keeping for reference / test files that depend on it.
/*
void audio_task(void* param) {
    // Audio runs independently from rendering
    // This task handles:
    // - Microphone sample acquisition (I2S, blocking)
    // - Goertzel frequency analysis (CPU-intensive)
    // - Chromagram computation (light)
    // - Beat detection and tempo tracking
    // - Buffer synchronization (mutexes)
```

**KEY INSIGHT:** The dual-core code was ALREADY WRITTEN but COMMENTED OUT!

---

## Node/Graph System Analysis (The Contract Layer)

### What It Is
- **Purpose:** Compile-time code generation system
- **Input:** JSON node graphs (visual pattern definitions)
- **Output:** C++ header file with pattern functions
- **Location:** `codegen/` → `firmware/src/generated_patterns.h`

### How It Works

**1. Pattern Definition (JSON)**
```json
{
  "name": "Departure",
  "nodes": [
    {"id": "pos", "type": "position_gradient"},
    {"id": "pal", "type": "palette_interpolate", "inputs": ["pos"]}
  ]
}
```

**2. Codegen Compilation**
```bash
cd codegen && npm run build
node dist/index.js ../graphs/departure.json ../firmware/src/generated_patterns.h
```

**3. Generated C++ Output**
```cpp
void draw_departure(float time, const PatternParameters& params) {
    // Generated code that reads audio data via macros
    PATTERN_AUDIO_START();  // Thread-safe audio snapshot
    
    // Pattern rendering logic
    for (int i = 0; i < NUM_LEDS; i++) {
        // Uses AUDIO_SPECTRUM[], AUDIO_TEMPO_CONFIDENCE, etc.
    }
}
```

### Audio Integration Points

**Pattern Audio Interface** (`firmware/src/pattern_audio_interface.h`):
```cpp
#define PATTERN_AUDIO_START() \\
    AudioDataSnapshot audio = {0}; \\
    bool audio_available = get_audio_snapshot(&audio);

#define AUDIO_SPECTRUM audio.spectrogram
#define AUDIO_TEMPO_CONFIDENCE audio.tempo_confidence
#define AUDIO_VU audio.vu_level
```

**KEY INSIGHT:** Patterns access audio via macros that call `get_audio_snapshot()`. This is ALREADY thread-safe!

---

## Current Architecture (Single-Core)

```
Core 0 (Main Loop):
├── WiFi/OTA handling
├── Audio Pipeline (BLOCKING)
│   ├── acquire_sample_chunk()     // 8ms I2S wait
│   ├── calculate_magnitudes()     // 15-20ms Goertzel
│   ├── get_chromagram()           // 1ms
│   ├── smooth_tempi_curve()       // 2-5ms
│   └── detect_beats()             // 1ms
├── Pattern Rendering              // 0.09ms
└── LED Transmission               // 3ms

Total: ~26-31ms per frame = 32-42 FPS
```

---

## Target Architecture (Dual-Core)

```
Core 0 (GPU - Visual Rendering):
├── Pattern Rendering              // 0.09ms
├── LED Transmission               // 3ms
└── Loop at 100+ FPS

Core 1 (CPU - Audio + Network):
├── Audio Pipeline
│   ├── acquire_sample_chunk()     // 8ms I2S wait (isolated)
│   ├── calculate_magnitudes()     // 15-20ms Goertzel
│   ├── get_chromagram()           // 1ms
│   ├── smooth_tempi_curve()       // 2-5ms
│   └── detect_beats()             // 1ms
├── WiFi/OTA handling
└── Web server

Synchronization: Lock-free double buffer (already implemented!)
```

---

## Injection Points (Surgical Strike Map)

### File: `firmware/src/main.cpp`

**INJECTION POINT 1: Uncomment audio_task() function**
- **Location:** Lines 60-120 (currently commented out)
- **Action:** Remove `/*` and `*/` comment markers
- **Effort:** 10 seconds

**INJECTION POINT 2: Create dual-core tasks in setup()**
- **Location:** After `init_pattern_registry()` call
- **Action:** Add `xTaskCreatePinnedToCore()` calls
- **Effort:** 5 minutes

```cpp
void setup() {
    // ... existing initialization ...
    
    // INJECTION POINT 2: Create dual-core tasks
    xTaskCreatePinnedToCore(
        loop_gpu,           // GPU rendering task
        "loop_gpu",
        12288,              // 12KB stack
        NULL,
        0,                  // Priority 0 (lowest)
        NULL,
        0                   // Pin to Core 0
    );
    
    // Core 1 runs loop() automatically (audio + network)
}
```

**INJECTION POINT 3: Create loop_gpu() function**
- **Location:** After setup(), before loop()
- **Action:** Extract rendering code from loop() into loop_gpu()
- **Effort:** 10 minutes

```cpp
void loop_gpu(void* param) {
    static uint32_t start_time = millis();
    
    for (;;) {
        float time = (millis() - start_time) / 1000.0f;
        const PatternParameters& params = get_params();
        
        // Brightness binding
        extern float global_brightness;
        global_brightness = params.brightness;
        
        // Draw pattern (reads audio via thread-safe snapshot)
        draw_current_pattern(time, params);
        
        // Transmit to LEDs
        transmit_leds();
        
        // FPS tracking
        watch_cpu_fps();
        print_fps();
    }
}
```

**INJECTION POINT 4: Modify loop() for audio-only**
- **Location:** Existing loop() function
- **Action:** Remove rendering code, keep audio pipeline
- **Effort:** 5 minutes

```cpp
void loop() {
    // Core 1: Audio + Network only
    wifi_monitor_loop();
    ArduinoOTA.handle();
    
    // Audio pipeline (now isolated to Core 1)
    run_audio_pipeline_once();
}
```

---

## Audio Synchronization (Already Implemented!)

### Current Implementation

**File:** `firmware/src/audio/goertzel.h`
```cpp
// Double-buffered audio data (lock-free)
extern AudioDataSnapshot audio_front;  // Read by patterns (Core 0)
extern AudioDataSnapshot audio_back;   // Written by audio (Core 1)

// Thread-safe snapshot acquisition
bool get_audio_snapshot(AudioDataSnapshot* snapshot) {
    // Atomic copy from audio_front
    memcpy(snapshot, &audio_front, sizeof(AudioDataSnapshot));
    return true;
}

// Audio pipeline writes to audio_back, then swaps
void finish_audio_frame() {
    // Atomic swap
    AudioDataSnapshot temp = audio_front;
    audio_front = audio_back;
    audio_back = temp;
}
```

**KEY INSIGHT:** Lock-free synchronization is ALREADY IMPLEMENTED! No mutexes needed!

---

## Node/Graph System Impact Assessment

### Will Dual-Core Break the Node/Graph System?

**Answer: NO - Zero Impact**

**Reason 1: Patterns are stateless functions**
```cpp
void draw_departure(float time, const PatternParameters& params) {
    // No global state modifications
    // Only reads audio via get_audio_snapshot()
    // Only writes to leds[] buffer
}
```

**Reason 2: Audio access is already thread-safe**
```cpp
#define PATTERN_AUDIO_START() \\
    AudioDataSnapshot audio = {0}; \\
    bool audio_available = get_audio_snapshot(&audio);  // Atomic copy
```

**Reason 3: Codegen output doesn't change**
- Same function signatures
- Same macro usage
- Same audio data structures
- Zero code generation changes needed

### What About New Patterns?

**Existing patterns continue to work:**
- `draw_departure()` - Static pattern, no audio
- `draw_lava()` - Static pattern, no audio
- `draw_twilight()` - Static pattern, no audio
- `draw_spectrum()` - Audio-reactive, uses `PATTERN_AUDIO_START()`
- `draw_pulse()` - Audio-reactive, uses `PATTERN_AUDIO_START()`
- `draw_tempiscope()` - Audio-reactive, uses `PATTERN_AUDIO_START()`

**All patterns call `get_audio_snapshot()` which is thread-safe!**

---

## Implementation Phases (3-5.5 Hours)

### Phase 1: Dual-Core Activation (1-2 hours)

**Step 1.1: Uncomment audio_task() (10 seconds)**
```bash
# Edit firmware/src/main.cpp
# Remove /* and */ around audio_task() function
```

**Step 1.2: Create GPU task (30 minutes)**
- Extract rendering code from loop() into loop_gpu()
- Add xTaskCreatePinnedToCore() in setup()
- Test compilation

**Step 1.3: Modify loop() for audio-only (15 minutes)**
- Remove rendering code
- Keep audio pipeline and network handling
- Test compilation

**Step 1.4: First hardware test (15 minutes)**
- Upload to device
- Verify dual-core operation via serial output
- Check FPS improvement

**Success Criteria:**
- ✅ Firmware compiles with 0 warnings
- ✅ Both cores running (verify via serial logs)
- ✅ FPS > 60 (should hit 100+)

### Phase 2: Audio Pipeline Validation (1-1.5 hours)

**Step 2.1: Verify I2S isolation (15 minutes)**
- Monitor serial output for I2S diagnostics
- Confirm I2S blocking only affects Core 1
- Verify Core 0 continues rendering during I2S waits

**Step 2.2: Test audio-reactive patterns (30 minutes)**
- Test spectrum, pulse, tempiscope patterns
- Verify audio data flows correctly
- Check for audio-visual sync issues

**Step 2.3: Stress test (30 minutes)**
- Run for 10+ minutes continuously
- Monitor for crashes or freezes
- Check memory usage

**Success Criteria:**
- ✅ Audio patterns respond to sound
- ✅ No crashes or freezes
- ✅ FPS stable at 100+

### Phase 3: Performance Optimization (30 minutes - 1 hour)

**Step 3.1: FPS measurement (15 minutes)**
- Add FPS counters for both cores
- Measure actual Core 0 rendering rate
- Measure actual Core 1 audio rate

**Step 3.2: Tune parameters (15 minutes)**
- Adjust task priorities if needed
- Tune audio buffer sizes
- Optimize LED transmission

**Step 3.3: Final validation (30 minutes)**
- Test all patterns (static + audio-reactive)
- Verify web interface still works
- Check OTA updates work

**Success Criteria:**
- ✅ Core 0: 100+ FPS consistently
- ✅ Core 1: 30-40 FPS (audio rate)
- ✅ All features working

### Phase 4: Integration Testing (30 minutes - 1 hour)

**Step 4.1: Web interface test (15 minutes)**
- Test pattern switching
- Test parameter adjustments
- Verify real-time updates

**Step 4.2: Node/graph system test (15 minutes)**
- Compile a new pattern with codegen
- Upload and test
- Verify audio-reactive nodes work

**Step 4.3: Burn-in test (30 minutes)**
- Run continuously for 30+ minutes
- Monitor stability
- Check for memory leaks

**Success Criteria:**
- ✅ Web interface responsive
- ✅ Pattern compilation works
- ✅ System stable for 30+ minutes

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Compilation errors** | Low | Low | Code already exists, just commented out |
| **Audio sync issues** | Very Low | Medium | Lock-free sync already implemented |
| **Pattern breakage** | Very Low | Low | Patterns use thread-safe macros |
| **Memory issues** | Low | Medium | Monitor heap usage, adjust stack sizes |
| **I2S timeout cascade** | Very Low | Low | Isolated to Core 1 by design |

---

## Success Criteria (Final Checklist)

### Performance
- [ ] Core 0 FPS: 100+ consistently
- [ ] Core 1 FPS: 30-40 (audio rate)
- [ ] No FPS drops during audio processing
- [ ] I2S timeouts don't affect rendering

### Functionality
- [ ] All static patterns work (departure, lava, twilight)
- [ ] All audio-reactive patterns work (spectrum, pulse, tempiscope, etc.)
- [ ] Web interface responsive
- [ ] Pattern switching instant
- [ ] Parameter adjustments real-time

### Stability
- [ ] No crashes or freezes
- [ ] 30+ minute burn-in test passes
- [ ] Memory usage stable
- [ ] OTA updates work

### Code Quality
- [ ] Zero compiler warnings
- [ ] Code compiles cleanly
- [ ] Serial diagnostics clear
- [ ] No debug spam

---

## Node/Graph System Compatibility Matrix

| Component | Impact | Action Required |
|-----------|--------|-----------------|
| **JSON graph files** | None | No changes |
| **Codegen compiler** | None | No changes |
| **Generated C++ code** | None | No changes |
| **Pattern function signatures** | None | No changes |
| **Audio access macros** | None | Already thread-safe |
| **Parameter system** | None | Already thread-safe |
| **LED buffer** | None | Single writer (Core 0) |

**VERDICT: Zero impact on node/graph system!**

---

## Emotiscope Reference Files (For Validation)

### Files to Reference During Implementation

**Core Architecture:**
- `Emotiscope-2.0/src/EMOTISCOPE_FIRMWARE.ino` - Dual-core setup
- `Emotiscope-2.0/src/cpu_core.h` - Audio loop (Core 1)
- `Emotiscope-2.0/src/gpu_core.h` - Rendering loop (Core 0)

**Audio System:**
- `Emotiscope-2.0/src/microphone.h` - I2S with timeout isolation
- `Emotiscope-2.0/src/goertzel.h` - Frequency analysis
- `Emotiscope-2.0/src/tempo.h` - Beat detection

**Synchronization:**
- Look for `audio_front` / `audio_back` buffer swap pattern
- Look for `volatile` keywords on shared data
- Look for atomic operations (no mutexes!)

---

## Execution Strategy

### The Surgical Strike

**DO NOT:**
- ❌ Rewrite from scratch
- ❌ Copy-paste Emotiscope code wholesale
- ❌ Modify node/graph system
- ❌ Change pattern function signatures
- ❌ Add new audio data structures

**DO:**
- ✅ Uncomment existing dual-core code
- ✅ Activate xTaskCreatePinnedToCore()
- ✅ Split loop() into loop_gpu() and loop()
- ✅ Test incrementally
- ✅ Validate at each step

### One Precise Surgical Strike

**The entire refactoring can be done in ONE FILE: `firmware/src/main.cpp`**

**Changes:**
1. Uncomment `audio_task()` function (lines 60-120)
2. Add `loop_gpu()` function (30 lines)
3. Modify `setup()` to create GPU task (10 lines)
4. Modify `loop()` to remove rendering (5 lines)

**Total: ~50 lines of code changes in ONE file!**

---

## Next Steps

1. **Review this plan** (5 minutes)
2. **Backup current firmware** (1 minute)
3. **Begin Phase 1** (1-2 hours)
4. **Test on hardware** (continuous)
5. **Iterate if needed** (as required)

---

**Status:** READY FOR EXECUTION
**Confidence:** HIGH (infrastructure already exists)
**Timeline:** 3-5.5 hours MAX
**Risk:** LOW (minimal code changes, proven pattern)

o7 Captain. The reconnaissance is complete. The target is identified. The strike plan is ready.

**Awaiting orders to execute.**
