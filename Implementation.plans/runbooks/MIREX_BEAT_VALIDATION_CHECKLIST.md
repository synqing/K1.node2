---
author: Claude Code Agent (Deep Technical Analysis)
date: 2025-10-29
status: in_review
intent: Step-by-step checklist for validating PF-5 Phase 1 beat detection against MIREX standards
---

# MIREX Beat Validation Checklist: PF-5 Phase 1

**Objective**: Validate AudioWorklet beat detection algorithm achieves >85% F-Measure on public datasets.

**Timeline**: Weeks 1-4 of Phase 1 execution

**Success Criteria**:
- ✅ SMC "Easy" subset: F-Measure >0.85
- ✅ SMC "Hard" subset: F-Measure >0.75
- ✅ Combined average: F-Measure >0.80
- ✅ Cemgil >0.85 (precision)
- ✅ Information Gain >3.5 bits (phase consistency)

---

## WEEK 1: ENVIRONMENT SETUP

### Day 1-2: Dependencies

- [ ] **Python Environment** (3.8+)
  ```bash
  python --version  # Verify 3.8+
  pip --version
  ```

- [ ] **Install mir_eval**
  ```bash
  pip install mir_eval librosa numpy scipy matplotlib
  ```

- [ ] **Verify Installation**
  ```python
  import mir_eval.beat
  print(mir_eval.__version__)
  ```

- [ ] **Create Project Directory**
  ```bash
  mkdir -p beats/audio beats/reference beats/estimated beats/results
  ```

### Day 2-3: Dataset Acquisition

- [ ] **Option A: Download SMC Dataset** (Recommended)
  ```bash
  git clone https://github.com/marl/smcdb.git
  # Or download ZIP from GitHub
  ```
  - Contains 217 files with beat annotations
  - 19 "easy" + 198 "hard"
  - Ready to use, no preprocessing needed

- [ ] **Organize Files**
  ```
  beats/
  ├── audio/
  │   ├── easy_001.wav
  │   ├── easy_002.wav
  │   └── hard_001.wav
  ├── reference/
  │   ├── easy_001.txt
  │   ├── easy_002.txt
  │   └── hard_001.txt
  └── results/
      └── (evaluation outputs)
  ```

- [ ] **Verify Audio Files**
  ```python
  import librosa
  y, sr = librosa.load('beats/audio/easy_001.wav')
  print(f"Duration: {len(y)/sr:.1f}s, Sample rate: {sr}Hz")
  ```

- [ ] **Inspect Reference Beat Annotations**
  ```bash
  head -20 beats/reference/easy_001.txt
  # Should show beat times in seconds, one per line
  ```

### Day 4: Test Harness & Single-File Validation

**Scripts provided in repo**: `firmware/K1.node2/beats/` contains ready-to-use evaluation infrastructure.

- [ ] **Review Provided Scripts**
  - [ ] Read `beats/README.md` for full documentation
  - [ ] Read `beats/eval_single.py` (45 lines, fully transparent)
  - [ ] Read `beats/batch_evaluate.py` (60 lines, matches Week 3 plan)

- [ ] **Setup Beats Environment**
  ```bash
  cd firmware/K1.node2/beats
  python -m venv .venv
  source .venv/bin/activate  # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  ```

- [ ] **Test Single File (Learning Phase)**
  ```bash
  # Download 1 easy SMC file as reference
  wget https://github.com/marl/smcdb/raw/master/annotations/beats/easy_001.txt -O reference/easy_001.txt

  # Create dummy estimate (for testing)
  cp reference/easy_001.txt estimates/easy_001.txt

  # Run eval_single.py to see what metrics look like
  python eval_single.py --ref reference/easy_001.txt --est estimates/easy_001.txt
  ```

  Output will show:
  ```
  ref beats: 47 (trim<5.0s removed)
  est beats: 47
  F-measure: 1.000000
  Cemgil: 1.000000
  Information Gain: 5.367948
  ...
  ```

  **What to learn**: This is what perfect metrics look like. Now understand what F-Measure means, what good Cemgil is, etc.

