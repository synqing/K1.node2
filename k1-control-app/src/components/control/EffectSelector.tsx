import { Waves, BarChart3, Layers, Clock, Zap, TrendingUp, Flower2, Radio, Sparkles } from 'lucide-react';
// import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import type { EffectType } from '../views/ControlPanelView';

interface EffectSelectorProps {
  selectedEffect: EffectType;
  onEffectChange: (effect: EffectType) => void;
  disabled: boolean;
}

const effects: Array<{
  id: EffectType;
  name: string;
  icon: typeof Waves;
  color: string;
  description: string;
}> = [
  {
    id: 'analog',
    name: 'Analog',
    icon: Waves,
    color: 'var(--k1-accent)',
    description: 'Classic VU meter visualization'
  },
  {
    id: 'spectrum',
    name: 'Spectrum',
    icon: BarChart3,
    color: 'var(--port-field)',
    description: 'Full frequency spectrum analyzer'
  },
  {
    id: 'octave',
    name: 'Octave',
    icon: Layers,
    color: 'var(--port-color)',
    description: 'Octave band visualization'
  },
  {
    id: 'metronome',
    name: 'Metronome',
    icon: Clock,
    color: 'var(--k1-warning)',
    description: 'Beat-synced pulse effect'
  },
  {
    id: 'spectronome',
    name: 'Spectronome',
    icon: Zap,
    color: 'var(--k1-accent-2)',
    description: 'Spectrum + beat sync hybrid'
  },
  {
    id: 'hype',
    name: 'Hype',
    icon: TrendingUp,
    color: 'var(--k1-error)',
    description: 'Energy-reactive intensity mode'
  },
  {
    id: 'bloom',
    name: 'Bloom',
    icon: Flower2,
    color: 'var(--port-output)',
    description: 'Expanding radial patterns'
  },
  {
    id: 'pulse',
    name: 'PULSE',
    icon: Radio,
    color: 'var(--k1-accent)',
    description: 'Rhythmic pulsating effect'
  },
  {
    id: 'sparkle',
    name: 'SPARKLE',
    icon: Sparkles,
    color: 'var(--port-scalar)',
    description: 'Random sparkling particles'
  }
];

export function EffectSelector({ selectedEffect, onEffectChange, disabled }: EffectSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] uppercase tracking-wide text-[var(--k1-text-dim)]">Effect Selection</h3>
        <Badge variant="outline" className="text-[10px]">
          9 Effects
        </Badge>
      </div>

      <div className="space-y-1.5">
        {effects.map((effect) => {
          const Icon = effect.icon;
          const isSelected = selectedEffect === effect.id;

          return (
            <TooltipProvider key={effect.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !disabled && onEffectChange(effect.id)}
                    disabled={disabled}
                    className={`w-full p-2.5 rounded-md border transition-all ${
                      isSelected
                        ? 'bg-[var(--k1-panel)] border-[var(--k1-accent)] shadow-sm'
                        : 'bg-[var(--k1-bg-elev)] border-[var(--k1-border)] hover:border-[var(--k1-text-dim)]'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: isSelected ? effect.color + '20' : 'var(--k1-bg)',
                        }}
                      >
                        <Icon
                          className="w-3 h-3"
                          style={{ color: effect.color }}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[12px] font-medium text-[var(--k1-text)]">
                          {effect.name}
                        </div>
                        <div className="text-[10px] text-[var(--k1-text-dim)] leading-tight">
                          {effect.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: effect.color }}
                        />
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{effect.description}</p>
                  <p className="text-[10px] text-[var(--k1-text-dim)] mt-1">
                    Press {effects.indexOf(effect) + 1} to activate
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
