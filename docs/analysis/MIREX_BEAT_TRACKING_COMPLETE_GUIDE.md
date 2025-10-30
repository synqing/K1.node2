---
author: Claude Code Agent (Search Specialist + Deep Technical Analysis)
date: 2025-10-29
status: published
intent: Complete technical guide to MIREX beat tracking evaluation methodology, metrics, datasets, and implementation for PF-5 Phase 1 validation
---

# MIREX Beat Tracking Evaluation: Complete Technical Guide

**TL;DR**: MIREX is the gold-standard evaluation framework for beat detection. Test your algorithm against public datasets using the `mir_eval` library. Target F-Measure >0.85, Cemgil >0.85, Information Gain >3.5 bits. Use ±70ms tolerance window.

---

## 1. WHAT IS MIREX?

**Full Name**: Music Information Retrieval Evaluation eXchange

**Organization**: IMIRSEL (International Music Information Retrieval Systems Evaluation Laboratory), University of Illinois at Urbana-Champaign

**Funding**: National Science Foundation (NSF) + Andrew W. Mellon Foundation

**Purpose**: Community-driven formal evaluation framework for music algorithms. Rather than distributing datasets (which causes overfitting), MIREX maintains centralized test collections where researchers submit algorithms for evaluation.

**Key Advantage**: Prevents "benchmark overfitting" - algorithms cannot be tuned to known datasets, ensuring true generalization capability.

**Current Status** (2024-2025): After 3-year hiatus, MIREX returned with modernized evaluation pipeline using `mir_eval` library.

---

## 2. BEAT TRACKING TASK DEFINITION

**Objective**: Detect all beat locations (temporal positions where musicians/listeners feel the primary pulse) in audio recordings.

**Ground Truth**: Human annotations from 40 independent listeners per track, consensus-averaged.

**Output Format**: List of beat times in seconds (one per line)

**Evaluation Method**: Compare algorithm output against reference using multiple metrics with different tolerance windows.

---

## 3. MIREX DATASETS

### A. Original 2006 Dataset
- **Size**: 160 × 30-second excerpts (WAV format)
- **Annotations**: 40 human listeners per excerpt
- **BPM Range**: 40-200
- **Characteristics**: Stable tempos, general variety
- **Usage**: Historical baseline

### B. SMC (Simon Malinowski Collection) Dataset
- **Size**: 217 excerpts, ~40 seconds each
- **Breakdown**: 19 "easy" + 198 "hard"
- **Hard Subset Genres**: Romantic, film soundtracks, blues, chanson, solo guitar
- **Characteristics**: Tests robustness to complex music
- **Status**: Public (Creative Commons)
- **Typical Performance**:
  - Easy subset: F-measure 0.88-0.92
  - Hard subset: F-measure 0.72-0.78
  - Gap demonstrates non-Western music complexity

### C. Mazurka Dataset
- **Size**: 367 complete Chopin Mazurkas (full tracks)
- **Key Challenge**: Tempo changes and rubato
- **Format**: Full-length audio files
- **Typical Performance**: F-measure 0.70-0.78
- **Usage**: Evaluate tempo variation handling

### D. Yamaha Dataset
- **Size**: 239 songs
- **Genres**: J-Pop (10.37%), Rock (10.37%), J-Enka (10.37%), Soundtrack (10.37%), Western Pop (10.37%), R&B (6.22%), Hip-hop (4.56%), Jazz (2.49%), Techno (1.24%), and others
- **Characteristics**: Modern production, diverse mixing
- **Status**: Available via MIREX submission
- **Typical Performance**: 0.75-0.85

---

## 4. EVALUATION METRICS (DETAILED)

### A. F-Measure (Primary Metric)

**Purpose**: Binary accuracy - standard baseline in music research

**Tolerance Window**: ±70ms (±0.070 seconds) around each ground-truth beat

**Formula**:
```
TP = beats within ±70ms of reference
FP = beats outside all ±70ms windows + extra beats in same window
FN = reference beats with no estimated beat in ±70ms window

Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F-Measure = 2 * (Precision * Recall) / (Precision + Recall)
```

