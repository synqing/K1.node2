import React, { useEffect, useMemo, useState } from 'react';
import type { K1Client } from '../../api/k1-client';
import { useK1Actions, useK1State } from '../../providers/K1Provider';
import { useK1Realtime } from '../../hooks/useK1Realtime';
import { isAbortLoggingEnabled, setAbortLoggingEnabled } from '../../utils/error-utils';
import { triggerStorageEvent } from '../../utils/persistence';
import { isActivationKey } from '../../utils/accessibility';

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
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('k1.debugHUDVisible') : null;
      if (raw === null) return true;
      const v = raw.toLowerCase();
      return v === '1' || v === 'true';
    } catch { return true; }
  });
  const [abortOn, setAbortOn] = useState<boolean>(isAbortLoggingEnabled());
  const [overlayOn, setOverlayOn] = useState<boolean>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('k1.hmrOverlay') : null;
      return raw === '1' || raw === 'true';
    } catch { return true; }
  });
  const [lastTransportEvt, setLastTransportEvt] = useState<{ preferredTransport: 'ws' | 'rest'; wsEnabled: boolean; ts: number } | null>(null);

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

  const { transport } = useK1State();
  const [reconnectInfo, setReconnectInfo] = useState<any | null>(null);
  const [rateLimiterInfo, setRateLimiterInfo] = useState<any | null>(null);
  const coalesceWindowMs = (transport.activeTransport === 'ws' && transport.wsAvailable) ? 80 : 140;

  useEffect(() => {
    const interval = setInterval(() => {
      setReconnectInfo(k1Client?.getReconnectInfo ? k1Client.getReconnectInfo() : null);
      setRateLimiterInfo(k1Client?.getRateLimiterInfo ? k1Client.getRateLimiterInfo() : null);
    }, 500);
    return () => clearInterval(interval);
  }, [k1Client, transport]);

  // Listen for transport change events to update the lastTransportEvt state
  useEffect(() => {
    const onTransport = (event: Event) => {
      try {
        const ce = event as CustomEvent<{ preferredTransport?: 'ws' | 'rest'; wsEnabled?: boolean }>
        const preferredTransport = (ce.detail?.preferredTransport === 'ws' || ce.detail?.preferredTransport === 'rest') ? ce.detail.preferredTransport : undefined
        if (preferredTransport) {
          setLastTransportEvt({ preferredTransport, wsEnabled: !!ce.detail?.wsEnabled, ts: Date.now() })
        }
      } catch {}
    }
    window.addEventListener('k1:transportChange', onTransport as EventListener)
    return () => {
      window.removeEventListener('k1:transportChange', onTransport as EventListener)
    }
  }, [])

  // Sync toggle states with storage and custom events
  useEffect(() => {
    const onHmr = (event: Event) => {
      try {
        const ce = event as CustomEvent<{ enabled?: boolean }>;
        if (typeof ce.detail?.enabled === 'boolean') {
          setOverlayOn(!!ce.detail.enabled);
        }
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === 'k1.hmrOverlay') {
          setOverlayOn(e.newValue === '1' || e.newValue === 'true');
        }
        if (e.key === 'k1.debugAborts') {
          setAbortOn(e.newValue === '1' || e.newValue === 'true');
        }
        if (e.key === 'k1.debugHUDVisible') {
          setVisible(e.newValue === '1' || e.newValue === 'true');
        }
      } catch {}
    };
    const onGeneric = (event: Event) => {
      try {
        const ce = event as CustomEvent<{ key: string; newValue: string | null }>;
        if (ce.detail?.key === 'k1.debugAborts') {
          setAbortOn(ce.detail.newValue === '1' || ce.detail.newValue === 'true');
        }
        if (ce.detail?.key === 'k1.debugHUDVisible') {
          setVisible(ce.detail.newValue === '1' || ce.detail.newValue === 'true');
        }
      } catch {}
    };
    window.addEventListener('k1:hmrOverlayChange', onHmr as EventListener);
    window.addEventListener('storage', onStorage);
    window.addEventListener('k1:storageChange', onGeneric as EventListener);
    return () => {
      window.removeEventListener('k1:hmrOverlayChange', onHmr as EventListener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('k1:storageChange', onGeneric as EventListener);
    };
  }, []);

  const handleTransportToggle = () => {
    const isCurrentlyWS = transport.activeTransport === 'ws' && transport.wsAvailable;
    k1Actions.setWebSocketEnabled(!isCurrentlyWS);
  };

  const toggleAbortLogging = () => {
    const next = !isAbortLoggingEnabled();
    setAbortLoggingEnabled(next);
    setAbortOn(next);
  };

  const toggleHmrOverlay = () => {
    try {
      const current = localStorage.getItem('k1.hmrOverlay');
      const next = current === '1' || current === 'true' ? '0' : '1';
      localStorage.setItem('k1.hmrOverlay', next);
      setOverlayOn(next === '1');
      triggerStorageEvent('k1.hmrOverlay', next, current);
    } catch {
      // Fallback: still dispatch the event without storage
      const next = '1';
      setOverlayOn(true);
      triggerStorageEvent('k1.hmrOverlay', next, null);
    }
  };

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
                try {
                  const prev = typeof localStorage !== 'undefined' ? localStorage.getItem('k1.debugHUDVisible') : null;
                  localStorage.setItem('k1.debugHUDVisible', '0');
                  triggerStorageEvent('k1.debugHUDVisible', '0', prev);
                } catch {}
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
              <span className="px-2 py-0.5 rounded bg-orange-600/30 text-orange-300">Frame {'>'} 20 ms</span>
            )}
          </div>
        </div>
        
        {/* Transport & Timing */}
        <div className="px-3 py-2 border-t border-gray-700 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 font-medium">Transport & Timing</span>
            <button
              onClick={handleTransportToggle}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                transport.activeTransport === 'ws' && transport.wsAvailable
                  ? 'bg-green-600/30 text-green-300 hover:bg-green-600/40'
                  : 'bg-orange-600/30 text-orange-300 hover:bg-orange-600/40'
              }`}
              title="Toggle between WebSocket and REST transport"
            >
              {transport.activeTransport === 'ws' && transport.wsAvailable ? 'WS' : 'REST'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-gray-300">Active Transport</div>
              <div className="text-sm font-mono">{transport.activeTransport}</div>
            </div>
            <div>
              <div className="text-gray-300">WS Available</div>
              <div className="text-sm font-mono">{transport.wsAvailable ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="text-gray-300">Next Reconnect</div>
              <div className="text-sm font-mono">{reconnectInfo?.nextDelayMs ? `${Math.round(reconnectInfo.nextDelayMs)} ms` : '—'}</div>
            </div>
            <div>
              <div className="text-gray-300">Coalescing Window</div>
              <div className="text-sm font-mono">{`${coalesceWindowMs} ms (estimated)`}</div>
            </div>
            <div>
              <div className="text-gray-300">Update Rate Limit</div>
              <div className="text-sm font-mono">{rateLimiterInfo?.minIntervalMs ? `≥ ${rateLimiterInfo.minIntervalMs} ms` : '—'}</div>
            </div>
          </div>
          {lastTransportEvt && (
            <div className="mt-2 text-[11px] text-gray-300">
              <span className="opacity-80">Last Transport Change:</span>{' '}
              <span className="font-mono">{lastTransportEvt.preferredTransport}</span>{' '}
              <span className="opacity-70">(ws {lastTransportEvt.wsEnabled ? 'enabled' : 'disabled'})</span>{' '}
              <span className="opacity-60">@ {new Date(lastTransportEvt.ts).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        <div className="px-3 py-2 border-t border-gray-700 text-[11px] text-gray-300">
          <div className="flex items-center justify-between">
            <span>Tips: Alt+D toggles HUD</span>
            <span>Alt+Shift+P opens Performance</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-white/10">
          <div className="font-semibold text-[12px] opacity-80 mb-1.5">Dev Toggles</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={toggleAbortLogging}
              onKeyDown={(e) => { if (isActivationKey(e)) { e.preventDefault(); toggleAbortLogging(); } }}
              aria-pressed={abortOn}
              className="px-2.5 py-1 rounded border border-gray-700 bg-[var(--k1-surface)] text-[var(--k1-text-dim)] hover:bg-[var(--k1-panel)] hover:text-[var(--k1-text)] transition-colors text-[11px]"
            >
              {abortOn ? 'Abort Logging: On' : 'Abort Logging: Off'}
            </button>
            <button
              onClick={toggleHmrOverlay}
              onKeyDown={(e) => { if (isActivationKey(e)) { e.preventDefault(); toggleHmrOverlay(); } }}
              aria-pressed={overlayOn}
              className="px-2.5 py-1 rounded border border-gray-700 bg-[var(--k1-surface)] text-[var(--k1-text-dim)] hover:bg-[var(--k1-panel)] hover:text-[var(--k1-text)] transition-colors text-[11px]"
            >
              {overlayOn ? 'HMR Overlay: On' : 'HMR Overlay: Off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}