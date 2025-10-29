---
author: Claude Code Agent (Audio Feature Specialist)
date: 2025-10-29
status: published
intent: Comprehensive guide to pre-computed Harmonix mel-spectrograms for ML-based beat detection
---

# Harmonix Mel-Spectrogram Dataset

## Overview

**Pre-computed mel-spectrograms for all 912 Harmonix Set tracks**, ready for machine learning-based beat detection and tempo tracking.

- **Tracks**: 912 pop/electronic songs
- **Format**: NumPy binary (`.npy` files)
- **Feature**: Log-scaled mel-spectrograms (frequency domain)
- **Size**: 1.8 GB total (≈2 MB per track average)
- **Location**: `/Implementation.plans/Harmonix_melspecs/`
- **Status**: ✅ Ready for model training and feature engineering

---

## Dataset Inventory

### File Structure

```
Implementation.plans/Harmonix_melspecs/
├── LICENSE                           (Creative Commons Attribution 4.0)
├── melspecs/
│   ├── 0001_12step-mel.npy          (913 .npy files)
│   ├── 0003_6foot7foot-mel.npy
│   ├── 0004_abc-mel.npy
│   ├── ...
│   ├── 0343_banjo-mel.npy
│   └── 1001_yourloveismydrugdave-mel.npy
│
└── [1.8 GB total, 913 files]
```

### Track Naming Convention

Mel-spectrograms are named to match Harmonix beat annotations:

```
Mel-spectrogram file:     0042_cagetheelephant-mel.npy
Corresponding beats:      0042_cagetheelephant.txt (in firmware/K1.node2/beats/data/harmonix/reference/)
Corresponding audio:      /Implementation.plans/harmonixset-main/dataset/audio/0042_cagetheelephant.mp3
```

---

## Understanding Mel-Spectrograms

### What is a Mel-Spectrogram?

A **mel-spectrogram** is a time-frequency representation of audio that mimics human hearing:

1. **Fourier transform** breaks audio into frequency components over time
2. **Mel-scale** warps frequencies to match perceptual spacing (humans hear lower frequencies with higher resolution)
3. **Log-scaling** applies logarithmic compression (matches human loudness perception)

**Result**: A 2D array `[n_mels, n_frames]` where:
- **Rows** = frequency bins (typically 128 or 256 mel-bands)
- **Columns** = time frames (typically 512 frames/second at 22.05 kHz)
- **Values** = log-amplitude at each time-frequency bin

### Why Use Mel-Spectrograms for Beat Tracking?

- ✅ **Perceptually relevant** - frequencies weighted by human hearing
- ✅ **Onset information** - rapid amplitude changes indicate beat/note onsets
- ✅ **Temporal structure** - reveals repeating patterns (bars, phrases)
- ✅ **Model-friendly** - 2D structure suits CNNs and RNNs
- ✅ **Pre-computed** - saves processing time during training/inference

---

## File Format Details

### NumPy Array Structure

Each `.npy` file contains a 2D NumPy array:

```python
import numpy as np

# Load a mel-spectrogram
melspec = np.load('0042_cagetheelephant-mel.npy')

# Shape
print(melspec.shape)  # Example: (128, 1234) = 128 mel-bands, 1234 frames

# Data type
print(melspec.dtype)  # float32 (32-bit floating point)

# Value range
print(melspec.min(), melspec.max())  # Typically [-80, 0] (log dB scale)
```

### Array Dimensions

| Dimension | Meaning | Typical Values | Notes |
|-----------|---------|----------------|-------|
| **n_mels** (rows) | Frequency bins | 128 or 256 | Mel-scaled frequency bands |
| **n_frames** (cols) | Time frames | 600–3000 | Depends on song length |
| **hop_length** | Frame spacing | 512 samples | At 22.05 kHz ≈ 23 ms per frame |
| **sr** (sample rate) | Audio rate | 22050 Hz | Standard for beat tracking |

**Time calculation:**
```
Duration (seconds) = n_frames * hop_length / sample_rate
Example: 1234 frames * 512 / 22050 = ~28.6 seconds
```

---

## Loading Mel-Spectrograms

### Quick Load Example

