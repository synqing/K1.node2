export const MOCK_TRACKS = [
  {
    id: 'track-1',
    title: 'Midnight Dreams',
    artist: 'Electronic Artist',
    duration: '3:24',
    bpm: 128,
    fMeasure: 0.962,
    status: 'selected' as const,
  },
  {
    id: 'track-2',
    title: 'Rock Anthem',
    artist: 'The Headliners',
    duration: '4:15',
    bpm: 140,
    fMeasure: 0.891,
    status: 'ready' as const,
  },
  {
    id: 'track-3',
    title: 'Processing Track',
    artist: 'Various',
    duration: '2:48',
    status: 'processing' as const,
  },
  {
    id: 'track-4',
    title: 'Experimental Groove',
    artist: 'Lab Session',
    duration: '3:02',
    bpm: 95,
    fMeasure: 0.742,
    status: 'warning' as const,
  },
  {
    id: 'track-5',
    title: 'Failed Analysis',
    artist: 'Test Harness',
    duration: '5:21',
    status: 'failed' as const,
  },
] as const;

export const MOCK_METRICS = [
  { label: 'F-measure', value: '0.962', delta: '+0.012', tone: 'positive' as const },
  { label: 'Cemgil', value: '0.648', delta: '+0.004', tone: 'neutral' as const },
  { label: 'Tempo', value: '128 BPM', delta: '±2', tone: 'neutral' as const },
  { label: 'Dynamic Range', value: '0.78', delta: '-0.02', tone: 'warning' as const },
  { label: 'Spectral Centroid', value: '1.52 kHz', delta: '+0.10', tone: 'neutral' as const },
  { label: 'File Size', value: '12.4 MB', delta: '+0.3', tone: 'neutral' as const },
] as const;

export const MOCK_ACTIVITY = [
  {
    severity: 'info' as const,
    message: 'Analysis completed for Midnight Dreams',
    timestamp: '12:42:10',
  },
  {
    severity: 'warning' as const,
    message: 'Runtime risk elevated (est. 9.4 ms)',
    timestamp: '12:40:03',
  },
  {
    severity: 'error' as const,
    message: 'Auto rollback executed on Device-02',
    timestamp: '12:38:44',
  },
] as const;

export const MOCK_ARTIFACTS = [
  { name: 'track.genesis.json', type: 'Map', size: '820 KB', age: '2 min ago', sha: 'a4c3…8f', status: 'active' as const },
  { name: 'phase2b_metrics.json', type: 'Metrics', size: '12 KB', age: '2 min ago', sha: 'c94a…d1', status: 'active' as const },
  { name: 'graph.executor.scale.json', type: 'Simulate', size: '4 KB', age: '1 min ago', sha: 'e02f…19', status: 'active' as const },
  { name: 'profile.speedscope.json', type: 'Profile', size: '-', age: '-', sha: '-', status: 'missing' as const },
  { name: 'visual.report.json', type: 'Visual QA', size: '3 KB', age: '1 min ago', sha: 'bb21…4e', status: 'soft-deleted' as const },
] as const;
