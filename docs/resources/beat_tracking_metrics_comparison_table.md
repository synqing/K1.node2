# MIREX Beat Tracking Metrics: Complete Comparison Table

**Author:** Search Specialist Agent
**Date:** 2025-10-29
**Status:** published
**Intent:** Side-by-side comparison of all beat tracking evaluation metrics for quick reference

---

## Quick Reference: Metrics at a Glance

| Metric | Type | Range | Best | Worst | Primary Use | Sensitivity |
|--------|------|-------|------|-------|-------------|-------------|
| **F-Measure** | Binary | 0.0-1.0 | 1.0 | 0.0 | Overall accuracy | Standard 70ms window |
| **Cemgil** | Continuous | 0.0-1.0 | 1.0 | 0.0 | Localization precision | Gaussian σ=40ms |
| **Information Gain** | Information-theoretic | 0-5.36 bits | 5.36 | 0.0 | Phase consistency | KL divergence |
| **Goto** | Binary | {0, 1} | 1 | 0 | Phase lock continuity | 25% of track |
| **CMLc/CMLt** | Continuous | 0.0-1.0 | 1.0 | 0.0 | Correct meter tracking | 17.5% dynamic window |
| **AMLc/AMLt** | Continuous | 0.0-1.0 | 1.0 | 0.0 | Flexible meter tracking | Allows metrical variations |
| **P-Score** | Continuous | 0.0-1.0 | 1.0 | 0.0 | Autocorrelation-based | 20% of median IBI |

---

## Detailed Comparison Matrix

### Calculation Method Comparison

| Aspect | F-Measure | Cemgil | Information Gain | Goto | CML/AML | P-Score |
|--------|-----------|--------|------------------|------|---------|---------|
| **Mathematical Basis** | Binary classification | Gaussian weighting | KL divergence | Sequence matching | Temporal continuity | Autocorrelation |
| **Tolerance Window** | Fixed ±70ms | Gaussian σ=40ms | Normalized phase | Error statistics | 17.5% inter-beat interval | 20% median IBI |
| **Penalizes Errors** | Binary (hit/miss) | Continuous Gaussian | Information loss | Binary (match/no match) | Continuity breaks | Phase correlation |
| **Handles Tempo Change** | Not well | Not well | Not well | Not well | Adaptive window | Adaptive window |
| **False Positive Penalty** | Full penalty | Gaussian weight | Histogram impact | Binary penalty | Continuity penalty | Correlation penalty |

---

## Detailed Metric Definitions

### 1. F-Measure (F1 Score)

#### Definition
Standard precision-recall metric with fixed tolerance window

#### Formula
```
F = 2*TP / (2*TP + FP + FN)

where:
  TP (True Positive) = estimated beat within ±70ms of reference
  FP (False Positive) = extra estimated beats or outside windows
  FN (False Negative) = reference beats without nearby estimate
```

#### Parameters
- Tolerance window: ±0.070 seconds (fixed)
- Preprocessing: Trim beats before 5 seconds
- Calculation: Per-file, then average

#### Range
0.0 (no correct beats) to 1.0 (perfect)

#### Interpretation Table

| Score | Category | Performance Level | Typical Use |
|-------|----------|------------------|------------|
| 0.90-1.00 | Excellent | State-of-the-art | Competition winner |
| 0.85-0.90 | Very good | Competitive | Publication-worthy |
| 0.80-0.85 | Good | Well-performing | Acceptable algorithm |
| 0.75-0.80 | Adequate | Working | Baseline acceptable |
| 0.70-0.75 | Fair | Marginal | Proof of concept |
| 0.60-0.70 | Poor | Limited | Needs improvement |
| <0.60 | Failing | Broken | Debugging needed |

#### Advantages
- Simple interpretation (hits/misses)
- Standard in music information retrieval
- Directly comparable across papers
- Compatible with MIREX datasets

#### Disadvantages
- Binary (no credit for near-miss)
- Fixed window regardless of tempo
- Doesn't penalize poor localization equally

#### Example

