import { useState, useCallback, useEffect } from 'react';
import type { DragEvent } from 'react';
import { Card } from '../ui/card';
import { useCoalescedParams } from '../../hooks/useCoalescedParams';
import { useK1Actions } from '../../providers/K1Provider';
import { ColorPaletteSelector } from './color/ColorPaletteSelector';
import { BasicColorControls } from './color/BasicColorControls';
import { ColorMotionControls } from './color/ColorMotionControls';
import { Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { K1_PALETTES } from '../../api/k1-data';
import { K1Parameters } from '../../types/k1-types';

interface ColorManagementProps {
  disabled: boolean;
}

type TabType = 'palette' | 'motion' | 'manual';
type ColorMode = 'static' | 'flow' | 'pulse' | 'rainbow';

export function ColorManagement({ disabled }: ColorManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('palette');
  const [tabOrder, setTabOrder] = useState<TabType[]>(['palette','motion','manual']);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragKey, setDragKey] = useState<TabType | null>(null);
  const handleDragStart = (key: TabType) => { if (!reorderMode) return; setDragKey(key); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { if (!reorderMode) return; e.preventDefault(); };
  const handleDrop = (targetKey: TabType) => {
    if (!reorderMode || !dragKey || dragKey === targetKey) { setDragKey(null); return; }
    const from = tabOrder.indexOf(dragKey);
    const to = tabOrder.indexOf(targetKey);
    if (from === -1 || to === -1) { setDragKey(null); return; }
    const next = [...tabOrder];
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    setTabOrder(next);
    setDragKey(null);
  };
  const handleDragEnd = () => { setDragKey(null); };
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('k1:v1:ui:colorTabOrder');
      const savedActive = localStorage.getItem('k1:v1:ui:colorTabActive');
      const defaultOrder: TabType[] = ['palette','motion','manual'];
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((k: any) => defaultOrder.includes(k))) {
          setTabOrder(parsed as TabType[]);
        }
      }
      if (savedActive && ['palette','motion','manual'].includes(savedActive)) {
        setActiveTab(savedActive as TabType);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('k1:v1:ui:colorTabOrder', JSON.stringify(tabOrder));
    } catch {}
  }, [tabOrder]);
  useEffect(() => {
    try {
      localStorage.setItem('k1:v1:ui:colorTabActive', activeTab);
    } catch {}
  }, [activeTab]);
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
    <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12px] uppercase tracking-wide text-[var(--k1-text-dim)]">Color Management</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--k1-bg)] rounded-lg p-1 border border-[var(--k1-border)]">
            {tabOrder.map((key) => {
              const defs: Record<TabType, { label: string; icon: string }> = {
                palette: { label: 'Palettes', icon: '🎨' },
                motion: { label: 'Motion', icon: '🌊' },
                manual: { label: 'Manual', icon: '🎛️' },
              };
              const tab = { key, ...defs[key] };
              return (
                <div
                  key={tab.key}
                  className={`flex items-center ${reorderMode ? 'cursor-move' : ''} ${reorderMode && dragKey && dragKey !== tab.key ? 'ring-1 ring-[var(--k1-border)]' : ''}`}
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart(tab.key)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(tab.key)}
                  onDragEnd={handleDragEnd}
                  aria-grabbed={reorderMode && dragKey === tab.key ? true : undefined}
                >
                   <button
                     onClick={() => setActiveTab(tab.key)}
                     className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-200 ${
                       activeTab === tab.key
                         ? 'bg-[var(--k1-accent)] text-white shadow-sm'
                         : 'text-[var(--k1-text-dim)] hover:text-[var(--k1-text)] hover:bg-[var(--k1-surface)]'
                     }`}
                   >
                     <span className="mr-1">{tab.icon}</span>
                     {tab.label}
                   </button>
                  {reorderMode && (
                    <div className="ml-1 flex items-center">
                      <button
                        className="px-1 py-0.5 text-[10px] text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]"
                        onClick={() => {
                          const idx = tabOrder.indexOf(tab.key);
                          if (idx > 0) {
                            const next = [...tabOrder];
                            [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                            setTabOrder(next);
                          }
                        }}
                        aria-label={`Move ${tab.label} left`}
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        className="px-1 py-0.5 text-[10px] text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]"
                        onClick={() => {
                          const idx = tabOrder.indexOf(tab.key);
                          if (idx < tabOrder.length - 1) {
                            const next = [...tabOrder];
                            [next[idx+1], next[idx]] = [next[idx], next[idx+1]];
                            setTabOrder(next);
                          }
                        }}
                        aria-label={`Move ${tab.label} right`}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`p-1.5 rounded-md border text-[12px] ${reorderMode ? 'bg-[var(--k1-accent)] text-white border-[var(--k1-accent)]' : 'border-[var(--k1-border)] text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]'}`}
            aria-label="Customize tab order"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content with Smooth Transitions */}
      <div className="relative">
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
      </div>
    </Card>
  );
}
