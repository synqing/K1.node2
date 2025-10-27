# Phase C + PF-5 Integrated Execution Roadmap

**Date**: 2025-10-28
**Status**: Ready for Execution
**Strategic Priority**: PF-5 (AI Features) with Phase C as critical enabler
**Total Timeline**: 7 months (30 weeks)
**Team Size**: 3-4 engineers

---

## Executive Summary

**Phase C (Node Graph Editor)** is not a separate initiative—it's the **foundational UI layer** that enables PF-5 (AI Features) to work.

**The dependency chain:**
```
Phase C (Node Editor)
    ↓ (Week 1-6)
PF-5 Phase 1-2 (Audio + Color AI)
    ↓ (Week 5-12, overlaps C.6)
PF-5 Phase 3 (Text-to-Lighting generates nodes)
    ↓ (Week 11-14)
PF-5 Phase 4 (Personalization)
    ↓ (Week 15-20)
PF-5 Phase 5 (Polish & Release)
```

**Why Node Editor is Critical:**
- Audio-reactive patterns are created/modified as node graphs
- Color generation produces node-based effects
- Text-to-lighting must output valid node structures
- AI needs to *generate* and *edit* nodes programmatically

Without Phase C, PF-5 cannot:
- Visualize generated patterns
- Allow users to iterate on AI suggestions
- Integrate with existing pattern system

---

## Timeline: Integrated Execution (30 weeks)

### Week 1-6: Phase C Foundation + PF-5 Infrastructure

**Engineer 1: Phase C (Full-time)**
- Weeks 1-2: C.1.1-C.1.6 (Core infrastructure, types, state)
- Weeks 3-4: C.1.7-C.2.3 (Canvas, rendering, interactivity)
- Weeks 5-6: C.2.4-C.2.7 (Connections, validation, polish)

**Engineer 2-3: PF-5 Phase 1 Setup (Part-time, 50%)**
- Week 1: Spike - Web Audio API research, AudioWorklet proof-of-concept
- Week 2-3: Set up audio infrastructure, begin FFT implementation
- Week 4-5: Spectral flux and tempo tracking algorithms
- Week 6: Integration planning with Phase C (ready for handoff)

**Deliverables by Week 6:**
- ✅ Phase C MVP: Node editor with 60 FPS canvas, full interactivity
- ✅ PF-5 Audio: AudioWorklet processor, FFT, spectral analysis
- ✅ Integration spec: How PF-5 generates/modifies nodes

### Week 7-12: Phase C Polish + PF-5 Phase 1 Integration

**Engineer 1: Phase C Completion + Support**
- Weeks 7-8: C.3.1-C.3.5 (LED preview, performance optimization)
- Weeks 9-10: C.4.1-C.4.3 (Polish, styling, error handling)
- Weeks 11-12: C.4.4-C.4.8 (Docs, tests, release prep) + PF-5 Phase 1 support

**Engineer 2-3: PF-5 Phase 1 Full Implementation**
- Week 7-8: Audio reactivity manager, beat detection
- Week 9-10: Integration with K1Provider, audio visualization
- Week 11-12: AudioReactiveEffect generation, preset creation

**Milestone (Week 12):**
- ✅ **Phase C RELEASE**: Node editor shipped (60 FPS, WCAG AA)
- ✅ **PF-5 Phase 1 COMPLETE**: Audio reactivity working (>85% accuracy, <10ms latency)
- ✅ Users can see audio-reactive node graphs in editor

### Week 13-18: PF-5 Phase 2 (Color Intelligence)

**Engineer 1-3: All hands on PF-5 Phase 2**
- Week 13-14: ONNX Runtime integration, color model deployment
- Week 15-16: Color extraction engine, palette generation
- Week 17-18: Integration with node editor, UI for color extraction

**Key Integration Points:**
- Color extraction generates new palette nodes
- Node editor visualizes color generation in real-time
- Effects system applies generated colors to node graphs

**Deliverables:**
- ✅ Color extraction <500ms per frame
- ✅ Palette quality >4.0/5.0
- ✅ Real-time video color tracking

### Week 19-22: PF-5 Phase 3 (Text-to-Lighting)

**Engineer 1-3: NLP + Node Generation**
- Week 19-20: MiniLM model deployment, intent classification
- Week 21-22: TextToLightingModal, effect generation, node creation

