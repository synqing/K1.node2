# Visual Demonstration Guide - Advanced Choreography Patterns

**Purpose**: Help users understand what each pattern looks like and how it responds to music.

---

## Visual Legend

**Strip Layout** (all patterns use CENTER-ORIGIN architecture):
```
[Edge Left] ←←← [CENTER POINT] →→→ [Edge Right]
    Dark           Bright           Dark
```

All patterns radiate from the center, creating symmetrical bilateral effects.

---

## Pattern Demonstrations

### 1. Predictive Beat Flash

**What You'll See**:
```
Beat Off:  [■■■■■■■■■ ▓▓▓▓▓ ■■■■■■■■■]
           Dark edges, subtle purple center

Beat Hit:  [▓▓▓▓▓ ████ ▓▓▓▓▓]
           INSTANT white flash at center

Decay:     [■■■■ ▓▓▓▓ ███ ▓▓▓▓ ■■■■]
           Center holds white, edges fade purple → black
```

**Music Response**:
- **Kick drum**: Bright white explosion
- **Snare**: Secondary white flash
- **Hi-hat**: Subtle purple pulse
- **No beat**: Dim purple glow

**Test Track**: Electronic music with clear 4/4 beat (120-140 BPM)
**What to Listen For**: Flash appears <20ms after beat (feels instant)

---

### 2. Multi-Band Cascade

**What You'll See**:
```
Quiet:     [■■■■■■■■■ ▒▒▒▒▒ ■■■■■■■■■]
           Minimal activity, dark strip

Bass Hit:  [■■■■■■■■■ ████ ■■■■■■■■■]
           Purple center brightens (bass energy)

Full Mix:  [▒▒▒▓▓███████▓▓▒▒▒]
           Purple center, cyan mid-ring, blue edges
           Bass → Mids → Treble spatially mapped
```

**Frequency Mapping**:
- **50-500 Hz** (bass): Center LEDs, purple
- **500-2000 Hz** (mids): Middle ring, cyan
- **2000-6400 Hz** (treble): Outer edges, blue

**Test Track**: Full-spectrum music (EDM, rock with bass + cymbals)
**What to Listen For**: Kick at center, vocals in middle, cymbals at edges

---

### 3. Harmonic Resonance

**What You'll See**:
```
Random Noise: [■■■■■■■■■ ▒▒▒▒▒ ■■■■■■■■■]
              Minimal response (not harmonic)

Single Note:  [■■■■ ▓▓▓▓ ████ ▓▓▓▓ ■■■■]
              Center brightens (fundamental detected)

Chord (CMaj): [▓▓▓ ████ █████ ████ ▓▓▓]
              Rings expand (C + E + G harmonics)
              Red (C) → Yellow (E) → Green (G)
```

**Musical Response**:
- **C note**: Red center
- **E note**: Orange ring
- **G note**: Yellow outer ring
- **Full C major chord**: All rings bright

**Test Track**: Piano, guitar, or vocal harmony (clear pitch)
**What to Listen For**: Chords create expanding colored rings

---

### 4. Transient Particles

**What You'll See**:
```
Silence:   [■■■■■■■■■■■■■■■■■■■]
           Completely dark

Kick Drum: [■■ ▒▒▒ ████ ▒▒▒ ■■]
           Orange explosion from center
           Frame 1: ████ (bright center)
           Frame 2: ▓▓▓▓ (expanding)
           Frame 3: ▒▒▒▒ (fading)
           Frame 4: ■■■■ (dark)

Snare:     [■ ▒▒ ████ ▒▒ ■]
           Yellow-white flash (faster decay)
```

**Attack Envelope**:
```
Brightness
    ^
100%| ╱╲
    |╱  ╲___
  0%|________╲___
    0  10 20 30 40ms
       ↑
    Instant peak
```

**Test Track**: Percussive music (drum and bass, hip-hop)
**What to Listen For**: Particle "explosions" on every drum hit

---

### 5. Beat-Locked Grid

**What You'll See**:
```
Grid Structure (4 cells from center to edge):
[Cell 4] [Cell 3] [Cell 2] [Cell 1] [CENTER] [Cell 1] [Cell 2] [Cell 3] [Cell 4]

Between Beats:
[■■■] [▒▒▒] [▓▓▓] [████] [████] [▓▓▓] [▒▒▒] [■■■]
Grid frozen, center bright (bass), edges dark

On Beat:
[▓▓▓] [████] [████] [████] [████] [████] [████] [▓▓▓]
Grid "snaps" forward, all cells flash

After Beat:
[■■■] [▒▒▒] [▓▓▓] [████] [████] [▓▓▓] [▒▒▒] [■■■]
Grid returns to previous state (locked)
```

