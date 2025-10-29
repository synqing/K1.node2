---
author: Claude (Learning Protocol Executor)
date: 2025-10-30
status: published
intent: Quick reference guide for interpreting MIREX beat metrics in diagnostic contexts. Used during Week 1-4 beat tracking development.
---

# MIREX Beat Metrics Diagnostic Guide

## Quick Reference: What Each Metric Tells You

### F-measure (Precision-Recall Harmonic Mean)

**In 10 words:** "Did you find the right beats at the right times?"

**What it measures:**

- Percentage of detected beats that fall within ±70-80ms of ground truth beats
- Balanced between precision (false positives) and recall (false negatives)

**Ranges:**

- F=1.0 → Perfect beat detection (rare)
- F>0.8 → Very good detection
- F=0.5-0.8 → Decent detection but some timing errors
- F<0.3 → Algorithm is fundamentally broken

**When it crashes (F<0.3):**

| Symptom | Likely Cause | How to Debug |
|---------|-------------|-------------|
| Offset too early/late by ~100ms | Systematic timing error | Check audio I/O sync, onset detection delay |
| Tempo is 2x or 0.5x | Wrong tempo estimation | Verify BPM calculation, check beat tracking state machine |
| Detecting silence instead of beats | Onset threshold too high | Lower threshold or check audio level normalization |
| Every other beat detected | Tempo off by octave | Check if beat is detected as eighth-note instead of quarter |

**Real-world example from Week 1:**

```
+100ms offset → F=0.38 (in tolerance but at the edge)
+200ms offset → F=0.42 (beyond tolerance edge)
```

---

### Cemgil (Groove Alignment Score)

**In 10 words:** "Are your beats in the music's groove?"

**What it measures:**

