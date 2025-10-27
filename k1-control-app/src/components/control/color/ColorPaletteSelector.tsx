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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[var(--k1-text-dim)]">Color Palette</Label>
        <span className="text-xs text-[var(--k1-text-dim)]">
          {K1_PALETTES.length} available
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {K1_PALETTES.map((palette) => (
          <TooltipProvider key={palette.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !disabled && onPaletteChange(palette.id)}
                  disabled={disabled}
                  className={`group relative h-16 rounded-lg border-2 transition-all duration-200 ${
                    selectedPalette === palette.id
                      ? 'border-[var(--k1-accent)] scale-105 shadow-lg'
                      : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)] hover:scale-102'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ background: palette.gradient }}
                  aria-label={`Select palette: ${palette.name}`}
                >
                  {/* Selection indicator */}
                  {selectedPalette === palette.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                        <div className="w-3 h-3 bg-[var(--k1-accent)] rounded-full"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Palette name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {palette.name}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{palette.name}</p>
                  <p className="text-xs text-gray-400">Palette #{palette.id}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      
      {/* Selected palette info */}
      {selectedPalette !== undefined && (
        <div className="mt-4 p-3 bg-[var(--k1-bg)] rounded-lg border border-[var(--k1-border)]">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded border border-[var(--k1-border)]"
              style={{ background: K1_PALETTES.find(p => p.id === selectedPalette)?.gradient }}
            />
            <div>
              <p className="text-sm font-medium text-[var(--k1-text)]">
                {K1_PALETTES.find(p => p.id === selectedPalette)?.name}
              </p>
              <p className="text-xs text-[var(--k1-text-dim)]">
                Active palette
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}