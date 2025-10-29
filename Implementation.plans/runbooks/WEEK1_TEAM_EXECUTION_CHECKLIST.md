---
author: Claude Code Agent (Beat Validation Lead)
date: 2025-10-29
status: published
intent: Week 1 team execution checklist - actionable tasks with clear success criteria
---

# Week 1 Team Execution Checklist

## Team Role Assignments

| Role | Task | Time |
|------|------|------|
| **All team members** | Complete Part 1 & 2 (hands-on learning) | 1.5 hours |
| **Individual contributors** | Complete Part 3 (analysis + homework) | 1.5 hours |
| **Team lead** | Facilitate, answer questions, validate outputs | Ongoing |

---

## Pre-Requisites (5 minutes)

### Setup

- [ ] Navigate to project: `cd firmware/K1.node2/beats/`
- [ ] Verify dependencies installed:
  ```bash
  pip install mir-eval numpy librosa
  ```
- [ ] Verify you can run the script:
  ```bash
  python eval_single.py --help
  ```
- [ ] Verify test files exist:
  ```bash
  ls data/harmonix/reference/ | head
  ls estimates/
  ```

### Read This First

- [ ] Read: `firmware/K1.node2/beats/README.md` (3 min)
- [ ] Read: `Implementation.plans/runbooks/WEEK1_MIREX_METRICS_LEARNING.md` (10 min)

---

## Part 1: Learning Three Standard Scenarios (30 minutes)

### Task 1.1: Perfect Match Baseline

**Goal:** Understand what "perfect" looks like

**Do this:**
```bash
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est data/harmonix/reference/0010_andjusticeforall.txt
```

**Expected output:**
```
F-measure:        1.000000
Cemgil:           1.000000
Goto:             1.000000
Information Gain: NaN
```

**What to notice:**
- [ ] F-measure = 1.0 (perfect accuracy)
- [ ] Cemgil = 1.0 (perfect precision)
- [ ] Goto = 1.0 (perfectly phase-locked)
- [ ] Why are other metrics NaN? → Read Part 3 of WEEK1 guide

**Record:** Copy-paste output into your notes

---

### Task 1.2: Tempo Doubling Error

**Goal:** Learn to recognize when algorithm detects wrong tempo

**Do this:**
```bash
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_tempo_double.txt
```

**Expected output:**
```
F-measure:        0.666667
Cemgil:           0.666667
Goto:             0.000000  ← KEY: Phase lock FAILED
```

**What to notice:**
- [ ] F-measure dropped to 0.67 (why? → estimate has 766 beats, ref has 1532)
- [ ] **Goto = 0.0** (diagnostic: wrong tempo detected)
- [ ] F-measure can be misleading; Goto tells the real story

**Question:** What would Goto=1.0 mean? (Correct: algorithm found RIGHT tempo)

**Record:** Copy-paste output into your notes

---

### Task 1.3: Timing Jitter

**Goal:** Learn the difference between F-measure and Cemgil

**Do this:**
```bash
python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_jitter.txt
```

**Expected output:**
```
F-measure:        0.832245
Cemgil:           0.628357  ← Much lower than F!
Goto:             0.000000
```

**What to notice:**
- [ ] F-measure looks "good" (83%)
- [ ] **Cemgil is much lower (63%)** → timing noise is significant
- [ ] Goto = 0.0 → phase is drifting due to accumulated jitter

**Question:** If you only look at F-measure, would you think this algorithm works? (No! Cemgil reveals the truth)

**Record:** Copy-paste output into your notes

---

## Part 2: Analyze Your Own Track (60 minutes)

### Task 2.1: Pick Your Track

**You will:**
- [ ] Choose any track from the list below
- [ ] Create your own modified version
- [ ] Compare metrics

**Available tracks** (choose one):
```
0001_12step
0003_6foot7foot
0004_abc
0005_again
0008_america
0010_andjusticeforall  ← Already have examples
[+903 more in data/harmonix/reference/]
```

### Task 2.2: Create Your Experiment

**Pick ONE experiment from below:**

#### Experiment A: Timing Offset (+100ms)

```bash
TRACK="0001_12step"  # Change this

# Create offset version
python3 << 'EOF'
import numpy as np
b = np.loadtxt(f'data/harmonix/reference/{TRACK}.txt')
np.savetxt(f'estimates/{TRACK}_offset100ms.txt', b + 0.1)
print(f"Created: {TRACK}_offset100ms.txt ({len(b)} beats, +0.1s offset)")
EOF

# Evaluate
python eval_single.py \
  --ref data/harmonix/reference/${TRACK}.txt \
  --est estimates/${TRACK}_offset100ms.txt
```

**Expected:** Cemgil should drop significantly, Goto might be 0