- Proportion of ground truth beats that have an estimate within ±70-80ms
- More lenient than F-measure (missing beats don't penalize as harshly)

**Ranges:**

- Cemgil=1.0 → All ground truth beats have matches (perfect recall)
- Cemgil>0.8 → You're finding most of the real beats
- Cemgil=0.5 → You're finding about half, but they're in rhythm
- Cemgil<0.2 → You're missing the pulse entirely

**Cemgil vs. F-measure difference:**

| Scenario | F-measure | Cemgil | Why Different |
|----------|-----------|--------|--------------|
| 50% beats detected, all correct | 0.67 | 0.83 | F penalizes missing beats equally with wrong beats |
| All beats detected, 20% wrong phase | 0.80 | 0.70 | Cemgil cares more about phase alignment |
| ±50ms jitter on all beats | 0.99 | 0.80 | F tolerates jitter; Cemgil accumulates error |

**When Cemgil crashes:**

| Symptom | Likely Cause |
|---------|-------------|
| Cemgil=0.0 while F>0 | You're detecting beats but at completely wrong phase |
| Cemgil drops while F stays high | Systematic phase offset (beats are early/late but consistent) |
| Cemgil=0.5 with F=0.7 | You're finding beats but missing some; those you find are mostly in groove |

**Real-world diagnostic:**

```
F=0.38, Cemgil=0.20 after +100ms offset
→ You found some beats (38% recall), but they're out of phase (only 20% in groove)
→ This signals: systematic timing error, not rhythm misunderstanding
```

---

### Goto (Phase Lock Score)

**In 10 words:** "Is your tempo locked to the ground truth?"

**What it measures:**

- Correlation between estimated beat phase and ground truth
- Phase-locked alignment at the detected tempo

**Ranges:**

- Goto=1.0 → Perfect phase lock (rare; requires exact tempo + perfect phase)
- Goto>0.5 → Tempo is correct and phase is mostly aligned
- Goto=0.0 → Either tempo is wrong OR phase is offset (but tempo might be right)
- Goto<0 → Tempo is inverted or fundamentally wrong

**The KEY insight about Goto=0.0:**

When you see `Goto=0.0`, it does NOT necessarily mean "algorithm failed."

It could mean:

1. Your tempo is correct but phase is offset (still good!)
2. Your tempo is completely wrong (bad)

**How to distinguish:**

```
Goto=0.0, F=0.4, Cemgil=0.2
→ Systematic offset, but tempo might be right
→ Check: audio sync, onset detection delay

Goto=0.0, F=0.1, Cemgil=0.1
→ Beats are completely wrong
→ Check: tempo estimation, beat tracking logic
```

**When Goto breaks:**

| Scenario | Goto | F-measure | Diagnosis |
|----------|------|-----------|-----------|
| Offset every beat +100ms | 0.0 | 0.4 | Phase offset, tempo correct |
| Detect 2x tempo (half-time) | 0.0 | 0.2 | Tempo wrong, not phase |
| Random beat positions | 0.0 | 0.0 | Complete failure |

---

## Metric Interdependencies

```
Tempo Correct?
├─ YES → Goto potential to be >0.5
│  ├─ Phase aligned? → Goto >0.5, F >0.8
│  └─ Phase offset? → Goto=0.0, F=0.3-0.5
└─ NO → Goto will be 0.0, F will be <0.3
   ├─ Half-tempo detected? → Cemgil might be 0.5 (every other beat close)
   └─ Double-tempo? → F very low, Cemgil low
```

---

## The Diagnostic Workflow

When you run eval_single.py and see results:

```
Step 1: Check F-measure
├─ F < 0.3 → "Beats are not being matched within tolerance"
├─ F = 0.3-0.7 → "Some beats found, but errors exist"
└─ F > 0.8 → "Good absolute timing accuracy"

Step 2: Compare to Cemgil
├─ Cemgil >> F → "Missing some beats but others are in groove"
├─ Cemgil ≈ F → "Timing and groove errors are consistent"
└─ Cemgil << F → "Found beats but they're out of phase"

Step 3: Check Goto
├─ Goto > 0.5 → "Tempo is locked in"
├─ Goto = 0.0 → "Goto: Check if offset vs. wrong tempo"
└─ Goto < 0 → "Tempo is inverted or very wrong"

Step 4: Synthesize
├─ F=0.4, Cemgil=0.2, Goto=0.0 → Systematic offset (good tempo, bad phase)
├─ F=0.2, Cemgil=0.3, Goto=0.0 → Wrong tempo (maybe half-time)
└─ F=0.9, Cemgil=0.8, Goto=0.5 → Good algorithm (minor jitter)
```

---

## Common Patterns from Week 1 Testing

### Pattern 1: Sparse Detection (50% beats missing)

```
Scenario: Every other beat removed
F=0.67, Cemgil=0.83, Goto=0.0

Interpretation:
- F-measure drops because precision is halved
- Cemgil stays higher because the beats you DID find are correct
- Goto=0.0 because phase is lost (alternating pattern)
```

### Pattern 2: Timing Jitter (±50ms noise)

```
Scenario: Random ±50ms added to each beat
F=0.99, Cemgil=0.80, Goto=0.0

Interpretation:
- F-measure stays high (jitter is within tolerance)
- Cemgil drops more (accumulates timing errors)
- Goto=0.0 (jitter breaks phase lock but not tempo)
```

### Pattern 3: Systematic Offset (+100ms constant)

```
Scenario: Every beat shifted +100ms early/late
F=0.38, Cemgil=0.20, Goto=0.0

Interpretation:
- Offset is beyond tolerance (~70-80ms), so F drops significantly
- Cemgil also drops (phase is wrong)
- Goto=0.0 (offset doesn't change tempo, but phase is wrong)
```

---

## Tolerance Window Calibration

From Week 1 empirical testing:

```
Offset   F-measure  Interpretation
─────────────────────────────────
±50ms    0.996      Within tolerance window
±100ms   0.382      At edge of tolerance
±200ms   0.424      Beyond tolerance (double penalty?)
```

**Conclusion:** MIREX beat-matching tolerance is approximately ±70-80ms.

Use this when debugging:

- If F > 0.9, your beats are within ±50ms of ground truth
- If F < 0.4, your beats are offset by >100ms or tempo is wrong
- If F ≈ 0.67, you're hitting about 2/3 of beats (recall issue)

---

## For Week 2-4 Implementation

When you build a beat tracking algorithm:

1. **Start with F-measure.** Get it above 0.8 first (absolute timing).
2. **Then tune Cemgil.** Make sure beats are in groove (phase alignment).
3. **Finally optimize Goto.** Lock in tempo and phase together.

**Success criteria:**

- F > 0.85 → Algorithm is working
- Cemgil > 0.80 → Beats are musical
- Goto > 0.5 → Tempo is locked
- All three > 0.8 → Ship it

---

## Appendix: NaN Values in Output

Some metrics (Information Gain, CML*, AML*, PScore) may return NaN.

**Why?** These require specific setup or are conditional on tempo correctness. Don't worry about them in Week 1.

**Focus on:** F-measure, Cemgil, Goto only.

---

## Document Purpose

This guide bridges Week 1 learning (metrics understanding) to Week 2+ implementation (using metrics to debug).

Print this and refer to it every time you see metric output.
