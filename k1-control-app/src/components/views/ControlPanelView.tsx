import { useState } from 'react';
import EffectSelector from '../control/EffectSelector';
import { EffectParameters } from '../control/EffectParameters';
import { ColorManagement } from '../control/ColorManagement';
import { GlobalSettings } from '../control/GlobalSettings';
import { StatusBar } from '../control/StatusBar';
import { useK1Actions, useK1State } from '../../providers/K1Provider';

export type EffectType = 
  | 'analog' 
  | 'spectrum' 
  | 'octave' 
  | 'metronome' 
  | 'spectronome' 
  | 'hype' 
  | 'bloom' 
  | 'pulse' 
  | 'sparkle';

export function ControlPanelView() {
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('analog');
  const actions = useK1Actions();
  const state = useK1State();
  const isConnected = state.connection === 'connected';

  // Map UI effects to firmware pattern indices
  const effectToPatternIndex: Record<EffectType, number> = {
    analog: 5,        // Bloom (VU meter style)
    spectrum: 3,      // Spectrum
    octave: 4,        // Octave
    metronome: 7,     // Temposcope
    spectronome: 8,   // Beat Tunnel (hybrid)
    hype: 1,          // Lava (intensity)
    bloom: 5,         // Bloom
    pulse: 6,         // Pulse
    sparkle: 10       // Void Trail (sparkles)
  };

  const handleEffectChange = (effect: EffectType) => {
    setSelectedEffect(effect);
    const idx = effectToPatternIndex[effect];
    if (isConnected && typeof idx === 'number') {
      // Send selection to device; provider surfaces errors
      void actions.selectPattern(String(idx));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Column 1: Effect Selector */}
          <div>
            <EffectSelector
              selectedEffect={selectedEffect}
              onEffectChange={handleEffectChange}
              disabled={!isConnected}
            />
          </div>

          {/* Column 2: Effect Parameters */}
          <div>
            <EffectParameters
              selectedEffect={selectedEffect}
              disabled={!isConnected}
            />
          </div>

          {/* Column 3: Color Management & Global Settings */}
          <div className="space-y-6">
            <GlobalSettings disabled={!isConnected} />
            <ColorManagement disabled={!isConnected} />
          </div>
        </div>
      </div>

      {/* Status Bar Footer */}
      <StatusBar isConnected={isConnected} />
    </div>
  );
}
