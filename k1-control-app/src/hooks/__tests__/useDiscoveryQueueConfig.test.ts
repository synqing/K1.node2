/**
 * Tests for useDiscoveryQueueConfig hook
 */

import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDiscoveryQueueConfig, useDiscoveryQueueConfigLive } from '../useDiscoveryQueueConfig';
import { getDeviceDiscovery } from '../../services/device-discovery';

// Mock the device discovery service
vi.mock('../../services/device-discovery', () => ({
  getDeviceDiscovery: vi.fn(),
}));

const mockGetDeviceDiscovery = getDeviceDiscovery as any;

describe('useDiscoveryQueueConfig', () => {
  const mockDeviceDiscovery = {
    getQueueConfig: vi.fn(),
    getMethodStats: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeviceDiscovery.mockReturnValue(mockDeviceDiscovery as any);
    
    // Default mock implementations
    mockDeviceDiscovery.getQueueConfig.mockReturnValue({
      strategy: 'hybrid',
      defaultTimeout: 5000,
      learningEnabled: true,
      methods: [
        { name: 'mdns', priority: 9, timeout: 3000, retries: 1, enabled: true },
        { name: 'scan', priority: 5, timeout: 5000, retries: 0, enabled: true },
      ],
    });
    mockDeviceDiscovery.getMethodStats.mockReturnValue({
      mdns: { successRate: 0.9, avgDuration: 1200, attemptCount: 10 },
      scan: { successRate: 0.6, avgDuration: 4500, attemptCount: 8 },
    });
  });

  describe('useDiscoveryQueueConfig (static)', () => {
    it('should fetch config on mount', () => {
      const { result } = renderHook(() => useDiscoveryQueueConfig());

      expect(mockDeviceDiscovery.getQueueConfig).toHaveBeenCalledTimes(1);
      expect(mockDeviceDiscovery.getMethodStats).toHaveBeenCalledTimes(1);
      expect(result.current.config).toEqual({
        strategy: 'hybrid',
        defaultTimeout: 5000,
        learningEnabled: true,
        methods: [
          { name: 'mdns', priority: 9, timeout: 3000, retries: 1, enabled: true },
          { name: 'scan', priority: 5, timeout: 5000, retries: 0, enabled: true },
        ],
      });
    });

    it('should return null if config unavailable', () => {
      mockDeviceDiscovery.getQueueConfig.mockReturnValue(null);

      const { result } = renderHook(() => useDiscoveryQueueConfig());

      expect(result.current.config).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should include strategy and methods', () => {
      const { result } = renderHook(() => useDiscoveryQueueConfig());

      expect(result.current.config?.strategy).toBe('hybrid');
      expect(result.current.config?.methods).toHaveLength(2);
      expect(result.current.config?.methods?.[0].name).toBe('mdns');
      expect(result.current.config?.methods?.[1].name).toBe('scan');
    });

    it('should not re-fetch on re-render', () => {
      const { rerender } = renderHook(() => useDiscoveryQueueConfig());

      // Initial render
      expect(mockDeviceDiscovery.getQueueConfig).toHaveBeenCalledTimes(1);

      // Re-render
      rerender();

      // Should still be called only once (no additional calls)
      expect(mockDeviceDiscovery.getQueueConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeviceDiscovery.getQueueConfig.mockImplementation(() => {
        throw new Error('Config error');
      });

      const { result } = renderHook(() => useDiscoveryQueueConfig());

      expect(result.current.error).toBe('Config error');
      expect(result.current.loading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useDiscoveryQueueConfig] Error loading config:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useDiscoveryQueueConfigLive (polling)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should poll for config updates', () => {
      const { result } = renderHook(() => useDiscoveryQueueConfigLive(5000));

      // Initial call
      expect(mockDeviceDiscovery.getQueueConfig).toHaveBeenCalledTimes(1);

      // Advance timer
      vi.advanceTimersByTime(5000);

      expect(mockDeviceDiscovery.getQueueConfig).toHaveBeenCalledTimes(2);
    });

    it('should cleanup interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => useDiscoveryQueueConfigLive());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should respect custom refresh interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      renderHook(() => useDiscoveryQueueConfigLive(10000));

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
      setIntervalSpy.mockRestore();
    });
  });
});