#!/usr/bin/env python3
"""
Synthetic validation harness for the Phase 2A beat detector.

Creates deterministic synthetic audio at various tempos, generates reference beats,
detects beats, and measures MIREX metrics using eval_single.py.
"""

import argparse
import subprocess
import numpy as np
import soundfile as sf
from beat_detector import BeatDetector, generate_synthetic_audio
from pathlib import Path
import json
import mir_eval.beat
import mir_eval.io


def generate_reference_beats(tempo, duration, sr=22050, first_beat=0.5):
    """
    Generate ground-truth beats at specified tempo.

    Args:
        tempo: BPM
        duration: Seconds
        sr: Sample rate
        first_beat: Time of first beat (seconds)

    Returns:
        beat_times: Array of beat times
    """
    beat_interval = 60.0 / tempo
    beat_times = np.arange(first_beat, duration, beat_interval)
    return beat_times


def save_beats(beat_times, output_file):
    """Save beat times to text file (MIREX format)."""
    with open(output_file, "w") as f:
        for beat_time in beat_times:
            f.write(f"{beat_time:.6f}\n")


def run_evaluation(ref_file, est_file):
    """
    Evaluate beats directly via mir_eval.

    Returns:
        metrics: Dict with MIREX metrics (F-measure, Cemgil, Goto, etc.)
    """
    # MIREX convention: trim first 5 seconds
    ref = mir_eval.beat.trim_beats(mir_eval.io.load_events(ref_file), min_beat_time=5.0)
    est = mir_eval.beat.trim_beats(mir_eval.io.load_events(est_file), min_beat_time=5.0)

    scores = mir_eval.beat.evaluate(ref, est)
    return {k: float(v) for k, v in scores.items()}


def _extract_scalar(value):
    """Convert a numpy scalar/array/list to a Python float."""
    return float(np.atleast_1d(value).astype(np.float64)[0])


def test_detector_on_synthetic_suite(rng_seed=42):
    """
    Test beat detector on suite of synthetic audio files.

    Test cases:
    1. Perfect beats at 120 BPM
    2. Perfect beats at 90 BPM
    3. Perfect beats at 140 BPM
    4. Beats with added noise
    """
    detector = BeatDetector()
    results = []

    test_cases = [
        {"name": "tempo_90", "tempo": 90, "duration": 30, "noise": 0.0},
        {"name": "tempo_120", "tempo": 120, "duration": 30, "noise": 0.0},
        {"name": "tempo_140", "tempo": 140, "duration": 30, "noise": 0.0},
        {"name": "tempo_120_noisy", "tempo": 120, "duration": 30, "noise": 0.1},
    ]

    print("=" * 80)
    print("BEAT DETECTOR SYNTHETIC TEST SUITE")
    print("=" * 80)
    print()

    for index, test_case in enumerate(test_cases):
        name = test_case["name"]
        tempo = test_case["tempo"]
        duration = test_case["duration"]
        noise_level = test_case["noise"]
        base_seed = rng_seed + index

        print(f"Test: {name}")
        print(f"  Tempo: {tempo} BPM, Duration: {duration}s, Noise: {noise_level}")

        # Generate synthetic audio
        audio_rng = np.random.default_rng(base_seed)
        extra_noise_rng = np.random.default_rng(base_seed + 10_000)
        y, sr = generate_synthetic_audio(tempo=tempo, duration=duration, rng=audio_rng)
        if noise_level > 0:
            y = y + extra_noise_rng.normal(0, noise_level, len(y))

        audio_file = f"/tmp/test_{name}.wav"
        sf.write(audio_file, y, sr)

        # Generate reference beats (ground truth)
        ref_beats = generate_reference_beats(tempo, duration)
        ref_file = f"/tmp/test_{name}_ref.txt"
        save_beats(ref_beats, ref_file)
        print(f"  Reference beats: {len(ref_beats)} beats")

        # Detect beats
        detected_result = detector.detect_beats(audio_file)
        est_beats = detected_result["beats"]
        est_file = f"/tmp/test_{name}_est.txt"
        save_beats(est_beats, est_file)
        print(f"  Detected beats:  {len(est_beats)} beats")
        det_tempo = _extract_scalar(detected_result["tempo"])
        print(f"  Detected tempo:  {det_tempo:.1f} BPM")

        # Run evaluation
        metrics = run_evaluation(ref_file, est_file)

        print(f"  Metrics:")
        print(f"    F-measure: {metrics.get('F-measure', np.nan):.4f}")
        print(f"    Cemgil:    {metrics.get('Cemgil', np.nan):.4f}")
        print(f"    Goto:      {metrics.get('Goto', np.nan):.4f}")

        results.append(
            {
                "test_case": name,
                "tempo": tempo,
                "noise": noise_level,
                "ref_beats": len(ref_beats),
                "det_beats": len(est_beats),
                "det_tempo": det_tempo,
                "metrics": metrics,
            }
        )
        print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()

    print("Test Case         Tempo  Noise  Ref/Det F-measure Cemgil  Goto")
    print("-" * 70)
    for r in results:
        f_meas = r["metrics"].get("F-measure", np.nan)
        cemgil = r["metrics"].get("Cemgil", np.nan)
        goto = r["metrics"].get("Goto", np.nan)
        print(
            f"{r['test_case']:15} {r['tempo']:3d}  {r['noise']:.2f}   "
            f"{r['ref_beats']:2d}/{r['det_beats']:2d}     "
            f"{f_meas:7.4f}  {cemgil:7.4f}  {goto:6.4f}"
        )

    # Calculate average F-measure
    f_measures = [r["metrics"].get("F-measure", np.nan) for r in results]
    f_measures = [f for f in f_measures if not np.isnan(f)]
    if f_measures:
        avg_f = np.mean(f_measures)
        print()
        print(f"Average F-measure: {avg_f:.4f}")
        if avg_f > 0.80:
            print("✓ PASS: Average F-measure > 0.80")
        else:
            print(f"✗ FAIL: Average F-measure {avg_f:.4f} < 0.80")

    return results


def _dump_results(results, output_path):
    """Persist results in JSON form for auditability."""
    serializable = []
    for item in results:
        record = dict(item)
        record["det_tempo"] = float(record["det_tempo"])
        record["metrics"] = {k: float(v) for k, v in record["metrics"].items()}
        serializable.append(record)

    with open(output_path, "w") as f:
        json.dump(serializable, f, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Phase 2A synthetic validation suite.")
    parser.add_argument(
        "--results-json",
        default="results/phase2a_synthetic_metrics.json",
        help="Path for JSON summary output (default: results/phase2a_synthetic_metrics.json)",
    )
    parser.add_argument(
        "--rng-seed",
        type=int,
        default=42,
        help="Seed for deterministic synthetic audio generation (default: 42)",
    )
    args = parser.parse_args()

    results = test_detector_on_synthetic_suite(rng_seed=args.rng_seed)

    output_path = Path(args.results_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _dump_results(results, output_path)
    print(f"\nResults saved to {output_path}")
