---
title: Visualization Pipeline Rebuild Roadmap
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
<!-- markdownlint-disable MD013 -->

# Visualization Pipeline Rebuild Roadmap

**Status:** In Progress
**Version:** 1.0
**Date:** 2025-10-26

---

## The Problem

The current patterns in `graphs/` were built without understanding K1.reinvented's core principles:

1. **Palette logic** — Color spaces, intentional progressions, centre-origin rendering
2. **Visual pipeline design** — How audio analysis flows to LED rendering
3. **Audio-to-visual flow** — Goertzel analysis → FFT bins → visual expression
4. **Artistic intention** — Each pattern must be a statement, not a test case

Result: existing patterns are incomplete, misaligned with architecture, and fail to demonstrate the system's capability.

**Decision:** Start fresh with patterns that match **Emotiscope-derived visual effects** (the proven reference implementation).

---

## Strategic Approach

### Phase 1: Analysis & Reference (Current)

**Goal:** Understand Emotiscope's visual patterns and audio processing pipeline

**Reference Files:**
- `light_modes.h` — Registry of 18+ proven patterns
- `light_modes/` — Individual pattern implementations
- `leds.h` — LED rendering primitives (drawing, blurring, mixing, color spaces)
- `light_modes_helpers.h` — FFT support, sprite rendering, animation state, palette helpers

**Key Learnings:**
- 18+ audio-reactive patterns (Spectrum, Octave, FFT, Bloom, Beat Tunnel, Kaleidoscope, etc.)
- Primitive toolset: draw_line(), draw_dot(), sprite rendering, Perlin noise
- Palette system: color_from_palette(), HSV color space, note_colors[], tempo colors
- Processing pipeline: audio data → FFT/Goertzel → pattern logic → LED output
- Visual effects: motion blur, phosphor decay, frame blending, video feedback

### Phase 2: Audio Pipeline Integration (Prerequisite)

**Goal:** Ensure K1 firmware properly exposes audio analysis data to patterns

**Current State:**
- Dual-core audio processing working (Core 1 reads I2S)
- Audio snapshot mechanism ready
- Goertzel + FFT foundation exists

**Required for patterns:**
- Frequency bin data (Goertzel output for each note)
- FFT magnitude data
- Beat detection / tempo tracking (if using)
- Live spectrum snapshots for rendering

**Deliverable:** Document the audio data structure that patterns will receive

### Phase 3: Node System Extension

**Goal:** Add nodes that support audio-reactive visual primitives

**New Node Types Needed:**
- **Analysis nodes:** frequency_bin(note), spectrum_range(low, high), beat_detected()
- **Transformation nodes:** fade(signal, strength), smooth(signal, factor)
- **Rendering nodes:** draw_line_at(position, color, thickness), draw_dot_at(position, color, size)
- **Color nodes:** palette_lookup(index), hue_shift(hue, amount)
- **Spatial nodes:** mirror_output(), centre_origin()

**Codegen Enhancement:** Ensure codegen can compile node graphs that reference audio snapshot data

**Deliverable:** Updated codegen that generates C++ using audio snapshot parameters

### Phase 4: Reference Patterns

**Goal:** Implement 3-5 audio-reactive patterns matching Emotiscope quality

**Priority Patterns (in order):**

1. **Spectrum** — Frequency bars responding to live FFT
   - Frequency bins → LED positions
   - Magnitude → brightness
   - Reference: Emotiscope `spectrum.h`
   - Proof: Demonstrates AP→VP flow

2. **Octave** — Octave-band bars (simplified, perceptually meaningful)
   - 8 octave bands → LED segments
   - Reference: Emotiscope `octave.h`
   - Proof: Shows palette transitions + frequency response

3. **FFT Full** — Raw FFT visualization
   - 256 FFT bins → LED array
   - Reference: Emotiscope `fft.h`
   - Proof: High-resolution frequency display

4. **Beat Tunnel** — Reaction to beat detection (if available)
   - Radial expansion on beat
   - Reference: Emotiscope `beat_tunnel.h`
   - Proof: Temporal sync with music

5. **Bloom** — Soft diffusion responding to energy
   - Gaussian bloom on frequency peaks
   - Reference: Emotiscope `bloom.h`
   - Proof: Smooth, musical response

**For each pattern:**
- Create node graph (JSON)
- Codegen to C++
- Verify audio pipeline flow
- Test at 120 FPS
- Document visual intention

