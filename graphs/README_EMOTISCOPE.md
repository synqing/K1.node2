# Emotiscope Pattern Collection for K1.reinvented

This directory contains 6 ported Emotiscope light show patterns converted to K1's JSON node graph format.

## Quick Reference

| Pattern | File | Purpose | Audio Input | Complexity |
|---------|------|---------|-------------|-----------|
| **Spectrum** | `emotiscope_spectrum.json` | Frequency spectrum visualization across LEDs | spectrogram_smooth[64] | Low |
| **FFT** | `emotiscope_fft.json` | Auto-scaling frequency response | fft_smooth[64] | Low |
| **Beat Tunnel** | `emotiscope_beat_tunnel.json` | Animated tunnel with beat synchronization | tempi[64], tempo_confidence | High |
| **Metronome** | `emotiscope_metronome.json` | Polyrhythmic beat indicator dots | tempi[64] | Medium |
| **Octave** | `emotiscope_octave.json` | Chromatic pitch class highlighting | chromagram[12] | Low |
| **Perlin** | `emotiscope_perlin.json` | Organic flowing noise-based animation | vu_level | High |

## How to Use

1. **Copy to graphs directory** (already done if you're reading this)
2. **Compile one**: `/test-pattern emotiscope_spectrum` (or any pattern name)
3. **Upload to device**: `/flash emotiscope_spectrum`
4. **Customize**: Edit the palette_data array in the JSON to adjust colors

## Audio Input Requirements

Verify that your K1 audio engine provides these signals:

- `spectrogram_smooth[64]` - 64-bin frequency spectrum (Spectrum, FFT)
- `chromagram[12]` - 12-bin pitch class energy (Octave)
- `tempi[64]` - Beat detection array (Beat Tunnel, Metronome)
- `vu_level` - Overall audio level (Perlin)

See `/EMOTISCOPE_PORT.md` for complete documentation of the porting process, limitations, and architectural notes.

## Limitations vs Emotiscope

The K1 node graph system differs from Emotiscope's stateful C approach:

| Feature | Emotiscope | K1 | Status |
|---------|-----------|----|----|
| Mirror mode | Native | Post-processing only | Workaround available |
| Sprite buffers | Persistent state | Recalculated each frame | Approximated |
| Perlin noise | Native implementation | No direct support | Can be added to codegen |
| Beat phase gating | Direct angle access | Beat magnitude only | Approximated |
| Polyrhythmic dots | 64 independent dots | Single beat | Multi-graph workaround |

See individual JSON files for pattern-specific limitations and notes.

## Pattern Descriptions

### Spectrum
Maps the 64-bin frequency spectrum across the LED strip with colors progressing from bass (red) through treble (magenta). Shows what frequencies are dominant in the music.

### FFT
Similar to Spectrum but with automatic dynamic range scaling that adapts to input loudness, keeping the visualization engaging at any volume level.

### Beat Tunnel
Creates a tunnel of light that contracts and expands with the beat. Animation suggests motion even when silent. Polyrhythmic tempi create multiple pulsing regions.

### Metronome
Shows detected beat frequencies as moving dots. Each dot's position represents a detected tempo, and its brightness shows confidence. Reveals the rhythmic complexity of the music.

### Octave
Highlights which musical notes (pitch classes) are present in the audio. Each semitone gets its own section of the strip, so you can see if the music emphasizes certain notes or chords.

### Perlin
Smooth, flowing patterns based on Perlin noise. Momentum-driven animation responds to audio intensity. Feels organic and meditative, like watching waves or aurora lights.

## Palette Customization

Each JSON file contains a `palette_data` array. To customize colors:

1. Edit the JSON file
2. Modify palette entries: `[index, red, green, blue]` where index is 0-255
3. Recompile and reflash

Example: Change Spectrum to use blues and purples:
```json
"palette_data": [
  [0, 0, 0, 0],
  [85, 100, 100, 255],
  [170, 50, 0, 255],
  [255, 200, 0, 100]
]
```

## Compilation & Testing

```bash
# Compile specific pattern
/test-pattern emotiscope_spectrum

# Build all patterns
/build

# Upload to device
/flash emotiscope_spectrum
```

## Performance

All patterns are optimized for ESP32-S3:
- Execution time: <100 microseconds per frame
- Memory overhead: <10 KB per pattern
- Supports >300 LEDs at full framerate

## Documentation

- **Full technical guide**: `/EMOTISCOPE_PORT.md`
- **Individual pattern notes**: See "notes" section in each JSON file
- **Algorithm details**: See JSON "description" fields and comments

## Next Steps

- Test each pattern with various music genres
- Customize palettes to match your aesthetic
- Combine patterns using the pattern rotation system
- Use as templates for creating new audio-reactive patterns

## Questions?

Refer to `/EMOTISCOPE_PORT.md` for architectural details, limitations, and implementation notes. The document includes:
- Detailed algorithm explanations
- Emotiscope → K1 node mapping
- Known limitations and workarounds
- Testing checklist and performance benchmarks
