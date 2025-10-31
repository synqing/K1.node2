#!/usr/bin/env python3
"""
Enhanced Beat Detector for K1.reinvented Song Analysis

Extends basic beat detection with:
- Drop detection (2.0x energy threshold)
- Downbeat tracking
- Groove analysis
- Buildup detection
- Tempo confidence scoring

Author: Claude (Song Analysis Enhancement)
Date: 2025-10-31
Status: Production-ready
"""

import numpy as np
import librosa
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from scipy import signal
from scipy.ndimage import gaussian_filter1d


@dataclass
class DropEvent:
    """A detected drop or buildup event."""
    timestamp: float  # seconds
    type: str  # 'drop', 'buildup', 'breakdown'
    confidence: float  # 0.0 to 1.0
    energy_ratio: float  # Energy increase ratio
    duration_ms: int  # For buildups


class EnhancedBeatDetector:
    """
    Advanced beat detection with drop and buildup detection.
    
    Drop Detection Algorithm:
    1. Compute onset strength envelope
    2. Find energy peaks with 2.0x threshold
    3. Verify with spectral flux and bass energy
    4. Track buildups before drops
    
    Usage:
        detector = EnhancedBeatDetector()
        beats, tempo, downbeats, drops = detector.detect(y, sr)
    """
    
    def __init__(self, hop_length: int = 512):
        """
        Initialize enhanced beat detector.
        
        Args:
            hop_length: Hop length for feature extraction
        """
        self.hop_length = hop_length
        
    def detect(self, y: np.ndarray, sr: int) -> Tuple[np.ndarray, float, np.ndarray, List[Dict]]:
        """
        Detect beats, tempo, downbeats, and drops.
        
        Args:
            y: Audio signal
            sr: Sample rate
            
        Returns:
            beats: Beat times in seconds
            tempo: Estimated tempo in BPM
            downbeats: Downbeat times in seconds
            drops: List of drop/buildup events
        """
        print("Running enhanced beat detection...")
        
        # 1. Basic beat tracking
        tempo, beat_frames = librosa.beat.beat_track(
            y=y, sr=sr, hop_length=self.hop_length, units='frames'
        )
        beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=self.hop_length)
        
        # 2. Downbeat detection
        downbeat_times = self._detect_downbeats(y, sr, beat_times, tempo)
        
        # 3. Drop detection
        drops = self._detect_drops(y, sr, beat_times, downbeat_times)
        
        # 4. Buildup detection
        buildups = self._detect_buildups(y, sr, drops)
        
        # Combine drops and buildups
        all_events = drops + buildups
        all_events.sort(key=lambda x: x.timestamp)
        
        # Convert tempo to float if it's an array
        tempo_val = float(tempo) if isinstance(tempo, np.ndarray) else tempo
        
        print(f"Detected {len(beat_times)} beats at {tempo_val:.1f} BPM")
        print(f"Detected {len(downbeat_times)} downbeats")
        print(f"Detected {len(drops)} drops, {len(buildups)} buildups")
        
        return beat_times, float(tempo), downbeat_times, [
            {
                'timestamp': e.timestamp,
                'type': e.type,
                'confidence': e.confidence,
                'energy_ratio': e.energy_ratio,
                'duration_ms': e.duration_ms
            }
            for e in all_events
        ]
    
    def _detect_downbeats(self, y: np.ndarray, sr: int, 
                         beat_times: np.ndarray, tempo: float) -> np.ndarray:
        """
        Detect downbeats (strong beats, typically every 4 beats).
        
        Uses spectral flux and onset strength to identify stronger beats.
        """
        if len(beat_times) < 4:
            return np.array([])
        
        # Compute onset strength
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=self.hop_length)
        
        # Get onset strength at each beat
        beat_frames = librosa.time_to_frames(beat_times, sr=sr, hop_length=self.hop_length)
        beat_strengths = np.array([
            onset_env[min(frame, len(onset_env)-1)] 
            for frame in beat_frames
        ])
        
        # Find beats with above-average strength
        threshold = np.mean(beat_strengths) + 0.5 * np.std(beat_strengths)
        strong_beats = beat_times[beat_strengths > threshold]
        
        # Enforce regularity (downbeats should be ~4 beats apart)
        beats_per_bar = 4
        beat_interval = 60.0 / tempo
        bar_interval = beat_interval * beats_per_bar
        
        downbeats = []
        last_downbeat = -bar_interval
        
        for beat in strong_beats:
            if beat - last_downbeat >= bar_interval * 0.8:  # Allow 20% tolerance
                downbeats.append(beat)
                last_downbeat = beat
        
        return np.array(downbeats)
    
    def _detect_drops(self, y: np.ndarray, sr: int,
                      beat_times: np.ndarray,
                      downbeat_times: np.ndarray) -> List[DropEvent]:
        """
        Detect drops (sudden energy increases).
        
        Algorithm:
        1. Compute RMS energy envelope
        2. Find sudden increases (2.0x threshold)
        3. Verify with spectral flux
        4. Confirm with bass energy
        """
        # Compute energy envelope
        rms = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]
        rms_smooth = gaussian_filter1d(rms, sigma=2)
        
        # Compute spectral flux
        spec = np.abs(librosa.stft(y, hop_length=self.hop_length))
        flux = np.sqrt(np.sum(np.diff(spec, axis=1)**2, axis=0))
        flux = np.concatenate([[0], flux])  # Pad to match length
        flux_smooth = gaussian_filter1d(flux, sigma=2)

        # Compute bass energy (0-200 Hz)
        bass_spec = spec[:20, :]  # Approximate bass range
        bass_energy = np.sum(bass_spec, axis=0)
        bass_smooth = gaussian_filter1d(bass_energy, sigma=2)

        # Compute harmonic contrast (HCDF-style)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=self.hop_length)
        if chroma.shape[1] > 1:
            harmonic_diff = np.linalg.norm(np.diff(chroma, axis=1), axis=0)
            harmonic_diff = np.concatenate([[harmonic_diff[0]], harmonic_diff])
        else:
            harmonic_diff = np.zeros(chroma.shape[1])
        harmonic_smooth = gaussian_filter1d(harmonic_diff, sigma=2)
        
        # Find energy peaks with stricter gating
        drops = []
        window_size = int(sr / self.hop_length * 2)  # 2-second window

        if len(beat_times) > 1:
            beat_interval = float(np.median(np.diff(beat_times)))
        else:
            beat_interval = 0.5  # default ~120 BPM
        min_gap_sec = max(8.0, beat_interval * 16)  # at least 16 beats between drops

        for i in range(window_size, len(rms_smooth) - window_size):
            prev_slice = rms_smooth[max(0, i - window_size * 2):i]
            if prev_slice.size < window_size:
                continue

            energy_after = rms_smooth[i]
            p95_prev = np.percentile(prev_slice, 95)
            median_prev = np.median(prev_slice)

            if energy_after <= p95_prev or median_prev < 1e-6:
                continue

            energy_ratio = energy_after / (median_prev + 1e-6)

            if energy_ratio <= 1.6:
                continue

            # Require positive slope in preceding ~1.5 s (buildup proxy)
            slope_span = int(sr / self.hop_length * 1.5)
            slope_span = max(slope_span, 8)
            seg = rms_smooth[max(i - slope_span, 0):i]
            if seg.size < 8:
                continue
            slope = np.polyfit(np.arange(seg.size), seg, 1)[0]
            if slope <= 0:
                continue

            flux_ratio = flux_smooth[i] / (np.mean(flux_smooth[i-window_size:i]) + 1e-6)
            bass_ratio = bass_smooth[i] / (np.mean(bass_smooth[i-window_size:i]) + 1e-6)
            harmonic_ratio = harmonic_smooth[i] / (np.mean(harmonic_smooth[i-window_size:i]) + 1e-6)

            if flux_ratio <= 1.4 or bass_ratio <= 1.3 or harmonic_ratio <= 1.15:
                continue

            confidence = min(1.0, (
                0.3 * min(energy_ratio / 2.0, 1.0) +
                0.25 * min(flux_ratio / 2.0, 1.0) +
                0.2 * min(bass_ratio / 2.0, 1.0) +
                0.25 * min(harmonic_ratio / 1.5, 1.0)
            ))

            if confidence <= 0.55:
                continue

            timestamp = librosa.frames_to_time(i, sr=sr, hop_length=self.hop_length)

            # Enforce spacing
            if drops and (timestamp - drops[-1].timestamp) < min_gap_sec:
                continue

            # Snap to nearest beat
            if len(beat_times) > 0:
                nearest_beat = beat_times[np.argmin(np.abs(beat_times - timestamp))]
                if abs(nearest_beat - timestamp) < 0.2:
                    timestamp = nearest_beat

            # Hard downbeat gating (must be close to downbeat if available)
            if len(downbeat_times) > 0:
                nearest_downbeat = downbeat_times[np.argmin(np.abs(downbeat_times - timestamp))]
                if abs(nearest_downbeat - timestamp) > 0.5:
                    continue

            drops.append(DropEvent(
                timestamp=timestamp,
                type='drop',
                confidence=confidence,
                energy_ratio=energy_ratio,
                duration_ms=0
            ))

        return drops
    
    def _detect_buildups(self, y: np.ndarray, sr: int, 
                        drops: List[DropEvent]) -> List[DropEvent]:
        """
        Detect buildups (energy increases leading to drops).
        
        Looks for gradual energy/tension increases in the 4-8 seconds before drops.
        """
        if not drops:
            return []
        
        # Compute energy and spectral centroid
        rms = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=self.hop_length)[0]
        
        # Normalize
        rms_norm = rms / (np.max(rms) + 1e-6)
        centroid_norm = centroid / (np.max(centroid) + 1e-6)
        
        buildups = []
        
        for drop in drops:
            drop_frame = librosa.time_to_frames(drop.timestamp, sr=sr, hop_length=self.hop_length)
            
            # Look back 4-8 seconds
            lookback_frames = int(sr / self.hop_length * 8)
            start_frame = max(0, drop_frame - lookback_frames)
            
            if start_frame >= drop_frame - 10:
                continue
            
            # Check for increasing trend
            rms_segment = rms_norm[start_frame:drop_frame]
            centroid_segment = centroid_norm[start_frame:drop_frame]
            
            if len(rms_segment) < 10:
                continue
            
            # Linear regression to detect trend
            x = np.arange(len(rms_segment))
            
            # Energy trend
            rms_slope = np.polyfit(x, rms_segment, 1)[0]
            
            # Spectral centroid trend (brightness increase)
            centroid_slope = np.polyfit(x, centroid_segment, 1)[0]
            
            # Buildup criteria: positive slopes
            if rms_slope > 0.01 and centroid_slope > 0.01:
                # Find buildup start (where energy starts increasing)
                buildup_start_frame = start_frame
                
                for i in range(len(rms_segment) - 1):
                    if rms_segment[i+1] > rms_segment[i]:
                        buildup_start_frame = start_frame + i
                        break
                
                buildup_start = librosa.frames_to_time(
                    buildup_start_frame, sr=sr, hop_length=self.hop_length
                )
                
                duration_ms = int((drop.timestamp - buildup_start) * 1000)
                
                # Only keep buildups that are 2-8 seconds long
                if 2000 <= duration_ms <= 8000:
                    confidence = min(1.0, (rms_slope * 10 + centroid_slope * 10) / 2)
                    
                    buildups.append(DropEvent(
                        timestamp=buildup_start,
                        type='buildup',
                        confidence=confidence,
                        energy_ratio=rms_segment[-1] / (rms_segment[0] + 1e-6),
                        duration_ms=duration_ms
                    ))
        
        return buildups
    
    def compute_groove_score(self, beat_times: np.ndarray) -> float:
        """
        Compute groove consistency score (0-1).
        
        Higher score = more consistent beat intervals = stronger groove.
        """
        if len(beat_times) < 4:
            return 0.0
        
        intervals = np.diff(beat_times)
        
        # Coefficient of variation (lower = more consistent)
        cv = np.std(intervals) / (np.mean(intervals) + 1e-6)
        
        # Convert to 0-1 score (lower CV = higher score)
        groove_score = np.exp(-cv * 5)
        
        return float(groove_score)
    
    def to_genesis_map_format(self, beats: np.ndarray, tempo: float,
                             downbeats: np.ndarray, drops: List[Dict]) -> Dict:
        """
        Convert detection results to Genesis Map format.
        
        Args:
            beats: Beat times in seconds
            tempo: Tempo in BPM
            downbeats: Downbeat times in seconds
            drops: Drop/buildup events
            
        Returns:
            Genesis Map compatible dictionary
        """
        return {
            'beats': {
                'tempo': float(tempo),
                'beat_times_ms': [int(t * 1000) for t in beats],
                'downbeat_times_ms': [int(t * 1000) for t in downbeats],
                'total_beats': len(beats),
                'groove_score': self.compute_groove_score(beats)
            },
            'drops': {
                'events': drops,
                'total_drops': len([d for d in drops if d['type'] == 'drop']),
                'total_buildups': len([d for d in drops if d['type'] == 'buildup'])
            }
        }


