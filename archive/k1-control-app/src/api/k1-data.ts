// K1.reinvented Static Data
// Pattern metadata and palette definitions

import { K1PatternWithCategory, K1Palette } from '../types/k1-types';

// K1 Pattern Definitions (matches firmware pattern registry)
export const K1_PATTERNS: K1PatternWithCategory[] = [
  // Static Intentional Patterns
  {
    index: 0,
    id: 'departure',
    name: 'Departure',
    description: 'Transformation: earth → light → growth',
    is_audio_reactive: false,
    category: 'static',
    icon: 'Sunrise',
    color: '#84cc16' // Green for growth
  },
  {
    index: 1,
    id: 'lava',
    name: 'Lava',
    description: 'Intensity: black → red → orange → white',
    is_audio_reactive: false,
    category: 'static',
    icon: 'Flame',
    color: '#ef4444' // Red for intensity
  },
  {
    index: 2,
    id: 'twilight',
    name: 'Twilight',
    description: 'Peace: amber → purple → blue',
    is_audio_reactive: false,
    category: 'static',
    icon: 'Moon',
    color: '#8b5cf6' // Purple for twilight
  },

  // Audio-Reactive Patterns
  {
    index: 3,
    id: 'spectrum',
    name: 'Spectrum',
    description: 'Frequency visualization',
    is_audio_reactive: true,
    category: 'audio-reactive',
    icon: 'BarChart3',
    color: '#06b6d4' // Cyan for spectrum
  },
  {
    index: 4,
    id: 'octave',
    name: 'Octave',
    description: 'Octave band response',
    is_audio_reactive: true,
    category: 'audio-reactive',
    icon: 'Layers',
    color: '#f59e0b' // Orange for octaves
  },
  {
    index: 5,
    id: 'bloom',
    name: 'Bloom',
    description: 'VU-meter with persistence',
    is_audio_reactive: true,
    category: 'audio-reactive',
    icon: 'Flower2',
    color: '#10b981' // Green for bloom
  },

  // Beat/Tempo Reactive Patterns
  {
    index: 6,
    id: 'pulse',
    name: 'Pulse',
    description: 'Beat-synchronized radial waves',
    is_audio_reactive: true,
    category: 'beat-reactive',
    icon: 'Radio',
    color: '#6ee7f3' // K1 accent cyan
  },
  {
    index: 7,
    id: 'tempiscope',
    name: 'Tempiscope',
    description: 'Tempo visualization with phase',
    is_audio_reactive: true,
    category: 'beat-reactive',
    icon: 'Clock',
    color: '#a78bfa' // K1 accent purple
  },
  {
    index: 8,
    id: 'beat_tunnel',
    name: 'Beat Tunnel',
    description: 'Animated tunnel with beat persistence',
    is_audio_reactive: true,
    category: 'beat-reactive',
    icon: 'Zap',
    color: '#fbbf24' // Yellow for energy
  },

  // Procedural Patterns
  {
    index: 9,
    id: 'perlin',
    name: 'Perlin',
    description: 'Procedural noise field animation',
    is_audio_reactive: false,
    category: 'procedural',
    icon: 'Waves',
    color: '#ec4899' // Pink for procedural
  },
  {
    index: 10,
    id: 'void_trail',
    name: 'Void Trail',
    description: 'Ambient audio-responsive with 3 switchable modes',
    is_audio_reactive: true,
    category: 'procedural',
    icon: 'Sparkles',
    color: '#64748b' // Gray for void
  }
];