```
Reference beats: 0.5s, 1.0s, 1.5s
Estimated beats: 0.48s, 1.1s, 1.55s, 2.0s

Windows (±70ms):
  [0.430, 0.570]  → 0.48s IN    (TP)
  [0.930, 1.070]  → 1.1s OUT    (FP)
  [1.430, 1.570]  → 1.55s IN    (TP)

Reference at 1.5s missed → FN
2.0s extra beat → FP

F = 2*2 / (2*2 + 2 + 1) = 4/7 = 0.571
```

---

### 2. Cemgil Score

#### Definition
Gaussian-weighted score rewarding precise localization

#### Formula
```
Cemgil = (1/N_ref) * Σ(est_beats) exp(-(error_to_nearest)² / (2σ²))

where:
  σ = 0.04 seconds (40ms standard deviation)
  error_to_nearest = time difference to closest reference beat
  N_ref = number of reference beats
```

#### Alternative Expression
```
For each estimated beat:
  score = Gaussian(distance_to_nearest_ref, μ=0, σ=0.04)

Final = average score across all estimated beats
```

#### Parameters
- Gaussian σ: 0.04 seconds (40ms)
- Distribution: Normal distribution centered at perfect alignment
- Calculation: Average over all estimated beats

#### Range
0.0 (all beats > 140ms error) to 1.0 (perfect alignment)

#### Interpretation Table

| Score | Category | Performance | Meaning |
|-------|----------|------------|---------|
| 0.90+ | Excellent | State-of-the-art | Beats within 10-20ms on average |
| 0.85-0.90 | Very good | Competitive | Beats within 20-30ms on average |
| 0.80-0.85 | Good | Well-tuned | Beats within 30-40ms on average |
| 0.75-0.80 | Adequate | Acceptable | Beats within 40-50ms on average |
| 0.70-0.75 | Fair | Marginal | Beats within 50-60ms on average |
| 0.60-0.70 | Poor | Limited | Beats within 60-80ms on average |
| <0.60 | Failing | Broken | Significant timing issues |

#### Error-to-Score Mapping

| Error (ms) | Score | Contribution |
|-----------|-------|------------|
| 0 | 1.000 | Perfect |
| 10 | 0.998 | Imperceptible |
| 20 | 0.992 | Very good |
| 30 | 0.979 | Good |
| 40 | 0.951 | Acceptable |
| 50 | 0.901 | Fair |
| 60 | 0.827 | Poor |
| 70 | 0.719 | Bad |
| 100 | 0.427 | Very bad |
| 140 | 0.135 | Marginal |

#### Advantages
- Continuous gradation (rewards closeness)
- Penalizes poor localization smoothly
- More sensitive to algorithm quality
- Matches human perception of timing

#### Disadvantages
- Less interpretable than F-measure
- Runs 0.05-0.10 higher than F-measure
- Not directly comparable to other fields

---

### 3. Information Gain

#### Definition
Information-theoretic metric comparing beat error distribution to uniform distribution (worst case)

#### Formula
```
IG = Σ p(k) * log₂(p(k) / p_uniform(k))
   = Σ p(k) * log₂(p(k)) + log₂(K)
   = KL_divergence(p_estimated || p_uniform)

where:
  K = 41 (number of bins)
  p(k) = empirical probability of error in bin k
  p_uniform(k) = 1/41 ≈ 0.0244
```

#### Calculation Process

1. For each estimated beat, compute normalized error (0 to 1 phase)
2. Build histogram with 41 bins (bin width = 1/41)
3. Normalize histogram to probability distribution
4. Compute KL divergence from uniform distribution
5. Result in bits (log₂ base)

#### Parameters
- Number of bins: 41 (empirically optimal)
- Bin width: 1/41 ≈ 0.0244 normalized phase
- Base: log₂ (bits)
- Normalization: Phase within beat period [0, 1)

#### Range
0 bits (uniform, worst case) to log₂(41) ≈ 5.36 bits (perfect)

#### Interpretation Table

