---
author: Claude Code Agent (PF-5 Orchestrator)
date: 2025-10-29
status: in_review
intent: PF-5 Phase 1-5 execution roadmap with weekly milestones, team assignments, and decision gates (REVISED - palette discovery replaces ML extraction)
---

# PF-5 Execution Roadmap: Weeks 1-36

**Objective**: Ship audio-reactive lighting (Phase 1) in 12 weeks, followed by smart palette selection, text-to-lighting, personalization, and safety validation.

**Key Discovery**: 33 curated palettes already exist in `firmware/src/palettes.h`. Phase 2 pivots from "ML color extraction" to "smart audio-to-palette routing" (saves 15+ days).

---

## PHASE 1: AUDIO REACTIVITY (Weeks 1-12)

**Status**: 85% code complete. Remaining: validation, edge cases, mobile testing.

**Deliverables**:
- ✅ 5 audio-reactive presets shipped
- ✅ <30ms browser latency validated
- ✅ Beat accuracy >85% on labeled datasets
- ✅ All platforms tested (desktop, mobile, browsers)

### Week 1-2: Validation Infrastructure

**Team**: 1 Audio Engineer, 1 Frontend Engineer

**Tasks**:
- [ ] Latency measurement harness (performance.now() timestamps)
- [ ] Download MIREX beat tracking dataset
- [ ] Create browser compatibility test matrix (Chrome, Safari, Firefox)
- [ ] Mobile audio testing on actual devices (iOS + Android)
- [ ] Set up AudioWorklet CPU/memory profiling

**Deliverable**: Test infrastructure ready, baseline latency measured

---

### Week 3-4: Stress Testing & Edge Cases

**Team**: 1 Audio Engineer

