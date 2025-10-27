import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { GlassTile } from './components/GlassTile';
import { ParameterControls } from './components/ParameterControls';
import { PresetGallery } from './components/PresetGallery';
import { ComparisonView } from './components/ComparisonView';
import { SavedDiscoveries } from './components/SavedDiscoveries';
import { TileParameters, TilePreset, DEFAULT_PRESETS } from './types/tile-types';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { 
  Beaker, 
  Palette, 
  Save, 
  Copy, 
  Sparkles,
  BookmarkPlus,
  Library
} from 'lucide-react';

function App() {
  const [currentParameters, setCurrentParameters] = useState<TileParameters>(DEFAULT_PRESETS[0]);
  const [comparisonTile, setComparisonTile] = useState<TileParameters>(DEFAULT_PRESETS[5]);
  const [savedDiscoveries, setSavedDiscoveries] = useState<TileParameters[]>([]);
  const [activeTab, setActiveTab] = useState('explore');

  // Load saved discoveries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tile-discoveries');
    if (saved) {
      try {
        setSavedDiscoveries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved discoveries', e);
      }
    }
  }, []);

  // Save discoveries to localStorage
  const saveDiscovery = () => {
    const newDiscovery: TileParameters = {
      ...currentParameters,
      id: `discovery-${Date.now()}`,
      name: currentParameters.name || 'Untitled Discovery'
    };

    const updated = [...savedDiscoveries, newDiscovery];
    setSavedDiscoveries(updated);
    localStorage.setItem('tile-discoveries', JSON.stringify(updated));
    toast.success('Discovery saved to your library!');
  };

  const deleteDiscovery = (id: string) => {
    const updated = savedDiscoveries.filter(d => d.id !== id);
    setSavedDiscoveries(updated);
    localStorage.setItem('tile-discoveries', JSON.stringify(updated));
    toast.success('Discovery removed from library');
  };

  const exportAsCSS = (params: TileParameters) => {
    const glowColor = params.accentColor === '#06b6d4' ? '6, 182, 212' :
                      params.accentColor === '#a855f7' ? '168, 85, 247' :
                      params.accentColor === '#fbbf24' ? '251, 191, 36' :
                      '255, 255, 255';

    const css = `.glass-tile-${params.id} {
  backdrop-filter: blur(${params.blur}px);
  -webkit-backdrop-filter: blur(${params.blur}px);
  background: rgba(255, 255, 255, ${(params.opacity / 100).toFixed(2)});
  border: ${params.borderWidth}px solid rgba(255, 255, 255, ${(params.borderOpacity / 100).toFixed(2)});
  border-radius: ${params.borderRadius}px;
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, ${(params.shadowIntensity / 100).toFixed(2)}),
    0 0 ${params.glowIntensity}px rgba(${glowColor}, ${(params.glowIntensity / 100).toFixed(2)}),
    inset 0 1px 0 0 rgba(255, 255, 255, ${(params.borderOpacity / 200).toFixed(2)});
}`;

    navigator.clipboard.writeText(css);
    toast.success('CSS copied to clipboard!');
  };

  const randomizeParameters = () => {
    const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const colors = ['#ffffff', '#06b6d4', '#a855f7', '#fbbf24'];
    
    setCurrentParameters({
      ...currentParameters,
      id: `random-${Date.now()}`,
      name: 'Random Discovery',
      blur: random(2, 20),
      opacity: random(10, 50),
      borderOpacity: random(15, 60),
      shadowIntensity: random(5, 50),
      glowIntensity: random(10, 60),
      borderRadius: random(8, 24),
      borderWidth: random(1, 3),
      accentColor: colors[random(0, colors.length - 1)]
    });
    
    toast.success('Random parameters generated!');
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1640963269654-3fe248c5fba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdyYWRpZW50JTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NjE1NTA2Njl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
        backgroundColor: '#0f172a'
      }}
    >
      <Toaster />
      
      {/* Overlay for better contrast */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95">
        
        {/* Header */}
        <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Beaker className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-2xl">Tile Parameter Space Explorer</h1>
                  <p className="text-white/60 text-sm">Discover emergent design through systematic experimentation</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={randomizeParameters}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Randomize
                </Button>
                <Button
                  onClick={saveDiscovery}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save Discovery
                </Button>
                <Button
                  onClick={() => exportAsCSS(currentParameters)}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Export CSS
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/10 border border-white/20 p-1">
              <TabsTrigger 
                value="explore" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <Beaker className="w-4 h-4 mr-2" />
                Explore
              </TabsTrigger>
              <TabsTrigger 
                value="presets"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <Palette className="w-4 h-4 mr-2" />
                Presets
              </TabsTrigger>
              <TabsTrigger 
                value="compare"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <Copy className="w-4 h-4 mr-2" />
                Compare
              </TabsTrigger>
              <TabsTrigger 
                value="library"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                <Library className="w-4 h-4 mr-2" />
                My Library
              </TabsTrigger>
            </TabsList>

            {/* Explore Tab */}
            <TabsContent value="explore" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Preview */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-white mb-1">Live Preview</h3>
                        <p className="text-white/60 text-sm">Real-time parameter visualization</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center py-12">
                      <GlassTile 
                        parameters={currentParameters} 
                        size="large"
                        showContent={true}
                      />
                    </div>

                    {/* Size Variants */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <h4 className="text-white/70 text-sm mb-4">Size Variants</h4>
                      <div className="flex items-end justify-center gap-6">
                        <div className="space-y-2">
                          <GlassTile parameters={currentParameters} size="small" />
                          <div className="text-white/60 text-xs text-center">Small (150x90)</div>
                        </div>
                        <div className="space-y-2">
                          <GlassTile parameters={currentParameters} size="medium" />
                          <div className="text-white/60 text-xs text-center">Medium (200x120)</div>
                        </div>
                        <div className="space-y-2">
                          <GlassTile parameters={currentParameters} size="large" />
                          <div className="text-white/60 text-xs text-center">Large (250x150)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Application Examples */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                    <h3 className="text-white mb-4">Real-World Context</h3>
                    <p className="text-white/60 text-sm mb-6">See your design in different layouts</p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <GlassTile 
                        parameters={{...currentParameters, name: 'Total Users'}} 
                        size="medium"
                      />
                      <GlassTile 
                        parameters={{...currentParameters, name: 'Revenue'}} 
                        size="medium"
                      />
                      <GlassTile 
                        parameters={{...currentParameters, name: 'Growth'}} 
                        size="medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm h-fit">
                  <ParameterControls
                    parameters={currentParameters}
                    onChange={setCurrentParameters}
                    onReset={() => setCurrentParameters(DEFAULT_PRESETS[0])}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Presets Tab */}
            <TabsContent value="presets">
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                <PresetGallery
                  presets={DEFAULT_PRESETS}
                  onSelectPreset={(preset) => {
                    setCurrentParameters(preset);
                    setActiveTab('explore');
                    toast.success(`Loaded preset: ${preset.name}`);
                  }}
                  selectedPresetId={currentParameters.id}
                />
              </div>
            </TabsContent>

            {/* Compare Tab */}
            <TabsContent value="compare">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                  <ComparisonView
                    tileA={currentParameters}
                    tileB={comparisonTile}
                  />
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-white mb-4">Select Comparison Tile</h4>
                    <div className="space-y-3">
                      {DEFAULT_PRESETS.slice(0, 6).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setComparisonTile(preset)}
                          className={`
                            w-full text-left p-3 rounded-lg transition-all
                            ${comparisonTile.id === preset.id 
                              ? 'bg-white/20 border border-white/30' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="text-white text-sm">{preset.name}</div>
                          <div className="text-white/50 text-xs">{preset.category}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library">
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                <SavedDiscoveries
                  discoveries={savedDiscoveries}
                  onSelect={(discovery) => {
                    setCurrentParameters(discovery);
                    setActiveTab('explore');
                    toast.success(`Loaded: ${discovery.name}`);
                  }}
                  onDelete={deleteDiscovery}
                  onExport={exportAsCSS}
                  selectedId={currentParameters.id}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-black/30 backdrop-blur-xl mt-12">
          <div className="container mx-auto px-6 py-6">
            <div className="text-center text-white/50 text-sm">
              <p>Explore the design space • Discover emergent styles • Share your parameter recipes</p>
              <p className="mt-2 text-white/40 text-xs">
                Press <span className="text-white/60">Randomize</span> to generate unexpected combinations •
                Use <span className="text-white/60">Compare</span> to understand parameter relationships
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
