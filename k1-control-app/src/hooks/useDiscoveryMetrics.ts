/**
 * React hook for binding to discovery metrics in real-time
 * 
 * Provides live access to:
 * - Method performance metrics (success rates, durations)
 * - Historical snapshots for trend analysis
 * - Aggregate statistics (total discoveries, devices found)
 */

import { useState, useEffect } from 'react';
import { discoveryMetrics } from '../services/discovery-metrics';
import type { DiscoveryMethodMetrics, DiscoveryMetricsSnapshot } from '../services/discovery-metrics';

export interface DiscoveryMetricsHook {
  methodMetrics: Map<string, DiscoveryMethodMetrics>;
  history: DiscoveryMetricsSnapshot[];
  snapshot: DiscoveryMetricsSnapshot | null;
  aggregate: {
    totalDiscoveries: number;
    totalDevicesFound: number;
    avgDevicesPerDiscovery: number;
  };
  loading: boolean;
  error: string | null;
}

/**
 * Hook for accessing discovery metrics with real-time updates
 */
export function useDiscoveryMetrics(refreshMs: number = 1000): DiscoveryMetricsHook {
  const [data, setData] = useState<DiscoveryMetricsHook>({
    methodMetrics: new Map(),
    history: [],
    snapshot: null,
    aggregate: {
      totalDiscoveries: 0,
      totalDevicesFound: 0,
      avgDevicesPerDiscovery: 0,
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateMetrics = () => {
      try {
        // Get current metrics from singleton
        const methodMetrics = discoveryMetrics.getMethodMetrics();
        const history = discoveryMetrics.getSnapshots();
        const totalStats = discoveryMetrics.getTotalStats();

        // Get latest snapshot
        const snapshot = history.length > 0 ? history[history.length - 1] : null;

        setData({
          methodMetrics,
          history,
          snapshot,
          aggregate: {
            totalDiscoveries: totalStats.totalDiscoveries,
            totalDevicesFound: totalStats.totalDevicesFound,
            avgDevicesPerDiscovery: totalStats.avgDevicesPerDiscovery,
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[useDiscoveryMetrics] Error updating metrics:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    // Initial update
    updateMetrics();

    // Set up polling interval
    intervalId = setInterval(updateMetrics, refreshMs);

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshMs]);

  return data;
}