**Tasks**:
- [ ] 1-hour continuous audio latency test (no drift, no memory leaks)
- [ ] Beat accuracy validation (F1 score on MIREX)
- [ ] Edge cases: silent audio, very low tempo (40 BPM), very high tempo (200 BPM)
- [ ] Genre coverage: EDM, jazz, rock, classical, speech
- [ ] Double-detection prevention (beats don't fire twice)

**Deliverable**: Latency <30ms validated, beat accuracy >85% confirmed

---

### Week 5-6: Preset Tuning & Mobile

**Team**: 1 Frontend Engineer

**Tasks**:
- [ ] Test all 5 presets with K1 hardware
- [ ] iOS audio: permissions, context, latency
- [ ] Android audio: same as iOS on real devices
- [ ] Preset parameter tweaking (hue ranges, saturation, speed scaling)
- [ ] Document preset behavior per audio feature

**Deliverable**: All 5 presets shipped, mobile audio working

---

### Week 7-8: Code Quality & Integration

**Team**: 1 Audio Engineer, 1 Frontend Engineer

**Tasks**:
- [ ] TypeScript type-checking (zero errors)
- [ ] ESLint/Prettier code formatting
- [ ] Unit tests for AudioReactivePresets (each mapping function)
- [ ] Component tests (mount/unmount, preset selection, K1 integration)
- [ ] Remove all console.log() calls

**Deliverable**: Code ready for production, all tests passing

---

### Week 9-10: Device Compatibility

**Team**: 1 Frontend Engineer

**Tasks**:
- [ ] Test on 5+ different browser versions
- [ ] Test on 3+ device form factors (desktop, tablet, phone)
- [ ] Graceful degradation if AudioContext unavailable
- [ ] Error handling for microphone permission denial
- [ ] Document supported browsers + devices

**Deliverable**: Compatibility matrix complete, fallback logic working

---

### Week 11-12: Documentation & Polish

**Team**: 1 Audio Engineer

**Tasks**:
- [ ] API documentation (useAudioReactivity hook, AudioFeatures interface)
- [ ] Developer guide (how to add presets, tune parameters)
- [ ] User guide (feature overview, privacy, troubleshooting)
- [ ] Final performance profiling + optimization
- [ ] Accessibility audit (keyboard nav, color contrast)

**Deliverable**: Phase 1 ready to ship, docs complete

---

## PHASE 2: SMART PALETTE SELECTOR (Weeks 13-16)

**Status**: Discovery complete. Pivoting from "ML color extraction" to "audio-to-palette routing."

**Why**: 33 production-tested gradient palettes exist in `firmware/src/palettes.h`. No need to train/extract. Just route audio features → palette indices.

**Deliverables**:
- ✅ Audio features → palette mapping algorithm
- ✅ All 33 palettes tested with audio
- ✅ UI to browse/favorite palettes
- ✅ Preset rotation (auto-switch based on music)

### Week 13: Algorithm Design

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Map spectralCentroid (0-4kHz) → warm/cool palettes
- [ ] Map energy (0-100) → intensity (brightness scaling)
- [ ] Map tempo → palette rotation speed
- [ ] Define thresholds (bass <500Hz → fire/lava, treble >3kHz → ocean/blue)
- [ ] Create routing decision tree

**Example algorithm**:
```typescript
function selectPalette(features: AudioFeatures): number {
  const { energy, spectralCentroid, tempo, rms } = features;

  if (energy > 70 && spectralCentroid < 500) return 23;  // Lava (intense)
  if (spectralCentroid < 200 && energy > 50) return 24;   // Fire (warm)
  if (tempo > 150 && energy > 60) return 14;              // Rainbow Sherbet
  if (spectralCentroid > 3000) return 2;                  // Ocean Breeze (treble)
  if (rms < 0.1) return 1;                                // Rivendell (ambient)
  return 0;                                                // Sunset Real (default)
}
```

**Deliverable**: Routing algorithm + decision tree finalized

---

### Week 14: Testing & Tuning

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Test with 10+ music samples (diverse genres)
- [ ] Verify palette transitions are smooth (no flickering)
- [ ] Adjust thresholds based on device testing
- [ ] Profile computation time (<5ms per decision)
- [ ] Validate K1 device response

**Deliverable**: Routing tested, thresholds tuned

---

### Week 15: UI Components

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Palette browser (grid of 33 palettes)
- [ ] Favorite/lock UI (pin favorite palette)
- [ ] Current palette name display
- [ ] Audio feature visualization (which feature influenced selection?)
- [ ] Palette preview (show interpolation with test progress)

**Deliverable**: UI components shipping

---

### Week 16: Integration & Polish

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Connect UI to audio features (live update)
- [ ] Persist favorite palettes (localStorage)
- [ ] Graceful fallback if routing fails
- [ ] Accessibility audit
- [ ] Final testing

**Deliverable**: Phase 2 shipped, integrated with Phase 1

---

## PHASE 3: TEXT-TO-LIGHTING (Weeks 17-20)

**Deliverables**:
- ✅ Intent classification >90% accurate
- ✅ Voice input on iOS/Android
- ✅ Text input modal UI
- ✅ <150ms text → lighting latency

### Week 17: Model Setup

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Download MiniLM embedding model (quantized, <5 MB)
- [ ] Test transformers.js in React
- [ ] Measure model loading time + bundle size impact
- [ ] Define 7 intent classes (warm, cool, energetic, calm, bright, dark, moody)
- [ ] Create intent → palette mapping (which palette per intent?)

**Intent Mapping Example**:
```
warm     → Sunset Real, Lava, Fire
cool     → Ocean Breeze, Coral Reef, Blue Cyan
energetic → Rainbow Sherbet, Pink Splash, Departure
calm     → Rivendell, Ambient Sway, Landscape
```

**Deliverable**: Model tested, intent classes defined

---

### Week 18: Text Input UI

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Text input modal (Cmd+T or button click)
- [ ] Voice input (Web Speech API, no library needed)
- [ ] Intent classification from text
- [ ] Suggestion dropdown (common phrases)
- [ ] History (previous inputs)

**Deliverable**: Text/voice UI shipping

---

### Week 19: Intent Mapping

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Fine-tune intent classification (test with user phrases)
- [ ] Map intent → palette index
- [ ] Map intent → audio feature overrides (e.g., "warm" = reduce centroid bias)
- [ ] Validate accuracy >90%
- [ ] Profile latency (<150ms)

**Deliverable**: Intent mapping validated

---

### Week 20: Integration & Testing

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Connect text input to K1 device
- [ ] Voice input on iOS/Android
- [ ] Error handling (unclear intent, network failure)
- [ ] Privacy audit (local processing, no server calls)
- [ ] Final UX testing

**Deliverable**: Phase 3 shipped

---

## PHASE 4: PERSONALIZATION & LEARNING (Weeks 21-26)

**Deliverables**:
- ✅ User preferences learned over 20+ interactions
- ✅ EMA model shows +5% rating improvement trend
- ✅ A/B testing framework deployed
- ✅ Analytics pipeline capturing user feedback

### Week 21: Preference Storage

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Add `userPreferences` state to K1Provider
- [ ] Store feedback history (timestamp, effect, rating, context)
- [ ] Persist to localStorage (privacy-first, no cloud)
- [ ] Create preference index (effect ID → score 0.0-1.0)

**Data structure**:
```typescript
userPreferences: {
  feedbackHistory: Array<{
    timestamp: number,
    effectId: string,
    rating: 1 | -1, // 👍 or 👎
    spectralCentroid: number, // What was playing?
    energy: number,
    tempo: number
  }>,
  preferenceScores: Map<string, number>, // EMA per effect
  abTestGroup: 'A' | 'B', // Random assignment
}
```

**Deliverable**: Storage layer complete

---

### Week 22: Feedback UI

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] 👍 👎 buttons on each effect
- [ ] Clear rating buttons (undo feedback)
- [ ] Rating history view (what did user like?)
- [ ] Export preferences (backup/restore)

