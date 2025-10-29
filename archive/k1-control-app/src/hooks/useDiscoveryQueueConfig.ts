/**
 * React hook for accessing discovery queue configuration
 * 
 * Provides access to:
 * - Current execution strategy (sequential/race/hybrid)
 * - Method configurations (priorities, timeouts, retries)
 * - Method statistics and performance data
 */

import { useState, useEffect } from 'react';
import { getDeviceDiscovery } from '../services/device-discovery';
import type { DiscoveryQueueConfig } from '../services/discovery-queue';

export interface DiscoveryQueueConfigHook {
  config: DiscoveryQueueConfig | null;
  methodStats: { [methodName: string]: any } | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for accessing discovery queue configuration
 * Note: This hook doesn't poll since configuration changes are infrequent
 */
export function useDiscoveryQueueConfig(): DiscoveryQueueConfigHook {
  const [data, setData] = useState<DiscoveryQueueConfigHook>({
    config: null,
    methodStats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadConfig = () => {
      try {
        // Get device discovery instance
        const discovery = getDeviceDiscovery();
        
        // Get queue configuration and method statistics
        const config = discovery.getQueueConfig();
        const methodStats = discovery.getMethodStats();

        setData({
          config,
          methodStats,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[useDiscoveryQueueConfig] Error loading config:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    // Load configuration once on mount
    loadConfig();
  }, []);

  return data;
}

/**
 * Hook for accessing discovery queue configuration with real-time updates
 * Use this version if you need live updates to method statistics
 * @param refreshMs - Polling interval in milliseconds (minimum 1000ms, default 5000ms)
 */
export function useDiscoveryQueueConfigLive(refreshMs: number = 5000): DiscoveryQueueConfigHook {
  // Validate refresh interval (minimum 1000ms for config updates)
  const validatedRefreshMs = Math.max(1000, refreshMs);
  const [data, setData] = useState<DiscoveryQueueConfigHook>({
    config: null,
    methodStats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateConfig = () => {
      try {
        // Get device discovery instance
        const discovery = getDeviceDiscovery();
        
        // Get queue configuration and method statistics
        const config = discovery.getQueueConfig();
        const methodStats = discovery.getMethodStats();

        setData({
          config,
          methodStats,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('[useDiscoveryQueueConfigLive] Error updating config:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    // Initial update
    updateConfig();

    // Set up polling interval (less frequent than metrics)
    intervalId = setInterval(updateConfig, validatedRefreshMs);

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [validatedRefreshMs]);

  return data;
}