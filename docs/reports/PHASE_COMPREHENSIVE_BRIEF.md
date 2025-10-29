---
author: Claude Code Agent
date: 2025-10-28
status: published
intent: Comprehensive brief on Phase C, PF-5 Phase 1, and PF-5 Phases 2-5 with task breakdown
---

# Comprehensive Phase Breakdown: Phase C + PF-5

This document provides a detailed technical brief on what each major phase entails, including goals, scope, technical approach, dependencies, and engineering team requirements.

---

## PHASE C: Node Graph Editor (Weeks 1-12)

### Strategic Objective

Transform K1 from a **preset-based lighting controller** into a **visual programming platform** where users create custom lighting effects by connecting logical nodes (sources, processors, outputs) in a directed acyclic graph (DAG).

**Impact**: Opens K1 to technical/creative users (producers, VJs, installations) and enables infinite customization.

### What It Includes

#### C.1: Infrastructure & Data Model (Weeks 1-3)

**Goal**: Establish the graph data structure, validation rules, and core store.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 13 | Define node types and TypeScript interfaces | 5 | Frontend/Arch | 8 |
| 14 | Implement graph data structure (nodes, edges, metadata) | 6 | Frontend | 12 |
| 15 | Build graph validation rules and error types | 5 | Frontend | 10 |
| 16 | Create NodeEditor store (Context API + reducer) | 6 | Frontend | 14 |
| 17 | Implement undo/redo history with debounce | 6 | Frontend | 12 |
| 18 | Build graph JSON serialization/deserialization | 6 | Frontend | 14 |

**Technical Details**:

**Node Type System**:
- Support 16 node types from Phase B (copied from K1 pattern library):
  - **Input nodes** (Audio, Time, Random, User Input)
  - **DSP nodes** (Filter, Oscillator, LFO, Quantizer)
  - **LED nodes** (Hue, Saturation, Brightness, Position)
  - **Timing nodes** (BPM, Phase, Sync)
- Each node has:
  - Unique ID (UUIDv4)
  - Type enum (validated)
  - Input ports (0-N, typed)
  - Output ports (0-N, typed)
  - Parameter values (name, range, default)
  - Visual metadata (x, y position, color, label)

**Graph Structure**:
```typescript
interface NodeEditorDocument {
  version: 1;
  nodes: Node[];
  edges: Edge[];
  validations: ValidationResult[];
  metadata: {
    name: string;
    author: string;
    created: ISO8601;
    modified: ISO8601;
    tags: string[];
  };
}

interface Node {
  id: string; // UUID
  type: NodeType;
  inputs: PortInput[];
  outputs: PortOutput[];
  parameters: ParameterValue[];
  position: { x: number; y: number };
}

interface Edge {
  id: string; // UUID
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
  // validates: no cycles, type compatibility
}
```

**Validation Rules**:
- ✓ No cycles (topological sort)
- ✓ Type compatibility (input port type matches output port type)
- ✓ No orphaned nodes (all inputs connected or have defaults)
- ✓ All node IDs unique
- ✓ All edge endpoints exist
- ✓ Return list of warnings (unused nodes, performance concerns)

**State Management**:
- K1Provider extended with `nodeEditor` namespace
- Actions: `selectNode`, `deselectNode`, `updateNodeParam`, `deleteNode`, `addEdge`, `deleteEdge`
- History: `{ past: Document[], present: Document, future: Document[] }`
- Debounce checkpoints on edits (250-400ms with shallow equality check)

**Serialization**:
- Zod schema for validation on import
- Round-trip: GraphDocument → JSON → GraphDocument
- Version support (migrate v1 → v2 in future)
- Normalization: assign new IDs if colliding, backfill defaults

**Dependencies**: K1Provider extension (Week 0)

**Exit Criteria**:
- ✅ Node type definitions complete
- ✅ Graph CRUD operations (add/remove/edit) working
- ✅ Validation passes all test cases
- ✅ Undo/redo tested with rapid sequences
- ✅ JSON round-trip fidelity verified
- ✅ TypeScript strict: 0 errors

---

#### C.2: Canvas & Interactive Rendering (Weeks 3-8)

