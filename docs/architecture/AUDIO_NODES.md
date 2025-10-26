# Audio-Reactive Node Types

## Overview
Audio-reactive nodes enable K1.reinvented patterns to respond to music and sound. These nodes access real-time audio analysis data and generate inline expressions for maximum performance.

## Audio Globals Available
- `spectrogram[64]` - Frequency spectrum analysis (0-63 bins)
- `spectrogram_smooth[64]` - Smoothed frequency spectrum
- `audio_level` - Overall volume level (0-1)
- `tempi[64]` - Tempo/beat detection data
- `chromagram[12]` - Pitch class energy (C through B)

## Node Types

### spectrum_bin
Access a specific frequency bin from the spectrum analyzer.

**Parameters:**
- `bin` (0-63) - Frequency bin index

**Example:**
```json
{
  "id": "bass",
  "type": "spectrum_bin",
  "parameters": { "bin": 5 }
}
```

**Generated Code:**
```cpp
spectrogram[5]
```

**Use Cases:**
- Bass drum detection (bins 0-8)
- Snare detection (bins 15-25)
- Hi-hat detection (bins 35-50)

---

### spectrum_interpolate
Map LED position across the frequency spectrum. Each LED position maps to a different frequency bin.

**Parameters:**
- `start_bin` (0-63, default 0) - Starting frequency bin
- `end_bin` (0-63, default 63) - Ending frequency bin

**Example:**
```json
{
  "id": "freq_sweep",
  "type": "spectrum_interpolate",
  "parameters": {
    "start_bin": 0,
    "end_bin": 63
  }
}
```

**Generated Code:**
```cpp
spectrogram[0 + int((float(i) / float(NUM_LEDS - 1)) * 63)]
```

**Use Cases:**
- Visualize entire frequency spectrum across LED strip
- Create frequency-reactive gradients
- Map specific frequency ranges to LED zones

---

### spectrum_range
Average a range of frequency bins. Perfect for broad frequency band detection.

**Parameters:**
- `start_bin` (0-63, default 0) - Start of range
- `end_bin` (0-63, default 10) - End of range (inclusive)

**Example:**
```json
{
  "id": "bass_avg",
  "type": "spectrum_range",
  "parameters": {
    "start_bin": 3,
    "end_bin": 8
  }
}
```

**Generated Code:**
```cpp
((spectrogram[3] + spectrogram[4] + spectrogram[5] + spectrogram[6] + spectrogram[7] + spectrogram[8]) / 6.0f)
```

Note on ranges: Emotiscope uses 64 bins (0–63) spanning ~55 Hz–6.4 kHz. Prefer explicit `spectrum_range` parameters over convenience labels like “bass/mid/treble” to keep graphs deterministic and portable.

---

### audio_level
Overall volume level from VU meter (already normalized 0-1).

**Parameters:** None

**Example:**
```json
{
  "id": "volume",
  "type": "audio_level"
}
```

**Generated Code:**
```cpp
audio_level
```

**Use Cases:**
- Global brightness control based on volume
- Fade effects tied to music dynamics
- Volume-reactive pulsing

---

### beat
Beat detection pulse normalized to 0-1 range.

**Parameters:**
- `tempo_bin` (-1 or 0-63, default -1)
  - `-1` = Auto-detect strongest tempo
  - `0-63` = Use specific tempo bin

**Example:**
```json
{
  "id": "kick_beat",
  "type": "beat",
  "parameters": { "tempo_bin": 0 }
}
```

**Generated Code:**
```cpp
(tempi[0].beat * 0.5f + 0.5f)
```

**Use Cases:**
- Flash on beat
- Pulse brightness with rhythm
- Trigger pattern changes on downbeat

---

### tempo_magnitude
Tempo detection strength/confidence for a specific BPM range (0-1).

**Parameters:**
- `tempo_bin` (0-63, default 0) - Tempo bin index

**Example:**
```json
{
  "id": "tempo_strength",
  "type": "tempo_magnitude",
  "parameters": { "tempo_bin": 0 }
}
```

