// K1 Pattern Hints Catalog
// Comprehensive helper suggestions per pattern: modes, presets, and palette picks.

import { K1Parameters } from '../types/k1-types';

export type ColorModeKey = 'static' | 'jitter' | 'travel' | 'harmonic' | 'range';

export interface K1HintsConfig {
  default_divergence_tolerance: Record<string, number>;
  default_debounce_ms: number;
}

export interface K1PatternHints {
  mode_order: ColorModeKey[];
  presets: Array<{ label: string; params: Partial<K1Parameters>; description?: string; tolerance?: Record<string, number> }>;
  recommended_palettes?: number[]; // palette_id list
  notes?: string[];
  divergence_tolerance?: Record<string, number>;
  debounce_ms?: number;
}

export const K1_HINTS_CONFIG: K1HintsConfig = {
  default_divergence_tolerance: {
    color: 1,
    color_range: 5,
    brightness: 3,
    saturation: 3,
    custom_param_1: 0,
    custom_param_2: 0,
    custom_param_3: 0,
    default: 2,
  },
  default_debounce_ms: 200,
};

// Helper: encode harmonic set choices into custom_param_2
const harmonicCode = {
  complementary: 1,
  triad: 2,
  tetrad: 3,
} as const;

// Helper: mode code mapping for custom_param_1
const modeCode = (m: ColorModeKey): number =>
  m === 'static' ? 0 : m === 'jitter' ? 1 : m === 'travel' ? 2 : m === 'harmonic' ? 3 : 4;

// Notes:
// - brightness, saturation left adjustable; presets set sensible defaults where helpful.
// - color_range doubles as randomness amplitude except in range mode where it is span width.
// - travel uses custom_param_3 as speed; accent probability uses custom_param_2.
// - harmonic uses custom_param_2 to encode set (1/2/3).

