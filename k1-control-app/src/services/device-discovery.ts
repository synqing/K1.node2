/**
 * Unified Device Discovery Abstraction
 * Provides a normalized discovery interface with K1Client or fallback support
 *
 * Purpose: Normalize discovery results across K1Client.discover() and K1DiscoveryService
 * Implements debouncing, cancellation, and result normalization
 */

import { K1DiscoveredDevice, K1DiscoveryResult, K1DiscoveryOptions } from '../types/k1-types';
import { K1Client } from '../api/k1-client';
import { K1DiscoveryService } from './discovery-service';
import { discoveryMetrics } from './discovery-metrics';
import { cacheInvalidationManager } from './cache-invalidation';
import { DiscoveryMethodQueue, DiscoveryQueueConfig, DiscoveryMethod } from './discovery-queue';

/**
 * Normalized device summary (internal format)
 */
export interface NormalizedDevice {
  /** Stable identifier (MAC address preferred, falls back to IP) */
  id: string;
  /** Alternative stable identifier (IP address, used if MAC unavailable) */
  alternateId?: string;
  /** Display name */
  name: string;
  /** IPv4 or IPv6 address */
  ip: string;
  /** HTTP port (usually 80) */
  port: number;
  /** MAC address (primary stable identifier) */
  mac: string;
  /** Firmware version */
  firmware: string;
  /** Last time this device was seen */
  lastSeen: Date;
  /** How the device was discovered */
  discoveryMethod: 'mdns' | 'scan' | 'manual';
  /** Signal strength if available */
  rssi?: number;
  /** Number of times discovered in current session */
  discoveryCount: number;
}

/**
 * Result of a discovery operation
 */
export interface DiscoveryResult {
  /** Normalized discovered devices */
  devices: NormalizedDevice[];
  /** Which method was used */
  method: 'mdns' | 'scan' | 'hybrid';
  /** Total time spent discovering (ms) */
  duration: number;
  /** Any errors encountered */
  errors?: string[];
  /** Whether the operation experienced errors */
  hasErrors?: boolean;
  /** Whether the operation was cancelled */
  cancelled: boolean;
}

/**
 * Discovery abstraction that wraps K1Client and K1DiscoveryService
 * Handles:
 * - Preference for K1Client.discover when available
 * - Fallback to K1DiscoveryService if K1Client not available
 * - Debouncing rapid discovery calls
 * - Result normalization
 * - Cancellation support
 * - Cache size limits and TTL eviction
 */
export class DeviceDiscoveryAbstraction {
  private _discoveryService: K1DiscoveryService;
  private _debounceTimer: NodeJS.Timeout | null = null;
  private _debounceMs = 300; // Default debounce
  private _abortController: AbortController | null = null;
  private _discoveryCache = new Map<string, NormalizedDevice>();
  private _lastDiscovery: DiscoveryResult | null = null;
  private _isDiscoveryInProgress = false; // Prevent concurrent discovery scans
  private _pendingResolvers: Array<(result: DiscoveryResult) => void> = []; // Queue of promise resolvers

  // Cache management configuration
  private _maxCacheSize = 100; // Maximum devices to cache
  private _cacheTtlMs = 3600000; // Cache TTL: 1 hour (ms)

  // Priority queue for intelligent method selection
  private _queue: DiscoveryMethodQueue;

  constructor() {
    this._discoveryService = new K1DiscoveryService();
    
    // Initialize discovery queue with default configuration
    const defaultConfig: DiscoveryQueueConfig = {
      strategy: 'hybrid',
      defaultTimeout: 5000,
      learningEnabled: true,
      methods: [
        {
          name: 'mdns',
          priority: 8,
          timeout: 3000,
          retries: 1,
          enabled: true,
        },
        {
          name: 'scan',
          priority: 6,
          timeout: 5000,
          retries: 0,
          enabled: true,
        },
        {
          name: 'manual',
          priority: 4,
          timeout: 2000,
          retries: 0,
          enabled: false, // Disabled by default
        },
      ],
    };

    this._queue = new DiscoveryMethodQueue(
      defaultConfig,
      discoveryMetrics,
      this._executeDiscoveryMethod.bind(this)
    );
  }

