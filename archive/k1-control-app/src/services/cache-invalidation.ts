/**
 * Smart Cache Invalidation System
 *
 * Provides intelligent cache invalidation based on:
 * - Device state changes (IP/MAC address changes)
 * - Device reliability scoring
 * - Adaptive TTL (5 minutes to 2 hours)
 * - Device disappearance detection
 *
 * Replaces fixed 1-hour TTL with dynamic, confidence-based invalidation
 */

import { NormalizedDevice } from './device-discovery';

/**
 * Snapshot of device state at a point in time
 */
export interface DeviceStateSnapshot {
  timestamp: number;           // ms since epoch
  mac: string;                 // MAC address (primary identifier)
  ip: string;                  // IPv4 address
  discoveryCount: number;      // cumulative discoveries
  discoveryMethod: 'mdns' | 'scan' | 'manual';
  rssi?: number;               // signal strength if available
}

/**
 * Result of change detection analysis
 */
export interface ChangeDetectionResult {
  changeType: 'ip_change' | 'mac_change' | 'stable' | 'new_device';
  confidence: number;          // 0.0-1.0
  oldState: DeviceStateSnapshot | null;  // previous state
  newState: DeviceStateSnapshot;         // current state
  details: string;             // human-readable explanation
}

/**
 * Record of cache invalidation event
 */
export interface InvalidationTrigger {
  deviceId: string;
  timestamp: number;           // when invalidation occurred
  reason: 'disappeared' | 'changed' | 'ttl_expired';
  confidence: number;          // confidence at time of invalidation
  details?: string;            // optional context
}

/**
 * Smart cache invalidation manager
 * Tracks device state changes and provides adaptive TTL
 */
export class CacheInvalidationManager {
  // State tracking for each device (max 20 snapshots per device)
  private deviceHistory: Map<string, DeviceStateSnapshot[]> = new Map();

  // Confidence scoring for each device (0.0-1.0)
  private confidenceScores: Map<string, number> = new Map();

  // Invalidation event log (max 100 entries)
  private invalidationLog: InvalidationTrigger[] = [];

  // Configuration constants
  private readonly minTtlMs = 300000;      // 5 minutes
  private readonly maxTtlMs = 7200000;     // 2 hours
  private readonly confidenceThreshold = 0.8;
  private readonly maxHistoryPerDevice = 20;
  private readonly maxInvalidationLog = 100;

  /**
   * Record current state of a discovered device
   * Updates device history and confidence score
   */
  recordDeviceState(device: NormalizedDevice): void {
    if (!device.id) {
      console.warn('[CacheInvalidation] Device ID is empty, skipping state recording');
      return;
    }

    // Create snapshot of current device state
    const snapshot: DeviceStateSnapshot = {
      timestamp: Date.now(),
      mac: device.mac || '',
      ip: device.ip,
      discoveryCount: device.discoveryCount,
      discoveryMethod: device.discoveryMethod,
      rssi: device.rssi,
    };

    // Get or create history for this device
    let history = this.deviceHistory.get(device.id);
    if (!history) {
      history = [];
      this.deviceHistory.set(device.id, history);
    }

    // Add new snapshot
    history.push(snapshot);

    // Maintain max history size (keep most recent)
    if (history.length > this.maxHistoryPerDevice) {
      history.shift(); // Remove oldest
    }

    // Update confidence score
    this.confidenceScores.set(device.id, this.computeConfidence(device.id));
  }

  /**
   * Detect changes in device state (IP/MAC changes)
   * Returns change type and confidence level
   */
  detectChanges(device: NormalizedDevice): ChangeDetectionResult | null {
    if (!device.id) {
      console.error('[CacheInvalidation] Device ID is empty for change detection');
      return null;
    }

    const history = this.deviceHistory.get(device.id);
    const newState: DeviceStateSnapshot = {
      timestamp: Date.now(),
      mac: device.mac || '',
      ip: device.ip,
      discoveryCount: device.discoveryCount,
      discoveryMethod: device.discoveryMethod,
      rssi: device.rssi,
    };

    // No history = new device
    if (!history || history.length === 0) {
      return {
        changeType: 'new_device',
        confidence: 0.5,
        oldState: null,
        newState,
        details: 'First time seeing this device',
      };
    }

    // Only one snapshot = still establishing baseline
    if (history.length === 1) {
      return {
        changeType: 'stable',
        confidence: 0.6,
        oldState: history[0],
        newState,
        details: 'Building device history baseline',
      };
    }

    // Compare with recent history (last 3 snapshots)
    const recentSnapshots = history.slice(-3);
    const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];

    // Check for MAC address change
    if (device.mac && lastSnapshot.mac && device.mac !== lastSnapshot.mac) {
      return {
        changeType: 'mac_change',
        confidence: 0.95,
        oldState: lastSnapshot,
        newState,
        details: `MAC changed from ${lastSnapshot.mac} to ${device.mac}`,
      };
    }

    // Check for IP address change (same MAC, different IP)
    if (device.ip !== lastSnapshot.ip) {
      return {
        changeType: 'ip_change',
        confidence: 0.9,
        oldState: lastSnapshot,
        newState,
        details: `IP changed from ${lastSnapshot.ip} to ${device.ip}`,
      };
    }