**Deliverable:** 3-5 fully functional audio-reactive patterns in `graphs/audio_reactive/`

### Phase 5: Static Intentional Patterns

**Goal:** Rebuild Departure, Lava, Twilight with proper understanding

**Quality Criteria:**
- Clear artistic statement
- No unnecessary complexity
- Proper palette progression (intentional colors, not random)
- ~120 FPS smooth execution
- Compiles to minimal C++

**Process:**
1. Define the statement (what emotion/story does this express?)
2. Design the palette (what colors are necessary? why?)
3. Design the animation (what drives progression? time? mathematical progression?)
4. Create node graph
5. Codegen to C++
6. Verify matches artistic intent

**Deliverable:** Updated Departure, Lava, Twilight in `graphs/static/`

---

## Current Graph Status (DEPRECATED)

Existing graphs in `graphs/`:
- `departure.json` — Needs rebuild (current design unclear)
- `lava.json` — Needs rebuild (current design unclear)
- `twilight.json` — Needs rebuild (current design unclear)
- `emotiscope_spectrum.json` — Incomplete
- `emotiscope_octave.json` — Incomplete
- `emotiscope_fft.json` — Incomplete

**Action:** Keep current graphs as reference (what NOT to do). Start fresh in subdirectories:
- `graphs/audio_reactive/` — New audio-reactive patterns (Phase 4)
- `graphs/static/` — Rebuilt static patterns (Phase 5)

---

## Success Criteria

### By End of Phase 4 (Audio-Reactive Patterns)

- [ ] Spectrum pattern working at 120 FPS with live audio
- [ ] Octave pattern showing clear band response
- [ ] FFT pattern displaying full frequency resolution
- [ ] Audio pipeline documented (data flow from Core 1 to render loop)
- [ ] All tests pass, no compiler warnings
- [ ] Each pattern has clear visual identity
- [ ] Node graphs are readable, intentional (not auto-generated)
- [ ] Code review passes (security, performance, clarity)

### By End of Phase 5 (Static Patterns)

- [ ] Departure, Lava, Twilight rebuilt with clear intent
- [ ] Each pattern has documented artistic statement
- [ ] Palettes are intentional, not generic
- [ ] All execute at 120 FPS
- [ ] Code review passes

### Overall

- [ ] Visualization pipeline matches Emotiscope quality
- [ ] Patterns demonstrate core thesis (flexibility + performance)
- [ ] Audio-to-visual flow is clean and documented
- [ ] System ready for future pattern additions
- [ ] Documentation updated for next engineer

---

## Technical Decisions Pending

1. **Audio Pipeline API** — What data structure does codegen receive from Core 1?
   - Option A: Raw frequency bins + FFT magnitude
   - Option B: Pre-processed (normalized, smoothed) data
   - Option C: Both, let pattern choose

2. **Node Graph Format** — Should we extend existing schema or redesign?
   - Current schema doesn't support audio input nodes
   - Decision needed before Phase 3

3. **Centre-Origin Rendering** — Do we support mirror mode?
   - Emotiscope uses this
   - Requires spatial node system
   - Defer to Phase 6 or implement in Phase 3?

---

## Ownership & Milestones

| Phase | Owner | Duration | Deliverable |
|-------|-------|----------|-------------|
| 1 (Analysis) | SUPREME Analyst | 1-2 hours | Audio pipeline doc + reference analysis |
| 2 (Audio Integration) | Embedded Engineer | 2-3 hours | Audio snapshot API exposed to patterns |
| 3 (Node Extension) | Codegen Specialist | 3-4 hours | Updated node system + codegen |
| 4 (Reference Patterns) | Pattern Developer | 8-12 hours | 3-5 working audio-reactive patterns |
| 5 (Static Rebuild) | Pattern Developer | 4-6 hours | Departure, Lava, Twilight rebuilt |

**Total estimated effort:** 18-27 hours (2-3 days of focused development)

---

## Next Steps

1. Read Emotiscope reference files (this document + source code)
2. Document the audio pipeline (Phase 1)
3. Decide on audio data structure (Phase 2)
4. Extend node system (Phase 3)
5. Implement Spectrum pattern as proof-of-concept (Phase 4)
6. Iterate on remaining patterns
7. Code review & polish

**Do not start Phase 4 until Phase 3 is complete.**

---

<!-- markdownlint-enable MD013 -->
