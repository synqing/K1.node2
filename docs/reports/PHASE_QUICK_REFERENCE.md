---
author: Claude Code Agent
date: 2025-10-28
status: published
intent: Quick reference tables for Phase C, PF-5 Phase 1, and PF-5 Phases 2-5
---

# Phase Quick Reference Guide

Quick lookup tables for Phase C, PF-5 Phase 1, and PF-5 Phases 2-5.

---

## PHASE C: NODE GRAPH EDITOR (Weeks 1-12)

### High-Level Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Visual programming: create lighting effects by connecting nodes in a DAG |
| **Duration** | 12 weeks (3 months) |
| **Team** | 1-2 frontend engineers + 1 UI/UX designer |
| **Complexity** | 3-8 (high, UI-intensive) |
| **Total Hours** | ~250-300 |
| **Key Tech** | React + Canvas, state management, 60 FPS rendering |
| **Success Metric** | 60 FPS with 100+ nodes, 0 type errors, >95% test coverage |

### Task Breakdown by Subsection

#### C.1: Infrastructure & Data Model (Weeks 1-3) - 6 Tasks

**What You're Building**:
- Node type system (16 types: Input, DSP, LED, Timing)
- Graph data structure (nodes, edges, metadata)
- Validation engine (cycle detection, type checking)
- Redux-like store with undo/redo
- JSON serialization (import/export)

**Key Deliverables**:
✓ Node/Edge interfaces in TypeScript
✓ Topological validation (cycle check)
✓ History stack (past, present, future)
✓ Zod-validated JSON schema

**Sample Node Type**:
```typescript
{
  id: "node-123",
  type: "Filter",
  inputs: [{ port: "signal_in", type: "audio" }],
  outputs: [{ port: "signal_out", type: "audio" }],
  parameters: [
    { name: "cutoff", value: 500, min: 20, max: 20000 }
  ],
  position: { x: 100, y: 200 }
}
```

**Testing**: Type safety, cycle detection, round-trip JSON, undo/redo sequences

---

#### C.2: Canvas & Rendering (Weeks 3-8) - 8 Tasks

**What You're Building**:
- 60 FPS canvas-based node editor
- Drag-and-drop node movement
- Bezier curve wire rendering
- Zoom (0.5x-4x) and pan
- LED preview canvas (real-time effect evaluation)
- Node add palette

**Key Deliverables**:
✓ Canvas rendering engine (background, nodes, wires, overlays)
✓ Interaction handlers (drag, select, delete)
✓ LED preview (30+ FPS simulation)
✓ Viewport management (zoom/pan state)

**Performance Targets**:
- Render: <16.67ms per frame (60 FPS)
- 100-node graphs: 60 FPS maintained
- Memory: <50 MB editor state

**Rendering Layers**:
```
Layer 1: Background grid
Layer 2: Nodes (rects + labels)
Layer 3: Wires (Bezier curves)
Layer 4: Selection (highlighted nodes/edges)
Layer 5: UI overlays (tooltips, error indicators)
```

**Testing**: Render performance profiling, 100-node stress test, interaction responsiveness

---

#### C.3: Features & Polish (Weeks 8-12) - 8 Tasks

**What You're Building**:
- Node search/filter by type
- Pattern history/variants
- Validation error details panel
- Metadata editor (name, author, tags)
- Keyboard shortcuts (Cmd+Z, +/-, Delete)
- Import/export JSON files
- Copy/paste nodes
- Accessibility audit (WCAG 2.1 AA)

**Key Deliverables**:
✓ Command palette (Cmd+K style)
✓ Help overlay with shortcuts
✓ Validation details (errors → highlights)
✓ Keyboard-only navigation
✓ Accessible color palette

**Keyboard Shortcuts**:
```
Cmd+Z/Y         → Undo/redo
Delete          → Remove selected
Escape          → Deselect
Cmd+S           → Save
Cmd+E           → Export
+/- or scroll   → Zoom
Arrow keys      → Nudge selected
? or H          → Help
Cmd+C/V         → Copy/paste nodes
```

**Testing**: All shortcuts, accessibility audit, help content accuracy

---

#### C.4: Styling & Polish (Week 12+) - 6 Tasks

