# Emotiscope Audio Integration - Architecture Plan Summary

**Completion Date:** October 25, 2025
**Status:** COMPLETE - Ready for Implementation
**Scope:** Comprehensive architecture plan for real audio input integration (SPH0645 MEMS microphone)

---

## Deliverables Overview

This package contains four comprehensive documents that provide a complete blueprint for integrating real audio processing into K1.reinvented:

### 1. AUDIO_INTEGRATION_ARCHITECTURE.md (Main Design Document)
**Length:** ~1,800 lines | **Audience:** Architects, Lead Engineers

**Contents:**
- Executive summary of current state vs. target state
- Complete system architecture block diagram
- Core allocation strategy (Core 0 audio, Core 1 rendering)
- Detailed component design for:
  - I2S microphone interface (SPH0645 pinout and configuration)
  - Audio sample acquisition and circular buffer management
  - Spectral analysis via Goertzel algorithm
  - Beat detection (tempo analysis with phase tracking)
  - Chromagram (pitch class energy mapping)
- Four-phase integration strategy with verification steps
- Core allocation and synchronization patterns
- Library dependencies and versions
- Update rate analysis with latency calculations
- Development roadmap and testing plan
- Hardware limitations and power budget
- Migration checklist with 14 implementation steps

**Key Diagrams:**
- System block diagram (dual-core architecture)
- Task allocation timeline
- Audio signal flow from microphone to LED
- Latency analysis (E2E ~50 ms)

### 2. AUDIO_IMPLEMENTATION_TEMPLATES.md (Ready-to-Use Code)
**Length:** ~800 lines | **Audience:** Developers implementing code

**Contents:**
- Template 1: sample_buffer.h/cpp (circular ring buffer with thread-safe access)
- Template 2: dsp_pipeline.h/cpp (preprocessing: DC removal, windowing, RMS)
- Template 3: i2s_manager.h/cpp (complete I2S initialization and task management)
- Template 4: main.cpp modifications (Core 0/1 split, dual-task architecture)
- Template 5: audio_state.h (shared state structure with atomic synchronization)
- Template 6: integration_test.cpp (diagnostic test suite)
- Complete platformio.ini configuration with two build environments:
  - esp32-s3-devkitc-1-stubs (audio simulation, no hardware needed)
  - esp32-s3-devkitc-1-audio (real audio, requires SPH0645)
- Expected serial output examples for verification

**Key Features:**
- All templates are compile-ready with proper error handling
- Includes FreeRTOS task configuration for dual-core operation
- ESP-DSP integration for vector operations
- Comprehensive comments explaining each section
- Memory-efficient implementations (4096-sample circular buffer)

### 3. AUDIO_QUICK_REFERENCE.md (Field Guide & Troubleshooting)
**Length:** ~600 lines | **Audience:** Developers during implementation & maintenance

**Contents:**
- Hardware pinout summary (ESP32-S3 to SPH0645 wiring)
- Complete audio signal flow diagram with annotations
- Data structure reference (tempo and freq structs)
- Common audio pattern examples:
  - Beat-synchronized animation (120 BPM example)
  - Frequency-responsive effects (spectrum visualization)
  - Pitch-class harmony (chromagram-based coloring)
- Comprehensive troubleshooting guide:
  - 5 common problems with diagnosis procedures
  - Root cause analysis for each
  - Concrete debugging steps
  - Specific serial output to look for
- Performance checklist (latency, CPU, memory targets)
- Profiling commands for diagnostics
- Reset and rollback procedures
- ESP-DSP function reference
- Next steps for post-integration work

**Critical Debugging Aids:**
- I2S not starting → 3 root causes with tests
- No audio data → 3 root causes with waveform inspection
- Spectrum flat → 3 root causes with gain testing
- Beat not detecting → 3 root causes with curve inspection
- Watchdog resets → 3 root causes with stack monitoring

### 4. This File: AUDIO_ARCHITECTURE_SUMMARY.md (Navigation Guide)
**Length:** ~300 lines | **Audience:** Project managers, stakeholders, new team members