**Goal**: Build a 60 FPS canvas-based node editor UI with drag-and-drop, live preview.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 19 | Canvas architecture and node rendering | 8 | Frontend | 18 |
| 20 | Wire/connection rendering with Bezier curves | 7 | Frontend | 16 |
| 21 | Drag-and-drop node movement | 7 | Frontend | 14 |
| 22 | Parameter inline editing in nodes | 6 | Frontend | 12 |
| 23 | Zoom, pan, and viewport management | 6 | Frontend | 12 |
| 24 | LED preview canvas (real-time effect eval) | 8 | Frontend | 20 |
| 25 | Node palette and add-node UI | 5 | Frontend/Designer | 10 |
| 26 | Error visualization (red borders, tooltips) | 4 | Frontend | 8 |

**Technical Details**:

**Canvas Rendering**:
- Engine: **React + Canvas** (avoid Three.js/Babylon for minimal deps)
- Approach:
  - Single canvas element in full-screen or panel
  - requestAnimationFrame at target 60 FPS
  - Layer model: background grid → nodes → wires → selection → UI overlays
  - Zoom via 2D context transform (scale, translate)
  - Pan via mouse drag or keyboard shortcuts
- Performance targets:
  - 100-200 nodes: 60 FPS maintained
  - Render time: <16.67ms per frame
  - Memory: <50 MB for editor state + canvas

**Node Rendering**:
- SVG or Canvas rects for node bodies
- Text for labels (parameterized font size)
- Colored circles for input/output ports
- Outline on hover/select
- Icon or color to indicate node type
- Parameter display inline (name + value + slider/input)

**Wire Rendering**:
- Bezier curves connecting output port of one node to input port of another
- Animated dashes to show data flow (optional)
- Highlight on hover or when nodes selected
- Color coded by data type (e.g., red for audio, blue for timing)
- Validate connections on drag (type checking, prevent cycles)

**Interaction**:
- Click to select node(s)
- Drag to move (updates node.position)
- Right-click context menu (delete, duplicate, inspect)
- Shift+drag to pan canvas
- Scroll to zoom (with limits: 0.5x to 4x)
- Double-click to edit parameter inline
- Delete key to remove selected
- Ctrl+Z / Ctrl+Y for undo/redo

**LED Preview**:
- Small canvas panel showing real-time LED strip simulation
- Compile graph → evaluate in real-time (30+ FPS)
- Display 60 LED pixels in a grid or line
- Update when parameters change
- Color-coded to match physical output

**Node Palette**:
- Sidebar or modal with categorized node types
- Search/filter by name or type
- Drag from palette to canvas to add node
- Tooltip on hover showing port descriptions

**Error Visualization**:
- Red border on nodes with type errors
- Tooltip showing error message on hover
- Toast notification for non-fatal warnings
- Status bar showing total validation errors

**Dependencies**: C.1 (graph model), K1Provider

**Exit Criteria**:
- ✅ 60 FPS rendering maintained (profiled)
- ✅ Drag-and-drop works smoothly
- ✅ Zoom/pan responsive
- ✅ 100-node graphs render without lag
- ✅ LED preview updates in real-time
- ✅ All interactions responsive (<50ms)

---

#### C.3: Features & Advanced UI (Weeks 8-12)

**Goal**: Add search, history, validation details, metadata editor, and keyboard shortcuts.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 27 | Node search and filter | 4 | Frontend | 8 |
| 28 | Pattern history/variants manager | 5 | Frontend | 10 |
| 29 | Validation details panel | 4 | Frontend | 8 |
| 30 | Graph metadata editor (name, tags, author) | 3 | Frontend | 6 |
| 31 | Keyboard shortcuts and help overlay | 3 | Frontend | 6 |
| 32 | Import/export graph (JSON, download) | 4 | Frontend | 8 |
| 33 | Copy/paste nodes and subgraphs | 5 | Frontend | 10 |
| 34 | WCAG 2.1 AA accessibility audit | 4 | Frontend/QA | 10 |

**Technical Details**:

