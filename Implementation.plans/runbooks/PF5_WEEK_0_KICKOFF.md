---
author: Claude Code Agent (ULTRATHINK)
date: 2025-10-29
status: in_review
intent: Week 0 kickoff checklist for PF-5 Phase 1 execution; Phase C transfer; ML infrastructure setup
---

# PF-5 Week 0: Kickoff Checklist

**Objective**: Clear Phase C off the path, validate Phase 1 readiness, begin ML model sourcing.

**Duration**: 3-5 days

---

## PHASE C TRANSFER (1 day)

- [ ] **Confirm team ownership**: Which team takes Phase C?
- [ ] **Document handover**: Link PHASE_C_ALIGNMENT_EXECUTIVE_BRIEF.md
- [ ] **Git branch setup**: Create `feature/phase-c-node-editor` on their branch
- [ ] **Kanban transfer**: Move 15-20 tasks to their backlog
- [ ] **Communication**: Sync teams on dependencies (K1Provider already extended, no changes needed)

**Deliverable**: Phase C fully transferred, zero blockers on PF-5 timeline

---

## PHASE 1 VALIDATION SETUP (1-2 days)

### Create Test Infrastructure

- [ ] **AudioWorklet latency measurement**
  - [ ] Add performance.now() timestamps before/after AudioWorklet.process()
  - [ ] Log to console or IndexedDB for analysis
  - [ ] Compare to theoretical (1024 samples @ 44.1kHz = 23.2ms)

- [ ] **Beat accuracy validation**
  - [ ] Download MIREX beat tracking dataset (~10 songs, labeled)
  - [ ] Create test harness to run AudioWorklet against recorded audio
  - [ ] Compare detected beats to ground truth (F1 score target >0.85)
  - [ ] Iterate on threshold parameters if needed

- [ ] **Browser compatibility matrix**
  - [ ] Test on Chrome (latest 2 versions)
  - [ ] Test on Firefox (latest 2 versions)
  - [ ] Test on Safari (iOS + desktop)
  - [ ] Create compatibility report template

- [ ] **Mobile audio testing**
  - [ ] iPhone: getUserMedia permissions, audio context latency
  - [ ] Android: Same as iPhone
  - [ ] Document any platform-specific quirks
  - [ ] Test on actual devices (not emulators)

### Performance Profiling

- [ ] **Worklet CPU usage**
  - [ ] Measure CPU time per sample in AudioWorklet.process()
  - [ ] Compare to budget: <3ms per 1024-sample buffer
  - [ ] Profile with Chrome DevTools: Performance tab

- [ ] **Memory usage**
  - [ ] Measure AudioContext memory footprint
  - [ ] Monitor for leaks during 1-hour continuous audio
  - [ ] Check for buffering issues

- [ ] **Preset execution time**
  - [ ] Time each of 5 presets' mapAudioToLighting() function
  - [ ] Target: <2ms per call (at 30 FPS = 33ms budget)
  - [ ] Identify any bottlenecks

### Device Integration Testing

- [ ] **Test with actual K1 hardware**
  - [ ] Connect to test device
  - [ ] Verify sendCommand() is called correctly
  - [ ] Validate LED response matches audio features
  - [ ] Test all 5 presets with different music

- [ ] **Edge case testing**
  - [ ] Silent audio (threshold behavior)
  - [ ] Very low tempo (40 BPM ballad)
  - [ ] Very high tempo (200 BPM electronic)
  - [ ] Speech (vs. music)
  - [ ] Multiple simultaneous sounds
  - [ ] Sudden silence interruption

**Deliverable**: Test infrastructure in place, validation plan documented

---

## PHASE 1 CODE READINESS (1 day)

### Code Quality Checks

- [ ] **Run TypeScript compiler**
  ```bash
  cd k1-control-app
  npm run type-check
  ```
  - [ ] Resolve any type errors in audio files
  - [ ] Ensure AudioFeatures interface is exported

- [ ] **Lint audio code**
  ```bash
  npm run lint -- src/audio/ src/hooks/useAudioReactivity.ts src/components/audio/
  ```
  - [ ] Fix style violations
  - [ ] Check for console.log() calls (remove before ship)

- [ ] **Unit tests**
  - [ ] Create test for each AudioReactivePreset mapping function
  - [ ] Mock AudioFeatures with test data
  - [ ] Verify hue/saturation/brightness ranges (0-360, 0-100, 0-100)

