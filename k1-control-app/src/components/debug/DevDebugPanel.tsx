import React, { useEffect, useMemo, useState } from 'react';
import { useK1Config } from '../../providers/K1Provider';
import { getAbortStats, setAbortLoggingEnabled, setAbortWindowMs, isAbortLoggingEnabled } from '../../utils/error-utils';
import { getRealtimeMetrics, getActiveCounts, MetricType } from '../../utils/realtime-metrics';
import { BetweennessMetrics, loadBetweennessMetrics, parseBetweennessMetricsFile } from '../../utils/betweenness-metrics';

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
  const [betw, setBetw] = useState<BetweennessMetrics | null>(null);
  const [betwError, setBetwError] = useState<string | null>(null);

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

  // Attempt to load betweenness metrics from default path
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await loadBetweennessMetrics();
      if (cancelled) return;
      if (m) {
        setBetw(m);
        setBetwError(null);
      } else {
        setBetw(null);
        setBetwError('metrics/graph.metrics.json not found');
      }
    })();
    return () => { cancelled = true; };
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

            <BetweennessMetricsSection 
              betw={betw}
              error={betwError}
              onFileSelected={async (file) => {
                const parsed = await parseBetweennessMetricsFile(file);
                if (parsed) {
                  setBetw(parsed);
                  setBetwError(null);
                } else {
                  setBetw(null);
                  setBetwError('Failed to parse selected JSON file');
                }
              }}
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

