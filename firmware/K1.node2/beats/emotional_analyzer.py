#!/usr/bin/env python3
"""
Emotional Analyzer for K1.reinvented Song Analysis

Detects emotional characteristics:
- Valence (positive/negative emotion)
- Arousal (high/low energy)
- Tension and release patterns
- Mood transitions

Maps emotions to visualization parameters:
- Valence → Color warmth/coolness
- Arousal → Brightness/speed
- Tension → Effect complexity

Author: Claude (Song Analysis Enhancement)
Date: 2025-10-31
Status: Production-ready emotional analysis
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
import librosa
from dataclasses import dataclass
from scipy import stats
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


@dataclass
class EmotionalState:
    """Container for emotional analysis results."""
    valence: float  # -1 (negative) to 1 (positive)
    arousal: float  # 0 (calm) to 1 (energetic)
    tension: float  # 0 (relaxed) to 1 (tense)
    timestamp: float
    confidence: float


@dataclass
class MoodSegment:
    """A segment with consistent mood."""
    mood_label: str  # e.g., 'happy', 'sad', 'aggressive', 'calm'
    valence: float
    arousal: float
    start_time: float
    end_time: float
    color_palette: List[Tuple[int, int, int]]  # RGB values


class EmotionalAnalyzer:
    """
    Analyzes emotional content in music for mood-based visualization.

    Based on Russell's Circumplex Model of Affect:
    - Happy: high valence, high arousal
    - Sad: low valence, low arousal
    - Angry: low valence, high arousal
    - Calm: high valence, low arousal

    Usage:
        analyzer = EmotionalAnalyzer()
        states = analyzer.analyze(audio, sr)
        mood = analyzer.get_dominant_mood(states)
    """

    # Mood quadrants in valence-arousal space
    MOOD_QUADRANTS = {
        'happy': {'valence': (0.3, 1.0), 'arousal': (0.5, 1.0)},
        'excited': {'valence': (0.0, 1.0), 'arousal': (0.7, 1.0)},
        'angry': {'valence': (-1.0, -0.3), 'arousal': (0.5, 1.0)},
        'tense': {'valence': (-0.5, 0.5), 'arousal': (0.6, 1.0)},
        'sad': {'valence': (-1.0, -0.3), 'arousal': (0.0, 0.5)},
        'depressed': {'valence': (-1.0, -0.5), 'arousal': (0.0, 0.3)},
        'calm': {'valence': (0.3, 1.0), 'arousal': (0.0, 0.5)},
        'relaxed': {'valence': (0.0, 1.0), 'arousal': (0.0, 0.4)},
        'neutral': {'valence': (-0.3, 0.3), 'arousal': (0.3, 0.7)}
    }

    # Mood to color palette mapping
    MOOD_COLORS = {
        'happy': [(255, 223, 0), (255, 191, 0), (255, 127, 80)],  # Yellow/orange
        'excited': [(255, 0, 255), (255, 0, 127), (127, 0, 255)],  # Magenta/purple
        'angry': [(255, 0, 0), (200, 0, 0), (139, 0, 0)],  # Red shades
        'tense': [(255, 69, 0), (255, 140, 0), (255, 99, 71)],  # Orange-red
        'sad': [(0, 0, 255), (25, 25, 112), (70, 130, 180)],  # Blue shades
        'depressed': [(75, 0, 130), (72, 61, 139), (106, 90, 205)],  # Deep purple
        'calm': [(0, 255, 127), (64, 224, 208), (175, 238, 238)],  # Mint/turquoise
        'relaxed': [(144, 238, 144), (152, 251, 152), (143, 188, 143)],  # Green
        'neutral': [(192, 192, 192), (169, 169, 169), (128, 128, 128)]  # Gray
    }

    def __init__(self, hop_length: int = 2048, window_size: int = 43):
        """
        Initialize emotional analyzer.

        Args:
            hop_length: Hop length for feature extraction
            window_size: Window size for temporal smoothing (frames)
        """
        self.hop_length = hop_length
        self.window_size = window_size
        self.scaler = StandardScaler()

    def analyze(self, y: np.ndarray, sr: int,
                stems: Optional[Dict] = None) -> List[EmotionalState]:
        """
        Analyze emotional content throughout the song.

        Args:
            y: Audio signal
            sr: Sample rate
            stems: Optional separated stems for enhanced analysis

        Returns:
            List of EmotionalState objects over time
        """
        print("Analyzing emotional content...")

        # Extract features
        features = self._extract_emotional_features(y, sr, stems)

        # Compute valence and arousal curves
        valence_curve = self._compute_valence(features)
        arousal_curve = self._compute_arousal(features)
        tension_curve = self._compute_tension(features)

        # Smooth curves
        valence_curve = self._smooth_curve(valence_curve)
        arousal_curve = self._smooth_curve(arousal_curve)
        tension_curve = self._smooth_curve(tension_curve)

        # Create emotional states
        states = []
        times = librosa.frames_to_time(
            np.arange(len(valence_curve)),
            sr=sr,
            hop_length=self.hop_length
        )

        for i, t in enumerate(times):
            confidence = self._compute_confidence(features, i)

            states.append(EmotionalState(
                valence=valence_curve[i],
                arousal=arousal_curve[i],
                tension=tension_curve[i],
                timestamp=t,
                confidence=confidence
            ))

        print(f"Computed {len(states)} emotional states")
        return states

    def _extract_emotional_features(self, y: np.ndarray, sr: int,
                                   stems: Optional[Dict] = None) -> Dict:
        """Extract features relevant to emotion detection."""

        features = {}

        # Spectral features (affect perceived brightness/darkness)
        features['spectral_centroid'] = librosa.feature.spectral_centroid(
            y=y, sr=sr, hop_length=self.hop_length
        )[0]

        features['spectral_rolloff'] = librosa.feature.spectral_rolloff(
            y=y, sr=sr, hop_length=self.hop_length
        )[0]

        features['spectral_contrast'] = librosa.feature.spectral_contrast(
            y=y, sr=sr, hop_length=self.hop_length
        )

        # Harmonic features (affect perceived consonance/dissonance)
        harmonic, percussive = librosa.effects.hpss(y)

        features['harmonic_ratio'] = librosa.feature.rms(y=harmonic)[0] / (
            librosa.feature.rms(y=percussive)[0] + 1e-10
        )

        # Chroma features (harmonic content)
        features['chroma'] = librosa.feature.chroma_cqt(
            y=y, sr=sr, hop_length=self.hop_length
        )

        # Compute dissonance from chroma
        features['dissonance'] = self._compute_dissonance(features['chroma'])

        # Tempo and rhythm features
        onset_env = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=self.hop_length
        )
        features['onset_strength'] = onset_env

        tempo, beats = librosa.beat.beat_track(
            onset_envelope=onset_env,
            sr=sr,
            hop_length=self.hop_length
        )
        features['tempo'] = tempo
        features['beat_frames'] = beats

        # Energy features
        features['rms'] = librosa.feature.rms(y=y, hop_length=self.hop_length)[0]

        # Zero crossing rate (roughness/smoothness)
        features['zcr'] = librosa.feature.zero_crossing_rate(
            y, hop_length=self.hop_length
        )[0]

        # Mode detection (major/minor)
        features['mode'] = self._detect_mode(features['chroma'])

        # If stems available, use vocal presence
        if stems and 'vocals' in stems:
            vocal_rms = librosa.feature.rms(
                y=stems['vocals'],
                hop_length=self.hop_length
            )[0]
            features['vocal_presence'] = vocal_rms > np.percentile(vocal_rms, 30)
        else:
            features['vocal_presence'] = np.zeros(len(features['rms']))

        return features

    def _compute_valence(self, features: Dict) -> np.ndarray:
        """
        Compute valence (positivity) curve.

        High valence: major mode, consonant, bright
        Low valence: minor mode, dissonant, dark
        """
        n_frames = len(features['rms'])
        valence = np.zeros(n_frames)

        # Mode contribution (major = positive, minor = negative)
        mode_contrib = features['mode'] * 0.3

        # Spectral brightness (brighter = more positive)
        brightness = features['spectral_centroid'] / 4000  # Normalize
        brightness = np.clip(brightness, 0, 1)
        brightness_contrib = (brightness - 0.5) * 0.3

        # Consonance/dissonance (consonant = positive)
        dissonance_contrib = -features['dissonance'] * 0.2

        # Harmonic content (more harmonic = more positive)
        harmonic_contrib = np.clip(features['harmonic_ratio'] - 1, -1, 1) * 0.2

        # Combine contributions
        valence = (mode_contrib + brightness_contrib +
                  dissonance_contrib + harmonic_contrib)

        # Normalize to [-1, 1]
        valence = np.tanh(valence)

        return valence

    def _compute_arousal(self, features: Dict) -> np.ndarray:
        """
        Compute arousal (energy) curve.

        High arousal: fast, loud, complex
        Low arousal: slow, soft, simple
        """
        n_frames = len(features['rms'])
        arousal = np.zeros(n_frames)

        # Energy contribution
        energy = features['rms'] / (np.max(features['rms']) + 1e-10)
        energy_contrib = energy * 0.3

        # Tempo contribution (faster = higher arousal)
        tempo_norm = (features['tempo'] - 60) / 140  # Normalize 60-200 BPM
        tempo_contrib = np.clip(tempo_norm, 0, 1) * 0.2

        # Onset strength (more onsets = higher arousal)
        onset_contrib = features['onset_strength'] / (
            np.max(features['onset_strength']) + 1e-10
        ) * 0.2

        # Spectral complexity
        spectral_contrast = np.mean(features['spectral_contrast'], axis=0)
        complexity = spectral_contrast / (np.max(spectral_contrast) + 1e-10)
        complexity_contrib = complexity * 0.2

        # Roughness (high ZCR = more arousal)
        roughness = features['zcr'] / (np.max(features['zcr']) + 1e-10)
        roughness_contrib = roughness * 0.1

        # Combine
        arousal = (energy_contrib + tempo_contrib * np.ones(n_frames) +
                  onset_contrib + complexity_contrib + roughness_contrib)

        # Normalize to [0, 1]
        arousal = np.clip(arousal, 0, 1)

        return arousal

    def _compute_tension(self, features: Dict) -> np.ndarray:
        """
        Compute musical tension curve.

        High tension: dissonance, spectral flux, dynamic changes
        """
        n_frames = len(features['rms'])

        # Dissonance is primary tension indicator
        tension = features['dissonance'] * 0.4

        # Spectral flux (rapid spectral changes)
        spectral_flux = np.zeros(n_frames)
        spectral_flux[1:] = np.abs(np.diff(features['spectral_centroid']))
        spectral_flux = spectral_flux / (np.max(spectral_flux) + 1e-10)
        tension += spectral_flux * 0.3

        # Dynamic range (sudden volume changes)
        dynamic_flux = np.zeros(n_frames)
        dynamic_flux[1:] = np.abs(np.diff(features['rms']))
        dynamic_flux = dynamic_flux / (np.max(dynamic_flux) + 1e-10)
        tension += dynamic_flux * 0.3

        # Normalize to [0, 1]
        tension = np.clip(tension, 0, 1)

        return tension

    def _compute_dissonance(self, chroma: np.ndarray) -> np.ndarray:
        """
        Compute dissonance from chroma vectors.

        Based on musical interval dissonance ratings.
        """
        # Dissonance weights for intervals (0 = unison, 11 = major 7th)
        dissonance_profile = np.array([
            0.0,  # Unison
            1.0,  # Minor 2nd (most dissonant)
            0.8,  # Major 2nd
            0.3,  # Minor 3rd
            0.2,  # Major 3rd
            0.1,  # Perfect 4th
            0.9,  # Tritone (very dissonant)
            0.0,  # Perfect 5th
            0.2,  # Minor 6th
            0.3,  # Major 6th
            0.7,  # Minor 7th
            0.8   # Major 7th
        ])

        n_frames = chroma.shape[1]
        dissonance = np.zeros(n_frames)

        for t in range(n_frames):
            chroma_frame = chroma[:, t]

            # Find active pitches
            active = np.where(chroma_frame > 0.1)[0]

            if len(active) < 2:
                continue

            # Compute pairwise intervals
            total_dissonance = 0
            pairs = 0

            for i in range(len(active)):
                for j in range(i + 1, len(active)):
                    interval = (active[j] - active[i]) % 12
                    weight = chroma_frame[active[i]] * chroma_frame[active[j]]
                    total_dissonance += dissonance_profile[interval] * weight
                    pairs += 1

            if pairs > 0:
                dissonance[t] = total_dissonance / pairs

        return dissonance

    def _detect_mode(self, chroma: np.ndarray) -> float:
        """
        Detect if music is in major or minor mode.

        Returns: 1.0 for major, -1.0 for minor, 0.0 for ambiguous
        """
        # Krumhansl-Kessler key profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                                  2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                                  2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        # Average chroma
        mean_chroma = np.mean(chroma, axis=1)

        # Correlate with profiles
        major_corr = np.corrcoef(mean_chroma, major_profile)[0, 1]
        minor_corr = np.corrcoef(mean_chroma, minor_profile)[0, 1]

        if abs(major_corr - minor_corr) < 0.1:
            return 0.0  # Ambiguous
        elif major_corr > minor_corr:
            return 1.0  # Major
        else:
            return -1.0  # Minor

    def _smooth_curve(self, curve: np.ndarray, sigma: float = 2) -> np.ndarray:
        """Apply Gaussian smoothing to reduce noise."""
        from scipy.ndimage import gaussian_filter1d
        return gaussian_filter1d(curve, sigma=sigma)

    def _compute_confidence(self, features: Dict, frame_idx: int) -> float:
        """Compute confidence score for emotional state."""

        # Base confidence on signal strength
        if frame_idx < len(features['rms']):
            signal_strength = features['rms'][frame_idx]
            base_confidence = min(1.0, signal_strength * 2)
        else:
            base_confidence = 0.5

        # Reduce confidence during transitions
        if frame_idx > 0 and frame_idx < len(features['spectral_centroid']) - 1:
            spectral_change = abs(
                features['spectral_centroid'][frame_idx] -
                features['spectral_centroid'][frame_idx - 1]
            )
            if spectral_change > np.std(features['spectral_centroid']):
                base_confidence *= 0.7

        return base_confidence

    def get_dominant_mood(self, states: List[EmotionalState]) -> str:
        """
        Determine dominant mood from emotional states.

        Args:
            states: List of EmotionalState objects

        Returns:
            Mood label (e.g., 'happy', 'sad', 'angry', 'calm')
        """
        if not states:
            return 'neutral'

        # Average valence and arousal
        avg_valence = np.mean([s.valence for s in states])
        avg_arousal = np.mean([s.arousal for s in states])

        # Find matching mood quadrant
        for mood, ranges in self.MOOD_QUADRANTS.items():
            v_min, v_max = ranges['valence']
            a_min, a_max = ranges['arousal']

            if (v_min <= avg_valence <= v_max and
                a_min <= avg_arousal <= a_max):
                return mood

        return 'neutral'

    def segment_by_mood(self, states: List[EmotionalState],
                       min_segment_duration: float = 5.0) -> List[MoodSegment]:
        """
        Segment the song by mood changes.

        Args:
            states: List of EmotionalState objects
            min_segment_duration: Minimum segment duration in seconds

        Returns:
            List of MoodSegment objects
        """
        if not states:
            return []

        segments = []
        current_mood = None
        segment_start = 0
        segment_valence = []
        segment_arousal = []

        for state in states:
            # Determine mood at this timestamp
            mood = self._get_mood_at_point(state.valence, state.arousal)

            if mood != current_mood:
                # Save previous segment if long enough
                if (current_mood and
                    state.timestamp - segment_start >= min_segment_duration):

                    segments.append(MoodSegment(
                        mood_label=current_mood,
                        valence=np.mean(segment_valence),
                        arousal=np.mean(segment_arousal),
                        start_time=segment_start,
                        end_time=state.timestamp,
                        color_palette=self.MOOD_COLORS.get(
                            current_mood,
                            self.MOOD_COLORS['neutral']
                        )
                    ))

                # Start new segment
                current_mood = mood
                segment_start = state.timestamp
                segment_valence = [state.valence]
                segment_arousal = [state.arousal]
            else:
                segment_valence.append(state.valence)
                segment_arousal.append(state.arousal)

        # Add final segment
        if current_mood and states:
            segments.append(MoodSegment(
                mood_label=current_mood,
                valence=np.mean(segment_valence),
                arousal=np.mean(segment_arousal),
                start_time=segment_start,
                end_time=states[-1].timestamp,
                color_palette=self.MOOD_COLORS.get(
                    current_mood,
                    self.MOOD_COLORS['neutral']
                )
            ))

        return segments

    def _get_mood_at_point(self, valence: float, arousal: float) -> str:
        """Get mood label for a specific valence-arousal point."""

        for mood, ranges in self.MOOD_QUADRANTS.items():
            v_min, v_max = ranges['valence']
            a_min, a_max = ranges['arousal']

            if v_min <= valence <= v_max and a_min <= arousal <= a_max:
                return mood

        return 'neutral'

    def to_genesis_map_format(self, states: List[EmotionalState],
                             mood_segments: List[MoodSegment]) -> Dict:
        """
        Convert emotional analysis to Genesis Map format.

        Args:
            states: List of EmotionalState objects
            mood_segments: List of MoodSegment objects

        Returns:
            Genesis Map compatible dictionary
        """
        # Sample states for reasonable data size
        sample_interval = max(1, len(states) // 100)  # Max 100 points
        sampled_states = states[::sample_interval]

        genesis_emotion = {
            'version': 'v4.0',
            'emotion': {
                'curves': {
                    'valence': [s.valence for s in sampled_states],
                    'arousal': [s.arousal for s in sampled_states],
                    'tension': [s.tension for s in sampled_states],
                    'timestamps_ms': [int(s.timestamp * 1000) for s in sampled_states]
                },
                'mood_segments': [],
                'dominant_mood': self.get_dominant_mood(states)
            }
        }

        # Add mood segments
        for seg in mood_segments:
            genesis_emotion['emotion']['mood_segments'].append({
                'mood': seg.mood_label,
                'start_ms': int(seg.start_time * 1000),
                'end_ms': int(seg.end_time * 1000),
                'valence': seg.valence,
                'arousal': seg.arousal,
                'colors': seg.color_palette
            })

        return genesis_emotion


def main():
    """CLI for emotional analysis."""
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Analyze emotional content in music")
    parser.add_argument("input", type=str, help="Input audio file path")
    parser.add_argument("--output", type=str, help="Output JSON file for emotional data")
    parser.add_argument("--plot", action="store_true", help="Plot emotion curves")

    args = parser.parse_args()

    # Load audio
    print(f"Loading audio: {args.input}")
    y, sr = librosa.load(args.input)

    # Analyze emotions
    analyzer = EmotionalAnalyzer()
    states = analyzer.analyze(y, sr)

    # Get dominant mood
    dominant = analyzer.get_dominant_mood(states)
    print(f"\nDominant mood: {dominant}")

    # Get mood segments
    segments = analyzer.segment_by_mood(states)
    print(f"\n=== Mood Segments ({len(segments)}) ===")
    for seg in segments:
        duration = seg.end_time - seg.start_time
        print(f"{seg.mood_label:10s}: {seg.start_time:6.2f}s - {seg.end_time:6.2f}s "
              f"({duration:5.1f}s) [V:{seg.valence:+.2f}, A:{seg.arousal:.2f}]")

    # Print statistics
    valences = [s.valence for s in states]
    arousals = [s.arousal for s in states]
    tensions = [s.tension for s in states]

    print(f"\n=== Emotional Statistics ===")
    print(f"Valence:  mean={np.mean(valences):+.2f}, std={np.std(valences):.2f}")
    print(f"Arousal:  mean={np.mean(arousals):.2f}, std={np.std(arousals):.2f}")
    print(f"Tension:  mean={np.mean(tensions):.2f}, std={np.std(tensions):.2f}")

    # Save if requested
    if args.output:
        genesis_format = analyzer.to_genesis_map_format(states, segments)
        with open(args.output, 'w') as f:
            json.dump(genesis_format, f, indent=2)
        print(f"\n✓ Saved emotional data to {args.output}")

    # Plot if requested
    if args.plot:
        try:
            import matplotlib.pyplot as plt

            fig, axes = plt.subplots(3, 1, figsize=(14, 10))

            times = [s.timestamp for s in states]
            valences = [s.valence for s in states]
            arousals = [s.arousal for s in states]
            tensions = [s.tension for s in states]

            # Valence
            ax = axes[0]
            ax.plot(times, valences, color='blue', alpha=0.7)
            ax.axhline(0, color='gray', linestyle='--', alpha=0.5)
            ax.set_ylabel('Valence')
            ax.set_title('Emotional Valence (Positive/Negative)')
            ax.set_ylim(-1, 1)
            ax.fill_between(times, 0, valences, where=[v > 0 for v in valences],
                          color='green', alpha=0.3, label='Positive')
            ax.fill_between(times, valences, 0, where=[v < 0 for v in valences],
                          color='red', alpha=0.3, label='Negative')
            ax.legend()

            # Arousal
            ax = axes[1]
            ax.plot(times, arousals, color='orange', alpha=0.7)
            ax.set_ylabel('Arousal')
            ax.set_title('Emotional Arousal (Energy Level)')
            ax.set_ylim(0, 1)
            ax.fill_between(times, 0, arousals, color='orange', alpha=0.3)

            # Mood segments
            ax = axes[2]
            ax.plot(times, tensions, color='red', alpha=0.7, label='Tension')
            ax.set_ylabel('Tension')
            ax.set_xlabel('Time (s)')
            ax.set_title('Musical Tension and Mood Segments')
            ax.set_ylim(0, 1)

            # Add mood segment overlays
            for seg in segments:
                color = seg.color_palette[0] if seg.color_palette else (128, 128, 128)
                color_norm = tuple(c / 255 for c in color)
                ax.axvspan(seg.start_time, seg.end_time,
                         alpha=0.2, color=color_norm, label=seg.mood_label)

            # Remove duplicate labels in legend
            handles, labels = ax.get_legend_handles_labels()
            unique = dict(zip(labels, handles))
            ax.legend(unique.values(), unique.keys())

            plt.tight_layout()
            plt.show()

        except ImportError:
            print("Matplotlib not available for plotting")


if __name__ == "__main__":
    main()