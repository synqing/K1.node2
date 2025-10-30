#!/usr/bin/env python3
"""
Phase 2B dataset preparation utilities.

Provides two primary capabilities:
1. Dataset validation (file counts, annotations, audio format sanity checks)
2. Batch beat detection + evaluation against ground-truth annotations

Usage examples:
    # Validate GTZAN and Ballroom datasets
    python phase2b_prep.py validate --dataset gtzan --dataset ballroom

    # Run beat detection + evaluation on GTZAN (estimates + metrics in results/phase2b_gtzan)
    python phase2b_prep.py run --dataset gtzan
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Sequence
from concurrent.futures import ProcessPoolExecutor, as_completed
import os
import csv
import time

# NOTE: Audio/evaluation deps are intentionally NOT imported at module load.
# We lazy-import them inside runtime paths so that `validate` works without
# optional audio libraries present.


def _default_reference_name(audio_path: Path) -> str:
    return f"{audio_path.name}.txt"


@dataclass(frozen=True)
class DatasetConfig:
    """Static configuration for a dataset."""

    name: str
    description: str
    audio_dir: Optional[Path]
    reference_dir: Optional[Path]
    estimate_dir: Optional[Path]
    audio_extensions: Sequence[str] = (".wav", ".mp3")
    reference_extensions: Sequence[str] = (".txt",)
    build_reference_name: Callable[[Path], str] = _default_reference_name

    def reference_path_for(self, audio_path: Path) -> Path:
        if self.reference_dir is None:
            raise ValueError(f"Dataset {self.name} does not define reference_dir")
        return self.reference_dir / self.build_reference_name(audio_path)

    def estimate_path_for(
        self, audio_path: Path, override_dir: Optional[Path] = None
    ) -> Path:
        target_root = override_dir or self.estimate_dir
        if target_root is None:
            raise ValueError(f"Dataset {self.name} does not define estimate_dir")
        return target_root / self.build_reference_name(audio_path)


DATASETS: Dict[str, DatasetConfig] = {
    "gtzan": DatasetConfig(
        name="gtzan",
        description="GTZAN-Rhythm v2 (1000 two-second clips, 10 genres)",
        audio_dir=Path("data/gtzan/audio"),
        reference_dir=Path("data/gtzan/reference"),
        estimate_dir=Path("data/gtzan/estimates"),
        audio_extensions=(".wav",),
        reference_extensions=(".txt",),
        build_reference_name=lambda audio: f"{audio.name}.txt",
    ),
    "ballroom": DatasetConfig(
        name="ballroom",
        description="Ballroom dataset (698 tracks, dance genres)",
        audio_dir=Path("data/ballroom/audio"),
        reference_dir=Path("data/ballroom/annotations"),
        estimate_dir=Path("data/ballroom/estimates"),
        audio_extensions=(".wav",),
        reference_extensions=(".beats",),
        build_reference_name=lambda audio: f"{audio.stem}.beats",
    ),
}


@dataclass
class DatasetReport:
    dataset: str
    audio_files: List[Path]
    reference_files: List[Path]
    missing_references: List[str]
    orphan_references: List[str]
    unreadable_audio: List[str]
    sample_rates: Counter
    channels: Counter
    durations: List[float]

    def to_summary(self) -> Dict:
        """Produce JSON-serialisable summary."""
        duration_stats = {}
        if self.durations:
            total = sum(self.durations)
            duration_stats = {
                "count": len(self.durations),
                "min_seconds": min(self.durations),
                "max_seconds": max(self.durations),
                "mean_seconds": total / len(self.durations),
                "total_hours": total / 3600.0,
            }

        def _preview(items: Sequence[str], limit: int = 10) -> Dict:
            return {
                "count": len(items),
                "examples": items[:limit],
            }

        return {
            "dataset": self.dataset,
            "audio_count": len(self.audio_files),
            "reference_count": len(self.reference_files),
            "missing_references": _preview(self.missing_references),
            "orphan_references": _preview(self.orphan_references),
            "unreadable_audio": _preview(self.unreadable_audio),
            "sample_rates": dict(self.sample_rates),
            "channels": dict(self.channels),
            "duration_stats": duration_stats,
        }


def _collect_audio_files(cfg: DatasetConfig) -> List[Path]:
    if cfg.audio_dir is None:
        return []
    if not cfg.audio_dir.exists():
        raise FileNotFoundError(f"Audio directory not found: {cfg.audio_dir}")

    exts = tuple(ext.lower() for ext in cfg.audio_extensions)
    files = [
        path
        for path in cfg.audio_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in exts
    ]
    return sorted(files)


def _collect_reference_files(cfg: DatasetConfig) -> List[Path]:
    if cfg.reference_dir is None:
        return []
    if not cfg.reference_dir.exists():
        raise FileNotFoundError(f"Reference directory not found: {cfg.reference_dir}")

    exts = tuple(ext.lower() for ext in cfg.reference_extensions)
    files = [
        path
        for path in cfg.reference_dir.iterdir()
        if path.is_file() and path.suffix.lower() in exts
    ]
    return sorted(files)


def validate_dataset(cfg: DatasetConfig) -> DatasetReport:
    # Lazy import: if soundfile is unavailable, skip audio metadata collection
    try:
        import soundfile as sf  # type: ignore
    except Exception:  # noqa: BLE001
        sf = None  # type: ignore
    # Prepare stdlib WAV fallback without introducing module-level deps
    wav_reader = None
    try:
        import wave  # type: ignore
        import contextlib  # type: ignore
        wav_reader = (wave, contextlib)
    except Exception:
        wav_reader = None

    audio_files = _collect_audio_files(cfg)
    reference_files = _collect_reference_files(cfg)

    reference_names = {path.name for path in reference_files}

    missing = []
    unreadable = []
    sample_rates: Counter = Counter()
    channels: Counter = Counter()
    durations: List[float] = []

    for audio_path in audio_files:
        expected_name = cfg.build_reference_name(audio_path)
        if expected_name not in reference_names:
            missing.append(expected_name)
        # Collect audio metadata via soundfile when available
        if sf is not None:
            try:
                info = sf.info(audio_path)
            except RuntimeError as exc:
                unreadable.append(f"{audio_path} ({exc})")
                continue
            sample_rates[info.samplerate] += 1
            channels[info.channels] += 1
            durations.append(float(info.duration))
        # Fallback for WAV files using stdlib wave if soundfile is missing
        elif wav_reader is not None and audio_path.suffix.lower() == ".wav":
            wave, contextlib = wav_reader
            try:
                with contextlib.closing(wave.open(str(audio_path), "rb")) as wf:
                    fr = int(wf.getframerate())
                    ch = int(wf.getnchannels())
                    frames = int(wf.getnframes())
                    duration = (frames / fr) if fr > 0 else 0.0
                    sample_rates[fr] += 1
                    channels[ch] += 1
                    durations.append(float(duration))
            except Exception as exc:  # noqa: BLE001
                unreadable.append(f"{audio_path} ({exc})")

    expected_from_audio = {cfg.build_reference_name(path) for path in audio_files}
    orphan_references = sorted(reference_names - expected_from_audio)

    return DatasetReport(
        dataset=cfg.name,
        audio_files=audio_files,
        reference_files=reference_files,
        missing_references=sorted(missing),
        orphan_references=orphan_references,
        unreadable_audio=sorted(unreadable),
        sample_rates=sample_rates,
        channels=channels,
        durations=durations,
    )


def _save_beats(beat_times: Iterable[float], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as handle:
        for beat in beat_times:
            handle.write(f"{float(beat):.6f}\n")

def _process_audio_file(audio_path_str: str, estimate_path_str: str, skip_existing: bool) -> Dict:
    """Worker function to detect beats and save estimates for a single file."""
    audio_path = Path(audio_path_str)
    estimate_path = Path(estimate_path_str)

    if skip_existing and estimate_path.exists():
        return {"name": estimate_path.name, "status": "skipped"}

    try:
        # Lazy import inside worker to avoid module-level dependency
        from beat_detector import BeatDetector  # type: ignore
        detector = BeatDetector()
        result = detector.detect_beats(str(audio_path))
        beats = result["beats"]
        _save_beats(beats, estimate_path)
        return {
            "name": estimate_path.name,
            "status": "processed",
            "beats_count": len(beats),
        }
    except Exception as exc:  # noqa: BLE001
        return {"name": estimate_path.name, "status": "failed", "error": str(exc)}


def run_dataset(
    cfg: DatasetConfig,
    *,
    estimate_dir: Optional[Path],
    results_dir: Path,
    limit: Optional[int],
    skip_existing: bool,
    allow_unreadable: bool = False,
    workers: int = 1,
    log_csv: Optional[Path] = None,
) -> Dict:
    # Timing instrumentation
    stage_times = {}
    total_start = time.time()
    
    # Stage 1: Dataset validation
    validation_start = time.time()
    report = validate_dataset(cfg)
    stage_times["validation"] = time.time() - validation_start
    print(f"[timing] Dataset validation: {stage_times['validation']:.2f}s")

    if report.missing_references:
        raise RuntimeError(
            f"Dataset {cfg.name} is missing {len(report.missing_references)} references."
        )
    if report.unreadable_audio:
        if allow_unreadable:
            print(
                f"[warn] {cfg.name}: {len(report.unreadable_audio)} unreadable audio files present (skipping)."
            )
        else:
            raise RuntimeError(
                f"Dataset {cfg.name} has unreadable audio files: {report.unreadable_audio[:3]}"
            )

    target_estimate_dir = estimate_dir or cfg.estimate_dir
    if target_estimate_dir is None:
        raise ValueError(f"Dataset {cfg.name} does not define estimate_dir")

    target_estimate_dir.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)

    audio_files = report.audio_files[: limit or None]

    processed = 0
    skipped = 0
    failures: List[str] = []

    total = len(audio_files)
    log_rows: List[Dict[str, str]] = []
    
    # Stage 2: Beat detection
    detection_start = time.time()
    print(f"[timing] Starting beat detection for {total} files...")

    if workers and workers > 1:
        print(f"Using parallel processing with {workers} workers")
        tasks = []
        for audio_path in audio_files:
            estimate_path = cfg.estimate_path_for(audio_path, override_dir=target_estimate_dir)
            tasks.append((str(audio_path), str(estimate_path)))

        with ProcessPoolExecutor(max_workers=workers) as executor:
            future_to_task = {
                executor.submit(_process_audio_file, ap, ep, skip_existing): (ap, ep)
                for ap, ep in tasks
            }
            idx = 0
            for future in as_completed(future_to_task):
                idx += 1
                ap, ep = future_to_task[future]
                print(f"[{idx}/{total}] Processing {Path(ap).name}")
                try:
                    result = future.result()
                except Exception as exc:  # safety net
                    failures.append(f"{ap} ({exc})")
                    print(f"      !! failed: {exc}")
                    log_rows.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "audio": Path(ap).name,
                        "estimate": Path(ep).name,
                        "status": "failed",
                        "beats_count": "",
                        "error": str(exc),
                    })
                    continue

                status = result.get("status")
                if status == "skipped":
                    skipped += 1
                    print(f"[skip] {Path(ep).name} already exists")
                    log_rows.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "audio": Path(ap).name,
                        "estimate": Path(ep).name,
                        "status": "skipped",
                        "beats_count": "",
                        "error": "",
                    })
                elif status == "processed":
                    processed += 1
                    print(
                        f"      -> saved {result.get('beats_count', 0)} beats to {ep}"
                    )
                    log_rows.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "audio": Path(ap).name,
                        "estimate": Path(ep).name,
                        "status": "processed",
                        "beats_count": str(result.get("beats_count", 0)),
                        "error": "",
                    })
                else:
                    failures.append(f"{ap} ({result.get('error','unknown error')})")
                    print(f"      !! failed: {result.get('error','unknown error')}")
                    log_rows.append({
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "audio": Path(ap).name,
                        "estimate": Path(ep).name,
                        "status": "failed",
                        "beats_count": "",
                        "error": result.get("error", "unknown error"),
                    })
    else:
        # Serial processing
        for index, audio_path in enumerate(audio_files, start=1):
            estimate_path = cfg.estimate_path_for(audio_path, override_dir=target_estimate_dir)
            if skip_existing and estimate_path.exists():
                skipped += 1
                print(f"[skip] {estimate_path.name} already exists")
                log_rows.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "audio": audio_path.name,
                    "estimate": estimate_path.name,
                    "status": "skipped",
                    "beats_count": "",
                    "error": "",
                })
                continue

            print(f"[{index}/{total}] Processing {audio_path.name}")
            try:
                # Lazy import here so `validate` can run without audio libs
                from beat_detector import BeatDetector  # type: ignore
                detector = BeatDetector()
                result = detector.detect_beats(str(audio_path))
                beats = result["beats"]
                _save_beats(beats, estimate_path)
                processed += 1
                print(f"      -> saved {len(beats)} beats to {estimate_path}")
                log_rows.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "audio": audio_path.name,
                    "estimate": estimate_path.name,
                    "status": "processed",
                    "beats_count": str(len(beats)),
                    "error": "",
                })
            except Exception as exc:  # noqa: BLE001
                failures.append(f"{audio_path} ({exc})")
                print(f"      !! failed: {exc}")
                log_rows.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "audio": audio_path.name,
                    "estimate": estimate_path.name,
                    "status": "failed",
                    "beats_count": "",
                    "error": str(exc),
                })

    # End beat detection timing
    stage_times["beat_detection"] = time.time() - detection_start
    print(f"[timing] Beat detection completed: {stage_times['beat_detection']:.2f}s")
    
    # Stage 3: Evaluation
    evaluation_start = time.time()
    print(f"[timing] Starting evaluation...")
    
    # Lazy import evaluation utilities at runtime
    from batch_evaluate import run_batch_evaluation  # type: ignore
    evaluation = run_batch_evaluation(
        cfg.reference_dir,
        target_estimate_dir,
        results_dir / "per_file.csv",
        results_dir / "aggregate.json",
        log=print,
        warn_log=lambda message: print(message),
    )
    
    stage_times["evaluation"] = time.time() - evaluation_start
    stage_times["total"] = time.time() - total_start
    print(f"[timing] Evaluation completed: {stage_times['evaluation']:.2f}s")
    print(f"[timing] Total runtime: {stage_times['total']:.2f}s")

    # Optional CSV progress log
    if log_csv:
        log_csv.parent.mkdir(parents=True, exist_ok=True)
        with log_csv.open("w", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "timestamp",
                    "audio",
                    "estimate",
                    "status",
                    "beats_count",
                    "error",
                ],
            )
            writer.writeheader()
            for row in log_rows:
                writer.writerow(row)

    run_summary = {
        "dataset": cfg.name,
        "description": cfg.description,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "audio_attempted": total,
        "audio_processed": processed,
        "audio_skipped_existing": skipped,
        "audio_failures": {
            "count": len(failures),
            "examples": failures[:10],
        },
        "estimate_dir": str(target_estimate_dir),
        "reference_dir": str(cfg.reference_dir) if cfg.reference_dir else None,
        "results_dir": str(results_dir),
        "log_csv": str(log_csv) if log_csv else None,
        "batch_evaluation": {
            "per_file_csv": evaluation["per_file_csv"],
            "aggregate_json": evaluation["aggregate_json"],
            "count": evaluation["count"],
        },
        "dataset_summary": report.to_summary(),
        "timing": stage_times,
    }

    with (results_dir / "run_summary.json").open("w") as handle:
        json.dump(run_summary, handle, indent=2)

    return run_summary


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Phase 2B dataset validator and batch evaluation harness."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser(
        "validate", help="Validate dataset structure and annotations."
    )
    validate_parser.add_argument(
        "--dataset",
        action="append",
        choices=sorted(DATASETS.keys()),
        required=True,
        help="Dataset(s) to validate.",
    )
    validate_parser.add_argument(
        "--summary-json",
        type=Path,
        help="Optional path to write aggregated validation summary (JSON).",
    )

    run_parser = subparsers.add_parser(
        "run",
        help="Run beat detection + evaluation for a dataset.",
    )
    run_parser.add_argument(
        "--dataset",
        choices=sorted(DATASETS.keys()),
        required=True,
        help="Dataset to process.",
    )
    run_parser.add_argument(
        "--estimate-dir",
        type=Path,
        help="Override directory for beat estimates (defaults to dataset config).",
    )
    run_parser.add_argument(
        "--results-dir",
        type=Path,
        help="Directory for evaluation outputs (default: results/phase2b_<dataset>).",
    )
    run_parser.add_argument(
        "--limit",
        type=int,
        help="Optionally limit the number of audio files processed.",
    )
    run_parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Recompute beats even if estimate files already exist.",
    )
    run_parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume previous run by skipping already existing estimates.",
    )
    run_parser.add_argument(
        "--allow-unreadable",
        action="store_true",
        help=(
            "Proceed even if some audio files are unreadable; they will be skipped."
        ),
    )
    run_parser.add_argument(
        "--workers",
        type=int,
        default=max(1, (os.cpu_count() or 1) - 1),
        help=(
            "Parallel workers for beat detection (default: CPU cores minus one). "
            "Use 1 to disable parallelism."
        ),
    )
    run_parser.add_argument(
        "--log-csv",
        type=Path,
        help="Optional path to write a per-file progress log (CSV).",
    )

    return parser.parse_args()


def main() -> int:
    args = _parse_args()

    if args.command == "validate":
        summaries = []
        for dataset_name in args.dataset:
            cfg = DATASETS[dataset_name]
            print(f"=== Validating {cfg.name}: {cfg.description}")
            try:
                report = validate_dataset(cfg)
            except Exception as exc:  # noqa: BLE001
                print(f"Validation failed: {exc}")
                return 2

            summary = report.to_summary()
            summaries.append(summary)

            print(f"Audio files:     {summary['audio_count']}")
            print(f"Reference files: {summary['reference_count']}")
            print(f"Missing refs:    {summary['missing_references']['count']}")
            print(f"Orphan refs:     {summary['orphan_references']['count']}")
            print(f"Unreadable:      {summary['unreadable_audio']['count']}")
            print(f"Sample rates:    {summary['sample_rates']}")
            print(f"Channels:        {summary['channels']}")
            if summary["duration_stats"]:
                stats = summary["duration_stats"]
                print(
                    "Durations:      "
                    f"min {stats['min_seconds']:.2f}s | "
                    f"mean {stats['mean_seconds']:.2f}s | "
                    f"max {stats['max_seconds']:.2f}s | "
                    f"total {stats['total_hours']:.2f}h"
                )
            print()

        if args.summary_json:
            args.summary_json.parent.mkdir(parents=True, exist_ok=True)
            with args.summary_json.open("w") as handle:
                json.dump({"datasets": summaries}, handle, indent=2)
            print(f"Wrote validation summary to {args.summary_json}")

        return 0

    if args.command == "run":
        cfg = DATASETS[args.dataset]
        estimate_dir = args.estimate_dir
        results_dir = args.results_dir or Path("results") / f"phase2b_{cfg.name}"
        skip_existing = args.resume or (not args.overwrite)

        try:
            summary = run_dataset(
                cfg,
                estimate_dir=estimate_dir,
                results_dir=results_dir,
                limit=args.limit,
                skip_existing=skip_existing,
                allow_unreadable=args.allow_unreadable,
                workers=args.workers,
                log_csv=args.log_csv,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Run failed: {exc}")
            return 3

        print(f"Run complete. Summary written to {results_dir / 'run_summary.json'}")
        print(
            f"Processed {summary['audio_processed']} clips "
            f"(skipped {summary['audio_skipped_existing']}, "
            f"failures {summary['audio_failures']['count']})."
        )
        print(
            f"Aggregate metrics: {summary['batch_evaluation']['aggregate_json']}"
        )
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
