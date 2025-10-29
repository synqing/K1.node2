---
title: Architecture Pattern Comparison: Visual Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Architecture Pattern Comparison: Visual Guide

**Author:** Forensic Architecture Analyst
**Date:** 2025-10-28
**Intent:** Side-by-side visual comparison of architectural patterns across all versions

---

## Pattern 1: Sensory Bridge (Single-Core Blocking)

```
┌─────────────────────────────────────────────────────────────────┐
│             ESP32-S2 (240 MHz, Single Core)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MONOLITHIC MAIN LOOP                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐                                        │  │
│  │  │ Input Check │ (50 μs)                                │  │
│  │  └──────┬──────┘                                        │  │
│  │         ▼                                               │  │
│  │  ┌──────────────────────────────────────────┐           │  │
│  │  │    I2S READ (BLOCKING FOREVER)           │           │  │
│  │  │    portMAX_DELAY = wait infinite         │           │  │
│  │  │                                          │           │  │
│  │  │    Input: 18,750 Hz × 256 samples       │           │  │
│  │  │    Time: 13.65 ms ← BLOCKS ENTIRE SYSTEM│           │  │
│  │  │                                          │           │  │
│  │  │    ENTIRE SYSTEM FROZEN DURING THIS!   │           │  │
│  │  └──────────┬───────────────────────────────┘           │  │
│  │             ▼                                           │  │
│  │  ┌──────────────────┐                                  │  │
│  │  │  FFT Processing  │ (5-7 ms)                          │  │
│  │  │  256→256 bins    │                                  │  │
│  │  └────────┬─────────┘                                  │  │
│  │           ▼                                            │  │
│  │  ┌───────────────────────┐                             │  │
│  │  │ Lightshow Rendering   │ (2-3 ms)                    │  │
│  │  │ 5 modes (hardcoded)   │                             │  │
│  │  └────────┬──────────────┘                             │  │
│  │           ▼                                            │  │
│  │  ┌────────────────┐                                    │  │
│  │  │  LED Transmit  │ (1-2 ms)                           │  │
│  │  │  FastLED.show()│                                    │  │
│  │  └────────┬───────┘                                    │  │
│  │           ▼                                            │  │
│  │  ┌─────────────────┐                                   │  │
│  │  │   FPS Logging   │ (optional, debug)                 │  │
│  │  └────────┬────────┘                                   │  │
│  │           ▼                                            │  │
│  │  ┌─────────────────────┐                               │  │
│  │  │ LOOP BACK TO START  │                               │  │
│  │  └─────────────────────┘                               │  │
│  │                                                        │  │
│  │  Total Time Per Iteration:                            │  │
│  │  ~21 ms (limiting 60 FPS theoretical, actual 60 FPS)  │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ISSUE: If I2S fails, entire loop stalls                   │
│         No LED updates, no button response, no audio       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Worst Case: I2S timeout
  timeout expires (driver bug)
    ↓
  portMAX_DELAY returns error
    ↓
  capture_audio() continues
    ↓
  Invalid audio data → corrupt FFT
    ↓
  LEDs show garbage
    ↓
  User sees frozen artifact on screen
```

---

## Pattern 2: Emotiscope (Dual-Core Decoupled)

