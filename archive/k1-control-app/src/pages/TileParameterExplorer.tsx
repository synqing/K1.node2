import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Copy, Shuffle, Save, Eye, EyeOff, RotateCcw, Trash2, Download } from 'lucide-react';
import './TileParameterExplorer.css';

interface TileParameters {
  id: string;
  name: string;
  // Core Glass Properties
  blur: number;
  opacity: number;
  surfaceOpacity: number;
  // Lighting & Effects
  edgeLighting: number;
  glowIntensity: number;
  glowColor: string;
  // Gradients & Colors
  gradientStart: string;
  gradientEnd: string;
  backgroundTint: string;
  // Borders & Shape
  borderThickness: number;
  borderRadius: number;
  borderOpacity: number;
  // Shadows & Depth
  shadowIntensity: number;
  shadowBlur: number;
  shadowColor: string;
  // Reflections & Surface
  reflectionIntensity: number;
  surfaceTexture: number;
  // Advanced Properties
  noiseIntensity: number;
  distortionAmount: number;
  lightSourceAngle: number;
}

interface SavedDiscovery {
  id: string;
  name: string;
  parameters: TileParameters;
  createdAt: string;
  tags: string[];
}

const DEFAULT_PARAMETERS: TileParameters = {
  id: 'custom',
  name: 'Custom',
  blur: 12,
  opacity: 0.25,
  surfaceOpacity: 0.15,
  edgeLighting: 0.4,
  glowIntensity: 0.0,
  glowColor: '#00ffff',
  gradientStart: 'rgba(255, 255, 255, 0.3)',
  gradientEnd: 'rgba(255, 255, 255, 0.1)',
  backgroundTint: 'rgba(255, 255, 255, 0.05)',
  borderThickness: 1.5,
  borderRadius: 16,
  borderOpacity: 0.3,
  shadowIntensity: 0.3,
  shadowBlur: 20,
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  reflectionIntensity: 0.5,
  surfaceTexture: 0.0,
  noiseIntensity: 0.0,
  distortionAmount: 0.0,
  lightSourceAngle: 45,
};