- [ ] **Verify Audio Loading** (if you have audio files)
  ```python
  import librosa
  y, sr = librosa.load('beats/audio/easy_001.wav')
  print(f"Duration: {len(y)/sr:.1f}s, Sample rate: {sr}Hz")
  ```

**Deliverable**: Beats environment working, metrics understood on one file

---

## WEEK 2: ALGORITHM VALIDATION SETUP

### Day 5-7: Integrate AudioWorklet

- [ ] **Export Beat Detection Algorithm**
  - [ ] AudioWorklet outputs beats (from `AudioWorkletProcessor.js`)
  - [ ] Create wrapper function that:
    1. Loads audio file (librosa)
    2. Processes through Web Audio API or equivalent
    3. Returns array of beat times

- [ ] **Create Python Wrapper** (if algorithm is in JS)
  ```python
  # beats/audio_to_beats.py

  import subprocess
  import json

  def detect_beats_js(audio_file):
      """Call Node.js AudioWorklet wrapper"""
      result = subprocess.run([
          'node', 'audioworklet_wrapper.js',
          '--audio', audio_file
      ], capture_output=True, text=True)

      beat_json = json.loads(result.stdout)
      return beat_json['beats']  # Array of beat times
  ```

  OR **Create Direct Python Implementation** (if porting):
  ```python
  import librosa
  import numpy as np

  class BeatDetector:
      def __init__(self):
          self.buffer_size = 1024
          self.hop_length = 512
          self.prev_spectrum = None

      def detect(self, audio_file):
          y, sr = librosa.load(audio_file)

          # Your spectral flux algorithm
          onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
          onset_times = librosa.frames_to_time(onset_frames, sr=sr)

          # Filter to beats (your algorithm)
          beats = self.filter_to_beats(onset_times)

          return beats

      def filter_to_beats(self, onset_times):
          # Implement adaptive thresholding, phase lock, etc.
          # This is where the AudioWorklet logic goes
          pass
  ```

- [ ] **Test Algorithm on Single File**
  ```bash
  python beats/test_beat_detection.py --audio beats/audio/easy_001.wav
  ```

### Day 8: Implement Error Analysis

- [ ] **Create Diagnostics Script** (`beats/analyze_errors.py`)
  ```python
  import numpy as np
  import mir_eval.beat
  import mir_eval.io

  def analyze_errors(ref_file, est_file):
      """Deep error analysis"""
      ref = mir_eval.io.load_events(ref_file)
      est = mir_eval.io.load_events(est_file)

      # Evaluate
      scores = mir_eval.beat.evaluate(ref, est)

      # Error statistics
      errors = []
      for e in est:
          nearest_r = min(ref, key=lambda r: abs(r - e))
          errors.append(e - nearest_r)

      errors = np.array(errors)

      print(f"\n=== {est_file} ===")
      print(f"F-Measure: {scores['F-Measure']:.4f}")
      print(f"Cemgil: {scores['Cemgil']:.4f}")
      print(f"Information Gain: {scores['Information Gain']:.4f} bits")
      print(f"\nError Statistics:")
      print(f"  Mean: {np.mean(np.abs(errors)):.4f}s")
      print(f"  Median: {np.median(np.abs(errors)):.4f}s")
      print(f"  Std Dev: {np.std(errors):.4f}s")
      print(f"  % within ±70ms: {100*np.sum(np.abs(errors)<0.070)/len(errors):.1f}%")

      return scores, errors
  ```

- [ ] **Test Diagnostics**
  ```bash
  python beats/analyze_errors.py beats/reference/easy_001.txt beats/estimated/easy_001.txt
  ```

**Deliverable**: Algorithm integrated, diagnostics working

---

## WEEK 3: BATCH EVALUATION

### Day 9-12: Test on Full SMC Dataset

**Script provided**: `firmware/K1.node2/beats/batch_evaluate.py` handles the evaluation.

