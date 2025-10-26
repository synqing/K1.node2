# Pattern Development Quick Start Guide

## 5-Minute Pattern Creation

### 1. Copy Template Pattern

```bash
cd /path/to/K1.reinvented/graphs
cp breathing_ambient.json my_pattern.json
```

### 2. Edit JSON

```json
{
  "name": "My Cool Pattern",
  "description": "What the pattern does visually",
  "artistic_intent": "CENTER-ORIGIN: how it radiates from center",
  "palette_data": [
    [0, 0, 0, 0],        // Position 0 = Black
    [128, 255, 0, 0],    // Position 128 = Red
    [255, 255, 255, 255] // Position 255 = White
  ],
  "nodes": [
    {
      "id": "position",
      "type": "position_gradient",
      "description": "CENTER-ORIGIN distance"
    },
    {
      "id": "bass",
      "type": "spectrum_range",
      "parameters": { "band": "low" },
      "description": "Bass energy"
    },
    {
      "id": "final",
      "type": "add",
      "inputs": ["position", "bass"],
      "description": "Combine position + bass"
    },
    {
      "id": "output",
      "type": "palette_interpolate",
      "inputs": ["final"],
      "description": "Map to colors"
    }
  ],
  "wires": [
    { "from": "position", "to": "final" },
    { "from": "bass", "to": "final" },
    { "from": "final", "to": "output" }
  ]
}
```

### 3. Compile Pattern

```bash
cd /path/to/K1.reinvented/codegen
node dist/index.js multi ../graphs ../firmware/src/generated_patterns.h
```

### 4. Flash to Device

```bash
cd ../firmware
pio run -t upload
```

### 5. Test Pattern

1. Open `http://k1-device.local`
2. Select "My Cool Pattern" from dropdown
3. Adjust brightness/speed/sensitivity sliders
4. Play music and watch it react!

---

## Common Pattern Recipes

### Recipe 1: Beat Flash

```json
{
  "nodes": [
    {"id": "beat", "type": "beat"},
    {"id": "position", "type": "position_gradient"},
    {"id": "flash", "type": "multiply", "inputs": ["beat", "beat"]},  // Square for sharp attack
    {"id": "final", "type": "add", "inputs": ["position", "flash"]},
    {"id": "output", "type": "palette_interpolate", "inputs": ["final"]}
  ]
}
```

### Recipe 2: Spectrum Sweep

```json
{
  "nodes": [
    {"id": "spectrum", "type": "spectrum_interpolate", "parameters": {"start_bin": 0, "end_bin": 63}},
    {"id": "position", "type": "position_gradient"},
    {"id": "combined", "type": "multiply", "inputs": ["spectrum", "position"]},
    {"id": "output", "type": "palette_interpolate", "inputs": ["combined"]}
  ]
}
```

### Recipe 3: Bass Pulse from Center

```json
{
  "nodes": [
    {"id": "bass", "type": "spectrum_range", "parameters": {"band": "low"}},
    {"id": "position", "type": "position_gradient"},
    {"id": "pulse", "type": "add", "inputs": ["bass", "position"]},
    {"id": "output", "type": "palette_interpolate", "inputs": ["pulse"]}
  ]
}
```

### Recipe 4: Breathing Animation

```json
{
  "nodes": [
    {"id": "time", "type": "time"},
    {"id": "breath", "type": "sin", "inputs": ["time"]},
    {"id": "position", "type": "position_gradient"},
    {"id": "animated", "type": "multiply", "inputs": ["breath", "position"]},
    {"id": "output", "type": "palette_interpolate", "inputs": ["animated"]}
  ]
}
```

### Recipe 5: Harmonic Detection

```json
{
  "nodes": [
    {"id": "c_note", "type": "chromagram", "parameters": {"pitch": 0}},
    {"id": "e_note", "type": "chromagram", "parameters": {"pitch": 4}},
    {"id": "chord", "type": "add", "inputs": ["c_note", "e_note"]},
    {"id": "position", "type": "position_gradient"},
    {"id": "final", "type": "add", "inputs": ["position", "chord"]},
    {"id": "output", "type": "palette_interpolate", "inputs": ["final"]}
  ]
}
```