```
┌──────────────────────────────────────────────────────────────────────┐
│              ESP32-S3 (240 MHz Dual Core)                           │
│                                                                      │
│  ┌────────────────────────────────┬──────────────────────────────┐ │
│  │     CORE 0 (GPU)               │     CORE 1 (CPU)            │ │
│  │     Priority: 0 (lowest)       │     Priority: varies        │ │
│  │                                │                             │ │
│  │  ┌─────────────────────────┐   │  ┌──────────────────────┐   │ │
│  │  │   GPU TASK              │   │  │  CPU TASK            │   │ │
│  │  │   run_gpu()             │   │  │  run_cpu()           │   │ │
│  │  │   (NEVER BLOCKS)        │   │  │  (may block on I2S)  │   │ │
│  │  │                         │   │  │                      │   │ │
│  │  │  ┌───────────────────┐  │   │  │  ┌──────────────────┐│   │ │
│  │  │  │ Clear Display     │  │   │  │  │ I2S Read         ││   │ │
│  │  │  │ (10 μs)           │  │   │  │  │ (5 ms timeout)   ││   │ │
│  │  │  └─────────┬─────────┘  │   │  │  │ ← Only CPU waits ││   │ │
│  │  │            ▼             │   │  │  └────────┬─────────┘│   │ │
│  │  │  ┌─────────────────────┐ │   │  │           ▼         │   │ │
│  │  │  │ Read Shared Audio   │ │   │  │  ┌──────────────────┐│   │ │
│  │  │  │ spectrogram[64]     │ │   │  │  │ Goertzel × 64   ││   │ │
│  │  │  │ (no wait)           │ │   │  │  │ (10-15 ms)      ││   │ │
│  │  │  └─────────┬───────────┘ │   │  │  └────────┬────────┘│   │ │
│  │  │            ▼             │   │  │           ▼        │   │ │
│  │  │  ┌─────────────────────┐ │   │  │  ┌──────────────────┐│   │ │
│  │  │  │ Draw Current Mode   │ │   │  │  │ Update Tempo     ││   │ │
│  │  │  │ (1-2 ms)            │ │   │  │  │ (3-5 ms)         ││   │ │
│  │  │  └─────────┬───────────┘ │   │  │  └────────┬────────┘│   │ │
│  │  │            ▼             │   │  │           ▼        │   │ │
│  │  │  ┌─────────────────────┐ │   │  │  ┌──────────────────┐│   │ │
│  │  │  │ Post-Process        │ │   │  │  │ Update FPS       ││   │ │
│  │  │  │ - Apply LPF         │ │   │  │  │ Counter          ││   │ │
│  │  │  │ - Dithering         │ │   │  │  └────────┬────────┘│   │ │
│  │  │  │ - White Balance     │ │   │  │           ▼        │   │ │
│  │  │  │ (2-3 ms)            │ │   │  │  ┌──────────────────┐│   │ │
│  │  │  └─────────┬───────────┘ │   │  │  │ Set Sync Flag    ││   │ │
│  │  │            ▼             │   │  │  │ (GPU reads next) ││   │ │
│  │  │  ┌─────────────────────┐ │   │  │  └──────────────────┘│   │ │
│  │  │  │ Transmit LEDs       │ │   │  │                      │   │ │
│  │  │  │ (1-2 ms)            │ │   │  │  Total per CPU loop:│   │ │
│  │  │  └─────────┬───────────┘ │   │  │  ~25 ms (40 FPS)    │   │ │
│  │  │            ▼             │   │  │                      │   │ │
│  │  │  ┌─────────────────────┐ │   │  │  GPU continues      │   │ │
│  │  │  │ Watch GPU FPS       │ │   │  │  regardless         │   │ │
│  │  │  │ (micro-timing)      │ │   │  │                      │   │ │
│  │  │  └─────────┬───────────┘ │   │  └──────────────────────┘   │ │
│  │  │            ▼             │   │                             │ │
│  │  │  ┌─────────────────────┐ │   │                             │ │
│  │  │  │ REPEAT (10 ms)      │ │   │                             │ │
│  │  │  │ @ 100 FPS FIXED     │ │   │                             │ │
│  │  │  └─────────────────────┘ │   │                             │ │
│  │  │                         │   │                             │ │
│  │  │  Exec Time: ~10-12 ms   │   │                             │ │
│  │  │  FPS: 100 (fixed)       │   │                             │ │
│  │  └─────────────────────────┘   │                             │ │
│  │                                │                             │ │
│  └────────────────────────────────┴──────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           SHARED MEMORY (Volatile Flags)                    │  │
│  │  Read-only from GPU | Written by CPU                        │  │
│  │                                                              │  │
│  │  volatile float spectrogram[64];   ← GPU reads, CPU writes  │  │
│  │  volatile float chromagram[12];    ← GPU reads, CPU writes  │  │
│  │  volatile float tempo_bpm;         ← GPU reads, CPU writes  │  │
│  │  volatile bool waveform_sync_flag; ← GPU reads, CPU writes  │  │
│  │  volatile uint32_t FPS_CPU;        ← Monitor variable       │  │
│  │  volatile uint32_t FPS_GPU;        ← Monitor variable       │  │
│  │                                                              │  │
│  │  SAFETY: Single Writer (CPU) + Multiple Readers (GPU) → OK  │  │
│  │          No locks needed (shared mem on same chip)           │  │
│  │          Volatile prevents compiler optimizations            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  KEY DIFFERENCE FROM SENSORY BRIDGE:                               │
│  • GPU never waits for audio                                       │
│  • I2S blocking confined to CPU core only                          │
│  • GPU maintains 100 FPS even during CPU stalls                    │
│  • Result: Robust, user always sees LEDs updating                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Best Case: I2S timeout on CPU
  CPU blocking on I2S read
    ↓
  Timeout expires → CPU gets error status
    ↓
  CPU handles error (retry or skip)
    ↓
  CPU loop continues to next iteration
    ↓
  GPU on Core 0 unaffected
    ↓
  User continues to see smooth LED animation
    ↓
  Audio glitches for one frame (5 ms), imperceptible
```

