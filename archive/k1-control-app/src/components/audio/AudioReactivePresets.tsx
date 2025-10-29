/**
 * Audio Reactive Presets - The 5 Killer Presets for Phase 1
 * Each preset demonstrates different aspects of audio reactivity
 */

import React, { useEffect, useState } from 'react';
import { useAudioReactivity, AudioFeatures } from '../../hooks/useAudioReactivity';
import { useK1 } from '../../providers/K1Provider';

interface AudioReactivePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  mapAudioToLighting: (features: AudioFeatures) => LightingParameters;
}

interface LightingParameters {
  hue: number;        // 0-360
  saturation: number; // 0-100
  brightness: number; // 0-100
  speed: number;      // 0-100
  pattern: string;
}

const AUDIO_REACTIVE_PRESETS: AudioReactivePreset[] = [
  {
    id: 'beat-pulse',
    name: 'Beat Pulse',
    description: 'Pulses brightness on every beat with tempo-synced colors',
    icon: '🎵',
    mapAudioToLighting: (features: AudioFeatures): LightingParameters => {
      // Beat-reactive brightness with tempo-based hue cycling
      const baseBrightness = 30;
      const beatBoost = features.beat ? 70 : 0;
      const brightness = Math.min(100, baseBrightness + beatBoost + (features.energy * 0.3));
      
      // Hue cycles based on tempo (faster tempo = faster color changes)
      const hueSpeed = features.tempo / 120; // Normalize to 120 BPM
      const hue = (Date.now() * hueSpeed * 0.05) % 360;
      
      return {
        hue,
        saturation: 85 + (features.confidence * 15), // Higher confidence = more saturated
        brightness,
        speed: Math.max(20, features.tempo * 0.5), // Tempo-synced speed
        pattern: 'pulse'
      };
    }
  },
  
  {
    id: 'energy-wave',
    name: 'Energy Wave',
    description: 'Colors flow based on audio energy and spectral content',
    icon: '🌊',
    mapAudioToLighting: (features: AudioFeatures): LightingParameters => {
      // Energy-driven brightness and saturation
      const brightness = 20 + (features.energy * 0.8);
      const saturation = 60 + (features.rms * 40);
      
      // Spectral centroid maps to hue (bass = red, treble = blue)
      const normalizedCentroid = Math.min(1, features.spectralCentroid / 4000); // 0-4kHz range
      const hue = 240 + (normalizedCentroid * 120); // Blue to red spectrum
      
      return {
        hue: hue % 360,
        saturation: Math.min(100, saturation),
        brightness: Math.min(100, brightness),
        speed: 30 + (features.energy * 0.5),
        pattern: 'wave'
      };
    }
  },
  
  {
    id: 'spectrum-rainbow',
    name: 'Spectrum Rainbow',
    description: 'Full spectrum colors that dance with frequency content',
    icon: '🌈',
    mapAudioToLighting: (features: AudioFeatures): LightingParameters => {
      // Rainbow hue based on spectral centroid
      const hue = (features.spectralCentroid / 50) % 360; // Map frequency to hue
      
      // Beat-enhanced brightness
      const baseBrightness = 40 + (features.energy * 0.4);
      const beatBoost = features.beat ? 30 : 0;
      const brightness = Math.min(100, baseBrightness + beatBoost);
      
      return {
        hue,
        saturation: 90 + (features.confidence * 10),
        brightness,
        speed: 40 + (features.tempo * 0.3),
        pattern: 'rainbow'
      };
    }
  },
  
  {
    id: 'bass-drop',
    name: 'Bass Drop',
    description: 'Explosive effects triggered by low-frequency energy',
    icon: '💥',
    mapAudioToLighting: (features: AudioFeatures): LightingParameters => {
      // Detect bass-heavy content (low spectral centroid + high energy)
      const isBassHeavy = features.spectralCentroid < 200 && features.energy > 50;
      const bassIntensity = isBassHeavy ? features.energy * 2 : features.energy;
      
      // Red/orange for bass, blue/purple for treble
      const hue = features.spectralCentroid < 500 ? 15 : 270; // Orange vs Purple
      
      return {
        hue,
        saturation: 95,
        brightness: Math.min(100, 25 + bassIntensity),
        speed: features.beat ? 80 : 20,
        pattern: isBassHeavy ? 'explosion' : 'fade'
      };
    }
  },
  
  {
    id: 'ambient-flow',
    name: 'Ambient Flow',
    description: 'Gentle, flowing colors that respond to musical mood',
    icon: '🌙',
    mapAudioToLighting: (features: AudioFeatures): LightingParameters => {
      // Smooth, ambient response with gentle color transitions
      const brightness = 15 + (features.rms * 30); // Subtle brightness changes
      
      // Slow hue cycling with slight audio influence
      const baseHue = (Date.now() * 0.01) % 360; // Very slow base cycle
      const audioInfluence = (features.spectralCentroid / 100) % 60 - 30; // ±30 degree variation
      const hue = (baseHue + audioInfluence) % 360;
      
      return {
        hue,
        saturation: 70 + (features.energy * 0.2), // Gentle saturation changes
        brightness: Math.min(60, brightness), // Cap brightness for ambient feel
        speed: 10 + (features.tempo * 0.1), // Very slow speed changes
        pattern: 'flow'
      };
    }
  }
];

