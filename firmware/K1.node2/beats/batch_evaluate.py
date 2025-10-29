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
import os
import json
import csv
import sys
import numpy as np
import mir_eval.beat
import mir_eval.io

TRIM_SECONDS = 5.0  # Trim first 5 seconds per MIREX convention


def load_beats(path: str) -> np.ndarray:
    """Load beats from text file, trim first 5 seconds."""
    beats = mir_eval.io.load_events(path)
    return mir_eval.beat.trim_beats(beats, min_beat_time=TRIM_SECONDS)


def list_pairs(ref_dir: str, est_dir: str) -> list:
    """
    Find all .txt files present in both directories.
    Returns list of (basename, ref_path, est_path) tuples, sorted by basename.
    """
    ref_files = {f for f in os.listdir(ref_dir) if f.endswith(".txt")}
    est_files = {f for f in os.listdir(est_dir) if f.endswith(".txt")}
    shared = sorted(ref_files & est_files)

    pairs = [
        (f, os.path.join(ref_dir, f), os.path.join(est_dir, f))
        for f in shared
    ]
    return pairs


def main():
    ap = argparse.ArgumentParser(
        description="Batch evaluate (reference, estimate) pairs. Output CSV and JSON."
    )
    ap.add_argument("--reference_dir", required=True, help="folder with reference .txt files")
    ap.add_argument("--estimate_dir", required=True, help="folder with estimate .txt files")
    ap.add_argument("--out_csv", default="per_file.csv", help="output CSV path")
    ap.add_argument("--out_json", default="aggregate.json", help="output JSON path")
    args = ap.parse_args()

    # Find matching pairs
    pairs = list_pairs(args.reference_dir, args.estimate_dir)
    if not pairs:
        print(
            f"No matching .txt files in {args.reference_dir} and {args.estimate_dir}",
            file=sys.stderr,
        )
        return 2

    print(f"Found {len(pairs)} matching pairs")

    # Metric column names (standard MIREX order)
    metric_names = [
        "F-measure",
        "Cemgil",
        "Information Gain",
        "Goto",
        "CMLc",
        "CMLt",
        "AMLc",
        "AMLt",
        "PScore"
    ]

    # Evaluate all pairs, write CSV
    rows = []
    with open(args.out_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["file", "n_ref", "n_est"] + metric_names)

        for base, ref_path, est_path in pairs:
            try:
                ref = load_beats(ref_path)
                est = load_beats(est_path)
            except Exception as e:
                print(f"Warning: failed to load {base}: {e}", file=sys.stderr)
                continue

            if len(ref) == 0 or len(est) == 0:
                print(f"Warning: empty beats in {base} after trim", file=sys.stderr)
                continue

            # Compute metrics
            scores = mir_eval.beat.evaluate(ref, est)

            # Extract metric values in order
            metric_values = [scores.get(name, float("nan")) for name in metric_names]

            # Write row
            writer.writerow([base, len(ref), len(est)] + metric_values)

            # Store for aggregation
            rows.append({name: val for name, val in zip(metric_names, metric_values)})

    print(f"Wrote {args.out_csv}")

    # Compute aggregate statistics
    agg = {"count": len(rows)}

    for metric_name in metric_names:
        values = np.array(
            [row[metric_name] for row in rows],
            dtype=float
        )
        # Only use finite values
        finite_values = values[np.isfinite(values)]

        if finite_values.size > 0:
            agg[f"{metric_name}_mean"] = float(np.mean(finite_values))
            agg[f"{metric_name}_std"] = float(
                np.std(finite_values, ddof=1) if finite_values.size > 1 else 0.0
            )
            agg[f"{metric_name}_min"] = float(np.min(finite_values))
            agg[f"{metric_name}_max"] = float(np.max(finite_values))

    # Write JSON
    with open(args.out_json, "w") as f:
        json.dump(agg, f, indent=2)

    print(f"Wrote {args.out_json}")
    print()
    print("=== AGGREGATE SUMMARY ===")
    print(f"Evaluated {agg['count']} files")
    for metric_name in metric_names:
        mean_key = f"{metric_name}_mean"
        if mean_key in agg:
            print(f"{metric_name:>18} mean: {agg[mean_key]:.6f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
