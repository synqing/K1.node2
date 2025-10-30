# Phase 2B Workflow Addendum

This addendum extends the Phase 2B workflow with additional datasets, a reproducible dataset manifest, and desk↔device correlation steps.

## Additional Datasets

- Harmonix Set
  - Audio: `datasets/harmonix/audio/` (MP3/WAV after staging)
  - Annotations: `firmware/K1.node2/beats/data/harmonix/annotations/` (beat/downbeat extracted from JAMS)
  - Staging: Use the verified download script referenced in `firmware/K1.node2/beats/data/HARMONIX_DATASET_SETUP.md` or your local `Implementation.plans/harmonixset-main` folder to populate audio, then run:
    - `python3 tools/build_datasets_manifest.py --root datasets --out datasets/datasets.json`
  - Evaluation: same commands as GTZAN/Ballroom using `phase2b_prep.py` once audio + annotations are in place

- GiantSteps Tempo
  - Audio: `datasets/giantsteps_tempo/audio/` (WAV, 44.1kHz/16-bit after conversion)
  - Annotations: `datasets/giantsteps_tempo/annotations/` (tempo/beat metadata)
  - Staging: follow `GIANTSTEPS_QUICK_REFERENCE.md` and `GIANTSTEPS_STATUS_REPORT.md` for download and conversion; then run:
    - `python3 tools/build_datasets_manifest.py --root datasets --out datasets/datasets.json`
  - Evaluation: once added to `phase2b_prep.py` dataset options, run like GTZAN/Ballroom

## Dataset Manifest (Reproducibility)

- File: `datasets/datasets.json` records dataset name, root, counts, hashes, and source commands.
- Generate/update via:
  - `python3 tools/build_datasets_manifest.py --root datasets --out datasets/datasets.json`
- Purpose:
  - Locks dataset contents across runs
  - Enables CI to verify dataset integrity before evaluation

## Desk ↔ Device Correlation

- Transport layer: firmware drains beat events over USB Serial at runtime.
- Device metrics capture:
  - `python3 tools/beat_event_drain.py --serial-port /dev/cu.SLAB_USBtoUART --baud 115200 --duration 30 --out artifacts/Phase2B/<timestamp>/device_metrics.json`
- Linker script merges desktop `aggregate.json` with device metrics:
  - `python3 scripts/phase2b_link.py --desktop-json results/phase2b_gtzan_full/aggregate.json --device-json artifacts/Phase2B/<timestamp>/device_metrics.json --out artifacts/Phase2B/<timestamp>/run_summary.json`
- Archive under `artifacts/Phase2B/<timestamp>/` for diffable history.

