/**
 * Color Palette Selector Component
 * Simplified palette selection with visual previews
 */

import React from 'react';
import { Label } from '../../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { K1_PALETTES } from '../../../api/k1-data';

interface ColorPaletteSelectorProps {
  selectedPalette: number;
  onPaletteChange: (paletteId: number) => void;
  disabled?: boolean;
}

export function ColorPaletteSelector({ 
  selectedPalette, 
  onPaletteChange, 
  disabled = false 
}: ColorPaletteSelectorProps) {
  // Derive three color categories and paginate to 11 items per page
  const [activeCategory, setActiveCategory] = React.useState<'warm' | 'cool' | 'mixed'>('warm');

  const extractHexes = (gradient: string): string[] => gradient.match(/#([0-9a-fA-F]{3,8})/g) || [];
  const hexToHsl = (hex: string) => {
    const clean = hex.replace('#','');
    const hex6 = clean.length === 3 ? clean.split('').map(c => c+c).join('') : clean.slice(0,6);
    const bigint = parseInt(hex6, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s: s*100, l: l*100 };
  };
  const categorizePalette = (gradient: string): 'warm' | 'cool' | 'mixed' => {
    const hexes = extractHexes(gradient);
    const hues = hexes.map(h => hexToHsl(h).h);
    const hasWarm = hues.some(h => h < 60 || h >= 320);
    const hasCool = hues.some(h => h >= 60 && h <= 240);
    return hasWarm && hasCool ? 'mixed' : (hasWarm ? 'warm' : 'cool');
  };
  const categorized = K1_PALETTES.filter(p => categorizePalette(p.gradient) === activeCategory);
  const visiblePalettes = categorized.slice(0, 11);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[var(--k1-text-dim)]">Color Palette</Label>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--k1-bg)] rounded-md p-1 border border-[var(--k1-border)]">
            {[
              { key: 'warm', label: 'Warm' },
              { key: 'cool', label: 'Cool' },
              { key: 'mixed', label: 'Mixed' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key as 'warm'|'cool'|'mixed')}
                className={`px-2 py-1 rounded text-[12px] ${
                  activeCategory === tab.key ? 'bg-[var(--k1-accent)] text-white' : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[var(--k1-text-dim)]">Showing {visiblePalettes.length} / 11</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {visiblePalettes.map((palette) => (
          <TooltipProvider key={palette.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !disabled && onPaletteChange(palette.id)}
                  disabled={disabled}
                  className={`group relative h-8 rounded-md border transition-all duration-200 ${
                    selectedPalette === palette.id
                      ? 'border-[var(--k1-accent)] shadow-sm'
                      : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ background: palette.gradient }}
                  aria-label={`Select palette: ${palette.name}`}
                >
                  {selectedPalette === palette.id && (
                    <div className="absolute top-0 right-0 m-0.5 w-2 h-2 bg-[var(--k1-accent)] rounded-full shadow" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-0.5 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {palette.name}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="text-[12px] font-medium">{palette.name}</p>
                  <p className="text-[10px] text-gray-400">Palette #{palette.id}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {selectedPalette !== undefined && (
        <div className="mt-3 p-2 bg-[var(--k1-bg)] rounded-md border border-[var(--k1-border)]">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded border border-[var(--k1-border)]"
              style={{ background: K1_PALETTES.find(p => p.id === selectedPalette)?.gradient }}
            />
            <div>
              <p className="text-[12px] font-medium text-[var(--k1-text)]">
                {K1_PALETTES.find(p => p.id === selectedPalette)?.name}
              </p>
              <p className="text-[10px] text-[var(--k1-text-dim)]">
                Active palette
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}