**Search & Filter**:
- Searchable node palette (by type, name)
- Filter by data type, complexity level
- Recent nodes list
- Keyboard shortcut (Cmd+K style command palette)

**Pattern History**:
- "Variants" sidebar showing all versions of current pattern
- Snapshot on save, with timestamp and optional user note
- Restore to any variant
- Diff view showing what changed

**Validation Details**:
- Expand panel showing all validation errors/warnings
- Click error → highlight problematic node in canvas
- Suggestion for fixes ("Connect this input" or "Remove unused node")

**Metadata Editor**:
- Modal for pattern name, author, description, tags
- Preview card showing thumbnail + metadata
- Share-friendly URL generation (maybe future)

**Keyboard Shortcuts**:
- Help overlay (? key)
- Cmd+Z/Y for undo/redo
- Delete to remove selected
- Escape to deselect
- Cmd+S to save
- Cmd+E to export
- +/- to zoom
- Arrow keys to nudge selection

**Import/Export**:
- Export as `.k1graph.json` (downloadable)
- Import via file upload or drag-and-drop
- Validate on import
- Merge or replace current graph options

**Copy/Paste**:
- Cmd+C/V for node(s)
- Offset pasted nodes slightly to avoid overlap
- Preserve internal connections, re-map external

**Accessibility**:
- Focus management in canvas (Tab to navigate nodes)
- Keyboard-only node editing
- ARIA labels on buttons and ports
- Color contrast ratio >4.5:1
- No reliance on color alone to distinguish node types
- Screen reader support for validation messages

**Dependencies**: C.1, C.2

**Exit Criteria**:
- ✅ All keyboard shortcuts documented and tested
- ✅ Accessibility audit passes WCAG 2.1 AA
- ✅ Import/export round-trip fidelity verified
- ✅ Help overlay comprehensive and clear
- ✅ Search responsive (<200ms latency)

---

#### C.4: Styling & Polish (Weeks 12+)

**Goal**: Visual design, theme system, and user delight.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 35 | Design system tokens and Tailwind config | 3 | Designer | 6 |
| 36 | Dark mode and theme switching | 4 | Frontend | 8 |
| 37 | Node type icons and color palette | 5 | Designer | 10 |
| 38 | Animations (node add, edge draw, errors) | 5 | Frontend | 10 |
| 39 | Tooltips, empty states, loading states | 4 | Frontend | 8 |
| 40 | Onboarding tutorial and first-use flow | 4 | Frontend | 8 |

**Technical Details**:

- Design tokens: spacing, colors, typography, shadows
- Tailwind v4 CSS custom properties
- Dark mode via CSS class + localStorage preference
- Node icons via Lucide React or custom SVGs
- Micro-animations: framer-motion for 60 FPS smoothness
- Tooltips: Radix Tooltip or custom with Portal
- Loading states: skeleton screens, spinners
- Onboarding: step-by-step walkthrough (maybe use DockSide/Joyride)

**Exit Criteria**:
- ✅ Polished, professional UI
- ✅ Dark mode functional and tested
- ✅ Animations smooth (60 FPS)
- ✅ Empty states delightful
- ✅ First-time user completes tutorial in <5 min

---

### Phase C: Summary

| Aspect | Details |
|--------|---------|
| **Duration** | Weeks 1-12 (3 months) |
| **Team Size** | 1-2 frontend engineers + 1 designer |
| **Total Hours** | ~250-300 hours |
| **Key Dependencies** | K1Provider extended, TypeScript types finalized, Week 0 cleanup complete |
| **Success Metrics** | 60 FPS rendering, 0 TypeScript errors, >95% test coverage, WCAG AA compliant |
| **Deliverables** | NodeEditor component, graph store, canvas renderer, 5 task groups shipped |
| **Risk Areas** | Canvas performance (100+ nodes), cycle detection at scale, UX intuitiveness |

---

## PF-5 PHASE 1: Audio Reactivity Foundation (Weeks 1-12, Parallel with Phase C)

### Strategic Objective

Establish **real-time beat detection and audio analysis** as K1's core differentiator. Users hear music and their lights respond with <10ms latency, creating immediate sensory delight.