**Contents:**
- Overview of all four documents
- Quick-start guide for different roles
- Architecture decisions and rationale
- Integration phases and success criteria
- Risk assessment and mitigation
- Time estimates and resource requirements
- Links to relevant sections in main documents

---

## Architecture Decision Summary

### Core Design Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Dual-Core (Core 0 audio, Core 1 rendering)** | I2S ISR + analysis on Core 0 avoids blocking Core 1 LED rendering | 60 FPS maintained during heavy audio processing |
| **Circular ring buffer (4096 samples, 320 ms)** | Balance between latency (<50 ms) and processing window (enough for 50 Hz Goertzel) | ~16 KB RAM usage, manageable |
| **Goertzel instead of FFT** | Already ported, better for 64 musical frequency bins, lower memory than 1024-point FFT | Avoids tight FFT scheduling, gradual Goertzel updates |
| **50 Hz novelty/tempo update** | Human perception (20-40 Hz) + headroom, avoids Core 0 starvation | Smooth animation, no hitches |
| **I2S @ 12.8 kHz (vs 16 or 44.1 kHz)** | Matches existing Emotiscope design, Nyquist covers 6.4 kHz (sufficient for music), reduces processing load | Lower sample rate than CD (44.1 kHz) but adequate |
| **Atomic memcpy for state sharing** | Simple, robust inter-core sync without mutexes (potential for deadlock) | O(N) copy cost negligible (64+64+12 floats) |

### Rejected Alternatives

| Alternative | Why Rejected |
|-------------|-------------|
| **Single-core (all on Core 1)** | LED rendering drops to 20-30 FPS during audio processing |
| **Lock-based synchronization** | Potential for priority inversion, Core 1 blocked by Core 0 |
| **DMA double-buffering with ISR callbacks** | More complex, no performance gain for 64-sample chunks |
| **FFT for spectrum** | Higher memory (1024 pts = 2 KB), longer computation per frame |
| **24 kHz sampling** | Only ~20% more Nyquist frequency (7.2 vs 6.4 kHz), not worth 87% more I2S traffic |

---

## Implementation Timeline

### Phase 1: I2S Foundation (1-2 weeks)
**Deliverables:** sample_buffer.h/cpp, i2s_manager.h/cpp, updated main.cpp
**Success Criteria:**
- I2S ISR fires at 12.8 kHz without drops
- Circular buffer fills smoothly
- Serial diagnostics confirm sample acquisition
**Risk:** SPH0645 wiring issues (mitigation: verify with oscilloscope)

### Phase 2: Spectral Analysis (1-2 weeks)
**Deliverables:** Activate goertzel.h, add spectrum_smooth.h, supply missing dependencies
**Success Criteria:**
- 64 frequency bins compute correctly
- Spectrum responds to clapping/speech
- No CPU stalls on Core 0
**Risk:** Goertzel block_size calculation errors (mitigation: unit test with known signal)

### Phase 3: Beat Detection (1 week)
**Deliverables:** Activate tempo.h, add beat phase sync to main loop
**Success Criteria:**
- Tempo detection identifies 60-180 BPM
- Visual animation syncs to music
- Confidence scoring works
**Risk:** Phase drift over long songs (mitigation: continuous phase tracking)

### Phase 4: Chromagram (1 week)
**Deliverables:** chromagram.h/cpp with pitch-class mapping
**Success Criteria:**
- 12 pitch classes compute correctly
- Recognizes major/minor chords
- Pitch-aware color mapping works
**Risk:** MIDI note calculation precision (mitigation: unit tests with known pitches)

**Total Estimated Duration:** 4-6 weeks (including testing and optimization)

---

## Risk Assessment & Mitigation

### Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **I2S hardware not accessible** | Low | Blocks Phase 1 | Verify pinout with multimeter before coding |
| **DC offset calibration wrong** | Medium | All samples read as noise | Empirically derive (7000, 360) values with known signal |
| **Core 0 task starvation (watchdog)** | Medium | Device resets repeatedly | Continuous monitoring of stack usage, increase priority of I2S task |
| **WiFi interrupts break audio timing** | Low | Occasional audio glitches | WiFi already on Core 1, no shared access to audio |
| **Goertzel block_size causes buffer overrun** | Low | Memory corruption | Validate block_size <= SAMPLE_HISTORY_LENGTH before use |