  /**
   * Remove expired devices from cache using smart invalidation
   * @private
   */
  private _evictExpiredDevices(): void {
    const expired: string[] = [];

    this._discoveryCache.forEach((device, deviceId) => {
      // Use smart invalidation instead of fixed TTL
      if (cacheInvalidationManager.shouldInvalidate(device)) {
        expired.push(deviceId);
        
        // Determine invalidation reason
        const adaptiveTTL = cacheInvalidationManager.computeAdaptiveTTL(deviceId);
        const ageMs = Date.now() - device.lastSeen.getTime();
        const reason = ageMs > adaptiveTTL ? 'ttl_expired' : 'changed';
        
        cacheInvalidationManager.markAsStale(deviceId, reason);
      }
    });

    expired.forEach(deviceId => this._discoveryCache.delete(deviceId));
  }

  /**
   * Evict least recently used device when cache exceeds max size
   * @private
   */
  private _evictLRUDevice(): void {
    if (this._discoveryCache.size <= this._maxCacheSize) {
      return;
    }

    // Find least recently used device (oldest lastSeen)
    let oldestId = '';
    let oldestTime = Date.now();

    this._discoveryCache.forEach((device, deviceId) => {
      const deviceTime = device.lastSeen.getTime();
      if (deviceTime < oldestTime) {
        oldestTime = deviceTime;
        oldestId = deviceId;
      }
    });

    if (oldestId) {
      discoveryMetrics.recordCacheEviction(oldestId);
      this._discoveryCache.delete(oldestId);
    }
  }

  /**
   * Enforce cache size limits (remove LRU device if over max)
   * @private
   */
  private _enforceMaxCacheSize(): void {
    // Remove LRU devices one at a time until under limit
    while (this._discoveryCache.size > this._maxCacheSize) {
      this._evictLRUDevice();
    }
  }