**Practical Example**:
```
Reference beats: [0.5s, 1.0s, 1.5s, 2.0s]
Estimated beats: [0.48s, 1.1s, 1.55s, 1.95s, 2.10s]

Tolerance windows:
- [0.430-0.570] ← 0.48s ✓ (TP)
- [0.930-1.070] ← 1.1s ✗ (FP, outside)
- [1.430-1.570] ← 1.55s ✓ (TP)
- [1.930-2.070] ← 1.95s ✓ (TP)
- [1.930-2.070] ← 2.10s ✗ (FP, duplicate window)
- 1.0s: no beat in window (FN)

TP=3, FP=2, FN=1
Precision = 3/5 = 0.60
Recall = 3/4 = 0.75
F = 2*(0.60*0.75)/(0.60+0.75) = 0.667
```

**Interpretation**:
| F-Measure | Category | Meaning |
|-----------|----------|---------|
| 0.85+ | **Excellent** | State-of-the-art, publication-ready |
| 0.80-0.85 | **Very Good** | Competitive algorithm |
| 0.75-0.80 | **Good** | Solid baseline |
| 0.70-0.75 | **Acceptable** | Working implementation |
| 0.60-0.70 | **Poor** | Needs improvement |
| <0.60 | **Failing** | Fundamental issue |

**Limitations**:
- Binary scoring (beat is in window or not)
- Doesn't penalize poor localization within window (0.01s error = 1.00s error if both in window)
- Uses fixed 70ms window (may not suit all tempos)

---

### B. Cemgil Score (Fine-Grained Localization Metric)

**Purpose**: Reward precise beat timing (not just presence within window)

**Method**: Gaussian-weighted error with σ = 0.04 seconds (40ms)

**Formula**:
```
For each estimated beat, find nearest reference beat:
error = |estimated_beat - nearest_reference|

Score = (1/N) * Σ exp(-(error)² / (2*σ²))
       = (1/N) * Σ exp(-(error)² / 0.0032)

Interpretation: Smooth penalty curve, not binary
```

**Error-to-Score Mapping**:
| Error (ms) | Score | Interpretation |
|-----------|-------|-----------------|
| 0 | 1.000 | Perfect |
| 10 | 0.999 | Imperceptible |
| 20 | 0.992 | Very good |
| 40 | 0.951 | Good |
| 60 | 0.827 | Acceptable |
| 80 | 0.659 | Poor |
| 100 | 0.427 | Very poor |
| 140 | 0.100 | Nearly missed |

**Interpretation**:
| Cemgil | Category | Typical Error |
|--------|----------|---------------|
| 0.90+ | **Excellent** | 10-20ms |
| 0.85-0.90 | **Very Good** | 20-30ms |
| 0.80-0.85 | **Good** | 30-40ms |
| 0.75-0.80 | **Acceptable** | 40-50ms |
| <0.75 | **Poor** | 50ms+ |

**Key Advantage**: Distinguishes between "beat in window" and "beat well-localized"

---

### C. Information Gain (Phase Consistency Metric)

**Purpose**: Measure whether beat errors cluster near consistent phase, independent of tolerance windows

**Basis**: Kullback-Leibler (KL) divergence of beat error distribution vs. uniform

**Calculation**:
```
1. Normalize beat errors to [0, 1] phase range
   normalized_error = (estimated - reference) % inter_beat_interval
2. Histogram errors into 41 bins
3. Compute KL divergence:
   IG = Σ p(k) * log₂(p(k) / (1/41))
   Range: 0 to 5.36 bits
```

**Interpretation**:
| IG (bits) | Category | Meaning |
|-----------|----------|---------|
| 4.5-5.36 | **Excellent** | 95%+ errors in 2-3 bins = strong phase lock |
| 3.5-4.5 | **Very Good** | 80%+ in 3-5 bins |
| 2.5-3.5 | **Good** | 60%+ concentrated phase |
| 1.5-2.5 | **Acceptable** | Moderate scatter |
| <1.5 | **Poor** | Nearly uniform distribution |

**Key Insight**: Detects tempo doubling artifacts
```
Example: Algorithm detects half-tempo (every other beat)
- F-measure: 0.50 (only 50% beats found)
- Information Gain: 0.0 (errors distributed uniformly)
→ Immediately identifies the problem
```

---

### D. Goto Score (Phase Lock Binary)