**What You're Building**:
- Design system (tokens, Tailwind)
- Dark mode toggle
- Node type icons and colors
- Smooth animations (Framer Motion)
- Empty states and loading states
- Onboarding tutorial

**Key Deliverables**:
✓ CSS design tokens (spacing, colors, shadow)
✓ Dark mode CSS class + localStorage
✓ Node icons (Lucide React)
✓ Animations (60 FPS smooth)
✓ Step-by-step first-time user tutorial

---

### Phase C Architecture Diagram

```
K1Provider (State Management)
├── nodeEditor namespace
│   ├── selectedNodeId: string | null
│   ├── graph: NodeEditorDocument
│   └── history: { past, present, future }
├── Actions
│   ├── selectNode(id)
│   ├── updateNodeParam(id, param, value)
│   ├── deleteNode(id)
│   ├── addEdge(from, to)
│   └── undo/redo
└── Hooks
    └── useNodeEditor()

NodeEditor Component
├── Canvas (rendering)
├── Node Palette (add nodes)
├── Validation Panel (errors)
├── Metadata Modal
└── Keyboard Shortcut Handler

Data Flow:
User drags node → Update position in state → Canvas re-renders → Validation runs
```

---

## PF-5 PHASE 1: AUDIO REACTIVITY (Weeks 1-12, Parallel)

### High-Level Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Real-time beat detection & audio analysis (<10ms latency) |
| **Duration** | 12 weeks (3 months, parallel with Phase C) |
| **Team** | 1-2 audio engineers + 1 frontend engineer |
| **Complexity** | 4-8 (DSP-heavy) |
| **Total Hours** | ~200-250 |
| **Key Tech** | Web Audio API, AudioWorklet, FFT, Spectral Analysis |
| **Success Metric** | <10ms latency, >85% beat accuracy, 5 presets shipped |

### Task Breakdown by Subsection

#### PF1.1: AudioWorklet Processor (Weeks 1-3) - 4 Tasks

**What You're Building**:
- Request microphone permission
- AudioContext initialization
- Real-time audio thread via AudioWorklet
- Basic feature extraction (RMS, energy)
- Message passing (worklet ↔ main thread)
- Latency measurement

**Key Deliverables**:
✓ getUserMedia integration
✓ Worklet processor class
✓ Message protocol (timestamp, frameIndex, features)
✓ Latency <10ms measured end-to-end

**Worklet Message Schema**:
```json
{
  "t": 1.234,
  "frameIndex": 1024,
  "features": {
    "rms": 0.45,
    "energy": 0.38
  }
}
```

**Latency Budget**:
- Microphone → Worklet: 0-5ms (hardware variable)
- Worklet compute: <2ms
- Main thread processing: <3ms
- Target total: <10ms

**Testing**: Permission handling, message flow, latency measurement

---

#### PF1.2: FFT & Frequency Analysis (Weeks 3-6) - 4 Tasks

**What You're Building**:
- FFT computation (Option A: AnalyserNode quick, Option B: Worklet full control)
- Windowing (Hann window)
- Spectral processing (normalize, band splitting)
- Peak detection (frequency → MIDI note)
- Harmonic analysis
- Spectrogram visualization

**Key Deliverables**:
✓ Spectrum updated >30 FPS
✓ Peak detection accurate ±1 bin
✓ Band splitting (bass, mids, highs)
✓ Real-time spectrogram canvas

**Spectrum Processing Pipeline**:
```
Raw audio blocks
  ↓
[FFT (2048-point, Hann window)]
  ↓
Magnitude spectrum (1024 bins @ ~21 Hz each)
  ↓
[Normalize to 0-1, A-weighting]
  ↓
[Band splitting]
  ├─ Bass: 0-250 Hz (12 bins)
  ├─ Mids: 250-4000 Hz (179 bins)
  └─ Highs: 4000+ Hz (833 bins)
  ↓
[Peak detection]
  ↓
Frequency → MIDI note mapping (optional)
  ↓
Harmonic analysis (fundamental + overtones)
```

**Frequency to MIDI Note Mapping**:
```
MIDI note = 69 + 12 * log₂(frequency / 440)
```

**Testing**: Known test tones (440 Hz), harmonic accuracy, 100-node spectrum computation

---

#### PF1.3: Onset & Tempo Detection (Weeks 6-9) - 4 Tasks

