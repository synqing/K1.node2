---
author: Claude Code Agent
date: 2025-10-29
status: published
intent: Week 1 quick reference card (print this)
---

# Week 1 Quick Reference Card

## The 9 MIREX Metrics (At a Glance)

```
┌─────────────────────────────────────────────────────────┐
│ METRIC         RANGE  MEANING                           │
├─────────────────────────────────────────────────────────┤
│ F-measure      0–1    Beat accuracy (±70ms window)     │
│ Cemgil         0–1    Stricter timing accuracy         │
│ Information    0–5.36 Phase consistency (bits)         │
│ Goto           0/1    Phase lock: yes/no?              │
│ CMLc/CMLt      0–1    Continuity (±17.5% tempo)        │
│ AMLc/AMLt      0–1    Strict continuity                │
│ PScore         0–1    Phase consistency (alt)          │
└─────────────────────────────────────────────────────────┘
```

## Error Type Diagnosis (Most Important!)

```
┌──────────────────────┬────────────┬────────────┬────────┐
│ ALGORITHM ERROR      │ F-measure  │ Cemgil     │ Goto   │
├──────────────────────┼────────────┼────────────┼────────┤
│ Perfect              │ 1.0        │ 1.0        │ 1.0    │
│ Tempo doubling       │ 0.67       │ 0.67       │ 0.0 ⚠️ │
│ Tempo halving        │ 0.67       │ 0.67       │ 0.0 ⚠️ │
│ Timing jitter        │ 0.83+      │ 0.60s ⚠️   │ 0.0    │
│ Timing offset        │ 0.70+      │ 0.65+      │ 0.0 ⚠️ │
│ Missing beats (20%)  │ 0.80       │ 0.80       │ varies │
│ Extra beats (20%)    │ 0.80       │ 0.80       │ varies │
└──────────────────────┴────────────┴────────────┴────────┘

⚠️ = This metric reveals the problem
```

## Run These Commands

```bash
# Navigate
cd firmware/K1.node2/beats

# Perfect match (baseline)
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est data/harmonix/reference/0010_andjusticeforall.txt

# Tempo doubling error
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est estimates/0010_test_tempo_double.txt

# Timing jitter
python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                      --est estimates/0010_test_jitter.txt

# Your own track
TRACK="0001_12step"
python eval_single.py --ref data/harmonix/reference/${TRACK}.txt \
                      --est estimates/${TRACK}_YOUR_ERROR.txt
```

## Key Insights

| Insight | Implication |
|---------|------------|
| F-measure can be misleading | Always check Cemgil + Goto |
| Goto=0.0 → wrong tempo | Not an onset detection problem |
| Cemgil < F-measure → timing noise | Jitter is significant |
| NaN metrics → perfect beats | That's OK, nothing wrong |
| Phase lock = beat drift ≤±35ms | Systematic error is fixable |

## The Critical Metric: GOTO

```
Goto = 1.0  ✅  Algorithm found the RIGHT tempo
            └─→ Only accuracy is wrong

Goto = 0.0  ❌  Algorithm found the WRONG tempo
            └─→ Different problem, harder to fix
```

## Prediction Template

Before running eval_single.py, fill this in:

```
Error type: [tempo doubling / jitter / offset / missing / other]

Prediction:
- F-measure will be: ?  (1.0 = perfect, 0.8 = good, 0.6 = bad)
- Cemgil will be: ?     (usually ≤ F-measure)
- Goto will be: ?       (1.0 = right tempo, 0.0 = wrong tempo)

Reasoning: Because...

Actual Result:
- F-measure: [paste]
- Cemgil: [paste]
- Goto: [paste]

Was I right? Why / why not?
```

## Common Misunderstandings

❌ "High F-measure = good algorithm"
✅ "High F-measure + Goto=1.0 + Cemgil~F = good algorithm"

❌ "Goto measures onset detection accuracy"
✅ "Goto measures if you found the right tempo"

❌ "Information Gain tells me everything"
✅ "Information Gain only computes if variation exists"

❌ "±70ms is strict"
✅ "±70ms is MIREX standard; Cemgil is stricter (±40ms)"

## In 30 Seconds: What You're Learning

> **F-measure says IF you're correct. Cemgil says HOW correct. Goto says if you're looking at the right problem.**

---

**Print this. Use during Week 1. Refer back to it when confused.**

Questions? See `WEEK1_MIREX_METRICS_LEARNING.md`