export const AudioReactivePresets: React.FC = () => {
  const { audioFeatures, isListening, startListening, stopListening, error } = useAudioReactivity();
  const { sendCommand, isConnected } = useK1();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  // Apply active preset to lighting
  useEffect(() => {
    if (!activePreset || !isListening || !isConnected) return;
    
    const preset = AUDIO_REACTIVE_PRESETS.find(p => p.id === activePreset);
    if (!preset) return;
    
    // Throttle updates to 30 FPS to avoid overwhelming the device
    const now = Date.now();
    if (now - lastUpdate < 33) return; // ~30 FPS
    
    const lightingParams = preset.mapAudioToLighting(audioFeatures);
    
    // Send lighting commands to K1 device
    sendCommand({
      type: 'updateParams',
      params: {
        hue: lightingParams.hue,
        saturation: lightingParams.saturation,
        brightness: lightingParams.brightness,
        speed: lightingParams.speed,
        pattern: lightingParams.pattern
      }
    });
    
    setLastUpdate(now);
  }, [audioFeatures, activePreset, isListening, isConnected, sendCommand, lastUpdate]);
  
  const handlePresetSelect = async (presetId: string) => {
    if (activePreset === presetId) {
      // Deactivate current preset
      setActivePreset(null);
      stopListening();
    } else {
      // Activate new preset
      setActivePreset(presetId);
      if (!isListening) {
        await startListening();
      }
    }
  };
  
  return (
    <div className="audio-reactive-presets">
      <div className="presets-header">
        <h3>🎵 Audio Reactive Presets</h3>
        <p>Real-time lighting that syncs with your music</p>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {isListening && (
          <div className="audio-status">
            <div className="audio-visualizer">
              <div className="beat-indicator" data-active={audioFeatures.beat}>
                🎵 {audioFeatures.beat ? 'BEAT' : ''}
              </div>
              <div className="audio-metrics">
                <span>Energy: {Math.round(audioFeatures.energy)}</span>
                <span>Tempo: {Math.round(audioFeatures.tempo)} BPM</span>
                <span>Confidence: {audioFeatures.confidence.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="presets-grid">
        {AUDIO_REACTIVE_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className={`preset-card ${activePreset === preset.id ? 'active' : ''}`}
            onClick={() => handlePresetSelect(preset.id)}
          >
            <div className="preset-icon">{preset.icon}</div>
            <h4>{preset.name}</h4>
            <p>{preset.description}</p>
            
            {activePreset === preset.id && isListening && (
              <div className="preset-live-preview">
                <div 
                  className="color-preview"
                  style={{
                    backgroundColor: `hsl(${preset.mapAudioToLighting(audioFeatures).hue}, ${preset.mapAudioToLighting(audioFeatures).saturation}%, ${preset.mapAudioToLighting(audioFeatures).brightness}%)`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!isConnected && (
        <div className="connection-warning">
          ⚠️ Connect to a K1 device to see audio reactive lighting
        </div>
      )}
    </div>
  );
};