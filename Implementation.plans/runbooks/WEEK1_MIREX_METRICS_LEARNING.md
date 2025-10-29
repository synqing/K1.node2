---
author: Claude Code Agent (Beat Validation Lead)
date: 2025-10-29
status: published
intent: Week 1 team learning guide - understand MIREX metrics before automation
---

# Week 1: Learn MIREX Beat Metrics (Manual-First)

## Objective

**Understand what each of the 9 MIREX beat tracking metrics means by running them on real tracks and inspecting outputs.**

This is foundational work: you cannot effectively build or debug a beat detector without understanding what these metrics measure.

---

## Why This Week Matters

Most beat tracking research focuses on optimizing F-measure (the primary metric). But understanding the other 8 metrics reveals:
- **Why your algorithm fails** (Goto=0 means phase issues, not onset detection problems)
- **What improvements will help** (CML metrics show continuity, not just accuracy)
- **Which tracks are hard** (low Information Gain = poor phase consistency, fundamentally different problem)

This manual learning prevents wasted effort on optimizing the wrong things.

---

## The 9 MIREX Metrics (Explained Through Examples)

### Real Data: Track "And Justice For All" (1532 beats, ~6 min)

#### Scenario 1: Perfect Beat Detection (Baseline)

```
Reference: 1532 beats
Estimate:  1532 beats (identical)

=== METRICS ===
F-measure:        1.000000  ← Perfect accuracy
Cemgil:           1.000000  ← Perfect precision
Information Gain: NaN       ← Not computed (insufficient data)
Goto:             1.000000  ← Perfect phase lock
CMLc:             NaN       ← Not computed
CMLt:             NaN       ← Not computed
AMLc:             NaN       ← Not computed
AMLt:             NaN       ← Not computed
PScore:           NaN       ← Not computed
```

**What this means:**
- Algorithm detects every beat perfectly (F=1.0)
- Every beat is within ±70ms of ground truth (Cemgil=1.0)
- Beats are phase-locked (Goto=1.0)
- Other metrics return NaN (not enough variation to compute)

---

#### Scenario 2: Tempo Doubling Error (Detects Every Other Beat)

```
Reference: 1532 beats
Estimate:  766 beats (every other beat)

=== METRICS ===
F-measure:        0.666667  ← 67% accuracy (fails on half the beats)
Cemgil:           0.666667  ← Same as F-measure
Information Gain: NaN       ← Phase consistency metric (insufficient data)
Goto:             0.000000  ← Phase LOCK FAILED (detected wrong tempo)
CMLc:             NaN       ← Not computed
CMLt:             NaN       ← Not computed
AMLc:             NaN       ← Not computed
AMLt:             NaN       ← Not computed
PScore:           NaN       ← Not computed
```

**What this reveals:**
- Algorithm found a 2:1 ratio (tempo doubling)
- F-measure of 0.67 is deceiving - actually detecting wrong tempo
- **Goto=0.0 is the tell**: phase lock failed, not onset detection problem
- This is a **common bug**: algorithm detects strong beats at 2× tempo

**How to fix:** Check your onset detection threshold or tempo estimation

---

#### Scenario 3: Timing Jitter (±50ms Random Error)

```
Reference: 1532 beats
Estimate:  1532 beats (each ±50ms random error)

=== METRICS ===
F-measure:        0.832245  ← 83% accuracy
Cemgil:           0.628357  ← Only 63% (more sensitive than F)
Information Gain: NaN
Goto:             0.000000  ← Phase lock still fails
CMLc:             NaN
CMLt:             NaN
AMLc:             NaN
AMLt:             NaN
PScore:           NaN
```

**What this reveals:**
- F-measure is "optimistic" (83% looks good)
- Cemgil is stricter (63% is concerning)
- **Goto=0.0**: phase is drifting (jitter compounds across beats)
- This is typical of **noisy onset detection**: no systematic bias, just noise

**How to fix:** Smooth/filter your beat estimates, use phase correction

---

## Metric Definitions (From MIREX Standard)

| Metric | What it measures | Interpretation |
|--------|------------------|-----------------|
| **F-measure** | Beat accuracy within ±70ms | 0–1, main metric, 0.80+ competitive |
| **Cemgil** | Gaussian-weighted error (σ=40ms) | 0–1, rewards precision, stricter than F |
| **Information Gain** | Phase consistency (bits of entropy) | 0–5.36, how well phase is preserved |
| **Goto** | Binary: are beats phase-locked? | 0 or 1, diagnostic metric |
| **CMLc/CMLt** | Continuity (±17.5% tempo tolerance) | 0–1, how many beat sequences are continuous |
| **AMLc/AMLt** | Absolute continuity (stricter) | 0–1, alternative continuity metric |
| **PScore** | Normalized information gain | 0–1, phase consistency (alternative) |