**Deliverable**: Feedback UI shipping

---

### Week 23: EMA Learning Algorithm

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Implement EMA (exponential moving average)
  ```
  preference_new = 0.9 * preference_old + 0.1 * feedback
  ```
- [ ] Smoothing factor tuning (0.9 = recent feedback weighted 10%)
- [ ] Initialize preference scores (0.5 = neutral)
- [ ] Validate learning (preference trends visible after 20 interactions)

**Deliverable**: EMA algorithm tested

---

### Week 24: A/B Testing Framework

**Team**: 1 Full-stack Engineer + 1 Backend Engineer (contract, 2 weeks)

**Tasks**:
- [ ] Random user assignment to group A/B
- [ ] Collect metrics: engagement, ratings, session length
- [ ] A/B testing infrastructure (track variant, submit results)
- [ ] Analytics endpoint (if cloud-based) OR local storage (if privacy-first)

**Decision gate**: Cloud analytics or local-only?
- **Local**: Track in localStorage, export manually (privacy, simpler)
- **Cloud**: Track remotely, real-time dashboards (compliance required, GDPR/CCPA)

**Deliverable**: A/B testing framework deployed

---

### Week 25: Analytics Dashboard (Optional)

**Team**: 1 Frontend Engineer

**Tasks**:
- [ ] View user preference trends (graph of learned scores)
- [ ] View A/B test results (variant A vs B engagement)
- [ ] Export analytics (CSV, JSON)
- [ ] Privacy settings (what data to collect?)

**Deliverable**: Analytics dashboard optional, not required for MVP

---

### Week 26: Integration & Validation

**Team**: 1 Full-stack Engineer

**Tasks**:
- [ ] Connect feedback to preference learning
- [ ] Verify EMA scores trending upward for liked effects
- [ ] Validate A/B testing (randomization working)
- [ ] Monitor for privacy violations
- [ ] Final UX testing

**Deliverable**: Phase 4 shipped, personalization active

---

## PHASE 5: SAFETY & OPTIMIZATION (Weeks 27-28)

**Deliverables**:
- ✅ Zero photosensitivity violations
- ✅ WCAG 2.1 AA compliance
- ✅ Runs on iPhone SE (3-year-old device)
- ✅ <5% battery impact per hour
- ✅ 99.9% uptime in stress tests

### Week 27: Safety Validation

**Team**: 1 Full-stack Engineer + 1 QA Engineer

**Tasks**:
- [ ] **Photosensitivity validator**
  - Count flashing frequency per frame
  - Ensure <3 Hz (safe for epilepsy risk)
  - Add warning if user exceeds limit

- [ ] **Capability detector**
  - Check for Web Audio API, AudioWorklet, localStorage
  - Graceful degradation if features missing

- [ ] **Performance profiler**
  - 60 FPS maintained on old devices
  - Memory usage <50 MB
  - CPU usage <20%

- [ ] **Accessibility audit**
  - Run axe-core scan
  - Fix high/critical violations
  - Validate WCAG 2.1 AA

**Deliverable**: Safety checks in place, audit complete

---

### Week 28: Optimization & Testing

**Team**: 1 QA Engineer

**Tasks**:
- [ ] **Stress tests**
  - 100k parameter changes (burst updates)
  - 48-hour continuous runtime (leak detection)
  - 1000+ palette transitions (no crashes)

- [ ] **Device testing**
  - iPhone SE (old iOS)
  - Galaxy S8 (old Android)
  - Desktop (low-end GPU)

- [ ] **Battery profiling** (if possible with DevTools)
  - Measure power draw per component
  - Identify optimization opportunities

- [ ] **Documentation**
  - Supported devices list
  - Known limitations
  - Privacy policy
  - Safety guidelines

**Deliverable**: Phase 5 complete, ready for launch

---

## CRITICAL MILESTONES & DECISION GATES

