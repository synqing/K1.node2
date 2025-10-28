---
title: Audio Migration Plan: Emotiscope → K1.reinvented
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Audio Migration Plan: Emotiscope → K1.reinvented

## Executive Summary

K1.reinvented needs audio reactivity. Emotiscope has **production-grade, battle-tested audio processing** that took years to perfect. This plan migrates that excellence while maintaining K1's compilation philosophy.

**Emotiscope Source Code Path:**  `/Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src`

**The Key Insight:** Audio processing runs in REAL TIME (just like Emotiscope), but the pattern's RESPONSE to audio compiles from node graphs.

---

## What We're Migrating

### The Emotiscope Audio System (TOP SHELF)
- **Goertzel DFT**: 64 frequency bins with musical spacing (55Hz-6.4kHz)
- **Adaptive windowing**: Each frequency gets optimal time/frequency resolution
- **Tempo detection**: Novelty curve analysis with phase-locked beat tracking
- **Interlaced processing**: Doubles effective frame rate
- **Multi-stage filtering**: Calibrated noise floor + moving averages + auto-ranging
- **Dual-core architecture**: Audio on Core 0, rendering on Core 1

This represents **YEARS** of iterative refinement for musical analysis on ESP32.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     REAL-TIME AUDIO LAYER                    │
│                        (Core 0 - 200Hz)                      │
│                                                               │
│  SPH0645 → I2S → Goertzel DFT → Tempo Detection → Global Vars│
│    ↓        ↓         ↓              ↓                ↓      │
│  12.8kHz  Samples  64 bins    Novelty+Beats    spectrogram[] │
└───────────────────────────┬───────────────────────────────────┘
                            │ Real-time values
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   COMPILED PATTERN LAYER                     │
│                      (Core 1 - 450 FPS)                      │
│                                                               │
│  Node Graph → TypeScript → C++ Code → Uses Audio Values      │
│      ↓            ↓           ↓              ↓                │
│  JSON def    Codegen    Compiled    interpolate_spectrum()   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Essential Node Types (REQUIRED FIRST)

These nodes are prerequisites for audio to work properly:

**constant node** - For fixed values
```typescript
case 'constant':
    const value = node.parameters?.value ?? 1.0;
    return `
    // Node: ${node.id} (constant = ${value})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = ${value}f;
    }`;
```

**multiply node** - For scaling
```typescript
case 'multiply':
    // Assumes two inputs already in field_buffer and a temp buffer
    return `
    // Node: ${node.id} (multiply)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = field_buffer[i] * temp_buffer[i];
    }`;
```

**add node** - For combining
```typescript
case 'add':
    return `
    // Node: ${node.id} (add)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = field_buffer[i] + temp_buffer[i];
    }`;
```

**clamp node** - For range limiting (CRITICAL for audio)
```typescript
case 'clamp':
    const min = node.parameters?.min ?? 0.0;
    const max = node.parameters?.max ?? 1.0;
    return `
    // Node: ${node.id} (clamp [${min}, ${max}])
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = fmax(${min}f, fmin(${max}f, field_buffer[i]));
    }`;
```

**modulo node** - For wrapping
```typescript
case 'modulo':
    const divisor = node.parameters?.divisor ?? 1.0;
    return `
    // Node: ${node.id} (modulo ${divisor})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = fmod(field_buffer[i], ${divisor}f);
    }`;
```

### Phase 1: Core Audio Files

**Direct ports from Emotiscope (minimal changes):**

1. Copy these files:
```bash
cp /Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/microphone.h \
   firmware/src/audio/

cp /Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/goertzel.h \
   firmware/src/audio/

cp /Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/tempo.h \
   firmware/src/audio/
```

2. Add to `main.cpp`:
```cpp
// Audio subsystem globals
volatile float spectrogram[64] = {0};
volatile float spectrogram_smooth[64] = {0};
volatile float vu_level = 0;
volatile float vu_level_raw = 0;
volatile float tempo_confidence = 0;
volatile tempo tempi[64] = {0};
volatile float chromagram[12] = {0};

// In setup()
void setup() {
    // ... existing setup

    // Initialize audio on Core 0
    xTaskCreatePinnedToCore(
        audio_task,
        "audio",
        8192,
        NULL,
        1,
        NULL,
        0  // Core 0 for audio
    );
}

// Audio task
void audio_task(void* parameter) {
    init_microphone();
    init_goertzel();

    while(true) {
        acquire_sample_chunk();
        calculate_magnitudes();
        update_tempo();
        vTaskDelay(1); // Yield
    }
}
```

### Phase 2: Audio Node Types

Add these to `codegen/src/index.ts`:

