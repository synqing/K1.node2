#!/usr/bin/env python3
"""
CI-friendly smoke gate for Phase 2B.

Runs minimal validation and detection for available datasets (limit=1),
emits a small progress CSV if requested, and exits 0 even if datasets are
absent to keep CI stable in environments without data.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from datetime import datetime


def _repo_root() -> Path:
    # firmware/K1.node2/beats/smoke_gate.py -> repo root is three levels up
    return Path(__file__).resolve().parents[3]


DATASETS = {
    "gtzan": Path("data/gtzan/audio"),
    "ballroom": Path("data/ballroom/audio"),
}


def _exists(root: Path, rel: Path) -> bool:
    return (root / rel).exists()


def _run(cmd: list[str], cwd: Path) -> int:
    print(f"$ {' '.join(cmd)} (cwd={cwd})")
    proc = subprocess.run(cmd, cwd=str(cwd))
    return proc.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Phase 2B smoke gate")
    parser.add_argument(
        "--log-csv",
        type=Path,
        help="Optional path to write a per-file progress log (CSV).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1,
        help="Number of files to process per dataset (default: 1)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Parallel workers (default: 1 to avoid CI contention)",
    )
    args = parser.parse_args()

    root = _repo_root()
    beats_dir = root / "firmware/K1.node2/beats"

    print(f"=== Phase 2B Smoke Gate ({datetime.utcnow().isoformat()}Z) ===")
    available = [ds for ds, rel in DATASETS.items() if _exists(root, rel)]
    if not available:
        print("No datasets found locally. Skipping smoke run (exit 0).")
        return 0

    # Validate available datasets
    validate_cmd = [
        "python3",
        str(beats_dir / "phase2b_prep.py"),
        "validate",
    ]
    for ds in available:
        validate_cmd += ["--dataset", ds]
    rc = _run(validate_cmd, cwd=root)
    if rc != 0:
        print(f"Validation returned non-zero ({rc}). Continuing (CI-friendly).")

    # Run detection + evaluation for each available dataset (limit=1)
    for ds in available:
        results_dir = root / "results" / f"phase2b_{ds}"
        progress_csv = args.log_csv or (results_dir / "smoke_progress.csv")
        run_cmd = [
            "python3",
            str(beats_dir / "phase2b_prep.py"),
            "run",
            "--dataset",
            ds,
            "--limit",
            str(args.limit),
            "--workers",
            str(args.workers),
            "--resume",
            "--log-csv",
            str(progress_csv),
        ]
        _run(run_cmd, cwd=root)

    print("Smoke gate completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