**Impact**: Competitive advantage (competitors lack sub-10ms audio latency); high engagement driver.

### What It Includes

#### PF1.1: AudioWorklet Processor (Weeks 1-3)

**Goal**: Implement real-time audio input and basic feature extraction.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 41 | AudioContext and microphone initialization | 5 | Audio Engineer | 10 |
| 42 | AudioWorklet processor skeleton (RMS, energy) | 6 | Audio Engineer | 14 |
| 43 | Message passing (Worklet ↔ Main thread) | 5 | Audio Engineer | 10 |
| 44 | Latency measurement and optimization | 5 | Audio Engineer | 10 |

**Technical Details**:

**AudioContext Setup**:
- Request microphone permission via getUserMedia API
- Create AudioContext (44.1 kHz or 48 kHz)
- Connect microphone stream to AnalyserNode (initial FFT) and Worklet
- Handle permission denied, device not found, browser incompatibility

**Worklet Processor**:
```javascript
class BeatDetectionProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]; // stereo → mono mixdown
    // Compute per-block features
    const rms = Math.sqrt(sum(channel[i]²) / channel.length);
    const energy = sum(|channel[i]|) / channel.length;

    // Post to main thread (downsampled, e.g., every 4 blocks)
    this.port.postMessage({
      timestamp: currentTime,
      frameIndex: this.frameIndex,
      features: { rms, energy }
    });
    return true; // keep processor alive
  }
}
registerProcessor('beat-detection-processor', BeatDetectionProcessor);
```

**Message Protocol**:
- Schema: `{ t: number, frameIndex: number, features: { rms, energy, ... } }`
- Include version markers for future changes
- Latency budget: <5ms round-trip

**Latency Measurement**:
- Timestamp correlation between input (via AnalyserNode) and output
- Measure end-to-end: microphone input → Worklet → Main thread → LED output
- Target: <10ms (5ms worklet + 5ms render)

**Dependencies**: Web Audio API (browser support check)

**Exit Criteria**:
- ✅ Microphone input working (no permission errors)
- ✅ RMS/energy computed accurately
- ✅ Latency <10ms measured
- ✅ Message flow stable for 1+ hour

---

#### PF1.2: FFT & Frequency Analysis (Weeks 3-6)

**Goal**: Compute frequency-domain features for music-reactive effects.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 45 | FFT implementation (Option A: AnalyserNode) | 4 | Audio Engineer | 8 |
| 46 | Windowing and spectral processing | 5 | Audio Engineer | 12 |
| 47 | Peak detection and harmonic analysis | 6 | Audio Engineer | 14 |
| 48 | Spectrum visualization (spectrogram) | 5 | Frontend | 10 |

**Technical Details**:

**FFT Approach (Two Options)**:

**Option A: AnalyserNode (Fast Bootstrap)**:
- Use built-in `AnalyserNode` with `fftSize=2048`, `smoothingTimeConstant=0`
- Pull `getFloatFrequencyData()` or `getByteFrequencyData()` at cadence (30-60 FPS)
- Linearize from dB if needed
- Advantage: quick, built-in, browser-native
- Disadvantage: smoothing artifacts, less control

**Option B: Worklet FFT (Full Control)**:
- Implement ring buffer in Worklet (fftSize=2048, hopSize=512 for 50% overlap)
- Apply Hann window: `w[n] = 0.5 * (1 - cos(2πn/(N-1)))`
- Call FFT library (e.g., fft.js, KissFFT, or manual Radix-2)
- Advantage: precise control, zero-copy, optimized latency
- Disadvantage: more complex, requires FFT lib

**Recommended**: Start with Option A for speed, migrate to B for production.

**Spectral Processing**:
- Compute magnitude spectrum (N/2 bins, each ~21 Hz at 44.1 kHz)
- Normalize to 0-1 range
- Apply perceptual weighting (A-weighting or loudness curve)
- Divide into bands: bass (0-250 Hz), mids (250-4k Hz), highs (4k+ Hz)
- Track temporal changes (onset detection, energy flux)

**Peak Detection**:
- For each frequency bin, detect local peaks (magnitude > neighbors + threshold)
- Track peak frequency and magnitude
- Map peaks to musical notes (frequency → MIDI note)