**Why NaN values appear:** Metrics need >1 tempo hypothesis. With perfect beats, only one tempo exists, so phase metrics are undefined.

---

## Week 1 Learning Plan (3 Hours)

### Part 1: Run Three Learning Examples (30 minutes)

**You will:**
1. Run `eval_single.py` on three different beat files
2. Observe metric outputs
3. Make predictions before running

**Do this:**

```bash
cd firmware/K1.node2/beats

# Example 1: Perfect beats (baseline understanding)
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est data/harmonix/reference/0010_andjusticeforall.txt

# Example 2: Tempo doubling error (learn Goto metric)
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_tempo_double.txt

# Example 3: Timing jitter (learn Cemgil vs F-measure)
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_jitter.txt
```

**Expected outputs:** See "Real Data" examples above

**Learning goal:** Understand what each metric value means

---

### Part 2: Analyze Your Own Track (1 hour)

**Pick a track, create an intentional error, measure the difference.**

**Do this:**

```bash
# 1. Pick any track from data/harmonix/reference/
# Example: use 0001_12step or 0003_6foot7foot

TRACK="0001_12step"  # Change this

# 2. Copy reference to estimates as baseline
cp data/harmonix/reference/${TRACK}.txt estimates/${TRACK}_baseline.txt

# 3. Create modified version (choose one):
# Option A: Introduce timing offset (+100ms)
#   python -c "import numpy as np; b=np.loadtxt('data/harmonix/reference/${TRACK}.txt'); np.savetxt('estimates/${TRACK}_offset.txt', b + 0.1)"

# Option B: Introduce jitter
#   python -c "import numpy as np; np.random.seed(42); b=np.loadtxt('data/harmonix/reference/${TRACK}.txt'); np.savetxt('estimates/${TRACK}_jitter.txt', b + np.random.normal(0, 0.02, len(b)))"

# Option C: Skip every Nth beat
#   python -c "import numpy as np; b=np.loadtxt('data/harmonix/reference/${TRACK}.txt'); np.savetxt('estimates/${TRACK}_sparse.txt', b[::3])"

# 4. Evaluate baseline vs. modified
python eval_single.py --ref data/harmonix/reference/${TRACK}.txt --est estimates/${TRACK}_baseline.txt
python eval_single.py --ref data/harmonix/reference/${TRACK}.txt --est estimates/${TRACK}_offset.txt
```

**Learning goal:** See how metrics change with different error types

---

### Part 3: Interpretation Homework (1.5 hours)

**For each scenario, answer these questions:**

1. **Perfect Match (F=1.0, Cemgil=1.0, Goto=1.0)**
   - What does Goto=1.0 tell you?
   - Why are other metrics NaN?
   - How many beats do you have after trim?

2. **Tempo Doubling (F=0.67, Cemgil=0.67, Goto=0.0)**
   - Why did F-measure drop to 0.67?
   - What does Goto=0.0 mean?
   - How would you detect this error if you only saw F-measure?

3. **Timing Jitter (F=0.83, Cemgil=0.63, Goto=0.0)**
   - Why is Cemgil much lower than F-measure?
   - What does this tell you about your algorithm's timing stability?
   - Is this error fixable?

**Answer these for your own track too.**

---

## Week 1 Success Criteria

✅ **You will know Week 1 is complete when:**

1. You can run `eval_single.py` on any track
2. You understand what each of the 9 metrics measures
3. You can **predict** metric values before running (e.g., "if I skip beats, Goto will be 0")
4. You know the difference between F-measure and Cemgil errors
5. You can interpret what a Goto=0 diagnosis tells you
6. You can create intentional errors and measure their impact

---

## Common Questions (Week 1 FAQ)

### Q: Why are so many metrics NaN?
**A:** With perfect beats, there's only one tempo. Metrics like Information Gain measure consistency across multiple tempos. NaN means "not enough variation to compute."

### Q: Is F-measure always the best metric?
**A:** No. F-measure is optimistic. Cemgil is stricter. Goto is diagnostic (reveals phase issues). Use multiple metrics together.