**What You're Building**:
- Spectral flux onset detection (beat detection)
- Adaptive threshold with hysteresis
- BPM estimation from inter-beat intervals
- Kalman filter tempo tracking
- Beat grid alignment (quantization)

**Key Deliverables**:
✓ Onset accuracy >85% (F1 score)
✓ BPM within ±2% of true BPM
✓ Hysteresis prevents false positives
✓ Works across genres (house, rock, jazz)

**Spectral Flux Algorithm**:
```
flux = sum(max(0, spectrum[t][k] - spectrum[t-1][k])) for all k
threshold = median(flux_history[-64:]) * 1.2
confidence = (flux - threshold) / (threshold + epsilon)
onset = (flux > threshold) AND (last_onset > cooldown_period)
```

**Hysteresis States**:
```
State: QUIET (below threshold_low)
  → Flux rises above threshold_high
  → Transition to PEAK, emit onset
State: PEAK
  → Flux falls below threshold_low
  → Transition to QUIET
```

**BPM Tracking (Kalman Filter)**:
```
State: [bpm, variance]
Prediction: bpm_next = bpm + noise
Measurement: inter_arrival_time → bpm_measured
Update: bpm = 0.9 * predicted + 0.1 * measured
Output: smooth BPM estimate + confidence
```

**Testing**: Labeled beat datasets (MIREX), genre coverage, hysteresis tuning

---

#### PF1.4: Integration & Effects (Weeks 9-12) - 5 Tasks

**What You're Building**:
- Wire audio analysis into K1Provider state
- Parameter mapping (audio feature → effect param)
- Real-time effect graph evaluation (60 FPS)
- 5 signature audio-reactive presets
- Visualization dashboard (spectrum, BPM, onset)

**Key Deliverables**:
✓ Audio data flowing to effects
✓ 5 presets created + tested
✓ Latency <30ms (audio → LED)
✓ Dashboard responsive

**Audio → K1Provider State**:
```typescript
audioAnalysis: {
  enabled: boolean;
  spectrum: Float32Array;      // [0-1] normalized
  rms: number;                 // [0-1]
  energy: number;              // [0-1]
  onsetActive: boolean;        // beat detected
  onsetConfidence: number;     // [0-1]
  bpm: number;                 // [60-180]
  bpmConfidence: number;       // [0-1]
  peakFrequency?: number;      // Hz
  timestamp: number;           // ms
}
```

**Parameter Mapping Examples**:
```
spectrum[bass_band]     → hue           (0 Hz → red, 5kHz → blue)
rms                     → brightness     (quiet → dim, loud → bright)
onsetActive            → trigger         (beat hit → flash)
bpm                     → speed          (slow song → slow anim, fast → quick)
peakFrequency          → tint            (low freq → warm, high → cool)
```

**5 Audio-Reactive Presets**:

1. **Spectrum Sync**
   - Hue follows spectrum (bass=red, mid=green, high=blue)
   - Brightness follows RMS energy
   - Speed follows BPM
   - Use case: electronic music, festivals

2. **Beat Pulse**
   - Brightness pulses on beat onset (0 → 1 → 0 over 200ms)
   - Hue slowly morphs with BPM
   - Saturation follows energy
   - Use case: dance, pop, house

3. **Bass Thump**
   - Bass frequencies (0-250 Hz) trigger full brightness (white flash)
   - Other frequencies fade to background color
   - Kick drum response optimized
   - Use case: hip-hop, EDM, rock

4. **Ambient Sway**
   - Slow color gradients (sustained frequencies)
   - Brightness soft, breathing (LFO modulation)
   - No rapid changes
   - Use case: ambient, chillout, meditation

5. **Glitch**
   - Rapid color changes on detected onsets (chaotic)
   - Saturation modulated by spectrum complexity
   - High-energy, unpredictable
   - Use case: IDM, breakcore, experimental

**Visualization Dashboard**:
```
┌─────────────────────────────────────┐
│        AUDIO REACTIVITY DEBUG       │
├─────────────────────────────────────┤
│  [Spectrogram]       [Waveform]     │
│  │                   │              │
│  │                   │              │
│  └─────────────────  └──────────────┤
├─────────────────────────────────────┤
│  BPM Meter:    ●─ 120 BPM          │
│  Confidence:   ████░ 85%           │
│  Last Onset:   ▓░░░░ 300ms ago     │
├─────────────────────────────────────┤
│  [Record] [Playback] [Export CSV]  │
└─────────────────────────────────────┘
```

