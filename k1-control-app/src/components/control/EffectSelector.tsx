import { Waves, BarChart3, Layers, Clock, Zap, TrendingUp, Flower2, Radio, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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

export default function EffectSelector({ selectedEffect, onEffectChange }: EffectSelectorProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Effect Selector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => onEffectChange(effect.id)}
            className={`
              w-full p-3 rounded-lg border text-left transition-all duration-200
              flex items-center gap-3 hover:bg-k1-surface-hover
              ${selectedEffect === effect.id 
                ? 'border-k1-accent bg-k1-accent/10 text-k1-accent' 
                : 'border-k1-border bg-k1-surface text-k1-text-secondary hover:border-k1-border-hover'
              }
            `}
          >
            <effect.icon className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{effect.name}</div>
              <div className="text-xs opacity-70 truncate">{effect.description}</div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
