# Phase 2B Evaluation Workflow

This guide documents environment setup, dataset layout, commands, outputs, and timing instrumentation for Phase 2B beat detection evaluation on GTZAN and Ballroom datasets.

## Environment Setup
- Use Python `3.11` virtualenv: `source .venv311/bin/activate`
- Working directory: `firmware/K1.node2/beats`
- Required Python packages (installed by the repo or system): `librosa`, `soundfile`, `mir-eval` for full runs; validation works without audio deps.

## Dataset Layout
- GTZAN
  - Audio: `data/gtzan/audio/`
  - Reference: `data/gtzan/reference/` (`.txt` beat files)
  - Estimates (output): `data/gtzan/estimates/`
- Ballroom
  - Audio: `data/ballroom/audio/`
  - Reference: `data/ballroom/annotations/` (`.beats` files)
  - Estimates (output): `data/ballroom/estimates/`

## Core Commands
- Validate datasets:
  - `python phase2b_prep.py validate --dataset gtzan --dataset ballroom --summary-json results/dataset_validation.json`
- Full GTZAN run (estimates + metrics):
  - `python phase2b_prep.py run --dataset gtzan --overwrite --allow-unreadable --results-dir results/phase2b_gtzan_full`
- Full Ballroom run:
  - `python phase2b_prep.py run --dataset ballroom --overwrite --results-dir results/phase2b_ballroom_full`
- Parallel workers (auto: cores - 1): add `--workers 8`
- Resume mode (skip existing estimates): add `--resume`
- Per-file progress CSV: add `--log-csv results/<dir>/progress.csv`
- Subset run for smoke test: add `--limit 10`

## Outputs
- `results/phase2b_<dataset>/per_file.csv` — Per-file metrics and counts
- `results/phase2b_<dataset>/aggregate.json` — Aggregate metrics (F/Cemgil/Goto)
- `results/phase2b_<dataset>/run_summary.json` — Run metadata, counts, dataset stats
- Estimates saved under `data/<dataset>/estimates/`

## Timing Instrumentation
- Instrumented stages: validation, beat detection, evaluation, total
- Example logs printed during run:
  - `[timing] Dataset validation: 0.18s`
  - `[timing] Starting beat detection for 1000 files...`
  - `[timing] Beat detection completed: 8.21s`
  - `[timing] Evaluation completed: 2.86s`
  - `[timing] Total runtime: 11.07s`
- Stage timings are written under `run_summary.json → timing`

## Expected Results (Benchmarks)
- GTZAN (1000): F≈0.657, Cemgil≈0.637, Goto≈0.001 (999 processed)
- Ballroom (698): F≈0.702, Cemgil≈0.614, Goto≈0.364 (698 processed)

## Troubleshooting
- `FileNotFoundError` for audio/reference: verify dataset directories exist
- Unreadable audio: use `--allow-unreadable` (GTZAN may have 1 problematic file)
- Missing audio libs: validation works; install `librosa`, `soundfile`, `mir-eval` for `run`
- Slow runs: use `--workers N` and `--resume` to skip existing outputs

## Firmware Bridge (Overview)
- Constraints derived from datasets:
  - Max beat density (p99): ~5.4 beats/sec
  - Recommended ring buffer: 6+ events (53 for 10s history)
  - Latency targets: 50ms target, 100ms max
- See `firmware/K1.node2/beats/FIRMWARE_COMPATIBILITY_SHEET.md` for full constraints.

