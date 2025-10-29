import React, { useState, useCallback, useMemo } from 'react';
import './GlassmorphPrototype.css';

interface TileConfig {
  id: string;
  name: string;
  blur: number;
  opacity: number;
  edgeLighting: number;
  gradientStart: string;
  gradientEnd: string;
  borderThickness: number;
  borderRadius: number;
  shadowIntensity: number;
  reflectionIntensity: number;
}

const PREDEFINED_VARIATIONS: TileConfig[] = [
  {
    id: 'elegant-light',
    name: 'Elegant Light',
    blur: 8,
    opacity: 0.15,
    edgeLighting: 0.3,
    gradientStart: 'rgba(255, 255, 255, 0.2)',
    gradientEnd: 'rgba(255, 255, 255, 0.05)',
    borderThickness: 1,
    borderRadius: 16,
    shadowIntensity: 0.2,
    reflectionIntensity: 0.4
  },
  {
    id: 'elegant-medium',
    name: 'Elegant Medium',
    blur: 12,
    opacity: 0.25,
    edgeLighting: 0.4,
    gradientStart: 'rgba(255, 255, 255, 0.3)',
    gradientEnd: 'rgba(255, 255, 255, 0.1)',
    borderThickness: 1.5,
    borderRadius: 16,
    shadowIntensity: 0.3,
    reflectionIntensity: 0.5
  },
  {
    id: 'elegant-heavy',
    name: 'Elegant Heavy',
    blur: 20,
    opacity: 0.35,
    edgeLighting: 0.5,
    gradientStart: 'rgba(255, 255, 255, 0.4)',
    gradientEnd: 'rgba(255, 255, 255, 0.15)',
    borderThickness: 2,
    borderRadius: 16,
    shadowIntensity: 0.4,
    reflectionIntensity: 0.6
  },
  {
    id: 'frosted-light',
    name: 'Frosted Light',
    blur: 6,
    opacity: 0.2,
    edgeLighting: 0.6,
    gradientStart: 'rgba(200, 220, 255, 0.25)',
    gradientEnd: 'rgba(150, 180, 255, 0.1)',
    borderThickness: 1,
    borderRadius: 20,
    shadowIntensity: 0.25,
    reflectionIntensity: 0.3
  },
  {
    id: 'frosted-medium',
    name: 'Frosted Medium',
    blur: 15,
    opacity: 0.3,
    edgeLighting: 0.7,
    gradientStart: 'rgba(180, 200, 255, 0.35)',
    gradientEnd: 'rgba(120, 150, 255, 0.15)',
    borderThickness: 1.5,
    borderRadius: 20,
    shadowIntensity: 0.35,
    reflectionIntensity: 0.4
  },
  {
    id: 'frosted-heavy',
    name: 'Frosted Heavy',
    blur: 25,
    opacity: 0.45,
    edgeLighting: 0.8,
    gradientStart: 'rgba(160, 180, 255, 0.45)',
    gradientEnd: 'rgba(100, 130, 255, 0.2)',
    borderThickness: 2,
    borderRadius: 20,
    shadowIntensity: 0.45,
    reflectionIntensity: 0.5
  },
  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    blur: 10,
    opacity: 0.2,
    edgeLighting: 0.9,
    gradientStart: 'rgba(0, 255, 255, 0.3)',
    gradientEnd: 'rgba(0, 200, 255, 0.1)',
    borderThickness: 1,
    borderRadius: 12,
    shadowIntensity: 0.6,
    reflectionIntensity: 0.8
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    blur: 12,
    opacity: 0.25,
    edgeLighting: 0.85,
    gradientStart: 'rgba(200, 100, 255, 0.35)',
    gradientEnd: 'rgba(150, 50, 255, 0.15)',
    borderThickness: 1.5,
    borderRadius: 12,
    shadowIntensity: 0.5,
    reflectionIntensity: 0.7
  },
  {
    id: 'warm-amber',
    name: 'Warm Amber',
    blur: 14,
    opacity: 0.3,
    edgeLighting: 0.6,
    gradientStart: 'rgba(255, 200, 100, 0.4)',
    gradientEnd: 'rgba(255, 150, 50, 0.2)',
    borderThickness: 2,
    borderRadius: 18,
    shadowIntensity: 0.4,
    reflectionIntensity: 0.5
  },
  {
    id: 'cool-mint',
    name: 'Cool Mint',
    blur: 16,
    opacity: 0.28,
    edgeLighting: 0.55,
    gradientStart: 'rgba(100, 255, 200, 0.35)',
    gradientEnd: 'rgba(50, 255, 150, 0.15)',
    borderThickness: 1.5,
    borderRadius: 14,
    shadowIntensity: 0.35,
    reflectionIntensity: 0.45
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    blur: 18,
    opacity: 0.4,
    edgeLighting: 0.7,
    gradientStart: 'rgba(50, 150, 255, 0.45)',
    gradientEnd: 'rgba(20, 100, 200, 0.25)',
    borderThickness: 2,
    borderRadius: 16,
    shadowIntensity: 0.5,
    reflectionIntensity: 0.6
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    blur: 22,
    opacity: 0.35,
    edgeLighting: 0.8,
    gradientStart: 'rgba(255, 150, 100, 0.4)',
    gradientEnd: 'rgba(255, 100, 150, 0.2)',
    borderThickness: 1.5,
    borderRadius: 20,
    shadowIntensity: 0.45,
    reflectionIntensity: 0.55
  },
  {
    id: 'crystal-clear',
    name: 'Crystal Clear',
    blur: 5,
    opacity: 0.1,
    edgeLighting: 0.4,
    gradientStart: 'rgba(255, 255, 255, 0.15)',
    gradientEnd: 'rgba(240, 240, 255, 0.05)',
    borderThickness: 0.5,
    borderRadius: 8,
    shadowIntensity: 0.15,
    reflectionIntensity: 0.25
  },
  {
    id: 'ultra-frosted',
    name: 'Ultra Frosted',
    blur: 30,
    opacity: 0.6,
    edgeLighting: 0.9,
    gradientStart: 'rgba(220, 220, 255, 0.6)',
    gradientEnd: 'rgba(180, 180, 255, 0.4)',
    borderThickness: 3,
    borderRadius: 24,
    shadowIntensity: 0.6,
    reflectionIntensity: 0.8
  },
  {
    id: 'minimal-ghost',
    name: 'Minimal Ghost',
    blur: 4,
    opacity: 0.08,
    edgeLighting: 0.2,
    gradientStart: 'rgba(255, 255, 255, 0.1)',
    gradientEnd: 'rgba(250, 250, 255, 0.03)',
    borderThickness: 0.5,
    borderRadius: 6,
    shadowIntensity: 0.1,
    reflectionIntensity: 0.15
  }
];