**Critical Feature: AI Generates Nodes**
```typescript
// User says: "Create a warm sunset effect"
// PF-5 generates:
{
  nodes: [
    { id: "palette", type: "palette_interpolate",
      params: { palette: "sunset_warm" } },
    { id: "position", type: "position_gradient" },
    { id: "speed", type: "speed_control",
      params: { speed: 0.6 } },
    { id: "output", type: "output" }
  ],
  wires: [
    { from: "position", to: "palette" },
    { from: "palette", to: "speed" },
    { from: "speed", to: "output" }
  ]
}

// Node editor renders this graph immediately
// User can then edit nodes manually if desired
```

**Deliverables:**
- ✅ Intent classification >90% accuracy
- ✅ Node generation <150ms latency
- ✅ Voice input support (iOS/Android)

### Week 23-28: PF-5 Phase 4 (Personalization)

**Engineer 1-3: Learning + Analytics**
- Week 23-24: Feedback system, preference learning
- Week 25-26: A/B testing framework, model versioning
- Week 27-28: Analytics pipeline, personalization dashboard

**Deliverables:**
- ✅ Preference learning from 20+ interactions
- ✅ A/B test shows >5% improvement
- ✅ Personalization improves ratings >10%

### Week 29-30: PF-5 Phase 5 (Safety + Release)

**Engineer 1-3: Production Hardening**
- Week 29: Photosensitivity validation, device capability detection
- Week 30: WCAG 2.1 AA, security audit, release docs

**Deliverables:**
- ✅ Zero photosensitivity violations
- ✅ 60 FPS on low-end devices
- ✅ WCAG 2.1 AA compliant
- ✅ Security audit passed
- ✅ <100ms p95 latency

---

## Architecture: Phase C → PF-5 Integration Points

### 1. Node Graph as Data Structure (Shared)

Both Phase C and PF-5 work with the same node graph format:

```typescript
// In nodeEditor/types/nodeEditor.ts
interface GraphDocument {
  id: string;
  nodes: NodeInstance[];
  wires: WireInstance[];
  metadata: {
    source: 'manual' | 'audio' | 'color' | 'text' | 'user';
    sourcePrompt?: string;  // For AI-generated graphs
    timestamp: number;
  };
}

interface NodeInstance {
  id: string;
  type: NodeKind;
  parameters: Record<string, ParamValue>;
  position: { x: number; y: number };
}
```

**PF-5 generates graphs** using this exact structure → Node editor **renders** them.

### 2. Effect Generation Pipeline (Extended)

**Phase C Effect System** (existing):
```
User edits node graph
    ↓
Node evaluates to LED colors
    ↓
effectToCommand() generates WebSocket message
    ↓
Device shows effect
```

**PF-5 Enhancement** (new):
```
User input: "warm sunset"
    ↓
PF-5 generates GraphDocument
    ↓
Node editor renders graph (optional manual editing)
    ↓
Node evaluates to LED colors (same as Phase C)
    ↓
Device shows effect
```

**Key: Same code path after graph generation.**

### 3. K1Provider State Extensions

**Phase C adds:**
```typescript
nodeEditor: {
  currentGraph: GraphDocument;
  selectedNode: string | null;
  selection: string[];
  viewport: { x: number; y: number; zoom: number };
  history: GraphDocument[];
}
```

**PF-5 adds:**
```typescript
aiFeatures: {
  audioReactive: boolean;
  colorExtraction: boolean;
  textToLighting: boolean;
};

audioAnalysis: {
  spectrum: Float32Array;
  tempo: number;
  energy: number;
  confidence: number;
};

generatedPalette: {
  colors: CRGB[];
  source: 'audio' | 'color' | 'text';
  mood?: string;
};
```

**No conflicts**: Separate namespaces, no shared mutable state.

### 4. Component Integration

**Phase C provides:**
- `NodeEditor.tsx` - Visual graph editor
- `NodeCanvas.tsx` - Canvas rendering
- `NodePalette.tsx` - Available node types

**PF-5 consumes:**
- Renders audio-reactive nodes automatically
- Renders color-extracted nodes automatically
- Renders text-generated nodes automatically
- Users can edit AI-generated graphs post-creation

**New components:**
- `TextToLightingModal.tsx` - AI input interface
- `AudioReactivityManager.tsx` - Audio processing
- `ColorExtractionEngine.ts` - Palette from images

### 5. Data Flow: Text-to-Lighting Example