**Testing**: Audio feature extraction, effect parameter mapping, latency measurement, preset quality

---

### PF-5 Phase 1 Audio Pipeline

```
Microphone Input (48 kHz)
  ↓
[AudioContext + getUserMedia]
  ↓
┌─────────────────────────────────┐
│      AudioWorklet Processor      │ (Real-time thread)
│  ├─ RMS computation              │
│  ├─ Energy tracking              │
│  └─ Message posting              │
└─────────────────────────────────┘
  ↓
[Main Thread Message Handler]
  ↓
┌──────────────────────────────────────┐
│    Frequency Analysis (FFT)          │
│  ├─ 2048-point Hann window           │
│  ├─ Magnitude normalization          │
│  └─ Band splitting (bass/mid/high)   │
└──────────────────────────────────────┘
  ↓
┌──────────────────────────────────────┐
│    Onset Detection                   │
│  ├─ Spectral flux computation        │
│  ├─ Adaptive threshold               │
│  └─ Hysteresis state machine         │
└──────────────────────────────────────┘
  ↓
┌──────────────────────────────────────┐
│    Tempo Tracking                    │
│  ├─ Inter-beat interval analysis     │
│  ├─ Kalman filter BPM estimation     │
│  └─ Beat grid alignment              │
└──────────────────────────────────────┘
  ↓
[K1Provider State Update] (audioAnalysis)
  ↓
[Effect Graph Evaluation] (Phase C)
  ↓
LED Output (to device)
```

---

## PF-5 PHASES 2-5: ADVANCED AI (Weeks 13-30)

### Quick Summary Table

| Phase | Weeks | Goal | Team | Key Tech | Success Metric |
|-------|-------|------|------|----------|-----------------|
| **2** | 13-18 | Color extraction + harmony | 2 | ONNX, K-Means, CIEDE2000 | <500ms/frame, >4.0/5.0 quality |
| **3** | 19-22 | Text-to-lighting | 2 | MiniLM embeddings, NLP | >90% accuracy, <150ms latency |
| **4** | 23-28 | Personalization | 2 | EMA learning, A/B testing | >10% rating improvement |
| **5** | 29-30 | Safety & polish | 2 | QA, performance tuning | Zero violations, WCAG AA |

### Phase 2: Intelligent Color Generation (Weeks 13-18)

**Tasks**:
- Integrate ONNX Runtime Web (inference engine)
- Color extraction model deployment (image/video → dominant colors)
- K-Means++ clustering with CIEDE2000 distance
- Color harmony generation (complementary, triadic, analogous)
- Palette UI components (drag-drop editor)
- Real-time video color tracking

**Deliverables**:
✓ Color extraction <500ms per frame
✓ 4-8 dominant colors extracted
✓ Harmony variations (5+ palettes from 1 input)
✓ Video color tracking at 30 FPS

**Color Distance Metric**:
```
CIEDE2000: Perceptually accurate color difference
  (unlike simple RGB Euclidean distance)
Used for:
  - Palette generation
  - Harmony validation
  - Color space clustering
```

---

### Phase 3: Natural Language Control (Weeks 19-22)

**Tasks**:
- Deploy MiniLM embedding model (5.5 MB)
- Intent classification (warm, cool, energetic, calm, etc.)
- Color + effect parameter mapping from text
- Text input modal UI
- Voice input (Web Speech API)
- Prompt history & suggestions

**Deliverables**:
✓ Intent classification >90% accurate
✓ Generated effects match intent >80%
✓ <150ms end-to-end latency
✓ Voice input on iOS/Android

**Intent Classes**:
```
Emotional:   warm, cool, energetic, calm, happy, sad, mysterious
Color:       red, blue, green, yellow, purple, orange, pink
Speed:       fast, slow, medium
Brightness: bright, dim, dark
Mood:        chill, hype, aesthetic, retro, cyberpunk
```

---

### Phase 4: Personalization & Learning (Weeks 23-28)

**Tasks**:
- Feedback rating system (👍👎)
- Preference learning (exponential moving average)
- A/B testing framework
- Model versioning + rollback
- Analytics pipeline
- Preference dashboard