const PRESET_LIBRARY: TileParameters[] = [
  // Light Intensity Presets
  {
    id: 'elegant-light',
    name: 'Elegant Light',
    blur: 8, opacity: 0.15, surfaceOpacity: 0.1,
    edgeLighting: 0.3, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(255, 255, 255, 0.2)', gradientEnd: 'rgba(255, 255, 255, 0.05)',
    backgroundTint: 'rgba(255, 255, 255, 0.03)',
    borderThickness: 1, borderRadius: 16, borderOpacity: 0.25,
    shadowIntensity: 0.2, shadowBlur: 15, shadowColor: 'rgba(0, 0, 0, 0.2)',
    reflectionIntensity: 0.4, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'crystal-clear',
    name: 'Crystal Clear',
    blur: 5, opacity: 0.1, surfaceOpacity: 0.08,
    edgeLighting: 0.4, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(255, 255, 255, 0.15)', gradientEnd: 'rgba(240, 240, 255, 0.05)',
    backgroundTint: 'rgba(250, 250, 255, 0.02)',
    borderThickness: 0.5, borderRadius: 8, borderOpacity: 0.2,
    shadowIntensity: 0.15, shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.15)',
    reflectionIntensity: 0.25, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'minimal-ghost',
    name: 'Minimal Ghost',
    blur: 4, opacity: 0.08, surfaceOpacity: 0.05,
    edgeLighting: 0.2, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(255, 255, 255, 0.1)', gradientEnd: 'rgba(250, 250, 255, 0.03)',
    backgroundTint: 'rgba(255, 255, 255, 0.01)',
    borderThickness: 0.5, borderRadius: 6, borderOpacity: 0.15,
    shadowIntensity: 0.1, shadowBlur: 8, shadowColor: 'rgba(0, 0, 0, 0.1)',
    reflectionIntensity: 0.15, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'frosted-light',
    name: 'Frosted Light',
    blur: 6, opacity: 0.2, surfaceOpacity: 0.12,
    edgeLighting: 0.6, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(200, 220, 255, 0.25)', gradientEnd: 'rgba(150, 180, 255, 0.1)',
    backgroundTint: 'rgba(180, 200, 255, 0.05)',
    borderThickness: 1, borderRadius: 20, borderOpacity: 0.3,
    shadowIntensity: 0.25, shadowBlur: 18, shadowColor: 'rgba(0, 0, 0, 0.25)',
    reflectionIntensity: 0.3, surfaceTexture: 0.1, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'warm-subtle',
    name: 'Warm Subtle',
    blur: 10, opacity: 0.18, surfaceOpacity: 0.12,
    edgeLighting: 0.35, glowIntensity: 0.1, glowColor: '#ffaa66',
    gradientStart: 'rgba(255, 220, 180, 0.22)', gradientEnd: 'rgba(255, 200, 150, 0.08)',
    backgroundTint: 'rgba(255, 210, 170, 0.04)',
    borderThickness: 1, borderRadius: 14, borderOpacity: 0.25,
    shadowIntensity: 0.22, shadowBlur: 16, shadowColor: 'rgba(0, 0, 0, 0.22)',
    reflectionIntensity: 0.35, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },

  // Medium Intensity Presets
  {
    id: 'elegant-medium',
    name: 'Elegant Medium',
    blur: 12, opacity: 0.25, surfaceOpacity: 0.18,
    edgeLighting: 0.4, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(255, 255, 255, 0.3)', gradientEnd: 'rgba(255, 255, 255, 0.1)',
    backgroundTint: 'rgba(255, 255, 255, 0.06)',
    borderThickness: 1.5, borderRadius: 16, borderOpacity: 0.35,
    shadowIntensity: 0.3, shadowBlur: 22, shadowColor: 'rgba(0, 0, 0, 0.3)',
    reflectionIntensity: 0.5, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'frosted-medium',
    name: 'Frosted Medium',
    blur: 15, opacity: 0.3, surfaceOpacity: 0.22,
    edgeLighting: 0.7, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(180, 200, 255, 0.35)', gradientEnd: 'rgba(120, 150, 255, 0.15)',
    backgroundTint: 'rgba(150, 175, 255, 0.08)',
    borderThickness: 1.5, borderRadius: 20, borderOpacity: 0.4,
    shadowIntensity: 0.35, shadowBlur: 25, shadowColor: 'rgba(0, 0, 0, 0.35)',
    reflectionIntensity: 0.4, surfaceTexture: 0.15, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    blur: 10, opacity: 0.2, surfaceOpacity: 0.15,
    edgeLighting: 0.9, glowIntensity: 0.6, glowColor: '#00ffff',
    gradientStart: 'rgba(0, 255, 255, 0.3)', gradientEnd: 'rgba(0, 200, 255, 0.1)',
    backgroundTint: 'rgba(0, 220, 255, 0.05)',
    borderThickness: 1, borderRadius: 12, borderOpacity: 0.6,
    shadowIntensity: 0.6, shadowBlur: 30, shadowColor: 'rgba(0, 255, 255, 0.4)',
    reflectionIntensity: 0.8, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'warm-amber',
    name: 'Warm Amber',
    blur: 14, opacity: 0.3, surfaceOpacity: 0.2,
    edgeLighting: 0.6, glowIntensity: 0.3, glowColor: '#ffaa00',
    gradientStart: 'rgba(255, 200, 100, 0.4)', gradientEnd: 'rgba(255, 150, 50, 0.2)',
    backgroundTint: 'rgba(255, 175, 75, 0.08)',
    borderThickness: 2, borderRadius: 18, borderOpacity: 0.4,
    shadowIntensity: 0.4, shadowBlur: 28, shadowColor: 'rgba(255, 150, 0, 0.3)',
    reflectionIntensity: 0.5, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'cool-mint',
    name: 'Cool Mint',
    blur: 16, opacity: 0.28, surfaceOpacity: 0.19,
    edgeLighting: 0.55, glowIntensity: 0.2, glowColor: '#66ffcc',
    gradientStart: 'rgba(100, 255, 200, 0.35)', gradientEnd: 'rgba(50, 255, 150, 0.15)',
    backgroundTint: 'rgba(75, 255, 175, 0.07)',
    borderThickness: 1.5, borderRadius: 14, borderOpacity: 0.35,
    shadowIntensity: 0.35, shadowBlur: 24, shadowColor: 'rgba(0, 200, 150, 0.25)',
    reflectionIntensity: 0.45, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },

  // Heavy Intensity Presets
  {
    id: 'elegant-heavy',
    name: 'Elegant Heavy',
    blur: 20, opacity: 0.35, surfaceOpacity: 0.28,
    edgeLighting: 0.5, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(255, 255, 255, 0.4)', gradientEnd: 'rgba(255, 255, 255, 0.15)',
    backgroundTint: 'rgba(255, 255, 255, 0.1)',
    borderThickness: 2, borderRadius: 16, borderOpacity: 0.45,
    shadowIntensity: 0.4, shadowBlur: 30, shadowColor: 'rgba(0, 0, 0, 0.4)',
    reflectionIntensity: 0.6, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'frosted-heavy',
    name: 'Frosted Heavy',
    blur: 25, opacity: 0.45, surfaceOpacity: 0.35,
    edgeLighting: 0.8, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(160, 180, 255, 0.45)', gradientEnd: 'rgba(100, 130, 255, 0.2)',
    backgroundTint: 'rgba(130, 155, 255, 0.12)',
    borderThickness: 2, borderRadius: 20, borderOpacity: 0.5,
    shadowIntensity: 0.45, shadowBlur: 35, shadowColor: 'rgba(0, 0, 0, 0.45)',
    reflectionIntensity: 0.5, surfaceTexture: 0.2, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'ultra-frosted',
    name: 'Ultra Frosted',
    blur: 30, opacity: 0.6, surfaceOpacity: 0.45,
    edgeLighting: 0.9, glowIntensity: 0.0, glowColor: '#ffffff',
    gradientStart: 'rgba(220, 220, 255, 0.6)', gradientEnd: 'rgba(180, 180, 255, 0.4)',
    backgroundTint: 'rgba(200, 200, 255, 0.15)',
    borderThickness: 3, borderRadius: 24, borderOpacity: 0.6,
    shadowIntensity: 0.6, shadowBlur: 40, shadowColor: 'rgba(0, 0, 0, 0.6)',
    reflectionIntensity: 0.8, surfaceTexture: 0.3, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    blur: 18, opacity: 0.4, surfaceOpacity: 0.3,
    edgeLighting: 0.7, glowIntensity: 0.4, glowColor: '#0088ff',
    gradientStart: 'rgba(50, 150, 255, 0.45)', gradientEnd: 'rgba(20, 100, 200, 0.25)',
    backgroundTint: 'rgba(35, 125, 225, 0.1)',
    borderThickness: 2, borderRadius: 16, borderOpacity: 0.5,
    shadowIntensity: 0.5, shadowBlur: 32, shadowColor: 'rgba(0, 100, 200, 0.4)',
    reflectionIntensity: 0.6, surfaceTexture: 0.1, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    blur: 22, opacity: 0.35, surfaceOpacity: 0.25,
    edgeLighting: 0.8, glowIntensity: 0.5, glowColor: '#ff6600',
    gradientStart: 'rgba(255, 150, 100, 0.4)', gradientEnd: 'rgba(255, 100, 150, 0.2)',
    backgroundTint: 'rgba(255, 125, 125, 0.08)',
    borderThickness: 1.5, borderRadius: 20, borderOpacity: 0.45,
    shadowIntensity: 0.45, shadowBlur: 35, shadowColor: 'rgba(255, 100, 0, 0.35)',
    reflectionIntensity: 0.55, surfaceTexture: 0.0, noiseIntensity: 0.0,
    distortionAmount: 0.0, lightSourceAngle: 45,
  },
];