```python
import numpy as np

# Load single melspec
melspec = np.load('Implementation.plans/Harmonix_melspecs/melspecs/0042_cagetheelephant-mel.npy')
print(f"Shape: {melspec.shape}")  # (128, time_frames)

# Visualize
import matplotlib.pyplot as plt
plt.figure(figsize=(12, 4))
plt.imshow(melspec, aspect='auto', origin='lower', cmap='magma')
plt.colorbar(label='Log Amplitude (dB)')
plt.xlabel('Time Frame')
plt.ylabel('Mel Frequency Band')
plt.title('Mel-Spectrogram: 0042_cagetheelephant')
plt.show()
```

### Batch Loading Example

```python
import numpy as np
from pathlib import Path

melspecs_dir = Path('Implementation.plans/Harmonix_melspecs/melspecs')
melspecs = {}

for melspec_file in sorted(melspecs_dir.glob('*.npy')):
    track_id = melspec_file.stem.replace('-mel', '')
    melspecs[track_id] = np.load(melspec_file)

print(f"Loaded {len(melspecs)} mel-spectrograms")
print(f"Sample shape: {list(melspecs.values())[0].shape}")
```

---

## Integration with Beat Tracking

### Week 2: ML-Based Beat Detector Implementation

Use mel-spectrograms to train a beat tracking model:

```python
import numpy as np
from pathlib import Path

# Load melspecs
melspecs_dir = Path('Implementation.plans/Harmonix_melspecs/melspecs')
beats_dir = Path('firmware/K1.node2/beats/data/harmonix/reference')

# Map track_id → (melspec, beat_times)
training_data = {}
for melspec_file in sorted(melspecs_dir.glob('*.npy')):
    track_id = melspec_file.stem.replace('-mel', '')
    beats_file = beats_dir / f'{track_id}.txt'

    if beats_file.exists():
        melspec = np.load(melspec_file)
        beat_times = np.loadtxt(beats_file)
        training_data[track_id] = (melspec, beat_times)

print(f"Training data: {len(training_data)} tracks")

# Example: first track
track_id = list(training_data.keys())[0]
melspec, beats = training_data[track_id]
print(f"Track {track_id}: melspec shape {melspec.shape}, {len(beats)} beats")
```

### Week 3: Evaluation with Features

Generate beat estimates using melspecs, then validate:

```python
# Your beat detector takes melspec as input
def predict_beats(melspec):
    """Your ML model or algorithm."""
    # Returns: beat_times (array of float seconds)
    pass

# Evaluate
for track_id, (melspec, ref_beats) in training_data.items():
    est_beats = predict_beats(melspec)

    # Write estimates
    est_file = Path('firmware/K1.node2/beats/data/harmonix/estimates') / f'{track_id}.txt'
    np.savetxt(est_file, est_beats)

# Run batch evaluation
# python firmware/K1.node2/beats/batch_evaluate.py \
#   --reference_dir firmware/K1.node2/beats/data/harmonix/reference \
#   --estimate_dir firmware/K1.node2/beats/data/harmonix/estimates \
#   --out_csv results/harmonix_ml_validation.csv \
#   --out_json results/harmonix_ml_validation.json
```

---

## Feature Engineering Examples

### Example 1: Onset Detection (Onset Strength)

```python
import numpy as np

def compute_onset_strength(melspec, axis=0):
    """
    Compute frame-wise onset strength from mel-spectrogram.

    Args:
        melspec: (n_mels, n_frames) log-scaled mel-spectrogram
        axis: 0 = across frequency, 1 = across time

    Returns:
        onset_strength: (n_frames,) onset strength per frame
    """
    # Spectral flux: L2 norm of frame-to-frame difference
    diff = np.diff(melspec, axis=axis)
    onset_strength = np.sqrt(np.sum(diff**2, axis=axis))

    # Zero-pad to match original length
    return np.concatenate([[0], onset_strength])

# Usage
melspec = np.load('0042_cagetheelephant-mel.npy')
onset_strength = compute_onset_strength(melspec, axis=0)
print(f"Onset strength shape: {onset_strength.shape}")
```

### Example 2: Tempogram (Tempo-Domain Features)

