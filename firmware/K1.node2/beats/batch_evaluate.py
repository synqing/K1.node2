#!/usr/bin/env python3
"""
Batch evaluation over two folders (reference/ vs estimates/).

Writes per-file CSV and aggregate JSON. Still 'manual': no gates, no alerts—just metrics.

Week 3 tool: evaluate all 217 SMC files, generate CSV and JSON for analysis.

Usage:
    python batch_evaluate.py \
        --reference_dir reference \
        --estimate_dir estimates \
        --out_csv results/per_file.csv \
        --out_json results/aggregate.json

Output:
    per_file.csv: One row per (reference, estimate) pair with all metrics
    aggregate.json: Means and standard deviations across all files
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

import mir_eval.beat
import mir_eval.io
import numpy as np

TRIM_SECONDS = 5.0  # Trim first 5 seconds per MIREX convention


def load_beats(path: str) -> np.ndarray:
    """Load beats from annotation file, trim first 5 seconds.

    Primary format: one time (seconds) per line.
    Fallback: if parsing fails (e.g., Ballroom .beats with two columns),
    read the first whitespace-separated column as time in seconds.
    """
    try:
        beats = mir_eval.io.load_events(path)
    except Exception:
        times: list[float] = []
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                try:
                    times.append(float(parts[0]))
                except Exception:
                    # Skip malformed lines
                    continue
        beats = np.asarray(times, dtype=float)
    return mir_eval.beat.trim_beats(beats, min_beat_time=TRIM_SECONDS)


def list_pairs(ref_dir: str | os.PathLike, est_dir: str | os.PathLike) -> list:
    """
    Find all beat annotation files present in both directories.
    Supports .txt (GTZAN-style) and .beats (Ballroom-style) extensions.

    Returns list of (filename, ref_path, est_path) tuples, sorted by filename.
    """
    ref_dir = os.fspath(ref_dir)
    est_dir = os.fspath(est_dir)

    exts = (".txt", ".beats")

    def _list_with_ext(dir_path: str) -> set[str]:
        return {f for f in os.listdir(dir_path) if any(f.endswith(ext) for ext in exts)}

    ref_files = _list_with_ext(ref_dir)
    est_files = _list_with_ext(est_dir)
    shared = sorted(ref_files & est_files)

    pairs = [
        (f, os.path.join(ref_dir, f), os.path.join(est_dir, f))
        for f in shared
    ]
    return pairs


def run_batch_evaluation(
    reference_dir: str | os.PathLike,
    estimate_dir: str | os.PathLike,
    out_csv: str | os.PathLike,
    out_json: str | os.PathLike,
    *,
    log=print,
    warn_log=lambda msg: print(msg, file=sys.stderr),
) -> dict:
    """
    Evaluate (reference, estimate) beat pairs and persist CSV/JSON summaries.

    Args:
        reference_dir: Directory containing ground-truth beat .txt files.
        estimate_dir: Directory containing estimated beat .txt files.
        out_csv: Destination path for per-file CSV metrics.
        out_json: Destination path for aggregate JSON metrics.
        log: Callable for informational messages (default: print).
        warn_log: Callable for warnings/errors (default: stderr print).

    Returns:
        Dictionary with aggregate metrics, output paths, and warning list.
    """
    reference_dir = Path(reference_dir)
    estimate_dir = Path(estimate_dir)
    out_csv = Path(out_csv)
    out_json = Path(out_json)

    metric_names = [
        "F-measure",
        "Cemgil",
        "Information Gain",
        "Goto",
        "CMLc",
        "CMLt",
        "AMLc",
        "AMLt",
        "PScore",
    ]

    pairs = list_pairs(reference_dir, estimate_dir)
    if not pairs:
        raise FileNotFoundError(
            f"No matching .txt/.beats files in {reference_dir} and {estimate_dir}"
        )

    if log:
        log(f"Found {len(pairs)} matching pairs")

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    out_json.parent.mkdir(parents=True, exist_ok=True)

    warnings: list[str] = []
    rows = []

    with out_csv.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["file", "n_ref", "n_est"] + metric_names)

        for base, ref_path, est_path in pairs:
            try:
                ref = load_beats(ref_path)
                est = load_beats(est_path)
            except Exception as exc:
                message = f"Warning: failed to load {base}: {exc}"
                warnings.append(message)
                if warn_log:
                    warn_log(message)
                continue

            if len(ref) == 0 or len(est) == 0:
                message = f"Warning: empty beats in {base} after trim"
                warnings.append(message)
                if warn_log:
                    warn_log(message)
                continue

            scores = mir_eval.beat.evaluate(ref, est)
            metric_values = [scores.get(name, float("nan")) for name in metric_names]

            writer.writerow([base, len(ref), len(est)] + metric_values)
            rows.append({name: val for name, val in zip(metric_names, metric_values)})

    if log:
        log(f"Wrote {out_csv}")

    if not rows:
        raise RuntimeError("No valid (reference, estimate) pairs were evaluated.")

    agg = {"count": len(rows)}

    for metric_name in metric_names:
        values = np.array([row[metric_name] for row in rows], dtype=float)
        finite_values = values[np.isfinite(values)]

        if finite_values.size > 0:
            agg[f"{metric_name}_mean"] = float(np.mean(finite_values))
            agg[f"{metric_name}_std"] = float(
                np.std(finite_values, ddof=1) if finite_values.size > 1 else 0.0
            )
            agg[f"{metric_name}_min"] = float(np.min(finite_values))
            agg[f"{metric_name}_max"] = float(np.max(finite_values))

    with out_json.open("w") as f:
        json.dump(agg, f, indent=2)

    if log:
        log(f"Wrote {out_json}")
        log("")
        log("=== AGGREGATE SUMMARY ===")
        log(f"Evaluated {agg['count']} files")
        for metric_name in metric_names:
            mean_key = f"{metric_name}_mean"
            if mean_key in agg:
                log(f"{metric_name:>18} mean: {agg[mean_key]:.6f}")

    return {
        "aggregate": agg,
        "count": agg["count"],
        "metric_names": metric_names,
        "per_file_csv": str(out_csv),
        "aggregate_json": str(out_json),
        "warnings": warnings,
    }


def main():
    ap = argparse.ArgumentParser(
        description="Batch evaluate (reference, estimate) pairs. Output CSV and JSON."
    )
    ap.add_argument("--reference_dir", required=True, help="folder with reference .txt files")
    ap.add_argument("--estimate_dir", required=True, help="folder with estimate .txt files")
    ap.add_argument("--out_csv", default="per_file.csv", help="output CSV path")
    ap.add_argument("--out_json", default="aggregate.json", help="output JSON path")
    args = ap.parse_args()

    try:
        run_batch_evaluation(
            args.reference_dir,
            args.estimate_dir,
            args.out_csv,
            args.out_json,
            log=print,
            warn_log=lambda msg: print(msg, file=sys.stderr),
        )
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 2
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 3

    return 0


if __name__ == "__main__":
    sys.exit(main())