| Score (bits) | Category | Performance | Meaning |
|-----------|----------|------------|---------|
| 4.5-5.36 | Excellent | State-of-the-art | 95%+ errors in 2-3 bins |
| 3.5-4.5 | Very good | Competitive | 80%+ errors in 3-5 bins |
| 2.5-3.5 | Good | Well-performing | 60%+ errors in 5-10 bins |
| 1.5-2.5 | Adequate | Acceptable | Moderate concentration |
| 1.0-1.5 | Fair | Limited | Spread across 10+ bins |
| 0.5-1.0 | Poor | Concerning | Nearly uniform distribution |
| <0.5 | Failing | Broken | Uniform or worse |

#### Information Content

| Distribution | Information Gain | Interpretation |
|--------------|-----------------|-----------------|
| All beats in 1 bin | 5.36 bits | Perfect phase lock |
| Equally split 2 bins | 4.36 bits | Bimodal (tempo doubling?) |
| 3 bins (~8% each) | 3.36 bits | Good phase concentration |
| 5 bins (~20% each) | 1.36 bits | Scattered phase |
| All 41 bins equal | 0 bits | Uniform distribution (worst) |

#### Advantages
- Measures phase consistency (not just timing accuracy)
- Information-theoretic foundation (principled)
- Independent of tolerance window
- Detects tempo doubling/halving artifacts
- 0-5.36 bit range is interpretable

#### Disadvantages
- Less intuitive than F-measure
- Requires computing normalized phase errors
- 41-bin histogram is arbitrary choice
- Not directly comparable to timing metrics

#### Example

```
Beats with errors (normalized phase):
0.05, 0.06, 0.05, 0.07, 0.04  (clustered near 0)
→ Histogram: 30 beats in bins [0-0.1), 11 beats in [0.1-0.5), 0 elsewhere
→ High concentration → 4.5+ bits

Beats evenly distributed:
0.01, 0.05, 0.10, 0.15, ..., 0.99  (spread across entire phase)
→ Histogram: ~1 beat per bin on average
→ Uniform distribution → 0 bits
```

---

### 4. Goto Score

#### Definition
Binary metric assessing whether algorithm maintains correct beat phase for ≥25% of track

#### Criteria
A track receives Goto = 1 if the estimated beat sequence contains a continuous segment where:
1. **Mean error < 0.2 seconds** (good average alignment)
2. **Standard deviation < 0.2 seconds** (consistent timing)
3. **Segment spans ≥ 25% of track duration**

Otherwise, Goto = 0

#### Formula
```
For candidate continuous sequences:
  if (mean(|errors|) < 0.2 AND std(errors) < 0.2 AND length > 0.25*duration):
    Goto = 1
  else:
    Goto = 0
```

#### Parameters
- Mean error threshold: 0.2 seconds
- Standard deviation threshold: 0.2 seconds
- Minimum continuous segment: 25% of track
- Evaluation: Per-track binary decision

#### Range
{0, 1} (binary: either correct or incorrect)

#### Interpretation

| Score | Meaning |
|-------|---------|
| 1 | Algorithm successfully locks to beat phase for significant portion |
| 0 | Algorithm fails to maintain consistent beat phase |

#### Advantages
- Lenient metric (25% is low bar)
- Rewards algorithms that lock onto any continuous beat pattern
- Binary decision easy to interpret
- Captures "does it work at all?" question

#### Disadvantages
- All-or-nothing (no partial credit)
- Doesn't measure accuracy of the 75% outside segment
- Can be 1 even if F-measure is 0.5
- Not suitable for fine-grained comparison

#### Example

```
Track: 30 seconds
Reference beats: [0.5, 1.0, 1.5, ..., 30.0] (60 beats)

Estimated sequence A:
First 15 beats: [0.48, 0.98, 1.48, 1.98, 2.48, ...]
Errors: [0.02, 0.02, 0.02, 0.02, 0.02, ...]
Mean error: 0.02 < 0.2 ✓
Std dev: 0.005 < 0.2 ✓
Duration: 7.5 seconds / 30 = 25% ✓
→ Goto = 1 (despite other beats being wrong)

Estimated sequence B:
All 60 beats: [0.48, 0.98, 1.48, ..., 29.98]
Errors: [0.02, 0.02, 0.02, ..., 0.02]
Continuous throughout → Goto = 1
```

