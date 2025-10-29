/**
 * Basic Color Controls Component
 * HSV sliders with visual feedback
 */

import React from 'react';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';
import { Input } from '../../ui/input';

interface BasicColorControlsProps {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (params: Partial<{ hue: number; saturation: number; brightness: number }>) => void;
  disabled?: boolean;
}

export function BasicColorControls({
  hue,
  saturation,
  brightness,
  onChange,
  disabled = false
}: BasicColorControlsProps) {
  
  const hsvToHex = (h: number, s: number, v: number) => {
    s = s / 100;
    v = v / 100;
    const c = v * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hh >= 0 && hh < 1) { r = c; g = x; }
    else if (hh >= 1 && hh < 2) { r = x; g = c; }
    else if (hh >= 2 && hh < 3) { g = c; b = x; }
    else if (hh >= 3 && hh < 4) { g = x; b = c; }
    else if (hh >= 4 && hh < 5) { r = x; b = c; }
    else { r = c; b = x; }
    const m = v - c;
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const currentColor = hsvToHex(hue, saturation, brightness);

  return (
    <div className="space-y-6">
      {/* Hue Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Hue</Label>
          <span className="text-[var(--k1-text-dim)] font-mono text-sm px-2 py-1 bg-[var(--k1-bg)] rounded">
            {hue}°
          </span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={360}
            step={1}
            value={[hue]}
            onValueChange={([value]: number[]) => onChange({ hue: value })}
            disabled={disabled}
            className="w-full"
          />
          {/* Hue gradient background */}
          <div 
            className="absolute inset-0 -z-10 h-2 rounded-full opacity-30"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
          />
        </div>
      </div>

      {/* Saturation Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Saturation</Label>
          <span className="text-[var(--k1-text-dim)] font-mono text-sm px-2 py-1 bg-[var(--k1-bg)] rounded">
            {saturation}%
          </span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={100}
            step={1}
            value={[saturation]}
            onValueChange={([value]: number[]) => onChange({ saturation: value })}
            disabled={disabled}
            className="w-full"
          />
          {/* Saturation gradient background */}
          <div 
            className="absolute inset-0 -z-10 h-2 rounded-full opacity-30"
            style={{
              background: `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`
            }}
          />
        </div>
      </div>

      {/* Brightness Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[var(--k1-text)]">Brightness</Label>
          <span className="text-[var(--k1-text-dim)] font-mono text-sm px-2 py-1 bg-[var(--k1-bg)] rounded">
            {brightness}%
          </span>
        </div>
        <div className="relative">
          <Slider
            min={0}
            max={100}
            step={1}
            value={[brightness]}
            onValueChange={([value]: number[]) => onChange({ brightness: value })}
            disabled={disabled}
            className="w-full"
          />
          {/* Brightness gradient background */}
          <div 
            className="absolute inset-0 -z-10 h-2 rounded-full opacity-30"
            style={{
              background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 100%))`
            }}
          />
        </div>
      </div>

      {/* Color Preview */}
      <div className="flex items-center gap-4 p-4 bg-[var(--k1-bg)] rounded-lg border border-[var(--k1-border)]">
        <div
          className="w-16 h-16 rounded-lg border-2 border-[var(--k1-border)] shadow-inner"
          style={{ backgroundColor: currentColor }}
        />
        <div className="flex-1">
          <Label className="text-[var(--k1-text-dim)] text-sm">Current Color</Label>
          <Input
            value={currentColor.toUpperCase()}
            readOnly
            className="font-mono h-8 mt-1 text-sm"
          />
          <div className="text-xs text-[var(--k1-text-dim)] mt-1">
            HSV({hue}, {saturation}%, {brightness}%)
          </div>
        </div>
      </div>
    </div>
  );
}