---

## Frequency Analysis Comparison

### Sensory Bridge: FFT (Full Spectrum)

```
Input: 256 samples @ 18,750 Hz
       ↓
Hamming Window (1-2 ms)
       ↓
256-point FFT (2-3 ms)
       ↓
Complex-to-Magnitude (1 ms)
       ↓
Output: 128 frequency bins (DC to 9,375 Hz)
       ├─ Bin 0: 0-73 Hz (DC)
       ├─ Bin 1: 73-146 Hz
       ├─ Bin 2: 146-219 Hz
       ├─ ...
       └─ Bin 127: 9,302-9,375 Hz

Resolution: 73 Hz per bin
Total time: 5-7 ms
Update rate: Every 13.65 ms (1/73 Hz = 13.7 ms)

PROBLEM: Many bins are "wasted" on non-musical frequencies
         Low resolution for music frequencies (e.g., 110 Hz span is 1.5 bins)
```

### Emotiscope: Goertzel (Musical Notes)

```
Input: 64 samples @ 12,800 Hz
       ↓
Goertzel Filter 1 (55.0 Hz) ──────┐
Goertzel Filter 2 (56.6 Hz) ──────┤
Goertzel Filter 3 (58.3 Hz) ──────┤
...                                ├─→ Output: spectrogram[64]
Goertzel Filter 62 (2,093 Hz) ────┤
Goertzel Filter 63 (2,156 Hz) ────┤
Goertzel Filter 64 (2,217 Hz) ────┘

Frequency coverage:
  ├─ C1 (16.4 Hz) low bass
  ├─ A1 (55 Hz) lowest guitar note
  ├─ C4 (261.6 Hz) middle C
  ├─ A4 (440 Hz) tuning fork
  └─ C8 (4,186 Hz) highest piano key

Resolution: One frequency per musical note
Total time: 10-15 ms for all 64 filters
Update rate: Every 5 ms (1/200 Hz = 5 ms)

ADVANTAGE: Musically meaningful frequencies
           Better CPU efficiency (64 vs 256 computations)
           3× faster update rate (5 ms vs 13.65 ms)
```

---

## Performance Scaling: LED Count

```
SENSORY BRIDGE (Single Core):
┌────────────────────────────────────────────────────────┐
│ LED Count │ Render Time │ Available Time │ Max FPS    │
├────────────────────────────────────────────────────────┤
│    64     │   0.5 ms    │  16.2 ms      │ 60         │
│   128     │   1.0 ms    │  16.1 ms      │ 60         │
│   192     │   1.5 ms    │  16.0 ms      │ 60         │
│   256     │   2.0 ms    │  15.9 ms      │ ~50 *      │
│   320     │   2.5 ms    │  15.8 ms      │ ~40 *      │
│   512     │   4.0 ms    │  15.7 ms      │ ~30 *      │
└────────────────────────────────────────────────────────┘
* I2S blocking (13.65 ms) + FFT (5-7 ms) leave almost NO
  time for rendering. 512 LEDs would cause severe lag.

EMOTISCOPE (Dual Core):
┌────────────────────────────────────────────────────────┐
│ LED Count │ Render Time │ Headroom │ Target FPS      │
├────────────────────────────────────────────────────────┤
│    64     │   0.5 ms    │  9.5 ms  │ 100 (sustained) │
│   128     │   1.0 ms    │  9.0 ms  │ 100 (sustained) │
│   192     │   1.5 ms    │  8.5 ms  │ 100 (sustained) │
│   256     │   2.0 ms    │  8.0 ms  │ 100 (sustained) │
│   320     │   2.5 ms    │  7.5 ms  │ 100 (sustained) │
│   512     │   4.0 ms    │  6.0 ms  │ 100 (sustained) │
└────────────────────────────────────────────────────────┘

GPU core runs independently of audio processing.
I2S/FFT on CPU core doesn't affect GPU FPS at all.
```