```python
import numpy as np

def compute_tempogram(melspec, sr=22050, hop_length=512, min_bpm=60, max_bpm=240):
    """
    Compute tempogram (beat strength at each tempo).

    Args:
        melspec: (n_mels, n_frames) mel-spectrogram
        sr: sample rate
        hop_length: samples per frame
        min_bpm, max_bpm: tempo range to analyze

    Returns:
        tempogram: (n_tempi, n_frames) tempo-domain representation
    """
    # Compute onset strength across frequency
    onset = np.sum(melspec, axis=0)

    # Define tempo range (in frames per beat)
    frame_time = hop_length / sr
    tempi = np.arange(min_bpm, max_bpm + 1)
    frames_per_beat = tempi / 60.0 / frame_time  # [frames/beat]

    # Compute autocorrelation at each tempo
    tempogram = np.zeros((len(tempi), len(onset)))
    for i, fpb in enumerate(frames_per_beat):
        lag = int(np.round(fpb))
        if lag < len(onset):
            tempogram[i, :] = np.correlate(onset, onset[::lag], mode='same')

    return tempogram

# Usage
melspec = np.load('0042_cagetheelephant-mel.npy')
tempogram = compute_tempogram(melspec)
print(f"Tempogram shape: {tempogram.shape}")
```

### Example 3: Energy Flux (Loudness Change)

```python
import numpy as np

def compute_energy_flux(melspec):
    """Measure loudness changes (spectral energy derivative)."""
    # Sum across frequency (total energy per frame)
    energy = np.sum(melspec, axis=0)

    # Derivative (energy change)
    flux = np.diff(energy)

    # Normalize
    flux = np.concatenate([[0], flux])
    flux = (flux - flux.mean()) / (flux.std() + 1e-8)

    return flux

# Usage
melspec = np.load('0042_cagetheelephant-mel.npy')
energy_flux = compute_energy_flux(melspec)
print(f"Energy flux shape: {energy_flux.shape}")
```

---

## Practical Workflow: Manual-First ML Approach

### Week 1: Understand Features (Manual Learning)

Load melspecs, visualize them, understand what they contain:

```python
import numpy as np
import matplotlib.pyplot as plt

melspec = np.load('Implementation.plans/Harmonix_melspecs/melspecs/0042_cagetheelephant-mel.npy')

# What does the data look like?
fig, axes = plt.subplots(3, 1, figsize=(12, 10))

# Full melspec
axes[0].imshow(melspec, aspect='auto', origin='lower', cmap='magma')
axes[0].set_title('Full Mel-Spectrogram')
axes[0].set_ylabel('Mel Frequency Band')

# Total energy over time
energy = np.sum(melspec, axis=0)
axes[1].plot(energy)
axes[1].set_title('Total Energy (Sum Across Frequencies)')
axes[1].set_ylabel('Log Amplitude')

# Spectral flux (onset indicator)
flux = np.sqrt(np.sum(np.diff(melspec, axis=1)**2, axis=0))
axes[2].plot(flux)
axes[2].set_title('Spectral Flux (Onset Indicator)')
axes[2].set_ylabel('Flux Magnitude')
axes[2].set_xlabel('Frame')

plt.tight_layout()
plt.show()
```

### Week 2: Implement Simple Beat Detector

Use melspec features to detect beats:

```python
import numpy as np
from scipy.signal import find_peaks

def simple_beat_detector(melspec, sr=22050, hop_length=512, threshold=0.5):
    """
    Simple beat detector based on spectral flux peaks.

    Not state-of-the-art, but transparent and interpretable.
    """
    # Compute onset strength
    flux = np.sqrt(np.sum(np.diff(melspec, axis=1)**2, axis=0))

    # Normalize
    flux = (flux - flux.mean()) / (flux.std() + 1e-8)

    # Find peaks (beat onsets)
    peaks, _ = find_peaks(flux, height=threshold)

    # Convert frame indices to seconds
    beat_times = peaks * hop_length / sr

    return beat_times

# Usage
melspec = np.load('Implementation.plans/Harmonix_melspecs/melspecs/0042_cagetheelephant-mel.npy')
beats = simple_beat_detector(melspec)
print(f"Detected {len(beats)} beats")
```

