import React, { useEffect, useMemo, useState } from 'react';
import { useK1Config } from '../../providers/K1Provider';
import { getAbortStats, setAbortLoggingEnabled, setAbortWindowMs, isAbortLoggingEnabled } from '../../utils/error-utils';
import { getRealtimeMetrics, getActiveCounts, MetricType } from '../../utils/realtime-metrics';

// Constants
const HOTKEY_COMBINATION = { alt: true, shift: true, key: 'KeyD' };
const POLL_INTERVAL_MS = 1000;
const PANEL_Z_INDEX = 2000;
const METRIC_CATEGORIES: MetricType[] = ['realtime', 'audio', 'performance'];

// Styles
const panelStyles = {
  container: {
    position: 'fixed' as const,
    right: '8px',
    bottom: '8px',
    zIndex: PANEL_Z_INDEX,
    maxWidth: '360px',
  },
  panel: {
    background: 'var(--k1-panel)',
    border: '1px solid var(--k1-border)',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
    overflow: 'hidden' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    borderBottom: '1px solid var(--k1-border)',
    background: 'rgba(0,0,0,0.35)'
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--k1-text)'
  },
  toggleButton: {
    fontSize: 11,
    padding: '4px 6px',
    borderRadius: 4,
    background: 'var(--k1-surface)',
    border: '1px solid var(--k1-border)',
    color: 'var(--k1-text-dim)'
  },
  content: {
    padding: 10,
    color: 'var(--k1-text)'
  },
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    fontSize: 12
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 0.7fr 0.7fr 0.7fr 0.7fr',
    gap: 6,
    marginBottom: 6
  },
  label: {
    color: 'var(--k1-text-dim)'
  },
  input: {
    width: 100,
    fontSize: 12,
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid var(--k1-border)',
    background: 'var(--k1-surface)',
    color: 'var(--k1-text)'
  }
};

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

  // Hotkey handler for panel toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey === HOTKEY_COMBINATION.alt && 
          e.shiftKey === HOTKEY_COMBINATION.shift && 
          e.code === HOTKEY_COMBINATION.key) {
        setCollapsed(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll dev stats periodically for live updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      setStats(getAbortStats());
      setRtm(getRealtimeMetrics());
    }, POLL_INTERVAL_MS);
    
    return () => clearInterval(intervalId);
  }, []);

  // Sync local logging state with config changes
  useEffect(() => {
    setLoggingEnabledLocal(!!config.debugAborts);
  }, [config.debugAborts]);

  // Apply logging toggle changes
  useEffect(() => {
    setAbortLoggingEnabled(loggingEnabledLocal);
  }, [loggingEnabledLocal]);

  // Apply window size changes
  useEffect(() => {
    if (windowMsLocal && windowMsLocal > 0) {
      setAbortWindowMs(windowMsLocal);
    }
  }, [windowMsLocal]);

  // Computed values
  const lastWindowTime = useMemo(() => {
    try {
      const dt = new Date(stats.lastWindowStartedAt);
      return dt.toLocaleTimeString();
    } catch {
      return String(stats.lastWindowStartedAt);
    }
  }, [stats.lastWindowStartedAt]);

  const effectiveLogging = isAbortLoggingEnabled();
  const activeCounts = getActiveCounts();

  // Don't render in production
  if (!(import.meta as any).env?.DEV) return null;

  return (
    <div style={panelStyles.container}>
      <div style={panelStyles.panel}>
        <div style={panelStyles.header}>
          <span style={panelStyles.title}>Dev Debug Panel</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCollapsed(prev => !prev)}
              style={panelStyles.toggleButton}
              aria-label="Toggle panel"
            >
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
        
        {!collapsed && (
          <div style={panelStyles.content}>
            <ConfigSection 
              config={config} 
              effectiveLogging={effectiveLogging} 
            />
            
            <AbortStatsSection 
              stats={stats} 
              lastWindowTime={lastWindowTime} 
            />
            
            <RealtimeMetricsSection 
              rtm={rtm} 
              activeCounts={activeCounts} 
            />
            
            <ControlsSection
              loggingEnabledLocal={loggingEnabledLocal}
              setLoggingEnabledLocal={setLoggingEnabledLocal}
              windowMsLocal={windowMsLocal}
              setWindowMsLocal={setWindowMsLocal}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components for better organization
function ConfigSection({ config, effectiveLogging }: { 
  config: any; 
  effectiveLogging: boolean; 
}) {
  return (
    <section style={panelStyles.section}>
      <div style={panelStyles.sectionTitle}>Config</div>
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
        hmrDelayMs: <span style={{ color: 'var(--k1-text)' }}>{config.hmrDelayMs ?? 'unset'}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
        debugAborts (configured): <span style={{ color: 'var(--k1-text)' }}>{String(!!config.debugAborts)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
        abort logging (effective): <span style={{ 
          color: effectiveLogging ? 'var(--k1-success)' : 'var(--k1-warning)' 
        }}>{String(!!effectiveLogging)}</span>
      </div>
    </section>
  );
}

function AbortStatsSection({ stats, lastWindowTime }: { 
  stats: any; 
  lastWindowTime: string; 
}) {
  return (
    <section style={panelStyles.section}>
      <div style={panelStyles.sectionTitle}>Abort Stats</div>
      <div style={panelStyles.gridRow}>
        <div style={panelStyles.label}>window</div>
        <div>{stats.window}</div>
        <div style={panelStyles.label}>total</div>
        <div>{stats.total}</div>
        <div style={panelStyles.label}>windowMs</div>
        <div>{stats.windowMs}</div>
        <div style={panelStyles.label}>lastWindowStart</div>
        <div>{lastWindowTime}</div>
      </div>
    </section>
  );
}

function RealtimeMetricsSection({ rtm, activeCounts }: { 
  rtm: any; 
  activeCounts: Record<MetricType, number>; 
}) {
  return (
    <section style={panelStyles.section}>
      <div style={panelStyles.sectionTitle}>Realtime Metrics</div>
      <div style={{ fontSize: 12 }}>
        {METRIC_CATEGORIES.map((category) => (
          <div key={category} style={panelStyles.metricsGrid}>
            <div style={panelStyles.label}>{category}</div>
            <div>subs: {rtm.subscriptions[category]}</div>
            <div>starts: {rtm.starts[category]}</div>
            <div>stops: {rtm.stops[category]}</div>
            <div>active: {activeCounts[category]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ControlsSection({ 
  loggingEnabledLocal, 
  setLoggingEnabledLocal, 
  windowMsLocal, 
  setWindowMsLocal 
}: {
  loggingEnabledLocal: boolean;
  setLoggingEnabledLocal: (value: boolean) => void;
  windowMsLocal: number;
  setWindowMsLocal: (value: number) => void;
}) {
  return (
    <section>
      <div style={panelStyles.sectionTitle}>Controls (dev-only)</div>
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
        <label htmlFor="windowMs" style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
          Summary window (ms)
        </label>
        <input
          id="windowMs"
          type="number"
          min={500}
          step={500}
          value={windowMsLocal}
          onChange={(e) => setWindowMsLocal(Number(e.target.value))}
          style={panelStyles.input}
        />
      </div>
    </section>
  );
}