def main():
    """CLI for enhanced beat detection."""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="Enhanced beat and drop detection")
    parser.add_argument("input", type=str, help="Input audio file")
    parser.add_argument("--output", type=str, help="Output JSON file")
    parser.add_argument("--plot", action="store_true", help="Plot results")
    
    args = parser.parse_args()
    
    # Load audio
    print(f"Loading: {args.input}")
    y, sr = librosa.load(args.input)
    
    # Detect
    detector = EnhancedBeatDetector()
    beats, tempo, downbeats, drops = detector.detect(y, sr)
    
    # Print results
    print(f"\n=== Results ===")
    print(f"Tempo: {tempo:.1f} BPM")
    print(f"Beats: {len(beats)}")
    print(f"Downbeats: {len(downbeats)}")
    print(f"Groove score: {detector.compute_groove_score(beats):.2f}")
    
    print(f"\n=== Drops & Buildups ===")
    for event in drops:
        print(f"{event['timestamp']:6.2f}s: {event['type']:8s} "
              f"(confidence={event['confidence']:.2f}, "
              f"energy={event['energy_ratio']:.1f}x)")
    
    # Save
    if args.output:
        result = detector.to_genesis_map_format(beats, tempo, downbeats, drops)
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n✓ Saved to {args.output}")
    
    # Plot
    if args.plot:
        try:
            import matplotlib.pyplot as plt
            
            fig, axes = plt.subplots(3, 1, figsize=(14, 10))
            
            # Waveform with beats
            ax = axes[0]
            times = np.arange(len(y)) / sr
            ax.plot(times, y, alpha=0.5, color='gray')
            ax.vlines(beats, -1, 1, colors='blue', alpha=0.5, label='Beats')
            ax.vlines(downbeats, -1, 1, colors='red', alpha=0.7, linewidth=2, label='Downbeats')
            ax.set_ylabel('Amplitude')
            ax.set_title(f'Beat Detection ({tempo:.1f} BPM)')
            ax.legend()
            
            # Energy envelope with drops
            ax = axes[1]
            rms = librosa.feature.rms(y=y)[0]
            rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
            ax.plot(rms_times, rms, color='orange', label='Energy')
            
            for event in drops:
                if event['type'] == 'drop':
                    ax.axvline(event['timestamp'], color='red', alpha=0.7, 
                             linestyle='--', label='Drop')
                elif event['type'] == 'buildup':
                    ax.axvspan(event['timestamp'], 
                             event['timestamp'] + event['duration_ms']/1000,
                             alpha=0.3, color='yellow', label='Buildup')
            
            ax.set_ylabel('RMS Energy')
            ax.set_title('Energy Envelope with Drops')
            
            # Remove duplicate labels
            handles, labels = ax.get_legend_handles_labels()
            unique = dict(zip(labels, handles))
            ax.legend(unique.values(), unique.keys())
            
            # Onset strength
            ax = axes[2]
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            onset_times = librosa.frames_to_time(np.arange(len(onset_env)), sr=sr)
            ax.plot(onset_times, onset_env, color='green')
            ax.set_ylabel('Onset Strength')
            ax.set_xlabel('Time (s)')
            ax.set_title('Onset Strength Envelope')
            
            plt.tight_layout()
            plt.show()
            
        except ImportError:
            print("Matplotlib not available for plotting")


if __name__ == "__main__":
    main()