**Harmonic Analysis**:
- Find fundamental frequency (lowest strong peak or via autocorrelation)
- Identify harmonics (multiples of fundamental)
- Compute harmonic distortion (THD: ratio of harmonics to fundamental)

**Visualization**:
- Spectrogram: frequency (Y) vs time (X) with color intensity = magnitude
- Real-time canvas drawing at 30 FPS
- Peak marker on frequency axis

**Dependencies**: PF1.1 (Worklet)

**Exit Criteria**:
- ✅ Spectrum computed and updated >30 FPS
- ✅ Peak detection accurate to ±1 bin
- ✅ Harmonic detection works for 440 Hz test tone
- ✅ Visualization smooth and informative

---

#### PF1.3: Onset & Tempo Detection (Weeks 6-9)

**Goal**: Detect beat onsets and track BPM in real-time.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 49 | Spectral flux onset detection | 6 | Audio Engineer | 14 |
| 50 | Adaptive threshold with hysteresis | 5 | Audio Engineer | 10 |
| 51 | BPM estimation and tempo tracking | 6 | Audio Engineer | 14 |
| 52 | Beat grid alignment (phase locking) | 5 | Audio Engineer | 10 |

**Technical Details**:

**Spectral Flux Onset Detection**:
- Algorithm: measure positive changes in magnitude spectrum frame-to-frame
- Formula: `flux = sum(max(0, S_t[k] - S_{t-1}[k]))` for all bins k
- Maintain history (last M frames, e.g., M=64)
- Adaptive threshold: `threshold = median(flux_history) * multiplier` (e.g., 1.2x)
- Hysteresis: two thresholds (on=1.5x, off=1.0x) to prevent jitter
- Confidence score: `(flux - threshold) / (threshold + epsilon)`
- Output: `{ active: bool, flux: number, confidence: 0-1 }`

**Threshold Adaptation**:
- Update threshold dynamically as music intensity changes
- Use exponential moving average: `ema_threshold = 0.95 * ema_threshold + 0.05 * current_flux`
- Clamp threshold in safe range (e.g., 0.1x to 3x of median)

**BPM Estimation**:
- Onset inter-arrival times (gaps between detected beats)
- Median or mode of gaps yields inter-beat interval
- Convert interval → BPM: `BPM = 60 / interval_seconds`
- Smooth via exponential moving average: `ema_bpm = 0.9 * ema_bpm + 0.1 * detected_bpm`
- Valid range: 60-180 BPM (adjustable)

**Tempo Tracking**:
- Use Kalman filter or PLL (Phase-Locked Loop) to track tempo
- Predict next beat based on current BPM
- Measure error when actual beat arrives
- Adjust filter state to minimize error
- Output: estimated BPM, confidence, predicted next beat time

**Beat Grid Alignment**:
- Quantize detected beats to nearest grid position (e.g., 16th notes)
- Use predicted beat times to guide quantization
- Useful for synchronized effects

**Dependencies**: PF1.2 (spectral flux uses spectrum)

**Exit Criteria**:
- ✅ Onset detection accuracy >85% (F1 score on labeled test set)
- ✅ BPM tracking within ±2% of true BPM
- ✅ Hysteresis prevents false positives (no double-triggers)
- ✅ Works across genres (house, rock, pop, jazz)

---

#### PF1.4: Integration & Effects (Weeks 9-12)

**Goal**: Wire audio analysis into effect system and create presets.

**Tasks**:

| Task ID | Title | Complexity | Owner | Hours |
|---------|-------|-----------|-------|-------|
| 53 | Audio data to K1Provider state | 5 | Frontend | 10 |
| 54 | Parameter mapping (audio feature → effect param) | 6 | Frontend | 12 |
| 55 | Real-time effect evaluation | 8 | Frontend/Audio | 16 |
| 56 | Audio-reactive preset library (5 presets) | 6 | Frontend | 12 |
| 57 | Visualization dashboard (spectrum, BPM, onset) | 5 | Frontend | 10 |

**Technical Details**:

