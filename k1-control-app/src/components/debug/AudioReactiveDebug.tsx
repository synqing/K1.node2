import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { Volume2, VolumeX, Mic, MicOff, Activity, Zap, Radio, Settings } from 'lucide-react';
import { useK1Actions } from '../../providers/K1Provider';
import { useK1Realtime } from '../../hooks/useK1Realtime';

interface AudioReactiveDebugProps {
  isConnected: boolean;
  k1Client: any;
}

interface AudioMetrics {
  timestamp: number;
  rms: number;
  peak: number;
  beatDetected: boolean;
  beatConfidence: number;
  bpm: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  mfcc: number[];
  frequencyBands: number[];
}

interface BeatEvent {
  timestamp: number;
  confidence: number;
  bpm: number;
  energy: number;
}

const FREQUENCY_LABELS = ['Sub', '60Hz', '170Hz', '310Hz', '600Hz', '1kHz', '3kHz', '6kHz', '12kHz', '14kHz+'];

export function AudioReactiveDebug({ isConnected, k1Client }: AudioReactiveDebugProps) {
  const [isListening, setIsListening] = useState(false);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics[]>([]);
  const [beatEvents, setBeatEvents] = useState<BeatEvent[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<AudioMetrics | null>(null);
  const [sensitivity, setSensitivity] = useState([75]);
  const [beatThreshold, setBeatThreshold] = useState([60]);
  const [frequencyRange, setFrequencyRange] = useState<'full' | 'bass' | 'mid' | 'treble'>('full');
  const [visualMode, setVisualMode] = useState<'spectrum' | 'waveform' | 'beats'>('spectrum');
  const [showMFCC, setShowMFCC] = useState(false);
  const k1Actions = useK1Actions();
  const isLive = useMemo(() => isConnected && !!k1Client, [isConnected, k1Client]);

  // Simulated audio metrics generator (fallback)
  const generateAudioMetrics = (): AudioMetrics => {
    const timestamp = Date.now();
    const rms = Math.random();
    const peak = Math.max(rms, Math.random());
    const beatConfidence = Math.random();
    const beatDetected = beatConfidence > 0.6;
    const bpm = 60 + Math.random() * 120;
    const spectralCentroid = Math.random() * 8000;
    const spectralRolloff = spectralCentroid * 1.5;
    const zeroCrossingRate = Math.random();
    const mfcc = Array.from({ length: 13 }, () => Math.random());
    const frequencyBands = Array.from({ length: 10 }, () => Math.random());
    return {
      timestamp,
      rms: Math.round(rms * 100) / 100,
      peak: Math.round(peak * 100) / 100,
      beatDetected,
      beatConfidence: Math.round(beatConfidence * 100),
      bpm: Math.round(bpm),
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
      mfcc,
      frequencyBands,
    };
  };

  // Shared realtime hook for audio: LIVE when available, SIM fallback otherwise
  const realtime = useK1Realtime<AudioMetrics>({
    subscribe: isLive
      ? (cb) =>
          k1Actions.subscribeAudio((audio: any) => {
            const beatConf = audio?.beat_confidence ?? audio?.beatConfidence ?? 0;
            const bands = audio?.bands ?? audio?.frequencyBands ?? [];
            const m: AudioMetrics = {
              timestamp: Date.now(),
              rms: typeof audio?.rms === 'number' ? Math.round(audio.rms * 100) / 100 : 0,
              peak: typeof audio?.peak === 'number' ? Math.round(audio.peak * 100) / 100 : (typeof audio?.rms === 'number' ? Math.round(audio.rms * 100) / 100 : 0),
              beatDetected: beatConf > 0.6,
              beatConfidence: Math.round(beatConf * 100),
              bpm: Math.round((audio?.bpm ?? 0) as number),
              spectralCentroid: (audio?.spectral_centroid ?? audio?.spectralCentroid ?? 0) as number,
              spectralRolloff: (audio?.spectral_rolloff ?? audio?.spectralRolloff ?? 0) as number,
              zeroCrossingRate: (audio?.zero_crossing_rate ?? audio?.zeroCrossingRate ?? 0) as number,
              mfcc: (audio?.mfcc ?? Array.from({ length: 13 }, () => 0)) as number[],
              frequencyBands: (bands.length ? bands : Array.from({ length: 10 }, () => 0)) as number[],
            };
            cb(m);
          })
      : undefined,
    onData: (m) => {
      setCurrentMetrics(m);
      setAudioMetrics((prev) => [...prev, m].slice(-500));
      if (m.beatDetected) {
        setBeatEvents((prev) => [...prev, { timestamp: m.timestamp, confidence: m.beatConfidence, bpm: m.bpm, energy: Math.round(m.peak * 100) }].slice(-100));
      }
    },
    fallbackTick: generateAudioMetrics,
    intervalMs: 300,
    autoStart: false,
    metricType: 'audio',
  });

  // Toggle audio listening
  const toggleListening = () => {
    if (realtime.running) {
      realtime.stop();
      setIsListening(false);
    } else {
      realtime.start();
      setIsListening(true);
    }
  };

  // Clear all data
  const clearData = () => {
    setAudioMetrics([]);
    setBeatEvents([]);
    setCurrentMetrics(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Hook handles its own cleanup
    };
  }, []);

  // Prepare spectrum data
  const spectrumData = currentMetrics?.frequencyBands.map((value, index) => ({
    frequency: FREQUENCY_LABELS[index],
    amplitude: value,
    index,
  })) || [];

  // Prepare waveform data (last 100 samples)
  const waveformData = audioMetrics.slice(-100).map((metrics, index) => ({
    time: index,
    rms: metrics.rms,
    peak: metrics.peak,
    timestamp: metrics.timestamp,
  }));

  // Prepare beat timeline data
  const beatTimelineData = beatEvents.slice(-20).map((beat, index) => ({
    beat: index + 1,
    confidence: beat.confidence,
    bpm: beat.bpm,
    energy: beat.energy,
    timestamp: beat.timestamp,
  }));

  // MFCC data
  const mfccData = currentMetrics?.mfcc.map((value, index) => ({
    coefficient: `C${index}`,
    value: Math.round(value * 100) / 100,
    index,
  })) || [];

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Control Panel */}
        <Card className="p-4 bg-[var(--k1-panel)] border-[var(--k1-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleListening}
                variant={realtime.running ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {realtime.running ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {realtime.running ? 'Stop Listening' : 'Start Listening'}
              </Button>
              
              <Button
                onClick={clearData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <VolumeX className="w-4 h-4" />
                Clear
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--k1-text-dim)]">Mode:</span>
                <Select value={visualMode} onValueChange={(value: any) => setVisualMode(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spectrum">Spectrum</SelectItem>
                    <SelectItem value="waveform">Waveform</SelectItem>
                    <SelectItem value="beats">Beat Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${realtime.running ? 'bg-[var(--k1-success)] animate-pulse' : 'bg-[var(--k1-text-dim)]'}`} />
              <span className="text-sm text-[var(--k1-text-dim)]">
                {audioMetrics.length} samples • {beatEvents.length} beats
              </span>
              <div className="text-xs border rounded px-2 py-1 border-[var(--k1-border)] text-[var(--k1-text-dim)] ml-2">
                Source: <span className={realtime.live ? 'text-[var(--k1-success)]' : 'text-[var(--k1-warning)]'}>{realtime.live ? 'LIVE' : 'SIM'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--k1-text-dim)]">Sensitivity: {sensitivity[0]}%</label>
              <Slider
                value={sensitivity}
                onValueChange={setSensitivity}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--k1-text-dim)]">Beat Threshold: {beatThreshold[0]}%</label>
              <Slider
                value={beatThreshold}
                onValueChange={setBeatThreshold}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--k1-text-dim)]">Frequency Range</label>
              <Select value={frequencyRange} onValueChange={(value: any) => setFrequencyRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Range</SelectItem>
                  <SelectItem value="bass">Bass (20-250Hz)</SelectItem>
                  <SelectItem value="mid">Mid (250-4kHz)</SelectItem>
                  <SelectItem value="treble">Treble (4-20kHz)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Live Audio Metrics */}
        {currentMetrics && (
          <Card className="p-6 bg-[var(--k1-panel)] border-[var(--k1-border)]">
            <h3 className="text-lg font-semibold text-[var(--k1-text)] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Audio Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-accent)]">{currentMetrics.rms}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">RMS Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-warning)]">{currentMetrics.peak}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">Peak Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-success)]">{currentMetrics.bpm}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">BPM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-error)]">{currentMetrics.beatConfidence}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">Beat Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-text)]">{Math.round(currentMetrics.spectralCentroid)}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">Spectral Centroid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--k1-text)]">{Math.round(currentMetrics.spectralRolloff)}</div>
                <div className="text-sm text-[var(--k1-text-dim)]">Spectral Rolloff</div>
              </div>
            </div>

            {/* Visualizations */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span className="text-sm text-[var(--k1-text-dim)]">Visualization</span>
              </div>
              {visualMode === 'spectrum' && (
                <Button
                  onClick={() => setShowMFCC(!showMFCC)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {showMFCC ? 'Hide MFCC' : 'Show MFCC'}
                </Button>
              )}
            </div>

            <ResponsiveContainer width="100%" height={300}>
              {visualMode === 'spectrum' && (
                <BarChart data={spectrumData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
                  <XAxis 
                    dataKey="frequency" 
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
                  />
                  <Bar 
                    dataKey="amplitude" 
                    fill="var(--k1-accent)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              )}

              {visualMode === 'waveform' && (
                <AreaChart data={waveformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
                  <XAxis 
                    dataKey="time" 
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
                  />
                  <Area 
                    type="monotone"
                    dataKey="rms"
                    stroke="var(--k1-accent)"
                    fill="var(--k1-accent)"
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone"
                    dataKey="peak"
                    stroke="var(--k1-warning)"
                    fill="var(--k1-warning)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              )}

              {visualMode === 'beats' && (
                <LineChart data={beatTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--k1-border)" />
                  <XAxis 
                    dataKey="beat" 
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
                  />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="var(--k1-success)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bpm" 
                    stroke="var(--k1-accent)" 
                    strokeWidth={2}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>

            {/* Beat Events */}
            <div className="mt-4">
              <h4 className="text-md font-semibold text-[var(--k1-text)] mb-2">Recent Beat Events</h4>
              <div className="space-y-2">
                {beatEvents.slice(-10).map((beat) => (
                  <div key={beat.timestamp} className="flex items-center justify-between bg-[var(--k1-panel)] border border-[var(--k1-border)] rounded p-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[var(--k1-success)]" />
                      <div>
                        <div className="text-sm font-medium">Beat detected</div>
                        <span className="text-[var(--k1-text-dim)] ml-2">
                          {beat.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {beat.bpm} BPM
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {beat.energy} Energy
                      </Badge>
                      <span className="text-xs text-[var(--k1-text-dim)]">
                        {new Date(beat.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}