# MIREX Beat Tracking: Quick Start Implementation

**Author:** Search Specialist Agent
**Date:** 2025-10-29
**Status:** published
**Intent:** Practical step-by-step guide to evaluating beat detection algorithms using MIREX metrics

---

## 5-Minute Setup

### Install mir_eval

```bash
pip install mir_eval
```

### Basic Evaluation Template

```python
import mir_eval.beat
import mir_eval.io

# Load your data (beats in seconds, one per line)
reference_beats = mir_eval.io.load_events('reference_beats.txt')
estimated_beats = mir_eval.io.load_events('estimated_beats.txt')

# Trim beats before 5 seconds (standard preprocessing)
reference_beats = mir_eval.beat.trim_beats(reference_beats)
estimated_beats = mir_eval.beat.trim_beats(estimated_beats)

# Evaluate ALL metrics at once
scores = mir_eval.beat.evaluate(reference_beats, estimated_beats)

# Print results
print("MIREX Beat Tracking Evaluation Results")
print("=" * 40)
for metric, score in sorted(scores.items()):
    print(f"{metric:20s}: {score:7.4f}")
```

---

## Complete Test Script

Save as `evaluate_beats.py`:

```python
#!/usr/bin/env python3
"""
Beat tracking evaluation using MIREX metrics.
Usage: python evaluate_beats.py <reference_dir> <estimate_dir>
"""

import os
import sys
import json
import numpy as np
import mir_eval.beat
import mir_eval.io
from pathlib import Path

def evaluate_file(ref_file, est_file):
    """Evaluate a single file."""
    try:
        ref_beats = mir_eval.io.load_events(ref_file)
        est_beats = mir_eval.io.load_events(est_file)

        # Trim beats before 5 seconds
        ref_beats = mir_eval.beat.trim_beats(ref_beats)
        est_beats = mir_eval.beat.trim_beats(est_beats)

        # Evaluate
        scores = mir_eval.beat.evaluate(ref_beats, est_beats)
        return scores, None

    except Exception as e:
        return None, str(e)

def evaluate_batch(ref_dir, est_dir, output_json=None):
    """Evaluate all files in directories."""

    ref_files = sorted([f for f in os.listdir(ref_dir)
                       if f.startswith('ref')])

    if not ref_files:
        print(f"No reference files found in {ref_dir}")
        sys.exit(1)

    results = {}
    all_metrics = None

    print(f"Evaluating {len(ref_files)} files...")
    print("-" * 60)

    for ref_file in ref_files:
        # Infer estimated file name
        est_file = ref_file.replace('ref', 'est')
        est_path = os.path.join(est_dir, est_file)
        ref_path = os.path.join(ref_dir, ref_file)

        if not os.path.exists(est_path):
            print(f"SKIP: {est_file} not found")
            continue

        # Evaluate
        scores, error = evaluate_file(ref_path, est_path)

        if error:
            print(f"ERROR: {ref_file} - {error}")
            continue

        # Store
        results[ref_file] = scores

        # Track metrics for averaging
        if all_metrics is None:
            all_metrics = {k: [] for k in scores.keys()}
        for k, v in scores.items():
            all_metrics[k].append(v)

        # Print per-file
        f_measure = scores.get('F-measure', 0)
        print(f"{ref_file:30s} | F: {f_measure:.4f}")

    # Compute averages
    print("-" * 60)
    if all_metrics:
        averages = {k: np.mean(v) for k, v in all_metrics.items()}
        stdevs = {k: np.std(v) for k, v in all_metrics.items()}

        print("AVERAGES:")
        for metric in sorted(averages.keys()):
            avg = averages[metric]
            std = stdevs[metric]
            print(f"  {metric:20s}: {avg:.4f} ± {std:.4f}")

        # Save JSON if requested
        if output_json:
            output = {
                'per_file': results,
                'averages': averages,
                'stdevs': stdevs,
                'num_files': len(results)
            }
            with open(output_json, 'w') as f:
                json.dump(output, f, indent=2)
            print(f"\nResults saved to {output_json}")

        return averages
    else:
        print("No files evaluated successfully.")
        return None

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python evaluate_beats.py <reference_dir> <estimate_dir> [output.json]")
        sys.exit(1)

    ref_dir = sys.argv[1]
    est_dir = sys.argv[2]
    output_json = sys.argv[3] if len(sys.argv) > 3 else None

    evaluate_batch(ref_dir, est_dir, output_json)
```