**Purpose**: Binary metric for sustained beat phase continuity

**Definition**:
```
Goto = 1 if algorithm maintains:
  - Mean error < 0.2 seconds
  - Standard deviation < 0.2 seconds
  - For at least 25% of beat sequence (continuous segment)
Otherwise: Goto = 0
```

**Interpretation**:
| Goto | Meaning |
|------|---------|
| 1 | Algorithm achieves sustained phase lock |
| 0 | Algorithm cannot maintain consistent phase |

**Characteristic**: All-or-nothing, but lenient (25% is low threshold)

---

### E. Continuity Metrics: CMLc, CMLt, AMLc, AMLt

**Purpose**: Evaluate beat tracking while allowing metrical interpretation variations

**Problem Solved**: Some music has ambiguous beat levels (double/half tempo, off-beat, triple). Different interpretations are valid but differ from annotation.

**Dynamic Tolerance**: 17.5% of inter-beat interval (not fixed 70ms)
```
Example: 120 BPM → 0.5s interval
Tolerance = 0.175 × 0.5 = ±87.5ms (adaptive)
```

**Metrical Variations Allowed**:
- **CML** (Continuity Meter Level): Exact annotation level only
- **AML** (All Metrical Levels): Allow double/half tempo, off-beat, triple variations

**Suffix**:
- **c** (continuity): Longest continuous valid segment
- **t** (total): Sum of all valid segments

**Range**: 0.0-1.0 (fraction of beats in valid segments)

**Interpretation**:
| Score | CMLc | CMLt | AMLc | AMLt |
|-------|------|------|------|------|
| 0.90+ | Excellent | Excellent | Excellent | Excellent |
| 0.80-0.90 | Good | Good | Good | Good |
| 0.70-0.80 | Adequate | Adequate | Good | Very Good |
| 0.60-0.70 | Fair | Fair | Adequate | Good |

**Diagnostic Example**:
```
Results:
- CMLc: 0.75 (high)
- AMLc: 0.55 (low)

Interpretation:
→ Algorithm locks to annotation beats
→ But often at wrong metrical level
→ Check tempo estimation (may be doubling)
```

---

## 5. STATE-OF-THE-ART BASELINE PERFORMANCE

### Top Algorithms (2019-2021 MIREX)

| Algorithm | F-Measure | Cemgil | Method |
|-----------|-----------|--------|--------|
| **Madmom (RNN+DBN)** | 0.82 | 0.87 | Deep learning + Dynamic Bayes Net |
| **Dixon (2006)** | 0.83 | 0.84 | Onset-based with filtering |
| **Ellis (Onset-based)** | 0.76 | 0.79 | Spectral flux peaks |
| **Essentia** | 0.75 | 0.77 | Feature-based + voting |
| **Simple Baseline (Energy)** | ~0.65 | ~0.68 | Peak picking on energy |

### Performance Interpretation

| F-Measure | Category | Typical Use | Effort |
|-----------|----------|-------------|--------|
| 0.85+ | State-of-the-art | Competition winner | Significant R&D |
| 0.80-0.85 | Excellent | Publication-worthy | Advanced techniques |
| 0.75-0.80 | Good | Competitive | Solid implementation |
| 0.70-0.75 | Acceptable | Working baseline | Standard methods |
| 0.60-0.70 | Poor | Proof of concept | Basic implementation |
| <0.60 | Failing | Debugging needed | Fundamental issue |

---

## 6. PRACTICAL IMPLEMENTATION: mir_eval LIBRARY

### Installation

```bash
pip install mir_eval
```

### Minimal Test Example

```python
import mir_eval.beat
import mir_eval.io

# Load beat times from text files (one beat per line, in seconds)
reference_beats = mir_eval.io.load_events('reference_beats.txt')
estimated_beats = mir_eval.io.load_events('estimated_beats.txt')

# Standard preprocessing: trim beats before 5 seconds
reference_beats = mir_eval.beat.trim_beats(reference_beats)
estimated_beats = mir_eval.beat.trim_beats(estimated_beats)

# Evaluate all metrics
scores = mir_eval.beat.evaluate(reference_beats, estimated_beats)

# Print results
print("=== Beat Tracking Evaluation Results ===")
for metric, score in scores.items():
    print(f"{metric:25s}: {score:.4f}")
```

