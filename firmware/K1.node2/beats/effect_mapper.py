#!/usr/bin/env python3
"""
Effect Mapper for K1.reinvented LED Control

Translates audio analysis features to LED visualization effects.
Generates firmware-compatible control commands.

Maps:
- Beat → Pulse effects
- Bass → Warm colors, ground effects
- Vocals → Brightness, center focus
- Drops → Explosions, strobes
- Mood → Color palettes
- Structure → Scene transitions

Author: Claude (Song Analysis Enhancement)
Date: 2025-10-31
Status: Production-ready effect mapping
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import json
from enum import Enum


class EffectType(Enum):
    """Available LED effect types."""
    PULSE = "pulse"
    WAVE = "wave"
    STROBE = "strobe"
    FADE = "fade"
    SPARKLE = "sparkle"
    RIPPLE = "ripple"
    EXPLOSION = "explosion"
    SWEEP = "sweep"
    BREATHE = "breathe"
    RAINBOW = "rainbow"
    SOLID = "solid"
    GRADIENT = "gradient"


class EffectLayer(Enum):
    """Effect layering priority."""
    BACKGROUND = 0  # Ambient, mood-based
    RHYTHM = 1      # Beat-synced pulses
    MELODY = 2      # Harmonic highlights
    ACCENT = 3      # Drops, transitions
    OVERLAY = 4     # Temporary effects


@dataclass
class LEDEffect:
    """Single LED effect command."""
    type: EffectType
    layer: EffectLayer
    start_ms: int
    duration_ms: int
    intensity: float  # 0.0 to 1.0
    speed: float      # 0.0 to 1.0
    colors: List[Tuple[int, int, int]]  # RGB values
    params: Dict[str, Any]  # Effect-specific parameters


@dataclass
class FirmwareCommand:
    """Firmware-compatible LED control command."""
    timestamp_ms: int
    command: str  # Firmware function name
    args: List[Any]
    priority: int  # 0 = highest


class EffectMapper:
    """
    Maps audio features to LED effects.

    Usage:
        mapper = EffectMapper()

        # Add analysis results
        mapper.set_beats(beat_times)
        mapper.set_drops(drop_events)
        mapper.set_mood_segments(mood_segments)

        # Generate effects
        effects = mapper.generate_effects()

        # Convert to firmware commands
        commands = mapper.to_firmware_commands(effects)
    """

    # Effect templates for different musical events
    EFFECT_TEMPLATES = {
        'beat_pulse': {
            'type': EffectType.PULSE,
            'layer': EffectLayer.RHYTHM,
            'duration_ratio': 0.8,  # 80% of beat interval
            'intensity_range': (0.4, 0.8),
            'speed': 0.7
        },
        'drop_explosion': {
            'type': EffectType.EXPLOSION,
            'layer': EffectLayer.ACCENT,
            'duration_ms': 2000,
            'intensity': 1.0,
            'speed': 0.9
        },
        'vocal_breathe': {
            'type': EffectType.BREATHE,
            'layer': EffectLayer.MELODY,
            'duration_ms': 3000,
            'intensity_range': (0.3, 0.7),
            'speed': 0.3
        },
        'bass_wave': {
            'type': EffectType.WAVE,
            'layer': EffectLayer.RHYTHM,
            'duration_ms': 500,
            'intensity_range': (0.5, 0.9),
            'speed': 0.6
        },
        'chorus_rainbow': {
            'type': EffectType.RAINBOW,
            'layer': EffectLayer.BACKGROUND,
            'duration_ms': 10000,
            'intensity': 0.6,
            'speed': 0.4
        },
        'bridge_gradient': {
            'type': EffectType.GRADIENT,
            'layer': EffectLayer.BACKGROUND,
            'duration_ms': 8000,
            'intensity': 0.5,
            'speed': 0.2
        },
        'buildup_sweep': {
            'type': EffectType.SWEEP,
            'layer': EffectLayer.ACCENT,
            'duration_ms': 4000,
            'intensity_range': (0.2, 1.0),
            'speed_range': (0.3, 0.9)
        }
    }

    # Musical key to color mapping (hue values)
    KEY_TO_HUE = {
        'C': 0,      # Red
        'C#': 30,    # Orange-red
        'D': 45,     # Orange
        'D#': 60,    # Yellow-orange
        'E': 90,     # Yellow-green
        'F': 120,    # Green
        'F#': 150,   # Green-cyan
        'G': 210,    # Cyan
        'G#': 240,   # Blue
        'A': 270,    # Purple
        'A#': 300,   # Magenta
        'B': 330     # Pink
    }

    def __init__(self, led_count: int = 144, fps_target: int = 60):
        """
        Initialize effect mapper.

        Args:
            led_count: Number of LEDs in the strip
            fps_target: Target frames per second for effects
        """
        self.led_count = led_count
        self.fps_target = fps_target
        self.frame_duration_ms = 1000 // fps_target

        # Audio feature data
        self.beats = []
        self.drops = []
        self.mood_segments = []
        self.structural_segments = []
        self.harmonic_data = {}
        self.stem_features = {}
        self.emotional_states = []

    def set_beats(self, beat_times: List[float], downbeats: Optional[List[float]] = None):
        """Set beat timing information."""
        self.beats = [int(t * 1000) for t in beat_times]
        self.downbeats = [int(t * 1000) for t in (downbeats or [])]

    def set_drops(self, drop_events: List[Dict]):
        """Set drop detection results."""
        self.drops = drop_events

    def set_mood_segments(self, segments: List[Dict]):
        """Set mood segmentation data."""
        self.mood_segments = segments

    def set_structural_segments(self, segments: List[Dict]):
        """Set song structure segments."""
        self.structural_segments = segments

    def set_harmonic_data(self, data: Dict):
        """Set harmonic analysis results."""
        self.harmonic_data = data

    def set_stem_features(self, features: Dict):
        """Set stem separation features."""
        self.stem_features = features

    def set_emotional_states(self, states: List[Dict]):
        """Set emotional analysis results."""
        self.emotional_states = states

    def generate_effects(self, duration_ms: int = None) -> List[LEDEffect]:
        """
        Generate LED effects from all audio features.

        Args:
            duration_ms: Total duration in milliseconds

        Returns:
            List of LEDEffect objects
        """
        effects = []

        # 1. Background mood layer
        effects.extend(self._generate_mood_effects())

        # 2. Beat-synced rhythm layer
        effects.extend(self._generate_beat_effects())

        # 3. Bass response effects
        effects.extend(self._generate_bass_effects())

        # 4. Vocal highlight effects
        effects.extend(self._generate_vocal_effects())

        # 5. Drop and transition effects
        effects.extend(self._generate_drop_effects())

        # 6. Structural scene changes
        effects.extend(self._generate_structural_effects())

        # 7. Harmonic color shifts
        effects.extend(self._generate_harmonic_effects())

        # Sort by timestamp and layer
        effects.sort(key=lambda e: (e.start_ms, e.layer.value))

        return effects

    def _generate_mood_effects(self) -> List[LEDEffect]:
        """Generate background mood-based effects."""
        effects = []

        for segment in self.mood_segments:
            mood = segment.get('mood', 'neutral')
            start_ms = segment.get('start_ms', 0)
            end_ms = segment.get('end_ms', start_ms + 5000)
            colors = segment.get('colors', [(128, 128, 128)])

            # Choose effect based on mood
            if mood in ['happy', 'excited']:
                effect_type = EffectType.RAINBOW
                speed = 0.5
                intensity = 0.6
            elif mood in ['sad', 'depressed']:
                effect_type = EffectType.FADE
                speed = 0.2
                intensity = 0.3
            elif mood in ['angry', 'tense']:
                effect_type = EffectType.GRADIENT
                speed = 0.7
                intensity = 0.8
            else:
                effect_type = EffectType.SOLID
                speed = 0.3
                intensity = 0.4

            effects.append(LEDEffect(
                type=effect_type,
                layer=EffectLayer.BACKGROUND,
                start_ms=start_ms,
                duration_ms=end_ms - start_ms,
                intensity=intensity,
                speed=speed,
                colors=colors,
                params={'mood': mood}
            ))

        return effects

    def _generate_beat_effects(self) -> List[LEDEffect]:
        """Generate beat-synced pulse effects."""
        effects = []

        for i, beat_ms in enumerate(self.beats):
            # Determine beat interval
            if i < len(self.beats) - 1:
                interval_ms = self.beats[i + 1] - beat_ms
            else:
                interval_ms = 500  # Default

            # Stronger pulse on downbeats
            is_downbeat = beat_ms in self.downbeats
            intensity = 0.8 if is_downbeat else 0.5

            # Get color from current mood or harmonic context
            color = self._get_color_at_time(beat_ms)

            effects.append(LEDEffect(
                type=EffectType.PULSE,
                layer=EffectLayer.RHYTHM,
                start_ms=beat_ms,
                duration_ms=int(interval_ms * 0.8),
                intensity=intensity,
                speed=0.7,
                colors=[color],
                params={'is_downbeat': is_downbeat}
            ))

        return effects

    def _generate_bass_effects(self) -> List[LEDEffect]:
        """Generate bass-triggered wave effects."""
        effects = []

        if 'bass' not in self.stem_features:
            return effects

        bass_data = self.stem_features['bass']

        # Find bass hits (peaks in bass RMS)
        if 'rms' in bass_data:
            rms_curve = bass_data['rms']
            threshold = np.percentile(rms_curve, 80)  # Top 20% energy

            # Simple peak detection
            for i in range(1, len(rms_curve) - 1):
                if (rms_curve[i] > threshold and
                    rms_curve[i] > rms_curve[i-1] and
                    rms_curve[i] > rms_curve[i+1]):

                    # Convert frame to milliseconds
                    time_ms = int(i * self.frame_duration_ms * 10)  # Rough estimate

                    # Warm colors for bass
                    colors = [
                        (255, 100, 0),   # Orange
                        (255, 50, 0),    # Red-orange
                        (200, 50, 0)     # Dark orange
                    ]

                    effects.append(LEDEffect(
                        type=EffectType.WAVE,
                        layer=EffectLayer.RHYTHM,
                        start_ms=time_ms,
                        duration_ms=300,
                        intensity=float(rms_curve[i]),
                        speed=0.6,
                        colors=colors,
                        params={'direction': 'outward'}
                    ))

        return effects

    def _generate_vocal_effects(self) -> List[LEDEffect]:
        """Generate vocal-triggered breathing effects."""
        effects = []

        if 'vocals' not in self.stem_features:
            return effects

        vocal_data = self.stem_features['vocals']

        # Vocal presence creates breathing/glow effects
        if 'presence' in vocal_data:
            presence = vocal_data['presence']
            in_vocal = False
            start_time = 0

            for i, present in enumerate(presence):
                time_ms = int(i * self.frame_duration_ms * 10)

                if present and not in_vocal:
                    # Vocal section starts
                    in_vocal = True
                    start_time = time_ms
                elif not present and in_vocal:
                    # Vocal section ends
                    in_vocal = False

                    # Bright, centered colors for vocals
                    colors = [
                        (255, 255, 200),  # Warm white
                        (200, 200, 255),  # Cool white
                        (255, 200, 255)   # Pink white
                    ]

                    effects.append(LEDEffect(
                        type=EffectType.BREATHE,
                        layer=EffectLayer.MELODY,
                        start_ms=start_time,
                        duration_ms=time_ms - start_time,
                        intensity=0.6,
                        speed=0.3,
                        colors=colors,
                        params={'center_focus': True}
                    ))

        return effects

    def _generate_drop_effects(self) -> List[LEDEffect]:
        """Generate drop and buildup effects."""
        effects = []

        for drop in self.drops:
            drop_time_ms = int(drop.get('timestamp', 0) * 1000)
            drop_type = drop.get('type', 'drop')
            confidence = drop.get('confidence', 0.5)

            if drop_type == 'drop':
                # Explosion effect for drops
                effects.append(LEDEffect(
                    type=EffectType.EXPLOSION,
                    layer=EffectLayer.ACCENT,
                    start_ms=drop_time_ms,
                    duration_ms=2000,
                    intensity=1.0,
                    speed=0.9,
                    colors=[
                        (255, 255, 255),  # White flash
                        (255, 0, 0),      # Red
                        (255, 127, 0)     # Orange
                    ],
                    params={'strobe_count': 3}
                ))

                # Follow-up strobe
                effects.append(LEDEffect(
                    type=EffectType.STROBE,
                    layer=EffectLayer.ACCENT,
                    start_ms=drop_time_ms + 2000,
                    duration_ms=1000,
                    intensity=0.8,
                    speed=0.95,
                    colors=[(255, 255, 255)],
                    params={'frequency_hz': 10}
                ))

            elif drop_type == 'buildup':
                # Sweep effect for buildups
                buildup_duration = drop.get('duration_ms', 4000)

                effects.append(LEDEffect(
                    type=EffectType.SWEEP,
                    layer=EffectLayer.ACCENT,
                    start_ms=drop_time_ms - buildup_duration,
                    duration_ms=buildup_duration,
                    intensity=0.3,  # Start low
                    speed=0.3,       # Start slow
                    colors=[
                        (0, 0, 255),     # Blue
                        (0, 255, 255),   # Cyan
                        (255, 255, 255)  # White
                    ],
                    params={
                        'intensity_end': 1.0,  # Build to max
                        'speed_end': 0.9,      # Accelerate
                        'direction': 'up'
                    }
                ))

        return effects

    def _generate_structural_effects(self) -> List[LEDEffect]:
        """Generate scene changes for structural segments."""
        effects = []

        for i, segment in enumerate(self.structural_segments):
            label = segment.get('label', 'verse')
            start_ms = segment.get('start_ms', 0)
            end_ms = segment.get('end_ms', start_ms + 5000)

            # Scene presets for different sections
            if label == 'intro':
                # Gentle fade-in
                effects.append(LEDEffect(
                    type=EffectType.FADE,
                    layer=EffectLayer.BACKGROUND,
                    start_ms=start_ms,
                    duration_ms=min(5000, end_ms - start_ms),
                    intensity=0.0,  # Start from black
                    speed=0.2,
                    colors=[(0, 0, 100)],  # Deep blue
                    params={'fade_in': True, 'target_intensity': 0.4}
                ))

            elif label == 'chorus':
                # Energetic rainbow for chorus
                effects.append(LEDEffect(
                    type=EffectType.RAINBOW,
                    layer=EffectLayer.BACKGROUND,
                    start_ms=start_ms,
                    duration_ms=end_ms - start_ms,
                    intensity=0.7,
                    speed=0.5,
                    colors=[],  # Rainbow uses internal palette
                    params={'wave_length': 30}
                ))

            elif label == 'bridge':
                # Unique gradient for bridge
                effects.append(LEDEffect(
                    type=EffectType.GRADIENT,
                    layer=EffectLayer.BACKGROUND,
                    start_ms=start_ms,
                    duration_ms=end_ms - start_ms,
                    intensity=0.5,
                    speed=0.3,
                    colors=[
                        (128, 0, 128),  # Purple
                        (0, 128, 128),  # Teal
                        (128, 128, 0)   # Olive
                    ],
                    params={'blend_mode': 'smooth'}
                ))

            elif label == 'outro':
                # Fade to black
                effects.append(LEDEffect(
                    type=EffectType.FADE,
                    layer=EffectLayer.BACKGROUND,
                    start_ms=start_ms,
                    duration_ms=end_ms - start_ms,
                    intensity=0.4,
                    speed=0.1,
                    colors=[(0, 0, 0)],
                    params={'fade_out': True, 'target_intensity': 0.0}
                ))

        return effects

    def _generate_harmonic_effects(self) -> List[LEDEffect]:
        """Generate color shifts based on harmonic progression."""
        effects = []

        if 'progression' not in self.harmonic_data:
            return effects

        progression = self.harmonic_data['progression']

        for chord_event in progression:
            time_ms = chord_event.get('time_ms', 0)
            chord = chord_event.get('chord', 'C')
            confidence = chord_event.get('confidence', 0.5)

            if confidence > 0.3:
                # Get color for chord root
                root = chord.split(':')[0] if ':' in chord else chord[0]
                hue = self.KEY_TO_HUE.get(root, 0)
                color = self._hue_to_rgb(hue)

                # Sparkle effect for chord changes
                effects.append(LEDEffect(
                    type=EffectType.SPARKLE,
                    layer=EffectLayer.MELODY,
                    start_ms=time_ms,
                    duration_ms=500,
                    intensity=confidence,
                    speed=0.6,
                    colors=[color],
                    params={'density': 0.3}
                ))

        return effects

    def _get_color_at_time(self, time_ms: int) -> Tuple[int, int, int]:
        """Get the dominant color at a specific time."""

        # Check mood segments
        for segment in self.mood_segments:
            if segment['start_ms'] <= time_ms <= segment['end_ms']:
                colors = segment.get('colors', [(128, 128, 128)])
                return colors[0] if colors else (128, 128, 128)

        # Check harmonic data
        if 'key' in self.harmonic_data:
            key = self.harmonic_data['key'].split()[0]  # Get root note
            hue = self.KEY_TO_HUE.get(key, 0)
            return self._hue_to_rgb(hue)

        # Default
        return (128, 128, 128)

    def _hue_to_rgb(self, hue: float) -> Tuple[int, int, int]:
        """Convert HSV hue (0-360) to RGB."""
        import colorsys
        r, g, b = colorsys.hsv_to_rgb(hue / 360, 1.0, 1.0)
        return (int(r * 255), int(g * 255), int(b * 255))

    def to_firmware_commands(self, effects: List[LEDEffect]) -> List[FirmwareCommand]:
        """
        Convert effects to firmware-compatible commands.

        Args:
            effects: List of LEDEffect objects

        Returns:
            List of FirmwareCommand objects
        """
        commands = []

        for effect in effects:
            # Map effect types to firmware functions
            if effect.type == EffectType.PULSE:
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command="pulse_effect",
                    args=[
                        effect.intensity,
                        effect.speed,
                        effect.duration_ms,
                        effect.colors[0] if effect.colors else (255, 255, 255)
                    ],
                    priority=effect.layer.value
                )

            elif effect.type == EffectType.WAVE:
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command="wave_effect",
                    args=[
                        effect.params.get('direction', 'outward'),
                        effect.speed,
                        effect.intensity,
                        effect.colors[0] if effect.colors else (255, 0, 0)
                    ],
                    priority=effect.layer.value
                )

            elif effect.type == EffectType.STROBE:
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command="strobe_effect",
                    args=[
                        effect.params.get('frequency_hz', 10),
                        effect.duration_ms,
                        effect.colors[0] if effect.colors else (255, 255, 255)
                    ],
                    priority=effect.layer.value
                )

            elif effect.type == EffectType.EXPLOSION:
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command="explosion_effect",
                    args=[
                        self.led_count // 2,  # Center position
                        effect.speed,
                        effect.colors
                    ],
                    priority=effect.layer.value
                )

            elif effect.type == EffectType.RAINBOW:
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command="rainbow_effect",
                    args=[
                        effect.speed,
                        effect.params.get('wave_length', 30),
                        effect.intensity
                    ],
                    priority=effect.layer.value
                )

            else:
                # Generic effect command
                cmd = FirmwareCommand(
                    timestamp_ms=effect.start_ms,
                    command=f"{effect.type.value}_effect",
                    args=[effect.intensity, effect.speed, effect.duration_ms],
                    priority=effect.layer.value
                )

            commands.append(cmd)

        # Sort by timestamp and priority
        commands.sort(key=lambda c: (c.timestamp_ms, c.priority))

        return commands

    def export_to_file(self, effects: List[LEDEffect],
                       output_path: str, format: str = 'json'):
        """
        Export effects to file for firmware loading.

        Args:
            effects: List of effects to export
            output_path: Output file path
            format: 'json' or 'binary'
        """
        if format == 'json':
            # Convert to JSON-serializable format
            data = {
                'version': '1.0',
                'led_count': self.led_count,
                'fps': self.fps_target,
                'effects': [
                    {
                        'type': e.type.value,
                        'layer': e.layer.value,
                        'start_ms': e.start_ms,
                        'duration_ms': e.duration_ms,
                        'intensity': e.intensity,
                        'speed': e.speed,
                        'colors': e.colors,
                        'params': e.params
                    }
                    for e in effects
                ]
            }

            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2)

        elif format == 'binary':
            # Pack into compact binary format for embedded systems
            import struct

            with open(output_path, 'wb') as f:
                # Header
                f.write(struct.pack('I', len(effects)))  # Effect count

                # Effects
                for effect in effects:
                    # Pack effect data (simplified)
                    f.write(struct.pack(
                        'BBIIHH',
                        effect.type.value,
                        effect.layer.value,
                        effect.start_ms,
                        effect.duration_ms,
                        int(effect.intensity * 65535),  # 16-bit intensity
                        int(effect.speed * 65535)        # 16-bit speed
                    ))

                    # Pack first color
                    if effect.colors:
                        r, g, b = effect.colors[0]
                        f.write(struct.pack('BBB', r, g, b))
                    else:
                        f.write(struct.pack('BBB', 255, 255, 255))

        print(f"✓ Exported {len(effects)} effects to {output_path}")


def main():
    """CLI for effect mapping."""
    import argparse

    parser = argparse.ArgumentParser(description="Map audio features to LED effects")
    parser.add_argument("genesis_map", type=str,
                       help="Input Genesis Map JSON file")
    parser.add_argument("-o", "--output", type=str, default="effects.json",
                       help="Output file for effects")
    parser.add_argument("-f", "--format", choices=['json', 'binary'],
                       default='json', help="Output format")
    parser.add_argument("--leds", type=int, default=144,
                       help="Number of LEDs")
    parser.add_argument("--fps", type=int, default=60,
                       help="Target FPS")

    args = parser.parse_args()

    # Load Genesis Map
    print(f"Loading Genesis Map: {args.genesis_map}")
    with open(args.genesis_map, 'r') as f:
        genesis_data = json.load(f)

    # Create mapper
    mapper = EffectMapper(led_count=args.leds, fps_target=args.fps)

    # Load all feature data
    if 'beats' in genesis_data:
        beat_times = [t/1000 for t in genesis_data['beats']['beat_times_ms']]
        downbeat_times = [t/1000 for t in genesis_data['beats'].get('downbeat_times_ms', [])]
        mapper.set_beats(beat_times, downbeat_times)

    if 'drops' in genesis_data:
        mapper.set_drops(genesis_data['drops']['events'])

    if 'emotion' in genesis_data:
        mapper.set_mood_segments(genesis_data['emotion'].get('mood_segments', []))

    if 'structure' in genesis_data:
        mapper.set_structural_segments(genesis_data['structure'].get('segments', []))

    if 'harmony' in genesis_data:
        mapper.set_harmonic_data(genesis_data['harmony'])

    if 'stems' in genesis_data:
        mapper.set_stem_features(genesis_data['stems'])

    # Generate effects
    print("Generating LED effects...")
    effects = mapper.generate_effects()
    print(f"Generated {len(effects)} effects")

    # Print summary
    effect_counts = {}
    for effect in effects:
        effect_type = effect.type.value
        effect_counts[effect_type] = effect_counts.get(effect_type, 0) + 1

    print("\n=== Effect Summary ===")
    for effect_type, count in sorted(effect_counts.items()):
        print(f"{effect_type:15s}: {count:4d} effects")

    # Export
    mapper.export_to_file(effects, args.output, args.format)

    # Generate firmware commands
    print("\n=== Sample Firmware Commands ===")
    commands = mapper.to_firmware_commands(effects[:10])  # First 10
    for cmd in commands:
        print(f"{cmd.timestamp_ms:6d}ms: {cmd.command}({cmd.args})")


if __name__ == "__main__":
    main()