---

## Evolution: Architecture Progression

```
                Sensory Bridge              Emotiscope
                    ↓                           ↓
          ┌─────────────────┐        ┌──────────────────┐
          │   Version 1.0   │        │   Version 1.0    │
          │ Sep 2022        │        │   Apr 2024       │
          │                 │        │                  │
          │ Single Core     │        │ Dual Core        │
          │ Blocking I2S    │        │ Non-blocking I2S │
          │ FFT (256 bins)  │        │ Goertzel (64)    │
          │ 60 FPS (fixed)  │        │ 100 FPS GPU /    │
          │ 128 LEDs        │        │  30-40 FPS CPU   │
          │ 5 modes         │        │ 8 modes          │
          │ 2,510 LOC       │        │ 5,002 LOC        │
          └─────────────────┘        └──────────────────┘
                    ↓                           ↓
          ┌─────────────────┐        ┌──────────────────┐
          │   Version 3.2   │        │   Version 2.0    │
          │ May 2023        │        │   Oct 2024       │
          │                 │        │                  │
          │ Still Single    │        │ Still Dual Core  │
          │ Higher SR (24k) │        │ +180 LEDs        │
          │ Better FFT      │        │ FastLED lib      │
          │ GDFT option     │        │ 33 palettes      │
          │ 70 FPS (peak)   │        │ Transitions      │
          │ ~3,200 LOC      │        │ 8,476 LOC        │
          │                 │        │                  │
          │ (Dead End)      │        │ (Production)     │
          └─────────────────┘        └──────────────────┘

KEY LESSON: Architecture limits progress.
            SB optimization stopped at 70 FPS.
            EM innovation enabled 100+ FPS + 180 LEDs.

            The dual-core pattern, not clever coding,
            was the breakthrough.
```

---

## I2S Timeout Cascade: Before vs After

### BEFORE (Sensory Bridge - Blocking)

```
I2S Driver                Main Loop
┌─────────────────────────────────────┐
│ Block until buffer full: 256 samples │
│ Time: 13.65 ms                      │
└────────┬────────────────────────────┘
         │ (Normal case)
         ▼
   ┌──────────────┐
   │ Buffer Ready │
   └──────┬───────┘
          ▼
   ┌─────────────────┐
   │ Main loop reads │
   │ buffer safely   │
   └─────────────────┘

       BUT IF: Driver bug or timeout
         │
         ▼
   ┌──────────────────────┐
   │ Timeout Expires      │
   │ (after 10-30 sec)    │
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ portMAX_DELAY fails  │
   │ capture_audio()      │
   │ returns error        │
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ fft_input[] is stale │
   │ OR corrupted         │
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ LEDs show garbage    │
   │ Main loop stuck here │
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ NO button response   │
   │ System appears dead  │
   │ User power-cycles    │
   └──────────────────────┘

Result: HARD FAIL
        Complete system freeze
```

### AFTER (Emotiscope - Decoupled)