- [ ] **Component tests**
  - [ ] Test AudioReactivePresets.tsx component mount/unmount
  - [ ] Verify preset selection triggers startListening()
  - [ ] Verify K1 sendCommand() is called on audio features update

### Documentation

- [ ] **API documentation**
  - [ ] Document useAudioReactivity hook with examples
  - [ ] Document AudioReactivePreset interface
  - [ ] Document AudioFeatures interface

- [ ] **Developer guide**
  - [ ] How to add a new preset
  - [ ] How to adjust latency sensitivity
  - [ ] How to debug audio issues

- [ ] **User documentation** (start draft)
  - [ ] Audio reactivity feature overview
  - [ ] How to enable microphone permission
  - [ ] Preset descriptions + use cases
  - [ ] Troubleshooting guide

**Deliverable**: Code ready for production, tests passing, docs started

---

## ML INFRASTRUCTURE PLANNING (2 days)

### Model Sourcing (Phase 2 prep)

- [ ] **Color extraction model research**
  - [ ] [ ] Search HuggingFace for color extraction models (ONNX format)
  - [ ] [ ] Check if pre-trained models available for image→dominant colors
  - [ ] [ ] Evaluate model size vs. performance trade-off
  - [ ] [ ] Decision: use pre-trained or train custom?
  - [ ] [ ] Document recommended model + source link

- [ ] **MiniLM embedding model (Phase 3 prep)**
  - [ ] [ ] Verify MiniLM licensing (Apache 2.0, MIT, etc.)
  - [ ] [ ] Source quantized version (<5 MB) for browser
  - [ ] [ ] Check compatibility with transformers.js or ONNX Runtime
  - [ ] [ ] Document intent classes (7-10 classes for Phase 3)

### Library Evaluation

- [ ] **ONNX Runtime Web**
  - [ ] Test import in existing React project
  - [ ] Measure bundle size impact
  - [ ] Check browser compatibility
  - [ ] Document setup steps

- [ ] **Color math libraries**
  - [ ] Evaluate K-Means implementations (ml.js, simple-statistics)
  - [ ] Evaluate CIEDE2000 implementations (delta-e, color-difference)
  - [ ] Size + performance trade-off

- [ ] **Embedding alternatives**
  - [ ] transformers.js (Hugging Face)
  - [ ] ONNX Runtime (custom models)
  - [ ] Decision matrix: latency vs. size vs. accuracy

### Architecture Planning

- [ ] **Create Phase 2 design doc**
  - [ ] [ ] Data flow: image/video → color extraction → K-Means → palette
  - [ ] [ ] Model inference: where runs? (main thread, worker?)
  - [ ] [ ] Performance budget: <500ms per frame (max 2 FPS)
  - [ ] [ ] UI components: palette editor, history, presets

- [ ] **Create Phase 3 design doc**
  - [ ] [ ] Data flow: text input → embedding → intent classification → mapping
  - [ ] [ ] Embedding cache: should we cache intent embeddings?
  - [ ] [ ] UI: text input modal, voice input, suggestions
  - [ ] [ ] Performance: <150ms text→lighting latency

- [ ] **Create Phase 4 design doc**
  - [ ] [ ] Preference storage: K1Provider state + localStorage?
  - [ ] [ ] EMA algorithm: smoothing factor, history length
  - [ ] [ ] A/B testing: how to split users?
  - [ ] [ ] Analytics: what to track? Privacy implications?

**Deliverable**: Model sources identified, architecture approved, Phase 2-4 design docs drafted

---

## TEAM ASSIGNMENTS & KICKOFF (1 day)

### Phase 1 Execution (Weeks 1-12)

**Audio Validation Lead**:
- [ ] Assigned: ______________________
- [ ] Responsibilities: Stress testing, latency validation, edge case coverage
- [ ] Time commitment: 90% (4-5 days/week)

**Frontend Engineer** (Audio Presets):
- [ ] Assigned: ______________________
- [ ] Responsibilities: Mobile testing, preset tuning, analytics
- [ ] Time commitment: 50% (2-3 days/week)

**Checklist**:
- [ ] Both team members have access to test K1 device
- [ ] Performance profiling tools installed (Chrome DevTools, etc.)
- [ ] MIREX dataset downloaded locally
- [ ] Slack channel created: #pf5-phase1

