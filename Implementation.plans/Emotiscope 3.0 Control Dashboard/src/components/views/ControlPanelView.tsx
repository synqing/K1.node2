import { useState } from 'react';
import { EffectSelector } from '../control/EffectSelector';
import { EffectParameters } from '../control/EffectParameters';
import { ColorManagement } from '../control/ColorManagement';
import { GlobalSettings } from '../control/GlobalSettings';
import { StatusBar } from '../control/StatusBar';

interface ControlPanelViewProps {
  isConnected: boolean;
}

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

export function ControlPanelView({ isConnected }: ControlPanelViewProps) {
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('analog');

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Column 1: Effect Selector */}
          <div className="xl:col-span-1">
            <EffectSelector
              selectedEffect={selectedEffect}
              onEffectChange={setSelectedEffect}
              disabled={!isConnected}
            />
          </div>

          {/* Column 2: Effect Parameters */}
          <div className="xl:col-span-1">
            <EffectParameters
              selectedEffect={selectedEffect}
              disabled={!isConnected}
            />
          </div>

          {/* Column 3: Color Management & Global Settings */}
          <div className="space-y-4 md:space-y-6 md:col-span-2 xl:col-span-1">
            <ColorManagement disabled={!isConnected} />
            <GlobalSettings disabled={!isConnected} />
          </div>
        </div>
      </div>

      {/* Status Bar Footer */}
      <StatusBar isConnected={isConnected} />
    </div>
  );
}