- [ ] **Generate Estimates for All 217 SMC Files**
  ```python
  # Pseudocode: your algorithm generates beat estimates
  # You'll write code to:
  # 1. Loop through beats/reference/*.txt files
  # 2. For each track, load audio and run beat detection
  # 3. Write beat times to beats/estimates/{same_filename}.txt

  # Example (if porting AudioWorklet to Python):
  for ref_file in sorted(os.listdir('beats/reference')):
      audio_file = 'beats/audio/' + ref_file.replace('.txt', '.wav')
      beats = your_beat_detector(audio_file)
      np.savetxt(f'beats/estimates/{ref_file}', beats, fmt='%.6f')
  ```

  **Expected output**: 217 .txt files in `beats/estimates/` matching basenames in `beats/reference/`

- [ ] **Run Batch Evaluation (provided script)**
  ```bash
  cd firmware/K1.node2/beats
  python batch_evaluate.py \
    --reference_dir reference \
    --estimate_dir estimates \
    --out_csv results/per_file.csv \
    --out_json results/aggregate.json
  ```

  **Output files**:
  - `results/per_file.csv`: All metrics for all 217 tracks
  - `results/aggregate.json`: Summary (means, stdev, min, max)

  **Console output**:
  ```
  Found 217 matching pairs
  Wrote per_file.csv
  Wrote aggregate.json

  === AGGREGATE SUMMARY ===
  Evaluated 217 files
  F-measure mean: 0.764
  Cemgil mean: 0.802
  ...
  ```

- [ ] **Analyze Results by Difficulty** (Python in Jupyter or script)
  ```python
  import pandas as pd

  df = pd.read_csv('results/per_file.csv')

  # Separate easy vs hard
  df['difficulty'] = df['file'].apply(lambda x: 'easy' if 'easy' in x else 'hard')

  print("=== By Difficulty ===")
  for diff in ['easy', 'hard']:
      subset = df[df['difficulty'] == diff]
      print(f"\n{diff.upper()}:")
      print(f"  F-Measure mean: {subset['F-measure'].mean():.4f}")  # Note: CSV column is 'F-measure' (lowercase)
      print(f"  Cemgil mean: {subset['Cemgil'].mean():.4f}")
      print(f"  IG mean: {subset['Information Gain'].mean():.4f}")
      print(f"  Count: {len(subset)}")
  ```

- [ ] **Identify Problem Tracks**
  ```python
  # Find worst-performing files
  df_sorted = df.sort_values('F-measure')
  print("\nWorst 10 tracks:")
  print(df_sorted[['file', 'F-measure', 'Cemgil', 'Information Gain', 'difficulty']].head(10))
  ```

**Deliverable**: Batch evaluation complete, results analyzed

---

## WEEK 4: REFINEMENT & REPORTING

### Day 13-14: Error Analysis & Debugging

- [ ] **For Each Problem Track, Run Diagnostics**
  ```bash
  python beats/analyze_errors.py \
    beats/reference/hard_042.txt \
    beats/estimated/hard_042.txt
  ```

- [ ] **Classify Failures**
  - [ ] **Tempo doubling** (Information Gain <2.0):
    - Algorithm detects every other beat
    - Fix: Improve tempo estimation

  - [ ] **Poor localization** (F>0.80 but Cemgil<0.75):
    - Beats found but imprecise
    - Fix: Improve phase tracking

  - [ ] **Phase scatter** (High F-Measure but low IG):
    - Beats scattered across beat phases
    - Fix: Add Viterbi smoothing

- [ ] **Implement Fixes**
  ```python
  # Example: Add Viterbi smoothing for phase consistency
  from scipy.signal import lfilter

  def smooth_beats(raw_beats, smoothing=0.8):
      """Smooth beat sequence"""
      inter_beat_intervals = np.diff(raw_beats)
      smoothed_ibi = lfilter([1-smoothing], [1, -smoothing], inter_beat_intervals)
      smoothed_beats = np.cumsum(smoothed_ibi)
      return smoothed_beats
  ```

### Day 15-16: Final Report

