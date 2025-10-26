# RUNBOOK: Tempo Confidence Amplification Fix

**Date:** 2025-10-27  
**Author:** Root Cause Investigation  
**Status:** Draft - Ready for Implementation  
**Priority:** MEDIUM (Affects audio reactivity of 3 patterns)  

---

## PROBLEM STATEMENT

Three audio-reactive patterns (Pulse, Tempiscope, Beat Tunnel) log correct tempo_confidence values (0.05-0.10) but produce dim output because:

1. Tempo confidence values are naturally low (5-10% range)
2. Pattern thresholds (0.2f-0.3f) exceed reported values
3. Confidence values are used directly without amplification
4. Global brightness parameter (params.brightness=1.0) is static

**Result:** Patterns render at minimum brightness (~5-10%) despite functional audio processing.

---

## ROOT CAUSES (Ranked by Impact)

| Cause | Location | Impact | Effort |
|-------|----------|--------|--------|
| Pattern thresholds too high | generated_patterns.h L733, L824 | Patterns may not render | TRIVIAL |
| No confidence amplification | generated_patterns.h L640, L756, L836 | Weak visual response | LOW |
| Weak tempo calculation | tempo.cpp detect_beats() | Values capped at 0.10 | MEDIUM |
| Static global brightness | parameters.h, webserver.cpp | No audio-driven scaling | MEDIUM |

---

## IMPLEMENTATION PLAN

### Phase 1: Lower Threshold Gates (TRIVIAL - 5 min)

**Objective:** Ensure patterns render at current tempo_confidence levels (0.05-0.10)

#### 1.1 Fix draw_pulse() threshold
**File:** `firmware/src/generated_patterns.h` Line 633
**Current:**
```cpp
if (AUDIO_TEMPO_CONFIDENCE > beat_threshold) {  // beat_threshold = 0.3f
```
**Change:**
```cpp
if (AUDIO_TEMPO_CONFIDENCE > beat_threshold) {  // beat_threshold = 0.05f
```
**Rationale:** Current threshold (0.3f) never triggers when confidence max is 0.10

#### 1.2 Fix draw_tempiscope() threshold
**File:** `firmware/src/generated_patterns.h` Line 749
**Current:**
```cpp
if (tempo_confidence > 0.2f) {
```
**Change:**
```cpp
if (tempo_confidence > 0.05f) {  // Lower to match actual range
```
**Rationale:** Same as above

#### 1.3 Fix draw_beat_tunnel() threshold
**File:** `firmware/src/generated_patterns.h` Line 828
**Current:**
```cpp
if (tempo_confidence > beat_threshold) {  // beat_threshold = 0.2f
```
**Change:**
```cpp
if (tempo_confidence > beat_threshold) {  // beat_threshold = 0.05f
```
**Rationale:** Same as above

---

### Phase 2: Amplify Confidence Values (LOW - 10 min)

**Objective:** Transform low confidence (0.05-0.10) into usable brightness range (0.2-1.0)

#### 2.1 Fix draw_pulse() brightness calculation
**File:** `firmware/src/generated_patterns.h` Line 640
**Current:**
```cpp
pulse_waves[i].brightness = sqrtf(AUDIO_TEMPO_CONFIDENCE);
```
**Change:**
```cpp
// Boost low confidence: 0.05→0.22, 0.10→0.32
float confidence_boosted = sqrtf(AUDIO_TEMPO_CONFIDENCE) * 2.0f;
pulse_waves[i].brightness = fminf(1.0f, confidence_boosted);
```
**Rationale:**
- Square root boost: √0.05 = 0.22, √0.10 = 0.32
- Multiply by 2.0 to scale to usable range
- Clamp to max 1.0

#### 2.2 Fix draw_tempiscope() magnitude calculation
**File:** `firmware/src/generated_patterns.h` Line 756
**Current:**
```cpp
float magnitude = tempo_confidence * freshness_factor * phase_factor;
magnitude = fmaxf(0.005f, magnitude);  // Minimum 0.005
```
**Change:**
```cpp
// Amplify confidence: add square root boost
float confidence_boosted = sqrtf(tempo_confidence) * 1.5f;
float magnitude = confidence_boosted * freshness_factor * phase_factor;
magnitude = fmaxf(0.2f, magnitude);  // Minimum 20% brightness
```
**Rationale:**
- Square root boosts low values: √0.05=0.22, √0.10=0.32
- Multiply by 1.5 factor: 0.22*1.5=0.33, 0.32*1.5=0.48
- Raise minimum floor from 0.005 to 0.2

#### 2.3 Fix draw_beat_tunnel() brightness calculation
**File:** `firmware/src/generated_patterns.h` Line 836
**Current:**
```cpp
float brightness = tempo_confidence * (0.3f + 0.7f * sinf(time * 6.28318f + i * 0.1f));
```
**Change:**
```cpp
// Amplify confidence before modulation
float confidence_boosted = sqrtf(tempo_confidence) * 2.0f;
confidence_boosted = fminf(1.0f, confidence_boosted);
float brightness = confidence_boosted * (0.3f + 0.7f * sinf(time * 6.28318f + i * 0.1f));
```
**Rationale:**
- Square root boost + 2x scale = 0.05→0.44, 0.10→0.63
- Still dynamic (modulated by sine wave)
- Values fall in usable range

---

### Phase 3: Investigation (MEDIUM - 30 min)

**Objective:** Understand why tempo_confidence is capped at 0.05-0.10

