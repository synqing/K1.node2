#!/usr/bin/env python3
"""
Beat Detector for K1.reinvented Audio-Reactive LED Control

Phase 2A: Desktop implementation using librosa beat tracking.
Validates algorithm performance on synthetic and real audio.

Author: Claude (Week 2 Implementation)
Date: 2025-10-30
Status: MVP - Tier 2 Implementation
"""

import argparse
import os
from pathlib import Path

import numpy as np

# Ensure numba (used internally by librosa) has a writable cache location.
os.environ.setdefault("NUMBA_CACHE_DIR", "/tmp/k1_numba_cache")

import librosa
import soundfile as sf


class BeatDetector:
    """
    Beat tracking using librosa's onset-based approach.

    Algorithm:
    1. Compute onset strength (spectral flux)
    2. Estimate tempo via autocorrelation (tempogram)
    3. Peak-pick onsets with tempo constraints
    4. Optionally: phase-lock to dominant tempo

    References:
    - Ellis, D. P. (2007). Beat tracking by dynamic programming.
    - Foote, J. & Uchihashi, S. (2001). The beat spectrum.
    """

    def __init__(self, sr=22050, hop_length=512):
        """
        Initialize beat detector.

        Args:
            sr: Sample rate (Hz)
            hop_length: Hop length for feature computation
        """
        self.sr = sr
        self.hop_length = hop_length

    def compute_features(self, y, sr):
        """
        Compute core features used by beat detection.

        Returns:
            onset_env: Onset strength envelope
            onset_frames: Peak-picked onset frame indices
            onset_times: Onset times in seconds
        """
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=self.hop_length)
        onset_frames = librosa.util.peak_pick(
            onset_env,
            pre_max=3,
            post_max=3,
            pre_avg=3,
            post_avg=3,
            delta=0.1,
            wait=10,
        )
        onset_times = librosa.frames_to_time(
            onset_frames, sr=sr, hop_length=self.hop_length
        )
        return onset_env, onset_frames, onset_times

    def detect_beats(self, audio_path, units="time", filter_beats=True):
        """
        Detect beats in audio file.

        Args:
            audio_path: Path to audio file
            units: 'time' (seconds) or 'frames'
            filter_beats: Filter out sub-beats (beats that are too close)

        Returns:
            beat_times: Beat positions in seconds or frames
            tempo: Estimated tempo (BPM)
            onsets: Onset times for debugging
        """
        # Load audio at native sample rate (avoid unnecessary resampling)
        y, sr = librosa.load(audio_path, sr=None)

        # Method 1: librosa.beat.beat_track (simple, effective)
        # This combines onset detection + tempogram + beat linking
        tempo, frames = librosa.beat.beat_track(
            y=y,
            sr=sr,
            hop_length=self.hop_length,
            units="frames",
        )

        # Convert frames to time
        times = librosa.frames_to_time(frames, sr=sr, hop_length=self.hop_length)

        # Adaptive filtering to reduce octave confusion and boundary artifacts
        if filter_beats and len(times) > 1:
            beat_interval = float(np.median(np.diff(times)))
            # Minimum interval: 40% of median or 70ms, whichever is larger
            min_interval = max(0.4 * beat_interval, 0.070)

            # Track duration for boundary handling
            duration = len(y) / float(sr)
            start_guard = 0.05  # drop beats within first 50ms
            end_guard = 0.05    # drop beats within last 50ms

            filtered_times = []
            last_time = None
            for t in times:
                if t < start_guard or t > (duration - end_guard):
                    continue
                if last_time is None or (t - last_time) >= min_interval:
                    filtered_times.append(t)
                    last_time = t
            times = np.array(filtered_times)

        # Also compute onsets for analysis
        onset_env, onsets_frames, onsets_times = self.compute_features(y, sr)

        return {
            "beats": times,
            "tempo": tempo,
            "onsets": onsets_times,
            "frames": frames,
            "sr": sr,
        }

    def detect_beats_custom(self, audio_path, onset_threshold=0.1, tempo_range=(80, 180)):
        """
        Custom beat detection with more control.

        Algorithm:
        1. Spectral flux onset detection
        2. Tempogram (autocorrelation) for tempo
        3. Beat linking via phase-locking

        Args:
            audio_path: Path to audio file
            onset_threshold: Peak-picking threshold for onsets
            tempo_range: (min_bpm, max_bpm) tempo constraints

        Returns:
            Dictionary with beats, tempo, onsets
        """
        y, sr = librosa.load(audio_path, sr=None)

        # Step 1: Onset detection (spectral flux)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)

        # Step 2: Peak-pick onsets
        onset_frames = librosa.util.peak_pick(
            onset_env,
            pre_max=3,
            post_max=3,
            pre_avg=3,
            post_avg=3,
            delta=onset_threshold,
            wait=10,
        )
        onset_times = librosa.frames_to_time(
            onset_frames, sr=sr, hop_length=self.hop_length
        )

        # Step 3: Tempogram for tempo estimation
        hop_length = self.hop_length
        oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)

        # Autocorrelation tempogram
        tempogram = librosa.feature.tempogram(onset_env=oenv, sr=sr)

        # Find dominant tempo (at different lags)
        # Tempo hypothesis space
        tempo_min, tempo_max = tempo_range
        n_fft = 4096
        frequencies = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
        # Map frequencies to tempos
        # Actually, let's just use librosa's built-in tempo estimation
        tempo = librosa.feature.tempo(onset_env=oenv, sr=sr)[0]

        # Clamp to valid range
        tempo = np.clip(tempo, tempo_min, tempo_max)

        # Step 4: Link onsets to beats via tempo
        # Simple phase-locking: adjust onset times to nearest beat
        beat_interval = 60.0 / tempo  # seconds per beat
        beat_times = self._phase_lock_beats(onset_times, beat_interval)

        return {
            "beats": beat_times,
            "tempo": tempo,
            "onsets": onset_times,
            "beat_interval": beat_interval,
        }

    def _phase_lock_beats(self, onsets, beat_interval, phase_tolerance=0.1):
        """
        Phase-lock onsets to a beat grid.

        If onsets are within phase_tolerance of expected beat times,
        quantize them to the beat grid.

        Args:
            onsets: Onset times (seconds)
            beat_interval: Seconds per beat
            phase_tolerance: Fraction of beat_interval to search

        Returns:
            beat_times: Phase-locked beat times
        """
        if len(onsets) == 0:
            return np.array([])

        beats = []
        search_window = phase_tolerance * beat_interval

        for onset in onsets:
            # Find nearest beat grid position
            beat_index = round(onset / beat_interval)
            beat_time = beat_index * beat_interval

            # Check if onset is close enough to beat grid
            if abs(onset - beat_time) <= search_window:
                beats.append(beat_time)

        return np.array(beats)


