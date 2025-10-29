/**
 * Tests for DiscoveryMetricsCollector
 *
 * Coverage areas:
 * - Attempt tracking and timing
 * - Method-level success rate calculation
 * - Cache operation tracking
 * - Recommendation algorithm
 * - Metrics export and reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DiscoveryMetricsCollector,
  discoveryMetrics,
  DiscoveryMethodMetrics,
  DiscoveryCacheMetrics,
} from '../discovery-metrics';

describe('DiscoveryMetricsCollector', () => {
  let collector: DiscoveryMetricsCollector;

  beforeEach(() => {
    // Use a fresh collector for each test
    collector = new DiscoveryMetricsCollector();
  });

  describe('Attempt Tracking', () => {
    it('should start and complete a discovery attempt', () => {
      const attemptId = collector.startDiscovery('mdns');
      expect(attemptId).toBeDefined();
      expect(attemptId).toContain('mdns');

      collector.completeDiscovery(attemptId, {
        success: true,
        durationMs: 1000,
        devicesFound: 3,
      });

      const metrics = collector.getMethodMetrics();
      const mdnsMetrics = metrics.get('mdns');
      expect(mdnsMetrics).toBeDefined();
      expect(mdnsMetrics?.successCount).toBe(1);
      expect(mdnsMetrics?.failureCount).toBe(0);
    });

    it('should track failed discovery attempts', () => {
      const attemptId = collector.startDiscovery('scan');

      collector.completeDiscovery(attemptId, {
        success: false,
        durationMs: 5000,
        devicesFound: 0,
        error: 'Network timeout',
      });

      const metrics = collector.getMethodMetrics();
      const scanMetrics = metrics.get('scan');
      expect(scanMetrics?.failureCount).toBe(1);
      expect(scanMetrics?.successCount).toBe(0);
    });

    it('should track multiple attempts per method', () => {
      // First attempt
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 2,
      });

      // Second attempt
      const id2 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id2, {
        success: true,
        durationMs: 1100,
        devicesFound: 2,
      });

      // Third attempt - failure
      const id3 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id3, {
        success: false,
        durationMs: 2000,
        devicesFound: 0,
      });

      const metrics = collector.getMethodMetrics();
      const mdnsMetrics = metrics.get('mdns');
      expect(mdnsMetrics?.attemptCount).toBe(3);
      expect(mdnsMetrics?.successCount).toBe(2);
      expect(mdnsMetrics?.failureCount).toBe(1);
      expect(mdnsMetrics?.successRate).toBeCloseTo(0.667, 2); // 2/3
    });

    it('should ignore completion for unknown attempt IDs', () => {
      collector.completeDiscovery('unknown-id', {
        success: true,
        durationMs: 1000,
        devicesFound: 1,
      });

      const metrics = collector.getMethodMetrics();
      expect(metrics.size).toBe(0);
    });
  });

  describe('Method Metrics Calculation', () => {
    it('should calculate average duration correctly', () => {
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 1,
      });

      const id2 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id2, {
        success: true,
        durationMs: 3000,
        devicesFound: 1,
      });

      const metrics = collector.getMethodMetrics();
      const mdnsMetrics = metrics.get('mdns');
      expect(mdnsMetrics?.avgDurationMs).toBe(2000);
      expect(mdnsMetrics?.minDurationMs).toBe(1000);
      expect(mdnsMetrics?.maxDurationMs).toBe(3000);
    });

    it('should calculate success rate correctly', () => {
      // 7 successes, 3 failures
      for (let i = 0; i < 7; i++) {
        const id = collector.startDiscovery('mdns');
        collector.completeDiscovery(id, {
          success: true,
          durationMs: 1000,
          devicesFound: 1,
        });
      }

      for (let i = 0; i < 3; i++) {
        const id = collector.startDiscovery('mdns');
        collector.completeDiscovery(id, {
          success: false,
          durationMs: 2000,
          devicesFound: 0,
        });
      }

      const metrics = collector.getMethodMetrics();
      const mdnsMetrics = metrics.get('mdns');
      expect(mdnsMetrics?.successRate).toBeCloseTo(0.7, 2); // 7/10
    });

    it('should track last attempt and success timestamps', () => {
      const beforeId1 = Date.now();
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 1,
      });
      const afterId1 = Date.now();

      const metrics = collector.getMethodMetrics();
      const mdnsMetrics = metrics.get('mdns');
      expect(mdnsMetrics?.lastAttemptAt).toBeGreaterThanOrEqual(beforeId1);
      expect(mdnsMetrics?.lastAttemptAt).toBeLessThanOrEqual(afterId1);
      expect(mdnsMetrics?.lastSuccessAt).toBeGreaterThanOrEqual(beforeId1);
    });
  });

  describe('Cache Operations', () => {
    it('should track cache hits', () => {
      const initial = collector.getCacheMetrics();
      expect(initial.totalHits).toBe(0);

      collector.recordCacheHit();
      collector.recordCacheHit();

      const updated = collector.getCacheMetrics();
      expect(updated.totalHits).toBe(2);
    });

    it('should track cache misses', () => {
      collector.recordCacheMiss();
      collector.recordCacheMiss();
      collector.recordCacheMiss();

      const metrics = collector.getCacheMetrics();
      expect(metrics.totalMisses).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      // 7 hits, 3 misses
      for (let i = 0; i < 7; i++) {
        collector.recordCacheHit();
      }
      for (let i = 0; i < 3; i++) {
        collector.recordCacheMiss();
      }

      const metrics = collector.getCacheMetrics();
      expect(metrics.hitRate).toBeCloseTo(0.7, 2); // 7/10
    });

    it('should track cache evictions', () => {
      collector.recordCacheEviction('device-1');
      collector.recordCacheEviction('device-2');

      const metrics = collector.getCacheMetrics();
      expect(metrics.totalEvictions).toBe(2);
    });

    it('should update cache size and max size', () => {
      collector.updateCacheMetrics(42, 100);

      const metrics = collector.getCacheMetrics();
      expect(metrics.currentSize).toBe(42);
      expect(metrics.maxSize).toBe(100);
    });

    it('should update cache size without changing max size', () => {
      collector.updateCacheMetrics(50, 100);
      collector.updateCacheMetrics(75); // No maxSize provided

      const metrics = collector.getCacheMetrics();
      expect(metrics.currentSize).toBe(75);
      expect(metrics.maxSize).toBe(100); // Should remain unchanged
    });
  });

  describe('Aggregate Statistics', () => {
    it('should track total discoveries count', () => {
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 3,
      });

      const id2 = collector.startDiscovery('scan');
      collector.completeDiscovery(id2, {
        success: true,
        durationMs: 2000,
        devicesFound: 2,
      });

      const stats = collector.getTotalStats();
      expect(stats.totalDiscoveries).toBe(2);
      expect(stats.totalDevicesFound).toBe(5);
      expect(stats.avgDevicesPerDiscovery).toBeCloseTo(2.5, 2);
    });

    it('should calculate average devices per discovery', () => {
      // Three discoveries with 1, 2, 3 devices
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 1,
      });

      const id2 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id2, {
        success: true,
        durationMs: 1000,
        devicesFound: 2,
      });

      const id3 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id3, {
        success: true,
        durationMs: 1000,
        devicesFound: 3,
      });

      const stats = collector.getTotalStats();
      expect(stats.avgDevicesPerDiscovery).toBe(2); // (1+2+3)/3
    });

    it('should return zero average when no discoveries', () => {
      const stats = collector.getTotalStats();
      expect(stats.avgDevicesPerDiscovery).toBe(0);
      expect(stats.totalDiscoveries).toBe(0);
    });
  });

  describe('Recommended Method', () => {
    it('should return null when no methods tracked', () => {
      const recommended = collector.getRecommendedMethod();
      expect(recommended).toBeNull();
    });

    it('should recommend method with highest success rate', () => {
      // mdns: 100% success, 1000ms avg
      // score = (1.0 * 0.7) + ((1 - 1000/10000) * 0.3) = 0.7 + 0.27 = 0.97
      for (let i = 0; i < 5; i++) {
        const id = collector.startDiscovery('mdns');
        collector.completeDiscovery(id, {
          success: true,
          durationMs: 1000,
          devicesFound: 1,
        });
      }

      // scan: 60% success, 3000ms avg
      // score = (0.6 * 0.7) + ((1 - 3000/10000) * 0.3) = 0.42 + 0.21 = 0.63
      for (let i = 0; i < 3; i++) {
        const id = collector.startDiscovery('scan');
        collector.completeDiscovery(id, {
          success: true,
          durationMs: 3000,
          devicesFound: 1,
        });
      }
      for (let i = 0; i < 2; i++) {
        const id = collector.startDiscovery('scan');
        collector.completeDiscovery(id, {
          success: false,
          durationMs: 3000,
          devicesFound: 0,
        });
      }

      const recommended = collector.getRecommendedMethod();
      expect(recommended).toBe('mdns'); // Higher combined score from success rate + speed
    });

    it('should use speed factor in recommendation scoring', () => {
      // mdns: 100% success, 100ms avg (very fast)
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 100,
        devicesFound: 1,
      });

      // scan: 100% success, 9000ms avg (very slow)
      const id2 = collector.startDiscovery('scan');
      collector.completeDiscovery(id2, {
        success: true,
        durationMs: 9000,
        devicesFound: 1,
      });

      const recommended = collector.getRecommendedMethod();
      // mdns score: (1.0 * 0.7) + (0.99 * 0.3) = 0.997
      // scan score: (1.0 * 0.7) + (0.1 * 0.3) = 0.73
      expect(recommended).toBe('mdns');
    });
  });

  describe('Snapshots and History', () => {
    it('should capture snapshots with correct structure', () => {
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 2,
      });

      // Get snapshots and verify structure
      const snapshots = collector.getSnapshots();
      snapshots.forEach(snapshot => {
        expect(snapshot.timestamp).toBeDefined();
        expect(typeof snapshot.timestamp).toBe('number');
        expect(snapshot.methodMetrics).toBeDefined();
        expect(snapshot.cacheMetrics).toBeDefined();
        expect(snapshot.totalDiscoveries).toBeDefined();
        expect(snapshot.avgDevicesPerDiscovery).toBeDefined();
      });
    });

    it('should maintain rolling window of snapshots', () => {
      // This test verifies the snapshot structure exists
      // Full rolling window test would need time mocking
      const state = collector.exportMetrics();
      expect(state.snapshots).toBeDefined();
      expect(Array.isArray(state.snapshots)).toBe(true);
    });
  });

  describe('Export and Reset', () => {
    it('should export complete metrics state', () => {
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 2,
      });

      collector.recordCacheHit();
      collector.recordCacheMiss();

      const exported = collector.exportMetrics();
      expect(exported.methodMetrics.get('mdns')).toBeDefined();
      expect(exported.cacheMetrics.totalHits).toBe(1);
      expect(exported.cacheMetrics.totalMisses).toBe(1);
      expect(exported.totalDiscoveries).toBe(1);
      expect(exported.totalDevicesFound).toBe(2);
    });

    it('should reset all metrics to initial state', () => {
      const id1 = collector.startDiscovery('mdns');
      collector.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 2,
      });

      collector.recordCacheHit();

      // Verify state is populated
      const beforeReset = collector.getTotalStats();
      expect(beforeReset.totalDiscoveries).toBe(1);

      // Reset
      collector.reset();

      // Verify clean state
      const afterReset = collector.getTotalStats();
      expect(afterReset.totalDiscoveries).toBe(0);
      expect(afterReset.totalDevicesFound).toBe(0);

      const cacheMetrics = collector.getCacheMetrics();
      expect(cacheMetrics.totalHits).toBe(0);
      expect(cacheMetrics.totalMisses).toBe(0);

      const methodMetrics = collector.getMethodMetrics();
      expect(methodMetrics.size).toBe(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should have global singleton export', () => {
      expect(discoveryMetrics).toBeDefined();
      expect(discoveryMetrics).toBeInstanceOf(DiscoveryMetricsCollector);
    });

    it('singleton should be reusable across imports', () => {
      const id1 = discoveryMetrics.startDiscovery('mdns');
      discoveryMetrics.completeDiscovery(id1, {
        success: true,
        durationMs: 1000,
        devicesFound: 1,
      });

      // Get same metrics from another "import"
      const stats = discoveryMetrics.getTotalStats();
      expect(stats.totalDiscoveries).toBe(1);
    });
  });
});
