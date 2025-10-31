#!/usr/bin/env python3
"""
Structural Analyzer for K1.reinvented Song Analysis

Detects song structure:
- Intro, verse, chorus, bridge, outro
- Transitions and boundaries
- Song form (e.g., "ABABCB")

Uses:
- Self-similarity matrices
- Spectral clustering
- Novelty detection

Author: Claude (Song Analysis Enhancement)
Date: 2025-10-31
Status: Production-ready
"""

import numpy as np
import librosa
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from scipy import signal
from scipy.ndimage import gaussian_filter, uniform_filter
from sklearn.cluster import KMeans


@dataclass
class Segment:
    """A structural segment of the song."""
    label: str  # 'intro', 'verse', 'chorus', 'bridge', 'outro', 'instrumental'
    start_time: float  # seconds
    end_time: float  # seconds
    confidence: float  # 0-1


@dataclass
class Transition:
    """A transition between segments."""
    time: float  # seconds
    from_label: str
    to_label: str
    strength: float  # 0-1


class StructuralAnalyzer:
    """
    Analyzes song structure for scene-based LED control.
    
    Algorithm:
    1. Compute self-similarity matrix from MFCCs
    2. Detect boundaries using novelty function
    3. Cluster segments by similarity
    4. Label segments based on features
    
    Usage:
        analyzer = StructuralAnalyzer()
        segments = analyzer.analyze(y, sr)
        form = analyzer.get_song_form(segments)
    """
    
    # Typical segment durations (seconds)
    SEGMENT_DURATIONS = {
        'intro': (5, 30),
        'verse': (15, 45),
        'chorus': (15, 45),
        'bridge': (10, 30),
        'outro': (5, 30),
        'instrumental': (10, 60)
    }
    
    def __init__(self, hop_length: int = 512):
        """
        Initialize structural analyzer.
        
        Args:
            hop_length: Hop length for feature extraction
        """
        self.hop_length = hop_length
    
    def analyze(self, y: np.ndarray, sr: int,
                beat_frames: Optional[np.ndarray] = None) -> List[Segment]:
        """
        Analyze song structure.
        
        Args:
            y: Audio signal
            sr: Sample rate
            beat_frames: Optional beat frame indices for beat-synchronous analysis
            
        Returns:
            List of Segment objects
        """
        print("Analyzing song structure...")
        
        # 1. Extract features
        features = self._extract_features(y, sr)
        
        # 2. Detect boundaries on beat-synchronous causal features
        boundaries = self._detect_boundaries_beat_sync(
            y=y,
            sr=sr,
            features=features,
            beat_frames=beat_frames
        )
        
        # 3. Cluster segments
        segment_features = self._extract_segment_features(features, boundaries)
        labels = self._cluster_segments(segment_features)
        
        # 4. Label segments semantically
        segments = self._label_segments(boundaries, labels, segment_features, len(y)/sr, sr)
        
        print(f"Detected {len(segments)} structural segments")
        
        return segments
    
    def _extract_features(self, y: np.ndarray, sr: int) -> np.ndarray:
        """
        Extract features for structural analysis.
        
        Uses MFCCs, chroma, and spectral features.
        """
        # MFCCs (timbre)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=self.hop_length)
        
        # Chroma (harmony)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=self.hop_length)
        
        # Spectral contrast (texture)
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr, hop_length=self.hop_length)
        
        # Tonnetz (harmonic relationships)
        tonnetz = librosa.feature.tonnetz(y=y, sr=sr, hop_length=self.hop_length)
        
        # Combine features
        features = np.vstack([mfcc, chroma, contrast, tonnetz])
        
        # Normalize each feature dimension
        features = librosa.util.normalize(features, axis=1)
        
        return features
    
    def _compute_similarity_matrix(self, features: np.ndarray) -> np.ndarray:
        """
        Compute self-similarity matrix.
        
        Args:
            features: Feature matrix (n_features x n_frames)
            
        Returns:
            Similarity matrix (n_frames x n_frames)
        """
        # Compute cosine similarity
        # Normalize features
        features_norm = features / (np.linalg.norm(features, axis=0, keepdims=True) + 1e-10)
        
        # Similarity = dot product of normalized features
        similarity = features_norm.T @ features_norm
        
        # Apply Gaussian smoothing to reduce noise
        similarity = gaussian_filter(similarity, sigma=1)
        
        return similarity
    
    def _detect_boundaries_beat_sync(
        self,
        y: np.ndarray,
        sr: int,
        features: np.ndarray,
        beat_frames: Optional[np.ndarray] = None,
        bars_min: int = 4,
        kernel_bars: int = 4
    ) -> np.ndarray:
        """
        Beat-synchronous, causal-friendly boundary detection.

        Aggregates features per beat, builds a path-enhanced recurrence matrix,
        derives a novelty curve in the beat domain, and peak-picks with EDM-aware spacing.
        """
        import numpy as _np
        import librosa as _lb

        # If we have beat frames, sync; otherwise operate on raw frames.
        beat_times: Optional[_np.ndarray] = None
        if beat_frames is not None and len(beat_frames) >= 4:
            beat_frames = _np.asarray(beat_frames, dtype=int)
            Fb = _lb.util.sync(features, beat_frames, aggregate=_np.median)
            frame_at_beat = beat_frames
            beat_times = _lb.frames_to_time(beat_frames, sr=sr, hop_length=self.hop_length)
        else:
            Fb = features
            frame_at_beat = _np.arange(features.shape[1], dtype=int)
            beat_frames = None

        # Path-enhanced recurrence (affinity) matrix
        R = _lb.segment.recurrence_matrix(
            Fb, k=20, metric="cosine", mode="affinity", sym=True
        )
        A = _lb.segment.path_enhance(R, 5)

        # Novelty via recurrence-to-lag
        L = _lb.segment.recurrence_to_lag(A, pad=False)
        novelty = _np.sum(L, axis=0).astype(float)
        try:
            from scipy.ndimage import gaussian_filter1d as _g1d
            novelty = _g1d(novelty, sigma=2)
        except Exception:
            pass

        # Additional cues (harmonic change + energy derivative) if beat info available
        fusion_weights = (0.5, 0.3, 0.2)
        if beat_frames is not None and len(beat_frames) >= 8:
            # Harmonic change
            chroma = _lb.feature.chroma_cqt(y=y, sr=sr, hop_length=self.hop_length)
            chroma_sync = _lb.util.sync(chroma, beat_frames, aggregate=_np.median)
            if chroma_sync.shape[1] > 1:
                harm_change = _np.linalg.norm(_np.diff(chroma_sync, axis=1), axis=0)
                harm_change = _np.concatenate([[harm_change[0]], harm_change])
            else:
                harm_change = _np.zeros(chroma_sync.shape[1])

            # RMS change
            rms = _lb.feature.rms(y=y, hop_length=self.hop_length)[0]
            rms_sync = _lb.util.sync(rms.reshape(1, -1), beat_frames, aggregate=_np.mean)[0]
            if rms_sync.size > 1:
                rms_diff = _np.abs(_np.diff(rms_sync, prepend=rms_sync[0]))
            else:
                rms_diff = _np.zeros_like(rms_sync)

            def _zscore(arr):
                mu = arr.mean()
                sigma = arr.std()
                if sigma < 1e-6:
                    return _np.zeros_like(arr)
                return (arr - mu) / sigma

            nov_z = _zscore(novelty)
            harm_z = _zscore(harm_change)
            rms_z = _zscore(rms_diff)

            novelty = (
                fusion_weights[0] * nov_z[:novelty.size] +
                fusion_weights[1] * harm_z[:novelty.size] +
                fusion_weights[2] * rms_z[:novelty.size]
            )

        # Determine beats-per-bar (default 4); if no beat info, approximate
        beats_per_bar = 4
        if beat_times is not None and beat_times.size > 1:
            median_beat = float(_np.median(_np.diff(beat_times)))
            if median_beat > 0:
                tempo_est = 60.0 / median_beat
                # assume 4/4; adjust if tempo extremely low/high
                if tempo_est > 180:
                    beats_per_bar = 2
                elif tempo_est < 80:
                    beats_per_bar = 8

        min_beats = max(beats_per_bar * bars_min, beats_per_bar * 3)
        kernel_beats = max(beats_per_bar * kernel_bars, beats_per_bar * 2)

        pre_max = max(1, kernel_beats // 2)
        post_max = pre_max
        pre_avg = kernel_beats
        post_avg = kernel_beats

        delta = float(max(0.0, _np.std(novelty) * 0.2))

        peaks = _lb.util.peak_pick(
            novelty,
            pre_max=pre_max,
            post_max=post_max,
            pre_avg=pre_avg,
            post_avg=post_avg,
            delta=delta,
            wait=min_beats
        )

        beat_indices = _np.array([], dtype=int)
        if peaks.size > 0:
            beat_indices = peaks

        # Add high-magnitude harmonic change peaks as supplemental boundaries
        if beat_times is not None and beat_times.size == novelty.size and len(harm_change):
            harm_scores = _zscore(harm_change)
            if harm_scores.size:
                harm_threshold = _np.percentile(harm_scores, 90)
                if harm_threshold > 0:
                    harm_peaks = _np.where(harm_scores >= harm_threshold)[0]
                    beat_indices = _np.concatenate([beat_indices, harm_peaks])

        if beat_indices.size == 0:
            total_beats = len(frame_at_beat)
            fallback_count = max(3, min(6, total_beats // max(beats_per_bar * 4, 1)))
            fallback = _np.linspace(0, total_beats - 1, num=fallback_count, dtype=int)
            beat_indices = fallback

        beat_indices = _np.unique(_np.concatenate([[0], beat_indices, [len(frame_at_beat) - 1]]))

        boundary_frames = frame_at_beat[_np.clip(beat_indices, 0, len(frame_at_beat) - 1)]

        # Ensure final frame is included
        last_frame = int(_np.ceil(len(y) / self.hop_length))
        boundary_frames = _np.unique(_np.concatenate([boundary_frames, [last_frame]]))

        # Deduplicate and prune via helper
        boundary_frames = boundary_frames[_np.diff(boundary_frames, prepend=-1) > 0]
        boundary_frames = self._prune_boundaries(boundary_frames, sr)

        # Fallback safeguard: ensure at least a few segments
        if boundary_frames.size <= 2:
            fallback_count = 6
            fallback = _np.linspace(0, last_frame, num=fallback_count, dtype=int)
            boundary_frames = _np.unique(fallback)

        return boundary_frames

    def _prune_boundaries(self, boundaries: np.ndarray, sr: int,
                          min_duration: float = 6.0) -> np.ndarray:
        """
        Remove boundaries that create segments shorter than min_duration seconds.

        Args:
            boundaries: Boundary frame indices
            sr: Sample rate
            min_duration: Minimum allowed segment duration in seconds

        Returns:
            Pruned boundary indices
        """
        if len(boundaries) <= 2:
            return boundaries

        boundary_times = librosa.frames_to_time(boundaries, sr=sr, hop_length=self.hop_length)
        keep = [0]  # always keep first boundary

        for idx in range(1, len(boundaries) - 1):
            prev_time = boundary_times[keep[-1]]
            curr_time = boundary_times[idx]
            next_time = boundary_times[idx + 1]

            left_duration = curr_time - prev_time
            right_duration = next_time - curr_time

            if left_duration < min_duration or right_duration < min_duration:
                # Skip this boundary; it would create a very short segment
                continue

            keep.append(idx)

        keep.append(len(boundaries) - 1)  # always keep final boundary
        pruned = boundaries[keep]

        return pruned
    
    def _extract_segment_features(self, features: np.ndarray,
                                  boundaries: np.ndarray) -> List[np.ndarray]:
        """
        Extract average features for each segment.
        
        Args:
            features: Feature matrix
            boundaries: Boundary frame indices
            
        Returns:
            List of feature vectors (one per segment)
        """
        segment_features = []
        
        for i in range(len(boundaries) - 1):
            start = boundaries[i]
            end = boundaries[i + 1]

            if end <= start:
                continue
            
            # Average features over segment
            seg_feat = np.mean(features[:, start:end], axis=1)
            segment_features.append(seg_feat)
        
        return segment_features
    
    def _cluster_segments(self, segment_features: List[np.ndarray],
                         n_clusters: Optional[int] = None) -> np.ndarray:
        """
        Cluster segments by similarity.
        
        Args:
            segment_features: List of feature vectors
            n_clusters: Number of clusters (auto-detect if None)
            
        Returns:
            Cluster labels for each segment
        """
        if len(segment_features) < 2:
            return np.array([0])
        
        # Convert to matrix
        X = np.array(segment_features)
        
        # Auto-detect number of clusters (typically 3-5 for verse/chorus/bridge)
        if n_clusters is None:
            n_clusters = min(5, max(2, len(segment_features) // 3))
        
        # K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)
        
        return labels
    
    def _label_segments(self, boundaries: np.ndarray, cluster_labels: np.ndarray,
                       segment_features: List[np.ndarray],
                       duration: float, sr: int) -> List[Segment]:
        """
        Assign semantic labels to segments.

        Args:
            boundaries: Boundary frame indices
            cluster_labels: Cluster assignments
            segment_features: Feature vectors
            duration: Total song duration
            sr: Sample rate

        Returns:
            List of labeled Segment objects
        """
        segments = []
        
        # Convert boundaries to times
        boundary_times = librosa.frames_to_time(
            boundaries, sr=sr, hop_length=self.hop_length
        )
        
        # Count cluster occurrences
        cluster_counts = np.bincount(cluster_labels)
        
        # Most common cluster is likely chorus
        chorus_cluster = np.argmax(cluster_counts)
        
        # Assign labels based on position and cluster
        for i in range(len(cluster_labels)):
            start_time = boundary_times[i]
            end_time = boundary_times[i + 1]
            seg_duration = end_time - start_time

            if seg_duration <= 0:
                continue
            
            cluster = cluster_labels[i]
            
            # Determine label based on position and cluster
            if i == 0 and start_time < 30:
                # First segment is likely intro
                label = 'intro'
                confidence = 0.8
            
            elif i == len(cluster_labels) - 1 and end_time > duration - 30:
                # Last segment is likely outro
                label = 'outro'
                confidence = 0.8
            
            elif cluster == chorus_cluster:
                # Most common cluster is chorus
                label = 'chorus'
                confidence = 0.7
            
            elif seg_duration < 20:
                # Short segments might be transitions or instrumental breaks
                label = 'instrumental'
                confidence = 0.5
            
            else:
                # Check if it's a bridge (unique cluster appearing once in middle)
                if cluster_counts[cluster] == 1 and 0.3 < start_time/duration < 0.8:
                    label = 'bridge'
                    confidence = 0.6
                else:
                    # Default to verse
                    label = 'verse'
                    confidence = 0.6
            
            segments.append(Segment(
                label=label,
                start_time=start_time,
                end_time=end_time,
                confidence=confidence
            ))
        
        # Post-process: merge very short segments
        segments = self._merge_short_segments(segments, min_duration=5.0)
        
        return segments
    
    def _merge_short_segments(self, segments: List[Segment],
                             min_duration: float = 5.0) -> List[Segment]:
        """
        Merge segments that are too short.
        
        Args:
            segments: List of segments
            min_duration: Minimum segment duration in seconds
            
        Returns:
            Merged segments
        """
        if len(segments) <= 1:
            return segments
        
        merged = []

        current = segments[0]
        for next_seg in segments[1:]:
            duration = current.end_time - current.start_time
            if duration >= min_duration:
                merged.append(current)
                current = next_seg
            else:
                # Merge with the next segment, prefer the label with higher confidence
                start_time = current.start_time
                end_time = next_seg.end_time
                if next_seg.confidence >= current.confidence:
                    label = next_seg.label
                    confidence = next_seg.confidence
                else:
                    label = current.label
                    confidence = current.confidence
                current = Segment(
                    label=label,
                    start_time=start_time,
                    end_time=end_time,
                    confidence=confidence * 0.95
                )

        if current:
            merged.append(current)

        return merged
    
    def get_song_form(self, segments: List[Segment]) -> str:
        """
        Get song form notation (e.g., "ABABCB").
        
        Args:
            segments: List of segments
            
        Returns:
            Form string
        """
        # Map labels to letters
        label_to_letter = {}
        current_letter = ord('A')
        form = []
        
        for seg in segments:
            label = seg.label
            
            # Skip intro/outro in form notation
            if label in ['intro', 'outro']:
                form.append('I' if label == 'intro' else 'O')
                continue
            
            # Assign letter to label
            if label not in label_to_letter:
                label_to_letter[label] = chr(current_letter)
                current_letter += 1
            
            form.append(label_to_letter[label])
        
        return ''.join(form)
    
    def detect_transitions(self, segments: List[Segment]) -> List[Transition]:
        """
        Detect transitions between segments.
        
        Args:
            segments: List of segments
            
        Returns:
            List of Transition objects
        """
        transitions = []
        
        for i in range(len(segments) - 1):
            current = segments[i]
            next_seg = segments[i + 1]
            
            # Transition occurs at segment boundary
            time = current.end_time
            
            # Strength based on label change significance
            if current.label == next_seg.label:
                strength = 0.3  # Weak transition (same section)
            elif (current.label == 'verse' and next_seg.label == 'chorus') or \
                 (current.label == 'chorus' and next_seg.label == 'verse'):
                strength = 0.8  # Strong transition (verse-chorus)
            elif next_seg.label == 'bridge' or current.label == 'bridge':
                strength = 0.9  # Very strong (bridge transition)
            else:
                strength = 0.6  # Moderate transition
            
            transitions.append(Transition(
                time=time,
                from_label=current.label,
                to_label=next_seg.label,
                strength=strength
            ))
        
        return transitions
    
    def to_genesis_map_format(self, segments: List[Segment]) -> Dict:
        """
        Convert structural analysis to Genesis Map format.
        
        Args:
            segments: List of segments
            
        Returns:
            Genesis Map compatible dictionary
        """
        transitions = self.detect_transitions(segments)
        
        return {
            'structure': {
                'segments': [
                    {
                        'label': s.label,
                        'start_ms': int(s.start_time * 1000),
                        'end_ms': int(s.end_time * 1000),
                        'confidence': s.confidence,
                        'duration_ms': int((s.end_time - s.start_time) * 1000)
                    }
                    for s in segments
                ],
                'transitions': [
                    {
                        'time_ms': int(t.time * 1000),
                        'from': t.from_label,
                        'to': t.to_label,
                        'strength': t.strength
                    }
                    for t in transitions
                ],
                'form': self.get_song_form(segments),
                'total_segments': len(segments)
            }
        }


def main():
    """CLI for structural analysis."""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="Song structure analysis")
    parser.add_argument("input", type=str, help="Input audio file")
    parser.add_argument("--output", type=str, help="Output JSON file")
    parser.add_argument("--plot", action="store_true", help="Plot structure")
    
    args = parser.parse_args()
    
    # Load audio
    print(f"Loading: {args.input}")
    y, sr = librosa.load(args.input)
    
    # Analyze
    analyzer = StructuralAnalyzer()
    segments = analyzer.analyze(y, sr)
    
    # Print results
    print(f"\n=== Song Structure ===")
    print(f"Form: {analyzer.get_song_form(segments)}")
    print(f"\nSegments ({len(segments)}):")
    
    for seg in segments:
        duration = seg.end_time - seg.start_time
        print(f"{seg.start_time:6.2f}s - {seg.end_time:6.2f}s: "
              f"{seg.label:12s} ({duration:5.1f}s, conf={seg.confidence:.2f})")
    
    # Transitions
    transitions = analyzer.detect_transitions(segments)
    print(f"\n=== Transitions ({len(transitions)}) ===")
    for t in transitions:
        print(f"{t.time:6.2f}s: {t.from_label:12s} → {t.to_label:12s} "
              f"(strength={t.strength:.2f})")
    
    # Save
    if args.output:
        result = analyzer.to_genesis_map_format(segments)
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n✓ Saved to {args.output}")
    
    # Plot
    if args.plot:
        try:
            import matplotlib.pyplot as plt
            
            fig, axes = plt.subplots(2, 1, figsize=(14, 8))
            
            # Waveform with segments
            ax = axes[0]
            times = np.arange(len(y)) / sr
            ax.plot(times, y, alpha=0.3, color='gray')
            
            # Color segments
            colors = {
                'intro': 'blue',
                'verse': 'green',
                'chorus': 'red',
                'bridge': 'purple',
                'outro': 'orange',
                'instrumental': 'yellow'
            }
            
            for seg in segments:
                color = colors.get(seg.label, 'gray')
                ax.axvspan(seg.start_time, seg.end_time, alpha=0.3, color=color)
                
                # Add label
                mid_time = (seg.start_time + seg.end_time) / 2
                ax.text(mid_time, 0, seg.label, ha='center', va='bottom',
                       fontsize=10, fontweight='bold')
            
            ax.set_ylabel('Amplitude')
            ax.set_title(f'Song Structure - Form: {analyzer.get_song_form(segments)}')
            
            # Timeline
            ax = axes[1]
            
            for i, seg in enumerate(segments):
                color = colors.get(seg.label, 'gray')
                ax.barh(0, seg.end_time - seg.start_time, left=seg.start_time,
                       height=0.5, color=color, alpha=0.7, edgecolor='black')
                
                # Add label
                mid_time = (seg.start_time + seg.end_time) / 2
                ax.text(mid_time, 0, seg.label, ha='center', va='center',
                       fontsize=9, fontweight='bold')
            
            # Mark transitions
            for t in transitions:
                ax.axvline(t.time, color='black', linestyle='--', alpha=0.5)
            
            ax.set_xlim(0, len(y)/sr)
            ax.set_ylim(-0.5, 0.5)
            ax.set_xlabel('Time (s)')
            ax.set_title('Structural Timeline')
            ax.set_yticks([])
            
            plt.tight_layout()
            plt.show()
            
        except ImportError:
            print("Matplotlib not available for plotting")


if __name__ == "__main__":
    main()
