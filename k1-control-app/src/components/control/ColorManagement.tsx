import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { useK1Actions } from '../../providers/K1Provider';
import { ColorPaletteSelector } from './color/ColorPaletteSelector';
import { BasicColorControls } from './color/BasicColorControls';
import { ColorMotionControls } from './color/ColorMotionControls';
import { K1_PALETTES } from '../../api/k1-data';
import { K1Parameters } from '../../types/k1-types';

interface ColorManagementProps {
  disabled: boolean;
}

type ColorMode = 'static' | 'flow' | 'pulse' | 'rainbow';

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [activeTab, setActiveTab] = useState<'palette' | 'motion' | 'manual'>('palette');
  const [selectedPalette, setSelectedPalette] = useState<number>(K1_PALETTES[0]?.id ?? 0);
  
  // Basic color controls
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(70);
  const [brightness, setBrightness] = useState(90);
  
  // Motion controls
  const [colorMode, setColorMode] = useState<ColorMode>('static');
  const [motionSpeed, setMotionSpeed] = useState(50);
  const [motionIntensity, setMotionIntensity] = useState(30);
  
  const queue = useCoalescedParams();
  const actions = useK1Actions();

  // Handle palette changes
  const handlePaletteChange = useCallback((paletteId: number) => {
    if (disabled) return;
    setSelectedPalette(paletteId);
    actions.setPalette(paletteId).catch(console.error);
  }, [disabled, actions]);

  // Handle color parameter changes
  const handleColorChange = useCallback((params: Partial<{ hue: number; saturation: number; brightness: number }>) => {
    if (disabled) return;
    
    // Batch state updates
    const updates: Partial<K1Parameters> = {};
    
    if (params.hue !== undefined) {
      setHue(params.hue);
      updates.color = Math.round((params.hue / 360) * 100);
    }
    
    if (params.saturation !== undefined) {
      setSaturation(params.saturation);
      updates.saturation = params.saturation;
    }
    
    if (params.brightness !== undefined) {
      setBrightness(params.brightness);
      updates.brightness = params.brightness;
    }
    
    // Single queue call for better performance
    if (Object.keys(updates).length > 0) {
      queue.queue(updates);
    }
  }, [disabled, queue]);

  // Handle motion parameter changes
  const handleMotionModeChange = useCallback((mode: ColorMode) => {
    if (disabled) return;
    setColorMode(mode);
    
    // Map simplified modes to K1 parameters
    const modeMapping = {
      'static': 0,
      'flow': 1,
      'pulse': 2,
      'rainbow': 3
    };
    
    queue.queue({ custom_param_1: modeMapping[mode] });
  }, [disabled, queue]);

  const handleMotionSpeedChange = useCallback((speed: number) => {
    if (disabled) return;
    setMotionSpeed(speed);
    queue.queue({ speed });
  }, [disabled, queue]);

  const handleMotionIntensityChange = useCallback((intensity: number) => {
    if (disabled) return;
    setMotionIntensity(intensity);
    queue.queue({ color_range: intensity });
  }, [disabled, queue]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Color & Global Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Tab Navigation */}
        <div className="flex space-x-1 bg-k1-surface rounded-lg p-1">
          {[
            { key: 'palette', label: 'Palettes' },
            { key: 'motion', label: 'Motion' },
            { key: 'manual', label: 'Manual' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'palette' | 'motion' | 'manual')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-k1-accent text-white'
                  : 'text-k1-text-secondary hover:text-k1-text-primary hover:bg-k1-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'palette' && (
            <ColorPaletteSelector
              selectedPalette={selectedPalette}
              onPaletteChange={handlePaletteChange}
              disabled={disabled}
            />
          )}

          {activeTab === 'motion' && (
            <ColorMotionControls
              mode={colorMode}
              speed={motionSpeed}
              intensity={motionIntensity}
              onModeChange={handleMotionModeChange}
              onSpeedChange={handleMotionSpeedChange}
              onIntensityChange={handleMotionIntensityChange}
              disabled={disabled}
            />
          )}

          {activeTab === 'manual' && (
            <BasicColorControls
              hue={hue}
              saturation={saturation}
              brightness={brightness}
              onChange={handleColorChange}
              disabled={disabled}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