### Q: What F-measure score should I aim for?
**A:** 0.80+ is competitive in research. But understand the error patterns too.

### Q: Why does timing jitter cause Goto=0?
**A:** Goto measures phase lock across beats. Small jitter compounds: beat 1 is +20ms, beat 2 is -50ms, beat 3 is +10ms... phase drifts. If you average to 0, beats are phase-locked. If they drift, Goto=0.

### Q: Can I improve one metric without hurting others?
**A:** Sometimes. CML metrics improve with smoother beat sequences. But push F-measure too hard, you might introduce jitter. Trade-offs exist.

---

## Tools You'll Use

### `eval_single.py` - Single Track Evaluation
```bash
python eval_single.py --ref <reference.txt> --est <estimate.txt>
```

**What it does:**
1. Loads reference beats (ground truth)
2. Loads estimate beats (your algorithm)
3. Trims first 5 seconds (MIREX standard)
4. Computes all 9 metrics
5. Prints results

**Output:**
- Reference/estimate beat counts
- All 9 metric values
- NaN for metrics with insufficient variation

### `melspecs_loader.py` - Inspect Features
```python
from melspecs_loader import MelspecsLoader
loader = MelspecsLoader()
loader.info('0010_andjusticeforall')
```

**What it does:**
- Show melspec shape, duration, beat density
- Help you understand what the algorithm receives as input

---

## Week 1 Deliverables (Turn-In)

**Create a file: `WEEK1_LEARNING_NOTES.md`**

Include:
1. Three example outputs (perfect, tempo doubling, jitter) with your analysis
2. Results from your own track experiment
3. Answers to the three interpretation questions
4. Predictions: what metrics would you expect from [some algorithm description]?
5. Key insights: what surprised you about the metrics?

**Due:** Before Week 2 starts (before implementing beat detection)

---

## Next: Week 2 Preparation

Once you understand metrics, Week 2 is:
- **Implement a beat tracking algorithm** using Harmonix mel-spectrograms
- Use learnings from Week 1 to interpret your algorithm's failures
- Debug using Goto, Cemgil, and Information Gain, not just F-measure

---

## Reference: Ready-Made Test Cases

We've created three standard test cases for your learning:

```
estimates/0010_test_tempo_double.txt    (every other beat)
estimates/0010_test_jitter.txt          (±50ms random error)
data/harmonix/reference/0010_*          (any reference to learn from)
```

Use these to learn patterns. Then create your own error scenarios.

---

## Quick Reference: Metric Interpretation Cheat Sheet

| Scenario | F-measure | Cemgil | Goto | Diagnosis |
|----------|-----------|--------|------|-----------|
| Perfect | 1.00 | 1.00 | 1.00 | ✅ Algorithm working perfectly |
| Tempo double | 0.67 | 0.67 | 0.00 | ⚠️ Wrong tempo detected |
| Tempo half | 0.67 | 0.67 | 0.00 | ⚠️ Wrong tempo detected |
| Timing jitter | 0.83+ | 0.60s | 0.00 | ⚠️ Noisy beats, phase drifts |
| Systematic offset | 0.80+ | 0.65+ | 0.00 | ⚠️ Phase offset (fixable) |
| Sparse beats | <0.70 | <0.70 | varies | ⚠️ Missing detections |
| Extra beats | <0.70 | <0.70 | varies | ⚠️ False positives |

---

## Leader's Notes (For Team Leads)

### How to Run This Week:

1. **Kickoff (15 min):** Explain the three metrics scenarios
2. **Hands-on (45 min):** Have team run examples together
3. **Individual work (1.5 hours):** Each person analyzes their own track
4. **Debrief (15 min):** Share findings, discuss patterns

### What to Watch For:

- ⚠️ If team says "F-measure is what matters" → remind them to look at Cemgil too
- ⚠️ If team is confused by NaN values → it's normal, explain phase metrics
- ✅ If team can predict metric changes → they're ready for Week 2

### Success Signal:

Team can answer: **"Why did F-measure drop to 0.67 when I only changed one thing?"** (Answer: tempo doubling, Goto=0 proves it)

---

**Status**: Ready for team execution

**Questions?** Consult README.md, MIREX_BEAT_TRACKING_COMPLETE_GUIDE.md, or ask the team lead.

For Week 2 preparation, see Implementation.plans/runbooks/WEEK2_BEAT_DETECTOR_IMPLEMENTATION.md