**State Integration**:
- Extend K1ProviderState with `audioAnalysis`:
```typescript
audioAnalysis: {
  enabled: boolean;
  spectrum: Float32Array;     // [0-1] normalized
  rms: number;
  energy: number;
  onsetActive: boolean;
  onsetConfidence: number;
  bpm: number;
  bpmConfidence: number;
  peakFrequency?: number;
  timestamp: number;
}
```
- Websocket or Worklet message → dispatch `AUDIO_DATA_UPDATE` action
- Subscribe via `useAudioAnalysis()` hook

**Parameter Mapping**:
- Map audio features to effect parameters:
  - `spectrum[bass_band] → hue` (low freq → red, high freq → blue)
  - `rms → brightness` (volume → intensity)
  - `onsetActive → trigger` (beat hit → flash or pulse)
  - `bpm → speed` (tempo → animation speed)
- Linear or exponential scaling depending on parameter
- Low-pass filter to smooth rapid changes (<100 Hz cutoff)

**Real-Time Evaluation**:
- Compile effect graph (Phase C) to executable bytecode or interpreter
- Evaluate graph at 60 FPS:
  1. Sample audio features
  2. Compute node outputs top-to-bottom (topological order)
  3. Generate LED color values
  4. Send to device
- Latency target: <30ms total (audio → LED)

**Preset Library**:
Create 5 signature presets:
1. **Spectrum Sync**: Hue follows spectrum (low=red, high=blue), brightness follows energy
2. **Beat Pulse**: Brightness pulses on beat onset, color morphs with BPM
3. **Bass Thump**: Low frequencies trigger full brightness bursts (kick drum response)
4. **Ambient Sway**: Slow color gradients driven by sustained frequencies
5. **Glitch**: Rapid color changes on detected onsets (chaotic, high-energy)

Each preset:
- Graph definition (JSON or C++)
- Parameter ranges
- Demo video or description
- Usage guidance

**Visualization Dashboard**:
- Real-time charts:
  - Spectrogram (freq vs time, heatmap)
  - Waveform (audio input)
  - BPM meter (analog gauge style)
  - Onset detector (vertical bars for detected beats)
- Update at 30 FPS
- Option to record/playback for debugging

**Dependencies**: PF1.1-1.3 (audio analysis), Phase C (effect graph), K1Provider

**Exit Criteria**:
- ✅ Audio data flowing to effects in real-time
- ✅ 5 presets created and tested
- ✅ Audio-to-LED latency <30ms measured
- ✅ Visualization dashboard responsive
- ✅ User testing shows "wow" reaction

---

### PF-5 Phase 1: Summary

| Aspect | Details |
|--------|---------|
| **Duration** | Weeks 1-12 (3 months, parallel with Phase C) |
| **Team Size** | 1-2 audio engineers + 1 frontend engineer |
| **Total Hours** | ~200-250 hours |
| **Key Dependencies** | Web Audio API, Phase C effect graph, K1Provider |
| **Success Metrics** | <10ms latency, >85% onset accuracy, 5 presets shipped |
| **Deliverables** | AudioWorklet, FFT, beat detector, 5 presets, dashboard |
| **Risk Areas** | Browser audio API compatibility, cross-platform latency variance, music genre coverage |

---

## PF-5 PHASES 2-5: Advanced AI Features (Weeks 13-30, Phases 2-5)

### PF-5 Phase 2: Intelligent Color Generation (Weeks 13-18)

**Goal**: Extract colors from images/video and generate harmonious palettes using AI.

**Tasks**:
1. Integrate ONNX Runtime Web for model inference (2-3 hours)
2. Deploy color extraction model (image → dominant colors)
3. Implement K-Means++ clustering with CIEDE2000 distance
4. Build color harmony generation (complementary, triadic, analogous)
5. Create palette UI components
6. Real-time video color tracking

**Technical Approach**:
- ONNX Runtime Web: lightweight ML inference in browser (no server calls)
- Model: quantized MobileNet or custom color detection model (~5 MB ONNX)
- K-Means++: cluster pixels to 4-8 dominant colors
- Harmony: generate variations using HSL color space
- UI: drag-and-drop palette editor, hex/RGB inputs, preview

