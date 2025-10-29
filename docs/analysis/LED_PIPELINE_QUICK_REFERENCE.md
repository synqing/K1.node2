---
title: LED Rendering Pipeline - Quick Reference
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# LED Rendering Pipeline - Quick Reference

**Status:** Published | **Complexity:** High | **Read Time:** 5 minutes

---

## ARCHITECTURE AT A GLANCE

```
K1.reinvented is a DUAL-CORE REAL-TIME SYSTEM:

┌────────────────────────────────────────────────────────────┐
│ ESP32 Dual-Core Processor                                  │
├────────────────┬─────────────────────────────────────────┤
│ CORE 0         │ CORE 1                                   │
│ (Arduino)      │ (FreeRTOS Task)                          │
├────────────────┼─────────────────────────────────────────┤
│ Rendering      │ Audio Processing                         │
│ 200+ FPS       │ 20-25 Hz                                 │
│ 2-6 ms/frame   │ 30-50 ms/frame                           │
│                │                                          │
│ • Pattern      │ • I2S Microphone (SPH0645)               │
│   execution    │ • Goertzel DFT (15-25 ms)               │
│ • LED          │ • Beat detection                         │
│   transmission │ • Buffer synchronization                 │
│ • Parameter    │                                          │
│   reads        │ (Runs independently, non-blocking)       │
└────────────────┴─────────────────────────────────────────┘
```

---

## EXECUTION TIMELINE

### Per-Frame Rendering (Every 5 ms @ 200 FPS)

```
loop() on Core 0:

0 ms  ┌─────────────────────────────────────────┐
      │ ArduinoOTA.handle()          (<1 ms)     │
      │ Calculate time variable      (<0.1 ms)   │
      │ get_params() [atomic]        (0.1 μs)    │
      │ draw_current_pattern()       (0.5-2 ms)  │ ← Pattern computation
      │                                          │
      │ transmit_leds():                         │
      │   ├─ wait_all_done()        (1-3 ms)     │ ← Waits for previous TX
      │   ├─ memset()               (5 μs)       │
      │   ├─ quantize_color()       (1 ms)       │ ← Float→8-bit conversion
      │   └─ rmt_transmit()         (0.1 ms)     │ ← Enqueue (non-blocking)
      │                                          │
      │ watch_cpu_fps()             (<0.1 μs)    │
      │ print_fps() [1x/sec]        (<1 μs)      │
5 ms  └─────────────────────────────────────────┘
      
Total per frame: 2-6 ms (yields CPU for other tasks)
Achieved FPS: 200+ (5 ms per frame budget easily met)
```

### Per-Frame Audio (Every 40-50 ms @ 20-25 Hz)

```
audio_task() on Core 1:

0 ms  ┌─────────────────────────────────────────────┐
      │ acquire_sample_chunk()      (0 ms I2S)      │
      │ calculate_magnitudes()      (15-25 ms)      │ ← Goertzel DFT
      │ get_chromagram()            (1 ms)          │
      │ update_novelty_curve()      (0.1 ms)        │
      │ smooth_tempi_curve()        (2-5 ms)        │
      │ detect_beats()              (1 ms)          │
      │ finish_audio_frame()        (0-5 ms)        │ ← Mutex + memcpy
      │ vTaskDelay(10 ms)           (10 ms)         │ ← Sleep
40 ms └─────────────────────────────────────────────┘
      
Total per cycle: 30-50 ms
Effective frequency: 20-25 Hz (limited by Goertzel DFT)
```

---

## DATA FLOW: PATTERN → PHYSICAL LED

```
1. PATTERN EXECUTION
   └─→ leds[i] = CRGBF(r, g, b) where r,g,b are 0.0-1.0 floats

2. QUANTIZATION
   └─→ raw_led_data[3*i+0] = (uint8_t)(leds[i].g × brightness × 255)
   └─→ raw_led_data[3*i+1] = (uint8_t)(leds[i].r × brightness × 255)
   └─→ raw_led_data[3*i+2] = (uint8_t)(leds[i].b × brightness × 255)
   
   NOTE: WS2812B expects GRB order, not RGB!
   
3. DITHERING (Temporal)
   └─→ Fractional error distributed across 4-frame cycle
   └─→ Increases effective color depth 8-bit → ~10-bit

4. RMT TRANSMISSION
   └─→ GPIO pin 5 sends WS2812B protocol at 10 MHz clock
   └─→ Format: 24 bits per LED (GRB)
   └─→ Time: 180 LEDs × 24 bits ÷ 10MHz ≈ 5.2 ms
   └─→ Reset: 25 μs low pulse
   
5. PHYSICAL LED UPDATE
   └─→ LEDs receive GRB data serially on single GPIO pin
   └─→ Each LED shifts data to next (daisy chain)
   └─→ Reset pulse latches data into all LEDs simultaneously

TOTAL LATENCY: Pattern calc (0.5-2 ms) + TX time (5.2 ms) ≈ 7-8 ms
```

