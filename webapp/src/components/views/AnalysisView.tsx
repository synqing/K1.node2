import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { type ConnectionState } from '../../lib/types';
import { Card } from '../ui/card';
import { Toolbar } from '../analysis/Toolbar';
import { UploadModal } from '../analysis/UploadModal';
import { TrackListItem } from '../analysis/TrackListItem';
import { BeatGridChart } from '../analysis/BeatGridChart';
import { FrequencyChart } from '../analysis/FrequencyChart';
import { DynamicsChart } from '../analysis/DynamicsChart';
import { SectionsTimeline } from '../analysis/SectionsTimeline';
import { GraphPresetCard } from '../analysis/GraphPresetCard';
import { ArtifactTable } from '../analysis/ArtifactTable';
import { ActivityLog } from '../analysis/ActivityLog';
import { DeploySideSheet } from '../analysis/DeploySideSheet';
import { MOCK_METRICS, MOCK_TRACKS } from '../analysis/mock-data';
import { MetricsCard as MetricsCardComponent } from '../analysis/MetricsCard';

interface AnalysisViewProps {
  connectionState?: ConnectionState;
}

export function AnalysisView({ connectionState }: AnalysisViewProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(MOCK_TRACKS[0].id);
  const [isMobile, setIsMobile] = useState(false);
  const metrics = MOCK_METRICS;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const selectedTrack = useMemo(
    () => MOCK_TRACKS.find((track) => track.id === selectedTrackId) ?? MOCK_TRACKS[0],
    [selectedTrackId],
  );

  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-prism-bg-canvas)' }}
    >
      <Toolbar
        onUploadClick={() => setUploadOpen(true)}
        onAnalyseClick={() => console.log('Analyse track')}
        onDeployClick={() => setDeployOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <aside
            className="w-80 border-r"
            style={{
              backgroundColor: 'var(--color-prism-bg-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3
                className="font-['Bebas_Neue',sans-serif] uppercase tracking-wide"
                style={{ color: 'var(--color-prism-text-primary)' }}
              >
                Track Library
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-prism-text-secondary)' }}>
                {connectionState?.connected
                  ? `${MOCK_TRACKS.length} tracks · connected to ${connectionState.deviceIp}`
                  : `${MOCK_TRACKS.length} tracks`}
              </p>
            </div>
            <div className="space-y-2 p-3">
              {MOCK_TRACKS.map((track) => (
                <TrackListItem
                  key={track.id}
                  {...track}
                  selected={track.id === selectedTrackId}
                  onSelect={() => setSelectedTrackId(track.id)}
                />
              ))}
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
            <Card
              className="border p-4"
              style={{
                backgroundColor: 'var(--color-prism-bg-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                  <h2
                    className="text-2xl font-semibold"
                    style={{ color: 'var(--color-prism-text-primary)' }}
                  >
                    {selectedTrack.title}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-prism-text-secondary)' }}>
                    {selectedTrack.artist} · {selectedTrack.duration ?? '—'} ·
                    {selectedTrack.bpm ? ` ${selectedTrack.bpm} BPM` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="positive">Bundle ready</StatusBadge>
                  <StatusBadge tone="neutral">Runtime 7.3 ms</StatusBadge>
                  <StatusBadge tone="warning">Firmware ≥ 2.5.0</StatusBadge>
                </div>
              </div>
            </Card>

            <section className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => (
                <MetricsCardComponent
                  key={metric.label}
                  title={metric.label}
                  value={metric.value}
                  delta={metric.delta}
                  tone={metric.tone}
                />
              ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <BeatGridChart />
              <FrequencyChart />
              <DynamicsChart />
              <SectionsTimeline />
            </section>

            <GraphPresetCard />

            <ArtifactTable />
          </div>
        </main>
      </div>

      <ActivityLog />

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeploySideSheet open={deployOpen} onOpenChange={setDeployOpen} />
    </div>
  );
}

interface StatusBadgeProps {
  children: ReactNode;
  tone?: 'positive' | 'neutral' | 'warning';
}

function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  const toneColor =
    tone === 'positive'
      ? 'var(--color-prism-success)'
      : tone === 'warning'
        ? 'var(--color-prism-warning)'
        : 'var(--color-prism-info)';

  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid ' + toneColor,
        color: toneColor,
      }}
    >
      {children}
    </span>
  );
}
