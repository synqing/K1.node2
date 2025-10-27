import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { Play, Pause, RotateCcw, Download, Filter, Eye, EyeOff, Rewind, FastForward } from 'lucide-react';

interface ParameterHistoryProps {
  isConnected: boolean;
  k1Client: any;
}

interface ParameterChange {
  timestamp: number;
  parameter: string;
  oldValue: number;
  newValue: number;
  pattern: string;
  source: 'user' | 'auto' | 'preset';
}

interface ParameterSnapshot {
  timestamp: number;
  brightness: number;
  speed: number;
  intensity: number;
  hue: number;
  saturation: number;
  pattern: string;
}

const PARAMETER_COLORS = {
  brightness: '#ff6b6b',
  speed: '#4ecdc4',
  intensity: '#45b7d1',
  hue: '#96ceb4',
  saturation: '#feca57',
};

const PARAMETER_RANGES = {
  brightness: { min: 0, max: 100 },
  speed: { min: 0, max: 100 },
  intensity: { min: 0, max: 100 },
  hue: { min: 0, max: 360 },
  saturation: { min: 0, max: 100 },
};

export function ParameterHistory({ isConnected, k1Client }: ParameterHistoryProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [changes, setChanges] = useState<ParameterChange[]>([]);
  const [snapshots, setSnapshots] = useState<ParameterSnapshot[]>([]);
  const [selectedParameters, setSelectedParameters] = useState<string[]>(['brightness', 'speed', 'intensity']);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [filterSource, setFilterSource] = useState<'all' | 'user' | 'auto' | 'preset'>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  // Generate realistic parameter changes
  const generateParameterChange = (): ParameterChange => {
    const parameters = ['brightness', 'speed', 'intensity', 'hue', 'saturation'];
    const patterns = ['Spectrum', 'Beat Tunnel', 'Pulse', 'Sparkle', 'Bloom'];
    const sources: ('user' | 'auto' | 'preset')[] = ['user', 'auto', 'preset'];
    
    const parameter = parameters[Math.floor(Math.random() * parameters.length)];
    const range = PARAMETER_RANGES[parameter as keyof typeof PARAMETER_RANGES];
    const oldValue = Math.random() * (range.max - range.min) + range.min;
    const newValue = Math.random() * (range.max - range.min) + range.min;
    
    return {
      timestamp: Date.now(),
      parameter,
      oldValue: Math.round(oldValue * 10) / 10,
      newValue: Math.round(newValue * 10) / 10,
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
    };
  };

  // Generate parameter snapshot
  const generateSnapshot = (): ParameterSnapshot => {
    return {
      timestamp: Date.now(),
      brightness: 50 + Math.random() * 50,
      speed: 30 + Math.random() * 70,
      intensity: 40 + Math.random() * 60,
      hue: Math.random() * 360,
      saturation: 70 + Math.random() * 30,
      pattern: ['Spectrum', 'Beat Tunnel', 'Pulse'][Math.floor(Math.random() * 3)],
    };
  };

  // Start/stop recording
  const toggleRecording = () => {
    if (isRecording) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRecording(false);
    } else {
      setIsRecording(true);
      
      // Record parameter changes occasionally
      intervalRef.current = setInterval(() => {
        // Add parameter change (20% chance per second)
        if (Math.random() < 0.2) {
          const change = generateParameterChange();
          setChanges(prev => [...prev, change].slice(-1000)); // Keep last 1000 changes
        }
        
        // Add snapshot every 5 seconds
        if (Date.now() % 5000 < 1000) {
          const snapshot = generateSnapshot();
          setSnapshots(prev => [...prev, snapshot].slice(-500)); // Keep last 500 snapshots
        }
      }, 1000);
    }
  };

  // Clear all data
  const clearData = () => {
    setChanges([]);
    setSnapshots([]);
    setPlaybackPosition(0);
  };

  // Export data
  const exportData = () => {
    const data = {
      changes,
      snapshots,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k1-parameter-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Playback controls
  const startPlayback = () => {
    if (snapshots.length === 0) return;
    
    setIsPlaying(true);
    setPlaybackPosition(0);
    
    playbackRef.current = setInterval(() => {
      setPlaybackPosition(prev => {
        const next = prev + 1;
        if (next >= snapshots.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 200); // 5fps playback
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackRef.current) {
      clearInterval(playbackRef.current);
      playbackRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, []);

  // Filter data by time range
  const getTimeRangeData = () => {
    const now = Date.now();
    const ranges = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000 };
    const cutoff = now - ranges[timeRange];
    
    const filteredSnapshots = snapshots.filter(s => s.timestamp >= cutoff);
    const filteredChanges = changes.filter(c => 
      c.timestamp >= cutoff && 
      (filterSource === 'all' || c.source === filterSource)
    );
    
    return { snapshots: filteredSnapshots, changes: filteredChanges };
  };

  const { snapshots: displaySnapshots, changes: displayChanges } = getTimeRangeData();

  // Prepare chart data
  const chartData = displaySnapshots.map(snapshot => ({
    timestamp: snapshot.timestamp,
    time: new Date(snapshot.timestamp).toLocaleTimeString(),
    ...Object.fromEntries(
      selectedParameters.map(param => [
        param,
        snapshot[param as keyof ParameterSnapshot] as number
      ])
    ),
  }));

  const toggleParameter = (param: string) => {
    setSelectedParameters(prev => 
      prev.includes(param) 
        ? prev.filter(p => p !== param)
        : [...prev, param]
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Control Panel */}
        <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              
              <Button
                onClick={clearData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>

              <Button
                onClick={exportData}
                variant="outline"
                className="flex items-center gap-2"
                disabled={changes.length === 0}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-[var(--k1-error)] animate-pulse' : 'bg-[var(--k1-text-dim)]'}`} />
              <span className="text-sm text-[var(--k1-text-dim)]">
                {changes.length} changes • {snapshots.length} snapshots
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--k1-text-dim)]">Time Range:</span>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1m</SelectItem>
                  <SelectItem value="5m">5m</SelectItem>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--k1-text-dim)]">Source:</span>
              <Select value={filterSource} onValueChange={(value: any) => setFilterSource(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="preset">Preset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--k1-text-dim)]">Parameters:</span>
              <div className="flex gap-1">
                {Object.keys(PARAMETER_COLORS).map(param => (
                  <Button
                    key={param}
                    onClick={() => toggleParameter(param)}
                    variant={selectedParameters.includes(param) ? "default" : "outline"}
                    size="sm"
                    className="text-xs capitalize"
                  >
                    {selectedParameters.includes(param) ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {param}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Playback Controls */}
        {snapshots.length > 0 && (
          <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  variant={isPlaying ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Stop Playback' : 'Play History'}
                </Button>

                <Button
                  onClick={() => setPlaybackPosition(0)}
                  variant="outline"
                  size="sm"
                >
                  <Rewind className="w-4 h-4" />
                </Button>

                <Button
                  onClick={() => setPlaybackPosition(snapshots.length - 1)}
                  variant="outline"
                  size="sm"
                >
                  <FastForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--k1-text-dim)]">
                  Frame {playbackPosition + 1} of {snapshots.length}
                </span>
                {isPlaying && (
                  <div className="w-2 h-2 rounded-full bg-[var(--k1-success)] animate-pulse" />
                )}
              </div>
            </div>

            {snapshots.length > 0 && (
              <div className="mt-4">
                <input
                  type="range"
                  min="0"
                  max={snapshots.length - 1}
                  value={playbackPosition}
                  onChange={(e) => setPlaybackPosition(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </Card>
        )}

        {/* Parameter Timeline Chart */}
        {chartData.length > 0 && (
          <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <h3 className="text-lg font-semibold text-[var(--k1-text)] mb-4">Parameter Timeline</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
                <XAxis 
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  stroke="var(--k1-text-dim)"
                  tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
                />
                <YAxis 
                  stroke="var(--k1-text-dim)"
                  tick={{ fontSize: 10, fill: 'var(--k1-text-dim)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--k1-bg-elev)',
                    border: '1px solid var(--k1-border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <Legend />
                <Brush 
                  dataKey="timestamp" 
                  height={30} 
                  stroke="var(--k1-accent)"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                
                {selectedParameters.map(param => (
                  <Line
                    key={param}
                    type="monotone"
                    dataKey={param}
                    stroke={PARAMETER_COLORS[param as keyof typeof PARAMETER_COLORS]}
                    strokeWidth={2}
                    dot={false}
                    name={param.charAt(0).toUpperCase() + param.slice(1)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Recent Changes */}
        {displayChanges.length > 0 && (
          <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <h3 className="text-lg font-semibold text-[var(--k1-text)] mb-4">Recent Parameter Changes</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {displayChanges.slice(-20).reverse().map((change, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[var(--k1-bg)] rounded border border-[var(--k1-border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARAMETER_COLORS[change.parameter as keyof typeof PARAMETER_COLORS] }} />
                    <div>
                      <span className="font-medium text-[var(--k1-text)] capitalize">{change.parameter}</span>
                      <span className="text-[var(--k1-text-dim)] ml-2">
                        {change.oldValue} → {change.newValue}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {change.pattern}
                    </Badge>
                    <Badge 
                      variant={change.source === 'user' ? 'default' : change.source === 'auto' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {change.source}
                    </Badge>
                    <span className="text-xs text-[var(--k1-text-dim)]">
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Current Playback State */}
        {snapshots.length > 0 && (
          <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <h3 className="text-lg font-semibold text-[var(--k1-text)] mb-4">
              Current State {isPlaying && `(Playback Frame ${playbackPosition + 1})`}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(PARAMETER_COLORS).map(([param, color]) => {
                const snapshot = snapshots[playbackPosition] || snapshots[snapshots.length - 1];
                const value = snapshot?.[param as keyof ParameterSnapshot] as number;
                
                return (
                  <div key={param} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full border-4 flex items-center justify-center" style={{ borderColor: color }}>
                      <span className="text-lg font-bold text-[var(--k1-text)]">
                        {Math.round(value || 0)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--k1-text-dim)] capitalize">{param}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}