import { useState, useEffect } from 'react';
import { RotateCcw, Loader2, Check } from 'lucide-react';
import { Card } from '../ui/card';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { EffectType } from '../views/ControlPanelView';

interface EffectParametersProps {
  selectedEffect: EffectType;
  disabled: boolean;
}

const effectParams: Record<EffectType, Array<{
  id: string;
  label: string;
  type: 'slider' | 'toggle' | 'select';
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  unit?: string;
  description?: string;
}>> = {
  analog: [
    { id: 'sensitivity', label: 'Sensitivity', type: 'slider', defaultValue: 75, min: 0, max: 100, step: 1, unit: '%', description: 'Microphone input sensitivity' },
    { id: 'decay', label: 'Decay Rate', type: 'slider', defaultValue: 50, min: 0, max: 100, step: 1, unit: '%', description: 'Speed of level fall-off' },
    { id: 'smoothing', label: 'Smoothing', type: 'slider', defaultValue: 30, min: 0, max: 100, step: 1, unit: '%', description: 'Signal smoothing amount' },
    { id: 'peakHold', label: 'Peak Hold', type: 'toggle', defaultValue: true, description: 'Display peak markers' },
  ],
  spectrum: [
    { id: 'bands', label: 'Frequency Bands', type: 'select', defaultValue: '32', options: ['16', '32', '64', '128'], description: 'Number of frequency bins' },
    { id: 'gain', label: 'Gain', type: 'slider', defaultValue: 60, min: 0, max: 100, step: 1, unit: '%' },
    { id: 'interpolation', label: 'Interpolation', type: 'toggle', defaultValue: true, description: 'Smooth band transitions' },
    { id: 'lowCut', label: 'Low Cut', type: 'slider', defaultValue: 20, min: 0, max: 200, step: 10, unit: 'Hz' },
    { id: 'highCut', label: 'High Cut', type: 'slider', defaultValue: 16000, min: 1000, max: 20000, step: 100, unit: 'Hz' },
  ],
  octave: [
    { id: 'octaves', label: 'Octave Count', type: 'select', defaultValue: '8', options: ['4', '6', '8', '10'], description: 'Number of octave bands' },
    { id: 'response', label: 'Response Speed', type: 'slider', defaultValue: 45, min: 0, max: 100, step: 1, unit: '%' },
    { id: 'normalize', label: 'Auto-Normalize', type: 'toggle', defaultValue: false, description: 'Balance band levels' },
  ],
  metronome: [
    { id: 'bpm', label: 'BPM', type: 'slider', defaultValue: 120, min: 60, max: 200, step: 1, unit: 'BPM', description: 'Beats per minute' },
    { id: 'subdivision', label: 'Subdivision', type: 'select', defaultValue: '4', options: ['2', '4', '8', '16'], description: 'Beat divisions' },
    { id: 'accentFirst', label: 'Accent First Beat', type: 'toggle', defaultValue: true },
    { id: 'flash', label: 'Flash Intensity', type: 'slider', defaultValue: 80, min: 0, max: 100, step: 1, unit: '%' },
  ],
  spectronome: [
    { id: 'bpm', label: 'BPM', type: 'slider', defaultValue: 128, min: 60, max: 200, step: 1, unit: 'BPM' },
    { id: 'spectrumMix', label: 'Spectrum Mix', type: 'slider', defaultValue: 50, min: 0, max: 100, step: 1, unit: '%', description: 'Balance between spectrum and beat' },
    { id: 'beatTrigger', label: 'Beat Trigger', type: 'toggle', defaultValue: true },
  ],
  hype: [
    { id: 'threshold', label: 'Energy Threshold', type: 'slider', defaultValue: 65, min: 0, max: 100, step: 1, unit: '%', description: 'Activation threshold' },
    { id: 'attack', label: 'Attack', type: 'slider', defaultValue: 20, min: 0, max: 100, step: 1, unit: 'ms' },
    { id: 'release', label: 'Release', type: 'slider', defaultValue: 80, min: 0, max: 100, step: 1, unit: 'ms' },
    { id: 'intensity', label: 'Intensity', type: 'slider', defaultValue: 70, min: 0, max: 100, step: 1, unit: '%' },
  ],
  bloom: [
    { id: 'speed', label: 'Expansion Speed', type: 'slider', defaultValue: 55, min: 0, max: 100, step: 1, unit: '%' },
    { id: 'radius', label: 'Max Radius', type: 'slider', defaultValue: 80, min: 20, max: 100, step: 1, unit: '%' },
    { id: 'layers', label: 'Layers', type: 'select', defaultValue: '3', options: ['2', '3', '4', '5'] },
    { id: 'rotate', label: 'Rotation', type: 'toggle', defaultValue: true },
  ],
  pulse: [
    { id: 'rate', label: 'Pulse Rate', type: 'slider', defaultValue: 60, min: 20, max: 200, step: 1, unit: 'BPM' },
    { id: 'width', label: 'Pulse Width', type: 'slider', defaultValue: 40, min: 10, max: 90, step: 1, unit: '%' },
    { id: 'sync', label: 'Audio Sync', type: 'toggle', defaultValue: false, description: 'Sync to detected beat' },
  ],
  sparkle: [
    { id: 'density', label: 'Particle Density', type: 'slider', defaultValue: 50, min: 0, max: 100, step: 1, unit: '%' },
    { id: 'lifetime', label: 'Lifetime', type: 'slider', defaultValue: 35, min: 10, max: 100, step: 1, unit: '%' },
    { id: 'audioReactive', label: 'Audio Reactive', type: 'toggle', defaultValue: true },
    { id: 'twinkle', label: 'Twinkle', type: 'toggle', defaultValue: true },
  ],
};