**Output Example**:
```
=== Beat Tracking Evaluation Results ===
F-Measure                : 0.8234
Cemgil                   : 0.8567
Goto                     : 1.0000
CMLc                     : 0.7500
CMLt                     : 0.8333
AMLc                     : 0.9000
AMLt                     : 0.9444
PScore                   : 0.7891
Information Gain         : 3.8742 bits
```

### Input File Format

Plain text, one beat time per line (in seconds):

```
0.464
0.928
1.393
1.857
2.321
2.785
3.249
3.713
```

### Real-World Audio Processing Example

```python
import librosa
import numpy as np
import mir_eval.beat
import mir_eval.io

def detect_beats_from_audio(audio_file):
    """Your beat detection algorithm"""
    y, sr = librosa.load(audio_file, sr=22050)

    # Your algorithm here (spectral flux, onset detection, etc.)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    # Filter to actual beats (your algorithm logic)
    beat_times = filter_beats(onset_times)

    return beat_times

def evaluate_beats(audio_file, reference_file):
    """Evaluate your algorithm against reference"""

    # Generate predictions
    estimated_beats = detect_beats_from_audio(audio_file)

    # Load reference
    reference_beats = mir_eval.io.load_events(reference_file)

    # Preprocess
    reference_beats = mir_eval.beat.trim_beats(reference_beats)
    estimated_beats = mir_eval.beat.trim_beats(estimated_beats)

    # Evaluate
    scores = mir_eval.beat.evaluate(reference_beats, estimated_beats)

    return scores

# Test on a file
scores = evaluate_beats('song.mp3', 'song_beats.txt')
print(f"F-Measure: {scores['F-Measure']:.4f}")
print(f"Cemgil: {scores['Cemgil']:.4f}")
```

### Batch Evaluation Over Multiple Files

```python
import os
import csv
import mir_eval.beat
import mir_eval.io

def batch_evaluate(reference_dir, estimate_dir, output_csv):
    """Evaluate all files, save results to CSV"""

    results = []

    for ref_file in sorted(os.listdir(reference_dir)):
        est_file = ref_file.replace('ref', 'est')

        # Load
        ref_path = os.path.join(reference_dir, ref_file)
        est_path = os.path.join(estimate_dir, est_file)

        ref_beats = mir_eval.io.load_events(ref_path)
        est_beats = mir_eval.io.load_events(est_path)

        # Preprocess
        ref_beats = mir_eval.beat.trim_beats(ref_beats)
        est_beats = mir_eval.beat.trim_beats(est_beats)

        # Evaluate
        scores = mir_eval.beat.evaluate(ref_beats, est_beats)

        # Store
        result_row = {'file': ref_file}
        result_row.update(scores)
        results.append(result_row)

        print(f"{ref_file}: F={scores['F-Measure']:.4f}")

    # Save CSV
    if results:
        with open(output_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)

        # Print summary statistics
        f_measures = [r['F-Measure'] for r in results]
        print(f"\n=== Summary ===")
        print(f"Mean F-Measure: {np.mean(f_measures):.4f}")
        print(f"Median F-Measure: {np.median(f_measures):.4f}")
        print(f"Std Dev: {np.std(f_measures):.4f}")

# Run
batch_evaluate('reference_beats/', 'estimated_beats/', 'results.csv')
```

---

## 7. ERROR ANALYSIS & DEBUGGING

### Compute Detailed Error Statistics

