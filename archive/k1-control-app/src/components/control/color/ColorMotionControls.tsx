/**
 * Color Motion Controls Component
 * Simplified motion controls with mode-specific parameters
 */

import React from 'react';
import { Label } from '../../ui/label';
import { Slider } from '../../ui/slider';

// Simplified color motion modes
const COLOR_MODES = [
  { key: 'static', label: 'Static', icon: '⏸️', description: 'Fixed colors' },
  { key: 'flow', label: 'Flow', icon: '🌊', description: 'Smooth color transitions' },
  { key: 'pulse', label: 'Pulse', icon: '💓', description: 'Rhythmic color changes' },
  { key: 'rainbow', label: 'Rainbow', icon: '🌈', description: 'Cycle through hues' },
] as const;

type ColorMode = typeof COLOR_MODES[number]['key'];

interface ColorMotionControlsProps {
  mode: ColorMode;
  speed: number;
  intensity: number;
  onModeChange: (mode: ColorMode) => void;
  onSpeedChange: (speed: number) => void;
  onIntensityChange: (intensity: number) => void;
  disabled?: boolean;
}

export function ColorMotionControls({
  mode,
  speed,
  intensity,
  onModeChange,
  onSpeedChange,
  onIntensityChange,
  disabled = false
}: ColorMotionControlsProps) {
  
  const selectedMode = COLOR_MODES.find(m => m.key === mode) || COLOR_MODES[0];
  
  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="space-y-3">
        <Label className="text-[var(--k1-text-dim)]">Motion Style</Label>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => !disabled && onModeChange(m.key)}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                mode === m.key
                  ? 'border-[var(--k1-accent)] bg-[var(--k1-accent)]/10'
                  : 'border-[var(--k1-border)] hover:border-[var(--k1-text-dim)] bg-[var(--k1-bg)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{m.icon}</span>
                <span className="font-medium text-[var(--k1-text)]">{m.label}</span>
              </div>
              <p className="text-xs text-[var(--k1-text-dim)]">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Speed Control - Only show for non-static modes */}
      {mode !== 'static' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">Speed</Label>
            <span className="text-[var(--k1-text-dim)] font-mono text-sm px-2 py-1 bg-[var(--k1-bg)] rounded">
              {speed}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[speed]}
            onValueChange={([value]: number[]) => onSpeedChange(value)}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[var(--k1-text-dim)]">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      )}

      {/* Intensity Control - Only show for pulse and flow modes */}
      {(mode === 'pulse' || mode === 'flow') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--k1-text)]">
              {mode === 'pulse' ? 'Pulse Strength' : 'Flow Intensity'}
            </Label>
            <span className="text-[var(--k1-text-dim)] font-mono text-sm px-2 py-1 bg-[var(--k1-bg)] rounded">
              {intensity}%
            </span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[intensity]}
            onValueChange={([value]: number[]) => onIntensityChange(value)}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[var(--k1-text-dim)]">
            <span>Subtle</span>
            <span>Intense</span>
          </div>
        </div>
      )}

      {/* Mode Description */}
      <div className="p-3 bg-[var(--k1-bg)] rounded-lg border border-[var(--k1-border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{selectedMode.icon}</span>
          <span className="font-medium text-[var(--k1-text)]">{selectedMode.label} Mode</span>
        </div>
        <p className="text-sm text-[var(--k1-text-dim)]">
          {getDetailedDescription(selectedMode.key)}
        </p>
      </div>
    </div>
  );
}

function getDetailedDescription(mode: ColorMode): string {
  switch (mode) {
    case 'static':
      return 'Colors remain fixed without any motion. Perfect for consistent lighting or when you want stable colors.';
    case 'flow':
      return 'Colors transition smoothly over time, creating flowing gradients. Great for ambient lighting and relaxing environments.';
    case 'pulse':
      return 'Colors pulse rhythmically, creating breathing effects. Excellent for music visualization and dynamic scenes.';
    case 'rainbow':
      return 'Cycles through the full spectrum of hues automatically. Classic rainbow effect that works well with any pattern.';
    default:
      return 'Color motion effect for dynamic lighting.';
  }
}