export const GlassmorphPrototype: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState<TileConfig>(PREDEFINED_VARIATIONS[0]);
  const [customConfig, setCustomConfig] = useState<TileConfig>(PREDEFINED_VARIATIONS[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'single' | 'comparison'>('grid');
  const [savedPresets, setSavedPresets] = useState<TileConfig[]>([]);
  const [comparisonConfigs, setComparisonConfigs] = useState<TileConfig[]>([
    PREDEFINED_VARIATIONS[0],
    PREDEFINED_VARIATIONS[1],
    PREDEFINED_VARIATIONS[2]
  ]);

  const updateCustomConfig = useCallback((updates: Partial<TileConfig>) => {
    setCustomConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const savePreset = useCallback(() => {
    const presetName = prompt('Enter preset name:');
    if (presetName) {
      const newPreset = { ...customConfig, id: `custom-${Date.now()}`, name: presetName };
      setSavedPresets(prev => [...prev, newPreset]);
    }
  }, [customConfig]);

  const generateTileStyle = useCallback((config: TileConfig) => {
    return {
      '--tile-blur': `${config.blur}px`,
      '--tile-opacity': config.opacity,
      '--tile-edge-lighting': config.edgeLighting,
      '--tile-gradient-start': config.gradientStart,
      '--tile-gradient-end': config.gradientEnd,
      '--tile-border-thickness': `${config.borderThickness}px`,
      '--tile-border-radius': `${config.borderRadius}px`,
      '--tile-shadow-intensity': config.shadowIntensity,
      '--tile-reflection-intensity': config.reflectionIntensity,
    } as React.CSSProperties;
  }, []);

  const TilePreview: React.FC<{ config: TileConfig; size?: 'small' | 'medium' | 'large' }> = ({ 
    config, 
    size = 'medium' 
  }) => (
    <div 
      className={`glassmorphic-tile ${size}`}
      style={generateTileStyle(config)}
    >
      <div className="tile-content">
        <h3>{config.name}</h3>
        <div className="tile-specs">
          <span>Blur: {config.blur}px</span>
          <span>Opacity: {(config.opacity * 100).toFixed(0)}%</span>
          <span>Edge: {(config.edgeLighting * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glassmorphic-prototype">
      <div className="prototype-header">
        <h1>K1 Glassmorphic Tile Laboratory</h1>
        <div className="view-controls">
          <button 
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </button>
          <button 
            className={viewMode === 'single' ? 'active' : ''}
            onClick={() => setViewMode('single')}
          >
            Single View
          </button>
          <button 
            className={viewMode === 'comparison' ? 'active' : ''}
            onClick={() => setViewMode('comparison')}
          >
            Comparison
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="variations-grid">
          {PREDEFINED_VARIATIONS.map(config => (
            <div 
              key={config.id} 
              className="variation-item"
              onClick={() => setSelectedConfig(config)}
            >
              <TilePreview config={config} size="small" />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'single' && (
        <div className="single-view">
          <div className="controls-panel">
            <h3>Tile Configuration</h3>
            
            <div className="control-group">
              <label>Blur Intensity: {customConfig.blur}px</label>
              <input
                type="range"
                min="0"
                max="40"
                value={customConfig.blur}
                onChange={(e) => updateCustomConfig({ blur: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Opacity: {(customConfig.opacity * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={customConfig.opacity}
                onChange={(e) => updateCustomConfig({ opacity: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Edge Lighting: {(customConfig.edgeLighting * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={customConfig.edgeLighting}
                onChange={(e) => updateCustomConfig({ edgeLighting: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Border Thickness: {customConfig.borderThickness}px</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={customConfig.borderThickness}
                onChange={(e) => updateCustomConfig({ borderThickness: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Border Radius: {customConfig.borderRadius}px</label>
              <input
                type="range"
                min="0"
                max="40"
                value={customConfig.borderRadius}
                onChange={(e) => updateCustomConfig({ borderRadius: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Shadow Intensity: {(customConfig.shadowIntensity * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={customConfig.shadowIntensity}
                onChange={(e) => updateCustomConfig({ shadowIntensity: Number(e.target.value) })}
              />
            </div>

            <div className="control-group">
              <label>Reflection Intensity: {(customConfig.reflectionIntensity * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={customConfig.reflectionIntensity}
                onChange={(e) => updateCustomConfig({ reflectionIntensity: Number(e.target.value) })}
              />
            </div>

            <div className="preset-controls">
              <button onClick={savePreset}>Save Preset</button>
              <select 
                onChange={(e) => {
                  const preset = [...PREDEFINED_VARIATIONS, ...savedPresets]
                    .find(p => p.id === e.target.value);
                  if (preset) setCustomConfig(preset);
                }}
              >
                <option value="">Load Preset...</option>
                {PREDEFINED_VARIATIONS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
                {savedPresets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name} (Custom)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="preview-panel">
            <TilePreview config={customConfig} size="large" />
          </div>
        </div>
      )}

      {viewMode === 'comparison' && (
        <div className="comparison-view">
          <div className="comparison-grid">
            {comparisonConfigs.map((config, index) => (
              <div key={index} className="comparison-item">
                <TilePreview config={config} size="medium" />
                <select 
                  value={config.id}
                  onChange={(e) => {
                    const newConfig = PREDEFINED_VARIATIONS.find(p => p.id === e.target.value);
                    if (newConfig) {
                      const newConfigs = [...comparisonConfigs];
                      newConfigs[index] = newConfig;
                      setComparisonConfigs(newConfigs);
                    }
                  }}
                >
                  {PREDEFINED_VARIATIONS.map(preset => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};