**Frequency spectrum nodes:**
```typescript
case 'spectrum_bin':
    const bin = Number(node.parameters?.bin ?? 0);
    if (bin < 0 || bin > 63) {
        throw new Error(`spectrum_bin: bin ${bin} out of range (0-63)`);
    }
    return `
    // Node: ${node.id} (spectrum_bin ${bin})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = spectrogram_smooth[${bin}];
    }`;

case 'spectrum_interpolate':
    return `
    // Node: ${node.id} (spectrum_interpolate)
    // Maps LED position across full spectrum
    for (int i = 0; i < NUM_LEDS; i++) {
        float progress = (float)i / (NUM_LEDS - 1);
        float bin_float = progress * 63.0f;
        int bin_low = (int)bin_float;
        int bin_high = min(63, bin_low + 1);
        float frac = bin_float - bin_low;
        field_buffer[i] = spectrogram_smooth[bin_low] * (1.0f - frac) +
                          spectrogram_smooth[bin_high] * frac;
    }`;

case 'spectrum_range':
    const start = Number(node.parameters?.start_bin ?? 0);
    const end = Number(node.parameters?.end_bin ?? 10);
    const count = Math.max(1, end - start + 1);
    return `
    // Node: ${node.id} (spectrum_range bins ${start}-${end})
    float sum = 0;
    for (int b = ${start}; b <= ${end} && b < 64; b++) {
        sum += spectrogram_smooth[b];
    }
    float avg = sum / ${count}.0f;
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = avg;
    }`;
```

**VU and beat nodes:**
```typescript
case 'audio_level':
    return `
    // Node: ${node.id} (audio_level - VU meter)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = vu_level;  // Already normalized 0-1
    }`;

case 'beat':
    const tempo_bin = node.parameters?.tempo_bin ?? -1;
    if (tempo_bin === -1) {
        return `
        // Node: ${node.id} (beat - auto-detect strongest tempo)
        int strongest = 0;
        float max_mag = 0;
        for (int t = 0; t < 64; t++) {
            if (tempi[t].magnitude > max_mag) {
                max_mag = tempi[t].magnitude;
                strongest = t;
            }
        }
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = tempi[strongest].beat * 0.5f + 0.5f;
        }`;
    } else {
        return `
        // Node: ${node.id} (beat - tempo bin ${tempo_bin})
        for (int i = 0; i < NUM_LEDS; i++) {
            field_buffer[i] = tempi[${tempo_bin}].beat * 0.5f + 0.5f;
        }`;
    }

case 'tempo_magnitude':
    const tmag_bin = Number(node.parameters?.tempo_bin ?? 0);
    return `
    // Node: ${node.id} (tempo_magnitude bin ${tmag_bin})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = tempi[${tmag_bin}].magnitude;
    }`;

case 'chromagram':
    const pitch = Number(node.parameters?.pitch ?? 0);
    if (pitch < 0 || pitch > 11) {
        throw new Error(`chromagram: pitch ${pitch} out of range (0-11)`);
    }
    return `
    // Node: ${node.id} (chromagram pitch ${pitch})
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = chromagram[${pitch}];
    }`;
```

### Phase 3: Example Audio Patterns

**Spectrum-interpolated Departure:**
```json
{
  "name": "Departure-Spectrum",
  "description": "Departure pattern modulated by full frequency spectrum",
  "nodes": [
    {"id": "spectrum", "type": "spectrum_interpolate"},
    {"id": "palette", "type": "palette_interpolate", "parameters": {"palette": "departure"}},
    {"id": "output", "type": "output"}
  ],
  "wires": [
    {"from": "spectrum", "to": "palette"},
    {"from": "palette", "to": "output"}
  ],
  "palette_data": [...]
}
```

**Beat-pulsed Lava:**
```json
{
  "name": "Lava-Beat",
  "description": "Lava intensity pulsing with the beat",
  "nodes": [
    {"id": "pos", "type": "position_gradient"},
    {"id": "beat", "type": "beat"},
    {"id": "scale", "type": "constant", "parameters": {"value": 0.3}},
    {"id": "beat_scaled", "type": "multiply"},
    {"id": "modulated", "type": "add"},
    {"id": "clamped", "type": "clamp", "parameters": {"min": 0, "max": 1}},
    {"id": "palette", "type": "palette_interpolate", "parameters": {"palette": "lava"}},
    {"id": "output", "type": "output"}
  ],
  "wires": [
    {"from": "pos", "to": "modulated.a"},
    {"from": "beat", "to": "beat_scaled.a"},
    {"from": "scale", "to": "beat_scaled.b"},
    {"from": "beat_scaled", "to": "modulated.b"},
    {"from": "modulated", "to": "clamped"},
    {"from": "clamped", "to": "palette"},
    {"from": "palette", "to": "output"}
  ],
  "palette_data": [...]
}
```

---

## Implementation Schedule

### Day 1: Essential Nodes (2-3 hours)
1. Back up current codegen
2. Add essential node types (constant, multiply, add, clamp, modulo)
3. Test with simple constant-node patterns
4. Verify codegen integration point

### Day 2: Audio File Migration (4-5 hours)
1. Create `firmware/src/audio/` directory
2. Copy microphone.h, goertzel.h, tempo.h from Emotiscope
3. Add includes and globals to main.cpp
4. Resolve any compilation errors