export const K1_PATTERN_HINTS: Record<string, K1PatternHints> = {
  departure: {
    mode_order: ['harmonic', 'range', 'static'],
    presets: [
      {
        label: 'Harmonic • Triad',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.triad, color_range: 30 },
        description: 'Three-way harmony; gentle randomness for living feel.',
      },
      {
        label: 'Warm Range',
        params: { custom_param_1: modeCode('range'), color: 12, color_range: 20 },
        description: 'Focus on warm earthy tones; good for branding.',
      },
        {
        label: 'Still Color',
        params: { custom_param_1: modeCode('static'), color_range: 0 },
        description: 'Clean intentional static look.',
      },
    ],
    recommended_palettes: [11, 10, 0], // Departure, Vintage 01, Sunset Real
    notes: ['Prefers warm palettes; harmonic adds structure without chaos.'],
    divergence_tolerance: { color: 1, color_range: 5, saturation: 3, brightness: 3, default: 2 },
  },
  lava: {
    mode_order: ['range', 'jitter', 'harmonic'],
    presets: [
      {
        label: 'Molten Range',
        params: { custom_param_1: modeCode('range'), color: 8, color_range: 25 },
        description: 'Black→red→orange band with controlled span.',
      },
      {
        label: 'Alive Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 20 },
        description: 'Subtle randomness to keep the heat moving.',
      },
      {
        label: 'Harmonic • Complement',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.complementary, color_range: 15 },
        description: 'Strong dual contrast while staying fiery.',
      },
    ],
    recommended_palettes: [3, 28, 31], // RGI 15, Autumn 19, Red Magenta Yellow
    notes: ['Keep saturation high; modest randomness prevents washout.'],
    divergence_tolerance: { color: 2, color_range: 6, saturation: 4, brightness: 3, default: 2 },
  },
  twilight: {
    mode_order: ['harmonic', 'range', 'jitter'],
    presets: [
      {
        label: 'Harmonic • Tetrad',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.tetrad, color_range: 25 },
        description: 'Purple–amber–blue structures; cinematic vibe.',
      },
      {
        label: 'Cool Range',
        params: { custom_param_1: modeCode('range'), color: 260, color_range: 30 },
        description: 'Blue–purple span; tranquil feel.',
      },
      {
        label: 'Gentle Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 12 },
        description: 'Soft movement without breaking mood.',
      },
    ],
    recommended_palettes: [4, 26, 29], // Retro 2 (purple), Magenta Evening, Blue Magenta White
    notes: ['Lower brightness can deepen mood; try triad for balance.'],
    divergence_tolerance: { color: 2, color_range: 7, saturation: 4, brightness: 4, default: 2 },
  },
  spectrum: {
    mode_order: ['travel', 'jitter', 'harmonic'],
    presets: [
      {
        label: 'Flow Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 55, color_range: 15 },
        description: 'Color moves steadily; fits frequency visualization.',
      },
      {
        label: 'Reactive Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 28 },
        description: 'Liveliness that complements changing audio.',
      },
      {
        label: 'Harmonic • Triad',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.triad, color_range: 20 },
        description: 'Keeps intervals pleasing when motion is busy.',
      },
    ],
    recommended_palettes: [2, 8, 32], // Ocean Breeze 036/068, Blue Cyan Yellow
    notes: ['Moderate speed; avoid over-wide range to keep definition.'],
    divergence_tolerance: { color: 2, color_range: 8, saturation: 4, brightness: 4, custom_param_3: 0, default: 2 },
  },
  octave: {
    mode_order: ['harmonic', 'travel', 'jitter'],
    presets: [
      {
        label: 'Harmonic • Complement',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.complementary, color_range: 18 },
        description: 'Clear dual tones mirror octave bands.',
      },
      {
        label: 'Band Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 45, color_range: 15 },
        description: 'Motion across bands; steady pace.',
      },
      {
        label: 'Light Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 12 },
        description: 'Small per-band color breath.',
      },
    ],
    recommended_palettes: [3, 27, 32],
    notes: ['Use harmonic for clarity; accents sparingly for readability.'],
    divergence_tolerance: { color: 2, color_range: 7, saturation: 3, brightness: 3, custom_param_2: 0, default: 2 },
  },
  bloom: {
    mode_order: ['travel', 'jitter', 'harmonic'],
    presets: [
      {
        label: 'Velvet Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 40, custom_param_2: 12, color_range: 20 },
        description: 'Smooth motion with occasional accents; suits persistence.',
      },
      {
        label: 'Garden Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 22 },
        description: 'Organic color breathing for blooms.',
      },
      {
        label: 'Harmonic • Triad',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.triad, color_range: 18 },
        description: 'Pleasant triads; avoids harsh swings.',
      },
    ],
    recommended_palettes: [1, 11, 12], // Rivendell, Departure, Landscape 64
    notes: ['Mid brightness; higher saturation gives lush feel.'],
    divergence_tolerance: { color: 2, color_range: 7, saturation: 4, brightness: 4, default: 2 },
  },
  pulse: {
    mode_order: ['travel', 'harmonic', 'jitter'],
    presets: [
      {
        label: 'Beat Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 60, color_range: 12 },
        description: 'Beat-synced feel with forward motion.',
        tolerance: { color_range: 10 },
      },
      {
        label: 'Harmonic • Complement',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.complementary, color_range: 15 },
        description: 'Punchy dual colors around beats.',
      },
      {
        label: 'Snap Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 18 },
        description: 'Adds unpredictability to pulses.',
      },
    ],
    recommended_palettes: [6, 7, 31],
    notes: ['Accent probability can spike on transients; try 15–25%.'],
    divergence_tolerance: { color: 3, saturation: 5, brightness: 5, color_range: 8, custom_param_1: 0, custom_param_2: 0, custom_param_3: 0, default: 2 },
    debounce_ms: 300,
  },
  tempiscope: {
    mode_order: ['travel', 'harmonic', 'jitter'],
    presets: [
      {
        label: 'Tempo Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 50, color_range: 15 },
        description: 'Phase-aware motion with moderate speed.',
      },
      {
        label: 'Harmonic • Triad',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.triad, color_range: 16 },
        description: 'Stable triads keep tempo visualization readable.',
      },
      {
        label: 'Lite Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 10 },
        description: 'Subtle variation without confusion.',
      },
    ],
    recommended_palettes: [2, 8, 32],
    notes: ['Avoid extremes; clarity beats chaos for tempo.'],
    divergence_tolerance: { color: 2, color_range: 8, saturation: 4, brightness: 4, custom_param_3: 0, default: 2 },
    debounce_ms: 300,
  },
  beat_tunnel: {
    mode_order: ['travel', 'jitter', 'harmonic'],
    presets: [
      {
        label: 'Tunnel Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 65, custom_param_2: 18, color_range: 20 },
        description: 'Strong forward motion with occasional accents.',
        tolerance: { color_range: 10 },
      },
      {
        label: 'Playful Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 25 },
        description: 'Keeps tunnel visuals lively without drifting too much.',
      },
      {
        label: 'Harmonic • Complement',
        params: { custom_param_1: modeCode('harmonic'), custom_param_2: harmonicCode.complementary, color_range: 18 },
        description: 'Clean contrasts inside motion-heavy visuals.',
      },
    ],
    recommended_palettes: [29, 32, 8],
    notes: ['Higher speed works well; keep range moderate to avoid smear.'],
    divergence_tolerance: { color: 3, color_range: 10, saturation: 4, brightness: 4, custom_param_2: 0, default: 2 },
    debounce_ms: 300,
  },
  perlin: {
    mode_order: ['travel', 'range', 'jitter'],
    presets: [
      {
        label: 'Field Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 35, color_range: 18 },
        description: 'Slow motion suits noise fields.',
      },
      {
        label: 'Cool Range',
        params: { custom_param_1: modeCode('range'), color: 200, color_range: 25 },
        description: 'Blue–cyan span for procedural calm.',
      },
      {
        label: 'Soft Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 10 },
        description: 'Mild variation keeps texture alive.',
      },
    ],
    recommended_palettes: [2, 8, 12],
    notes: ['Lower brightness reduces banding; saturation between 60–80%.'],
    divergence_tolerance: { color: 2, color_range: 7, saturation: 4, brightness: 3, default: 2 },
  },
  void_trail: {
    mode_order: ['travel', 'jitter', 'range'],
    presets: [
      {
        label: 'Ambient Travel',
        params: { custom_param_1: modeCode('travel'), custom_param_3: 30, color_range: 15 },
        description: 'Ambient audio modes favor gentle motion.',
      },
      {
        label: 'Void Jitter',
        params: { custom_param_1: modeCode('jitter'), color_range: 12 },
        description: 'Subtle hue perturbation for ambience.',
      },
      {
        label: 'Muted Range',
        params: { custom_param_1: modeCode('range'), color: 210, color_range: 18 },
        description: 'Cool span; suits gray/void feel.',
      },
    ],
    recommended_palettes: [12, 2, 8],
    notes: ['Accent probability: 5–12% for ambient; avoid high speeds.'],
    divergence_tolerance: { color: 2, color_range: 7, saturation: 4, brightness: 3, default: 2 },
  },
};