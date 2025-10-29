# Beat Evaluation (Manual-First, MIREX-Standard)

This directory contains scripts for evaluating beat detection algorithms against MIREX standards (Music Information Retrieval Evaluation eXchange).

## Overview

We use two scripts to support the validation timeline:
- **`eval_single.py`**: Learn the metrics on one track (Week 1)
- **`batch_evaluate.py`**: Validate on all 217 SMC files (Week 3)

Both scripts call `mir_eval.beat.evaluate` directly—no frameworks, no gates, no magic. Just transparent metrics and data.

## Input Format

Beat files are simple text: one floating-point time (seconds per line), UTF-8 encoding.

Example reference file (beat annotations):
```
0.464
0.929
1.394
2.320
...
```

Example estimate file (algorithm output):
```
0.450
0.925
1.400
2.310
...
```

## Folders

- **`reference/`**: Ground truth beat annotations (one .txt file per track)
- **`estimates/`**: Algorithm output (same basenames as reference/)

## Installation

```bash
# Create virtual environment (one time)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Week 1: Single-File Learning

Run on one track to understand what each metric means:

```bash
python eval_single.py \
  --ref reference/easy_001.txt \
  --est estimates/easy_001.txt
```

Output:
```
=== INPUT CHECK ===
ref beats: 47 (trim<5.0s removed)
est beats: 45

=== METRICS (MIREX defs via mir_eval.beat.evaluate) ===
      F-measure: 0.852381
        Cemgil: 0.891234
Information Gain: 3.742156
          Goto: 1.000000
          CMLc: 0.851064
          CMLt: 0.851064
          AMLc: 0.851064
          AMLt: 0.851064
         PScore: 0.851064
```

**What to check:**
- Do beat counts make sense? (Should lose ~2-3 beats after 5s trim)
- Is F-measure in expected range? (0.70–0.90 for typical audio)
- Does Cemgil track with F-measure? (Usually similar magnitude)
- Information Gain in bits? (Typical 2.5–4.5)

This is where you learn metrics *before* automation.

## Week 3: Batch Evaluation

Once you have estimates for all 217 tracks:

```bash
python batch_evaluate.py \
  --reference_dir reference \
  --estimate_dir estimates \
  --out_csv results/per_file.csv \
  --out_json results/aggregate.json
```

Output files:
- **`results/per_file.csv`**: One row per track with all metrics
  ```
  file,n_ref,n_est,F-measure,Cemgil,Information Gain,...
  easy_001.txt,47,45,0.852,0.891,3.742,...
  easy_002.txt,52,50,0.823,0.867,3.641,...
  ...
  hard_217.txt,38,40,0.512,0.434,1.923,...
  ```

- **`results/aggregate.json`**: Summary statistics (means, stdev)
  ```json
  {
    "count": 217,
    "F-measure_mean": 0.764,
    "F-measure_std": 0.118,
    "Cemgil_mean": 0.802,
    ...
  }
  ```

**What to do next:**
1. Sort per_file.csv by F-measure to find worst performers
2. Analyze by difficulty (easy vs hard subset)
3. Check if Information Gain correlates with F-measure
4. Look for patterns in failures (e.g., all hard tracks fail? All slow songs?)
5. Use insights to debug algorithm

## MIREX Metrics (Definitions)

All metrics are computed by `mir_eval.beat.evaluate` per MIREX standard:

| Metric | Definition | Range | Interpretation |
|--------|-----------|-------|-----------------|
| **F-measure** | Binary accuracy within ±70ms | 0–1 | Main metric; 0.80+ is competitive |
| **Cemgil** | Gaussian-weighted error (σ=40ms) | 0–1 | Fine-grained accuracy; rewards precision |
| **Information Gain** | Phase consistency (KL divergence) | 0–5.36 bits | Measures if beats fall on consistent phase |
| **Goto** | Phase lock continuity | 0–1 | Binary: are beats phase-locked? |
| **CMLc/CMLt** | Continuity w/ ±17.5% dynamic tolerance | 0–1 | How many beat sequences are continuous? |
| **AMLc/AMLt** | Absolute continuity (stricter) | 0–1 | Stricter version of continuity |
| **PScore** | Normalized information gain | 0–1 | Alternative phase consistency metric |

**First 5 seconds trimmed** per MIREX convention (removal of silence/intro before tempo stabilizes).

## Reproduction & Datasets

To reproduce Week 3 results, you need the SMC dataset:
```bash
git clone https://github.com/marl/smcdb.git
cp smcdb/annotations/beats/*.txt reference/
```

See `docs/analysis/MIREX_BEAT_TRACKING_COMPLETE_GUIDE.md` for full dataset details and links.

## Troubleshooting

**"No matching .txt basenames"**: Check that reference/ and estimates/ have same filenames.

**NaN values in CSV**: Metric failed to compute (usually empty beat list). Check input file format.

**F-measure ~0.50**: Algorithm may be tempo-doubling (detecting every other beat). Check Information Gain—if low, likely phase issue.

## Next Steps (After Week 1-3 Validation)

Once metrics are validated:
- [ ] Add gates (GO/CONDITIONAL/BLOCK logic) in separate script
- [ ] Integrate into GitHub Actions for CI
- [ ] Add plots (error distributions, per-genre breakdown)
- [ ] Commit dataset pinning (DATASET.md) for reproducibility

For now, focus on understanding raw metrics and algorithm performance.

## See Also

- `Implementation.plans/runbooks/MIREX_BEAT_VALIDATION_CHECKLIST.md` — Week 1-4 timeline
- `docs/analysis/MIREX_BEAT_TRACKING_COMPLETE_GUIDE.md` — Full MIREX reference and state-of-the-art baselines
- Official MIREX: https://www.music-ir.org/mirex/abstracts/2006/beat_tracking.pdf

---

**Owner**: PF-5 Phase 1 Audio Validation Team
**Last updated**: 2025-10-29