---

## Audio Node Cheat Sheet

### Spectrum Analysis

```json
// Single frequency bin
{"type": "spectrum_bin", "parameters": {"bin": 5}}  // Bins 0-63

// Interpolate across all bins
{"type": "spectrum_interpolate", "parameters": {"start_bin": 0, "end_bin": 63}}

// Average frequency range
{"type": "spectrum_range", "parameters": {"band": "low"}}   // Bass (0-20)
{"type": "spectrum_range", "parameters": {"band": "mid"}}   // Mids (20-42)
{"type": "spectrum_range", "parameters": {"band": "high"}}  // Treble (42-63)
```

### Beat Detection

```json
// Auto-detect strongest beat
{"type": "beat", "parameters": {"tempo_bin": -1}}

// Specific tempo (0-63 maps to BPM range)
{"type": "beat", "parameters": {"tempo_bin": 30}}  // ~120 BPM
```

### Overall Level

```json
// VU meter (RMS level)
{"type": "audio_level"}
```

### Musical Notes

```json
// Chromagram (pitch class 0-11)
{"type": "chromagram", "parameters": {"pitch": 0}}   // C
{"type": "chromagram", "parameters": {"pitch": 4}}   // E
{"type": "chromagram", "parameters": {"pitch": 7}}   // G
```

---

## Math Node Cheat Sheet

### Basic Operations

```json
// Add two values (clamped 0-1)
{"type": "add", "inputs": ["node1", "node2"]}

// Multiply two values
{"type": "multiply", "inputs": ["node1", "node2"]}

// Scale by constant
{"type": "scale", "inputs": ["node1"], "parameters": {"factor": 2.0}}

// Clamp to range
{"type": "clamp", "inputs": ["node1"], "parameters": {"min": 0.0, "max": 1.0}}

// Wrap to range
{"type": "modulo", "inputs": ["node1"], "parameters": {"divisor": 1.0}}

// Constant value
{"type": "constant", "parameters": {"value": 0.5}}
```

### Time-Based

```json
// Time scaled by params.speed
{"type": "time"}

// Sine wave (0-1 range)
{"type": "sin", "inputs": ["time_node"]}
```

### Position

```json
// CENTER-ORIGIN distance (required for all patterns)
{"type": "position_gradient"}
```

---

## Color Palette Tips

### Palette Format

```json
"palette_data": [
  [position, red, green, blue],  // 0-255 for each value
  [0, 0, 0, 0],                  // Black at position 0
  [128, 255, 0, 0],              // Red at position 128
  [255, 255, 255, 255]           // White at position 255
]
```

### Color Theory Palettes

**Warm (Fire/Energy)**
```json
[[0, 0, 0, 0], [64, 100, 0, 0], [128, 255, 50, 0], [192, 255, 200, 0], [255, 255, 255, 200]]
```

**Cool (Water/Ice)**
```json
[[0, 0, 0, 50], [64, 0, 50, 100], [128, 0, 100, 200], [192, 50, 200, 255], [255, 200, 255, 255]]
```

**Neon (Electric/Cyberpunk)**
```json
[[0, 0, 0, 0], [64, 255, 0, 255], [128, 0, 255, 255], [192, 255, 255, 0], [255, 255, 255, 255]]
```

**Earth (Natural/Organic)**
```json
[[0, 20, 10, 0], [64, 50, 30, 10], [128, 100, 70, 30], [192, 150, 120, 60], [255, 200, 180, 120]]
```

**Rainbow (Full Spectrum)**
```json
[[0, 255, 0, 0], [42, 255, 127, 0], [85, 255, 255, 0], [128, 0, 255, 0], [170, 0, 0, 255], [213, 127, 0, 255], [255, 255, 0, 255]]
```

---

## Debugging Tips

### Check Compilation

```bash
# Should see your pattern name in output
node dist/index.js multi ../graphs ../firmware/src/generated_patterns.h
# Look for: "Compiling: My Pattern (audio_reactive: true)"
```