def generate_synthetic_audio(
    tempo=120,
    duration=30,
    sr=22050,
    click_freq=1000,
    first_beat=0.5,
    rng=None,
):
    """
    Generate synthetic audio with known tempo for testing.

    Args:
        tempo: Tempo in BPM
        duration: Duration in seconds
        sr: Sample rate
        click_freq: Frequency of the click (Hz)
        first_beat: Time of first beat (seconds)

    Returns:
        y: Audio signal
        sr: Sample rate
    """
    beat_interval = 60.0 / tempo
    t = np.arange(0, duration, 1.0 / sr)

    # Generate beats as clicks (impulses)
    beat_times = np.arange(first_beat, duration, beat_interval)
    y = np.zeros_like(t)

    # Add click at each beat (100ms duration, to make beats clearer)
    click_duration = 0.1
    click_samples = int(click_duration * sr)

    for beat_time in beat_times:
        beat_sample = int(beat_time * sr)
        if beat_sample + click_samples < len(y):
            # Sine click
            freq = click_freq
            click = np.sin(2 * np.pi * freq * np.arange(click_samples) / sr)
            # Exponential decay envelope (more natural sounding)
            env = np.exp(-np.arange(click_samples) / (click_samples / 3.0))
            click *= env
            y[beat_sample : beat_sample + click_samples] += click * 0.7

    # Add some background noise (less than before)
    if rng is None:
        rng = np.random.default_rng()

    noise = rng.normal(0, 0.02, len(y))
    y = y + noise

    # Normalize
    y = y / np.max(np.abs(y)) * 0.9

    return y, sr


def main():
    parser = argparse.ArgumentParser(description="Beat detection for MIREX evaluation")
    parser.add_argument(
        "input",
        type=str,
        help="Input audio file or 'synthetic' to generate test audio",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Output beat file (default: input.beats.txt)",
    )
    parser.add_argument(
        "-m",
        "--method",
        type=str,
        default="librosa",
        choices=["librosa", "custom"],
        help="Beat detection method",
    )
    parser.add_argument(
        "-t", "--tempo", type=int, default=120, help="Tempo for synthetic audio (BPM)"
    )
    parser.add_argument(
        "-d",
        "--duration",
        type=float,
        default=30,
        help="Duration for synthetic audio (seconds)",
    )

    args = parser.parse_args()

    # Initialize detector
    detector = BeatDetector()

    # Load or generate audio
    if args.input == "synthetic":
        print(f"Generating synthetic audio: {args.tempo} BPM, {args.duration}s")
        y, sr = generate_synthetic_audio(
            tempo=args.tempo, duration=args.duration, sr=detector.sr
        )
        audio_path = "/tmp/synthetic_audio.wav"
        sf.write(audio_path, y, sr)
        print(f"Wrote to {audio_path}")
    else:
        audio_path = args.input

    # Detect beats
    print(f"Detecting beats in {audio_path}...")
    if args.method == "librosa":
        result = detector.detect_beats(audio_path)
    else:
        result = detector.detect_beats_custom(audio_path)

    # Print results
    tempo_val = float(result['tempo']) if isinstance(result['tempo'], np.ndarray) else result['tempo']
    print(f"Detected tempo: {tempo_val:.1f} BPM")
    print(f"Detected {len(result['beats'])} beats")
    print(f"Detected {len(result['onsets'])} onsets")
    print()
    print("Beat times (seconds):")
    for i, beat in enumerate(result["beats"][:10]):
        print(f"  {i}: {beat:.3f}")
    if len(result["beats"]) > 10:
        print(f"  ... ({len(result['beats']) - 10} more beats)")

    # Save output
    if args.output is None:
        args.output = f"{Path(audio_path).stem}.beats.txt"

    with open(args.output, "w") as f:
        for beat in result["beats"]:
            f.write(f"{beat:.6f}\n")

    print(f"\nWrote beats to {args.output}")


if __name__ == "__main__":
    main()
