import React from 'react';
import { TilePreset } from '../types/tile-types';
import { GlassTile } from './GlassTile';
import { Badge } from './ui/badge';

interface PresetGalleryProps {
  presets: TilePreset[];
  onSelectPreset: (preset: TilePreset) => void;
  selectedPresetId?: string;
}

export function PresetGallery({ presets, onSelectPreset, selectedPresetId }: PresetGalleryProps) {
  const categories = {
    light: presets.filter(p => p.category === 'light'),
    medium: presets.filter(p => p.category === 'medium'),
    heavy: presets.filter(p => p.category === 'heavy'),
  };

  const categoryConfig = {
    light: { label: 'Light Variations', description: 'Subtle effects, minimal presence', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    medium: { label: 'Medium Variations', description: 'Balanced effects, clear presence', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    heavy: { label: 'Heavy Variations', description: 'Bold effects, strong presence', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-white mb-2">Preset Library</h2>
        <p className="text-white/60">Explore 15 curated starting points for your parameter journey</p>
      </div>

      {Object.entries(categories).map(([category, presetList]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={config.color}>
                {config.label}
              </Badge>
              <span className="text-white/50 text-sm">{config.description}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {presetList.map((preset) => (
                <div key={preset.id} className="space-y-2">
                  <GlassTile
                    parameters={preset}
                    size="medium"
                    onClick={() => onSelectPreset(preset)}
                    isSelected={selectedPresetId === preset.id}
                  />
                  <div className="space-y-1">
                    <div className="text-white/80 text-sm">{preset.name}</div>
                    <div className="text-white/50 text-xs">{preset.description}</div>
                    <div className="text-white/40 text-xs">
                      {preset.blur}px blur · {preset.opacity}% opacity
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