**Generated Code:**
```cpp
tempi[0].magnitude
```

**Use Cases:**
- Fade in effects when tempo is detected
- Vary pattern intensity based on beat strength
- Switch patterns based on tempo confidence

---

### chromagram
Pitch class energy for musical note detection (0-11 for C through B).

**Parameters:**
- `pitch` (0-11, default 0)
  - 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B

**Example:**
```json
{
  "id": "c_note",
  "type": "chromagram",
  "parameters": { "pitch": 0 }
}
```

**Generated Code:**
```cpp
chromagram[0]
```

**Use Cases:**
- Color per musical note (chromesthesia)
- Harmonic visualization
- Key-based pattern selection

---

## Complete Example Pattern

```json
{
  "name": "Audio Reactive Spectrum",
  "description": "Beat-modulated frequency spectrum visualization",
  "palette_data": [
    [0, 0, 0, 0],
    [64, 255, 0, 0],
    [128, 255, 255, 0],
    [192, 0, 255, 0],
    [255, 0, 0, 255]
  ],
  "nodes": [
    {
      "id": "spectrum",
      "type": "spectrum_interpolate",
      "parameters": { "start_bin": 0, "end_bin": 63 }
    },
    {
      "id": "beat",
      "type": "beat",
      "parameters": { "tempo_bin": 0 }
    },
    {
      "id": "modulated",
      "type": "multiply",
      "inputs": ["spectrum", "beat"]
    },
    {
      "id": "output",
      "type": "palette_interpolate",
      "inputs": ["modulated"]
    }
  ],
  "wires": [
    { "from": "spectrum", "to": "modulated" },
    { "from": "beat", "to": "modulated" },
    { "from": "modulated", "to": "output" }
  ]
}
```

## Band Examples (Explicit spectrum_*)

Use explicit `spectrum_range` and `spectrum_interpolate` to define bands. Avoid generic “bass/mid/treble” nodes so graphs remain deterministic across analyzers.

Example 1: Bass Pulse (bins 0–8) gated by strongest beat

```json
{
  "name": "Bass Pulse",
  "nodes": [
    { "id": "bass", "type": "spectrum_range", "parameters": { "start_bin": 0, "end_bin": 8 } },
    { "id": "beat", "type": "beat", "parameters": { "tempo_bin": -1 } },
    { "id": "mod", "type": "multiply", "inputs": ["bass", "beat"] },
    { "id": "out", "type": "palette_interpolate", "inputs": ["mod"] }
  ]
}
```

Example 2: Spectrum Sweep across LED positions, beat-modulated

```json
{
  "name": "Spectrum Sweep",
  "nodes": [
    { "id": "sweep", "type": "spectrum_interpolate", "parameters": { "start_bin": 0, "end_bin": 63 } },
    { "id": "beat", "type": "beat", "parameters": { "tempo_bin": 0 } },
    { "id": "mod", "type": "multiply", "inputs": ["sweep", "beat"] },
    { "id": "out", "type": "palette_interpolate", "inputs": ["mod"] }
  ]
}
```

## Integration Status

- **File:** `/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/codegen/src/index.ts`
- **Node Interface:** Updated with all 7 audio node types
- **Code Generation:** Inline expression-based (zero buffer overhead)
- **Backward Compatibility:** Maintained - all existing patterns still compile
- **Firmware Compilation:** Success (no errors)

## Performance Characteristics

- **Zero per-frame allocations:** All audio nodes generate inline expressions
- **Minimal flash overhead:** No additional buffer code generated
- **Hot-loop friendly:** Direct array access, no function calls
- **Timing safe:** Predictable execution time

## Test Patterns Created

1. **audio_test_spectrum_bin.json** - Basic spectrum bin access
2. **audio_test_comprehensive.json** - spectrum_range + audio_level + multiply
3. **audio_test_beat_spectrum.json** - spectrum_interpolate + beat + multiply

All test patterns generate correctly and firmware compiles without errors.
