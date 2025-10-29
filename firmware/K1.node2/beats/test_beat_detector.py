#!/usr/bin/env python3
"""
Test beat detector on synthetic audio with known ground truth.

Creates synthetic audio at various tempos, generates reference beats,
detects beats, and measures MIREX metrics using eval_single.py.

Author: Claude (Week 2 Phase 2A)
Date: 2025-10-30
"""

import subprocess
import numpy as np
import soundfile as sf
from beat_detector import BeatDetector, generate_synthetic_audio
from pathlib import Path
import json


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
    Run eval_single.py and return metrics.

    Returns:
        metrics: Dict with F-measure, Cemgil, Goto, etc.
    """
    result = subprocess.run(
        ["python", "eval_single.py", "--ref", ref_file, "--est", est_file],
        capture_output=True,
        text=True,
    )

    metrics = {}
    for line in result.stdout.split("\n"):
        if ":" in line:
            parts = line.split(":")
            if len(parts) == 2:
                key = parts[0].strip()
                try:
                    value = float(parts[1].strip())
                    metrics[key] = value
                except ValueError:
                    pass

    return metrics


def test_detector_on_synthetic_suite():
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

    for test_case in test_cases:
        name = test_case["name"]
        tempo = test_case["tempo"]
        duration = test_case["duration"]
        noise_level = test_case["noise"]

        print(f"Test: {name}")
        print(f"  Tempo: {tempo} BPM, Duration: {duration}s, Noise: {noise_level}")

        # Generate synthetic audio
        y, sr = generate_synthetic_audio(tempo=tempo, duration=duration)
        if noise_level > 0:
            y = y + np.random.normal(0, noise_level, len(y))

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
        print(f"  Detected tempo:  {float(detected_result['tempo']):.1f} BPM")

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
                "det_tempo": float(detected_result["tempo"]),
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


if __name__ == "__main__":
    results = test_detector_on_synthetic_suite()

    # Save results to JSON
    results_json = "/tmp/beat_detector_test_results.json"
    with open(results_json, "w") as f:
        json.dump(
            results,
            f,
            indent=2,
            default=lambda x: float(x) if isinstance(x, np.number) else str(x),
        )
    print(f"\nResults saved to {results_json}")
