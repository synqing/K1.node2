import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordSubscription,
  recordStart,
  recordStop,
  getRealtimeMetrics,
  getActiveCounts,
  resetMetrics,
  MetricType,
} from '../../utils/realtime-metrics';

describe('realtime-metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('tracks subscriptions, starts, and stops by category', () => {
    const types: MetricType[] = ['realtime', 'audio', 'performance'];

    for (const t of types) {
      recordSubscription(t);
      recordStart(t);
    }

    let metrics = getRealtimeMetrics();
    expect(metrics.subscriptions.realtime).toBe(1);
    expect(metrics.starts.audio).toBe(1);
    expect(metrics.starts.performance).toBe(1);

    for (const t of types) {
      recordStop(t);
    }

    metrics = getRealtimeMetrics();
    expect(metrics.stops.realtime).toBe(1);
    expect(metrics.stops.audio).toBe(1);
    expect(metrics.stops.performance).toBe(1);
  });

  it('computes active counts correctly', () => {
    recordSubscription('audio');
    recordSubscription('audio');
    recordStart('audio');

    let active = getActiveCounts();
    expect(active.audio).toBe(1);

    recordStop('audio');
    active = getActiveCounts();
    expect(active.audio).toBe(0);
  });

  it('reset clears metrics', () => {
    recordSubscription('realtime');
    recordStart('realtime');

    let metrics = getRealtimeMetrics();
    expect(metrics.subscriptions.realtime).toBe(1);
    expect(metrics.starts.realtime).toBe(1);

    resetMetrics();
    metrics = getRealtimeMetrics();
    expect(metrics.subscriptions.realtime).toBe(0);
    expect(metrics.starts.realtime).toBe(0);
    expect(metrics.stops.realtime).toBe(0);
  });
});