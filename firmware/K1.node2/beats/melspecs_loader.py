#!/usr/bin/env python3
"""
Harmonix Mel-Spectrogram Loader Utility

Simple, transparent utility for loading pre-computed mel-spectrograms.
No black boxes, no automatic feature engineering—just load and inspect.

Manual-first approach: understand the data before building models.

Usage:
    from melspecs_loader import MelspecsLoader
    loader = MelspecsLoader()
    melspec = loader.load('0042_cagetheelephant')
    beats = loader.load_beats('0042_cagetheelephant')
"""

import numpy as np
from pathlib import Path
import json


class MelspecsLoader:
    """Load Harmonix mel-spectrograms and corresponding beat annotations."""

    def __init__(self, melspecs_dir=None, beats_dir=None, sr=22050, hop_length=512):
        """
        Initialize loader with paths to melspecs and beats.

        Args:
            melspecs_dir: Path to Implementation.plans/Harmonix_melspecs/melspecs
            beats_dir: Path to firmware/K1.node2/beats/data/harmonix/reference
            sr: Sample rate (default 22050 Hz)
            hop_length: Hop length in samples (default 512)
        """
        if melspecs_dir is None:
            # Path: firmware/K1.node2/beats/melspecs_loader.py
            # Go up 4 levels to K1.reinvented (beats → K1.node2 → firmware → K1.reinvented)
            script_dir = Path(__file__).parent  # firmware/K1.node2/beats
            project_root = script_dir.parent.parent.parent  # K1.reinvented
            melspecs_dir = project_root / "Implementation.plans/Harmonix_melspecs/melspecs"
        if beats_dir is None:
            beats_dir = Path(__file__).parent / "data/harmonix/reference"

        self.melspecs_dir = Path(melspecs_dir)
        self.beats_dir = Path(beats_dir)
        self.sr = sr
        self.hop_length = hop_length

        # Validate directories exist
        if not self.melspecs_dir.exists():
            raise FileNotFoundError(f"Melspecs directory not found: {self.melspecs_dir}")
        if not self.beats_dir.exists():
            raise FileNotFoundError(f"Beats directory not found: {self.beats_dir}")

        # Cache available tracks
        self._track_ids = None

    @property
    def track_ids(self):
        """Get list of available track IDs (cached)."""
        if self._track_ids is None:
            melspec_files = sorted(self.melspecs_dir.glob("*-mel.npy"))
            self._track_ids = [f.stem.replace("-mel", "") for f in melspec_files]
        return self._track_ids

    def load(self, track_id):
        """
        Load mel-spectrogram for a track.

        Args:
            track_id: Track ID (e.g., '0042_cagetheelephant')

        Returns:
            melspec: (n_mels, n_frames) numpy array, log-scaled

        Raises:
            FileNotFoundError: If melspec file not found
        """
        melspec_path = self.melspecs_dir / f"{track_id}-mel.npy"

        if not melspec_path.exists():
            raise FileNotFoundError(
                f"Melspec not found: {melspec_path}\n"
                f"Available tracks: {len(self.track_ids)}\n"
                f"Sample: {self.track_ids[:3]}"
            )

        return np.load(melspec_path)

    def load_beats(self, track_id):
        """
        Load beat annotations for a track.

        Args:
            track_id: Track ID (e.g., '0042_cagetheelephant')

        Returns:
            beats: (n_beats,) numpy array, beat times in seconds

        Raises:
            FileNotFoundError: If beats file not found
        """
        beats_path = self.beats_dir / f"{track_id}.txt"

        if not beats_path.exists():
            raise FileNotFoundError(f"Beats not found: {beats_path}")

        return np.loadtxt(beats_path)

    def load_pair(self, track_id):
        """
        Load both melspec and beats for a track (convenience method).

        Args:
            track_id: Track ID

        Returns:
            (melspec, beats): Tuple of loaded arrays
        """
        return self.load(track_id), self.load_beats(track_id)

    def load_batch(self, track_ids):
        """
        Load batch of melspecs and beats.

        Args:
            track_ids: List of track IDs

        Returns:
            batch: Dict with 'melspecs' and 'beats' lists
        """
        batch = {"melspecs": [], "beats": [], "track_ids": []}

        for track_id in track_ids:
            try:
                melspec, beats = self.load_pair(track_id)
                batch["melspecs"].append(melspec)
                batch["beats"].append(beats)
                batch["track_ids"].append(track_id)
            except FileNotFoundError as e:
                print(f"Warning: skipping {track_id}: {e}")

        return batch

    def info(self, track_id):
        """
        Print detailed info about a track's melspec.

        Args:
            track_id: Track ID
        """
        melspec = self.load(track_id)
        beats = self.load_beats(track_id)

        n_mels, n_frames = melspec.shape
        duration_sec = n_frames * self.hop_length / self.sr
        frame_time_ms = self.hop_length / self.sr * 1000

        print(f"=== Track: {track_id} ===")
        print(f"Melspec shape:        {n_mels} mels × {n_frames} frames")
        print(f"Melspec dtype:        {melspec.dtype}")
        print(f"Value range:          [{melspec.min():.1f}, {melspec.max():.1f}] (log dB)")
        print(f"Duration:             {duration_sec:.1f} seconds")
        print(f"Frame time:           {frame_time_ms:.1f} ms")
        print(f"Sample rate (sr):     {self.sr} Hz")
        print(f"Hop length:           {self.hop_length} samples")
        print()
        print(f"Beats:                {len(beats)} beats")
        print(f"Beat range:           [{beats.min():.2f}, {beats.max():.2f}] seconds")
        print(f"Beat density:         {len(beats) / duration_sec:.2f} beats/second")

    def to_frames(self, time_seconds):
        """
        Convert time in seconds to frame index.

        Args:
            time_seconds: Time in seconds

        Returns:
            frame_idx: Frame index (use to index melspec columns)
        """
        return int(np.round(time_seconds * self.sr / self.hop_length))

    def to_seconds(self, frame_idx):
        """
        Convert frame index to time in seconds.

        Args:
            frame_idx: Frame index

        Returns:
            time_seconds: Time in seconds
        """
        return frame_idx * self.hop_length / self.sr


