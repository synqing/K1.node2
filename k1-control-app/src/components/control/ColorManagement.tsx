import { useState } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ColorManagementProps {
  disabled: boolean;
}

const colorPalettes = [
  { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(90deg, #1e3a8a, #0891b2, #06b6d4)' },
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(90deg, #7c2d12, #ea580c, #fbbf24)' },
  { id: 'forest', name: 'Forest', gradient: 'linear-gradient(90deg, #14532d, #15803d, #84cc16)' },
  { id: 'purple', name: 'Purple Rain', gradient: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a78bfa)' },
  { id: 'fire', name: 'Fire', gradient: 'linear-gradient(90deg, #7f1d1d, #dc2626, #f97316)' },
  { id: 'ice', name: 'Ice', gradient: 'linear-gradient(90deg, #0c4a6e, #0284c7, #7dd3fc)' },
  { id: 'candy', name: 'Candy', gradient: 'linear-gradient(90deg, #831843, #db2777, #f9a8d4)' },
  { id: 'earth', name: 'Earth', gradient: 'linear-gradient(90deg, #422006, #92400e, #d97706)' },
  { id: 'neon', name: 'Neon', gradient: 'linear-gradient(90deg, #be185d, #06b6d4, #84cc16)' },
  { id: 'pastel', name: 'Pastel', gradient: 'linear-gradient(90deg, #fda4af, #a5b4fc, #99f6e4)' },
  { id: 'monochrome', name: 'Mono', gradient: 'linear-gradient(90deg, #18181b, #71717a, #f4f4f5)' },
  { id: 'rainbow', name: 'Rainbow', gradient: 'linear-gradient(90deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #8b5cf6)' },
];

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [selectedPalette, setSelectedPalette] = useState('ocean');
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(70);
  const [value, setValue] = useState(90);

  const hsvToHex = (h: number, s: number, v: number) => {
    s = s / 100;
    v = v / 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const currentColor = hsvToHex(hue, saturation, value);

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      <h3 className="text-[var(--k1-text)] mb-4">Color Management</h3>

      {/* Palette Grid */}
      <div className="space-y-3 mb-6">
        <Label className="text-[var(--k1-text-dim)]">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {colorPalettes.map((palette) => (
            <TooltipProvider key={palette.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !disabled && setSelectedPalette(palette.id)}
                    disabled={disabled}
                    className={`h-10 rounded-lg border-2 transition-all ${
                      selectedPalette === palette.id
                        ? 'border-[var(--k1-accent)] scale-105'
                        : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ background: palette.gradient }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{palette.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Manual HSV Controls */}
      <div className="space-y-4 pt-4 border-t border-[var(--k1-border)]">
        <Label className="text-[var(--k1-text-dim)]">Manual HSV</Label>

        {/* Hue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Hue</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {hue}°
            </span>
          </div>
          <Slider
            min={0}
            max={360}
            step={1}
            value={[hue]}
            onValueChange={([value]: number[]) => setHue(value)}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Saturation</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {saturation}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[saturation]}
            onValueChange={([value]: number[]) => setSaturation(value)}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Value</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {value}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[value]}
            onValueChange={([value]: number[]) => setValue(value)}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Color Preview */}
        <div className="flex items-center gap-3 pt-2">
          <div
            className="w-12 h-12 rounded-lg border-2 border-[var(--k1-border)]"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <Label className="text-[var(--k1-text-dim)] text-[10px]">Current Color</Label>
            <Input
              value={currentColor.toUpperCase()}
              readOnly
              className="font-[family-name:var(--k1-code-family)] h-8 mt-1"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