Usage:

```bash
python evaluate_beats.py ./reference_beats/ ./estimated_beats/ results.json
```

---

## Data Format

### Input: Beat Times

Plain text file with one beat time per line (in seconds):

**reference_beats.txt:**
```
0.464
0.928
1.393
1.857
2.321
2.786
3.250
3.714
...
```

### Generate from Your Algorithm

```python
import numpy as np

# Your beat detection output
beat_times = np.array([0.464, 0.928, 1.393, ...])

# Save as text
np.savetxt('estimated_beats.txt', beat_times, fmt='%.6f')
```

---

## Interpreting Scores

### Primary Metric: F-Measure

```
F-Measure: 0.8234

Interpretation:
  0.80-1.00 → Excellent (state-of-the-art)
  0.70-0.80 → Good (competitive)
  0.60-0.70 → Acceptable (baseline)
  0.50-0.60 → Poor (needs work)
  <0.50    → Failing
```

### Information Gain (in bits)

```
Information Gain: 3.8742 bits

Interpretation:
  3.5-5.0 → Excellent (concentrated around correct phase)
  2.5-3.5 → Good
  1.5-2.5 → Acceptable
  0.5-1.5 → Poor
  <0.5   → Failing (uniform distribution)
```

### Decision Tree

```
Is F > 0.80?
├─ YES → Algorithm is competitive! Check Cemgil for fine-tuning
└─ NO  → Is Information Gain < 2.0?
         ├─ YES → Phase tracking problem (add filter/smoother)
         └─ NO  → Beat detection problem (improve onsets)
```

---

## Real-World Example: Audio to Beats

```python
import librosa
import numpy as np
import mir_eval.beat

def detect_beats(audio_file):
    """Simple beat detection using librosa."""

    # Load audio
    y, sr = librosa.load(audio_file, sr=22050)

    # Compute onset strength (how likely each frame contains onset)
    odf = librosa.onset.onset_strength(y=y, sr=sr)

    # Estimate tempo
    tempo, beats_frame_indices = librosa.beat.beat_track(
        onset_env=odf, sr=sr
    )

    # Convert frame indices to seconds
    beat_times = librosa.frames_to_time(beats_frame_indices, sr=sr)

    return beat_times

# Test
beat_times = detect_beats('song.mp3')
print(f"Detected {len(beat_times)} beats")
print(f"Tempo: ~{np.mean(np.diff(beat_times))**-1 * 60:.1f} BPM")

# Save
np.savetxt('estimated_beats.txt', beat_times, fmt='%.6f')

# Evaluate
reference_beats = mir_eval.io.load_events('reference_beats.txt')
reference_beats = mir_eval.beat.trim_beats(reference_beats)
beat_times = mir_eval.beat.trim_beats(beat_times)

scores = mir_eval.beat.evaluate(reference_beats, beat_times)
print(f"F-Measure: {scores['F-measure']:.4f}")
```

---

## Batch Evaluation on Multiple Files

```python
from pathlib import Path
import mir_eval.beat
import mir_eval.io
import pandas as pd

def evaluate_dataset(reference_dir, estimate_dir):
    """Evaluate beat tracker on entire dataset."""

    results = []

    for ref_file in sorted(Path(reference_dir).glob('*.txt')):
        est_file = Path(estimate_dir) / ref_file.name

        if not est_file.exists():
            continue

        # Load
        ref_beats = mir_eval.io.load_events(str(ref_file))
        est_beats = mir_eval.io.load_events(str(est_file))

        # Trim
        ref_beats = mir_eval.beat.trim_beats(ref_beats)
        est_beats = mir_eval.beat.trim_beats(est_beats)

        # Evaluate
        scores = mir_eval.beat.evaluate(ref_beats, est_beats)

        # Record
        results.append({
            'file': ref_file.stem,
            'F-measure': scores['F-measure'],
            'Cemgil': scores['Cemgil'],
            'Goto': scores['Goto'],
            'Info Gain': scores['Information Gain'],
            'CMLc': scores['CMLc'],
            'CMLt': scores['CMLt'],
        })

    # Create DataFrame
    df = pd.DataFrame(results)

    # Display
    print(df.to_string(index=False))
    print("\nSummary:")
    print(df[['F-measure', 'Cemgil', 'Info Gain']].describe())

    return df

# Usage
df = evaluate_dataset('./reference/', './estimates/')
df.to_csv('results.csv', index=False)
```