---

#### Experiment B: Sparse Beats (Skip Every 3rd Beat)

```bash
TRACK="0001_12step"

python3 << 'EOF'
import numpy as np
b = np.loadtxt(f'data/harmonix/reference/{TRACK}.txt')
np.savetxt(f'estimates/{TRACK}_sparse.txt', b[::3])
print(f"Created: {TRACK}_sparse.txt ({len(b[::3])} beats, every 3rd)")
EOF

python eval_single.py \
  --ref data/harmonix/reference/${TRACK}.txt \
  --est estimates/${TRACK}_sparse.txt
```

**Expected:** F-measure drops significantly (missing beats)

---

#### Experiment C: Random Jitter (±50ms)

```bash
TRACK="0001_12step"

python3 << 'EOF'
import numpy as np
np.random.seed(42)
b = np.loadtxt(f'data/harmonix/reference/{TRACK}.txt')
jitter = b + np.random.normal(0, 0.05, len(b))
np.savetxt(f'estimates/{TRACK}_jitter.txt', jitter)
print(f"Created: {TRACK}_jitter.txt ({len(b)} beats, ±50ms jitter)")
EOF

python eval_single.py \
  --ref data/harmonix/reference/${TRACK}.txt \
  --est estimates/${TRACK}_jitter.txt
```

**Expected:** F-measure decent, Cemgil much lower, Goto=0

---

### Task 2.3: Record Results

Create a table in your notes:

| Metric | Perfect | Your Error | Difference |
|--------|---------|-----------|-----------|
| F-measure | ? | ? | ? |
| Cemgil | ? | ? | ? |
| Goto | ? | ? | ? |
| Beats (ref) | ? | ? | — |
| Beats (est) | ? | ? | — |

**Instructions:**
- [ ] Fill in "Perfect" values from Task 1.1
- [ ] Fill in "Your Error" values from your experiment
- [ ] Calculate "Difference"

---

## Part 3: Interpretation Homework (90 minutes)

### Task 3.1: Answer Analysis Questions

**For EACH scenario, answer these in writing:**

#### Scenario 1: Perfect Match (from Task 1.1)
- [ ] Q1: What does Goto=1.0 tell you about your algorithm?
- [ ] Q2: Why are Information Gain, CMLc, CMLt, AMLc, AMLt, PScore all NaN?
- [ ] Q3: How many beats did you have after trimming the first 5 seconds?
- [ ] Q4: If F-measure=1.0 but Cemgil=0.8, what would that mean?

**Write 2-3 sentences for each.**

---

#### Scenario 2: Tempo Doubling (from Task 1.2)
- [ ] Q1: Why did F-measure drop to exactly 0.67?
- [ ] Q2: What does Goto=0.0 mean? Why is it important?
- [ ] Q3: If you only looked at F-measure (0.67), would you know what's wrong?
- [ ] Q4: What is the algorithm detecting at the wrong rate?

**Write 2-3 sentences for each.**

---

#### Scenario 3: Timing Jitter (from Task 1.3)
- [ ] Q1: Why is Cemgil (0.628) so much lower than F-measure (0.832)?
- [ ] Q2: What does Goto=0.0 mean in this case? (Hint: not wrong tempo)
- [ ] Q3: If you were fixing an algorithm with this profile, where would you start?
- [ ] Q4: Is this error easier or harder to fix than tempo doubling?

**Write 2-3 sentences for each.**

---

### Task 3.2: Predict Metrics (Advanced)

**For each scenario, predict what metrics WOULD BE before running:**

#### Scenario A: Algorithm detects EVERY beat, but timing is off by -50ms consistently
**Your prediction:**
```
F-measure:        ?  (hint: consistently wrong, but detecting all)
Cemgil:           ?  (hint: same timing error on every beat)
Goto:             ?  (hint: systematic offset = phase shift?)
```

**Then test it:**
```bash
python3 << 'EOF'
import numpy as np
b = np.loadtxt('data/harmonix/reference/0010_andjusticeforall.txt')
np.savetxt('estimates/0010_test_neg50ms.txt', b - 0.05)
EOF

python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_neg50ms.txt
```

**Record:** Were you right? If not, why?

---

#### Scenario B: Algorithm detects beats, but SOME beats are missing (random 20%)
**Your prediction:**
```
F-measure:        ?  (hint: 20% missing = ? accuracy)
Cemgil:           ?  (hint: same beats you find are accurate)
Goto:             ?
```

