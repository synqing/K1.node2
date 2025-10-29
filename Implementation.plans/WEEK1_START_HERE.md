---
author: Claude Code Agent (Beat Validation Lead)
date: 2025-10-29
status: published
intent: Week 1 entry point - team orientation document
---

# Week 1: MIREX Metrics Learning - START HERE

## Quick Summary

**What:** Learn the 9 MIREX beat tracking metrics by running them on real data
**When:** Week 1 (3.5 hours)
**Why:** Understanding metrics prevents weeks of debugging confusion later
**How:** Run code, observe outputs, answer questions, make predictions

---

## The Three Documents You Need

### 1. **WEEK1_QUICK_REFERENCE.md** (1 min read)
**Print this.** One-page cheat sheet with:
- 9 metrics at a glance
- Error type diagnosis matrix
- Critical insight: Goto metric
- Command cheat sheet

✅ **Use this during the session**

---

### 2. **WEEK1_TEAM_EXECUTION_CHECKLIST.md** (follow this)
**Detailed instructions.** Your step-by-step guide with:
- Pre-requisites (setup)
- Part 1: Three learning examples (30 min)
- Part 2: Your own experiment (60 min)
- Part 3: Analysis homework (90 min)
- Success criteria for each part
- Deliverables template

✅ **Follow this during the session**

---

### 3. **WEEK1_MIREX_METRICS_LEARNING.md** (reference this)
**Educational content.** Deep explanation of:
- Why metrics matter
- Real-world examples with actual outputs
- Metric definitions and interpretation
- Common questions answered
- Troubleshooting guide

✅ **Reference this if you're confused**

---

## For Team Leads Only

**WEEK1_TEAM_LEADERSHIP_GUIDE.md**
- How to facilitate the session
- Hour-by-hour plan
- Common issues + guidance responses
- Validation checklist
- Success signals to watch for

---

## The 3.5-Hour Timeline

```
0:00–0:10  Intro + prep              (read docs)
0:10–0:40  Part 1: Three scenarios   (run eval_single.py 3x)
0:40–1:40  Part 2: Your experiment   (create error, measure impact)
1:40–3:10  Part 3: Analysis work     (answer questions, make predictions)
3:10–3:30  Debrief                   (share insights)
```

---

## What You'll Accomplish

### By End of Part 1 (30 min)
✅ You understand what each metric value means
✅ You can recognize a Goto=0.0 diagnosis (wrong tempo)
✅ You see why Cemgil is stricter than F-measure

### By End of Part 2 (60 min)
✅ You created an intentional error in beat data
✅ You measured how metrics changed
✅ You connected error type to metric changes

### By End of Part 3 (90 min)
✅ You answered analysis questions in writing
✅ You made predictions and tested them
✅ You understand why metrics matter before building algorithms

---

## Before You Start: Setup (5 min)

```bash
# Navigate to project
cd firmware/K1.node2/beats

# Install dependencies (one time)
pip install mir-eval numpy librosa

# Verify it works
python eval_single.py --help
```

If this works → you're ready to start

If it fails → see "Setup Issues" below

---

## The Key Insight (Read This First)

```
F-measure says IF you're detecting beats correctly.
Cemgil says HOW precisely you're detecting them.
Goto says if you're looking at the RIGHT PROBLEM.

Example:
- F-measure = 0.67 (seems mediocre)
- Cemgil = 0.67 (consistently off)
- Goto = 0.0 (ALERT: wrong tempo detected)

Diagnosis: You're not missing beats, you're detecting
them at 2x speed. Different problem. Different fix.

This insight saves you 20 hours of debugging.
```

---

## The Three Scenarios You'll See

### Scenario 1: Perfect Match
```
Reference: 1532 beats
Estimate:  1532 beats (identical)

Result:
F-measure = 1.0 ✅
Cemgil = 1.0 ✅
Goto = 1.0 ✅
Other metrics = NaN (normal!)

Lesson: Understand what "perfect" looks like
```

### Scenario 2: Tempo Doubling
```
Reference: 1532 beats
Estimate:  766 beats (every other beat)

Result:
F-measure = 0.67
Cemgil = 0.67
Goto = 0.0 ⚠️ (DIAGNOSIS: wrong tempo)
```

### Scenario 3: Timing Jitter
```
Reference: 1532 beats
Estimate:  1532 beats (each ±50ms random)

Result:
F-measure = 0.83 (looks OK)
Cemgil = 0.63 (much lower!) ⚠️
Goto = 0.0 (phase is drifting)

Lesson: F-measure is optimistic; Cemgil is stricter
```

---

## Commands You'll Run