// K1 Palette Definitions (matches firmware palettes.h)
export const K1_PALETTES: K1Palette[] = [
  { id: 0, name: 'Sunset Real', gradient: 'linear-gradient(90deg, #7c2d12, #ea580c, #fbbf24, #fef3c7)' },
  { id: 1, name: 'Rivendell', gradient: 'linear-gradient(90deg, #064e3b, #059669, #34d399, #a7f3d0)' },
  { id: 2, name: 'Ocean Breeze 036', gradient: 'linear-gradient(90deg, #0c4a6e, #0284c7, #0ea5e9, #7dd3fc)' },
  { id: 3, name: 'RGI 15', gradient: 'linear-gradient(90deg, #7f1d1d, #dc2626, #f59e0b, #84cc16)' },
  { id: 4, name: 'Retro 2', gradient: 'linear-gradient(90deg, #581c87, #7c3aed, #a78bfa, #ddd6fe)' },
  { id: 5, name: 'Analogous 1', gradient: 'linear-gradient(90deg, #be185d, #db2777, #f472b6, #fbcfe8)' },
  { id: 6, name: 'Pink Splash 08', gradient: 'linear-gradient(90deg, #831843, #be185d, #ec4899, #f9a8d4)' },
  { id: 7, name: 'Coral Reef', gradient: 'linear-gradient(90deg, #7c2d12, #ea580c, #fb7185, #fda4af)' },
  { id: 8, name: 'Ocean Breeze 068', gradient: 'linear-gradient(90deg, #164e63, #0891b2, #06b6d4, #67e8f9)' },
  { id: 9, name: 'Pink Splash 07', gradient: 'linear-gradient(90deg, #9d174d, #db2777, #f472b6, #fce7f3)' },
  { id: 10, name: 'Vintage 01', gradient: 'linear-gradient(90deg, #92400e, #d97706, #f59e0b, #fde68a)' },
  { id: 11, name: 'Departure', gradient: 'linear-gradient(90deg, #422006, #92400e, #84cc16, #ecfccb)' },
  { id: 12, name: 'Landscape 64', gradient: 'linear-gradient(90deg, #365314, #65a30d, #84cc16, #d9f99d)' },
  { id: 13, name: 'Landscape 33', gradient: 'linear-gradient(90deg, #14532d, #16a34a, #22c55e, #bbf7d0)' },
  { id: 14, name: 'Rainbow Sherbet', gradient: 'linear-gradient(90deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #8b5cf6)' },
  { id: 15, name: 'GR65 Hult', gradient: 'linear-gradient(90deg, #1e3a8a, #3b82f6, #06b6d4, #10b981)' },
  { id: 16, name: 'GR64 Hult', gradient: 'linear-gradient(90deg, #1e40af, #2563eb, #0ea5e9, #06b6d4)' },
  { id: 17, name: 'GMT Dry Wet', gradient: 'linear-gradient(90deg, #92400e, #d97706, #06b6d4, #0284c7)' },
  { id: 18, name: 'IB Jul01', gradient: 'linear-gradient(90deg, #7c2d12, #dc2626, #f97316, #fbbf24)' },
  { id: 19, name: 'Vintage 57', gradient: 'linear-gradient(90deg, #78350f, #a16207, #ca8a04, #facc15)' },
  { id: 20, name: 'IB15', gradient: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7, #c084fc)' },
  { id: 21, name: 'Fuschia 7', gradient: 'linear-gradient(90deg, #86198f, #c026d3, #d946ef, #f0abfc)' },
  { id: 22, name: 'Emerald Dragon', gradient: 'linear-gradient(90deg, #064e3b, #047857, #10b981, #6ee7b7)' },
  { id: 23, name: 'Lava', gradient: 'linear-gradient(90deg, #000000, #7f1d1d, #dc2626, #f97316, #fbbf24)' },
  { id: 24, name: 'Fire', gradient: 'linear-gradient(90deg, #7f1d1d, #dc2626, #ea580c, #f97316, #ffffff)' },
  { id: 25, name: 'Colorful', gradient: 'linear-gradient(90deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #8b5cf6, #ec4899)' },
  { id: 26, name: 'Magenta Evening', gradient: 'linear-gradient(90deg, #581c87, #9333ea, #c026d3, #f0abfc)' },
  { id: 27, name: 'Pink Purple', gradient: 'linear-gradient(90deg, #be185d, #db2777, #a855f7, #c084fc)' },
  { id: 28, name: 'Autumn 19', gradient: 'linear-gradient(90deg, #7c2d12, #dc2626, #f59e0b, #eab308)' },
  { id: 29, name: 'Blue Magenta White', gradient: 'linear-gradient(90deg, #1e40af, #3b82f6, #c026d3, #ffffff)' },
  { id: 30, name: 'Black Magenta Red', gradient: 'linear-gradient(90deg, #000000, #86198f, #be185d, #dc2626)' },
  { id: 31, name: 'Red Magenta Yellow', gradient: 'linear-gradient(90deg, #dc2626, #be185d, #c026d3, #eab308)' },
  { id: 32, name: 'Blue Cyan Yellow', gradient: 'linear-gradient(90deg, #1e40af, #0284c7, #06b6d4, #eab308)' }
];

// Pattern categories for UI organization
export const PATTERN_CATEGORIES = {
  'static': {
    name: 'Static Patterns',
    description: 'Intentional artistic statements',
    color: '#84cc16'
  },
  'audio-reactive': {
    name: 'Audio Reactive',
    description: 'Respond to frequency analysis',
    color: '#06b6d4'
  },
  'beat-reactive': {
    name: 'Beat Reactive', 
    description: 'Synchronized to musical beats',
    color: '#6ee7f3'
  },
  'procedural': {
    name: 'Procedural',
    description: 'Algorithmic and noise-based',
    color: '#ec4899'
  }
} as const;

// Default parameter values (matches firmware defaults)
export const DEFAULT_PARAMETERS = {
  brightness: 100,    // 100% (1.0 in firmware)
  speed: 50,          // 50% (0.5 in firmware)
  saturation: 75,     // 75% (0.75 in firmware)
  warmth: 0,          // 0% (0.0 in firmware)
  softness: 25,       // 25% (0.25 in firmware)
  background: 25,     // 25% (0.25 in firmware)
  palette_id: 0       // Sunset Real palette
} as const;