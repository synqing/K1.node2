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
 */
export function useCacheStats(refreshMs: number = 1000): CacheStatsHook {
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
          size: cacheConfig.currentSize,
          maxSize: cacheConfig.maxSize,
          ttlMs: cacheConfig.ttlMs,
          devices: cachedDevices,
          hitRate: cacheMetrics.hitRate,
          totalHits: cacheMetrics.totalHits,
          totalMisses: cacheMetrics.totalMisses,
          totalEvictions: cacheMetrics.totalEvictions,
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
    intervalId = setInterval(updateCacheStats, refreshMs);

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshMs]);

  return data;
}