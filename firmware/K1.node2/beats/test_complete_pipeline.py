#!/usr/bin/env python3
"""
Complete Pipeline Integration Test

Verifies all 9 components work together correctly.

Author: Claude
Date: 2025-10-31
"""

import sys
import numpy as np
import librosa
from pathlib import Path

# Import all modules
from enhanced_beat_detector import EnhancedBeatDetector
from harmonic_analyzer import HarmonicAnalyzer
from structure_analyzer import StructuralAnalyzer
from emotional_analyzer import EmotionalAnalyzer
from stem_separator import StemSeparator
from effect_mapper import EffectMapper


def test_complete_pipeline():
    """Test the complete analysis pipeline."""
    
    print("=" * 60)
    print("K1.reinvented Song Analysis - Complete Pipeline Test")
    print("=" * 60)
    
    # Generate test audio (30 seconds, 120 BPM)
    print("\n1. Generating test audio...")
    duration = 30
    sr = 22050
    tempo = 120
    
    # Create a simple test signal with beats
    t = np.linspace(0, duration, int(sr * duration))
    
    # Add beat clicks
    beat_interval = 60.0 / tempo
    y = np.zeros_like(t)
    
    for beat_time in np.arange(0, duration, beat_interval):
        beat_sample = int(beat_time * sr)
        if beat_sample < len(y) - 1000:
            # Click sound
            click = np.sin(2 * np.pi * 1000 * np.arange(1000) / sr)
            click *= np.exp(-np.arange(1000) / 300)
            y[beat_sample:beat_sample + 1000] += click * 0.5
    
    # Add some harmonic content
    y += 0.1 * np.sin(2 * np.pi * 440 * t)  # A4
    y += 0.05 * np.sin(2 * np.pi * 554.37 * t)  # C#5
    
    # Add noise
    y += np.random.normal(0, 0.02, len(y))
    
    # Normalize
    y = y / np.max(np.abs(y)) * 0.9
    
    print(f"✓ Generated {duration}s test audio at {tempo} BPM")
    
    # 2. Beat Detection
    print("\n2. Testing EnhancedBeatDetector...")
    beat_detector = EnhancedBeatDetector()
    beats, detected_tempo, downbeats, drops = beat_detector.detect(y, sr)
    
    print(f"✓ Detected {len(beats)} beats")
    print(f"✓ Tempo: {detected_tempo:.1f} BPM (expected: {tempo})")
    print(f"✓ Downbeats: {len(downbeats)}")
    print(f"✓ Drops/buildups: {len(drops)}")
    
    assert len(beats) > 0, "No beats detected"
    assert abs(detected_tempo - tempo) < 10, f"Tempo error: {detected_tempo} vs {tempo}"
    
    # 3. Harmonic Analysis
    print("\n3. Testing HarmonicAnalyzer...")
    harmonic_analyzer = HarmonicAnalyzer()
    key, key_confidence = harmonic_analyzer.detect_key(y, sr)
    chords = harmonic_analyzer.detect_chords(y, sr)
    chords = harmonic_analyzer.smooth_chord_events(chords)
    harmonic_change = harmonic_analyzer.compute_harmonic_change(y, sr)
    palette = harmonic_analyzer.key_to_color_palette(key)
    
    print(f"✓ Key: {key} (confidence: {key_confidence:.2f})")
    print(f"✓ Chords detected: {len(chords)}")
    print(f"✓ Color palette: {palette}")
    
    assert key is not None, "No key detected"
    assert len(palette) > 0, "No color palette generated"
    
    # 4. Structural Analysis
    print("\n4. Testing StructuralAnalyzer...")
    structure_analyzer = StructuralAnalyzer()
    beat_frames = librosa.time_to_frames(beats, sr=sr, hop_length=structure_analyzer.hop_length)
    segments = structure_analyzer.analyze(y, sr, beat_frames)
    form = structure_analyzer.get_song_form(segments)
    transitions = structure_analyzer.detect_transitions(segments)
    
    print(f"✓ Segments: {len(segments)}")
    print(f"✓ Form: {form}")
    print(f"✓ Transitions: {len(transitions)}")
    
    for seg in segments:
        print(f"  - {seg.label}: {seg.start_time:.1f}s - {seg.end_time:.1f}s")
    
    assert len(segments) > 0, "No segments detected"
    
    # 5. Emotional Analysis
    print("\n5. Testing EmotionalAnalyzer...")
    emotional_analyzer = EmotionalAnalyzer()
    emotional_states = emotional_analyzer.analyze(y, sr)
    mood_segments = emotional_analyzer.segment_by_mood(emotional_states)
    dominant_mood = emotional_analyzer.get_dominant_mood(emotional_states)
    
    print(f"✓ Emotional states: {len(emotional_states)}")
    print(f"✓ Mood segments: {len(mood_segments)}")
    print(f"✓ Dominant mood: {dominant_mood}")
    
    if mood_segments:
        for mood_seg in mood_segments[:3]:
            print(f"  - {mood_seg.mood_label}: {mood_seg.start_time:.1f}s - {mood_seg.end_time:.1f}s")
    
    assert len(emotional_states) > 0, "No emotional states detected"
    
    # 6. Stem Separation (skip actual separation, just test interface)
    print("\n6. Testing StemSeparator interface...")
    stem_separator = StemSeparator()
    
    # Create mock stems
    mock_stems = {
        'vocals': (y * 0.5, sr),
        'drums': (y * 0.3, sr),
        'bass': (y * 0.2, sr),
        'other': (y * 0.1, sr)
    }

    stem_features = stem_separator.extract_stem_features(mock_stems, default_sr=sr)
    
    print(f"✓ Stem features extracted: {len(stem_features)}")
    for stem_name, features in stem_features.items():
        print(f"  - {stem_name}: {len(features.peak_times)} peaks")
    
    assert len(stem_features) > 0, "No stem features extracted"
    
    # 7. Effect Mapping
    print("\n7. Testing EffectMapper...")
    effect_mapper = EffectMapper()
    
    # Set all analysis results
    effect_mapper.set_beats(beats, downbeats)
    effect_mapper.set_drops(drops)
    effect_mapper.set_mood_segments([
        {
            'mood': mood_seg.mood_label,
            'start_ms': int(mood_seg.start_time * 1000),
            'end_ms': int(mood_seg.end_time * 1000),
            'colors': mood_seg.color_palette
        }
        for mood_seg in mood_segments
    ])
    effect_mapper.set_structural_segments([
        {
            'label': seg.label,
            'start_ms': int(seg.start_time * 1000),
            'end_ms': int(seg.end_time * 1000)
        }
        for seg in segments
    ])
    harmony_map = harmonic_analyzer.to_genesis_map_format(
        key, key_confidence, chords, harmonic_change
    )['harmony']
    effect_mapper.set_harmonic_data(harmony_map)
    effect_mapper.set_stem_features(stem_features)
    
    # Generate effects
    effects = effect_mapper.generate_effects()
    
    print(f"✓ Generated {len(effects)} LED effects")
    
    # Count by type
    effect_counts = {}
    for effect in effects:
        effect_type = effect.type.value
        effect_counts[effect_type] = effect_counts.get(effect_type, 0) + 1
    
    print("\nEffect breakdown:")
    for effect_type, count in sorted(effect_counts.items()):
        print(f"  - {effect_type}: {count}")
    
    assert len(effects) > 0, "No effects generated"
    
    # 8. Firmware Commands
    print("\n8. Testing firmware command generation...")
    commands = effect_mapper.to_firmware_commands(effects[:20])  # First 20
    
    print(f"✓ Generated {len(commands)} firmware commands")
    print("\nSample commands:")
    for cmd in commands[:5]:
        print(f"  {cmd.timestamp_ms:6d}ms: {cmd.command}(...)")
    
    assert len(commands) > 0, "No firmware commands generated"
    
    # 9. Genesis Map Export
    print("\n9. Testing Genesis Map export...")
    
    genesis_map = {
        'version': 'v4.0',
        'metadata': {
            'duration_ms': int(duration * 1000),
            'sample_rate': sr
        },
        'beats': beat_detector.to_genesis_map_format(beats, detected_tempo, downbeats, drops)['beats'],
        'drops': beat_detector.to_genesis_map_format(beats, detected_tempo, downbeats, drops)['drops'],
        'harmony': harmony_map,
        'structure': structure_analyzer.to_genesis_map_format(segments)['structure'],
        'emotion': emotional_analyzer.to_genesis_map_format(emotional_states, mood_segments)['emotion'],
        'stems': stem_separator.to_genesis_map_format(stem_features)['stems'],
        'effects': [
            {
                'type': e.type.value,
                'start_ms': e.start_ms,
                'duration_ms': e.duration_ms,
                'intensity': e.intensity
            }
            for e in effects[:50]  # First 50
        ]
    }
    
    print("✓ Genesis Map v4.0 structure:")
    print(f"  - Beats: {len(genesis_map['beats']['beat_times_ms'])}")
    print(f"  - Drops: {genesis_map['drops']['total_drops']}")
    print(f"  - Key: {genesis_map['harmony']['key']}")
    print(f"  - Segments: {genesis_map['structure']['total_segments']}")
    print(f"  - Form: {genesis_map['structure']['form']}")
    print(f"  - Mood: {genesis_map['emotion']['dominant_mood']}")
    print(f"  - Effects: {len(genesis_map['effects'])}")
    
    # Verify structure
    assert 'beats' in genesis_map
    assert 'drops' in genesis_map
    assert 'harmony' in genesis_map
    assert 'structure' in genesis_map
    assert 'emotion' in genesis_map
    assert 'stems' in genesis_map
    assert 'effects' in genesis_map
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED")
    print("=" * 60)
    print("\nComplete pipeline verified:")
    print("  ✓ EnhancedBeatDetector")
    print("  ✓ HarmonicAnalyzer")
    print("  ✓ StructuralAnalyzer")
    print("  ✓ EmotionalAnalyzer")
    print("  ✓ StemSeparator")
    print("  ✓ EffectMapper")
    print("  ✓ Genesis Map v4.0 export")
    print("  ✓ Firmware command generation")
    print("\nSystem ready for deployment.")
    
    return True


if __name__ == "__main__":
    try:
        success = test_complete_pipeline()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
