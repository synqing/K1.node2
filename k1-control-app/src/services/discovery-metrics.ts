/**
 * Discovery Metrics Collection System
 *
 * Tracks device discovery performance metrics including:
 * - Per-method success rates, duration, and attempt counts
 * - Cache operations (hits, misses, evictions)
 * - Aggregate statistics for optimization
 *
 * Maintains rolling window of 100 snapshots (~1-2 hours of data)
 */

export interface DiscoveryMethodMetrics {
  name: string;
  attemptCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  avgDurationMs: number;
  successRate: number; // 0.0-1.0
  lastAttemptAt: number; // timestamp ms
  lastSuccessAt: number | null; // timestamp ms
}

export interface DiscoveryAttempt {
  id: string;
  method: string;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  success: boolean | null;
  devicesFound: number | null;
  error: string | null;
}

export interface DiscoveryCacheMetrics {
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  currentSize: number;
  maxSize: number;
  hitRate: number; // 0.0-1.0
  lastUpdatedAt: number;
}

export interface DiscoveryMetricsSnapshot {
  timestamp: number;
  methodMetrics: Map<string, DiscoveryMethodMetrics>;
  cacheMetrics: DiscoveryCacheMetrics;
  totalDiscoveries: number;
  totalDevicesFound: number;
  avgDevicesPerDiscovery: number;
}

export interface DiscoveryMetricsState {
  snapshots: DiscoveryMetricsSnapshot[];
  methodMetrics: Map<string, DiscoveryMethodMetrics>;
  cacheMetrics: DiscoveryCacheMetrics;
  pendingAttempts: Map<string, DiscoveryAttempt>;
  totalDiscoveries: number;
  totalDevicesFound: number;
}

/**
 * Metrics collector for device discovery operations
 * Singleton instance manages all discovery telemetry
 */
export class DiscoveryMetricsCollector {
  private state: DiscoveryMetricsState;
  private readonly MAX_SNAPSHOTS = 100;
  private snapshotIntervalMs = 5000; // Capture snapshot every 5 seconds
  private lastSnapshotAt = Date.now();

  constructor() {
    this.state = {
      snapshots: [],
      methodMetrics: new Map(),
      cacheMetrics: {
        totalHits: 0,
        totalMisses: 0,
        totalEvictions: 0,
        currentSize: 0,
        maxSize: 1000,
        hitRate: 0,
        lastUpdatedAt: Date.now(),
      },
      pendingAttempts: new Map(),
      totalDiscoveries: 0,
      totalDevicesFound: 0,
    };
  }