### After Week 12 (Phase 1 Complete)
✅ **GO CRITERIA**:
- Beat accuracy >85% validated
- Latency <30ms (browser) confirmed
- All 5 presets tested on K1 hardware
- Mobile audio working on iOS + Android
- Zero critical bugs

❌ **NO-GO**: Phase 1 slips to Week 14-16

---

### After Week 16 (Phase 2 Complete)
✅ **GO CRITERIA**:
- Palette routing algorithm working
- All 33 palettes tested with audio
- UI shipping and responsive
- No performance regressions
- Smooth transitions between palettes

❌ **NO-GO**: Phase 2 slips to Week 18-20

---

### After Week 20 (Phase 3 Complete)
✅ **GO CRITERIA**:
- Intent classification >90% accurate
- Voice input working on both platforms
- <150ms latency (text → lighting)
- No privacy/security violations
- User testing shows UX is intuitive

❌ **NO-GO**: Phase 3 slips to Week 22-24

---

### After Week 26 (Phase 4 Complete)
✅ **GO CRITERIA**:
- EMA learning showing +5% improvement trend
- A/B testing framework deployed and tracking
- Zero preference data leaks
- User feedback captured properly
- Analytics exporting correctly

❌ **NO-GO**: Phase 4 slips to Week 28-30

---

### After Week 28 (Phase 5 Complete)
✅ **SHIP READY**:
- Zero photosensitivity violations
- WCAG 2.1 AA audit complete
- Stress tests passing 99.9% uptime
- Old devices tested and working
- Documentation complete

---

## TEAM ALLOCATION

### Phase 1 (Weeks 1-12)
- **Audio Validation Engineer**: 90% (4-5 days/week)
- **Frontend Engineer**: 50% (2-3 days/week)

### Phase 2 (Weeks 13-16)
- **Full-stack Engineer**: 100% (Phase 2 lead)

### Phase 3 (Weeks 17-20)
- **Full-stack Engineer**: 100% (Phase 3 lead)

### Phase 4 (Weeks 21-26)
- **Full-stack Engineer**: 90%
- **Backend Engineer** (contract, 4 weeks): 50% (analytics infrastructure)

### Phase 5 (Weeks 27-28)
- **Full-stack Engineer**: 50%
- **QA Engineer**: 100%

### Parallel (Weeks 7-12): Phase 2 Model Prep
- **ML Engineer** (contract, 1 week): Evaluate palette routing thresholds

**Total**: 4-5 engineers, 36 weeks (with buffers)

---

## TIMELINE VISUALIZATION

```
WEEK 0     Setup + Phase C transfer
WEEKS 1-12 Phase 1: Audio Reactivity ███████████ (CRITICAL PATH)
WEEKS 13-16 Phase 2: Palette Selector ████
WEEKS 17-20 Phase 3: Text-to-Lighting ████
WEEKS 21-26 Phase 4: Personalization ██████
WEEKS 27-28 Phase 5: Safety ██
WEEKS 29-36 User testing + launch ████████
```

---

## SUCCESS CRITERIA (By Phase)

**Phase 1**: User can hear music, sees responsive LED effects
**Phase 2**: User can discover 33 different palettes, see them respond to music
**Phase 3**: User can say "warm ambient vibes" and see appropriate palette + effects
**Phase 4**: App learns user preferences, recommends effects they rated 👍
**Phase 5**: App works on old devices, doesn't cause seizures, respects privacy

---

## RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Audio latency higher than expected | Medium | High | Validate in Week 1-2, have fallback algorithms |
| Mobile audio issues | Medium | Medium | Test early (Week 5-6), get Android/iOS devices |
| Phase 2 routing thresholds need tuning | High | Low | Allocate Week 14 for tuning, gather audio samples |
| Model licensing issues (MiniLM) | Low | Medium | Verify Apache 2.0 license before Week 17 |
| Battery drain (if tracking analytics) | Medium | Medium | Use local storage + manual export (no cloud) |
| Photosensitivity validation complexity | Low | High | Consult with accessibility expert, add early |

---

## SUCCESS CRITERIA FOR LAUNCH

- ✅ Phase 1-5 complete and tested
- ✅ 99.9% uptime in stress tests
- ✅ Zero critical security/privacy issues
- ✅ WCAG 2.1 AA compliant
- ✅ Supported device list documented
- ✅ User guide + privacy policy published

---

**Status**: READY FOR EXECUTION ✅
**Branch**: `feature/pf5-audio-reactivity-execution`
**Next Step**: Week 0 kickoff (Phase C transfer, test infrastructure setup)