**Success Criteria**:
- Color extraction <500ms per frame
- Palette quality >4.0/5.0 user rating
- Real-time video tracking 30 FPS
- Integration with Phase C graph complete

**Team**: 1 ML engineer + 1 frontend engineer

---

### PF-5 Phase 3: Text-to-Lighting (Weeks 19-22)

**Goal**: Enable natural language control ("Make it a warm sunset").

**Tasks**:
1. Deploy MiniLM embedding model (5.5 MB quantized)
2. Build intent classification system
3. Implement color + effect parameter mapping
4. Create text input modal UI
5. Add voice input support (Web Speech API)
6. Build prompt history & suggestions

**Technical Approach**:
- MiniLM: tiny but capable embedding model for semantic search
- Intent classes: "warm", "cool", "energetic", "calm", "fast", "slow", "bright", "dark"
- Mapping: intent → effect parameters + colors
- Voice: Web Speech API with confidence scores
- History: localStorage + server-side (optional)

**Success Criteria**:
- Intent classification accuracy >90%
- Generated effects match user intent >80% of time
- <150ms end-to-end latency
- User testing shows delight

**Team**: 1 NLP engineer + 1 frontend engineer

---

### PF-5 Phase 4: Personalization & Learning (Weeks 23-28)

**Goal**: Adapt to user preferences and enable A/B testing.

**Tasks**:
1. Implement feedback rating system (thumbs up/down)
2. Build preference learning (exponential moving average)
3. Set up A/B testing framework
4. Deploy model versioning system
5. Create analytics pipeline
6. Build user preference dashboard

**Technical Approach**:
- Feedback: simple 👍👎 on each generated effect
- Learning: weight recent preferences higher (EMA)
- A/B testing: randomize between control and treatment
- Versioning: tag models with version, rollback capability
- Analytics: event logging to backend (optional for on-device)

**Success Criteria**:
- Preferences learned from 20+ interactions
- A/B test shows >5% improvement
- Personalization shows >10% rating improvement

**Team**: 1 full-stack engineer + 1 data scientist

---

### PF-5 Phase 5: Safety & Polish (Weeks 29-30)

**Goal**: Production-ready (photosensitivity, accessibility, performance).

**Tasks**:
1. Photosensitivity validation & filtering
2. Device capability adaptation (low-end devices)
3. Battery optimization & thermal management
4. WCAG 2.1 AA compliance audit
5. Stress testing and stability hardening
6. Documentation and onboarding

**Technical Approach**:
- Photosensitivity: detect rapid flashes (>3 Hz, >20% brightness change)
- Device detection: fetch capability info, adapt frame rate/resolution
- Battery: reduce CPU/GPU usage on low battery
- Thermal: throttle compute-heavy tasks on hot devices
- Compliance: accessibility audit, WCAG fixes
- Testing: stress test with 100k parameter changes, 1000+ graph nodes

**Success Criteria**:
- Zero photosensitivity violations detected
- Runs smoothly on iPhone SE (3-year-old device)
- Battery impact <5% per hour
- WCAG 2.1 AA compliant
- 99.9% uptime in stress tests

**Team**: 1 QA engineer + 1 performance engineer

---

### PF-5 Phases 2-5: Summary

| Phase | Duration | Team | Key Feature | Complexity |
|-------|----------|------|-------------|-----------|
| **Phase 2** | Weeks 13-18 | 2 | Color extraction + harmony | ML-heavy |
| **Phase 3** | Weeks 19-22 | 2 | Text-to-lighting | NLP-heavy |
| **Phase 4** | Weeks 23-28 | 2 | Personalization | Data-heavy |
| **Phase 5** | Weeks 29-30 | 2 | Safety & polish | QA-heavy |
| **Total** | **18 weeks** | **2-3 total** | **AI-powered creativity** | **High-risk, high-reward** |

---

## CRITICAL PATH & DEPENDENCIES

