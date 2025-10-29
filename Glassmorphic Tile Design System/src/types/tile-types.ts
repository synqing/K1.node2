export interface TileParameters {
  id: string;
  name: string;
  blur: number;
  opacity: number;
  borderOpacity: number;
  shadowIntensity: number;
  glowIntensity: number;
  borderRadius: number;
  borderWidth: number;
  accentColor: string;
  surfaceColor: string;
}

export interface TilePreset extends TileParameters {
  category: 'light' | 'medium' | 'heavy';
  description: string;
}

export const DEFAULT_PRESETS: TilePreset[] = [
  // Light Variations
  {
    id: 'elegant-light',
    name: 'Elegant Light',
    category: 'light',
    description: 'Subtle elegance with gentle edge glow',
    blur: 5,
    opacity: 15,
    borderOpacity: 20,
    shadowIntensity: 10,
    glowIntensity: 15,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'minimal-frost',
    name: 'Minimal Frost',
    category: 'light',
    description: 'Ultra-minimal with thin border',
    blur: 3,
    opacity: 10,
    borderOpacity: 15,
    shadowIntensity: 5,
    glowIntensity: 8,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'soft-glow',
    name: 'Soft Glow',
    category: 'light',
    description: 'Gentle inner luminosity',
    blur: 4,
    opacity: 12,
    borderOpacity: 18,
    shadowIntensity: 8,
    glowIntensity: 20,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'clean-glass',
    name: 'Clean Glass',
    category: 'light',
    description: 'Crisp edges with clarity',
    blur: 6,
    opacity: 18,
    borderOpacity: 25,
    shadowIntensity: 12,
    glowIntensity: 10,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'whisper',
    name: 'Whisper',
    category: 'light',
    description: 'Barely there, maximum subtlety',
    blur: 2,
    opacity: 8,
    borderOpacity: 12,
    shadowIntensity: 4,
    glowIntensity: 6,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  
  // Medium Variations
  {
    id: 'elegant-medium',
    name: 'Elegant Medium',
    category: 'medium',
    description: 'Balanced presence and clarity',
    blur: 8,
    opacity: 25,
    borderOpacity: 30,
    shadowIntensity: 20,
    glowIntensity: 25,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'frosted-card',
    name: 'Frosted Card',
    category: 'medium',
    description: 'Classic frosted glass effect',
    blur: 10,
    opacity: 30,
    borderOpacity: 35,
    shadowIntensity: 25,
    glowIntensity: 20,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'ambient-glow',
    name: 'Ambient Glow',
    category: 'medium',
    description: 'Warm edge lighting',
    blur: 7,
    opacity: 22,
    borderOpacity: 28,
    shadowIntensity: 18,
    glowIntensity: 35,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#fbbf24',
    surfaceColor: '#ffffff'
  },
  {
    id: 'crystal-clear',
    name: 'Crystal Clear',
    category: 'medium',
    description: 'Sharp reflections and depth',
    blur: 9,
    opacity: 28,
    borderOpacity: 40,
    shadowIntensity: 30,
    glowIntensity: 15,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'balanced-frost',
    name: 'Balanced Frost',
    category: 'medium',
    description: 'Even lighting and texture',
    blur: 8,
    opacity: 24,
    borderOpacity: 32,
    shadowIntensity: 22,
    glowIntensity: 22,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  
  // Heavy Variations
  {
    id: 'frosted-heavy',
    name: 'Frosted Heavy',
    category: 'heavy',
    description: 'Bold presence with thick borders',
    blur: 15,
    opacity: 40,
    borderOpacity: 50,
    shadowIntensity: 40,
    glowIntensity: 30,
    borderRadius: 12,
    borderWidth: 2,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    category: 'heavy',
    description: 'Vibrant cyan edge glow',
    blur: 12,
    opacity: 35,
    borderOpacity: 45,
    shadowIntensity: 35,
    glowIntensity: 60,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#06b6d4',
    surfaceColor: '#ffffff'
  },
  {
    id: 'deep-glass',
    name: 'Deep Glass',
    category: 'heavy',
    description: 'Strong shadows and depth',
    blur: 18,
    opacity: 45,
    borderOpacity: 55,
    shadowIntensity: 50,
    glowIntensity: 25,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  },
  {
    id: 'holographic',
    name: 'Holographic',
    category: 'heavy',
    description: 'Rainbow edge effects',
    blur: 14,
    opacity: 38,
    borderOpacity: 48,
    shadowIntensity: 38,
    glowIntensity: 55,
    borderRadius: 12,
    borderWidth: 1,
    accentColor: '#a855f7',
    surfaceColor: '#ffffff'
  },
  {
    id: 'ultra-frost',
    name: 'Ultra Frost',
    category: 'heavy',
    description: 'Maximum frosted effect',
    blur: 20,
    opacity: 50,
    borderOpacity: 60,
    shadowIntensity: 45,
    glowIntensity: 35,
    borderRadius: 12,
    borderWidth: 2,
    accentColor: '#ffffff',
    surfaceColor: '#ffffff'
  }
];