type ViewMode = 'explorer' | 'comparison' | 'library';
type TileSize = 'small' | 'medium' | 'large';

export const TileParameterExplorer: React.FC = () => {
  const [currentParameters, setCurrentParameters] = useState<TileParameters>(DEFAULT_PARAMETERS);
  const [viewMode, setViewMode] = useState<ViewMode>('explorer');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [comparisonTarget, setComparisonTarget] = useState<TileParameters | null>(null);
  const [savedDiscoveries, setSavedDiscoveries] = useState<SavedDiscovery[]>([]);
  const [showSizeVariants, setShowSizeVariants] = useState(true);
  const [showParameterDiff, setShowParameterDiff] = useState(false);

  // Load saved discoveries from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tile-discoveries');
    if (saved) {
      try {
        setSavedDiscoveries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved discoveries:', e);
      }
    }
  }, []);

  // Save discoveries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tile-discoveries', JSON.stringify(savedDiscoveries));
  }, [savedDiscoveries]);

  const handleParameterChange = useCallback((key: keyof TileParameters, value: any) => {
    setCurrentParameters(prev => ({
      ...prev,
      [key]: value,
      id: 'custom',
      name: 'Custom'
    }));
    setSelectedPreset(null);
  }, []);

  const loadPreset = useCallback((preset: TileParameters) => {
    setCurrentParameters(preset);
    setSelectedPreset(preset.id);
  }, []);

  const randomizeParameters = useCallback(() => {
    const randomParams: TileParameters = {
      ...DEFAULT_PARAMETERS,
      id: 'random',
      name: 'Random Discovery',
      blur: Math.random() * 35 + 3,
      opacity: Math.random() * 0.6 + 0.05,
      surfaceOpacity: Math.random() * 0.4 + 0.03,
      edgeLighting: Math.random() * 0.9 + 0.1,
      glowIntensity: Math.random() * 0.8,
      borderThickness: Math.random() * 3 + 0.5,
      borderRadius: Math.random() * 30 + 4,
      borderOpacity: Math.random() * 0.7 + 0.1,
      shadowIntensity: Math.random() * 0.7 + 0.1,
      shadowBlur: Math.random() * 40 + 8,
      reflectionIntensity: Math.random() * 0.9 + 0.1,
      surfaceTexture: Math.random() * 0.4,
      noiseIntensity: Math.random() * 0.3,
      distortionAmount: Math.random() * 0.2,
      lightSourceAngle: Math.random() * 90 + 15,
    };
    
    setCurrentParameters(randomParams);
    setSelectedPreset(null);
  }, []);

  const saveDiscovery = useCallback(() => {
    const name = prompt('Name your discovery:');
    if (!name) return;

    const discovery: SavedDiscovery = {
      id: Date.now().toString(),
      name,
      parameters: { ...currentParameters },
      createdAt: new Date().toISOString(),
      tags: []
    };

    setSavedDiscoveries(prev => [discovery, ...prev]);
  }, [currentParameters]);

  const deleteDiscovery = useCallback((id: string) => {
    setSavedDiscoveries(prev => prev.filter(d => d.id !== id));
  }, []);

  const exportCSS = useCallback((params: TileParameters) => {
    const css = `
/* ${params.name} Glassmorphic Tile */
.glassmorphic-tile {
  backdrop-filter: blur(${params.blur}px);
  -webkit-backdrop-filter: blur(${params.blur}px);
  background: linear-gradient(135deg, ${params.gradientStart}, ${params.gradientEnd});
  border: ${params.borderThickness}px solid rgba(255, 255, 255, ${params.borderOpacity});
  border-radius: ${params.borderRadius}px;
  box-shadow: 
    0 ${params.shadowBlur / 2}px ${params.shadowBlur}px ${params.shadowColor},
    inset 0 1px 0 rgba(255, 255, 255, ${params.edgeLighting});
  ${params.glowIntensity > 0 ? `filter: drop-shadow(0 0 ${params.glowIntensity * 20}px ${params.glowColor});` : ''}
  position: relative;
  overflow: hidden;
}

.glassmorphic-tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${params.backgroundTint};
  opacity: ${params.surfaceOpacity};
  pointer-events: none;
}

.glassmorphic-tile::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,${params.reflectionIntensity * 0.3}) 0%, transparent 100%);
  pointer-events: none;
}
    `.trim();

    navigator.clipboard.writeText(css);
    alert('CSS copied to clipboard!');
  }, []);

  const generateTileStyle = useCallback((params: TileParameters, size: TileSize = 'medium') => {
    const sizeMap = {
      small: { width: '120px', height: '80px', padding: '12px' },
      medium: { width: '200px', height: '140px', padding: '20px' },
      large: { width: '300px', height: '200px', padding: '30px' }
    };

    const dimensions = sizeMap[size];

    return {
      ...dimensions,
      backdropFilter: `blur(${params.blur}px)`,
      WebkitBackdropFilter: `blur(${params.blur}px)`,
      background: `linear-gradient(135deg, ${params.gradientStart}, ${params.gradientEnd})`,
      border: `${params.borderThickness}px solid rgba(255, 255, 255, ${params.borderOpacity})`,
      borderRadius: `${params.borderRadius}px`,
      boxShadow: `
        0 ${params.shadowBlur / 2}px ${params.shadowBlur}px ${params.shadowColor},
        inset 0 1px 0 rgba(255, 255, 255, ${params.edgeLighting})
      `,
      filter: params.glowIntensity > 0 ? `drop-shadow(0 0 ${params.glowIntensity * 20}px ${params.glowColor})` : 'none',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
      fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
    };
  }, []);

  const renderParameterControls = () => (
    <div className="parameter-controls">
      <div className="control-section">
        <h3>Core Glass Properties</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Blur Radius</label>
            <input
              type="range"
              min="1"
              max="40"
              step="0.5"
              value={currentParameters.blur}
              onChange={(e) => handleParameterChange('blur', parseFloat(e.target.value))}
            />
            <span>{currentParameters.blur.toFixed(1)}px</span>
          </div>
          <div className="control-item">
            <label>Background Opacity</label>
            <input
              type="range"
              min="0.01"
              max="0.8"
              step="0.01"
              value={currentParameters.opacity}
              onChange={(e) => handleParameterChange('opacity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.opacity * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Surface Opacity</label>
            <input
              type="range"
              min="0.01"
              max="0.6"
              step="0.01"
              value={currentParameters.surfaceOpacity}
              onChange={(e) => handleParameterChange('surfaceOpacity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.surfaceOpacity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Lighting & Effects</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Edge Lighting</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentParameters.edgeLighting}
              onChange={(e) => handleParameterChange('edgeLighting', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.edgeLighting * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Glow Intensity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentParameters.glowIntensity}
              onChange={(e) => handleParameterChange('glowIntensity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.glowIntensity * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Glow Color</label>
            <input
              type="color"
              value={currentParameters.glowColor}
              onChange={(e) => handleParameterChange('glowColor', e.target.value)}
            />
          </div>
          <div className="control-item">
            <label>Light Source Angle</label>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={currentParameters.lightSourceAngle}
              onChange={(e) => handleParameterChange('lightSourceAngle', parseFloat(e.target.value))}
            />
            <span>{currentParameters.lightSourceAngle}°</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Borders & Shape</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Border Thickness</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={currentParameters.borderThickness}
              onChange={(e) => handleParameterChange('borderThickness', parseFloat(e.target.value))}
            />
            <span>{currentParameters.borderThickness.toFixed(1)}px</span>
          </div>
          <div className="control-item">
            <label>Border Radius</label>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={currentParameters.borderRadius}
              onChange={(e) => handleParameterChange('borderRadius', parseFloat(e.target.value))}
            />
            <span>{currentParameters.borderRadius}px</span>
          </div>
          <div className="control-item">
            <label>Border Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentParameters.borderOpacity}
              onChange={(e) => handleParameterChange('borderOpacity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.borderOpacity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Shadows & Depth</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Shadow Intensity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentParameters.shadowIntensity}
              onChange={(e) => handleParameterChange('shadowIntensity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.shadowIntensity * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Shadow Blur</label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={currentParameters.shadowBlur}
              onChange={(e) => handleParameterChange('shadowBlur', parseFloat(e.target.value))}
            />
            <span>{currentParameters.shadowBlur}px</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Surface & Texture</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Reflection Intensity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentParameters.reflectionIntensity}
              onChange={(e) => handleParameterChange('reflectionIntensity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.reflectionIntensity * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Surface Texture</label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={currentParameters.surfaceTexture}
              onChange={(e) => handleParameterChange('surfaceTexture', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.surfaceTexture * 100).toFixed(0)}%</span>
          </div>
          <div className="control-item">
            <label>Noise Intensity</label>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              value={currentParameters.noiseIntensity}
              onChange={(e) => handleParameterChange('noiseIntensity', parseFloat(e.target.value))}
            />
            <span>{(currentParameters.noiseIntensity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPresetLibrary = () => (
    <div className="preset-library">
      <h3>Curated Starting Points</h3>
      <div className="preset-categories">
        <div className="preset-category">
          <h4>Light Intensity</h4>
          <div className="preset-grid">
            {PRESET_LIBRARY.slice(0, 5).map((preset) => (
              <div
                key={preset.id}
                className={`preset-tile ${selectedPreset === preset.id ? 'selected' : ''}`}
                style={generateTileStyle(preset, 'small')}
                onClick={() => loadPreset(preset)}
              >
                <span>{preset.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="preset-category">
          <h4>Medium Intensity</h4>
          <div className="preset-grid">
            {PRESET_LIBRARY.slice(5, 10).map((preset) => (
              <div
                key={preset.id}
                className={`preset-tile ${selectedPreset === preset.id ? 'selected' : ''}`}
                style={generateTileStyle(preset, 'small')}
                onClick={() => loadPreset(preset)}
              >
                <span>{preset.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="preset-category">
          <h4>Heavy Intensity</h4>
          <div className="preset-grid">
            {PRESET_LIBRARY.slice(10, 15).map((preset) => (
              <div
                key={preset.id}
                className={`preset-tile ${selectedPreset === preset.id ? 'selected' : ''}`}
                style={generateTileStyle(preset, 'small')}
                onClick={() => loadPreset(preset)}
              >
                <span>{preset.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLivePreview = () => (
    <div className="live-preview">
      <div className="preview-header">
        <h3>Live Preview</h3>
        <div className="preview-controls">
          <button
            className={`toggle-btn ${showSizeVariants ? 'active' : ''}`}
            onClick={() => setShowSizeVariants(!showSizeVariants)}
          >
            <Eye size={16} />
            Size Variants
          </button>
          <button onClick={() => exportCSS(currentParameters)} className="export-btn">
            <Copy size={16} />
            Export CSS
          </button>
          <button onClick={saveDiscovery} className="save-btn">
            <Save size={16} />
            Save Discovery
          </button>
          <button onClick={randomizeParameters} className="randomize-btn">
            <Shuffle size={16} />
            Randomize
          </button>
        </div>
      </div>
      
      <div className="preview-area">
        {showSizeVariants ? (
          <div className="size-variants">
            <div className="variant-group">
              <label>Small</label>
              <div style={generateTileStyle(currentParameters, 'small')}>
                <span>Small Tile</span>
              </div>
            </div>
            <div className="variant-group">
              <label>Medium</label>
              <div style={generateTileStyle(currentParameters, 'medium')}>
                <span>Medium Tile</span>
              </div>
            </div>
            <div className="variant-group">
              <label>Large</label>
              <div style={generateTileStyle(currentParameters, 'large')}>
                <span>Large Tile</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="single-preview">
            <div style={generateTileStyle(currentParameters, 'large')}>
              <span>{currentParameters.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="comparison-view">
      <div className="comparison-header">
        <h3>Side-by-Side Comparison</h3>
        <div className="comparison-controls">
          <select
            value={comparisonTarget?.id || ''}
            onChange={(e) => {
              const target = PRESET_LIBRARY.find(p => p.id === e.target.value) || 
                           savedDiscoveries.find(d => d.id === e.target.value)?.parameters;
              setComparisonTarget(target || null);
            }}
          >
            <option value="">Select comparison target...</option>
            <optgroup label="Presets">
              {PRESET_LIBRARY.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </optgroup>
            <optgroup label="Your Discoveries">
              {savedDiscoveries.map(discovery => (
                <option key={discovery.id} value={discovery.id}>{discovery.name}</option>
              ))}
            </optgroup>
          </select>
          <button
            className={`toggle-btn ${showParameterDiff ? 'active' : ''}`}
            onClick={() => setShowParameterDiff(!showParameterDiff)}
          >
            Parameter Diff
          </button>
        </div>
      </div>
      
      {comparisonTarget && (
        <div className="comparison-content">
          <div className="comparison-tiles">
            <div className="comparison-item">
              <h4>Current ({currentParameters.name})</h4>
              <div style={generateTileStyle(currentParameters, 'large')}>
                <span>{currentParameters.name}</span>
              </div>
            </div>
            <div className="comparison-item">
              <h4>Target ({comparisonTarget.name})</h4>
              <div style={generateTileStyle(comparisonTarget, 'large')}>
                <span>{comparisonTarget.name}</span>
              </div>
            </div>
          </div>
          
          {showParameterDiff && (
            <div className="parameter-diff">
              <h4>Parameter Differences</h4>
              <div className="diff-grid">
                {Object.entries(currentParameters).map(([key, value]) => {
                  if (key === 'id' || key === 'name') return null;
                  const targetValue = comparisonTarget[key as keyof TileParameters];
                  const isDifferent = value !== targetValue;
                  
                  return (
                    <div key={key} className={`diff-item ${isDifferent ? 'different' : 'same'}`}>
                      <span className="param-name">{key}</span>
                      <span className="current-value">{String(value)}</span>
                      <span className="target-value">{String(targetValue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDiscoveryLibrary = () => (
    <div className="discovery-library">
      <div className="library-header">
        <h3>Your Discoveries ({savedDiscoveries.length})</h3>
        <div className="library-controls">
          <button onClick={() => {
            const data = JSON.stringify(savedDiscoveries, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tile-discoveries.json';
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download size={16} />
            Export Library
          </button>
        </div>
      </div>
      
      <div className="discovery-grid">
        {savedDiscoveries.map((discovery) => (
          <div key={discovery.id} className="discovery-item">
            <div className="discovery-preview">
              <div
                style={generateTileStyle(discovery.parameters, 'medium')}
                onClick={() => loadPreset(discovery.parameters)}
              >
                <span>{discovery.name}</span>
              </div>
            </div>
            <div className="discovery-info">
              <h4>{discovery.name}</h4>
              <p>Created: {new Date(discovery.createdAt).toLocaleDateString()}</p>
              <div className="discovery-actions">
                <button onClick={() => loadPreset(discovery.parameters)}>Load</button>
                <button onClick={() => setComparisonTarget(discovery.parameters)}>Compare</button>
                <button onClick={() => exportCSS(discovery.parameters)}>
                  <Copy size={14} />
                </button>
                <button onClick={() => deleteDiscovery(discovery.id)} className="delete-btn">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {savedDiscoveries.length === 0 && (
        <div className="empty-library">
          <p>No discoveries yet. Start experimenting with parameters and save your findings!</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="tile-parameter-explorer">
      <div className="explorer-header">
        <h1>Tile Parameter Space Explorer</h1>
        <p>Discover emergent styles through systematic parameter manipulation</p>
        
        <div className="view-mode-tabs">
          <button
            className={viewMode === 'explorer' ? 'active' : ''}
            onClick={() => setViewMode('explorer')}
          >
            Explorer
          </button>
          <button
            className={viewMode === 'comparison' ? 'active' : ''}
            onClick={() => setViewMode('comparison')}
          >
            Comparison
          </button>
          <button
            className={viewMode === 'library' ? 'active' : ''}
            onClick={() => setViewMode('library')}
          >
            Library ({savedDiscoveries.length})
          </button>
        </div>
      </div>

      <div className="explorer-content">
        {viewMode === 'explorer' && (
          <div className="explorer-layout">
            <div className="controls-panel">
              {renderParameterControls()}
              {renderPresetLibrary()}
            </div>
            <div className="preview-panel">
              {renderLivePreview()}
            </div>
          </div>
        )}
        
        {viewMode === 'comparison' && renderComparison()}
        {viewMode === 'library' && renderDiscoveryLibrary()}
      </div>
    </div>
  );
};