### View Serial Output

```bash
# Linux
screen /dev/ttyUSB0 115200

# macOS
screen /dev/cu.usbserial-* 115200

# Windows (use PuTTY)
# COM port, 115200 baud
```

### Common Errors

**"add node requires two inputs"**
- Add nodes need exactly 2 inputs
- Fix: `"inputs": ["node1", "node2"]`

**"Center-origin violation"**
- Can't use forbidden `gradient` node
- Fix: Use `position_gradient` instead

**"bin out of range (0-63)"**
- Spectrum bins must be 0-63
- Fix: `{"bin": 32}` (not 64)

**"pitch out of range (0-11)"**
- Chromagram pitches 0-11 (C to B)
- Fix: `{"pitch": 7}` (not 12)

---

## Performance Guidelines

### Target Specs (1000 LEDs)

- **FPS**: >150 (minimum), >200 (ideal)
- **CPU**: <30% (Core 0)
- **Memory**: <500 bytes per pattern
- **Latency**: <25ms audio to visual

### Optimization Rules

1. **Minimize spectrum access**: Cache values in nodes
2. **Avoid complex math**: Use multiply/add (not sin/cos/sqrt)
3. **Inline constants**: Use `constant` node for fixed values
4. **Reuse calculations**: Don't compute same value twice

### Node Performance

**Fast** (<5% CPU):
- position_gradient, constant, add, multiply, scale

**Medium** (5-15% CPU):
- beat, audio_level, spectrum_range, time

**Slow** (15-25% CPU):
- spectrum_interpolate (64 bins), sin, chromagram

---

## Web UI Parameter Control

### Available Parameters

```javascript
{
  "brightness": 0.8,        // 0.0-1.0 (global brightness)
  "speed": 1.5,             // 0.1-5.0 (time scaling)
  "spectrum_low": 1.2,      // 0.0-2.0 (bass sensitivity)
  "spectrum_mid": 1.0,      // 0.0-2.0 (mid sensitivity)
  "spectrum_high": 0.8,     // 0.0-2.0 (treble sensitivity)
  "beat_sensitivity": 1.5   // 0.0-2.0 (beat threshold)
}
```

### Accessing in Patterns

Parameters are automatically available via `params` struct:

```json
// Time node uses params.speed
{"type": "time"}

// Spectrum ranges use params.spectrum_low/mid/high
{"type": "spectrum_range", "parameters": {"band": "low"}}

// Beat uses params.beat_sensitivity
{"type": "beat"}

// Brightness applied automatically to palette output
```

---

## Examples by Use Case

### For Electronic Music (Techno, House)

- **Predictive Beat Flash**: Sharp beat response
- **Beat-Locked Grid**: Tempo sync
- **Multi-Band Cascade**: Full spectrum

### For Ambient/Downtempo

- **Breathing Ambient**: Slow organic pulse
- **Energy Adaptive Pulse**: Dynamic brightness
- **Spectral Mirror**: Gentle frequency display

### For Rock/Live Music

- **Transient Particles**: Drum hit explosions
- **Harmonic Resonance**: Guitar chord detection
- **Energy Adaptive Pulse**: Dynamic range

### For Classical/Orchestral

- **Harmonic Resonance**: Multi-instrument harmony
- **Spectral Mirror**: Balanced frequency view
- **Breathing Ambient**: Gentle phrasing response

---

## Next Steps

1. **Study existing patterns**: Look at `graphs/*.json` for examples
2. **Test with different music**: EDM vs. classical vs. rock
3. **Experiment with palettes**: Color theory impacts emotion
4. **Share your patterns**: Contribute to the pattern library!

---

## Resources

- **Full Documentation**: `ADVANCED_CHOREOGRAPHY_PATTERNS.md`
- **Audio API Reference**: `PATTERN_AUDIO_API_REFERENCE.md`
- **Pattern Developer Guide**: `PATTERN_DEVELOPER_GUIDE.md`
- **Node Graph Spec**: `codegen/README.md`

---

**Happy pattern creating!**