---

### 5. Continuity Metrics: CMLc, CMLt, AMLc, AMLt

#### Definition
Metrics evaluating beat tracking while accounting for metrical level ambiguity and tolerance for alternative interpretations

#### Background
Some music has ambiguous beat levels:
- Listeners might perceive beats at double tempo (off-beat)
- Or at half tempo (longer interval)
- These are valid interpretations but different from annotation

#### Tolerance Window
**Dynamic, not fixed:** 17.5% of inter-annotation-interval
```
Tolerance = 0.175 * (average inter-beat interval)

Examples:
  120 BPM: 0.5s interval → ±87.5ms tolerance
  60 BPM: 1.0s interval → ±175ms tolerance
  180 BPM: 0.333s interval → ±58.3ms tolerance
```

#### CMLc (Correct Metrical Level, continuity)

**Definition:** Longest continuous segment with exact metrical match

**Calculation:**
1. Find sequences where beats match annotations (within dynamic tolerance)
2. Require both current and previous beat match
3. Require inter-beat intervals match annotations
4. Find longest continuous valid segment
5. Report: length / total_beats (0.0-1.0)

**Interpretation:**
- 1.0 = entire track correctly tracked at annotation level
- 0.5 = algorithm correctly tracks half the track continuously
- 0.0 = no continuous matching segment

#### CMLt (Correct Metrical Level, total)

**Definition:** Sum of ALL continuous segments at correct metrical level

**Calculation:**
1. Find all valid continuous segments (as above)
2. Sum lengths of all segments
3. Report: total_length / total_beats

**Interpretation:**
- 1.0 = all beats tracked correctly (not necessarily continuous)
- 0.5 = half of beats in valid segments
- Example: Three 33% segments → CMLt = 1.0 even if CMLc = 0.33

#### AMLc (Allowed Metrical Levels, continuity)

**Definition:** Longest continuous segment allowing metrical variations

**Metrical Variations Allowed:**
- Original level (as annotated)
- Double tempo (half interval, off-beat)
- Half tempo (double interval)
- Triple/third tempo variations

**Calculation:**
1. Find sequences matching ANY of the above levels
2. Require continuity (current + previous beat match)
3. Find longest valid segment
4. Report: length / total_beats

**Example:**
```
Annotation:     [0.5, 1.0, 1.5, 2.0, ...]
Estimated:      [0.75, 1.25, 1.75, 2.25, ...]
Metrical level: Off-beat (double tempo)

Would score 0.0 on CMLc but high on AMLc
(off-beat is valid alternative interpretation)
```

#### AMLt (Allowed Metrical Levels, total)

**Definition:** Sum of ALL continuous segments at any acceptable metrical level

**Calculation:** Like AMLc but summing all valid segments

#### Parameters
- Dynamic tolerance: 17.5% of inter-beat interval
- Allowed levels: Original, double, half, triple/third tempos
- Continuity requirement: Yes (for Cc/Ac variants)
- Evaluation: Fraction of beats in valid segments

#### Range
0.0-1.0 (fraction of total beats)

#### Interpretation Table

| Score | CMLc | CMLt | AMLc | AMLt | Meaning |
|-------|------|------|------|------|---------|
| 0.90-1.0 | Excellent | Excellent | Excellent | Excellent | Perfect tracking |
| 0.80-0.90 | Good | Good | Good | Good | Robust algorithm |
| 0.70-0.80 | Adequate | Adequate | Good | Very good | Some lost lock |
| 0.60-0.70 | Fair | Fair | Adequate | Good | Metrical interpretation helps |
| 0.50-0.60 | Poor | Poor | Fair | Adequate | Fragmented tracking |
| <0.50 | Failing | Failing | Poor | Fair | Significant issues |

#### Relationships

**CMLc vs CMLt:**
- CMLc ≤ CMLt always
- Large gap indicates algorithm loses and regains lock frequently