def main():
    """Demo: load and inspect a track."""
    loader = MelspecsLoader()

    print(f"=== Harmonix Melspecs Loader ===\n")
    print(f"Available tracks: {len(loader.track_ids)}")
    print(f"Sample tracks:\n  {chr(10).join(loader.track_ids[:5])}\n")

    # Load and inspect first track
    track_id = loader.track_ids[0]
    print(f"Loading {track_id}...\n")

    loader.info(track_id)

    # Example: load melspec and beats
    print(f"\n=== Manual Loading Example ===")
    melspec, beats = loader.load_pair(track_id)
    print(f"melspec = loader.load('{track_id}')")
    print(f"  Shape: {melspec.shape}")
    print(f"beats = loader.load_beats('{track_id}')")
    print(f"  Shape: {beats.shape}")

    # Example: compute simple features
    print(f"\n=== Feature Extraction Example ===")

    # Total energy over time
    energy = np.sum(melspec, axis=0)
    print(f"energy = np.sum(melspec, axis=0)")
    print(f"  Shape: {energy.shape}")
    print(f"  Mean: {energy.mean():.2f} dB")

    # Spectral flux (onset indicator)
    flux = np.sqrt(np.sum(np.diff(melspec, axis=1) ** 2, axis=0))
    print(f"flux = np.sqrt(np.sum(np.diff(melspec, axis=1)**2, axis=0))")
    print(f"  Shape: {flux.shape}")
    print(f"  Max: {flux.max():.4f}")

    # Time conversion
    print(f"\n=== Time Conversion Example ===")
    beat_frame = loader.to_frames(beats[0])
    print(f"First beat at: {beats[0]:.3f} seconds")
    print(f"Frame index: {beat_frame}")
    print(f"Verify: {loader.to_seconds(beat_frame):.3f} seconds")


if __name__ == "__main__":
    main()