```
User Types: "Create a warm, energetic sunset effect"
    ↓
TextToLightingModal captures input
    ↓
Web Worker: NLP Processing (MiniLM embedding)
  • Classify intent: MOOD_CHANGE + COLOR_CHANGE + SPEED_UP
  • Extract parameters: { warmth: 0.8, energy: 0.7, tempo: 0.6 }
    ↓
TextToEffectMapper (main thread)
  • Select palette: sunset_warm
  • Select effect base: color_pulse
  • Generate node graph:
    {
      nodes: [
        { id: "pos", type: "position_gradient" },
        { id: "pal", type: "palette_interpolate",
          params: { palette: "sunset_warm" } },
        { id: "speed", type: "speed_control",
          params: { speed: 0.6 } },
        { id: "output", type: "output" }
      ],
      wires: [
        { from: "pos", to: "pal" },
        { from: "pal", to: "speed" },
        { from: "speed", to: "output" }
      ],
      metadata: { source: 'text', sourcePrompt: user input }
    }
    ↓
K1Provider state update
  • nodeEditor.currentGraph = generated graph
    ↓
NodeEditor renders graph
  • User sees: "Here's your sunset effect (node graph visualization)"
    ↓
(Optional) User manually edits nodes
    ↓
Node graph evaluates → LED colors
    ↓
WebSocket → Device
    ↓
Effect displays on LED strip ✅
```

---

## Resource Allocation Strategy

### Team Composition

**Recommended: 3-4 Engineers**

**Option A: 3 Engineers (Baseline)**
- **Engineer 1**: Phase C (Weeks 1-6), Phase C support (7-12), PF-5 Phase 2+ support
- **Engineer 2**: PF-5 Phase 1 setup (1-6), Phase 1 implementation (7-12), Phase 2-3 lead
- **Engineer 3**: PF-5 support (from Week 7), Phase 4-5 focus

**Option B: 4 Engineers (Optimal)**
- **Engineer 1**: Phase C (dedicated, Weeks 1-12)
- **Engineer 2**: PF-5 Phase 1-2 (Weeks 1-18)
- **Engineer 3**: PF-5 Phase 3-4 (Weeks 11-28)
- **Engineer 4**: Infrastructure, testing, docs (all weeks)

### Hand-Off Strategy

**Week 6 Hand-Off Meeting:**
- Phase C engineer presents: node editor architecture, state management patterns
- PF-5 Phase 1 engineers present: audio processing architecture
- Discuss: Integration points, shared testing strategy, deployment

**Week 12 Hand-Off Meeting:**
- Phase C RELEASE review
- PF-5 Phase 1 COMPLETE review
- Discuss: Phase 2 color integration, node graph generation

**Ongoing:**
- Weekly 30-min syncs on:
  - State management changes
  - Performance regressions
  - Integration issues

---

## Success Criteria

### Phase C Completion (Week 12)

**Technical:**
- ✅ 60 FPS canvas rendering
- ✅ 30+ FPS LED preview
- ✅ 95%+ test coverage
- ✅ Zero TypeScript strict errors
- ✅ WCAG 2.1 AA accessibility

**Feature:**
- ✅ Create patterns visually (drag-drop nodes)
- ✅ Live preview without device
- ✅ Export/import JSON
- ✅ Full undo/redo

### PF-5 Phase 1 Completion (Week 12)

**Technical:**
- ✅ >85% beat accuracy
- ✅ <10ms end-to-end latency
- ✅ Spectrum visualization working
- ✅ Tempo tracking stable

**Feature:**
- ✅ 5 audio-reactive presets
- ✅ Works with node editor
- ✅ User testing shows "wow factor"

### PF-5 Phase 2 Completion (Week 18)

**Technical:**
- ✅ Color extraction <500ms per frame
- ✅ Palette quality >4.0/5.0
- ✅ Real-time video tracking

**Feature:**
- ✅ Extract palettes from images/video
- ✅ Node editor shows generated colors
- ✅ Integration complete

### PF-5 Phase 3 Completion (Week 22)

**Technical:**
- ✅ Intent classification >90%
- ✅ <150ms node generation latency
- ✅ Voice input working

**Feature:**
- ✅ Text-to-lighting generates valid node graphs
- ✅ Node editor renders AI output
- ✅ Users can edit AI suggestions

### Full Integration Complete (Week 30)

**System:**
- ✅ Audio-reactive nodes render in editor
- ✅ AI generates node graphs
- ✅ User can edit AI output
- ✅ Everything compiles to firmware at 450+ FPS
- ✅ Zero photosensitivity violations
- ✅ Full WCAG 2.1 AA compliance
- ✅ <100ms p95 latency

---

## Risk Mitigation

### Phase C → PF-5 Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Phase C delays beyond Week 12 | Medium | High | Weekly burndown reviews, early issue flagging |
| Node graph format incompatibility | Low | High | Shared types, early integration testing (Week 4) |
| Performance regression from PF-5 | Medium | Medium | Profiling hooks, feature flags for AI features |
| State management conflicts | Low | Medium | Separate namespaces, interface contracts |
| Audio worklet browser compatibility | Low | Medium | Feature detection, graceful degradation |