  /**
   * Discover K1 devices on the network
   *
   * @param options Discovery options (timeout, methods preference)
   * @returns Normalized discovery result
   */
  async discover(options: K1DiscoveryOptions = {}): Promise<DiscoveryResult> {
    return new Promise((resolve) => {
      // If discovery already in progress, return last result instead of duplicate scan
      if (this._isDiscoveryInProgress && this._lastDiscovery) {
        const cachedResult = { ...this._lastDiscovery };
        cachedResult.hasErrors = (cachedResult.errors?.length ?? 0) > 0;
        return resolve(cachedResult);
      }

      // Add this resolver to the pending queue (FIX: was losing previous promises)
      this._pendingResolvers.push(resolve);

      // Debounce if a discovery is already pending
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
      }

      this._debounceTimer = setTimeout(async () => {
        // Capture all pending resolvers atomically and clear queue
        const resolvers = [...this._pendingResolvers];
        this._pendingResolvers = [];

        // Guard against concurrent discoveries
        if (this._isDiscoveryInProgress) {
          if (this._lastDiscovery) {
            // Resolve all pending promises with cached result
            resolvers.forEach(r => r(this._lastDiscovery!));
          } else {
            // No cached result, return error to all
            const errorResult: DiscoveryResult = {
              devices: [],
              method: 'hybrid',
              duration: 0,
              errors: ['Discovery already in progress'],
              hasErrors: true,
              cancelled: true,
            };
            resolvers.forEach(r => r(errorResult));
          }
          return;
        }

        this._isDiscoveryInProgress = true;

        try {
          const startTime = performance.now();
          const attemptId = discoveryMetrics.startDiscovery('hybrid');

          // Clean up expired devices before discovery
          this._evictExpiredDevices();

          // Use priority queue for intelligent method selection
          const result = await this._queue.execute({
            timeout: options.timeout || 5000,
            // Could add strategy override from options if needed
          });

          // The queue already returns normalized devices, just update cache
          result.devices.forEach(device => {
            const existing = this._discoveryCache.get(device.id);
            if (existing) {
              device.discoveryCount = existing.discoveryCount + 1;
            }
            this._discoveryCache.set(device.id, device);
            
            // Record device state for smart invalidation
            cacheInvalidationManager.recordDeviceState(device);
          });

          // Enforce cache size limits (remove LRU devices if needed)
          this._enforceMaxCacheSize();

          // Update cache metrics
          discoveryMetrics.updateCacheMetrics(this._discoveryCache.size, this._maxCacheSize);

          const discoveryResult: DiscoveryResult = {
            devices: result.devices,
            method: result.method as 'mdns' | 'scan' | 'hybrid',
            duration: result.duration,
            errors: result.errors,
            hasErrors: result.hasErrors || false,
            cancelled: result.cancelled,
          };

          this._lastDiscovery = discoveryResult;

          // Record discovery completion
          discoveryMetrics.completeDiscovery(attemptId, {
            success: !discoveryResult.hasErrors,
            durationMs: discoveryResult.duration,
            devicesFound: discoveryResult.devices.length,
            error: discoveryResult.errors?.[0],
            method: discoveryResult.method,
          });

          // Resolve ALL pending promises with the same result
          resolvers.forEach(resolver => resolver(discoveryResult));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorResult: DiscoveryResult = {
            devices: [],
            method: 'hybrid',
            duration: 0,
            errors: [errorMessage],
            hasErrors: true,
            cancelled: false,
          };

          // Record discovery failure
          discoveryMetrics.completeDiscovery(attemptId, {
            success: false,
            durationMs: 0,
            devicesFound: 0,
            error: errorMessage,
            method: 'hybrid',
          });

          // Resolve ALL pending promises with error result
          resolvers.forEach(resolver => resolver(errorResult));
        } finally {
          this._isDiscoveryInProgress = false;
        }
      }, this._debounceMs);
    });
  }

  /**
   * Cancel an ongoing discovery operation
   */
  cancel(): void {
    this._isDiscoveryInProgress = false;

    // Resolve all pending promises with cancelled result
    const cancelledResult: DiscoveryResult = {
      devices: [],
      method: 'hybrid',
      duration: 0,
      errors: ['Discovery cancelled by user'],
      hasErrors: true,
      cancelled: true,
    };

    this._pendingResolvers.forEach(resolver => resolver(cancelledResult));
    this._pendingResolvers = [];

    if (this._abortController) {
      this._abortController.abort();
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  /**
   * Check if discovery is currently in progress
   */
  isDiscoveryInProgress(): boolean {
    return this._isDiscoveryInProgress;
  }

  /**
   * Get the last discovery result (from cache)
   */
  getLastDiscovery(): DiscoveryResult | null {
    return this._lastDiscovery;
  }

  /**
   * Get all devices in cache, optionally sorted by recency
   */
  getCachedDevices(sortByRecency = true): NormalizedDevice[] {
    const devices = Array.from(this._discoveryCache.values());
    if (sortByRecency) {
      devices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    }
    return devices;
  }

  /**
   * Clear the discovery cache
   */
  clearCache(): void {
    this._discoveryCache.clear();
  }

  /**
   * Set debounce delay (milliseconds)
   */
  setDebounceDelay(ms: number): void {
    this._debounceMs = Math.max(0, ms);
  }

  /**
   * Set maximum cache size (devices to keep in memory)
   * When exceeded, least recently used devices are evicted
   *
   * @param size Maximum number of devices (default: 100)
   */
  setMaxCacheSize(size: number): void {
    this._maxCacheSize = Math.max(1, size);
    // Immediately enforce new limit
    this._enforceMaxCacheSize();
  }

  /**
   * Set cache TTL (time to live) in milliseconds
   * Devices older than this are automatically evicted
   *
   * @param ttlMs TTL in milliseconds (default: 3600000 = 1 hour)
   */
  setCacheTtl(ttlMs: number): void {
    this._cacheTtlMs = Math.max(60000, ttlMs); // Minimum 1 minute
  }

  /**
   * Get current cache size and TTL configuration
   */
  getCacheConfig(): { maxSize: number; ttlMs: number; currentSize: number } {
    return {
      maxSize: this._maxCacheSize,
      ttlMs: this._cacheTtlMs,
      currentSize: this._discoveryCache.size,
    };
  }

  /**
   * Execute a specific discovery method (used by the priority queue)
   * @private
   */
  private async _executeDiscoveryMethod(method: string, timeout: number): Promise<DiscoveryResult> {
    const startTime = performance.now();
    let result: K1DiscoveryResult | null = null;
    const errors: string[] = [];

    try {
      switch (method) {
        case 'mdns':
          result = await this._discoverViaK1Client({ timeout });
          break;
        case 'scan':
          result = await this._discoveryService.discoverDevices({ timeout });
          break;
        case 'manual':
          // Manual discovery would be implemented here
          // For now, return empty result
          result = {
            devices: [],
            method: 'manual',
            duration: 0,
          };
          break;
        default:
          throw new Error(`Unknown discovery method: ${method}`);
      }

      if (!result) {
        throw new Error(`${method} discovery returned null`);
      }

      // Normalize devices
      const normalizedDevices = this._normalizeDevices(result.devices);

      return {
        devices: normalizedDevices,
        method: method as 'mdns' | 'scan' | 'hybrid',
        duration: performance.now() - startTime,
        errors: result.errors,
        hasErrors: (result.errors?.length || 0) > 0,
        cancelled: false,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        devices: [],
        method: method as 'mdns' | 'scan' | 'hybrid',
        duration: performance.now() - startTime,
        errors: [errorMsg],
        hasErrors: true,
        cancelled: false,
      };
    }
  }

  /**
   * Try K1Client.discover (if available)
   * Returns null if K1Client doesn't have discover method
   */
  private async _discoverViaK1Client(options: K1DiscoveryOptions): Promise<K1DiscoveryResult | null> {
    // K1Client.discover is a static method that returns mock devices
    // In a real environment, this would make mDNS or broadcast requests
    const result = await K1Client.discover(options.timeout || 5000);

    return {
      devices: result,
      method: 'mdns',
      duration: options.timeout || 5000,
    };
  }

  /**
   * Normalize K1DiscoveredDevice array to NormalizedDevice
   * Uses MAC address as stable ID (preferred) or IP as fallback
   */
  private _normalizeDevices(devices: K1DiscoveredDevice[]): NormalizedDevice[] {
    return devices.map(device => {
      // Use MAC address as primary stable ID (doesn't change if IP changes)
      const stableId = device.mac || device.id;
      const alternateId = device.mac ? device.id : undefined;

      // Check cache by primary ID first, then by alternate ID
      let cached = this._discoveryCache.get(stableId);
      if (!cached && alternateId) {
        cached = this._discoveryCache.get(alternateId);
      }

      return {
        id: stableId,
        alternateId,
        name: device.name,
        ip: device.ip,
        port: device.port,
        mac: device.mac,
        firmware: device.firmware,
        lastSeen: new Date(device.lastSeen),
        discoveryMethod: device.discoveryMethod,
        rssi: device.rssi,
        discoveryCount: cached?.discoveryCount || 1,
      };
    });
  }

  /**
   * Get current discovery queue configuration
   */
  getQueueConfig(): DiscoveryQueueConfig {
    return this._queue.getConfig();
  }

  /**
   * Update discovery queue configuration
   */
  setQueueConfig(config: Partial<DiscoveryQueueConfig>): void {
    this._queue.setConfig(config);
  }

  /**
   * Get method statistics from the queue
   */
  getMethodStats(): { [methodName: string]: any } {
    return this._queue.getMethodStats();
  }

  /**
   * Reset method priorities to defaults
   */
  resetMethodPriorities(): void {
    this._queue.resetPriorities();
  }
}

/**
 * Singleton instance (shared across app)
 */
let discoveryInstance: DeviceDiscoveryAbstraction | null = null;

/**
 * Get or create the discovery abstraction instance
 */
export function getDeviceDiscovery(): DeviceDiscoveryAbstraction {
  if (!discoveryInstance) {
    discoveryInstance = new DeviceDiscoveryAbstraction();
  }
  return discoveryInstance;
}

/**
 * Reset the discovery instance (useful for testing)
 */
export function resetDeviceDiscovery(): void {
  if (discoveryInstance) {
    discoveryInstance.cancel();
    discoveryInstance.clearCache();
  }
  discoveryInstance = null;
}