#### 3.1 Analyze detect_beats() function
**File:** `firmware/src/audio/tempo.cpp`
**Tasks:**
1. Find where `tempo_confidence` is assigned (search for `= max_contribution`)
2. Check what `max_contribution` calculation is
3. Review beat detection algorithm for bottlenecks
4. Compare against expected range (should be 0.0-1.0)

#### 3.2 Check test scenario
**Tasks:**
1. Play known beat patterns (100 BPM kick drum, 4/4 time)
2. Log tempo_confidence throughout detection
3. Verify confidence increases with beat clarity
4. Check if confidence_boosted amplification helps

---

### Phase 4: Validation

#### 4.1 Compile and test
```bash
cd firmware
pio run -e k1
```

#### 4.2 Visual verification
1. Switch to Pulse pattern
2. Play music with strong beat (120 BPM, kicks)
3. Observe LED brightness:
   - **Before fix:** Dim (5-10% brightness)
   - **After fix:** Bright (30-60% brightness)
4. Verify brightness pulses with beat

#### 4.3 Pattern-by-pattern testing
- **Pulse:** Waves should be visible and bright
- **Tempiscope:** Tempo bins should show distinct colors
- **Beat Tunnel:** Animated tunnel should be clearly visible

#### 4.4 Serial logging verification
Expected output before and after:
```
[PULSE] audio_available=1, tempo_confidence=0.07, brightness=1.00, speed=0.50
```
- After fix: LED strips should be visibly brighter despite tempo_confidence still at 0.07

---

## IMPLEMENTATION CHECKLIST

### Phase 1 (Threshold Fixes)
- [ ] Update draw_pulse beat_threshold from 0.3f to 0.05f
- [ ] Update draw_tempiscope threshold from 0.2f to 0.05f
- [ ] Update draw_beat_tunnel beat_threshold from 0.2f to 0.05f
- [ ] Test compilation

### Phase 2 (Amplification Fixes)
- [ ] Add confidence boost to draw_pulse (sqrt + 2x scale)
- [ ] Add confidence boost to draw_tempiscope (sqrt + 1.5x scale)
- [ ] Add confidence boost to draw_beat_tunnel (sqrt + 2x scale)
- [ ] Test compilation
- [ ] Verify clamp values (max 1.0)

### Phase 3 (Investigation)
- [ ] Review detect_beats() in tempo.cpp
- [ ] Identify max_contribution calculation
- [ ] Document findings in issue
- [ ] Optional: Improve tempo_confidence range

### Phase 4 (Validation)
- [ ] Compile firmware
- [ ] Deploy to device
- [ ] Test Pulse pattern with music
- [ ] Test Tempiscope pattern with music
- [ ] Test Beat Tunnel pattern with music
- [ ] Verify Serial output shows correct values
- [ ] Check for any new compilation warnings

---

## EXPECTED OUTCOMES

### Before Fix
```
Pattern: Pulse (music playing, 120 BPM)
Observed: Barely visible dimness (5% brightness)
Serial: [PULSE] audio_available=1, tempo_confidence=0.07, brightness=1.00
```

### After Fix
```
Pattern: Pulse (music playing, 120 BPM)
Observed: Bright waves (40-50% brightness), pulsing with beat
Serial: [PULSE] audio_available=1, tempo_confidence=0.07, brightness=1.00
```

The logging won't change (tempo_confidence still 0.07), but the **visible output will be 5-10x brighter** because patterns amplify low confidence values.

---

## RISKS & MITIGATION

| Risk | Mitigation |
|------|-----------|
| Patterns too bright | Adjust multiplier from 2.0x to 1.5x if needed |
| Threshold too low triggers false positives | Keep at 0.05f - acceptable noise floor |
| Breaks existing user expectations | Brightness increase is desired behavior |
| Over-amplification in high-noise environment | Test with background noise |

---

## ROLLBACK PLAN

If amplification causes issues:
1. Revert Phase 2 changes (keep Phase 1 threshold fixes)
2. Use lower multipliers: 1.5x instead of 2.0x
3. Increase minimum brightness floor: 0.3f instead of 0.2f

---

## SUCCESS CRITERIA

- [ ] All three patterns render visibly with music (beats clear)
- [ ] No new compiler warnings
- [ ] Patterns still respond to audio (brightness varies with music)
- [ ] Compilation completes without errors
- [ ] No memory leaks (patterns still < 20% of available RAM)

---

## NEXT STEPS

1. **Implement Phase 1-2** (trivial + low effort)
2. **Test** on device with music
3. **Investigate** tempo.cpp if confidence values still seem low
4. **Consider Phase 3+** optimization if needed

---

## RELATED ISSUES

- `/docs/analysis/tempo_confidence_gap_analysis.md` — Full root cause analysis
- Issue: Pattern brightness locked at 5-10% despite working audio

---

## APPENDIX: Code Templates

### Confidence Boost Pattern
```cpp
// Standard pattern for amplifying low values
float confidence = AUDIO_TEMPO_CONFIDENCE;  // Range: 0.0-0.1
float confidence_boosted = sqrtf(confidence) * BOOST_FACTOR;
confidence_boosted = fminf(1.0f, confidence_boosted);  // Clamp to [0, 1]
```

**Boost factors by desired output:**
- 2.0x: 0.05→0.44, 0.10→0.63 (strong amplification)
- 1.5x: 0.05→0.33, 0.10→0.47 (moderate amplification)
- 1.0x: No boost (direct use)