### Day 3: Dual-Core Setup (3-4 hours)
1. Implement audio_task() on Core 0
2. Verify audio values updating in real-time
3. Test with serial monitor output
4. Debug I2S microphone connection

### Day 4: Audio Nodes (2-3 hours)
1. Implement spectrum_bin, spectrum_interpolate in codegen
2. Add audio_level, beat node types
3. Test each node independently
4. Verify code generation

### Day 5: Example Patterns & Testing (2-3 hours)
1. Create spectrum-interpolated Departure pattern
2. Create beat-pulsed Lava pattern
3. Verify audio response with music
4. Optimize performance

---

## Critical Calibration Values to Preserve

These values are **hardware-specific** and took years to perfect:

```cpp
// From microphone.h
#define SAMPLE_RATE 12800  // 12.8kHz - optimized for music
const float dc_offset = ((raw >> 14) + 7000) - 360;  // SPH0645-specific

// From goertzel.h
float sigma = 0.8;  // Gaussian window shape
float freq_table[64] = {...};  // Musical frequency spacing

// From tempo.h
#define NOVELTY_LOG_HZ 50  // Novelty sampling rate
#define BEAT_SHIFT_PERCENT 0.08  // Phase alignment
```

---

## Testing Protocol

### 1. Verify Audio Capture
```cpp
// In loop(), temporarily add:
Serial.printf("Audio: %.3f\n", spectrogram_smooth[10]);
```
Should see values changing with music

### 2. Verify Frequency Response
Play pure tones:
- 100Hz → spectrogram_smooth[2-4] should peak
- 1kHz → spectrogram_smooth[20-22] should peak
- 4kHz → spectrogram_smooth[40-42] should peak

### 3. Verify Beat Detection
Play music with clear beat (120 BPM):
- `tempi[48].magnitude` should be strong (tempo bin 48 ≈ 120 BPM)
- `tempi[48].beat` should oscillate -1 to 1 at 2Hz

### 4. Verify Pattern Response
Upload "Departure-Spectrum" pattern:
- Pattern should flow across spectrum with music
- No flickering or instability
- FPS should stay at 450+

---

## Memory & Performance Impact

**Memory:**
- Audio buffers: ~32KB RAM
- Goertzel tables: ~16KB Flash
- Total impact: ~48KB (acceptable, ESP32-S3 has 512KB)

**Performance:**
- Audio processing: ~10% CPU on Core 0
- Pattern rendering: ~20% CPU on Core 1
- Plenty of headroom remaining

**Line count:**
- microphone.h: ~150 lines
- goertzel.h: ~400 lines
- tempo.h: ~500 lines
- Audio nodes: ~200 lines
- Total: ~1,250 lines

**Combined with existing ~1,200 lines = ~2,450 total (still minimal)**

---

## Audio Data Available to Patterns

```cpp
spectrogram[64]      // Raw frequency bins (0=55Hz, 63=6.4kHz)
spectrogram_smooth[64] // Smoothed frequency bins
vu_level             // Overall volume (0.0-1.0)
tempi[64].beat       // Beat oscillation (-1 to 1)
tempi[64].magnitude  // Tempo strength (0.0-1.0)
tempo_confidence     // Beat detection confidence (0.0-1.0)
chromagram[12]       // Pitch class energy (C through B)
```

---

## Frequency Bin Reference

| Bins | Frequency Range | Description |
|------|----------------|-------------|
| 0-2  | 55-80Hz | Sub bass |
| 3-8  | 80-200Hz | Bass frequencies |
| 9-18 | 200-500Hz | Low midrange |
| 19-30 | 500Hz-1.5kHz | Midrange |
| 31-42 | 1.5kHz-3kHz | High midrange |
| 43-55 | 3kHz-5kHz | Treble |
| 56-63 | 5kHz-6.4kHz | Brilliance |

---

## Success Criteria

Phase 1 complete when:
- [ ] Essential nodes working (constant, multiply, add, clamp, modulo)
- [ ] Audio files ported and compiling
- [ ] I2S microphone capturing samples
- [ ] Spectrogram values updating in real-time

Phase 2 complete when:
- [ ] Audio node types implemented in codegen
- [ ] Spectrum nodes functional (spectrum_bin, spectrum_interpolate)
- [ ] Beat detection functioning
- [ ] VU meter responding

Phase 3 complete when:
- [ ] Audio-reactive patterns compile and run
- [ ] 450+ FPS maintained with audio
- [ ] No audio artifacts or glitches
- [ ] Patterns respond musically to audio

---

## The Payoff

Once complete, EVERY pattern becomes audio-reactive:
- Departure flows with the music spectrum
- Lava pulses with the beat
- Twilight breathes with the dynamics
- Future patterns have infinite audio possibilities

This transforms K1.reinvented from "animated patterns" to "living, music-responsive art."

**Build something that responds to beauty.**