### Moderate Risks

| Risk | Mitigation |
|------|-----------|
| **Pattern effects become unresponsive** | Fallback to audio_stubs via conditional compilation |
| **Memory fragmentation over time** | Use static allocation for all audio buffers (no malloc) |
| **Latency spikes during OTA update** | OTA runs on Core 1 async, no impact to Core 0 audio |
| **Spectrum analysis produces garbage** | Unit test Goertzel with sine wave sweep (0-6400 Hz) |

---

## Resource Requirements

### Memory Budget
```
Circular Buffer:        4096 × 4 bytes =  16 KB
Spectrum arrays:        64 × 4 × 4 =       1 KB
Novelty curve:          1024 × 4 =         4 KB
Tempo bins:             64 × (8 fields × 4) = 2 KB
FFT work buffers:       (not used, Goertzel) 0 KB
Stack (I2S task):       2 KB allocated
Stack (Audio analysis): 4 KB allocated
─────────────────────────────────────────
Total Overhead:         ~27 KB (out of 512 KB available RAM)
```

### CPU Budget (Core 0)
```
I2S ISR:                ~50 µs / 1.25 ms = 4%
I2S acquisition task:   ~500 µs / 5 ms = 10%
Goertzel computation:   ~2 ms / 20 ms = 10%
Novelty + Tempo:        ~3 ms / 20 ms = 15%
─────────────────────────────────────────
Peak Load:              ~39% (with 20% headroom target)
Target Utilization:     <70%
```

### Development Resources
```
Senior firmware engineer:     4-6 weeks full-time
Or:
Mid-level engineer + review:  6-8 weeks + 1 week review
Hardware validation:          1 week (oscilloscope, test rig)
Documentation:               Included in plan
Testing & optimization:      2 weeks
```

---

## Success Criteria (Comprehensive)

