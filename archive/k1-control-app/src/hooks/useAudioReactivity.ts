/**
 * Audio Reactivity Hook - The Heart of PF-5 Phase 1
 * Provides real-time audio analysis with <10ms latency
 * 
 * Usage:
 * const { audioFeatures, isListening, startListening, stopListening } = useAudioReactivity();
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioFeatures {
  beat: boolean;
  onset: boolean;
  energy: number;        // 0-100 scale
  spectralCentroid: number; // Hz
  rms: number;          // 0-1 scale
  tempo: number;        // BPM
  confidence: number;   // 0-2 scale
  timestamp: number;    // ms
}

export interface AudioReactivityConfig {
  sensitivity: number;  // 0.1-2.0, affects beat detection threshold
  smoothing: number;    // 0-1, affects feature smoothing
  minTempo: number;     // Minimum BPM to detect
  maxTempo: number;     // Maximum BPM to detect
}

const DEFAULT_CONFIG: AudioReactivityConfig = {
  sensitivity: 1.0,
  smoothing: 0.1,
  minTempo: 60,
  maxTempo: 200
};

export const useAudioReactivity = (config: Partial<AudioReactivityConfig> = {}) => {
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    beat: false,
    onset: false,
    energy: 0,
    spectralCentroid: 0,
    rms: 0,
    tempo: 120,
    confidence: 0,
    timestamp: 0
  });
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const configRef = useRef<AudioReactivityConfig>({ ...DEFAULT_CONFIG, ...config });
  
  // Smoothed features for UI display
  const smoothedFeaturesRef = useRef<AudioFeatures>({ ...audioFeatures });
  
  const initializeAudioWorklet = useCallback(async () => {
    try {
      // Create AudioContext with optimal settings for low latency
      const audioContext = new AudioContext({
        latencyHint: 'interactive', // Prioritize low latency
        sampleRate: 44100
      });
      
      // Load AudioWorklet processor
      await audioContext.audioWorklet.addModule('/src/audio/AudioWorkletProcessor.js');
      
      // Get user media with optimal constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0.01, // 10ms target latency
          sampleRate: 44100,
          channelCount: 1 // Mono for better performance
        }
      });
      
      // Create audio processing chain
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'beat-detection-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0, // Analysis only, no audio output
        channelCount: 1
      });
      
      // Handle messages from AudioWorklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audioFeatures') {
          const newFeatures = event.data.features as AudioFeatures;
          
          // Apply smoothing to reduce jitter
          const smoothing = configRef.current.smoothing;
          const smoothed = smoothedFeaturesRef.current;
          
          smoothed.energy = smoothed.energy * (1 - smoothing) + newFeatures.energy * smoothing;
          smoothed.spectralCentroid = smoothed.spectralCentroid * (1 - smoothing) + newFeatures.spectralCentroid * smoothing;
          smoothed.rms = smoothed.rms * (1 - smoothing) + newFeatures.rms * smoothing;
          smoothed.tempo = smoothed.tempo * (1 - smoothing) + newFeatures.tempo * smoothing;
          smoothed.confidence = smoothed.confidence * (1 - smoothing) + newFeatures.confidence * smoothing;
          
          // Beat and onset are not smoothed (binary events)
          smoothed.beat = newFeatures.beat;
          smoothed.onset = newFeatures.onset;
          smoothed.timestamp = newFeatures.timestamp;
          
          setAudioFeatures({ ...smoothed });
        }
      };
      
      // Connect audio processing chain
      source.connect(workletNode);
      
      // Store references
      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      mediaStreamRef.current = stream;
      
      setIsListening(true);
      setError(null);
      
    } catch (err) {
      console.error('Failed to initialize audio reactivity:', err);
      setError(err instanceof Error ? err.message : 'Unknown audio error');
      setIsListening(false);
    }
  }, []);
  
  const startListening = useCallback(async () => {
    if (isListening) return;
    
    // Check for required APIs
    if (!navigator.mediaDevices || !window.AudioContext || !window.AudioWorkletNode) {
      setError('Audio reactivity not supported in this browser');
      return;
    }
    
    await initializeAudioWorklet();
  }, [isListening, initializeAudioWorklet]);
  
  const stopListening = useCallback(() => {
    if (!isListening) return;
    
    // Clean up audio resources
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsListening(false);
    setAudioFeatures({
      beat: false,
      onset: false,
      energy: 0,
      spectralCentroid: 0,
      rms: 0,
      tempo: 120,
      confidence: 0,
      timestamp: 0
    });
  }, [isListening]);
  
  const updateConfig = useCallback((newConfig: Partial<AudioReactivityConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
    
    // Send config update to AudioWorklet
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: 'updateConfig',
        config: configRef.current
      });
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);
  
  return {
    audioFeatures,
    isListening,
    error,
    startListening,
    stopListening,
    updateConfig,
    config: configRef.current
  };
};