  /**
   * Start a new discovery attempt
   * Returns attempt ID for later completion tracking
   */
  startDiscovery(method: string): string {
    const attemptId = `${method}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const attempt: DiscoveryAttempt = {
      id: attemptId,
      method,
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      success: null,
      devicesFound: null,
      error: null,
    };

    this.state.pendingAttempts.set(attemptId, attempt);
    return attemptId;
  }

  /**
   * Complete a discovery attempt with results
   */
  completeDiscovery(
    attemptId: string,
    result: {
      success: boolean;
      durationMs: number;
      devicesFound: number;
      error?: string;
      method?: string;
    }
  ): void {
    const attempt = this.state.pendingAttempts.get(attemptId);
    if (!attempt) {
      console.warn(`[DiscoveryMetrics] Attempt ${attemptId} not found`);
      return;
    }

    attempt.completedAt = Date.now();
    attempt.durationMs = result.durationMs;
    attempt.success = result.success;
    attempt.devicesFound = result.devicesFound;
    attempt.error = result.error || null;

    // Update method metrics
    const method = attempt.method;
    let metrics = this.state.methodMetrics.get(method);
    if (!metrics) {
      metrics = {
        name: method,
        attemptCount: 0,
        successCount: 0,
        failureCount: 0,
        totalDurationMs: 0,
        minDurationMs: Infinity,
        maxDurationMs: 0,
        avgDurationMs: 0,
        successRate: 0,
        lastAttemptAt: Date.now(),
        lastSuccessAt: null,
      };
      this.state.methodMetrics.set(method, metrics);
    }

    metrics.attemptCount++;
    metrics.lastAttemptAt = Date.now();
    metrics.totalDurationMs += result.durationMs;
    metrics.minDurationMs = Math.min(metrics.minDurationMs, result.durationMs);
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, result.durationMs);
    metrics.avgDurationMs = metrics.totalDurationMs / metrics.attemptCount;

    if (result.success) {
      metrics.successCount++;
      metrics.lastSuccessAt = Date.now();
    } else {
      metrics.failureCount++;
    }

    metrics.successRate = metrics.successCount / metrics.attemptCount;

    // Update aggregate metrics
    this.state.totalDiscoveries++;
    this.state.totalDevicesFound += result.devicesFound;

    // Clean up pending attempt
    this.state.pendingAttempts.delete(attemptId);

    // Potentially capture snapshot
    this.maybeSnapshot();
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.state.cacheMetrics.totalHits++;
    this.updateCacheHitRate();
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.state.cacheMetrics.totalMisses++;
    this.updateCacheHitRate();
  }

  /**
   * Record a cache eviction
   */
  recordCacheEviction(deviceId?: string): void {
    this.state.cacheMetrics.totalEvictions++;
    this.state.cacheMetrics.lastUpdatedAt = Date.now();
  }

  /**
   * Update current cache state
   */
  updateCacheMetrics(currentSize: number, maxSize?: number): void {
    this.state.cacheMetrics.currentSize = currentSize;
    if (maxSize !== undefined) {
      this.state.cacheMetrics.maxSize = maxSize;
    }
    this.state.cacheMetrics.lastUpdatedAt = Date.now();
  }

  /**
   * Get recommended discovery method based on success rates and speed
   * Uses formula: score = (successRate * 0.7) + (speedFactor * 0.3)
   */
  getRecommendedMethod(): string | null {
    if (this.state.methodMetrics.size === 0) {
      return null;
    }

    let bestMethod: string | null = null;
    let bestScore = -Infinity;

    for (const [method, metrics] of this.state.methodMetrics.entries()) {
      if (metrics.attemptCount === 0) continue;

      // Speed factor: inverse of average duration (normalized to 0-1)
      // Assume max reasonable duration is 10 seconds
      const speedFactor = Math.max(0, 1 - metrics.avgDurationMs / 10000);

      // Combined score
      const score = metrics.successRate * 0.7 + speedFactor * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestMethod = method;
      }
    }

    return bestMethod;
  }

  /**
   * Export current metrics state
   */
  exportMetrics(): DiscoveryMetricsState {
    return {
      snapshots: [...this.state.snapshots],
      methodMetrics: new Map(this.state.methodMetrics),
      cacheMetrics: { ...this.state.cacheMetrics },
      pendingAttempts: new Map(this.state.pendingAttempts),
      totalDiscoveries: this.state.totalDiscoveries,
      totalDevicesFound: this.state.totalDevicesFound,
    };
  }

  /**
   * Get current method metrics
   */
  getMethodMetrics(): Map<string, DiscoveryMethodMetrics> {
    return new Map(this.state.methodMetrics);
  }

  /**
   * Get current cache metrics
   */
  getCacheMetrics(): DiscoveryCacheMetrics {
    return { ...this.state.cacheMetrics };
  }

  /**
   * Get total discovery statistics
   */
  getTotalStats() {
    const avgDevicesPerDiscovery =
      this.state.totalDiscoveries > 0
        ? this.state.totalDevicesFound / this.state.totalDiscoveries
        : 0;

    return {
      totalDiscoveries: this.state.totalDiscoveries,
      totalDevicesFound: this.state.totalDevicesFound,
      avgDevicesPerDiscovery,
    };
  }

  /**
   * Get metric snapshots (for dashboard/analysis)
   */
  getSnapshots(): DiscoveryMetricsSnapshot[] {
    return [...this.state.snapshots];
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.state = {
      snapshots: [],
      methodMetrics: new Map(),
      cacheMetrics: {
        totalHits: 0,
        totalMisses: 0,
        totalEvictions: 0,
        currentSize: 0,
        maxSize: 1000,
        hitRate: 0,
        lastUpdatedAt: Date.now(),
      },
      pendingAttempts: new Map(),
      totalDiscoveries: 0,
      totalDevicesFound: 0,
    };
    this.lastSnapshotAt = Date.now();
  }

  /**
   * Capture snapshot if interval elapsed
   * Maintains rolling window of MAX_SNAPSHOTS
   */
  private maybeSnapshot(): void {
    const now = Date.now();
    if (now - this.lastSnapshotAt < this.snapshotIntervalMs) {
      return;
    }

    this.lastSnapshotAt = now;

    const snapshot: DiscoveryMetricsSnapshot = {
      timestamp: now,
      methodMetrics: new Map(this.state.methodMetrics),
      cacheMetrics: { ...this.state.cacheMetrics },
      totalDiscoveries: this.state.totalDiscoveries,
      totalDevicesFound: this.state.totalDevicesFound,
      avgDevicesPerDiscovery:
        this.state.totalDiscoveries > 0
          ? this.state.totalDevicesFound / this.state.totalDiscoveries
          : 0,
    };

    this.state.snapshots.push(snapshot);

    // Maintain rolling window
    if (this.state.snapshots.length > this.MAX_SNAPSHOTS) {
      this.state.snapshots.shift();
    }
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.state.cacheMetrics.totalHits + this.state.cacheMetrics.totalMisses;
    this.state.cacheMetrics.hitRate = total > 0 ? this.state.cacheMetrics.totalHits / total : 0;
    this.state.cacheMetrics.lastUpdatedAt = Date.now();
  }
}

/**
 * Global singleton instance for metrics collection
 */
export const discoveryMetrics = new DiscoveryMetricsCollector();