```bash
# Perfect match (baseline)
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est data/harmonix/reference/0010_andjusticeforall.txt

# Tempo doubling error
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est estimates/0010_test_tempo_double.txt

# Timing jitter
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est estimates/0010_test_jitter.txt

# Your own track (choose one)
TRACK="0001_12step"
python eval_single.py --ref data/harmonix/reference/${TRACK}.txt \
                      --est estimates/${TRACK}_YOUR_ERROR.txt
```

---

## Success Criteria: You'll Know Week 1 is Done When...

✅ You can run eval_single.py without errors
✅ You can explain what Goto=0.0 means
✅ You can explain why Cemgil < F-measure for jitter
✅ You created and tested your own error scenario
✅ You answered all analysis questions
✅ You made predictions and tested them
✅ You wrote a learning summary

---

## Common Questions (Before You Start)

### Q: Do I need to understand Python to do this?
**A:** No. You're running pre-written scripts and reading outputs. Copy-paste is fine.

### Q: What if I get NaN values?
**A:** That's normal! It means you have perfect beats. Read WEEK1_MIREX_METRICS_LEARNING.md to understand why.

### Q: How long will this take?
**A:** 3.5 hours total. 30 min for examples, 60 min for your experiment, 90 min for analysis.

### Q: Can I skip Part 3 (the homework)?
**A:** No. Parts 1 & 2 teach facts. Part 3 teaches you to THINK. That's what matters.

### Q: What if I don't understand a metric?
**A:** See WEEK1_MIREX_METRICS_LEARNING.md section "Metric Definitions".

---

## Setup Issues

### Issue: "No module named mir_eval"
```bash
pip install mir-eval numpy librosa
```

### Issue: "FileNotFoundError: data/harmonix/reference/..."
```bash
# Verify you're in the right directory
pwd  # Should end in: firmware/K1.node2/beats

# Verify files exist
ls data/harmonix/reference/ | head
```

### Issue: "Permission denied" on Python
```bash
# Make sure it's executable
chmod +x eval_single.py
python eval_single.py --help
```

---

## What Comes Next (Week 2+)

**Week 2:** Implement a beat tracking algorithm
- Use what you learned about metrics
- Build using Harmonix mel-spectrograms
- Know how to interpret results

**Week 3:** Batch validate on all 912 tracks
- Generate beat estimates
- Run batch_evaluate.py
- Analyze performance

**Week 4:** Refine and analyze
- Understand which tracks are hard
- Use metric insights to improve algorithm
- Prepare for deployment

**This Week 1 learning prevents debugging hell in Weeks 2-4.**

---

## Your Deliverable

**File:** `WEEK1_YOUR_NAME_RESULTS.md`

**Contains:**
- Outputs from Part 1 (three scenarios)
- Results from Part 2 (your experiment)
- Answers to Part 3 (interpretation + homework)

**Due:** End of Week 1

**Format:** See WEEK1_TEAM_EXECUTION_CHECKLIST.md for template

---

## Three Resources, One Path

```
START HERE (this file)
    ↓
Read WEEK1_QUICK_REFERENCE.md (1 page, print it)
    ↓
Follow WEEK1_TEAM_EXECUTION_CHECKLIST.md (step-by-step)
    ↓
Reference WEEK1_MIREX_METRICS_LEARNING.md (if confused)
    ↓
Deliver: WEEK1_YOUR_NAME_RESULTS.md (submit your work)
```

---

## Last Thought

This week feels like learning details. It is.

But these details are the difference between:
- 😫 "Why is my beat detector giving Goto=0.0?" (40 hours of debugging)
- 🎯 "Goto=0.0 means I'm detecting tempo wrong. Let me fix the tempo estimation." (1 hour)

Invest 3.5 hours now. Save 40 hours next week.

---

## Ready to Start?

1. ✅ Did you run setup commands? (pip install, chmod, etc.)
2. ✅ Did you print WEEK1_QUICK_REFERENCE.md?
3. ✅ Do you have WEEK1_TEAM_EXECUTION_CHECKLIST.md open?

If yes → You're ready. Start Part 1.

If no → Do that now.

See you on the other side of Week 1!

---

**Questions?**
- Setup issues → See "Setup Issues" above
- Confused about metrics → WEEK1_MIREX_METRICS_LEARNING.md
- Stuck on tasks → WEEK1_TEAM_EXECUTION_CHECKLIST.md FAQ
- Facilitating team → WEEK1_TEAM_LEADERSHIP_GUIDE.md

**Ready?** Go to WEEK1_TEAM_EXECUTION_CHECKLIST.md and start Part 1.
