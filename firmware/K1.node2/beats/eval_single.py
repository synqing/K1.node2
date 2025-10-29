#!/usr/bin/env python3
"""
Single-file MIREX-style evaluation (manual-first).

Purpose: Teach what each MIREX metric means before any batch automation.
Week 1 tool: understand metrics on one track before scaling to all 217.

Usage:
    python eval_single.py --ref reference/easy_001.txt --est estimates/easy_001.txt

Output: All metrics printed by name, beat counts before/after trim.
Trim: First 5.0 seconds removed per MIREX convention.
"""

import argparse
import sys
import numpy as np
import mir_eval.beat
import mir_eval.io

TRIM_SECONDS = 5.0  # Ignore beats before 5s (MIREX standard for intro/silence)


def load_beats(path: str) -> np.ndarray:
    """Load beats from text file, trim first 5 seconds."""
    beats = mir_eval.io.load_events(path)
    return mir_eval.beat.trim_beats(beats, min_beat_time=TRIM_SECONDS)


def main():
    ap = argparse.ArgumentParser(
        description="Evaluate one (reference, estimate) pair. Prints all MIREX metrics."
    )
    ap.add_argument("--ref", required=True, help="reference .txt (one beat time per line, seconds)")
    ap.add_argument("--est", required=True, help="estimate .txt (one beat time per line, seconds)")
    args = ap.parse_args()

    try:
        ref = load_beats(args.ref)
        est = load_beats(args.est)
    except Exception as e:
        print(f"Error loading beats: {e}", file=sys.stderr)
        return 1

    if len(ref) == 0 or len(est) == 0:
        print("Error: no beats in one or both files after trim", file=sys.stderr)
        return 1

    # Compute all MIREX metrics (mir_eval.beat.evaluate returns a dict)
    scores = mir_eval.beat.evaluate(ref, est)

    # Display results
    print("=== INPUT CHECK ===")
    print(f"ref beats: {len(ref)} (trim<{TRIM_SECONDS}s removed)")
    print(f"est beats: {len(est)} (trim<{TRIM_SECONDS}s removed)")
    print()

    print("=== METRICS (MIREX defs via mir_eval.beat.evaluate) ===")

    # Standard MIREX metric names in order
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

    for name in metric_names:
        value = scores.get(name, np.nan)
        if np.isfinite(value):
            print(f"{name:>18}: {value:.6f}")
        else:
            print(f"{name:>18}: NaN")

    return 0


if __name__ == "__main__":
    sys.exit(main())