**Tempo Response**:
- **120 BPM**: Grid advances every 500ms
- **140 BPM**: Grid advances every 428ms
- **Off-beat**: Grid frozen (no "floating")

**Test Track**: Electronic dance music with strong 4/4 beat
**What to Listen For**: Grid only moves on beat (tight lock)

---

### 6. Spectral Mirror

**What You'll See**:
```
Symmetric Spectrum (bass at center, treble at edges):

Quiet:
[■■■■■■■■■ ▒▒▒▒▒ ■■■■■■■■■]
Minimal color, dark

Bass-Heavy Track:
[■■■■■■■ ████████ ■■■■■■■]
Red center (bass), dark edges (no treble)

Full Mix:
[Blue] [Cyan] [Yellow] [Red-Center] [Yellow] [Cyan] [Blue]
  ↑      ↑       ↑           ↑           ↑       ↑      ↑
Treble  Mids   Low-Mid     Bass     Low-Mid   Mids  Treble

Perfect bilateral symmetry
```

**Color-Frequency Mapping**:
- **Red**: 50-500 Hz (bass, center)
- **Orange**: 500-1000 Hz (low-mids)
- **Yellow**: 1000-2000 Hz (mids)
- **Cyan**: 2000-4000 Hz (high-mids)
- **Blue**: 4000-6400 Hz (treble, edges)

**Test Track**: Full-spectrum music (all frequencies)
**What to Listen For**: Balanced color gradient (warm center, cool edges)

---

### 7. Energy Adaptive Pulse

**What You'll See**:
```
Quiet Passage (ambient section):
[■■■■■■■ ▒▒▒▒▒▒▒ ■■■■■■■]
Dark purple, subtle pulse

Medium Volume:
[▒▒▒▒ ▓▓▓▓▓▓▓ ▒▒▒▒]
Lavender, visible pulse

Loud Section (drop, crescendo):
[████ ████████ ████]
Bright white, intense pulse
```

**Pulsing Motion**:
```
Brightness over time (sinusoidal):
    ^
100%|    ╱╲      ╱╲      ╱╲
    |   ╱  ╲    ╱  ╲    ╱  ╲
    |  ╱    ╲  ╱    ╲  ╱    ╲
  0%|_╱______╲╱______╲╱______╲
    0   1s   2s   3s   4s   5s
        ↑         ↑         ↑
      Peaks scale with music volume
```

**Dynamic Range**:
- **0% volume**: Dark purple (0.1 brightness)
- **50% volume**: Lavender (0.5 brightness)
- **100% volume**: White (1.0 brightness)

**Test Track**: Music with dynamic range (ambient → loud → quiet)
**What to Listen For**: Pattern "breathes" with music energy

---

### 8. Breathing Ambient

**What You'll See**:
```
Inhale (expansion):
[■■ ▒▒ ▓▓ ████████ ▓▓ ▒▒ ■■]
Center expands outward, warm amber

Hold:
[▒▒▒ ▓▓▓ ████████ ▓▓▓ ▒▒▒]
Stable, gentle glow

Exhale (contraction):
[■■■■■ ▓▓▓▓▓▓▓ ■■■■■]
Recedes back to center

Silence:
[■■■■■■■■ ▒▒▒ ■■■■■■■■]
Minimal amber glow at center
```

**Breathing Cycle**:
```
Radius
    ^
100%|      ╱‾‾‾╲
    |     ╱     ╲
    |    ╱       ╲
  0%|___╱         ╲___
    0   2s   4s   6s   8s
        ↑         ↑
      Inhale    Exhale
```

**Musical Response**:
- **Beat hit**: Quick inhale (sharp expansion)
- **Sustained note**: Hold breath (stable)
- **Silence**: Slow exhale (gradual contraction)
- **Energy increase**: Faster breathing

**Test Track**: Ambient, downtempo, meditation music
**What to Listen For**: Slow, organic pulsing (calm, meditative)

---

## Side-by-Side Comparison

### High-Energy Tracks (EDM, Electronic)

| Pattern | Visual Character | Best For |
|---------|-----------------|----------|
| Predictive Beat Flash | Sharp, explosive | Drop sections |
| Beat-Locked Grid | Geometric, mechanical | Techno, minimal |
| Multi-Band Cascade | Frequency waterfall | Production monitoring |
| Transient Particles | Percussive bursts | Drum-focused tracks |

### Musical Tracks (Piano, Guitar, Vocals)

| Pattern | Visual Character | Best For |
|---------|-----------------|----------|
| Harmonic Resonance | Colorful rings | Chord progressions |
| Spectral Mirror | Balanced gradient | Studio monitoring |
| Energy Adaptive Pulse | Dynamic breathing | Build-ups/drops |
| Breathing Ambient | Slow organic | Ambient sections |