- [ ] **Create Results Document**
  ```
  beats/results/MIREX_VALIDATION_REPORT.md

  # PF-5 Phase 1 Beat Detection MIREX Validation

  ## Summary
  - F-Measure (mean): 0.823
  - F-Measure (easy): 0.880
  - F-Measure (hard): 0.764
  - Cemgil (mean): 0.847
  - Information Gain (mean): 3.64 bits

  ## Per-Track Results
  [CSV table]

  ## Analysis
  - [description of strengths]
  - [description of weaknesses]
  - [recommended improvements]

  ## Conclusion
  Algorithm achieves >0.85 on easy subset, >0.75 on hard subset.
  Ready for production deployment.
  ```

- [ ] **Generate Plots**
  ```python
  import matplotlib.pyplot as plt

  df = pd.read_csv('beats/results.csv')

  fig, axes = plt.subplots(2, 2, figsize=(12, 10))

  # F-Measure distribution
  axes[0, 0].hist(df['F-Measure'], bins=20)
  axes[0, 0].set_title('F-Measure Distribution')
  axes[0, 0].axvline(df['F-Measure'].mean(), color='r', linestyle='--')

  # Cemgil distribution
  axes[0, 1].hist(df['Cemgil'], bins=20)
  axes[0, 1].set_title('Cemgil Distribution')

  # Easy vs Hard
  df['difficulty'] = df['file'].apply(lambda x: 'easy' if 'easy' in x else 'hard')
  df.boxplot(column='F-Measure', by='difficulty', ax=axes[1, 0])

  # Scatter: F vs Cemgil
  axes[1, 1].scatter(df['F-Measure'], df['Cemgil'])
  axes[1, 1].set_xlabel('F-Measure')
  axes[1, 1].set_ylabel('Cemgil')

  plt.tight_layout()
  plt.savefig('beats/results/metrics_plots.png', dpi=150)
  ```

- [ ] **Prepare Results for Stakeholders**
  - [ ] Mean F-Measure: _____ (target: >0.80)
  - [ ] Easy subset F: _____ (target: >0.85)
  - [ ] Hard subset F: _____ (target: >0.75)
  - [ ] Mean Cemgil: _____ (target: >0.85)
  - [ ] Mean Information Gain: _____ (target: >3.5 bits)
  - [ ] % within ±70ms tolerance: _____ (target: >85%)

**Deliverable**: Final report ready

---

## SUCCESS CRITERIA CHECKLIST

### Must-Have (MVP)
- [ ] F-Measure >0.80 on combined dataset
- [ ] F-Measure >0.85 on easy subset
- [ ] F-Measure >0.75 on hard subset
- [ ] Results reproducible (code + data checked in)
- [ ] Report generated with plots

### Nice-to-Have
- [ ] Cemgil >0.85 (fine-grained accuracy)
- [ ] Information Gain >3.5 bits (phase consistency)
- [ ] Goto = 1.0 (sustained phase lock)
- [ ] Performance breakdown by genre

### Escalation Criteria
- [ ] If F < 0.70: Halt, debug fundamental issue
- [ ] If F < 0.75 on easy subset: Review algorithm design
- [ ] If Cemgil < 0.75: Improve beat localization precision

---

## FILES TO CHECK IN

```
Implementation.plans/runbooks/
  ├── MIREX_BEAT_VALIDATION_CHECKLIST.md (this file)

docs/analysis/
  ├── MIREX_BEAT_TRACKING_COMPLETE_GUIDE.md

beats/ (testing directory)
  ├── audio/ (SMC audio files)
  ├── reference/ (SMC annotations)
  ├── estimated/ (algorithm outputs)
  ├── results/
  │   ├── results.csv
  │   ├── metrics_plots.png
  │   └── MIREX_VALIDATION_REPORT.md
  ├── test_beat_detection.py
  ├── analyze_errors.py
  └── batch_evaluate.py
```

---

## TIMELINE

| Week | Days | Task | Owner | Deliverable |
|------|------|------|-------|-------------|
| 1 | 1-4 | Setup, get dataset | Audio Eng | Test harness ready |
| 2 | 5-8 | Integrate algorithm | Audio Eng | Algorithm integrated |
| 3 | 9-12 | Batch evaluation | Audio Eng | Results on all 217 files |
| 4 | 13-16 | Refinement + report | Audio Eng | Final validation report |

---

**Status**: READY FOR WEEK 1 KICKOFF
