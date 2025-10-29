---
author: Claude Code Agent
date: 2025-10-29
status: published
intent: Document complete GTZAN dataset integration (audio + annotations)
---

# GTZAN Dataset Integration Complete ✅

## What's Ready

**Location**: `firmware/K1.node2/beats/data/gtzan/`

```
data/gtzan/
├── audio/                          [1000 WAV files, 2.1 GB]
│   ├── blues/ (100 files)
│   ├── classical/ (100 files)
│   ├── country/ (100 files)
│   ├── disco/ (100 files)
│   ├── hiphop/ (100 files)
│   ├── jazz/ (100 files)
│   ├── metal/ (100 files)
│   ├── pop/ (100 files)
│   ├── reggae/ (100 files)
│   └── rock/ (100 files)
│
└── reference/                      [1000 TXT files, 15 MB]
    ├── blues.00000.wav.txt
    ├── blues.00001.wav.txt
    ├── ...
    ├── rock.00099.wav.txt
    └── [1000 beat annotation files]
```

## Ready to Use

### Week 1: Single-File Learning
```bash
cd firmware/K1.node2/beats
python eval_single.py \
  --ref data/gtzan/reference/blues.00000.wav.txt \
  --est data/gtzan/reference/blues.00000.wav.txt
```

### Week 3: Batch Evaluation
```bash
cd firmware/K1.node2/beats

# Copy reference as test estimates
cp -r data/gtzan/reference data/gtzan/estimates

python batch_evaluate.py \
  --reference_dir data/gtzan/reference \
  --estimate_dir data/gtzan/estimates \
  --out_csv results/gtzan_validation.csv \
  --out_json results/gtzan_validation.json
```

## Implementation Timeline

- **Week 1**: Use eval_single.py to understand metrics
- **Week 2**: Implement beat detection algorithm (target audio files)
- **Week 3**: Run batch_evaluate.py on your algorithm's outputs
- **Week 4**: Analyze results by genre, refine algorithm

## Files

- **Audio**: 1000 WAV files (~30 seconds each)
  - Source: `Implementation.plans/Beattracking.dataset/genres_original/`
  - Format: WAV, 44.1 kHz
  - Genres: 100 files per genre

- **Annotations**: 1000 text files (beat times in seconds)
  - Source: GTZAN-Rhythm v2 (extracted from JAMS)
  - Format: One float per line (beat time in seconds)
  - Standard: MIREX-compliant

## Total Dataset Size

- Audio: 2.1 GB
- Annotations: 15 MB
- **Total: ~2.1 GB**

## Status

✅ Audio files accessible via symlink
✅ Beat annotations extracted and ready
✅ Scripts (eval_single.py, batch_evaluate.py) verified
✅ Infrastructure tested
✅ **READY FOR TEAM VALIDATION**

---

For usage details, see `README.md` and `data/GTZAN_DATASET_SETUP.md`.