**Deliverables**:
✓ Learns from 20+ interactions
✓ A/B test shows >5% improvement
✓ Personalization +10% in ratings
✓ Model versions tracked

**Learning Formula**:
```
preference_score_new = 0.9 * preference_score_old + 0.1 * user_feedback
  (Recent feedback weighted higher)
```

---

### Phase 5: Safety & Optimization (Weeks 29-30)

**Tasks**:
- Photosensitivity validation
- Device capability detection
- Battery & thermal optimization
- WCAG 2.1 AA audit
- Stress testing (100k changes, 1000+ nodes)
- Documentation & onboarding

**Deliverables**:
✓ Zero photosensitivity violations
✓ Runs on iPhone SE (3-year-old device)
✓ <5% battery impact per hour
✓ WCAG 2.1 AA compliant
✓ 99.9% uptime in stress tests

---

## TIMELINE DIAGRAM

```
WEEK 0 (3-5 days)
═════════════════
TypeScript cleanup
Pre-commit hooks
K1Provider extension

WEEKS 1-12
══════════════════════════════════════════════════════════
Phase C (Node Editor)          │  PF-5 Phase 1 (Audio)
─────────────────────────────  │  ──────────────────────
C.1 Infrastructure (Weeks 1-3) │  PF1.1 AudioWorklet (1-3)
C.2 Canvas (Weeks 3-8)         │  PF1.2 FFT (3-6)
C.3 Features (Weeks 8-12)      │  PF1.3 Onset (6-9)
C.4 Polish (Week 12+)          │  PF1.4 Integration (9-12)

WEEKS 13-14
═══════════
Integration Buffer
Phase C + PF1 testing & fixes

WEEKS 15-18
═══════════════════════════════════
Phase C Refinement  │  PF-5 Phase 2 (Color)

WEEKS 19-22
═══════════════════════════════════
Phase C Support     │  PF-5 Phase 3 (Text)

WEEKS 23-28
═══════════════════════════════════
Maintenance         │  PF-5 Phase 4 (Personalization)

WEEKS 29-30
═══════════════════════════════════
Polish              │  PF-5 Phase 5 (Safety)

WEEKS 31-36 (Buffer)
═════════════════════════════════════
User testing, documentation, launch prep
```

---

## TEAM ALLOCATION MATRIX

### Optimal (4 Engineers)

| Week | Frontend Lead | Audio Engineer | ML/Full-stack | QA/DevOps |
|------|--------------|-----------------|----------------|-----------|
| 0 | Types + Provider | Audio setup | - | CI/CD, Pre-commit |
| 1-3 | C.1 Infra | PF1.1 Worklet | Research | Testing |
| 4-8 | C.2 Canvas | PF1.2 FFT | - | Profiling |
| 9-12 | C.3 Features | PF1.3 Onset + PF1.4 | Phase 2 setup | QA |
| 13-14 | Integration test | Integration test | Integration | Testing |
| 15-18 | C.4 Polish | Support | Phase 2 impl | Testing |
| 19-22 | C bugfixes | Consult | Phase 3 impl | Testing |
| 23-28 | C support | Consult | Phase 4 impl | Testing |
| 29-30 | C support | Consult | Phase 5 impl | Phase 5 QA |

### Minimum (3 Engineers)

- **Frontend**: Phase C (alone, slower)
- **Audio**: PF-5 Phase 1 + Phase 2 color extraction
- **Full-stack**: PF-5 Phases 3-5 + QA

---

## KEY FILES TO READ

1. **Full Details**: `docs/reports/PHASE_COMPREHENSIVE_BRIEF.md`
2. **Technical Specs**: Task 15.2 in `.taskmaster/tasks/tasks.json` (7,260 tokens)
3. **Node Editor Spec**: `docs/planning/PHASE_C_NODE_GRAPH_EDITOR_SPECIFICATION.md`
4. **Audio Strategy**: `docs/planning/PF5_IMPLEMENTATION_STRATEGY.md`
5. **Checkpoints**: `Implementation.plans/runbooks/WEEK_0_KICKOFF_CHECKLIST.md`

---

**Status**: All phases fully scoped and ready for execution. Team allocation pending.