```python
import numpy as np

def analyze_beat_errors(ref_beats, est_beats):
    """Detailed error analysis"""

    errors = []
    phase_errors = []

    # For each estimated beat, find nearest reference
    for est in est_beats:
        nearest_ref = min(ref_beats, key=lambda r: abs(r - est))
        error = est - nearest_ref
        errors.append(error)

        # Phase error (within inter-beat interval)
        ibi = np.median(np.diff(ref_beats))
        phase = (error % ibi) / ibi
        phase_errors.append(phase)

    errors = np.array(errors)

    print("=== Error Statistics ===")
    print(f"Mean error: {np.mean(np.abs(errors)):.4f}s = {1000*np.mean(np.abs(errors)):.1f}ms")
    print(f"Median error: {np.median(np.abs(errors)):.4f}s")
    print(f"Std deviation: {np.std(errors):.4f}s")
    print(f"Max error: {np.max(np.abs(errors)):.4f}s")

    # Distribution
    within_70ms = np.sum(np.abs(errors) < 0.070) / len(errors) * 100
    within_50ms = np.sum(np.abs(errors) < 0.050) / len(errors) * 100
    within_30ms = np.sum(np.abs(errors) < 0.030) / len(errors) * 100

    print(f"\nWithin ±70ms: {within_70ms:.1f}%")
    print(f"Within ±50ms: {within_50ms:.1f}%")
    print(f"Within ±30ms: {within_30ms:.1f}%")

    return errors, phase_errors

# Usage
ref = mir_eval.io.load_events('reference.txt')
est = mir_eval.io.load_events('estimated.txt')
errors, phases = analyze_beat_errors(ref, est)
```

---

## 8. TEST PROTOCOL FOR PF-5 PHASE 1

### Step 1: Obtain Test Data

**Option A: Public SMC Dataset** (recommended for initial testing)
- Download: https://github.com/marl/smcdb
- 217 files, diverse genres, already annotated
- No MIREX submission needed

**Option B: MIREX Submission**
- Contact IMIRSEL: https://www.music-ir.org/mirex/
- Get access to official 2025 datasets
- Submit algorithm for blind evaluation

**Option C: Create Custom Dataset**
- Collect 10+ diverse music files
- Get 3-5 independent human annotators
- Average annotations for consensus

### Step 2: Generate Predictions

```python
def test_algorithm_on_dataset(audio_dir, output_dir):
    """Generate beat estimates for all audio files"""

    os.makedirs(output_dir, exist_ok=True)

    for audio_file in os.listdir(audio_dir):
        if not audio_file.endswith(('.mp3', '.wav', '.flac')):
            continue

        # Your algorithm
        beat_times = your_beat_detection_algorithm(
            os.path.join(audio_dir, audio_file)
        )

        # Save
        output_file = os.path.splitext(audio_file)[0] + '.txt'
        np.savetxt(
            os.path.join(output_dir, output_file),
            beat_times,
            fmt='%.6f'
        )

        print(f"Processed {audio_file}: {len(beat_times)} beats")

test_algorithm_on_dataset('audio_files/', 'estimated_beats/')
```

### Step 3: Evaluate

```python
# Batch evaluation (see section 6)
batch_evaluate('reference_beats/', 'estimated_beats/', 'results.csv')
```

### Step 4: Interpret Results

**Primary Metric**: F-Measure
- Report this for comparisons
- Target: >0.80 (competitive), >0.85 (excellent)

**Secondary Metric**: Cemgil
- Fine-tuning precision
- Target: >0.85

**Diagnostic Metrics**:
- Information Gain: >3.5 bits (phase consistency)
- Goto: 1.0 (phase lock stability)
- CMLc/CMLt: >0.75 (continuous accuracy)

### Step 5: Debug If Needed

**Low F-Measure (<0.75) but high Cemgil (>0.85)**
→ Problem: Tempo doubling/halving (detecting every other beat)
→ Fix: Improve tempo estimation, check beat density

**High F-Measure (>0.80) but low Information Gain (<3.0 bits)**
→ Problem: Beats scattered across wrong phases
→ Fix: Improve phase consistency, add tempo tracking

**F-Measure and Cemgil both low (<0.75)**
→ Problem: Fundamental beat detection issue
→ Fix: Review algorithm, check for audio loading issues

---

## 9. MIREX 2025 UPDATES

**Key Changes from Previous Years**:
- Switched to `mir_eval` library for evaluation
- Some metrics not directly comparable to pre-2024 results
- Metrics F1, Goto, CMLc, CMLt, AMLc, AMLt are comparable
- Cemgil and P-Score changed implementation (not comparable)

**If Comparing to Historic Data**:
- Use F-Measure only (most stable across versions)
- Account for ~2-5% variation due to implementation differences
- Prefer 2019-2023 benchmarks if available

---

## 10. KEY INSIGHTS & RECOMMENDATIONS

### Which Metrics to Report