export function EffectParameters({ selectedEffect, disabled }: EffectParametersProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [paramValues, setParamValues] = useState<Record<string, number | boolean | string>>({});

  const params = effectParams[selectedEffect];

  useEffect(() => {
    // Initialize default values
    const defaults: Record<string, number | boolean | string> = {};
    params.forEach((param) => {
      defaults[param.id] = param.defaultValue;
    });
    setParamValues(defaults);
  }, [selectedEffect]);

  const handleValueChange = (id: string, value: number | boolean | string) => {
    setParamValues((prev) => ({ ...prev, [id]: value }));
    
    // Simulate sync
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 1000);
    }, 300);
  };

  const handleReset = () => {
    const defaults: Record<string, number | boolean | string> = {};
    params.forEach((param) => {
      defaults[param.id] = param.defaultValue;
    });
    setParamValues(defaults);
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 1000);
    }, 300);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[var(--k1-text)]">
          {selectedEffect.charAt(0).toUpperCase() + selectedEffect.slice(1)} Parameters
        </h2>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <Badge variant="outline" className="text-[10px] text-[var(--k1-warning)]">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Syncing...
            </Badge>
          )}
          {syncStatus === 'synced' && (
            <Badge variant="outline" className="text-[10px] text-[var(--k1-success)]">
              <Check className="w-3 h-3 mr-1" />
              Synced
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            className="h-7"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
        <div className="space-y-6">
          {params.map((param) => (
            <div key={param.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={param.id} className="text-[var(--k1-text)]">
                  {param.label}
                </Label>
                {param.type === 'slider' && (
                  <span className="text-[var(--k1-text-dim)] font-[family-name:var(--k1-code-family)] px-2 py-0.5 bg-[var(--k1-bg)] rounded">
                    {paramValues[param.id] || param.defaultValue}{param.unit || ''}
                  </span>
                )}
              </div>

              {param.type === 'slider' && (
                <Slider
                  id={param.id}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={[Number(paramValues[param.id] ?? param.defaultValue)]}
                  onValueChange={([value]) => handleValueChange(param.id, value)}
                  disabled={disabled}
                  className="w-full"
                />
              )}

              {param.type === 'toggle' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[var(--k1-text-dim)]">
                    {param.description || param.label}
                  </span>
                  <Switch
                    id={param.id}
                    checked={Boolean(paramValues[param.id] ?? param.defaultValue)}
                    onCheckedChange={(checked) => handleValueChange(param.id, checked)}
                    disabled={disabled}
                  />
                </div>
              )}

              {param.type === 'select' && (
                <Select
                  value={String(paramValues[param.id] ?? param.defaultValue)}
                  onValueChange={(value) => handleValueChange(param.id, value)}
                  disabled={disabled}
                >
                  <SelectTrigger id={param.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {param.description && param.type !== 'toggle' && (
                <p className="text-[10px] text-[var(--k1-text-dim)]">
                  {param.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
