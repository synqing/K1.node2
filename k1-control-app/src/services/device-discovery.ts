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

/**
 * Normalized device summary (internal format)
 */
export interface NormalizedDevice {
  /** Stable identifier (usually IP) */
  id: string;
  /** Display name */
  name: string;
  /** IPv4 or IPv6 address */
  ip: string;
  /** HTTP port (usually 80) */
  port: number;
  /** MAC address */
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
 */
export class DeviceDiscoveryAbstraction {
  private _discoveryService: K1DiscoveryService;
  private _debounceTimer: NodeJS.Timeout | null = null;
  private _debounceMs = 300; // Default debounce
  private _abortController: AbortController | null = null;
  private _discoveryCache = new Map<string, NormalizedDevice>();
  private _lastDiscovery: DiscoveryResult | null = null;

  constructor() {
    this._discoveryService = new K1DiscoveryService();
  }

  /**
   * Discover K1 devices on the network
   *
   * @param options Discovery options (timeout, methods preference)
   * @returns Normalized discovery result
   */
  async discover(options: K1DiscoveryOptions = {}): Promise<DiscoveryResult> {
    return new Promise((resolve) => {
      // Debounce if a discovery is already pending
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
      }

      this._debounceTimer = setTimeout(async () => {
        try {
          const startTime = performance.now();

          // Try K1Client.discover first if available
          let result: K1DiscoveryResult | null = null;
          const errors: string[] = [];

          try {
            result = await this._discoverViaK1Client(options);
          } catch (err) {
            errors.push(`K1Client discovery failed: ${err instanceof Error ? err.message : String(err)}`);
            // Fall back to K1DiscoveryService
          }

          // Fallback to K1DiscoveryService if K1Client failed
          if (!result) {
            try {
              result = await this._discoveryService.discoverDevices(options);
            } catch (err) {
              errors.push(`K1DiscoveryService failed: ${err instanceof Error ? err.message : String(err)}`);
              result = {
                devices: [],
                method: 'hybrid',
                duration: performance.now() - startTime,
                errors: errors.length > 0 ? errors : undefined,
              };
            }
          }

          const duration = performance.now() - startTime;

          // Normalize results
          const normalizedDevices = this._normalizeDevices(result.devices);

          // Update cache
          normalizedDevices.forEach(device => {
            const existing = this._discoveryCache.get(device.id);
            if (existing) {
              device.discoveryCount = existing.discoveryCount + 1;
            }
            this._discoveryCache.set(device.id, device);
          });

          const discoveryResult: DiscoveryResult = {
            devices: normalizedDevices,
            method: result.method,
            duration,
            errors: errors.length > 0 ? errors : undefined,
            cancelled: false,
          };

          this._lastDiscovery = discoveryResult;
          resolve(discoveryResult);
        } catch (err) {
          resolve({
            devices: [],
            method: 'hybrid',
            duration: 0,
            errors: [err instanceof Error ? err.message : String(err)],
            cancelled: false,
          });
        }
      }, this._debounceMs);
    });
  }

  /**
   * Cancel an ongoing discovery operation
   */
  cancel(): void {
    if (this._abortController) {
      this._abortController.abort();
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
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
   */
  private _normalizeDevices(devices: K1DiscoveredDevice[]): NormalizedDevice[] {
    return devices.map(device => {
      const cached = this._discoveryCache.get(device.id);
      return {
        id: device.id,
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