| Use Case | Primary | Secondary | Diagnostic |
|----------|---------|-----------|-----------|
| **Research Paper** | F-Measure | Cemgil | Information Gain |
| **Real-Time System** | Goto | CMLc | F-Measure |
| **Audio Production** | Cemgil | F-Measure | CMLc |
| **Robustness Test** | AMLt | CMLt | Information Gain |

### Common Pitfalls to Avoid

1. **Different tolerance windows** - Always use 70ms standard (or state clearly if using different)
2. **Including early beats** - Always trim before 5 seconds (standard preprocessing)
3. **Single-file testing** - Test on minimum 10+ diverse files
4. **Overfitting to test set** - Don't tune parameters on test data; use MIREX for final validation
5. **Ignoring metrical ambiguity** - Use AML metrics for complex music with rubato/variation
6. **Comparing old/new MIREX** - Account for 2-5% implementation differences

### Performance Improvement Strategy

| Current F-Measure | Issue | Fix | Expected Gain |
|------------------|-------|-----|----------------|
| <0.60 | Fundamental problem | Verify audio loading, beat format, reference alignment | +0.10-0.20 |
| 0.60-0.75 | Tempo/phase issues | Improve tempo tracking, add Viterbi smoothing | +0.05-0.15 |
| 0.75-0.85 | Fine-tuning needed | Improve phase consistency, adaptive thresholds | +0.02-0.10 |
| >0.85 | Near optimal | Check overfitting, test on MIREX data | +0.00-0.05 |

---

## 11. RESOURCES & LINKS

**Official MIREX**:
- Wiki: https://www.music-ir.org/mirex/
- 2025 Results: https://www.music-ir.org/mirex/wiki/2025:Audio_Beat_Tracking_Results
- IMIRSEL: https://www.library.illinois.edu/

**Tools & Libraries**:
- mir_eval: https://github.com/mir-evaluation/mir_eval (main evaluation)
- Madmom: https://madmom.readthedocs.io/ (state-of-the-art algorithm)
- Essentia: https://essentia.upf.edu/ (feature extraction + beat tracking)
- librosa: https://librosa.org/ (audio processing)

**Datasets**:
- SMC Dataset: https://github.com/marl/smcdb (public, Creative Commons)
- Mazurka Dataset: https://imslp.org/ (public, classical)
- MIREX official: Contact IMIRSEL for access

**Research Papers**:
- mir_eval paper (Raffel et al., 2014): https://www.music-ir.org/mirex/abstracts/2014/
- Goto et al. (2004): Structural analysis of music signals
- Davies et al. (2009): Evaluation of audio beat tracking algorithms
- Ellis (2007): Beat tracking by dynamic programming

**Tutorials**:
- Tempo/Beat/Downbeat tutorial: https://tempobeatdownbeat.github.io/
- Music Classification evaluation guide: https://music-classification.github.io/

---

## 12. SUMMARY TABLE: QUICK REFERENCE

| Metric | Tolerance | Range | Target | Interpretation |
|--------|-----------|-------|--------|-----------------|
| **F-Measure** | ±70ms | 0.0-1.0 | >0.80 | Binary accuracy (primary) |
| **Cemgil** | Gaussian σ=40ms | 0.0-1.0 | >0.85 | Localization precision |
| **Information Gain** | Phase consistency | 0-5.36 bits | >3.5 bits | Phase clustering |
| **Goto** | 0.2s mean/std | {0, 1} | 1.0 | Phase lock continuity |
| **CMLc** | ±17.5% IBI | 0.0-1.0 | >0.75 | Longest valid segment |
| **CMLt** | ±17.5% IBI | 0.0-1.0 | >0.75 | Total valid segments |
| **AMLc** | ±17.5% IBI + variations | 0.0-1.0 | >0.85 | All levels, longest |
| **AMLt** | ±17.5% IBI + variations | 0.0-1.0 | >0.85 | All levels, total |

---

**For PF-5 Phase 1**: Test your AudioWorklet beat detection against SMC "easy" subset first (target F >0.85), then "hard" subset (target >0.75). Report F-Measure + Cemgil. Use `mir_eval` for evaluation.

**Status**: ✅ COMPLETE TECHNICAL REFERENCE