---

## AUDIO SYNCHRONIZATION

### Double-Buffered Snapshot Access

```
Why? Prevent patterns from reading partially-updated audio data.

How?
┌─────────────────────────────────────────────────────────┐
│ audio_front (Active)                                     │
│ ├─ Read by patterns via get_audio_snapshot()            │
│ └─ Mutex-protected (10 ms timeout)                      │
│                                                          │
│ audio_back (Staging)                                    │
│ ├─ Written by audio_task() Goertzel output              │
│ └─ Swapped to audio_front after commit                  │
└─────────────────────────────────────────────────────────┘

Each snapshot contains:
  • spectrogram[64]          - Raw frequency magnitudes
  • spectrogram_smooth[64]   - Smoothed spectrum
  • chromagram[12]           - Musical note energy
  • tempo_magnitude[64]      - Tempo bin strengths
  • tempo_phase[64]          - Tempo bin phases (for beat sync)
  • vu_level                 - Overall audio level
  • update_counter           - Increments each audio frame
  • timestamp_us             - Microsecond timestamp

Size: 1664 bytes per snapshot × 2 = 3.3 KB total

Timeout: 10 ms (if audio task holds mutexes too long)
  → Pattern gets data 40-50 ms old
  → Pattern detects via AUDIO_IS_STALE() macro
  → Graceful fade instead of hard failure
```

### Pattern Audio Interface

```cpp
Pattern reads audio safely with macros:

void draw_audio_reactive_pattern(float time, const PatternParameters& params) {
    // Step 1: Initialize audio snapshot (MUST be first!)
    PATTERN_AUDIO_START();
    
    // Step 2: Check if data is fresh (optional, optimization)
    if (!AUDIO_IS_FRESH()) return;  // Skip frame if no new audio
    
    // Step 3: Check if data is available (handles timeout case)
    if (!AUDIO_IS_AVAILABLE()) {
        // Fallback to non-audio mode
        fill_solid(leds, NUM_LEDS, CRGBF(0.5, 0.5, 0.5));
        return;
    }
    
    // Step 4: Use audio data (macro-based access)
    for (int i = 0; i < NUM_LEDS; i++) {
        float bass = AUDIO_BASS();              // Bins 0-8 (55-220 Hz)
        float mids = AUDIO_MIDS();              // Bins 16-32 (440-880 Hz)
        float treble = AUDIO_TREBLE();          // Bins 48-63 (1.76-6.4 kHz)
        
        float beat = AUDIO_TEMPO_BEAT(32);      // Sync to tempo bin 32
        float confidence = AUDIO_TEMPO_CONFIDENCE;  // Beat strength
        
        leds[i] = CRGBF(bass, mids, treble);
    }
    
    // Step 5: Handle stale audio (silence detection)
    if (AUDIO_IS_STALE()) {
        // Fade out gradually
        for (int i = 0; i < NUM_LEDS; i++) {
            leds[i].r *= 0.95;
            leds[i].g *= 0.95;
            leds[i].b *= 0.95;
        }
    }
}
```

---

## KEY PERFORMANCE METRICS

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Pattern → LED latency** | 7-8 ms | <10 ms | ✓ |
| **Audio → Visual latency** | 50-60 ms | <100 ms | ✓ |
| **Rendering FPS** | 200+ | >60 | ✓ |
| **Audio update frequency** | 20-25 Hz | >15 Hz | ✓ |
| **RMT transmission time** | 5.2 ms | N/A | Hardware limited |
| **Goertzel computation** | 15-25 ms | N/A | CPU limited |
| **Memory copy overhead** | <0.3% | <5% | ✓ |
| **Mutex timeout frequency** | <1/sec | <1/min | ✓ |

---

## IDENTIFIED BOTTLENECKS