---

## Debugging Low Scores

### Check 1: Are Beats Actually Being Detected?

```python
import mir_eval.beat
import mir_eval.io

ref = mir_eval.io.load_events('reference_beats.txt')
est = mir_eval.io.load_events('estimated_beats.txt')

ref = mir_eval.beat.trim_beats(ref)
est = mir_eval.beat.trim_beats(est)

print(f"Reference beats: {len(ref)}")
print(f"Estimated beats: {len(est)}")
print(f"Ratio: {len(est) / len(ref) * 100:.1f}%")

# Expected: ratio ~100% (some tolerance for trimming)
```

### Check 2: Are Tempos Aligned?

```python
import numpy as np

ref = mir_eval.io.load_events('reference_beats.txt')
est = mir_eval.io.load_events('estimated_beats.txt')

# Inter-beat intervals
ref_ibi = np.diff(ref)
est_ibi = np.diff(est)

ref_tempo = 60 / np.median(ref_ibi)
est_tempo = 60 / np.median(est_ibi)

print(f"Reference tempo: {ref_tempo:.1f} BPM")
print(f"Estimated tempo: {est_tempo:.1f} BPM")
print(f"Tempo error: {abs(est_tempo - ref_tempo) / ref_tempo * 100:.1f}%")

# Expected: < 5% tempo error
```

### Check 3: Are Beats Phase-Locked?

```python
import numpy as np
import matplotlib.pyplot as plt

ref = mir_eval.io.load_events('reference_beats.txt')
est = mir_eval.io.load_events('estimated_beats.txt')

# Align to first beat
ref_aligned = ref - ref[0]
est_aligned = est - est[0]

# Compute phase error
phases = []
for e in est_aligned:
    # Find nearest reference beat
    idx = np.searchsorted(ref_aligned, e)
    if idx == 0:
        nearest = ref_aligned[0]
    elif idx == len(ref_aligned):
        nearest = ref_aligned[-1]
    else:
        d1 = abs(ref_aligned[idx-1] - e)
        d2 = abs(ref_aligned[idx] - e)
        nearest = ref_aligned[idx-1] if d1 < d2 else ref_aligned[idx]

    error = e - nearest
    phases.append(error)

phases = np.array(phases)
print(f"Mean phase error: {np.mean(np.abs(phases)):.4f}s")
print(f"Phase std dev: {np.std(phases):.4f}s")

# Plot
plt.hist(phases, bins=30, edgecolor='black')
plt.xlabel('Phase Error (seconds)')
plt.ylabel('Count')
plt.axvline(-0.070, color='r', linestyle='--', label='±70ms window')
plt.axvline(0.070, color='r', linestyle='--')
plt.legend()
plt.title('Beat Tracking Phase Error Distribution')
plt.show()
```

---

## Common Issues and Fixes

| Problem | Symptom | Fix |
|---------|---------|-----|
| Too few beats | F-Measure low, Recall low | Improve onset detection threshold |
| Too many beats | F-Measure low, Precision low | Add beat confirmation/filtering |
| Wrong tempo | Beats spaced incorrectly | Check tempo estimation |
| Phase shifted | Beats consistently ±100ms off | Add phase correction |
| Loses lock on changes | High Goto, low CMLc | Add tempo adaptation |

---

## Next Steps

1. **Read full guide:** `/docs/analysis/MIREX_beat_tracking_evaluation_guide.md`
2. **Submit to MIREX:** https://www.music-ir.org/mirex/
3. **Study baselines:** Look at madmom, Essentia, librosa implementations
4. **Optimize:** Use Information Gain to debug phase issues
