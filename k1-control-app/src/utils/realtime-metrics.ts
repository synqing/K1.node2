// Lightweight dev metrics for realtime subscriptions and lifecycle
// Dev-only counters to avoid production overhead

export type MetricType = 'realtime' | 'audio' | 'performance';

const counters = {
  subscriptions: { realtime: 0, audio: 0, performance: 0 },
  starts: { realtime: 0, audio: 0, performance: 0 },
  stops: { realtime: 0, audio: 0, performance: 0 },
};

function isDev(): boolean {
  return !!(import.meta as any).env?.DEV;
}

export function recordSubscription(type: MetricType): void {
  if (!isDev()) return;
  counters.subscriptions[type] += 1;
}

export function recordStart(type: MetricType): void {
  if (!isDev()) return;
  counters.starts[type] += 1;
}

export function recordStop(type: MetricType): void {
  if (!isDev()) return;
  counters.stops[type] += 1;
}

export function getRealtimeMetrics() {
  return {
    subscriptions: { ...counters.subscriptions },
    starts: { ...counters.starts },
    stops: { ...counters.stops },
  };
}