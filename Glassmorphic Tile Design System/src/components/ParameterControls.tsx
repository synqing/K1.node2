import React from 'react';
import { TileParameters } from '../types/tile-types';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RotateCcw } from 'lucide-react';

interface ParameterControlsProps {
  parameters: TileParameters;
  onChange: (params: TileParameters) => void;
  onReset?: () => void;
}

export function ParameterControls({ parameters, onChange, onReset }: ParameterControlsProps) {
  const updateParameter = (key: keyof TileParameters, value: number | string) => {
    onChange({ ...parameters, [key]: value });
  };

  const controlGroups = [
    {
      title: 'Surface Properties',
      controls: [
        { key: 'blur' as const, label: 'Blur Radius', min: 0, max: 30, step: 1, unit: 'px' },
        { key: 'opacity' as const, label: 'Surface Opacity', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'borderOpacity' as const, label: 'Border Opacity', min: 0, max: 100, step: 1, unit: '%' },
      ]
    },
    {
      title: 'Lighting & Depth',
      controls: [
        { key: 'shadowIntensity' as const, label: 'Shadow Intensity', min: 0, max: 100, step: 1, unit: '%' },
        { key: 'glowIntensity' as const, label: 'Glow Intensity', min: 0, max: 100, step: 1, unit: '%' },
      ]
    },
    {
      title: 'Geometry',
      controls: [
        { key: 'borderRadius' as const, label: 'Border Radius', min: 0, max: 30, step: 1, unit: 'px' },
        { key: 'borderWidth' as const, label: 'Border Width', min: 0, max: 4, step: 0.5, unit: 'px' },
      ]
    }
  ];

  const accentColors = [
    { value: '#ffffff', label: 'White', color: 'bg-white' },
    { value: '#06b6d4', label: 'Cyan', color: 'bg-cyan-500' },
    { value: '#a855f7', label: 'Purple', color: 'bg-purple-500' },
    { value: '#fbbf24', label: 'Amber', color: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white">Parameter Controls</h3>
          <p className="text-white/60 text-sm">Explore the design space</p>
        </div>
        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* Tile Name */}
      <div className="space-y-2">
        <Label className="text-white/80">Tile Name</Label>
        <Input
          value={parameters.name}
          onChange={(e) => updateParameter('name', e.target.value)}
          className="bg-white/5 border-white/10 text-white"
          placeholder="Name your discovery..."
        />
      </div>

      {/* Accent Color */}
      <div className="space-y-2">
        <Label className="text-white/80">Accent Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => updateParameter('accentColor', color.value)}
              className={`
                h-10 rounded-lg border-2 transition-all
                ${color.color}
                ${parameters.accentColor === color.value 
                  ? 'border-white scale-105' 
                  : 'border-white/20 hover:border-white/40'
                }
              `}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* Parameter Groups */}
      {controlGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          <h4 className="text-white/70 text-sm">{group.title}</h4>
          {group.controls.map((control) => (
            <div key={control.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white/60 text-sm">{control.label}</Label>
                <span className="text-white/80 text-sm">
                  {parameters[control.key]}{control.unit}
                </span>
              </div>
              <Slider
                value={[parameters[control.key] as number]}
                onValueChange={([value]) => updateParameter(control.key, value)}
                min={control.min}
                max={control.max}
                step={control.step}
                className="w-full"
              />
            </div>
          ))}
        </div>
      ))}

      {/* CSS Export */}
      <div className="space-y-2 pt-4 border-t border-white/10">
        <Label className="text-white/80">CSS Properties</Label>
        <pre className="bg-black/30 p-3 rounded-lg text-xs text-white/70 overflow-x-auto">
{`backdrop-filter: blur(${parameters.blur}px);
background: rgba(255,255,255,${(parameters.opacity / 100).toFixed(2)});
border: ${parameters.borderWidth}px solid rgba(255,255,255,${(parameters.borderOpacity / 100).toFixed(2)});
border-radius: ${parameters.borderRadius}px;
box-shadow: 0 8px 32px rgba(0,0,0,${(parameters.shadowIntensity / 100).toFixed(2)}),
            0 0 ${parameters.glowIntensity}px ...;`}
        </pre>
      </div>
    </div>
  );
}