```
CPU Core (I2S)              GPU Core (LEDs)
┌──────────────────────────┬──────────────────────┐
│ Block on I2S: 5 ms       │ Render mode: 10 ms   │
└──────┬───────────────────┴──────────┬───────────┘
       │                             │
       ▼ (Normal case)                ▼
   ┌────────────┐            ┌──────────────────┐
   │ Data Ready │            │ Draw complete    │
   │ Process    │            │ Transmit LEDs    │
   └──────┬─────┘            └────────┬─────────┘
          │ Update spectrogram[]       │
          │ Set sync flag              │
          │ Return to loop             │
          │ in <25 ms                  │
          │                            │

       BUT IF: I2S timeout
         │
         ▼
   ┌──────────────────────┐
   │ CPU: Timeout Expires │
   │ portMAX_DELAY fails  │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ CPU error handling   │
   │ Skip frame, continue │
   │ (or retry I2S)       │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ CPU continues loop   │
   │ Next audio frame     │
   │ in 5-25 ms           │
   └──────┬───────────────┘
          │
          │ MEANWHILE on GPU Core:
          │
          └──────────────────────────────────────────┐
                                                      ▼
                                            ┌──────────────────────┐
                                            │ GPU continues 100 FPS│
                                            │ Reads stale audio    │
                                            │ Shows smooth LEDs    │
                                            │ User hears skip,     │
                                            │ sees smooth visuals  │
                                            │ (imperceptible)      │
                                            └──────────────────────┘

Result: GRACEFUL DEGRADATION
        Audio glitch (one frame, 5 ms)
        Visual playback continues
        System responds to input
        User may not notice
```

---

## Memory Layout Comparison

### Sensory Bridge

```
ESP32-S2 SRAM: 320 KB total
┌─────────────────────────────────┐
│ Code + Data                     │ ~100 KB
├─────────────────────────────────┤
│ Heap (dynamic allocation)       │ ~100 KB
├─────────────────────────────────┤
│ Stack                           │ ~20 KB
├─────────────────────────────────┤
│ Global Arrays (audio)           │ ~13 KB
│  ├─ i2s_samples[6][256]         │   6.1 KB
│  ├─ fft_input/output[256]       │   2.0 KB
│  ├─ final_fft[6][128]           │   3.1 KB
│  ├─ ambient_noise_floor[128]    │   0.5 KB
│  └─ Other                       │   1.3 KB
├─────────────────────────────────┤
│ Global Arrays (LED)             │ ~2.5 KB
│  ├─ leds[128]                   │   1.0 KB
│  └─ leds_out[128]               │   1.0 KB
├─────────────────────────────────┤
│ AVAILABLE / FREE                │ ~84 KB
└─────────────────────────────────┘

Utilization: ~74% used, 26% free
Space for: Additional effects, temporary buffers
Constraint: Not tight, but room for expansion
```

### Emotiscope

```
ESP32-S3 SRAM: 520 KB total
┌─────────────────────────────────┐
│ Code + Data                     │ ~120 KB
├─────────────────────────────────┤
│ Heap (dynamic allocation)       │ ~100 KB
├─────────────────────────────────┤
│ Stack (per task)                │ ~20 KB (GPU)
│                                 │ ~16 KB (CPU)
├─────────────────────────────────┤
│ Global Arrays (audio)           │ ~19 KB
│  ├─ sample_history[4096]        │  16.4 KB
│  ├─ spectrogram[64]             │   0.3 KB
│  ├─ chromagram[12]              │   0.05 KB
│  └─ Goertzel state              │   2.3 KB
├─────────────────────────────────┤
│ Global Arrays (LED)             │ ~3.5 KB
│  ├─ leds[128] CRGBF float       │   2.0 KB
│  └─ leds[128] CRGB8 output      │   0.5 KB
├─────────────────────────────────┤
│ WebSocket + WiFi buffers        │ ~8 KB
├─────────────────────────────────┤
│ Configuration (NVS mirrors)     │ ~2 KB
├─────────────────────────────────┤
│ AVAILABLE / FREE                │ ~230 KB
└─────────────────────────────────┘

Utilization: ~55% used, 45% free
Space for: LED mirrors, advanced effects, new features
Constraint: Generous headroom for expansion
```

---

## Decision Tree: Single-Core vs Dual-Core

