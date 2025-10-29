import { useEffect, useState, useCallback } from 'react';
import { fetchJson, artifactsBase } from '../../services/artifacts';

type Metrics = { N: number; M: number; minOut: number; maxOut: number; avgOut: number; isDag: boolean };
type BenchTopo = { topo_sort_ms: number };
type Estimate = { est?: { ms: number; cpuPct: number }; ms?: number; cpu_pct?: number };
type Impact = { changed: string[]; impacted: string[] };
type Validation = { violations?: { severity: string }[]; counts?: { errors: number; warnings: number } };
type GatesStatus = {
  passed: boolean;
  failures?: string[];
  notes?: string[];
  metrics?: {
    ms?: number | null;
    cpuPct?: number | null;
    isDag?: boolean | null;
    cyclesDetected?: boolean | null;
    validationErrors?: number | null;
  };
};

export function QaView() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [bench, setBench] = useState<BenchTopo | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [gates, setGates] = useState<GatesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [intervalSec, setIntervalSec] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetrics(await fetchJson<Metrics>('graph.metrics.json'));
      setBench(await fetchJson<BenchTopo>('bench.topo.json'));
      setEstimate(await fetchJson<Estimate>('graph.estimate.json'));
      setImpact(await fetchJson<Impact>('graph.impact.json'));
      setValidation(await fetchJson<Validation>('graph.validation.json'));
      setGates(await fetchJson<GatesStatus>('gates.status.json'));
    } finally {
      setLoading(false);
      try {
        window.dispatchEvent(new CustomEvent('k1:qa-refreshed', { detail: { ts: Date.now() } }));
      } catch {}
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (intervalSec > 0) {
      const id = setInterval(() => { load(); }, intervalSec * 1000);
      return () => clearInterval(id);
    }
  }, [intervalSec, load]);

  const ms = estimate?.est?.ms ?? estimate?.ms ?? null;
  const cpu = estimate?.est?.cpuPct ?? estimate?.cpu_pct ?? null;
  const errors = validation?.counts?.errors ?? (validation?.violations?.filter(v => v.severity === 'error').length ?? null);

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <button className="px-3 py-1 rounded bg-[var(--k1-btn)] text-[var(--k1-text)]" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <label className="text-[var(--k1-text-dim)] text-sm">Auto-reload:
          <select className="ml-2 bg-transparent border border-[var(--k1-border)] rounded text-[var(--k1-text-dim)] text-sm"
                  value={intervalSec}
                  onChange={e => setIntervalSec(Number(e.target.value))}>
            <option value={0}>Off</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </label>
        <span className="ml-auto text-[var(--k1-text-dim)] text-xs">Source: {artifactsBase}</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
      {/* Graph Health */}
      <div className="p-4 rounded-lg bg-[var(--k1-panel)]">
        <h3 className="text-[var(--k1-text)] mb-2 flex items-center justify-between">
          <span>Graph Health</span>
          <a className="text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/graph.metrics.json`} target="_blank" rel="noreferrer">raw</a>
        </h3>
        {metrics ? (
          <ul className="text-[var(--k1-text-dim)] text-sm space-y-1">
            <li>N: {metrics.N} • M: {metrics.M}</li>
            <li>Outdegree min/max/avg: {metrics.minOut}/{metrics.maxOut}/{metrics.avgOut.toFixed(2)}</li>
            <li>DAG: {metrics.isDag ? '✅' : '❌'}</li>
          </ul>
        ) : (
          <div className="text-[var(--k1-text-dim)] text-sm">Missing metrics (graph.metrics.json)</div>
        )}
      </div>

      {/* Perf Budget */}
      <div className="p-4 rounded-lg bg-[var(--k1-panel)]">
        <h3 className="text-[var(--k1-text)] mb-2 flex items-center justify-between">
          <span>Perf Budget</span>
          <a className="text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/graph.estimate.json`} target="_blank" rel="noreferrer">raw</a>
        </h3>
        <ul className="text-[var(--k1-text-dim)] text-sm space-y-1">
          <li>Predicted: {ms != null ? `${ms.toFixed(2)} ms` : '—'}</li>
          <li>CPU: {cpu != null ? `${cpu}%` : '—'}</li>
          <li>
            <span>Topo time: {bench?.topo_sort_ms != null ? `${bench.topo_sort_ms.toFixed(2)} ms` : '—'}</span>
            <a className="ml-2 text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/bench.topo.json`} target="_blank" rel="noreferrer">raw</a>
          </li>
        </ul>
      </div>

      {/* Risk Preview */}
      <div className="p-4 rounded-lg bg-[var(--k1-panel)]">
        <h3 className="text-[var(--k1-text)] mb-2 flex items-center justify-between">
          <span>Risk Preview</span>
          <a className="text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/graph.impact.json`} target="_blank" rel="noreferrer">raw</a>
        </h3>
        {impact ? (
          <div className="text-[var(--k1-text-dim)] text-sm">
            <div>Changed: {impact.changed.join(', ') || '—'}</div>
            <div className="mt-1">Top impacted: {(impact.impacted.slice(0,10)).join(', ') || '—'}</div>
          </div>
        ) : (
          <div className="text-[var(--k1-text-dim)] text-sm">Missing impact (graph.impact.json)</div>
        )}
      </div>

      {/* Semantics */}
      <div className="p-4 rounded-lg bg-[var(--k1-panel)]">
        <h3 className="text-[var(--k1-text)] mb-2 flex items-center justify-between">
          <span>Semantics</span>
          <a className="text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/graph.validation.json`} target="_blank" rel="noreferrer">raw</a>
        </h3>
        <div className="text-[var(--k1-text-dim)] text-sm">Errors: {errors ?? '—'}</div>
        {!validation && (
          <div className="text-[var(--k1-text-dim)] text-sm mt-1">Missing semantics (graph.validation.json)</div>
        )}
      </div>

      {/* Gates */}
      <div className="p-4 rounded-lg bg-[var(--k1-panel)]">
        <h3 className="text-[var(--k1-text)] mb-2 flex items-center justify-between">
          <span>Gates</span>
          <a className="text-[var(--k1-text-dim)] text-xs underline" href={`${artifactsBase}/gates.status.json`} target="_blank" rel="noreferrer">raw</a>
        </h3>
        {gates ? (
          <div className="text-[var(--k1-text-dim)] text-sm space-y-1">
            <div>Status: {gates.passed ? '✅ Passed' : '❌ Failed'}</div>
            <div>Failures: {gates.failures?.length ?? 0} • Notes: {gates.notes?.length ?? 0}</div>
            {gates.metrics && (
              <div className="text-xs">
                <span>ms: {gates.metrics.ms ?? '—'}</span>
                <span className="ml-2">CPU: {gates.metrics.cpuPct ?? '—'}%</span>
                <span className="ml-2">DAG: {gates.metrics.isDag == null ? '—' : (gates.metrics.isDag ? '✅' : '❌')}</span>
                <span className="ml-2">Cycles: {gates.metrics.cyclesDetected == null ? '—' : (gates.metrics.cyclesDetected ? '❌' : '✅')}</span>
                <span className="ml-2">Validation errors: {gates.metrics.validationErrors ?? '—'}</span>
              </div>
            )}
            {!gates.passed && gates.failures && gates.failures.length > 0 && (
              <ul className="text-xs list-disc ml-5">
                {gates.failures.slice(0, 3).map((f, i) => (<li key={i}>{f}</li>))}
              </ul>
            )}
          </div>
        ) : (
          <div className="text-[var(--k1-text-dim)] text-sm">Missing gates (gates.status.json)</div>
        )}
      </div>
      </div>
    </div>
  );
}