**Then test it:**
```bash
python3 << 'EOF'
import numpy as np
np.random.seed(42)
b = np.loadtxt('data/harmonix/reference/0010_andjusticeforall.txt')
keep = np.random.rand(len(b)) > 0.2  # Keep 80%
np.savetxt('estimates/0010_test_sparse20pct.txt', b[keep])
EOF

python eval_single.py \
  --ref data/harmonix/reference/0010_andjusticeforall.txt \
  --est estimates/0010_test_sparse20pct.txt
```

**Record:** Were you right? What surprised you?

---

### Task 3.3: Create Your Learning Summary

**Write a 1-page summary titled "What I Learned About Beat Metrics"**

Include:
- [ ] Definition of F-measure in your own words
- [ ] Definition of Cemgil in your own words
- [ ] Why Cemgil is stricter than F-measure
- [ ] What Goto=0.0 diagnosis tells you (2 different error types)
- [ ] One surprise or thing you didn't expect

**Length:** ~300 words, no jargon, explain to someone unfamiliar with beat tracking

---

## Deliverables

### Create File: `WEEK1_YOUR_NAME_RESULTS.md`

**Structure:**
```markdown
# Week 1 Results - [Your Name]

## Part 1: Three Standard Scenarios

### Scenario 1: Perfect Match
[Copy-paste output]

[Your observations]

### Scenario 2: Tempo Doubling
[Copy-paste output]

[Your observations]

### Scenario 3: Timing Jitter
[Copy-paste output]

[Your observations]

## Part 2: Your Own Experiment

**Track chosen:** [which track?]
**Error type:** [offset/sparse/jitter/other]

[Results table]

[Your analysis]

## Part 3: Interpretation Homework

### Scenario 1 Answers
Q1: ...
Q2: ...
Q3: ...
Q4: ...

### Scenario 2 Answers
...

### Scenario 3 Answers
...

### Predictions
[Scenario A and B results + analysis]

## Learning Summary

[1-page summary]
```

---

## Success Criteria ✅

### You will know Part 1 is complete when:
- [ ] You can run all three eval_single.py commands successfully
- [ ] You understand why each metric has its value
- [ ] You can explain Goto=0.0 vs Goto=1.0

### You will know Part 2 is complete when:
- [ ] You successfully created a modified beat file
- [ ] You ran eval_single.py on your modification
- [ ] You filled out the metrics table
- [ ] You understand how YOUR error changed the metrics

### You will know Part 3 is complete when:
- [ ] You answered all analysis questions in writing
- [ ] You made predictions and tested them
- [ ] You created a 1-page learning summary
- [ ] You can explain one surprising metric behavior

### You will know Week 1 is DONE when:
- [ ] All three parts complete
- [ ] Results file submitted to team lead
- [ ] You can answer: "Why did F-measure drop when I did X?" correctly
- [ ] You understand the difference between F-measure and Cemgil errors
- [ ] You know what Goto=0.0 diagnosis means (two scenarios)

---

## Timeline

| Time | Activity |
|------|----------|
| 0:00–0:10 | Setup + read guides |
| 0:10–0:40 | Part 1 (three scenarios) |
| 0:40–1:40 | Part 2 (your own experiment) |
| 1:40–3:10 | Part 3 (analysis homework) |
| 3:10–3:30 | Debrief + submit results |

**Total:** ~3.5 hours

---

## FAQ (During Week 1)

### Q: What if I don't have enough beats after trimming?
**A:** That's OK, some tracks are short. Just run it; trimming should always keep most beats.

### Q: Can I skip one of the experiments?
**A:** No. All three teach different lessons. They're quick (5 min each).

### Q: Do I need to write perfect English?
**A:** No. Explain in your own words. Clarity > formality.

### Q: What if my predictions are wrong?
**A:** Good! That's learning. Analyze WHY you were wrong. That's valuable.

### Q: Can I use a different track instead of 0010_andjusticeforall?
**A:** Yes! But make sure reference file exists: `ls data/harmonix/reference/[TRACK].txt`

---

## Team Lead: Facilitation Notes

### Kickoff (5 min)
- Explain: "This week we learn metrics, not build anything. Understanding before coding."
- Show one example output live
- Answer questions

### Check-In Points (During the hour)
- After Part 1: "Any Goto=1.0 questions?"
- After Part 2: "What surprised you?"
- Before Part 3: "Ready to think deeper?"

### What to Watch For
- ⚠️ Team says "Let's just optimize F-measure" → NO, this week is metrics learning
- ⚠️ Someone only gets NaN values → they have perfect beats, that's fine
- ⚠️ Predictions way off → great teaching opportunity

### How to Validate Results
- Check they ran all three tasks ✅
- Check they recorded outputs ✅
- Check they answered analysis questions ✅
- Check they made + tested predictions ✅

---

**Ready to start? See you in 3.5 hours!**

Questions? Ask team lead or refer to WEEK1_MIREX_METRICS_LEARNING.md