### Phase 2-3 Preparation (Weeks 7-12)

**ML Engineer** (contract, Part-time):
- [ ] Assigned: ______________________
- [ ] Responsibilities: Model sourcing, quantization, optimization
- [ ] Time commitment: 20-30% (1-2 days/week)

**Full-stack Lead** (Phase 2-3):
- [ ] Assigned: ______________________
- [ ] Responsibilities: Architecture, UI, integration
- [ ] Time commitment: 0% (Phase 1), 90% (Weeks 15-22)

### Phase 4-5 Preparation

**Full-stack Engineer** (Analytics/Personalization):
- [ ] Assigned: ______________________
- [ ] Responsibilities: Preference learning, A/B testing, safety
- [ ] Time commitment: 0% (Phase 1-2), 90% (Weeks 23-30)

**Checklist**:
- [ ] Team sync scheduled for Friday EOD (weekly)
- [ ] Slack channels created: #pf5-phase2, #pf5-phase3, #pf5-phase4
- [ ] Shared docs: https://docs.google.com/....

---

## DECISION GATES

### Before Week 1 Execution
- [ ] **Phase C transfer CONFIRMED** (other team assigned)
- [ ] **Test infrastructure APPROVED** (latency, beat accuracy, compat)
- [ ] **Team assignments CONFIRMED** (Phase 1 lead + frontend eng)
- [ ] **K1 hardware available** (at least 1 test device)

### Before Phase 2 (Week 14)
- [ ] **Phase 1 validation PASSED**
  - [ ] Beat accuracy >85%
  - [ ] Latency <30ms (browser)
  - [ ] All 5 presets shipped + tested
  - [ ] Mobile audio working

- [ ] **Model sourcing COMPLETE**
  - [ ] Color extraction model identified
  - [ ] MiniLM licensing confirmed
  - [ ] ONNX Runtime evaluation done

### Before Phase 3 (Week 18)
- [ ] **Phase 2 SHIPPED**
  - [ ] Color extraction <500ms/frame
  - [ ] 4-8 dominant colors extracted
  - [ ] Palette UI 95%+ test coverage
  - [ ] No performance regressions

### Before Phase 4 (Week 22)
- [ ] **Phase 3 SHIPPED**
  - [ ] Intent classification >90% accurate
  - [ ] Voice input on iOS/Android
  - [ ] Text input modal shipping
  - [ ] <150ms latency validated

### Before Phase 5 (Week 28)
- [ ] **Phase 4 SHIPPED**
  - [ ] User preferences being learned
  - [ ] A/B testing framework deployed
  - [ ] EMA shows +5% improvement trend
  - [ ] Zero critical bugs

---

## LINKS & RESOURCES

**Documentation**:
- Phase 1 Details: `docs/reports/PHASE_QUICK_REFERENCE.md` (lines 182-421)
- Verification Report: `docs/reports/PHASE_QUICK_REFERENCE_VERIFICATION.md`
- PF-5 Assessment: `docs/reports/PF5_EXECUTION_READINESS_ASSESSMENT.md`

**Code**:
- AudioWorklet: `k1-control-app/src/audio/AudioWorkletProcessor.js` (210 lines)
- Hook: `k1-control-app/src/hooks/useAudioReactivity.ts` (204 lines)
- Presets: `k1-control-app/src/components/audio/AudioReactivePresets.tsx` (256 lines)
- Firmware audio: `firmware/src/audio/goertzel.h` (253 lines), `tempo.h` (80 lines)

**External Resources**:
- MIREX Beat Tracking: http://www.music-ir.org/mirex/abstracts/2014/mirex14_beat_acousticeval.pdf
- ONNX Model Zoo: https://github.com/onnx/models
- Transformers.js: https://xenova.github.io/transformers.js/
- Color Delta-E: https://en.wikipedia.org/wiki/Color_difference#CIEDE2000

---

## SUCCESS CRITERIA

**Week 0 Complete When**:
✅ Phase C transferred (no risk to PF-5 timeline)
✅ Test infrastructure ready (latency, accuracy, compatibility)
✅ Phase 1 code reviewed + approved
✅ Team assignments locked in
✅ ML model sourcing started (Phase 2-3 prep)

**Expected Timeline**: 3-5 business days

---

**Status**: READY FOR EXECUTION ✅