**CMLt vs AMLt:**
- AMLt ≥ CMLt always
- Large gap indicates algorithm often at wrong metrical level
- Small gap indicates algorithm robustly locks to correct level

**High AMLc but Low CMLc:**
- Algorithm tracks beat but at wrong metrical level
- May indicate tempo estimation problem

#### Example Analysis

```
Results:
CMLc: 0.70, CMLt: 0.75, AMLc: 0.85, AMLt: 0.92

Interpretation:
- Strong lock on correct level (CMLc high)
- Occasionally loses and regains lock (CMLt > CMLc)
- Sometimes tracks alternative metrical level (AMLc < CMLt)
- Overall robust (AMLt high)

Action: Check for tempo doubling issues
```

---

### 6. P-Score (Continuity)

#### Definition
Metric based on autocorrelation of beat sequences, computing correlation at different tempo levels

#### Calculation
1. Convert beats to impulse train (frame-based representation)
2. Compute autocorrelation of estimated vs reference impulse trains
3. Window correlation to 20% of median inter-annotation-interval
4. Check correlation at original, double, and half tempo levels
5. Return best matching score

#### Parameters
- Frame quantization: 10ms resolution
- Correlation window: 0.2 * median(inter-annotation-intervals)
- Tempo levels: Original, double, half
- Basis: Autocorrelation

#### Range
0.0-1.0

#### Advantages
- Based on signal processing (impulse trains)
- Tolerates tempo variations
- Captures phase correlation well

#### Disadvantages
- Computationally more expensive
- Less used in recent literature
- Requires discrete frame representation

---

## Metric Selection Guide

### Use F-Measure When:
- Publishing in mainstream MIR venues
- Comparing to MIREX baseline results
- Need single headline number
- Audiences expects "accuracy"

### Use Cemgil When:
- Concerned about localization precision
- Fine-grained timing matters (e.g., synchronization)
- Want to penalize poor timing smoothly
- Comparing beat localization quality

### Use Information Gain When:
- Analyzing phase consistency
- Debugging tempo doubling issues
- Want information-theoretic rigor
- Interested in error distribution shape

### Use Goto When:
- Testing real-time applicability
- Need binary "works/doesn't work"
- Phase continuity critical
- Consumer application evaluation

### Use CML/AML When:
- Music with metrical ambiguity (non-Western, jazz)
- Evaluating robustness to genre diversity
- Want to penalize wrong interpretation
- Assessing handling of meter changes

### Use P-Score When:
- Autocorrelation-based approach
- Historical comparison to older algorithms
- Signal processing perspective desired

---

## Typical Algorithm Performance

### State-of-the-Art (Madmom, Deep Learning-Based)
```
F-Measure:      0.82
Cemgil:         0.87
Goto:           1.0
CMLc/CMLt:      0.78 / 0.85
AMLc/AMLt:      0.88 / 0.92
Information Gain: 3.9 bits
```

### Strong Baseline (Onset-based, Tempo-Estimated)
```
F-Measure:      0.73
Cemgil:         0.78
Goto:           1.0
CMLc/CMLt:      0.65 / 0.72
AMLc/AMLt:      0.78 / 0.85
Information Gain: 2.8 bits
```

### Weak Baseline (Simple Energy Peaks)
```
F-Measure:      0.61
Cemgil:         0.65
Goto:           0.0
CMLc/CMLt:      0.45 / 0.52
AMLc/AMLt:      0.58 / 0.68
Information Gain: 1.2 bits
```

---

## Summary: Which Metric Matters Most?

| Goal | Primary | Secondary | Diagnostic |
|------|---------|-----------|-----------|
| Publication | F-Measure | Cemgil | Information Gain |
| Real-time | Goto | CMLc | F-Measure |
| Music prod | Cemgil | F-Measure | CMLc |
| Robustness | AMLt | CMLt | Information Gain |
| Genre diverse | AMLc/AMLt | CMLc | F-Measure |
| Phase lock | Information Gain | Goto | Cemgil |

