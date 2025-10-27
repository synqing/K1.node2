import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { useK1Actions, useK1State } from '../../providers/K1Provider';
import { ColorPaletteSelector } from './color/ColorPaletteSelector';
import { BasicColorControls } from './color/BasicColorControls';
import { ColorMotionControls } from './color/ColorMotionControls';
import { K1_PALETTES } from '../../api/k1-data';

interface ColorManagementProps {
  disabled: boolean;
}

type TabType = 'palette' | 'motion' | 'manual';
type ColorMode = 'static' | 'flow' | 'pulse' | 'rainbow';

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('palette');
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
  const state = useK1State();

  // Handle palette changes
  const handlePaletteChange = (paletteId: number) => {
    if (disabled) return;
    setSelectedPalette(paletteId);
    actions.setPalette(paletteId).catch(console.error);
  };

  // Handle color parameter changes
  const handleColorChange = (params: Partial<{ hue: number; saturation: number; brightness: number }>) => {
    if (disabled) return;
    
    if (params.hue !== undefined) {
      setHue(params.hue);
      const huePct = Math.round((params.hue / 360) * 100);
      queue.queue({ color: huePct });
    }
    
    if (params.saturation !== undefined) {
      setSaturation(params.saturation);
      queue.queue({ saturation: params.saturation });
    }
    
    if (params.brightness !== undefined) {
      setBrightness(params.brightness);
      queue.queue({ brightness: params.brightness });
    }
  };

  // Handle motion parameter changes
  const handleMotionModeChange = (mode: ColorMode) => {
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
  };

  const handleMotionSpeedChange = (speed: number) => {
    if (disabled) return;
    setMotionSpeed(speed);
    queue({ speed });
  };

  const handleMotionIntensityChange = (intensity: number) => {
    if (disabled) return;
    setMotionIntensity(intensity);
    queue({ color_range: intensity });
  };

  return (
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--k1-text)]">Color Control</h3>
        <div className="flex bg-[var(--k1-bg)] rounded-lg p-1 border border-[var(--k1-border)]">
          {[
            { key: 'palette' as TabType, label: 'Palettes', icon: '🎨' },
            { key: 'motion' as TabType, label: 'Motion', icon: '🌊' },
            { key: 'manual' as TabType, label: 'Manual', icon: '🎛️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-[var(--k1-accent)] text-white shadow-sm'
                  : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-surface)]'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content with Smooth Transitions */}
      <div className="min-h-[300px] relative">
        {/* Palette Tab */}
        {activeTab === 'palette' && (
          <div className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
            <ColorPaletteSelector
              selectedPalette={selectedPalette}
              onPaletteChange={handlePaletteChange}
              disabled={disabled}
            />
          </div>
        )}

        {/* Motion Tab */}
        {activeTab === 'motion' && (
          <div className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
            <ColorMotionControls
              mode={colorMode}
              speed={motionSpeed}
              intensity={motionIntensity}
              onModeChange={handleMotionModeChange}
              onSpeedChange={handleMotionSpeedChange}
              onIntensityChange={handleMotionIntensityChange}
              disabled={disabled}
            />
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
            <BasicColorControls
              hue={hue}
              saturation={saturation}
              brightness={brightness}
              onChange={handleColorChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Status Bar - Always Visible */}
      <div className="mt-6 pt-4 border-t border-[var(--k1-border)]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-[var(--k1-border)]"
                style={{ backgroundColor: `hsl(${hue}, ${saturation}%, ${brightness / 2}%)` }}
              />
              <span className="text-[var(--k1-text-dim)]">
                Active: {K1_PALETTES.find(p => p.id === selectedPalette)?.name || 'Custom'}
              </span>
            </div>
            <div className="text-[var(--k1-text-dim)]">
              Motion: {colorMode === 'static' ? 'Off' : colorMode.charAt(0).toUpperCase() + colorMode.slice(1)}
            </div>
          </div>
          
          <div className="text-xs text-[var(--k1-text-dim)] font-mono">
            HSV({hue}, {saturation}%, {brightness}%)
          </div>
        </div>
      </div>e="w-full"
    </Card>
  );
}