```
Week 0: Cleanup (TypeScript fixes, pre-commit hooks)
    ↓
Week 1-12: Phase C (Node Editor) runs PARALLEL with PF-5 Phase 1 (Audio)
    ├─ C.1-C.2: Infrastructure & Canvas
    ├─ PF1.1-1.2: AudioWorklet & FFT
    ├─ C.3: Features & Polish
    └─ PF1.3-1.4: Onset & Integration
    ↓
Week 13-14: Integration Buffer (test Phase C + PF1 together)
    ↓
Week 15-18: PF-5 Phase 2 (Color) + Phase C refinement
    ↓
Week 19-22: PF-5 Phase 3 (Text-to-Lighting)
    ↓
Week 23-28: PF-5 Phase 4 (Personalization)
    ↓
Week 29-30: PF-5 Phase 5 (Safety & Optimization)
    ↓
Weeks 31-36: Buffer, documentation, user testing, launch prep
```

---

## RESOURCE ALLOCATION SUMMARY

### Optimal Team (4 Engineers)

| Engineer | Focus | Weeks 0-12 | Weeks 13-20 | Weeks 21-30 |
|----------|-------|-----------|-----------|-----------|
| **Frontend Lead** | Phase C | Tasks 13-40 | Refinement | Features |
| **Audio Engineer** | PF-5 Phase 1 | Tasks 41-57 | Support Phase 2 | Support Phase 3 |
| **ML/Full-stack** | PF-5 Phases 2-5 | Setup | Phase 2 | Phases 3-5 |
| **QA/DevOps** | Infrastructure | Week 0 + CI/CD | Testing | Phase 5 |

**Minimum Team (3 Engineers)**: 70% probability of success
- Frontend: Handles Phase C alone (slower iteration)
- Audio: PF-5 Phase 1 + Phase 2 color extraction
- Full-stack: PF-5 Phases 3-5 + QA

**Recommended Team (4 Engineers)**: 85% probability of success
- Specialization reduces context switching
- Parallel execution of Phase C + PF1 fully enabled
- Quality gates maintainable

---

## KEY METRICS & SUCCESS CRITERIA

### Phase C (Node Editor)
- **Rendering**: 60 FPS maintained with 100+ nodes
- **Latency**: <50ms interaction feedback
- **Test Coverage**: >95%
- **Accessibility**: WCAG 2.1 AA compliant
- **User Testing**: First-time user completes tutorial in <5 minutes

### PF-5 Phase 1 (Audio)
- **Latency**: <10ms end-to-end (audio input → LED output)
- **Accuracy**: >85% beat detection (F1 score)
- **Temporal Stability**: BPM tracking within ±2% of true BPM
- **Performance**: 30+ FPS visualization, <20% CPU usage

### PF-5 Phases 2-5
- **Phase 2**: Color extraction <500ms, palette quality >4.0/5.0
- **Phase 3**: Intent accuracy >90%, <150ms latency
- **Phase 4**: Personalization improves ratings by >10%
- **Phase 5**: Zero photosensitivity violations, WCAG 2.1 AA compliant

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Canvas performance regression | Medium | High | Weekly profiling, perf budgets, benchmark suite |
| Audio latency variance across devices | Medium | High | Device-specific optimization, fallback modes |
| ML model inference latency | Medium | Medium | ONNX quantization, model compression, caching |
| Scope creep on Phase C | High | High | Strict feature gate, MVP cutoff at Week 12 |
| Team context switching | Medium | Medium | Dedicated engineers per subsystem |
| Browser compatibility (Audio API) | Low | Medium | Feature detection, graceful degradation |

---

## NEXT STEPS

1. **Confirm team allocation** (3-4 engineers, 32-36 weeks)
2. **Complete Week 0** (TypeScript fixes, pre-commit hooks)
3. **Week 1**: Kick off Phase C infrastructure + PF-5 audio setup
4. **Weekly syncs**: Monitor progress, adjust schedule
5. **Week 12**: Integration testing milestone
6. **Weeks 13-14**: Buffer for cross-feature bugs
7. **Weeks 15+**: Parallel Phases 2-5 execution

---

**Status**: Ready for development. Detailed implementation guidance available in `.taskmaster/tasks/tasks.json` (60 tasks) and task 15.2 (7,260+ tokens of technical specs).
