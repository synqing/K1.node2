import { useState } from 'react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { useK1Actions } from '../../providers/K1Provider';
import { K1_PALETTES } from '../../api/k1-data';

interface ColorManagementProps {
  disabled: boolean;
}

// (legacy local colorPalettes removed; using K1_PALETTES catalog)

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [selectedPalette, setSelectedPalette] = useState<number>(K1_PALETTES[0]?.id ?? 0);
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(70);
  const [value, setValue] = useState(90);
  const [colorRange, setColorRange] = useState(50);

  const queue = useCoalescedParams();
  const actions = useK1Actions();

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
          {K1_PALETTES.map((palette) => (
            <TooltipProvider key={palette.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (disabled) return;
                      setSelectedPalette(palette.id);
                      actions.setPalette(palette.id).catch(() => {});
                    }}
                    disabled={disabled}
                    className={`h-10 rounded-lg border-2 transition-all ${
                      selectedPalette === palette.id
                        ? 'border-[var(--k1-accent)] scale-105'
                        : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ background: palette.gradient }}
                    aria-label={`Palette: ${palette.name}`}
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

      {/* Manual Controls */}
      <div className="space-y-4 pt-4 border-t border-[var(--k1-border)]">
        <Label className="text-[var(--k1-text-dim)]">Manual HSV + Range</Label>

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
            onValueChange={([value]: number[]) => {
              setHue(value);
              if (!disabled) {
                const huePct = Math.round((value / 360) * 100);
                queue({ color: huePct });
              }
            }}
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
            onValueChange={([value]: number[]) => {
              setSaturation(value);
              if (!disabled) {
                queue({ saturation: value });
              }
            }}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Brightness (Value) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Brightness</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {value}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[value]}
            onValueChange={([v]: number[]) => {
              setValue(v);
              if (!disabled) {
                queue({ brightness: v });
              }
            }}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Color Range (optional, pattern-specific use) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Color Range</Label>
            <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] text-[10px] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
              {colorRange}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[colorRange]}
            onValueChange={([value]: number[]) => {
              setColorRange(value);
              if (!disabled) {
                queue({ color_range: value });
              }
            }}
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
