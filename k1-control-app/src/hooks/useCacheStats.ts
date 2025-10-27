/**
 * React hook for binding to cache statistics in real-time
 * 
 * Provides live access to:
 * - Cache size and configuration
 * - Hit/miss/eviction statistics
 * - Currently cached devices
 */

import { useState, useEffect } from 'react';
import { getDeviceDiscovery } from '../services/device-discovery';
import { discoveryMetrics } from '../services/discovery-metrics';
import type { NormalizedDevice } from '../services/device-discovery';

export interface CacheStatsHook {
  size: number;
  maxSize: number;
  ttlMs: number;
  devices: NormalizedDevice[];
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for accessing cache statistics with real-time updates
 * @param refreshMs - Polling interval in milliseconds (minimum 100ms, default 1000ms)
 */
export function useCacheStats(refreshMs: number = 1000): CacheStatsHook {
  // Validate refresh interval (minimum 100ms to prevent performance issues)
  const validatedRefreshMs = Math.max(100, refreshMs);
  const [data, setData] = useState<CacheStatsHook>({
    size: 0,
    maxSize: 0,
    ttlMs: 0,
    devices: [],
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    totalEvictions: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateCacheStats = () => {
      try {
        // Get device discovery instance
        const discovery = getDeviceDiscovery();
        
        // Get cache configuration and devices
        const cacheConfig = discovery.getCacheConfig();
        const cachedDevices = discovery.getCachedDevices();
        
        // Get cache metrics from discovery metrics
        const cacheMetrics = discoveryMetrics.getCacheMetrics();

        setData({
          size: Math.max(0, cacheConfig.currentSize),
          maxSize: Math.max(1, cacheConfig.maxSize), // Prevent division by zero
          ttlMs: Math.max(0, cacheConfig.ttlMs),
          devices: cachedDevices,
          hitRate: Math.max(0, Math.min(1, cacheMetrics.hitRate)), // Clamp to 0-1
          totalHits: Math.max(0, cacheMetrics.totalHits),
          totalMisses: Math.max(0, cacheMetrics.totalMisses),
          totalEvictions: Math.max(0, cacheMetrics.totalEvictions),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[useCacheStats] Error updating cache stats:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    // Initial update
    updateCacheStats();

    // Set up polling interval
    intervalId = setInterval(updateCacheStats, validatedRefreshMs);

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [validatedRefreshMs]);

  return data;
}