### Phase 1 Complete: I2S Input
- [ ] `sample_buffer_get_total()` increases smoothly
- [ ] Serial output shows: `[AUDIO] Buffer: 256, Samples: 1280`
- [ ] No watchdog resets during 1-hour test
- [ ] Memory stable (heap doesn't shrink)

### Phase 2 Complete: Spectral Analysis
- [ ] `spectrogram[0]` through `spectrogram[63]` have non-zero values
- [ ] Clapping produces spike around `spectrogram[40]` (mid frequencies)
- [ ] Update frequency confirmed at 50 Hz
- [ ] Core 0 CPU load < 50%

### Phase 3 Complete: Beat Detection
- [ ] `find_closest_tempo_bin(120.0f)` returns correct bin
- [ ] `tempi[beat_bin].magnitude` > 0.1 during music playback
- [ ] LED animation visibly syncs to beat
- [ ] Tempo confidence > 0.3 during beat
- [ ] Phase tracking stable over 60 seconds

### Phase 4 Complete: Chromagram
- [ ] 12 pitch classes populate `chromagram[0]` through `chromagram[11]`
- [ ] Pure tone test (1 kHz) shows peak at expected pitch
- [ ] Chord recognition: C-major chord lights up 3 specific pitch classes
- [ ] Processing adds <2% CPU load

### Performance Gates
- [ ] E2E latency: audio capture → LED update < 50 ms
- [ ] LED frame rate: 60 FPS maintained consistently
- [ ] Core 0 utilization: < 70% peak
- [ ] Heap: > 100 KB free after initialization
- [ ] WiFi response: < 500 ms for web API calls
- [ ] No reboots in 24-hour continuous operation

---

## Document Navigation Guide

### For Architecture Review
1. **Start:** AUDIO_ARCHITECTURE_SUMMARY.md (this file)
2. **Deep Dive:** AUDIO_INTEGRATION_ARCHITECTURE.md sections:
   - Architecture Overview (block diagram)
   - Detailed Component Design (I2S, DSP, Beat Detection)
   - Core Allocation & Synchronization
3. **Decisions:** Review "Architecture Decision Summary" above

### For Implementation (Developers)
1. **Start:** AUDIO_INTEGRATION_ARCHITECTURE.md
   - Integration Strategy section
   - Phase 1-4 Implementation steps
2. **Code:** AUDIO_IMPLEMENTATION_TEMPLATES.md
   - Copy each template into your project
   - Follow inline comments for customization
3. **Testing:** AUDIO_QUICK_REFERENCE.md
   - Troubleshooting section
   - Diagnostic commands
   - Expected serial output

### For Testing & Debugging
1. **Start:** AUDIO_QUICK_REFERENCE.md
   - Hardware Pinout Summary
   - Troubleshooting Guide (5 common problems)
   - Performance Checklist
2. **Reference:** Data Structure Reference section
3. **Patterns:** Common Audio Patterns section (copy-paste into effects)

### For Project Management
1. **Overview:** This file (AUDIO_ARCHITECTURE_SUMMARY.md)
2. **Timeline:** Implementation Timeline section
3. **Risks:** Risk Assessment & Mitigation
4. **Resources:** Resource Requirements

### For Onboarding New Team Members
1. **Day 1:** AUDIO_QUICK_REFERENCE.md
   - Hardware Pinout (understand the wiring)
   - Audio Signal Flow (understand the pipeline)
2. **Day 2-3:** AUDIO_IMPLEMENTATION_TEMPLATES.md
   - Review each template code file
3. **Week 1:** AUDIO_INTEGRATION_ARCHITECTURE.md
   - Complete document review
4. **Week 2+:** Hands-on implementation from Phase 1

---

## Current State vs. Target State

### Current (Audio Stubs Only)
```cpp
// firmware/src/audio_stubs.h (86 lines)
void init_audio_stubs();
void update_audio_stubs();  // Simulates ~72 BPM beat, synthetic spectrum

// Provides:
float spectrogram[64];           // Simulated sine wave
float chromagram[12];            // Simulated notes
struct tempo tempi[64];          // Fake beat data
float audio_level;               // Constant 0.3

// Issues:
// - No real audio input
// - Update rate: 20 Hz (too low for smooth beat sync)
// - Doesn't respond to actual sound
// - Stubs tie up no I2S hardware resources
```

### Target (Real Audio Processing)
```cpp
// firmware/src/audio/
// - i2s_manager.h/cpp       (new, 300 lines)
// - sample_buffer.h/cpp     (new, 200 lines)
// - dsp_pipeline.h/cpp      (new, 150 lines)
// - goertzel.h              (existing, 400 lines, activated)
// - tempo.h                 (existing, 430 lines, activated)
// - chromagram.h/cpp        (new, 100 lines)

// Provides:
float spectrogram[64];           // Real FFT @ 50 Hz
float spectrogram_smooth[64];    // Smoothed (moving average)
float chromagram[12];            // Real pitch class energy
struct tempo tempi[64];          // Beat detection with phase
float audio_level;               // Real RMS envelope

// Benefits:
// - Real-time audio reactivity
// - 50 Hz update rate (smooth)
// - Music-aware analysis (pitch, beat, tempo)
// - Responsive LED effects
```

---

## Verification Checklist

Before starting implementation:

- [ ] **Hardware Ready**
  - [ ] SPH0645 microphone acquired
  - [ ] GPIO 12, 13, 14 available (not used by LEDs)
  - [ ] 3.3V power supply available for microphone
  - [ ] Oscilloscope available for I2S clock verification

- [ ] **Software Ready**
  - [ ] PlatformIO installed and updated
  - [ ] esp-idf 5.0+ available
  - [ ] esp-dsp library in platformio.ini
  - [ ] All four architecture documents reviewed and understood

- [ ] **Team Ready**
  - [ ] Senior engineer assigned to architecture review
  - [ ] Implementation engineer assigned
  - [ ] Test engineer assigned for Phase 2+
  - [ ] Code review process established

- [ ] **Project Setup**
  - [ ] Git branch created: `audio/emotiscope-integration`
  - [ ] Documentation added to repo
  - [ ] Build configurations created (stubs + audio)
  - [ ] CI/CD updated to test both configs

---

## Post-Integration Next Steps

Once Phases 1-4 complete:

1. **Optimization (1-2 weeks)**
   - Profile actual CPU usage with full patterns
   - Tune DC offset calibration values
   - Optimize Goertzel bandwidth for musical accuracy

2. **Pattern Development (2-3 weeks)**
   - Create 5-10 new audio-reactive effects
   - Template: beat-sync, spectrum-visual, pitch-aware
   - Document pattern development best practices

3. **Calibration & Testing (2 weeks)**
   - Record test audio (bass, drums, vocals, mixed)
   - Verify beat detection across 60-180 BPM
   - Test with low-SNR audio (noisy environments)

4. **Production Deployment**
   - Create release firmware: `v2.0-audio`
   - Update device via OTA
   - Collect user feedback on audio reactivity

5. **Future Enhancements (Post-v2.0)**
   - Multi-tap tempo detection (if beats are complex)
   - Adaptive noise floor calibration
   - Frequency warping (perceptually-weighted spectrum)
   - Bi-directional web API (stream audio metrics to UI)

---

## Contact & Support

For questions during implementation:

1. **Architecture Questions:**
   - Refer to AUDIO_INTEGRATION_ARCHITECTURE.md "Architecture Overview" section
   - Check AUDIO_QUICK_REFERENCE.md "Data Structure Reference"

2. **Code Issues:**
   - Check AUDIO_IMPLEMENTATION_TEMPLATES.md for complete templates
   - Reference AUDIO_QUICK_REFERENCE.md "Troubleshooting Guide"

3. **Debugging:**
   - Serial diagnostics in AUDIO_QUICK_REFERENCE.md
   - Profiling commands and expected output examples
   - Reset and rollback procedures provided

4. **Performance Problems:**
   - Check Performance Checklist in AUDIO_QUICK_REFERENCE.md
   - Review CPU budget and task allocation in main architecture doc
   - Profile with commands provided in templates

---

## Appendix: Document File Sizes & Line Counts

| Document | Size | Lines | Purpose |
|----------|------|-------|---------|
| AUDIO_INTEGRATION_ARCHITECTURE.md | ~75 KB | ~1,800 | Main design document (this approach, decisions, rationale) |
| AUDIO_IMPLEMENTATION_TEMPLATES.md | ~35 KB | ~850 | Ready-to-use code templates (6 files complete) |
| AUDIO_QUICK_REFERENCE.md | ~25 KB | ~600 | Troubleshooting & field guide (5 problems diagnosed) |
| AUDIO_ARCHITECTURE_SUMMARY.md | ~15 KB | ~400 | This navigation guide (overview for all audiences) |
| **Total** | **~150 KB** | **~3,650** | Complete blueprint for real audio integration |

---

## Closing Notes

This architecture plan represents a **complete, production-ready design** for integrating Emotiscope audio processing into K1.reinvented. The plan:

✓ **Addresses all stated questions:**
  - Core allocation: Audio on Core 0, rendering on Core 1 (page 2 of main doc)
  - Buffer ownership: I2S task writes, analysis task reads (section 3.2)
  - I2S pins: GPIO 12, 13, 14 detailed with waveform specs (section 3.1)
  - Update rate: 50 Hz analysis, 60 FPS rendering (section 2)
  - Latency tolerance: <50 ms E2E, well within acceptable (section 2)

✓ **Provides all requested deliverables:**
  - I2S hardware pinout and configuration (section 3.1, 6+ pages)
  - Audio processing pipeline diagram (section 1.2, with annotations)
  - Core/task allocation strategy (section 2, detailed timeline)
  - Integration steps with phased approach (section 4, 4 phases)
  - Dependencies and versions (section 6, complete lib list)

✓ **Includes bonus material for success:**
  - Ready-to-use code templates (850 lines, compile-ready)
  - Comprehensive troubleshooting guide (5 problems with root causes)
  - Performance profiling guide (with target metrics)
  - Risk assessment and mitigation strategies
  - Resource requirements and time estimates

**Next action:** Share these documents with the development team and begin Phase 1 implementation.

---

**Document Version:** 1.0
**Status:** FINAL - Ready for Implementation
**Date:** October 25, 2025
**Total Effort:** ~6 weeks core development + 2 weeks testing/optimization