### 1. Goertzel DFT (HIGH - Audio Only)
- **Problem:** 64 bins × 64 samples = 4096 multiply-accumulate ops
- **Impact:** Audio updates only 20-25 Hz (every 40-50 ms)
- **Symptom:** Beat detection lags by 1-2 frames
- **Status:** ACCEPTABLE (adequate for music sync)

### 2. RMT Transmission (MEDIUM - FPS Ceiling)
- **Problem:** WS2812B protocol requires 5.2 ms per 180 LEDs
- **Impact:** Cannot exceed ~200 FPS
- **Symptom:** FPS stable at 200, doesn't go higher
- **Status:** ACCEPTABLE (200 FPS >> 60 Hz human perception)

### 3. Mutex Timeouts (MEDIUM - Edge Case)
- **Problem:** Dual-mutex holds for 5-10 ms during audio commit
- **Impact:** Pattern occasionally gets stale audio (40-50 ms old)
- **Symptom:** Logged warning <1/second, pattern fades gracefully
- **Status:** ACCEPTABLE (handled gracefully)

### 4. Serial Output (LOW - Negligible)
- **Problem:** FPS print to UART once per second
- **Impact:** <0.01% CPU overhead
- **Symptom:** None (imperceptible)
- **Status:** NEGLIGIBLE

---

## BLOCKING OPERATIONS CHECK

**CRITICAL: No blocking operations in rendering loop!**

```
loop() does NOT call:
  ✗ delay() or vTaskDelay()
  ✗ Serial.read() or serial input
  ✗ WiFi operations (AsyncWebServer is non-blocking)
  ✗ File I/O
  ✗ malloc/free
  ✗ Long-held mutexes (only atomic read of params)

Only bounded wait:
  ✓ transmit_leds() → rmt_tx_wait_all_done(timeout=10 ms)
    Normal: <1 ms (previous frame TX complete)
    Worst case: 10 ms hard timeout bound
```

---

## COLOR SPACE & TRANSFORMATIONS

```
Pattern Output: CRGBF struct (0.0-1.0 float per channel)

Transformations:
1. Global brightness scaling × 0.3 (user adjustable)
2. Temporal dithering (4-cycle pattern)
3. Channel rearrangement (RGB → GRB for WS2812B)
4. Quantization to 8-bit unsigned integer

NO gamma correction applied (linear space adequate for music viz)
```

---

## FILE MANIFEST

| File | Size | Purpose |
|------|------|---------|
| main.cpp | 214 | Dual-core architecture, main loop |
| led_driver.h | 162 | RMT transmission, quantization |
| audio/goertzel.h | 150+ | DFT definitions, buffer structures |
| pattern_registry.h | 67 | Pattern selection via function pointers |
| pattern_audio_interface.h | 519 | Thread-safe audio macros for patterns |
| profiler.h | 41 | FPS measurement (16-sample rolling average) |
| parameters.h | 82 | Thread-safe parameter double-buffering |

---

## TROUBLESHOOTING

**Issue: FPS below 200?**
1. Check watch_cpu_fps() output in serial monitor
2. If <200: Profile pattern execution with timers
3. Most likely: Pattern complexity >2 ms (optimize pattern code)
4. If still <200: Check for rogue WiFi operations (unlikely)

**Issue: Audio feels delayed?**
1. This is NORMAL - 40-50 ms latency is expected
2. Pattern should use AUDIO_IS_FRESH() to detect updates
3. If completely stale: Check AUDIO_IS_STALE() detection
4. Goertzel DFT takes 15-25 ms (inherent limitation)

**Issue: LEDs not lighting up?**
1. Check global_brightness (currently 0.3f in led_driver.cpp:14)
2. Verify pattern output: leds[0] = CRGBF(1, 0, 0) for red
3. Check GPIO 5 (LED_DATA_PIN) not used elsewhere
4. Verify WS2812B strip power supply (separate 5V required)

**Issue: Occasional color glitches?**
1. This is NORMAL - temporal dithering changes every 4 frames
2. Appearance of color "dithering" at low brightness is intentional
3. Improves perceived color depth (8-bit → ~10-bit)
4. If glitches are not dithering: Check for mutex timeout warnings

---

## FURTHER READING

- **Detailed Analysis:** `/docs/analysis/led_rendering_pipeline_forensic_analysis.md`
- **Bottleneck Details:** `/docs/analysis/led_rendering_bottleneck_matrix.md`
- **Pattern Development:** See pattern_audio_interface.h for macros and examples
- **Audio System:** See audio/goertzel.h for snapshot structure and constants

