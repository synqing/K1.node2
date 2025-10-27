import React, { useEffect, useMemo, useState } from 'react';
import { useK1Config } from '../../providers/K1Provider';
import { getAbortStats, setAbortLoggingEnabled, setAbortWindowMs, isAbortLoggingEnabled } from '../../utils/error-utils';
import { getRealtimeMetrics } from '../../utils/realtime-metrics';

interface DevDebugPanelProps {
  collapsedInitially?: boolean;
}

export function DevDebugPanel({ collapsedInitially = true }: DevDebugPanelProps) {
  const config = useK1Config();
  const [stats, setStats] = useState(() => getAbortStats());
  const [rtm, setRtm] = useState(() => getRealtimeMetrics());
  const [collapsed, setCollapsed] = useState(collapsedInitially);
  const [loggingEnabledLocal, setLoggingEnabledLocal] = useState<boolean>(!!config.debugAborts);
  const [windowMsLocal, setWindowMsLocal] = useState<number>(getAbortStats().windowMs);

  // Hotkey: Alt+Shift+D toggles panel collapsed state
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Poll dev stats periodically for live updates
  useEffect(() => {
    const id = setInterval(() => {
      setStats(getAbortStats());
      setRtm(getRealtimeMetrics());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Keep local logging toggle in sync when config changes
  useEffect(() => {
    setLoggingEnabledLocal(!!config.debugAborts);
  }, [config.debugAborts]);

  // Apply logging toggle
  useEffect(() => {
    setAbortLoggingEnabled(loggingEnabledLocal);
  }, [loggingEnabledLocal]);

  // Apply window size when changed
  useEffect(() => {
    if (windowMsLocal && windowMsLocal > 0) {
      setAbortWindowMs(windowMsLocal);
    }
  }, [windowMsLocal]);

  const lastWindowTime = useMemo(() => {
    try {
      const dt = new Date(stats.lastWindowStartedAt);
      return dt.toLocaleTimeString();
    } catch {
      return String(stats.lastWindowStartedAt);
    }
  }, [stats.lastWindowStartedAt]);

  if (!(import.meta as any).env?.DEV) return null;

  const effectiveLogging = isAbortLoggingEnabled();
  const cats: Array<'realtime'|'audio'|'performance'> = ['realtime','audio','performance'];
  const activeCounts = {
    realtime: rtm.starts.realtime - rtm.stops.realtime,
    audio: rtm.starts.audio - rtm.stops.audio,
    performance: rtm.starts.performance - rtm.stops.performance,
  };

  return (
    <div style={{
      position: 'fixed',
      right: '8px',
      bottom: '8px',
      zIndex: 2000,
      maxWidth: '360px',
    }}>
      <div style={{
        background: 'var(--k1-panel)',
        border: '1px solid var(--k1-border)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: '1px solid var(--k1-border)',
          background: 'rgba(0,0,0,0.35)'
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--k1-text)' }}>Dev Debug Panel</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCollapsed((v) => !v)}
              style={{
                fontSize: 11,
                padding: '4px 6px',
                borderRadius: 4,
                background: 'var(--k1-surface)',
                border: '1px solid var(--k1-border)',
                color: 'var(--k1-text-dim)'
              }}
              aria-label="Toggle panel"
            >{collapsed ? 'Expand' : 'Collapse'}</button>
          </div>
        </div>
        {!collapsed && (
          <div style={{ padding: 10, color: 'var(--k1-text)' }}>
            <section style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Config</div>
              <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>hmrDelayMs: <span style={{ color: 'var(--k1-text)' }}>{config.hmrDelayMs ?? 'unset'}</span></div>
              <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>debugAborts (configured): <span style={{ color: 'var(--k1-text)' }}>{String(!!config.debugAborts)}</span></div>
              <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>abort logging (effective): <span style={{ color: effectiveLogging ? 'var(--k1-success)' : 'var(--k1-warning)' }}>{String(!!effectiveLogging)}</span></div>
            </section>

            <section style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Abort Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <div style={{ color: 'var(--k1-text-dim)' }}>window</div>
                <div>{stats.window}</div>
                <div style={{ color: 'var(--k1-text-dim)' }}>total</div>
                <div>{stats.total}</div>
                <div style={{ color: 'var(--k1-text-dim)' }}>windowMs</div>
                <div>{stats.windowMs}</div>
                <div style={{ color: 'var(--k1-text-dim)' }}>lastWindowStart</div>
                <div>{lastWindowTime}</div>
              </div>
            </section>

            <section style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Realtime Metrics</div>
              <div style={{ fontSize: 12 }}>
                {cats.map((cat) => (
                  <div key={cat} style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 0.7fr 0.7fr 0.7fr', gap: 6, marginBottom: 6 }}>
                    <div style={{ color: 'var(--k1-text-dim)' }}>{cat}</div>
                    <div>subs: {rtm.subscriptions[cat]}</div>
                    <div>starts: {rtm.starts[cat]}</div>
                    <div>stops: {rtm.stops[cat]}</div>
                    <div>active: {activeCounts[cat]}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Controls (dev-only)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={loggingEnabledLocal}
                    onChange={(e) => setLoggingEnabledLocal(e.target.checked)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>Enable abort logging</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="windowMs" style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>Summary window (ms)</label>
                <input
                  id="windowMs"
                  type="number"
                  min={500}
                  step={500}
                  value={windowMsLocal}
                  onChange={(e) => setWindowMsLocal(Number(e.target.value))}
                  style={{
                    width: 100,
                    fontSize: 12,
                    padding: '4px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--k1-border)',
                    background: 'var(--k1-surface)',
                    color: 'var(--k1-text)'
                  }}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}