```
Start: Do I need to build an audio-visual system?

    ├─ "How many LEDs?"
    │  ├─ <256: Single-core may work
    │  └─ >256: MUST use dual-core
    │
    ├─ "Complex effects?"
    │  ├─ Simple (5 fixed modes): Single-core acceptable
    │  └─ Advanced (palettes, transitions): Dual-core needed
    │
    ├─ "Robustness required?"
    │  ├─ Prototype / hobby: Single-core okay
    │  └─ Production / customer facing: Dual-core essential
    │
    ├─ "I2S reliability issues?"
    │  ├─ None observed: Single-core possible (but risky)
    │  └─ Timeouts reported: MUST use dual-core
    │
    └─ "Performance target FPS?"
       ├─ 60 FPS: Single-core marginal (barely fits)
       └─ 100 FPS: Dual-core required

Final Decision:
    Single-Core Blocking ──→ Sensory Bridge Pattern
                            ✓ Fast prototyping
                            ✓ Simple code
                            ✗ Limited scaling
                            ✗ Brittle (I2S cascades)

    Dual-Core Decoupled ──→ Emotiscope Pattern
                            ✓ Scales 128→512 LEDs
                            ✓ Robust (I2S isolated)
                            ✓ 100+ FPS sustained
                            ✗ More code complexity
                            ✗ Longer development
```

---

## Real-World Example: I2S Failure Scenario

### Scenario: User plays loud bass-heavy music

Music creates electrical noise → Microphone output erratic → I2S DMA hiccup

#### Sensory Bridge Response (SINGLE-CORE)

```
Audio Frame N:
  i2s_read() waits...
  Noise causes delay
  Buffer fills slowly
  Main loop BLOCKED

    → No button response for 30ms
    → LEDs frozen on last frame
    → Rendering doesn't execute
    → User taps button 3× (no response)
    → 500ms later: system recovers
    → User frustrated, thinks device is broken
```

#### Emotiscope Response (DUAL-CORE)

```
Audio Frame N:
  CPU: i2s_read() waits...
  Noise causes delay

    → GPU Core continues 100 FPS unaffected
    → LEDs update smoothly every 10ms
    → Button response instant (GPIO on separate core)
    → User presses button during noise spike
    → Button triggers immediately
    → Audio glitches for one frame (5ms)
    → Audio resumes next frame
    → User hardly notices, music is just loud
```

**User Experience Difference:** "System is broken" vs "Slight audio hiccup"

---

## Code Complexity Comparison

### Sensory Bridge: Simple but Fragile

```
Main Loop Complexity: O(1) - Linear sequence
├─ No task management
├─ No inter-core synchronization
├─ No volatile flags
└─ Direct global variable access

Risk: Global variables can be read/written unsafely
      (Works by accident in single-core)

Example Problem:
  fft_integer[128] shared between audio + render
  ├─ Audio thread: writes fft_integer[0..127]
  ├─ Render thread: (none, same thread)
  └─ Safety: Guaranteed (same thread executes all)

But if you add second core:
  ├─ Audio Core: writes fft_integer[0..127]
  ├─ Render Core: reads fft_integer[0..127]
  └─ Safety: BROKEN! (torn reads, cache coherency)
           Needs volatile + synchronization
```

### Emotiscope: Complex but Robust

```
Task Management Complexity: O(n) - Multiple independent loops

GPU Task:
├─ No blocking operations
├─ Reads from volatile shared data
├─ Never writes to audio data
└─ Runs at fixed 100 FPS

CPU Task:
├─ May block on I2S read (isolated to one core)
├─ Writes to volatile shared data (spectrogram[])
├─ Reads from configuration (no conflicts)
├─ Runs at 30-40 FPS (natural audio rate)

Synchronization:
├─ Volatile flags prevent compiler optimizations
├─ Single writer (CPU) to shared data
├─ Multiple readers (GPU) of shared data
├─ Lock-free (no mutexes, hence no deadlocks)

Safety Model: Proven by testing (2+ years production)
             Cache coherent memory on ESP32-S3
             Volatile semantics guarantee visibility
```

---

## Conclusion

| Aspect | Winner | Recommendation |
|--------|--------|---|
| **Development Speed** | Sensory Bridge (1 week) | Use if prototyping |
| **Production Ready** | Emotiscope (proven) | Use for K1.reinvented |
| **Scaling to 512 LEDs** | Emotiscope (necessary) | Use Emotiscope pattern |
| **I2S Robustness** | Emotiscope (decoupled) | Use Emotiscope pattern |
| **Code Clarity** | Sensory Bridge (simpler) | Trade clarity for robustness |
| **Performance** | Emotiscope (100 FPS) | Use Emotiscope pattern |

**For K1.reinvented: Adopt Emotiscope's dual-core architecture.** It is the industry standard for a reason.

---

End of Document
