import React, { useEffect, useMemo, useState } from 'react';
import type { K1Client } from '../../api/k1-client';
import { useK1Actions } from '../../providers/K1Provider';
import { useK1Realtime } from '../../hooks/useK1Realtime';

interface DebugHUDProps {
  k1Client: K1Client | null;
  isConnected: boolean;
  onClose?: () => void;
}

interface PerfMetrics {
  fps: number;
  frameTimeMs: number;
  cpuPercent: number;
}

interface AudioMetrics {
  bpm: number;
  beatConfidence: number;
  rms: number;
}

export function DebugHUD({ k1Client, isConnected, onClose }: DebugHUDProps) {
  const [perf, setPerf] = useState<PerfMetrics | null>(null);
  const [audio, setAudio] = useState<AudioMetrics | null>(null);
  const [visible, setVisible] = useState(true);

  const isLive = useMemo(() => isConnected && !!k1Client, [isConnected, k1Client]);
  const k1Actions = useK1Actions();

  // Fallback generators for SIM mode
  const genPerf = (): PerfMetrics => {
    const fps = 55 + Math.random() * 5;
    const frameTimeMs = 1000 / fps + Math.random() * 2;
    const cpuPercent = 20 + Math.random() * 30;
    return { fps, frameTimeMs, cpuPercent };
  };
  const genAudio = (): AudioMetrics => {
    const rms = Math.round(Math.random() * 100) / 100;
    const beatConfidence = Math.round(Math.random() * 100) / 100;
    const bpm = Math.round(60 + Math.random() * 80);
    return { rms, beatConfidence, bpm };
  };

  // Realtime hooks: LIVE when available, SIM fallback otherwise
  const perfRealtime = useK1Realtime<PerfMetrics>({
    subscribe: isLive
      ? (cb) =>
          k1Actions.subscribePerformance((pd) => {
            cb({
              fps: pd.fps,
              frameTimeMs: pd.frame_time_us / 1000,
              cpuPercent: pd.cpu_percent,
            });
          })
      : undefined,
    onData: (m) => setPerf(m),
    fallbackTick: genPerf,
    intervalMs: 800,
    autoStart: true,
    metricType: 'performance',
  });

  const audioRealtime = useK1Realtime<AudioMetrics>({
    subscribe: isLive
      ? (cb) =>
          k1Actions.subscribeAudio((ad: any) => {
            const bpm = typeof ad?.bpm === 'number' ? ad.bpm : (ad?.tempo_confidence ? Math.round(ad.tempo_confidence * 120) : 0);
            cb({
              bpm,
              beatConfidence: (ad?.beat_confidence ?? ad?.tempo_confidence ?? 0) as number,
              rms: (ad?.vu_level ?? ad?.rms ?? 0) as number,
            });
          })
      : undefined,
    onData: (m) => setAudio(m),
    fallbackTick: genAudio,
    intervalMs: 500,
    autoStart: true,
    metricType: 'audio',
  });

  if (!visible) return null;

  const fpsTarget = 60;
  const underTarget = perf && perf.fps < fpsTarget;
  const highFrameTime = perf && perf.frameTimeMs > 20;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="rounded-lg shadow-lg border border-gray-700 bg-black/80 backdrop-blur-sm text-white w-72">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <span className="text-sm font-semibold">Debug HUD</span>
          <div className="flex items-center gap-2">
            {!isLive && (
              <span className="text-[11px] text-yellow-300">Disconnected</span>
            )}
            <span className="text-[11px] text-gray-300">
              Perf: <span className={perfRealtime.live ? 'text-green-300' : 'text-yellow-300'}>{perfRealtime.live ? 'LIVE' : 'SIM'}</span>
            </span>
            <span className="text-[11px] text-gray-300">
              Audio: <span className={audioRealtime.live ? 'text-green-300' : 'text-yellow-300'}>{audioRealtime.live ? 'LIVE' : 'SIM'}</span>
            </span>
            <button
              className="text-gray-300 hover:text-white text-xs"
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              aria-label="Close HUD"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-300">FPS</div>
              <div className={`text-sm font-mono ${underTarget ? 'text-red-400' : 'text-green-300'}`}>{perf?.fps ?? '—'}</div>
            </div>
            <div>
              <div className="text-gray-300">Frame Time</div>
              <div className={`text-sm font-mono ${highFrameTime ? 'text-red-400' : 'text-green-300'}`}>{perf ? `${perf.frameTimeMs.toFixed(1)} ms` : '—'}</div>
            </div>
            <div>
              <div className="text-gray-300">CPU</div>
              <div className="text-sm font-mono">{perf ? `${perf.cpuPercent.toFixed(0)}%` : '—'}</div>
            </div>
            <div>
              <div className="text-gray-300">BPM</div>
              <div className="text-sm font-mono">{audio?.bpm ? `${audio.bpm.toFixed(0)} (${Math.round((audio?.beatConfidence ?? 0) * 100)}%)` : '—'}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {underTarget && (
              <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-300">Under target 60 FPS</span>
            )}
            {highFrameTime && (
              <span className="px-2 py-0.5 rounded bg-orange-600/30 text-orange-300">Frame {'>'}  20 ms</span>
            )}
          </div>
        </div>
        <div className="px-3 py-2 border-t border-gray-700 text-[11px] text-gray-300">
          <div className="flex items-center justify-between">
            <span>Tips: Alt+D toggles HUD</span>
            <span>Alt+Shift+P opens Performance</span>
          </div>
        </div>
      </div>
    </div>
  );
}