### Mitigation Actions

1. **Early Integration Testing (Week 4)**
   - PF-5 team generates test node graphs
   - Phase C team renders them in prototype
   - Validate format compatibility

2. **Shared Test Suite (Week 2)**
   - Create fixtures for node graph generation
   - Both teams use same test format
   - Catch regressions early

3. **Feature Flags (Week 1)**
   - AI features behind `featureFlags.aiEnabled`
   - Node editor behind `featureFlags.nodeEditorEnabled`
   - Can disable independently if issues arise

4. **Weekly Architecture Sync (Weeks 1-30)**
   - 30-min meeting, same time every week
   - Discuss: Changes, blockers, integration points
   - Escalate issues early

---

## Deliverables by Phase

### Phase C (Weeks 1-12)
- ✅ `src/features/nodeEditor/` directory with full implementation
- ✅ 48 passing subtasks (Phase C.1-C.4)
- ✅ Documentation: dev guide, user guide, API reference
- ✅ Test suite: >95% coverage
- ✅ Accessibility audit: WCAG 2.1 AA certified
- ✅ Performance profile: 60 FPS on mid-range devices

### PF-5 Phase 1 (Weeks 1-12)
- ✅ `src/features/audioReactivity/` with AudioWorklet
- ✅ `src/services/audioReactivityManager.ts`
- ✅ `src/workers/audioProcessing.worker.ts`
- ✅ 5 audio-reactive presets
- ✅ Unit tests: >90% coverage
- ✅ Integration with K1Provider and node editor

### PF-5 Phase 2 (Weeks 13-18)
- ✅ `src/services/colorExtractionEngine.ts`
- ✅ `src/features/colorGeneration/` components
- ✅ Model deployment (ONNX Runtime)
- ✅ Integration: Color nodes in editor

### PF-5 Phase 3 (Weeks 19-22)
- ✅ `src/components/TextToLightingModal.tsx`
- ✅ `src/services/textToEffectMapper.ts`
- ✅ NLP model deployment (MiniLM)
- ✅ Node graph generation from text

### PF-5 Phase 4 (Weeks 23-28)
- ✅ `src/services/preferenceAdapter.ts`
- ✅ Feedback system UI
- ✅ Analytics pipeline
- ✅ A/B testing framework

### PF-5 Phase 5 (Weeks 29-30)
- ✅ Safety framework (photosensitivity)
- ✅ Release documentation
- ✅ Deployment runbook

---

## Decision Gate: Ready to Execute?

**Questions to confirm before proceeding:**

1. ✅ Is PF-5 the #1 strategic priority?
   - YES → Proceed with integrated roadmap

2. ✅ Can we allocate 3-4 engineers for 7 months?
   - YES → Baseline 3 sufficient, 4 optimal

3. ✅ Is Phase C a hard requirement for PF-5?
   - YES → Node editor is foundational UI for AI features

4. ✅ Can we maintain weekly architecture syncs?
   - YES → Essential for integration success

5. ✅ Do we accept 7-month timeline?
   - YES → Sequential architecture beats parallel (lower risk, higher quality)

**If all YES → Execute Phase C → PF-5 integrated roadmap**

---

## Next Steps (Week 1 Kickoff)

### Monday (Week 1)

**All Team:**
- Kickoff meeting (1 hour)
- Review integrated roadmap
- Discuss Week 1 goals
- Establish weekly sync (every Thursday 2pm)

**Engineer 1 (Phase C):**
- Review Phase C specification (2 hours)
- Read ADR-0004 (node editor architecture)
- Scope Phase C.1.1-C.1.6 (core infrastructure)
- Create feature branch: `feature/phase-c-node-editor`

**Engineers 2-3 (PF-5):**
- Review PF-5 implementation strategy (1 hour)
- Research Web Audio API (2 hours)
- Create proof-of-concept: AudioWorklet + FFT
- Create feature branch: `feature/pf5-audio-reactivity`

**All:**
- Set up shared test fixtures directory
- Document integration test plan
- Schedule Week 4 early integration testing

### By End of Week 1
- ✅ Phase C skeleton in place (types, store, canvas component started)
- ✅ PF-5 audio PoC working (FFT, spectral flux proof)
- ✅ Integration test plan drafted
- ✅ Weekly sync established

---

**Status**: ✅ **READY FOR EXECUTION**
**Strategic Priority**: PF-5 (AI Features)
**Critical Path**: Phase C → Foundation for AI-Generated Nodes
**Timeline**: 7 months (30 weeks)
**Team**: 3-4 engineers

