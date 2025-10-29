/**
 * Audio Reactive Test Page
 * Quick validation of PF-5 Phase 1 implementation
 */

import React from 'react';
import { AudioReactivePresets } from '../components/audio/AudioReactivePresets';
import { AudioPermissionHandler } from '../components/audio/AudioPermissionHandler';

export const AudioReactiveTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--k1-bg)] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎵 PF-5 Audio Reactive Test
          </h1>
          <p className="text-xl text-gray-400">
            Phase 1: Real-time beat detection with &lt;10ms latency
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Reactive Presets */}
          <div className="bg-[var(--k1-panel)] rounded-2xl p-6">
            <AudioPermissionHandler
              onPermissionGranted={() => console.log('🎤 Audio permission granted')}
              onPermissionDenied={() => console.log('🚫 Audio permission denied')}
            >
              <AudioReactivePresets />
            </AudioPermissionHandler>
          </div>

          {/* Technical Info */}
          <div className="bg-[var(--k1-panel)] rounded-2xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🔬 Technical Implementation
            </h2>
            
            <div className="space-y-4 text-sm">
              <div className="bg-[var(--k1-surface)] rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-2">AudioWorklet Processing</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• 1024-sample buffer (~23ms at 44.1kHz)</li>
                  <li>• 512-sample hop size (50% overlap)</li>
                  <li>• Hann windowing for spectral analysis</li>
                  <li>• Real-time FFT with magnitude spectrum</li>
                </ul>
              </div>

              <div className="bg-[var(--k1-surface)] rounded-lg p-4">
                <h3 className="font-semibold text-green-400 mb-2">Beat Detection</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• Spectral flux with half-wave rectification</li>
                  <li>• Adaptive thresholding (mean + 1.5σ)</li>
                  <li>• 43-frame history (~1 second)</li>
                  <li>• Minimum beat interval (300ms = 200 BPM max)</li>
                </ul>
              </div>

              <div className="bg-[var(--k1-surface)] rounded-lg p-4">
                <h3 className="font-semibold text-purple-400 mb-2">Audio Features</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• Beat detection with confidence scoring</li>
                  <li>• RMS energy (0-100 scale)</li>
                  <li>• Spectral centroid (brightness)</li>
                  <li>• Tempo estimation with median filtering</li>
                </ul>
              </div>

              <div className="bg-[var(--k1-surface)] rounded-lg p-4">
                <h3 className="font-semibold text-orange-400 mb-2">Performance Targets</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• &lt;10ms audio-to-visual latency</li>
                  <li>• 60 FPS feature updates to UI</li>
                  <li>• 30 FPS lighting parameter updates</li>
                  <li>• &lt;100MB memory footprint</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="mt-8 bg-[var(--k1-panel)] rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            🐛 Debug Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[var(--k1-surface)] rounded-lg p-4">
              <h3 className="font-semibold text-cyan-400 mb-2">Browser Support</h3>
              <div className="space-y-1 text-gray-300">
                <div>AudioContext: {window.AudioContext ? '✅' : '❌'}</div>
                <div>AudioWorklet: {window.AudioWorkletNode ? '✅' : '❌'}</div>
                <div>getUserMedia: {navigator.mediaDevices?.getUserMedia ? '✅' : '❌'}</div>
                <div>WebGPU: {navigator.gpu ? '✅' : '❌'}</div>
              </div>
            </div>

            <div className="bg-[var(--k1-surface)] rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-2">Audio Context</h3>
              <div className="space-y-1 text-gray-300 font-mono text-xs">
                <div>Sample Rate: {new AudioContext().sampleRate}Hz</div>
                <div>Base Latency: {(new AudioContext().baseLatency * 1000).toFixed(1)}ms</div>
                <div>Output Latency: {(new AudioContext().outputLatency * 1000).toFixed(1)}ms</div>
              </div>
            </div>

            <div className="bg-[var(--k1-surface)] rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-2">Performance</h3>
              <div className="space-y-1 text-gray-300 font-mono text-xs">
                <div>Memory: {(performance.memory?.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
                <div>Timing: {performance.now().toFixed(1)}ms</div>
                <div>Connection: {navigator.connection?.effectiveType || 'unknown'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">
              🎯 Testing Instructions
            </h3>
            <div className="text-gray-300 space-y-2">
              <p>1. Click "Enable Audio Reactivity" to grant microphone permission</p>
              <p>2. Play music and select an audio reactive preset</p>
              <p>3. Watch the real-time beat detection and color changes</p>
              <p>4. Monitor the debug panel for performance metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};