---

## Testing Procedure

### 1. Beat Detection Test

**Pattern**: Predictive Beat Flash
**Track**: 120 BPM electronic with clear kick drum
**Expected**: White flash on every kick (<20ms latency)
**Pass Criteria**: Flash appears instant (no perceptible delay)

### 2. Spectrum Analysis Test

**Pattern**: Multi-Band Cascade
**Track**: Full mix (bass + mids + treble)
**Expected**: Purple center (bass), cyan middle (vocals), blue edges (cymbals)
**Pass Criteria**: Frequency content spatially accurate

### 3. Harmonic Detection Test

**Pattern**: Harmonic Resonance
**Track**: Piano playing C major chord
**Expected**: Red center (C), orange ring (E), yellow outer (G)
**Pass Criteria**: Chord changes create visible color shifts

### 4. Transient Response Test

**Pattern**: Transient Particles
**Track**: Drum solo (kick + snare)
**Expected**: Orange explosions on kick, yellow on snare
**Pass Criteria**: Every drum hit triggers visible particle burst

### 5. Tempo Lock Test

**Pattern**: Beat-Locked Grid
**Track**: 140 BPM techno with steady beat
**Expected**: Grid cells advance exactly on beat
**Pass Criteria**: No "floating" between beats (tight lock)

### 6. Energy Tracking Test

**Pattern**: Energy Adaptive Pulse
**Track**: Dynamic music (quiet → loud → quiet)
**Expected**: Brightness tracks volume changes smoothly
**Pass Criteria**: Dark during quiet, bright during loud

---

## Common Visual Issues

### Pattern Too Dim

**Cause**: Low brightness setting or quiet audio
**Fix**: Increase `brightness` parameter (0.8-1.0) or `spectrum_low` sensitivity

### No Beat Response

**Cause**: Weak beat detection or low `beat_sensitivity`
**Fix**: Increase `beat_sensitivity` to 1.5-2.0 for subtle beats

### Washed Out Colors

**Cause**: High brightness or over-driven audio
**Fix**: Reduce `brightness` to 0.6-0.7 or `spectrum_*` parameters

### Laggy Visual Response

**Cause**: Low FPS or high audio latency
**Fix**: Check FPS in serial monitor (should be >150), reduce LED count if needed

### No Spectrum Activity

**Cause**: Microphone issue or audio stubs active
**Fix**: Verify microphone connection, check serial for "spec[0]=X.XXX" values

---

## Pro Tips

### For Best Visual Impact

1. **Match pattern to music genre**:
   - Electronic → Predictive Beat Flash, Beat-Locked Grid
   - Ambient → Breathing Ambient, Energy Adaptive Pulse
   - Musical → Harmonic Resonance, Spectral Mirror

2. **Tune sensitivity parameters**:
   - `beat_sensitivity`: 1.0 default, 1.5 for subtle beats
   - `spectrum_low`: 1.0 default, 1.2 for bass-heavy tracks
   - `spectrum_high`: 1.0 default, 0.8 to reduce treble harshness

3. **Adjust speed for tempo**:
   - Slow music (60-80 BPM): `speed = 0.5`
   - Medium (90-120 BPM): `speed = 1.0`
   - Fast (140-180 BPM): `speed = 1.5`

4. **Use brightness for ambiance**:
   - Intimate setting: `brightness = 0.3-0.5`
   - Normal listening: `brightness = 0.7-0.9`
   - Party/club: `brightness = 1.0`

---

## Recommended Pattern Sequences

### 30-Minute Listening Session

1. **Breathing Ambient** (5 min) - Warm up, calm start
2. **Harmonic Resonance** (5 min) - Melodic section
3. **Multi-Band Cascade** (5 min) - Full spectrum analysis
4. **Predictive Beat Flash** (5 min) - High energy
5. **Beat-Locked Grid** (5 min) - Rhythmic focus
6. **Energy Adaptive Pulse** (5 min) - Dynamic finale

### Party Mode (Auto-Rotate Every 3 Minutes)

1. Predictive Beat Flash (instant beat response)
2. Transient Particles (percussive excitement)
3. Beat-Locked Grid (hypnotic lock)
4. Multi-Band Cascade (visual spectrum)
5. Spectral Mirror (balanced aesthetic)

### Studio Monitoring

1. Spectral Mirror (frequency balance check)
2. Multi-Band Cascade (detailed spectrum view)
3. Harmonic Resonance (pitch accuracy check)

---

**END OF VISUAL GUIDE**

Use this guide to understand what each pattern should look like when working correctly. If visual behavior doesn't match descriptions, refer to the troubleshooting section in ADVANCED_CHOREOGRAPHY_PATTERNS.md.