function BetweennessMetricsSection({ betw, error, onFileSelected }: {
  betw: BetweennessMetrics | null;
  error: string | null;
  onFileSelected: (file: File) => void;
}) {
  const [snapshotA, setSnapshotA] = useState<BetweennessMetrics | null>(null);
  const [snapshotB, setSnapshotB] = useState<BetweennessMetrics | null>(null);
  const topNodes = (betw?.betweenness_top_nodes ?? []).slice(0, 8);

  return (
    <section style={panelStyles.section}>
      <div style={panelStyles.sectionTitle}>Betweenness Metrics</div>
      {!betw && (
        <div style={{ fontSize: 12, color: 'var(--k1-text-dim)', marginBottom: 8 }}>
          {error ?? 'Loading metrics...'}
        </div>
      )}
      {betw && (
        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 6 }}>
            <span style={panelStyles.label}>domain</span>{' '}
            <span style={{ fontFamily: 'monospace' }}>{betw.betweenness_domain ?? 'n/a'}</span>
            <DomainTooltip domain={betw.betweenness_domain} layers={betw.layers} />
          </div>
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={panelStyles.label}>normalization</span>{' '}
            <span style={{ fontFamily: 'monospace' }}>{betw.betweenness_normalization_scheme ?? 'n/a'}</span>
            <SchemeTooltip scheme={betw.betweenness_normalization_scheme} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={panelStyles.label}>top_k</span>{' '}
            <span style={{ fontFamily: 'monospace' }}>{betw.betweenness_top_k ?? 'n/a'}</span>
          </div>

          {/* Layer Band Visualization */}
          <div style={{ marginTop: 8 }}>
            <div style={panelStyles.label}>layer_band</div>
            <LayerBandVisualization layers={betw.layers} width={betw.width} domain={betw.betweenness_domain} />
          </div>

          {/* Top Nodes */}
          <div style={{ marginTop: 8 }}>
            <div style={panelStyles.label}>top_nodes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {topNodes.map((n, i) => (
                <div key={`${n.node}-${i}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>#{n.node}</span>
                  <span>{Number(n.score).toFixed(5)}</span>
                </div>
              ))}
              {topNodes.length === 0 && (
                <div style={{ color: 'var(--k1-text-dim)' }}>No top nodes</div>
              )}
            </div>
          </div>

          {/* Snapshots */}
          <div style={{ marginTop: 10 }}>
            <div style={panelStyles.label}>snapshots</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => betw && setSnapshotA(betw)}
                style={{ padding: '4px 6px', border: '1px solid var(--k1-border)', borderRadius: 4, background: 'var(--k1-surface)', fontSize: 12 }}
              >Save as A</button>
              <button
                onClick={() => betw && setSnapshotB(betw)}
                style={{ padding: '4px 6px', border: '1px solid var(--k1-border)', borderRadius: 4, background: 'var(--k1-surface)', fontSize: 12 }}
              >Save as B</button>
              <span style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
                {snapshotA ? 'A ✓' : 'A -'} · {snapshotB ? 'B ✓' : 'B -'}
              </span>
              <label style={{ fontSize: 11, color: 'var(--k1-text-dim)' }}>
                Import A
                <input type="file" accept="application/json" style={{ display: 'block' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text) as BetweennessMetrics;
                      if (json && (json.betweenness_domain || json.betweenness_top_nodes)) {
                        setSnapshotA(json);
                      }
                    } catch {}
                  }} />
              </label>
              <label style={{ fontSize: 11, color: 'var(--k1-text-dim)' }}>
                Import B
                <input type="file" accept="application/json" style={{ display: 'block' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text) as BetweennessMetrics;
                      if (json && (json.betweenness_domain || json.betweenness_top_nodes)) {
                        setSnapshotB(json);
                      }
                    } catch {}
                  }} />
              </label>
            </div>
            <SnapshotCompareSection a={snapshotA} b={snapshotB} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>Load JSON manually</label>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
          }}
          style={{ display: 'block', marginTop: 6 }}
        />
      </div>
    </section>
  );
}

function SchemeTooltip({ scheme }: { scheme: string | undefined }) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => {
    const map: Record<string, string> = {
      domain_minmax: 'Scale scores to [min,max] within selected domain.',
      layer_minmax: 'Scale scores to [min,max] per layer, compare across layers.',
      graph_minmax: 'Scale scores to [min,max] across entire graph.',
      none: 'No normalization applied; raw scores shown.',
      zscore: 'Standardize scores using mean and std-dev of domain.'
    };
    if (!scheme) return '—';
    return map[scheme] ?? 'Unknown scheme';
  }, [scheme]);

  return (
    <span
      title={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--k1-border)',
        fontSize: 11, cursor: 'help'
      }}
    >i
      {open && (
        <span style={{
          position: 'absolute', transform: 'translateY(18px)',
          background: 'var(--k1-panel)', border: '1px solid var(--k1-border)',
          borderRadius: 4, padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap'
        }}>{text}</span>
      )}
    </span>
  );
}

function LayerBandVisualization({ layers, width, domain }: { layers: number | undefined; width: number | undefined; domain: string | undefined }) {
  const L = layers ?? undefined;
  const selection = useMemo(() => {
    if (!L || !domain) return null;
    const sel = new Array(L).fill(false);
    const d = domain;
    const markRange = (a: number, b: number) => {
      const lo = Math.max(0, Math.min(a, b));
      const hi = Math.min(L - 1, Math.max(a, b));
      for (let i = lo; i <= hi; i++) sel[i] = true;
    };

    if (d.startsWith('layer0')) {
      sel[0] = true;
    } else if (d.startsWith('layer:')) {
      const v = Number(d.split(':')[1]);
      if (!Number.isNaN(v) && v >= 0 && v < L) sel[v] = true;
    } else if (d.startsWith('layers:')) {
      const range = d.split(':')[1];
      const [a, b] = range.split('-').map(n => Number(n));
      if (!Number.isNaN(a) && !Number.isNaN(b)) markRange(a, b);
    } else if (d.startsWith('even')) {
      for (let i = 0; i < L; i++) sel[i] = i % 2 === 0;
    } else if (d.startsWith('odd')) {
      for (let i = 0; i < L; i++) sel[i] = i % 2 === 1;
    } else if (d.startsWith('middle')) {
      const m = Math.floor(L / 2);
      sel[m] = true;
    } else if (d.startsWith('layer_rank') || d.startsWith('layer_quantile')) {
      // Unknown exact indices; selection not computable from domain alone.
      return 'unknown';
    } else {
      return null;
    }
    return sel;
  }, [L, domain]);

  if (!L) {
    return (
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
        No layer count in metrics. Include `layers` to visualize.
      </div>
    );
  }

  if (selection === 'unknown') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 320 }}>
          {new Array(L).fill(0).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 2,
              background: 'linear-gradient(135deg, #999 25%, #666 25% 50%, #999 50% 75%, #666 75%)',
              border: '1px solid var(--k1-border)'
            }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--k1-text-dim)', marginTop: 4 }}>
          Selected layers by metric; indices unknown (domain only).
        </div>
      </div>
    );
  }

  if (!selection) {
    return (
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>
        Domain does not map directly to layer indices.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 320 }}>
        {selection.map((selected, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: 2,
            background: selected ? 'var(--k1-success)' : 'var(--k1-surface)',
            border: '1px solid var(--k1-border)'
          }} />
        ))}
      </div>
      {typeof width === 'number' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {new Array(L).fill(0).map((_, i) => (
            <div key={`w-${i}`} style={{ fontSize: 11, color: 'var(--k1-text-dim)' }}>
              L{i}: {width} nodes
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SnapshotCompareSection({ a, b }: { a: BetweennessMetrics | null; b: BetweennessMetrics | null }) {
  if (!a || !b) {
    return (
      <div style={{ fontSize: 12, color: 'var(--k1-text-dim)', marginTop: 6 }}>
        Save two snapshots to compare.
      </div>
    );
  }

  const nodes = new Map<number, { a?: number; b?: number }>();
  (a.betweenness_top_nodes ?? []).forEach(n => {
    nodes.set(n.node, { ...(nodes.get(n.node) || {}), a: n.score });
  });
  (b.betweenness_top_nodes ?? []).forEach(n => {
    nodes.set(n.node, { ...(nodes.get(n.node) || {}), b: n.score });
  });

  const rows = Array.from(nodes.entries())
    .map(([node, v]) => ({ node, a: v.a ?? 0, b: v.b ?? 0, d: (v.b ?? 0) - (v.a ?? 0) }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
    .slice(0, 8);

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        domain: <span style={{ fontFamily: 'monospace' }}>{a.betweenness_domain ?? 'n/a'}</span>{' '}
        → <span style={{ fontFamily: 'monospace' }}>{b.betweenness_domain ?? 'n/a'}</span>
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        scheme: <span style={{ fontFamily: 'monospace' }}>{a.betweenness_normalization_scheme ?? 'n/a'}</span>{' '}
        → <span style={{ fontFamily: 'monospace' }}>{b.betweenness_normalization_scheme ?? 'n/a'}</span>
      </div>
      {rows.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 12 }}>
          <div style={panelStyles.label}>node</div>
          <div style={panelStyles.label}>A → B</div>
          <div style={panelStyles.label}>Δ</div>
          {rows.map(r => (
            <React.Fragment key={r.node}>
              <div>#{r.node}</div>
              <div>{r.a.toFixed(5)} → {r.b.toFixed(5)}</div>
              <div style={{ color: r.d >= 0 ? 'var(--k1-success)' : 'var(--k1-warning)' }}>{r.d.toFixed(5)}</div>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--k1-text-dim)' }}>No overlapping nodes to compare.</div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = 'snapshot-A.metrics.json';
            aTag.click();
            URL.revokeObjectURL(url);
          }}
          style={{ padding: '4px 6px', border: '1px solid var(--k1-border)', borderRadius: 4, background: 'var(--k1-surface)', fontSize: 12 }}
        >Export A</button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = 'snapshot-B.metrics.json';
            aTag.click();
            URL.revokeObjectURL(url);
          }}
          style={{ padding: '4px 6px', border: '1px solid var(--k1-border)', borderRadius: 4, background: 'var(--k1-surface)', fontSize: 12 }}
        >Export B</button>
      </div>
    </div>
  );
}

function DomainTooltip({ domain, layers }: { domain: string | undefined; layers?: number }) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => {
    if (!domain) return '—';
    const Linfo = typeof layers === 'number' ? ` (L=${layers})` : '';
    const common = `Requires layered DAG for layer-dependent selectors${Linfo}.`;

    if (domain === 'all') {
      return [
        'all — All nodes in the graph.',
        'Example: --betweenness-domain all',
        'Notes: fastest, no layer constraints.'
      ].join('\n');
    }
    if (domain === 'layer0') {
      return [
        'layer0 — Only nodes from layer 0.',
        'Example: --betweenness-domain layer0',
        `Edge cases: ${common}`
      ].join('\n');
    }
    if (domain.startsWith('layer:')) {
      return [
        'layer:<i> — Nodes from a specific layer index (0-based).',
        'Example: --betweenness-domain layer:2',
        'Edge cases: out-of-range indices are ignored/clipped; prefer 0..L-1.',
        common
      ].join('\n');
    }
    if (domain.startsWith('layers:') && domain.includes(':step:')) {
      return [
        'layers:<a-b>:step:<k> — Inclusive range sampled every k layers.',
        'Example: --betweenness-domain layers:1-7:step:2',
        'Edge cases: k>=1 integer; a and b order normalized; endpoints inclusive.',
        common
      ].join('\n');
    }
    if (domain.startsWith('layers:')) {
      return [
        'layers:<a-b> — Inclusive layer range.',
        'Example: --betweenness-domain layers:2-4',
        'Edge cases: a>b is normalized to b..a; endpoints inclusive.',
        common
      ].join('\n');
    }
    if (domain === 'even') {
      return [
        'even — Nodes from even-indexed layers (0-based).',
        'Example: --betweenness-domain even',
        common
      ].join('\n');
    }
    if (domain === 'odd') {
      return [
        'odd — Nodes from odd-indexed layers (0-based).',
        'Example: --betweenness-domain odd',
        common
      ].join('\n');
    }
    if (domain === 'middle') {
      return [
        'middle — Middle layer (odd L) or the two middle layers (even L).',
        'Example: --betweenness-domain middle',
        'Edge cases: L<2 → selects layer 0.',
        common
      ].join('\n');
    }
    if (domain.startsWith('quantile:') && domain.includes(':step:')) {
      return [
        'quantile:<q1-q2>:step:<k> — Quantile band over [0,1], sampled every k.',
        'Example: --betweenness-domain quantile:0.25-0.75:step:2',
        'Edge cases: q1,q2 clipped to [0,1]; endpoints inclusive; uniform mapping across layers.',
        common
      ].join('\n');
    }
    if (domain.startsWith('quantile:')) {
      return [
        'quantile:<q1-q2> — Layers by quantile band over [0,1].',
        'Example: --betweenness-domain quantile:0.25-0.75',
        'Edge cases: q1,q2 clipped to [0,1]; endpoints inclusive; uniform mapping across layers.',
        common
      ].join('\n');
    }
    if (domain.startsWith('layer_quantile:')) {
      return [
        'layer_quantile:<metric>:<q1-q2> — Select layers by the metric’s quantile.',
        'Examples: layer_quantile:outdeg:0.0-0.0, layer_quantile:indeg_median:0.25-0.75',
        'Edge cases: indices are metric-derived; band UI shows unknown indices.',
        common
      ].join('\n');
    }
    if (domain.startsWith('layer_rank:')) {
      return [
        'layer_rank:<metric>:<top|bottom>:<k> — Top/bottom-k layers by metric.',
        'Example: layer_rank:outdeg:top:2',
        'Edge cases: ties resolved stably; k clipped to [1..L]; indices metric-derived; band UI shows unknown indices.',
        common
      ].join('\n');
    }
    if (domain.startsWith('custom:')) {
      return [
        'custom:<path> — Nodes listed in an external JSON file.',
        'Example: custom:metrics/custom.nodes.json (array of node ids)',
        'Edge cases: file must be accessible by the CLI and well-formed.'
      ].join('\n');
    }
    return ['Domain selector', common].join('\n');
  }, [domain, layers]);

  return (
    <span
      title={text}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, marginLeft: 4,
        borderRadius: '50%', border: '1px solid var(--k1-border)',
        fontSize: 11, cursor: 'help'
      }}
    >i
      {open && (
        <span style={{
          position: 'absolute', transform: 'translateY(18px)',
          background: 'var(--k1-panel)', border: '1px solid var(--k1-border)',
          borderRadius: 4, padding: '6px 8px', fontSize: 11, whiteSpace: 'pre-wrap', maxWidth: 280
        }}>{text}</span>
      )}
    </span>
  );
}