### Week 3-4: Batch Validate & Analyze

Evaluate your detector across all 912 tracks and analyze performance.

---

## Troubleshooting

### "FileNotFoundError: 0042_cagetheelephant-mel.npy not found"

**Check 1**: Verify file exists
```bash
ls Implementation.plans/Harmonix_melspecs/melspecs/ | grep 0042
```

**Check 2**: List all available tracks
```bash
ls Implementation.plans/Harmonix_melspecs/melspecs/ | wc -l  # Should be 913
```

**Check 3**: Match track names with beat annotations
```bash
# Beat file name
ls firmware/K1.node2/beats/data/harmonix/reference/0042*.txt

# Melspec file name
ls Implementation.plans/Harmonix_melspecs/melspecs/0042*-mel.npy
```

### "Shape mismatch" when pairing with beat times

Mel-spectrograms have variable lengths (depends on song duration). Always handle variable-length inputs:

```python
import numpy as np

melspec = np.load('0042_cagetheelephant-mel.npy')
beats = np.loadtxt('firmware/K1.node2/beats/data/harmonix/reference/0042_cagetheelephant.txt')

print(f"Melspec shape: {melspec.shape}")  # (128, variable_frames)
print(f"Beat count: {len(beats)}")  # Variable

# Don't assume fixed length - use actual shape
n_frames = melspec.shape[1]
frame_time = 512 / 22050  # hop_length / sample_rate
max_time = n_frames * frame_time

print(f"Max time from melspec: {max_time:.1f} seconds")
print(f"Max beat time: {beats.max():.1f} seconds")
```

### "Memory error" when loading all 913 melspecs at once

Load in batches or on-demand:

```python
# ❌ Don't do this (loads all 1.8 GB at once)
melspecs = {f.stem: np.load(f) for f in melspecs_dir.glob('*.npy')}

# ✅ Do this instead (load as needed)
def load_melspec(track_id):
    path = f'Implementation.plans/Harmonix_melspecs/melspecs/{track_id}-mel.npy'
    return np.load(path)

# Or batch load (e.g., 50 at a time)
batch_size = 50
for i in range(0, 913, batch_size):
    batch = [load_melspec(track_id) for track_id in track_ids[i:i+batch_size]]
    # Process batch...
```

---

## Citation & License

### Creative Commons License
```
Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/

You are free to:
- Share — copy and redistribute the material
- Adapt — remix, transform, and build upon the material

Under the condition of:
- Attribution — give appropriate credit to the original authors
```

### Citation (if publishing work using these mel-spectrograms)

```bibtex
@inproceedings{HarmonixSet,
  title={The Harmonix Set: Beats, Downbeats, and Functional Segment Annotations for Pop Music},
  author={Srinivasamurthy, Ajay and Holzapfel, André and Pesek, Matija},
  booktitle={Proceedings of the International Society for Music Information Retrieval Conference (ISMIR)},
  year={2014}
}
```

---

## Integration Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Mel-spectrograms** | ✅ | 913 pre-computed `.npy` files in Implementation.plans/ |
| **Documentation** | ✅ | Complete feature explanation and use cases |
| **Loader utilities** | ✅ | See `melspecs_loader.py` in firmware/K1.node2/beats/ |
| **Integration examples** | ✅ | Feature engineering & beat detection code samples |
| **Manual-first approach** | ✅ | Week 1-4 workflow with transparent feature engineering |

---

## Next Steps

1. **Week 1**: Explore melspecs with visualization scripts
2. **Week 2**: Implement beat detector using mel-spectrogram features
3. **Week 3**: Evaluate your detector against Harmonix reference beats
4. **Week 4**: Analyze results, identify improvement areas

**See also:**
- `HARMONIX_DATASET_SETUP.md` — Beat annotations guide
- `GTZAN_DATASET_SETUP.md` — Alternative dataset with 1000 tracks
- `README.md` — Overall beats infrastructure overview
- `melspecs_loader.py` — Utility script for loading mel-spectrograms

---

**Status**: ✅ Ready for Week 2 ML-based beat tracking implementation

For questions on feature engineering or model integration, refer to usage examples above or create custom feature extraction code following the manual-first philosophy.
