# Audio Migration Plan: Emotiscope → K1.reinvented

## Executive Summary

K1.reinvented needs audio reactivity. Emotiscope has **production-grade, battle-tested audio processing** that took years to perfect. This plan migrates that excellence while maintaining K1's compilation philosophy.

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
│  JSON def    Codegen    Compiled    bass = spectrogram[2]    │
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
   /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/audio/

cp /Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/goertzel.h \
   /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/audio/

cp /Users/spectrasynq/Downloads/Emotiscope-2.0/Emotiscope-1/src/tempo.h \
   /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/firmware/src/audio/
```

2. Add to `main.cpp`:
```cpp
// Audio subsystem globals
volatile float spectrogram[64] = {0};
volatile float vu_level = 0;
volatile tempo tempi[64] = {0};
volatile float tempo_confidence = 0;

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

**Frequency band nodes:**
```typescript
case 'audio_bass':
    return `
    // Node: ${node.id} (audio_bass)
    // Average bins 0-4 for bass frequencies (55-110Hz)
    for (int i = 0; i < NUM_LEDS; i++) {
        float bass = (spectrogram[0] + spectrogram[1] + spectrogram[2] +
                     spectrogram[3] + spectrogram[4]) / 5.0f;
        field_buffer[i] = bass;
    }`;

case 'audio_mid':
    return `
    // Node: ${node.id} (audio_mid)
    // Average bins 20-24 for mid frequencies (~800Hz-1.2kHz)
    for (int i = 0; i < NUM_LEDS; i++) {
        float mid = (spectrogram[20] + spectrogram[21] + spectrogram[22] +
                    spectrogram[23] + spectrogram[24]) / 5.0f;
        field_buffer[i] = mid;
    }`;

case 'audio_treble':
    return `
    // Node: ${node.id} (audio_treble)
    // Average bins 40-44 for treble frequencies (~3.2kHz-5kHz)
    for (int i = 0; i < NUM_LEDS; i++) {
        float treble = (spectrogram[40] + spectrogram[41] + spectrogram[42] +
                       spectrogram[43] + spectrogram[44]) / 5.0f;
        field_buffer[i] = treble;
    }`;
```

**Beat and VU nodes:**
```typescript
case 'beat':
    const tempo_bin = node.parameters?.tempo_bin ?? -1; // -1 = auto-detect
    if (tempo_bin === -1) {
        return `
        // Node: ${node.id} (beat - auto-detect strongest tempo)
        // Find strongest tempo
        int strongest = 0;
        float max_mag = 0;
        for (int t = 0; t < 64; t++) {
            if (tempi[t].magnitude > max_mag) {
                max_mag = tempi[t].magnitude;
                strongest = t;
            }
        }
        // Use beat from strongest tempo (normalized to 0-1)
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

case 'audio_level':
    return `
    // Node: ${node.id} (audio_level - VU meter)
    for (int i = 0; i < NUM_LEDS; i++) {
        field_buffer[i] = vu_level;  // Already normalized 0-1
    }`;
```

### Phase 3: Example Audio Patterns

**Bass-reactive Departure:**
```json
{
  "name": "Departure-Bass",
  "description": "Departure pattern modulated by bass frequencies",
  "nodes": [
    {"id": "pos", "type": "position_gradient"},
    {"id": "bass", "type": "audio_bass"},
    {"id": "half", "type": "constant", "parameters": {"value": 0.5}},
    {"id": "bass_scaled", "type": "multiply"},
    {"id": "modulated", "type": "add"},
    {"id": "clamped", "type": "clamp"},
    {"id": "palette", "type": "palette_interpolate", "parameters": {"palette": "departure"}},
    {"id": "output", "type": "output"}
  ],
  "wires": [
    {"from": "pos", "to": "modulated.a"},
    {"from": "bass", "to": "bass_scaled.a"},
    {"from": "half", "to": "bass_scaled.b"},
    {"from": "bass_scaled", "to": "modulated.b"},
    {"from": "modulated", "to": "clamped"},
    {"from": "clamped", "to": "palette"},
    {"from": "palette", "to": "output"}
  ],
  "palette_data": [...] // Same as original Departure
}
```

**Beat-pulse Lava:**
```json
{
  "name": "Lava-Beat",
  "description": "Lava intensity pulsing with the beat",
  "nodes": [
    {"id": "pos", "type": "position_gradient"},
    {"id": "beat", "type": "beat"},
    {"id": "quarter", "type": "constant", "parameters": {"value": 0.25}},
    {"id": "beat_scaled", "type": "multiply"},
    {"id": "brightness_mod", "type": "add"},
    {"id": "palette", "type": "palette_interpolate", "parameters": {"palette": "lava"}},
    {"id": "output", "type": "output"}
  ],
  "wires": [...]
}
```

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
Serial.printf("Audio: %.3f\n", spectrogram[10]);
```
Should see values changing with music

### 2. Verify Frequency Response
Play pure tones:
- 100Hz → spectrogram[2-4] should peak
- 1kHz → spectrogram[20-22] should peak
- 4kHz → spectrogram[40-42] should peak

### 3. Verify Beat Detection
Play music with clear beat (120 BPM):
- `tempi[48].magnitude` should be strong (tempo bin 48 = 120 BPM)
- `tempi[48].beat` should oscillate -1 to 1 at 2Hz

### 4. Verify Pattern Response
Upload "Departure-Bass" pattern:
- Pattern should pulse with bass hits
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

## Success Criteria

Phase 1 complete when:
- [ ] Essential nodes working (constant, multiply, add, clamp, modulo)
- [ ] Audio files ported and compiling
- [ ] I2S microphone capturing samples
- [ ] Spectrogram values updating in real-time

Phase 2 complete when:
- [ ] Audio node types implemented in codegen
- [ ] Bass/mid/treble extraction working
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
- Departure flows with the melody
- Lava pulses with the beat
- Twilight breathes with the dynamics
- Future patterns have infinite audio possibilities

This transforms K1.reinvented from "animated patterns" to "living, music-responsive art."

**Build something that responds to beauty.**