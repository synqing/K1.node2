// Lightweight dev metrics for realtime subscriptions and lifecycle
// Dev-only counters to avoid production overhead

export type MetricType = 'realtime' | 'audio' | 'performance';

export interface MetricCounts {
  readonly realtime: number;
  readonly audio: number;
  readonly performance: number;
}

export interface RealtimeMetrics {
  readonly subscriptions: MetricCounts;
  readonly starts: MetricCounts;
  readonly stops: MetricCounts;
}

// Internal counters - not exported to prevent external mutation
const counters: {
  subscriptions: Record<MetricType, number>;
  starts: Record<MetricType, number>;
  stops: Record<MetricType, number>;
} = {
  subscriptions: { realtime: 0, audio: 0, performance: 0 },
  starts: { realtime: 0, audio: 0, performance: 0 },
  stops: { realtime: 0, audio: 0, performance: 0 },
};

/**
 * Checks if we're in development mode to avoid metrics overhead in production
 */
function isDev(): boolean {
  return !!(import.meta as any).env?.DEV;
}

/**
 * Records a subscription event for the specified metric type
 * @param type - The type of metric to record
 */
export function recordSubscription(type: MetricType): void {
  if (!isDev()) return;
  counters.subscriptions[type] += 1;
}

/**
 * Records a start event for the specified metric type
 * @param type - The type of metric to record
 */
export function recordStart(type: MetricType): void {
  if (!isDev()) return;
  counters.starts[type] += 1;
}

/**
 * Records a stop event for the specified metric type
 * @param type - The type of metric to record
 */
export function recordStop(type: MetricType): void {
  if (!isDev()) return;
  counters.stops[type] += 1;
}

/**
 * Gets a snapshot of current realtime metrics
 * Returns immutable copies to prevent external mutation
 * @returns Current metrics snapshot
 */
export function getRealtimeMetrics(): RealtimeMetrics {
  return {
    subscriptions: { ...counters.subscriptions },
    starts: { ...counters.starts },
    stops: { ...counters.stops },
  };
}

/**
 * Resets all metrics counters (useful for testing)
 * Only available in development mode
 */
export function resetMetrics(): void {
  if (!isDev()) return;
  
  Object.keys(counters.subscriptions).forEach(key => {
    const metricType = key as MetricType;
    counters.subscriptions[metricType] = 0;
    counters.starts[metricType] = 0;
    counters.stops[metricType] = 0;
  });
}

/**
 * Calculates active counts for each metric type
 * @returns Object with active counts (starts - stops) for each metric type
 */
export function getActiveCounts(): Record<MetricType, number> {
  const metrics = getRealtimeMetrics();
  return {
    realtime: metrics.starts.realtime - metrics.stops.realtime,
    audio: metrics.starts.audio - metrics.stops.audio,
    performance: metrics.starts.performance - metrics.stops.performance,
  };
}