    // No significant changes detected
    return {
      changeType: 'stable',
      confidence: 0.99,
      oldState: lastSnapshot,
      newState,
      details: 'Device state is stable',
    };
  }

  /**
   * Calculate device reliability score (0.0-1.0)
   * Based on discovery frequency, age, and state stability
   */
  computeConfidence(deviceId: string): number {
    const history = this.deviceHistory.get(deviceId);
    if (!history || history.length === 0) {
      return 0.5; // Default for unknown devices
    }

    const latestSnapshot = history[history.length - 1];
    const now = Date.now();

    // Base score from discovery frequency (max 1.0 at 10+ discoveries)
    const baseScore = Math.min(latestSnapshot.discoveryCount / 10, 1.0);

    // Age factor (how recently was device seen)
    const ageMs = now - latestSnapshot.timestamp;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const ageFactor = Math.max(0.5, 1.0 - ageDays); // Min 0.5 for very old devices

    // State stability factor (how often does IP/MAC change)
    let changeCount = 0;
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      if (prev.ip !== curr.ip || prev.mac !== curr.mac) {
        changeCount++;
      }
    }
    const changeFrequency = history.length > 1 ? changeCount / (history.length - 1) : 0;
    const stateStabilityFactor = 1.0 - changeFrequency;

    // Weighted combination
    const confidence = baseScore * 0.5 + ageFactor * 0.3 + stateStabilityFactor * 0.2;

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Calculate dynamic cache TTL based on device confidence
   * Higher confidence = longer TTL
   */
  computeAdaptiveTTL(deviceId: string): number {
    const confidence = this.confidenceScores.get(deviceId) || 0.5;

    // Map confidence to TTL ranges
    if (confidence >= 0.90) {
      return this.maxTtlMs; // 2 hours for very reliable devices
    } else if (confidence >= 0.75) {
      return 3600000; // 1 hour for reliable devices
    } else if (confidence >= 0.60) {
      return 1800000; // 30 minutes for somewhat reliable devices
    } else {
      return this.minTtlMs; // 5 minutes for unreliable/new devices
    }
  }

  /**
   * Determine if device should be invalidated from cache
   * Based on state changes, TTL, and disappearance
   */
  shouldInvalidate(device: NormalizedDevice): boolean {
    const changeResult = this.detectChanges(device);
    if (!changeResult) {
      return false; // Default to keep if detection fails
    }

    // Invalidate on high-confidence state changes
    if ((changeResult.changeType === 'ip_change' || changeResult.changeType === 'mac_change') &&
        changeResult.confidence > this.confidenceThreshold) {
      return true;
    }

    // Check if TTL has expired
    const adaptiveTTL = this.computeAdaptiveTTL(device.id);
    const ageMs = Date.now() - device.lastSeen.getTime();
    if (ageMs > adaptiveTTL) {
      return true;
    }

    // Check for device disappearance (not implemented in this version)
    // Would require tracking consecutive discovery misses

    return false; // Keep in cache by default
  }

  /**
   * Mark device as stale and record invalidation trigger
   * Does not remove from history (preserves for analysis)
   */
  markAsStale(deviceId: string, reason: 'disappeared' | 'changed' | 'ttl_expired'): void {
    const confidence = this.confidenceScores.get(deviceId) || 0.0;

    const trigger: InvalidationTrigger = {
      deviceId,
      timestamp: Date.now(),
      reason,
      confidence,
      details: this.getInvalidationDetails(reason, confidence),
    };

    // Add to log
    this.invalidationLog.push(trigger);

    // Maintain max log size
    if (this.invalidationLog.length > this.maxInvalidationLog) {
      this.invalidationLog.shift(); // Remove oldest
    }

    console.log(`[CacheInvalidation] Device ${deviceId} marked as stale: ${reason} (confidence: ${confidence.toFixed(2)})`);
  }

  /**
   * Get recent invalidation events for analysis
   * Returns events sorted by timestamp (newest first)
   */
  getInvalidationHistory(limit: number = 50): InvalidationTrigger[] {
    return this.invalidationLog
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get device confidence score
   */
  getDeviceConfidence(deviceId: string): number {
    return this.confidenceScores.get(deviceId) || 0.5;
  }

  /**
   * Get device state history
   */
  getDeviceHistory(deviceId: string): DeviceStateSnapshot[] {
    return this.deviceHistory.get(deviceId) || [];
  }

  /**
   * Clear all cached data (for testing/reset)
   */
  reset(): void {
    this.deviceHistory.clear();
    this.confidenceScores.clear();
    this.invalidationLog.length = 0;
  }

  /**
   * Get summary statistics
   */
  getStats() {
    return {
      trackedDevices: this.deviceHistory.size,
      totalInvalidations: this.invalidationLog.length,
      avgConfidence: this.getAverageConfidence(),
    };
  }

  /**
   * Generate human-readable invalidation details
   */
  private getInvalidationDetails(reason: string, confidence: number): string {
    switch (reason) {
      case 'disappeared':
        return `Device not seen in recent discoveries (confidence: ${confidence.toFixed(2)})`;
      case 'changed':
        return `Device state changed significantly (confidence: ${confidence.toFixed(2)})`;
      case 'ttl_expired':
        return `Adaptive TTL expired (confidence: ${confidence.toFixed(2)})`;
      default:
        return `Unknown invalidation reason: ${reason}`;
    }
  }

  /**
   * Calculate average confidence across all tracked devices
   */
  private getAverageConfidence(): number {
    if (this.confidenceScores.size === 0) return 0;

    const total = Array.from(this.confidenceScores.values()).reduce((sum, conf) => sum + conf, 0);
    return total / this.confidenceScores.size;
  }
}

/**
 * Global singleton instance for cache invalidation management
 */
export const cacheInvalidationManager = new CacheInvalidationManager();